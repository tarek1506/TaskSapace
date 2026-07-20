import { useState, useEffect, useRef } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { timeAgo, getAvatarColor } from '@/lib/utils'
import type { TaskComment } from '@/types'

interface CommentThreadProps {
  taskId: string
}

export function CommentThread({ taskId }: CommentThreadProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchComments()

    // Real-time subscription
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
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      // Fetch profiles separately (cross-schema FK join not supported by PostgREST)
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

    const { data } = await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: user.id,
      content: newComment.trim(),
    }).select().single()
    if (data) {
      setComments(prev => [...prev, {
        ...data,
        user_email: myProfile?.full_name ? (user.email || '') : (user.email || ''),
        user_name: myProfile?.full_name || user.email?.split('@')[0] || 'User',
        user_avatar_url: myProfile?.avatar_url || null,
      }])
    }
    setNewComment('')
    setSubmitting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      submitComment()
    }
  }

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

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
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 fade-in" id={`comment-${comment.id}`}>
            <div title={comment.user_email}>
              <Avatar
                email={comment.user_email}
                name={comment.user_name}
                src={comment.user_avatar_url}
                size="sm"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800">
                  {comment.user_name}
                </span>
                <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
              </div>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3.5 py-2.5 leading-relaxed">
                {comment.content}
              </div>
            </div>
          </div>
        ))}
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
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment… (Ctrl+Enter to submit)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 focus:bg-white transition-all"
            id={`comment-input-${taskId}`}
          />
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
