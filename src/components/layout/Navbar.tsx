import React, { useState } from 'react';
import {
  Plus,
  Bell,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Search,
  Layers,
  BarChart3,
  Clock,
  MessageSquare,
  LayoutGrid,
  ChevronRight,
  Code2,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Announcement } from '../../types';

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
          title: language === 'bn' ? 'অপারেশনাল ড্যাশবোর্ড' : 'Operational Dashboard',
          group: language === 'bn' ? 'ওয়ার্কস্পেস' : 'Workspace'
        };
      case 'new-order':
        return {
          title: language === 'bn' ? 'নতুন অর্ডার ইঞ্জিন' : 'New Order Terminal',
          group: language === 'bn' ? 'অর্ডারস' : 'Orders'
        };
      case 'mass-order':
        return {
          title: language === 'bn' ? 'ম্যাস অর্ডার প্রসেসর' : 'Mass Order Processor',
          group: language === 'bn' ? 'অর্ডারস' : 'Orders'
        };
      case 'orders':
        return {
          title: language === 'bn' ? 'অর্ডার ম্যানেজমেন্ট' : 'Orders Management',
          group: language === 'bn' ? 'অপারেশনস' : 'Operations'
        };
      case 'services':
        return {
          title: language === 'bn' ? 'সার্ভিস ক্যাটালগ ও রেট' : 'Services Catalogue',
          group: language === 'bn' ? 'ক্যাটালগ' : 'Catalogue'
        };
      case 'analytics':
        return {
          title: language === 'bn' ? 'খরচ ও অর্ডার অ্যানালিটিক্স' : 'Spending & Order Analytics',
          group: language === 'bn' ? 'ইনসাইটস' : 'Insights'
        };
      case 'add-funds':
        return {
          title: language === 'bn' ? 'ওয়ালেট ও ট্রানজেকশন' : 'Wallet & Transactions',
          group: language === 'bn' ? 'ফাইন্যান্স' : 'Finance'
        };
      case 'affiliates':
        return {
          title: language === 'bn' ? 'প্রোমো ও অ্যাফিলিয়েট' : 'Promo & Affiliates',
          group: language === 'bn' ? 'গ্রোথ' : 'Growth'
        };
      case 'tickets':
        return {
          title: language === 'bn' ? 'সাপোর্ট টিকিট ডেস্ক' : 'Support Tickets',
          group: language === 'bn' ? 'সহায়তা' : 'Support'
        };
      case 'track-order':
        return {
          title: language === 'bn' ? 'লাইভ অর্ডার ট্র্যাকার' : 'Live Order Tracker',
          group: language === 'bn' ? 'টেলিমেট্রি' : 'Telemetry'
        };
      case 'api-docs':
        return {
          title: language === 'bn' ? 'ডেভেলপার API v2 স্টুডিও' : 'Developer API v2 Studio',
          group: language === 'bn' ? 'ডেভেলপার' : 'Developer'
        };
      case 'profile':
        return {
          title: language === 'bn' ? 'প্রোফাইল ও সিকিউরিটি' : 'Profile & Security',
          group: language === 'bn' ? 'অ্যাকাউন্ট' : 'Account'
        };
      default:
        return {
          title: language === 'bn' ? 'অ্যাপ্লিকেশন মেনু' : 'Application Hub',
          group: language === 'bn' ? 'সিস্টেম' : 'System'
        };
    }
  };

  const currentMeta = getTabTitle(currentTab);

  const mobileSecondaryTabs = [
    ...(!profile
      ? [{ id: 'landing', label: language === 'bn' ? 'ল্যান্ডিং পেজ' : 'Landing', icon: LayoutGrid }]
      : []),
    { id: 'services', label: language === 'bn' ? 'সার্ভিস লিস্ট' : 'Services', icon: Layers },
    { id: 'analytics', label: language === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics', icon: BarChart3 },
    { id: 'track-order', label: language === 'bn' ? 'লাইভ ট্র্যাক' : 'Track', icon: Clock },
    { id: 'tickets', label: language === 'bn' ? 'সাপোর্ট' : 'Support', icon: MessageSquare },
    { id: 'affiliates', label: language === 'bn' ? 'প্রোমো/বোনাস' : 'Promo', icon: Gift },
    { id: 'api-docs', label: 'API v2', icon: Code2 },
    { id: 'menu', label: language === 'bn' ? 'সব মেনু' : 'More', icon: LayoutGrid }
  ];

  return (
    <header className="sticky top-0 z-30 w-full max-w-[100vw] bg-[#080B14]/88 backdrop-blur-xl border-b border-slate-800/75">
      <div className="w-full px-3 sm:px-5 lg:px-7 h-14 lg:h-16 flex items-center justify-between gap-2">
        {/* Left: Mobile Brand OR Desktop Context Breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Brand Identity */}
          <div
            onClick={() => onNavigateTab('home')}
            className="flex lg:hidden items-center gap-2 cursor-pointer select-none min-w-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5CF6] via-[#6D28D9] to-[#22D3EE] flex items-center justify-center text-white font-black text-xs shadow-md shadow-violet-500/25 active:scale-95 transition-transform shrink-0">
              AT
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm tracking-tight text-[#F1F5F9] flex items-center gap-1 whitespace-nowrap">
                AmarTrend
                <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  SMM
                </span>
              </span>
            </div>
          </div>

          {/* Desktop Operational Breadcrumb & Title */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="text-[#94A3B8] font-medium">{currentMeta.group}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <h1 className="text-sm font-extrabold text-[#F1F5F9] tracking-tight">
              {currentMeta.title}
            </h1>
          </div>
        </div>

        {/* Center (Desktop): Quick Command Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full py-2 px-3.5 rounded-xl bg-[#0D1220] hover:bg-[#141B2B] border border-slate-800/90 hover:border-violet-500/40 text-xs text-[#94A3B8] hover:text-[#F1F5F9] flex items-center justify-between gap-3 transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
              <span className="truncate">
                {language === 'bn'
                  ? 'সার্ভিস (#ID), অর্ডার বা পেজ সার্চ করুন...'
                  : 'Quick search services (#ID), orders, or commands...'}
              </span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141B2B] text-slate-400 border border-slate-700/70 shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-[#0D1220] border border-slate-800 text-[#94A3B8] hover:text-white transition-colors"
            title={language === 'bn' ? 'সার্চ' : 'Search'}
          >
            <Search className="w-3.5 h-3.5 text-[#22D3EE]" />
          </button>

          {/* Balance Pill */}
          {profile ? (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigateTab('add-funds')}
              className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl bg-[#0D1220] border border-violet-500/35 hover:border-[#22D3EE]/60 transition-all text-left group"
              title={language === 'bn' ? 'ওয়ালেটে টাকা যোগ করুন' : 'Add funds to wallet'}
            >
              <span className="text-[11px] sm:text-xs font-extrabold text-[#F1F5F9] font-mono tracking-tight tabular-nums whitespace-nowrap">
                {formatPrice(profile.balance)}
              </span>
              <div className="w-4 h-4 rounded-md bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] text-slate-950 flex items-center justify-center font-bold shrink-0">
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onOpenAuth}
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition-all whitespace-nowrap"
            >
              {language === 'bn' ? 'লগইন' : 'Sign In'}
            </motion.button>
          )}

          {/* Currency Switcher */}
          <button
            type="button"
            onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
            className="hidden sm:flex items-center justify-center h-8 px-2.5 rounded-xl bg-[#0D1220] border border-slate-800 text-[#F1F5F9] font-mono font-bold text-[11px] hover:border-violet-500/40 transition-colors"
            title="Switch Currency"
          >
            {currency === 'BDT' ? '৳ BDT' : '$ USD'}
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center justify-center h-8 px-2 rounded-xl bg-[#0D1220] border border-slate-800 text-[#F1F5F9] text-[11px] font-bold hover:border-violet-500/40 transition-colors"
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
              className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-[#0D1220] border border-slate-800 text-[#94A3B8] hover:text-white transition-colors"
              title={language === 'bn' ? 'বিজ্ঞপ্তি' : 'Notifications'}
            >
              <Bell className="w-4 h-4" />
              {announcements.some(a => a.active) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#22D3EE] ring-2 ring-[#080B14]" />
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
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs font-bold text-white">
                    <span>{language === 'bn' ? 'সিস্টেম বিজ্ঞপ্তি' : 'System Announcements'}</span>
                    <span className="text-[10px] font-mono text-[#22D3EE]">
                      {announcements.length} {language === 'bn' ? 'টি' : 'items'}
                    </span>
                  </div>
                  {announcements.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] py-4 text-center">
                      {language === 'bn' ? 'কোনো নতুন বিজ্ঞপ্তি নেই' : 'No active notifications'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                      {announcements.map(a => (
                        <div
                          key={a.id}
                          className="p-2.5 rounded-xl bg-[#080B14]/90 border border-slate-800/90 text-left"
                        >
                          <p className="text-xs font-bold text-[#F1F5F9]">{a.title}</p>
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
              className="flex items-center gap-1 h-8 px-2.5 rounded-xl text-[11px] font-extrabold transition-all bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 active:scale-95"
              title="Open Admin Management Software"
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
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6]/30 to-[#22D3EE]/30 border border-violet-500/40 text-[#F1F5F9] font-extrabold text-xs overflow-hidden"
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
                    <div className="px-2.5 py-2 border-b border-slate-800/80 mb-1">
                      <p className="text-xs font-bold text-white truncate">{profile.displayName}</p>
                      <p className="text-[10px] text-[#94A3B8] truncate">{profile.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('profile');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs text-slate-200 hover:text-white hover:bg-[#141B2B] rounded-xl transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span>{language === 'bn' ? 'প্রোফাইল ও সেটিংস' : 'Profile & Settings'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('analytics');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs text-slate-200 hover:text-white hover:bg-[#141B2B] rounded-xl transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#22D3EE]" />
                      <span>{language === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('menu');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs text-slate-200 hover:text-white hover:bg-[#141B2B] rounded-xl transition-colors lg:hidden"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'bn' ? 'সকল মেনু' : 'All Tools & Menu'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full p-2 text-xs text-[#F87171] hover:bg-rose-950/40 rounded-xl transition-colors mt-1"
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

      {/* Mobile Secondary App Ribbon (Services, Analytics, Track, Support, API, More) */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-1.5 border-t border-slate-800/60 bg-[#080B14]/70">
        {mobileSecondaryTabs.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigateTab(item.id)}
              className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all ${
                active
                  ? 'bg-[#8B5CF6]/20 text-white border border-[#8B5CF6]/45'
                  : 'bg-[#0D1220] text-[#94A3B8] border border-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-3 h-3 ${active ? 'text-[#22D3EE]' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
