import {Environment, Float, Lightformer, useTexture} from '@react-three/drei';
import {Canvas, useFrame} from '@react-three/fiber';
import {Expand, Layers, Minimize2, Pause, Play} from 'lucide-react';
import React, {Component, type ReactNode, Suspense, useEffect, useRef, useState} from 'react';
import * as THREE from 'three';

interface HeroSpatialSceneProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SceneErrorBoundary extends Component<{children: ReactNode; fallback: ReactNode}, ErrorBoundaryState> {
  state: ErrorBoundaryState = {hasError: false};

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {hasError: true};
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface PolyhedronProps {
  staticMode: boolean;
  wireframeOverlay: boolean;
}

const CityscapeEnvironment: React.FC = () => {
  const texture = useTexture('/assets/xerotech-3d-cityscape.png');

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <Environment frames={1} resolution={256} background={false}>
      <mesh scale={40}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
      </mesh>
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#0066FF"
        scale={[10, 4, 1]}
        position={[0, 6, -8]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.6}
        color="#00C2FF"
        scale={[8, 3, 1]}
        position={[-8, 3, 5]}
        target={[0, 0, 0]}
      />
    </Environment>
  );
};

const ReflectivePolyhedron: React.FC<PolyhedronProps> = ({staticMode, wireframeOverlay}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const autoYawRef = useRef<number>(0);

  useFrame((state, delta) => {
    if (staticMode || !meshRef.current || !ring1Ref.current || !ring2Ref.current) return;

    const dt = Math.min(delta, 0.05);
    const damp = 1 - Math.exp(-5 * dt);

    // Continuous subtle rotation
    autoYawRef.current += dt * 0.25;
    ring1Ref.current.rotation.z -= dt * 0.3;
    ring2Ref.current.rotation.y += dt * 0.22;

    // Smooth cursor tracking (lerp toward pointer coordinates)
    const targetX = -(state.pointer.y * Math.PI) / 8;
    const targetY = autoYawRef.current + (state.pointer.x * Math.PI) / 6;

    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetX, damp);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetY, damp);
  });

  return (
    <Float
      speed={staticMode ? 0 : 2}
      rotationIntensity={staticMode ? 0 : 0.45}
      floatIntensity={staticMode ? 0 : 0.9}
    >
      <group ref={groupRef}>
        {/* Core Physical Glass Crystal */}
        <mesh ref={meshRef} castShadow receiveShadow>
          <icosahedronGeometry args={[1.4, 0]} />
          <meshPhysicalMaterial
            color="#0066FF"
            transmission={0.9}
            opacity={1}
            transparent={true}
            roughness={0.12}
            ior={1.5}
            thickness={0.6}
            reflectivity={0.9}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>

        {/* Precision Geodesic Lattice Overlay */}
        {wireframeOverlay && (
          <mesh scale={1.06}>
            <icosahedronGeometry args={[1.4, 1]} />
            <meshBasicMaterial color="#00C2FF" wireframe transparent opacity={0.22} />
          </mesh>
        )}

        {/* Primary Tech Orbital Ring */}
        <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[2.1, 0.022, 16, 100]} />
          <meshBasicMaterial color="#00C2FF" wireframe />
        </mesh>

        {/* Secondary Cross Orbital Lattice */}
        <mesh ref={ring2Ref} rotation={[-Math.PI / 4, Math.PI / 5, 0]}>
          <torusGeometry args={[2.35, 0.015, 14, 96]} />
          <meshStandardMaterial
            color="#0066FF"
            emissive="#0066FF"
            emissiveIntensity={0.8}
            metalness={0.7}
            roughness={0.25}
          />
        </mesh>
      </group>
    </Float>
  );
};

function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export const HeroSpatialScene: React.FC<HeroSpatialSceneProps> = ({
  expanded = false,
  onToggleExpand,
}) => {
  const [isReducedMotionOrMobile, setIsReducedMotionOrMobile] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [wireframeOverlay, setWireframeOverlay] = useState<boolean>(true);
  const [webglReady] = useState<boolean>(() => detectWebGLSupport());

  useEffect(() => {
    const updateGuards = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const mobile = window.innerWidth < 768;
      setIsReducedMotionOrMobile(reduced || mobile);
    };
    updateGuards();

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', updateGuards);
    window.addEventListener('resize', updateGuards, {passive: true});
    return () => {
      mq.removeEventListener('change', updateGuards);
      window.removeEventListener('resize', updateGuards);
    };
  }, []);

  const staticMode = isReducedMotionOrMobile || paused;

  const fallbackView = (
    <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-8 text-center text-white">
      <img
        src="/assets/xerotech-3d-cityscape.png"
        alt="Manama futuristic corporate tech city skyline"
        className="w-full max-w-md rounded-2xl border border-blue-400/30 object-cover shadow-2xl"
        referrerPolicy="no-referrer"
      />
      <p className="mt-4 font-mono text-xs uppercase tracking-wider text-blue-200">
        XeroTech Spatial Core · Bahrain CR 201130-1
      </p>
    </div>
  );

  return (
    <div
      className={
        expanded
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#0A192F]'
          : 'relative w-full h-full min-h-[380px] lg:min-h-[460px] bg-[#0A192F] overflow-hidden'
      }
    >
      {/* Subtle Manama Twilight Architectural Backdrop behind transparent WebGL canvas */}
      <img
        src="/assets/xerotech-3d-cityscape.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
        referrerPolicy="no-referrer"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A192F] via-[#0A192F]/55 to-[#0A192F]/80"
      />

      {!webglReady ? (
        fallbackView
      ) : (
        <SceneErrorBoundary fallback={fallbackView}>
          <div className="absolute inset-0 z-10">
            <Canvas
              camera={{position: [0, 0, 5], fov: 45}}
              dpr={[1, 2]}
              performance={{min: 0.5}}
              gl={{antialias: true, alpha: true}}
            >
              <ambientLight intensity={0.7} />
              <directionalLight position={[10, 10, 5]} intensity={1.5} color="#0066FF" />
              <pointLight position={[-10, -10, -5]} intensity={0.8} color="#00C2FF" />

              <Suspense fallback={null}>
                <CityscapeEnvironment />
              </Suspense>

              <ReflectivePolyhedron
                staticMode={staticMode}
                wireframeOverlay={wireframeOverlay}
              />
            </Canvas>
          </div>
        </SceneErrorBoundary>
      )}

      {/* Compact Control Bar (Solid rgba surface, zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-blue-400/25 px-2.5 py-1.5 shadow-lg"
          style={{backgroundColor: 'rgba(10, 25, 47, 0.88)'}}
        >
          <button
            type="button"
            onClick={() => setPaused((prev) => !prev)}
            aria-label={paused ? 'Resume crystal motion' : 'Pause crystal motion'}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            {staticMode ? <Play className="w-3.5 h-3.5 text-[#00C2FF]" /> : <Pause className="w-3.5 h-3.5 text-[#00C2FF]" />}
            <span>{staticMode ? 'Static' : 'Live 60fps'}</span>
          </button>

          <span className="h-4 w-px bg-white/15" />

          <button
            type="button"
            onClick={() => setWireframeOverlay((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              wireframeOverlay ? 'bg-[#0066FF] text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lattice</span>
          </button>
        </div>

        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? 'Exit fullscreen 3D view' : 'Expand fullscreen 3D view'}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-blue-400/30 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#0066FF] transition-colors cursor-pointer"
            style={{backgroundColor: 'rgba(10, 25, 47, 0.88)'}}
          >
            {expanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit 3D</span>
              </>
            ) : (
              <>
                <Expand className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
