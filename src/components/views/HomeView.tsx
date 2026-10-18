import React, { useState } from 'react';
import { 
  Wallet, 
  Zap, 
  TrendingUp, 
  Package, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Search, 
  Sparkles, 
  ArrowRight,
  ChevronRight,
  Repeat
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

  const completedCount = orders.filter(o => o.status === 'completed').length;
  const inProgressCount = orders.filter(o => ['in_progress', 'processing'].includes(o.status)).length;
  const recentOrders = orders.slice(0, 3);

  const platforms = [
    { name: 'Facebook', label: 'Facebook', bg: 'bg-blue-600/10 text-blue-400 border-blue-500/20' },
    { name: 'Instagram', label: 'Instagram', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    { name: 'YouTube', label: 'YouTube', bg: 'bg-red-500/10 text-red-400 border-red-500/20' },
    { name: 'TikTok', label: 'TikTok', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    { name: 'Telegram', label: 'Telegram', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    { name: 'Twitter', label: 'Twitter / X', bg: 'bg-slate-700/20 text-slate-300 border-slate-700/30' },
  ];

  return (
    <div className="space-y-4 pb-6 w-full max-w-full overflow-x-hidden">
      {/* Notice / Announcement Banner */}
      {announcements.length > 0 && announcements[0].active && (
        <motion.div 
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs w-full max-w-full overflow-hidden"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <p className="text-slate-300 font-medium truncate">
              {announcements[0].title}: {announcements[0].content}
            </p>
          </div>
          <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
            {new Date(announcements[0].createdAt).toLocaleDateString()}
          </span>
        </motion.div>
      )}

      {/* Main Luxury Wallet Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="rounded-3xl bg-[#0d1322] border border-slate-800 p-4 sm:p-5 shadow-xl relative overflow-hidden w-full max-w-full"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>{language === 'bn' ? 'অমরট্রেন্ড ওয়ালেট ব্যালেন্স' : 'Available Balance'}</span>
          <span className="font-mono text-[11px] text-slate-500">
            {profile ? `UID: ${profile.uid.substring(0, 8)}` : 'Guest'}
          </span>
        </div>

        <div className="my-2">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight tabular-nums">
            {profile ? formatPrice(profile.balance) : '৳০.০০'}
          </h2>
          {profile && (
            <p className="text-xs text-slate-400 mt-1">
              {language === 'bn' ? 'মোট খরচ' : 'Total Spent'}: <span className="text-slate-200 font-mono font-semibold">{formatPrice(profile.totalSpent)}</span>
            </p>
          )}
        </div>

        {/* Quick Action Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-slate-800/80">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => profile ? onNavigateTab('add-funds') : onOpenAuth()}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-md transition-all min-h-[44px]"
          >
            <Wallet className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'bn' ? 'টাকা যোগ করুন' : 'Add Funds'}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onNavigateTab('new-order')}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all min-h-[44px]"
          >
            <Zap className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'bn' ? 'নতুন অর্ডার' : 'New Order'}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onNavigateTab('services')}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700/60 transition-all min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
            <span>{language === 'bn' ? 'সার্ভিস ও রেট' : 'Price List'}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onNavigateTab('track-order')}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700/60 transition-all min-h-[44px]"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{language === 'bn' ? 'লাইভ ট্র্যাক' : 'Track Order'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Global Service Search Widget */}
      <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2 px-3 shadow-md w-full max-w-full">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={homeSearchQuery}
          onChange={(e) => setHomeSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onNavigateTab('services', { searchQuery: homeSearchQuery.trim() });
            }
          }}
          placeholder={language === 'bn' ? 'সার্ভিস খুঁজুন (ফেসবুক লাইক, ইউটিউব ভিউজ...)' : 'Search any SMM service...'}
          className="flex-1 bg-transparent py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none min-w-0"
        />
        <button
          onClick={() => onNavigateTab('services', { searchQuery: homeSearchQuery.trim() })}
          className="text-xs font-bold text-rose-400 hover:text-rose-300 px-2 py-1 shrink-0"
        >
          {language === 'bn' ? 'খুঁজুন' : 'Search'}
        </button>
      </div>

      {/* Social Platforms Row */}
      <div className="space-y-2 w-full max-w-full">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-300">
            {language === 'bn' ? 'প্ল্যাটফর্ম নির্বাচন করুন' : 'Select Social Platform'}
          </span>
          <button 
            onClick={() => onNavigateTab('services')}
            className="text-rose-400 font-semibold hover:underline"
          >
            {language === 'bn' ? 'সবগুলো' : 'View all'}
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full max-w-full">
          {platforms.map((p, idx) => (
            <motion.button
              key={p.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onNavigateTab('services', { platform: p.name })}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center min-h-[64px] ${p.bg} hover:border-slate-600`}
            >
              <span className="text-xs font-bold text-slate-100 truncate w-full">
                {p.name}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {language === 'bn' ? 'সার্ভিস' : 'Explore'}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-full">
        <motion.div whileHover={{ y: -2 }} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {language === 'bn' ? 'মোট অর্ডার' : 'Total Orders'}
          </span>
          <p className="text-xl font-bold text-white font-mono mt-0.5 tabular-nums">
            {orders.length}
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {language === 'bn' ? 'চলমান প্রসেসিং' : 'In Progress'}
          </span>
          <p className="text-xl font-bold text-amber-400 font-mono mt-0.5 tabular-nums">
            {inProgressCount}
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {language === 'bn' ? 'সম্পন্ন হয়েছে' : 'Completed'}
          </span>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5 tabular-nums">
            {completedCount}
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {language === 'bn' ? 'সক্রিয় ক্যাটালগ' : 'Active Catalog'}
          </span>
          <p className="text-xl font-bold text-rose-400 font-mono mt-0.5 tabular-nums">
            {services.length}+
          </p>
        </motion.div>
      </div>

      {/* Recent Orders List (if any) */}
      {recentOrders.length > 0 && (
        <div className="space-y-2 pt-2 w-full max-w-full">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-300">
              {language === 'bn' ? 'সাম্প্রতিক অর্ডারসমূহ' : 'Recent Orders'}
            </span>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-rose-400 font-semibold hover:underline"
            >
              {language === 'bn' ? 'সবগুলো দেখুন' : 'See all'}
            </button>
          </div>

          <div className="space-y-2">
            {recentOrders.map((ord) => (
              <motion.div 
                key={ord.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateTab('orders')}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs cursor-pointer hover:border-slate-700 transition-colors w-full max-w-full overflow-hidden"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-[11px]">#{ord.id}</span>
                    <span className="text-slate-400 font-medium truncate">{ord.category}</span>
                  </div>
                  <p className="text-slate-300 font-medium truncate mt-0.5">{ord.serviceName}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-block text-[10px] font-bold capitalize ${
                    ord.status === 'completed' ? 'text-emerald-400' :
                    ord.status === 'in_progress' || ord.status === 'processing' ? 'text-amber-400' :
                    ord.status === 'canceled' ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {ord.status.replace('_', ' ')}
                  </span>
                  <p className="font-bold text-white font-mono mt-0.5">{formatPrice(ord.charge)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Promo Codes & Affiliate Program Banner */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigateTab('affiliates')}
        className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer transition-all"
      >
        <div className="space-y-0.5 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">
              {language === 'bn' ? 'প্রোমো কোড রিডিম ও রেফারেল বোনাস (৫% কমিশন)' : 'Redeem Promo Codes & Earn 5% Referral Bonus'}
            </span>
          </h4>
          <p className="text-[11px] text-slate-400 truncate">
            {language === 'bn'
              ? 'WELCOME50 কুপন ব্যবহার করে ফ্রি ব্যালেন্স নিন এবং বন্ধুদের আমন্ত্রণ জানান'
              : 'Use code WELCOME50 for instant bonus balance or invite friends'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      </motion.div>

      {/* Trust & Guarantee Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 w-full max-w-full">
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
            <Zap className="w-4 h-4" />
            <span>{language === 'bn' ? 'সুপার ফাস্ট ডেলিভারি' : 'Super Fast Speed'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {language === 'bn' ? 'অর্ডার দেওয়ার ১-৫ মিনিটের মধ্যে ডেলিভারি শুরু হয়।' : 'Processing begins within minutes of placing order.'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'bn' ? 'রিফিল গ্যারান্টি' : 'Refill Guarantee'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {language === 'bn' ? '৩০ দিন থেকে আজীবন নন-ড্রপ অটো রিফিল গ্যারান্টি।' : 'Non-drop packages with auto-refill button protection.'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
            <Wallet className="w-4 h-4" />
            <span>{language === 'bn' ? 'সহজ ডিপোজিট' : 'Easy Deposits'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {language === 'bn' ? 'বিকাশ, নগদ, রকেট এবং ক্রিপ্টো (USDT) সাপোর্ট।' : 'Instant top-up using bKash, Nagad, Rocket and Crypto.'}
          </p>
        </div>
      </div>
    </div>
  );
};
