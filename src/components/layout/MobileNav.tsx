import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Kanban,
  Users,
  Calendar,
  Grid2X2,
  TrendingUp,
  FolderOpen,
  DollarSign,
  Settings,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const mainItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/kanban', label: 'Kanban', icon: Kanban },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/agenda', label: 'Agenda', icon: Calendar },
];

const moreItems = [
  { path: '/funil', label: 'Funil', icon: TrendingUp },
  { path: '/projetos', label: 'Projetos', icon: FolderOpen },
  { path: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { path: '/configuracoes', label: 'Config', icon: Settings },
];

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const filteredMore = moreItems.filter((item) => {
    if (item.path === '/financeiro' && user?.role === 'agent') return false;
    return true;
  });

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-20 bg-black/50"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="md:hidden fixed bottom-16 inset-x-0 z-30 bg-gray-900 border-t border-gray-800 px-4 pt-4 pb-3 grid grid-cols-4 gap-2"
          >
            {filteredMore.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors"
                  style={{ background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                </NavLink>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-gray-950 border-t border-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-16">
          {mainItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors"
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-white' : ''}`}>
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-black' : 'text-gray-500'}`} style={{ width: '18px', height: '18px' }} />
                </div>
                <span className={`text-[9px] font-semibold tracking-wide ${isActive ? 'text-white' : 'text-gray-600'}`}>{label}</span>
              </NavLink>
            );
          })}

          {/* Mais button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors"
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${moreOpen ? 'bg-white' : ''}`}>
              {moreOpen
                ? <X className="text-black" style={{ width: '18px', height: '18px' }} />
                : <Grid2X2 className="text-gray-500" style={{ width: '18px', height: '18px' }} />
              }
            </div>
            <span className={`text-[9px] font-semibold tracking-wide ${moreOpen ? 'text-white' : 'text-gray-600'}`}>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
};
