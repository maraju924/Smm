import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Zap,
  Package,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  Layers,
  BarChart3,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMOrder, Announcement, SMMService } from '../../types';

interface HomeViewProps {
  onNavigateTab: (tabId: string, params?: any) => void;
  onOpenAuth: () => void;
  orders: SMMOrder[];
  services: SMMService[];
  announcements: Announcement[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigateTab,
  onOpenAuth,
  orders,
  services,
  announcements
}) => {
  const { profile, language, formatPrice } = useAuth();
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [quickPlatform, setQuickPlatform] = useState<string>('All');
  const [quickServiceId, setQuickServiceId] = useState<string>('');

  const pendingCount = useMemo(
    () => orders.filter(o => o.status === 'pending').length,
    [orders]
  );
  const processingCount = useMemo(
    () => orders.filter(o => ['in_progress', 'processing'].includes(o.status)).length,
    [orders]
  );
  const completedCount = useMemo(
    () => orders.filter(o => o.status === 'completed').length,
    [orders]
  );

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const activeServices = useMemo(
    () => services.filter(s => s.status !== 'disabled'),
    [services]
  );

  const quickLauncherServices = useMemo(() => {
    if (quickPlatform === 'All') return activeServices.slice(0, 40);
    const p = quickPlatform.toLowerCase();
    return activeServices
      .filter(
        s =>
          s.category.toLowerCase().includes(p) ||
          s.name.toLowerCase().includes(p)
      )
      .slice(0, 40);
  }, [activeServices, quickPlatform]);

  const selectedQuickService = useMemo(() => {
    return (
      quickLauncherServices.find(s => s.id === quickServiceId) ||
      quickLauncherServices[0]
    );
  }, [quickLauncherServices, quickServiceId]);

  const frequentServices = useMemo(() => {
    if (orders.length > 0) {
      const freqMap = new Map<string, number>();
      for (const o of orders) {
        freqMap.set(o.serviceId, (freqMap.get(o.serviceId) || 0) + 1);
      }
      const ranked = Array.from(freqMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => activeServices.find(s => s.id === id))
        .filter((s): s is SMMService => Boolean(s));
      if (ranked.length >= 3) return ranked.slice(0, 4);
    }
    return activeServices.slice(0, 4);
  }, [orders, activeServices]);

  const platforms = [
    { name: 'Facebook', accent: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
    { name: 'Instagram', accent: 'border-pink-500/30 bg-pink-500/10 text-pink-300' },
    { name: 'YouTube', accent: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
    { name: 'TikTok', accent: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
    { name: 'Telegram', accent: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
    { name: 'Twitter', accent: 'border-slate-600/40 bg-slate-700/20 text-slate-300' }
  ];

  const activeAnnouncement = announcements.find(a => a.active);

  return (
    <div className="space-y-4 lg:space-y-6 pb-8 w-full max-w-full overflow-x-hidden">
      {/* Notice Banner */}
      {activeAnnouncement && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl glass-panel flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-white font-medium truncate">
              <strong className="text-indigo-300 mr-1.5">{activeAnnouncement.title}:</strong>
              {activeAnnouncement.content}
            </p>
          </div>
          <span className="text-[10px] font-mono text-[#94A3B8] whitespace-nowrap shrink-0">
            {new Date(activeAnnouncement.createdAt).toLocaleDateString()}
          </span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* LEFT / PRIMARY COLUMN */}
        <div className="lg:col-span-8 space-y-4 lg:space-y-5 min-w-0">
          {/* Native Mobile Wallet & Greeting Card */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl glass-hero p-5 sm:p-6 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-medium">
                    {profile
                      ? language === 'bn'
                        ? `স্বাগতম, ${profile.displayName}`
                        : `Welcome, ${profile.displayName}`
                      : language === 'bn'
                      ? 'Boostlagbe.com-এ স্বাগতম'
                      : 'Welcome to Boostlagbe.com'}
                  </span>
                  {profile && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      {language === 'bn' ? 'সক্রিয়' : 'Active'}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-[#94A3B8] block">
                    {language === 'bn' ? 'আপনার ওয়ালেট ব্যালেন্স' : 'Available Balance'}
                  </span>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight tabular-nums">
                      {profile ? formatPrice(profile.balance) : '৳0.00'}
                    </h2>
                    {profile && (
                      <span className="text-xs text-[#94A3B8] font-mono">
                        {language === 'bn' ? 'মোট খরচ:' : 'Total Spent:'}{' '}
                        <strong className="text-emerald-400">
                          {formatPrice(profile.totalSpent)}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Native Mobile Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-5 mt-5 border-t border-white/[0.08]">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigateTab('new-order')}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all min-h-[44px]"
              >
                <Zap className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'bn' ? 'নতুন অর্ডার' : 'New Order'}</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => (profile ? onNavigateTab('add-funds') : onOpenAuth())}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/15 transition-all min-h-[44px]"
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'bn' ? 'ব্যালেন্স যোগ' : 'Add Balance'}</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigateTab('services')}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-[#171F32] hover:bg-[#1E2940] text-white font-bold text-xs border border-white/[0.08] transition-all min-h-[44px]"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>{language === 'bn' ? 'সার্ভিস তালিকা' : 'Services'}</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigateTab('analytics')}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-[#171F32] hover:bg-[#1E2940] text-white font-bold text-xs border border-white/[0.08] transition-all min-h-[44px]"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>{language === 'bn' ? 'খরচের হিসাব' : 'Summary'}</span>
              </motion.button>
            </div>
          </motion.div>

          {/* 4 Order Status Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div
              onClick={() => onNavigateTab('orders')}
              className="p-4 rounded-2xl solid-panel hover:border-indigo-500/40 cursor-pointer transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-semibold">
                  {language === 'bn' ? 'মোট অর্ডার' : 'Total Orders'}
                </span>
                <Package className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-white font-mono tabular-nums mt-1.5">
                {orders.length}
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('orders')}
              className="p-4 rounded-2xl solid-panel hover:border-amber-500/40 cursor-pointer transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-semibold">
                  {language === 'bn' ? 'অপেক্ষমান' : 'Pending'}
                </span>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums mt-1.5">
                {pendingCount}
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('orders')}
              className="p-4 rounded-2xl solid-panel hover:border-indigo-500/40 cursor-pointer transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-semibold">
                  {language === 'bn' ? 'চলমান অর্ডার' : 'In Progress'}
                </span>
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-indigo-400 font-mono tabular-nums mt-1.5">
                {processingCount}
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('orders')}
              className="p-4 rounded-2xl solid-panel hover:border-emerald-500/40 cursor-pointer transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-semibold">
                  {language === 'bn' ? 'সম্পন্ন অর্ডার' : 'Completed'}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums mt-1.5">
                {completedCount}
              </p>
            </div>
          </div>

          {/* Service Search & Social Platform Shortcuts */}
          <div className="p-4 rounded-3xl solid-panel space-y-3.5">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#090D16] border border-white/[0.08] focus-within:border-indigo-500">
              <Search className="w-4 h-4 text-[#94A3B8] ml-2 shrink-0" />
              <input
                type="text"
                value={homeSearchQuery}
                onChange={e => setHomeSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onNavigateTab('services', { searchQuery: homeSearchQuery.trim() });
                  }
                }}
                placeholder={
                  language === 'bn'
                    ? 'সার্ভিস খুঁজুন (Facebook, YouTube, TikTok...)'
                    : 'Search any service...'
                }
                className="flex-1 bg-transparent py-1.5 text-xs text-white placeholder-[#94A3B8] focus:outline-none min-w-0"
              />
              <button
                type="button"
                onClick={() =>
                  onNavigateTab('services', { searchQuery: homeSearchQuery.trim() })
                }
                className="py-1.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 transition-colors"
              >
                {language === 'bn' ? 'খুঁজুন' : 'Search'}
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {platforms.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onNavigateTab('services', { platform: p.name })}
                  className={`py-2.5 px-2 rounded-2xl border text-center transition-all active:scale-95 ${p.accent}`}
                >
                  <span className="text-xs font-bold block truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Orders List */}
          <div className="rounded-3xl solid-panel p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {language === 'bn' ? 'সাম্প্রতিক অর্ডারসমূহ' : 'Recent Orders'}
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  {language === 'bn'
                    ? 'আপনার সর্বশেষ অর্ডারের বর্তমান অবস্থা'
                    : 'Latest updates on your recent orders'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>{language === 'bn' ? 'সব দেখুন' : 'View All'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#090D16] border border-white/[0.06] text-center space-y-2.5">
                <Package className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-[#94A3B8]">
                  {language === 'bn' ? 'এখনো কোনো অর্ডার করা হয়নি' : 'No orders placed yet'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('new-order')}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {language === 'bn' ? 'প্রথম অর্ডার করুন' : 'Place First Order'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map(ord => (
                  <div
                    key={ord.id}
                    onClick={() => onNavigateTab('track-order', { orderId: ord.id })}
                    className="p-3.5 rounded-2xl bg-[#090D16] hover:bg-[#171F32] border border-white/[0.07] flex items-center justify-between gap-3 cursor-pointer transition-all text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-400 text-[11px]">
                          #{ord.id}
                        </span>
                        <span className="text-white font-semibold truncate">
                          {ord.serviceName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] mt-0.5 font-mono">
                        <span>{ord.quantity.toLocaleString()} টি</span>
                        <span>•</span>
                        <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-white block tabular-nums">
                        {formatPrice(ord.charge)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          ord.status === 'completed'
                            ? 'text-emerald-400'
                            : ord.status === 'canceled'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {ord.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT / SECONDARY COLUMN */}
        <div className="lg:col-span-4 space-y-4 lg:space-y-5 min-w-0">
          {/* Quick Order Card */}
          <div className="rounded-3xl glass-panel p-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {language === 'bn' ? 'দ্রুত অর্ডার করুন' : 'Quick Order'}
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  {language === 'bn'
                    ? 'সার্ভিস বেছে নিয়ে সরাসরি অর্ডার পেজে যান'
                    : 'Pick a service to start your order'}
                </p>
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {['All', 'Facebook', 'Instagram', 'YouTube', 'TikTok', 'Telegram'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setQuickPlatform(p);
                    setQuickServiceId('');
                  }}
                  className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all ${
                    quickPlatform === p
                      ? 'bg-indigo-600 text-white border-transparent'
                      : 'bg-[#090D16] text-[#94A3B8] border-white/[0.08] hover:text-white'
                  }`}
                >
                  {p === 'All' ? (language === 'bn' ? 'সব' : 'All') : p}
                </button>
              ))}
            </div>

            {selectedQuickService ? (
              <div className="space-y-3">
                <select
                  value={selectedQuickService.id}
                  onChange={e => setQuickServiceId(e.target.value)}
                  className="w-full input-surface rounded-xl p-3 text-xs font-medium"
                >
                  {quickLauncherServices.map(s => (
                    <option key={s.id} value={s.id}>
                      [#{s.id}] {s.name} — {formatPrice(s.rate)}/1K
                    </option>
                  ))}
                </select>

                <div className="p-3.5 rounded-2xl bg-[#090D16] border border-white/[0.07] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-[#94A3B8] block">
                      সর্বনিম্ন: {selectedQuickService.min} • সর্বোচ্চ:{' '}
                      {selectedQuickService.max.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold mt-0.5 block">
                      {selectedQuickService.averageTime || 'দ্রুত ডেলিভারি'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-sm text-emerald-400">
                      {formatPrice(selectedQuickService.rate)}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] block">প্রতি ১,০০০</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onNavigateTab('new-order', {
                      serviceId: selectedQuickService.id,
                      category: selectedQuickService.category
                    })
                  }
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <span>
                    {language === 'bn' ? 'অর্ডার পেজে যান' : 'Continue to Order'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8] py-3 text-center">
                {language === 'bn' ? 'কোনো সার্ভিস পাওয়া যায়নি' : 'No matching services'}
              </p>
            )}
          </div>

          {/* Popular Services */}
          {frequentServices.length > 0 && (
            <div className="rounded-3xl solid-panel p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-[#94A3B8] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {language === 'bn' ? 'জনপ্রিয় সার্ভিসসমূহ' : 'Popular Services'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab('services')}
                  className="text-[11px] font-bold text-indigo-400 hover:underline"
                >
                  {language === 'bn' ? 'সব দেখুন' : 'See All'}
                </button>
              </div>

              <div className="space-y-2">
                {frequentServices.map(srv => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() =>
                      onNavigateTab('new-order', {
                        serviceId: srv.id,
                        category: srv.category
                      })
                    }
                    className="w-full p-3 rounded-2xl bg-[#090D16] hover:bg-[#171F32] border border-white/[0.07] text-left flex items-center justify-between gap-2 transition-all group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-indigo-400">
                          #{srv.id}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {srv.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] truncate block mt-0.5">
                        {srv.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs font-extrabold text-emerald-400">
                        {formatPrice(srv.rate)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
