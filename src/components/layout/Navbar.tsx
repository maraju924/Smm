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
  ChevronRight
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
  announcements
}) => {
  const {
    profile,
    isAdmin,
    currency,
    setCurrency,
    language,
    setLanguage,
    logout,
    formatPrice
  } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getTabTitle = (tab: string): { title: string; group: string } => {
    switch (tab) {
      case 'home':
        return {
          title: language === 'bn' ? 'হোম ড্যাশবোর্ড' : 'Dashboard',
          group: language === 'bn' ? 'হোম' : 'Home'
        };
      case 'new-order':
        return {
          title: language === 'bn' ? 'নতুন অর্ডার করুন' : 'New Order',
          group: language === 'bn' ? 'অর্ডার' : 'Order'
        };
      case 'mass-order':
        return {
          title: language === 'bn' ? 'একসাথে অনেক অর্ডার' : 'Bulk Order',
          group: language === 'bn' ? 'অর্ডার' : 'Order'
        };
      case 'orders':
        return {
          title: language === 'bn' ? 'আমার অর্ডারসমূহ' : 'My Orders',
          group: language === 'bn' ? 'অর্ডার তালিকা' : 'Orders'
        };
      case 'services':
        return {
          title: language === 'bn' ? 'সার্ভিস ও মূল্য তালিকা' : 'Services & Pricing',
          group: language === 'bn' ? 'সার্ভিস' : 'Services'
        };
      case 'analytics':
        return {
          title: language === 'bn' ? 'খরচ ও অর্ডার হিসাব' : 'Order Summary',
          group: language === 'bn' ? 'হিসাব' : 'Summary'
        };
      case 'add-funds':
        return {
          title: language === 'bn' ? 'ওয়ালেট ও ব্যালেন্স' : 'My Wallet',
          group: language === 'bn' ? 'ওয়ালেট' : 'Wallet'
        };
      case 'affiliates':
        return {
          title: language === 'bn' ? 'রেফারেল ও বোনাস' : 'Refer & Earn',
          group: language === 'bn' ? 'বোনাস' : 'Rewards'
        };
      case 'tickets':
        return {
          title: language === 'bn' ? 'হেল্প ও সাপোর্ট' : 'Help & Support',
          group: language === 'bn' ? 'সহায়তা' : 'Support'
        };
      case 'track-order':
        return {
          title: language === 'bn' ? 'অর্ডার ট্র্যাকিং' : 'Track Order',
          group: language === 'bn' ? 'ট্র্যাকার' : 'Track'
        };
      case 'profile':
        return {
          title: language === 'bn' ? 'প্রোফাইল ও সেটিংস' : 'Profile & Settings',
          group: language === 'bn' ? 'অ্যাকাউন্ট' : 'Account'
        };
      default:
        return {
          title: language === 'bn' ? 'সকল মেনু' : 'Menu',
          group: language === 'bn' ? 'মেনু' : 'Menu'
        };
    }
  };

  const currentMeta = getTabTitle(currentTab);

  return (
    <header className="sticky top-0 z-30 w-full max-w-[100vw] bg-[#090D16]/95 backdrop-blur-xl border-b border-white/[0.07]">
      <div className="w-full px-3.5 sm:px-5 lg:px-7 h-14 lg:h-16 flex items-center justify-between gap-2">
        {/* Left: Native Mobile Brand Header OR Desktop Context Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Brand Identity */}
          <div
            onClick={() => onNavigateTab('home')}
            className="flex lg:hidden items-center gap-2.5 cursor-pointer select-none min-w-0"
          >
            <img
              src={BRAND_LOGO_URL}
              alt="Boostlagbe.com"
              width={34}
              height={34}
              className="w-8.5 h-8.5 rounded-xl object-contain bg-[#111726] border border-white/10 p-0.5 active:scale-95 transition-transform shrink-0"
            />
            <div className="min-w-0">
              <span className="font-extrabold text-[15px] tracking-tight text-white block leading-none truncate">
                Boostlagbe.com
              </span>
              <span className="text-[10px] font-medium text-emerald-400 block mt-0.5 truncate">
                {currentMeta.title}
              </span>
            </div>
          </div>

          {/* Desktop Breadcrumb & Title */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="text-[#94A3B8] font-medium">{currentMeta.group}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <h1 className="text-sm font-extrabold text-[#F8FAFC] tracking-tight">
              {currentMeta.title}
            </h1>
          </div>
        </div>

        {/* Center (Desktop): Quick Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full py-2 px-3.5 rounded-xl bg-[#111726] hover:bg-[#171F32] border border-white/[0.08] text-xs text-[#94A3B8] hover:text-white flex items-center justify-between gap-3 transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">
                {language === 'bn'
                  ? 'সার্ভিস বা অর্ডার খুঁজুন...'
                  : 'Search services or orders...'}
              </span>
            </div>
          </button>
        </div>

        {/* Right Native Mobile Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Icon */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-[#111726] border border-white/[0.08] text-[#94A3B8] active:scale-95 transition-transform"
            title={language === 'bn' ? 'খুঁজুন' : 'Search'}
          >
            <Search className="w-4 h-4 text-slate-200" />
          </button>

          {/* Balance Chip */}
          {profile ? (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigateTab('add-funds')}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#111726] border border-indigo-500/30 hover:border-indigo-400/50 transition-all text-left"
              title={language === 'bn' ? 'ব্যালেন্স যোগ করুন' : 'Add Balance'}
            >
              <span className="text-xs font-extrabold text-white font-mono tracking-tight tabular-nums whitespace-nowrap">
                {formatPrice(profile.balance)}
              </span>
              <div className="w-4 h-4 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onOpenAuth}
              className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all whitespace-nowrap"
            >
              {language === 'bn' ? 'লগইন' : 'Sign In'}
            </motion.button>
          )}

          {/* Currency Switcher (Desktop/Tablet) */}
          <button
            type="button"
            onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
            className="hidden sm:flex items-center justify-center h-9 px-2.5 rounded-xl bg-[#111726] border border-white/[0.08] text-white font-mono font-bold text-[11px] hover:border-indigo-500/40 transition-colors"
            title="Switch Currency"
          >
            {currency === 'BDT' ? '৳ BDT' : '$ USD'}
          </button>

          {/* Language Switcher (Desktop/Tablet) */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="hidden sm:flex items-center justify-center h-9 px-2.5 rounded-xl bg-[#111726] border border-white/[0.08] text-white text-[11px] font-bold hover:border-indigo-500/40 transition-colors"
            title="Switch Language"
          >
            {language === 'bn' ? 'বাং' : 'EN'}
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#111726] border border-white/[0.08] text-[#94A3B8] hover:text-white active:scale-95 transition-all"
              title={language === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}
            >
              <Bell className="w-4 h-4" />
              {announcements.some(a => a.active) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#090D16]" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 mt-2 w-72 sm:w-80 glass-panel rounded-2xl p-3.5 z-50 text-left"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08] text-xs font-bold text-white">
                    <span>{language === 'bn' ? 'নোটিশ ও আপডেট' : 'Updates & Notices'}</span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {announcements.length}
                    </span>
                  </div>
                  {announcements.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] py-4 text-center">
                      {language === 'bn' ? 'কোনো নতুন নোটিশ নেই' : 'No new notifications'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                      {announcements.map(a => (
                        <div
                          key={a.id}
                          className="p-2.5 rounded-xl bg-[#090D16] border border-white/[0.07] text-left"
                        >
                          <p className="text-xs font-bold text-white">{a.title}</p>
                          <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
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
              className="flex items-center gap-1 h-9 px-2.5 rounded-xl text-[11px] font-extrabold transition-all bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 active:scale-95"
              title="Admin Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
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
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600/25 border border-indigo-500/40 text-white font-extrabold text-xs overflow-hidden active:scale-95 transition-transform"
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
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 mt-2 w-52 glass-panel rounded-2xl p-2 z-50 text-left"
                  >
                    <div className="px-2.5 py-2 border-b border-white/[0.08] mb-1">
                      <p className="text-xs font-bold text-white truncate">{profile.displayName}</p>
                      <p className="text-[10px] text-[#94A3B8] truncate">{profile.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('profile');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs text-slate-200 hover:text-white hover:bg-[#171F32] rounded-xl transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{language === 'bn' ? 'প্রোফাইল ও সেটিংস' : 'Profile & Settings'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('analytics');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs text-slate-200 hover:text-white hover:bg-[#171F32] rounded-xl transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'bn' ? 'খরচ ও রিপোর্ট' : 'Spending Summary'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('menu');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs text-slate-200 hover:text-white hover:bg-[#171F32] rounded-xl transition-colors lg:hidden"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'bn' ? 'সকল মেনু' : 'All Menu'}</span>
                    </button>
                    <button
                      type="button"
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
