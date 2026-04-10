import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'

// ─── Constantes da escadaria ──────────────────────────────────────────────────
const STEP_COUNT = 40
const STEP_DZ    = 0.44   // profundidade de cada degrau
const STEP_DY    = 0.17   // altura de cada degrau (escada íngreme como Fushimi)
const STEP_W     = 5.2    // largura da escadaria
const STEP_H     = 0.20   // espessura visual do degrau
const START_Z    = 17.6   // z do primeiro degrau

// Retorna a altura Y da escadaria em um dado Z
function stepY(z) {
  const i = Math.max(0, Math.round((START_Z - z) / STEP_DZ))
  return i * STEP_DY
}

// ─── Luz solar com sombra ─────────────────────────────────────────────────────
function SunLight() {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current) return
    const s = ref.current.shadow
    s.mapSize.set(1024, 1024)
    s.camera.near   = 0.5
    s.camera.far    = 65
    s.camera.left   = -18
    s.camera.right  = 18
    s.camera.top    = 24
    s.camera.bottom = -8
  }, [])
  return (
    <directionalLight
      ref={ref}
      castShadow
      position={[9, 18, 8]}
      intensity={2.6}
      color="#FFF5E0"
    />
  )
}

// ─── Torii Gate ───────────────────────────────────────────────────────────────
// Vermelhão #C23B10 (corpo), preto #1A0E08 (kasagi topo) — fiel ao Fushimi Inari
function ToriiGate({ position, scale = 1 }) {
  const w   = 2.5  * scale
  const h   = 4.3  * scale
  const pr  = 0.12 * scale   // raio pilar
  const bH  = 0.17 * scale   // espessura viga
  const ext = 0.88 * scale   // extensão lateral do kasagi

  const pillarGeo    = useMemo(() => new THREE.CylinderGeometry(pr * 0.84, pr * 1.06, h, 14), [pr, h])
  const kasagiGeo    = useMemo(() => new THREE.BoxGeometry(w + ext * 2, bH, 0.30 * scale), [w, ext, bH, scale])
  const kasagiSubGeo = useMemo(() => new THREE.BoxGeometry(w + ext * 1.5, bH * 0.52, 0.23 * scale), [w, ext, bH, scale])
  const nukiGeo      = useMemo(() => new THREE.BoxGeometry(w + 0.22 * scale, bH * 0.62, 0.20 * scale), [w, bH, scale])

  return (
    <group position={position}>
      {/* Pilares */}
      <mesh castShadow receiveShadow position={[-w / 2, h / 2, 0]} geometry={pillarGeo}>
        <meshStandardMaterial color="#C23B10" roughness={0.52} metalness={0.02} />
      </mesh>
      <mesh castShadow receiveShadow position={[ w / 2, h / 2, 0]} geometry={pillarGeo}>
        <meshStandardMaterial color="#C23B10" roughness={0.52} metalness={0.02} />
      </mesh>
      {/* Kasagi topo — preto */}
      <mesh castShadow receiveShadow position={[0, h + bH / 2, 0]} geometry={kasagiGeo}>
        <meshStandardMaterial color="#1A0E08" roughness={0.68} />
      </mesh>
      {/* Kasagi corpo — vermelhão */}
      <mesh receiveShadow position={[0, h - bH * 0.28, 0]} geometry={kasagiSubGeo}>
        <meshStandardMaterial color="#C23B10" roughness={0.52} metalness={0.02} />
      </mesh>
      {/* Nuki (viga inferior) */}
      <mesh castShadow receiveShadow position={[0, h * 0.73, 0]} geometry={nukiGeo}>
        <meshStandardMaterial color="#C23B10" roughness={0.52} metalness={0.02} />
      </mesh>
    </group>
  )
}

// ─── Degraus (InstancedMesh — 1 draw call) ───────────────────────────────────
function StoneSteps() {
  const ref = useRef()
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8A8078', roughness: 0.94, metalness: 0,
  }), [])

  useEffect(() => {
    if (!ref.current) return
    const m = new THREE.Matrix4()
    const p = new THREE.Vector3()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3(STEP_W, STEP_H, STEP_DZ + 0.03)
    for (let i = 0; i < STEP_COUNT; i++) {
      p.set(0, i * STEP_DY + STEP_H / 2, START_Z - i * STEP_DZ)
      m.compose(p, q, s)
      ref.current.setMatrixAt(i, m)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])

  return <instancedMesh ref={ref} args={[geo, mat, STEP_COUNT]} castShadow receiveShadow />
}

// ─── Laterais da escadaria (paredes de contenção) ─────────────────────────────
function StepWalls() {
  const ref  = useRef()
  const ref2 = useRef()
  const geo  = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat  = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#7A7068', roughness: 0.95, metalness: 0,
  }), [])

  useEffect(() => {
    const setup = (instRef, xSign) => {
      if (!instRef.current) return
      const m = new THREE.Matrix4()
      const p = new THREE.Vector3()
      const q = new THREE.Quaternion()
      const s = new THREE.Vector3(0.28, STEP_H * 2.5, STEP_DZ + 0.03)
      for (let i = 0; i < STEP_COUNT; i++) {
        p.set(xSign * (STEP_W / 2 + 0.14), i * STEP_DY + STEP_H, START_Z - i * STEP_DZ)
        m.compose(p, q, s)
        instRef.current.setMatrixAt(i, m)
      }
      instRef.current.instanceMatrix.needsUpdate = true
    }
    setup(ref, -1)
    setup(ref2, 1)
  }, [])

  return (
    <>
      <instancedMesh ref={ref}  args={[geo, mat, STEP_COUNT]} castShadow receiveShadow />
      <instancedMesh ref={ref2} args={[geo, mat, STEP_COUNT]} castShadow receiveShadow />
    </>
  )
}

// ─── Lanternas de pedra (石灯籠) ─────────────────────────────────────────────
function StoneLanterns() {
  const mat     = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9A9490', roughness: 0.9 }), [])
  const baseGeo = useMemo(() => new THREE.BoxGeometry(0.30, 0.50, 0.30), [])
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(0.36, 0.42, 0.36), [])
  const roofGeo = useMemo(() => new THREE.BoxGeometry(0.54, 0.13, 0.54), [])

  const zList = [START_Z - 1, 13.5, 11, 8.5, 6, 3.5]
  const pairs = zList.flatMap(z => [[-3.2, z], [3.2, z]])

  return (
    <>
      {pairs.map(([x, z], i) => {
        const y = stepY(z)
        return (
          <group key={i} position={[x, y, z]}>
            <mesh castShadow receiveShadow geometry={baseGeo} material={mat} position={[0, 0.25, 0]} />
            <mesh castShadow receiveShadow geometry={bodyGeo} material={mat} position={[0, 0.71, 0]} />
            <mesh castShadow receiveShadow geometry={roofGeo} material={mat} position={[0, 0.98, 0]} />
          </group>
        )
      })}
    </>
  )
}

// ─── Árvores nas laterais ─────────────────────────────────────────────────────
function Trees() {
  const trunkMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3E2E18', roughness: 0.9 }), [])
  const canopyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2A4E18', roughness: 0.95 }), [])
  const trunkGeo  = useMemo(() => new THREE.CylinderGeometry(0.13, 0.20, 4.0, 7), [])
  const canopyGeo = useMemo(() => new THREE.SphereGeometry(1.5, 8, 6), [])

  const positions = useMemo(() => {
    const pts = []
    for (let i = 0; i < 9; i++) {
      const z = START_Z - i * 2.0
      pts.push([-5.2, z], [5.2, z])
    }
    return pts
  }, [])

  return (
    <>
      {positions.map(([x, z], i) => {
        const y = stepY(z)
        return (
          <group key={i} position={[x, y, z]}>
            <mesh castShadow receiveShadow geometry={trunkGeo} material={trunkMat} position={[0, 2.0, 0]} />
            <mesh castShadow              geometry={canopyGeo} material={canopyMat} position={[0, 4.7, 0]} />
          </group>
        )
      })}
    </>
  )
}

// ─── Chão ─────────────────────────────────────────────────────────────────────
function Ground() {
  const geo = useMemo(() => new THREE.PlaneGeometry(20, 50), [])
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} geometry={geo}>
      <meshStandardMaterial color="#4E5E30" roughness={0.96} />
    </mesh>
  )
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────
function CameraRig({ scrollRef }) {
  const { camera } = useThree()

  useFrame(() => {
    const raw = Math.min(scrollRef.current, 1)
    // Ease in-out cúbico
    const t = raw < 0.5
      ? 4 * raw * raw * raw
      : 1 - Math.pow(-2 * raw + 2, 3) / 2

    // Posição: sobe escada e avança pelo corredor
    camera.position.set(
      0,
      THREE.MathUtils.lerp(0.55, 6.0, t),
      THREE.MathUtils.lerp(19.8, -7,  t),
    )

    // LookAt: olha para cima da escada → para além do portão ao cruzar
    camera.lookAt(
      0,
      THREE.MathUtils.lerp(2.8, 5.5, t),
      THREE.MathUtils.lerp(7,  -22,  t),
    )

    // FOV: grande no início (preenche tela), fecha ao cruzar o portão
    const fovTarget = THREE.MathUtils.lerp(82, 64, t)
    if (Math.abs(camera.fov - fovTarget) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, 0.06)
      camera.updateProjectionMatrix()
    }
  })

  return null
}

// ─── Cena ─────────────────────────────────────────────────────────────────────
function Scene({ scrollRef }) {
  // 7 portões em corredor crescente — densidade visual do Fushimi Inari
  const gates = [
    { z: START_Z - 1.0, scale: 0.82 },
    { z: 13.8,           scale: 0.90 },
    { z: 11.2,           scale: 0.97 },
    { z: 8.6,            scale: 1.04 },
    { z: 6.0,            scale: 1.12 },
    { z: 3.4,            scale: 1.21 },
    { z: 0.8,            scale: 1.34 },  // portão final — o maior
  ].map(({ z, scale }) => ({ position: [0, stepY(z), z], scale }))

  return (
    <>
      {/* Fundo — céu de dia */}
      <color attach="background" args={['#87CEEB']} />

      {/* Névoa atmosférica suave de dia */}
      <fog attach="fog" color="#CADCE8" near={26} far={58} />

      {/* Iluminação diurna */}
      <hemisphereLight args={['#87CEEB', '#8B7355', 0.9]} />
      <SunLight />
      <ambientLight intensity={0.30} />

      {/* Geometria */}
      <Ground />
      <StoneSteps />
      <StepWalls />
      <StoneLanterns />
      <Trees />

      {gates.map((g, i) => <ToriiGate key={i} {...g} />)}

      <CameraRig scrollRef={scrollRef} />
    </>
  )
}

// ─── Componente exportado ─────────────────────────────────────────────────────
export function FushimiGate({ scrollRef, style }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.55, 19.8], fov: 82 }}
      style={{ position: 'fixed', inset: 0, zIndex: 2, ...style }}
    >
      <Scene scrollRef={scrollRef} />
    </Canvas>
  )
}
