import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const Auth = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          console.log('User already logged in, redirecting to home')
          navigate('/')
        }
      } catch (error) {
        console.error('Error checking auth session:', error)
      }
    }
    checkUser()
  }, [navigate])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const redirectUrl = `${window.location.origin}/`
    
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          cpf,
          phone
        }
      }
    })

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive"
      })
    } else if (signUpData.user) {
      // Automatically assign 'approved' role
      await supabase.from('user_roles').insert({
        user_id: signUpData.user.id,
        role: 'approved'
      })

      toast({
        title: "Cadastro realizado!",
        description: "Bem-vindo ao RachãoApp! Sua conta está pronta para uso."
      })
      navigate('/')
    }
    setLoading(false)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive"
      })
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({
        title: "Email necessário",
        description: "Por favor, insira seu email para receber o link de redefinição.",
        variant: "destructive"
      })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    })
    if (error) {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha."
      })
      setIsResettingPassword(false)
    }
    setLoading(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso. Você já pode fazer login."
      })
      setIsRecovering(false)
      setIsResettingPassword(false)
      // Sign out to force fresh login if needed, or just navigate
      await supabase.auth.signOut()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden relative z-10 bg-white/80 backdrop-blur-xl">
        <div className="h-2 w-full bg-primary" />
        <CardHeader className="text-center pt-10 pb-6">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-100 overflow-hidden">
            <img src={`/logo.png?t=${Date.now()}`} alt="RachãoApp Logo" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight text-slate-900">RachãoApp</CardTitle>
          <CardDescription className="text-slate-500 font-medium mt-2">
            Entre ou cadastre-se para gerenciar seu time
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          {isRecovering ? (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Definir Nova Senha</h3>
                <p className="text-sm text-slate-500">Crie uma nova senha para sua conta.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all mt-4" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Atualizar Senha
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-slate-100 rounded-2xl h-12">
                <TabsTrigger value="signin" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-0">
              {isResettingPassword ? (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email para Recuperação</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      Enviar Link de Recuperação
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="text-slate-500 font-bold" 
                      onClick={() => setIsResettingPassword(false)}
                    >
                      Voltar para o Login
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="signin-password" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Senha</Label>
                      <button 
                        type="button" 
                        onClick={() => setIsResettingPassword(true)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all mt-4" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Entrar na Conta
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    placeholder="Seu nome"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-cpf" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">CPF</Label>
                    <Input
                      id="signup-cpf"
                      placeholder="000.000.000-00"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Telefone</Label>
                    <Input
                      id="signup-phone"
                      placeholder="(00) 00000-0000"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all mt-4" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Criar Minha Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Auth