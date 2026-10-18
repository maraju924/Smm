import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Clock, 
  ShieldCheck, 
  Link as LinkIcon, 
  Repeat,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  Server
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMService, SMMOrder } from '../../types';
import { createOrder, analyzeSocialLinkOnServer } from '../../services/db';

interface NewOrderViewProps {
  services: SMMService[];
  orders?: SMMOrder[];
  onOrderSuccess: (orderId: string) => void;
  onNavigateTab: (tabId: string) => void;
  onOpenAuth: () => void;
  initialServiceId?: string;
  initialCategory?: string;
}

export const NewOrderView: React.FC<NewOrderViewProps> = ({
  services,
  orders = [],
  onOrderSuccess,
  onNavigateTab,
  onOpenAuth,
  initialServiceId,
  initialCategory
}) => {
  const { profile, language, formatPrice } = useAuth();

  // Extract unique categories
  const categories = useMemo(() => {
    const list = Array.from(new Set(services.map(s => s.category)));
    return list.length > 0 ? list : [];
  }, [services]);

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || categories[0] || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || '');
  const [link, setLink] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [customComments, setCustomComments] = useState<string>('');
  const [dripfeed, setDripfeed] = useState<boolean>(false);
  const [runs, setRuns] = useState<number>(2);
  const [interval, setInterval] = useState<number>(30);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Server-side link analysis state
  const [verifyingLink, setVerifyingLink] = useState<boolean>(false);
  const [linkAnalysis, setLinkAnalysis] = useState<{
    valid: boolean;
    detectedPlatform?: string;
    hostname?: string;
    error?: string;
  } | null>(null);

  // Filter services by selected category
  const categoryServices = useMemo(() => {
    return services.filter(s => s.category === selectedCategory && s.status !== 'disabled');
  }, [services, selectedCategory]);

  // Set default service when category changes
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    } else if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [initialCategory, categories, selectedCategory]);

  useEffect(() => {
    if (initialServiceId) {
      const found = services.find(s => s.id === initialServiceId);
      if (found) {
        setSelectedCategory(found.category);
        setSelectedServiceId(found.id);
        setQuantity(found.min);
        return;
      }
    }
    if (categoryServices.length > 0 && !categoryServices.some(s => s.id === selectedServiceId)) {
      setSelectedServiceId(categoryServices[0].id);
      setQuantity(categoryServices[0].min);
    }
  }, [categoryServices, initialServiceId, services, selectedServiceId]);

  const currentService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId) || categoryServices[0];
  }, [services, selectedServiceId, categoryServices]);

  const isCustomCommentsService = useMemo(() => {
    if (!currentService) return false;
    return (
      currentService.type === 'Custom Comments' ||
      currentService.name.toLowerCase().includes('comment')
    );
  }, [currentService]);

  // Sync quantity with comment lines if custom comments are entered
  const commentLinesCount = useMemo(() => {
    if (!customComments.trim()) return 0;
    return customComments.split('\n').filter(l => l.trim().length > 0).length;
  }, [customComments]);

  const effectiveQuantity = dripfeed ? quantity * runs : quantity;

  const totalCharge = useMemo(() => {
    if (!currentService) return 0;
    return Number(((currentService.rate / 1000) * effectiveQuantity).toFixed(2));
  }, [currentService, effectiveQuantity]);

  // Check if there is an active order for the exact same link & service
  const duplicateActiveOrder = useMemo(() => {
    const cleanLink = link.trim().toLowerCase();
    if (!cleanLink || !currentService) return undefined;
    return orders.find(
      o =>
        o.serviceId === currentService.id &&
        o.link.trim().toLowerCase() === cleanLink &&
        ['pending', 'processing', 'in_progress'].includes(o.status)
    );
  }, [orders, link, currentService]);

  const handleVerifyLinkOnServer = async () => {
    if (!link.trim()) return;
    setVerifyingLink(true);
    setLinkAnalysis(null);
    try {
      const res = await analyzeSocialLinkOnServer(link.trim());
      setLinkAnalysis(res);
      if (res.valid && res.normalizedUrl) {
        setLink(res.normalizedUrl);
      }
    } finally {
      setVerifyingLink(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) {
      onOpenAuth();
      return;
    }

    if (!currentService) {
      setError(language === 'bn' ? 'দয়া করে একটি সার্ভিস সিলেক্ট করুন' : 'Please select a service');
      return;
    }

    if (!link.trim() || !link.includes('.')) {
      setError(language === 'bn' ? 'সঠিক সোশ্যাল মিডিয়া লিংক প্রদান করুন' : 'Please enter a valid target link');
      return;
    }

    // Server-side link validation check
    const serverLinkCheck = await analyzeSocialLinkOnServer(link.trim());
    if (!serverLinkCheck.valid) {
      setError(serverLinkCheck.error || (language === 'bn' ? 'লিংকটি সঠিক নয়!' : 'Invalid link URL'));
      return;
    }

    if (duplicateActiveOrder) {
      setError(
        language === 'bn'
          ? `এই লিংকে ইতিমধ্যে একটি অর্ডার (#${duplicateActiveOrder.id}) চলমান আছে! সেটি সম্পন্ন হওয়ার পর নতুন অর্ডার দিন।`
          : `An active order (#${duplicateActiveOrder.id}) already exists for this link and service! Wait for completion to prevent overlap.`
      );
      return;
    }

    if (quantity < currentService.min || quantity > currentService.max) {
      setError(
        language === 'bn'
          ? `পরিমাণ অবশ্যই ${currentService.min} থেকে ${currentService.max} এর মধ্যে হতে হবে`
          : `Quantity must be between ${currentService.min} and ${currentService.max}`
      );
      return;
    }

    if (profile.balance < totalCharge) {
      setError(
        language === 'bn'
          ? 'অপর্যাপ্ত ব্যালেন্স! দয়া করে ওয়ালেটে টাকা যোগ করুন।'
          : 'Insufficient balance! Please add funds to your wallet.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload: Omit<SMMOrder, 'id' | 'createdAt'> = {
        userId: profile.uid,
        userEmail: profile.email,
        serviceId: currentService.id,
        serviceName: currentService.name,
        category: currentService.category,
        link: serverLinkCheck.normalizedUrl || link.trim(),
        quantity: effectiveQuantity,
        charge: totalCharge,
        status: 'pending',
        dripfeed: Boolean(dripfeed),
        ...(dripfeed ? { runs, interval } : {}),
        ...(customComments.trim() ? { customComments: customComments.trim() } : {}),
        ...(currentService.providerId ? { providerId: currentService.providerId } : {})
      };

      const orderId = await createOrder(orderPayload, profile, currentService);
      setLink('');
      setCustomComments('');
      setLinkAnalysis(null);
      onOrderSuccess(orderId);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (services.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3 my-6">
        <Server className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-extrabold text-white">
          {language === 'bn' ? 'সার্ভারে কোনো সক্রিয় সার্ভিস নেই' : 'No Active Services in Server Catalog'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {language === 'bn'
            ? 'অ্যাডমিন প্যানেল থেকে নতুন সার্ভিস যোগ করুন অথবা API Provider কানেক্ট করে লাইভ সার্ভিস সিঙ্ক করুন।'
            : 'Please add services from the Admin Panel or connect an Upstream SMM API Provider to sync live catalog.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-8 overflow-x-hidden">
      {/* Header & Mass Order Switch */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-rose-500" />
            {language === 'bn' ? 'নতুন অর্ডার তৈরি করুন' : 'Create New Order'}
          </h2>
          <p className="text-xs text-slate-400">
            {language === 'bn' ? 'ক্লাউড সার্ভার অ্যাটমিক প্রসেসিং ও তাৎক্ষণিক ডেলিভারি' : '100% Server-verified order execution'}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => onNavigateTab('mass-order')}
          className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors shrink-0"
        >
          {language === 'bn' ? 'ম্যাস অর্ডার' : 'Mass Order'}
        </motion.button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 w-full max-w-full">
        {categories.map((cat) => (
          <motion.button
            key={cat}
            type="button"
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

      {/* Main Order Form Card */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl w-full max-w-full overflow-hidden">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {duplicateActiveOrder && !error && (
          <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-700/60 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {language === 'bn'
                ? `সতর্কতা: এই লিংকে ইতিমধ্যে অর্ডার #${duplicateActiveOrder.id} (${duplicateActiveOrder.status}) চলমান রয়েছে।`
                : `Warning: Order #${duplicateActiveOrder.id} (${duplicateActiveOrder.status}) is already active for this link.`}
            </span>
          </div>
        )}

        {/* 1. Category Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            {language === 'bn' ? '১. ক্যাটাগরি (Category)' : '1. Category'}
          </label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl py-3 pl-3.5 pr-10 text-xs sm:text-sm text-white font-semibold focus:outline-none transition-colors"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 2. Service Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            {language === 'bn' ? '২. সার্ভিস নির্বাচন করুন (Service)' : '2. Select Service'}
          </label>
          <div className="relative">
            <select
              value={selectedServiceId}
              onChange={(e) => {
                const srv = services.find(s => s.id === e.target.value);
                setSelectedServiceId(e.target.value);
                if (srv) setQuantity(srv.min);
              }}
              className="w-full appearance-none bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl py-3 pl-3.5 pr-10 text-xs sm:text-sm text-white font-medium focus:outline-none transition-colors truncate"
            >
              {categoryServices.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  [{srv.id}] {srv.name} — {formatPrice(srv.rate)}/1k
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Selected Service Live Specification Card */}
        {currentService && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <span className="text-[11px] font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                ID: {currentService.id}
              </span>
              <div className="flex items-center gap-2">
                {currentService.averageTime && (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    {currentService.averageTime}
                  </span>
                )}
                {currentService.refill && (
                  <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Refill
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {currentService.description}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-slate-500 block">Rate / 1K</span>
                <span className="font-bold text-emerald-400 font-mono">{formatPrice(currentService.rate)}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-slate-500 block">Minimum</span>
                <span className="font-bold text-slate-200 font-mono">{currentService.min.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-slate-500 block">Maximum</span>
                <span className="font-bold text-slate-200 font-mono">{currentService.max.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Target Link Input + Server Verification */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-rose-400" />
              {language === 'bn' ? '৩. টার্গেট লিংক (Target Link)' : '3. Target Link'}
            </label>
            <button
              type="button"
              onClick={handleVerifyLinkOnServer}
              disabled={!link.trim() || verifyingLink}
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 disabled:opacity-40 flex items-center gap-1"
            >
              <Server className="w-3 h-3" />
              {verifyingLink
                ? (language === 'bn' ? 'সার্ভারে যাচাই হচ্ছে...' : 'Checking on Server...')
                : (language === 'bn' ? 'লিংক যাচাই করুন' : 'Verify Link on Server')}
            </button>
          </div>
          <input
            type="url"
            required
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setLinkAnalysis(null);
            }}
            placeholder="https://www.facebook.com/your_post_or_profile"
            className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
          {linkAnalysis && (
            <div className={`p-2.5 rounded-xl text-[11px] flex items-center justify-between ${
              linkAnalysis.valid
                ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/50 border border-rose-800/60 text-rose-300'
            }`}>
              {linkAnalysis.valid ? (
                <span className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Server Verified: <strong>{linkAnalysis.detectedPlatform}</strong> ({linkAnalysis.hostname})
                </span>
              ) : (
                <span>{linkAnalysis.error}</span>
              )}
            </div>
          )}
        </div>

        {/* 4. Quantity Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {language === 'bn' ? '৪. পরিমাণ (Quantity)' : '4. Quantity'}
            </label>
            {currentService && (
              <span className="text-[11px] text-slate-400 font-mono">
                Min: {currentService.min} | Max: {currentService.max.toLocaleString()}
              </span>
            )}
          </div>
          <input
            type="number"
            required
            min={currentService?.min || 10}
            max={currentService?.max || 1000000}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl p-3 text-sm text-white font-mono font-bold focus:outline-none transition-colors"
          />

          {/* Quick Quantity Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[100, 500, 1000, 2500, 5000, 10000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setQuantity(preset)}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                  quantity === preset
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                +{preset >= 1000 ? `${preset / 1000}K` : preset}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Custom Comments Box */}
        {(isCustomCommentsService || customComments.length > 0) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                {language === 'bn' ? 'কাস্টম কমেন্টস (প্রতি লাইনে ১টি)' : 'Custom Comments (1 per line)'}
              </label>
              {commentLinesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(commentLinesCount)}
                  className="text-[10px] font-bold text-sky-400 hover:underline"
                >
                  Sync Qty ({commentLinesCount} lines)
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={customComments}
              onChange={(e) => setCustomComments(e.target.value)}
              placeholder={language === 'bn' ? 'প্রতি লাইনে একটি করে কমেন্ট লিখুন...' : 'Enter one comment per line...'}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-2xl p-3 text-xs text-white focus:outline-none"
            />
          </div>
        )}

        {/* Drip-Feed Option */}
        {currentService?.dripfeed && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200">
                  {language === 'bn' ? 'ড্রিপ-ফিড (Drip-feed Delivery)' : 'Drip-feed Delivery'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={dripfeed}
                onChange={(e) => setDripfeed(e.target.checked)}
                className="w-4 h-4 accent-rose-500 rounded"
              />
            </label>

            {dripfeed && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Runs</label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={runs}
                    onChange={(e) => setRuns(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Interval (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    value={interval}
                    onChange={(e) => setInterval(Math.max(5, parseInt(e.target.value) || 10))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Total Charge Summary */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
              {language === 'bn' ? 'সর্বমোট চার্জ (Total Charge)' : 'Total Charge'}
            </span>
            <span className="text-xs text-slate-500">
              {effectiveQuantity.toLocaleString()} units @ {currentService ? formatPrice(currentService.rate) : '৳0'}/1K
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
              {formatPrice(totalCharge)}
            </span>
          </div>
        </div>

        {/* Submit Order Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>
            {submitting
              ? (language === 'bn' ? 'সার্ভারে অর্ডার প্রসেস হচ্ছে...' : 'Processing Order on Server...')
              : (language === 'bn' ? 'অর্ডার কনফার্ম করুন' : 'Submit Order Now')}
          </span>
        </button>
      </form>
    </div>
  );
};
