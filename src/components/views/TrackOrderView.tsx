import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Server,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SMMOrder } from '../../types';
import { fetchOrderByIdFromServer } from '../../services/db';

interface TrackOrderViewProps {
  orders: SMMOrder[];
  initialOrderId?: string;
  onNavigateTab: (tabId: string) => void;
}

export const TrackOrderView: React.FC<TrackOrderViewProps> = ({
  orders,
  initialOrderId,
  onNavigateTab
}) => {
  const { language, formatPrice } = useAuth();
  const [orderIdInput, setOrderIdInput] = useState(initialOrderId || '');
  const [searchedOrder, setSearchedOrder] = useState<SMMOrder | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingServer, setLoadingServer] = useState(false);

  useEffect(() => {
    if (initialOrderId) {
      setOrderIdInput(initialOrderId);
      handleSearch(initialOrderId);
    }
  }, [initialOrderId, orders]);

  const handleSearch = async (idToSearch = orderIdInput) => {
    const cleaned = idToSearch.trim();
    if (!cleaned) return;

    setHasSearched(true);
    setLoadingServer(true);

    try {
      // First check live server directly for authoritative state
      const serverOrd = await fetchOrderByIdFromServer(cleaned);
      if (serverOrd) {
        setSearchedOrder(serverOrd);
      } else {
        const localMatch = orders.find(o => o.id.toLowerCase() === cleaned.toLowerCase());
        setSearchedOrder(localMatch || null);
      }
    } finally {
      setLoadingServer(false);
    }
  };

  const getStageIndex = (status: SMMOrder['status']) => {
    switch (status) {
      case 'pending': return 1;
      case 'processing': return 2;
      case 'in_progress': return 3;
      case 'completed': return 4;
      default: return 1;
    }
  };

  const stages = [
    { title: language === 'bn' ? 'অর্ডার গ্রহণ' : 'Order Placed', desc: 'Received in system' },
    { title: language === 'bn' ? 'সার্ভার কিউ' : 'In Queue', desc: 'Allocating network nodes' },
    { title: language === 'bn' ? 'চলমান' : 'Delivering', desc: 'Progressively delivering' },
    { title: language === 'bn' ? 'সম্পন্ন' : 'Completed', desc: 'Verified and completed' }
  ];

  const currentStage = searchedOrder ? getStageIndex(searchedOrder.status) : 1;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-8 overflow-x-hidden">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-sky-400" />
          {language === 'bn' ? 'লাইভ সার্ভার অর্ডার ট্র্যাকার' : 'Live Server Order Tracker'}
        </h2>
        <p className="text-xs text-slate-400">
          {language === 'bn' 
            ? 'আপনার Order ID দিয়ে সরাসরি ক্লাউড সার্ভার থেকে অর্ডারের রিয়েল-টাইম ডেলিভারি স্টেজ দেখুন' 
            : 'Query real-time order delivery telemetry directly from the cloud server'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 flex gap-2 shadow-lg">
        <input
          type="text"
          value={orderIdInput}
          onChange={(e) => setOrderIdInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="ORD-123456"
          className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          onClick={() => handleSearch()}
          disabled={loadingServer}
          className="py-2 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5"
        >
          {loadingServer && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          <span>{language === 'bn' ? 'সার্চ' : 'Track'}</span>
        </button>
      </div>

      {/* Result */}
      {hasSearched && !loadingServer && !searchedOrder && (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2 animate-in fade-in">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h4 className="text-sm font-bold text-white">
            {language === 'bn' ? 'সার্ভারে অর্ডারটি পাওয়া যায়নি' : 'Order Not Found on Server'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {language === 'bn' 
              ? 'দয়া করে সঠিক Order ID দিয়েছেন কিনা নিশ্চিত করুন (যেমন: ORD-123456)।' 
              : 'Please double-check the Order ID or view your orders history.'}
          </p>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-bold text-rose-400 hover:underline pt-2 block mx-auto"
          >
            {language === 'bn' ? 'আমার অর্ডার লিস্ট দেখুন' : 'Go to My Orders'}
          </button>
        </div>
      )}

      {searchedOrder && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-emerald-400" />
                Live Server Record
              </span>
              <h3 className="font-mono text-base font-extrabold text-white mt-0.5">
                #{searchedOrder.id}
              </h3>
            </div>
            <span className={`py-1 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider ${
              searchedOrder.status === 'completed'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : searchedOrder.status === 'in_progress' || searchedOrder.status === 'processing'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : searchedOrder.status === 'canceled'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {searchedOrder.status.replace('_', ' ')}
            </span>
          </div>

          {/* Visual 4-Step Progress Tracker */}
          <div className="py-2">
            <div className="relative flex items-center justify-between">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500" 
                style={{ width: `${((currentStage - 1) / 3) * 100}%` }}
              />

              {stages.map((stage, idx) => {
                const stepNum = idx + 1;
                const isPassed = stepNum <= currentStage;
                const isCurrent = stepNum === currentStage;

                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isPassed 
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-105' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {isPassed ? <CheckCircle2 className="w-4 h-4 stroke-[3]" /> : stepNum}
                    </div>
                    <span className={`text-[10px] mt-2 font-bold text-center ${
                      isCurrent ? 'text-white' : isPassed ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {stage.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details breakdown */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <p><strong className="text-slate-400">Service:</strong> {searchedOrder.serviceName}</p>
            <p><strong className="text-slate-400">Target Link:</strong> <span className="font-mono text-sky-400 break-all">{searchedOrder.link}</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] font-bold">Quantity</span>
                <span className="font-bold text-white font-mono">{searchedOrder.quantity.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-bold">Start Count</span>
                <span className="font-bold text-slate-200 font-mono">{searchedOrder.startCount ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-bold">Remains</span>
                <span className="font-bold text-amber-400 font-mono">{searchedOrder.remains ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-bold">Charge</span>
                <span className="font-bold text-emerald-400 font-mono">{formatPrice(searchedOrder.charge)}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              Placed on: {new Date(searchedOrder.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
