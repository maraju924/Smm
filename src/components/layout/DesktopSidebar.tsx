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
  BookOpen,
  Code2,
} from 'lucide-react';
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
  onToggleCollapse,
}) => {
  const { profile, isAdmin, language, darkMode, formatPrice, logout } = useAuth();

  const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: language === 'bn' ? 'প্রধান মেনু' : 'Main Workspace',
      items: [
        {
          id: 'home',
          label: language === 'bn' ? 'হোম ড্যাশবোর্ড' : 'Dashboard',
          icon: Home,
        },
        {
          id: 'new-order',
          label: language === 'bn' ? 'নতুন অর্ডার করুন' : 'New Order',
          icon: Zap,
          accent: true,
        },
        {
          id: 'mass-order',
          label: language === 'bn' ? 'বাল্ক অর্ডার (Mass)' : 'Bulk Order',
          icon: Sparkles,
        },
        {
          id: 'orders',
          label: language === 'bn' ? 'আমার অর্ডারসমূহ' : 'My Orders',
          icon: Package,
          badge: ordersBadgeCount > 0 ? String(ordersBadgeCount) : undefined,
        },
        {
          id: 'track-order',
          label: language === 'bn' ? 'অর্ডার ট্র্যাকিং' : 'Track Order',
          icon: Clock,
        },
      ],
    },
    {
      label: language === 'bn' ? 'সার্ভিস ও ওয়ালেট' : 'Catalog & Wallet',
      items: [
        {
          id: 'services',
          label: language === 'bn' ? 'সার্ভিস ও মূল্য তালিকা' : 'Services & Pricing',
          icon: Layers,
          badge: servicesCount > 0 ? String(servicesCount) : undefined,
          mutedBadge: true,
        },
        {
          id: 'add-funds',
          label: language === 'bn' ? 'বিকাশ/নগদ ডিপোজিট' : 'Add Balance',
          icon: Wallet,
        },
        {
          id: 'analytics',
          label: language === 'bn' ? 'খরচ ও রিপোর্ট' : 'Spending Report',
          icon: BarChart3,
        },
        {
          id: 'affiliates',
          label: language === 'bn' ? 'রেফারেল ও বোনাস' : 'Refer & Earn',
          icon: Gift,
        },
      ],
    },
    {
      label: language === 'bn' ? 'সাপোর্ট ও ডেভেলপার' : 'Support & API',
      items: [
        {
          id: 'tickets',
          label: language === 'bn' ? 'হেল্প ও সাপোর্ট টিকেট' : 'Support Tickets',
          icon: MessageSquare,
          badge: openTicketsCount > 0 ? String(openTicketsCount) : undefined,
        },
        {
          id: 'api-docs',
          label: language === 'bn' ? 'রিসেলার REST API v2' : 'Reseller API v2',
          icon: Code2,
        },
        {
          id: 'blog',
          label: language === 'bn' ? 'ব্লগ ও এসএমএম গাইড' : 'Blog & Guides',
          icon: BookOpen,
        },
        {
          id: 'profile',
          label: language === 'bn' ? 'প্রোফাইল ও সেটিংস' : 'Profile & Settings',
          icon: User,
        },
      ],
    },
  ];

  const sidebarBg = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';
  const dividerBorder = darkMode ? 'border-slate-800' : 'border-slate-200';

  return (
    <aside
      aria-label="Desktop Navigation"
      className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30 border-r select-none transition-[width] duration-200 ease-out ${sidebarBg} ${
        collapsed ? 'w-[76px]' : 'w-[260px]'
      }`}
    >
      {/* Top Brand Header */}
      <div className={`h-16 px-4 flex items-center justify-between border-b ${dividerBorder}`}>
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 min-w-0 focus:outline-none group cursor-pointer"
        >
          <img
            src={BRAND_LOGO_URL}
            alt="Boostlagbe.com"
            width={36}
            height={36}
            className={`w-9 h-9 rounded-xl object-cover border shrink-0 ${dividerBorder}`}
          />
          {!collapsed && (
            <div className="text-left min-w-0">
              <span className="font-extrabold text-sm tracking-tight truncate block">
                Boostlagbe.com
              </span>
              <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                {language === 'bn' ? 'ইউজার কন্ট্রোল প্যানেল' : 'Member Workspace'}
              </p>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            darkMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick New Order CTA inside Sidebar */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => onSelectTab('new-order')}
          className={`w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center cursor-pointer ${
            collapsed ? 'justify-center p-2.5' : 'justify-center gap-2 px-3 py-2.5'
          }`}
          title={language === 'bn' ? 'নতুন অর্ডার করুন' : 'Place New Order'}
        >
          <Zap className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <span>{language === 'bn' ? '+ নতুন অর্ডার করুন' : '+ Place New Order'}</span>
          )}
        </button>
      </div>

      {/* Scrollable Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <div
                className={`px-2.5 pb-1 text-[11px] font-bold ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
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
                  } rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : darkMode
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-white'
                          : item.accent
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : darkMode
                          ? 'text-slate-400 group-hover:text-slate-200'
                          : 'text-slate-500 group-hover:text-slate-800'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.mutedBadge
                          ? darkMode
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-100 text-slate-600'
                          : 'bg-indigo-600/15 text-indigo-600 dark:text-indigo-300'
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

        {/* Dedicated Admin Console Entry */}
        {isAdmin && (
          <div className={`pt-2 border-t ${dividerBorder}`}>
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              title={collapsed ? 'Admin Panel' : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
              } rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all cursor-pointer`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
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
      <div
        className={`p-3 border-t space-y-2.5 ${dividerBorder} ${
          darkMode ? 'bg-slate-950/60' : 'bg-slate-50/80'
        }`}
      >
        {profile ? (
          <>
            {!collapsed ? (
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className={darkMode ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>
                    {language === 'bn' ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    bKash / Nagad
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                    {formatPrice(profile.balance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTab('add-funds')}
                    className="py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
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
                className="w-full p-2.5 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => onSelectTab('profile')}
                className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-90 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  {profile.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{profile.displayName}</p>
                    <p className={`text-[10px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {profile.email}
                    </p>
                  </div>
                )}
              </button>
              {!collapsed && (
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
            className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {collapsed ? 'In' : language === 'bn' ? 'লগইন / রেজিস্টার' : 'Sign In / Register'}
          </button>
        )}
      </div>
    </aside>
  );
};
