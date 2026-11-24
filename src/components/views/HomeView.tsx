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
  ChevronRight,
} from 'lucide-react';
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
  announcements,
}) => {
  const { profile, language, darkMode, formatPrice } = useAuth();
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [quickPlatform, setQuickPlatform] = useState<string>('All');
  const [quickServiceId, setQuickServiceId] = useState<string>('');

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  );
  const processingCount = useMemo(
    () => orders.filter((o) => ['in_progress', 'processing'].includes(o.status)).length,
    [orders]
  );
  const completedCount = useMemo(
    () => orders.filter((o) => o.status === 'completed').length,
    [orders]
  );

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  const activeServices = useMemo(
    () => services.filter((s) => s.status !== 'disabled'),
    [services]
  );

  const quickLauncherServices = useMemo(() => {
    if (quickPlatform === 'All') return activeServices.slice(0, 40);
    const p = quickPlatform.toLowerCase();
    return activeServices
      .filter(
        (s) =>
          s.category.toLowerCase().includes(p) ||
          s.name.toLowerCase().includes(p)
      )
      .slice(0, 40);
  }, [activeServices, quickPlatform]);

  const selectedQuickService = useMemo(() => {
    return (
      quickLauncherServices.find((s) => s.id === quickServiceId) ||
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
        .map(([id]) => activeServices.find((s) => s.id === id))
        .filter((s): s is SMMService => Boolean(s));
      if (ranked.length >= 3) return ranked.slice(0, 4);
    }
    return activeServices.slice(0, 4);
  }, [orders, activeServices]);

  const platforms = [
    {
      name: 'Facebook',
      lightCls: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      darkCls: 'bg-blue-950/60 text-blue-300 border-blue-800/60 hover:border-blue-600',
    },
    {
      name: 'YouTube',
      lightCls: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      darkCls: 'bg-red-950/60 text-red-300 border-red-800/60 hover:border-red-600',
    },
    {
      name: 'TikTok',
      lightCls: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
      darkCls: 'bg-pink-950/60 text-pink-300 border-pink-800/60 hover:border-pink-600',
    },
    {
      name: 'Instagram',
      lightCls: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100',
      darkCls: 'bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-800/60 hover:border-fuchsia-600',
    },
    {
      name: 'Telegram',
      lightCls: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
      darkCls: 'bg-sky-950/60 text-sky-300 border-sky-800/60 hover:border-sky-600',
    },
    {
      name: 'Twitter',
      lightCls: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
      darkCls: 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500',
    },
  ];

  const activeAnnouncement = announcements.find((a) => a.active);

  const cardSurface = darkMode
    ? 'bg-slate-900 border border-slate-800 text-slate-100'
    : 'bg-white border border-slate-200 text-slate-900 shadow-xs';
  const subtleSurface = darkMode
    ? 'bg-slate-950 border border-slate-800 text-slate-200'
    : 'bg-slate-50 border border-slate-200 text-slate-800';
  const mutedText = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-5 lg:space-y-6 pb-8 w-full max-w-full overflow-x-hidden">
      {/* Active Notice Banner */}
      {activeAnnouncement && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
            darkMode
              ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
            <p className="font-medium truncate">
              <strong className="font-bold mr-1.5">{activeAnnouncement.title}:</strong>
              {activeAnnouncement.content}
            </p>
          </div>
          <span className={`text-[10px] font-mono whitespace-nowrap shrink-0 ${mutedText}`}>
            {new Date(activeAnnouncement.createdAt).toLocaleDateString()}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* LEFT / PRIMARY COLUMN (8 cols) */}
        <div className="lg:col-span-8 space-y-5 min-w-0">
          {/* Primary Wallet & Member Welcome Banner */}
          <div className="rounded-2xl bg-indigo-600 text-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-indigo-100 font-medium">
                  <span>
                    {profile
                      ? language === 'bn'
                        ? `স্বাগতম, ${profile.displayName}`
                        : `Welcome back, ${profile.displayName}`
                      : language === 'bn'
                      ? 'Boostlagbe.com ইউজার প্যানেলে স্বাগতম'
                      : 'Welcome to Boostlagbe.com'}
                  </span>
                  {profile && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 text-white text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      {language === 'bn' ? 'ভেরিফাইড মেম্বার' : 'Active Member'}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <span className="text-xs text-indigo-100 block">
                    {language === 'bn' ? 'বর্তমান ওয়ালেট ব্যালেন্স' : 'Available Wallet Balance'}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-3 mt-0.5">
                    <h2 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight tabular-nums">
                      {profile ? formatPrice(profile.balance) : '৳0.00'}
                    </h2>
                    {profile && (
                      <span className="text-xs text-indigo-100 font-mono">
                        {language === 'bn' ? 'মোট খরচ:' : 'Total Spent:'}{' '}
                        <strong className="text-white font-bold">
                          {formatPrice(profile.totalSpent)}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-end text-right text-xs text-indigo-100">
                <span className="font-bold text-white">ZiniPay Auto Gateway</span>
                <span>bKash · Nagad · Rocket</span>
              </div>
            </div>

            {/* 4 Primary Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-5 mt-5 border-t border-white/20">
              <button
                type="button"
                onClick={() => onNavigateTab('new-order')}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs shadow-xs transition-colors min-h-[44px] cursor-pointer"
              >
                <Zap className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'bn' ? 'নতুন অর্ডার' : 'New Order'}</span>
              </button>

              <button
                type="button"
                onClick={() => (profile ? onNavigateTab('add-funds') : onOpenAuth())}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-xs transition-colors min-h-[44px] cursor-pointer"
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'bn' ? 'ব্যালেন্স অ্যাড' : 'Add Balance'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('services')}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 text-white font-bold text-xs border border-white/15 transition-colors min-h-[44px] cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>{language === 'bn' ? 'সার্ভিস লিস্ট' : 'Services'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('analytics')}
                className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 text-white font-bold text-xs border border-white/15 transition-colors min-h-[44px] cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" />
                <span>{language === 'bn' ? 'খরচের হিসাব' : 'Summary'}</span>
              </button>
            </div>
          </div>

          {/* 4 Order Status Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className={`p-4 rounded-2xl text-left transition-all cursor-pointer hover:border-indigo-500 ${cardSurface}`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold ${mutedText}`}>
                <span>{language === 'bn' ? 'মোট অর্ডার' : 'Total Orders'}</span>
                <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono tabular-nums mt-1.5">
                {orders.length}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className={`p-4 rounded-2xl text-left transition-all cursor-pointer hover:border-amber-500 ${cardSurface}`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold ${mutedText}`}>
                <span>{language === 'bn' ? 'অপেক্ষমান' : 'Pending'}</span>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1.5">
                {pendingCount}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className={`p-4 rounded-2xl text-left transition-all cursor-pointer hover:border-indigo-500 ${cardSurface}`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold ${mutedText}`}>
                <span>{language === 'bn' ? 'চলমান অর্ডার' : 'In Progress'}</span>
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-1.5">
                {processingCount}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className={`p-4 rounded-2xl text-left transition-all cursor-pointer hover:border-emerald-500 ${cardSurface}`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold ${mutedText}`}>
                <span>{language === 'bn' ? 'সম্পন্ন অর্ডার' : 'Completed'}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1.5">
                {completedCount}
              </p>
            </button>
          </div>

          {/* Service Search & Social Platform Shortcuts */}
          <div className={`p-4 sm:p-5 rounded-2xl space-y-3.5 ${cardSurface}`}>
            <div className={`flex items-center gap-2 p-1.5 rounded-xl ${subtleSurface} focus-within:border-indigo-600`}>
              <Search className={`w-4 h-4 ml-2 shrink-0 ${mutedText}`} />
              <input
                type="text"
                value={homeSearchQuery}
                onChange={(e) => setHomeSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onNavigateTab('services', { searchQuery: homeSearchQuery.trim() });
                  }
                }}
                placeholder={
                  language === 'bn'
                    ? 'সার্ভিস খুঁজুন (Facebook, YouTube, TikTok, #ID...)'
                    : 'Search any service by name or #ID...'
                }
                className="flex-1 bg-transparent py-1.5 text-xs sm:text-sm focus:outline-none min-w-0"
              />
              <button
                type="button"
                onClick={() =>
                  onNavigateTab('services', { searchQuery: homeSearchQuery.trim() })
                }
                className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'খুঁজুন' : 'Search'}
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {platforms.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onNavigateTab('services', { platform: p.name })}
                  className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    darkMode ? p.darkCls : p.lightCls
                  }`}
                >
                  <span className="text-xs font-bold block truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Orders List */}
          <div className={`rounded-2xl p-4 sm:p-5 space-y-4 ${cardSurface}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold">
                  {language === 'bn' ? 'সাম্প্রতিক অর্ডারসমূহ' : 'Recent Orders'}
                </h3>
                <p className={`text-xs ${mutedText}`}>
                  {language === 'bn'
                    ? 'আপনার সর্বশেষ অর্ডারের লাইভ অগ্রগতি'
                    : 'Live status of your latest submitted orders'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{language === 'bn' ? 'সব অর্ডার দেখুন' : 'View All Orders'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className={`p-8 rounded-xl text-center space-y-2.5 ${subtleSurface}`}>
                <Package className={`w-8 h-8 mx-auto ${mutedText}`} />
                <p className={`text-xs font-semibold ${mutedText}`}>
                  {language === 'bn' ? 'এখনো কোনো অর্ডার করা হয়নি' : 'No orders placed yet'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('new-order')}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                >
                  {language === 'bn' ? 'প্রথম অর্ডার করুন' : 'Place First Order'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => onNavigateTab('track-order', { orderId: ord.id })}
                    className={`p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all text-xs hover:border-indigo-500 ${subtleSurface}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                          #{ord.id}
                        </span>
                        <span className="font-semibold truncate">{ord.serviceName}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-[11px] mt-0.5 font-mono ${mutedText}`}>
                        <span>{ord.quantity.toLocaleString()} টি</span>
                        <span>·</span>
                        <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold block tabular-nums">
                        {formatPrice(ord.charge)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          ord.status === 'completed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : ord.status === 'canceled'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
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

        {/* RIGHT / SECONDARY COLUMN (4 cols) */}
        <div className="lg:col-span-4 space-y-5 min-w-0">
          {/* Quick Order Launcher Card */}
          <div className={`rounded-2xl p-5 space-y-4 ${cardSurface}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold">
                  {language === 'bn' ? 'দ্রুত অর্ডার লঞ্চার' : 'Quick Order Launcher'}
                </h3>
                <p className={`text-xs ${mutedText}`}>
                  {language === 'bn'
                    ? 'সার্ভিস বেছে নিয়ে সরাসরি অর্ডার পেজে যান'
                    : 'Pick a service to start your order immediately'}
                </p>
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {['All', 'Facebook', 'YouTube', 'TikTok', 'Instagram', 'Telegram'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setQuickPlatform(p);
                    setQuickServiceId('');
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    quickPlatform === p
                      ? 'bg-indigo-600 text-white'
                      : `${subtleSurface} hover:border-indigo-500`
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
                  onChange={(e) => setQuickServiceId(e.target.value)}
                  className="w-full input-surface rounded-xl p-3 text-xs font-medium"
                >
                  {quickLauncherServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} · {s.name} ({formatPrice(s.rate)}/1K)
                    </option>
                  ))}
                </select>

                <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs ${subtleSurface}`}>
                  <div>
                    <span className={`text-[11px] block ${mutedText}`}>
                      সর্বনিম্ন: {selectedQuickService.min} · সর্বোচ্চ:{' '}
                      {selectedQuickService.max.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                      {selectedQuickService.averageTime || 'তাৎক্ষণিক অটো ডেলিভারি'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatPrice(selectedQuickService.rate)}
                    </span>
                    <span className={`text-[10px] block ${mutedText}`}>প্রতি ১,০০০</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onNavigateTab('new-order', {
                      serviceId: selectedQuickService.id,
                      category: selectedQuickService.category,
                    })
                  }
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>
                    {language === 'bn' ? 'অর্ডার পেজে যান' : 'Continue to Order'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className={`text-xs py-3 text-center ${mutedText}`}>
                {language === 'bn' ? 'কোনো সার্ভিস পাওয়া যায়নি' : 'No matching services'}
              </p>
            )}
          </div>

          {/* Popular Services Card */}
          {frequentServices.length > 0 && (
            <div className={`rounded-2xl p-5 space-y-3 ${cardSurface}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {language === 'bn' ? 'জনপ্রিয় সার্ভিসসমূহ' : 'Popular Services'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab('services')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {language === 'bn' ? 'সব দেখুন' : 'See All'}
                </button>
              </div>

              <div className="space-y-2">
                {frequentServices.map((srv) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() =>
                      onNavigateTab('new-order', {
                        serviceId: srv.id,
                        category: srv.category,
                      })
                    }
                    className={`w-full p-3 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer hover:border-indigo-500 ${subtleSurface}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          #{srv.id}
                        </span>
                        <span className="text-xs font-bold truncate">{srv.name}</span>
                      </div>
                      <span className={`text-[11px] truncate block mt-0.5 ${mutedText}`}>
                        {srv.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatPrice(srv.rate)}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 ${mutedText}`} />
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
