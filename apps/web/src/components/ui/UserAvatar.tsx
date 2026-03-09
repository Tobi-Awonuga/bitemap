type UserAvatarProps = {
  name: string
  avatarUrl?: string | null
  className?: string
  textClassName?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function UserAvatar({ name, avatarUrl, className = '', textClassName = '' }: UserAvatarProps) {
  const normalized = avatarUrl?.trim()
  if (normalized) {
    return (
      <img
        src={normalized}
        alt={name}
        className={`rounded-full object-cover bg-slate-200 ${className}`}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div className={`rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center ${className}`}>
      <span className={`text-white font-bold ${textClassName}`}>{getInitials(name)}</span>
    </div>
  )
}
