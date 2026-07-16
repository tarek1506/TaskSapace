import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AppNotification } from '@/types'

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  markAllAsRead: () => void
  loading: boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Fetch profiles by user_ids from the public.profiles table (avoids cross-schema FK join issue)
async function enrichWithProfiles(rows: any[]): Promise<AppNotification[]> {
  if (rows.length === 0) return []
  const uniqueUserIds = [...new Set(rows.map((r) => r.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', uniqueUserIds)

  const profileMap: Record<string, { email: string; full_name: string | null }> = {}
  for (const p of profiles || []) {
    profileMap[p.id] = p
  }

  return rows.map((n) => {
    const p = profileMap[n.user_id]
    return {
      ...n,
      user_email: p?.email || '',
      user_name: p?.full_name || p?.email?.split('@')[0] || 'User',
    }
  })
}

export function NotificationProvider({
  children,
  workspaceId,
}: {
  children: React.ReactNode
  workspaceId: string
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [lastViewed, setLastViewed] = useState<string>(() => {
    return localStorage.getItem(`notifications_last_viewed_${workspaceId}`) || new Date(0).toISOString()
  })
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Reset lastViewed state and load when workspaceId changes
  useEffect(() => {
    const key = `notifications_last_viewed_${workspaceId}`
    const stored = localStorage.getItem(key) || new Date(0).toISOString()
    setLastViewed(stored)
  }, [workspaceId])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching notifications:', error)
      setLoading(false)
      return
    }

    const enriched = await enrichWithProfiles(data || [])
    setNotifications(enriched)
    setLoading(false)
  }, [workspaceId])

  useEffect(() => {
    // Fetch initial notifications immediately
    void fetchNotifications()

    // Create real-time subscription
    const channelName = `notifications:${workspaceId}:${Date.now()}`
    channelRef.current = supabase.channel(channelName)

    // Subscribe to INSERT events for notifications in this workspace
    channelRef.current
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload) => {
          console.log('🔔 Real-time notification received:', payload)
          
          // Fetch the profile of the user who caused the notification
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', payload.new.user_id)
            .single()

          const newNotif: AppNotification = {
            id: payload.new.id,
            workspace_id: payload.new.workspace_id,
            user_id: payload.new.user_id,
            task_id: payload.new.task_id,
            action_type: payload.new.action_type,
            details: payload.new.details,
            created_at: payload.new.created_at,
            user_email: profile?.email || '',
            user_name: profile?.full_name || profile?.email?.split('@')[0] || 'User',
          }

          setNotifications((prev) => {
            // Check for duplicates
            if (prev.some((n) => n.id === newNotif.id)) {
              return prev
            }
            return [newNotif, ...prev].slice(0, 20)
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Notifications subscription active')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Notifications channel error')
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Notifications subscription timed out')
        }
      })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [workspaceId, fetchNotifications])

  const markAllAsRead = () => {
    const now = new Date().toISOString()
    localStorage.setItem(`notifications_last_viewed_${workspaceId}`, now)
    setLastViewed(now)
  }

  const unreadCount = notifications.filter((n) => n.created_at > lastViewed).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllAsRead,
        loading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
