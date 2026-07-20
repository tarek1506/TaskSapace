import { useState, useEffect, useRef, useMemo } from 'react'
import { Send, MessageCircle, Reply, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn, timeAgo } from '@/lib/utils'
import type { TaskComment, WorkspaceMember } from '@/types'

interface CommentThreadProps {
  taskId: string
  workspaceId: string
  taskTitle: string
  members: WorkspaceMember[]
  assignedTo: string[]
}

function renderContent(content: string) {
  const parts = content.split(/(@\S+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="inline-flex items-center gap-0.5 text-violet-600 font-semibold bg-violet-50 px-1.5 py-0.5 rounded-md text-xs">
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function CommentThread({ taskId, workspaceId, taskTitle, members, assignedTo }: CommentThreadProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const listEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const assignees = useMemo(() => {
    return members.filter(m => assignedTo.includes(m.user_id))
  }, [members, assignedTo])

  const filteredMentions = useMemo(() => {
    if (!mentionQuery && mentionQuery !== '') return assignees
    const q = mentionQuery.toLowerCase()
    return assignees.filter(a =>
      (a.user_name || a.user_email || '').toLowerCase().includes(q)
    )
  }, [assignees, mentionQuery])

  useEffect(() => {
    fetchComments()

    const channel = supabase
      .channel(`comments:${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        () => fetchComments()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [taskId])

  const fetchComments = async () => {
    setLoading(true)
    let { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      const retry = await supabase
        .from('task_comments')
        .select('id, task_id, user_id, content, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      data = retry.data
    }

    if (data && data.length > 0) {
      const uniqueUserIds = [...new Set(data.map((c: any) => c.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', uniqueUserIds)

      const profileMap: Record<string, any> = {}
      for (const p of profiles || []) profileMap[p.id] = p

      setComments(
        data.map((c: any) => {
          const p = profileMap[c.user_id]
          return {
            ...c,
            parent_id: c.parent_id || null,
            user_email: p?.email || '',
            user_name: p?.full_name || p?.email?.split('@')[0] || 'User',
            user_avatar_url: p?.avatar_url || null,
          }
        })
      )
    } else {
      setComments([])
    }
    setLoading(false)
  }

  const submitComment = async () => {
    if (!newComment.trim() || !user) return
    setSubmitting(true)

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()

    const insertPayload: Record<string, unknown> = {
      task_id: taskId,
      user_id: user.id,
      content: newComment.trim(),
    }
    if (replyingTo?.id) {
      insertPayload.parent_id = replyingTo.id
    }

    const { data, error } = await supabase.from('task_comments').insert(insertPayload).select().single()
    if (error) { console.error('Failed to post comment:', error); setSubmitting(false); return }

    if (data) {
      setComments(prev => [...prev, {
        ...data,
        parent_id: data.parent_id || null,
        user_email: user.email || '',
        user_name: myProfile?.full_name || user.email?.split('@')[0] || 'User',
        user_avatar_url: myProfile?.avatar_url || null,
      }])

      // Insert mention notifications
      const mentionRegex = /@(\S+)/g
      const content = newComment.trim()
      const mentionedNames = new Set<string>()
      let match
      while ((match = mentionRegex.exec(content)) !== null) {
        mentionedNames.add(match[1])
      }
      if (mentionedNames.size > 0) {
        const mentionedMembers = assignees.filter(a => {
          const name = a.user_name || a.user_email
          return name && mentionedNames.has(name) && a.user_id !== user.id
        })
        for (const m of mentionedMembers) {
          await supabase.from('notifications').insert({
            workspace_id: workspaceId,
            user_id: m.user_id,
            task_id: taskId,
            action_type: 'comment_mentioned',
            details: { task_title: taskTitle, task_id: taskId, actor_name: myProfile?.full_name || user.email?.split('@')[0] || 'Someone' },
          })
        }
      }
    }
    setNewComment('')
    setReplyingTo(null)
    setShowMentions(false)
    setSubmitting(false)
  }

  const insertMention = (name: string) => {
    const ta = textareaRef.current
    const val = newComment
    const cursorPos = ta?.selectionStart ?? val.length
    const textBefore = val.slice(0, cursorPos)
    const textAfter = val.slice(cursorPos)
    const atIndex = textBefore.lastIndexOf('@')
    if (atIndex === -1) { setShowMentions(false); return }

    const before = textBefore.slice(0, atIndex)
    const newText = `${before}@${name}\n${textAfter}`
    setNewComment(newText)
    setShowMentions(false)
    setMentionQuery('')
    setTimeout(() => {
      if (ta) {
        const pos = before.length + name.length + 2
        ta.focus()
        ta.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setNewComment(val)

    const cursorPos = e.target.selectionStart
    const textBefore = val.slice(0, cursorPos)
    const atIndex = textBefore.lastIndexOf('@')

    if (atIndex !== -1) {
      const afterAt = textBefore.slice(atIndex + 1)
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setMentionQuery(afterAt)
        setShowMentions(true)
        setMentionIndex(0)
        return
      }
    }
    setShowMentions(false)
    setMentionQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(prev => (prev + 1) % filteredMentions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length)
        return
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        insertMention(filteredMentions[mentionIndex]?.user_name || filteredMentions[mentionIndex]?.user_email || '')
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentions(false)
        return
      }
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      submitComment()
    }
    if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null)
      setNewComment('')
    }
  }

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ id: commentId, name: userName })
    setNewComment('')
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const topLevel = comments.filter(c => !c.parent_id)
  const repliesMap = new Map<string, TaskComment[]>()
  for (const c of comments) {
    if (c.parent_id) {
      const existing = repliesMap.get(c.parent_id) || []
      existing.push(c)
      repliesMap.set(c.parent_id, existing)
    }
  }

  const renderComment = (comment: TaskComment, isReply = false) => {
    const replies = repliesMap.get(comment.id) || []
    return (
      <div key={comment.id} id={`comment-${comment.id}`} className={isReply ? 'mt-3' : ''}>
        <div className="flex gap-3 fade-in">
          {isReply && <div className="w-6 shrink-0" />}
          <div>
            <Avatar
              email={comment.user_email}
              name={comment.user_name}
              src={comment.user_avatar_url}
              size="sm"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-800">
                {comment.user_name}
              </span>
              <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
              <button
                onClick={() => handleReply(comment.id, comment.user_name || 'User')}
                className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 hover:text-violet-600 transition-colors"
              >
                <Reply size={11} />
                Reply
              </button>
            </div>
            <div className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap">
              {renderContent(comment.content)}
            </div>
          </div>
        </div>
        {replies.length > 0 && (
          <div className="ml-9 mt-2 border-l-2 border-violet-100 pl-3 space-y-3">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-700">
          Comments {comments.length > 0 && `(${comments.length})`}
        </span>
      </div>

      {/* Comment list */}
      <div className="space-y-4 mb-4 max-h-80 overflow-y-auto scrollbar-thin pr-1">
        {loading && comments.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">Loading comments…</div>
        )}
        {!loading && comments.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl">
            No comments yet. Be the first to comment!
          </div>
        )}
        {topLevel.map(comment => renderComment(comment))}
        <div ref={listEndRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-3 items-end">
        <div title={user?.email || ''}>
          <Avatar
            email={user?.email || ''}
            name={user?.user_metadata?.name || user?.email || ''}
            src={user?.user_metadata?.avatar_url || null}
            size="sm"
          />
        </div>
        <div className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            {replyingTo && (
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-violet-600 bg-violet-50 rounded-lg px-2.5 py-1">
                <Reply size={10} />
                Replying to <span className="font-semibold">{replyingTo.name}</span>
                <button
                  onClick={() => { setReplyingTo(null); setNewComment('') }}
                  className="ml-auto text-violet-400 hover:text-violet-600"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {/* Mention dropdown */}
            {showMentions && filteredMentions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                {filteredMentions.map((a, i) => (
                  <button
                    key={a.user_id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); insertMention(a.user_name || a.user_email || '') }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                      i === mentionIndex ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Avatar name={a.user_name || a.user_email} src={a.user_avatar_url} size="xs" />
                    <div className="min-w-0">
                      <div className="font-medium truncate text-xs">{a.user_name || a.user_email}</div>
                      {a.user_name && a.user_email && (
                        <div className="text-[10px] text-gray-400 truncate">{a.user_email}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : 'Write a comment… (Ctrl+Enter to submit)'}
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 focus:bg-white transition-all"
              id={`comment-input-${taskId}`}
            />
          </div>
          <Button
            variant="primary"
            size="icon"
            onClick={submitComment}
            loading={submitting}
            disabled={!newComment.trim()}
            className="self-end mb-0.5"
            id="btn-submit-comment"
          >
            <Send size={15} />
          </Button>
        </div>
      </div>
    </div>
  )
}
