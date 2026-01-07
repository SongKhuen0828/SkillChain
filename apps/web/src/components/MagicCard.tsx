import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MagicCardProps {
  title?: string
  icon?: ReactNode
  value?: string | number
  trend?: string
  delay?: number
  children?: ReactNode
  className?: string
  onClick?: () => void
}

export function MagicCard({
  title,
  icon,
  value,
  trend,
  delay = 0,
  children,
  className,
  onClick,
}: MagicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -5 }}
      className={cn(
        'relative overflow-hidden rounded-xl',
        'border border-slate-200 dark:border-white/10',
        'bg-white dark:bg-slate-900/60 dark:backdrop-blur-md',
        'shadow-sm hover:shadow-md dark:shadow-xl',
        'cursor-pointer transition-all duration-300',
        'group',
        className
      )}
      onClick={onClick}
    >
      {/* Glow Effect on Hover - Dark Mode Only */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 dark:group-hover:opacity-100',
          'transition-opacity duration-300',
          'bg-gradient-to-br from-neon-cyan/20 via-neon-blue/20 to-neon-purple/20',
          'blur-xl -z-10'
        )}
      />

      {/* Inner Glow Border on Hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100',
          'transition-opacity duration-300',
          'border-2 border-blue-500 dark:border-neon-cyan/50',
          'pointer-events-none'
        )}
      />

      {/* Content */}
      <div className="relative p-6">
        {children ? (
          children
        ) : (
          <div className="space-y-4">
            {/* Header with Icon and Title */}
            {(icon || title) && (
              <div className="flex items-center justify-between">
                {title && (
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</h3>
                )}
                {icon && (
                  <div className="text-blue-600 dark:text-neon-cyan dark:group-hover:text-neon-blue transition-colors duration-300">
                    {icon}
                  </div>
                )}
              </div>
            )}

            {/* Value and Trend */}
            <div className="flex items-end gap-2">
              {value !== undefined && (
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
              )}
              {trend && (
                <span
                  className={cn(
                    'text-sm font-medium mb-1',
                    trend.startsWith('+')
                      ? 'text-green-600 dark:text-neon-cyan'
                      : trend.startsWith('-')
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-500 dark:text-muted-foreground'
                  )}
                >
                  {trend}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Accent Line (Dark Mode Only - for extra sci-fi feel) */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1',
          'bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple',
          'opacity-0 dark:group-hover:opacity-50 transition-opacity duration-300'
        )}
      />
    </motion.div>
  )
}

