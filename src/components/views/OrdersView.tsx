import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Download, 
  X 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMOrder, SMMRefill, OrderStatus } from '../../types';
import { requestRefill } from '../../services/db';

interface OrdersViewProps {
  orders: SMMOrder[];
  refills: SMMRefill[];
  onNavigateTab: (tabId: string, params?: any) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  refills,
  onNavigateTab,
  onShowToast
}) => {
  const { profile, language, formatPrice } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | OrderStatus | 'refills'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refillLoading, setRefillLoading] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SMMOrder | null>(null);

  const filterTabs = [
    { id: 'all', label: language === 'bn' ? 'সকল' : 'All' },
    { id: 'pending', label: language === 'bn' ? 'পেন্ডিং' : 'Pending' },
    { id: 'in_progress', label: language === 'bn' ? 'চলমান' : 'In Progress' },
    { id: 'completed', label: language === 'bn' ? 'সম্পন্ন' : 'Completed' },
    { id: 'partial', label: language === 'bn' ? 'আংশিক' : 'Partial' },
    { id: 'canceled', label: language === 'bn' ? 'বাতিল' : 'Canceled' },
    { id: 'refills', label: language === 'bn' ? 'রিফিল' : 'Refills' },
  ];

  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      const matchesFilter = activeFilter === 'all' 
        ? true 
        : activeFilter === 'in_progress'
        ? ['in_progress', 'processing'].includes(ord.status)
        : ord.status === activeFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        ord.id.toLowerCase().includes(q) ||
        ord.serviceName.toLowerCase().includes(q) ||
        ord.link.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, searchQuery]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} copied!`, 'info');
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      onShowToast(language === 'bn' ? 'এক্সপোর্ট করার মতো অর্ডার নেই' : 'No orders to export', 'info');
      return;
    }
    const headers = ['Order ID', 'Service', 'Category', 'Link', 'Quantity', 'Start Count', 'Remains', 'Charge (BDT)', 'Status', 'Created At'];
    const rows = filteredOrders.map(o => [
      o.id,
      `"${(o.serviceName || '').replace(/"/g, '""')}"`,
      o.category,
      `"${(o.link || '').replace(/"/g, '""')}"`,
      o.quantity,
      o.startCount ?? 0,
      o.remains ?? 0,
      o.charge,
      o.status,
      new Date(o.createdAt).toISOString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amartrend-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast(language === 'bn' ? 'অর্ডার রিপোর্ট CSV ডাউনলোড হয়েছে!' : 'Orders exported to CSV!', 'success');
  };

  const handleRequestRefill = async (ord: SMMOrder) => {
    if (!profile) return;
    setRefillLoading(ord.id);
    try {
      await requestRefill(ord.id, profile.uid, profile.email, ord.serviceName);
      onShowToast(
        language === 'bn' 
          ? `অর্ডার #${ord.id} এর রিফিল রিকোয়েস্ট জমা হয়েছে!` 
          : `Refill requested for order #${ord.id}!`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to request refill', 'error');
    } finally {
      setRefillLoading(null);
    }
  };

  const isOrderRefillRequested = (orderId: string) => {
    return refills.some(r => r.orderId === orderId && ['pending', 'refilling'].includes(r.status));
  };

  return (
    <div className="space-y-4 pb-8 w-full max-w-4xl mx-auto overflow-x-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-500" />
            {language === 'bn' ? 'অর্ডার হিস্টোরি' : 'Orders'}
          </h2>
          <p className="text-xs text-slate-400">
            {language === 'bn' ? `মোট ${orders.length} টি অর্ডার` : `${orders.length} total orders recorded`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="text-xs font-bold py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>CSV</span>
          </button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onNavigateTab('new-order')}
            className="text-xs font-bold py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all whitespace-nowrap shrink-0"
          >
            + {language === 'bn' ? 'নতুন অর্ডার' : 'New Order'}
          </motion.button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-full">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'bn' ? 'অর্ডার আইডি, সার্ভিস বা লিঙ্ক দিয়ে খুঁজুন...' : 'Search by ID, Service, or Link...'}
          className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Segmented Filter Control */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 w-full max-w-full">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          const count = tab.id === 'all' 
            ? orders.length 
            : tab.id === 'refills'
            ? refills.length
            : tab.id === 'in_progress'
            ? orders.filter(o => ['in_progress', 'processing'].includes(o.status)).length
            : orders.filter(o => o.status === tab.id).length;

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono tabular-nums px-1 rounded ${
                isActive ? 'bg-white/20 text-white' : 'text-slate-500'
              }`}>
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Refills View Tab */}
      {activeFilter === 'refills' ? (
        <div className="space-y-2">
          {refills.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <RefreshCw className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                {language === 'bn' ? 'কোনো রিফিল রিকোয়েস্ট পাওয়া যায়নি' : 'No refill requests recorded yet'}
              </p>
            </div>
          ) : (
            refills.map((refill) => (
              <div 
                key={refill.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">#{refill.id}</span>
                    <span className="text-slate-400 font-mono">Ref Order: #{refill.orderId}</span>
                  </div>
                  <p className="text-slate-200 font-medium mt-0.5 line-clamp-1">{refill.serviceName}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(refill.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className={`capitalize font-bold text-xs ${
                    refill.status === 'completed' ? 'text-emerald-400' :
                    refill.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {refill.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Orders List */
        <div className="space-y-2.5">
          {filteredOrders.length === 0 ? (
            <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                {language === 'bn' ? 'কোনো অর্ডার পাওয়া যায়নি' : 'No orders found'}
              </p>
              <button
                onClick={() => onNavigateTab('new-order')}
                className="py-2.5 px-5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md"
              >
                {language === 'bn' ? 'অর্ডার করুন' : 'Place an Order'}
              </button>
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const refillInProgress = isOrderRefillRequested(ord.id);

              return (
                <div
                  key={ord.id}
                  className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-2.5 hover:border-slate-750 transition-all text-xs"
                >
                  {/* Top Bar: ID, Category, Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                        #{ord.id}
                      </span>
                      <span className="text-[11px] font-semibold text-rose-400">
                        {ord.category}
                      </span>
                      {ord.providerOrderId && (
                        <span className="text-[10px] font-mono text-slate-500">
                          · {ord.providerOrderId}
                        </span>
                      )}
                    </div>

                    <span className={`capitalize font-bold text-xs ${
                      ord.status === 'completed' ? 'text-emerald-400' :
                      ord.status === 'in_progress' || ord.status === 'processing' ? 'text-amber-400' :
                      ord.status === 'partial' ? 'text-sky-400' :
                      ord.status === 'canceled' ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {ord.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Service Title */}
                  <h4 className="font-bold text-slate-100 leading-snug line-clamp-2">
                    {ord.serviceName}
                  </h4>

                  {/* Target Link */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300">
                    <span className="truncate">{ord.link}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(ord.link, 'Link')}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Copy"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={ord.link}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-white"
                        title="Open"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Bottom Strip: Qty, Start Count, Remains, Charge, Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/70 text-slate-400 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                      <span>Qty: <strong className="text-white">{ord.quantity.toLocaleString()}</strong></span>
                      <span>Start: <strong className="text-slate-300">{ord.startCount ?? 0}</strong></span>
                      <span>Remains: <strong className="text-amber-400">{ord.remains ?? 0}</strong></span>
                      <span>Charge: <strong className="text-emerald-400">{formatPrice(ord.charge)}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ord.status === 'completed' && (
                        refillInProgress ? (
                          <span className="text-[10px] text-amber-400 font-bold">Refilling...</span>
                        ) : (
                          <button
                            onClick={() => handleRequestRefill(ord)}
                            disabled={refillLoading === ord.id}
                            className="py-1 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] hover:bg-emerald-500/20 flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3 h-3 ${refillLoading === ord.id ? 'animate-spin' : ''}`} />
                            <span>Refill</span>
                          </button>
                        )
                      )}

                      <button
                        onClick={() => onNavigateTab('track-order', { orderId: ord.id })}
                        className="text-sky-400 font-semibold hover:underline"
                      >
                        Track
                      </button>

                      <button
                        onClick={() => setSelectedOrderDetails(ord)}
                        className="text-slate-300 font-semibold hover:text-white"
                      >
                        Info
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Sheet Modal for Order Details */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 text-white space-y-4 shadow-2xl animate-in slide-in-from-bottom-6">
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto my-1 sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-extrabold text-white">
                Order #{selectedOrderDetails.id}
              </h3>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong className="text-slate-400">Service:</strong> {selectedOrderDetails.serviceName}</p>
              <p><strong className="text-slate-400">Target URL:</strong> <span className="font-mono text-sky-400 break-all">{selectedOrderDetails.link}</span></p>
              <p><strong className="text-slate-400">Quantity:</strong> <span className="font-mono tabular-nums">{selectedOrderDetails.quantity.toLocaleString()}</span></p>
              <p><strong className="text-slate-400">Start Count:</strong> <span className="font-mono tabular-nums">{selectedOrderDetails.startCount ?? 0}</span> · <strong className="text-slate-400">Remains:</strong> <span className="font-mono tabular-nums">{selectedOrderDetails.remains ?? 0}</span></p>
              <p><strong className="text-slate-400">Charge:</strong> <span className="text-emerald-400 font-mono font-bold tabular-nums">{formatPrice(selectedOrderDetails.charge)}</span></p>
              <p><strong className="text-slate-400">Status:</strong> <span className="capitalize font-bold text-amber-300">{selectedOrderDetails.status}</span></p>
              {selectedOrderDetails.customComments && (
                <div>
                  <strong className="text-slate-400 block mb-1">Custom Comments:</strong>
                  <pre className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                    {selectedOrderDetails.customComments}
                  </pre>
                </div>
              )}
              <p><strong className="text-slate-400">Placed on:</strong> {new Date(selectedOrderDetails.createdAt).toLocaleString()}</p>
            </div>

            <button
              onClick={() => {
                const id = selectedOrderDetails.id;
                setSelectedOrderDetails(null);
                onNavigateTab('track-order', { orderId: id });
              }}
              className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
            >
              Track Live Delivery
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
