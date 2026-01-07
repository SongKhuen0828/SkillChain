import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'dark' | 'light'
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'skillchain-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize from localStorage or use default
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as Theme | null
      return stored || defaultTheme
    }
    return defaultTheme
  })

  // Resolve the actual theme (dark or light) based on theme setting
  const getResolvedTheme = (currentTheme: Theme): 'dark' | 'light' => {
    if (currentTheme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      }
      return 'light'
    }
    return currentTheme
  }

  const [resolved, setResolved] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const initialTheme = (() => {
        const stored = localStorage.getItem(storageKey) as Theme | null
        return stored || defaultTheme
      })()
      return getResolvedTheme(initialTheme)
    }
    return 'light'
  })

  useEffect(() => {
    // Update resolved theme when theme changes
    const newResolved = getResolvedTheme(theme)
    setResolved(newResolved)

    // Apply or remove dark class
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (newResolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }
  }, [theme])

  useEffect(() => {
    // Listen for system theme changes when theme is set to 'system'
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      const newResolved = getResolvedTheme(theme)
      setResolved(newResolved)
      
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      
      if (newResolved === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.add('light')
      }
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Fallback for older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    resolvedTheme: resolved,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

