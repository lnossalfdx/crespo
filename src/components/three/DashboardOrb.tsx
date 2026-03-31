import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/* ── Geodesic wireframe core ─────────────────────────────────────────────── */
function GeodesicCore() {
  const ref = useRef<THREE.Group>(null);

  const edgesGeo = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(1.05, 2);
    return new THREE.EdgesGeometry(ico, 5);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.y =  t * 0.18;
      ref.current.rotation.x = Math.sin(t * 0.22) * 0.25;
      ref.current.rotation.z =  t * 0.06;
      // Breathing scale
      const s = 1 + Math.sin(t * 1.1) * 0.028;
      ref.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={ref}>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

/* ── Particle cloud around the sphere ───────────────────────────────────── */
function Particles({ count = 220 }) {
  const ref = useRef<THREE.Points>(null);

  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribute on two radii: tight cluster + loose halo
      const rSeed = pseudoRandom(i + 1);
      const phiSeed = pseudoRandom(i + 101);
      const thetaSeed = pseudoRandom(i + 1001);
      const r = i < count * 0.6 ? 1.18 + rSeed * 0.08 : 1.4 + rSeed * 0.35;
      const phi = Math.acos(2 * phiSeed - 1);
      const theta = 2 * Math.PI * thetaSeed;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.y = -t * 0.09;
      ref.current.rotation.x =  t * 0.05;
    }
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color="#FFFFFF"
        size={0.018}
        sizeAttenuation
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Single orbital ring with satellite dot ─────────────────────────────── */
interface RingProps {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  opacity: number;
  dotSize?: number;
}

function OrbitalRing({ radius, tilt, speed, opacity, dotSize = 0.028 }: RingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dotRef   = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (groupRef.current) groupRef.current.rotation.z = t * speed;
    if (dotRef.current) {
      // Subtle pulse on satellite
      const s = 1 + Math.sin(t * 3.2 + radius) * 0.3;
      dotRef.current.scale.setScalar(s);
    }
  });

  return (
    <group rotation={tilt}>
      <group ref={groupRef}>
        {/* Ring */}
        <mesh>
          <torusGeometry args={[radius, 0.004, 3, 90]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {/* Satellite dot */}
        <mesh ref={dotRef} position={[radius, 0, 0]}>
          <sphereGeometry args={[dotSize, 8, 8]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/* ── Scene ──────────────────────────────────────────────────────────────── */
function OrbScene() {
  return (
    <>
      {/* Geo core */}
      <GeodesicCore />

      {/* Particle halo */}
      <Particles count={200} />

      {/* Orbital rings — different tilts and speeds */}
      <OrbitalRing radius={1.52} tilt={[0, 0, 0]}                          speed={0.35}  opacity={0.30} />
      <OrbitalRing radius={1.62} tilt={[Math.PI / 3, 0, 0]}                speed={-0.22} opacity={0.22} dotSize={0.022} />
      <OrbitalRing radius={1.45} tilt={[Math.PI / 6, Math.PI / 4, 0]}      speed={0.18}  opacity={0.15} dotSize={0.018} />
      <OrbitalRing radius={1.70} tilt={[-Math.PI / 2.5, 0, Math.PI / 5]}   speed={-0.14} opacity={0.12} dotSize={0.015} />
    </>
  );
}

/* ── Export ─────────────────────────────────────────────────────────────── */
export const DashboardOrb: React.FC = () => (
  <div style={{ width: 300, height: 300 }}>
    <Canvas
      camera={{ position: [0, 0, 3.8], fov: 46 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <OrbScene />
    </Canvas>
  </div>
);
