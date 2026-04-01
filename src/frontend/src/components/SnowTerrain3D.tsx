import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { motion } from "motion/react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/** Repo snow JPGs under /assets are often missing or UTF-8–corrupted; use procedural snow instead. */
function makeSnowCanvasTexture(seed: number): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D context unavailable for snow texture");
  }
  const img = ctx.createImageData(w, h);
  const data = img.data;
  let rng = seed;
  const next = () => {
    rng = (rng * 1103515245 + 12345) >>> 0;
    return rng / 4294967296;
  };
  for (let i = 0; i < data.length; i += 4) {
    const n = 175 + next() * 80;
    const v = n + (next() - 0.5) * 35;
    const c = Math.max(120, Math.min(255, v));
    data[i] = c;
    data[i + 1] = c + (next() - 0.5) * 12;
    data[i + 2] = c + 8 + (next() - 0.5) * 10;
    data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const SNOW_TEXTURE_SEEDS = [201, 577, 911, 1201] as const;

/**
 * Phones + tablets (Tailwind `lg` and below): disable drag-orbit so vertical scroll wins.
 * Wide screens with mouse: keep manual orbit. Coarse pointer alone can include large touch
 * laptops — we only use max-width to avoid disabling orbit on small desktop windows.
 */
function useHeroScrollFriendlyLayout(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

const STATS: [string, string][] = [
  ["50+", "Treks"],
  ["10K+", "Trekkers"],
  ["4.9★", "Rating"],
];

function SnowTerrain({ texture }: { texture: THREE.CanvasTexture }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[40, 40, 200, 200]} />
      <meshStandardMaterial
        map={texture}
        aoMap={texture}
        displacementMap={texture}
        displacementScale={1.2}
        color="#f4f8ff"
        roughness={0.92}
        metalness={0.0}
      />
    </mesh>
  );
}

function SnowParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, velocities] = useMemo(() => {
    const count = 800;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 15 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      vel[i] = 0.008 + Math.random() * 0.012;
    }
    return [pos, vel];
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArr = (
      pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    ).array as Float32Array;
    for (let i = 0; i < posArr.length / 3; i++) {
      posArr[i * 3 + 1] -= velocities[i];
      if (posArr[i * 3 + 1] < -3) {
        posArr[i * 3 + 1] = 13;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.06}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

function CameraSetup() {
  const { camera } = useThree();
  useMemo(() => {
    camera.position.set(0, 8, 18);
  }, [camera]);
  return null;
}

function SceneContent({
  texture,
  enableManualRotate,
}: {
  texture: THREE.CanvasTexture;
  enableManualRotate: boolean;
}) {
  return (
    <>
      <CameraSetup />
      <fog attach="fog" args={["#050a18", 20, 80]} />
      <ambientLight intensity={0.3} color="#b0c8ff" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={2.0}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[0, 5, 0]} intensity={1.5} color="#4488ff" />

      <Suspense fallback={null}>
        <SnowTerrain texture={texture} />
      </Suspense>

      <SnowParticles />

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.3}
        enableZoom={false}
        enablePan={false}
        enableRotate={enableManualRotate}
        maxPolarAngle={Math.PI / 2.5}
      />
    </>
  );
}

interface SnowTerrain3DProps {
  openBooking: (dest?: string) => void;
  scrollToSection: (id: string) => void;
}

export default function SnowTerrain3D({
  openBooking,
  scrollToSection,
}: SnowTerrain3DProps) {
  const [activeTexture, setActiveTexture] = useState(0);
  const heroScrollFriendly = useHeroScrollFriendlyLayout();

  const snowTextures = useMemo(() => {
    return SNOW_TEXTURE_SEEDS.map((s) => makeSnowCanvasTexture(s));
  }, []);

  useEffect(() => {
    return () => {
      for (const t of snowTextures) {
        t.dispose();
      }
    };
  }, [snowTextures]);

  const activeSnow = snowTextures[activeTexture] ?? snowTextures[0];

  return (
    <section
      id="hero"
      className="relative overflow-hidden"
      style={{
        height: "100vh",
        minHeight: "500px",
        background: "#050a18",
      }}
    >
      {/* 3D Canvas — ≤1024px: pan-y + no drag-orbit so the page scrolls; autoRotate still runs */}
      <div
        className="absolute inset-0"
        style={heroScrollFriendly ? { touchAction: "pan-y" } : undefined}
      >
        <Canvas
          camera={{ position: [0, 8, 18], fov: 55 }}
          style={{ background: "#050a18" }}
          gl={{ antialias: true }}
        >
          <SceneContent
            texture={activeSnow}
            enableManualRotate={!heroScrollFriendly}
          />
        </Canvas>
      </div>

      {/* Dark gradient overlay at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10"
        style={{
          height: "50%",
          background:
            "linear-gradient(to top, #050a18 0%, #050a18aa 40%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Top navbar gradient */}
      <div
        className="absolute top-0 left-0 right-0 z-10"
        style={{
          height: "120px",
          background:
            "linear-gradient(to bottom, #050a18cc 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Text overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="space-y-6 max-w-4xl"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold pointer-events-auto"
            style={{
              background: "oklch(0.85 0.13 192 / 0.12)",
              border: "1px solid oklch(0.85 0.13 192 / 0.35)",
              color: "oklch(0.85 0.13 192)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "oklch(0.85 0.13 192)" }}
            />
            🏔 Premium Himalayan Expeditions
          </div>

          <h1
            className="font-display font-extrabold leading-[0.9] text-white"
            style={{
              fontSize: "clamp(48px, 7vw, 96px)",
              textShadow: "0 2px 40px rgba(0,0,0,0.8)",
            }}
          >
            EXPLORE THE
            <br />
            <span
              style={{
                color: "oklch(0.85 0.13 192)",
                textShadow: "0 0 40px oklch(0.85 0.13 192 / 0.6)",
              }}
            >
              HIMALAYAS
            </span>
          </h1>

          <p
            className="text-white/70 leading-relaxed max-w-xl mx-auto"
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              textShadow: "0 1px 10px rgba(0,0,0,0.9)",
            }}
          >
            Premium Trekking Expeditions
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-2 pointer-events-auto">
            <button
              type="button"
              data-ocid="hero.primary_button"
              onClick={() => openBooking("Friendship Peak")}
              className="rounded-full font-bold tracking-wider text-base px-8 py-3 transition-all hover:scale-105"
              style={{
                background: "oklch(0.85 0.13 192)",
                color: "oklch(0.13 0.04 195)",
                boxShadow:
                  "0 0 30px oklch(0.85 0.13 192 / 0.5), 0 0 80px oklch(0.85 0.13 192 / 0.2)",
                border: "none",
              }}
            >
              Start Your Journey
            </button>
            <button
              type="button"
              data-ocid="hero.secondary_button"
              onClick={() => scrollToSection("treks")}
              className="rounded-full text-base px-8 py-3 transition-all hover:scale-105"
              style={{
                borderColor: "oklch(0.85 0.13 192 / 0.6)",
                color: "oklch(0.85 0.13 192)",
                background: "transparent",
                border: "1px solid oklch(0.85 0.13 192 / 0.6)",
              }}
            >
              Explore Treks
            </button>
          </div>

          <div className="flex items-center gap-8 justify-center pt-4">
            {STATS.map(([val, label], i) => (
              <div key={label} className="flex items-center gap-8">
                {i > 0 && (
                  <div
                    className="w-px h-8"
                    style={{ background: "oklch(0.31 0.03 230)" }}
                  />
                )}
                <div className="text-center">
                  <div
                    className="font-display font-bold text-xl"
                    style={{ color: "oklch(0.85 0.13 192)" }}
                  >
                    {val}
                  </div>
                  <div className="text-xs text-white/50">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Texture Switcher */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3"
        style={{ pointerEvents: "auto" }}
      >
        <span className="text-white/40 text-xs font-medium tracking-widest uppercase mr-1">
          Surface
        </span>
        {SNOW_TEXTURE_SEEDS.map((seed, i) => (
          <button
            key={seed}
            type="button"
            data-ocid={`hero.toggle.${i + 1}`}
            onClick={() => setActiveTexture(i)}
            className="relative overflow-hidden rounded-lg transition-all hover:scale-110"
            style={{
              width: "44px",
              height: "44px",
              border:
                activeTexture === i
                  ? "2px solid oklch(0.85 0.13 192)"
                  : "2px solid rgba(255,255,255,0.2)",
              boxShadow:
                activeTexture === i
                  ? "0 0 12px oklch(0.85 0.13 192 / 0.6)"
                  : "none",
              background: "#0a0f1e",
            }}
            title={`Snow surface ${i + 1}`}
          >
            <span
              className="block w-full h-full"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.95 0.02 240), oklch(0.82 0.04 230))",
                opacity: 0.85,
              }}
              aria-hidden
            />
            {activeTexture === i && (
              <div
                className="absolute inset-0 rounded-md"
                style={{ background: "oklch(0.85 0.13 192 / 0.15)" }}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
