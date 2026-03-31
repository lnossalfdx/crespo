import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Phases:                                                                     *
 *  reveal  → logo scan-reveals itself top→bottom with neon scan line          *
 *  pulse   → all edges pulse to max brightness (system ready)                 *
 *  exit    → white flash, then onComplete()                                   *
 * ─────────────────────────────────────────────────────────────────────────── */

type Phase = 'reveal' | 'pulse' | 'exit';

/* ── 3D Logo that assembles itself ──────────────────────────────────────── */
function RevealLogo({ phase }: { phase: Phase }) {
  const groupRef  = useRef<THREE.Group>(null);
  const geoRef    = useRef<THREE.BufferGeometry | null>(null);
  const baseRef   = useRef<Float32Array | null>(null);
  const posRef    = useRef<Float32Array | null>(null);
  const startTRef = useRef<number | null>(null);    // set on first frame
  const phaseRef  = useRef<Phase>(phase);

  const [edgesGeo, setEdgesGeo] = useState<THREE.BufferGeometry | null>(null);

  // Keep phase ref in sync without causing re-renders in useFrame
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Build displaced wireframe from logo.png (same as LoginOrb)
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
        return 1 - (raw[idx] * 0.299 + raw[idx + 1] * 0.587 + raw[idx + 2] * 0.114) / 255;
      };

      const SEGS = 150, SIZE = 4.6, LIFT = 1.0;
      const plane = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
      const vp = plane.attributes.position.array as Float32Array;
      for (let i = 0; i < vp.length; i += 3) {
        vp[i + 2] = dark(vp[i] / SIZE + 0.5, 1 - (vp[i + 1] / SIZE + 0.5)) * LIFT;
      }
      plane.attributes.position.needsUpdate = true;
      plane.computeVertexNormals();

      const edgeGeo = new THREE.EdgesGeometry(plane, 1);
      plane.dispose();

      const ep     = edgeGeo.attributes.position.array as Float32Array;
      const colors = new Float32Array(ep.length).fill(0); // start fully dark
      const base   = new Float32Array(ep.length);

      for (let i = 0; i < ep.length; i += 6) {
        const b = Math.pow(Math.min(Math.max(ep[i + 2], ep[i + 5]) / LIFT, 1), 1.8);
        base[i]     = base[i + 1] = base[i + 2] = b;
        base[i + 3] = base[i + 4] = base[i + 5] = b;
      }

      const colorAttr = new THREE.BufferAttribute(colors, 3);
      colorAttr.usage = THREE.DynamicDrawUsage;
      edgeGeo.setAttribute('color', colorAttr);

      posRef.current  = ep;
      baseRef.current = base;
      geoRef.current  = edgeGeo;
      setEdgesGeo(edgeGeo);
    };
    img.src = '/logo.png';
    return () => geoRef.current?.dispose();
  }, []);

  useFrame(({ clock }) => {
    const geo  = geoRef.current;
    const base = baseRef.current;
    const pos  = posRef.current;
    if (!geo || !base || !pos) return;

    const t = clock.elapsedTime;
    if (startTRef.current === null) startTRef.current = t;
    const elapsed = t - startTRef.current;

    const colorAttr = geo.attributes.color as THREE.BufferAttribute;
    const colors    = colorAttr.array as Float32Array;

    const TOP          = 2.3;
    const REVEAL_DUR   = 1.55;
    const revealFrac   = Math.min(elapsed / REVEAL_DUR, 1.05);
    const scanY        = TOP - revealFrac * 4.7; // moves top→bottom

    const currentPhase = phaseRef.current;
    // In pulse phase, how long since pulse started
    const pulseT       = currentPhase === 'pulse' ? Math.max(0, elapsed - REVEAL_DUR) : 0;

    for (let i = 0; i < pos.length; i += 3) {
      const vy = pos[i + 1];
      let b = 0;

      if (vy <= scanY) {
        // Settled region behind scan line
        const behind = scanY - vy;
        b = base[i] * 0.8 + Math.exp(-behind * 2.2) * 0.55;
      }

      // Bright scan line itself
      b += Math.max(0, 1.0 - Math.abs(vy - scanY) * 9) * 1.1;

      // Pulse phase: all edges flash bright then settle at high value
      if (currentPhase === 'pulse') {
        const pulse = Math.max(0, Math.sin(pulseT * 14) * 0.3 * Math.exp(-pulseT * 2.5));
        const rise  = Math.min(1, pulseT * 2.5) * 0.3; // steady rise
        b = Math.min(1, b + pulse + rise);
      }

      // Exit: max brightness for flash effect
      if (currentPhase === 'exit') b = 1;

      colors[i] = colors[i + 1] = colors[i + 2] = Math.min(1, Math.max(0, b));
    }
    colorAttr.needsUpdate = true;

    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.07;
      groupRef.current.rotation.x = -0.18;
    }
  });

  if (!edgesGeo) return null;

  return (
    <group ref={groupRef}>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

/* ── Boot sequence text ──────────────────────────────────────────────────── */
const BOOT_LINES = [
  { text: 'RESPONSYVA OS  v2.1.0', ms: 100,  dim: true  },
  { text: '─────────────────────', ms: 280,  dim: true  },
  { text: '> AUTENTICANDO...', ms: 450,  dim: false, ok: true  },
  { text: '> MÓDULOS AI........', ms: 800,  dim: false, ok: true  },
  { text: '> WHATSAPP API......', ms: 1150, dim: false, ok: true  },
  { text: '> CRM ENGINE........', ms: 1500, dim: false, ok: true  },
  { text: '> ACESSO AUTORIZADO.', ms: 1850, dim: false, highlight: true },
] as const;

type BootLineItem = typeof BOOT_LINES[number];

function BootLine({ item, startAt }: { item: BootLineItem; startAt: number }) {
  const [chars, setChars] = useState(0);
  const [showOk, setShowOk] = useState(false);
  const full = item.text.length;

  useEffect(() => {
    const wait = Math.max(0, startAt + item.ms - Date.now());
    const t0 = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setChars(i);
        if (i >= full) {
          clearInterval(iv);
          if ('ok' in item && item.ok) setTimeout(() => setShowOk(true), 80);
        }
      }, 16);
      return () => clearInterval(iv);
    }, wait);
    return () => clearTimeout(t0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (chars === 0) return null;

  const displayed = item.text.slice(0, chars);
  const isHighlight = 'highlight' in item && item.highlight;
  const isDim = 'dim' in item && item.dim;

  return (
    <div style={{
      fontFamily: "'SF Mono', 'Courier New', monospace",
      fontSize: '0.72rem',
      lineHeight: 2,
      letterSpacing: '0.07em',
      color: isHighlight ? '#FFFFFF' : isDim ? '#333333' : '#666666',
      fontWeight: isHighlight ? 700 : 400,
    }}>
      {displayed}
      {chars < full && <span style={{ opacity: 0.5 }}>█</span>}
      {showOk && (
        <span style={{ color: '#FFFFFF', marginLeft: 8, opacity: 0.9 }}>✓</span>
      )}
    </div>
  );
}

/* ── Main transition component ───────────────────────────────────────────── */
interface Props { onComplete: () => void }

export const LoginTransition: React.FC<Props> = ({ onComplete }) => {
  const [phase,      setPhase]      = useState<Phase>('reveal');
  const [showFlash,  setShowFlash]  = useState(false);
  const [flashOut,   setFlashOut]   = useState(false);
  const [startAt] = useState(() => Date.now());

  const done = useCallback(() => onComplete(), [onComplete]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('pulse'),     1700);
    const t2 = setTimeout(() => setPhase('exit'),      2350);
    const t3 = setTimeout(() => setShowFlash(true),    2500);
    const t4 = setTimeout(() => setFlashOut(true),     2650);
    const t5 = setTimeout(() => done(),                2800);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, [done]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      style={{
        position:       'fixed',
        inset:          0,
        background:     '#000000',
        zIndex:         1000,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        overflow:       'hidden',
      }}
    >
      {/* Subtle grid */}
      <div style={{
        position:        'absolute',
        inset:           0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize:  '40px 40px',
        pointerEvents:   'none',
      }} />

      {/* 3D canvas — full screen, centered logo */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas
          camera={{ position: [0, 0.2, 7.5], fov: 44 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <RevealLogo phase={phase} />
        </Canvas>
      </div>

      {/* Boot text — bottom center */}
      <div style={{
        position:  'absolute',
        bottom:    '14%',
        left:      '50%',
        transform: 'translateX(-50%)',
        width:     340,
        minHeight: 120,
      }}>
        {BOOT_LINES.map((item, i) => (
          <BootLine key={i} item={item} startAt={startAt} />
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        position:     'absolute',
        bottom:       '11%',
        left:         '50%',
        transform:    'translateX(-50%)',
        width:        340,
        height:       1,
        background:   '#111111',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.1, ease: 'linear', delay: 0.3 }}
          style={{ height: '100%', background: '#FFFFFF', opacity: 0.8 }}
        />
      </div>

      {/* Corner brackets */}
      {([[-1,1],[1,1],[-1,-1],[1,-1]] as [number,number][]).map(([sx,sy], i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 + i * 0.04, duration: 0.3 }}
          style={{
            position: 'absolute',
            [sx < 0 ? 'left' : 'right']: '5%',
            [sy > 0 ? 'top'  : 'bottom']: '5%',
            width:  32,
            height: 32,
            borderTop:    sy > 0 ? '1px solid #222' : 'none',
            borderBottom: sy < 0 ? '1px solid #222' : 'none',
            borderLeft:   sx < 0 ? '1px solid #222' : 'none',
            borderRight:  sx > 0 ? '1px solid #222' : 'none',
          }}
        />
      ))}

      {/* White flash overlay */}
      {showFlash && (
        <motion.div
          initial={{ opacity: flashOut ? 1 : 0 }}
          animate={{ opacity: flashOut ? 0 : 1 }}
          transition={{ duration: 0.15 }}
          style={{ position: 'absolute', inset: 0, background: '#FFFFFF', pointerEvents: 'none' }}
        />
      )}
    </motion.div>
  );
};
