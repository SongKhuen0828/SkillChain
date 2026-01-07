import { useTheme } from '@/components/theme-provider'
import Hyperspeed from './Hyperspeed'

export default function HyperspeedBackground() {
  const { theme } = useTheme()
  // Helper to reliably check dark mode
  const isDark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  // 🌙 DARK MODE (Cyberpunk)
  const darkOptions = {
    onSpeedUp: () => {},
    onSlowDown: () => {},
    distortion: 'turbulentDistortion',
    length: 400,
    roadWidth: 10,
    islandWidth: 2,
    lanesPerRoad: 3,
    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,
    carLightsFade: 0.4,
    totalSideLightSticks: 20,
    lightPairsPerRoadWay: 40,
    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,
    lightStickWidth: [0.12, 0.5] as [number, number],
    lightStickHeight: [1.3, 1.7] as [number, number],
    movingAwaySpeed: [60, 80] as [number, number],
    movingCloserSpeed: [-120, -160] as [number, number],
    carLightsLength: [400 * 0.03, 400 * 0.2] as [number, number],
    carLightsRadius: [0.05, 0.14] as [number, number],
    carWidthPercentage: [0.3, 0.5] as [number, number],
    carShiftX: [-0.8, 0.8] as [number, number],
    carFloorSeparation: [0, 5] as [number, number],
    colors: {
      roadColor: 0x080808,
      islandColor: 0x0a0a0a,
      background: 0x020617,
      shoulderLines: 0x06b6d4,
      brokenLines: 0x06b6d4,
      leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
      rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
      sticks: 0x03b3c3,
    },
  }

  // ☀️ LIGHT MODE (Blueprint / Paper Style)
  const lightOptions = {
    onSpeedUp: () => {},
    onSlowDown: () => {},
    distortion: 'turbulentDistortion',
    length: 400,
    roadWidth: 10,
    islandWidth: 2,
    lanesPerRoad: 3,
    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,
    carLightsFade: 0.4,
    totalSideLightSticks: 20,
    lightPairsPerRoadWay: 40,
    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,
    lightStickWidth: [0.12, 0.5] as [number, number],
    lightStickHeight: [1.3, 1.7] as [number, number],
    movingAwaySpeed: [60, 80] as [number, number],
    movingCloserSpeed: [-120, -160] as [number, number],
    carLightsLength: [400 * 0.03, 400 * 0.2] as [number, number],
    carLightsRadius: [0.05, 0.14] as [number, number],
    carWidthPercentage: [0.3, 0.5] as [number, number],
    carShiftX: [-0.8, 0.8] as [number, number],
    carFloorSeparation: [0, 5] as [number, number],
    colors: {
      roadColor: 0xffffff, // Pure White Road
      islandColor: 0xf1f5f9, // Light Grey Island
      background: 0xffffff, // Pure White Background
      shoulderLines: 0x1e293b, // Dark Slate (High contrast)
      brokenLines: 0x94a3b8, // Grey
      leftCars: [0xdc2626, 0x991b1b, 0xff0000], // Red
      rightCars: [0x2563eb, 0x1d4ed8, 0x0000ff], // Blue
      sticks: 0x2563eb,
    },
  }

  return (
    <div
      className={`fixed inset-0 z-0 pointer-events-none transition-colors duration-500 ${
        isDark ? 'bg-slate-950 opacity-80' : 'bg-white opacity-60'
      }`}
    >
      {/* key={theme} forces the component to destroy and re-mount completely when theme changes */}
      <Hyperspeed key={theme} effectOptions={isDark ? darkOptions : lightOptions} />

      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-slate-50/50 dark:to-slate-950/80" />
    </div>
  )
}
