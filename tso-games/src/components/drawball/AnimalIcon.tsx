import { useEffect, useRef } from 'react'
import { drawAnimalIcon } from './animals'
import type { Animal } from './animals'

/** 主角小頭像：與遊戲畫面同一套蠟筆畫法 */
export default function AnimalIcon({ animal, size = 34, className = '' }: { animal: Animal; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) drawAnimalIcon(ref.current, animal)
  }, [animal, size])
  return <canvas ref={ref} className={`db-animal-icon ${className}`} style={{ width: size, height: size }} aria-hidden="true" />
}
