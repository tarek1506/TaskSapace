import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface ChatContextType {
  totalUnread: number
  refreshUnread: () => void
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const computeUnread = useCallback(async () => {
    if (!user) return

    // Get all threads the current user is in, within this workspace
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

    // Get read timestamps for each thread
    const { data: reads } = await supabase
      .from('direct_message_reads')
      .select('thread_id, read_at')
      .eq('user_id', user.id)
      .in('thread_id', threadIds)

    const readMap: Record<string, string> = {}
    for (const r of reads || []) {
      readMap[r.thread_id] = r.read_at
    }

    // Count messages newer than last read, not sent by current user
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
        () => { void computeUnread() }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [workspaceId, user?.id, computeUnread])

  return (
    <ChatContext.Provider value={{ totalUnread, refreshUnread: computeUnread }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatUnread() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatUnread must be used within ChatProvider')
  return ctx
}
