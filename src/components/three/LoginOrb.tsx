import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Neon glow:                                                                  *
 *  • NDC pointer mapped directly to logo local-space (no raycasting)           *
 *  • Color buffer rebuilt every frame — Dynamic usage for fast GPU upload      *
 *  • base (0.30) + glow(dist) + ripple wave → neon white near cursor           *
 *  • Always-on spatial pulse makes the mesh "breathe"                          *
 * ─────────────────────────────────────────────────────────────────────────── */

function LoadingRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.elapsedTime * 1.8;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.5, 0.011, 6, 40, Math.PI * 1.5]} />
      <meshBasicMaterial color="#2A2A2A" />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
function LogoScene() {
  const { pointer } = useThree(); // NDC mouse coords auto-updated by R3F

  const groupRef  = useRef<THREE.Group>(null);
  const scanRef   = useRef<THREE.Mesh>(null);
  const ringRef   = useRef<THREE.Mesh>(null);
  const geoRef    = useRef<THREE.BufferGeometry | null>(null);
  const baseRef   = useRef<Float32Array | null>(null);
  const posRef    = useRef<Float32Array | null>(null);

  const [edgesGeo, setEdgesGeo] = useState<THREE.BufferGeometry | null>(null);

  /* ── Build displaced wireframe from logo pixels ─────────────────────────── */
  useEffect(() => {
    const img = new Image();

    img.onload = () => {
      const RES = 300;
      const cvs = document.createElement('canvas');
      cvs.width = cvs.height = RES;
      const ctx = cvs.getContext('2d')!;
      ctx.drawImage(img, 0, 0, RES, RES);
      const raw = ctx.getImageData(0, 0, RES, RES).data;

      const dark = (u: number, v: number): number => {
        const xi = Math.min(Math.floor(u * (RES - 1)), RES - 1);
        const yi = Math.min(Math.floor(v * (RES - 1)), RES - 1);
        const idx = (yi * RES + xi) * 4;
        const lum = raw[idx] * 0.299 + raw[idx + 1] * 0.587 + raw[idx + 2] * 0.114;
        return 1 - lum / 255;
      };

      const SEGS = 150;
      const SIZE = 4.6;
      const LIFT = 1.0;

      const plane = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
      const vp    = plane.attributes.position.array as Float32Array;

      for (let i = 0; i < vp.length; i += 3) {
        const u = vp[i]     / SIZE + 0.5;
        const v = 1 - (vp[i + 1] / SIZE + 0.5);
        vp[i + 2] = dark(u, v) * LIFT;
      }
      plane.attributes.position.needsUpdate = true;
      plane.computeVertexNormals();

      const edgeGeo = new THREE.EdgesGeometry(plane, 1);
      plane.dispose();

      const ep     = edgeGeo.attributes.position.array as Float32Array;
      const colors = new Float32Array(ep.length);
      const base   = new Float32Array(ep.length);

      /* Base brightness: 30% — leaves 70% headroom for neon boost */
      for (let i = 0; i < ep.length; i += 6) {
        const b = Math.pow(Math.min(Math.max(ep[i + 2], ep[i + 5]) / LIFT, 1), 1.8) * 0.30;
        colors[i]     = colors[i + 1] = colors[i + 2] = b;
        colors[i + 3] = colors[i + 4] = colors[i + 5] = b;
        base[i]       = base[i + 1]   = base[i + 2]   = b;
        base[i + 3]   = base[i + 4]   = base[i + 5]   = b;
      }

      const colorAttr = new THREE.BufferAttribute(colors, 3);
      colorAttr.usage = THREE.DynamicDrawUsage; // fast GPU upload every frame
      edgeGeo.setAttribute('color', colorAttr);

      posRef.current  = ep;
      baseRef.current = base;
      geoRef.current  = edgeGeo;
      setEdgesGeo(edgeGeo);
    };

    img.src = '/logo.png';
    return () => { geoRef.current?.dispose(); };
  }, []);

  /* ── Per-frame update ───────────────────────────────────────────────────── */
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    /* Auto-rotation — clean, no mouse tilt */
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.18;
      groupRef.current.rotation.x = -0.20 + Math.sin(t * 0.28) * 0.10;
      groupRef.current.position.y =  Math.sin(t * 0.52) * 0.07;
    }

    /* Scan beam */
    if (scanRef.current) {
      scanRef.current.position.y = 2.5 - ((t * 0.55) % 5.2);
      const m = scanRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.04 + 0.04 * Math.max(0, Math.sin(t * 0.55 * (Math.PI / 5.2)));
    }

    /* Decorative ring */
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.05;
      ringRef.current.rotation.x = 0.28 + Math.sin(t * 0.09) * 0.08;
    }

    /* ── Neon color update ──────────────────────────────────────────────── */
    const geo  = geoRef.current;
    const base = baseRef.current;
    const pos  = posRef.current;
    if (!geo || !base || !pos) return;

    const colorAttr = geo.attributes.color as THREE.BufferAttribute;
    const colors    = colorAttr.array as Float32Array;

    /*
     *  Map NDC pointer [-1,1] → approximate logo local-space [-2.3, 2.3].
     *  At FOV=44°, dist=7.5 → visible half-height ≈ 3.0 units at z=0.
     *  Logo half-size = 2.3.  Scale: 2.3 / 1.0 = 2.3 (pointer=1 → local 2.3).
     */
    const HALF      = 2.3;
    const mx        = pointer.x * HALF;
    const my        = pointer.y * HALF;

    const RADIUS    = 1.5;  // influence radius in local units
    const INTENSITY = 1.0;  // max neon brightness added on top of base

    for (let i = 0; i < pos.length; i += 3) {
      const vx = pos[i];
      const vy = pos[i + 1];

      /* Distance from this vertex to mouse position (in local XY plane) */
      const dx   = vx - mx;
      const dy   = vy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      /* Static neon glow — smooth bell-curve falloff */
      const glow = Math.pow(Math.max(0, 1 - dist / RADIUS), 2.0) * INTENSITY;

      /* Ripple wave propagating outward from cursor */
      const wave = Math.max(0,
        Math.sin(dist * 5.5 - t * 9.0) * 0.20 *
        Math.pow(Math.max(0, 1 - dist / (RADIUS * 2.0)), 1.2)
      );

      /* Always-on spatial pulse — makes the mesh breathe even without mouse */
      const pulse = Math.max(0, Math.sin(vx * 1.8 + vy * 1.2 + t * 1.6) * 0.07);

      const final = Math.min(1.0, base[i] + glow + wave + pulse);
      colors[i]     = final;
      colors[i + 1] = final;
      colors[i + 2] = final;
    }

    /* Signal GPU to re-upload color buffer this frame */
    colorAttr.needsUpdate = true;
  });

  return (
    <>
      {/* Background grid */}
      <mesh position={[0, 0, -5.5]}>
        <planeGeometry args={[20, 15, 40, 30]} />
        <meshBasicMaterial color="#0C0C0C" wireframe transparent opacity={0.45} />
      </mesh>

      {/* Orbital rings */}
      <mesh ref={ringRef} position={[0, 0, -1.2]}>
        <torusGeometry args={[3.7, 0.005, 3, 110]} />
        <meshBasicMaterial color="#191919" />
      </mesh>
      <mesh position={[0, 0, -0.6]} rotation={[0.5, 0, 0.9]}>
        <torusGeometry args={[2.8, 0.003, 3, 80]} />
        <meshBasicMaterial color="#141414" />
      </mesh>

      {/* Logo group */}
      <group ref={groupRef}>
        {edgesGeo ? (
          <lineSegments geometry={edgesGeo}>
            <lineBasicMaterial
              vertexColors
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </lineSegments>
        ) : (
          <LoadingRing />
        )}

        {/* Scan beam */}
        <mesh ref={scanRef} position={[0, 2.0, 0.55]}>
          <planeGeometry args={[6, 0.016]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {edgesGeo && (
          <mesh position={[0, 2.25, 0.9]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        )}
      </group>

      {/* Corner brackets */}
      {([[-1, 1], [1, 1], [-1, -1], [1, -1]] as [number, number][]).map(([sx, sy], idx) => {
        const a = (sx < 0 ? Math.PI : 0) + (sy < 0 ? Math.PI : 0);
        return (
          <group key={idx} position={[sx * 3.3, sy * 2.5, 0]} rotation={[0, 0, a]}>
            <mesh position={[0.18, 0, 0]}>
              <planeGeometry args={[0.38, 0.003]} />
              <meshBasicMaterial color="#1E1E1E" />
            </mesh>
            <mesh position={[0, 0.18, 0]}>
              <planeGeometry args={[0.003, 0.38]} />
              <meshBasicMaterial color="#1E1E1E" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
export const LoginOrb: React.FC = () => (
  <div style={{ width: '100%', height: '100%', background: '#0A0A0A', cursor: 'none' }}>
    <Canvas
      camera={{ position: [0, 0.25, 7.5], fov: 44 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0A0A0A']} />
      <LogoScene />
    </Canvas>
  </div>
);
