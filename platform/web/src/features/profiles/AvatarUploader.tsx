import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'

const MAX_SIZE_MB = 5
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface AvatarUploaderProps {
  avatarUrl: string | null
  fullName: string
  onUpload: (file: File) => Promise<void>
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'
}

export function AvatarUploader({ avatarUrl, fullName, onUpload }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato no válido. Usa una imagen JPG, PNG o WebP.')
      return
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`La imagen no debe pesar más de ${MAX_SIZE_MB} MB.`)
      return
    }

    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary-dark overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            initials(fullName)
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          aria-label="Cambiar foto de perfil"
          className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md text-text-light hover:text-primary disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-sm text-error-dark text-center">{error}</p>}
    </div>
  )
}
