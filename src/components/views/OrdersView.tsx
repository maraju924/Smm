import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  RotateCcw,
  Ban,
  MessageSquare,
  X,
  ArrowUpRight,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SMMOrder, OrderStatus, SMMRefill } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { requestRefill, updateOrderStatus } from '../../services/db';

interface OrdersViewProps {
  orders: SMMOrder[];
  refills?: SMMRefill[];
  onNavigateTab: (tab: string, params?: { serviceId?: string; category?: string; orderId?: string }) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  refills = [],
  onNavigateTab,
  onShowToast
}) => {
  const { formatPrice, t, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingRefillId, setLoadingRefillId] = useState<string | null>(null);
  const [loadingCancelId, setLoadingCancelId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SMMOrder | null>(null);

  const formatOrderDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const refillMap = useMemo(() => {
    const map: Record<string, SMMRefill> = {};
    refills.forEach((r) => {
      map[r.orderId] = r;
    });
    return map;
  }, [refills]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: orders.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
      partial: 0,
      canceled: 0,
      REFILL: refills.length
    };
    orders.forEach((o) => {
      const st = o.status === 'processing' ? 'in_progress' : o.status;
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [orders, refills]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.serviceName.toLowerCase().includes(q) ||
        order.link.toLowerCase().includes(q);

      if (statusFilter === 'ALL') return matchesSearch;
      if (statusFilter === 'REFILL') return matchesSearch && Boolean(refillMap[order.id]);
      if (statusFilter === 'in_progress') {
        return (
          matchesSearch &&
          (order.status === 'in_progress' || order.status === 'processing')
        );
      }
      return matchesSearch && order.status === statusFilter;
    });
  }, [orders, searchQuery, statusFilter, refillMap]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast?.(t(`#${id} কপি করা হয়েছে`, `Copied #${id}`), 'info');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleRefillRequest = async (order: SMMOrder) => {
    if (!user) return;
    if (refillMap[order.id]) {
      onShowToast?.(t('এই অর্ডারের রিফিল রিকোয়েস্ট ইতিমধ্যে প্রসেসিংয়ে আছে।', 'Refill request already submitted.'), 'info');
      return;
    }

    setLoadingRefillId(order.id);
    try {
      await requestRefill(order.id, user.uid, user.email || '', order.serviceName);
      onShowToast?.(t(`অর্ডার #${order.id}-এর রিফিল রিকোয়েস্ট জমা হয়েছে!`, `Refill requested for #${order.id}`), 'success');
    } catch (err: any) {
      onShowToast?.(err.message || t('রিফিল রিকোয়েস্ট ব্যর্থ হয়েছে', 'Refill request failed'), 'error');
    } finally {
      setLoadingRefillId(null);
    }
  };

  const handleCancelOrder = async (order: SMMOrder) => {
    if (!user) return;
    setLoadingCancelId(order.id);
    try {
      await updateOrderStatus(order.id, 'canceled', order);
      onShowToast?.(
        t(
          `অর্ডার #${order.id} বাতিল করা হয়েছে এবং ${formatPrice(order.charge)} ওয়ালেটে ফেরত দেওয়া হয়েছে!`,
          `Order #${order.id} cancelled and ${formatPrice(order.charge)} refunded!`
        ),
        'success'
      );
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      onShowToast?.(err.message || t('অর্ডার বাতিল করা সম্ভব হয়নি', 'Could not cancel order'), 'error');
    } finally {
      setLoadingCancelId(null);
    }
  };

  const getStatusMeta = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: t('সম্পন্ন', 'Completed'),
          color: 'text-[#22C55E]',
          bg: 'bg-[#22C55E]/10 border-[#22C55E]/25',
          progress: 100,
          barColor: 'bg-[#22C55E]',
          icon: CheckCircle2
        };
      case 'in_progress':
      case 'processing':
        return {
          label: t('চলমান', 'In Progress'),
          color: 'text-[#22D3EE]',
          bg: 'bg-[#22D3EE]/10 border-[#22D3EE]/25',
          progress: 65,
          barColor: 'bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE]',
          icon: RefreshCw
        };
      case 'pending':
        return {
          label: t('পেন্ডিং', 'Pending'),
          color: 'text-[#F59E0B]',
          bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/25',
          progress: 22,
          barColor: 'bg-[#F59E0B]',
          icon: Clock
        };
      case 'partial':
        return {
          label: t('আংশিক', 'Partial'),
          color: 'text-[#8B5CF6]',
          bg: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/25',
          progress: 50,
          barColor: 'bg-[#8B5CF6]',
          icon: AlertTriangle
        };
      case 'canceled':
      case 'refunded':
        return {
          label: t('বাতিল', 'Cancelled'),
          color: 'text-[#F87171]',
          bg: 'bg-[#F87171]/10 border-[#F87171]/25',
          progress: 0,
          barColor: 'bg-[#F87171]',
          icon: XCircle
        };
      default:
        return {
          label: status,
          color: 'text-[#94A3B8]',
          bg: 'bg-white/[0.04] border-white/[0.08]',
          progress: 10,
          barColor: 'bg-[#94A3B8]',
          icon: Clock
        };
    }
  };

  const statusTabs = [
    { id: 'ALL', label: t('সব অর্ডার', 'All Orders'), count: statusCounts.ALL },
    { id: 'pending', label: t('পেন্ডিং', 'Pending'), count: statusCounts.pending || 0 },
    { id: 'in_progress', label: t('চলমান', 'In Progress'), count: statusCounts.in_progress || 0 },
    { id: 'completed', label: t('সম্পন্ন', 'Completed'), count: statusCounts.completed || 0 },
    { id: 'partial', label: t('আংশিক', 'Partial'), count: statusCounts.partial || 0 },
    { id: 'canceled', label: t('বাতিল', 'Cancelled'), count: statusCounts.canceled || 0 },
    { id: 'REFILL', label: t('রিফিল', 'Refill'), count: statusCounts.REFILL || 0 }
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] tracking-tight">
            {t('অর্ডার হিস্ট্রি ও ট্র্যাকিং', 'Orders & Live Tracking')}
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            {t('আপনার সকল অর্ডারের লাইভ অগ্রগতি, রিফিল ও ডেলিভারি স্ট্যাটাস', 'Monitor real-time delivery progress, request refills, or repeat orders')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('track-order')}
            className="px-3.5 py-2.5 rounded-xl bg-[#141B2B] hover:bg-[#192337] text-[#F1F5F9] text-xs font-semibold border border-white/[0.08] flex items-center gap-1.5 transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
            {t('লাইভ ট্র্যাকার', 'Live Tracker')}
          </button>
          <button
            onClick={() => onNavigateTab('new-order')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-[#8B5CF6]/25 transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            {t('নতুন অর্ডার', 'New Order')}
          </button>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0D1220] border border-white/[0.07] space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('অর্ডার আইডি (#ID), লিংক বা সার্ভিসের নাম দিয়ে খুঁজুন...', 'Search by Order ID, target link, or service name...')}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#141B2B] border border-white/[0.07] text-xs sm:text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 px-1 text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8B5CF6]" />
              {t('ফলাফল:', 'Showing:')} <strong className="font-mono text-[#F1F5F9]">{filteredOrders.length}</strong>
            </span>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                  active
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]/50 shadow-sm shadow-[#8B5CF6]/25'
                    : 'bg-[#141B2B]/90 text-[#94A3B8] border-white/[0.06] hover:text-[#F1F5F9]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                    active ? 'bg-black/25 text-white' : 'bg-[#080B14] text-[#64748B]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl bg-[#0D1220] border border-white/[0.07] p-12 text-center max-w-lg mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-[#141B2B] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-[#8B5CF6]">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F1F5F9] mb-1">
            {t('কোনো অর্ডার পাওয়া যায়নি', 'No matching orders found')}
          </h3>
          <p className="text-xs text-[#94A3B8] mb-5 leading-relaxed">
            {searchQuery || statusFilter !== 'ALL'
              ? t('আপনার ফিল্টার বা সার্চ কিওয়ার্ড পরিবর্তন করে আবার চেষ্টা করুন।', 'Try clearing your search filter or switching status tabs.')
              : t('আপনি এখনো কোনো অর্ডার করেননি। নতুন অর্ডার দিয়ে আপনার সোশ্যাল মিডিয়া বুস্ট শুরু করুন।', 'You have not placed any orders yet. Place your first order to see live tracking here.')}
          </p>
          {searchQuery || statusFilter !== 'ALL' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="px-4 py-2.5 rounded-xl bg-[#141B2B] hover:bg-[#192337] text-xs font-semibold text-[#F1F5F9] border border-white/[0.08]"
            >
              {t('সকল ফিল্টার মুছুন', 'Reset Filters')}
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('new-order')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-[#8B5CF6]/25"
            >
              {t('প্রথম অর্ডার করুন', 'Place First Order')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* DESKTOP OPERATIONAL TABLE VIEW (lg+) */}
          <div className="hidden lg:block rounded-2xl bg-[#0D1220] border border-white/[0.07] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.07] bg-[#141B2B]/60 text-[11px] font-semibold text-[#94A3B8]">
                    <th className="py-3.5 px-4">{t('অর্ডার আইডি ও তারিখ', 'Order ID & Date')}</th>
                    <th className="py-3.5 px-4">{t('সার্ভিস ও টার্গেট লিংক', 'Service & Target Link')}</th>
                    <th className="py-3.5 px-4 text-right">{t('স্টার্ট / পরিমাণ', 'Start / Qty')}</th>
                    <th className="py-3.5 px-4 text-right">{t('বাকি (Remains)', 'Remains')}</th>
                    <th className="py-3.5 px-4 text-right">{t('চার্জ', 'Charge')}</th>
                    <th className="py-3.5 px-4">{t('স্ট্যাটাস ও অগ্রগতি', 'Status & Progress')}</th>
                    <th className="py-3.5 px-4 text-right">{t('অ্যাকশন', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs">
                  {filteredOrders.map((order) => {
                    const meta = getStatusMeta(order.status);
                    const StatusIcon = meta.icon;
                    const refill = refillMap[order.id];
                    const remains = order.remains ?? (order.status === 'completed' ? 0 : order.quantity);

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-[#141B2B]/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#F1F5F9] group-hover:text-[#22D3EE] transition-colors">
                              #{order.id}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(order.id, order.id);
                              }}
                              className="p-1 rounded-md hover:bg-white/[0.08] text-[#64748B] hover:text-[#F1F5F9]"
                              title="Copy Order ID"
                            >
                              {copiedId === order.id ? (
                                <Check className="w-3 h-3 text-[#22C55E]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-[#64748B] mt-0.5 font-mono">
                            {formatOrderDate(order.createdAt)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top max-w-md">
                          <p className="font-semibold text-[#F1F5F9] line-clamp-1">
                            <span className="font-mono text-[#8B5CF6] mr-1.5">#{order.serviceId}</span>
                            {order.serviceName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#94A3B8]">
                            <span className="truncate max-w-[280px] font-mono">{order.link}</span>
                            <a
                              href={order.link.startsWith('http') ? order.link : `https://${order.link}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#22D3EE] hover:underline shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top text-right font-mono whitespace-nowrap">
                          <div className="text-[#F1F5F9] font-semibold">{order.quantity.toLocaleString()}</div>
                          <div className="text-[11px] text-[#64748B]">
                            Start: {order.startCount !== undefined ? order.startCount.toLocaleString() : '0'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top text-right font-mono whitespace-nowrap text-[#94A3B8]">
                          {remains.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 align-top text-right font-mono font-bold text-[#22D3EE] whitespace-nowrap">
                          {formatPrice(order.charge)}
                        </td>

                        <td className="py-3.5 px-4 align-top w-44">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${meta.color}`}>
                              <StatusIcon className={`w-3.5 h-3.5 ${order.status === 'in_progress' ? 'animate-spin' : ''}`} />
                              {meta.label}
                            </span>
                            <span className="font-mono text-[10px] text-[#64748B]">{meta.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#080B14] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${meta.barColor} transition-all duration-500`}
                              style={{ width: `${meta.progress}%` }}
                            />
                          </div>
                          {refill && (
                            <div className="mt-1 text-[10px] font-mono text-[#22D3EE]">
                              Refill: {refill.status}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => onNavigateTab('new-order', { serviceId: order.serviceId })}
                              className="px-2.5 py-1.5 rounded-lg bg-[#141B2B] hover:bg-[#192337] text-[#F1F5F9] text-[11px] font-medium border border-white/[0.07] transition-colors"
                              title={t('পুনরায় অর্ডার করুন', 'Repeat Order')}
                            >
                              {t('পুনরায়', 'Repeat')}
                            </button>

                            {order.status === 'completed' && (
                              <button
                                type="button"
                                disabled={loadingRefillId === order.id || Boolean(refill)}
                                onClick={() => handleRefillRequest(order)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#22D3EE]/10 hover:bg-[#22D3EE]/20 text-[#22D3EE] text-[11px] font-medium border border-[#22D3EE]/25 disabled:opacity-50 transition-colors"
                              >
                                {refill ? t('রিফিল পাঠানো', 'Refill Sent') : t('রিফিল', 'Refill')}
                              </button>
                            )}

                            {order.status === 'pending' && !order.providerOrderId && (
                              <button
                                type="button"
                                disabled={loadingCancelId === order.id}
                                onClick={() => handleCancelOrder(order)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#F87171]/10 hover:bg-[#F87171]/20 text-[#F87171] text-[11px] font-medium border border-[#F87171]/25 disabled:opacity-50 transition-colors"
                              >
                                {t('বাতিল', 'Cancel')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE & TABLET NATIVE ORDER CARDS (<lg) */}
          <div className="lg:hidden space-y-3">
            {filteredOrders.map((order) => {
              const meta = getStatusMeta(order.status);
              const StatusIcon = meta.icon;
              const refill = refillMap[order.id];

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="p-4 rounded-2xl bg-[#0D1220] border border-white/[0.07] active:scale-[0.99] transition-all space-y-3 cursor-pointer"
                >
                  {/* Top Row: ID + Date + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#F1F5F9] bg-[#141B2B] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                        #{order.id}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(order.id, order.id);
                        }}
                        className="p-1.5 rounded-lg bg-[#141B2B] text-[#94A3B8]"
                      >
                        {copiedId === order.id ? (
                          <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="text-[11px] text-[#64748B] font-mono">{formatOrderDate(order.createdAt)}</span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${meta.bg} ${meta.color}`}>
                      <StatusIcon className={`w-3 h-3 ${order.status === 'in_progress' ? 'animate-spin' : ''}`} />
                      {meta.label}
                    </span>
                  </div>

                  {/* Service Name & Target Link */}
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-[#F1F5F9] leading-snug">
                      <span className="font-mono text-[#8B5CF6] mr-1.5">#{order.serviceId}</span>
                      {order.serviceName}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] font-mono truncate mt-1">{order.link}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-[#080B14] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.barColor}`}
                        style={{ width: `${meta.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.05] text-center">
                    <div className="p-2 rounded-xl bg-[#141B2B]/60">
                      <p className="text-[10px] text-[#64748B]">{t('পরিমাণ', 'Quantity')}</p>
                      <p className="font-mono text-xs font-bold text-[#F1F5F9] mt-0.5">{order.quantity.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-[#141B2B]/60">
                      <p className="text-[10px] text-[#64748B]">{t('স্টার্ট কাউন্ট', 'Start Count')}</p>
                      <p className="font-mono text-xs font-bold text-[#F1F5F9] mt-0.5">
                        {order.startCount !== undefined ? order.startCount.toLocaleString() : '0'}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-[#141B2B]/60">
                      <p className="text-[10px] text-[#64748B]">{t('চার্জ', 'Charge')}</p>
                      <p className="font-mono text-xs font-bold text-[#22D3EE] mt-0.5">{formatPrice(order.charge)}</p>
                    </div>
                  </div>

                  {/* Quick Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="text-[11px] font-semibold text-[#94A3B8] hover:text-[#F1F5F9] flex items-center gap-1"
                    >
                      {t('বিস্তারিত টাইমলাইন', 'View Timeline')}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onNavigateTab('new-order', { serviceId: order.serviceId })}
                        className="px-3 py-1.5 rounded-xl bg-[#141B2B] text-[#F1F5F9] text-[11px] font-semibold border border-white/[0.07] flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 text-[#8B5CF6]" />
                        {t('পুনরায় অর্ডার', 'Repeat')}
                      </button>

                      {order.status === 'completed' && (
                        <button
                          type="button"
                          disabled={loadingRefillId === order.id || Boolean(refill)}
                          onClick={() => handleRefillRequest(order)}
                          className="px-3 py-1.5 rounded-xl bg-[#22D3EE]/10 text-[#22D3EE] text-[11px] font-semibold border border-[#22D3EE]/25 disabled:opacity-50"
                        >
                          {refill ? t('রিফিল প্রসেসিং', 'Refill Active') : t('রিফিল', 'Refill')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ORDER DETAIL DRAWER / MODAL WITH VERTICAL TIMELINE */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#0D1220] border border-white/[0.1] shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/[0.07] flex items-center justify-between bg-[#141B2B]/60">
                <div>
                  <span className="text-[11px] font-mono text-[#22D3EE]">
                    {t('অর্ডার ইন্সপেক্টর', 'ORDER INSPECTOR')}
                  </span>
                  <h3 className="text-base font-bold text-[#F1F5F9] font-mono mt-0.5">
                    #{selectedOrder.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#94A3B8] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-5">
                {/* Vertical Progress Timeline */}
                <div className="p-4 rounded-2xl bg-[#141B2B]/80 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-[#F1F5F9] mb-3">
                    {t('ডেলিভারি টাইমলাইন', 'Delivery Progress Timeline')}
                  </p>
                  <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
                    {[
                      {
                        step: t('অর্ডার গ্রহণ করা হয়েছে', 'Order Placed & Verified'),
                        desc: formatOrderDate(selectedOrder.createdAt),
                        done: true
                      },
                      {
                        step: t('সার্ভারে প্রসেসিং শুরু', 'Dispatched to Processing Server'),
                        desc: t('স্বয়ংক্রিয়ভাবে এপিআই সার্ভারে পাঠানো হয়েছে', 'Synced with delivery server'),
                        done: selectedOrder.status !== 'canceled'
                      },
                      {
                        step: t('ডেলিভারি চলমান', 'In Progress / Delivering'),
                        desc: `${t('স্টার্ট কাউন্ট:', 'Start Count:')} ${selectedOrder.startCount ?? 0}`,
                        done:
                          selectedOrder.status === 'in_progress' ||
                          selectedOrder.status === 'processing' ||
                          selectedOrder.status === 'completed'
                      },
                      {
                        step:
                          selectedOrder.status === 'canceled'
                            ? t('অর্ডার বাতিল ও রিফান্ড সম্পন্ন', 'Order Cancelled & Refunded')
                            : t('সম্পন্ন (Completed)', 'Delivery Completed'),
                        desc:
                          selectedOrder.status === 'completed'
                            ? t('১০০% ডেলিভারি সম্পন্ন হয়েছে', '100% quantity delivered')
                            : selectedOrder.status === 'canceled'
                            ? t('ব্যালেন্স ওয়ালেটে ফেরত দেওয়া হয়েছে', 'Refund credited to wallet')
                            : t('ডেলিভারি শেষ হওয়ার অপেক্ষায়', 'Awaiting final completion'),
                        done:
                          selectedOrder.status === 'completed' ||
                          selectedOrder.status === 'canceled'
                      }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 relative z-10">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 border ${
                            item.done
                              ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/40'
                              : 'bg-[#080B14] border-white/[0.15] text-[#64748B]'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${item.done ? 'text-[#F1F5F9]' : 'text-[#64748B]'}`}>
                            {item.step}
                          </p>
                          <p className="text-[11px] text-[#94A3B8]">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#141B2B]/50 border border-white/[0.06]">
                    <span className="text-[#94A3B8] block mb-1">{t('সার্ভিস', 'Service')}</span>
                    <span className="font-semibold text-[#F1F5F9]">
                      #{selectedOrder.serviceId} — {selectedOrder.serviceName}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#141B2B]/50 border border-white/[0.06] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[#94A3B8] block mb-1">{t('টার্গেট লিংক', 'Target Link')}</span>
                      <span className="font-mono text-[#22D3EE] truncate block">{selectedOrder.link}</span>
                    </div>
                    <a
                      href={selectedOrder.link.startsWith('http') ? selectedOrder.link : `https://${selectedOrder.link}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-[#192337] text-[#F1F5F9] hover:text-[#22D3EE] shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#141B2B]/50 border border-white/[0.06]">
                      <span className="text-[11px] text-[#94A3B8] block">{t('পরিমাণ', 'Quantity')}</span>
                      <span className="font-mono font-bold text-sm text-[#F1F5F9] mt-0.5 block">
                        {selectedOrder.quantity.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#141B2B]/50 border border-white/[0.06]">
                      <span className="text-[11px] text-[#94A3B8] block">{t('স্টার্ট কাউন্ট', 'Start Count')}</span>
                      <span className="font-mono font-bold text-sm text-[#F1F5F9] mt-0.5 block">
                        {(selectedOrder.startCount ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#141B2B]/50 border border-white/[0.06]">
                      <span className="text-[11px] text-[#94A3B8] block">{t('বাকি আছে', 'Remains')}</span>
                      <span className="font-mono font-bold text-sm text-[#F1F5F9] mt-0.5 block">
                        {(selectedOrder.remains ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#141B2B]/50 border border-white/[0.06]">
                      <span className="text-[11px] text-[#94A3B8] block">{t('মোট খরচ', 'Charge')}</span>
                      <span className="font-mono font-bold text-sm text-[#22D3EE] mt-0.5 block">
                        {formatPrice(selectedOrder.charge)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const srvId = selectedOrder.serviceId;
                      setSelectedOrder(null);
                      onNavigateTab('new-order', { serviceId: srvId });
                    }}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/25"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('পুনরায় অর্ডার করুন', 'Repeat This Order')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(null);
                      onNavigateTab('tickets');
                    }}
                    className="py-3 px-4 rounded-xl bg-[#141B2B] hover:bg-[#192337] text-[#F1F5F9] font-semibold text-xs border border-white/[0.08] flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-[#22D3EE]" />
                    {t('সাপোর্ট টিকিট খুলুন', 'Open Support Ticket')}
                  </button>

                  {selectedOrder.status === 'completed' && (
                    <button
                      type="button"
                      disabled={loadingRefillId === selectedOrder.id || Boolean(refillMap[selectedOrder.id])}
                      onClick={() => handleRefillRequest(selectedOrder)}
                      className="col-span-2 py-2.5 px-4 rounded-xl bg-[#22D3EE]/10 hover:bg-[#22D3EE]/20 text-[#22D3EE] font-semibold text-xs border border-[#22D3EE]/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {refillMap[selectedOrder.id]
                        ? t('রিফিল রিকোয়েস্ট প্রসেসিংয়ে আছে', 'Refill Request Active')
                        : t('ফ্রি রিফিল রিকোয়েস্ট পাঠান', 'Request Refill Guarantee')}
                    </button>
                  )}

                  {selectedOrder.status === 'pending' && !selectedOrder.providerOrderId && (
                    <button
                      type="button"
                      disabled={loadingCancelId === selectedOrder.id}
                      onClick={() => handleCancelOrder(selectedOrder)}
                      className="col-span-2 py-2.5 px-4 rounded-xl bg-[#F87171]/10 hover:bg-[#F87171]/20 text-[#F87171] font-semibold text-xs border border-[#F87171]/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4" />
                      {t('অর্ডার বাতিল ও রিফান্ড নিন', 'Cancel Order & Refund to Wallet')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
