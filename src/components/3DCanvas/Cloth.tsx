import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { camoTexture, galaxyTexture, getTexture, gradientTexture } from './textures'

/**
 * Cloth materials for the character. Each fabric has its own texture, shine and (for some) animation:
 * knit and fleece are soft and matte, satin and leather shine, sequins glitter, galaxy twinkles, neon glows.
 */
export function ClothMat({ kind = 'cotton', color, color2, tone = 1 }: { kind?: string; color: string; color2?: string; tone?: number }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  const shaded = useMemo(() => {
    const c = new THREE.Color(color)
    c.multiplyScalar(tone)
    return `#${c.getHexString()}`
  }, [color, tone])
  const maps = useMemo(() => {
    switch (kind) {
      case 'knit':
        return { map: getTexture('knit', 3, 3), bump: 1.4, rough: 0.97, metal: 0 }
      case 'fleece':
        return { map: getTexture('fleece', 2, 2), bump: 0.9, rough: 1, metal: 0 }
      case 'denim':
      case 'twill':
        return { map: getTexture('denim', 2, 2), bump: 0.8, rough: 0.85, metal: 0 }
      case 'leather':
        return { map: getTexture('leather', 2, 2), bump: 1.0, rough: 0.32, metal: 0.12 }
      case 'satin':
        return { map: getTexture('satin', 1, 1), bump: 0.1, rough: 0.18, metal: 0.3 }
      case 'sequin':
      case 'glitter':
        return { map: getTexture('sequin', 3, 3), bump: 1.2, rough: 0.22, metal: 0.65 }
      case 'mesh':
        return { map: getTexture('mesh', 3, 3), bump: 0.9, rough: 0.9, metal: 0 }
      case 'metal':
        return { map: getTexture('satin', 1, 1), bump: 0.2, rough: 0.22, metal: 0.9 }
      case 'galaxy':
        return { map: galaxyTexture(), bump: 0.1, rough: 0.5, metal: 0.1, colorMap: true }
      case 'gradient':
        return { map: gradientTexture(color, color2 ?? '#ffffff'), bump: 0.1, rough: 0.55, metal: 0, colorMap: true }
      case 'camo':
        return { map: camoTexture(), bump: 0.5, rough: 0.9, metal: 0, colorMap: true }
      case 'neon':
        return { map: getTexture('fabric', 2, 2), bump: 0.5, rough: 0.7, metal: 0 }
      default:
        return { map: getTexture('fabric', 2, 2), bump: 0.7, rough: 0.8, metal: 0 }
    }
  }, [kind, color, color2])

  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = clock.elapsedTime
    if (kind === 'sequin' || kind === 'glitter') m.emissiveIntensity = 0.12 + 0.22 * Math.abs(Math.sin(t * 3 + 1.3))
    else if (kind === 'galaxy') {
      m.emissiveIntensity = 0.12 + 0.1 * Math.sin(t * 1.7)
    } else if (kind === 'neon') m.emissiveIntensity = 0.7 + 0.5 * Math.sin(t * 2.4)
    else if (kind === 'metal') m.emissiveIntensity = 0.15 + 0.1 * Math.sin(t * 2)
  })

  const colorMap = 'colorMap' in maps && maps.colorMap
  const emissive = kind === 'neon' ? (color2 ?? '#22ff88') : kind === 'sequin' || kind === 'glitter' ? shaded : kind === 'galaxy' ? '#6d5cff' : kind === 'metal' ? '#a16207' : '#000000'
  return (
    <meshStandardMaterial
      ref={ref}
      color={colorMap ? '#ffffff' : shaded}
      map={maps.map}
      bumpMap={maps.map}
      bumpScale={maps.bump * (colorMap ? 0 : 1)}
      roughness={maps.rough}
      metalness={maps.metal}
      emissive={emissive}
      emissiveIntensity={kind === 'neon' ? 0.9 : kind === 'galaxy' ? 0.15 : 0}
    />
  )
}
