import React, { useState } from 'react';
import { Layers, AlertCircle, CheckCircle2, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SMMService, SMMOrder } from '../../types';
import { createOrder } from '../../services/db';

interface MassOrderViewProps {
  services: SMMService[];
  onOrderSuccess: (orderId: string) => void;
  onNavigateTab: (tabId: string) => void;
  onOpenAuth: () => void;
}

export const MassOrderView: React.FC<MassOrderViewProps> = ({
  services,
  onOrderSuccess,
  onNavigateTab,
  onOpenAuth
}) => {
  const { profile, language, formatPrice, updateUserBalance } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successLogs, setSuccessLogs] = useState<string[]>([]);

  // Parse lines
  const parsedLines = text.split('\n').filter(line => line.trim().length > 0).map((line, index) => {
    const parts = line.split('|').map(s => s.trim());
    if (parts.length < 3) {
      return { line, index, valid: false, error: 'Format must be: service_id | quantity | link' };
    }
    const [serviceId, qtyStr, link] = parts;
    const qty = parseInt(qtyStr);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return { line, index, valid: false, error: `Service "${serviceId}" not found` };
    }
    if (isNaN(qty) || qty < service.min || qty > service.max) {
      return { line, index, valid: false, error: `Invalid quantity (Min: ${service.min}, Max: ${service.max})` };
    }
    if (!link.startsWith('http')) {
      return { line, index, valid: false, error: 'Invalid URL link' };
    }

    const charge = (service.rate / 1000) * qty;
    return {
      line,
      index,
      valid: true,
      service,
      qty,
      link,
      charge
    };
  });

  const totalLines = parsedLines.length;
  const validLines = parsedLines.filter(p => p.valid);
  const totalCost = validLines.reduce((acc, p) => acc + (p.charge || 0), 0);

  const handleSubmit = async () => {
    setError(null);
    setSuccessLogs([]);

    if (!profile) {
      onOpenAuth();
      return;
    }

    if (validLines.length === 0) {
      setError(language === 'bn' ? 'কোনো সঠিক লাইন পাওয়া যায়নি' : 'No valid order lines found');
      return;
    }

    if (profile.balance < totalCost) {
      setError(
        language === 'bn' 
          ? `অপর্যাপ্ত ব্যালেন্স! মোট লাগবে ${formatPrice(totalCost)}` 
          : `Insufficient balance! Total required: ${formatPrice(totalCost)}`
      );
      return;
    }

    setLoading(true);
    const createdIds: string[] = [];
    try {
      for (const item of validLines) {
        if (!item.service) continue;
        const orderPayload: Omit<SMMOrder, 'id' | 'createdAt'> = {
          userId: profile.uid,
          userEmail: profile.email,
          serviceId: item.service.id,
          serviceName: item.service.name,
          category: item.service.category,
          link: item.link!,
          quantity: item.qty!,
          charge: item.charge!,
          status: 'pending'
        };

        const id = await createOrder(
          orderPayload,
          profile,
          item.service
        );
        createdIds.push(id);
      }

      setSuccessLogs(createdIds);
      setText('');
      if (createdIds.length > 0) {
        onOrderSuccess(createdIds[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Mass order placement failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-8 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigateTab('new-order')}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'bn' ? 'সাধারণ অর্ডারে ফিরুন' : 'Back to Single Order'}
        </button>
        <span className="text-[10px] font-bold py-1 px-2.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Pro Feature
        </span>
      </div>

      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-extrabold text-white">
            {language === 'bn' ? 'ম্যাস অর্ডার (Mass Order)' : 'Mass Order Submission'}
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {language === 'bn' 
            ? 'প্রতি লাইনে একটি করে অর্ডার লিখুন এই ফরম্যাটে:' 
            : 'Enter each order on a new line in this format:'}
          <br />
          <code className="text-sky-300 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block mt-1">
            service_id | quantity | link
          </code>
        </p>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400">
          fb-101 | 1000 | https://facebook.com/my_page<br />
          ig-201 | 500 | https://instagram.com/my_profile
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          {language === 'bn' ? 'অর্ডার লিস্ট ইনপুট করুন' : 'Enter Order Lines'}
        </label>
        <textarea
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`fb-101 | 1000 | https://facebook.com/page\nig-201 | 500 | https://instagram.com/profile`}
          className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-2xl p-3.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none transition-colors"
        />
      </div>

      {/* Validation Stats */}
      {totalLines > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">{language === 'bn' ? 'মোট লাইন' : 'Total'}: <strong>{totalLines}</strong></span>
            <span className="mx-2 text-slate-700">|</span>
            <span className="text-emerald-400 font-bold">{language === 'bn' ? 'সঠিক' : 'Valid'}: {validLines.length}</span>
            {totalLines - validLines.length > 0 && (
              <>
                <span className="mx-2 text-slate-700">|</span>
                <span className="text-rose-400 font-bold">{language === 'bn' ? 'ভুল' : 'Errors'}: {totalLines - validLines.length}</span>
              </>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-400">{formatPrice(totalCost)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successLogs.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {language === 'bn' ? 'সফলভাবে অর্ডার প্লেস হয়েছে:' : 'Orders placed successfully:'}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {successLogs.map(id => (
              <span key={id} className="py-0.5 px-2 bg-emerald-900/60 rounded text-[10px] font-mono">
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || validLines.length === 0}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-rose-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Zap className="w-4 h-4 fill-white" />
        {loading 
          ? (language === 'bn' ? 'অর্ডার হচ্ছে...' : 'Placing Orders...') 
          : (language === 'bn' ? `সবগুলো প্লেস করুন (${validLines.length})` : `Submit All (${validLines.length} Orders)`)}
      </button>
    </div>
  );
};
