import { useMemo } from "react";

export default function FloatingParticles({ count = 12 }: { count?: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${(i * 37 + 11) % 100}%`,
      top: `${(i * 53 + 7) % 100}%`,
      size: 1 + (i % 2),
      delay: `${(i * 0.6) % 10}s`,
      duration: `${10 + (i % 8)}s`,
      opacity: 0.15 + (i % 3) * 0.07,
    }));
  }, [count]);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `rgba(6,182,212,${p.opacity})`,
            animation: `particleDrift ${p.duration} ${p.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
