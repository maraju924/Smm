import React, { useState } from 'react';
import { 
  Plus, 
  Moon, 
  Sun, 
  Bell, 
  ShieldCheck, 
  User as UserIcon, 
  LogOut,
  Globe,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Announcement } from '../../types';

interface NavbarProps {
  onOpenAuth: () => void;
  onNavigateTab: (tabId: string) => void;
  currentTab: string;
  announcements: Announcement[];
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onNavigateTab,
  currentTab,
  announcements
}) => {
  const { 
    profile, 
    isAdmin, 
    currency, 
    setCurrency, 
    language, 
    setLanguage, 
    darkMode, 
    setDarkMode, 
    logout,
    formatPrice 
  } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full max-w-[100vw] overflow-x-hidden bg-[#090D16]/95 dark:bg-[#070A12]/95 backdrop-blur-xl border-b border-slate-800/80 transition-colors">
      <div className="w-full max-w-6xl mx-auto px-2.5 sm:px-4 h-14 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand & Wordmark */}
        <div 
          onClick={() => onNavigateTab('home')}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none min-w-0 shrink"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-transform shrink-0">
            AT
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center whitespace-nowrap truncate">
            AmarTrend
            <span className="text-rose-500 ml-1 text-[9px] sm:text-[10px] font-black uppercase px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
              SMM
            </span>
          </span>
        </div>

        {/* Right Action Controls - Compact & Non-Overflowing */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Balance Pill Button */}
          {profile ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigateTab('add-funds')}
              className="flex items-center gap-1 sm:gap-1.5 py-1 px-2 sm:px-2.5 rounded-full bg-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 transition-all text-left group"
              title={language === 'bn' ? 'ফান্ড যোগ করুন' : 'Add funds'}
            >
              <span className="text-[11px] sm:text-xs font-bold text-emerald-400 font-mono tracking-tight tabular-nums whitespace-nowrap">
                {formatPrice(profile.balance)}
              </span>
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[9px] group-hover:scale-110 transition-transform shrink-0">
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onOpenAuth}
              className="py-1 px-2.5 sm:px-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition-all whitespace-nowrap"
            >
              {language === 'bn' ? 'লগইন' : 'Sign In'}
            </motion.button>
          )}

          {/* Currency Switcher (Tablet+) */}
          <button
            onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
            className="hidden md:flex items-center justify-center h-7 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs hover:border-slate-700 transition-colors"
            title="Toggle Currency"
          >
            {currency === 'BDT' ? '৳ BDT' : '$ USD'}
          </button>

          {/* Language Switcher (Mobile & Desktop) */}
          <button
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold hover:border-slate-700 transition-colors"
            title="Toggle Language"
          >
            {language === 'bn' ? 'বাং' : 'EN'}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
            title="Toggle Theme"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Announcements"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {announcements.length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3.5 z-50 text-left"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-white">
                    <span>{language === 'bn' ? 'বিজ্ঞপ্তি' : 'Announcements'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{announcements.length} updates</span>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                    {announcements.map((a) => (
                      <div key={a.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-left">
                        <p className="text-xs font-bold text-slate-200">{a.title}</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{a.content}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin App Switch (if admin) */}
          {isAdmin && (
            <button
              onClick={() => onNavigateTab('admin')}
              className="flex items-center gap-1 h-7 sm:h-8 px-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all bg-amber-500 text-slate-950 shadow-sm active:scale-95"
              title="Open Standalone Admin Mobile App"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}

          {/* User Menu Trigger */}
          {profile && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 overflow-hidden"
              >
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-left"
                  >
                    <div className="px-2.5 py-1.5 border-b border-slate-800 mb-1">
                      <p className="text-xs font-bold text-white truncate">{profile.displayName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{profile.email}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          onNavigateTab('admin');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-2 w-full p-2 text-xs text-amber-400 hover:bg-amber-950/40 rounded-xl transition-colors font-bold sm:hidden"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Admin Panel</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onNavigateTab('profile');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'bn' ? 'প্রোফাইল' : 'Profile'}</span>
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
