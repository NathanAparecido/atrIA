import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

// ─── Torus wireframe animado ──────────────────────────────────────────────────
function TorusMesh({ scrollRef }) {
  const ref = useRef()

  const geo  = useMemo(() => new THREE.TorusGeometry(1, 0.032, 20, 90), [])
  const edge = useMemo(() => new THREE.EdgesGeometry(geo), [geo])

  useFrame(({ clock }, delta) => {
    if (!ref.current) return
    const scroll = scrollRef.current   // 0 → 1

    // Speed ramps up during the scroll transition zone (5%–85%) then settles
    const inTransition = scroll > 0.05 && scroll < 0.85
    const speedMult = inTransition
      ? THREE.MathUtils.smoothstep(scroll, 0.05, 0.5) * 2.2 + 0.35
      : 0.35

    ref.current.rotation.y += delta * 0.35 * speedMult
    ref.current.rotation.x = 0.32 + scroll * Math.PI * 0.9
    ref.current.rotation.z += delta * 0.08 * speedMult
  })

  return (
    <lineSegments ref={ref} geometry={edge}>
      <lineBasicMaterial color="#0d00ff" transparent opacity={0.72} />
    </lineSegments>
  )
}

// ─── Componente exportado ─────────────────────────────────────────────────────
export function TorusOrb({ scrollRef, wrapperRef }) {
  return (
    <div
      ref={wrapperRef}
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
        transition: 'opacity 0.6s ease',
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
