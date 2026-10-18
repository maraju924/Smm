import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Clock, 
  ShieldCheck, 
  Zap, 
  X,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMService } from '../../types';

interface ServicesViewProps {
  services: SMMService[];
  onSelectServiceForOrder: (serviceId: string, category: string) => void;
  initialPlatform?: string;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  onSelectServiceForOrder,
  initialPlatform
}) => {
  const { language, formatPrice } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialPlatform || 'All');
  const [filterRefillOnly, setFilterRefillOnly] = useState(false);
  const [selectedServiceModal, setSelectedServiceModal] = useState<SMMService | null>(null);

  const categories = useMemo(() => {
    const list = Array.from(new Set(services.map(s => s.category)));
    return ['All', ...list];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      const matchesCat = selectedCategory === 'All' || srv.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        srv.name.toLowerCase().includes(q) ||
        srv.id.toLowerCase().includes(q) ||
        srv.category.toLowerCase().includes(q);
      const matchesRefill = !filterRefillOnly || srv.refill;

      return matchesCat && matchesSearch && matchesRefill;
    });
  }, [services, selectedCategory, searchQuery, filterRefillOnly]);

  return (
    <div className="space-y-4 pb-8 w-full max-w-4xl mx-auto overflow-x-hidden">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-rose-500" />
          {language === 'bn' ? 'সার্ভিস তালিকা ও মূল্য' : 'Services & Rates'}
        </h2>
        <p className="text-xs text-slate-400">
          {language === 'bn' ? '১০০% ভেরিফাইড নন-ড্রপ সোশ্যাল মিডিয়া সার্ভিসেস' : 'Real-time updated rate per 1,000 units'}
        </p>
      </div>

      {/* Search & Refill Filter */}
      <div className="flex gap-2 w-full max-w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'সার্ভিস বা আইডি খুঁজুন...' : 'Search by name or ID...'}
            className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setFilterRefillOnly(!filterRefillOnly)}
          className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            filterRefillOnly 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Refill</span>
        </motion.button>
      </div>

      {/* Category Pills (Horizontal Scroll) */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 w-full max-w-full">
        {categories.map((cat) => (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.93 }}
            onClick={() => setSelectedCategory(cat)}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {/* Services List View */}
      <div className="space-y-2.5">
        {filteredServices.length === 0 ? (
          <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-3xl">
            <p className="text-xs text-slate-400">
              {language === 'bn' ? 'কোনো সার্ভিস পাওয়া যায়নি' : 'No services found matching your query'}
            </p>
          </div>
        ) : (
          filteredServices.map((srv) => (
            <div
              key={srv.id}
              className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-750 transition-all shadow-sm space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                    {srv.id}
                  </span>
                  <span className="text-[11px] font-semibold text-rose-400">
                    {srv.category}
                  </span>
                  {srv.refill && (
                    <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Refill
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                    {formatPrice(srv.rate)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal"> / 1k</span>
                </div>
              </div>

              {/* Service Name */}
              <h3 
                onClick={() => setSelectedServiceModal(srv)}
                className="font-bold text-slate-100 hover:text-rose-400 cursor-pointer leading-snug line-clamp-2"
              >
                {srv.name}
              </h3>

              {/* Specs & Action Row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-[11px] text-slate-400">
                <div className="flex items-center gap-2.5">
                  <span>Min: <strong className="text-slate-200">{srv.min}</strong></span>
                  <span>Max: <strong className="text-slate-200">{srv.max.toLocaleString()}</strong></span>
                  <span className="text-amber-300 font-medium hidden sm:inline">{srv.averageTime}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedServiceModal(srv)}
                    className="text-slate-400 hover:text-white font-medium"
                  >
                    Info
                  </button>
                  <button
                    onClick={() => onSelectServiceForOrder(srv.id, srv.category)}
                    className="py-1.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 fill-white" />
                    <span>{language === 'bn' ? 'অর্ডার' : 'Order'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Sheet Description Modal */}
      {selectedServiceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 text-white space-y-4 shadow-2xl animate-in slide-in-from-bottom-6">
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto my-1 sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  {selectedServiceModal.id}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {selectedServiceModal.category}
                </span>
              </div>
              <button
                onClick={() => setSelectedServiceModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-sm font-extrabold text-white leading-snug">
              {selectedServiceModal.name}
            </h3>

            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Rate</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {formatPrice(selectedServiceModal.rate)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Min / Max</span>
                <span className="font-bold text-slate-200">
                  {selectedServiceModal.min} - {selectedServiceModal.max.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Speed</span>
                <span className="font-bold text-amber-300">{selectedServiceModal.averageTime}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Description & Guidance
              </span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950 p-3 rounded-2xl border border-slate-850 max-h-48 overflow-y-auto no-scrollbar font-sans">
                {selectedServiceModal.description}
              </p>
            </div>

            <button
              onClick={() => {
                const srv = selectedServiceModal;
                setSelectedServiceModal(null);
                onSelectServiceForOrder(srv.id, srv.category);
              }}
              className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{language === 'bn' ? 'এই সার্ভিসটি অর্ডার করুন' : 'Place Order for this Service'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
