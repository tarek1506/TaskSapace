import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { playMessageSound } from '@/lib/sounds'

// ─── Toast type ───────────────────────────────────────────────────────────────
export interface ChatToast {
  id: string
  senderName: string
  senderEmail: string
  senderAvatarUrl: string | null
  preview: string
}

interface ChatContextType {
  totalUnread: number
  refreshUnread: () => void
  toast: ChatToast | null
  dismissToast: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({
  children,
  workspaceId,
}: {
  children: React.ReactNode
  workspaceId: string
}) {
  const { user } = useAuth()
  const [totalUnread, setTotalUnread] = useState(0)
  const [toast, setToast] = useState<ChatToast | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const dismissToast = useCallback(() => {
    setToast(null)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  const showToast = useCallback((t: ChatToast) => {
    // Cancel any existing auto-dismiss
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(t)
    toastTimerRef.current = setTimeout(() => setToast(null), 4500)
  }, [])

  const computeUnread = useCallback(async () => {
    if (!user) return

    const { data: threads } = await supabase
      .from('direct_message_threads')
      .select('id')
      .eq('workspace_id', workspaceId)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)

    if (!threads || threads.length === 0) {
      setTotalUnread(0)
      return
    }

    const threadIds = threads.map((t) => t.id)

    const { data: reads } = await supabase
      .from('direct_message_reads')
      .select('thread_id, read_at')
      .eq('user_id', user.id)
      .in('thread_id', threadIds)

    const readMap: Record<string, string> = {}
    for (const r of reads || []) readMap[r.thread_id] = r.read_at

    let unread = 0
    for (const threadId of threadIds) {
      const lastRead = readMap[threadId] || new Date(0).toISOString()
      const { count } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .eq('thread_id', threadId)
        .neq('sender_id', user.id)
        .gt('created_at', lastRead)
      unread += count || 0
    }

    setTotalUnread(unread)
  }, [user, workspaceId])

  useEffect(() => {
    void computeUnread()

    const channelName = `chat-unread:${workspaceId}:${user?.id}:${Date.now()}`
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        async (payload) => {
          const msg = payload.new as { id: string; sender_id: string; content: string; thread_id: string }

          // Only handle messages from other users
          if (msg.sender_id === user?.id) {
            void computeUnread()
            return
          }

          // Verify the message belongs to one of our threads in this workspace
          const { data: thread, error: threadErr } = await supabase
            .from('direct_message_threads')
            .select('workspace_id, participant_a, participant_b')
            .eq('id', msg.thread_id)
            .single()

          if (threadErr || !thread) return
          if (thread.workspace_id !== workspaceId) return
          if (thread.participant_a !== user?.id && thread.participant_b !== user?.id) return

          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('id', msg.sender_id)
            .single()

          const senderName = profile?.full_name || profile?.email?.split('@')[0] || 'Someone'
          const preview = msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content

          // Play sound & show toast
          playMessageSound()
          showToast({
            id: msg.id,
            senderName,
            senderEmail: profile?.email || '',
            senderAvatarUrl: profile?.avatar_url || null,
            preview,
          })

          void computeUnread()
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [workspaceId, user?.id, computeUnread, showToast])

  return (
    <ChatContext.Provider value={{ totalUnread, refreshUnread: computeUnread, toast, dismissToast }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatUnread() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatUnread must be used within ChatProvider')
  return ctx
}

