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
  Server,
  Search,
  Plus,
  Minus,
  X,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMService, SMMOrder } from '../../types';
import { createOrder, analyzeSocialLinkOnServer } from '../../services/db';

interface NewOrderViewProps {
  services: SMMService[];
  orders?: SMMOrder[];
  onOrderSuccess: (orderId: string) => void;
  onNavigateTab: (tabId: string, params?: any) => void;
  onOpenAuth: () => void;
  initialServiceId?: string;
  initialCategory?: string;
}

type PlatformFilter =
  | 'All'
  | 'Facebook'
  | 'Instagram'
  | 'YouTube'
  | 'TikTok'
  | 'Telegram'
  | 'Twitter'
  | 'Other';

function matchPlatform(srv: SMMService, platform: PlatformFilter): boolean {
  if (platform === 'All') return true;
  const hay = `${srv.category} ${srv.name}`.toLowerCase();
  switch (platform) {
    case 'Facebook':
      return hay.includes('facebook') || hay.includes('fb ');
    case 'Instagram':
      return hay.includes('instagram') || hay.includes('ig ') || hay.includes('threads');
    case 'YouTube':
      return hay.includes('youtube') || hay.includes('yt ');
    case 'TikTok':
      return hay.includes('tiktok') || hay.includes('tik tok');
    case 'Telegram':
      return hay.includes('telegram') || hay.includes('tg ');
    case 'Twitter':
      return hay.includes('twitter') || hay.includes('x.com') || hay.includes('tweet');
    default:
      return (
        !hay.includes('facebook') &&
        !hay.includes('instagram') &&
        !hay.includes('youtube') &&
        !hay.includes('tiktok') &&
        !hay.includes('telegram') &&
        !hay.includes('twitter')
      );
  }
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

  const activeServices = useMemo(
    () => services.filter(s => s.status !== 'disabled'),
    [services]
  );

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>('All');
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [isServicePickerOpen, setIsServicePickerOpen] = useState<boolean>(false);
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState<boolean>(false);

  const platformServices = useMemo(() => {
    return activeServices.filter(s => matchPlatform(s, selectedPlatform));
  }, [activeServices, selectedPlatform]);

  const categories = useMemo(() => {
    return Array.from(new Set(platformServices.map(s => s.category)));
  }, [platformServices]);

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || categories[0] || ''
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || ''
  );
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
    if (!selectedCategory) return platformServices;
    return platformServices.filter(s => s.category === selectedCategory);
  }, [platformServices, selectedCategory]);

  // Searchable Services inside Picker Sheet
  const pickerFilteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    const pool = selectedCategory ? categoryServices : platformServices;
    if (!q) return pool.slice(0, 80);
    return activeServices
      .filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          String(s.id).toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [serviceSearch, selectedCategory, categoryServices, platformServices, activeServices]);

  // Keep category synchronized when platform or initial props change
  useEffect(() => {
    if (initialCategory && categories.includes(initialCategory)) {
      setSelectedCategory(initialCategory);
    } else if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, initialCategory, selectedCategory]);

  useEffect(() => {
    if (initialServiceId) {
      const found = activeServices.find(s => s.id === initialServiceId);
      if (found) {
        setSelectedPlatform('All');
        setSelectedCategory(found.category);
        setSelectedServiceId(found.id);
        setQuantity(found.min);
        return;
      }
    }
    if (
      categoryServices.length > 0 &&
      !categoryServices.some(s => s.id === selectedServiceId)
    ) {
      setSelectedServiceId(categoryServices[0].id);
      setQuantity(categoryServices[0].min);
    }
  }, [categoryServices, initialServiceId, activeServices, selectedServiceId]);

  const currentService = useMemo(() => {
    return (
      activeServices.find(s => s.id === selectedServiceId) || categoryServices[0]
    );
  }, [activeServices, selectedServiceId, categoryServices]);

  const isCustomCommentsService = useMemo(() => {
    if (!currentService) return false;
    return (
      currentService.type === 'Custom Comments' ||
      currentService.name.toLowerCase().includes('comment')
    );
  }, [currentService]);

  const commentLinesCount = useMemo(() => {
    if (!customComments.trim()) return 0;
    return customComments.split('\n').filter(l => l.trim().length > 0).length;
  }, [customComments]);

  const effectiveQuantity = dripfeed ? quantity * runs : quantity;

  const totalCharge = useMemo(() => {
    if (!currentService) return 0;
    return Number(((currentService.rate / 1000) * effectiveQuantity).toFixed(2));
  }, [currentService, effectiveQuantity]);

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

  const adjustQuantity = (delta: number) => {
    if (!currentService) return;
    const next = Math.max(
      currentService.min,
      Math.min(currentService.max, quantity + delta)
    );
    setQuantity(next);
  };

  // Step 1: Validate & Open Confirmation Sheet
  const handleInitiateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) {
      onOpenAuth();
      return;
    }

    if (!currentService) {
      setError(
        language === 'bn'
          ? 'দয়া করে একটি সার্ভিস নির্বাচন করুন'
          : 'Please select a service'
      );
      return;
    }

    if (!link.trim() || !link.includes('.')) {
      setError(
        language === 'bn'
          ? 'সঠিক সোশ্যাল মিডিয়া লিংক প্রদান করুন'
          : 'Please enter a valid target URL'
      );
      return;
    }

    if (duplicateActiveOrder) {
      setError(
        language === 'bn'
          ? `এই লিংকে ইতিমধ্যে অর্ডার #${duplicateActiveOrder.id} চলমান আছে!`
          : `Active order #${duplicateActiveOrder.id} already exists for this link.`
      );
      return;
    }

    if (quantity < currentService.min || quantity > currentService.max) {
      setError(
        language === 'bn'
          ? `পরিমাণ ${currentService.min} থেকে ${currentService.max.toLocaleString()} এর মধ্যে হতে হবে`
          : `Quantity must be between ${currentService.min} and ${currentService.max.toLocaleString()}`
      );
      return;
    }

    if (profile.balance < totalCharge) {
      setError(
        language === 'bn'
          ? 'আপনার ব্যালেন্স পর্যাপ্ত নয়! অনুগ্রহ করে ফান্ড যোগ করুন।'
          : 'Insufficient balance! Please add funds to your wallet.'
      );
      return;
    }

    setIsConfirmSheetOpen(true);
  };

  // Step 2: Execute Server-Verified Atomic Order Submission
  const handleConfirmAndExecuteOrder = async () => {
    if (!profile || !currentService || submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const serverLinkCheck = await analyzeSocialLinkOnServer(link.trim());
      if (!serverLinkCheck.valid) {
        setError(
          serverLinkCheck.error ||
            (language === 'bn' ? 'লিংকটি সঠিক নয়!' : 'Invalid target URL')
        );
        setIsConfirmSheetOpen(false);
        setSubmitting(false);
        return;
      }

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
      setIsConfirmSheetOpen(false);
      setLink('');
      setCustomComments('');
      setLinkAnalysis(null);
      onOrderSuccess(orderId);
    } catch (err: any) {
      setIsConfirmSheetOpen(false);
      setError(err?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (activeServices.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center solid-panel rounded-3xl space-y-3 my-6">
        <Server className="w-10 h-10 text-[#8B5CF6] mx-auto" />
        <h3 className="text-base font-extrabold text-white">
          {language === 'bn'
            ? 'সার্ভারে কোনো সক্রিয় সার্ভিস নেই'
            : 'No Active Services in Catalogue'}
        </h3>
        <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
          {language === 'bn'
            ? 'অ্যাডমিন প্যানেল থেকে নতুন সার্ভিস যোগ করুন অথবা API Provider সিঙ্ক করুন।'
            : 'Connect an upstream SMM API provider in the Admin Panel to sync services.'}
        </p>
      </div>
    );
  }

  const platforms: PlatformFilter[] = [
    'All',
    'Facebook',
    'Instagram',
    'YouTube',
    'TikTok',
    'Telegram',
    'Twitter',
    'Other'
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 lg:space-y-6 pb-20 lg:pb-10">
      {/* Top Bar: Title & Mass Order Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#F1F5F9] tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#22D3EE]" />
            <span>
              {language === 'bn' ? 'নতুন অর্ডার টার্মিনাল' : 'New Order Terminal'}
            </span>
          </h2>
          <p className="text-xs text-[#94A3B8]">
            {language === 'bn'
              ? 'প্ল্যাটফর্ম ও সার্ভিস নির্বাচন করে তাৎক্ষণিক অর্ডার সাবমিট করুন'
              : 'Select platform, verify link, and dispatch order to server'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('services')}
            className="py-2 px-3 rounded-xl bg-[#0D1220] hover:bg-[#141B2B] border border-slate-800 text-xs font-bold text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>{language === 'bn' ? 'সার্ভিস রেট' : 'Catalogue'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('mass-order')}
            className="py-2 px-3.5 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-violet-500/30 text-xs font-bold text-violet-300 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>{language === 'bn' ? 'ম্যাস অর্ডার' : 'Mass Order'}</span>
          </button>
        </div>
      </div>

      {/* 1. Platform Selector Bar */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {platforms.map(p => {
          const active = selectedPlatform === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPlatform(p)}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                active
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white border-transparent shadow-md shadow-violet-600/20'
                  : 'bg-[#0D1220] border-slate-800/90 text-[#94A3B8] hover:text-white'
              }`}
            >
              {p === 'All' ? (language === 'bn' ? 'সব প্ল্যাটফর্ম' : 'All Platforms') : p}
            </button>
          );
        })}
      </div>

      {/* DESKTOP 12-COLUMN SPLIT WORKSPACE / MOBILE STACK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 Cols on Desktop): Order Configuration Form */}
        <form
          onSubmit={handleInitiateOrder}
          className="lg:col-span-7 p-4 sm:p-6 rounded-3xl solid-panel space-y-4"
        >
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-[#F87171]/40 text-[#F87171] text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {duplicateActiveOrder && !error && (
            <div className="p-3 rounded-2xl bg-amber-950/50 border border-[#F59E0B]/40 text-[#F59E0B] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {language === 'bn'
                  ? `সতর্কতা: এই লিংকে অর্ডার #${duplicateActiveOrder.id} (${duplicateActiveOrder.status}) চলমান রয়েছে।`
                  : `Warning: Order #${duplicateActiveOrder.id} (${duplicateActiveOrder.status}) is already active for this link.`}
              </span>
            </div>
          )}

          {/* 2. Category Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
              {language === 'bn' ? '১. ক্যাটাগরি নির্বাচন করুন' : '1. Select Category'}
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full appearance-none input-surface rounded-2xl py-3 pl-3.5 pr-10 text-xs sm:text-sm font-semibold"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#94A3B8] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3 & 4. Service Selection (Interactive Trigger for Bottom Sheet + Desktop Select) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                {language === 'bn' ? '২. সার্ভিস নির্বাচন করুন' : '2. Select Service'}
              </label>
              <button
                type="button"
                onClick={() => setIsServicePickerOpen(true)}
                className="text-[11px] font-bold text-[#22D3EE] hover:underline flex items-center gap-1"
              >
                <Search className="w-3 h-3" />
                <span>
                  {language === 'bn' ? 'সার্চ করে সিলেক্ট করুন' : 'Search All Services'}
                </span>
              </button>
            </div>

            {/* Interactive Service Selector Button (Opens Bottom Sheet on Mobile or Picker Modal) */}
            <button
              type="button"
              onClick={() => setIsServicePickerOpen(true)}
              className="w-full p-3.5 rounded-2xl bg-[#080B14] hover:bg-[#141B2B]/80 border border-slate-800 hover:border-violet-500/40 text-left flex items-center justify-between gap-3 transition-all"
            >
              {currentService ? (
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                      #{currentService.id}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#F1F5F9] line-clamp-1">
                      {currentService.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-[#94A3B8] font-mono">
                    <span className="text-[#22C55E] font-bold">
                      {formatPrice(currentService.rate)} / 1K
                    </span>
                    <span>•</span>
                    <span>
                      Min: {currentService.min} – Max:{' '}
                      {currentService.max.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-[#94A3B8]">
                  {language === 'bn' ? 'সার্ভিস সিলেক্ট করুন...' : 'Tap to choose service...'}
                </span>
              )}
              <ChevronDown className="w-4 h-4 text-[#22D3EE] shrink-0" />
            </button>
          </div>

          {/* 6. Target URL Input + Server Verification */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>{language === 'bn' ? '৩. টার্গেট লিংক (Target URL)' : '3. Target URL'}</span>
              </label>
              <button
                type="button"
                onClick={handleVerifyLinkOnServer}
                disabled={!link.trim() || verifyingLink}
                className="text-[11px] font-bold text-[#22D3EE] hover:underline disabled:opacity-40 flex items-center gap-1"
              >
                <Server className="w-3 h-3" />
                <span>
                  {verifyingLink
                    ? language === 'bn'
                      ? 'যাচাই হচ্ছে...'
                      : 'Verifying...'
                    : language === 'bn'
                    ? 'লিংক যাচাই করুন'
                    : 'Verify URL'}
                </span>
              </button>
            </div>
            <input
              type="url"
              required
              value={link}
              onChange={e => {
                setLink(e.target.value);
                setLinkAnalysis(null);
              }}
              placeholder="https://..."
              className="w-full input-surface rounded-2xl p-3 text-xs sm:text-sm"
            />
            {linkAnalysis && (
              <div
                className={`p-2.5 rounded-xl text-[11px] flex items-center justify-between ${
                  linkAnalysis.valid
                    ? 'bg-emerald-950/40 border border-[#22C55E]/40 text-[#22C55E]'
                    : 'bg-rose-950/40 border border-[#F87171]/40 text-[#F87171]'
                }`}
              >
                {linkAnalysis.valid ? (
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified: <strong>{linkAnalysis.detectedPlatform}</strong> (
                    {linkAnalysis.hostname})
                  </span>
                ) : (
                  <span>{linkAnalysis.error}</span>
                )}
              </div>
            )}
          </div>

          {/* 7. Quantity Control with Stepper + Direct Input + Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                {language === 'bn' ? '৪. পরিমাণ (Quantity)' : '4. Quantity'}
              </label>
              {currentService && (
                <span className="text-[11px] text-[#94A3B8] font-mono">
                  Min: <strong className="text-[#F1F5F9]">{currentService.min}</strong> • Max:{' '}
                  <strong className="text-[#F1F5F9]">
                    {currentService.max.toLocaleString()}
                  </strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustQuantity(-100)}
                className="w-11 h-11 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-slate-800 flex items-center justify-center text-[#F1F5F9] active:scale-95 transition-all shrink-0"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                required
                min={currentService?.min || 10}
                max={currentService?.max || 1000000}
                value={quantity}
                onChange={e => setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="flex-1 input-surface rounded-2xl py-3 px-4 text-center text-sm font-mono font-extrabold tabular-nums"
              />

              <button
                type="button"
                onClick={() => adjustQuantity(100)}
                className="w-11 h-11 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-slate-800 flex items-center justify-center text-[#F1F5F9] active:scale-95 transition-all shrink-0"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                currentService?.min || 100,
                500,
                1000,
                2500,
                5000,
                10000
              ]
                .filter((v, idx, arr) => arr.indexOf(v) === idx)
                .map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                      quantity === preset
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-violet-200'
                        : 'bg-[#080B14] border-slate-800 text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {preset === currentService?.min
                      ? `Min (${preset})`
                      : preset >= 1000
                      ? `${preset / 1000}K`
                      : preset}
                  </button>
                ))}
            </div>
          </div>

          {/* Custom Comments (if applicable) */}
          {(isCustomCommentsService || customComments.length > 0) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>
                    {language === 'bn'
                      ? 'কাস্টম কমেন্টস (প্রতি লাইনে ১টি)'
                      : 'Custom Comments (1 per line)'}
                  </span>
                </label>
                {commentLinesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(commentLinesCount)}
                    className="text-[10px] font-bold text-[#22D3EE] hover:underline"
                  >
                    Sync Qty ({commentLinesCount})
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={customComments}
                onChange={e => setCustomComments(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'প্রতি লাইনে একটি করে কমেন্ট লিখুন...'
                    : 'Enter one comment per line...'
                }
                className="w-full input-surface rounded-2xl p-3 text-xs"
              />
            </div>
          )}

          {/* Drip-Feed Option */}
          {currentService?.dripfeed && (
            <div className="p-3.5 rounded-2xl bg-[#080B14] border border-slate-800 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-xs font-bold text-[#F1F5F9]">
                    {language === 'bn' ? 'ড্রিপ-ফিড ডেলিভারি' : 'Drip-Feed Delivery'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={dripfeed}
                  onChange={e => setDripfeed(e.target.checked)}
                  className="w-4 h-4 accent-[#8B5CF6] rounded"
                />
              </label>

              {dripfeed && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Runs</label>
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={runs}
                      onChange={e => setRuns(Math.max(2, parseInt(e.target.value, 10) || 2))}
                      className="w-full input-surface rounded-xl p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">
                      Interval (Minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      value={interval}
                      onChange={e =>
                        setInterval(Math.max(5, parseInt(e.target.value, 10) || 10))
                      }
                      className="w-full input-surface rounded-xl p-2 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop Submit Button & Live Price Bar */}
          <div className="pt-2 space-y-3">
            <div className="p-4 rounded-2xl glass-panel flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  {language === 'bn' ? 'আনুমানিক মোট খরচ' : 'Estimated Total'}
                </span>
                <span className="text-xs text-[#94A3B8] font-mono">
                  {effectiveQuantity.toLocaleString()} units @{' '}
                  {currentService ? formatPrice(currentService.rate) : '৳0'}/1K
                </span>
              </div>
              <span className="text-2xl font-extrabold text-[#22C55E] font-mono tabular-nums">
                {formatPrice(totalCharge)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#8B5CF6] via-[#6D28D9] to-[#22D3EE] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-violet-600/25 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>
                {submitting
                  ? language === 'bn'
                    ? 'প্রসেসিং হচ্ছে...'
                    : 'Processing...'
                  : language === 'bn'
                  ? 'অর্ডার প্লেস করুন (Place Order)'
                  : 'Place Order'}
              </span>
            </button>
          </div>
        </form>

        {/* RIGHT COLUMN (5 Cols on Desktop): Service Specifications & Requirements */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          {currentService && (
            <div className="p-5 rounded-3xl glass-panel space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800/80">
                <div>
                  <span className="font-mono text-xs font-bold text-[#22D3EE] bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/25">
                    Service #{currentService.id}
                  </span>
                  <h3 className="text-sm font-extrabold text-[#F1F5F9] mt-2 leading-snug">
                    {currentService.name}
                  </h3>
                </div>
                {currentService.refill && (
                  <span className="text-[10px] font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 px-2.5 py-1 rounded-xl flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" /> Refill
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-[#080B14]/80 border border-slate-800/90">
                  <span className="text-[10px] text-[#94A3B8] block">
                    {language === 'bn' ? 'রেট / ১,০০০' : 'Rate / 1K'}
                  </span>
                  <span className="font-mono font-extrabold text-sm text-[#22C55E]">
                    {formatPrice(currentService.rate)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#080B14]/80 border border-slate-800/90">
                  <span className="text-[10px] text-[#94A3B8] block">Min / Max</span>
                  <span className="font-mono font-bold text-[#F1F5F9] text-[11px]">
                    {currentService.min} – {currentService.max.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#080B14]/80 border border-slate-800/90">
                  <span className="text-[10px] text-[#94A3B8] block">
                    {language === 'bn' ? 'গড় সময়' : 'Avg. Speed'}
                  </span>
                  <span className="font-bold text-[#F59E0B] text-[11px] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {currentService.averageTime || 'Instant'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  {language === 'bn'
                    ? 'সার্ভিস বিবরণ ও নির্দেশনা'
                    : 'Service Description & Requirements'}
                </span>
                <div className="p-3.5 rounded-2xl bg-[#080B14]/90 border border-slate-800/90 text-xs text-slate-300 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
                  {currentService.description ||
                    (language === 'bn'
                      ? '• অবশ্যই পাবলিক প্রোফাইল বা পোস্ট লিংক দিন।\n• অর্ডার চলাকালীন প্রাইভেসি পরিবর্তন করবেন না।'
                      : '• Ensure target link is public.\n• Do not change username or privacy while order is active.')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          BOTTOM SHEET 1: SEARCHABLE SERVICE PICKER SHEET
      ===================================================================== */}
      <AnimatePresence>
        {isServicePickerOpen && (
          <div
            onClick={() => setIsServicePickerOpen(false)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg bg-[#0D1220] border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 text-[#F1F5F9] space-y-3 shadow-2xl max-h-[82vh] flex flex-col"
            >
              <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden" />

              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {language === 'bn' ? 'সার্ভিস নির্বাচন করুন' : 'Select Service'}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    {selectedCategory || 'All Categories'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsServicePickerOpen(false)}
                  className="p-1.5 rounded-xl bg-[#141B2B] text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-[#22D3EE] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={e => setServiceSearch(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'সার্ভিস নাম বা #ID দিয়ে খুঁজুন...'
                      : 'Search service name or #ID...'
                  }
                  className="w-full input-surface rounded-2xl pl-10 pr-4 py-2.5 text-xs"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {pickerFilteredServices.map(srv => {
                  const active = srv.id === selectedServiceId;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(srv.category);
                        setSelectedServiceId(srv.id);
                        setQuantity(srv.min);
                        setIsServicePickerOpen(false);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                          : 'bg-[#080B14] border-slate-800/90 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-[#22D3EE]">
                            #{srv.id}
                          </span>
                          <span className="text-xs font-bold line-clamp-1">{srv.name}</span>
                        </div>
                        <span className="text-[10px] text-[#94A3B8] font-mono">
                          Min: {srv.min} • Max: {srv.max.toLocaleString()}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-extrabold text-[#22C55E] shrink-0">
                        {formatPrice(srv.rate)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          BOTTOM SHEET 2: ORDER CONFIRMATION SHEET (Prevents Duplicate/Accidental Submit)
      ===================================================================== */}
      <AnimatePresence>
        {isConfirmSheetOpen && currentService && (
          <div
            onClick={() => !submitting && setIsConfirmSheetOpen(false)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-md bg-[#0D1220] border border-violet-500/35 rounded-t-3xl sm:rounded-3xl p-5 text-[#F1F5F9] space-y-4 shadow-2xl"
            >
              <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden" />

              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                  <span>
                    {language === 'bn' ? 'অর্ডার কনফার্মেশন' : 'Confirm Order Submission'}
                  </span>
                </h3>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsConfirmSheetOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#080B14] border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-[#94A3B8]">Service:</span>
                  <span className="font-bold text-white text-right line-clamp-1">
                    [#{currentService.id}] {currentService.name}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#94A3B8]">Target URL:</span>
                  <span className="font-mono text-[#22D3EE] truncate max-w-[210px]">
                    {link}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#94A3B8]">Quantity:</span>
                  <span className="font-mono font-bold text-white">
                    {effectiveQuantity.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between gap-2 pt-2 border-t border-slate-800">
                  <span className="text-[#94A3B8] font-bold">Total Charge:</span>
                  <span className="font-mono font-extrabold text-base text-[#22C55E]">
                    {formatPrice(totalCharge)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsConfirmSheetOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-[#141B2B] text-slate-300 font-bold text-xs"
                >
                  {language === 'bn' ? 'ফিরে যান' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmAndExecuteOrder}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>
                    {submitting
                      ? language === 'bn'
                        ? 'সাবমিট হচ্ছে...'
                        : 'Submitting...'
                      : language === 'bn'
                      ? 'কনফার্ম ও সাবমিট'
                      : 'Confirm & Submit'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
