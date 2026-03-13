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
  claimed_player_id?: string
  claimed_player_name?: string
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
      console.log('useUserRole: fetchRole starting', { userId: user.id, groupId });
      try {
        setLoading(true)
        
        // 1. Check if user is the owner of the group
        if (groupId) {
          const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('owner_id, settings')
            .eq('id', groupId)
            .maybeSingle()
          
          if (groupError) {
            console.error('useUserRole: Error fetching group', groupError);
          }

          if (!groupError && groupData) {
            console.log('useUserRole: Group data found', { 
              ownerId: groupData.owner_id, 
              userId: user.id,
              isOwner: groupData.owner_id === user.id 
            });
            
            if (groupData.owner_id === user.id) {
              console.log('useUserRole: User is owner');
              setRole('admin')
              setLoading(false)
              return
            }

            // 2. Check group-specific roles in settings
            const settings = groupData.settings as unknown as GroupSettings
            console.log('useUserRole: Checking settings roles', settings?.roles);
            if (settings?.roles && settings.roles[user.id]) {
              console.log('useUserRole: Role found in settings', settings.roles[user.id]);
              setRole(settings.roles[user.id] as AppRole)
              setLoading(false)
              return
            }

            // 3. Check if user has a player record in this group (indicates a request or link)
            const { data: playerData, error: playerError } = await supabase
              .from('players')
              .select('id, user_id')
              .eq('group_id', groupId)
              .eq('user_id', user.id)
              .maybeSingle()
            
            if (!playerError && playerData) {
              console.log('useUserRole: User has player record in group, setting role to pending');
              // If they have a player but aren't in roles yet, they are pending
              setRole('pending')
              setLoading(false)
              return
            }
          }
        }

        // 4. Fallback to global role ONLY if not in a group context
        // If we are in a group context and reached here, the user has NO role in this group
        if (!groupId) {
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
        } else {
          // In group context, if no role found yet, they are not a member
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
    const isActuallyAdmin = role === 'admin' || isSuperAdmin;
    console.log('fetchPendingUsers called', { userId: user?.id, role, isSuperAdmin, isActuallyAdmin, groupId });
    
    if (!user || !isActuallyAdmin || !groupId) {
      console.log('fetchPendingUsers: Not authorized or no group', { 
        user: !!user, 
        isActuallyAdmin, 
        groupId 
      });
      return;
    }

    try {
      setLoading(true)
      console.log('fetchPendingUsers: Fetching group data for', groupId);
      
      // 1. Get group settings for roles and pending links
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('settings')
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError

      const settings = groupData.settings as unknown as GroupSettings
      const roles = settings?.roles || {}
      const pendingLinks = settings?.pendingLinks || {}
      
      // 2. Get all players in the group that have a user_id
      // This catches users who created a player to request access
      const { data: playersWithUser, error: playersError } = await supabase
        .from('players')
        .select('user_id, name, id')
        .eq('group_id', groupId)
        .not('user_id', 'is', null)

      if (playersError) throw playersError

      console.log('fetchPendingUsers: Found players with user_id', playersWithUser);

      // 3. Combine UIDs from settings.roles and players table
      const pendingFromSettings = Object.keys(roles).filter(id => roles[id] === 'pending')
      const pendingFromPlayers = playersWithUser
        .filter(p => !roles[p.user_id] || roles[p.user_id] === 'pending')
        .map(p => p.user_id)

      const allPendingUserIds = Array.from(new Set([...pendingFromSettings, ...pendingFromPlayers]))
      
      console.log('fetchPendingUsers: All pending user IDs', allPendingUserIds);

      if (allPendingUserIds.length === 0) {
        setPendingUsers([])
        setLoading(false)
        return
      }

      // 4. Fetch profiles for all pending users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, name')
        .in('user_id', allPendingUserIds)

      if (profilesError) throw profilesError

      // 5. Map to PendingUser objects
      const pending: PendingUser[] = allPendingUserIds.map(userId => {
        const profile = profilesData?.find(p => p.user_id === userId)
        const playerLink = playersWithUser?.find(p => p.user_id === userId)
        
        return {
          id: userId,
          user_id: userId,
          role: 'pending',
          created_at: new Date().toISOString(),
          email: profile?.email || 'N/A',
          name: profile?.name || playerLink?.name || 'Usuário',
          claimed_player_id: pendingLinks[userId] || playerLink?.id,
          claimed_player_name: playerLink?.name
        }
      })

      console.log('fetchPendingUsers: Final pending list', pending);
      setPendingUsers(pending)
    } catch (err) {
      console.error('fetchPendingUsers: Error', err)
      toast.error('Erro ao buscar solicitações pendentes')
    } finally {
      setLoading(false)
    }
  }, [user, groupId, role, isSuperAdmin])

  const approveUser = async (userId: string, targetRole: AppRole = 'approved') => {
    const isActuallyAdmin = role === 'admin' || isSuperAdmin;
    if (!user || !isActuallyAdmin) {
      console.error('approveUser: Not authorized', { role, isSuperAdmin });
      return { success: false, error: 'Não autorizado' };
    }

    try {
      if (groupId) {
        console.log('approveUser: Approving for group', { groupId, userId, targetRole });
        // Group-specific approval
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('settings')
          .eq('id', groupId)
          .single()
        
        if (groupError) throw groupError
        
        const settings = groupData.settings as unknown as GroupSettings
        const roles = { ...(settings?.roles || {}), [userId]: targetRole }
        
        // Handle pending link if it exists
        const playerLinks = { ...(settings?.playerLinks || {}) }
        const pendingLinks = { ...(settings?.pendingLinks || {}) }
        const playerId = pendingLinks[userId]
        
        if (playerId) {
          playerLinks[userId] = playerId
          delete pendingLinks[userId]
          
          // Also update players table for direct link
          await supabase
            .from('players')
            .update({ user_id: userId })
            .eq('id', playerId)
        }
        
        const { error: updateError } = await supabase
          .from('groups')
          .update({ settings: { ...settings, roles, playerLinks, pendingLinks } })
          .eq('id', groupId)
        
        if (updateError) throw updateError
        console.log('approveUser: Success');
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
    const isActuallyAdmin = role === 'admin' || isSuperAdmin;
    if (!user || !isActuallyAdmin) {
      console.error('rejectUser: Not authorized', { role, isSuperAdmin });
      return { success: false, error: 'Não autorizado' };
    }

    try {
      if (groupId) {
        console.log('rejectUser: Rejecting for group', { groupId, userId });
        // Group-specific rejection
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('settings')
          .eq('id', groupId)
          .single()
        
        if (groupError) throw groupError
        
        const settings = groupData.settings as unknown as GroupSettings
        const roles = { ...(settings?.roles || {}) }
        delete roles[userId]
        
        const pendingLinks = { ...(settings?.pendingLinks || {}) }
        delete pendingLinks[userId]
        
        const { error: updateError } = await supabase
          .from('groups')
          .update({ settings: { ...settings, roles, pendingLinks } })
          .eq('id', groupId)
        
        if (updateError) throw updateError

        // Also unset user_id in players table so they can request again
        await supabase
          .from('players')
          .update({ user_id: null })
          .eq('group_id', groupId)
          .eq('user_id', userId)

        console.log('rejectUser: Success');
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

  const requestAccess = async (playerId?: string) => {
    if (!user || !groupId) return { success: false }
    console.log('requestAccess: Starting', { userId: user.id, groupId, playerId });
    try {
      // 1. Create a player record for this user in the group
      // This acts as the "Request" since the user can't update the groups table directly
      const { data: existingPlayer, error: checkError } = await supabase
        .from('players')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (checkError) throw checkError

      if (!existingPlayer) {
        console.log('requestAccess: Creating player record for request');
        const { error: createError } = await supabase
          .from('players')
          .insert({
            group_id: groupId,
            user_id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Novo Membro',
            type: 'convidado'
          })

        if (createError) {
          console.error('requestAccess: Error creating player request', createError);
          // If this fails, we might still try to update the group settings 
          // (though we know it likely fails for non-owners)
        }
      }

      // 2. Try to update group settings (will only work if user is owner, but good to have)
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('settings')
        .eq('id', groupId)
        .single()
      
      if (!groupError && groupData) {
        const settings = groupData.settings as unknown as GroupSettings
        const roles = { ...(settings?.roles || {}), [user.id]: 'pending' }
        const pendingLinks = { ...(settings?.pendingLinks || {}), [user.id]: playerId }
        
        console.log('requestAccess: Updating group settings', { roles, pendingLinks });
        
        const { error: updateError } = await supabase
          .from('groups')
          .update({ settings: { ...settings, roles, pendingLinks } })
          .eq('id', groupId)
        
        if (updateError) {
          console.log('requestAccess: Group update failed (expected for non-owners), relying on player record');
        }
      }
      
      console.log('requestAccess: Success');
      setRole('pending')
      return { success: true }
    } catch (error) {
      console.error('Error requesting access:', error)
      return { success: false, error }
    }
  }

  const isSuperAdmin = user?.email ? user.email.toLowerCase().trim() === 'viniciusmazz@gmail.com' : false;
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
