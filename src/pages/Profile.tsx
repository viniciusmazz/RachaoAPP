import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, Camera, User, Phone, CreditCard, Mail, Trophy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ConsolidatedStats from '@/components/player/ConsolidatedStats'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const Profile = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.name || '')
      setCpf(user.user_metadata?.cpf || '')
      setPhone(user.user_metadata?.phone || '')
      setPhotoUrl(user.user_metadata?.photo_url || null)
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      data: {
        name,
        phone,
        photo_url: photoUrl
      }
    })

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      })
    } else {
      // Also update profiles table if possible
      await supabase.from('profiles').update({
        name,
      }).eq('user_id', user.id)

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
      })
    }
    setLoading(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`
      
      const { data: uploadData, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path)

      setPhotoUrl(publicUrl)
      
      // Update user metadata immediately
      await supabase.auth.updateUser({
        data: { photo_url: publicUrl }
      })

      toast({
        title: "Foto atualizada!",
        description: "Sua nova foto de perfil foi salva."
      })
    } catch (error) {
      console.error('Erro no upload:', error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar a foto",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    navigate('/auth')
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="rounded-full hover:bg-white shadow-sm border border-transparent hover:border-slate-100 transition-all gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Home
        </Button>

        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-[2rem] bg-slate-200/50 p-1 h-14 mb-6">
            <TabsTrigger value="perfil" className="rounded-[1.75rem] font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-xl transition-all h-full">
              <User className="h-4 w-4 mr-2" /> Meu Perfil
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-[1.75rem] font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-xl transition-all h-full">
              <Trophy className="h-4 w-4 mr-2" /> Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
              <div className="h-3 w-full bg-gradient-to-r from-primary to-emerald-400" />
              <CardHeader className="text-center pt-10 pb-6">
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <div className="w-full h-full rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center group">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="h-16 w-16 text-slate-300" />
                    )}
                    <div 
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-white/60 rounded-[2.5rem] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
                <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Meu Perfil</CardTitle>
                <CardDescription className="text-slate-500 font-medium">
                  Personalize suas informações de acesso
                </CardDescription>
              </CardHeader>

              <CardContent className="px-8 pb-10">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                        <User className="h-3 w-3" /> Nome Completo
                      </Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                          <CreditCard className="h-3 w-3" /> CPF (Não pode ser alterado)
                        </Label>
                        <Input
                          value={cpf}
                          disabled
                          className="h-12 rounded-2xl border-slate-200 bg-slate-100 cursor-not-allowed opacity-70"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                          <Phone className="h-3 w-3" /> Telefone
                        </Label>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                        <Mail className="h-3 w-3" /> Email
                      </Label>
                      <Input
                        value={user.email}
                        disabled
                        className="h-12 rounded-2xl border-slate-200 bg-slate-100 cursor-not-allowed opacity-70"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all mt-4" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <ConsolidatedStats userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Profile
