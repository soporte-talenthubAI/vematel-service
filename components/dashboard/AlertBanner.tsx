import { AlertTriangle, Info, CheckCircle } from 'lucide-react'

interface Props {
  message: string
  type?: 'warning' | 'info' | 'success'
}

const STYLES = {
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    Icon: AlertTriangle,
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    Icon: Info,
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    Icon: CheckCircle,
  },
}

export function AlertBanner({ message, type = 'warning' }: Props) {
  const { container, Icon } = STYLES[type]
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm mb-4 ${container}`}>
      <Icon size={14} />
      {message}
    </div>
  )
}
