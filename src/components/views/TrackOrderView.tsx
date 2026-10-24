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
import { fetchOrderByIdFromServer, syncActiveOrdersWithProviders } from '../../services/db';

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
      let serverOrd = await fetchOrderByIdFromServer(cleaned);
      if (serverOrd && ['pending', 'processing', 'in_progress'].includes(serverOrd.status) && serverOrd.providerId && serverOrd.providerOrderId) {
        await syncActiveOrdersWithProviders([serverOrd]);
        const refreshedOrd = await fetchOrderByIdFromServer(cleaned);
        if (refreshedOrd) serverOrd = refreshedOrd;
      }

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
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-10 overflow-x-hidden">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#22D3EE]" />
          {language === 'bn' ? 'লাইভ সার্ভার অর্ডার ট্র্যাকার' : 'Live Server Order Tracker'}
        </h2>
        <p className="text-xs text-[#94A3B8] mt-0.5">
          {language === 'bn' 
            ? 'আপনার Order ID দিয়ে সরাসরি ক্লাউড সার্ভার থেকে অর্ডারের রিয়েল-টাইম ডেলিভারি স্টেজ দেখুন' 
            : 'Query real-time order delivery telemetry directly from the cloud server'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-2 rounded-2xl bg-[#0D1220] border border-white/[0.08] flex gap-2 shadow-lg">
        <input
          type="text"
          value={orderIdInput}
          onChange={(e) => setOrderIdInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="ORD-123456"
          className="flex-1 bg-transparent px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none"
        />
        <button
          onClick={() => handleSearch()}
          disabled={loadingServer}
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-[#8B5CF6]/25"
        >
          {loadingServer && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          <span>{language === 'bn' ? 'ট্র্যাক করুন' : 'Track Order'}</span>
        </button>
      </div>

      {/* Result */}
      {hasSearched && !loadingServer && !searchedOrder && (
        <div className="p-10 text-center bg-[#0D1220] border border-white/[0.08] rounded-3xl space-y-2 animate-in fade-in">
          <AlertCircle className="w-8 h-8 text-[#F59E0B] mx-auto" />
          <h4 className="text-sm font-bold text-[#F1F5F9]">
            {language === 'bn' ? 'সার্ভারে অর্ডারটি পাওয়া যায়নি' : 'Order Not Found on Server'}
          </h4>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
            {language === 'bn' 
              ? 'দয়া করে সঠিক Order ID দিয়েছেন কিনা নিশ্চিত করুন (যেমন: ORD-123456)।' 
              : 'Please double-check the Order ID or view your orders history.'}
          </p>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-bold text-[#22D3EE] hover:underline pt-2 block mx-auto"
          >
            {language === 'bn' ? 'আমার অর্ডার লিস্ট দেখুন' : 'Go to My Orders'}
          </button>
        </div>
      )}

      {searchedOrder && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-5 shadow-xl animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
            <div>
              <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-[#22C55E]" />
                Live Server Record
              </span>
              <h3 className="font-mono text-base font-extrabold text-[#F1F5F9] mt-0.5">
                #{searchedOrder.id}
              </h3>
            </div>
            <span className={`py-1 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider ${
              searchedOrder.status === 'completed'
                ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                : searchedOrder.status === 'in_progress' || searchedOrder.status === 'processing'
                ? 'bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30'
                : searchedOrder.status === 'canceled'
                ? 'bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30'
                : 'bg-[#141B2B] text-[#94A3B8]'
            }`}>
              {searchedOrder.status.replace('_', ' ')}
            </span>
          </div>

          {/* Visual 4-Step Progress Tracker */}
          <div className="py-2">
            <div className="relative flex items-center justify-between">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#141B2B] -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] -translate-y-1/2 z-0 transition-all duration-500" 
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
                        ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30 scale-105' 
                        : 'bg-[#141B2B] text-[#64748B] border border-white/[0.1]'
                    }`}>
                      {isPassed ? <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> : stepNum}
                    </div>
                    <span className={`text-[10px] mt-2 font-bold text-center ${
                      isCurrent ? 'text-[#F1F5F9]' : isPassed ? 'text-[#94A3B8]' : 'text-[#64748B]'
                    }`}>
                      {stage.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details breakdown */}
          <div className="p-4 rounded-2xl bg-[#141B2B]/70 border border-white/[0.06] space-y-2.5 text-xs">
            <p><strong className="text-[#94A3B8]">Service:</strong> <span className="text-[#F1F5F9] font-semibold">{searchedOrder.serviceName}</span></p>
            <p><strong className="text-[#94A3B8]">Target Link:</strong> <span className="font-mono text-[#22D3EE] break-all">{searchedOrder.link}</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-white/[0.06]">
              <div>
                <span className="text-[#94A3B8] block text-[10px] font-semibold">Quantity</span>
                <span className="font-bold text-[#F1F5F9] font-mono">{searchedOrder.quantity.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px] font-semibold">Start Count</span>
                <span className="font-bold text-[#F1F5F9] font-mono">{searchedOrder.startCount ?? 0}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px] font-semibold">Remains</span>
                <span className="font-bold text-[#F59E0B] font-mono">{searchedOrder.remains ?? 0}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px] font-semibold">Charge</span>
                <span className="font-bold text-[#22D3EE] font-mono">{formatPrice(searchedOrder.charge)}</span>
              </div>
            </div>
            <p className="text-[10px] text-[#64748B] pt-1 font-mono">
              Placed on: {new Date(searchedOrder.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
