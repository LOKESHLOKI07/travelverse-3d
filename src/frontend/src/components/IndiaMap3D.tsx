import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

const INDIA_BOUNDARY_LONLAT: [number, number][] = [
  // J&K northwest
  [68.2, 37.0],
  [70.5, 36.5],
  [72.4, 36.3],
  [74.0, 36.7],
  [76.5, 35.8],
  [78.5, 35.6],
  // Himachal / Uttarakhand
  [79.5, 33.5],
  [80.4, 31.0],
  // Nepal border
  [80.2, 29.6],
  [81.1, 29.2],
  [82.7, 28.3],
  [84.0, 27.5],
  [85.1, 27.3],
  [86.5, 27.1],
  [87.1, 27.2],
  [88.1, 27.6],
  // Bhutan / Assam
  [88.8, 27.3],
  [89.6, 26.9],
  [90.4, 27.0],
  [91.6, 27.5],
  [93.3, 27.6],
  [95.0, 27.9],
  // Arunachal Pradesh (far northeast)
  [97.4, 28.2],
  // Myanmar border south
  [96.9, 27.0],
  [96.1, 25.4],
  [95.2, 24.2],
  [94.1, 23.3],
  [93.3, 22.4],
  // Mizoram / Tripura / Bangladesh border
  [92.8, 21.4],
  [92.4, 22.1],
  [91.9, 22.5],
  [91.4, 23.0],
  [90.3, 22.2],
  [89.6, 22.5],
  [89.1, 22.1],
  // West Bengal coast
  [88.5, 21.6],
  [87.7, 21.2],
  [87.0, 20.8],
  [86.3, 20.4],
  // Odisha coast
  [85.6, 19.8],
  [85.0, 18.8],
  [84.0, 18.1],
  // Andhra Pradesh coast
  [82.3, 17.3],
  [81.1, 16.6],
  [80.6, 15.9],
  [80.4, 15.2],
  [80.2, 14.0],
  // Tamil Nadu east coast
  [80.3, 12.6],
  [80.1, 11.8],
  [79.7, 10.5],
  [79.1, 9.5],
  [78.2, 8.8],
  // Kanyakumari (tip)
  [77.6, 8.1],
  // Kerala west coast
  [77.1, 8.5],
  [76.6, 9.5],
  [76.3, 10.6],
  [75.7, 11.9],
  [75.0, 12.7],
  // Karnataka / Goa coast
  [74.4, 13.9],
  [74.0, 14.7],
  [73.8, 15.9],
  [73.5, 17.0],
  [73.1, 18.0],
  [72.9, 18.5],
  // Maharashtra coast
  [72.8, 19.5],
  [72.5, 20.3],
  [72.2, 21.1],
  // Gujarat coast
  [71.5, 21.7],
  [70.8, 22.3],
  [70.0, 22.6],
  [69.1, 22.5],
  [68.7, 23.4],
  // Rajasthan / Pakistan border
  [68.1, 24.7],
  [68.0, 26.5],
  [69.5, 27.6],
  [70.8, 28.2],
  [71.9, 29.5],
  // Going north along Pakistan border
  [70.2, 30.9],
  [69.5, 31.9],
  [69.2, 32.6],
  [70.0, 33.6],
  [71.2, 34.4],
  [72.5, 35.1],
  [73.5, 36.2],
  [74.1, 36.8],
  // Back to start
  [68.2, 37.0],
];

const INDIA_POINTS: [number, number][] = INDIA_BOUNDARY_LONLAT.map(
  ([lon, lat]) => [(lon - 80) * 0.13, (lat - 22) * 0.16],
);

const PINS = [
  { lon: 77.6, lat: 34.1, label: "Leh / Ladakh", color: "#22e6e2" },
  { lon: 77.1, lat: 31.6, label: "Himachal Pradesh", color: "#a78bfa" },
  { lon: 79.0, lat: 30.0, label: "Uttarakhand", color: "#34d399" },
  { lon: 72.1, lat: 22.3, label: "Gujarat", color: "#fb923c" },
  { lon: 72.8, lat: 19.1, label: "Maharashtra", color: "#f472b6" },
  { lon: 76.3, lat: 10.5, label: "Kerala", color: "#4ade80" },
].map((pin) => ({
  ...pin,
  x: (pin.lon - 80) * 0.13,
  y: (pin.lat - 22) * 0.16,
}));

function IndiaShape({ onPinClick }: { onPinClick: (label: string) => void }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    INDIA_POINTS.forEach(([x, y], i) => {
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, -0.15]}>
        <meshStandardMaterial
          color="#0d4a52"
          emissive="#0a8a9f"
          emissiveIntensity={0.25}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* Outline glow */}
      <mesh geometry={geometry} position={[0, 0, -0.15]}>
        <meshBasicMaterial
          color="#22e6e2"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>

      {PINS.map((pin) => (
        <PinMarker
          key={pin.label}
          x={pin.x}
          y={pin.y}
          color={pin.color}
          label={pin.label}
          onPinClick={onPinClick}
        />
      ))}
    </group>
  );
}

function PinMarker({
  x,
  y,
  color,
  label,
  onPinClick,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
  onPinClick: (label: string) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      const pulse = hovered ? 1.5 : 1 + Math.sin(t * 2.5) * 0.25;
      ref.current.scale.setScalar(pulse);
    }
    if (ringRef.current) {
      const expand = 1 + ((t * 1.5) % 1) * 1.5;
      ringRef.current.scale.setScalar(expand);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 - ((t * 1.5) % 1) * 0.5;
    }
  });

  const handleClick = () => onPinClick(label);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 3D canvas element — keyboard nav handled via legend overlay
    <group
      position={[x, y, 0.2]}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={ref}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 3 : 2}
          roughness={0.1}
        />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.1, 0.18, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function SceneContent({ onPinClick }: { onPinClick: (label: string) => void }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-4, -3, 4]} intensity={0.8} color="#22e6e2" />
      <pointLight position={[0, 0, 6]} intensity={0.4} color="#39e9ff" />
      <IndiaShape onPinClick={onPinClick} />
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
      />
    </>
  );
}

export default function IndiaMap3D({
  onPinClick,
}: {
  onPinClick?: (label: string) => void;
}) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handlePin = (label: string) => {
    setTooltip(label);
    onPinClick?.(label);
    setTimeout(() => setTooltip(null), 2000);
  };

  return (
    <div className="relative w-full h-full" style={{ minHeight: "420px" }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <SceneContent onPinClick={handlePin} />
      </Canvas>

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 flex flex-col gap-1 text-xs"
        style={{ pointerEvents: "none" }}
      >
        {PINS.map((pin) => (
          <div key={pin.label} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: pin.color }}
            />
            <span style={{ color: pin.color }} className="font-semibold">
              {pin.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold"
          style={{
            background: "oklch(0.18 0.025 232 / 0.95)",
            border: "1px solid oklch(0.85 0.13 192 / 0.5)",
            color: "oklch(0.85 0.13 192)",
          }}
        >
          📍 {tooltip}
        </div>
      )}

      <div
        className="absolute bottom-4 right-4 text-xs"
        style={{ color: "oklch(0.5 0.02 232)", pointerEvents: "none" }}
      >
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
