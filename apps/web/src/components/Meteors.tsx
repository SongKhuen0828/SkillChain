import { useEffect, useState } from 'react'
import { useTheme } from './theme-provider'

interface Meteor {
  id: number
  startX: number
  startY: number
  delay: number
  duration: number
  color: string
}

export function Meteors({ count = 20 }: { count?: number }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [meteors, setMeteors] = useState<Meteor[]>([])

  useEffect(() => {
    // Generate meteors with random properties
    const generateMeteors = (): Meteor[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: i,
        startX: Math.random() * 100, // Random starting X position (0-100%)
        startY: Math.random() * 20 - 10, // Random starting Y position (-10% to 10%)
        delay: Math.random() * 15, // Random delay 0-15 seconds
        duration: 2 + Math.random() * 3, // Random duration 2-5 seconds
        color: Math.random() > 0.5 ? 'slate' : 'cyan', // Random color
      }))
    }

    setMeteors(generateMeteors())
  }, [count])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {meteors.map((meteor) => (
        <div
          key={meteor.id}
          className={`absolute animate-meteor ${isDark ? 'opacity-30' : 'opacity-10'}`}
          style={{
            left: `${meteor.startX}%`,
            top: `${meteor.startY}%`,
            animationDelay: `${meteor.delay}s`,
            animationDuration: `${meteor.duration}s`,
          }}
        >
          <div
            className={`h-[50px] w-[1px] bg-gradient-to-b ${
              meteor.color === 'cyan'
                ? 'from-cyan-500 to-transparent'
                : 'from-slate-500 to-transparent'
            }`}
          />
        </div>
      ))}
    </div>
  )
}
