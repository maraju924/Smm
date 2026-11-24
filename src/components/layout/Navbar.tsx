import React, { useState } from 'react';
import {
  Plus,
  Bell,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Search,
  BarChart3,
  LayoutGrid,
  ChevronRight,
  Sun,
  Moon,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Announcement } from '../../types';
import { BRAND_LOGO_URL } from '../../data/seedServices';

interface NavbarProps {
  onOpenAuth: () => void;
  onNavigateTab: (tabId: string) => void;
  onOpenCommandPalette?: () => void;
  currentTab: string;
  announcements: Announcement[];
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onNavigateTab,
  onOpenCommandPalette,
  currentTab,
  announcements,
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
    formatPrice,
  } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getTabTitle = (tab: string): { title: string; group: string } => {
    switch (tab) {
      case 'home':
        return {
          title: language === 'bn' ? 'হোম ড্যাশবোর্ড' : 'Dashboard',
          group: language === 'bn' ? 'ড্যাশবোর্ড' : 'Home',
        };
      case 'new-order':
        return {
          title: language === 'bn' ? 'নতুন অর্ডার করুন' : 'New Order',
          group: language === 'bn' ? 'অর্ডার' : 'Order',
        };
      case 'mass-order':
        return {
          title: language === 'bn' ? 'বাল্ক অর্ডার' : 'Bulk Order',
          group: language === 'bn' ? 'অর্ডার' : 'Order',
        };
      case 'orders':
        return {
          title: language === 'bn' ? 'আমার অর্ডারসমূহ' : 'My Orders',
          group: language === 'bn' ? 'অর্ডার তালিকা' : 'Orders',
        };
      case 'services':
        return {
          title: language === 'bn' ? 'সার্ভিস ও মূল্য তালিকা' : 'Services & Pricing',
          group: language === 'bn' ? 'ক্যাটালগ' : 'Services',
        };
      case 'analytics':
        return {
          title: language === 'bn' ? 'খরচ ও অর্ডার হিসাব' : 'Order Summary',
          group: language === 'bn' ? 'রিপোর্ট' : 'Summary',
        };
      case 'add-funds':
        return {
          title: language === 'bn' ? 'ওয়ালেট ও ব্যালেন্স' : 'My Wallet',
          group: language === 'bn' ? 'পেমেন্ট' : 'Wallet',
        };
      case 'affiliates':
        return {
          title: language === 'bn' ? 'রেফারেল ও বোনাস' : 'Refer & Earn',
          group: language === 'bn' ? 'বোনাস' : 'Rewards',
        };
      case 'tickets':
        return {
          title: language === 'bn' ? 'হেল্প ও সাপোর্ট' : 'Help & Support',
          group: language === 'bn' ? 'সহায়তা' : 'Support',
        };
      case 'track-order':
        return {
          title: language === 'bn' ? 'অর্ডার ট্র্যাকিং' : 'Track Order',
          group: language === 'bn' ? 'ট্র্যাকার' : 'Track',
        };
      case 'api-docs':
        return {
          title: language === 'bn' ? 'রিসেলার API ডকুমেন্টেশন' : 'Reseller API v2',
          group: language === 'bn' ? 'ডেভেলপার' : 'API',
        };
      case 'profile':
        return {
          title: language === 'bn' ? 'প্রোফাইল ও সেটিংস' : 'Profile & Settings',
          group: language === 'bn' ? 'অ্যাকাউন্ট' : 'Account',
        };
      default:
        return {
          title: language === 'bn' ? 'সকল মেনু' : 'Menu',
          group: language === 'bn' ? 'মেনু' : 'Menu',
        };
    }
  };

  const currentMeta = getTabTitle(currentTab);

  const headerBg = darkMode
    ? 'bg-slate-950/90 border-slate-800 text-slate-100'
    : 'bg-white/95 border-slate-200 text-slate-900';
  const pillSurface = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
    : 'bg-slate-100/90 border-slate-200 text-slate-700 hover:border-slate-300';
  const popoverSurface = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl'
    : 'bg-white border-slate-200 text-slate-900 shadow-xl';

  return (
    <header className={`sticky top-0 z-30 w-full max-w-[100vw] backdrop-blur-md border-b transition-colors ${headerBg}`}>
      <div className="w-full px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Brand Header OR Desktop Context Breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Brand Identity */}
          <div
            onClick={() => onNavigateTab('home')}
            className="flex lg:hidden items-center gap-2.5 cursor-pointer select-none min-w-0"
          >
            <img
              src={BRAND_LOGO_URL}
              alt="Boostlagbe.com"
              width={36}
              height={36}
              className={`w-9 h-9 rounded-xl object-cover border shrink-0 ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            />
            <div className="min-w-0">
              <span className="font-extrabold text-[15px] tracking-tight block leading-none truncate">
                Boostlagbe.com
              </span>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block mt-0.5 truncate">
                {currentMeta.title}
              </span>
            </div>
          </div>

          {/* Desktop Breadcrumb & Title */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentMeta.group}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <h1 className="text-sm font-extrabold tracking-tight">
              {currentMeta.title}
            </h1>
          </div>
        </div>

        {/* Center (Desktop): Quick Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={`w-full py-2 px-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${pillSurface}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">
                {language === 'bn'
                  ? 'সার্ভিস বা অর্ডার খুঁজুন (Ctrl+K)...'
                  : 'Search services or orders (Ctrl+K)...'}
              </span>
            </div>
            <kbd
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Icon */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={`md:hidden flex items-center justify-center w-9 h-9 rounded-xl border cursor-pointer ${pillSurface}`}
            title={language === 'bn' ? 'খুঁজুন' : 'Search'}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Wallet Balance Button */}
          {profile ? (
            <button
              type="button"
              onClick={() => onNavigateTab('add-funds')}
              className={`flex items-center gap-2 h-9 px-3 rounded-xl border transition-all cursor-pointer ${
                darkMode
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 hover:border-emerald-600'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-300'
              }`}
              title={language === 'bn' ? 'ব্যালেন্স যোগ করুন' : 'Add Balance'}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-extrabold font-mono tracking-tight tabular-nums whitespace-nowrap">
                {formatPrice(profile.balance)}
              </span>
              <span className="w-4 h-4 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              {language === 'bn' ? 'লগইন' : 'Sign In'}
            </button>
          )}

          {/* Light / Dark Mode Switcher */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer ${pillSurface}`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Light or Dark Mode"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Currency Switcher */}
          <button
            type="button"
            onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
            className={`hidden sm:flex items-center justify-center h-9 px-2.5 rounded-xl border font-mono font-bold text-xs transition-colors cursor-pointer ${pillSurface}`}
            title="Switch Currency"
          >
            {currency === 'BDT' ? '৳ BDT' : '$ USD'}
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className={`hidden sm:flex items-center justify-center h-9 px-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${pillSurface}`}
            title="Switch Language"
          >
            {language === 'bn' ? 'EN' : 'বাংলা'}
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer ${pillSurface}`}
              title={language === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}
            >
              <Bell className="w-4 h-4" />
              {announcements.some((a) => a.active) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border p-3.5 z-50 text-left ${popoverSurface}`}
                >
                  <div
                    className={`flex items-center justify-between pb-2 mb-2 border-b text-xs font-bold ${
                      darkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}
                  >
                    <span>{language === 'bn' ? 'নোটিশ ও আপডেট' : 'Updates & Notices'}</span>
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                      {announcements.length}
                    </span>
                  </div>
                  {announcements.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      {language === 'bn' ? 'কোনো নতুন নোটিশ নেই' : 'No new notifications'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                      {announcements.map((a) => (
                        <div
                          key={a.id}
                          className={`p-3 rounded-xl border text-left ${
                            darkMode
                              ? 'bg-slate-950 border-slate-800'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <p className="text-xs font-bold">{a.title}</p>
                          <p className={`text-[11px] mt-1 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {a.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin Console Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigateTab('admin')}
              className="flex items-center gap-1 h-9 px-2.5 rounded-xl text-xs font-bold transition-colors bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-300 cursor-pointer"
              title="Admin Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* User Avatar Menu */}
          {profile && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold text-xs overflow-hidden cursor-pointer shadow-xs"
              >
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.displayName?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />
                )}
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className={`absolute right-0 mt-2 w-56 rounded-2xl border p-2 z-50 text-left ${popoverSurface}`}
                  >
                    <div
                      className={`px-2.5 py-2 border-b mb-1 ${
                        darkMode ? 'border-slate-800' : 'border-slate-200'
                      }`}
                    >
                      <p className="text-xs font-bold truncate">{profile.displayName}</p>
                      <p className={`text-[11px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {profile.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('profile');
                        setShowUserMenu(false);
                      }}
                      className={`flex items-center gap-2 w-full p-2 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                        darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{language === 'bn' ? 'প্রোফাইল ও সেটিংস' : 'Profile & Settings'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('analytics');
                        setShowUserMenu(false);
                      }}
                      className={`flex items-center gap-2 w-full p-2 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                        darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'bn' ? 'খরচ ও রিপোর্ট' : 'Spending Summary'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('menu');
                        setShowUserMenu(false);
                      }}
                      className={`flex items-center gap-2 w-full p-2 text-xs font-medium rounded-xl transition-colors lg:hidden cursor-pointer ${
                        darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
                      <span>{language === 'bn' ? 'সকল মেনু' : 'All Menu'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors mt-1 cursor-pointer"
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
