import { cn } from '@/lib/utils'

export function ReadinessMeter({ value, className }: { value: number; className?: string }) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const dash = (value / 100) * circumference

  const tone =
    value >= 100
      ? 'text-success'
      : value >= 60
        ? 'text-primary'
        : value >= 30
          ? 'text-warning'
          : 'text-muted-foreground'

  return (
    <div className={cn('relative grid size-[76px] shrink-0 place-items-center', className)}>
      <svg viewBox="0 0 76 76" className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-border"
        />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className={cn('transition-[stroke-dasharray] duration-700 ease-out', tone)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={cn('font-display text-lg font-bold leading-none tabular-nums', tone)}>
          {value}
          <span className="text-[0.6rem] font-semibold">%</span>
        </span>
      </div>
    </div>
  )
}
