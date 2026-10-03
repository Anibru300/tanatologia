import { useState } from 'react'

type AvatarProps = {
  /** URL pública de la foto (bucket `avatars`); si es null/undefined o falla la carga, se muestran iniciales. */
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-16 h-16 text-xl',
  lg: 'w-20 h-20 text-2xl',
} as const

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Avatar de solo lectura: foto de perfil con fallback a iniciales. */
export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)

  const base = `rounded-full bg-primary/10 flex items-center justify-center text-primary-dark font-bold overflow-hidden ${SIZES[size]}`
  const showImg = src && !imgFailed

  return (
    <div className={`${base} ${className}`} aria-label={name}>
      {showImg ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
