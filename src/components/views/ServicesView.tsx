import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import {
  Layers,
  Search,
  Clock,
  ShieldCheck,
  Zap,
  X,
  ArrowUpDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  SlidersHorizontal,
  Heart,
  Scale,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Flame,
  Repeat,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
  Calculator,
  Link as LinkIcon,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMService, SMMOrder } from '../../types';
import {
  toggleUserFavoriteServiceOnServer,
  createOrder,
  analyzeSocialLinkOnServer
} from '../../services/db';

interface ServicesViewProps {
  services: SMMService[];
  orders?: SMMOrder[];
  isLoading?: boolean;
  isSyncing?: boolean;
  onSelectServiceForOrder: (serviceId: string, category: string) => void;
  onOrderSuccess?: (orderId: string) => void;
  onOpenAuth?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialPlatform?: string;
  initialSearchQuery?: string;
}

type SortOption =
  | 'default'
  | 'price_asc'
  | 'price_desc'
  | 'speed_fast'
  | 'min_asc'
  | 'max_desc'
  | 'id_asc';

type PlatformKey =
  | 'All'
  | 'Facebook'
  | 'Instagram'
  | 'YouTube'
  | 'TikTok'
  | 'Telegram'
  | 'Twitter'
  | 'Other';

const PAGE_BATCH_SIZE = 30;

function detectServicePlatform(srv: SMMService): PlatformKey {
  const haystack = `${srv.category} ${srv.name}`.toLowerCase();
  if (haystack.includes('facebook') || haystack.includes('fb ')) return 'Facebook';
  if (haystack.includes('instagram') || haystack.includes('ig ') || haystack.includes('threads')) return 'Instagram';
  if (haystack.includes('youtube') || haystack.includes('yt ')) return 'YouTube';
  if (haystack.includes('tiktok') || haystack.includes('tik tok')) return 'TikTok';
  if (haystack.includes('telegram') || haystack.includes('tg ')) return 'Telegram';
  if (haystack.includes('twitter') || haystack.includes('x.com') || haystack.includes('tweet')) return 'Twitter';
  return 'Other';
}

function estimateSpeedScore(avgTime: string): number {
  const t = (avgTime || '').toLowerCase();
  if (!t) return 9999;
  if (t.includes('instant') || t.includes('ইনস্ট্যান্ট') || t.includes('fast')) return 1;
  const numMatch = t.match(/(\d+)/);
  const val = numMatch ? parseInt(numMatch[1], 10) : 60;
  if (t.includes('sec') || t.includes('সেকেন্ড')) return Math.max(1, val / 60);
  if (t.includes('min') || t.includes('মিনিট')) return val;
  if (t.includes('hour') || t.includes('ঘণ্টা') || t.includes('hr')) return val * 60;
  if (t.includes('day') || t.includes('দিন')) return val * 1440;
  return val + 300;
}

function isFastService(avgTime: string): boolean {
  const score = estimateSpeedScore(avgTime);
  return score <= 45;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  orders = [],
  isLoading = false,
  isSyncing = false,
  onSelectServiceForOrder,
  onOrderSuccess,
  onOpenAuth,
  onShowToast,
  initialPlatform,
  initialSearchQuery
}) => {
  const { profile, language, formatPrice } = useAuth();

  // Search & Deferred Search for 60fps typing with 1,000+ services
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const deferredSearch = useDeferredValue(searchQuery);

  // Filters & Sorting States
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>(() => {
    if (initialPlatform) {
      const normalized = initialPlatform.trim().toLowerCase();
      if (normalized.includes('facebook')) return 'Facebook';
      if (normalized.includes('instagram')) return 'Instagram';
      if (normalized.includes('youtube')) return 'YouTube';
      if (normalized.includes('tiktok')) return 'TikTok';
      if (normalized.includes('telegram')) return 'Telegram';
      if (normalized.includes('twitter')) return 'Twitter';
    }
    return 'All';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [filterRefillOnly, setFilterRefillOnly] = useState<boolean>(false);
  const [filterDripfeedOnly, setFilterDripfeedOnly] = useState<boolean>(false);
  const [filterFastOnly, setFilterFastOnly] = useState<boolean>(false);
  const [filterLowMinOnly, setFilterLowMinOnly] = useState<boolean>(false);
  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState<boolean>(false);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('All');
  const [minPriceRate, setMinPriceRate] = useState<string>('');
  const [maxPriceRate, setMaxPriceRate] = useState<string>('');

  // View & UI Modals / Drawers
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState<boolean>(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [selectedServiceModal, setSelectedServiceModal] = useState<SMMService | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compare Services Drawer State (Up to 3 services)
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareSheetOpen, setIsCompareSheetOpen] = useState<boolean>(false);

  // Interactive Calculator & Direct Quick-Order inside Service Modal
  const [calcQuantity, setCalcQuantity] = useState<number>(1000);
  const [quickOrderLink, setQuickOrderLink] = useState<string>('');
  const [quickOrderSubmitting, setQuickOrderSubmitting] = useState<boolean>(false);
  const [quickOrderError, setQuickOrderError] = useState<string | null>(null);
  const [showDirectOrderForm, setShowDirectOrderForm] = useState<boolean>(false);

  // Progressive Windowed Pagination for Instant Rendering
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_BATCH_SIZE);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  // Sync initial props when navigated from HomeView
  useEffect(() => {
    if (initialPlatform) {
      const normalized = initialPlatform.trim().toLowerCase();
      if (normalized.includes('facebook')) setSelectedPlatform('Facebook');
      else if (normalized.includes('instagram')) setSelectedPlatform('Instagram');
      else if (normalized.includes('youtube')) setSelectedPlatform('YouTube');
      else if (normalized.includes('tiktok')) setSelectedPlatform('TikTok');
      else if (normalized.includes('telegram')) setSelectedPlatform('Telegram');
      else if (normalized.includes('twitter')) setSelectedPlatform('Twitter');
      else setSelectedPlatform('All');
      setSelectedCategory('All');
    }
  }, [initialPlatform]);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Reset pagination count whenever filters change
  useEffect(() => {
    setVisibleCount(PAGE_BATCH_SIZE);
  }, [
    deferredSearch,
    selectedPlatform,
    selectedCategory,
    sortBy,
    filterRefillOnly,
    filterDripfeedOnly,
    filterFastOnly,
    filterLowMinOnly,
    filterFavoritesOnly,
    selectedServiceType,
    minPriceRate,
    maxPriceRate
  ]);

  // Initialize calculator quantity when modal opens
  useEffect(() => {
    if (selectedServiceModal) {
      setCalcQuantity(Math.max(selectedServiceModal.min, Math.min(1000, selectedServiceModal.max)));
      setQuickOrderLink('');
      setQuickOrderError(null);
      setShowDirectOrderForm(false);
    }
  }, [selectedServiceModal]);

  const activeServices = useMemo(() => {
    return services.filter(s => s.status !== 'disabled');
  }, [services]);

  const favoriteIds = useMemo(() => {
    return profile?.favoriteServices || [];
  }, [profile?.favoriteServices]);

  // Platform Counts
  const platformCounts = useMemo(() => {
    const counts: Record<PlatformKey, number> = {
      All: activeServices.length,
      Facebook: 0,
      Instagram: 0,
      YouTube: 0,
      TikTok: 0,
      Telegram: 0,
      Twitter: 0,
      Other: 0
    };
    for (const s of activeServices) {
      const p = detectServicePlatform(s);
      counts[p] = (counts[p] || 0) + 1;
    }
    return counts;
  }, [activeServices]);

  // Platform-scoped Services
  const platformScopedServices = useMemo(() => {
    if (selectedPlatform === 'All') return activeServices;
    return activeServices.filter(s => detectServicePlatform(s) === selectedPlatform);
  }, [activeServices, selectedPlatform]);

  // Categories with metadata (count + cheapest rate)
  const categoryStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; minRate: number }>();
    for (const s of platformScopedServices) {
      const existing = map.get(s.category);
      if (!existing) {
        map.set(s.category, { name: s.category, count: 1, minRate: s.rate });
      } else {
        existing.count += 1;
        if (s.rate < existing.minRate) existing.minRate = s.rate;
      }
    }
    return Array.from(map.values());
  }, [platformScopedServices]);

  // Reset selectedCategory if not present in current platform scope
  useEffect(() => {
    if (
      selectedCategory !== 'All' &&
      !categoryStats.some(c => c.name === selectedCategory)
    ) {
      setSelectedCategory('All');
    }
  }, [categoryStats, selectedCategory]);

  // Filtered + Sorted Services
  const filteredAndSortedServices = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    const minRateNum = minPriceRate !== '' ? Number(minPriceRate) : null;
    const maxRateNum = maxPriceRate !== '' ? Number(maxPriceRate) : null;

    const filtered = platformScopedServices.filter(srv => {
      if (selectedCategory !== 'All' && srv.category !== selectedCategory) return false;
      if (filterRefillOnly && !srv.refill) return false;
      if (filterDripfeedOnly && !srv.dripfeed) return false;
      if (filterFastOnly && !isFastService(srv.averageTime)) return false;
      if (filterLowMinOnly && srv.min > 100) return false;
      if (filterFavoritesOnly && !favoriteIds.includes(srv.id)) return false;
      if (selectedServiceType !== 'All' && srv.type !== selectedServiceType) return false;
      if (minRateNum !== null && !Number.isNaN(minRateNum) && srv.rate < minRateNum) return false;
      if (maxRateNum !== null && !Number.isNaN(maxRateNum) && srv.rate > maxRateNum) return false;

      if (q) {
        const matchName = srv.name.toLowerCase().includes(q);
        const matchId = String(srv.id).toLowerCase().includes(q) || String(srv.providerServiceId || '').toLowerCase().includes(q);
        const matchCat = srv.category.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCat) return false;
      }

      return true;
    });

    if (sortBy === 'default') return filtered;

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.rate - b.rate;
        case 'price_desc':
          return b.rate - a.rate;
        case 'speed_fast':
          return estimateSpeedScore(a.averageTime) - estimateSpeedScore(b.averageTime);
        case 'min_asc':
          return a.min - b.min;
        case 'max_desc':
          return b.max - a.max;
        case 'id_asc':
          return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
        default:
          return 0;
      }
    });

    return sorted;
  }, [
    platformScopedServices,
    selectedCategory,
    deferredSearch,
    filterRefillOnly,
    filterDripfeedOnly,
    filterFastOnly,
    filterLowMinOnly,
    filterFavoritesOnly,
    favoriteIds,
    selectedServiceType,
    minPriceRate,
    maxPriceRate,
    sortBy
  ]);

  // Slice for instant progressive rendering
  const visibleServices = useMemo(() => {
    return filteredAndSortedServices.slice(0, visibleCount);
  }, [filteredAndSortedServices, visibleCount]);

  const hasMoreServices = visibleCount < filteredAndSortedServices.length;

  // Automatic Infinite Scroll Observer
  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node || !hasMoreServices) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_BATCH_SIZE, filteredAndSortedServices.length));
        }
      },
      { rootMargin: '280px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreServices, filteredAndSortedServices.length]);

  // Summary Stats for Header Bar
  const catalogSummary = useMemo(() => {
    if (filteredAndSortedServices.length === 0) {
      return { minRate: 0, refillCount: 0, fastCount: 0 };
    }
    let minR = Infinity;
    let refillC = 0;
    let fastC = 0;
    for (const s of filteredAndSortedServices) {
      if (s.rate > 0 && s.rate < minR) minR = s.rate;
      if (s.refill) refillC++;
      if (isFastService(s.averageTime)) fastC++;
    }
    return {
      minRate: minR === Infinity ? 0 : minR,
      refillCount: refillC,
      fastCount: fastC
    };
  }, [filteredAndSortedServices]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedPlatform !== 'All') count++;
    if (selectedCategory !== 'All') count++;
    if (sortBy !== 'default') count++;
    if (filterRefillOnly) count++;
    if (filterDripfeedOnly) count++;
    if (filterFastOnly) count++;
    if (filterLowMinOnly) count++;
    if (filterFavoritesOnly) count++;
    if (selectedServiceType !== 'All') count++;
    if (minPriceRate !== '' || maxPriceRate !== '') count++;
    return count;
  }, [
    selectedPlatform,
    selectedCategory,
    sortBy,
    filterRefillOnly,
    filterDripfeedOnly,
    filterFastOnly,
    filterLowMinOnly,
    filterFavoritesOnly,
    selectedServiceType,
    minPriceRate,
    maxPriceRate
  ]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('All');
    setSelectedCategory('All');
    setSortBy('default');
    setFilterRefillOnly(false);
    setFilterDripfeedOnly(false);
    setFilterFastOnly(false);
    setFilterLowMinOnly(false);
    setFilterFavoritesOnly(false);
    setSelectedServiceType('All');
    setMinPriceRate('');
    setMaxPriceRate('');
  };

  const handleToggleFavorite = async (e: React.MouseEvent, serviceId: string) => {
    e.stopPropagation();
    if (!profile) {
      onOpenAuth?.();
      return;
    }
    try {
      const added = await toggleUserFavoriteServiceOnServer(
        profile.uid,
        serviceId,
        profile.favoriteServices || []
      );
      onShowToast?.(
        added
          ? language === 'bn'
            ? 'সার্ভিসটি বুকমার্ক তালিকায় সেভ হয়েছে!'
            : 'Added to saved services!'
          : language === 'bn'
          ? 'বুকমার্ক থেকে সরানো হয়েছে'
          : 'Removed from saved services',
        'info'
      );
    } catch {
      onShowToast?.(
        language === 'bn' ? 'বুকমার্ক আপডেট ব্যর্থ হয়েছে' : 'Failed to update favorite',
        'error'
      );
    }
  };

  const handleToggleCompare = (e: React.MouseEvent, serviceId: string) => {
    e.stopPropagation();
    setCompareIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      }
      if (prev.length >= 3) {
        onShowToast?.(
          language === 'bn'
            ? 'একসাথে সর্বোচ্চ ৩টি সার্ভিস তুলনা করা যাবে'
            : 'You can compare up to 3 services at once',
          'info'
        );
        return prev;
      }
      return [...prev, serviceId];
    });
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    onShowToast?.(
      language === 'bn' ? `সার্ভিস আইডি #${id} কপি হয়েছে` : `Service ID #${id} copied`,
      'info'
    );
  };

  const comparedServices = useMemo(() => {
    return compareIds
      .map(id => activeServices.find(s => s.id === id))
      .filter((s): s is SMMService => Boolean(s));
  }, [compareIds, activeServices]);

  // Direct Instant Order Handler inside Service Modal
  const handleDirectOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceModal) return;
    setQuickOrderError(null);

    if (!profile) {
      onOpenAuth?.();
      return;
    }

    const cleanLink = quickOrderLink.trim();
    if (!cleanLink || !cleanLink.includes('.')) {
      setQuickOrderError(
        language === 'bn' ? 'সঠিক সোশ্যাল মিডিয়া লিংক দিন' : 'Please enter a valid target link'
      );
      return;
    }

    if (calcQuantity < selectedServiceModal.min || calcQuantity > selectedServiceModal.max) {
      setQuickOrderError(
        language === 'bn'
          ? `পরিমাণ ${selectedServiceModal.min} থেকে ${selectedServiceModal.max.toLocaleString()} এর মধ্যে হতে হবে`
          : `Quantity must be between ${selectedServiceModal.min} and ${selectedServiceModal.max.toLocaleString()}`
      );
      return;
    }

    const totalCharge = Number(((selectedServiceModal.rate / 1000) * calcQuantity).toFixed(2));
    if (profile.balance < totalCharge) {
      setQuickOrderError(
        language === 'bn'
          ? 'ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই! অনুগ্রহ করে ফান্ড অ্যাড করুন।'
          : 'Insufficient balance! Please add funds first.'
      );
      return;
    }

    const duplicate = orders.find(
      o =>
        o.serviceId === selectedServiceModal.id &&
        o.link.trim().toLowerCase() === cleanLink.toLowerCase() &&
        ['pending', 'processing', 'in_progress'].includes(o.status)
    );
    if (duplicate) {
      setQuickOrderError(
        language === 'bn'
          ? `এই লিংকে ইতিমধ্যে একটি অর্ডার (#${duplicate.id}) চলমান আছে!`
          : `Active order (#${duplicate.id}) already exists for this link!`
      );
      return;
    }

    setQuickOrderSubmitting(true);
    try {
      const check = await analyzeSocialLinkOnServer(cleanLink);
      if (!check.valid) {
        setQuickOrderError(
          check.error || (language === 'bn' ? 'লিংকটি সঠিক নয়!' : 'Invalid link URL')
        );
        setQuickOrderSubmitting(false);
        return;
      }

      const orderId = await createOrder(
        {
          userId: profile.uid,
          userEmail: profile.email,
          serviceId: selectedServiceModal.id,
          serviceName: selectedServiceModal.name,
          category: selectedServiceModal.category,
          link: check.normalizedUrl || cleanLink,
          quantity: calcQuantity,
          charge: totalCharge,
          status: 'pending',
          providerId: selectedServiceModal.providerId,
          providerServiceId: selectedServiceModal.providerServiceId
        } as any,
        profile,
        selectedServiceModal
      );

      setSelectedServiceModal(null);
      if (onOrderSuccess) {
        onOrderSuccess(orderId);
      } else {
        onShowToast?.(
          language === 'bn'
            ? `অর্ডার #${orderId} সফলভাবে সম্পন্ন হয়েছে!`
            : `Order #${orderId} placed successfully!`,
          'success'
        );
      }
    } catch (err: any) {
      setQuickOrderError(err?.message || 'Failed to place order');
    } finally {
      setQuickOrderSubmitting(false);
    }
  };

  const platformsList: { key: PlatformKey; label: string; bnLabel: string; accent: string }[] = [
    { key: 'All', label: 'All Services', bnLabel: 'সব সার্ভিস', accent: 'from-rose-500 to-pink-600' },
    { key: 'Facebook', label: 'Facebook', bnLabel: 'Facebook', accent: 'from-blue-600 to-blue-500' },
    { key: 'Instagram', label: 'Instagram', bnLabel: 'Instagram', accent: 'from-fuchsia-600 to-rose-500' },
    { key: 'YouTube', label: 'YouTube', bnLabel: 'YouTube', accent: 'from-red-600 to-rose-600' },
    { key: 'TikTok', label: 'TikTok', bnLabel: 'TikTok', accent: 'from-cyan-500 to-teal-500' },
    { key: 'Telegram', label: 'Telegram', bnLabel: 'Telegram', accent: 'from-sky-500 to-blue-500' },
    { key: 'Twitter', label: 'Twitter / X', bnLabel: 'Twitter / X', accent: 'from-slate-600 to-slate-500' },
    { key: 'Other', label: 'More', bnLabel: 'অন্যান্য', accent: 'from-emerald-600 to-teal-600' }
  ];

  const sortOptions: { key: SortOption; labelBn: string; labelEn: string; shortBn: string; shortEn: string }[] = [
    {
      key: 'default',
      labelBn: 'ডিফল্ট ক্যাটাগরি সাজানো',
      labelEn: 'Default Catalog Order',
      shortBn: 'ডিফল্ট',
      shortEn: 'Default'
    },
    {
      key: 'price_asc',
      labelBn: 'কম দাম থেকে বেশি দাম (৳↑)',
      labelEn: 'Price: Low to High (৳↑)',
      shortBn: 'কম দাম ৳↑',
      shortEn: 'Low Price ৳↑'
    },
    {
      key: 'price_desc',
      labelBn: 'বেশি দাম থেকে কম দাম (৳↓)',
      labelEn: 'Price: High to Low (৳↓)',
      shortBn: 'বেশি দাম ৳↓',
      shortEn: 'High Price ৳↓'
    },
    {
      key: 'speed_fast',
      labelBn: 'সবচেয়ে দ্রুত ডেলিভারি (⚡)',
      labelEn: 'Fastest Delivery Speed (⚡)',
      shortBn: 'দ্রুত স্পিড ⚡',
      shortEn: 'Fastest ⚡'
    },
    {
      key: 'min_asc',
      labelBn: 'সর্বনিম্ন মিনিমাম অর্ডার (Min↑)',
      labelEn: 'Lowest Minimum Order (Min↑)',
      shortBn: 'ছোট অর্ডার',
      shortEn: 'Lowest Min'
    },
    {
      key: 'max_desc',
      labelBn: 'সর্বোচ্চ ক্যাপাসিটি লিমিট (Max↓)',
      labelEn: 'Highest Maximum Limit (Max↓)',
      shortBn: 'সর্বোচ্চ লিমিট',
      shortEn: 'Highest Max'
    },
    {
      key: 'id_asc',
      labelBn: 'সার্ভিস আইডি অনুযায়ী (#)',
      labelEn: 'Service ID Ascending (#)',
      shortBn: 'আইডি #',
      shortEn: 'ID #'
    }
  ];

  // ============================================================================
  // NATIVE MOBILE APP SHIMMER PRELOADER (Zero White/Blank Screen Guarantee)
  // ============================================================================
  if (isLoading || (activeServices.length === 0 && isSyncing)) {
    return (
      <div className="space-y-4 pb-10 w-full max-w-4xl mx-auto overflow-x-hidden animate-in fade-in duration-150">
        {/* Live API Stream Status Pill */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/30 border border-slate-800/90 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-rose-400 animate-spin" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                {language === 'bn'
                  ? 'লাইভ API সার্ভিস ক্যাটালগ প্রস্তুত হচ্ছে...'
                  : 'Loading Live API Service Catalog...'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === 'bn'
                  ? 'সার্ভার থেকে রিয়েল-টাইম রেট ও স্ট্যাটাস সিঙ্ক করা হচ্ছে'
                  : 'Streaming verified services and real-time rates from server'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-400 shrink-0">
            LIVE API
          </span>
        </div>

        {/* Shimmer KPI Grid */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(n => (
            <div
              key={n}
              className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-2 animate-pulse"
            >
              <div className="h-2.5 w-12 bg-slate-800 rounded" />
              <div className="h-4 w-16 bg-slate-700/80 rounded" />
            </div>
          ))}
        </div>

        {/* Shimmer Search & Filter Bar */}
        <div className="h-12 w-full rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />

        {/* Shimmer Platform Pills */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              className="h-9 w-24 rounded-2xl bg-slate-900 border border-slate-800 shrink-0 animate-pulse"
            />
          ))}
        </div>

        {/* Shimmer Mobile App Service Cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div
              key={n}
              className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/90 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-14 bg-slate-800 rounded-lg" />
                  <div className="h-5 w-28 bg-slate-800/70 rounded-lg" />
                </div>
                <div className="h-6 w-20 bg-emerald-950/60 border border-emerald-500/20 rounded-xl" />
              </div>
              <div className="h-4 w-4/5 bg-slate-800 rounded" />
              <div className="h-3.5 w-2/3 bg-slate-800/60 rounded" />
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-slate-800 rounded" />
                  <div className="h-4 w-20 bg-slate-800 rounded" />
                </div>
                <div className="h-8 w-24 bg-rose-950/50 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-12 w-full max-w-4xl mx-auto overflow-x-hidden">
      {/* Background Sync Non-Blocking Banner */}
      {isSyncing && (
        <div className="px-3.5 py-2 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between gap-2 text-[11px] text-sky-300">
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
            <span className="truncate font-semibold">
              {language === 'bn'
                ? 'সার্ভারে API প্রোভাইডার ক্যাটালগ ও রেট অটো-আপডেট চলছে...'
                : 'Auto-syncing live API provider catalog & rates in background...'}
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 shrink-0">
            LIVE
          </span>
        </div>
      )}

      {/* Native Mobile App Header Card with Live Metrics */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0e1526] via-slate-900 to-[#131022] border border-slate-800/90 p-4 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-none">
                  {language === 'bn' ? 'প্রো সার্ভিস এক্সপ্লোরার' : 'Pro Service Explorer'}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'bn'
                    ? '১০০% অটোমেটেড API সার্ভিস ও ইনস্ট্যান্ট রেট ক্যালকুলেটর'
                    : 'Real-time API catalog, smart filters & instant order'}
                </p>
              </div>
            </div>
          </div>

          {/* View Mode Switcher (Card vs Compact) */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-2xl border border-slate-800 shrink-0">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'card'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="App Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">
                {language === 'bn' ? 'কার্ড' : 'Cards'}
              </span>
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'compact'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Compact List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">
                {language === 'bn' ? 'লিস্ট' : 'Compact'}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Live Micro-Stats Strip */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block truncate">
              {language === 'bn' ? 'সার্ভিস সংখ্যা' : 'Matching'}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white font-mono tabular-nums">
              {filteredAndSortedServices.length.toLocaleString()}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block truncate">
              {language === 'bn' ? 'সর্বনিম্ন রেট' : 'Starts From'}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
              {catalogSummary.minRate > 0 ? formatPrice(catalogSummary.minRate) : '—'}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block truncate">
              {language === 'bn' ? 'রিফিল গ্যারান্টি' : 'Refill Backed'}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-sky-400 font-mono tabular-nums">
              {catalogSummary.refillCount.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => setFilterFavoritesOnly(!filterFavoritesOnly)}
            className={`p-2.5 rounded-2xl border text-left transition-all ${
              filterFavoritesOnly
                ? 'bg-rose-500/20 border-rose-500/50'
                : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
              <Heart className={`w-2.5 h-2.5 ${filterFavoritesOnly ? 'fill-rose-400 text-rose-400' : 'text-rose-400'}`} />
              {language === 'bn' ? 'বুকমার্ক' : 'Saved'}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-rose-400 font-mono tabular-nums">
              {favoriteIds.length}
            </span>
          </button>
        </div>
      </div>

      {/* Social Platform App Bar */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full max-w-full">
        {platformsList.map(p => {
          const count = platformCounts[p.key] || 0;
          if (p.key !== 'All' && count === 0) return null;
          const isSelected = selectedPlatform === p.key;
          return (
            <button
              key={p.key}
              onClick={() => {
                setSelectedPlatform(p.key);
                setSelectedCategory('All');
              }}
              className={`py-2 px-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                isSelected
                  ? `bg-gradient-to-r ${p.accent} text-white border-transparent shadow-md`
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span>{language === 'bn' ? p.bnLabel : p.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-black/25 text-white' : 'bg-slate-950 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sticky Search + Category Picker + Advanced Filter Button */}
      <div className="sticky top-14 z-20 bg-slate-950/90 backdrop-blur-md py-1.5 space-y-2">
        <div className="flex gap-2 w-full">
          {/* Instant Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                language === 'bn'
                  ? 'সার্ভিস নাম, ক্যাটাগরি বা #ID দিয়ে খুঁজুন...'
                  : 'Search service name, category or #ID...'
              }
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Searchable Category Selector Trigger */}
          <button
            onClick={() => setIsCategorySheetOpen(true)}
            className={`px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 max-w-[150px] sm:max-w-[200px] ${
              selectedCategory !== 'All'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">
              {selectedCategory === 'All'
                ? language === 'bn'
                  ? `ক্যাটাগরি (${categoryStats.length})`
                  : `Categories (${categoryStats.length})`
                : selectedCategory}
            </span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
          </button>

          {/* Advanced Filter Sheet Trigger */}
          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className={`px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 relative ${
              activeFilterCount > 0
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ফিল্টার' : 'Filters'}</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Price Sort & Feature Quick-Filter Bar (Horizontal Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {/* Price Low to High Toggle */}
          <button
            onClick={() => setSortBy(sortBy === 'price_asc' ? 'default' : 'price_asc')}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border ${
              sortBy === 'price_asc'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpNarrowWide className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'bn' ? 'কম দাম → বেশি দাম' : 'Price: Low → High'}</span>
          </button>

          {/* Price High to Low Toggle */}
          <button
            onClick={() => setSortBy(sortBy === 'price_desc' ? 'default' : 'price_desc')}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border ${
              sortBy === 'price_desc'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownWideNarrow className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'bn' ? 'বেশি দাম → কম দাম' : 'Price: High → Low'}</span>
          </button>

          {/* Fastest Delivery Sort Toggle */}
          <button
            onClick={() => setSortBy(sortBy === 'speed_fast' ? 'default' : 'speed_fast')}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border ${
              sortBy === 'speed_fast'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>{language === 'bn' ? 'দ্রুত ডেলিভারি' : 'Fastest Speed'}</span>
          </button>

          {/* Refill Filter Chip */}
          <button
            onClick={() => setFilterRefillOnly(!filterRefillOnly)}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border ${
              filterRefillOnly
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'bn' ? 'Refill গ্যারান্টি' : 'Refill Only'}</span>
          </button>

          {/* Instant / Fast Filter Chip */}
          <button
            onClick={() => setFilterFastOnly(!filterFastOnly)}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border ${
              filterFastOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'bn' ? 'ইনস্ট্যান্ট / ফাস্ট' : 'Instant / Fast'}</span>
          </button>

          {/* Low Min Filter Chip */}
          <button
            onClick={() => setFilterLowMinOnly(!filterLowMinOnly)}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border ${
              filterLowMinOnly
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>{language === 'bn' ? 'Min ≤ ১০০' : 'Min ≤ 100'}</span>
          </button>

          {/* Drip-feed Filter Chip */}
          <button
            onClick={() => setFilterDripfeedOnly(!filterDripfeedOnly)}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border ${
              filterDripfeedOnly
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Repeat className="w-3 h-3 text-indigo-400" />
            <span>Drip-Feed</span>
          </button>

          {/* Reset Button if any filter is active */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'bn' ? 'রিসেট' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Category Active Banner (if specific category selected) */}
      {selectedCategory !== 'All' && (
        <div className="px-3.5 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 shrink-0">
              {language === 'bn' ? 'নির্বাচিত ক্যাটাগরি:' : 'Category:'}
            </span>
            <span className="font-bold text-rose-300 truncate">{selectedCategory}</span>
          </div>
          <button
            onClick={() => setSelectedCategory('All')}
            className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 shrink-0 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800"
          >
            <X className="w-3 h-3" />
            <span>{language === 'bn' ? 'সব দেখুন' : 'Show All'}</span>
          </button>
        </div>
      )}

      {/* Services List / Cards */}
      {filteredAndSortedServices.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
            <Filter className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              {language === 'bn'
                ? 'এই ফিল্টারে কোনো সার্ভিস পাওয়া যায়নি'
                : 'No services match your current filters'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'bn'
                ? 'অন্য কোনো কি-ওয়ার্ড দিয়ে খুঁজুন অথবা ফিল্টার রিসেট করুন'
                : 'Try adjusting your search keywords or resetting the active filters'}
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'সব ফিল্টার রিসেট করুন' : 'Reset All Filters'}</span>
            </button>
          )}
        </div>
      ) : viewMode === 'compact' ? (
        /* COMPACT MOBILE LIST MODE */
        <div className="space-y-1.5">
          {visibleServices.map(srv => {
            const isFav = favoriteIds.includes(srv.id);
            const isCompared = compareIds.includes(srv.id);
            return (
              <div
                key={srv.id}
                onClick={() => setSelectedServiceModal(srv)}
                className="p-3 rounded-2xl bg-slate-900/95 border border-slate-800/90 hover:border-slate-700 transition-all flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-[10px] text-rose-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      #{srv.id}
                    </span>
                    {srv.refill && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        R
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-100 truncate block max-w-full">
                      {srv.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="truncate max-w-[140px] text-slate-500">{srv.category}</span>
                    <span>•</span>
                    <span>
                      Min: <strong className="text-slate-300">{srv.min}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-amber-300/90">{srv.averageTime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-emerald-400 font-mono tabular-nums">
                      {formatPrice(srv.rate)}
                    </div>
                    <div className="text-[9px] text-slate-500">/ 1,000</div>
                  </div>

                  <button
                    onClick={e => handleToggleFavorite(e, srv.id)}
                    className={`p-1.5 rounded-xl border transition-all ${
                      isFav
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400' : ''}`} />
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onSelectServiceForOrder(srv.id, srv.category);
                    }}
                    className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow active:scale-95 transition-all"
                  >
                    {language === 'bn' ? 'অর্ডার' : 'Order'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* RICH NATIVE MOBILE APP CARD MODE */
        <div className="space-y-2.5">
          {visibleServices.map(srv => {
            const isFav = favoriteIds.includes(srv.id);
            const isCompared = compareIds.includes(srv.id);
            const isFast = isFastService(srv.averageTime);
            const minOrderCost = Number(((srv.rate / 1000) * srv.min).toFixed(2));

            return (
              <div
                key={srv.id}
                onClick={() => setSelectedServiceModal(srv)}
                className={`p-4 rounded-3xl bg-[#0e1525] border transition-all shadow-sm space-y-2.5 text-xs cursor-pointer active:scale-[0.995] ${
                  isCompared
                    ? 'border-sky-500/60 ring-1 ring-sky-500/30'
                    : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Top Row: ID + Category + Badges + Rate */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <button
                      onClick={e => handleCopyId(e, srv.id)}
                      className="font-mono font-bold text-white bg-slate-950 hover:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-800 text-[11px] flex items-center gap-1 transition-colors"
                      title="Tap to copy Service ID"
                    >
                      <span>#{srv.id}</span>
                      {copiedId === srv.id ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-slate-500" />
                      )}
                    </button>

                    <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg truncate max-w-[170px] sm:max-w-[260px]">
                      {srv.category}
                    </span>

                    {srv.refill && (
                      <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" /> Refill
                      </span>
                    )}

                    {isFast && (
                      <span className="text-amber-300 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 fill-amber-300" /> Fast
                      </span>
                    )}

                    {srv.dripfeed && (
                      <span className="text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-1.5 py-0.5 rounded-lg text-[10px] font-bold">
                        Drip
                      </span>
                    )}
                  </div>

                  {/* Price Badge */}
                  <div className="text-right shrink-0 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-2xl">
                    <span className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                      {formatPrice(srv.rate)}
                    </span>
                    <span className="text-[10px] text-emerald-300/70 font-normal block leading-none">
                      {language === 'bn' ? 'প্রতি ১,০০০' : 'per 1,000'}
                    </span>
                  </div>
                </div>

                {/* Service Title */}
                <h3 className="font-bold text-slate-100 leading-snug line-clamp-2 text-[13px]">
                  {srv.name}
                </h3>

                {/* Specs Chips & Actions Row */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/70 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                    <span className="bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800/80">
                      Min: <strong className="text-slate-200 font-mono">{srv.min.toLocaleString()}</strong>
                    </span>
                    <span className="bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800/80">
                      Max: <strong className="text-slate-200 font-mono">{srv.max.toLocaleString()}</strong>
                    </span>
                    <span className="bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800/80 text-amber-300 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {srv.averageTime || 'Instant'}
                    </span>
                    <span className="hidden sm:inline text-[10px] text-slate-500">
                      ({language === 'bn' ? 'মিনিমাম খরচ:' : 'Min cost:'}{' '}
                      <strong className="text-emerald-400 font-mono">{formatPrice(minOrderCost)}</strong>)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Favorite Button */}
                    <button
                      onClick={e => handleToggleFavorite(e, srv.id)}
                      className={`p-2 rounded-xl border transition-all ${
                        isFav
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={language === 'bn' ? 'বুকমার্ক করুন' : 'Bookmark Service'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400' : ''}`} />
                    </button>

                    {/* Compare Button */}
                    <button
                      onClick={e => handleToggleCompare(e, srv.id)}
                      className={`p-2 rounded-xl border transition-all ${
                        isCompared
                          ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={language === 'bn' ? 'তুলনা করুন' : 'Compare Service'}
                    >
                      <Scale className="w-3.5 h-3.5" />
                    </button>

                    {/* Calculator / Details Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedServiceModal(srv);
                      }}
                      className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-[11px] flex items-center gap-1"
                    >
                      <Calculator className="w-3.5 h-3.5 text-sky-400" />
                      <span className="hidden sm:inline">{language === 'bn' ? 'হিসাব' : 'Calc'}</span>
                    </button>

                    {/* Direct Order Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectServiceForOrder(srv.id, srv.category);
                      }}
                      className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      <span>{language === 'bn' ? 'অর্ডার' : 'Order'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Trigger & Load More Button */}
      {hasMoreServices && (
        <div ref={loadMoreTriggerRef} className="pt-2 flex flex-col items-center gap-2">
          <button
            onClick={() =>
              setVisibleCount(prev =>
                Math.min(prev + PAGE_BATCH_SIZE * 2, filteredAndSortedServices.length)
              )
            }
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <span>
              {language === 'bn'
                ? `আরও সার্ভিস দেখুন (${visibleServices.length} / ${filteredAndSortedServices.length})`
                : `Load More Services (${visibleServices.length} of ${filteredAndSortedServices.length})`}
            </span>
            <ChevronDown className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      )}

      {/* Floating Comparison Bar (when 1-3 services are selected for comparison) */}
      <AnimatePresence>
        {comparedServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-20 left-3 right-3 max-w-md mx-auto z-40 p-3 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-sky-500/40 shadow-2xl flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-extrabold text-xs shrink-0">
                {comparedServices.length}/3
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {language === 'bn' ? 'সার্ভিস তুলনা রেডি' : 'Service Comparison Ready'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {comparedServices.map(s => `#${s.id}`).join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setCompareIds([])}
                className="p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-white border border-slate-800 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsCompareSheetOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-md"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'তুলনা দেখুন' : 'Compare Now'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODAL 1: SEARCHABLE CATEGORY PICKER BOTTOM SHEET
      ===================================================================== */}
      {isCategorySheetOpen && (
        <div
          onClick={() => setIsCategorySheetOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 text-white space-y-3 shadow-2xl max-h-[82vh] flex flex-col"
          >
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {language === 'bn' ? 'ক্যাটাগরি নির্বাচন করুন' : 'Select Service Category'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn'
                    ? `মোট ${categoryStats.length}টি সক্রিয় ক্যাটাগরি`
                    : `${categoryStats.length} active categories available`}
                </p>
              </div>
              <button
                onClick={() => setIsCategorySheetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-950 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={categorySearchQuery}
                onChange={e => setCategorySearchQuery(e.target.value)}
                placeholder={language === 'bn' ? 'ক্যাটাগরি খুঁজুন...' : 'Search category...'}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Category List */}
            <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setIsCategorySheetOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  selectedCategory === 'All'
                    ? 'bg-rose-600/20 border-rose-500/50 text-white'
                    : 'bg-slate-950/80 border-slate-800/80 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold">
                  {language === 'bn' ? 'সকল ক্যাটাগরি (All Categories)' : 'All Categories'}
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-900 text-rose-400">
                  {platformScopedServices.length}
                </span>
              </button>

              {categoryStats
                .filter(
                  c =>
                    !categorySearchQuery.trim() ||
                    c.name.toLowerCase().includes(categorySearchQuery.toLowerCase().trim())
                )
                .map(cat => {
                  const active = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setIsCategorySheetOpen(false);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all ${
                        active
                          ? 'bg-rose-600/20 border-rose-500/50 text-white'
                          : 'bg-slate-950/80 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold line-clamp-1 flex-1">{cat.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {formatPrice(cat.minRate)}+
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300">
                          {cat.count}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ADVANCED FILTER & SORT BOTTOM SHEET
      ===================================================================== */}
      {isFilterSheetOpen && (
        <div
          onClick={() => setIsFilterSheetOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 text-white space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-extrabold text-white">
                  {language === 'bn' ? 'অ্যাডভান্সড ফিল্টার ও সর্টিং' : 'Advanced Filters & Sorting'}
                </h3>
              </div>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-950 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sort By Section */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'সাজানোর ধরন (Sort By)' : 'Sort Services By'}
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {sortOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                      sortBy === opt.key
                        ? 'bg-rose-600/20 border-rose-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{language === 'bn' ? opt.labelBn : opt.labelEn}</span>
                    {sortBy === opt.key && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter (BDT per 1K) */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'মূল্য সীমা (প্রতি ১,০০০ ইউনিট ৳)' : 'Price Range (per 1,000 units ৳)'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder={language === 'bn' ? 'সর্বনিম্ন রেট (৳)' : 'Min Rate (৳)'}
                  value={minPriceRate}
                  onChange={e => setMinPriceRate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
                <input
                  type="number"
                  min="0"
                  placeholder={language === 'bn' ? 'সর্বোচ্চ রেট (৳)' : 'Max Rate (৳)'}
                  value={maxPriceRate}
                  onChange={e => setMaxPriceRate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              {/* Budget Presets */}
              <div className="flex gap-1.5 flex-wrap pt-1">
                {[
                  { label: language === 'bn' ? 'সব রেট' : 'Any', min: '', max: '' },
                  { label: '≤ ৳20', min: '', max: '20' },
                  { label: '৳20 - ৳100', min: '20', max: '100' },
                  { label: '৳100 - ৳500', min: '100', max: '500' },
                  { label: '৳500+', min: '500', max: '' }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMinPriceRate(preset.min);
                      setMaxPriceRate(preset.max);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                      minPriceRate === preset.min && maxPriceRate === preset.max
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Type Filter */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'সার্ভিস টাইপ' : 'Service Type'}
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {['All', 'Default', 'Custom Comments', 'Package', 'Subscriptions'].map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedServiceType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      selectedServiceType === t
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Checkboxes */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setFilterRefillOnly(!filterRefillOnly)}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                  filterRefillOnly
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Refill Guarantee</span>
              </button>

              <button
                onClick={() => setFilterFastOnly(!filterFastOnly)}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                  filterFastOnly
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Fast Delivery</span>
              </button>

              <button
                onClick={() => setFilterDripfeedOnly(!filterDripfeedOnly)}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                  filterDripfeedOnly
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Repeat className="w-4 h-4" />
                <span>Drip-Feed</span>
              </button>

              <button
                onClick={() => setFilterLowMinOnly(!filterLowMinOnly)}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                  filterLowMinOnly
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Min ≤ 100</span>
              </button>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={resetAllFilters}
                className="flex-1 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 font-bold text-xs"
              >
                {language === 'bn' ? 'রিসেট সব' : 'Reset All'}
              </button>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg"
              >
                {language === 'bn'
                  ? `ফলাফল দেখুন (${filteredAndSortedServices.length})`
                  : `Show Results (${filteredAndSortedServices.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: SIDE-BY-SIDE SERVICE COMPARISON BOTTOM SHEET
      ===================================================================== */}
      {isCompareSheetOpen && comparedServices.length > 0 && (
        <div
          onClick={() => setIsCompareSheetOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 text-white space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-extrabold text-white">
                  {language === 'bn' ? 'সার্ভিস তুলনা (Compare Services)' : 'Side-by-Side Service Comparison'}
                </h3>
              </div>
              <button
                onClick={() => setIsCompareSheetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-950 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {comparedServices.map(srv => (
                <div
                  key={srv.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3 text-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        #{srv.id}
                      </span>
                      <button
                        onClick={() => setCompareIds(prev => prev.filter(id => id !== srv.id))}
                        className="text-slate-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="font-bold text-white line-clamp-2 leading-snug">{srv.name}</h4>
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Rate / 1K:</span>
                        <span className="font-mono font-extrabold text-emerald-400">
                          {formatPrice(srv.rate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Min / Max:</span>
                        <span className="font-mono text-slate-200">
                          {srv.min} – {srv.max.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg. Speed:</span>
                        <span className="text-amber-300 font-semibold">{srv.averageTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Refill:</span>
                        <span className={srv.refill ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {srv.refill ? 'Yes (Guaranteed)' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Drip-Feed:</span>
                        <span className={srv.dripfeed ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
                          {srv.dripfeed ? 'Supported' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsCompareSheetOpen(false);
                      onSelectServiceForOrder(srv.id, srv.category);
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>{language === 'bn' ? 'অর্ডার করুন' : 'Select & Order'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: SERVICE DETAILS + INTERACTIVE PRICE CALCULATOR + 1-TAP ORDER
      ===================================================================== */}
      {selectedServiceModal && (
        <div
          onClick={() => setSelectedServiceModal(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 text-white space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto"
          >
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20 shrink-0">
                  #{selectedServiceModal.id}
                </span>
                <span className="text-xs font-bold text-slate-300 truncate">
                  {selectedServiceModal.category}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={e => handleToggleFavorite(e, selectedServiceModal.id)}
                  className={`p-1.5 rounded-xl border ${
                    favoriteIds.includes(selectedServiceModal.id)
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      favoriteIds.includes(selectedServiceModal.id) ? 'fill-rose-400' : ''
                    }`}
                  />
                </button>
                <button
                  onClick={() => setSelectedServiceModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-950 border border-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Service Name */}
            <h3 className="text-sm font-extrabold text-white leading-snug">
              {selectedServiceModal.name}
            </h3>

            {/* 3-Column Core Specs */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">
                  {language === 'bn' ? 'মূল্য / ১ হাজার' : 'Rate / 1K'}
                </span>
                <span className="font-extrabold text-emerald-400 font-mono text-sm">
                  {formatPrice(selectedServiceModal.rate)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Min / Max</span>
                <span className="font-bold text-slate-200 font-mono text-[11px]">
                  {selectedServiceModal.min} - {selectedServiceModal.max.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">
                  {language === 'bn' ? 'গড় সময়' : 'Avg. Speed'}
                </span>
                <span className="font-bold text-amber-300 text-[11px]">
                  {selectedServiceModal.averageTime || 'Instant'}
                </span>
              </div>
            </div>

            {/* Interactive Live Price Calculator */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'লাইভ প্রাইস ক্যালকুলেটর' : 'Live Price Calculator'}
                </span>
                <span className="text-xs font-extrabold text-emerald-400 font-mono">
                  {language === 'bn' ? 'মোট খরচ:' : 'Total:'}{' '}
                  {formatPrice(Number(((selectedServiceModal.rate / 1000) * calcQuantity).toFixed(2)))}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={selectedServiceModal.min}
                  max={selectedServiceModal.max}
                  value={calcQuantity}
                  onChange={e => setCalcQuantity(Math.max(0, Number(e.target.value)))}
                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none"
                  placeholder="Enter quantity..."
                />
                <div className="flex gap-1">
                  {[
                    selectedServiceModal.min,
                    1000,
                    5000,
                    10000
                  ]
                    .filter(
                      (v, i, arr) =>
                        v >= selectedServiceModal.min &&
                        v <= selectedServiceModal.max &&
                        arr.indexOf(v) === i
                    )
                    .slice(0, 3)
                    .map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCalcQuantity(preset)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold border ${
                          calcQuantity === preset
                            ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {preset >= 1000 ? `${preset / 1000}K` : preset}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Description Box */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'সার্ভিস বিবরণ ও শর্তাবলী' : 'Service Description & Rules'}
              </span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950 p-3 rounded-2xl border border-slate-800/80 max-h-36 overflow-y-auto font-sans">
                {selectedServiceModal.description ||
                  (language === 'bn'
                    ? '• পাবলিক লিংক প্রদান করুন\n• অর্ডার চলাকালীন প্রোফাইল বা পোস্ট প্রাইভেট করবেন না\n• ১০০% অটোমেটেড API প্রসেসিং'
                    : '• Provide a public link\n• Do not set account to private during delivery\n• 100% Automated API processing')}
              </p>
            </div>

            {/* Direct Quick-Order Form Inside Sheet (Optional 1-Tap Expand) */}
            {showDirectOrderForm ? (
              <form onSubmit={handleDirectOrderSubmit} className="space-y-3 pt-1 border-t border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-rose-400" />
                    {language === 'bn' ? 'টার্গেট সোশ্যাল লিংক দিন' : 'Target Social Media Link'}
                  </label>
                  <input
                    type="text"
                    required
                    value={quickOrderLink}
                    onChange={e => setQuickOrderLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {quickOrderError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{quickOrderError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDirectOrderForm(false)}
                    className="py-3 px-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 font-bold text-xs"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Back'}
                  </button>
                  <button
                    type="submit"
                    disabled={quickOrderSubmitting}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>
                      {quickOrderSubmitting
                        ? language === 'bn'
                          ? 'প্রসেসিং হচ্ছে...'
                          : 'Submitting...'
                        : language === 'bn'
                        ? `কনফার্ম অর্ডার (${formatPrice(
                            Number(((selectedServiceModal.rate / 1000) * calcQuantity).toFixed(2))
                          )})`
                        : `Confirm Order (${formatPrice(
                            Number(((selectedServiceModal.rate / 1000) * calcQuantity).toFixed(2))
                          )})`}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDirectOrderForm(true)}
                  className="py-3.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>{language === 'bn' ? '১-ক্লিক ইনস্ট্যান্ট অর্ডার' : '1-Tap Instant Order'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const srv = selectedServiceModal;
                    setSelectedServiceModal(null);
                    onSelectServiceForOrder(srv.id, srv.category);
                  }}
                  className="py-3.5 px-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>{language === 'bn' ? 'অর্ডার ফর্মে যান' : 'Open Order Form'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
