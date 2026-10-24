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
  Code2,
  User,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
  LogOut
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
      label: language === 'bn' ? 'অপারেশনস' : 'OPERATIONS',
      items: [
        {
          id: 'home',
          label: language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard',
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
          label: language === 'bn' ? 'ম্যাস অর্ডার' : 'Mass Order',
          icon: Sparkles
        },
        {
          id: 'orders',
          label: language === 'bn' ? 'অর্ডার ম্যানেজমেন্ট' : 'Orders',
          icon: Package,
          badge: ordersBadgeCount > 0 ? String(ordersBadgeCount) : undefined
        },
        {
          id: 'track-order',
          label: language === 'bn' ? 'লাইভ ট্র্যাকার' : 'Order Tracker',
          icon: Clock
        }
      ]
    },
    {
      label: language === 'bn' ? 'ক্যাটালগ ও অ্যানালিটিক্স' : 'CATALOGUE & INSIGHTS',
      items: [
        {
          id: 'services',
          label: language === 'bn' ? 'সার্ভিস ক্যাটালগ' : 'Services Catalogue',
          icon: Layers,
          badge: servicesCount > 0 ? String(servicesCount) : undefined,
          mutedBadge: true
        },
        {
          id: 'analytics',
          label: language === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics',
          icon: BarChart3
        }
      ]
    },
    {
      label: language === 'bn' ? 'ফাইন্যান্স ও পার্টনার' : 'FINANCE & GROWTH',
      items: [
        {
          id: 'add-funds',
          label: language === 'bn' ? 'ওয়ালেট ও ডিপোজিট' : 'Wallet & Funds',
          icon: Wallet
        },
        {
          id: 'affiliates',
          label: language === 'bn' ? 'প্রোমো ও অ্যাফিলিয়েট' : 'Affiliates & Promo',
          icon: Gift
        }
      ]
    },
    {
      label: language === 'bn' ? 'সাপোর্ট ও ডেভেলপার' : 'SUPPORT & SYSTEM',
      items: [
        {
          id: 'tickets',
          label: language === 'bn' ? 'সাপোর্ট ডেস্ক' : 'Support Tickets',
          icon: MessageSquare,
          badge: openTicketsCount > 0 ? String(openTicketsCount) : undefined
        },
        {
          id: 'api-docs',
          label: language === 'bn' ? 'API v2 স্টুডিও' : 'API Management',
          icon: Code2
        },
        {
          id: 'profile',
          label: language === 'bn' ? 'প্রোফাইল ও সেটিংস' : 'Profile & Settings',
          icon: User
        },
        {
          id: 'about',
          label: language === 'bn' ? 'আমাদের সম্পর্কে' : 'About & Infrastructure',
          icon: ShieldCheck
        },
        {
          id: 'contact',
          label: language === 'bn' ? 'হেল্প সেন্টার ও যোগাযোগ' : 'Help Center & Contact',
          icon: MessageSquare
        },
        {
          id: 'refund',
          label: language === 'bn' ? 'রিফান্ড ও লিগ্যাল পলিসি' : 'Refund & Legal Policies',
          icon: Sparkles
        },
        ...(!profile
          ? [
              {
                id: 'landing',
                label: language === 'bn' ? 'পাবলিক ল্যান্ডিং পেজ' : 'Public Landing Page',
                icon: Sparkles
              }
            ]
          : [])
      ]
    }
  ];

  return (
    <aside
      aria-label="Desktop Workspace Navigation"
      className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30 bg-[#0D1220] border-r border-slate-800/80 select-none transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[76px]' : 'w-[264px]'
      }`}
    >
      {/* Top Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/70">
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
            className="w-9 h-9 rounded-xl object-contain bg-[#080B14] border border-white/10 p-0.5 shadow-lg shadow-violet-500/20 shrink-0 group-hover:scale-105 transition-transform"
          />
          {!collapsed && (
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-[#F1F5F9] truncate">
                  Boostlagbe.com
                </span>
                <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-[#67E8F9] truncate">
                বুস্ট লাগবে • Auto SMM
              </p>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141B2B] transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Quick Command Search Button */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={`w-full rounded-xl bg-[#080B14] hover:bg-[#141B2B] border border-slate-800/90 hover:border-violet-500/40 text-xs text-[#94A3B8] hover:text-[#F1F5F9] transition-all flex items-center ${
            collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
          }`}
          title="Quick Command Search (Ctrl+K)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {!collapsed && (
              <span className="truncate text-[11px]">
                {language === 'bn' ? 'সার্ভিস বা কমান্ড খুঁজুন...' : 'Search services, orders...'}
              </span>
            )}
          </div>
          {!collapsed && (
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141B2B] text-slate-400 border border-slate-700/70 shrink-0">
              ⌘K
            </kbd>
          )}
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
                      ? 'text-white bg-[#141B2B]'
                      : item.accent
                      ? 'text-violet-300 hover:text-white hover:bg-violet-500/10'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#141B2B]/60'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktopSidebarActiveIndicator"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#8B5CF6]/20 via-[#6D28D9]/10 to-transparent border border-[#8B5CF6]/40 pointer-events-none"
                    />
                  )}

                  <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#22D3EE]'
                          : item.accent
                          ? 'text-[#8B5CF6]'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span
                      className={`relative z-10 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        item.mutedBadge
                          ? 'bg-[#080B14] text-slate-400 border border-slate-800'
                          : 'bg-[#8B5CF6]/20 text-violet-200 border border-[#8B5CF6]/40'
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
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              title={collapsed ? 'Admin Control Center' : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
              } rounded-xl bg-gradient-to-r from-amber-500/15 to-violet-500/10 hover:from-amber-500/25 hover:to-violet-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                {!collapsed && (
                  <span className="truncate">
                    {language === 'bn' ? 'অ্যাডমিন সফটওয়্যার' : 'Admin Suite'}
                  </span>
                )}
              </div>
              {!collapsed && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">
                  ROOT
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Wallet & Account Dock */}
      <div className="p-3 border-t border-slate-800/80 space-y-2.5 bg-[#080B14]/60">
        {profile ? (
          <>
            {!collapsed ? (
              <div className="p-3 rounded-2xl glass-panel space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#94A3B8] font-medium">
                    {language === 'bn' ? 'উপলব্ধ ব্যালেন্স' : 'Available Balance'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold font-mono text-[#F1F5F9] tabular-nums truncate">
                    {formatPrice(profile.balance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTab('add-funds')}
                    className="py-1 px-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#6D28D9] text-white font-bold text-[11px] flex items-center gap-1 transition-colors shrink-0"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>{language === 'bn' ? 'ফান্ড' : 'Top Up'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectTab('add-funds')}
                title={`Balance: ${formatPrice(profile.balance)}`}
                className="w-full p-2.5 rounded-xl bg-[#141B2B] border border-violet-500/30 text-emerald-400 flex items-center justify-center"
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
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0">
                  {profile.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#F1F5F9] truncate">
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
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#F87171] hover:bg-rose-500/10 transition-colors"
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
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-violet-600/20 transition-all"
          >
            {collapsed ? 'In' : language === 'bn' ? 'অ্যাকাউন্টে লগইন' : 'Sign In / Register'}
          </button>
        )}
      </div>
    </aside>
  );
};
