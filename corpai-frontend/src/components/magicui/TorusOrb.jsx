import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'

// ─── Torus wireframe animado ──────────────────────────────────────────────────
function TorusMesh({ scrollRef }) {
  const ref = useRef()

  // EdgesGeometry dá linhas limpas sem triângulos internos
  const geo  = useMemo(() => new THREE.TorusGeometry(1, 0.032, 20, 90), [])
  const edge = useMemo(() => new THREE.EdgesGeometry(geo), [geo])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t      = clock.getElapsedTime()
    const scroll = scrollRef.current   // 0 → 1

    // Rotação Y contínua + inclinação X progressiva no scroll
    ref.current.rotation.y = t * 0.35
    ref.current.rotation.x = 0.32 + scroll * Math.PI * 0.9
    ref.current.rotation.z = t * 0.08
  })

  return (
    <lineSegments ref={ref} geometry={edge}>
      <lineBasicMaterial color="#0d00ff" transparent opacity={0.72} />
    </lineSegments>
  )
}

// ─── Componente exportado ─────────────────────────────────────────────────────
export function TorusOrb({ scrollRef }) {
  return (
    <div
      style={{
        position:  'fixed',
        right:     'clamp(1.5rem, 4vw, 3.5rem)',
        top:       '50%',
        transform: 'translateY(-50%)',
        width:     180,
        height:    180,
        zIndex:    5,
        pointerEvents: 'none',
        opacity:   0.85,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 2.7], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
      >
        <TorusMesh scrollRef={scrollRef} />
      </Canvas>
    </div>
  )
}
