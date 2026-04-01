import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  TrendingUp,
  Kanban,
  Users,
  FolderOpen,
  DollarSign,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Avatar } from '../ui/Avatar';
import { SnakeGame } from '../SnakeGame';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/funil', label: 'Funil', icon: <TrendingUp className="w-5 h-5" /> },
  { path: '/kanban', label: 'Kanban', icon: <Kanban className="w-5 h-5" /> },
  { path: '/clientes', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
  { path: '/projetos', label: 'Projetos', icon: <FolderOpen className="w-5 h-5" /> },
  { path: '/financeiro', label: 'Financeiro', icon: <DollarSign className="w-5 h-5" /> },
  { path: '/agenda', label: 'Agenda', icon: <Calendar className="w-5 h-5" /> },
  { path: '/configuracoes', label: 'Configurações', icon: <Settings className="w-5 h-5" /> },
];

const containerVariants = {
  open: { width: 240 },
  closed: { width: 72 },
};

const itemVariants = {
  open: { opacity: 1, x: 0 },
  closed: { opacity: 0, x: -10 },
};

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, user } = useAppStore();
  const location = useLocation();
  const [snakeOpen, setSnakeOpen] = useState(false);

  return (
    <>
      <motion.aside
        variants={containerVariants}
        animate={sidebarCollapsed ? 'closed' : 'open'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col h-screen bg-gray-950 border-r border-gray-800 z-20 flex-shrink-0 overflow-hidden relative"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="font-heading text-2xl text-white tracking-widest"
                style={{ fontFamily: "'Bebas Neue', 'Coolvetica', sans-serif" }}
              >
                RESPONSYVA
              </motion.span>
            )}
          </AnimatePresence>
          {sidebarCollapsed && (
            <span
              className="font-heading text-xl text-white mx-auto"
              style={{ fontFamily: "'Bebas Neue', 'Coolvetica', sans-serif" }}
            >
              R
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.filter((item) => {
            if (item.path === '/financeiro' && user?.role === 'agent') return false;
            return true;
          }).map((item, idx) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              >
                <NavLink
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150 group relative
                    ${isActive
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }
                  `}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        variants={itemVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        transition={{ duration: 0.15 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              </motion.div>
            );
          })}

          {/* Snake Easter Egg */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: navItems.length * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <button
              onClick={() => setSnakeOpen(true)}
              title={sidebarCollapsed ? 'Snake' : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-white hover:bg-gray-800 transition-all duration-150"
            >
              <span className="flex-shrink-0"><Gamepad2 className="w-5 h-5" /></span>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    variants={itemVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    transition={{ duration: 0.15 }}
                  >
                    Dopamine Farm
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        </nav>

        {/* User Profile */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className={`flex items-center gap-3 px-1 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Avatar name={user?.name || 'Usuário'} size="sm" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col min-w-0"
                >
                  <span className="text-sm font-medium text-white truncate">
                    {user?.name || 'Usuário'}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {user?.role === 'admin' ? 'Administrador' : user?.role || 'Sem perfil'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-30"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </motion.aside>

      <AnimatePresence>
        {snakeOpen && <SnakeGame onClose={() => setSnakeOpen(false)} />}
      </AnimatePresence>
    </>
  );
};
