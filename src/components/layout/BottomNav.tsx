import React from 'react';
import { Home, Package, Zap, Wallet, User } from 'lucide-react';
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

  // Map secondary views to the 5 primary mobile destinations
  const getEffectiveTab = (tab: string) => {
    if (tab === 'mass-order' || tab === 'services') return 'new-order';
    if (tab === 'track-order') return 'orders';
    if (tab === 'affiliates') return 'add-funds';
    if (['menu', 'tickets', 'api-docs', 'analytics', 'admin'].includes(tab)) {
      return 'profile';
    }
    return tab;
  };

  const effectiveActiveTab = getEffectiveTab(currentTab);

  // Exact 5 primary mobile destinations specified in the architecture:
  // 1. Home, 2. Orders, 3. New Order (Central Action), 4. Wallet, 5. Profile
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
      icon: Zap,
      isCenter: true
    },
    {
      id: 'add-funds',
      label: language === 'bn' ? 'ওয়ালেট' : 'Wallet',
      icon: Wallet
    },
    {
      id: 'profile',
      label: language === 'bn' ? 'প্রোফাইল' : 'Profile',
      icon: User,
      hasDot: isAdmin
    }
  ];

  return (
    <nav
      aria-label="Mobile Primary Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none flex justify-center pb-[max(8px,env(safe-area-inset-bottom))] px-3"
    >
      <div className="pointer-events-auto w-full max-w-md bg-[#0D1220]/92 backdrop-blur-2xl border border-slate-800/90 rounded-[26px] shadow-[0_18px_48px_rgba(3,6,16,0.9),0_0_24px_rgba(139,92,246,0.12)] p-1.5 flex items-center justify-between relative">
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
                  whileTap={{ scale: 0.91 }}
                  onClick={() => onSelectTab('new-order')}
                  className="relative -top-4 flex flex-col items-center group focus:outline-none"
                  title={tab.label}
                >
                  <div
                    className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-tr from-[#6D28D9] via-[#8B5CF6] to-[#22D3EE] text-white shadow-violet-500/40 ring-4 ring-[#080B14]'
                        : 'bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white ring-4 ring-[#080B14] shadow-violet-900/40'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.6]" />
                  </div>

                  <span
                    className={`text-[10px] mt-0.5 tracking-tight transition-colors duration-150 ${
                      isActive
                        ? 'text-[#22D3EE] font-extrabold'
                        : 'text-[#F1F5F9] font-semibold'
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
              className="relative flex-1 py-1.5 px-1 rounded-2xl transition-all flex flex-col items-center justify-center focus:outline-none min-h-[46px]"
              title={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavHybridPill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 bg-gradient-to-b from-[#8B5CF6]/20 to-[#22D3EE]/5 border border-[#8B5CF6]/35 rounded-2xl"
                />
              )}

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <Icon
                    className={`w-4 h-4 transition-colors duration-150 ${
                      isActive
                        ? 'text-[#22D3EE] stroke-[2.5]'
                        : 'text-[#94A3B8] stroke-[2]'
                    }`}
                  />

                  {tab.badge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#8B5CF6] text-white font-extrabold text-[9px] flex items-center justify-center shadow font-mono">
                      {tab.badge}
                    </span>
                  )}

                  {tab.hasDot && !tab.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#22D3EE] ring-2 ring-[#0D1220]" />
                  )}
                </div>

                <span
                  className={`text-[10px] mt-0.5 tracking-tight transition-colors duration-150 ${
                    isActive
                      ? 'text-[#F1F5F9] font-bold'
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
