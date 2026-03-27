import { Line, OrbitControls, Sphere } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const DEST_DATA = [
  { lat: 36.4, lng: 25.4, name: "Santorini" },
  { lat: 35.0, lng: 135.7, name: "Kyoto" },
  { lat: -13.16, lng: -72.54, name: "MachuPicchu" },
  { lat: 3.2, lng: 73.2, name: "Maldives" },
];

const ARC_PAIRS: [number, number][] = [
  [0, 1],
  [0, 3],
  [1, 2],
  [2, 3],
  [1, 3],
];

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function buildArcPoints(
  from: THREE.Vector3,
  to: THREE.Vector3,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const p = new THREE.Vector3().lerpVectors(from, to, t);
    p.normalize().multiplyScalar(1.12 + Math.sin(Math.PI * t) * 0.25);
    pts.push(p);
  }
  return pts;
}

function Pin({ position }: { position: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.scale.setScalar(
        1 + Math.sin(clock.getElapsedTime() * 2) * 0.15,
      );
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.028, 8, 8]} />
      <meshStandardMaterial
        color="#F2A45D"
        emissive="#F2A45D"
        emissiveIntensity={1.5}
        roughness={0.2}
      />
    </mesh>
  );
}

function GlobeScene() {
  const globeRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.003;
    }
  });

  const pinPositions = useMemo(
    () => DEST_DATA.map((d) => latLngToVec3(d.lat, d.lng, 1.02)),
    [],
  );

  const arcPoints = useMemo(
    () =>
      ARC_PAIRS.map(([a, b]) =>
        buildArcPoints(pinPositions[a], pinPositions[b]),
      ),
    [pinPositions],
  );

  return (
    <group ref={globeRef}>
      <Sphere args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#0E2A3D"
          roughness={0.7}
          metalness={0.15}
          emissive="#061A2A"
          emissiveIntensity={0.3}
        />
      </Sphere>

      <mesh>
        <sphereGeometry args={[1.005, 32, 32]} />
        <meshBasicMaterial
          color="#1A4060"
          wireframe
          transparent
          opacity={0.18}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.12, 32, 32]} />
        <meshBasicMaterial
          color="#22E6E2"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </mesh>

      {arcPoints.map((pts, i) => (
        <Line
          key={`arc-${ARC_PAIRS[i][0]}-${ARC_PAIRS[i][1]}`}
          points={pts}
          color="#22E6E2"
          transparent
          opacity={0.6}
          lineWidth={1}
        />
      ))}

      {DEST_DATA.map((dest, i) => (
        <Pin key={dest.name} position={pinPositions[i]} />
      ))}
    </group>
  );
}

export default function Globe3D() {
  return (
    <div className="w-full h-full" style={{ minHeight: "420px" }}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 50 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-5, -3, -3]} intensity={0.4} color="#22E6E2" />
        <pointLight position={[0, 5, 0]} intensity={0.3} color="#39E9FF" />
        <GlobeScene />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
        />
      </Canvas>
    </div>
  );
}
