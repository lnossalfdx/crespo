import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Zap } from 'lucide-react';
import logoImg from '../assets/logoblack.png';

const CELL = 36;
const HEADER = 80;
const FOOTER = 48;
const H_PAD = 32;

function getGridSize() {
  const cols = Math.floor((window.innerWidth - H_PAD * 2) / CELL);
  const rows = Math.floor((window.innerHeight - HEADER - FOOTER) / CELL);
  return { cols: Math.max(16, cols), rows: Math.max(12, rows) };
}

const BASE_TICK = 140;
const MIN_TICK = 65;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  size: number;
}

function rand(max: number) { return Math.floor(Math.random() * max); }

function randomFood(snake: Point[], cols: number, rows: number): Point {
  let p: Point;
  do { p = { x: rand(cols), y: rand(rows) }; }
  while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

function getTickSpeed(score: number) {
  return Math.max(MIN_TICK, BASE_TICK - score * 4);
}

export const SnakeGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const logoWhiteRef = useRef<HTMLCanvasElement | null>(null);

  const [grid, setGrid] = useState(getGridSize);
  const gridRef = useRef(grid);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    const onResize = () => {
      const g = getGridSize();
      gridRef.current = g;
      setGrid(g);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const COLS = grid.cols;
  const ROWS = grid.rows;
  const midX = Math.floor(COLS / 2);
  const midY = Math.floor(ROWS / 2);

  const stateRef = useRef({
    snake: [{ x: midX + 1, y: midY }, { x: midX, y: midY }, { x: midX - 1, y: midY }, { x: midX - 2, y: midY }] as Point[],
    dir: 'RIGHT' as Dir,
    nextDir: 'RIGHT' as Dir,
    food: { x: midX + 6, y: midY } as Point,
    score: 0,
    dead: false,
    started: false,
    particles: [] as Particle[],
    foodPulse: 0,
    frame: 0,
  });

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('snake-hs') || '0'));
  const [dead, setDead] = useState(false);
  const [started, setStarted] = useState(false);
  const [newRecord, setNewRecord] = useState(false);

  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const lastScoreRef = useRef(0);

  // Preload logo and create white version
  useEffect(() => {
    const img = new Image();
    img.src = logoImg;
    img.onload = () => {
      logoRef.current = img;

      // Create white canvas version
      const wc = document.createElement('canvas');
      wc.width = img.width;
      wc.height = img.height;
      const wctx = wc.getContext('2d')!;
      wctx.drawImage(img, 0, 0);
      const data = wctx.getImageData(0, 0, wc.width, wc.height);
      for (let i = 0; i < data.data.length; i += 4) {
        if (data.data[i + 3] > 10) {
          data.data[i] = 255;
          data.data[i + 1] = 255;
          data.data[i + 2] = 255;
        }
      }
      wctx.putImageData(data, 0, 0);
      logoWhiteRef.current = wc;
    };
  }, []);

  const spawnParticles = (x: number, y: number) => {
    const s = stateRef.current;
    const cx = x * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      s.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
      });
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;
    const { cols, rows } = gridRef.current;
    const W = cols * CELL;
    const H = rows * CELL;
    canvas.width = W;
    canvas.height = H;

    // --- Background ---
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // --- Grid ---
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
    }

    // --- Food ---
    s.foodPulse = (s.foodPulse + 0.06) % (Math.PI * 2);
    const pulse = Math.sin(s.foodPulse);
    const fx = s.food.x * CELL + CELL / 2;
    const fy = s.food.y * CELL + CELL / 2;
    const foodR = CELL * 0.42 + pulse * 2;

    // outer glow ring
    const gradient = ctx.createRadialGradient(fx, fy, 0, fx, fy, foodR + 10);
    gradient.addColorStop(0, 'rgba(255,255,255,0.18)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fx, fy, foodR + 10, 0, Math.PI * 2);
    ctx.fill();

    // food cell bg
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(
      s.food.x * CELL + 3, s.food.y * CELL + 3,
      CELL - 6, CELL - 6, 8
    );
    ctx.fill();
    ctx.restore();

    if (logoRef.current) {
      const pad = 6 - pulse * 1.5;
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.8)';
      ctx.shadowBlur = 20;
      ctx.drawImage(logoRef.current, s.food.x * CELL + pad, s.food.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
      ctx.restore();
    }

    // --- Snake ---
    s.snake.forEach((seg, i) => {
      const px = seg.x * CELL;
      const py = seg.y * CELL;
      const isHead = i === 0;
      const t = i / (s.snake.length - 1 || 1);
      const alpha = isHead ? 1 : 0.95 - t * 0.55;
      const pad = isHead ? 2 : 3 + t * 3;
      const radius = isHead ? 10 : 7;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Shadow / glow for head
      if (isHead) {
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur = 16;
      }

      // Background of segment
      const brightness = isHead ? 255 : Math.round(240 - t * 120);
      ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
      ctx.beginPath();
      ctx.roundRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2, radius);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Logo on each segment
      const logo = isHead ? logoRef.current : logoWhiteRef.current;
      if (logo) {
        // invert for body (dark logo on white bg)
        if (!isHead) {
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = alpha * 0.8;
        }
        const imgPad = pad + (isHead ? 4 : 5);
        ctx.drawImage(logo, px + imgPad, py + imgPad, CELL - imgPad * 2, CELL - imgPad * 2);
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore();
    });

    // --- Particles ---
    s.particles = s.particles.filter((p) => p.life > 0);
    for (const p of s.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= 0.035 / p.maxLife;
      const a = Math.max(0, p.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    s.frame++;
  }, []);

  const scheduleNext = useCallback(() => {
    const queueNext = () => {
      tickRef.current = setTimeout(() => {
        const s = stateRef.current;

        if (s.dead || !s.started) {
          queueNext();
          return;
        }

        s.dir = s.nextDir;
        const head = s.snake[0];
        const { cols: gc, rows: gr } = gridRef.current;
        const next: Point = {
          x: (head.x + (s.dir === 'RIGHT' ? 1 : s.dir === 'LEFT' ? -1 : 0) + gc) % gc,
          y: (head.y + (s.dir === 'DOWN' ? 1 : s.dir === 'UP' ? -1 : 0) + gr) % gr,
        };

        if (s.snake.slice(1).some((seg) => seg.x === next.x && seg.y === next.y)) {
          s.dead = true;
          setDead(true);
          const hs = parseInt(localStorage.getItem('snake-hs') || '0');
          if (s.score > hs) {
            localStorage.setItem('snake-hs', String(s.score));
            setHighScore(s.score);
            setNewRecord(true);
          }
          return;
        }

        const ate = next.x === s.food.x && next.y === s.food.y;
        s.snake = [next, ...s.snake];
        if (!ate) {
          s.snake.pop();
        } else {
          spawnParticles(next.x, next.y);
          const { cols: fc, rows: fr } = gridRef.current;
          s.food = randomFood(s.snake, fc, fr);
          s.score += 1;
          lastScoreRef.current = s.score;
          setScore(s.score);
        }

        queueNext();
      }, getTickSpeed(stateRef.current.score));
    };

    queueNext();
  }, []);

  // Render loop
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  // Start game tick
  useEffect(() => {
    scheduleNext();
    return () => { if (tickRef.current) clearTimeout(tickRef.current); };
  }, [scheduleNext]);

  const restart = () => {
    if (tickRef.current) clearTimeout(tickRef.current);
    const s = stateRef.current;
    const mx = Math.floor(COLS / 2);
    const my = Math.floor(ROWS / 2);
    s.snake = [{ x: mx + 1, y: my }, { x: mx, y: my }, { x: mx - 1, y: my }, { x: mx - 2, y: my }];
    s.dir = 'RIGHT';
    s.nextDir = 'RIGHT';
    s.food = randomFood(s.snake, gridRef.current.cols, gridRef.current.rows);
    s.score = 0;
    s.dead = false;
    s.started = true;
    s.particles = [];
    s.foodPulse = 0;
    setScore(0);
    setDead(false);
    setStarted(true);
    setNewRecord(false);
    scheduleNext();
  };

  // Keyboard
  useEffect(() => {
    const opposites: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    const keyMap: Record<string, Dir> = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const newDir = keyMap[e.key];
      if (!newDir) return;
      e.preventDefault();
      const s = stateRef.current;
      if (!s.started) { s.started = true; setStarted(true); }
      if (newDir !== opposites[s.dir]) s.nextDir = newDir;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const W = COLS * CELL;
  const H = ROWS * CELL;

  // Reset snake position when grid resizes
  useEffect(() => {
    const s = stateRef.current;
    const mx = Math.floor(COLS / 2);
    const my = Math.floor(ROWS / 2);
    s.snake = [{ x: mx + 1, y: my }, { x: mx, y: my }, { x: mx - 1, y: my }, { x: mx - 2, y: my }];
    s.food = randomFood(s.snake, COLS, ROWS);
  }, [COLS, ROWS]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #111 0%, #000 70%)' }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold tracking-[0.2em] text-lg" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            RESPONSYVA
          </span>
          <span className="text-gray-700 text-xs uppercase tracking-widest mt-0.5">Snake</span>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-0.5">Recorde</p>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-lg font-bold text-gray-300">{highScore}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-0.5">Score</p>
            <motion.span
              key={score}
              initial={{ scale: 1.4, color: '#ffffff' }}
              animate={{ scale: 1, color: '#ffffff' }}
              className="text-2xl font-bold text-white block"
            >
              {score}
            </motion.span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-gray-800 flex items-center justify-center text-gray-600 hover:text-white hover:border-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div className="relative" style={{ width: W, height: H }}>
        {/* Glow border */}
        <div
          className="absolute -inset-px rounded-2xl pointer-events-none"
          style={{ boxShadow: '0 0 40px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.08)' }}
        />
        <canvas
          ref={canvasRef}
          className="rounded-2xl block"
          style={{ width: W, height: H }}
        />

        {/* Start overlay */}
        <AnimatePresence>
          {!started && !dead && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-2xl"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            >
              <div className="text-center">
                <p className="text-white font-bold text-xl tracking-wide mb-1">Pronto para jogar?</p>
                <p className="text-gray-500 text-sm">Use as setas ou WASD para controlar</p>
              </div>
              <button
                onClick={() => { stateRef.current.started = true; setStarted(true); }}
                className="px-8 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors tracking-wide"
              >
                COMEÇAR
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game over overlay */}
        <AnimatePresence>
          {dead && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl"
              style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
            >
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="text-center"
              >
                <p className="text-white font-bold text-3xl tracking-tight mb-1">Game Over</p>
                {newRecord && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="flex items-center justify-center gap-1.5 mt-1 mb-2"
                  >
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 text-sm font-semibold">Novo recorde!</span>
                  </motion.div>
                )}
                <p className="text-gray-400 text-sm mt-2">
                  Pontuação: <span className="text-white font-bold text-lg">{score}</span>
                </p>
              </motion.div>

              <motion.button
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                onClick={restart}
                className="flex items-center gap-2 px-8 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors tracking-wide mt-1"
              >
                <Zap className="w-4 h-4" />
                JOGAR NOVAMENTE
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Speed indicator */}
      {started && !dead && (
        <div className="absolute bottom-6 flex items-center gap-6 text-xs text-gray-700">
          <span>↑ ↓ ← →  mover</span>
          <span className="text-gray-800">·</span>
          <span>ESC  fechar</span>
          {score > 0 && (
            <>
              <span className="text-gray-800">·</span>
              <span className="text-gray-600">
                velocidade {Math.round(((BASE_TICK - getTickSpeed(score)) / (BASE_TICK - MIN_TICK)) * 100)}%
              </span>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};
