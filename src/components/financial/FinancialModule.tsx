import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Settings, Plus, Trash2, CheckCircle2, XCircle, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useFinancial, type CashEntry } from "@/hooks/useFinancial";
import type { Player } from "@/types/football";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PaymentButton } from "./PaymentButton";

interface FinancialModuleProps {
  groupId: string;
  players: Player[];
  isOwner: boolean;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CATEGORY_LABELS: Record<string, string> = {
  mensalidade: "Mensalidade",
  convidado: "Convidado",
  aluguel_campo: "Aluguel de Campo",
  material: "Material Esportivo",
  arbitragem: "Arbitragem",
  "premiação": "Premiação",
  "confraternização": "Confraternização",
  outros: "Outros",
};

export default function FinancialModule({ groupId, players, isOwner }: FinancialModuleProps) {
  const {
    config, payments, cashEntries, loading, balance,
    saveConfig, togglePayment, addCashEntry, deleteCashEntry, categories
  } = useFinancial(groupId);

  const [monthlyFee, setMonthlyFee] = useState(config?.monthlyFee?.toString() || "0");
  const [guestFee, setGuestFee] = useState(config?.guestFee?.toString() || "0");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Cash entry form
  const [entryType, setEntryType] = useState<'income' | 'expense'>('income');
  const [entryCategory, setEntryCategory] = useState('outros');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setMonthlyFee(config.monthlyFee.toString());
      setGuestFee(config.guestFee.toString());
    }
  }, [config]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  const mensalistas = players.filter(p => p.type === "mensalista");
  const fee = config?.monthlyFee || 0;

  const getPaymentStatus = (playerId: string) => {
    return payments.find(p => 
      p.playerId === playerId && p.month === selectedMonth && p.year === selectedYear
    );
  };

  const paidCount = mensalistas.filter(p => getPaymentStatus(p.id)?.paid).length;
  const expectedTotal = mensalistas.length * fee;
  const receivedTotal = mensalistas.filter(p => getPaymentStatus(p.id)?.paid).length * fee;

  const handleAddEntry = async () => {
    if (!entryDesc || !entryAmount) return;
    await addCashEntry({
      type: entryType,
      category: entryCategory,
      description: entryDesc,
      amount: parseFloat(entryAmount),
      date: new Date(entryDate).toISOString(),
      playerId: null,
    });
    setEntryDesc('');
    setEntryAmount('');
    setEntryDialogOpen(false);
  };

  // Monthly cash entries
  const monthEntries = cashEntries.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });

  const monthIncome = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const monthExpense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="mensalidades">
        <TabsList>
          <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
          {isOwner && <TabsTrigger value="config">Configuração</TabsTrigger>}
        </TabsList>

        {/* Mensalidades Tab */}
        <TabsContent value="mensalidades" className="space-y-4">
          {/* Month/Year selector */}
          <div className="flex gap-3 items-center flex-wrap">
            <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Previsto</p>
                <p className="text-xl font-bold">R$ {expectedTotal.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="text-xl font-bold text-green-600">R$ {receivedTotal.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Pagamentos</p>
                <p className="text-xl font-bold">{paidCount}/{mensalistas.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Player payment list */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="text-center">Valor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {isOwner && <TableHead className="text-center">Ação</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensalistas.map(player => {
                    const payment = getPaymentStatus(player.id);
                    const isPaid = payment?.paid || false;
                    const isCurrentUser = player.user_id === currentUserId;
                    
                    return (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell className="text-center">R$ {fee.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          {isPaid ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Pago
                            </Badge>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" /> Pendente
                              </Badge>
                              {!isPaid && isCurrentUser && (
                                <PaymentButton 
                                  amount={fee}
                                  description={`Mensalidade ${MONTH_NAMES[selectedMonth-1]}/${selectedYear}`}
                                  playerId={player.id}
                                  groupId={groupId}
                                  month={selectedMonth}
                                  year={selectedYear}
                                  playerName={player.name}
                                />
                              )}
                            </div>
                          )}
                        </TableCell>
                        {isOwner && (
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant={isPaid ? "outline" : "default"}
                              onClick={() => togglePayment(player.id, selectedMonth, selectedYear, fee, player.name)}
                            >
                              {isPaid ? "Desfazer" : "Confirmar"}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {mensalistas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum mensalista cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Caixa Tab */}
        <TabsContent value="caixa" className="space-y-4">
          {/* Balance summary */}
          <div className="grid gap-4 grid-cols-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Entradas (mês)</p>
                  <p className="text-lg font-bold text-green-600">R$ {monthIncome.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Saídas (mês)</p>
                  <p className="text-lg font-bold text-red-600">R$ {monthExpense.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Total</p>
                  <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {balance.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add entry button */}
          {isOwner && (
            <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Novo Lançamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Lançamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={entryType === 'income' ? 'default' : 'outline'}
                      onClick={() => setEntryType('income')}
                      className="flex-1"
                    >
                      <TrendingUp className="h-4 w-4 mr-1" /> Entrada
                    </Button>
                    <Button
                      variant={entryType === 'expense' ? 'destructive' : 'outline'}
                      onClick={() => setEntryType('expense')}
                      className="flex-1"
                    >
                      <TrendingDown className="h-4 w-4 mr-1" /> Saída
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={entryCategory} onValueChange={setEntryCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input value={entryDesc} onChange={e => setEntryDesc(e.target.value)} placeholder="Ex: Aluguel do campo" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input type="number" min="0" step="0.01" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleAddEntry} className="w-full" disabled={!entryDesc || !entryAmount}>
                    Adicionar Lançamento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Entries list */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    {isOwner && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.date), "dd/MM", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{entry.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'income' ? '+' : '-'}R$ {entry.amount.toFixed(2)}
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => deleteCashEntry(entry.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {monthEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum lançamento neste mês.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        {isOwner && (
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <CardTitle>Valores</CardTitle>
                </div>
                <CardDescription>Defina os valores de mensalidade e convidado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mensalidade (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={monthlyFee}
                      onChange={e => setMonthlyFee(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Convidado por jogo (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={guestFee}
                      onChange={e => setGuestFee(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={() => saveConfig(parseFloat(monthlyFee) || 0, parseFloat(guestFee) || 0)}>
                  <DollarSign className="h-4 w-4 mr-1" /> Salvar Valores
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
