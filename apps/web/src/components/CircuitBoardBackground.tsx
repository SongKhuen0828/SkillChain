import { useEffect, useState } from 'react'
import { useTheme } from './theme-provider'

export default function CircuitBoardBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const { resolvedTheme } = useTheme() // Get current theme ('dark' or 'light')

  // Handle Mouse Move for Parallax Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate percentage from center (-1 to 1)
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      setMousePos({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Theme-aware grid colors
  const isDark = resolvedTheme === 'dark'
  const gridColor = isDark
    ? 'rgba(6, 182, 212, 0.3)' // Cyan for dark mode
    : 'rgba(71, 85, 105, 0.2)' // Slate-500 for light mode

  return (
    <div className="absolute inset-0 overflow-hidden perspective-container bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* 3D Tilted Plane with Interaction */}
      <div
        className="circuit-floor absolute inset-0 origin-bottom"
        style={{
          // Base rotation 70deg + dynamic mouse tilt
          transform: `rotateX(${70 - mousePos.y * 5}deg) rotateZ(${-mousePos.x * 5}deg) scale(3)`,
        }}
      >
        {/* The Grid Texture with theme-aware colors */}
        <div
          className="absolute inset-0 grid-pattern"
          style={{
            backgroundImage: `
              linear-gradient(${gridColor} 1px, transparent 1px),
              linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
            `,
            opacity: isDark ? 0.3 : 0.4,
          }}
        />
      </div>

      {/* Vignette Overlay (Fade to bg color at top) */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-slate-50/90 dark:to-slate-950/90 pointer-events-none" />

      <style>{`
        .perspective-container {
          perspective: 1000px;
        }
        
        .grid-pattern {
          background-size: 80px 80px;
          animation: grid-move 15s linear infinite;
        }

        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 0 80px; }
        }
      `}</style>
    </div>
  )
}
