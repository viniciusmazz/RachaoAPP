import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

export interface FinancialConfig {
  id: string
  groupId: string
  monthlyFee: number
  guestFee: number
}

export interface Payment {
  id: string
  groupId: string
  playerId: string
  month: number
  year: number
  amount: number
  paid: boolean
  paidAt: string | null
  notes: string | null
}

export interface CashEntry {
  id: string
  groupId: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  date: string
  playerId: string | null
}

const CATEGORIES = [
  'mensalidade', 'convidado', 'aluguel_campo', 'material', 'arbitragem',
  'premiação', 'confraternização', 'outros'
]

export const useFinancial = (groupId?: string) => {
  const [config, setConfig] = useState<FinancialConfig | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    if (!groupId) { setLoading(false); return }
    try {
      // Load config
      const { data: cfgData } = await supabase
        .from('financial_config')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle()

      if (cfgData) {
        setConfig({
          id: cfgData.id,
          groupId: cfgData.group_id,
          monthlyFee: Number(cfgData.monthly_fee),
          guestFee: Number(cfgData.guest_fee),
        })
      }

      // Load payments
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('group_id', groupId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (payData) {
        setPayments(payData.map((p) => ({
          id: p.id,
          groupId: p.group_id,
          playerId: p.player_id,
          month: p.month,
          year: p.year,
          amount: Number(p.amount),
          paid: p.paid,
          paidAt: p.paid_at,
          notes: p.notes,
        })))
      }

      // Load cash entries
      const { data: cashData } = await supabase
        .from('cash_entries')
        .select('*')
        .eq('group_id', groupId)
        .order('date', { ascending: false })

      if (cashData) {
        setCashEntries(cashData.map((c) => ({
          id: c.id,
          groupId: c.group_id,
          type: c.type as 'income' | 'expense',
          category: c.category,
          description: c.description,
          amount: Number(c.amount),
          date: c.date,
          playerId: c.player_id,
        })))
      }
    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { loadAll() }, [loadAll])

  const saveConfig = async (monthlyFee: number, guestFee: number) => {
    if (!groupId) return
    try {
      if (config) {
        await supabase.from('financial_config').update({
          monthly_fee: monthlyFee,
          guest_fee: guestFee,
        }).eq('id', config.id)
      } else {
        await supabase.from('financial_config').insert({
          group_id: groupId,
          monthly_fee: monthlyFee,
          guest_fee: guestFee,
        })
      }
      await loadAll()
      toast({ title: "Configuração salva!" })
    } catch (error) {
      console.error('Error saving config:', error)
      toast({ title: "Erro", description: "Não foi possível salvar", variant: "destructive" })
    }
  }

  const togglePayment = async (playerId: string, month: number, year: number, amount: number, playerName?: string) => {
    if (!groupId) return
    const existing = payments.find(p => p.playerId === playerId && p.month === month && p.year === year)
    try {
      if (existing) {
        const newPaid = !existing.paid
        await supabase.from('payments').update({
          paid: newPaid,
          paid_at: newPaid ? new Date().toISOString() : null,
        }).eq('id', existing.id)

        if (newPaid) {
          await addCashEntry({
            type: 'income',
            category: 'mensalidade',
            description: `Mensalidade: ${playerName || 'Jogador'} - ${month}/${year}`,
            amount: amount,
            date: new Date().toISOString(),
            playerId: playerId,
          })
        } else {
          // Try to remove the automatic entry
          const autoEntry = cashEntries.find(e => 
            e.playerId === playerId && 
            e.category === 'mensalidade' && 
            e.description.includes(`${month}/${year}`)
          )
          if (autoEntry) {
            await deleteCashEntry(autoEntry.id)
          }
        }
      } else {
        await supabase.from('payments').insert({
          group_id: groupId,
          player_id: playerId,
          month,
          year,
          amount,
          paid: true,
          paid_at: new Date().toISOString(),
        })

        await addCashEntry({
          type: 'income',
          category: 'mensalidade',
          description: `Mensalidade: ${playerName || 'Jogador'} - ${month}/${year}`,
          amount: amount,
          date: new Date().toISOString(),
          playerId: playerId,
        })
      }
      await loadAll()
    } catch (error) {
      console.error('Error toggling payment:', error)
      toast({ title: "Erro", description: "Não foi possível atualizar pagamento", variant: "destructive" })
    }
  }

  const addCashEntry = async (entry: Omit<CashEntry, 'id' | 'groupId'>) => {
    if (!groupId) return
    try {
      await supabase.from('cash_entries').insert({
        group_id: groupId,
        type: entry.type,
        category: entry.category,
        description: entry.description,
        amount: entry.amount,
        date: entry.date,
        player_id: entry.playerId,
      })
      await loadAll()
      toast({ title: "Lançamento adicionado!" })
    } catch (error) {
      console.error('Error adding cash entry:', error)
      toast({ title: "Erro", description: "Não foi possível adicionar lançamento", variant: "destructive" })
    }
  }

  const deleteCashEntry = async (id: string) => {
    try {
      await supabase.from('cash_entries').delete().eq('id', id)
      await loadAll()
      toast({ title: "Lançamento removido" })
    } catch (error) {
      console.error('Error deleting cash entry:', error)
      toast({ title: "Erro", variant: "destructive" })
    }
  }

  const balance = cashEntries.reduce((acc, e) => {
    return acc + (e.type === 'income' ? e.amount : -e.amount)
  }, 0)

  return {
    config, payments, cashEntries, loading, balance,
    saveConfig, togglePayment, addCashEntry, deleteCashEntry,
    categories: CATEGORIES, refreshFinancial: loadAll,
  }
}
