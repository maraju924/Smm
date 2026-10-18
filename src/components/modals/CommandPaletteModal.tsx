import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Zap,
  Layers,
  Package,
  Wallet,
  BarChart3,
  Clock,
  MessageSquare,
  Code2,
  User,
  Gift,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMService, SMMOrder } from '../../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: SMMService[];
  orders: SMMOrder[];
  onNavigateTab: (tabId: string, params?: any) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  services,
  orders,
  onNavigateTab
}) => {
  const { language, formatPrice, isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navActions = useMemo(() => {
    const base = [
      { id: 'new-order', label: language === 'bn' ? 'নতুন অর্ডার তৈরি করুন' : 'Create New Order', sub: 'Order Workspace', icon: Zap },
      { id: 'services', label: language === 'bn' ? 'সার্ভিস ক্যাটালগ ও রেট' : 'Browse Services Catalogue', sub: `${services.length} Active Services`, icon: Layers },
      { id: 'orders', label: language === 'bn' ? 'অর্ডার ম্যানেজমেন্ট' : 'Orders Management', sub: `${orders.length} Orders`, icon: Package },
      { id: 'add-funds', label: language === 'bn' ? 'ওয়ালেট ও ফান্ড ডিপোজিট' : 'Wallet & Deposit Funds', sub: 'bKash, Nagad, Rocket, USDT', icon: Wallet },
      { id: 'analytics', label: language === 'bn' ? 'অ্যানালিটিক্স ও খরচ রিপোর্ট' : 'Spending & Order Analytics', sub: 'Charts & Distribution', icon: BarChart3 },
      { id: 'track-order', label: language === 'bn' ? 'লাইভ অর্ডার ট্র্যাকার' : 'Live Order Tracker', sub: 'Real-time Delivery Telemetry', icon: Clock },
      { id: 'mass-order', label: language === 'bn' ? 'ম্যাস অর্ডার (Bulk)' : 'Mass Order Processor', sub: 'Bulk Pipe Format', icon: Sparkles },
      { id: 'affiliates', label: language === 'bn' ? 'প্রোমো কোড ও অ্যাফিলিয়েট' : 'Promo Codes & Affiliates', sub: 'Redeem & Partner Earnings', icon: Gift },
      { id: 'tickets', label: language === 'bn' ? 'সাপোর্ট টিকিট ডেস্ক' : 'Support Tickets', sub: '24/7 Assistance', icon: MessageSquare },
      { id: 'api-docs', label: language === 'bn' ? 'ডেভেলপার API v2 স্টুডিও' : 'Developer REST API v2', sub: 'Sandbox & SDKs', icon: Code2 },
      { id: 'profile', label: language === 'bn' ? 'প্রোফাইল ও সিকিউরিটি সেটিংস' : 'Profile & Security Settings', sub: 'Preferences & API Key', icon: User }
    ];
    if (isAdmin) {
      base.unshift({
        id: 'admin',
        label: language === 'bn' ? 'অ্যাডমিন কন্ট্রোল সফটওয়্যার' : 'Admin Control Suite',
        sub: 'System & Provider Governance',
        icon: ShieldCheck
      });
    }
    const q = query.trim().toLowerCase();
    if (!q) return base.slice(0, 6);
    return base.filter(
      item =>
        item.label.toLowerCase().includes(q) ||
        item.sub.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [language, services.length, orders.length, isAdmin, query]);

  const matchingServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = services.filter(s => s.status !== 'disabled');
    if (!q) return active.slice(0, 5);
    return active
      .filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          String(s.id).toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [services, query]);

  const matchingOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders.slice(0, 3);
    return orders
      .filter(
        o =>
          o.id.toLowerCase().includes(q) ||
          o.serviceName.toLowerCase().includes(q) ||
          o.link.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [orders, query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-24 px-3 sm:px-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full max-w-xl rounded-3xl glass-panel border border-violet-500/30 shadow-2xl overflow-hidden text-[#F1F5F9]"
          >
            {/* Search Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800/80 bg-[#080B14]/70">
              <Search className="w-4 h-4 text-[#22D3EE] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'যেকোনো সার্ভিস (#ID), অর্ডার বা পেজ খুঁজুন...'
                    : 'Search services (#ID), orders, or workspace commands...'
                }
                className="flex-1 bg-transparent text-xs sm:text-sm text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] font-mono px-2 py-1 rounded-lg bg-[#141B2B] text-slate-400 hover:text-white border border-slate-700/70"
              >
                ESC
              </button>
            </div>

            {/* Results Body */}
            <div className="max-h-[68vh] overflow-y-auto p-3 space-y-4">
              {/* Navigation Commands */}
              {navActions.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    {language === 'bn' ? 'দ্রুত নেভিগেশন' : 'Workspace Destinations'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {navActions.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onNavigateTab(item.id);
                            onClose();
                          }}
                          className="p-2.5 rounded-2xl bg-[#0D1220]/90 hover:bg-[#141B2B] border border-slate-800/80 hover:border-violet-500/40 flex items-center justify-between gap-2 text-left transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-[#8B5CF6] group-hover:text-[#22D3EE] transition-colors shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#F1F5F9] truncate">
                                {item.label}
                              </p>
                              <p className="text-[10px] text-[#94A3B8] truncate">{item.sub}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matching Services */}
              {matchingServices.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    <span>{language === 'bn' ? 'সার্ভিস ক্যাটালগ (ক্লিক করে অর্ডার করুন)' : 'Services (Click to Order)'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('services', { searchQuery: query });
                        onClose();
                      }}
                      className="text-[#22D3EE] hover:underline lowercase font-mono"
                    >
                      {language === 'bn' ? 'সবগুলো দেখুন →' : 'view all →'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {matchingServices.map(srv => (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => {
                          onNavigateTab('new-order', {
                            serviceId: srv.id,
                            category: srv.category
                          });
                          onClose();
                        }}
                        className="w-full p-2.5 rounded-2xl bg-[#0D1220]/90 hover:bg-[#141B2B] border border-slate-800/80 hover:border-cyan-500/40 flex items-center justify-between gap-2 text-left transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#080B14] text-[#22D3EE] border border-slate-800 shrink-0">
                            #{srv.id}
                          </span>
                          <span className="text-xs font-semibold text-[#F1F5F9] truncate">
                            {srv.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono font-bold text-[#22C55E]">
                            {formatPrice(srv.rate)}/1K
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#8B5CF6]/20 text-violet-200 border border-[#8B5CF6]/30">
                            {language === 'bn' ? 'অর্ডার' : 'Order'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Orders */}
              {matchingOrders.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    {language === 'bn' ? 'সাম্প্রতিক অর্ডারসমূহ' : 'Matching Orders'}
                  </div>
                  <div className="space-y-1">
                    {matchingOrders.map(ord => (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => {
                          onNavigateTab('track-order', { orderId: ord.id });
                          onClose();
                        }}
                        className="w-full p-2.5 rounded-2xl bg-[#0D1220]/90 hover:bg-[#141B2B] border border-slate-800/80 flex items-center justify-between gap-2 text-left transition-all text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-violet-300">#{ord.id}</span>
                          <span className="text-[#F1F5F9] truncate">{ord.serviceName}</span>
                        </div>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#141B2B] text-[#22D3EE] shrink-0">
                          {ord.status.replace('_', ' ')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
