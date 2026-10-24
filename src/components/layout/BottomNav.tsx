import React from 'react';
import { Home, Package, PlusCircle, Wallet, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  ordersBadgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  ordersBadgeCount = 0
}) => {
  const { language, isAdmin } = useAuth();

  // Map secondary views to the 5 primary native mobile tabs
  const getEffectiveTab = (tab: string) => {
    if (tab === 'mass-order') return 'new-order';
    if (tab === 'track-order') return 'orders';
    if (['menu', 'services', 'tickets', 'affiliates', 'analytics', 'profile', 'api-docs', 'admin', 'about', 'contact', 'terms', 'privacy', 'refund'].includes(tab)) {
      return 'menu';
    }
    return tab;
  };

  const effectiveActiveTab = getEffectiveTab(currentTab);

  // 5 Native Mobile App Bottom Tabs:
  // 1. Home, 2. Orders, 3. New Order (Primary Center Action), 4. Wallet, 5. Menu
  const tabs = [
    {
      id: 'home',
      label: language === 'bn' ? 'হোম' : 'Home',
      icon: Home
    },
    {
      id: 'orders',
      label: language === 'bn' ? 'অর্ডারস' : 'Orders',
      icon: Package,
      badge: ordersBadgeCount > 0 ? ordersBadgeCount : undefined
    },
    {
      id: 'new-order',
      label: language === 'bn' ? 'নতুন অর্ডার' : 'New Order',
      icon: PlusCircle,
      isCenter: true
    },
    {
      id: 'add-funds',
      label: language === 'bn' ? 'ওয়ালেট' : 'Wallet',
      icon: Wallet
    },
    {
      id: 'menu',
      label: language === 'bn' ? 'মেনু' : 'Menu',
      icon: LayoutGrid,
      hasDot: isAdmin
    }
  ];

  return (
    <nav
      aria-label="Mobile Primary Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0D1322]/96 backdrop-blur-2xl border-t border-white/[0.08] pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {tabs.map(tab => {
          const isActive = effectiveActiveTab === tab.id;
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <div
                key={tab.id}
                className="relative flex-1 flex flex-col items-center justify-center"
              >
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onSelectTab('new-order')}
                  className="relative -top-3.5 flex flex-col items-center group focus:outline-none"
                  title={tab.label}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-indigo-500/40 ring-4 ring-[#090D16]'
                        : 'bg-indigo-600/90 text-white ring-4 ring-[#090D16]'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                  </div>

                  <span
                    className={`text-[10px] mt-0.5 tracking-tight transition-colors duration-150 ${
                      isActive
                        ? 'text-white font-extrabold'
                        : 'text-slate-300 font-semibold'
                    }`}
                  >
                    {tab.label}
                  </span>
                </motion.button>
              </div>
            );
          }

          return (
            <motion.button
              key={tab.id}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelectTab(tab.id)}
              className="relative flex-1 py-1.5 px-1 rounded-2xl transition-all flex flex-col items-center justify-center focus:outline-none min-h-[48px]"
              title={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavNativePill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-x-2 inset-y-1 bg-indigo-500/15 rounded-xl"
                />
              )}

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors duration-150 ${
                      isActive
                        ? 'text-indigo-400 stroke-[2.4]'
                        : 'text-[#94A3B8] stroke-[1.9]'
                    }`}
                  />

                  {tab.badge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-indigo-600 text-white font-extrabold text-[9px] flex items-center justify-center shadow font-mono">
                      {tab.badge}
                    </span>
                  )}

                  {tab.hasDot && !tab.badge && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0D1322]" />
                  )}
                </div>

                <span
                  className={`text-[10px] mt-1 tracking-tight transition-colors duration-150 ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-[#94A3B8] font-medium'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
