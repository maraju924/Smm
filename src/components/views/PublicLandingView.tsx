import React, { useState, useMemo } from 'react';
import {
  Zap,
  ShieldCheck,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  Code2,
  Wallet,
  Search,
  Globe,
  ChevronDown,
  Terminal,
  Copy,
  Check,
  Sparkles,
  Lock,
  TrendingUp,
  LayoutDashboard,
  LogIn,
  UserPlus
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMService, Announcement, SiteSettings } from '../../types';

interface PublicLandingViewProps {
  services: SMMService[];
  announcements: Announcement[];
  siteSettings?: SiteSettings;
  onNavigateTab: (tabId: string, params?: any) => void;
  onOpenAuth: () => void;
  onEnterWorkspace?: () => void;
}

export const PublicLandingView: React.FC<PublicLandingViewProps> = ({
  services,
  announcements,
  siteSettings,
  onNavigateTab,
  onOpenAuth,
  onEnterWorkspace
}) => {
  const { profile, language, setLanguage, currency, setCurrency, formatPrice } = useAuth();

  // Interactive Hero Calculator State
  const [calcPlatform, setCalcPlatform] = useState<string>('All');
  const [calcServiceId, setCalcServiceId] = useState<string>('');
  const [calcQuantity, setCalcQuantity] = useState<number>(1000);

  // Live Catalog Preview State
  const [catalogPlatform, setCatalogPlatform] = useState<string>('All');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Code Snippet Copy State
  const [copiedCode, setCopiedCode] = useState(false);

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const activeServices = useMemo(
    () => services.filter(s => s.status !== 'disabled'),
    [services]
  );

  // Filtered services for Hero Interactive Calculator
  const calcServices = useMemo(() => {
    if (calcPlatform === 'All') return activeServices.slice(0, 60);
    const q = calcPlatform.toLowerCase();
    return activeServices
      .filter(s => s.category.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 60);
  }, [activeServices, calcPlatform]);

  const selectedCalcService = useMemo(() => {
    return calcServices.find(s => s.id === calcServiceId) || calcServices[0] || null;
  }, [calcServices, calcServiceId]);

  const clampedCalcQty = useMemo(() => {
    if (!selectedCalcService) return calcQuantity;
    return Math.max(
      selectedCalcService.min || 100,
      Math.min(selectedCalcService.max || 100000, calcQuantity)
    );
  }, [selectedCalcService, calcQuantity]);

  const estimatedChargeBdt = useMemo(() => {
    if (!selectedCalcService) return 0;
    return (selectedCalcService.rate * clampedCalcQty) / 1000;
  }, [selectedCalcService, clampedCalcQty]);

  // Filtered services for Live Catalog Table Preview
  const previewCatalogServices = useMemo(() => {
    return activeServices
      .filter(s => {
        const matchPlatform =
          catalogPlatform === 'All' ||
          s.category.toLowerCase().includes(catalogPlatform.toLowerCase()) ||
          s.name.toLowerCase().includes(catalogPlatform.toLowerCase());
        const matchQuery =
          !catalogSearch ||
          s.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
          s.id.toLowerCase().includes(catalogSearch.toLowerCase()) ||
          s.category.toLowerCase().includes(catalogSearch.toLowerCase());
        return matchPlatform && matchQuery;
      })
      .slice(0, 8);
  }, [activeServices, catalogPlatform, catalogSearch]);

  //Lowest rate per 1k in catalog
  const lowestRateService = useMemo(() => {
    if (activeServices.length === 0) return null;
    return [...activeServices].sort((a, b) => a.rate - b.rate)[0];
  }, [activeServices]);

  const categoriesCount = useMemo(() => {
    return new Set(activeServices.map(s => s.category)).size;
  }, [activeServices]);

  const activeAnnouncement = useMemo(
    () => announcements.find(a => a.active),
    [announcements]
  );

  const apiCodeSample = `curl -X POST https://amartrendsmm.com/api/v2 \\
  -d "key=YOUR_LIVE_API_KEY" \\
  -d "action=add" \\
  -d "service=${selectedCalcService?.id || '101'}" \\
  -d "link=https://facebook.com/yourpost" \\
  -d "quantity=${clampedCalcQty}"`;

  const handleCopyApiSnippet = () => {
    navigator.clipboard.writeText(apiCodeSample);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const faqs = [
    {
      q:
        language === 'bn'
          ? 'অর্ডার দেওয়ার কতক্ষণের মধ্যে কাজ শুরু হয়?'
          : 'How fast do orders start after submission?',
      a:
        language === 'bn'
          ? 'আমাদের ক্লাউড সার্ভার সরাসরি আপস্ট্রিম API প্রোভাইডারের সাথে যুক্ত। অর্ডার সাবমিট করার কয়েক সেকেন্ডের মধ্যেই স্বয়ংক্রিয়ভাবে ডিসপ্যাচ হয় এবং স্ট্যাটাস প্রতি ৫ মিনিটে অটো-সিঙ্ক হয়।'
          : 'Orders are dispatched to upstream API clusters within milliseconds of submission. Real-time background workers synchronize start counts, remains, and completion status every 5 minutes.'
    },
    {
      q:
        language === 'bn'
          ? 'ওয়ালেটে কীভাবে টাকা (ফান্ড) অ্যাড করব?'
          : 'What payment methods are supported for adding funds?',
      a:
        language === 'bn'
          ? 'আপনি বিকাশ (bKash), নগদ (Nagad), রকেট (Rocket), উপায় (Upay) এবং Binance USDT (TRC-20)-এর মাধ্যমে তাৎক্ষণিক ফান্ড অ্যাড করতে পারবেন। এছাড়া ডিপোজিটের ওপর বিশেষ বোনাস ও প্রোমো ভাউচার সুবিধা রয়েছে।'
          : 'We support local Bangladeshi gateways (bKash, Nagad, Rocket, Upay) alongside Binance USDT. Special deposit bonuses and promotional gift vouchers are credited directly to your wallet.'
    },
    {
      q:
        language === 'bn'
          ? 'অর্ডার ক্যানসেল বা পার্শিয়াল হলে কি টাকা রিফান্ড পাওয়া যায়?'
          : 'What happens if an order is partial or canceled?',
      a:
        language === 'bn'
          ? 'হ্যাঁ, ১০০% অটোমেটিক। কোনো অর্ডার ক্যানসেল হলে সম্পূর্ণ টাকা এবং পার্শিয়াল (Partial) হলে বাকি থাকা ইউনিটের টাকা স্বয়ংক্রিয়ভাবে আপনার ওয়ালেট ব্যালেন্সে রিফান্ড হয়ে যায়।'
          : 'Yes. Atomic Firestore transactions automatically refund 100% of canceled orders or the exact undelivered portion of partial orders back into your wallet balance.'
    },
    {
      q:
        language === 'bn'
          ? 'রিসেলার এবং চাইল্ড প্যানেলের জন্য কি API সুবিধা আছে?'
          : 'Do you provide a REST API for resellers and agencies?',
      a:
        language === 'bn'
          ? 'হ্যাঁ! প্রোফাইল সেকশন থেকে আপনি ১-ক্লিকে আপনার নিজস্ব API Key জেনারেট করতে পারবেন এবং স্ট্যান্ডার্ড /api/v2 এন্ডপয়েন্ট ব্যবহার করে যেকোনো প্যানেল সংযুক্ত করতে পারবেন।'
          : 'Yes. Every account includes full access to our standard /api/v2 endpoint supporting services, add, status, multi-status, refill, and balance queries.'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#080B14] text-[#F1F5F9] font-sans selection:bg-[#8B5CF6] selection:text-white overflow-x-hidden relative">
      {/* Subtle Ambient Radial Lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-[#8B5CF6]/[0.11] blur-[130px]" />
        <div className="absolute top-1/3 -right-32 w-[440px] h-[440px] rounded-full bg-[#22D3EE]/[0.08] blur-[130px]" />
      </div>

      {/* =====================================================================
          TOP ANNOUNCEMENT RIBBON (IF ACTIVE IN DATABASE)
         ===================================================================== */}
      {activeAnnouncement && (
        <div className="relative z-30 bg-[#0D1220] border-b border-white/[0.07] px-4 py-2 text-center text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse shrink-0" />
            <span className="font-bold text-[#22D3EE] shrink-0">{activeAnnouncement.title}:</span>
            <span className="text-[#F1F5F9] truncate">{activeAnnouncement.content}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          PUBLIC STICKY HYBRID GLASS NAVIGATION HEADER
         ===================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#080B14]/85 backdrop-blur-2xl border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] p-[1px] shadow-lg shadow-[#8B5CF6]/25">
              <div className="w-full h-full rounded-[15px] bg-[#080B14] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#22D3EE]" />
              </div>
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-[#F1F5F9] block leading-none">
                {siteSettings?.siteName || 'AmarTrend'}
                <span className="text-[#22D3EE] ml-1 font-mono text-xs font-bold">SMM</span>
              </span>
              <span className="text-[10px] font-mono text-[#94A3B8] tracking-wider uppercase block mt-0.5">
                Automated Growth Engine
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#94A3B8]">
            <a href="#live-catalog" className="hover:text-[#F1F5F9] transition-colors">
              {language === 'bn' ? 'লাইভ সার্ভিস ক্যাটালগ' : 'Live Services'}
            </a>
            <a href="#architecture" className="hover:text-[#F1F5F9] transition-colors">
              {language === 'bn' ? 'প্ল্যাটফর্ম ফিচার' : 'Infrastructure'}
            </a>
            <a href="#developer-api" className="hover:text-[#F1F5F9] transition-colors">
              {language === 'bn' ? 'ডেভেলপার API v2' : 'REST API v2'}
            </a>
            <a href="#faq" className="hover:text-[#F1F5F9] transition-colors">
              {language === 'bn' ? 'প্রশ্নোত্তর' : 'FAQ'}
            </a>
          </nav>

          {/* Right Utility & Auth Actions */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="h-9 px-2.5 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.08] text-xs font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{language === 'bn' ? 'EN' : 'বাং'}</span>
            </button>

            {/* Currency Toggle */}
            <button
              type="button"
              onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
              className="hidden sm:flex h-9 px-2.5 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.08] text-xs font-mono font-bold text-[#22D3EE] items-center justify-center transition-colors"
            >
              {currency === 'BDT' ? '৳ BDT' : '$ USD'}
            </button>

            {profile ? (
              <button
                type="button"
                onClick={() => (onEnterWorkspace ? onEnterWorkspace() : onNavigateTab('home'))}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-[#8B5CF6]/25"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ড্যাশবোর্ডে যান' : 'Open Dashboard'}</span>
              </button>
            ) : (
              <>
                {onEnterWorkspace && (
                  <button
                    type="button"
                    onClick={onEnterWorkspace}
                    className="hidden sm:flex h-9 px-3.5 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.08] text-[#F1F5F9] text-xs font-bold items-center gap-1.5 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>{language === 'bn' ? 'গেস্ট ড্যাশবোর্ড' : 'Guest Workspace'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:opacity-95 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-[#8B5CF6]/30 active:scale-95 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'লগইন / রেজিস্টার' : 'Sign In / Join'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          HERO SECTION: ASYMMETRICAL 12-COLUMN EDITORIAL + INTERACTIVE SIMULATOR
         ===================================================================== */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Editorial Value Proposition (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141B2B] border border-[#8B5CF6]/35 text-[11px] font-mono text-[#22D3EE]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
              <span>
                {language === 'bn'
                  ? `${activeServices.length}+ লাইভ সার্ভিস • ৫ মিনিট অটো-সিঙ্ক ইঞ্জিন`
                  : `${activeServices.length}+ LIVE API SERVICES • 5-MIN AUTO SYNC`}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black text-[#F1F5F9] tracking-tight leading-[1.08]">
              {language === 'bn' ? (
                <>
                  সোশ্যাল মিডিয়া গ্রোথ ও{' '}
                  <span className="bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#22D3EE] bg-clip-text text-transparent">
                    অটোমেটেড SMM API
                  </span>{' '}
                  ওয়ার্কস্পেস
                </>
              ) : (
                <>
                  Precision Social Growth &{' '}
                  <span className="bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#22D3EE] bg-clip-text text-transparent">
                    Automated SMM API
                  </span>{' '}
                  Infrastructure
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-[#94A3B8] max-w-2xl leading-relaxed">
              {language === 'bn'
                ? 'কন্টেন্ট ক্রিয়েটর, মার্কেটিং এজেন্সি এবং রিসেলারদের জন্য বাংলাদেশের সবচেয়ে আধুনিক ক্লাউড SMM প্ল্যাটফর্ম। সরাসরি পাইকারি API রেটে Facebook, Instagram, YouTube, TikTok ও Telegram সার্ভিস অর্ডার করুন বিকাশ, নগদ ও USDT পেমেন্টের মাধ্যমে।'
                : 'Built for agencies, creators, and high-volume resellers. Dispatch instant orders across Facebook, Instagram, YouTube, TikTok, and Telegram at wholesale API rates with atomic wallet protection and real-time delivery telemetry.'}
            </p>

            {/* Primary & Secondary Hero CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => (profile ? onNavigateTab('new-order') : onOpenAuth())}
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:opacity-95 text-white font-extrabold text-sm flex items-center gap-2.5 shadow-xl shadow-[#8B5CF6]/30 active:scale-95 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {profile
                    ? language === 'bn'
                      ? 'নতুন অর্ডার প্লেস করুন'
                      : 'Place New Order'
                    : language === 'bn'
                      ? 'ফ্রি একাউন্ট খুলুন ও শুরু করুন'
                      : 'Create Free Account & Start'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('services')}
                className="h-12 px-5 rounded-2xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.1] text-[#F1F5F9] font-bold text-sm flex items-center gap-2 active:scale-95 transition-all"
              >
                <Layers className="w-4 h-4 text-[#22D3EE]" />
                <span>
                  {language === 'bn'
                    ? `লাইভ সার্ভিস তালিকা (${activeServices.length})`
                    : `Explore Live Catalog (${activeServices.length})`}
                </span>
              </button>
            </div>

            {/* Real Telemetry Strip (Zero Fake Inflated Counters) */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.08] max-w-xl">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] block">
                  {language === 'bn' ? 'সক্রিয় সার্ভিস' : 'Active Services'}
                </span>
                <strong className="text-lg sm:text-2xl font-black text-white font-mono tabular-nums">
                  {activeServices.length}
                </strong>
                <span className="text-[10px] text-[#22D3EE] font-mono block">
                  {categoriesCount} Categories
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] block">
                  {language === 'bn' ? 'শুরু হচ্ছে মাত্র' : 'Starting Rate / 1K'}
                </span>
                <strong className="text-lg sm:text-2xl font-black text-[#22C55E] font-mono tabular-nums">
                  {lowestRateService ? formatPrice(lowestRateService.rate) : formatPrice(5)}
                </strong>
                <span className="text-[10px] text-[#94A3B8] font-mono block">
                  Wholesale API Price
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] block">
                  {language === 'bn' ? 'স্ট্যাটাস সিঙ্ক' : 'Status Telemetry'}
                </span>
                <strong className="text-lg sm:text-2xl font-black text-[#22D3EE] font-mono tabular-nums">
                  5 Min
                </strong>
                <span className="text-[10px] text-[#94A3B8] font-mono block">
                  Auto Cloud Sync
                </span>
              </div>
            </div>

            {/* Verified Payment Gateways Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-mono text-[#94A3B8] mr-1">
                {language === 'bn' ? 'সাপোর্টেড পেমেন্ট গেটওয়ে:' : 'Instant Wallet Funding:'}
              </span>
              {['bKash', 'Nagad', 'Rocket', 'Upay', 'Binance USDT'].map(gw => (
                <span
                  key={gw}
                  className="px-2.5 py-1 rounded-xl bg-[#0D1220] border border-white/[0.07] text-[11px] font-mono font-bold text-[#F1F5F9]"
                >
                  {gw}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Live Service & Price Simulator Card (5 Cols) */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="p-5 sm:p-6 rounded-3xl bg-[#0D1220]/90 backdrop-blur-2xl border border-[#8B5CF6]/35 shadow-[0_24px_80px_rgba(0,0,0,0.65)] space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#22D3EE]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      {language === 'bn'
                        ? 'লাইভ অর্ডার প্রাইস ক্যালকুলেটর'
                        : 'Live Order & Price Estimator'}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8]">
                      {language === 'bn'
                        ? 'সরাসরি ডাটাবেইজ থেকে রিয়েল-টাইম রেট দেখুন'
                        : 'Real-time rates synced from our live catalog'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-[10px] font-mono font-bold">
                  LIVE API
                </span>
              </div>

              {/* Platform Quick Selector */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {['All', 'Facebook', 'Instagram', 'YouTube', 'TikTok', 'Telegram'].map(plat => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => {
                      setCalcPlatform(plat);
                      setCalcServiceId('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                      calcPlatform === plat
                        ? 'bg-[#8B5CF6] text-white shadow'
                        : 'bg-[#080B14] text-[#94A3B8] border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              {selectedCalcService ? (
                <div className="space-y-4">
                  {/* Service Selector Dropdown */}
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#94A3B8] font-bold block mb-1.5">
                      {language === 'bn' ? 'সার্ভিস নির্বাচন করুন' : 'Select Live Service'}
                    </label>
                    <select
                      value={selectedCalcService.id}
                      onChange={e => setCalcServiceId(e.target.value)}
                      className="w-full bg-[#080B14] border border-white/10 rounded-2xl p-3 text-xs text-white font-medium focus:outline-none focus:border-[#8B5CF6]"
                    >
                      {calcServices.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#0D1220]">
                          [#{s.id}] {s.name} — {formatPrice(s.rate)}/1K
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Slider + Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#94A3B8] font-semibold">
                        {language === 'bn' ? 'পরিমাণ (Quantity)' : 'Order Quantity'}
                      </span>
                      <span className="font-mono font-black text-[#22D3EE]">
                        {clampedCalcQty.toLocaleString()} units
                      </span>
                    </div>
                    <input
                      type="range"
                      min={selectedCalcService.min || 100}
                      max={Math.min(50000, selectedCalcService.max || 50000)}
                      step={100}
                      value={clampedCalcQty}
                      onChange={e => setCalcQuantity(Number(e.target.value))}
                      className="w-full accent-[#8B5CF6]"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#64748B]">
                      <span>Min: {(selectedCalcService.min || 100).toLocaleString()}</span>
                      <span>Speed: {selectedCalcService.averageTime || 'Instant'}</span>
                      <span>Max: {(selectedCalcService.max || 100000).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Calculated Total Output Box */}
                  <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.07] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#94A3B8] block">
                        {language === 'bn' ? 'মোট অর্ডার খরচ' : 'Estimated Total Charge'}
                      </span>
                      <span className="text-2xl font-black text-[#22C55E] font-mono tabular-nums">
                        {formatPrice(estimatedChargeBdt)}
                      </span>
                    </div>
                    <div className="text-right font-mono text-[11px] text-[#94A3B8]">
                      <div>Rate: <strong className="text-white">{formatPrice(selectedCalcService.rate)}/1K</strong></div>
                      <div className="text-[#22D3EE]">
                        {selectedCalcService.refill ? '✓ Refill Protected' : '✓ Instant Start'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onNavigateTab('new-order', {
                        serviceId: selectedCalcService.id,
                        category: selectedCalcService.category
                      })
                    }
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>
                      {language === 'bn'
                        ? 'এই সার্ভিসটি এখনই অর্ডার করুন'
                        : 'Configure & Launch This Order'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#94A3B8]">
                  Loading live services from cloud database...
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: LIVE SERVICE CATALOGUE PREVIEW (REAL DATABASE SERVICES)
         ===================================================================== */}
      <section id="live-catalog" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.06]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#22D3EE] font-bold">
              Real-Time Wholesale Rate Card
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              {language === 'bn'
                ? 'লাইভ সার্ভিস ক্যাটালগ ও পাইকারি রেট'
                : 'Live Service Catalogue & Wholesale Rates'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder={language === 'bn' ? 'সার্ভিস বা #ID খুঁজুন...' : 'Search service or #ID...'}
                className="bg-[#0D1220] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('services')}
              className="py-2 px-4 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/10 text-xs font-bold text-[#22D3EE] flex items-center gap-1.5"
            >
              <span>{language === 'bn' ? 'সম্পূর্ণ ক্যাটালগ দেখুন' : 'Full Service Explorer'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Platform Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
          {['All', 'Facebook', 'Instagram', 'YouTube', 'TikTok', 'Telegram', 'Twitter'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setCatalogPlatform(p)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                catalogPlatform === p
                  ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/25'
                  : 'bg-[#0D1220] text-[#94A3B8] border border-white/[0.07] hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Service Preview Cards / Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {previewCatalogServices.map(srv => (
            <div
              key={srv.id}
              className="p-4 rounded-2xl bg-[#0D1220] hover:bg-[#141B2B]/90 border border-white/[0.07] hover:border-[#8B5CF6]/40 transition-all flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#080B14] border border-white/10 font-mono text-[10px] font-bold text-[#22D3EE]">
                    #{srv.id}
                  </span>
                  <span className="text-[10px] font-mono text-[#94A3B8] truncate">
                    {srv.category}
                  </span>
                  {srv.refill && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-mono font-bold">
                      Refill
                    </span>
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#F1F5F9] truncate">
                  {srv.name}
                </h4>
                <div className="flex items-center gap-3 text-[10px] font-mono text-[#94A3B8]">
                  <span>Min: {srv.min.toLocaleString()}</span>
                  <span>Max: {srv.max.toLocaleString()}</span>
                  <span>⏱ {srv.averageTime || 'Fast'}</span>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-1.5">
                <div>
                  <span className="text-sm sm:text-base font-black text-[#22C55E] font-mono block">
                    {formatPrice(srv.rate)}
                  </span>
                  <span className="text-[9px] font-mono text-[#94A3B8] uppercase">per 1,000</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onNavigateTab('new-order', {
                      serviceId: srv.id,
                      category: srv.category
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#8B5CF6]/20 hover:bg-[#8B5CF6] text-[#22D3EE] hover:text-white text-[11px] font-bold transition-colors"
                >
                  {language === 'bn' ? 'অর্ডার' : 'Order'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: ARCHITECTURAL BENTO GRID (ASYMMETRICAL 12-COL CAPABILITIES)
         ===================================================================== */}
      <section id="architecture" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.06]">
        <div className="max-w-2xl mb-8">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#8B5CF6] font-bold">
            Enterprise-Grade Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            {language === 'bn'
              ? 'কেন এজেন্সি এবং রিসেলাররা আমাদের প্ল্যাটফর্ম ব্যবহার করেন?'
              : 'Engineered for High-Volume Reliability & Speed'}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Bento Card 1 (7 Cols): Multi-Provider Smart Routing */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0D1220] border border-white/[0.08] flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/35 flex items-center justify-center text-[#8B5CF6]">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white">
                {language === 'bn'
                  ? 'অটোমেটিক ৫-মিনিট ক্লাউড সিঙ্ক ও স্মার্ট API রাউটিং'
                  : '5-Minute Automated Cloud Sync & Multi-Provider Routing'}
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                {language === 'bn'
                  ? 'প্রতিটি অর্ডার সাবমিট হওয়ার সাথে সাথে আমাদের ব্যাকএন্ড ইঞ্জিন সরাসরি আপস্ট্রিম প্রোভাইডারে ফরওয়ার্ড করে এবং প্রতি ৫ মিনিটে স্টার্ট কাউন্ট, ডেলিভারি প্রগ্রেস ও স্ট্যাটাস আপডেট করে।'
                  : 'Our background synchronization engine polls connected upstream providers every 5 minutes—updating service availability, start counts, remaining quantities, and automatic partial refunds without manual intervention.'}
              </p>
            </div>

            {/* Visual Pipeline Diagram */}
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.06] grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
              <div className="p-2.5 rounded-xl bg-[#141B2B]/80 border border-white/5">
                <span className="text-[#22D3EE] font-bold block">01. Order Placed</span>
                <span className="text-[10px] text-[#94A3B8]">Atomic Wallet Tx</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30">
                <span className="text-white font-bold block">02. Cloud Router</span>
                <span className="text-[10px] text-[#22D3EE]">API v2 Dispatch</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30">
                <span className="text-[#22C55E] font-bold block">03. Live Sync</span>
                <span className="text-[10px] text-[#94A3B8]">Every 5 Minutes</span>
              </div>
            </div>
          </div>

          {/* Bento Card 2 (5 Cols): Local & Crypto Deposit Engine */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-gradient-to-br from-[#141B2B] to-[#0D1220] border border-[#22D3EE]/25 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-[#22D3EE]/15 border border-[#22D3EE]/35 flex items-center justify-center text-[#22D3EE]">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white">
                {language === 'bn'
                  ? 'বিকাশ, নগদ, রকেট ও USDT ইনস্ট্যান্ট ওয়ালেট'
                  : 'Local Bangladeshi MFS & Binance USDT Wallet'}
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                {language === 'bn'
                  ? 'বাংলাদেশি টাকায় (BDT) অথবা ডলারে (USD) ব্যালেন্স দেখুন। ডিপোজিট করলেই পাচ্ছেন অটোমেটিক ডিপোজিট বোনাস এবং গিফট ভাউচার রিডিম করার সুবিধা।'
                  : 'Top up seamlessly via bKash, Nagad, Rocket, Upay, or Binance USDT with automatic bonus calculation and instant promo code redemption.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-[#080B14]/80 border border-white/[0.06]">
                <span className="text-[10px] text-[#94A3B8] block">Deposit Bonus</span>
                <strong className="text-[#22C55E]">Up to +{siteSettings?.bkashBonusPercent || 3}% Extra</strong>
              </div>
              <div className="p-3 rounded-2xl bg-[#080B14]/80 border border-white/[0.06]">
                <span className="text-[10px] text-[#94A3B8] block">Partial Refund</span>
                <strong className="text-[#22D3EE]">100% Automated</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: DEVELOPER REST API V2 SHOWCASE
         ===================================================================== */}
      <section id="developer-api" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141B2B] border border-white/10 text-[11px] font-mono text-[#22D3EE]">
              <Terminal className="w-3.5 h-3.5" />
              <span>Standard SMM REST API v2</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {language === 'bn'
                ? 'রিসেলার ও ডেভেলপারদের জন্য শক্তিশালী REST API v2'
                : 'Built-In REST API v2 for Child Panels & Resellers'}
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              {language === 'bn'
                ? 'আপনার নিজস্ব SMM ওয়েবসাইট বা অ্যাপ আমাদের `/api/v2` এন্ডপয়েন্টের সাথে যুক্ত করুন। সার্ভিস ফেচিং, বাল্ক অর্ডার প্লেসমেন্ট, রিফিল এবং ব্যালেন্স চেক—সবকিছুই স্ট্যান্ডার্ড ফরম্যাটে সাপোর্ট করে।'
                : 'Connect your child panel or custom storefront directly to our /api/v2 endpoint. Supports standard actions: services, add, status, orders, refill, and balance.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('api')}
                className="py-3 px-5 rounded-2xl bg-[#141B2B] hover:bg-[#192337] border border-[#8B5CF6]/40 text-xs font-extrabold text-white flex items-center gap-2"
              >
                <Code2 className="w-4 h-4 text-[#22D3EE]" />
                <span>{language === 'bn' ? 'API ডকুমেন্টেশন দেখুন' : 'Explore API v2 Documentation'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-[#0D1220] border border-white/[0.08] overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-[#141B2B] border-b border-white/[0.07] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-mono text-[#94A3B8] ml-2">
                    POST /api/v2 — cURL Request
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyApiSnippet}
                  className="px-2.5 py-1 rounded-lg bg-[#080B14] border border-white/10 text-[11px] font-mono text-[#22D3EE] flex items-center gap-1"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-5 text-xs font-mono text-[#F1F5F9] overflow-x-auto leading-relaxed">
                {apiCodeSample}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: FREQUENTLY ASKED QUESTIONS (ACCORDION)
         ===================================================================== */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.06]">
        <div className="text-center mb-8">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#22D3EE] font-bold">
            Operational Clarity
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            {language === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্নোত্তর (FAQ)' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#0D1220] border border-white/[0.08] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3"
                >
                  <span className="text-xs sm:text-sm font-extrabold text-[#F1F5F9]">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#22D3EE] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-[#94A3B8] leading-relaxed border-t border-white/[0.05] pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: FINAL CONVERSION BANNER & FOOTER
         ===================================================================== */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#0D1220]/60 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-[#141B2B] via-[#0D1220] to-[#141B2B] border border-[#8B5CF6]/35 flex flex-col lg:flex-row items-center justify-between gap-6 mb-10">
            <div className="space-y-2 text-center lg:text-left">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {language === 'bn'
                  ? 'আপনার সোশ্যাল মিডিয়া ক্যাম্পেইন শুরু করতে প্রস্তুত?'
                  : 'Ready to Scale Your Social Media Campaigns?'}
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                {language === 'bn'
                  ? 'মাত্র ৩০ সেকেন্ডে ফ্রি একাউন্ট তৈরি করুন এবং তাৎক্ষণিক অটোমেটেড অর্ডার ডেলিভারি উপভোগ করুন।'
                  : 'Create your free account in 30 seconds and access instant automated order dispatch.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => (profile ? onNavigateTab('new-order') : onOpenAuth())}
                className="h-11 px-6 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/25"
              >
                <span>{language === 'bn' ? 'এখনই শুরু করুন' : 'Get Started Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('track-order')}
                className="h-11 px-5 rounded-2xl bg-[#080B14] border border-white/10 text-[#F1F5F9] font-bold text-xs"
              >
                {language === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track an Order'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
            <p className="font-mono">
              © {new Date().getFullYear()} {siteSettings?.siteName || 'AmarTrend SMM'}. Cloud API v2 Infrastructure.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <button type="button" onClick={() => onNavigateTab('services')} className="hover:text-white">
                {language === 'bn' ? 'সার্ভিস ক্যাটালগ' : 'Services'}
              </button>
              <button type="button" onClick={() => onNavigateTab('api')} className="hover:text-white">
                {language === 'bn' ? 'API ডকস' : 'API Docs'}
              </button>
              <button type="button" onClick={() => onNavigateTab('track-order')} className="hover:text-white">
                {language === 'bn' ? 'অর্ডার ট্র্যাকার' : 'Track Order'}
              </button>
              <button type="button" onClick={onOpenAuth} className="text-[#22D3EE] font-bold hover:underline">
                {language === 'bn' ? 'লগইন / সাইন আপ' : 'Client Portal'}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
