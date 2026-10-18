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

  // Real Order Statistics (Zero hardcoded fake stats)
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

  // Quick Order Launcher filtered services
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

  // Frequently used services (computed from real user order history, or top cheapest/saved services)
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
    { name: 'Instagram', accent: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300' },
    { name: 'YouTube', accent: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
    { name: 'TikTok', accent: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' },
    { name: 'Telegram', accent: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
    { name: 'Twitter', accent: 'border-slate-600/40 bg-slate-700/20 text-slate-300' }
  ];

  const activeAnnouncement = announcements.find(a => a.active);

  return (
    <div className="space-y-4 lg:space-y-6 pb-8 w-full max-w-full overflow-x-hidden">
      {/* System Announcement Banner */}
      {activeAnnouncement && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl glass-panel border-violet-500/30 flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] shrink-0" />
            <p className="text-[#F1F5F9] font-medium truncate">
              <strong className="text-violet-300 mr-1.5">{activeAnnouncement.title}:</strong>
              {activeAnnouncement.content}
            </p>
          </div>
          <span className="text-[10px] font-mono text-[#94A3B8] whitespace-nowrap shrink-0">
            {new Date(activeAnnouncement.createdAt).toLocaleDateString()}
          </span>
        </motion.div>
      )}

      {/* ASYMMETRIC MULTI-COLUMN WORKSPACE (Mobile Vertical / Desktop 12-Col Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* LEFT / PRIMARY COLUMN (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-4 lg:space-y-5 min-w-0">
          {/* Hero Hybrid Glass Balance & Greeting Surface */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="rounded-3xl glass-hero p-5 sm:p-6 relative overflow-hidden"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <span>
                    {profile
                      ? language === 'bn'
                        ? `স্বাগতম, ${profile.displayName}`
                        : `Welcome back, ${profile.displayName}`
                      : language === 'bn'
                      ? 'অমরট্রেন্ড ক্লাউড ওয়ার্কস্পেস'
                      : 'AmarTrend Cloud Workspace'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    {profile ? 'Verified' : 'Guest'}
                  </span>
                </div>

                <div className="mt-3">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#94A3B8] block">
                    {language === 'bn' ? 'উপলব্ধ ওয়ালেট ব্যালেন্স' : 'Available Wallet Balance'}
                  </span>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F5F9] font-mono tracking-tight tabular-nums">
                      {profile ? formatPrice(profile.balance) : '৳0.00'}
                    </h2>
                    {profile && (
                      <span className="text-xs text-[#94A3B8] font-mono">
                        {language === 'bn' ? 'মোট খরচ:' : 'Spent:'}{' '}
                        <strong className="text-[#22D3EE]">
                          {formatPrice(profile.totalSpent)}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Account UID Badge */}
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-mono text-[#94A3B8] px-2.5 py-1 rounded-xl bg-[#080B14]/70 border border-slate-800 block">
                  {profile ? `UID: ${profile.uid.slice(0, 8)}` : 'Cloud Auth Ready'}
                </span>
              </div>
            </div>

            {/* Primary Action Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-5 mt-5 border-t border-slate-800/70">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigateTab('new-order')}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition-all min-h-[44px]"
              >
                <Zap className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'bn' ? 'নতুন অর্ডার' : 'New Order'}</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => (profile ? onNavigateTab('add-funds') : onOpenAuth())}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all min-h-[44px]"
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'bn' ? 'ফান্ড যোগ করুন' : 'Add Funds'}</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigateTab('services')}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-[#141B2B] hover:bg-[#192337] text-[#F1F5F9] font-bold text-xs border border-slate-700/70 transition-all min-h-[44px]"
              >
                <Layers className="w-4 h-4 text-[#8B5CF6]" />
                <span>{language === 'bn' ? 'সার্ভিস ক্যাটালগ' : 'Services'}</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigateTab('analytics')}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-[#141B2B] hover:bg-[#192337] text-[#F1F5F9] font-bold text-xs border border-slate-700/70 transition-all min-h-[44px]"
              >
                <BarChart3 className="w-4 h-4 text-[#22D3EE]" />
                <span>{language === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics'}</span>
              </motion.button>
            </div>
          </motion.div>

          {/* 4 Real-Data Operational Metric Widgets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div
              onClick={() => onNavigateTab('orders')}
              className="p-4 rounded-2xl solid-panel hover:border-violet-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-semibold">
                  {language === 'bn' ? 'মোট অর্ডার' : 'Total Orders'}
                </span>
                <Package className="w-3.5 h-3.5 text-[#8B5CF6]" />
              </div>
              <p className="text-2xl font-extrabold text-[#F1F5F9] font-mono tabular-nums mt-1.5">
                {orders.length}
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('orders')}
              className="p-4 rounded-2xl solid-panel hover:border-amber-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-semibold">
                  {language === 'bn' ? 'পেন্ডিং কিউ' : 'Pending'}
                </span>
                <AlertCircle className="w-3.5 h-3.5 text-[#F59E0B]" />
              </div>
              <p className="text-2xl font-extrabold text-[#F59E0B] font-mono tabular-nums mt-1.5">
                {pendingCount}
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('orders')}
              className="p-4 rounded-2xl solid-panel hover:border-cyan-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-semibold">
                  {language === 'bn' ? 'প্রসেসিং চলমান' : 'Processing'}
                </span>
                <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
              </div>
              <p className="text-2xl font-extrabold text-[#22D3EE] font-mono tabular-nums mt-1.5">
                {processingCount}
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('orders')}
              className="p-4 rounded-2xl solid-panel hover:border-emerald-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-semibold">
                  {language === 'bn' ? 'সম্পন্ন অর্ডার' : 'Completed'}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
              </div>
              <p className="text-2xl font-extrabold text-[#22C55E] font-mono tabular-nums mt-1.5">
                {completedCount}
              </p>
            </div>
          </div>

          {/* Global Service Search & Platform Matrix */}
          <div className="p-4 rounded-3xl solid-panel space-y-3.5">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#080B14] border border-slate-800/90 focus-within:border-[#8B5CF6]">
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
                    ? 'সার্ভিস বা আইডি খুঁজুন (Facebook, Instagram, YouTube...)'
                    : 'Search any SMM service or #ID...'
                }
                className="flex-1 bg-transparent py-1.5 text-xs text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none min-w-0"
              />
              <button
                type="button"
                onClick={() =>
                  onNavigateTab('services', { searchQuery: homeSearchQuery.trim() })
                }
                className="py-1.5 px-3.5 rounded-xl bg-[#8B5CF6] hover:bg-[#6D28D9] text-white text-xs font-bold shrink-0 transition-colors"
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
                  className={`py-2.5 px-2 rounded-2xl border text-center transition-all hover:scale-[1.02] active:scale-95 ${p.accent}`}
                >
                  <span className="text-xs font-bold block truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity / Orders Section */}
          <div className="rounded-3xl solid-panel p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[#F1F5F9]">
                  {language === 'bn' ? 'সাম্প্রতিক অর্ডার অ্যাক্টিভিটি' : 'Recent Order Activity'}
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  {language === 'bn'
                    ? 'আপনার সর্বশেষ সাবমিট করা অর্ডারের রিয়েল-টাইম অবস্থা'
                    : 'Live status telemetry for your latest submitted orders'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-bold text-[#22D3EE] hover:underline flex items-center gap-1"
              >
                <span>{language === 'bn' ? 'সব দেখুন' : 'View All'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#080B14]/70 border border-slate-800/80 text-center space-y-2.5">
                <Package className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-[#94A3B8]">
                  {language === 'bn' ? 'কোনো অর্ডার পাওয়া যায়নি' : 'No recent orders yet'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('new-order')}
                  className="py-2 px-4 rounded-xl bg-[#8B5CF6] hover:bg-[#6D28D9] text-white font-bold text-xs"
                >
                  {language === 'bn' ? 'নতুন অর্ডার করুন' : 'Place First Order'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map(ord => (
                  <div
                    key={ord.id}
                    onClick={() => onNavigateTab('track-order', { orderId: ord.id })}
                    className="p-3 rounded-2xl bg-[#080B14]/90 hover:bg-[#141B2B] border border-slate-800/80 flex items-center justify-between gap-3 cursor-pointer transition-all text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#22D3EE] text-[11px]">
                          #{ord.id}
                        </span>
                        <span className="text-[#F1F5F9] font-semibold truncate">
                          {ord.serviceName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] mt-0.5 font-mono">
                        <span>Qty: {ord.quantity.toLocaleString()}</span>
                        <span>•</span>
                        <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-[#F1F5F9] block tabular-nums">
                        {formatPrice(ord.charge)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          ord.status === 'completed'
                            ? 'text-[#22C55E]'
                            : ord.status === 'canceled'
                            ? 'text-[#F87171]'
                            : 'text-[#F59E0B]'
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

        {/* RIGHT / SECONDARY COLUMN (4 Cols on Desktop: Quick Order Launcher & Top Services) */}
        <div className="lg:col-span-4 space-y-4 lg:space-y-5 min-w-0">
          {/* Quick Order Launcher Widget */}
          <div className="rounded-3xl glass-panel p-5 space-y-3.5 border border-violet-500/25">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#22D3EE]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#F1F5F9]">
                    {language === 'bn' ? 'কুইক অর্ডার লঞ্চার' : 'Quick Order Launcher'}
                  </h3>
                  <p className="text-[10px] text-[#94A3B8]">
                    {language === 'bn'
                      ? 'সার্ভিস নির্বাচন করে সরাসরি অর্ডারে যান'
                      : 'Select a service & jump to order form'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#22D3EE] px-2 py-0.5 rounded bg-[#080B14] border border-slate-800">
                {activeServices.length} IDs
              </span>
            </div>

            {/* Platform Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {['All', 'Facebook', 'Instagram', 'YouTube', 'TikTok', 'Telegram'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setQuickPlatform(p);
                    setQuickServiceId('');
                  }}
                  className={`py-1 px-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all ${
                    quickPlatform === p
                      ? 'bg-[#8B5CF6] text-white border-transparent'
                      : 'bg-[#080B14] text-[#94A3B8] border-slate-800 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {selectedQuickService ? (
              <div className="space-y-3">
                <select
                  value={selectedQuickService.id}
                  onChange={e => setQuickServiceId(e.target.value)}
                  className="w-full input-surface rounded-xl p-2.5 text-xs font-medium"
                >
                  {quickLauncherServices.map(s => (
                    <option key={s.id} value={s.id}>
                      [#{s.id}] {s.name} — {formatPrice(s.rate)}/1K
                    </option>
                  ))}
                </select>

                <div className="p-3 rounded-2xl bg-[#080B14]/80 border border-slate-800/90 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block">
                      Min: {selectedQuickService.min} • Max:{' '}
                      {selectedQuickService.max.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#22D3EE] font-semibold">
                      {selectedQuickService.averageTime || 'Instant Delivery'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-sm text-[#22C55E]">
                      {formatPrice(selectedQuickService.rate)}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] block">per 1,000</span>
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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <span>
                    {language === 'bn' ? 'এই সার্ভিসটি অর্ডার করুন' : 'Configure & Place Order'}
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

          {/* Frequently Used / Top Services */}
          {frequentServices.length > 0 && (
            <div className="rounded-3xl solid-panel p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>
                    {language === 'bn' ? 'জনপ্রিয় ও ব্যবহৃত সার্ভিস' : 'Frequently Used Services'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab('services')}
                  className="text-[11px] font-bold text-[#8B5CF6] hover:underline"
                >
                  {language === 'bn' ? 'ক্যাটালগ' : 'Catalogue'}
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
                    className="w-full p-3 rounded-2xl bg-[#080B14]/80 hover:bg-[#141B2B] border border-slate-800/80 hover:border-violet-500/40 text-left flex items-center justify-between gap-2 transition-all group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#22D3EE]">
                          #{srv.id}
                        </span>
                        <span className="text-xs font-bold text-[#F1F5F9] truncate">
                          {srv.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] truncate block mt-0.5">
                        {srv.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs font-extrabold text-[#22C55E]">
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
