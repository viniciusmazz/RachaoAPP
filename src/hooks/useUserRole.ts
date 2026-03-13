import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from '@/hooks/use-toast'
import type { GroupSettings } from '@/types/football'

export type AppRole = 'admin' | 'pending' | 'approved' | 'financeiro' | 'atleta' | 'rejected'

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
  const isSuperAdmin = user?.email ? user.email.toLowerCase().trim() === 'viniciusmazz@gmail.com' : false;
  const [role, setRole] = useState<AppRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [refreshingMembers, setRefreshingMembers] = useState(false)

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

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
            // If they have a player but aren't in roles yet, they are pending
            setRole('pending')
            setLoading(false)
            return
          }
        }
      }

      // 4. Fallback to global role ONLY if not in a group context
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
        setRole(null)
      }
    } catch (error) {
      console.error('Error fetching role:', error)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }, [user, groupId])

  useEffect(() => {
    fetchRole()
  }, [fetchRole])

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
        .select('settings, owner_id')
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError

      const settings = groupData.settings as unknown as GroupSettings
      const roles = settings?.roles || {}
      const pendingLinks = settings?.pendingLinks || {}
      
      // 2. Get all players in the group
      // This catches users who created a player to request access
      const { data: playersWithUser, error: playersError } = await supabase
        .from('players')
        .select('user_id, name, id, type')
        .eq('group_id', groupId)

      if (playersError) throw playersError

      console.log('fetchPendingUsers: Found players', playersWithUser);

      // 3. Combine UIDs from settings.roles and players table
      const pendingFromSettings = Object.keys(roles).filter(id => roles[id] === 'pending')
      
      console.log('fetchPendingUsers: Roles in settings', roles);
      
      const pendingFromPlayers = playersWithUser
        .filter(p => {
          if (!p.user_id) return false; // Only consider players with a user_id for pending requests
          const userRole = roles[p.user_id];
          const isOwner = p.user_id === groupData.owner_id;
          const isRejected = userRole === 'rejected';
          const isAlreadyMember = userRole && userRole !== 'pending' && userRole !== 'rejected';
          
          console.log('fetchPendingUsers: Filtering player', { 
            name: p.name, 
            userId: p.user_id, 
            userRole, 
            isOwner, 
            isRejected, 
            isAlreadyMember 
          });

          // A user is pending if:
          // 1. They are not the owner
          // 2. They are not explicitly rejected
          // 3. They are not already a member (approved, admin, etc.)
          // 4. They are explicitly a request (name starts with 'Solicitação:') or have 'pending' role
          const isExplicitRequest = p.name?.startsWith('Solicitação:') || p.type === 'convidado';
          const isPending = !isOwner && !isRejected && !isAlreadyMember && (isExplicitRequest || !userRole || userRole === 'pending');
          
          console.log('fetchPendingUsers: Player is pending?', isPending, { name: p.name, type: p.type });
          return isPending;
        })
        .map(p => p.user_id)

      const allPendingUserIds = Array.from(new Set([...pendingFromSettings, ...pendingFromPlayers]))
        .filter(id => id !== groupData.owner_id)
      
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
        
        // Check if this player record is a claim for another player
        const isClaim = playerLink?.type?.startsWith('claim:');
        const isNewRequest = playerLink?.name?.startsWith('Solicitação:');
        
        // If it's a claim, the ID is in the type string. 
        // If it's a new request, there is NO claimed player ID (the playerLink is just a placeholder)
        const claimedPlayerId = isClaim ? playerLink.type.split(':')[1] : (isNewRequest ? null : (pendingLinks[userId] || null));
        
        return {
          id: userId,
          user_id: userId,
          role: 'pending',
          created_at: new Date().toISOString(),
          email: profile?.email || 'N/A',
          name: profile?.name || profile?.email?.split('@')[0] || 'Usuário',
          claimed_player_id: claimedPlayerId,
          claimed_player_name: undefined // Will be fetched next
        }
      })

      // 6. Fetch names for claimed players if needed
      const claimedIds = pending.map(p => p.claimed_player_id).filter(Boolean) as string[];
      if (claimedIds.length > 0) {
        const { data: claimedPlayersData } = await supabase
          .from('players')
          .select('id, name')
          .in('id', claimedIds);
        
        if (claimedPlayersData) {
          pending.forEach(p => {
            if (p.claimed_player_id) {
              const cp = claimedPlayersData.find(cp => cp.id === p.claimed_player_id);
              if (cp) {
                p.claimed_player_name = cp.name;
              }
            }
          });
        }
      }

      console.log('fetchPendingUsers: Final pending list', pending);
      setPendingUsers(pending)
    } catch (err) {
      console.error('fetchPendingUsers: Error', err)
      toast({
        title: "Erro",
        description: "Erro ao buscar solicitações pendentes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [user, groupId, role, isSuperAdmin])

  useEffect(() => {
    if (!user || !groupId) return

    console.log('useUserRole: Setting up real-time subscriptions for group', groupId);

    // 1. Subscribe to group changes (roles, settings)
    const groupChannel = supabase
      .channel(`group_changes_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'groups',
          filter: `id=eq.${groupId}`
        },
        (payload) => {
          console.log('useUserRole: Group updated via realtime', payload);
          fetchRole();
          fetchPendingUsers();
        }
      )
      .subscribe()

    // 2. Subscribe to player changes (requests, links)
    const playerChannel = supabase
      .channel(`player_changes_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('useUserRole: Player table changed via realtime', payload);
          fetchRole();
          fetchPendingUsers();
        }
      )
      .subscribe()

    return () => {
      console.log('useUserRole: Cleaning up subscriptions');
      supabase.removeChannel(groupChannel)
      supabase.removeChannel(playerChannel)
    }
  }, [user, groupId, fetchRole, fetchPendingUsers])

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
        
        // Find the claimed player ID for this user
        const pendingUser = pendingUsers.find(u => u.user_id === userId);
        const playerId = pendingLinks[userId] || pendingUser?.claimed_player_id;
        
        if (playerId) {
          playerLinks[userId] = playerId
          delete pendingLinks[userId]
          
          // Also update players table for direct link
          await supabase
            .from('players')
            .update({ user_id: userId })
            .eq('id', playerId)

          // If the user had placeholder player records (used for the request), delete them
          // but ONLY if they are not the same as the one we just linked
          await supabase
            .from('players')
            .delete()
            .eq('user_id', userId)
            .eq('group_id', groupId)
            .neq('id', playerId);
        } else {
          // If the user was a new request (no claim), delete their placeholder
          // They will be approved but without a linked player
          console.log('approveUser: New request without claim, deleting placeholder');
          await supabase
            .from('players')
            .delete()
            .eq('user_id', userId)
            .eq('group_id', groupId)
            .ilike('name', 'Solicitação:%');
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
      setRefreshingMembers(true)
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('settings, owner_id')
        .eq('id', groupId)
        .single()
      
      if (groupError) throw groupError
      
      const settings = (groupData.settings || {}) as unknown as GroupSettings;
      const roles = settings?.roles || {}

      console.log('fetchGroupMembers: Fetched group data', { 
        ownerId: groupData.owner_id, 
        hasSettings: !!groupData.settings,
        hasPlayerLinks: !!settings.playerLinks,
        rolesCount: Object.keys(roles).length
      });
      
      const userIds = Object.keys(roles).filter(id => roles[id] !== 'pending' && roles[id] !== 'rejected')
      
      // Add owner if not in roles
      if (!userIds.includes(groupData.owner_id)) {
        userIds.push(groupData.owner_id)
      }

      console.log('fetchGroupMembers: Final userIds to fetch profiles for', userIds);

      if (userIds.length === 0) {
        setGroupMembers([])
        return
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, name')
        .in('user_id', userIds)

      if (profilesError) throw profilesError

      // Fetch ALL players in this group to resolve names for links
      const { data: allGroupPlayers, error: playersError } = await supabase
        .from('players')
        .select('id, name, user_id')
        .eq('group_id', groupId);
      
      if (playersError) {
        console.error('Error fetching group players:', playersError);
      }
      
      // Use a Map to store the link for each user
      const linkedMap = new Map<string, { id: string; name: string }>();
      
      // MASTER LINK LOGIC:
      // If settings.playerLinks exists, it is the EXCLUSIVE source of truth for this group.
      // This prevents "ghost" links from appearing if the players table update failed due to RLS.
      if (settings.playerLinks) {
        console.log('fetchGroupMembers: Using playerLinks from settings (Master Mode)', settings.playerLinks);
        Object.entries(settings.playerLinks).forEach(([uId, pId]) => {
          const player = allGroupPlayers?.find(p => p.id === pId);
          if (player) {
            linkedMap.set(uId, { id: player.id, name: player.name });
          }
        });
      } else {
        // Legacy Mode: Fallback to players table if settings.playerLinks is not yet initialized
        console.log('fetchGroupMembers: No playerLinks in settings, falling back to players table (Legacy Mode)');
        allGroupPlayers?.forEach(p => {
          if (p.user_id && !linkedMap.has(p.user_id)) {
            linkedMap.set(p.user_id, { id: p.id, name: p.name });
          }
        });
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
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de membros.",
        variant: "destructive"
      })
    } finally {
      setRefreshingMembers(false)
    }
  }, [groupId])

  const rejectUser = async (userId: string) => {
    const isActuallyAdmin = role === 'admin' || isSuperAdmin;
    if (!user || !isActuallyAdmin) {
      console.error('rejectUser: Not authorized', { role, isSuperAdmin });
      toast({
        title: "Não autorizado",
        description: "Você não tem permissão para realizar esta ação.",
        variant: "destructive"
      });
      return { success: false, error: 'Não autorizado' };
    }

    try {
      if (groupId) {
        console.log('rejectUser: Starting rejection process', { groupId, userId });
        
        // 1. Fetch current group data
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('settings')
          .eq('id', groupId)
          .single()
        
        if (groupError) {
          console.error('rejectUser: Error fetching group data', groupError);
          throw groupError;
        }
        
        // 2. Update settings
        const settings = (groupData.settings || {}) as unknown as GroupSettings
        const roles = { ...(settings?.roles || {}) }
        
        // ALWAYS set to 'rejected' to prevent them from reappearing in the pending list
        // if they still have a player record in the group.
        roles[userId] = 'rejected' as AppRole
        
        const pendingLinks = { ...(settings?.pendingLinks || {}) }
        delete pendingLinks[userId]
        
        const playerLinks = { ...(settings?.playerLinks || {}) }
        delete playerLinks[userId]
        
        console.log('rejectUser: Updating group settings to rejected for user', userId);

        const { error: updateError } = await supabase
          .from('groups')
          .update({ 
            settings: { 
              ...settings, 
              roles, 
              pendingLinks,
              playerLinks
            } 
          })
          .eq('id', groupId)
        
        if (updateError) {
          console.error('rejectUser: Error updating group settings', updateError);
          throw updateError;
        }

        // 3. Handle player records (Best effort - don't let it fail the whole process)
        try {
          console.log('rejectUser: Cleaning up player records for user', userId);
          
          const { data: userPlayers } = await supabase
            .from('players')
            .select('id, type')
            .eq('group_id', groupId)
            .eq('user_id', userId);

          if (userPlayers && userPlayers.length > 0) {
            for (const p of userPlayers) {
              if (p.type?.startsWith('claim:') || p.name?.startsWith('Solicitação:')) {
                console.log('rejectUser: Deleting placeholder player', p.id);
                await supabase.from('players').delete().eq('id', p.id);
              } else {
                console.log('rejectUser: Clearing user_id from real player', p.id);
                await supabase.from('players').update({ user_id: null }).eq('id', p.id);
              }
            }
          }
        } catch (playerErr) {
          console.warn('rejectUser: Player cleanup failed (likely RLS), but group removal succeeded', playerErr);
        }

        console.log('rejectUser: Rejection/Removal completed successfully');
      } else {
        console.log('rejectUser: Global rejection (user_roles)');
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)

        if (error) throw error
      }

      // Force immediate refresh
      await fetchPendingUsers();
      if (groupId) await fetchGroupMembers();

      return { success: true }
    } catch (error) {
      console.error('Error rejecting user:', error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar a solicitação.",
        variant: "destructive"
      });
      return { success: false, error }
    }
  }

  const requestAccess = async (playerId?: string) => {
    if (!user || !groupId) return { success: false }
    console.log('requestAccess: Starting', { userId: user.id, groupId, playerId });
    try {
      // 1. Create/Update a player record for this user in the group
      // This record acts as the "request" itself.
      console.log('requestAccess: Fetching existing player', { groupId, userId: user.id });
      const { data: existingPlayer, error: checkError } = await supabase
        .from('players')
        .select('id, type, name')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (checkError) {
        console.error('requestAccess: Error checking existing player', checkError);
        throw checkError
      }
      console.log('requestAccess: Existing player found', existingPlayer);

      const requestType = 'convidado'; 
      const requestName = `Solicitação: ${user.user_metadata?.name || user.email?.split('@')[0] || 'Novo Membro'}`;

      if (!existingPlayer) {
        console.log('requestAccess: Creating new player record', { groupId, userId: user.id, requestName, requestType });
        const { error: insertError } = await supabase
          .from('players')
          .insert({
            group_id: groupId,
            user_id: user.id,
            name: requestName,
            type: requestType,
          })
        if (insertError) {
          console.error('requestAccess: Insert error', insertError);
          throw insertError
        }
        console.log('requestAccess: Player record created successfully');
      } else {
        console.log('requestAccess: Updating existing player record', existingPlayer.id);
        const { error: updateError } = await supabase
          .from('players')
          .update({
            name: requestName,
            type: requestType
          })
          .eq('id', existingPlayer.id)
        if (updateError) {
          console.error('requestAccess: Update error', updateError);
          throw updateError
        }
        console.log('requestAccess: Player record updated successfully');
      }

      // Note: We NO LONGER try to update the groups table here because 
      // regular users don't have permission to update group settings (RLS).
      // The admin will see the request by scanning the players table.
      
      console.log('requestAccess: Success');
      setRole('pending');
      return { success: true }
    } catch (error) {
      console.error('Error requesting access:', error)
      return { success: false, error }
    }
  }

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
    requestAccess,
    refreshingMembers
  }
}
