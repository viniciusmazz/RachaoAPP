import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Group, GroupSettings } from '@/types/football'
import { toast } from '@/hooks/use-toast'

const DEFAULT_SETTINGS: GroupSettings = {
  logoUrl: null,
  sides: {
    home: { name: "Time A", color: "#3B82F6", logoUrl: null },
    away: { name: "Time B", color: "#EF4444", logoUrl: null }
  },
  enabledStats: ["goals", "assists", "ownGoals"],
  visibility: 'public'
}

const mapGroup = (row: {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  settings: unknown;
  created_at: string;
  updated_at: string;
}): Group => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbSettings = (row.settings as any) || {};
  
  console.log(`Mapping group ${row.name}. DB Logo present:`, !!dbSettings.logoUrl);
  if (dbSettings.logoUrl) {
    console.log(`Logo length: ${dbSettings.logoUrl.length}`);
  }

  // Deep merge sides to avoid losing data
  const settings: GroupSettings = {
    ...DEFAULT_SETTINGS,
    ...dbSettings,
    sides: {
      home: { 
        ...DEFAULT_SETTINGS.sides.home, 
        ...(dbSettings.sides?.home || {}) 
      },
      away: { 
        ...DEFAULT_SETTINGS.sides.away, 
        ...(dbSettings.sides?.away || {}) 
      }
    }
  };

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerId: row.owner_id,
    settings,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const useGroup = (slug?: string) => {
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchGroup = useCallback(async () => {
    if (!slug) {
      setLoading(false)
      return
    }

    try {
      console.log('Fetching group with slug:', slug);
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (error) {
        console.error('Supabase error fetching group:', error);
        throw error;
      }

      if (data) {
        console.log('Group found:', data.name);
        setGroup(mapGroup(data))
        setNotFound(false)
      } else {
        console.warn('Group not found for slug:', slug);
        setGroup(null)
        setNotFound(true)
      }
    } catch (error) {
      console.error('Error fetching group:', error)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [slug]);

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  return { group, loading, notFound, refreshGroup: fetchGroup }
}

export const useUserGroups = () => {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGroups = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.warn('Session error in fetchGroups:', sessionError.message);
        setGroups([])
        setLoading(false)
        return
      }
      
      const session = sessionData?.session
      if (!session?.user) {
        setGroups([])
        setLoading(false)
        return
      }

      // 1. Fetch groups where user is owner
      const { data: ownedGroups, error: ownedError } = await supabase
        .from('groups')
        .select('*')
        .eq('owner_id', session.user.id)
        .neq('slug', 'app-settings')

      if (ownedError) throw ownedError

      // 2. Fetch groups where user is a player
      const { data: playerRecords, error: playerError } = await supabase
        .from('players')
        .select('group_id')
        .eq('user_id', session.user.id)
      
      if (playerError) throw playerError

      const memberGroupIds = (playerRecords || []).map(p => p.group_id).filter(Boolean) as string[]
      
      let memberGroups: Group[] = []
      if (memberGroupIds.length > 0) {
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .in('id', memberGroupIds)
        
        if (error) throw error
        memberGroups = (data || []).map(mapGroup)
      }

      // Combine and remove duplicates
      const allGroups = [...(ownedGroups || []).map(mapGroup), ...memberGroups]
      const uniqueGroups = Array.from(new Map(allGroups.map(g => [g.id, g])).values())
      
      // Filter out groups where the user is explicitly rejected
      const filteredGroups = uniqueGroups.filter(g => {
        if (g.ownerId === session.user.id) return true;
        const userRole = g.settings.roles?.[session.user.id];
        return userRole !== 'rejected';
      });

      setGroups(filteredGroups.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    } catch (error) {
      console.error('Error fetching user groups:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  const createGroup = async (name: string, slug: string) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const session = sessionData?.session
      if (!session?.user) throw new Error('Not authenticated')

      // Check for 1 group limit (only for owned groups)
      const { count, error: countError } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', session.user.id)
      
      if (countError) throw countError

      if (count && count >= 1 && session.user.email !== 'viniciusmazz@gmail.com') {
        toast({ 
          title: "Limite atingido", 
          description: "No plano grátis você pode criar apenas 1 grupo. Assine um plano para criar mais.", 
          variant: "destructive" 
        })
        return null
      }

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name,
          slug: slug.toLowerCase(),
          owner_id: session.user.id,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Erro", description: "Esse slug já está em uso. Escolha outro.", variant: "destructive" })
        } else if (error.message?.includes('slug_format')) {
          toast({ title: "Erro", description: "Slug deve ter 3-50 caracteres, só letras minúsculas, números e hífens.", variant: "destructive" })
        } else {
          throw error
        }
        return null
      }

      const newGroup = mapGroup(data)
      setGroups(prev => [newGroup, ...prev])
      toast({ title: "Grupo criado!", description: `Acesse em /${newGroup.slug}` })
      return newGroup
    } catch (error) {
      console.error('Error creating group:', error)
      toast({ title: "Erro", description: "Não foi possível criar o grupo", variant: "destructive" })
      return null
    }
  }

  const updateGroup = async (groupId: string, updates: { name?: string; slug?: string; settings?: GroupSettings }) => {
    try {
      const updateData: Partial<{ name: string; slug: string; settings: GroupSettings }> = {}
      if (updates.name) updateData.name = updates.name
      if (updates.slug) updateData.slug = updates.slug.toLowerCase()
      if (updates.settings) {
        updateData.settings = updates.settings
        console.log('Updating settings. Logo present:', !!updates.settings.logoUrl);
      }

      const { error } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', groupId)

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Erro", description: "Esse slug já está em uso.", variant: "destructive" })
        } else {
          throw error
        }
        return false
      }

      await fetchGroups()
      toast({ title: "Grupo atualizado!" })
      return true
    } catch (error) {
      console.error('Error updating group:', error)
      toast({ title: "Erro", description: "Não foi possível atualizar o grupo", variant: "destructive" })
      return false
    }
  }

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)

      if (error) throw error

      setGroups(prev => prev.filter(g => g.id !== groupId))
      toast({ title: "Grupo excluído" })
      return true
    } catch (error) {
      console.error('Error deleting group:', error)
      toast({ title: "Erro", description: "Não foi possível excluir o grupo", variant: "destructive" })
      return false
    }
  }

  const searchGroups = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .ilike('name', `%${query}%`)
        .neq('slug', 'app-settings')
        .limit(10)
      
      if (error) throw error
      return (data || []).map(mapGroup)
    } catch (error) {
      console.error('Error searching groups:', error)
      return []
    }
  }

  return { groups, loading, createGroup, updateGroup, deleteGroup, searchGroups, refreshGroups: fetchGroups }
}
