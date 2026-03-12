import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Player, PlayerType, PositionSkill } from '@/types/football'
import { toast } from '@/hooks/use-toast'

export const usePlayers = (groupId?: string) => {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const loadPlayers = async () => {
    try {
      console.log('Loading players from secure table')
      let query = supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true })
      
      if (groupId) {
        query = query.eq('group_id', groupId)
      }

      const { data, error } = await query

      if (error) throw error

      const mappedPlayers: Player[] = data.map(player => ({
        id: player.id,
        name: player.name,
        type: player.type as PlayerType,
        photoUrl: player.photo_url,
        positions: player.positions as PositionSkill[] || []
      }))

      setPlayers(mappedPlayers)
      // Salvar no localStorage como backup
      localStorage.setItem('football:players', JSON.stringify(mappedPlayers))
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os jogadores",
        variant: "destructive"
      })
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('football:players')
        if (stored) {
          setPlayers(JSON.parse(stored))
        }
      } catch (storageError) {
        console.error('Erro ao carregar do localStorage:', storageError)
      }
    } finally {
      setLoading(false)
    }
  }

  const addPlayer = async (player: Omit<Player, 'id'>) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) console.warn('Session error in addPlayer:', sessionError.message)
      const session = sessionData?.session
      const user = session?.user
      
      if (!user) {
        // Fallback para localStorage
        const newPlayer: Player = {
          ...player,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        }
        const updatedPlayers = [newPlayer, ...players]
        setPlayers(updatedPlayers)
        localStorage.setItem('football:players', JSON.stringify(updatedPlayers))
        toast({
          title: "Sucesso",
          description: "Jogador adicionado (localStorage)"
        })
        return
      }

      const { data, error } = await supabase
        .from('players')
        .insert({
          name: player.name,
          type: player.type,
          photo_url: player.photoUrl,
          positions: player.positions || [],
          user_id: null, // Don't automatically link to creator
          group_id: groupId || null,
        })
        .select()
        .single()

      if (error) throw error

      const newPlayer: Player = {
        id: data.id,
        name: data.name,
        type: data.type as PlayerType,
        photoUrl: data.photo_url,
        positions: data.positions as PositionSkill[] || []
      }

      setPlayers(prev => [newPlayer, ...prev])
      toast({
        title: "Sucesso",
        description: "Jogador adicionado com sucesso"
      })
    } catch (error) {
      console.error('Erro ao adicionar jogador:', error)
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o jogador",
        variant: "destructive"
      })
    }
  }

  const removePlayer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPlayers(prev => prev.filter(p => p.id !== id))
      toast({
        title: "Sucesso",
        description: "Jogador removido com sucesso"
      })
    } catch (error) {
      console.error('Erro ao remover jogador:', error)
      toast({
        title: "Erro",
        description: "Não foi possível remover o jogador",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        console.log('Loading players from secure table')
        let query = supabase
          .from('players')
          .select('*')
          .order('name', { ascending: true })

        if (groupId) {
          query = query.eq('group_id', groupId)
        }

        const { data, error } = await query

        if (error) throw error

        const mappedPlayers: Player[] = data.map(player => ({
          id: player.id,
          name: player.name,
          type: player.type as PlayerType,
          photoUrl: player.photo_url,
          positions: player.positions as PositionSkill[] || []
        }))

        if (mounted) {
          setPlayers(mappedPlayers)
          localStorage.setItem('football:players', JSON.stringify(mappedPlayers))
        }
      } catch (error) {
        console.error('Erro ao carregar jogadores:', error)
        
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem('football:players')
          if (stored && mounted) {
            setPlayers(JSON.parse(stored))
          }
        } catch (storageError) {
          console.error('Erro ao carregar do localStorage:', storageError)
        }
        
        if (mounted) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os jogadores",
            variant: "destructive"
          })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [groupId])

  const loadUserPlayers = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.warn('Session error in loadUserPlayers:', sessionError.message)
        return loadPlayers()
      }
      const session = sessionData?.session
      const user = session?.user
      
      if (!user) {
        console.log('No user authenticated, loading from public view')
        return loadPlayers()
      }

      console.log('Loading user-specific players')
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedPlayers: Player[] = data.map(player => ({
        id: player.id,
        name: player.name,
        type: player.type as PlayerType,
        photoUrl: player.photo_url,
        positions: player.positions as PositionSkill[] || []
      }))

      setPlayers(mappedPlayers)
    } catch (error) {
      console.error('Erro ao carregar jogadores do usuário:', error)
      toast({
        title: "Erro", 
        description: "Não foi possível carregar seus jogadores",
        variant: "destructive"
      })
    }
  }

  const editPlayer = async (id: string, updatedPlayer: Omit<Player, 'id'>) => {
    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) console.warn('Session error in editPlayer:', sessionError.message)
        const session = sessionData?.session
        const user = session?.user
      
      if (!user) {
        // Fallback para localStorage
        const updatedPlayers = players.map(p => 
          p.id === id ? { ...updatedPlayer, id } : p
        )
        setPlayers(updatedPlayers)
        localStorage.setItem('football:players', JSON.stringify(updatedPlayers))
        toast({
          title: "Sucesso",
          description: "Jogador editado (localStorage)"
        })
        return
      }

      const { error } = await supabase
        .from('players')
        .update({
          name: updatedPlayer.name,
          type: updatedPlayer.type,
          photo_url: updatedPlayer.photoUrl,
          positions: updatedPlayer.positions || []
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      setPlayers(prev => prev.map(p => 
        p.id === id ? { ...updatedPlayer, id } : p
      ))
      
      toast({
        title: "Sucesso",
        description: "Jogador editado com sucesso"
      })
    } catch (error) {
      console.error('Erro ao editar jogador:', error)
      toast({
        title: "Erro",
        description: "Não foi possível editar o jogador",
        variant: "destructive"
      })
    }
  }

  return {
    players,
    loading,
    addPlayer,
    removePlayer, 
    editPlayer,
    refreshPlayers: loadPlayers,
    loadUserPlayers,
    linkPlayerToUser: async (playerId: string, userId: string) => {
      try {
        console.log(`Linking player ${playerId || 'NONE'} to user ${userId} in group ${groupId}`);
        
        // 1. Update Group Settings (Master Link) - This bypasses RLS on players table
        // because the admin/owner can always update the group they own.
        if (groupId) {
          const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('settings')
            .eq('id', groupId)
            .single();
          
          if (!groupError && groupData) {
            const settings = groupData.settings as unknown as GroupSettings;
            const playerLinks = { ...(settings.playerLinks || {}) };
            
            if (playerId) {
              playerLinks[userId] = playerId;
            } else {
              delete playerLinks[userId];
            }
            
            const { error: updateGroupError } = await supabase
              .from('groups')
              .update({ settings: { ...settings, playerLinks } })
              .eq('id', groupId);
            
            if (updateGroupError) {
              console.error('Error updating group settings for link:', updateGroupError);
              // If this fails, we might have a real permission issue on the group
              throw updateGroupError;
            }
            console.log('Group settings updated with link');
          }
        }

        // 2. Try to update players.user_id for backward compatibility
        // We do this as a BEST EFFORT, but we don't fail if it fails due to RLS.
        if (groupId) {
          // Clear old links for this user
          await supabase
            .from('players')
            .update({ user_id: null })
            .eq('group_id', groupId)
            .eq('user_id', userId);

          if (playerId) {
            // Set new link
            const { error: playerUpdateError } = await supabase
              .from('players')
              .update({ user_id: userId })
              .eq('id', playerId);
            
            if (playerUpdateError) {
              console.warn('Could not update players.user_id due to RLS, but link is saved in group settings:', playerUpdateError);
            }
          }
        }

        toast({
          title: "Sucesso",
          description: playerId ? "Vínculo atualizado com sucesso" : "Vínculo removido com sucesso"
        })
        await loadPlayers()
        return { success: true }
      } catch (error) {
        console.error('Erro ao vincular jogador:', error)
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o vínculo. Verifique se você é o dono do grupo.",
          variant: "destructive"
        })
        return { success: false, error }
      }
    }
  }
}