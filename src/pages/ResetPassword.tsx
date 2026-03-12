import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Loader2, Lock, ArrowLeft } from 'lucide-react'

const ResetPassword = () => {
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [showOtpEntry, setShowOtpEntry] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have a session (Supabase automatically sets it from the URL hash)
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session) {
        setIsSessionReady(true)
      } else {
        // Check if there's a token in the URL (sometimes hash parsing takes a moment)
        const hash = window.location.hash
        if (hash && (hash.includes('access_token=') || hash.includes('type=recovery'))) {
          // Wait a bit for Supabase to process the hash
          setTimeout(async () => {
            const { data: retryData } = await supabase.auth.getSession()
            if (retryData?.session) {
              setIsSessionReady(true)
            }
          }, 1500)
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || session) {
            setIsSessionReady(true)
          }
        })
        return () => subscription.unsubscribe()
      }
    }
    checkSession()
  }, [])

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'recovery'
      })
      if (error) throw error
      setIsSessionReady(true)
      toast({
        title: "Código validado!",
        description: "Agora você pode definir sua nova senha."
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Código inválido ou expirado."
      toast({
        title: "Erro na validação",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas são diferentes.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      
      if (error) throw error

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso. Você já pode fazer login."
      })
      
      // Sign out to ensure clean state and redirect to login
      await supabase.auth.signOut()
      navigate('/auth')
    } catch (error: unknown) {
      console.error('Error updating password:', error)
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro inesperado."
      toast({
        title: "Erro ao atualizar senha",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden relative z-10 bg-white/80 backdrop-blur-xl">
        <div className="h-2 w-full bg-primary" />
        <CardHeader className="text-center pt-10 pb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900">Nova Senha</CardTitle>
          <CardDescription className="text-slate-500 font-medium mt-2">
            Digite sua nova senha abaixo para recuperar o acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          {!isSessionReady ? (
            <div className="space-y-6">
              {!showOtpEntry ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-slate-500 font-medium">Validando link de recuperação...</p>
                  <div className="pt-4 flex flex-col w-full gap-2">
                    <Button variant="outline" onClick={() => setShowOtpEntry(true)} className="rounded-xl">
                      Inserir código manualmente
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/auth')}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o login
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="text-center mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Validar Código</h3>
                    <p className="text-xs text-slate-500">Insira o código de 6 dígitos enviado para seu e-mail.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Código de 6 dígitos</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all text-center tracking-[0.5em] font-bold text-lg"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      required
                      maxLength={6}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      Validar Código
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowOtpEntry(false)}>
                      Voltar para validação automática
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" title="Nova Senha" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" title="Confirmar Nova Senha" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a nova senha"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all mt-4" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Redefinir Senha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPassword
