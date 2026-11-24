import React, { useState, useMemo, useEffect } from 'react';
import { SMMService, Announcement, SiteSettings } from '../../types';
import { BRAND_LOGO_URL } from '../../data/seedServices';
import {
  PROGRAMMATIC_SEO_LANDING_PAGES,
  DIVISIONAL_LOCAL_SEO_HUBS,
} from '../../services/blogSeoService';
import {
  Search,
  Check,
  ChevronDown,
  Copy,
  Calculator,
  Wallet,
  ArrowRight,
  Sun,
  Moon,
  ShieldCheck,
  Zap,
  Code2,
  SlidersHorizontal,
  UserPlus,
  LogIn,
  HelpCircle,
} from 'lucide-react';

interface PublicLandingViewProps {
  services: SMMService[];
  announcements?: Announcement[];
  siteSettings: SiteSettings;
  onNavigateTab: (tabId: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

const DEFAULT_USD_TO_BDT = 125;

type PlatformKey = 'all' | 'facebook' | 'youtube' | 'tiktok' | 'instagram' | 'telegram';

// Authentic Social Media Platform SVG Icons
const PlatformIcon: React.FC<{ platform: Exclude<PlatformKey, 'all'>; className?: string }> = ({
  platform,
  className = 'w-5 h-5',
}) => {
  switch (platform) {
    case 'facebook':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
  }
};

export const PublicLandingView: React.FC<PublicLandingViewProps> = ({
  services,
  siteSettings,
  onNavigateTab,
  onOpenAuth,
}) => {
  const bdtPerUsd = siteSettings?.usdToBdtRate || DEFAULT_USD_TO_BDT;

  // Default: Bengali ('bn') & BDT ('BDT') + Crisp Light Studio mode by default with 1-click Dark Mode toggle
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [currency, setCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const mode = localStorage.getItem('boostlagbe_theme_mode');
      if (mode === 'dark') return true;
      if (mode === 'light') return false;
      const saved = localStorage.getItem('boostlagbe_landing_dark');
      return saved ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('boostlagbe_landing_dark', String(isDark));
      localStorage.setItem('boostlagbe_theme_mode', isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // ignore storage errors
    }
  }, [isDark]);

  // Hero Workbench Tab: 'calculator' | 'quick_access'
  const [heroTab, setHeroTab] = useState<'calculator' | 'quick_access'>('calculator');

  // Catalogue filter, search & sort state
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc'>('popular');
  const [visibleCount, setVisibleCount] = useState(20);

  // Live BDT Rate & Order Calculator state
  const [calcPlatform, setCalcPlatform] = useState<Exclude<PlatformKey, 'all'>>('facebook');
  const [calcServiceId, setCalcServiceId] = useState<string>('');
  const [calcQuantity, setCalcQuantity] = useState<string>('1000');

  // Deposit preview amount state
  const [previewDepositBdt, setPreviewDepositBdt] = useState<number>(500);
  const [previewMethod, setPreviewMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');

  // Reseller API workbench tab state
  const [apiTab, setApiTab] = useState<'curl' | 'php' | 'node'>('curl');
  const [copiedApi, setCopiedApi] = useState(false);

  // SEO FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const brandName = siteSettings?.siteName?.trim() || 'Boostlagbe.com';
  const brandLogo = BRAND_LOGO_URL;

  const activeServices = useMemo(() => {
    return services.filter((s: SMMService) => s.status !== 'disabled');
  }, [services]);

  const matchPlatform = (category: string, name: string, platform: Exclude<PlatformKey, 'all'>) => {
    const text = `${category} ${name}`.toLowerCase();
    if (platform === 'facebook') return text.includes('facebook') || text.includes('fb');
    if (platform === 'youtube') return text.includes('youtube') || text.includes('yt');
    if (platform === 'tiktok') return text.includes('tiktok');
    if (platform === 'instagram') return text.includes('instagram') || text.includes('ig');
    if (platform === 'telegram') return text.includes('telegram') || text.includes('tg');
    return false;
  };

  // Sync calculator service selection when platform changes
  const calculatorServices = useMemo(() => {
    const matches = activeServices.filter((s: SMMService) =>
      matchPlatform(s.category || '', s.name || '', calcPlatform)
    );
    return matches.length > 0 ? matches : activeServices.slice(0, 15);
  }, [activeServices, calcPlatform]);

  useEffect(() => {
    if (calculatorServices.length > 0) {
      const exists = calculatorServices.some((s: SMMService) => s.id === calcServiceId);
      if (!exists) {
        const first = calculatorServices[0];
        setCalcServiceId(first.id);
        setCalcQuantity(String(Math.max(first.min || 100, 1000)));
      }
    }
  }, [calculatorServices, calcServiceId]);

  const selectedCalcService = useMemo(() => {
    return (
      calculatorServices.find((s: SMMService) => s.id === calcServiceId) ||
      calculatorServices[0] ||
      activeServices[0]
    );
  }, [calculatorServices, calcServiceId, activeServices]);

  // Note: s.rate in SMMService is already in BDT per 1,000 units
  const calcTotalPrice = useMemo(() => {
    if (!selectedCalcService) return 0;
    const qty = Math.max(0, Number(calcQuantity) || 0);
    const bdtTotal = (selectedCalcService.rate * qty) / 1000;
    return currency === 'BDT' ? bdtTotal : bdtTotal / bdtPerUsd;
  }, [selectedCalcService, calcQuantity, currency, bdtPerUsd]);

  // Filtered & sorted live service catalogue
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = activeServices.filter((s: SMMService) => {
      if (selectedPlatform !== 'all') {
        if (!matchPlatform(s.category || '', s.name || '', selectedPlatform)) {
          return false;
        }
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        String(s.id).toLowerCase().includes(q)
      );
    });

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.rate - b.rate);
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.rate - a.rate);
    }
    return list;
  }, [activeServices, selectedPlatform, searchQuery, sortBy]);

  // Real database stats per platform
  const platformStats = useMemo(() => {
    const compute = (p: Exclude<PlatformKey, 'all'>) => {
      const items = activeServices.filter((s: SMMService) =>
        matchPlatform(s.category || '', s.name || '', p)
      );
      const minRateBdt =
        items.length > 0 ? Math.min(...items.map((s: SMMService) => Math.max(s.rate, 1))) : 10;
      return {
        count: items.length,
        minBdt: minRateBdt.toFixed(0),
        minUsd: (minRateBdt / bdtPerUsd).toFixed(3),
        topServices: items.slice(0, 4),
      };
    };
    return {
      facebook: compute('facebook'),
      youtube: compute('youtube'),
      tiktok: compute('tiktok'),
      instagram: compute('instagram'),
      telegram: compute('telegram'),
    };
  }, [activeServices, bdtPerUsd]);

  const lowestOverallRate = useMemo(() => {
    if (activeServices.length === 0) return { bdt: '10', usd: '0.080' };
    const minBdt = Math.min(...activeServices.map((s: SMMService) => Math.max(s.rate, 1)));
    return {
      bdt: Math.max(1, Math.round(minBdt)).toString(),
      usd: (minBdt / bdtPerUsd).toFixed(3),
    };
  }, [activeServices, bdtPerUsd]);

  const uniqueCategoryCount = useMemo(() => {
    const set = new Set(activeServices.map((s: SMMService) => s.category).filter(Boolean));
    return Math.max(set.size, 5);
  }, [activeServices]);

  const minDepositBdt = siteSettings?.minDepositAmount || 20;

  const formatRate = (rateInBdt: number) => {
    if (currency === 'BDT') {
      return `৳${rateInBdt >= 100 ? rateInBdt.toFixed(0) : rateInBdt.toFixed(2)}`;
    }
    return `$${(rateInBdt / bdtPerUsd).toFixed(3)}`;
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectServiceIntoCalculator = (service: SMMService) => {
    const text = `${service.category || ''} ${service.name || ''}`.toLowerCase();
    if (text.includes('youtube') || text.includes('yt')) setCalcPlatform('youtube');
    else if (text.includes('tiktok')) setCalcPlatform('tiktok');
    else if (text.includes('instagram') || text.includes('ig')) setCalcPlatform('instagram');
    else if (text.includes('telegram') || text.includes('tg')) setCalcPlatform('telegram');
    else setCalcPlatform('facebook');

    setCalcServiceId(service.id);
    setCalcQuantity(String(Math.max(service.min || 100, 1000)));
    setHeroTab('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const apiSnippets: Record<'curl' | 'php' | 'node', string> = {
    curl: `curl -X POST https://boostlagbe.com/api/v2 \\
  -d "key=YOUR_LIVE_API_KEY" \\
  -d "action=add" \\
  -d "service=${selectedCalcService?.id || '101'}" \\
  -d "link=https://facebook.com/yourpage/posts/123" \\
  -d "quantity=${calcQuantity || 1000}"`,
    php: `<?php
$post = [
  'key'      => 'YOUR_LIVE_API_KEY',
  'action'   => 'add',
  'service'  => '${selectedCalcService?.id || '101'}',
  'link'     => 'https://facebook.com/yourpage/posts/123',
  'quantity' => ${calcQuantity || 1000}
];
$ch = curl_init('https://boostlagbe.com/api/v2');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
$response = json_decode(curl_exec($ch));
curl_close($ch);`,
    node: `const response = await fetch('https://boostlagbe.com/api/v2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.BOOSTLAGBE_API_KEY,
    action: 'add',
    service: '${selectedCalcService?.id || '101'}',
    link: 'https://facebook.com/yourpage/posts/123',
    quantity: ${Number(calcQuantity) || 1000}
  })
});
const result = await response.json();`,
  };

  const handleCopyApi = () => {
    navigator.clipboard.writeText(apiSnippets[apiTab]);
    setCopiedApi(true);
    setTimeout(() => setCopiedApi(false), 2000);
  };

  const platformCards: Array<{
    key: Exclude<PlatformKey, 'all'>;
    titleBn: string;
    titleEn: string;
    descBn: string;
    descEn: string;
    accentColor: string;
    softBgLight: string;
    softBgDark: string;
  }> = [
    {
      key: 'facebook',
      titleBn: 'Facebook Page ও Monetization',
      titleEn: 'Facebook Page & Monetization',
      descBn: '60k Minutes In-Stream Ads Watchtime, বাংলাদেশি নন-ড্রপ ফলোয়ার, রিলস ভিউ এবং পোস্ট রিয়েক্ট।',
      descEn: '60k Minutes In-Stream Ads Watchtime, Bangladeshi non-drop followers, Reels views, and post reactions.',
      accentColor: 'text-blue-600 dark:text-blue-400',
      softBgLight: 'bg-blue-50 text-blue-600 border-blue-200',
      softBgDark: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
    },
    {
      key: 'youtube',
      titleBn: 'YouTube 4000h ও Subscribers',
      titleEn: 'YouTube 4000h & Subscribers',
      descBn: 'চ্যানেল মনিটাইজেশনের জন্য নন-ড্রপ ৪,০০০ ঘণ্টা ওয়াচটাইম, ১,০০০ সাবস্ক্রাইবার ও হাই-রিটেনশন ভিউ।',
      descEn: 'Non-drop 4,000 hours watchtime, 1,000 subscribers, and high-retention views for channel monetization.',
      accentColor: 'text-red-600 dark:text-red-400',
      softBgLight: 'bg-red-50 text-red-600 border-red-200',
      softBgDark: 'bg-red-950/60 text-red-400 border-red-800/60',
    },
    {
      key: 'tiktok',
      titleBn: 'TikTok Viral Views ও Followers',
      titleEn: 'TikTok Viral Views & Followers',
      descBn: 'টিকটক ভিডিও ভাইরাল ভিউ, অর্গানিক ফলোয়ার, হার্ট রিয়েক্ট, শেয়ার এবং লাইভ স্ট্রিম দর্শক।',
      descEn: 'TikTok viral video views, organic followers, heart likes, shares, and live stream viewers.',
      accentColor: 'text-pink-600 dark:text-pink-400',
      softBgLight: 'bg-pink-50 text-pink-600 border-pink-200',
      softBgDark: 'bg-pink-950/60 text-pink-400 border-pink-800/60',
    },
    {
      key: 'instagram',
      titleBn: 'Instagram Followers ও Reels',
      titleEn: 'Instagram Followers & Reels',
      descBn: 'ব্র্যান্ড ও ফ্যাশন পেজের জন্য গ্যারান্টেড রিফিল ফলোয়ার, রিলস ভিউ, স্টোরি ভিউ এবং অটো লাইক।',
      descEn: 'Guaranteed refill followers, Reels views, story views, and auto-likes for brands and creators.',
      accentColor: 'text-fuchsia-600 dark:text-fuchsia-400',
      softBgLight: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
      softBgDark: 'bg-fuchsia-950/60 text-fuchsia-400 border-fuchsia-800/60',
    },
    {
      key: 'telegram',
      titleBn: 'Telegram Members ও Views',
      titleEn: 'Telegram Members & Views',
      descBn: 'টেলিগ্রাম চ্যানেল ও গ্রুপ মেম্বার, পোস্ট ভিউ এবং পোল ভোটিং ইনস্ট্যান্ট অটো ডেলিভারি।',
      descEn: 'Telegram channel and group members, post views, and poll votes with instant automated delivery.',
      accentColor: 'text-sky-600 dark:text-sky-400',
      softBgLight: 'bg-sky-50 text-sky-600 border-sky-200',
      softBgDark: 'bg-sky-950/60 text-sky-400 border-sky-800/60',
    },
  ];

  const faqs = [
    {
      qBn: 'Boostlagbe.com এ কিভাবে বিকাশ ও নগদে ব্যালেন্স ডিপোজিট করবো?',
      qEn: 'How do I deposit balance via bKash and Nagad on Boostlagbe.com?',
      aBn: `ফ্রি একাউন্ট খুলে ড্যাশবোর্ডের "Add Funds" মেনুতে যান। সেখানে ZiniPay গেটওয়ের মাধ্যমে বিকাশ (bKash), নগদ (Nagad) অথবা রকেট (Rocket) সিলেক্ট করে সর্বনিম্ন মাত্র ৳${minDepositBdt} ডিপোজিট করতে পারবেন। পেমেন্ট সম্পন্ন হওয়ার ১ সেকেন্ডের মধ্যে ব্যালেন্স অটোমেটিক যুক্ত হয়ে যাবে।`,
      aEn: `Create a free account and open "Add Funds". Choose bKash, Nagad, or Rocket via our automated ZiniPay gateway starting from just ৳${minDepositBdt}. Your wallet is credited automatically within 1 second.`,
    },
    {
      qBn: 'অর্ডার করার কত সময়ের মধ্যে কাজ শুরু হয়?',
      qEn: 'How fast do orders start after submission?',
      aBn: 'আমাদের অধিকাংশ সার্ভিস (Facebook Followers, Reels Views, TikTok Views, YouTube Views) সম্পূর্ণ স্বয়ংক্রিয় API চালিত। অর্ডার সাবমিট করার ০ থেকে ৫ মিনিটের মধ্যেই ডেলিভারি শুরু হয় এবং ড্যাশবোর্ডে লাইভ স্ট্যাটাস দেখা যায়।',
      aEn: 'Most services are powered by direct automated API routes and start within 0 to 5 minutes of placing your order, with real-time progress tracking in your dashboard.',
    },
    {
      qBn: 'ফলোয়ার বা ওয়াচটাইম কমে গেলে কি ফ্রি রিফিল বা রিফান্ড পাওয়া যাবে?',
      qEn: 'Do you provide a refill guarantee or refund if an order drops or cancels?',
      aBn: 'হ্যাঁ, আমাদের "Refill Enabled" সার্ভিসগুলোতে ৩০ থেকে ৩৬৫ দিনের ফ্রি অটো-রিফিল গ্যারান্টি রয়েছে। এছাড়া কোনো কারণে অর্ডার Canceled বা Partial হলে বাকি অংশের টাকা স্বয়ংক্রিয়ভাবে আপনার ওয়ালেটে রিফান্ড হয়ে যায়।',
      aEn: 'Yes. All Refill-tagged services include a 30 to 365-day free refill guarantee, and any canceled or partial order is automatically refunded to your account balance.',
    },
    {
      qBn: 'Facebook বা YouTube Monetization প্যাক অর্ডার করতে কি পেজের পাসওয়ার্ড দিতে হয়?',
      qEn: 'Do you ever need my account password or page admin access?',
      aBn: 'কখনই না! আমরা কোনো পাসওয়ার্ড বা এডমিন এক্সেস চাই না। শুধুমাত্র আপনার পাবলিক পোস্ট, ভিডিও বা প্রোফাইল লিংক দিয়েই শতভাগ নিরাপদে অর্ডার করতে পারবেন।',
      aEn: 'Never. We only require your public profile, page, or video URL. Your social media accounts remain 100% secure.',
    },
    {
      qBn: 'রিসেলার এবং এজেন্সির জন্য কি REST API v2 সুবিধা আছে?',
      qEn: 'Do you support REST API v2 for agencies and panel owners?',
      aBn: 'হ্যাঁ, আপনার নিজস্ব SMM প্যানেল বা এজেন্সি ওয়েবসাইট থাকলে আমাদের স্ট্যান্ডার্ড REST API v2 ব্যবহার করে এক ক্লিকে সব সার্ভিস কানেক্ট করতে এবং স্বয়ংক্রিয়ভাবে পাইকারি রেটে অর্ডার ফরোয়ার্ড করতে পারবেন।',
      aEn: 'Yes. Our standard REST API v2 supports automated service syncing, order placement, status polling, and balance checks at wholesale rates.',
    },
  ];

  // Theme class helpers for crisp light vs deep obsidian dark mode
  const pageBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardSurface = isDark
    ? 'bg-slate-900 border border-slate-800 text-slate-100'
    : 'bg-white border border-slate-200/90 text-slate-900 shadow-sm';
  const subtleSurface = isDark
    ? 'bg-slate-950/90 border border-slate-800 text-slate-200'
    : 'bg-slate-100/80 border border-slate-200 text-slate-800';
  const inputSurface = isDark
    ? 'bg-slate-950 border border-slate-700 text-slate-100 focus:border-indigo-500'
    : 'bg-white border border-slate-300 text-slate-900 focus:border-indigo-600';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const dividerBorder = isDark ? 'border-slate-800' : 'border-slate-200';

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${pageBg}`}
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Noto Sans Bengali', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top Announcement & Payment Strip */}
      <div className="bg-indigo-600 text-white text-xs sm:text-sm py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span>
              {lang === 'bn'
                ? `বাংলাদেশের ১ নম্বর অটোমেটেড SMM প্যানেল · বিকাশ ও নগদে সর্বনিম্ন মাত্র ৳${minDepositBdt} অটো ডিপোজিট`
                : `Bangladesh #1 Automated SMM Panel · Instant bKash & Nagad Auto-Deposit from ৳${minDepositBdt}`}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-indigo-100 text-xs">
            <span>bKash Auto-Pay</span>
            <span>·</span>
            <span>Nagad Instant</span>
            <span>·</span>
            <span>Rocket</span>
            <span>·</span>
            <span>24/7 API v2</span>
          </div>
        </div>
      </div>

      {/* 1. Sticky Navigation Header */}
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-md ${
          isDark
            ? 'bg-slate-950/90 border-slate-800 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {/* Brand Logo & Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 min-w-0"
          >
            <img
              src={brandLogo}
              alt={brandName}
              width={40}
              height={40}
              className={`w-10 h-10 rounded-xl object-cover border shrink-0 ${dividerBorder}`}
            />
            <div className="min-w-0">
              <div className="font-bold text-lg tracking-tight leading-none truncate">
                {brandName}
              </div>
              <div className={`text-xs mt-0.5 truncate ${mutedText}`}>
                {lang === 'bn' ? 'অটোমেটেড সোশ্যাল বুস্ট প্যানেল' : 'Automated SMM Panel BD'}
              </div>
            </div>
          </a>

          {/* Primary Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => scrollToSection('platform-tour')}
              className={`${mutedText} hover:text-indigo-600 transition-colors cursor-pointer`}
            >
              {lang === 'bn' ? 'প্ল্যাটফর্ম সমূহ' : 'Platforms'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('live-catalog')}
              className={`${mutedText} hover:text-indigo-600 transition-colors cursor-pointer`}
            >
              {lang === 'bn' ? 'লাইভ রেট লিস্ট' : 'Service Rates'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow-well')}
              className={`${mutedText} hover:text-indigo-600 transition-colors cursor-pointer`}
            >
              {lang === 'bn' ? 'কিভাবে অর্ডার করবেন' : 'How It Works'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('reseller-api')}
              className={`${mutedText} hover:text-indigo-600 transition-colors cursor-pointer`}
            >
              {lang === 'bn' ? 'রিসেলার API' : 'Reseller API'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('blog')}
              className={`${mutedText} hover:text-indigo-600 transition-colors cursor-pointer`}
            >
              {lang === 'bn' ? 'ব্লগ ও গাইড' : 'Blog Guides'}
            </button>
          </nav>

          {/* Right Controls: Theme Toggle, Currency, Language, Login & Register */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              className={`p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${subtleSurface}`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Light or Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button
              type="button"
              onClick={() => setCurrency((c) => (c === 'BDT' ? 'USD' : 'BDT'))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tabular-nums cursor-pointer ${subtleSurface}`}
              title="Switch Currency"
            >
              {currency === 'BDT' ? '৳ BDT' : '$ USD'}
            </button>
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'bn' ? 'en' : 'bn'))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${subtleSurface}`}
              title="Switch Language"
            >
              {lang === 'bn' ? 'EN' : 'বাংলা'}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold cursor-pointer ${subtleSurface}`}
            >
              <LogIn className="w-4 h-4" />
              <span>{lang === 'bn' ? 'লগইন' : 'Login'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ফ্রি একাউন্ট' : 'Register'}</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section: Left Value Proposition & Platform Dock + Right Interactive SMM Workbench */}
        <section className={`relative border-b ${dividerBorder} py-10 lg:py-16`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column (7 cols): Headline, Core Value, Platform Quick-Jump & Key Figures */}
              <div className="lg:col-span-7 space-y-6 pt-1">
                <div className={`inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400`}>
                  <span>
                    {lang === 'bn'
                      ? 'সরাসরি মেইন প্রোভাইডার · বিকাশ ও নগদ অটো পেমেন্ট'
                      : 'Direct Main Provider · Instant bKash & Nagad Gateway'}
                  </span>
                </div>

                <h1
                  className="font-extrabold tracking-tight text-balance"
                  style={{
                    fontSize: 'clamp(2.1rem, 3.8vw + 0.5rem, 3.5rem)',
                    lineHeight: 1.12,
                  }}
                >
                  {lang === 'bn' ? (
                    <>
                      ফেসবুক, ইউটিউব ও টিকটক বুস্টিং এখন{' '}
                      <span className="text-indigo-600 dark:text-indigo-400">
                        সম্পূর্ণ অটোমেটেড ও পাইকারি রেটে
                      </span>
                    </>
                  ) : (
                    <>
                      Automated Social Media Boosting &{' '}
                      <span className="text-indigo-600 dark:text-indigo-400">
                        Wholesale SMM Panel in Bangladesh
                      </span>
                    </>
                  )}
                </h1>

                <p className={`text-base sm:text-lg leading-relaxed max-w-2xl ${mutedText}`}>
                  {lang === 'bn'
                    ? `কোনো কার্ড বা ডলারের ঝামেলা ছাড়াই বিকাশ ও নগদে তাৎক্ষণিক ডিপোজিট করুন। মাত্র ৳${lowestOverallRate.bdt} থেকে শুরু করে Facebook Page Monetization, YouTube 4000h Watchtime, TikTok Viral Views ও Instagram ফলোয়ার অর্ডার করুন ২৪/৭ স্বয়ংক্রিয় ডেলিভারিতে।`
                    : `No dollar card required. Deposit instantly with bKash or Nagad and order Facebook Page Monetization, YouTube 4000h Watchtime, TikTok Views, and Instagram Followers starting from ৳${lowestOverallRate.bdt} per 1,000.`}
                </p>

                {/* Primary Hero CTAs */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'ফ্রি একাউন্ট তৈরি করুন' : 'Create Free Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-base font-semibold transition-colors cursor-pointer ${cardSurface} hover:border-indigo-500`}
                  >
                    <LogIn className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{lang === 'bn' ? 'মেম্বার লগইন' : 'Member Login'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('live-catalog')}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-base font-semibold transition-colors cursor-pointer ${subtleSurface}`}
                  >
                    <span>{lang === 'bn' ? `সব সার্ভিস (${activeServices.length})` : `All Services (${activeServices.length})`}</span>
                  </button>
                </div>

                {/* Interactive Platform Quick-Selector Strip */}
                <div className="pt-2">
                  <div className={`text-xs font-semibold mb-2.5 ${mutedText}`}>
                    {lang === 'bn'
                      ? 'যেকোনো প্ল্যাটফর্মে ক্লিক করে সরাসরি রেট ও ক্যালকুলেটর দেখুন:'
                      : 'Click any platform to load its live wholesale rates:'}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {(
                      [
                        {
                          key: 'facebook',
                          label: 'Facebook',
                          color: 'text-blue-600 dark:text-blue-400',
                        },
                        {
                          key: 'youtube',
                          label: 'YouTube',
                          color: 'text-red-600 dark:text-red-400',
                        },
                        {
                          key: 'tiktok',
                          label: 'TikTok',
                          color: 'text-pink-600 dark:text-pink-400',
                        },
                        {
                          key: 'instagram',
                          label: 'Instagram',
                          color: 'text-fuchsia-600 dark:text-fuchsia-400',
                        },
                        {
                          key: 'telegram',
                          label: 'Telegram',
                          color: 'text-sky-600 dark:text-sky-400',
                        },
                      ] as const
                    ).map((item) => {
                      const active = calcPlatform === item.key;
                      const stats = platformStats[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setCalcPlatform(item.key);
                            setHeroTab('calculator');
                          }}
                          className={`p-3 rounded-xl text-left transition-all cursor-pointer border ${
                            active
                              ? 'border-indigo-600 bg-indigo-600/10 dark:bg-indigo-500/15 ring-1 ring-indigo-600'
                              : isDark
                              ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className={item.color}>
                              <PlatformIcon platform={item.key} className="w-5 h-5" />
                            </span>
                            <span className={`text-[11px] font-mono tabular-nums ${mutedText}`}>
                              {stats.count}টি
                            </span>
                          </div>
                          <div className="font-bold text-xs sm:text-sm truncate">{item.label}</div>
                          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                            {currency === 'BDT' ? `৳${stats.minBdt}/1K থেকে` : `$${stats.minUsd}/1K`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Key Stats Bar */}
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t ${dividerBorder}`}>
                  <div>
                    <div className="text-2xl font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {activeServices.length}+
                    </div>
                    <div className={`text-xs mt-0.5 ${mutedText}`}>
                      {lang === 'bn' ? 'লাইভ অটোমেটেড সার্ভিস' : 'Live Active Services'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {currency === 'BDT' ? `৳${lowestOverallRate.bdt}` : `$${lowestOverallRate.usd}`}
                    </div>
                    <div className={`text-xs mt-0.5 ${mutedText}`}>
                      {lang === 'bn' ? 'প্রতি ১,০০০ শুরুর রেট' : 'Starting Rate / 1K'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold tabular-nums">
                      {currency === 'BDT' ? `৳${minDepositBdt}` : `$${(minDepositBdt / bdtPerUsd).toFixed(2)}`}
                    </div>
                    <div className={`text-xs mt-0.5 ${mutedText}`}>
                      {lang === 'bn' ? 'ন্যূনতম বিকাশ/নগদ ডিপোজিট' : 'Min bKash/Nagad Deposit'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold tabular-nums">0-5m</div>
                    <div className={`text-xs mt-0.5 ${mutedText}`}>
                      {lang === 'bn' ? 'গড় অর্ডার স্টার্ট টাইম' : 'Avg. API Order Start'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Interactive Dual-Tab SMM Workbench */}
              <div className="lg:col-span-5">
                <div className={`rounded-2xl overflow-hidden ${cardSurface}`}>
                  {/* Workbench Mode Switcher Tabs */}
                  <div className={`grid grid-cols-2 p-1.5 border-b ${dividerBorder} ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => setHeroTab('calculator')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        heroTab === 'calculator'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : `${mutedText} hover:text-indigo-600`
                      }`}
                    >
                      <Calculator className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'লাইভ রেট ক্যালকুলেটর' : 'Live Rate Calculator'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroTab('quick_access')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        heroTab === 'quick_access'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : `${mutedText} hover:text-indigo-600`
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'বিকাশ/নগদ ও লগইন' : 'bKash Deposit & Login'}</span>
                    </button>
                  </div>

                  {heroTab === 'calculator' ? (
                    <div className="p-5 sm:p-6 space-y-4">
                      {/* Platform Filter Pills inside Calculator */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold mb-2">
                          <span className={mutedText}>
                            {lang === 'bn' ? '১. প্ল্যাটফর্ম সিলেক্ট করুন' : '1. Choose Platform'}
                          </span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">
                            {calculatorServices.length} {lang === 'bn' ? 'টি সার্ভিস' : 'services'}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {(['facebook', 'youtube', 'tiktok', 'instagram', 'telegram'] as const).map(
                            (p) => {
                              const active = calcPlatform === p;
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setCalcPlatform(p)}
                                  className={`py-2 px-1.5 rounded-lg text-xs font-semibold capitalize flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                                    active
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : `${subtleSurface} hover:border-indigo-400`
                                  }`}
                                >
                                  <PlatformIcon platform={p} className="w-4 h-4" />
                                  <span className="text-[11px] truncate w-full text-center">{p}</span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Service Dropdown */}
                      <div>
                        <label
                          htmlFor="hero-service-select"
                          className={`block text-xs font-semibold mb-1.5 ${mutedText}`}
                        >
                          {lang === 'bn' ? '২. সার্ভিস নির্বাচন করুন' : '2. Select Service'}
                        </label>
                        <select
                          id="hero-service-select"
                          value={calcServiceId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setCalcServiceId(id);
                            const found = calculatorServices.find((s: SMMService) => s.id === id);
                            if (found) {
                              setCalcQuantity(String(Math.max(found.min || 100, 1000)));
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium outline-none transition-colors ${inputSurface}`}
                        >
                          {calculatorServices.map((s: SMMService) => (
                            <option key={s.id} value={s.id}>
                              #{s.id} · {s.name} ({formatRate(s.rate)}/1K)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Service Details Strip */}
                      {selectedCalcService && (
                        <div className={`p-3 rounded-xl text-xs space-y-1.5 ${subtleSurface}`}>
                          <div className="font-semibold line-clamp-1">
                            #{selectedCalcService.id} · {selectedCalcService.name}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
                            <span>
                              {lang === 'bn' ? 'সর্বনিম্ন:' : 'Min:'}{' '}
                              <strong>{selectedCalcService.min.toLocaleString()}</strong>
                            </span>
                            <span>
                              {lang === 'bn' ? 'সর্বোচ্চ:' : 'Max:'}{' '}
                              <strong>{selectedCalcService.max.toLocaleString()}</strong>
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {formatRate(selectedCalcService.rate)} / 1,000
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Quantity Input + Quick Presets */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                          <label htmlFor="hero-qty-input" className={mutedText}>
                            {lang === 'bn' ? '৩. পরিমাণ লিখুন (Quantity)' : '3. Enter Quantity'}
                          </label>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {lang === 'bn' ? 'ইনস্ট্যান্ট ডেলিভারি' : 'Instant API Start'}
                          </span>
                        </div>
                        <input
                          id="hero-qty-input"
                          type="number"
                          min={selectedCalcService?.min || 10}
                          max={selectedCalcService?.max || 1000000}
                          value={calcQuantity}
                          onChange={(e) => setCalcQuantity(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-base font-bold tabular-nums outline-none transition-colors ${inputSurface}`}
                        />
                        <div className="grid grid-cols-5 gap-1.5 mt-2">
                          {[500, 1000, 5000, 10000, 50000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCalcQuantity(String(preset))}
                              className={`py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                                Number(calcQuantity) === preset
                                  ? 'bg-indigo-600 text-white'
                                  : `${subtleSurface} hover:border-indigo-400`
                              }`}
                            >
                              {preset >= 1000 ? `${preset / 1000}K` : preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Total Cost Readout & Order Button */}
                      <div className="p-4 rounded-xl bg-indigo-600 text-white flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-indigo-100">
                            {lang === 'bn' ? 'সর্বমোট অর্ডার খরচ' : 'Estimated Total Cost'}
                          </div>
                          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums mt-0.5">
                            {currency === 'BDT'
                              ? `৳${calcTotalPrice >= 100 ? calcTotalPrice.toFixed(0) : calcTotalPrice.toFixed(2)}`
                              : `$${calcTotalPrice.toFixed(3)}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenAuth('register')}
                          className="px-4 py-3 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm transition-colors cursor-pointer shrink-0 shadow-xs"
                        >
                          {lang === 'bn' ? 'অর্ডার করুন →' : 'Order Now →'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Tab 2: Quick Member Access & bKash/Nagad Deposit Simulator */
                    <div className="p-5 sm:p-6 space-y-4">
                      <div>
                        <div className="font-bold text-base">
                          {lang === 'bn'
                            ? 'তাৎক্ষণিক বিকাশ, নগদ ও রকেট অটো ডিপোজিট'
                            : 'Instant bKash, Nagad & Rocket Auto-Deposit'}
                        </div>
                        <p className={`text-xs mt-1 ${mutedText}`}>
                          {lang === 'bn'
                            ? 'ZiniPay অটোমেটেড গেটওয়ের মাধ্যমে ২৪ ঘণ্টা যেকোনো সময় নিজের নাম্বার থেকে পেমেন্ট করলেই ১ সেকেন্ডে ব্যালেন্স যোগ হয়।'
                            : 'Top up 24/7 via ZiniPay automated mobile banking gateway with instant 1-second wallet credit.'}
                        </p>
                      </div>

                      {/* Select Payment Gateway */}
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { name: 'bKash', badge: 'bg-pink-600 text-white', sub: 'Auto Verify' },
                            { name: 'Nagad', badge: 'bg-orange-500 text-white', sub: 'Instant' },
                            { name: 'Rocket', badge: 'bg-purple-700 text-white', sub: 'Automated' },
                          ] as const
                        ).map((gw) => (
                          <button
                            key={gw.name}
                            type="button"
                            onClick={() => setPreviewMethod(gw.name)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              previewMethod === gw.name
                                ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-600/5'
                                : `${subtleSurface}`
                            }`}
                          >
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${gw.badge}`}>
                              {gw.name}
                            </span>
                            <div className={`text-[11px] mt-1.5 font-medium ${mutedText}`}>
                              {gw.sub}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Quick Deposit Amount Presets */}
                      <div>
                        <div className={`text-xs font-semibold mb-1.5 ${mutedText}`}>
                          {lang === 'bn' ? 'ডিপোজিট পরিমাণ প্রিভিউ করুন:' : 'Preview Deposit Amount:'}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[50, 200, 500, 1000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setPreviewDepositBdt(amt)}
                              className={`py-2 rounded-lg text-xs font-bold tabular-nums cursor-pointer ${
                                previewDepositBdt === amt
                                  ? 'bg-indigo-600 text-white'
                                  : subtleSurface
                              }`}
                            >
                              ৳{amt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-xl space-y-2 text-xs ${subtleSurface}`}>
                        <div className="flex justify-between">
                          <span className={mutedText}>
                            {lang === 'bn' ? 'পেমেন্ট মেথড:' : 'Payment Method:'}
                          </span>
                          <span className="font-bold">{previewMethod} (ZiniPay Auto)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={mutedText}>
                            {lang === 'bn' ? 'ওয়ালেটে জমা হবে:' : 'Wallet Credit:'}
                          </span>
                          <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                            ৳{previewDepositBdt}.00 BDT
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => onOpenAuth('login')}
                          className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer ${subtleSurface}`}
                        >
                          <LogIn className="w-4 h-4" />
                          <span>{lang === 'bn' ? 'লগইন করুন' : 'Member Login'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenAuth('register')}
                          className="py-3 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>{lang === 'bn' ? 'ফ্রি রেজিস্টার' : 'Free Sign Up'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Platform Solutions & Starting Rates Bento Grid (#platform-tour) */}
        <section id="platform-tour" className={`py-14 lg:py-20 border-b ${dividerBorder}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {lang === 'bn'
                    ? 'সকল সোশ্যাল মিডিয়া প্ল্যাটফর্মের সার্ভিস এক ছাদের নিচে'
                    : 'All Social Media Growth Solutions Under One Roof'}
                </h2>
                <p className={`text-sm sm:text-base ${mutedText}`}>
                  {lang === 'bn'
                    ? 'প্রতিটি প্ল্যাটফর্মের আসল লাইভ ডাটাবেজ রেট এবং জনপ্রিয় সার্ভিসগুলো নিচে দেখুন।'
                    : 'Explore real database rates and top automated services for every major social platform.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection('live-catalog')}
                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <span>{lang === 'bn' ? 'সম্পূর্ণ রেট লিস্ট দেখুন' : 'View Full Price List'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {platformCards.map((card) => {
                const stats = platformStats[card.key];
                return (
                  <div
                    key={card.key}
                    className={`rounded-2xl p-6 flex flex-col justify-between transition-all ${cardSurface}`}
                  >
                    <div className="space-y-4">
                      {/* Header Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                            isDark ? card.softBgDark : card.softBgLight
                          }`}
                        >
                          <PlatformIcon platform={card.key} className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                          <div className={`text-xs ${mutedText}`}>
                            {lang === 'bn' ? 'শুরুর রেট' : 'Starting at'}
                          </div>
                          <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {currency === 'BDT' ? `৳${stats.minBdt}` : `$${stats.minUsd}`}
                            <span className={`text-xs font-normal ${mutedText}`}> / 1K</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold">
                          {lang === 'bn' ? card.titleBn : card.titleEn}
                        </h3>
                        <p className={`text-sm mt-1 leading-relaxed ${mutedText}`}>
                          {lang === 'bn' ? card.descBn : card.descEn}
                        </p>
                      </div>

                      {/* Top 3 Live Services Preview from Database */}
                      <div className={`pt-3 border-t ${dividerBorder} space-y-2`}>
                        <div className={`text-xs font-semibold ${mutedText}`}>
                          {lang === 'bn'
                            ? `জনপ্রিয় সার্ভিস (${stats.count}টি সক্রিয়):`
                            : `Popular Services (${stats.count} active):`}
                        </div>
                        {stats.topServices.slice(0, 3).map((srv: SMMService) => (
                          <div
                            key={srv.id}
                            className="flex items-center justify-between gap-2 text-xs py-1"
                          >
                            <span className="truncate font-medium">
                              #{srv.id} · {srv.name}
                            </span>
                            <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0">
                              {formatRate(srv.rate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlatform(card.key);
                          scrollToSection('live-catalog');
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-center transition-colors cursor-pointer ${subtleSurface} hover:border-indigo-500`}
                      >
                        {lang === 'bn' ? 'সব রেট দেখুন' : 'Browse Rates'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAuth('register')}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                      >
                        {lang === 'bn' ? 'অর্ডার করুন' : 'Order'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* 6th Card: Bangladeshi Local Payment & Auto-Refund Guarantee Card */}
              <div className="rounded-2xl p-6 flex flex-col justify-between bg-indigo-600 text-white">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-bold bg-white/15 px-3 py-1 rounded-lg">
                      ZiniPay Gateway
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">
                      {lang === 'bn'
                        ? 'বিকাশ, নগদ ও রকেট অটোমেটেড পেমেন্ট'
                        : 'bKash, Nagad & Rocket Automated Gateway'}
                    </h3>
                    <p className="text-sm text-indigo-100 mt-1 leading-relaxed">
                      {lang === 'bn'
                        ? 'এডমিনের অপেক্ষায় থাকতে হবে না! দিন-রাত ২৪ ঘণ্টা স্বয়ংক্রিয়ভাবে টাকা অ্যাড করুন এবং ১০০% অটো-রিফান্ড গ্যারান্টিতে অর্ডার করুন।'
                        : 'No manual admin wait. Add funds 24/7 with instant Transaction ID verification and 100% automatic refund protection.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/20 space-y-2 text-xs text-indigo-100">
                    <div className="flex justify-between">
                      <span>bKash / Nagad / Rocket</span>
                      <span className="font-bold text-white">Instant 1s Credit</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{lang === 'bn' ? 'সর্বনিম্ন ডিপোজিট' : 'Minimum Deposit'}</span>
                      <span className="font-bold text-white tabular-nums">৳{minDepositBdt} BDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{lang === 'bn' ? 'অর্ডার ক্যানসেল হলে' : 'Canceled Orders'}</span>
                      <span className="font-bold text-white">100% Auto Wallet Refund</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="w-full py-2.5 px-4 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {lang === 'bn' ? 'ফ্রি একাউন্ট খুলে ডিপোজিট করুন →' : 'Create Account & Add Funds →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Live Wholesale Service Catalog & Rate Table (#live-catalog) */}
        <section id="live-catalog" className={`py-14 lg:py-20 border-b ${dividerBorder}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {lang === 'bn'
                    ? 'লাইভ সার্ভিস ক্যাটালগ ও পাইকারি রেট লিস্ট'
                    : 'Live Wholesale Service Catalog & Price List'}
                </h2>
                <p className={`text-sm sm:text-base ${mutedText}`}>
                  {lang === 'bn'
                    ? `ডাটাবেজের ${activeServices.length}টি সক্রিয় সার্ভিসের রিয়েল-টাইম মূল্য তালিকা (${currency} রেটে)।`
                    : `Real-time wholesale pricing across ${activeServices.length} active database services in ${currency}.`}
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative min-w-[260px]">
                  <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleCount(20);
                    }}
                    placeholder={
                      lang === 'bn'
                        ? 'সার্ভিস নাম বা #ID দিয়ে খুঁজুন...'
                        : 'Search service name or #ID...'
                    }
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none ${inputSurface}`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className={`w-4 h-4 shrink-0 ${mutedText}`} />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label="Sort services"
                    className={`px-3.5 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer ${inputSurface}`}
                  >
                    <option value="popular">
                      {lang === 'bn' ? 'জনপ্রিয় সার্ভিস' : 'Popular Services'}
                    </option>
                    <option value="price_asc">
                      {lang === 'bn' ? 'কম রেট আগে' : 'Price: Low to High'}
                    </option>
                    <option value="price_desc">
                      {lang === 'bn' ? 'বেশি রেট আগে' : 'Price: High to Low'}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Platform Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  { id: 'all', labelBn: 'সব সার্ভিস', labelEn: 'All Services', count: activeServices.length },
                  { id: 'facebook', labelBn: 'Facebook', labelEn: 'Facebook', count: platformStats.facebook.count },
                  { id: 'youtube', labelBn: 'YouTube', labelEn: 'YouTube', count: platformStats.youtube.count },
                  { id: 'tiktok', labelBn: 'TikTok', labelEn: 'TikTok', count: platformStats.tiktok.count },
                  { id: 'instagram', labelBn: 'Instagram', labelEn: 'Instagram', count: platformStats.instagram.count },
                  { id: 'telegram', labelBn: 'Telegram', labelEn: 'Telegram', count: platformStats.telegram.count },
                ] as const
              ).map((tab) => {
                const active = selectedPlatform === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(tab.id);
                      setVisibleCount(20);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : `${cardSurface} hover:border-indigo-500`
                    }`}
                  >
                    {tab.id !== 'all' && <PlatformIcon platform={tab.id} className="w-4 h-4" />}
                    <span>{lang === 'bn' ? tab.labelBn : tab.labelEn}</span>
                    <span className={`text-xs font-mono tabular-nums ${active ? 'text-indigo-100' : mutedText}`}>
                      ({tab.count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Responsive Wholesale Service Table */}
            <div className={`rounded-2xl overflow-hidden ${cardSurface}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs font-bold ${dividerBorder} ${isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                      <th className="py-3.5 px-4 w-20">ID</th>
                      <th className="py-3.5 px-4">
                        {lang === 'bn' ? 'সার্ভিসের নাম ও ক্যাটাগরি' : 'Service Name & Category'}
                      </th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">
                        {lang === 'bn' ? 'রেট / ১,০০০ (1K)' : 'Rate per 1,000'}
                      </th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap hidden md:table-cell">
                        {lang === 'bn' ? 'ন্যূনতম - সর্বোচ্চ' : 'Min - Max'}
                      </th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">
                        {lang === 'bn' ? 'অ্যাকশন' : 'Action'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-sm ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {filteredCatalog.slice(0, visibleCount).map((srv: SMMService) => (
                      <tr
                        key={srv.id}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap">
                          #{srv.id}
                        </td>
                        <td className="py-3.5 px-4 max-w-md">
                          <div className="font-bold text-sm leading-snug">{srv.name}</div>
                          <div className={`text-xs mt-0.5 flex flex-wrap items-center gap-2 ${mutedText}`}>
                            <span>{srv.category}</span>
                            <span className="md:hidden tabular-nums">
                              · Min {srv.min.toLocaleString()} / Max {srv.max.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-base text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          {formatRate(srv.rate)}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap hidden md:table-cell ${mutedText}`}>
                          {srv.min.toLocaleString()} - {srv.max.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectServiceIntoCalculator(srv)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hidden sm:inline-flex items-center gap-1 ${subtleSurface} hover:border-indigo-500`}
                              title="Calculate Cost"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span>{lang === 'bn' ? 'হিসাব' : 'Calc'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenAuth('register')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                            >
                              {lang === 'bn' ? 'অর্ডার' : 'Order'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredCatalog.length === 0 && (
                      <tr>
                        <td colSpan={5} className={`py-12 text-center text-sm ${mutedText}`}>
                          {lang === 'bn'
                            ? 'আপনার সার্চের সাথে মিলে এমন কোনো সার্ভিস পাওয়া যায়নি।'
                            : 'No matching services found for your search query.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Load More Bar */}
              {filteredCatalog.length > visibleCount && (
                <div className={`p-4 border-t text-center ${dividerBorder}`}>
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 25)}
                    className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer ${subtleSurface} hover:border-indigo-500`}
                  >
                    {lang === 'bn'
                      ? `আরো সার্ভিস দেখুন (${filteredCatalog.length - visibleCount}টি বাকি)`
                      : `Show More Services (${filteredCatalog.length - visibleCount} remaining)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. How It Works: 3-Step Automated Workflow (#workflow-well) */}
        <section id="workflow-well" className={`py-14 lg:py-20 border-b ${dividerBorder}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {lang === 'bn'
                  ? 'মাত্র ৩টি সহজ ধাপে সোশ্যাল মিডিয়া বুস্ট শুরু করুন'
                  : 'Start Boosting in 3 Simple Automated Steps'}
              </h2>
              <p className={`text-sm sm:text-base ${mutedText}`}>
                {lang === 'bn'
                  ? 'কোনো জটিল নিয়ম বা ম্যানুয়াল ভেরিফিকেশনের প্রয়োজন নেই।'
                  : 'Zero manual approval delays. Everything runs automatically 24/7.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  titleBn: 'ফ্রি একাউন্ট খুলুন',
                  titleEn: 'Create Your Free Account',
                  descBn: 'মাত্র ৩০ সেকেন্ডে আপনার নাম ও ইমেইল দিয়ে অথবা ওয়ান-ক্লিক Google Sign-In ব্যবহার করে মেম্বার প্যানেলে লগইন করুন।',
                  descEn: 'Sign up in 30 seconds with your email or 1-click Google Sign-In to access your live member dashboard.',
                },
                {
                  step: '02',
                  titleBn: 'বিকাশ বা নগদে ব্যালেন্স অ্যাড করুন',
                  titleEn: 'Add Funds via bKash or Nagad',
                  descBn: `Add Funds অপশন থেকে বিকাশ, নগদ বা রকেটের মাধ্যমে সর্বনিম্ন মাত্র ৳${minDepositBdt} ডিপোজিট করুন। ১ সেকেন্ডে অটোমেটিক ব্যালেন্স যুক্ত হবে।`,
                  descEn: `Deposit starting from just ৳${minDepositBdt} via bKash, Nagad, or Rocket. Your balance updates automatically in 1 second.`,
                },
                {
                  step: '03',
                  titleBn: 'লিংক দিয়ে অর্ডার সাবমিট করুন',
                  titleEn: 'Paste Link & Submit Order',
                  descBn: 'পছন্দের সার্ভিস সিলেক্ট করে আপনার পোস্ট বা ভিডিও লিংক ও পরিমাণ দিন। আমাদের মেইন সার্ভার সাথে সাথে ডেলিভারি শুরু করবে।',
                  descEn: 'Select your desired service, paste your public post or video link, and watch automated API delivery begin.',
                },
              ].map((item) => (
                <div key={item.step} className={`rounded-2xl p-6 space-y-3 ${cardSurface}`}>
                  <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    STEP {item.step}
                  </div>
                  <h3 className="text-lg font-bold">
                    {lang === 'bn' ? item.titleBn : item.titleEn}
                  </h3>
                  <p className={`text-sm leading-relaxed ${mutedText}`}>
                    {lang === 'bn' ? item.descBn : item.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Developer & Reseller REST API v2 Workbench (#reseller-api) */}
        <section id="reseller-api" className={`py-14 lg:py-20 border-b ${dividerBorder}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Code2 className="w-4 h-4" />
                  <span>REST API v2 · Wholesale Provider</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {lang === 'bn'
                    ? 'রিসেলার ও এজেন্সির জন্য হাই-স্পিড REST API v2'
                    : 'High-Speed REST API v2 for Agencies & Child Panels'}
                </h2>
                <p className={`text-sm sm:text-base leading-relaxed ${mutedText}`}>
                  {lang === 'bn'
                    ? 'আপনার নিজস্ব SMM প্যানেল, ডিজিটাল মার্কেটিং এজেন্সি কিংবা ফ্রিল্যান্সিং বিজনেসের সাথে আমাদের স্ট্যান্ডার্ড API কানেক্ট করে সম্পূর্ণ অটোমেটিক অর্ডার প্রসেসিং চালু করুন।'
                    : 'Connect your child panel, digital agency, or custom storefront directly to our wholesale infrastructure using standard REST API v2 parameters.'}
                </p>

                <div className={`rounded-xl p-4 space-y-2.5 text-xs ${subtleSurface}`}>
                  <div className="flex justify-between">
                    <span className={mutedText}>Endpoint URL</span>
                    <span className="font-mono font-bold">https://boostlagbe.com/api/v2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={mutedText}>HTTP Method & Format</span>
                    <span className="font-mono font-bold">POST · JSON Response</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={mutedText}>Supported Actions</span>
                    <span className="font-mono font-bold">services, add, status, refill, balance</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                >
                  <span>{lang === 'bn' ? 'ফ্রি API Key জেনারেট করুন' : 'Get Free API Key'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 text-slate-100 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-2">
                      {(['curl', 'php', 'node'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setApiTab(t)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase cursor-pointer ${
                            apiTab === t
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyApi}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    >
                      {copiedApi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-5 text-xs sm:text-sm font-mono text-slate-200 overflow-x-auto leading-relaxed">
                    <code>{apiSnippets[apiTab]}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Frequently Asked Questions & Bangladesh SEO Directory (#faq) */}
        <section id="faq" className={`py-14 lg:py-20 border-b ${dividerBorder}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-5 space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <HelpCircle className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)' : 'Frequently Asked Questions'}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {lang === 'bn'
                    ? 'অর্ডার, পেমেন্ট ও গ্যারান্টি সম্পর্কে আপনার প্রশ্নের উত্তর'
                    : 'Answers About Payments, Delivery & Refill Guarantees'}
                </h2>
                <p className={`text-sm sm:text-base ${mutedText}`}>
                  {lang === 'bn'
                    ? 'আরো কোনো প্রশ্ন থাকলে একাউন্ট খুলে ২৪/৭ লাইভ সাপোর্ট টিকেটে যোগাযোগ করুন।'
                    : 'Need further assistance? Our 24/7 Bengali & English support team is ready inside your dashboard.'}
                </p>
              </div>

              <div className="lg:col-span-7 space-y-3">
                {faqs.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className={`rounded-2xl overflow-hidden ${cardSurface}`}>
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base cursor-pointer"
                      >
                        <span>{lang === 'bn' ? item.qBn : item.qEn}</span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 transition-transform ${
                            isOpen ? 'rotate-180 text-indigo-600' : mutedText
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className={`px-5 pb-5 text-sm leading-relaxed border-t pt-3.5 ${dividerBorder} ${mutedText}`}>
                          {lang === 'bn' ? item.aBn : item.aEn}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Crawlable SEO Internal Links for Services & Bangladesh Divisions */}
            <div className={`pt-8 border-t ${dividerBorder} grid grid-cols-1 md:grid-cols-2 gap-8 text-xs`}>
              <div>
                <h3 className="font-bold text-sm mb-3">
                  {lang === 'bn'
                    ? 'জনপ্রিয় সোশ্যাল মিডিয়া বুস্টিং সার্ভিস গাইড'
                    : 'Popular Social Media Growth Guides'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {PROGRAMMATIC_SEO_LANDING_PAGES.map((page) => (
                    <a
                      key={page.slug}
                      href={`/?service_page=${page.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigateTab('blog', { seoSlug: page.slug });
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${subtleSurface} hover:border-indigo-500`}
                    >
                      {page.title}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm mb-3">
                  {lang === 'bn'
                    ? 'বিভাগীয় SMM সার্ভিস হাব (বাংলাদেশ)'
                    : 'Bangladesh Divisional SMM Service Hubs'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {DIVISIONAL_LOCAL_SEO_HUBS.map((hub) => (
                    <a
                      key={hub.division}
                      href={`/?division_hub=${encodeURIComponent(hub.division)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigateTab('blog', { divisionSlug: hub.division });
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${subtleSurface} hover:border-indigo-500`}
                    >
                      {hub.division} · {hub.popularService}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Clean Footer */}
      <footer className={`py-10 ${isDark ? 'bg-slate-950 text-slate-400' : 'bg-white text-slate-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <img
              src={brandLogo}
              alt={brandName}
              width={28}
              height={28}
              className="w-7 h-7 rounded-lg object-cover"
            />
            <span className="font-bold text-slate-900 dark:text-white">{brandName}</span>
            <span>·</span>
            <span>
              {lang === 'bn'
                ? 'বাংলাদেশের অটোমেটেড SMM ও পাইকারি API প্ল্যাটফর্ম'
                : 'Automated SMM & Wholesale API Platform Bangladesh'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => scrollToSection('live-catalog')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              {lang === 'bn' ? 'সার্ভিস রেট' : 'Service Rates'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('blog')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              {lang === 'bn' ? 'ব্লগ ও টিউটোরিয়াল' : 'Blog Guides'}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              {lang === 'bn' ? 'মেম্বার লগইন' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {lang === 'bn' ? 'ফ্রি রেজিস্টার' : 'Register'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
