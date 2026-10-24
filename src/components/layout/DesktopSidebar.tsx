import React from 'react';
import {
  Home,
  Zap,
  Package,
  Layers,
  Wallet,
  BarChart3,
  Clock,
  Sparkles,
  Gift,
  MessageSquare,
  User,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
  LogOut,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { BRAND_LOGO_URL } from '../../data/seedServices';

interface DesktopSidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string, params?: any) => void;
  onOpenAuth: () => void;
  onOpenCommandPalette: () => void;
  ordersBadgeCount?: number;
  servicesCount?: number;
  openTicketsCount?: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  accent?: boolean;
  badge?: string;
  mutedBadge?: boolean;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuth,
  onOpenCommandPalette,
  ordersBadgeCount = 0,
  servicesCount = 0,
  openTicketsCount = 0,
  collapsed,
  onToggleCollapse
}) => {
  const { profile, isAdmin, language, formatPrice, logout } = useAuth();

  const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: language === 'bn' ? 'প্রধান মেনু' : 'MAIN MENU',
      items: [
        {
          id: 'home',
          label: language === 'bn' ? 'হোম ড্যাশবোর্ড' : 'Dashboard',
          icon: Home
        },
        {
          id: 'new-order',
          label: language === 'bn' ? 'নতুন অর্ডার' : 'New Order',
          icon: Zap,
          accent: true
        },
        {
          id: 'mass-order',
          label: language === 'bn' ? 'বাল্ক অর্ডার' : 'Bulk Order',
          icon: Sparkles
        },
        {
          id: 'orders',
          label: language === 'bn' ? 'আমার অর্ডারসমূহ' : 'My Orders',
          icon: Package,
          badge: ordersBadgeCount > 0 ? String(ordersBadgeCount) : undefined
        },
        {
          id: 'track-order',
          label: language === 'bn' ? 'অর্ডার ট্র্যাকিং' : 'Track Order',
          icon: Clock
        }
      ]
    },
    {
      label: language === 'bn' ? 'সার্ভিস ও হিসাব' : 'SERVICES & SUMMARY',
      items: [
        {
          id: 'services',
          label: language === 'bn' ? 'সার্ভিস ও মূল্য তালিকা' : 'Services & Pricing',
          icon: Layers,
          badge: servicesCount > 0 ? String(servicesCount) : undefined,
          mutedBadge: true
        },
        {
          id: 'analytics',
          label: language === 'bn' ? 'খরচ ও রিপোর্ট' : 'Spending Report',
          icon: BarChart3
        }
      ]
    },
    {
      label: language === 'bn' ? 'ওয়ালেট ও বোনাস' : 'WALLET & REWARDS',
      items: [
        {
          id: 'add-funds',
          label: language === 'bn' ? 'ব্যালেন্স যোগ করুন' : 'Add Balance',
          icon: Wallet
        },
        {
          id: 'affiliates',
          label: language === 'bn' ? 'রেফারেল ও বোনাস' : 'Refer & Earn',
          icon: Gift
        }
      ]
    },
    {
      label: language === 'bn' ? 'সাপোর্ট ও সেটিংস' : 'HELP & ACCOUNT',
      items: [
        {
          id: 'tickets',
          label: language === 'bn' ? 'হেল্প ও সাপোর্ট' : 'Help & Support',
          icon: MessageSquare,
          badge: openTicketsCount > 0 ? String(openTicketsCount) : undefined
        },
        {
          id: 'profile',
          label: language === 'bn' ? 'প্রোফাইল ও সেটিংস' : 'Profile & Settings',
          icon: User
        },
        {
          id: 'blog',
          label: language === 'bn' ? 'ব্লগ ও গাইড' : 'Blog & Guides',
          icon: BookOpen
        },
        {
          id: 'about',
          label: language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us',
          icon: ShieldCheck
        },
        {
          id: 'contact',
          label: language === 'bn' ? 'যোগাযোগ' : 'Contact Us',
          icon: MessageSquare
        },
        {
          id: 'refund',
          label: language === 'bn' ? 'রিফান্ড নীতিমালা' : 'Refund Policy',
          icon: Sparkles
        },
        ...(!profile
          ? [
              {
                id: 'landing',
                label: language === 'bn' ? 'হোম পেজ' : 'Welcome Page',
                icon: Sparkles
              }
            ]
          : [])
      ]
    }
  ];

  return (
    <aside
      aria-label="Desktop Navigation"
      className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30 bg-[#111726] border-r border-white/[0.07] select-none transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[76px]' : 'w-[256px]'
      }`}
    >
      {/* Top Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-white/[0.07]">
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 min-w-0 focus:outline-none group"
        >
          <img
            src={BRAND_LOGO_URL}
            alt="Boostlagbe.com"
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl object-contain bg-[#090D16] border border-white/10 p-0.5 shrink-0 group-hover:scale-105 transition-transform"
          />
          {!collapsed && (
            <div className="text-left min-w-0">
              <span className="font-extrabold text-sm tracking-tight text-white truncate block">
                Boostlagbe.com
              </span>
              <p className="text-[11px] text-emerald-400 truncate">
                বুস্ট লাগবে
              </p>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#171F32] transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Quick Search Button */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={`w-full rounded-xl bg-[#090D16] hover:bg-[#171F32] border border-white/[0.08] text-xs text-[#94A3B8] hover:text-white transition-all flex items-center ${
            collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
          }`}
          title="Search"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            {!collapsed && (
              <span className="truncate text-[11px]">
                {language === 'bn' ? 'সার্ভিস বা অর্ডার খুঁজুন...' : 'Search services, orders...'}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Scrollable Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 no-scrollbar">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {group.label}
              </div>
            )}
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`relative w-full flex items-center ${
                    collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                  } rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'text-white bg-[#171F32]'
                      : item.accent
                      ? 'text-indigo-300 hover:text-white hover:bg-indigo-500/10'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#171F32]/60'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktopSidebarActiveIndicator"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-indigo-500/15 border border-indigo-500/35 pointer-events-none"
                    />
                  )}

                  <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-indigo-400'
                          : item.accent
                          ? 'text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span
                      className={`relative z-10 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        item.mutedBadge
                          ? 'bg-[#090D16] text-slate-400 border border-white/[0.06]'
                          : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Dedicated Admin Console Entry (Only if Admin) */}
        {isAdmin && (
          <div className="pt-2 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              title={collapsed ? 'Admin Panel' : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
              } rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                {!collapsed && (
                  <span className="truncate">
                    {language === 'bn' ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}
                  </span>
                )}
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Wallet & Account Dock */}
      <div className="p-3 border-t border-white/[0.07] space-y-2.5 bg-[#090D16]/60">
        {profile ? (
          <>
            {!collapsed ? (
              <div className="p-3 rounded-2xl glass-panel space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#94A3B8] font-medium">
                    {language === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Available Balance'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold font-mono text-white tabular-nums truncate">
                    {formatPrice(profile.balance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTab('add-funds')}
                    className="py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shrink-0"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>{language === 'bn' ? 'রিচার্জ' : 'Top Up'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectTab('add-funds')}
                title={`Balance: ${formatPrice(profile.balance)}`}
                className="w-full p-2.5 rounded-xl bg-[#171F32] border border-indigo-500/30 text-emerald-400 flex items-center justify-center"
              >
                <Wallet className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => onSelectTab('profile')}
                className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-90"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  {profile.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">
                      {profile.displayName}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] truncate">{profile.email}</p>
                  </div>
                )}
              </button>
              {!collapsed && (
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title={language === 'bn' ? 'লগআউট' : 'Sign Out'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all"
          >
            {collapsed ? 'In' : language === 'bn' ? 'লগইন / রেজিস্টার' : 'Sign In / Register'}
          </button>
        )}
      </div>
    </aside>
  );
};
