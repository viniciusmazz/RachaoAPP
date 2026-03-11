import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import type { GroupSettings } from '@/types/football'

export type AppRole = 'admin' | 'pending' | 'approved' | 'financeiro' | 'atleta'

interface UserRole {
  id: string
  user_id: string
  role: AppRole
  created_at: string
  updated_at: string
}

interface GroupMember {
  user_id: string
  role: AppRole
  email: string
  name: string | null
  player_id?: string
  player_name?: string
}

interface PendingUser {
  id: string
  user_id: string
  role: AppRole
  created_at: string
  email: string
  name: string | null
}

export const useUserRole = (groupId?: string) => {
  const { user } = useAuth()
  const [role, setRole] = useState<AppRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchRole = async () => {
      try {
        setLoading(true)
        
        // 1. Check if user is the owner of the group
        if (groupId) {
          const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('owner_id, settings')
            .eq('id', groupId)
            .maybeSingle()
          
          if (!groupError && groupData) {
            if (groupData.owner_id === user.id) {
              setRole('admin')
              setLoading(false)
              return
            }

            // 2. Check group-specific roles in settings
            const settings = groupData.settings as unknown as GroupSettings
            if (settings?.roles && settings.roles[user.id]) {
              setRole(settings.roles[user.id] as AppRole)
              setLoading(false)
              return
            }

            // 3. Check if user is linked to a player in this group
            const { data: playerData, error: playerError } = await supabase
              .from('players')
              .select('id')
              .eq('group_id', groupId)
              .eq('user_id', user.id)
              .maybeSingle()
            
            if (!playerError && playerData) {
              setRole('approved')
              setLoading(false)
              return
            }
          }
        }

        // 4. Fallback to global role
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Error fetching role:', error)
          setRole(null)
        } else if (data) {
          setRole(data.role as AppRole)
        } else {
          setRole(null)
        }
      } catch (error) {
        console.error('Error fetching role:', error)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [user, groupId])

  const fetchPendingUsers = useCallback(async () => {
    if (!user || role !== 'admin') return

    try {
      if (groupId) {
        // Group-specific pending users from settings
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('settings')
          .eq('id', groupId)
          .single()
        
        if (groupError) throw groupError
        
        const settings = groupData.settings as unknown as GroupSettings
        const roles = settings?.roles || {}
        const pendingUserIds = Object.keys(roles).filter(id => roles[id] === 'pending')
        
        if (pendingUserIds.length === 0) {
          setPendingUsers([])
          return
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, email, name')
          .in('user_id', pendingUserIds)

        if (profilesError) throw profilesError

        const pending: PendingUser[] = profilesData.map(p => ({
          id: p.user_id, // Use user_id as id for group-specific roles
          user_id: p.user_id,
          role: 'pending',
          created_at: new Date().toISOString(), // We don't track this in settings yet
          email: p.email,
          name: p.name
        }))

        setPendingUsers(pending)
      } else {
        // Global pending users (legacy)
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('id, user_id, role, created_at')
          .eq('role', 'pending')
          .order('created_at', { ascending: false })

        if (rolesError) throw rolesError

        if (!rolesData || rolesData.length === 0) {
          setPendingUsers([])
          return
        }

        const userIds = rolesData.map(r => r.user_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, email, name')
          .in('user_id', userIds)

        if (profilesError) throw profilesError

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || [])

        const pending: PendingUser[] = rolesData.map(r => ({
          id: r.id,
          user_id: r.user_id,
          role: r.role as AppRole,
          created_at: r.created_at,
          email: profilesMap.get(r.user_id)?.email || 'Email não encontrado',
          name: profilesMap.get(r.user_id)?.name || null
        }))

        setPendingUsers(pending)
      }
    } catch (error) {
      console.error('Error fetching pending users:', error)
    }
  }, [user, role, groupId])

  const approveUser = async (userId: string, targetRole: AppRole = 'approved') => {
    try {
      if (groupId) {
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('settings')
          .eq('id', groupId)
          .single()
        
        if (groupError) throw groupError
        
        const settings = groupData.settings as unknown as GroupSettings
        const roles = { ...(settings?.roles || {}), [userId]: targetRole }
        
        const { error: updateError } = await supabase
          .from('groups')
          .update({ settings: { ...settings, roles } })
          .eq('id', groupId)
        
        if (updateError) throw updateError
      } else {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: targetRole })
          .eq('id', userId)

        if (error) throw error
      }

      await fetchPendingUsers()
      if (groupId) await fetchGroupMembers()
      return { success: true }
    } catch (error) {
      console.error('Error approving user:', error)
      return { success: false, error }
    }
  }

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    if (!groupId) return { success: false }
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('settings')
        .eq('id', groupId)
        .single()
      
      if (groupError) throw groupError
      
      const settings = groupData.settings as unknown as GroupSettings
      const roles = { ...(settings?.roles || {}), [userId]: newRole }
      
      const { error: updateError } = await supabase
        .from('groups')
        .update({ settings: { ...settings, roles } })
        .eq('id', groupId)
      
      if (updateError) throw updateError
      
      await fetchGroupMembers()
      return { success: true }
    } catch (error) {
      console.error('Error updating user role:', error)
      return { success: false, error }
    }
  }

  const fetchGroupMembers = useCallback(async () => {
    if (!groupId) return

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('settings, owner_id')
        .eq('id', groupId)
        .single()
      
      if (groupError) throw groupError
      
      const settings = groupData.settings as unknown as GroupSettings
      const roles = settings?.roles || {}
      const userIds = Object.keys(roles).filter(id => roles[id] !== 'pending')
      
      // Add owner if not in roles
      if (!userIds.includes(groupData.owner_id)) {
        userIds.push(groupData.owner_id)
      }

      if (userIds.length === 0) {
        setGroupMembers([])
        return
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, name')
        .in('user_id', userIds)

      if (profilesError) throw profilesError

      // Fetch linked players for these users in this group
      const { data: linkedPlayers, error: linkedError } = await supabase
        .from('players')
        .select('id, name, user_id, updated_at')
        .eq('group_id', groupId)
        .not('user_id', 'is', null)
        .order('updated_at', { ascending: false });
      
      if (linkedError) {
        console.error('Error fetching linked players:', linkedError);
      } else {
        console.log(`Found ${linkedPlayers?.length || 0} linked players in group ${groupId}`);
      }
      
      // Use a Map to store the first (most recent) player found for each user from players table
      const linkedMap = new Map<string, { id: string; name: string }>();
      linkedPlayers?.forEach(p => {
        if (p.user_id && !linkedMap.has(p.user_id)) {
          linkedMap.set(p.user_id, { id: p.id, name: p.name });
        }
      });

      // OVERRIDE with links from group settings (Master Link)
      if (groupData?.settings) {
        const settings = groupData.settings as unknown as GroupSettings;
        if (settings.playerLinks) {
          Object.entries(settings.playerLinks).forEach(([uId, pId]) => {
            const player = linkedPlayers?.find(p => p.id === pId);
            if (player) {
              linkedMap.set(uId, { id: player.id, name: player.name });
            }
          });
        }
      }

      const members: GroupMember[] = profilesData.map(p => ({
        user_id: p.user_id,
        role: p.user_id === groupData.owner_id ? 'admin' : (roles[p.user_id] as AppRole || 'approved'),
        email: p.email,
        name: p.name,
        player_id: linkedMap.get(p.user_id)?.id,
        player_name: linkedMap.get(p.user_id)?.name
      }))

      setGroupMembers(members)
    } catch (error) {
      console.error('Error fetching group members:', error)
    }
  }, [groupId])

  const rejectUser = async (userId: string) => {
    try {
      if (groupId) {
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('settings')
          .eq('id', groupId)
          .single()
        
        if (groupError) throw groupError
        
        const settings = groupData.settings as unknown as GroupSettings
        const roles = { ...(settings?.roles || {}) }
        delete roles[userId]
        
        const { error: updateError } = await supabase
          .from('groups')
          .update({ settings: { ...settings, roles } })
          .eq('id', groupId)
        
        if (updateError) throw updateError
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('id', userId)

        if (error) throw error
      }

      await fetchPendingUsers()
      return { success: true }
    } catch (error) {
      console.error('Error rejecting user:', error)
      return { success: false, error }
    }
  }

  const requestAccess = async () => {
    if (!user || !groupId) return { success: false }
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('settings')
        .eq('id', groupId)
        .single()
      
      if (groupError) throw groupError
      
      const settings = groupData.settings as unknown as GroupSettings
      const roles = { ...(settings?.roles || {}), [user.id]: 'pending' }
      
      const { error: updateError } = await supabase
        .from('groups')
        .update({ settings: { ...settings, roles } })
        .eq('id', groupId)
      
      if (updateError) throw updateError
      setRole('pending')
      return { success: true }
    } catch (error) {
      console.error('Error requesting access:', error)
      return { success: false, error }
    }
  }

  const isSuperAdmin = user?.email === 'viniciusmazz@gmail.com'
  const isAdmin = role === 'admin' || isSuperAdmin
  const isFinanceiro = role === 'financeiro' || role === 'admin' || isSuperAdmin
  const isApproved = role === 'approved' || role === 'atleta' || role === 'financeiro' || role === 'admin' || isSuperAdmin
  const isPending = role === 'pending' && !isSuperAdmin

  return {
    role,
    loading,
    isAdmin,
    isSuperAdmin,
    isFinanceiro,
    isApproved,
    isPending,
    pendingUsers,
    groupMembers,
    fetchPendingUsers,
    fetchGroupMembers,
    approveUser,
    rejectUser,
    updateUserRole,
    requestAccess
  }
}
