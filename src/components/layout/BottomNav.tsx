import React from 'react';
import { 
  Home, 
  Zap, 
  Package, 
  Layers, 
  Menu
} from 'lucide-react';
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

  // Map subpages to parent tab highlight
  const getEffectiveTab = (tab: string) => {
    if (tab === 'mass-order') return 'new-order';
    if (['menu', 'add-funds', 'tickets', 'track-order', 'api-docs', 'profile', 'admin'].includes(tab)) {
      return 'menu';
    }
    return tab;
  };

  const effectiveActiveTab = getEffectiveTab(currentTab);

  const tabs = [
    {
      id: 'home',
      label: language === 'bn' ? 'হোম' : 'Home',
      icon: Home,
    },
    {
      id: 'services',
      label: language === 'bn' ? 'সার্ভিস' : 'Services',
      icon: Layers,
    },
    {
      id: 'new-order',
      label: language === 'bn' ? 'অর্ডার' : 'Order',
      icon: Zap,
      isCenter: true,
    },
    {
      id: 'orders',
      label: language === 'bn' ? 'অর্ডারস' : 'Orders',
      icon: Package,
      badge: ordersBadgeCount > 0 ? ordersBadgeCount : undefined,
    },
    {
      id: 'menu',
      label: language === 'bn' ? 'মেনু' : 'Menu',
      icon: Menu,
      hasDot: isAdmin,
    }
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 pointer-events-none flex justify-center pb-[max(8px,env(safe-area-inset-bottom))] px-3 sm:px-4"
    >
      <div className="pointer-events-auto w-full max-w-md bg-[#080d1a]/95 dark:bg-[#060914]/95 backdrop-blur-2xl border border-slate-800/90 rounded-[28px] shadow-[0_16px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(244,63,94,0.08)] p-1.5 flex items-center justify-between relative">
        {tabs.map((tab) => {
          const isActive = effectiveActiveTab === tab.id;
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <div key={tab.id} className="relative flex-1 flex flex-col items-center justify-center">
                <motion.button
                  whileTap={{ scale: 0.88, rotate: -4 }}
                  whileHover={{ scale: 1.06 }}
                  onClick={() => onSelectTab('new-order')}
                  className="relative -top-5 flex flex-col items-center group focus:outline-none"
                  title={tab.label}
                >
                  {/* Ambient animated pulse glow behind center button */}
                  <motion.div 
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.45, 0.75, 0.45]
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-rose-500 via-indigo-500 to-amber-500 blur-md pointer-events-none"
                  />

                  {/* Center elevated button container */}
                  <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-tr from-rose-500 via-rose-600 to-indigo-600 text-white shadow-rose-500/50 ring-4 ring-[#080d1a]' 
                      : 'bg-gradient-to-tr from-slate-800 via-slate-750 to-slate-700 text-slate-100 border border-slate-650 hover:from-slate-700 hover:to-slate-600 shadow-black/60'
                  }`}>
                    <Icon className="w-5 h-5 stroke-[2.8]" />
                  </div>

                  <span className={`text-[10px] font-black mt-0.5 tracking-tight transition-colors duration-200 ${
                    isActive ? 'text-rose-400 font-extrabold' : 'text-slate-400 font-semibold'
                  }`}>
                    {tab.label}
                  </span>
                </motion.button>
              </div>
            );
          }

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.90 }}
              onClick={() => onSelectTab(tab.id)}
              className="relative flex-1 py-1.5 px-1 rounded-2xl transition-all flex flex-col items-center justify-center focus:outline-none min-h-[46px]"
              title={tab.label}
            >
              {/* Active sliding indicator with Framer Motion spring physics */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavActivePill"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-gradient-to-b from-rose-500/15 to-rose-500/5 border border-rose-500/30 rounded-2xl shadow-inner shadow-rose-500/10"
                />
              )}

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <motion.div
                    animate={{
                      y: isActive ? -1 : 0,
                      scale: isActive ? 1.08 : 1
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Icon className={`w-4.5 h-4.5 transition-colors duration-200 ${
                      isActive ? 'text-rose-500 stroke-[2.6]' : 'text-slate-400 stroke-[2]'
                    }`} />
                  </motion.div>
                  
                  {/* Badge counter */}
                  {tab.badge && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-md font-mono"
                    >
                      {tab.badge}
                    </motion.span>
                  )}

                  {/* Dot indicator (e.g. admin or notice) */}
                  {tab.hasDot && !tab.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#080d1a]" />
                  )}
                </div>

                <span className={`text-[10px] mt-0.5 tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-rose-400 font-bold' : 'text-slate-400 font-medium'
                }`}>
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
