import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, LogOut, User, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Avatar } from '../ui/Avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/funil': 'Funil de Vendas',
  '/kanban': 'Kanban',
  '/clientes': 'Clientes',
  '/projetos': 'Projetos',
  '/financeiro': 'Financeiro',
  '/agenda': 'Agenda',
  '/configuracoes': 'Configurações',
};

export const Header: React.FC = () => {
  const { user, notifications, markNotificationRead, logout } = useAppStore();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pageTitle = pageTitles[location.pathname] || 'Responsyva';
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <header className="h-16 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>
        <p className="text-xs text-gray-500">{todayCapitalized}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-52 bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500 transition-colors"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
            className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-white text-black text-xs font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50"
              >
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="text-sm font-semibold text-white">Notificações</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500 text-center">
                      Nenhuma notificação por enquanto
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0 ${!notif.read ? 'bg-gray-800/50' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          {!notif.read && (
                            <span className="mt-1.5 w-2 h-2 bg-white rounded-full flex-shrink-0" />
                          )}
                          <div className={!notif.read ? '' : 'ml-4'}>
                            <p className="text-sm text-white">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {format(new Date(notif.createdAt), "HH:mm 'de' dd/MM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Avatar name={user?.name || 'Usuário'} size="sm" />
            <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50"
              >
                <div className="px-4 py-3 border-b border-gray-800">
                  <p className="text-sm font-medium text-white">{user?.name || 'Usuário'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'Sem e-mail cadastrado'}</p>
                </div>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Perfil
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors rounded-b-xl"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Click outside to close */}
      {(notifOpen || userMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setNotifOpen(false); setUserMenuOpen(false); }}
        />
      )}
    </header>
  );
};
