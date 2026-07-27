import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Player, PlayerType, PositionSkill, GroupSettings } from '@/types/football'
import { toast } from '@/hooks/use-toast'

export const usePlayers = (groupId?: string) => {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const loadPlayers = useCallback(async () => {
    try {
      let query = supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true })

      if (groupId) {
        query = query.eq('group_id', groupId)
      }

      const { data, error } = await query

      if (error) throw error

      const mappedPlayers: Player[] = data
        .filter(player => !player.name?.startsWith('Solicitação:'))
        .map(player => ({
          id: player.id,
          name: player.name,
          type: player.type as PlayerType,
          photoUrl: player.photo_url,
          positions: player.positions as PositionSkill[] || [],
          userId: player.user_id
        }))

      setPlayers(mappedPlayers)
      localStorage.setItem('football:players', JSON.stringify(mappedPlayers))
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error)

      try {
        const stored = localStorage.getItem('football:players')
        if (stored) {
          setPlayers(JSON.parse(stored))
          toast({
            title: "Modo offline",
            description: "Exibindo jogadores em cache local. Algumas informações podem estar desatualizadas.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os jogadores",
            variant: "destructive"
          })
        }
      } catch (storageError) {
        console.error('Erro ao carregar do localStorage:', storageError)
      }
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  const addPlayer = async (player: Omit<Player, 'id'>) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) console.warn('Session error in addPlayer:', sessionError.message)
      const session = sessionData?.session
      const user = session?.user

      if (!user) {
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
          user_id: null,
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
        positions: data.positions as PositionSkill[] || [],
        userId: data.user_id
      }

      setPlayers(prev => [newPlayer, ...prev])
      toast({
        title: "Sucesso",
        description: "Jogador adicionado com sucesso"
      })
    } catch (error: unknown) {
      console.error('Erro ao adicionar jogador:', error)
      const msg = (error as { message?: string })?.message || JSON.stringify(error)
      toast({
        title: "Erro ao adicionar jogador",
        description: msg,
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
        return loadPlayers()
      }

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedPlayers: Player[] = data
        .filter(player => !player.name?.startsWith('Solicitação:'))
        .map(player => ({
          id: player.id,
          name: player.name,
          type: player.type as PlayerType,
          photoUrl: player.photo_url,
          positions: player.positions as PositionSkill[] || [],
          userId: player.user_id
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
              throw updateGroupError;
            }
          }
        }

        if (groupId) {
          await supabase
            .from('players')
            .update({ user_id: null })
            .eq('group_id', groupId)
            .eq('user_id', userId);

          if (playerId) {
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
