import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wallet,
  Calendar,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMOrder, SMMPayment } from '../../types';

interface AnalyticsViewProps {
  orders: SMMOrder[];
  payments: SMMPayment[];
  onNavigateTab: (tabId: string) => void;
}

type RangeFilter = '7d' | '30d' | '90d' | 'all';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  orders,
  payments,
  onNavigateTab
}) => {
  const { language, formatPrice } = useAuth();
  const [range, setRange] = useState<RangeFilter>('30d');

  const cutoffTimestamp = useMemo(() => {
    const now = Date.now();
    if (range === '7d') return now - 7 * 24 * 60 * 60 * 1000;
    if (range === '30d') return now - 30 * 24 * 60 * 60 * 1000;
    if (range === '90d') return now - 90 * 24 * 60 * 60 * 1000;
    return 0;
  }, [range]);

  const scopedOrders = useMemo(() => {
    if (cutoffTimestamp === 0) return orders;
    return orders.filter(o => o.createdAt >= cutoffTimestamp);
  }, [orders, cutoffTimestamp]);

  const scopedPayments = useMemo(() => {
    if (cutoffTimestamp === 0) return payments;
    return payments.filter(p => p.createdAt >= cutoffTimestamp);
  }, [payments, cutoffTimestamp]);

  // Core Real Metrics
  const metrics = useMemo(() => {
    const validOrders = scopedOrders.filter(o => o.status !== 'canceled' && o.status !== 'refunded');
    const totalSpent = validOrders.reduce((sum, o) => sum + (o.charge || 0), 0);
    const totalQuantity = validOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const completed = scopedOrders.filter(o => o.status === 'completed').length;
    const inProgress = scopedOrders.filter(o => ['in_progress', 'processing'].includes(o.status)).length;
    const pending = scopedOrders.filter(o => o.status === 'pending').length;
    const canceled = scopedOrders.filter(o => ['canceled', 'refunded'].includes(o.status)).length;
    const completionRate =
      scopedOrders.length > 0 ? Math.round((completed / scopedOrders.length) * 100) : 0;
    const approvedDeposits = scopedPayments
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount + (p.bonus || 0), 0);

    return {
      totalOrders: scopedOrders.length,
      totalSpent,
      totalQuantity,
      completed,
      inProgress,
      pending,
      canceled,
      completionRate,
      approvedDeposits
    };
  }, [scopedOrders, scopedPayments]);

  // Daily / Bucketed Spending Series for Chart
  const dailySeries = useMemo(() => {
    const daysCount = range === '7d' ? 7 : 10;
    const buckets: { label: string; spend: number; count: number }[] = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const dayOrders = scopedOrders.filter(o => {
        const oKey = new Date(o.createdAt).toISOString().slice(0, 10);
        return oKey === dayKey && o.status !== 'canceled';
      });
      const spend = dayOrders.reduce((s, o) => s + o.charge, 0);
      buckets.push({ label, spend, count: dayOrders.length });
    }
    return buckets;
  }, [scopedOrders, range]);

  const maxDailySpend = useMemo(() => {
    return Math.max(...dailySeries.map(d => d.spend), 1);
  }, [dailySeries]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { category: string; spend: number; count: number }>();
    for (const o of scopedOrders) {
      if (o.status === 'canceled') continue;
      const cat = o.category || 'General';
      const cur = map.get(cat) || { category: cat, spend: 0, count: 0 };
      cur.spend += o.charge;
      cur.count += 1;
      map.set(cat, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 6);
  }, [scopedOrders]);

  return (
    <div className="space-y-5 pb-10 w-full max-w-6xl mx-auto">
      {/* Header & Date Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#F1F5F9] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#22D3EE]" />
            <span>
              {language === 'bn'
                ? 'অর্ডার ভলিউম ও খরচ অ্যানালিটিক্স'
                : 'Order Volume & Spending Analytics'}
            </span>
          </h2>
          <p className="text-xs text-[#94A3B8]">
            {language === 'bn'
              ? 'আপনার প্রকৃত অর্ডার ও ট্রানজেকশন ডেটার রিয়েল-টাইম বিশ্লেষণ'
              : 'Real-time operational telemetry derived from your actual order & wallet history'}
          </p>
        </div>

        {/* Date Range Pills */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#0D1220] border border-slate-800">
          {(
            [
              { id: '7d', label: language === 'bn' ? '৭ দিন' : '7 Days' },
              { id: '30d', label: language === 'bn' ? '৩০ দিন' : '30 Days' },
              { id: '90d', label: language === 'bn' ? '৯০ দিন' : '90 Days' },
              { id: 'all', label: language === 'bn' ? 'সব সময়' : 'All Time' }
            ] as const
          ).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                range === item.id
                  ? 'bg-[#8B5CF6] text-white shadow'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl glass-panel space-y-1">
          <span className="text-[11px] font-semibold text-[#94A3B8] flex items-center justify-between">
            <span>{language === 'bn' ? 'মোট অর্ডার খরচ' : 'Total Order Spend'}</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#8B5CF6]" />
          </span>
          <p className="text-xl sm:text-2xl font-extrabold font-mono text-[#F1F5F9] tabular-nums">
            {formatPrice(metrics.totalSpent)}
          </p>
          <span className="text-[10px] text-[#94A3B8] block">
            {metrics.totalOrders} {language === 'bn' ? 'টি অর্ডার' : 'orders in period'}
          </span>
        </div>

        <div className="p-4 rounded-3xl solid-panel space-y-1">
          <span className="text-[11px] font-semibold text-[#94A3B8] flex items-center justify-between">
            <span>{language === 'bn' ? 'মোট অর্ডার ইউনিট' : 'Total Volume Ordered'}</span>
            <Package className="w-3.5 h-3.5 text-[#22D3EE]" />
          </span>
          <p className="text-xl sm:text-2xl font-extrabold font-mono text-[#22D3EE] tabular-nums">
            {metrics.totalQuantity.toLocaleString()}
          </p>
          <span className="text-[10px] text-[#94A3B8] block">
            {language === 'bn' ? 'সর্বমোট সোশ্যাল ইউনিট' : 'Units across platforms'}
          </span>
        </div>

        <div className="p-4 rounded-3xl solid-panel space-y-1">
          <span className="text-[11px] font-semibold text-[#94A3B8] flex items-center justify-between">
            <span>{language === 'bn' ? 'সম্পন্ন হার' : 'Completion Rate'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
          </span>
          <p className="text-xl sm:text-2xl font-extrabold font-mono text-[#22C55E] tabular-nums">
            {metrics.completionRate}%
          </p>
          <span className="text-[10px] text-[#94A3B8] block">
            {metrics.completed} {language === 'bn' ? 'টি সম্পন্ন' : 'completed orders'}
          </span>
        </div>

        <div className="p-4 rounded-3xl solid-panel space-y-1">
          <span className="text-[11px] font-semibold text-[#94A3B8] flex items-center justify-between">
            <span>{language === 'bn' ? 'অনুমোদিত ডিপোজিট' : 'Approved Deposits'}</span>
            <Wallet className="w-3.5 h-3.5 text-[#F59E0B]" />
          </span>
          <p className="text-xl sm:text-2xl font-extrabold font-mono text-[#F1F5F9] tabular-nums">
            {formatPrice(metrics.approvedDeposits)}
          </p>
          <span className="text-[10px] text-[#94A3B8] block">
            {scopedPayments.length} {language === 'bn' ? 'টি ট্রানজেকশন' : 'transactions'}
          </span>
        </div>
      </div>

      {scopedOrders.length === 0 ? (
        <div className="p-10 rounded-3xl solid-panel text-center space-y-3">
          <BarChart3 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-[#F1F5F9]">
            {language === 'bn'
              ? 'এই সময়সীমায় কোনো অর্ডার ডেটা নেই'
              : 'No order telemetry recorded for this period'}
          </h3>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
            {language === 'bn'
              ? 'নতুন অর্ডার প্লেস করলে আপনার দৈনিক খরচ, অর্ডার ভলিউম এবং প্ল্যাটফর্ম বিশ্লেষণ এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।'
              : 'Place an order to populate real-time spending charts, status distribution, and category insights.'}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('new-order')}
            className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-bold text-xs shadow-lg"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'নতুন অর্ডার করুন' : 'Create New Order'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Spending & Order Trend Chart (7 Cols) */}
          <div className="lg:col-span-7 p-5 rounded-3xl solid-panel space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[#F1F5F9]">
                  {language === 'bn' ? 'দৈনিক খরচ ও অর্ডার ট্রেন্ড' : 'Daily Spending & Order Trend'}
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  {language === 'bn'
                    ? 'সাম্প্রতিক দিনগুলোর প্রকৃত অর্ডার চার্জ তুলনা'
                    : 'Actual daily expenditure across active orders'}
                </p>
              </div>
              <Calendar className="w-4 h-4 text-[#22D3EE]" />
            </div>

            <div className="h-52 flex items-end gap-2 pt-6 pb-2 px-1 border-b border-slate-800/80">
              {dailySeries.map((bucket, idx) => {
                const heightPct = Math.max(6, Math.round((bucket.spend / maxDailySpend) * 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 px-2 py-0.5 rounded bg-[#141B2B] border border-violet-500/40 text-[10px] font-mono text-white whitespace-nowrap pointer-events-none z-10">
                      {formatPrice(bucket.spend)} ({bucket.count})
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.4, delay: idx * 0.03, ease: 'easeOut' }}
                      className={`w-full max-w-[34px] rounded-t-xl transition-all ${
                        bucket.spend > 0
                          ? 'bg-gradient-to-t from-[#6D28D9] via-[#8B5CF6] to-[#22D3EE]'
                          : 'bg-[#141B2B]'
                      }`}
                    />
                    <span className="text-[9px] font-mono text-[#94A3B8] mt-2 truncate max-w-full">
                      {bucket.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Distribution & Top Categories (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Status Distribution */}
            <div className="p-5 rounded-3xl solid-panel space-y-3.5">
              <h3 className="text-sm font-extrabold text-[#F1F5F9]">
                {language === 'bn' ? 'অর্ডার স্ট্যাটাস অনুপাত' : 'Order Status Distribution'}
              </h3>

              <div className="space-y-2.5 text-xs">
                {[
                  {
                    label: language === 'bn' ? 'সম্পন্ন (Completed)' : 'Completed',
                    count: metrics.completed,
                    color: 'bg-[#22C55E]',
                    text: 'text-[#22C55E]'
                  },
                  {
                    label: language === 'bn' ? 'প্রসেসিং (In Progress)' : 'Processing / Active',
                    count: metrics.inProgress,
                    color: 'bg-[#22D3EE]',
                    text: 'text-[#22D3EE]'
                  },
                  {
                    label: language === 'bn' ? 'পেন্ডিং (Pending)' : 'Pending Queue',
                    count: metrics.pending,
                    color: 'bg-[#F59E0B]',
                    text: 'text-[#F59E0B]'
                  },
                  {
                    label: language === 'bn' ? 'বাতিল (Canceled)' : 'Canceled / Refunded',
                    count: metrics.canceled,
                    color: 'bg-[#F87171]',
                    text: 'text-[#F87171]'
                  }
                ].map((item, idx) => {
                  const pct =
                    metrics.totalOrders > 0
                      ? Math.round((item.count / metrics.totalOrders) * 100)
                      : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#94A3B8] font-medium">{item.label}</span>
                        <span className={`font-mono font-bold ${item.text}`}>
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#080B14] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.45 }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Spending Breakdown */}
            <div className="p-5 rounded-3xl solid-panel space-y-3">
              <h3 className="text-sm font-extrabold text-[#F1F5F9]">
                {language === 'bn' ? 'ক্যাটাগরি অনুযায়ী খরচ' : 'Top Categories by Spend'}
              </h3>
              <div className="space-y-2">
                {categoryBreakdown.map(cat => (
                  <div
                    key={cat.category}
                    className="p-2.5 rounded-2xl bg-[#080B14] border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#F1F5F9] truncate">{cat.category}</p>
                      <span className="text-[10px] text-[#94A3B8]">
                        {cat.count} {language === 'bn' ? 'টি অর্ডার' : 'orders'}
                      </span>
                    </div>
                    <span className="font-mono font-extrabold text-[#22D3EE] shrink-0">
                      {formatPrice(cat.spend)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
