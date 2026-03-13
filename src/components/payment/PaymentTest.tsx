import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Loader2, QrCode, Copy, CheckCircle2 } from 'lucide-react'

const PaymentTest = () => {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('1.00')
  const [pixData, setPixData] = useState<{ qrCodeBase64: string, qrCodeString: string } | null>(null)

  const handleGeneratePix = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payments/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paymentId: `TEST-${Date.now()}`,
          customerName: 'Teste Cielo'
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPixData({
          qrCodeBase64: data.qrCodeBase64,
          qrCodeString: data.qrCodeString
        })
        toast({
          title: "PIX Gerado!",
          description: "Escaneie o QR Code para pagar."
        })
      } else {
        throw new Error(data.error?.Message || 'Erro ao gerar PIX')
      }
    } catch (error: unknown) {
      console.error('Erro:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (pixData?.qrCodeString) {
      navigator.clipboard.writeText(pixData.qrCodeString)
      toast({
        title: "Copiado!",
        description: "Código PIX copiado para a área de transferência."
      })
    }
  }

  return (
    <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
      <div className="h-3 w-full bg-gradient-to-r from-blue-500 to-cyan-400" />
      <CardHeader className="pt-10 pb-6 text-center">
        <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Teste de Pagamento</CardTitle>
        <CardDescription className="text-slate-500 font-medium">
          Teste a integração com a Cielo (Sandbox)
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-10 space-y-6">
        {!pixData ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Valor do Teste (R$)</Label>
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>
            <Button 
              onClick={handleGeneratePix} 
              className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <QrCode className="mr-2 h-5 w-5" />}
              Gerar PIX de Teste
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-4 rounded-3xl shadow-inner border-2 border-slate-100">
              <img 
                src={`data:image/png;base64,${pixData.qrCodeBase64}`} 
                alt="QR Code PIX" 
                className="w-64 h-64"
              />
            </div>
            
            <div className="w-full space-y-3">
              <Button 
                variant="outline" 
                onClick={copyToClipboard}
                className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 gap-2"
              >
                <Copy className="h-4 w-4" /> Copia e Cola
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setPixData(null)}
                className="w-full text-slate-500"
              >
                Gerar outro valor
              </Button>
            </div>

            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full text-sm font-bold">
              <CheckCircle2 className="h-4 w-4" />
              Aguardando pagamento...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PaymentTest
