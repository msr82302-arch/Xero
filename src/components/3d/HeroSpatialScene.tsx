import {OrbitControls} from '@react-three/drei';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {Expand, Layers, Minimize2, Pause, Play} from 'lucide-react';
import React, {Component, type ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

if (typeof window !== 'undefined') {
  THREE.setConsoleFunction((type, message, ...params) => {
    // @react-three/fiber initializes an internal THREE.Clock instance inside createStore;
    // suppress only that internal deprecation warning while our loop uses THREE.Timer.
    if (
      type === 'warn' &&
      typeof message === 'string' &&
      message.includes('Clock: This module has been deprecated')
    ) {
      return;
    }
    const fn = console[type] ?? console.log;
    fn(message, ...params);
  });
}

interface HeroSpatialSceneProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
  compact?: boolean;
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

const LOGO_TEXTURE_URL = '/assets/aistudio/logo_e1b61aee.png';
const DAYTIME_SKYLINE_URL = '/assets/aistudio/image_b88cc20d__1__ba093757.jpg';
// Source PNG is 409 x 469 RGBA
const LOGO_ASPECT = 409 / 469;

function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function detectSoftwareWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createShieldPath(scale: number): THREE.Path {
  const s = scale;
  const path = new THREE.Path();
  path.moveTo(-0.92 * s, 0.74 * s);
  path.quadraticCurveTo(0, 0.94 * s, 0.92 * s, 0.74 * s);
  path.lineTo(0.86 * s, -0.06 * s);
  path.bezierCurveTo(0.82 * s, -0.6 * s, 0.44 * s, -1.02 * s, 0, -1.22 * s);
  path.bezierCurveTo(-0.44 * s, -1.02 * s, -0.82 * s, -0.6 * s, -0.86 * s, -0.06 * s);
  path.closePath();
  return path;
}

function createShieldShape(scale: number): THREE.Shape {
  const s = scale;
  const shape = new THREE.Shape();
  shape.moveTo(-0.92 * s, 0.74 * s);
  shape.quadraticCurveTo(0, 0.94 * s, 0.92 * s, 0.74 * s);
  shape.lineTo(0.86 * s, -0.06 * s);
  shape.bezierCurveTo(0.82 * s, -0.6 * s, 0.44 * s, -1.02 * s, 0, -1.22 * s);
  shape.bezierCurveTo(-0.44 * s, -1.02 * s, -0.82 * s, -0.6 * s, -0.86 * s, -0.06 * s);
  shape.closePath();
  return shape;
}

function buildReliefBumpTexture(image: CanvasImageSource, width: number, height: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const targetW = Math.min(width || 512, 512);
  const targetH = Math.min(height || 588, 588);
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(image, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const heightVal = Math.round(Math.min(255, Math.max(0, a * (145 + lum * 110))));
      data[i] = heightVal;
      data[i + 1] = heightVal;
      data[i + 2] = heightVal;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const bump = new THREE.CanvasTexture(canvas);
  bump.needsUpdate = true;
  return bump;
}

const StudioEnvironment: React.FC = () => {
  const {gl, scene} = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const renderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = renderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    return () => {
      if (scene.environment === renderTarget.texture) {
        scene.environment = null;
      }
      renderTarget.dispose();
    };
  }, [gl, scene]);

  return null;
};

interface ShieldEmblemProps {
  staticMode: boolean;
  wireframeOverlay: boolean;
  isDraggingRef: React.MutableRefObject<boolean>;
}

const XeroTechShieldEmblem: React.FC<ShieldEmblemProps> = ({
  staticMode,
  wireframeOverlay,
  isDraggingRef,
}) => {
  const {gl} = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const autoYawRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const timerRef = useRef<THREE.Timer | null>(null);

  useEffect(() => {
    const timer = new THREE.Timer();
    if (typeof document !== 'undefined') {
      timer.connect(document);
    }
    timerRef.current = timer;
    return () => {
      timer.dispose();
      timerRef.current = null;
    };
  }, []);

  const [colorTexture, setColorTexture] = useState<THREE.Texture | null>(null);
  const [bumpTexture, setBumpTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let active = true;
    let loadedColor: THREE.Texture | null = null;
    let loadedBump: THREE.CanvasTexture | null = null;

    const loader = new THREE.TextureLoader();
    loader.load(
      LOGO_TEXTURE_URL,
      (texture) => {
        if (!active) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8);
        texture.needsUpdate = true;
        loadedColor = texture;
        setColorTexture(texture);

        const img = texture.image as HTMLImageElement | undefined;
        if (img && img.width && img.height) {
          loadedBump = buildReliefBumpTexture(img, img.width, img.height);
          setBumpTexture(loadedBump);
        }
      },
      undefined,
      () => {
        // Fallback: geometric 3D shield stays intact if image fails
      },
    );

    return () => {
      active = false;
      loadedColor?.dispose();
      loadedBump?.dispose();
    };
  }, [gl]);

  const geometries = useMemo(() => {
    // Inner solid metallic pearl shield core
    const coreShape = createShieldShape(0.98);
    const coreDepth = 0.16;
    const coreGeo = new THREE.ExtrudeGeometry(coreShape, {
      depth: coreDepth,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 36,
    });
    coreGeo.translate(0, 0, -coreDepth / 2);

    // Outer beveled royal-blue / anodized titanium shield bezel ring
    const rimShape = createShieldShape(1.07);
    rimShape.holes.push(createShieldPath(0.94));
    const rimDepth = 0.22;
    const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
      depth: rimDepth,
      bevelEnabled: true,
      bevelThickness: 0.032,
      bevelSize: 0.025,
      bevelSegments: 4,
      curveSegments: 36,
    });
    rimGeo.translate(0, 0, -rimDepth / 2);

    // Precision wireframe / glow cage for the "Lattice" toggle
    const latticeShape = createShieldShape(1.13);
    const latticeDepth = 0.26;
    const latticeGeo = new THREE.ExtrudeGeometry(latticeShape, {
      depth: latticeDepth,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 20,
    });
    latticeGeo.translate(0, 0, -latticeDepth / 2);
    const edgesGeo = new THREE.EdgesGeometry(rimGeo, 24);

    // Front and back emblem face planes matched to 409x469 aspect ratio
    const planeHeight = 2.62;
    const planeWidth = planeHeight * LOGO_ASPECT;
    const planeGeo = new THREE.PlaneGeometry(planeWidth, planeHeight);

    return {coreGeo, rimGeo, latticeGeo, edgesGeo, planeGeo};
  }, []);

  useEffect(() => {
    return () => {
      geometries.coreGeo.dispose();
      geometries.rimGeo.dispose();
      geometries.latticeGeo.dispose();
      geometries.edgesGeo.dispose();
      geometries.planeGeo.dispose();
    };
  }, [geometries]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const timer = timerRef.current;
    let rawDelta = 0.016;
    if (timer) {
      timer.update();
      rawDelta = timer.getDelta();
    }
    const dt = Math.min(Math.max(rawDelta, 0), 0.05);

    if (staticMode) {
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, 0.14, 6, dt);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, 0, 6, dt);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, 0, 6, dt);
      return;
    }

    if (isDraggingRef.current) {
      return;
    }

    elapsedRef.current += dt;
    autoYawRef.current += dt * 0.28;

    const floatY = 0.14 + Math.sin(elapsedRef.current * 1.55) * 0.07;
    const targetX = -(state.pointer.y * Math.PI) / 11;
    const targetY = autoYawRef.current + (state.pointer.x * Math.PI) / 8;

    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, floatY, 5, dt);
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetX, 5, dt);
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetY, 5, dt);
  });

  return (
    <group ref={groupRef} position={[0, 0.14, 0]}>
      {/* Sculpted Beveled Cool-Slate Metallic Shield Core */}
      <mesh geometry={geometries.coreGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#dbe5f1"
          metalness={0.42}
          roughness={0.22}
          clearcoat={0.88}
          clearcoatRoughness={0.12}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Extruded Deep Cobalt-Slate Metallic Shield Rim */}
      <mesh geometry={geometries.rimGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#0048b8"
          metalness={0.88}
          roughness={0.18}
          clearcoat={0.96}
          clearcoatRoughness={0.08}
          envMapIntensity={1.45}
        />
      </mesh>

      {/* Sculpted Upper Blueprint Scroll Cylinder Crest */}
      <mesh position={[-0.14, 0.99, 0]} rotation={[0, 0, Math.PI / 2 - 0.05]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.92, 24]} />
        <meshPhysicalMaterial
          color="#94a3b8"
          metalness={0.82}
          roughness={0.2}
          clearcoat={0.85}
          clearcoatRoughness={0.12}
        />
      </mesh>

      {/* Machined Circuit Node Accent Pins on Left & Right Bevels */}
      <mesh position={[-0.98, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 0.12, 16]} />
        <meshStandardMaterial color="#0284c7" emissive="#0052cc" emissiveIntensity={0.55} metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh position={[0.98, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 0.12, 16]} />
        <meshStandardMaterial color="#0284c7" emissive="#0052cc" emissiveIntensity={0.55} metalness={0.85} roughness={0.18} />
      </mesh>

      {/* Front XeroTech ("XT") Shield Artwork with Embossed Relief */}
      {colorTexture && (
        <mesh geometry={geometries.planeGeo} position={[0, 0.05, 0.114]}>
          <meshPhysicalMaterial
            map={colorTexture}
            bumpMap={bumpTexture ?? undefined}
            bumpScale={0.028}
            transparent={true}
            alphaTest={0.06}
            roughness={0.28}
            metalness={0.34}
            clearcoat={0.75}
            clearcoatRoughness={0.14}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}

      {/* Back XeroTech ("XT") Shield Artwork (360-degree Orbit Fidelity) */}
      {colorTexture && (
        <mesh geometry={geometries.planeGeo} position={[0, 0.05, -0.114]} rotation={[0, Math.PI, 0]}>
          <meshPhysicalMaterial
            map={colorTexture}
            bumpMap={bumpTexture ?? undefined}
            bumpScale={0.028}
            transparent={true}
            alphaTest={0.06}
            roughness={0.28}
            metalness={0.34}
            clearcoat={0.75}
            clearcoatRoughness={0.14}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}

      {/* Wireframe / Edge-Glow Lattice Mode */}
      {wireframeOverlay && (
        <group>
          <mesh geometry={geometries.latticeGeo}>
            <meshBasicMaterial color="#0066FF" wireframe transparent opacity={0.18} />
          </mesh>
          <lineSegments geometry={geometries.edgesGeo} scale={1.015}>
            <lineBasicMaterial color="#0ea5e9" transparent opacity={0.65} />
          </lineSegments>
        </group>
      )}
    </group>
  );
};

export const HeroSpatialScene: React.FC<HeroSpatialSceneProps> = ({
  expanded = false,
  onToggleExpand,
  compact = false,
}) => {
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [wireframeOverlay, setWireframeOverlay] = useState<boolean>(true);
  const [webglReady] = useState<boolean>(() => detectWebGLSupport());
  const [isSoftwareGl] = useState<boolean>(() => detectSoftwareWebGL());
  const [contextLost, setContextLost] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const updateGuards = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const mobile = window.innerWidth < 768;
      setIsMobileViewport(mobile);
      setIsReducedMotion(reduced);
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

  useEffect(() => {
    const touchMode = isMobileViewport && !expanded ? 'pan-y' : 'none';
    const applyTouchAction = () => {
      if (canvasElRef.current) {
        canvasElRef.current.style.touchAction = touchMode;
      }
    };
    applyTouchAction();
    const rafId = window.requestAnimationFrame(applyTouchAction);
    return () => window.cancelAnimationFrame(rafId);
  }, [isMobileViewport, expanded]);

  const staticMode = isReducedMotion || paused;

  const isCompactInline = compact && !expanded;
  const isMobileCompact = isCompactInline && isMobileViewport;

  const fallbackView = (
    <div className={`relative z-10 flex h-full w-full flex-col items-center justify-center text-center ${isCompactInline ? 'p-4' : 'p-8'}`}>
      <img
        src={LOGO_TEXTURE_URL}
        alt="XeroTech Technologies Shield Emblem"
        className={isCompactInline ? 'w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-xl' : 'w-44 h-44 object-contain drop-shadow-xl'}
        referrerPolicy="no-referrer"
      />
      {!isCompactInline && (
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-[#0f172a]">
          XeroTech Spatial Core · Bahrain CR 201130-1
        </p>
      )}
    </div>
  );

  const sceneContent = (
    <div
      className={
        expanded
          ? 'fixed inset-0 z-50 w-screen h-screen overflow-hidden'
          : isCompactInline
            ? 'relative w-full h-full bg-transparent overflow-hidden touch-pan-y md:touch-auto'
            : 'relative w-full h-full min-h-[380px] lg:min-h-[460px] bg-transparent overflow-hidden'
      }
      style={
        expanded
          ? {
              backgroundImage: `url('${DAYTIME_SKYLINE_URL}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : isMobileViewport
            ? {touchAction: 'pan-y'}
            : undefined
      }
    >
      {/* Subtle bright sky atmospheric wash only when expanded to Fullscreen */}
      {expanded && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-white/15"
        />
      )}

      {!webglReady || contextLost ? (
        fallbackView
      ) : (
        <SceneErrorBoundary fallback={fallbackView}>
          <div
            className="absolute inset-0 z-10"
            style={{touchAction: isMobileViewport && !expanded ? 'pan-y' : 'none'}}
          >
            <Canvas
              style={{touchAction: isMobileViewport && !expanded ? 'pan-y' : 'none'}}
              camera={{position: [0, 0.08, isCompactInline ? 5.25 : 5.4], fov: 42}}
              dpr={isSoftwareGl ? 1 : [1, 2]}
              performance={{min: 0.5}}
              gl={{
                antialias: !isSoftwareGl,
                alpha: true,
                powerPreference: 'high-performance',
              }}
              onCreated={({gl}) => {
                gl.outputColorSpace = THREE.SRGBColorSpace;
                gl.toneMapping = THREE.ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.05;
                gl.setClearColor(0x000000, 0);

                const canvasEl = gl.domElement;
                canvasElRef.current = canvasEl;
                canvasEl.style.touchAction = isMobileViewport && !expanded ? 'pan-y' : 'none';
                window.requestAnimationFrame(() => {
                  if (canvasElRef.current) {
                    canvasElRef.current.style.touchAction =
                      window.innerWidth < 768 && !expanded ? 'pan-y' : 'none';
                  }
                });

                canvasEl.addEventListener('webglcontextlost', (e) => {
                  e.preventDefault();
                  setContextLost(true);
                });
                canvasEl.addEventListener('webglcontextrestored', () => {
                  setContextLost(false);
                });
              }}
            >
              {/* Three-Point Studio Lighting Rig for Crisp Daytime Emblem Highlights */}
              <hemisphereLight args={['#e0f2fe', '#64748b', 0.95]} />
              <directionalLight position={[5, 6, 6]} intensity={1.8} color="#fff9ef" />
              <directionalLight position={[-5, -2, -5]} intensity={1.1} color="#38bdf8" />
              <pointLight position={[0, 1.5, 4.5]} intensity={0.75} color="#ffffff" />

              <StudioEnvironment />

              <OrbitControls
                enablePan={false}
                enableZoom={expanded}
                minDistance={3.2}
                maxDistance={7.5}
                enableDamping={!isSoftwareGl}
                dampingFactor={0.06}
                rotateSpeed={0.85}
                onStart={() => {
                  isDraggingRef.current = true;
                }}
                onEnd={() => {
                  isDraggingRef.current = false;
                }}
              />

              <XeroTechShieldEmblem
                staticMode={staticMode}
                wireframeOverlay={wireframeOverlay}
                isDraggingRef={isDraggingRef}
              />
            </Canvas>
          </div>
        </SceneErrorBoundary>
      )}

      {/* Compact Control Bar (Solid rgba surface, zero backdrop-filter over WebGL) */}
      <div
        className={`absolute z-20 flex items-center justify-between pointer-events-none ${
          isMobileCompact
            ? 'bottom-1.5 left-1.5 right-1.5 gap-1'
            : isCompactInline
              ? 'bottom-2 left-2 right-2 gap-1'
              : 'bottom-3 left-3 right-3'
        }`}
      >
        <div
          className={`pointer-events-auto inline-flex items-center rounded-xl border border-slate-300/80 shadow-md ${
            isMobileCompact
              ? 'gap-0.5 px-1 py-0.5'
              : isCompactInline
                ? 'gap-1 px-1.5 py-1'
                : 'gap-1.5 px-2.5 py-1.5'
          }`}
          style={{backgroundColor: 'rgba(255, 255, 255, 0.92)'}}
        >
          <button
            type="button"
            onClick={() => setPaused((prev) => !prev)}
            aria-label={paused ? 'Resume emblem motion' : 'Pause emblem motion'}
            className={`inline-flex items-center rounded-lg font-semibold text-[#0f172a] hover:bg-slate-100 cursor-pointer whitespace-nowrap ${
              isMobileCompact
                ? 'gap-0.5 px-1 py-0.5 text-[9px]'
                : isCompactInline
                  ? 'gap-1 px-1.5 py-0.5 text-[10px]'
                  : 'gap-1.5 px-2 py-1 text-[11px]'
            }`}
          >
            {staticMode ? (
              <Play className={isCompactInline ? 'w-3 h-3 text-[#0066FF]' : 'w-3.5 h-3.5 text-[#0066FF]'} />
            ) : (
              <Pause className={isCompactInline ? 'w-3 h-3 text-[#0066FF]' : 'w-3.5 h-3.5 text-[#0066FF]'} />
            )}
            <span>{staticMode ? 'Static' : isMobileCompact ? 'Live' : 'Live 60fps'}</span>
          </button>

          <span className="h-3.5 w-px bg-slate-300" />

          <button
            type="button"
            onClick={() => setWireframeOverlay((prev) => !prev)}
            aria-label={wireframeOverlay ? 'Hide lattice overlay' : 'Show lattice overlay'}
            title={wireframeOverlay ? 'Hide Lattice' : 'Show Lattice'}
            className={`inline-flex items-center rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              isMobileCompact
                ? 'p-1 text-[9px]'
                : isCompactInline
                  ? 'gap-1 px-1.5 py-0.5 text-[10px]'
                  : 'gap-1.5 px-2 py-1 text-[11px]'
            } ${
              wireframeOverlay
                ? 'bg-[#0066FF] text-white'
                : 'text-[#334155] hover:bg-slate-100'
            }`}
          >
            <Layers className={isCompactInline ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            {!isMobileCompact && <span>Lattice</span>}
          </button>
        </div>

        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? 'Exit fullscreen 3D view' : 'Expand fullscreen 3D view'}
            title={expanded ? 'Exit 3D' : 'Fullscreen 3D'}
            className={`pointer-events-auto inline-flex items-center rounded-xl border border-slate-300/80 font-semibold text-[#0f172a] hover:bg-[#0066FF] hover:text-white hover:border-[#0066FF] shadow-md transition-colors cursor-pointer whitespace-nowrap ${
              isMobileCompact
                ? 'p-1.5 text-[9px]'
                : isCompactInline
                  ? 'px-2 py-1.5 text-[10px]'
                  : 'gap-1.5 px-3 py-1.5 text-[11px]'
            }`}
            style={{backgroundColor: 'rgba(255, 255, 255, 0.92)'}}
          >
            {expanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit 3D</span>
              </>
            ) : (
              <>
                <Expand className={isCompactInline ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                {!isCompactInline && <span>Fullscreen</span>}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  if (expanded && typeof document !== 'undefined') {
    return createPortal(sceneContent, document.body);
  }

  return sceneContent;
};
