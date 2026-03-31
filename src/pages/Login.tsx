import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { LoginOrb } from '../components/three/LoginOrb';
import { LoginTransition } from '../components/LoginTransition';
import { useAppStore } from '../store/useAppStore';
import { supabaseEnabled } from '../lib/supabase';

const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(1, 'Senha obrigatória'),
});

type LoginForm = z.infer<typeof loginSchema>;

/* ── Blinking cursor for sci-fi text effect ── */
function TypewriterLine({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) clearInterval(iv);
    }, 28);
    return () => clearInterval(iv);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="animate-pulse">▌</span>
      )}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export const Login: React.FC = () => {
  const { login } = useAppStore();
  const navigate = useNavigate();
  const [showPassword,    setShowPassword]    = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [loginError,      setLoginError]      = useState('');
  const [showTransition,  setShowTransition]  = useState(false);

  // Store credentials to apply AFTER the animation finishes
  // (calling login() immediately would trigger router redirect, killing the animation)
  const [pendingLogin, setPendingLogin] = useState<{ email: string; password: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    if (!supabaseEnabled) {
      setLoginError('Supabase nao configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setIsLoading(true);
    setLoginError('');
    await new Promise((r) => setTimeout(r, 280));
    setPendingLogin({ email: data.email, password: data.password });
    setShowTransition(true); // show animation — do NOT call login() yet
  };

  // Called when the transition animation finishes (~2.8s)
  const handleTransitionComplete = useCallback(async () => {
    if (!pendingLogin) return;

    try {
      await login(pendingLogin.email, pendingLogin.password);
      setPendingLogin(null);
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel entrar.';
      setPendingLogin(null);
      setLoginError(message);
      setShowTransition(false);
      setIsLoading(false);
    }
  }, [login, navigate, pendingLogin]);

  return (
    <>
      {/* ── Login transition overlay ────────────────────────────────────── */}
      {showTransition && (
        <LoginTransition onComplete={handleTransitionComplete} />
      )}

    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0A0A0A' }}>

      {/* ══ LEFT: 3D logo wireframe panel ══════════════════════════════════ */}
      <div className="hidden lg:flex w-1/2 relative flex-col">

        {/* Three.js canvas — fills the panel */}
        <div className="absolute inset-0">
          <LoginOrb />
        </div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 grid-bg pointer-events-none" style={{ opacity: 0.18 }} />

        {/* Right-edge gradient fade into the form */}
        <div
          className="absolute inset-y-0 right-0 w-32 pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, #0A0A0A)' }}
        />

        {/* Bottom overlay: tagline + metrics */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-0 left-0 right-0 z-10 p-8"
          style={{ background: 'linear-gradient(to top, #0A0A0A 60%, transparent)' }}
        >
          {/* Tagline */}
          <p
            className="text-white mb-6 leading-tight"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.6rem',
              letterSpacing: '0.04em',
            }}
          >
            Transforme conversas<br />
            <span style={{ color: '#555' }}>em receita.</span>
          </p>

          <div className="border-t pt-6" style={{ borderColor: '#1A1A1A' }}>
            <p className="text-xs font-mono" style={{ color: '#333' }}>
              <TypewriterLine text="CRM.UNIFICADO" delay={800} />
            </p>
            <p className="text-xs font-mono mt-2" style={{ color: '#2A2A2A' }}>
              Pipeline, agenda, clientes e projetos centralizados em um só lugar.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ══ RIGHT: Login form ════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative"
        style={{ background: '#0A0A0A' }}
      >
        {/* Subtle grid */}
        <div className="absolute inset-0 grid-bg" style={{ opacity: 0.12 }} />

        {/* Top-right corner accent */}
        <div
          className="absolute top-0 right-0 w-px h-32"
          style={{ background: 'linear-gradient(to bottom, #222, transparent)' }}
        />
        <div
          className="absolute top-0 right-0 h-px w-32"
          style={{ background: 'linear-gradient(to left, #222, transparent)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="w-full max-w-sm relative z-10 px-8"
        >
          {/* ── Brand header ──────────────────────────────────────────────── */}
          <div className="mb-10">
            {/* Wordmark */}
            <div className="mb-3">
              <div
                className="text-white"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '2.6rem',
                  letterSpacing: '0.1em',
                  lineHeight: 1,
                }}
              >
                RESPONSYVA
              </div>
            </div>

            {/* Divider */}
            <div
              className="w-full h-px mb-3"
              style={{ background: 'linear-gradient(to right, #2A2A2A, transparent)' }}
            />
            <p className="text-xs" style={{ color: '#444' }}>
              Acesse sua plataforma de automação inteligente
            </p>
          </div>

          {!supabaseEnabled && (
            <div
              className="mb-4 rounded-lg px-3 py-2 text-xs"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#888' }}
            >
              Configure o `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para habilitar o login.
            </div>
          )}

          {/* ── Form ──────────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#555' }}>
                E-mail
              </label>
              <div className="relative">
                <input
                  {...register('email')}
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none transition-all"
                  style={{
                    background: '#111111',
                    border: '1px solid #222',
                    color: '#fff',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3D3D3D')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#222')}
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs"
                    style={{ color: '#888' }}
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#555' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-lg px-4 py-3 pr-12 text-white text-sm outline-none transition-all"
                  style={{
                    background: '#111111',
                    border: '1px solid #222',
                    color: '#fff',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3D3D3D')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#222')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#444' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#888')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs"
                    style={{ color: '#888' }}
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs transition-colors"
                style={{ color: '#444' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#888')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs px-3 py-2 rounded"
                  style={{ background: '#1A1A1A', color: '#888', border: '1px solid #2A2A2A' }}
                >
                  {loginError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.005 }}
              disabled={isLoading || !supabaseEnabled}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg transition-colors cursor-pointer"
              style={{
                background: isLoading || !supabaseEnabled ? '#E5E5E5' : '#FFFFFF',
                color: '#000000',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                letterSpacing: '0.02em',
              }}
            >
              {isLoading ? (
                <div
                  className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: '#33333340', borderTopColor: '#000' }}
                />
              ) : (
                <>
                  {supabaseEnabled ? 'Entrar' : 'Configuração pendente'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div className="mt-10 pt-6" style={{ borderTop: '1px solid #111' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: '#2A2A2A' }}>
                © 2026 Responsyva
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" style={{ opacity: 0.3 }} />
                <p className="text-xs font-mono" style={{ color: '#2A2A2A' }}>
                  v1  .0.0
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
};
