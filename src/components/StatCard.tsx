import { usePulse } from '../hooks/usePulse'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  const pulsing = usePulse(value)

  return (
    <div
      className={
        accent
          ? 'flex-1 rounded-2xl border border-primary/40 bg-primary-soft px-4 py-3 dark:border-primary-light/40'
          : 'flex-1 rounded-2xl border border-primary/20 bg-white/70 px-4 py-3 dark:border-primary-light/20 dark:bg-stone-800/50'
      }
    >
      <p
        className={`text-xs font-medium uppercase tracking-wide ${
          accent ? 'text-primary dark:text-primary-light' : 'text-stone-400'
        }`}
      >
        {label}
      </p>
      <p
        className={`font-display text-2xl font-semibold ${
          accent ? 'text-primary dark:text-primary-light' : 'text-stone-800 dark:text-stone-100'
        } ${pulsing ? 'animate-pulse-value' : ''}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-stone-400">{sub}</p>}
    </div>
  )
}
