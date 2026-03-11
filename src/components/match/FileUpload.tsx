import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, File, X, Eye } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileUpload: (filePath: string | null) => void
  existingFilePath?: string
}

export default function FileUpload({ onFileUpload, existingFilePath }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(existingFilePath || null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Apenas arquivos de imagem são permitidos",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro", 
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive"
      })
      return
    }

    try {
      setUploading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para enviar arquivos",
          variant: "destructive"
        })
        return
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('match-reports')
        .upload(fileName, file)

      if (error) throw error

      setUploadedFile(data.path)
      onFileUpload(data.path)
      
      toast({
        title: "Sucesso",
        description: "Súmula enviada com sucesso"
      })
    } catch (error) {
      console.error('Erro no upload:', error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar o arquivo",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }, [onFileUpload])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await processFile(files[0])
    }
  }, [processFile])

  const handleRemoveFile = async () => {
    if (!uploadedFile) return
    
    try {
      const { error } = await supabase.storage
        .from('match-reports')
        .remove([uploadedFile])
      
      if (error) throw error
      
      setUploadedFile(null)
      onFileUpload(null)
      
      toast({
        title: "Sucesso", 
        description: "Arquivo removido"
      })
    } catch (error) {
      console.error('Erro ao remover arquivo:', error)
      toast({
        title: "Erro",
        description: "Não foi possível remover o arquivo",
        variant: "destructive"
      })
    }
  }

  const handleViewFile = async () => {
    if (!uploadedFile) return
    
    try {
      const { data } = await supabase.storage
        .from('match-reports')
        .createSignedUrl(uploadedFile, 60 * 60) // 1 hour expiry
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error)
      toast({
        title: "Erro",
        description: "Não foi possível visualizar o arquivo",
        variant: "destructive"
      })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <File className="h-4 w-4" />
          Súmula da Partida
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!uploadedFile ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
              isDragging 
                ? "border-primary bg-primary/5 scale-[1.02]" 
                : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className={cn(
              "h-8 w-8 mx-auto mb-3 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="text-sm text-muted-foreground mb-1">
              {uploading ? 'Enviando...' : isDragging ? 'Solte o arquivo aqui' : 'Arraste a súmula ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG • Máx. 5MB
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <File className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm flex-1">Súmula anexada</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleViewFile} title="Visualizar">
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-destructive" onClick={handleRemoveFile} title="Remover">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}