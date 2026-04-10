import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

// ─── Wire: wireframe limpo usando EdgesGeometry ───────────────────────────────
function Wire({ geometry, opacity = 1 }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry])
  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color="#0d00ff" transparent opacity={opacity} />
    </lineSegments>
  )
}

// ─── Torii Gate ───────────────────────────────────────────────────────────────
// Geometria fiel ao torii xintoísta: dois pilares levemente cônicos,
// kasagi (viga superior larga), nuki (viga inferior mais estreita).
function ToriiGate({ position, scale = 1, opacity = 1 }) {
  const w  = 2.8 * scale   // largura interna entre pilares
  const h  = 4.0 * scale   // altura dos pilares
  const r  = 0.09 * scale  // raio do pilar (base)
  const bH = 0.15 * scale  // espessura das vigas

  const pillarGeo = useMemo(
    () => new THREE.CylinderGeometry(r * 0.82, r, h, 8),
    [r, h]
  )
  const kasagiGeo = useMemo(
    () => new THREE.BoxGeometry(w + 0.85 * scale, bH, 0.26 * scale),
    [w, bH, scale]
  )
  const nukiGeo = useMemo(
    () => new THREE.BoxGeometry(w + 0.18 * scale, bH * 0.65, 0.18 * scale),
    [w, bH, scale]
  )

  return (
    <group position={position}>
      {/* Pilar esquerdo */}
      <group position={[-w / 2, h / 2, 0]}>
        <Wire geometry={pillarGeo} opacity={opacity} />
      </group>
      {/* Pilar direito */}
      <group position={[w / 2, h / 2, 0]}>
        <Wire geometry={pillarGeo} opacity={opacity} />
      </group>
      {/* Kasagi — viga superior */}
      <group position={[0, h + bH / 2, 0]}>
        <Wire geometry={kasagiGeo} opacity={opacity} />
      </group>
      {/* Nuki — viga inferior (a 74% da altura) */}
      <group position={[0, h * 0.74, 0]}>
        <Wire geometry={nukiGeo} opacity={opacity} />
      </group>
    </group>
  )
}

// ─── Degraus de pedra ─────────────────────────────────────────────────────────
const STEP_COUNT = 34
const STEP_DZ    = 0.5    // profundidade de cada degrau
const STEP_DY    = 0.118  // altura de cada degrau

function StoneSteps() {
  const geo  = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const edge = useMemo(() => new THREE.EdgesGeometry(geo), [geo])

  return (
    <>
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <group
          key={i}
          position={[0, i * STEP_DY, 18 - i * STEP_DZ]}
          scale={[4.8, 0.11, STEP_DZ]}
        >
          <lineSegments geometry={edge}>
            <lineBasicMaterial color="#0d00ff" transparent opacity={0.22} />
          </lineSegments>
        </group>
      ))}
    </>
  )
}

// ─── Lanternas de pedra (石灯籠) ─────────────────────────────────────────────
// Posicionadas em pares nas laterais da escadaria.
function StoneLanterns() {
  // Calcula y da lanterna baseado no degrau mais próximo
  const stepY = (z) => {
    const i = Math.round((18 - z) / STEP_DZ)
    return Math.max(0, i) * STEP_DY
  }

  const zPositions = [16, 13, 10.5, 8, 5.5, 3]
  const pairs = zPositions.flatMap(z => [
    [-2.8, stepY(z), z],
    [ 2.8, stepY(z), z],
  ])

  const baseGeo = useMemo(() => new THREE.BoxGeometry(0.22, 0.42, 0.22), [])
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(0.28, 0.36, 0.28), [])
  const roofGeo = useMemo(() => new THREE.BoxGeometry(0.42, 0.1, 0.42), [])

  const baseEdge = useMemo(() => new THREE.EdgesGeometry(baseGeo), [baseGeo])
  const bodyEdge = useMemo(() => new THREE.EdgesGeometry(bodyGeo), [bodyGeo])
  const roofEdge = useMemo(() => new THREE.EdgesGeometry(roofGeo), [roofGeo])

  return (
    <>
      {pairs.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          {/* Base */}
          <group position={[0, 0.21, 0]}>
            <lineSegments geometry={baseEdge}>
              <lineBasicMaterial color="#0d00ff" transparent opacity={0.2} />
            </lineSegments>
          </group>
          {/* Corpo */}
          <group position={[0, 0.60, 0]}>
            <lineSegments geometry={bodyEdge}>
              <lineBasicMaterial color="#0d00ff" transparent opacity={0.2} />
            </lineSegments>
          </group>
          {/* Telhado */}
          <group position={[0, 0.85, 0]}>
            <lineSegments geometry={roofEdge}>
              <lineBasicMaterial color="#0d00ff" transparent opacity={0.2} />
            </lineSegments>
          </group>
        </group>
      ))}
    </>
  )
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────
// Lê scrollRef (0→1) e move a câmera ao longo da escadaria + portão.
function CameraRig({ scrollRef }) {
  const { camera } = useThree()

  useFrame(() => {
    const raw = Math.min(scrollRef.current, 1)
    // ease-in-out cúbico para sensação de peso real
    const t = raw < 0.5
      ? 4 * raw * raw * raw
      : 1 - Math.pow(-2 * raw + 2, 3) / 2

    // Posição: sobe a escadaria e avança pelo corredor de portões
    camera.position.set(
      0,
      THREE.MathUtils.lerp(1.35, 6.8, t),
      THREE.MathUtils.lerp(22,  -7,  t)
    )

    // LookAt: sempre em direção ao portão final, levemente acima
    camera.lookAt(
      0,
      THREE.MathUtils.lerp(4.0, 7.5, t),
      THREE.MathUtils.lerp(8,  -20,  t)
    )
  })

  return null
}

// ─── Cena principal ───────────────────────────────────────────────────────────
function Scene({ scrollRef }) {
  // 5 portões em corredor — escala e posição baseadas nos degraus
  const stepY = (z) => {
    const i = Math.round((18 - z) / STEP_DZ)
    return Math.max(0, i) * STEP_DY
  }

  const gates = [
    { z: 17,   scale: 0.55 },
    { z: 13,   scale: 0.72 },
    { z: 9.5,  scale: 0.90 },
    { z: 6,    scale: 1.12 },
    { z: 2,    scale: 1.48 }, // portão final — o maior
  ].map(({ z, scale }) => ({
    position: [0, stepY(z), z],
    scale,
  }))

  return (
    <>
      {/* Névoa atmosférica — cria profundidade e mistério */}
      <fog attach="fog" color="#020617" near={12} far={38} />

      {/* Luz pontual azul no portão final */}
      <pointLight position={[0, 7, 2]} color="#0d00ff" intensity={4} distance={18} />
      {/* Luz ambiental mínima */}
      <ambientLight intensity={0.06} color="#0d00ff" />

      <StoneSteps />
      <StoneLanterns />

      {gates.map((g, i) => (
        <ToriiGate key={i} {...g} />
      ))}

      <CameraRig scrollRef={scrollRef} />
    </>
  )
}

// ─── Componente exportado ─────────────────────────────────────────────────────
export function FushimiGate({ scrollRef, style }) {
  return (
    <Canvas
      camera={{ position: [0, 1.35, 22], fov: 62 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2,
        ...style,
      }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene scrollRef={scrollRef} />
    </Canvas>
  )
}
