import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Match, Teams, MatchEvent } from '@/types/football'
import type { Json } from '@/integrations/supabase/types'
import { toast } from '@/hooks/use-toast'

export const useMatches = (groupId?: string) => {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const loadMatches = async () => {
    try {
      console.log('Loading matches from secure table')
      let query = supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false })

      if (groupId) {
        query = query.eq('group_id', groupId)
      }

      const { data, error } = await query

      if (error) throw error

        const mappedMatches: Match[] = data.map(match => ({
          id: match.id,
          date: new Date(match.date),
          teams: match.teams as unknown as Teams,
          events: match.events as unknown as MatchEvent[],
          reportFilePath: match.report_file_path || undefined,
          observations: (match as { observations?: string }).observations || undefined
        }))

      setMatches(mappedMatches)
    } catch (error) {
      console.error('Erro ao carregar partidas:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as partidas",
        variant: "destructive"
      })
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('football:matches')
        if (stored) {
          const parsed = JSON.parse(stored).map((m: Match) => ({
            ...m,
            date: new Date(m.date),
          }))
          setMatches(parsed)
        }
      } catch (storageError) {
        console.error('Erro ao carregar do localStorage:', storageError)
      }
    } finally {
      setLoading(false)
    }
  }

  const saveMatch = async (match: Omit<Match, 'id'>) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) console.warn('Session error in saveMatch:', sessionError.message)
      const session = sessionData?.session
      const user = session?.user
      
      if (!user) {
        // Fallback para localStorage
        const newMatch: Match = {
          ...match,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        }
        const updatedMatches = [newMatch, ...matches]
        setMatches(updatedMatches)
        localStorage.setItem('football:matches', JSON.stringify(updatedMatches))
        toast({
          title: "Sucesso",
          description: "Partida salva (localStorage)"
        })
        return newMatch
      }

      const { data, error } = await supabase
        .from('matches')
        .insert({
          date: match.date.toISOString(),
          teams: match.teams as unknown as Json,
          events: match.events as unknown as Json,
          report_file_path: match.reportFilePath || null,
          observations: match.observations || null,
          user_id: user.id,
          group_id: groupId || null,
        })
        .select()
        .single()

      if (error) throw error

      const newMatch: Match = {
        id: data.id,
        date: new Date(data.date),
        teams: data.teams as unknown as Teams,
        events: data.events as unknown as MatchEvent[],
        reportFilePath: data.report_file_path || undefined,
        observations: data.observations || undefined
      }

      setMatches(prev => [newMatch, ...prev])
      toast({
        title: "Sucesso",
        description: "Partida salva com sucesso"
      })

      return newMatch
    } catch (error) {
      console.error('Erro ao salvar partida:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a partida",
        variant: "destructive"
      })
      throw error
    }
  }

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        console.log('Loading matches from secure table')
        let query = supabase
          .from('matches')
          .select('*')
          .order('date', { ascending: false })

        if (groupId) {
          query = query.eq('group_id', groupId)
        }

        const { data, error } = await query

        if (error) throw error

        const mappedMatches: Match[] = data.map(match => ({
          id: match.id,
          date: new Date(match.date),
          teams: match.teams as unknown as Teams,
          events: match.events as unknown as MatchEvent[],
          reportFilePath: match.report_file_path || undefined,
          observations: match.observations || undefined
        }))

        if (mounted) {
          setMatches(mappedMatches)
        }
      } catch (error) {
        console.error('Erro ao carregar partidas:', error)
        
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem('football:matches')
          if (stored && mounted) {
            const parsed = JSON.parse(stored).map((m: Match) => ({
              ...m,
              date: new Date(m.date),
            }))
            setMatches(parsed)
          }
        } catch (storageError) {
          console.error('Erro ao carregar do localStorage:', storageError)
        }
        
        if (mounted) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar as partidas",
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

  const updateMatch = async (matchId: string, updatedMatch: Omit<Match, 'id'>) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) console.warn('Session error in updateMatch:', sessionError.message)
      const session = sessionData?.session
      const user = session?.user
      
      if (!user) {
        // Fallback para localStorage
        const updatedMatches = matches.map(match => 
          match.id === matchId ? { ...updatedMatch, id: matchId } : match
        )
        setMatches(updatedMatches)
        localStorage.setItem('football:matches', JSON.stringify(updatedMatches))
        toast({
          title: "Sucesso",
          description: "Partida atualizada (localStorage)"
        })
        return
      }

      const { error } = await supabase
        .from('matches')
        .update({
          date: updatedMatch.date.toISOString(),
          teams: updatedMatch.teams as unknown as Json,
          events: updatedMatch.events as unknown as Json,
          report_file_path: updatedMatch.reportFilePath || null,
          observations: updatedMatch.observations || null,
        })
        .eq('id', matchId)
        .eq('user_id', user.id)

      if (error) throw error

      const newMatch: Match = {
        id: matchId,
        date: updatedMatch.date,
        teams: updatedMatch.teams,
        events: updatedMatch.events,
        reportFilePath: updatedMatch.reportFilePath,
        observations: updatedMatch.observations
      }

      setMatches(prev => prev.map(match => 
        match.id === matchId ? newMatch : match
      ))

      toast({
        title: "Sucesso",
        description: "Partida atualizada com sucesso"
      })
    } catch (error) {
      console.error('Erro ao atualizar partida:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a partida",
        variant: "destructive"
      })
      throw error
    }
  }

  const deleteMatch = async (matchId: string) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) console.warn('Session error in deleteMatch:', sessionError.message)
      const session = sessionData?.session
      const user = session?.user
      
      if (!user) {
        // Fallback para localStorage
        const updatedMatches = matches.filter(match => match.id !== matchId)
        setMatches(updatedMatches)
        localStorage.setItem('football:matches', JSON.stringify(updatedMatches))
        return
      }

      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId)

      if (error) throw error

      setMatches(prev => prev.filter(match => match.id !== matchId))
    } catch (error) {
      console.error('Erro ao excluir partida:', error)
      throw error
    }
  }

  return {
    matches,
    loading,
    saveMatch,
    updateMatch,
    deleteMatch,
    refreshMatches: loadMatches
  }
}