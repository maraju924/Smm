import React, { useState, useMemo } from 'react';
import {
  Zap,
  Layers,
  ArrowRight,
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
  LayoutDashboard,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SMMService, Announcement, SiteSettings } from '../../types';
import { BRAND_LOGO_URL, BD_MAIN_SEO_KEYWORD, BD_SUB_SEO_KEYWORDS } from '../../data/seedServices';

interface PublicLandingViewProps {
  services: SMMService[];
  announcements: Announcement[];
  siteSettings?: SiteSettings;
  onNavigateTab: (tabId: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onEnterWorkspace?: () => void;
}

// Instant Zero-CLS Fallback Services rendered before Firestore WebSocket connects
const INSTANT_FALLBACK_SERVICES: SMMService[] = [
  {
    id: '101',
    category: 'Facebook Monetization BD',
    name: 'Facebook 60,000 Minutes Watchtime (In-Stream Ads Monetization Pack BD)',
    type: 'Default',
    rate: 45,
    min: 1000,
    max: 60000,
    dripfeed: false,
    refill: true,
    description: 'High retention Facebook watchtime for BD page monetization.',
    averageTime: '12 Hours',
    status: 'active'
  },
  {
    id: '102',
    category: 'Facebook Followers BD',
    name: 'Facebook Page & Profile Followers [Non-Drop + 30 Days Refill Guarantee]',
    type: 'Default',
    rate: 65,
    min: 100,
    max: 500000,
    dripfeed: true,
    refill: true,
    description: 'Fast non-drop Facebook followers with refill guarantee.',
    averageTime: '15 Mins',
    status: 'active'
  },
  {
    id: '201',
    category: 'YouTube Monetization BD',
    name: 'YouTube 4000 Hours Watchtime + High Retention Views [Monetization Safe]',
    type: 'Default',
    rate: 190,
    min: 500,
    max: 100000,
    dripfeed: false,
    refill: true,
    description: 'Organic retention YouTube watchtime for YPP monetization.',
    averageTime: '24 Hours',
    status: 'active'
  },
  {
    id: '301',
    category: 'TikTok Viral Boost BD',
    name: 'TikTok ForYou الفيديو Views + Engagement Boost [Instant Start]',
    type: 'Default',
    rate: 5,
    min: 1000,
    max: 10000000,
    dripfeed: false,
    refill: true,
    description: 'Instant TikTok viral video views.',
    averageTime: '5 Mins',
    status: 'active'
  },
  {
    id: '401',
    category: 'Instagram Growth BD',
    name: 'Instagram High Quality Followers + Reels Views [365 Days Refill]',
    type: 'Default',
    rate: 85,
    min: 100,
    max: 250000,
    dripfeed: true,
    refill: true,
    description: 'Real-looking Instagram followers with refill protection.',
    averageTime: '10 Mins',
    status: 'active'
  },
  {
    id: '501',
    category: 'Telegram Channel BD',
    name: 'Telegram Channel & Group Members [Zero Drop • Instant Delivery]',
    type: 'Default',
    rate: 110,
    min: 100,
    max: 100000,
    dripfeed: false,
    refill: true,
    description: 'Stable Telegram channel subscribers.',
    averageTime: '20 Mins',
    status: 'active'
  }
];

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

  const activeServices = useMemo(() => {
    const live = services.filter((s) => s.status !== 'disabled');
    return live.length > 0 ? live : INSTANT_FALLBACK_SERVICES;
  }, [services]);

  // Filtered services for Hero Interactive Calculator
  const calcServices = useMemo(() => {
    if (calcPlatform === 'All') return activeServices.slice(0, 60);
    const q = calcPlatform.toLowerCase();
    const matched = activeServices
      .filter((s) => s.category.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 60);
    return matched.length > 0 ? matched : activeServices.slice(0, 20);
  }, [activeServices, calcPlatform]);

  const selectedCalcService = useMemo(() => {
    return calcServices.find((s) => s.id === calcServiceId) || calcServices[0] || INSTANT_FALLBACK_SERVICES[0];
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
      .filter((s) => {
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

  const lowestRateService = useMemo(() => {
    if (activeServices.length === 0) return null;
    return [...activeServices].sort((a, b) => a.rate - b.rate)[0];
  }, [activeServices]);

  const categoriesCount = useMemo(() => {
    return Math.max(6, new Set(activeServices.map((s) => s.category)).size);
  }, [activeServices]);

  const activeAnnouncement = useMemo(
    () => announcements.find((a) => a.active),
    [announcements]
  );

  const apiCodeSample = `curl -X POST https://boostlagbe.com/api/v2 \\
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

  const handleAnchorNav = (e: React.MouseEvent<HTMLAnchorElement>, tabId: string, params?: any) => {
    e.preventDefault();
    onNavigateTab(tabId, params);
  };

  const faqs = [
    {
      q:
        language === 'bn'
          ? 'বুস্ট লাগবে (Boostlagbe.com / বুস্টলাগবে ডট কম) কেন বাংলাদেশের ১ নম্বর অটোমেটিক SMM Panel?'
          : 'Why is Boostlagbe.com (Boost Lagbe) the #1 cheapest bKash & Nagad SMM Panel in Bangladesh?',
      a:
        language === 'bn'
          ? `${siteSettings?.siteName || 'Boostlagbe.com'} (বুস্ট লাগবে / বুস্টলাগবে ডট কম) হলো বাংলাদেশের সেরা ও সবচেয়ে কম দামের ১০০% অটোমেটিক SMM Panel। এখানে ZiniPay অটোমেটিক পেমেন্ট গেটওয়ের মাধ্যমে বিকাশ (bKash), নগদ (Nagad), রকেট (Rocket) এবং উপায় (Upay) দিয়ে ১ ক্লিকে তাৎক্ষণিক ডিপোজিট করে সকল সোশ্যাল মিডিয়া বুস্ট সার্ভিস নেওয়া যায়।`
          : `${siteSettings?.siteName || 'Boostlagbe.com'} (Boost Lagbe / Boost Lagobe) is Bangladesh's #1 cheapest automated SMM panel supporting instant 1-click bKash, Nagad, Rocket, and Upay deposits via ZiniPay Gateway with wholesale BDT pricing.`
    },
    {
      q:
        language === 'bn'
          ? 'ফেসবুক পেজ মনিটাইজেশন (60k Watchtime ও Non-Drop Followers) করতে কত সময় লাগে?'
          : 'How fast can I complete Facebook Page Monetization (60k Watchtime & Followers) in BD?',
      a:
        language === 'bn'
          ? 'আমাদের Facebook Page Monetization Package, 60,000 Minutes Watchtime এবং Non-Drop Profile/Page Followers সার্ভিস অর্ডার দেওয়ার কয়েক মিনিটের মধ্যেই অটোমেটিক শুরু হয় এবং ২৪ থেকে ৭২ ঘণ্টার মধ্যে সম্পূর্ণ নিরাপদে ডেলিভারি সম্পন্ন হয়।'
          : 'Our Facebook Page Monetization packages, 60k Minutes In-Stream Ads Watchtime, and Non-Drop BD/Global Followers start within minutes and complete safely within 24–72 hours.'
    },
    {
      q:
        language === 'bn'
          ? 'ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম ও ১০০০ সাবস্ক্রাইবার এবং টিকটক ভিউ কি নিরাপদ?'
          : 'Are YouTube 4000 Hours Watchtime, Subscribers, and TikTok Views safe for monetization?',
      a:
        language === 'bn'
          ? 'হ্যাঁ, ১০০% নিরাপদ। আমাদের YouTube 4000 Hours Watchtime, Monetization Pack এবং TikTok Viral Views ও Followers সার্ভিস রিয়েল রিটেনশন ও অটো-রিফিল গ্যারান্টিযুক্ত।'
          : 'Yes. All YouTube 4000 Hours Watchtime, Subscribers, and TikTok Views/Followers services use high-retention delivery with automated refill protection.'
    },
    {
      q:
        language === 'bn'
          ? 'অর্ডার দেওয়ার কতক্ষণের মধ্যে কাজ শুরু হয়?'
          : 'How fast do orders start after submission?',
      a:
        language === 'bn'
          ? 'আমাদের ক্লাউড সার্ভার সরাসরি আপস্ট্রিম API প্রোভাইডারের সাথে যুক্ত। অর্ডার সাবমিট করার কয়েক সেকেন্ডের মধ্যেই স্বয়ংক্রিয়ভাবে ডিসপ্যাচ হয় এবং স্ট্যাটাস প্রতি ৫ মিনিটে অটো-সিঙ্ক হয়।'
          : 'Orders are dispatched to upstream API clusters within seconds of submission. Real-time background workers synchronize start counts, remains, and completion status every 5 minutes.'
    },
    {
      q:
        language === 'bn'
          ? 'ওয়ালেটে বিকাশ বা নগদে কীভাবে টাকা (ফান্ড) অ্যাড করব?'
          : 'How do I deposit funds using bKash or Nagad?',
      a:
        language === 'bn'
          ? 'ওয়ালেট সেকশনে গিয়ে ডিপোজিট বাটনে ক্লিক করে টাকার পরিমাণ লিখুন এবং ZiniPay পেমেন্ট গেটওয়েতে গিয়ে বিকাশ, নগদ, রকেট বা উপায় সিলেক্ট করে পেমেন্ট সম্পন্ন করুন। পেমেন্ট শেষ হওয়া মাত্রই স্বয়ংক্রিয়ভাবে আপনার ব্যালেন্স যোগ হয়ে যাবে।'
          : 'Simply open the Wallet tab, click Deposit, enter your BDT amount, and complete checkout via ZiniPay Gateway using bKash, Nagad, Rocket, or Upay. Your balance credits automatically.'
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
          ? 'রিসেলার এবং চাইল্ড প্যানেলের জন্য কি Wholesale API v2 সুবিধা আছে?'
          : 'Do you provide a Wholesale REST API v2 for Bangladeshi resellers and agencies?',
      a:
        language === 'bn'
          ? 'হ্যাঁ! প্রোফাইল সেকশন থেকে আপনি ১-ক্লিকে আপনার নিজস্ব API Key জেনারেট করতে পারবেন এবং স্ট্যান্ডার্ড /api/v2 এন্ডপয়েন্ট ব্যবহার করে যেকোনো প্যানেল সংযুক্ত করতে পারবেন।'
          : 'Yes. Every account includes full access to our standard /api/v2 endpoint supporting services, add, status, multi-status, refill, and balance queries.'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#080B14] text-[#F1F5F9] font-sans selection:bg-[#6D28D9] selection:text-white overflow-x-hidden relative">
      {/* Top Announcement Ribbon */}
      {activeAnnouncement && (
        <div className="relative z-30 bg-[#0D1220] border-b border-white/[0.08] px-4 py-2 text-center text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-[#67E8F9] shrink-0" />
            <span className="font-bold text-[#67E8F9] shrink-0">{activeAnnouncement.title}:</span>
            <span className="text-[#F1F5F9] truncate">{activeAnnouncement.content}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          PUBLIC STICKY HEADER
         ===================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#080B14]/95 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <a
            href="/"
            onClick={(e) => handleAnchorNav(e, 'landing')}
            className="flex items-center gap-3 focus:outline-none"
          >
            <img
              src={BRAND_LOGO_URL}
              alt="Boostlagbe.com – বুস্ট লাগবে অফিশিয়াল লোগো"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-contain bg-[#0D1220] border border-white/10 p-0.5 shrink-0"
            />
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-[#F1F5F9] block leading-none">
                {siteSettings?.siteName || 'Boostlagbe.com'}
              </span>
              <span className="text-[10px] font-mono text-[#67E8F9] tracking-wider block mt-0.5">
                বুস্ট লাগবে • #1 Auto SMM BD
              </span>
            </div>
          </a>

          {/* Center Navigation Links (Desktop) */}
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#CBD5E1]">
            <a href="#live-catalog" className="hover:text-white py-2 transition-colors">
              {language === 'bn' ? 'লাইভ সার্ভিস ক্যাটালগ' : 'Live Services'}
            </a>
            <a href="#architecture" className="hover:text-white py-2 transition-colors">
              {language === 'bn' ? 'প্ল্যাটফর্ম ফিচার' : 'Infrastructure'}
            </a>
            <a href="#developer-api" className="hover:text-white py-2 transition-colors">
              {language === 'bn' ? 'ডেভেলপার API v2' : 'REST API v2'}
            </a>
            <a href="#faq" className="hover:text-white py-2 transition-colors">
              {language === 'bn' ? 'প্রশ্নোত্তর' : 'FAQ'}
            </a>
            <a
              href="/?tab=blog"
              onClick={(e) => handleAnchorNav(e, 'blog')}
              className="hover:text-white py-2 transition-colors text-[#67E8F9]"
            >
              {language === 'bn' ? 'ব্লগ ও গাইড' : 'Blog & Guides'}
            </a>
            <a
              href="/?tab=about"
              onClick={(e) => handleAnchorNav(e, 'about')}
              className="hover:text-white py-2 transition-colors"
            >
              {language === 'bn' ? 'আমাদের সম্পর্কে' : 'About'}
            </a>
          </nav>

          {/* Right Utility & Auth Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={language === 'bn' ? 'Switch language to English' : 'বাংলা ভাষায় পরিবর্তন করুন'}
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="h-10 px-3 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.12] text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#67E8F9]" aria-hidden="true" />
              <span>{language === 'bn' ? 'EN' : 'বাং'}</span>
            </button>

            <button
              type="button"
              aria-label={currency === 'BDT' ? 'Switch currency to USD' : 'Switch currency to BDT'}
              onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
              className="hidden sm:flex h-10 px-3 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.12] text-xs font-mono font-bold text-[#67E8F9] items-center justify-center transition-colors"
            >
              {currency === 'BDT' ? '৳ BDT' : '$ USD'}
            </button>

            {profile ? (
              <button
                type="button"
                onClick={() => (onEnterWorkspace ? onEnterWorkspace() : onNavigateTab('home'))}
                className="h-10 px-4 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{language === 'bn' ? 'ড্যাশবোর্ডে যান' : 'Open Dashboard'}</span>
              </button>
            ) : (
              <>
                {onEnterWorkspace && (
                  <button
                    type="button"
                    onClick={onEnterWorkspace}
                    className="hidden sm:flex h-10 px-3.5 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.12] text-[#F1F5F9] text-xs font-bold items-center gap-1.5 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#C4B5FD]" aria-hidden="true" />
                    <span>{language === 'bn' ? 'গেস্ট ড্যাশবোর্ড' : 'Guest Workspace'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="h-10 px-4 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{language === 'bn' ? 'লগইন / রেজিস্টার' : 'Sign In / Join'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN LANDMARK (100/100 ACCESSIBILITY LANDMARK-ONE-MAIN)
         ===================================================================== */}
      <main id="main-content">
        {/* ===================================================================
            HERO SECTION: ASYMMETRICAL 12-COLUMN EDITORIAL + LIVE SIMULATOR
           =================================================================== */}
        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Editorial Value Proposition (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141B2B] border border-[#8B5CF6]/40 text-[11px] font-mono text-[#67E8F9]">
                <span className="w-2 h-2 rounded-full bg-[#4ADE80]" aria-hidden="true" />
                <span>
                  {language === 'bn'
                    ? `${activeServices.length}+ লাইভ সার্ভিস • ৫ মিনিট অটো-সিঙ্ক ইঞ্জিন`
                    : `${activeServices.length}+ LIVE API SERVICES • 5-MIN AUTO SYNC`}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black text-[#F1F5F9] tracking-tight leading-[1.1]">
                {language === 'bn' ? (
                  <>
                    <span className="bg-gradient-to-r from-[#C4B5FD] via-[#A78BFA] to-[#67E8F9] bg-clip-text text-transparent">
                      Boostlagbe.com (বুস্ট লাগবে)
                    </span>{' '}
                    — বাংলাদেশের ১ নম্বর অটোমেটেড SMM প্যানেল
                  </>
                ) : (
                  <>
                    <span className="bg-gradient-to-r from-[#C4B5FD] via-[#A78BFA] to-[#67E8F9] bg-clip-text text-transparent">
                      Boostlagbe.com (Boost Lagbe)
                    </span>{' '}
                    — #1 Automated SMM API Panel BD
                  </>
                )}
              </h1>

              <p className="text-sm sm:text-base text-[#CBD5E1] max-w-2xl leading-relaxed">
                {language === 'bn'
                  ? 'বুস্টলাগবে ডট কম (Boostlagbe.com / বুস্ট লাগবে): কন্টেন্ট ক্রিয়েটর, মার্কেটিং এজেন্সি এবং রিসেলারদের জন্য বাংলাদেশের সবচেয়ে আধুনিক ও সাশ্রয়ী অটোমেটিক ক্লাউড SMM প্ল্যাটফর্ম। সরাসরি পাইকারি API রেটে Facebook, Instagram, YouTube, TikTok ও Telegram বুস্ট সার্ভিস অর্ডার করুন বিকাশ ও নগদে।'
                  : 'Boostlagbe.com (Boost Lagbe / Boost Lagobe): Built for Bangladeshi creators, agencies, and high-volume resellers. Dispatch instant orders across Facebook, Instagram, YouTube, TikTok, and Telegram at wholesale API rates with instant ZiniPay bKash & Nagad funding.'}
              </p>

              {/* Primary & Secondary Hero CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => (profile ? onNavigateTab('new-order') : onOpenAuth('register'))}
                  className="h-12 px-6 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-extrabold text-sm flex items-center gap-2.5 transition-colors"
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {profile
                      ? language === 'bn'
                        ? 'নতুন অর্ডার প্লেস করুন'
                        : 'Place New Order'
                      : language === 'bn'
                        ? 'ফ্রি একাউন্ট খুলুন ও শুরু করুন'
                        : 'Create Free Account & Start'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <a
                  href="/?tab=services"
                  onClick={(e) => handleAnchorNav(e, 'services')}
                  className="h-12 px-5 rounded-2xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.14] text-[#F1F5F9] font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  <Layers className="w-4 h-4 text-[#67E8F9]" aria-hidden="true" />
                  <span>
                    {language === 'bn'
                      ? `লাইভ সার্ভিস তালিকা (${activeServices.length})`
                      : `Explore Live Catalog (${activeServices.length})`}
                  </span>
                </a>
              </div>

              {/* Real Telemetry Strip */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.08] max-w-xl">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#CBD5E1] block">
                    {language === 'bn' ? 'সক্রিয় সার্ভিস' : 'Active Services'}
                  </span>
                  <strong className="text-lg sm:text-2xl font-black text-white font-mono tabular-nums">
                    {activeServices.length}
                  </strong>
                  <span className="text-[11px] text-[#67E8F9] font-mono block">
                    {categoriesCount} Categories
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#CBD5E1] block">
                    {language === 'bn' ? 'শুরু হচ্ছে মাত্র' : 'Starting Rate / 1K'}
                  </span>
                  <strong className="text-lg sm:text-2xl font-black text-[#4ADE80] font-mono tabular-nums">
                    {lowestRateService ? formatPrice(lowestRateService.rate) : formatPrice(5)}
                  </strong>
                  <span className="text-[11px] text-[#CBD5E1] font-mono block">
                    Wholesale API Price
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#CBD5E1] block">
                    {language === 'bn' ? 'স্ট্যাটাস সিঙ্ক' : 'Status Telemetry'}
                  </span>
                  <strong className="text-lg sm:text-2xl font-black text-[#67E8F9] font-mono tabular-nums">
                    5 Min
                  </strong>
                  <span className="text-[11px] text-[#CBD5E1] font-mono block">
                    Auto Cloud Sync
                  </span>
                </div>
              </div>

              {/* Verified Payment Gateways Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-mono text-[#CBD5E1] mr-1">
                  {language === 'bn' ? 'সাপোর্টেড পেমেন্ট গেটওয়ে:' : 'Instant Wallet Funding:'}
                </span>
                {['bKash', 'Nagad', 'Rocket', 'Upay', 'Binance USDT'].map((gw) => (
                  <span
                    key={gw}
                    className="px-2.5 py-1 rounded-xl bg-[#0D1220] border border-white/[0.1] text-xs font-mono font-bold text-[#F1F5F9]"
                  >
                    {gw}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Column: Interactive Live Service & Price Simulator Card (5 Cols, Zero CLS) */}
            <div className="lg:col-span-5">
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1220] border border-[#8B5CF6]/40 space-y-4 relative min-h-[380px]">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#141B2B] border border-[#8B5CF6]/40 flex items-center justify-center text-[#67E8F9]">
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-white">
                        {language === 'bn'
                          ? 'লাইভ অর্ডার প্রাইস ক্যালকুলেটর'
                          : 'Live Order & Price Estimator'}
                      </h2>
                      <p className="text-xs text-[#CBD5E1]">
                        {language === 'bn'
                          ? 'সরাসরি ডাটাবেইজ থেকে রিয়েল-টাইম রেট দেখুন'
                          : 'Real-time rates synced from our live catalog'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#141B2B] border border-[#4ADE80]/40 text-[#4ADE80] text-[10px] font-mono font-bold">
                    LIVE API
                  </span>
                </div>

                {/* Platform Quick Selector */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="Filter calculator by social platform">
                  {['All', 'Facebook', 'Instagram', 'YouTube', 'TikTok', 'Telegram'].map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => {
                        setCalcPlatform(plat);
                        setCalcServiceId('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                        calcPlatform === plat
                          ? 'bg-[#6D28D9] text-white'
                          : 'bg-[#080B14] text-[#CBD5E1] border border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {/* Service Selector Dropdown */}
                  <div>
                    <label
                      htmlFor="hero-service-select"
                      className="text-[11px] font-mono uppercase text-[#CBD5E1] font-bold block mb-1.5"
                    >
                      {language === 'bn' ? 'সার্ভিস নির্বাচন করুন' : 'Select Live Service'}
                    </label>
                    <select
                      id="hero-service-select"
                      aria-label={language === 'bn' ? 'সার্ভিস নির্বাচন করুন' : 'Select Live Service'}
                      value={selectedCalcService.id}
                      onChange={(e) => setCalcServiceId(e.target.value)}
                      className="w-full bg-[#080B14] border border-white/15 rounded-2xl p-3 text-xs text-white font-medium focus:outline-none focus:border-[#8B5CF6]"
                    >
                      {calcServices.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0D1220]">
                          [#{s.id}] {s.name} — {formatPrice(s.rate)}/1K
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Slider + Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="hero-quantity-range" className="text-[#CBD5E1] font-semibold">
                        {language === 'bn' ? 'পরিমাণ (Quantity)' : 'Order Quantity'}
                      </label>
                      <span className="font-mono font-black text-[#67E8F9]">
                        {clampedCalcQty.toLocaleString()} units
                      </span>
                    </div>
                    <input
                      id="hero-quantity-range"
                      type="range"
                      aria-label={language === 'bn' ? 'অর্ডার পরিমাণ নির্বাচন করুন' : 'Order Quantity'}
                      min={selectedCalcService.min || 100}
                      max={Math.min(50000, selectedCalcService.max || 50000)}
                      step={100}
                      value={clampedCalcQty}
                      onChange={(e) => setCalcQuantity(Number(e.target.value))}
                      className="w-full accent-[#8B5CF6]"
                    />
                    <div className="flex justify-between text-[11px] font-mono text-[#CBD5E1]">
                      <span>Min: {(selectedCalcService.min || 100).toLocaleString()}</span>
                      <span>Speed: {selectedCalcService.averageTime || 'Instant'}</span>
                      <span>Max: {(selectedCalcService.max || 100000).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Calculated Total Output Box */}
                  <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono uppercase text-[#CBD5E1] block">
                        {language === 'bn' ? 'মোট অর্ডার খরচ' : 'Estimated Total Charge'}
                      </span>
                      <span className="text-2xl font-black text-[#4ADE80] font-mono tabular-nums">
                        {formatPrice(estimatedChargeBdt)}
                      </span>
                    </div>
                    <div className="text-right font-mono text-xs text-[#CBD5E1]">
                      <div>
                        Rate: <strong className="text-white">{formatPrice(selectedCalcService.rate)}/1K</strong>
                      </div>
                      <div className="text-[#67E8F9]">
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
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#A78BFA] to-[#67E8F9] text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-opacity hover:opacity-95"
                  >
                    <Zap className="w-4 h-4 fill-current" aria-hidden="true" />
                    <span>
                      {language === 'bn'
                        ? 'এই সার্ভিসটি এখনই অর্ডার করুন'
                        : 'Configure & Launch This Order'}
                    </span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 2: LIVE SERVICE CATALOGUE PREVIEW
           =================================================================== */}
        <section id="live-catalog" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.08]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#67E8F9] font-bold">
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
                <label htmlFor="catalog-search-input" className="sr-only">
                  {language === 'bn' ? 'সার্ভিস বা আইডি খুঁজুন' : 'Search service or ID'}
                </label>
                <Search className="w-3.5 h-3.5 text-[#CBD5E1] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="catalog-search-input"
                  type="text"
                  aria-label={language === 'bn' ? 'সার্ভিস বা আইডি খুঁজুন' : 'Search service or ID'}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder={language === 'bn' ? 'সার্ভিস বা #ID খুঁজুন...' : 'Search service or #ID...'}
                  className="bg-[#0D1220] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <a
                href="/?tab=services"
                onClick={(e) => handleAnchorNav(e, 'services')}
                className="py-2.5 px-4 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/15 text-xs font-bold text-[#67E8F9] flex items-center gap-1.5"
              >
                <span>{language === 'bn' ? 'সম্পূর্ণ ক্যাটালগ দেখুন' : 'Full Service Explorer'}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Platform Filter Pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4" role="group" aria-label="Filter catalog by platform">
            {['All', 'Facebook', 'Instagram', 'YouTube', 'TikTok', 'Telegram', 'Twitter'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCatalogPlatform(p)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-colors ${
                  catalogPlatform === p
                    ? 'bg-[#6D28D9] text-white'
                    : 'bg-[#0D1220] text-[#CBD5E1] border border-white/[0.08] hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Service Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {previewCatalogServices.map((srv) => (
              <div
                key={srv.id}
                className="p-4 rounded-2xl bg-[#0D1220] hover:bg-[#141B2B] border border-white/[0.08] transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#080B14] border border-white/15 font-mono text-[11px] font-bold text-[#67E8F9]">
                      #{srv.id}
                    </span>
                    <span className="text-xs font-mono text-[#CBD5E1] truncate">
                      {srv.category}
                    </span>
                    {srv.refill && (
                      <span className="px-1.5 py-0.5 rounded bg-[#080B14] border border-[#4ADE80]/40 text-[#4ADE80] text-[10px] font-mono font-bold">
                        Refill
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#F1F5F9] truncate">
                    {srv.name}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-[#CBD5E1]">
                    <span>Min: {srv.min.toLocaleString()}</span>
                    <span>Max: {srv.max.toLocaleString()}</span>
                    <span>⏱ {srv.averageTime || 'Fast'}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1.5">
                  <div>
                    <span className="text-sm sm:text-base font-black text-[#4ADE80] font-mono block">
                      {formatPrice(srv.rate)}
                    </span>
                    <span className="text-[10px] font-mono text-[#CBD5E1] uppercase">per 1,000</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateTab('new-order', {
                        serviceId: srv.id,
                        category: srv.category
                      })
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition-colors"
                  >
                    {language === 'bn' ? 'অর্ডার' : 'Order'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===================================================================
            SECTION 3: ARCHITECTURAL BENTO GRID
           =================================================================== */}
        <section id="architecture" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.08]">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-[#C4B5FD] font-bold">
              Enterprise-Grade Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              {language === 'bn'
                ? 'কেন এজেন্সি এবং রিসেলাররা আমাদের প্ল্যাটফর্ম ব্যবহার করেন?'
                : 'Engineered for High-Volume Reliability & Speed'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Bento Card 1 */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0D1220] border border-white/[0.08] flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-[#141B2B] border border-[#8B5CF6]/40 flex items-center justify-center text-[#C4B5FD]">
                  <RefreshCw className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-black text-white">
                  {language === 'bn'
                    ? 'অটোমেটিক ৫-মিনিট ক্লাউড সিঙ্ক ও স্মার্ট API রাউটিং'
                    : '5-Minute Automated Cloud Sync & Multi-Provider Routing'}
                </h3>
                <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                  {language === 'bn'
                    ? 'প্রতিটি অর্ডার সাবমিট হওয়ার সাথে সাথে আমাদের ব্যাকএন্ড ইঞ্জিন সরাসরি আপস্ট্রিম প্রোভাইডারে ফরওয়ার্ড করে এবং প্রতি ৫ মিনিটে স্টার্ট কাউন্ট, ডেলিভারি প্রগ্রেস ও স্ট্যাটাস আপডেট করে।'
                    : 'Our background synchronization engine polls connected upstream providers every 5 minutes—updating service availability, start counts, remaining quantities, and automatic partial refunds without manual intervention.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.08] grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-[#141B2B] border border-white/10">
                  <span className="text-[#67E8F9] font-bold block">01. Order Placed</span>
                  <span className="text-[11px] text-[#CBD5E1]">Atomic Wallet Tx</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#141B2B] border border-[#8B5CF6]/40">
                  <span className="text-white font-bold block">02. Cloud Router</span>
                  <span className="text-[11px] text-[#67E8F9]">API v2 Dispatch</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#141B2B] border border-[#4ADE80]/40">
                  <span className="text-[#4ADE80] font-bold block">03. Live Sync</span>
                  <span className="text-[11px] text-[#CBD5E1]">Every 5 Minutes</span>
                </div>
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-gradient-to-br from-[#141B2B] to-[#0D1220] border border-[#22D3EE]/30 flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-[#080B14] border border-[#22D3EE]/40 flex items-center justify-center text-[#67E8F9]">
                  <Wallet className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-black text-white">
                  {language === 'bn'
                    ? 'বিকাশ, নগদ, রকেট ও USDT ইনস্ট্যান্ট ওয়ালেট'
                    : 'Local Bangladeshi MFS & Binance USDT Wallet'}
                </h3>
                <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                  {language === 'bn'
                    ? 'বাংলাদেশি টাকায় (BDT) অথবা ডলারে (USD) ব্যালেন্স দেখুন। ডিপোজিট করলেই পাচ্ছেন অটোমেটিক ডিপোজিট বোনাস এবং গিফট ভাউচার রিডিম করার সুবিধা।'
                    : 'Top up seamlessly via bKash, Nagad, Rocket, Upay, or Binance USDT with automatic bonus calculation and instant promo code redemption.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-3 rounded-2xl bg-[#080B14] border border-white/[0.08]">
                  <span className="text-[11px] text-[#CBD5E1] block">Deposit Bonus</span>
                  <strong className="text-[#4ADE80]">Up to +{siteSettings?.bkashBonusPercent || 3}% Extra</strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#080B14] border border-white/[0.08]">
                  <span className="text-[11px] text-[#CBD5E1] block">Partial Refund</span>
                  <strong className="text-[#67E8F9]">100% Automated</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 4: DEVELOPER REST API V2 SHOWCASE
           =================================================================== */}
        <section id="developer-api" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.08]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141B2B] border border-white/15 text-xs font-mono text-[#67E8F9]">
                <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Standard SMM REST API v2</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {language === 'bn'
                  ? 'রিসেলার ও ডেভেলপারদের জন্য শক্তিশালী REST API v2'
                  : 'Built-In REST API v2 for Child Panels & Resellers'}
              </h2>
              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                {language === 'bn'
                  ? 'আপনার নিজস্ব SMM ওয়েবসাইট বা অ্যাপ আমাদের `/api/v2` এন্ডপয়েন্টের সাথে যুক্ত করুন। সার্ভিস ফেচিং, বাল্ক অর্ডার প্লেসমেন্ট, রিফিল এবং ব্যালেন্স চেক—সবকিছুই স্ট্যান্ডার্ড ফরম্যাটে সাপোর্ট করে।'
                  : 'Connect your child panel or custom storefront directly to our /api/v2 endpoint. Supports standard actions: services, add, status, orders, refill, and balance.'}
              </p>
              <div className="pt-2">
                <a
                  href="/?tab=api"
                  onClick={(e) => handleAnchorNav(e, 'api')}
                  className="py-3 px-5 rounded-2xl bg-[#141B2B] hover:bg-[#192337] border border-[#8B5CF6]/40 text-xs font-extrabold text-white inline-flex items-center gap-2"
                >
                  <Code2 className="w-4 h-4 text-[#67E8F9]" aria-hidden="true" />
                  <span>{language === 'bn' ? 'API ডকুমেন্টেশন দেখুন' : 'Explore API v2 Documentation'}</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-3xl bg-[#0D1220] border border-white/[0.08] overflow-hidden">
                <div className="px-4 py-3 bg-[#141B2B] border-b border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" aria-hidden="true" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" aria-hidden="true" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    <span className="text-xs font-mono text-[#CBD5E1] ml-2">
                      POST /api/v2 — cURL Request
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Copy cURL API code snippet"
                    onClick={handleCopyApiSnippet}
                    className="px-3 py-1.5 rounded-lg bg-[#080B14] border border-white/15 text-xs font-mono text-[#67E8F9] flex items-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
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

        {/* ===================================================================
            SECTION 5: FREQUENTLY ASKED QUESTIONS (ACCORDION)
           =================================================================== */}
        <section id="faq" className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.08]">
          <div className="text-center mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-[#67E8F9] font-bold">
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
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3"
                  >
                    <span className="text-xs sm:text-sm font-extrabold text-[#F1F5F9]">
                      {item.q}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`w-4 h-4 text-[#67E8F9] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-[#CBD5E1] leading-relaxed border-t border-white/[0.06] pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            SECTION 5B: BANGLADESH SMM & MONETIZATION KEYWORD GUIDE (SEMANTIC SEO)
           =================================================================== */}
        <section
          id="bd-seo-guide"
          aria-label="Bangladesh Social Media Marketing and Monetization Guide"
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.08]"
        >
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-mono text-[#67E8F9] tracking-wider font-bold">
              Boostlagbe.com • বুস্ট লাগবে ডট কম • #1 Bangladesh SMM Hub
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              {language === 'bn'
                ? 'বুস্ট লাগবে (Boostlagbe.com) — বাংলাদেশের সেরা ও সবচেয়ে কম দামে অটোমেটিক SMM Panel'
                : 'Boostlagbe.com (Boost Lagbe) — #1 Cheapest bKash & Nagad SMM Panel in Bangladesh'}
            </h2>
            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed mt-2">
              {language === 'bn'
                ? 'আপনি কি গুগলে "বুস্টলাগবে", "বুস্ট লাগবে", "বুস্ট লাগবে ডট কম", "boost lagbe", "boost lagobe" অথবা "boostlagbe.com" লিখে সার্চ করছেন? ফেসবুক পেজ মনিটাইজেশন, ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম, টিকটক ভাইরাল ভিউ এবং ইনস্টাগ্রাম ফলোয়ার বুস্ট করার জন্য বাংলাদেশের ১ নম্বর অফিশিয়াল প্ল্যাটফর্ম হলো Boostlagbe.com।'
                : 'Searching for বুস্টলাগবে, বুস্ট লাগবে, বুস্ট লাগবে ডট কম, boostlagbe.com, boost lagbe, or boost lagobe? Boostlagbe.com is Bangladesh’s #1 official automated social media boost & monetization platform with instant ZiniPay bKash/Nagad deposits.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <article className="rounded-3xl bg-[#0D1220] border border-white/[0.08] p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#C4B5FD]">01. Facebook Monetization BD</span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1.5">
                  {language === 'bn'
                    ? 'ফেসবুক পেজ মনিটাইজেশন ও 60k Watchtime সার্ভিস'
                    : 'Facebook Page Monetization & 60k Watchtime BD'}
                </h3>
                <p className="text-xs text-[#CBD5E1] leading-relaxed mt-2">
                  {language === 'bn'
                    ? 'কম দামে নন-ড্রপ ফেসবুক পেজ ফলোয়ার, প্রোফাইল ফলোয়ার, ৬০,০০০ মিনিট ইন-স্ট্রিম অ্যাডস ওয়াচটাইম এবং রিলস ভিউ বুস্ট করুন সম্পূর্ণ অটোমেটিক ডেলিভারিতে।'
                    : 'Buy Non-Drop Facebook Page & Profile Followers, 60k Minutes Watchtime for In-Stream Ads, and viral Reels views in Bangladesh with refill guarantee.'}
                </p>
              </div>
              <a
                href="/?tab=services&category=Facebook"
                onClick={(e) => handleAnchorNav(e, 'services', { category: 'Facebook' })}
                className="mt-5 py-1.5 text-xs font-bold text-[#67E8F9] hover:underline inline-flex items-center gap-1.5 w-fit"
              >
                <span>{language === 'bn' ? 'ফেসবুক সার্ভিস লিস্ট দেখুন' : 'View Facebook BD Services'}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </article>

            <article className="rounded-3xl bg-[#0D1220] border border-white/[0.08] p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#67E8F9]">02. YouTube & TikTok Boost BD</span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1.5">
                  {language === 'bn'
                    ? 'ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম ও টিকটক ভিউ প্যানেল'
                    : 'YouTube 4000h Watchtime & TikTok Viral Panel BD'}
                </h3>
                <p className="text-xs text-[#CBD5E1] leading-relaxed mt-2">
                  {language === 'bn'
                    ? 'ইউটিউব চ্যানেল মনিটাইজেশনের জন্য ১০০০ সাবস্ক্রাইবার ও ৪০০০ ঘণ্টা ওয়াচটাইম এবং টিকটক ভিডিও ফর-ইউ (ForYou) ভিউ ও লাইক নিন সবচেয়ে সস্তা রেটে।'
                    : 'Complete your YouTube Partner Program requirements with high-retention 4000 Hours Watchtime & Subscribers, plus instant TikTok Views and Followers in BDT.'}
                </p>
              </div>
              <a
                href="/?tab=services&category=YouTube"
                onClick={(e) => handleAnchorNav(e, 'services', { category: 'YouTube' })}
                className="mt-5 py-1.5 text-xs font-bold text-[#67E8F9] hover:underline inline-flex items-center gap-1.5 w-fit"
              >
                <span>{language === 'bn' ? 'ইউটিউব ও টিকটক সার্ভিস দেখুন' : 'View YouTube & TikTok Services'}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </article>

            <article className="rounded-3xl bg-[#0D1220] border border-white/[0.08] p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#4ADE80]">03. Instant bKash & Nagad Gateway</span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1.5">
                  {language === 'bn'
                    ? 'ZiniPay বিকাশ ও নগদ অটোমেটিক পেমেন্ট ও রিসেলার API'
                    : 'bKash & Nagad Auto Deposit + Wholesale API v2'}
                </h3>
                <p className="text-xs text-[#CBD5E1] leading-relaxed mt-2">
                  {language === 'bn'
                    ? 'ম্যানুয়াল ভেরিফিকেশনের ঝামেলা ছাড়াই বিকাশ, নগদ, রকেট ও উপায়ে অটোমেটিক ফান্ড অ্যাড করুন এবং আমাদের REST API v2 দিয়ে নিজস্ব চাইল্ড প্যানেল পরিচালনা করুন।'
                    : 'Zero manual waiting—add funds 24/7 via automated bKash, Nagad, Rocket, and Upay checkout and connect child panels to our high-speed REST API v2.'}
                </p>
              </div>
              <a
                href="/?tab=add-funds"
                onClick={(e) => handleAnchorNav(e, 'add-funds')}
                className="mt-5 py-1.5 text-xs font-bold text-[#67E8F9] hover:underline inline-flex items-center gap-1.5 w-fit"
              >
                <span>{language === 'bn' ? 'অটো ডিপোজিট ওয়ালেট দেখুন' : 'Open Instant Deposit Wallet'}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </article>
          </div>

          {/* Crawlable Bangladesh Search Keyword Index */}
          <div className="rounded-2xl bg-[#0D1220] border border-white/[0.08] p-5">
            <h3 className="text-xs font-semibold text-white mb-2">
              {language === 'bn'
                ? 'জনপ্রিয় সার্চ টপিকস (Popular SMM Searches in Bangladesh):'
                : 'Popular SMM & Monetization Searches in Bangladesh:'}
            </h3>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              {[BD_MAIN_SEO_KEYWORD, ...BD_SUB_SEO_KEYWORDS].map((kw, idx, arr) => (
                <React.Fragment key={kw}>
                  <a
                    href="/?tab=services"
                    onClick={(e) => handleAnchorNav(e, 'services')}
                    className="hover:text-white transition-colors inline"
                  >
                    {kw}
                  </a>
                  {idx < arr.length - 1 && (
                    <span aria-hidden="true" className="mx-2 text-[#94A3B8]">
                      ·
                    </span>
                  )}
                </React.Fragment>
              ))}
            </p>
          </div>
        </section>
      </main>

      {/* =====================================================================
          SECTION 6: FINAL CONVERSION BANNER & CRAWLABLE SEO FOOTER
         ===================================================================== */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#0D1220] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-[#141B2B] via-[#0D1220] to-[#141B2B] border border-[#8B5CF6]/35 flex flex-col lg:flex-row items-center justify-between gap-6 mb-10">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {language === 'bn'
                  ? 'আপনার সোশ্যাল মিডিয়া ক্যাম্পেইন শুরু করতে প্রস্তুত?'
                  : 'Ready to Scale Your Social Media Campaigns?'}
              </h2>
              <p className="text-xs sm:text-sm text-[#CBD5E1]">
                {language === 'bn'
                  ? 'মাত্র ৩০ সেকেন্ডে ফ্রি একাউন্ট তৈরি করুন এবং তাৎক্ষণিক অটোমেটেড অর্ডার ডেলিভারি উপভোগ করুন।'
                  : 'Create your free account in 30 seconds and access instant automated order dispatch.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => (profile ? onNavigateTab('new-order') : onOpenAuth())}
                className="h-11 px-6 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-extrabold text-xs flex items-center gap-2"
              >
                <span>{language === 'bn' ? 'এখনই শুরু করুন' : 'Get Started Free'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <a
                href="/?tab=track"
                onClick={(e) => handleAnchorNav(e, 'track-order')}
                className="h-11 px-5 rounded-2xl bg-[#080B14] border border-white/15 text-[#F1F5F9] font-bold text-xs inline-flex items-center"
              >
                {language === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track an Order'}
              </a>
            </div>
          </div>

          {/* Multi-Column Crawlable SEO Footer Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-t border-b border-white/[0.08] mb-6 text-xs">
            <div className="space-y-3">
              <h3 className="font-mono font-bold uppercase tracking-wider text-white text-xs">
                {language === 'bn' ? 'কোম্পানি ও তথ্য' : 'Company & Info'}
              </h3>
              <ul className="space-y-2.5 text-[#CBD5E1]">
                <li>
                  <a href="/?tab=about" onClick={(e) => handleAnchorNav(e, 'about')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'আমাদের সম্পর্কে (About Us)' : 'About Us'}
                  </a>
                </li>
                <li>
                  <a href="/?tab=contact" onClick={(e) => handleAnchorNav(e, 'contact')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'যোগাযোগ ও হেল্প সেন্টার' : 'Contact & 24/7 Help Center'}
                  </a>
                </li>
                <li>
                  <a href="/?tab=services" onClick={(e) => handleAnchorNav(e, 'services')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'সার্ভিস ও BDT রেট লিস্ট' : 'Services & BDT Rate List'}
                  </a>
                </li>
                <li>
                  <a href="/?tab=blog" onClick={(e) => handleAnchorNav(e, 'blog')} className="hover:text-[#67E8F9] py-1 inline-block font-bold text-[#67E8F9]">
                    {language === 'bn' ? 'অফিসিয়াল ব্লগ ও গাইড (Blog)' : 'Official SMM Blog & Guides'}
                  </a>
                </li>
                <li>
                  <a href="/?tab=api" onClick={(e) => handleAnchorNav(e, 'api')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'হোলসেল REST API v2' : 'Wholesale REST API v2'}
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-mono font-bold uppercase tracking-wider text-white text-xs">
                {language === 'bn' ? 'লিগ্যাল ও পলিসি' : 'Legal & Policies'}
              </h3>
              <ul className="space-y-2.5 text-[#CBD5E1]">
                <li>
                  <a href="/?tab=refund" onClick={(e) => handleAnchorNav(e, 'refund')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'অটোমেটিক রিফান্ড ও রিফিল পলিসি' : 'Refund & Refill Policy'}
                  </a>
                </li>
                <li>
                  <a href="/?tab=terms" onClick={(e) => handleAnchorNav(e, 'terms')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'ব্যবহারের শর্তাবলী (Terms)' : 'Terms of Service'}
                  </a>
                </li>
                <li>
                  <a href="/?tab=privacy" onClick={(e) => handleAnchorNav(e, 'privacy')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'গোপনীয়তা নীতি (Privacy)' : 'Privacy Policy'}
                  </a>
                </li>
                <li>
                  <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'এক্সএমএল সাইটম্যাপ (Sitemap)' : 'XML Sitemap (Google BD)'}
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-mono font-bold uppercase tracking-wider text-white text-xs">
                {language === 'bn' ? 'বাংলাদেশ মনিটাইজেশন হাব' : 'BD Monetization Hub'}
              </h3>
              <ul className="space-y-2.5 text-[#CBD5E1]">
                <li>
                  <a
                    href="/?tab=services&category=Facebook"
                    onClick={(e) => handleAnchorNav(e, 'services', { category: 'Facebook' })}
                    className="hover:text-[#67E8F9] py-1 inline-block"
                  >
                    Facebook 60k Watchtime BD
                  </a>
                </li>
                <li>
                  <a
                    href="/?tab=services&category=YouTube"
                    onClick={(e) => handleAnchorNav(e, 'services', { category: 'YouTube' })}
                    className="hover:text-[#67E8F9] py-1 inline-block"
                  >
                    YouTube 4000h Watchtime BD
                  </a>
                </li>
                <li>
                  <a
                    href="/?tab=services&category=TikTok"
                    onClick={(e) => handleAnchorNav(e, 'services', { category: 'TikTok' })}
                    className="hover:text-[#67E8F9] py-1 inline-block"
                  >
                    TikTok Views & Followers BD
                  </a>
                </li>
                <li>
                  <a
                    href="/?tab=services&category=Instagram"
                    onClick={(e) => handleAnchorNav(e, 'services', { category: 'Instagram' })}
                    className="hover:text-[#67E8F9] py-1 inline-block"
                  >
                    Instagram Followers & Reels BD
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-mono font-bold uppercase tracking-wider text-white text-xs">
                {language === 'bn' ? 'কুইক টুলস ও ওয়ালেট' : 'Quick Tools & Wallet'}
              </h3>
              <ul className="space-y-2.5 text-[#CBD5E1]">
                <li>
                  <a href="/?tab=add-funds" onClick={(e) => handleAnchorNav(e, 'add-funds')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'ZiniPay বিকাশ/নগদ অটো ডিপোজিট' : 'ZiniPay bKash/Nagad Deposit'}
                  </a>
                </li>
                <li>
                  <a href="/?tab=track" onClick={(e) => handleAnchorNav(e, 'track-order')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'লাইভ অর্ডার ট্র্যাকার' : 'Live Order Tracker'}
                  </a>
                </li>
                <li>
                  <a href="/?tab=affiliates" onClick={(e) => handleAnchorNav(e, 'affiliates')} className="hover:text-[#67E8F9] py-1 inline-block">
                    {language === 'bn' ? 'অ্যাফিলিয়েট ও ফ্রি ভাউচার' : 'Affiliates & Promo Vouchers'}
                  </a>
                </li>
                <li>
                  <button type="button" onClick={() => onOpenAuth('login')} className="text-[#67E8F9] font-bold hover:underline py-1">
                    {language === 'bn' ? 'ক্লায়েন্ট লগইন / রেজিস্টার' : 'Client Portal Login'}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#CBD5E1]">
            <div className="flex items-center gap-2.5">
              <img
                src={BRAND_LOGO_URL}
                alt="Boostlagbe.com – বুস্ট লাগবে"
                width={28}
                height={28}
                className="w-7 h-7 rounded-lg object-contain bg-[#080B14] border border-white/10 p-0.5"
              />
              <p className="font-mono">
                © {new Date().getFullYear()} {siteSettings?.siteName || 'Boostlagbe.com'} (বুস্ট লাগবে ডট কম). Cloud API v2 Infrastructure.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a href="/?tab=about" onClick={(e) => handleAnchorNav(e, 'about')} className="hover:text-white py-1">
                {language === 'bn' ? 'আমাদের সম্পর্কে' : 'About'}
              </a>
              <a href="/?tab=contact" onClick={(e) => handleAnchorNav(e, 'contact')} className="hover:text-white py-1">
                {language === 'bn' ? 'হেল্প সেন্টার' : 'Contact'}
              </a>
              <a href="/?tab=refund" onClick={(e) => handleAnchorNav(e, 'refund')} className="hover:text-white py-1">
                {language === 'bn' ? 'রিফান্ড পলিসি' : 'Refund Policy'}
              </a>
              <a href="/?tab=terms" onClick={(e) => handleAnchorNav(e, 'terms')} className="hover:text-white py-1">
                {language === 'bn' ? 'শর্তাবলী' : 'Terms'}
              </a>
              <a href="/?tab=privacy" onClick={(e) => handleAnchorNav(e, 'privacy')} className="hover:text-white py-1">
                {language === 'bn' ? 'প্রাইভেসি' : 'Privacy'}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
