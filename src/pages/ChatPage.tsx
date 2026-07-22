import { useState, useEffect, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { MessageCircle, Send, Search, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useChatUnread } from '@/contexts/ChatContext'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceMember, DirectMessage, DirectMessageThread } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000
}

// Ensures participant_a is always the lexicographically smaller UUID
function orderedParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberWithPresence extends WorkspaceMember {
  last_seen_at?: string | null
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ChatPage() {
  const { workspace } = useOutletContext<OutletCtx>()
  const { user, profile } = useAuth()
  const { refreshUnread } = useChatUnread()

  const [members, setMembers] = useState<MemberWithPresence[]>([])
  const [threads, setThreads] = useState<DirectMessageThread[]>([])
  const [activeThread, setActiveThread] = useState<DirectMessageThread | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [search, setSearch] = useState('')
  const [mobileShowThread, setMobileShowThread] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Load workspace members & their threads ──────────────────────────────────
  const loadMembersAndThreads = useCallback(async () => {
    if (!user) return
    setLoadingMembers(true)

    // Step 1: fetch member rows (no join — FK to profiles may not be declared)
    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspace.id)

    if (!memberRows || memberRows.length === 0) {
      setMembers([])
      setLoadingMembers(false)
      return
    }

    // Step 2: fetch profiles separately by user_ids
    const userIds = memberRows.map((m: any) => m.user_id)
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, last_seen_at')
      .in('id', userIds)

    const profileMap: Record<string, any> = {}
    for (const p of profileRows || []) profileMap[p.id] = p

    const enrichedMembers: MemberWithPresence[] = memberRows.map((m: any) => {
      const p = profileMap[m.user_id]
      return {
        ...m,
        user_name: p?.full_name || p?.email?.split('@')[0] || 'Unknown',
        user_email: p?.email || '',
        user_avatar_url: p?.avatar_url || null,
        last_seen_at: p?.last_seen_at || null,
      }
    })

    setMembers(enrichedMembers)


    // Load existing threads for this user in this workspace
    const { data: threadRows } = await supabase
      .from('direct_message_threads')
      .select('*')
      .eq('workspace_id', workspace.id)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    // Get last message preview for each thread
    const threadMap: Record<string, DirectMessageThread> = {}
    for (const t of threadRows || []) {
      const otherId = t.participant_a === user.id ? t.participant_b : t.participant_a
      const otherMember = enrichedMembers.find((m) => m.user_id === otherId)
      threadMap[t.id] = {
        ...t,
        other_user_id: otherId,
        other_user_name: otherMember?.user_name || 'Unknown',
        other_user_email: otherMember?.user_email || '',
        other_user_avatar_url: otherMember?.user_avatar_url || null,
        is_online: isOnline(otherMember?.last_seen_at),
      }
    }

    // Fetch previews (last message per thread)
    if (Object.keys(threadMap).length > 0) {
      for (const threadId of Object.keys(threadMap)) {
        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('content, sender_id, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (lastMsg) {
          const isMine = lastMsg.sender_id === user.id
          threadMap[threadId].last_message_preview = isMine
            ? `You: ${lastMsg.content}`
            : lastMsg.content
        }
      }

      // Compute unread counts
      const { data: reads } = await supabase
        .from('direct_message_reads')
        .select('thread_id, read_at')
        .eq('user_id', user.id)
        .in('thread_id', Object.keys(threadMap))

      const readMap: Record<string, string> = {}
      for (const r of reads || []) readMap[r.thread_id] = r.read_at

      for (const threadId of Object.keys(threadMap)) {
        const lastRead = readMap[threadId] || new Date(0).toISOString()
        const { count } = await supabase
          .from('direct_messages')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', threadId)
          .neq('sender_id', user.id)
          .gt('created_at', lastRead)
        threadMap[threadId].unread_count = count || 0
      }
    }

    setThreads(Object.values(threadMap).sort((a, b) =>
      (b.last_message_at || b.created_at) > (a.last_message_at || a.created_at) ? 1 : -1
    ))
    setLoadingMembers(false)
  }, [user, workspace.id])

  useEffect(() => {
    void loadMembersAndThreads()
  }, [loadMembersAndThreads])

  // ── Open / create a thread with a member ────────────────────────────────────
  const openThread = useCallback(async (otherUserId: string) => {
    if (!user) return
    const [pa, pb] = orderedParticipants(user.id, otherUserId)

    // Try to find existing thread
    let thread = threads.find(
      (t) => t.participant_a === pa && t.participant_b === pb
    )

    if (!thread) {
      // Create new thread
      const { data, error } = await supabase
        .from('direct_message_threads')
        .insert({ workspace_id: workspace.id, participant_a: pa, participant_b: pb })
        .select()
        .single()

      if (error || !data) return

      const otherMember = members.find((m) => m.user_id === otherUserId)
      thread = {
        ...data,
        other_user_id: otherUserId,
        other_user_name: otherMember?.user_name || 'Unknown',
        other_user_email: otherMember?.user_email || '',
        other_user_avatar_url: otherMember?.user_avatar_url || null,
        is_online: isOnline(otherMember?.last_seen_at),
        unread_count: 0,
      }

      setThreads((prev) => [thread!, ...prev])
    }

    if (!thread) return

    setActiveThread(thread)
    setMobileShowThread(true)
    setInput('')
    void loadMessages(thread.id)
  }, [user, workspace.id, threads, members])

  // ── Load messages for active thread ─────────────────────────────────────────
  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true)

    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (!data) { setLoadingMessages(false); return }

    // Enrich with sender profiles
    const senderIds = [...new Set(data.map((m) => m.sender_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', senderIds)

    const profileMap: Record<string, any> = {}
    for (const p of profiles || []) profileMap[p.id] = p

    const enriched: DirectMessage[] = data.map((m) => ({
      ...m,
      sender_name: profileMap[m.sender_id]?.full_name || profileMap[m.sender_id]?.email?.split('@')[0] || 'User',
      sender_email: profileMap[m.sender_id]?.email || '',
      sender_avatar_url: profileMap[m.sender_id]?.avatar_url || null,
    }))

    setMessages(enriched)
    setLoadingMessages(false)

    // Mark thread as read
    await markThreadRead(threadId)
    refreshUnread()
  }, [refreshUnread])

  // ── Mark thread as read ──────────────────────────────────────────────────────
  const markThreadRead = async (threadId: string) => {
    if (!user) return
    await supabase
      .from('direct_message_reads')
      .upsert(
        { thread_id: threadId, user_id: user.id, read_at: new Date().toISOString() },
        { onConflict: 'thread_id,user_id' }
      )

    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unread_count: 0 } : t))
    )
  }

  // ── Realtime subscription for active thread ──────────────────────────────────
  useEffect(() => {
    if (!activeThread) return

    const channelName = `chat:${activeThread.id}:${Date.now()}`
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `thread_id=eq.${activeThread.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as DirectMessage
          if (newMsg.sender_id === user?.id) return // already added optimistically

          // Fetch sender profile
          const { data: p } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('id', newMsg.sender_id)
            .single()

          const enriched: DirectMessage = {
            ...newMsg,
            sender_name: p?.full_name || p?.email?.split('@')[0] || 'User',
            sender_email: p?.email || '',
            sender_avatar_url: p?.avatar_url || null,
          }

          setMessages((prev) => [...prev, enriched])
          await markThreadRead(activeThread.id)
          refreshUnread()

          // Update thread preview
          setThreads((prev) =>
            prev.map((t) =>
              t.id === activeThread.id
                ? { ...t, last_message_preview: enriched.sender_name + ': ' + enriched.content, last_message_at: enriched.created_at }
                : t
            )
          )
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [activeThread?.id])

  // ── Scroll to bottom on new messages ────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeThread || !user || sending) return
    const content = input.trim()
    setSending(true)
    setInput('')

    const myName = profile?.full_name || user.email?.split('@')[0] || 'Me'

    // Optimistic update
    const optimistic: DirectMessage = {
      id: `opt-${Date.now()}`,
      thread_id: activeThread.id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender_name: myName,
      sender_email: user.email || '',
      sender_avatar_url: profile?.avatar_url || null,
    }
    setMessages((prev) => [...prev, optimistic])

    // Update thread preview
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? { ...t, last_message_preview: `You: ${content}`, last_message_at: new Date().toISOString() }
          : t
      )
    )

    const { data: savedMsg, error } = await supabase
      .from('direct_messages')
      .insert({ thread_id: activeThread.id, sender_id: user.id, content })
      .select()
      .single()

    if (error) {
      // Rollback optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setInput(content)
      console.error('Failed to send message:', error)
    } else if (savedMsg) {
      // Replace the optimistic entry with the confirmed row (removes opacity-70)
      const confirmed: DirectMessage = {
        ...optimistic,
        id: savedMsg.id,
        created_at: savedMsg.created_at,
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? confirmed : m))
      )
    }

    setSending(false)
  }, [input, activeThread, user, profile, sending])

  // ── Key handler ──────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const otherMembers = members.filter((m) => m.user_id !== user?.id)

  const filteredMembers = otherMembers.filter((m) => {
    const name = (m.user_name || '').toLowerCase()
    const email = (m.user_email || '').toLowerCase()
    const q = search.toLowerCase()
    return name.includes(q) || email.includes(q)
  })

  // Sort: members with threads first (by last message), then alphabetically
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const ta = threads.find((t) => t.other_user_id === a.user_id)
    const tb = threads.find((t) => t.other_user_id === b.user_id)
    if (ta && tb) return (tb.last_message_at || '') > (ta.last_message_at || '') ? 1 : -1
    if (ta) return -1
    if (tb) return 1
    return (a.user_name || '').localeCompare(b.user_name || '')
  })

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Page Header */}
      <div className="flex items-center gap-3 px-4 sm:px-8 py-4 sm:py-5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0">
        <MessageCircle size={20} className="text-violet-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">Private conversations with workspace members</p>
        </div>
      </div>

      {/* Chat layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Panel: Member / Thread List ─────────────────────── */}
        <div className={cn(
          'w-full sm:w-[300px] lg:w-[320px] flex flex-col border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0',
          mobileShowThread && activeThread ? 'hidden sm:flex' : 'flex'
        )}>
          {/* Search */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500 transition-all"
              />
            </div>
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loadingMembers ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sortedMembers.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
                No members found
              </div>
            ) : (
              sortedMembers.map((m) => {
                const thread = threads.find((t) => t.other_user_id === m.user_id)
                const unread = thread?.unread_count || 0
                const isActive = activeThread?.other_user_id === m.user_id
                const online = isOnline(m.last_seen_at)

                return (
                  <button
                    key={m.user_id}
                    onClick={() => void openThread(m.user_id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                      isActive && 'bg-violet-50 dark:bg-violet-950/40 border-r-2 border-violet-500'
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        email={m.user_email || ''}
                        name={m.user_name || ''}
                        src={m.user_avatar_url}
                        size="md"
                      />
                      {online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-gray-900 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          'text-sm font-semibold truncate',
                          unread > 0
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300'
                        )}>
                          {m.user_name}
                        </span>
                        {thread?.last_message_at && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                            {timeAgo(thread.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className={cn(
                          'text-xs truncate',
                          unread > 0
                            ? 'text-gray-700 dark:text-gray-300 font-medium'
                            : 'text-gray-400 dark:text-gray-500'
                        )}>
                          {thread?.last_message_preview || (online ? 'Online' : m.user_email)}
                        </p>
                        {unread > 0 && (
                          <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center bg-violet-500 text-white text-[10px] font-bold rounded-full px-1">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right Panel: Message Thread ───────────────────────────── */}
        <div className={cn(
          'flex-1 flex flex-col bg-[#F9FAFB] dark:bg-[#0f1117] min-w-0',
          !mobileShowThread && activeThread ? 'hidden sm:flex' : activeThread ? 'flex' : 'hidden sm:flex'
        )}>
          {!activeThread ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center">
                <MessageCircle size={36} className="text-violet-500 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Select a conversation
                </h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                  Choose a workspace member from the left to start or continue a private conversation.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0">
                {/* Mobile back button */}
                <button
                  className="sm:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                  onClick={() => { setMobileShowThread(false); setActiveThread(null) }}
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="relative">
                  <Avatar
                    email={activeThread.other_user_email || ''}
                    name={activeThread.other_user_name || ''}
                    src={activeThread.other_user_avatar_url}
                    size="sm"
                  />
                  {activeThread.is_online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-gray-800 rounded-full" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {activeThread.other_user_name}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {activeThread.is_online ? (
                      <span className="text-emerald-500 dark:text-emerald-400 font-medium">● Online</span>
                    ) : (
                      activeThread.other_user_email
                    )}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin">
                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center">
                      <MessageCircle size={24} className="text-violet-400" />
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Say hello to <span className="font-medium text-gray-600 dark:text-gray-300">{activeThread.other_user_name}</span>!
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isMine = msg.sender_id === user?.id
                      const prevMsg = messages[idx - 1]
                      const showAvatar = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
                      const showTime = !prevMsg ||
                        new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000

                      return (
                        <div key={msg.id}>
                          {showTime && (
                            <div className="text-center my-3">
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                                {formatTime(msg.created_at)}
                              </span>
                            </div>
                          )}
                          <div className={cn(
                            'flex items-end gap-2',
                            isMine ? 'flex-row-reverse' : 'flex-row'
                          )}>
                            {!isMine && (
                              <div className="w-6 shrink-0">
                                {showAvatar && (
                                  <Avatar
                                    email={msg.sender_email || ''}
                                    name={msg.sender_name || ''}
                                    src={msg.sender_avatar_url}
                                    size="xs"
                                  />
                                )}
                              </div>
                            )}
                            <div className={cn(
                              'max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                              isMine
                                ? 'bg-violet-600 text-white rounded-br-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm',
                              msg.id.startsWith('opt-') && 'opacity-70'
                            )}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="px-4 pb-4 pt-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeThread.other_user_name}… (Enter to send, Shift+Enter for new line)`}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 focus:bg-white dark:focus:bg-gray-800 transition-all"
                    style={{ maxHeight: '120px', overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
                    id="chat-input"
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || sending}
                    className={cn(
                      'p-2.5 rounded-xl text-white transition-all shrink-0 mb-0.5',
                      input.trim()
                        ? 'bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-200 dark:shadow-violet-900/30'
                        : 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                    )}
                    id="btn-send-chat"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
