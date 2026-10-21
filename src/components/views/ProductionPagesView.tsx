import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Mail,
  FileText,
  Lock,
  RefreshCw,
  AlertTriangle,
  Search,
  ChevronRight,
  Send,
  ExternalLink,
  Layers,
  Wallet,
  Code2,
  Home,
  HelpCircle,
  Scale,
  RotateCcw,
  Wrench,
  Server,
  Sparkles,
  Award,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SiteSettings, SMMService } from '../../types';
import { createTicket } from '../../services/db';
import { BD_MAIN_SEO_KEYWORD, BD_SUB_SEO_KEYWORDS } from '../../data/seedServices';

export type ProductionPageType =
  | 'about'
  | 'contact'
  | 'terms'
  | 'privacy'
  | 'refund'
  | '404'
  | 'maintenance';

interface ProductionPagesViewProps {
  page: ProductionPageType;
  siteSettings: SiteSettings;
  services: SMMService[];
  onNavigateTab: (tabId: string, params?: any) => void;
  onOpenAuth: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  standalone?: boolean;
}

export const ProductionPagesView: React.FC<ProductionPagesViewProps> = ({
  page,
  siteSettings,
  services,
  onNavigateTab,
  onOpenAuth,
  onShowToast,
  standalone = false
}) => {
  const { user, profile, isAdmin, language, setLanguage, currency, setCurrency, formatPrice } = useAuth();

  const brandName = siteSettings?.siteName?.trim() || 'AmarTrend SMM';
  const activeServicesCount = services.filter((s) => s.status !== 'disabled').length || 150;
  const categoriesCount = new Set(services.map((s) => s.category)).size || 24;

  // Quick Support Ticket Form State (for Contact & Help Center)
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDept, setTicketDept] = useState('Order & Refill Support');
  const [ticketOrderId, setTicketOrderId] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [helpSearchQuery, setHelpSearchQuery] = useState('');

  // 404 Search Recovery State
  const [recoverySearch, setRecoverySearch] = useState('');

  // Refund Calculator Interactive Preview State
  const [sampleOrderCharge, setSampleOrderCharge] = useState<number>(500);
  const [sampleOrderQty, setSampleOrderQty] = useState<number>(10000);
  const [sampleRemainsQty, setSampleRemainsQty] = useState<number>(3500);

  const calculatedPartialRefund = Math.max(
    0,
    Number(((sampleOrderCharge / Math.max(1, sampleOrderQty)) * Math.min(sampleOrderQty, sampleRemainsQty)).toFixed(2))
  );

  const handleQuickTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      onOpenAuth();
      return;
    }
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      onShowToast?.(
        language === 'bn' ? 'অনুগ্রহ করে বিষয় এবং মেসেজ লিখুন' : 'Please enter both subject and message',
        'error'
      );
      return;
    }
    setSubmittingTicket(true);
    try {
      const tckId = await createTicket(
        {
          userId: user.uid,
          userEmail: user.email || profile.email,
          subject: ticketSubject.trim(),
          orderId: ticketOrderId.trim() || undefined,
          department: ticketDept,
          status: 'open',
          priority: 'normal'
        },
        ticketMessage.trim(),
        profile.displayName || user.email || 'Member'
      );
      setTicketSubject('');
      setTicketOrderId('');
      setTicketMessage('');
      onShowToast?.(
        language === 'bn'
          ? `সাপোর্ট টিকেট #${tckId} সফলভাবে তৈরি হয়েছে!`
          : `Support Ticket #${tckId} created successfully!`,
        'success'
      );
      onNavigateTab('tickets');
    } catch (err: any) {
      onShowToast?.(err?.message || 'Failed to submit support ticket', 'error');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const pageMetaMap: Record<
    ProductionPageType,
    { badge: string; titleBn: string; titleEn: string; subtitleBn: string; subtitleEn: string }
  > = {
    about: {
      badge: 'ABOUT AMARTREND SMM BANGLADESH',
      titleBn: `${brandName} সম্পর্কে — বাংলাদেশের ১ নম্বর অটোমেটিক SMM ও মনিটাইজেশন ইনফ্রাস্ট্রাকচার`,
      titleEn: `About ${brandName} — Bangladesh's #1 Automated SMM & Monetization Infrastructure`,
      subtitleBn:
        'বাংলাদেশের কন্টেন্ট ক্রিয়েটর, ডিজিটাল মার্কেটিং এজেন্সি এবং রিসেলারদের জন্য সবচেয়ে কম দামে বিকাশ ও নগদ অটো-পেমেন্টসহ ক্লাউড API v2 সোশ্যাল মিডিয়া গ্রোথ প্ল্যাটফর্ম।',
      subtitleEn:
        'Engineered for Bangladeshi digital creators, agencies, and child-panel resellers with instant ZiniPay bKash/Nagad deposits and multi-provider Cloud API v2 order routing.'
    },
    contact: {
      badge: '24/7 BANGLADESH HELP CENTER & SUPPORT',
      titleBn: 'যোগাযোগ ও ২৪/৭ কাস্টমার হেল্প সেন্টার (বাংলাদেশ)',
      titleEn: 'Contact Us & 24/7 Bangladesh Customer Help Center',
      subtitleBn:
        'অর্ডার ট্র্যাকিং, রিফিল গ্যারান্টি, ZiniPay বিকাশ/নগদ অটো ডিপোজিট অথবা রিসেলার API v2 সংক্রান্ত যেকোনো সহায়তার জন্য আমাদের সাপোর্ট টিমের সাথে সরাসরি যোগাযোগ করুন।',
      subtitleEn:
        'Get instant assistance for SMM order delivery, refill guarantees, ZiniPay bKash/Nagad deposits, or wholesale API v2 integration from our dedicated Bangladesh support desk.'
    },
    terms: {
      badge: 'LEGAL AGREEMENT & SERVICE RULES',
      titleBn: `ব্যবহারের শর্তাবলী ও সার্ভিস নীতিমালা (Terms of Service) — ${brandName}`,
      titleEn: `Terms of Service & Platform Usage Agreement — ${brandName}`,
      subtitleBn:
        'আমাদের অটোমেটিক SMM প্যানেল, ওয়ালেট ডিপোজিট এবং REST API v2 ব্যবহারের পূর্বে অনুগ্রহ করে নিচের নিয়মাবলী ও শর্তসমূহ মনোযোগ দিয়ে পড়ুন।',
      subtitleEn:
        'Please read these operational terms and service rules carefully before placing SMM orders, depositing funds via ZiniPay, or connecting via REST API v2.'
    },
    privacy: {
      badge: 'DATA PROTECTION & ZERO-PASSWORD SECURITY',
      titleBn: `গোপনীয়তা ও ডাটা সুরক্ষা নীতিমালা (Privacy Policy) — ${brandName}`,
      titleEn: `Privacy Policy & Zero-Password Security Standard — ${brandName}`,
      subtitleBn:
        'আমরা আপনার ব্যক্তিগত তথ্য, পেমেন্ট ট্রানজেকশন এবং API ডেটা কীভাবে সর্বোচ্চ এনক্রিপশনের মাধ্যমে সুরক্ষিত রাখি তার বিস্তারিত বিবরণ।',
      subtitleEn:
        'Learn how we safeguard your account data, encrypted ZiniPay bKash/Nagad transactions, and public social links without ever asking for your social media passwords.'
    },
    refund: {
      badge: '100% AUTOMATED WALLET REFUND GUARANTEE',
      titleBn: `অটোমেটিক রিফান্ড, ক্যানসেল ও রিফিল গ্যারান্টি নীতিমালা (Refund Policy)`,
      titleEn: `Refund, Partial Order & Refill Guarantee Policy — ${brandName}`,
      subtitleBn:
        'অর্ডার ক্যানসেল হলে ১০০% সম্পূর্ণ রিফান্ড এবং পার্শিয়াল (Partial) অর্ডারের ক্ষেত্রে অবশিষ্ট ইউনিটের টাকা স্বয়ংক্রিয়ভাবে ওয়ালেটে ফেরত পাওয়ার স্বচ্ছ নিয়মাবলী।',
      subtitleEn:
        'Transparent rules governing 100% automated wallet refunds for canceled orders, exact pro-rata partial refunds, and non-drop refill guarantees.'
    },
    '404': {
      badge: 'HTTP 404 • PAGE NOT FOUND',
      titleBn: '৪০৪ — কাঙ্ক্ষিত পেজটি খুঁজে পাওয়া যায়নি',
      titleEn: '404 — Requested Page or Route Not Found',
      subtitleBn:
        'আপনি যে লিংকটি খুঁজছেন সেটি পরিবর্তন করা হয়েছে অথবা সাময়িকভাবে অনুপলব্ধ। নিচের কুইক নেভিগেশন বা সার্চ ব্যবহার করে মূল সার্ভিসে ফিরে যান।',
      subtitleEn:
        'The URL you visited does not exist or may have been moved. Use the quick search or navigation links below to continue exploring live SMM services.'
    },
    maintenance: {
      badge: 'SCHEDULED CLOUD INFRASTRUCTURE UPGRADE',
      titleBn: 'সিস্টেম আপগ্রেড ও মেইনটেন্যান্স মোড চালু রয়েছে',
      titleEn: 'Scheduled Cloud Infrastructure Maintenance in Progress',
      subtitleBn:
        'আমাদের API v2 রাউটার এবং ZiniPay অটো-পেমেন্ট সার্ভারের পারফরম্যান্স উন্নয়নের কাজ চলছে। খুব শীঘ্রই সকল সার্ভিস পুনরায় সচল হবে।',
      subtitleEn:
        'We are upgrading our upstream API v2 routing nodes and ZiniPay gateway clusters for faster delivery. All existing orders continue processing automatically.'
    }
  };

  const activeMeta = pageMetaMap[page] || pageMetaMap.about;

  const navLinks: { id: ProductionPageType; labelBn: string; labelEn: string; icon: React.ElementType }[] = [
    { id: 'about', labelBn: 'আমাদের সম্পর্কে', labelEn: 'About Us', icon: Users },
    { id: 'contact', labelBn: 'যোগাযোগ ও হেল্প', labelEn: 'Contact & Help', icon: MessageSquare },
    { id: 'terms', labelBn: 'শর্তাবলী (Terms)', labelEn: 'Terms of Service', icon: Scale },
    { id: 'privacy', labelBn: 'প্রাইভেসি পলিসি', labelEn: 'Privacy Policy', icon: Lock },
    { id: 'refund', labelBn: 'রিফান্ড পলিসি', labelEn: 'Refund Policy', icon: RotateCcw }
  ];

  const helpCenterArticles = [
    {
      category: language === 'bn' ? 'পেমেন্ট ও ওয়ালেট' : 'Payments & Wallet',
      q:
        language === 'bn'
          ? 'ZiniPay দিয়ে বিকাশ বা নগদে ডিপোজিট করার পর ব্যালেন্স যোগ হতে কতক্ষণ লাগে?'
          : 'How long does ZiniPay bKash/Nagad auto deposit take to credit my wallet?',
      a:
        language === 'bn'
          ? 'পেমেন্ট সম্পন্ন করার সাথে সাথেই (১–৩ সেকেন্ডের মধ্যে) স্বয়ংক্রিয়ভাবে আপনার ওয়ালেটে মূল টাকা এবং ডিপোজিট বোনাস যুক্ত হয়ে যায়। কোনো কারণে ব্রাউজার বন্ধ হয়ে গেলে ওয়ালেট হিস্ট্রি থেকে "Verify" বাটনে ক্লিক করলেই ব্যালেন্স যুক্ত হয়ে যাবে।'
          : 'Deposits via ZiniPay (bKash, Nagad, Rocket, Upay) are verified and credited within 1–3 seconds automatically. If your browser closes mid-redirect, simply click "Verify" next to the invoice in your Wallet history.'
    },
    {
      category: language === 'bn' ? 'অর্ডার ও রিফান্ড' : 'Orders & Refunds',
      q:
        language === 'bn'
          ? 'কোনো অর্ডার Cancel বা Partial হলে টাকা কীভাবে ফেরত পাবো?'
          : 'How do I get my money back if an order is Canceled or Partial?',
      a:
        language === 'bn'
          ? 'আমাদের ৫-মিনিট ক্লাউড সিঙ্ক ইঞ্জিন আপস্ট্রিম প্রোভাইডার থেকে স্ট্যাটাস পাওয়ার সাথে সাথেই Cancel অর্ডারের ১০০% টাকা এবং Partial অর্ডারের অবশিষ্ট (Remains) অংশের টাকা স্বয়ংক্রিয়ভাবে আপনার ওয়ালেট ব্যালেন্সে রিফান্ড করে দেয়।'
          : 'Our 5-minute background sync engine automatically credits 100% of canceled orders and the exact pro-rata remaining balance of partial orders directly back to your wallet.'
    },
    {
      category: language === 'bn' ? 'ফেসবুক ও ইউটিউব মনিটাইজেশন' : 'Monetization Services',
      q:
        language === 'bn'
          ? 'ফেসবুক 60k Watchtime ও ইউটিউব 4000h Watchtime অর্ডারের আগে কী চেক করতে হবে?'
          : 'What should I check before ordering Facebook 60k or YouTube 4000h Watchtime?',
      a:
        language === 'bn'
          ? 'অর্ডার করার সময় অবশ্যই আপনার ফেসবুক পেজ বা ইউটিউব ভিডিও Public থাকতে হবে এবং ভিডিওর দৈর্ঘ্য সার্ভিস ডেসক্রিপশনে উল্লেখিত সময়ের (যেমন ১ ঘণ্টা বা তার বেশি) সমান হতে হবে।'
          : 'Ensure your Facebook Page/Profile or YouTube video is set to Public with no country/age restrictions, and matches the required video length mentioned in the service description.'
    },
    {
      category: language === 'bn' ? 'রিসেলার ও API v2' : 'Reseller & API v2',
      q:
        language === 'bn'
          ? 'আমি কি আমার নিজস্ব চাইল্ড প্যানেলে আপনাদের API সংযুক্ত করতে পারবো?'
          : 'Can I connect my own Child Panel or website to your REST API v2?',
      a:
        language === 'bn'
          ? 'হ্যাঁ! প্রোফাইল সেকশন থেকে আপনার API Key কপি করে `/api/v2` এন্ডপয়েন্টের মাধ্যমে যেকোনো স্ট্যান্ডার্ড SMM প্যানেল স্ক্রিপ্টের সাথে সংযুক্ত করতে পারবেন।'
          : 'Yes! Copy your live API key from Profile Settings and connect any standard SMM script to our `/api/v2` endpoint for automated services, order placement, status, and refills.'
    }
  ].filter(
    (item) =>
      !helpSearchQuery.trim() ||
      item.q.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(helpSearchQuery.toLowerCase())
  );

  return (
    <div
      className={
        standalone
          ? 'min-h-screen w-full bg-[#080B14] text-[#F1F5F9] font-sans selection:bg-[#8B5CF6] selection:text-white'
          : 'w-full space-y-6 pb-12'
      }
    >
      {/* Standalone Public Top Navigation Header */}
      {standalone && (
        <header className="sticky top-0 z-40 h-16 bg-[#080B14]/90 backdrop-blur-xl border-b border-white/[0.08]">
          <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('landing')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B5CF6] via-[#6D28D9] to-[#22D3EE] flex items-center justify-center text-white font-black text-xs shadow-lg shadow-[#8B5CF6]/25">
                AT
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                    {brandName}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#22D3EE]/15 text-[#22D3EE] font-mono text-[9px] font-bold">
                    BD
                  </span>
                </div>
                <p className="text-[10px] text-[#94A3B8] hidden sm:block">
                  {BD_MAIN_SEO_KEYWORD}
                </p>
              </div>
            </button>

            <nav aria-label="Public Page Navigation" className="hidden md:flex items-center gap-5 text-xs font-bold text-[#94A3B8]">
              <button type="button" onClick={() => onNavigateTab('landing')} className="hover:text-white transition-colors">
                {language === 'bn' ? 'হোম' : 'Home'}
              </button>
              <button type="button" onClick={() => onNavigateTab('services')} className="hover:text-white transition-colors">
                {language === 'bn' ? 'সার্ভিস ও রেট লিস্ট' : 'Services & Pricing'}
              </button>
              <button type="button" onClick={() => onNavigateTab('about')} className={page === 'about' ? 'text-[#22D3EE]' : 'hover:text-white transition-colors'}>
                {language === 'bn' ? 'আমাদের সম্পর্কে' : 'About'}
              </button>
              <button type="button" onClick={() => onNavigateTab('contact')} className={page === 'contact' ? 'text-[#22D3EE]' : 'hover:text-white transition-colors'}>
                {language === 'bn' ? 'যোগাযোগ ও সাপোর্ট' : 'Contact'}
              </button>
              <button type="button" onClick={() => onNavigateTab('refund')} className={page === 'refund' ? 'text-[#22D3EE]' : 'hover:text-white transition-colors'}>
                {language === 'bn' ? 'রিফান্ড পলিসি' : 'Refund Policy'}
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="px-2.5 py-1.5 rounded-xl bg-[#0D1220] border border-white/10 text-[11px] font-bold text-[#F1F5F9] hover:border-[#22D3EE]/40 transition-colors"
              >
                {language === 'bn' ? 'EN' : 'বাংলা'}
              </button>
              <button
                type="button"
                onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
                className="px-2.5 py-1.5 rounded-xl bg-[#0D1220] border border-white/10 text-[11px] font-mono font-bold text-[#22D3EE]"
              >
                {currency}
              </button>
              {user ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab('home')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-extrabold flex items-center gap-1.5"
                >
                  <span>{language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-extrabold"
                >
                  {language === 'bn' ? 'লগইন / জয়েন' : 'Sign In'}
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <div className={standalone ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8' : 'space-y-6'}>
        {/* Semantic SEO Breadcrumb & Quick Page Switcher Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/[0.07]">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <button
              type="button"
              onClick={() => onNavigateTab(user ? 'home' : 'landing')}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{language === 'bn' ? 'হোম' : 'Home'}</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-[#F1F5F9] font-bold">
              {language === 'bn' ? activeMeta.titleBn.split('—')[0].trim() : activeMeta.titleEn.split('—')[0].trim()}
            </span>
          </nav>

          {/* Horizontal Legal & Company Page Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = page === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/25'
                      : 'bg-[#0D1220] text-[#94A3B8] hover:text-white border border-white/[0.07]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? item.labelBn : item.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hero Semantic H1 Banner */}
        <header className="rounded-3xl bg-gradient-to-br from-[#141B2B] via-[#0D1220] to-[#080B14] border border-white/[0.09] p-6 sm:p-10 relative overflow-hidden">
          <div className="max-w-3xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest text-[#22D3EE]">
              <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>{activeMeta.badge}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {language === 'bn' ? activeMeta.titleBn : activeMeta.titleEn}
            </h1>
            <p className="text-xs sm:text-base text-[#94A3B8] leading-relaxed">
              {language === 'bn' ? activeMeta.subtitleBn : activeMeta.subtitleEn}
            </p>
          </div>
        </header>

        {/* =====================================================================
            PAGE 1: ABOUT US (100% SEO OPTIMIZED BILINGUAL)
           ===================================================================== */}
        {page === 'about' && (
          <article className="space-y-8">
            {/* Key Authority Metrics */}
            <section aria-label="Platform Live Authority Statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08]">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase">Active SMM Services</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-[#22D3EE] mt-1">
                  {activeServicesCount}+
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {language === 'bn' ? `${categoriesCount}টি সোশ্যাল ক্যাটাগরিতে সচল` : `Across ${categoriesCount}+ social categories`}
                </p>
              </div>
              <div className="p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08]">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase">ZiniPay Auto Deposit</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-[#22C55E] mt-1">
                  1–3 Sec
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {language === 'bn' ? 'বিকাশ, নগদ, রকেট ও উপায় ইনস্ট্যান্ট ক্রেডিট' : 'Instant bKash, Nagad, Rocket & Upay'}
                </p>
              </div>
              <div className="p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08]">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase">Cloud API v2 Sync</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-[#8B5CF6] mt-1">
                  Every 5m
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {language === 'bn' ? 'অটোমেটিক স্ট্যাটাস ও পার্শিয়াল রিফান্ড সিঙ্ক' : 'Automated status & partial refund sync'}
                </p>
              </div>
              <div className="p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08]">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase">Infrastructure SLA</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                  99.98%
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {language === 'bn' ? '২৪/৭ বাংলাদেশের সেরা আপটাইম গ্যারান্টি' : '24/7 high-availability cloud cluster'}
                </p>
              </div>
            </section>

            {/* Core Story & Bangladesh Market Focus */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-4">
                <span className="text-xs font-mono font-bold text-[#22D3EE] uppercase">
                  {language === 'bn' ? 'আমাদের লক্ষ্য ও প্রযুক্তি' : 'Our Mission & Engineering'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {language === 'bn'
                    ? 'কেন আমরা বাংলাদেশের সবচেয়ে নির্ভরযোগ্য ও সস্তা অটোমেটিক SMM Panel?'
                    : 'Why We Built Bangladesh’s Most Reliable Automated SMM Infrastructure'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? `${brandName} প্রতিষ্ঠিত হয়েছে বাংলাদেশের ডিজিটাল ক্রিয়েটর, ই-কমার্স উদ্যোক্তা, ফেসবুক ও ইউটিউব মনিটাইজেশন প্রত্যাশী এবং লোকাল এজেন্সিগুলোর জন্য আন্তর্জাতিক মানের সোশ্যাল মিডিয়া মার্কেটিং সার্ভিস সরাসরি বাংলাদেশি টাকায় (BDT) পৌঁছে দেওয়ার লক্ষ্যে। যেখানে সাধারণ প্যানেলে ম্যানুয়াল পেমেন্ট ভেরিফিকেশন ও অর্ডার প্রসেসিংয়ে ঘণ্টার পর ঘণ্টা অপেক্ষা করতে হয়, সেখানে আমাদের ZiniPay অটোমেটিক গেটওয়ে এবং মাল্টি-প্রোভাইডার API v2 ইঞ্জিন ১ সেকেন্ডে কাজ সম্পন্ন করে।`
                    : `${brandName} was engineered to solve the two biggest challenges faced by Bangladeshi creators and digital agencies: slow manual mobile-banking deposits and unreliable order tracking. By combining direct upstream provider aggregation with ZiniPay's 2-step automated bKash/Nagad checkout and a 5-minute background synchronization engine, we deliver wholesale BDT rates with zero manual waiting.`}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.06] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                      <span>{language === 'bn' ? 'ফেসবুক ও ইউটিউব মনিটাইজেশন স্পেশালিস্ট' : 'BD Monetization Specialists'}</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      {language === 'bn'
                        ? 'Facebook 60k Watchtime, Non-Drop Followers এবং YouTube 4000h Watchtime সার্ভিস।'
                        : 'Dedicated servers for Facebook 60k Watchtime, Non-Drop Followers & YouTube 4000h Watchtime.'}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.06] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
                      <span>{language === 'bn' ? '১০০% অটোমেটিক ওয়ালেট রিফান্ড' : '100% Automated Wallet Protection'}</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      {language === 'bn'
                        ? 'অর্ডার ক্যানসেল বা পার্শিয়াল হলে অটোমেটিক ওয়ালেটে টাকা ফেরত।'
                        : 'Instant atomic refunds for canceled or partial orders without opening tickets.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#141B2B] to-[#0D1220] border border-[#8B5CF6]/30 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold text-[#8B5CF6] uppercase">
                    {language === 'bn' ? 'মূল প্ল্যাটফর্ম সুবিধাসমূহ' : 'Core Platform Pillars'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {language === 'bn'
                      ? 'এজেন্সি ও রিসেলারদের জন্য কমপ্লিট অটোমেশন'
                      : 'Complete Automation for Creators & Resellers'}
                  </h3>
                  <ul className="space-y-3 text-xs text-[#94A3B8]">
                    <li className="flex items-start gap-2.5">
                      <Zap className="w-4 h-4 text-[#22D3EE] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">
                          {language === 'bn' ? 'ZiniPay অটোমেটিক গেটওয়ে:' : 'ZiniPay Automated Gateway:'}
                        </strong>{' '}
                        {language === 'bn'
                          ? 'বিকাশ, নগদ, রকেট ও উপায়ে পিন/ওটিপি ভেরিফাইড তাৎক্ষণিক ডিপোজিট।'
                          : 'Instant bKash, Nagad, Rocket & Upay checkout with zero manual TrxID wait.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Code2 className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">
                          {language === 'bn' ? 'হোলসেল REST API v2:' : 'Wholesale REST API v2:'}
                        </strong>{' '}
                        {language === 'bn'
                          ? 'চাইল্ড প্যানেল ও রিসেলারদের জন্য স্ট্যান্ডার্ড API এন্ডপয়েন্ট।'
                          : 'Standard /api/v2 endpoints for child panels and bulk resellers.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Award className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">
                          {language === 'bn' ? 'পাসওয়ার্ড ছাড়াই ১০০% নিরাপদ:' : 'Zero Social Password Required:'}
                        </strong>{' '}
                        {language === 'bn'
                          ? 'শুধুমাত্র পাবলিক প্রোফাইল বা পোস্ট লিংক দিয়ে অর্ডার সম্পন্ন হয়।'
                          : 'We only require public post or profile links—never your account password.'}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('services')}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-extrabold flex items-center gap-2"
                  >
                    <span>{language === 'bn' ? 'সার্ভিস রেট লিস্ট দেখুন' : 'Explore Services Catalog'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('contact')}
                    className="px-4 py-3 rounded-2xl bg-[#080B14] border border-white/10 text-xs font-bold text-[#F1F5F9] hover:border-[#22D3EE]/40"
                  >
                    {language === 'bn' ? 'সাপোর্ট টিমের সাথে কথা বলুন' : 'Contact Support'}
                  </button>
                </div>
              </div>
            </section>
          </article>
        )}

        {/* =====================================================================
            PAGE 2: CONTACT US & 24/7 HELP CENTER (100% SEO OPTIMIZED BILINGUAL)
           ===================================================================== */}
        {page === 'contact' && (
          <article className="space-y-8">
            {/* 3 Direct Contact Channels */}
            <section aria-label="Direct Support Channels" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Live Ticket Desk */}
              <div className="p-6 rounded-3xl bg-[#0D1220] border border-white/[0.08] flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {language === 'bn' ? '২৪/৭ লাইভ সাপোর্ট টিকেট ডেস্ক' : '24/7 Live Support Ticket Desk'}
                  </h2>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {language === 'bn'
                      ? 'অর্ডার রিফিল, স্পিড আপ, ক্যানসেল অথবা পেমেন্ট সংক্রান্ত যেকোনো সমস্যার দ্রুত সমাধানের জন্য টিকেট ওপেন করুন। গড় রেসপন্স টাইম ১৫–৩০ মিনিট।'
                      : 'Open an official support ticket with your Order ID or Transaction ID for priority resolution by our technical desk (Avg. response: 15–30 mins).'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (user ? onNavigateTab('tickets') : onOpenAuth())}
                  className="w-full py-3 rounded-2xl bg-[#8B5CF6]/20 hover:bg-[#8B5CF6] text-[#22D3EE] hover:text-white border border-[#8B5CF6]/35 text-xs font-extrabold transition-all flex items-center justify-center gap-2"
                >
                  <span>{language === 'bn' ? 'সাপোর্ট টিকেট ওপেন করুন' : 'Open Support Ticket'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Official WhatsApp Helpline */}
              <div className="p-6 rounded-3xl bg-[#0D1220] border border-white/[0.08] flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {language === 'bn' ? 'হোয়াটসঅ্যাপ ইনস্ট্যান্ট হেল্পলাইন' : 'Official WhatsApp Helpline BD'}
                  </h2>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {language === 'bn'
                      ? 'জরুরি পেমেন্ট সহায়তা, এজেন্সি ডিসকাউন্ট বা মনিটাইজেশন প্যাকেজ সম্পর্কে সরাসরি আমাদের হোয়াটসঅ্যাপ সাপোর্টে মেসেজ দিন।'
                      : 'Chat directly with our Bangladesh customer care team on WhatsApp for wholesale agency rates, monetization packages, or urgent billing help.'}
                  </p>
                </div>
                <a
                  href={siteSettings.whatsappUrl || 'https://wa.me/8801700000000'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-[#22C55E]/15 hover:bg-[#22C55E] text-[#22C55E] hover:text-slate-950 border border-[#22C55E]/35 text-xs font-extrabold transition-all flex items-center justify-center gap-2"
                >
                  <span>{language === 'bn' ? 'হোয়াটসঅ্যাপে মেসেজ দিন' : 'Chat on WhatsApp'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Official Telegram Support */}
              <div className="p-6 rounded-3xl bg-[#0D1220] border border-white/[0.08] flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE]">
                    <Send className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {language === 'bn' ? 'টেলিগ্রাম আপডেট ও রিসেলার চ্যানেল' : 'Telegram Channel & API Support'}
                  </h2>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {language === 'bn'
                      ? 'নতুন সার্ভিস আপডেট, প্রোমো ভাউচার কোড এবং চাইল্ড প্যানেল API সাপোর্টের জন্য আমাদের অফিশিয়াল টেলিগ্রামে যুক্ত থাকুন।'
                      : 'Join our official Telegram channel for daily service price drops, free BDT voucher codes, and API v2 reseller support.'}
                  </p>
                </div>
                <a
                  href={siteSettings.telegramUrl || 'https://t.me/amartrendsmm'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-[#22D3EE]/15 hover:bg-[#22D3EE] text-[#22D3EE] hover:text-slate-950 border border-[#22D3EE]/35 text-xs font-extrabold transition-all flex items-center justify-center gap-2"
                >
                  <span>{language === 'bn' ? 'টেলিগ্রামে যুক্ত হোন' : 'Join Official Telegram'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </section>

            {/* Quick Ticket Dispatcher + Interactive Help Center FAQ */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 5 Cols: Direct Ticket Submission Form */}
              <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-4">
                <div>
                  <span className="text-[11px] font-mono text-[#22D3EE] uppercase font-bold">
                    Direct Helpdesk Dispatch
                  </span>
                  <h2 className="text-lg font-black text-white mt-0.5">
                    {language === 'bn' ? 'সরাসরি সাপোর্ট মেসেজ পাঠান' : 'Submit a Support Request'}
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {language === 'bn'
                      ? 'আপনার অর্ডার বা ওয়ালেট সংক্রান্ত যেকোনো প্রশ্ন নিচে লিখে সাবমিট করুন।'
                      : 'Send a ticket directly to our admin engineering team.'}
                  </p>
                </div>

                <form onSubmit={handleQuickTicketSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                      {language === 'bn' ? 'সাপোর্ট ডিপার্টমেন্ট' : 'Support Department'}
                    </label>
                    <select
                      value={ticketDept}
                      onChange={(e) => setTicketDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B14] border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                    >
                      <option value="Order & Refill Support">Order Delivery, Refill & Cancel</option>
                      <option value="ZiniPay bKash/Nagad Deposit">ZiniPay bKash / Nagad Wallet Deposit</option>
                      <option value="Monetization Package Help">Facebook 60k / YouTube 4000h Monetization</option>
                      <option value="API v2 & Child Panel">Reseller API v2 & Child Panel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                      {language === 'bn' ? 'বিষয় (Subject)' : 'Subject'}
                    </label>
                    <input
                      type="text"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder={
                        language === 'bn'
                          ? 'যেমন: অর্ডার রিফিল অথবা পেমেন্ট ভেরিফিকেশন'
                          : 'e.g., Order refill request or API inquiry'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B14] border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                      {language === 'bn' ? 'অর্ডার আইডি বা ট্রানজেকশন আইডি (ঐচ্ছিক)' : 'Order ID or TrxID (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={ticketOrderId}
                      onChange={(e) => setTicketOrderId(e.target.value)}
                      placeholder="e.g., ORD-48291 or 9HG76KL2"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B14] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                      {language === 'bn' ? 'বিস্তারিত বার্তা' : 'Detailed Message'}
                    </label>
                    <textarea
                      rows={4}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder={
                        language === 'bn'
                          ? 'আপনার সমস্যাটি বিস্তারিত লিখুন...'
                          : 'Describe how our team can help you...'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B14] border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/25 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {submittingTicket
                        ? language === 'bn'
                          ? 'সাবমিট হচ্ছে...'
                          : 'Submitting...'
                        : user
                        ? language === 'bn'
                          ? 'সাপোর্ট টিকেট সাবমিট করুন'
                          : 'Submit Support Ticket'
                        : language === 'bn'
                        ? 'লগইন করে টিকেট সাবমিট করুন'
                        : 'Sign In to Submit Ticket'}
                    </span>
                  </button>
                </form>
              </div>

              {/* Right 7 Cols: Searchable Help Center Knowledge Base */}
              <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-mono text-[#8B5CF6] uppercase font-bold">
                      Instant Knowledge Base
                    </span>
                    <h2 className="text-lg font-black text-white mt-0.5">
                      {language === 'bn' ? 'হেল্প সেন্টার ও তাৎক্ষণিক সমাধান' : 'Help Center & Instant Answers'}
                    </h2>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={helpSearchQuery}
                      onChange={(e) => setHelpSearchQuery(e.target.value)}
                      placeholder={language === 'bn' ? 'প্রশ্ন খুঁজুন...' : 'Search help articles...'}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#080B14] border border-white/10 text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {helpCenterArticles.map((art, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.07] space-y-1.5"
                    >
                      <span className="text-[10px] font-mono font-bold text-[#22D3EE] uppercase">
                        {art.category}
                      </span>
                      <h3 className="text-xs sm:text-sm font-extrabold text-white">{art.q}</h3>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{art.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </article>
        )}

        {/* =====================================================================
            PAGE 3: TERMS OF SERVICE (100% SEO OPTIMIZED BILINGUAL)
           ===================================================================== */}
        {page === 'terms' && (
          <article className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-4 p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08] h-fit space-y-3">
              <div className="text-xs font-mono font-bold text-[#22D3EE] uppercase">
                {language === 'bn' ? 'সূচিপত্র (Table of Contents)' : 'Table of Contents'}
              </div>
              <ul className="space-y-2 text-xs text-[#94A3B8]">
                <li>1. {language === 'bn' ? 'সাধারণ শর্তাবলী ও গ্রহণযোগ্যতা' : 'General Service Agreement'}</li>
                <li>2. {language === 'bn' ? 'অর্ডার ও পাবলিক লিংক নিয়মাবলী' : 'Order & Public Link Rules'}</li>
                <li>3. {language === 'bn' ? 'ZiniPay বিকাশ/নগদ ওয়ালেট ডিপোজিট' : 'ZiniPay Wallet Deposit Policy'}</li>
                <li>4. {language === 'bn' ? 'ডেলিভারি সময় ও স্টার্ট কাউন্ট' : 'Delivery Speed & Start Count'}</li>
                <li>5. {language === 'bn' ? 'REST API v2 ও রিসেলার শর্তাবলী' : 'REST API v2 & Reseller Terms'}</li>
                <li>6. {language === 'bn' ? 'নিষিদ্ধ কার্যক্রম ও অ্যাকাউন্ট সুরক্ষা' : 'Prohibited Conduct & Security'}</li>
              </ul>
              <div className="pt-3 border-t border-white/[0.07] text-[11px] text-[#94A3B8]">
                {language === 'bn' ? 'সর্বশেষ আপডেট: অক্টোবর ২০২৬' : 'Last Updated: October 2026'}
              </div>
            </aside>

            <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-6">
              <section className="space-y-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {language === 'bn'
                    ? '১. সাধারণ শর্তাবলী ও গ্রহণযোগ্যতা (General Service Agreement)'
                    : '1. General Service Agreement & Acceptance'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? `${brandName}-এ অ্যাকাউন্ট তৈরি বা অর্ডার প্লেস করার মাধ্যমে আপনি আমাদের সকল শর্তাবলী মেনে নিচ্ছেন। আমাদের প্ল্যাটফর্ম শুধুমাত্র সোশ্যাল মিডিয়া প্রমোশন, ব্র্যান্ড ভিজিবিলিটি এবং কন্টেন্ট মনিটাইজেশন সহায়তার জন্য ডিজাইন করা হয়েছে।`
                    : `By registering an account or placing an order on ${brandName}, you agree to abide by these Terms of Service. Our platform provides automated social media marketing, creator monetization growth, and API v2 order fulfillment.`}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {language === 'bn'
                    ? '২. অর্ডার প্লেসমেন্ট ও পাবলিক লিংক নিয়মাবলী (Public Link Requirements)'
                    : '2. Order Placement & Public Profile/Link Requirements'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? 'যেকোনো অর্ডার দেওয়ার পূর্বে নিশ্চিত করুন যে আপনার ফেসবুক পেজ/প্রোফাইল, ইউটিউব চ্যানেল, টিকটক বা ইনস্টাগ্রাম পোস্ট সম্পূর্ণ Public রয়েছে। অর্ডার চলাকালীন ইউজারনেম পরিবর্তন করলে, প্রোফাইল Private করলে অথবা একই লিংকে একসাথে একাধিক সার্ভার থেকে অর্ডার করলে সিস্টেম স্টার্ট কাউন্ট ট্র্যাক করতে ব্যর্থ হতে পারে।'
                    : 'Before submitting any order, ensure your target profile, page, or video link is 100% Public. Changing usernames, making an account private, or placing simultaneous orders on the exact same link from multiple panels while an order is in progress voids refill or refund eligibility.'}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {language === 'bn'
                    ? '৩. ZiniPay বিকাশ ও নগদ ওয়ালেট ডিপোজিট (Wallet & Payment Rules)'
                    : '3. ZiniPay Automated Wallet Deposits (bKash, Nagad, Rocket, Upay)'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? 'আমাদের ওয়ালেট সেকশনে ZiniPay পেমেন্ট গেটওয়ের মাধ্যমে বিকাশ, নগদ, রকেট ও উপায়ে অটোমেটিক ডিপোজিট করা যায়। ওয়ালেটে যুক্ত হওয়া ব্যালেন্স শুধুমাত্র প্ল্যাটফর্মের ভেতরে সার্ভিস অর্ডারের জন্য ব্যবহারযোগ্য। কোনো অর্ডার ক্যানসেল হলে তার টাকা পুনরায় ওয়ালেটে রিফান্ড হয়।'
                    : 'All deposits processed through ZiniPay (bKash, Nagad, Rocket, Upay) are credited immediately to your platform wallet in BDT. Wallet balances are used exclusively for ordering services or API v2 dispatches on the platform.'}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {language === 'bn'
                    ? '৪. ডেলিভারি সময়সীমা ও ৫-মিনিট ক্লাউড সিঙ্ক (Delivery & Sync)'
                    : '4. Delivery Timelines & 5-Minute Automated Cloud Sync'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? 'প্রতিটি সার্ভিসে উল্লেখিত গড় সময় (Average Time) সাম্প্রতিক ডেলিভারির ওপর ভিত্তি করে দেখানো হয়। আমাদের ব্যাকএন্ড প্রতি ৫ মিনিটে আপস্ট্রিম সার্ভারের সাথে সিঙ্ক করে স্টার্ট কাউন্ট ও রিমেইনস আপডেট করে।'
                    : 'Estimated delivery times displayed on each service reflect real-time averages from recent completions. Our cloud router synchronizes order statuses, start counts, and remains every 5 minutes.'}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {language === 'bn'
                    ? '৫. REST API v2 ও রিসেলার শর্তাবলী (Reseller API Rules)'
                    : '5. REST API v2 & Child Panel Reseller Terms'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? 'রিসেলারগণ তাদের API Key গোপন রাখতে বাধ্য। API Key শেয়ার করার কারণে অনাকাঙ্ক্ষিত অর্ডার হলে ব্যবহারকারী নিজেই দায়ী থাকবেন। প্রোফাইল সেটিংস থেকে যেকোনো সময় API Key পরিবর্তন করা যায়।'
                    : 'Resellers connecting via `/api/v2` are responsible for keeping their API key confidential. You may regenerate your API key at any time from Profile & Security settings.'}
                </p>
              </section>
            </div>
          </article>
        )}

        {/* =====================================================================
            PAGE 4: PRIVACY POLICY (100% SEO OPTIMIZED BILINGUAL)
           ===================================================================== */}
        {page === 'privacy' && (
          <article className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-2">
                <Lock className="w-5 h-5 text-[#22C55E]" />
                <h2 className="text-sm font-black text-white">
                  {language === 'bn' ? 'কোনো পাসওয়ার্ড প্রয়োজন নেই' : 'Zero Social Password Policy'}
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  {language === 'bn'
                    ? 'আমরা কখনোই আপনার ফেসবুক, ইউটিউব বা টিকটক অ্যাকাউন্টের পাসওয়ার্ড বা অ্যাডমিন অ্যাক্সেস চাই না।'
                    : 'We never ask for your Facebook, YouTube, TikTok, or Instagram login credentials—only public URLs.'}
                </p>
              </div>
              <div className="p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-2">
                <ShieldCheck className="w-5 h-5 text-[#22D3EE]" />
                <h2 className="text-sm font-black text-white">
                  {language === 'bn' ? 'ZiniPay এনক্রিপ্টেড পেমেন্ট' : 'Encrypted ZiniPay Checkout'}
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  {language === 'bn'
                    ? 'আপনার বিকাশ বা নগদ পিন সরাসরি ZiniPay অফিশিয়াল গেটওয়েতে প্রসেস হয়; আমাদের সার্ভারে সংরক্ষিত হয় না।'
                    : 'All bKash/Nagad payments are processed over TLS encryption directly on ZiniPay’s secure gateway.'}
                </p>
              </div>
              <div className="p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-2">
                <Server className="w-5 h-5 text-[#8B5CF6]" />
                <h2 className="text-sm font-black text-white">
                  {language === 'bn' ? 'ক্লাউড ডাটা গোপনীয়তা' : 'Strict Client Anonymity'}
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  {language === 'bn'
                    ? 'আপনার অর্ডারকৃত পেজ বা চ্যানেলের লিংক কখনোই তৃতীয় পক্ষের কাছে প্রকাশ বা মার্কেটিংয়ে ব্যবহার করা হয় না।'
                    : 'Your submitted client links and campaign histories remain 100% confidential for agencies and resellers.'}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-6">
              <section className="space-y-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {language === 'bn'
                    ? '১. আমরা কী কী তথ্য সংগ্রহ করি (Information We Collect)'
                    : '1. Information We Collect & How It Is Used'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? 'অ্যাকাউন্ট রেজিস্ট্রেশন ও অর্ডার পরিচালনার জন্য আমরা শুধুমাত্র আপনার নাম, ইমেইল অ্যাড্রেস, অর্ডার লিংক এবং ZiniPay পেমেন্ট ইনভয়েস/ট্রানজেকশন আইডি সংরক্ষণ করি। এই তথ্য শুধুমাত্র অর্ডার ট্র্যাকিং, অটোমেটিক রিফান্ড এবং কাস্টমার সাপোর্টের কাজে ব্যবহৃত হয়।'
                    : 'We collect only the minimum information required to operate your workspace: your email address, display name, submitted public order URLs, and ZiniPay payment transaction references for automated wallet auditing.'}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {language === 'bn'
                    ? '২. পেমেন্ট ও ওয়ালেট ডাটা সুরক্ষা (Payment Security)'
                    : '2. Payment Gateway & Financial Data Protection'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? 'আপনি যখন ওয়ালেট থেকে ডিপোজিট করেন, তখন সরাসরি ZiniPay সিকিউর চেকআউট পেজে রিডাইরেক্ট হয়। আমাদের ডাটাবেসে শুধুমাত্র পেমেন্ট স্ট্যাটাস, টাকার পরিমাণ এবং ট্রানজেকশন আইডি রেকর্ড থাকে।'
                    : 'When you top up your wallet, your payment session is handled directly by ZiniPay’s encrypted gateway. We store only the invoice ID, transaction ID, sender reference, and BDT amount to credit your balance.'}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {language === 'bn'
                    ? '৩. কুকিজ ও সেশন স্টোরেজ (Cookies & Local Storage)'
                    : '3. Cookies, Authentication Tokens & Preferences'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? 'আপনার লগইন সেশন সচল রাখতে এবং ভাষা (বাংলা/ইংরেজি) ও কারেন্সি (BDT/USD) পছন্দ মনে রাখতে আমরা সিকিউর ব্রাউজার স্টোরেজ ব্যবহার করি।'
                    : 'We use essential authentication tokens and local preferences to keep you signed in and remember your preferred language (Bengali/English) and currency (BDT/USD).'}
                </p>
              </section>
            </div>
          </article>
        )}

        {/* =====================================================================
            PAGE 5: REFUND & CANCELLATION POLICY (100% SEO OPTIMIZED BILINGUAL)
           ===================================================================== */}
        {page === 'refund' && (
          <article className="space-y-8">
            {/* Interactive Partial & Cancel Refund Simulator */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-5">
                <span className="text-xs font-mono font-bold text-[#22C55E] uppercase">
                  Automated Atomic Wallet Refund Engine
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {language === 'bn'
                    ? 'অর্ডার Cancel বা Partial হলে কীভাবে অটোমেটিক রিফান্ড কাজ করে?'
                    : 'How Our 100% Automated Cancel & Partial Refund System Works'}
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {language === 'bn'
                    ? 'আমাদের প্ল্যাটফর্মে কোনো অর্ডার ডেলিভারি না হলে আপনার ১ টাকাও নষ্ট হওয়ার সুযোগ নেই। আমাদের সার্ভার প্রতি ৫ মিনিটে প্রোভাইডার স্ট্যাটাস চেক করে এবং নিচের নিয়ম অনুযায়ী স্বয়ংক্রিয়ভাবে আপনার ওয়ালেটে টাকা ফেরত দেয়:'
                    : 'Your wallet balance is protected by atomic Firestore transactions. Whenever an upstream provider marks an order as Canceled or Partial, our 5-minute sync engine automatically calculates and credits your refund:'}
                </p>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.07] flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 text-[#22C55E] flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      100%
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-white">
                        {language === 'bn'
                          ? '১. সম্পূর্ণ ক্যানসেল অর্ডার (Canceled Order — 100% Refund)'
                          : '1. Canceled Orders — 100% Full Wallet Refund'}
                      </h3>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {language === 'bn'
                          ? 'যদি কোনো কারণে লিংক ভুল হওয়া বা সার্ভার মেইনটেন্যান্সের কারণে অর্ডারটি Canceled হয়, তবে অর্ডারের সম্পূর্ণ টাকা (১০০%) সাথে সাথে আপনার ওয়ালেট ব্যালেন্সে যোগ হয়ে যাবে।'
                          : 'If an order cannot be fulfilled and is marked Canceled, 100% of the BDT charge is immediately returned to your available wallet balance.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.07] flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      PRO
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-white">
                        {language === 'bn'
                          ? '২. পার্শিয়াল অর্ডার (Partial Order — আনুপাতিক রিফান্ড)'
                          : '2. Partial Orders — Exact Pro-Rata Remaining Refund'}
                      </h3>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {language === 'bn'
                          ? 'ধরুন আপনি ১০,০০০ ফলোয়ার অর্ডার করেছেন এবং ৬,৫০০ ডেলিভারি হওয়ার পর অর্ডারটি Partial হয়েছে। সেক্ষেত্রে বাকি ৩,৫০০ ফলোয়ারের সম্পূর্ণ টাকা স্বয়ংক্রিয়ভাবে আপনার ওয়ালেটে রিফান্ড হয়ে যাবে।'
                          : 'If an order partially delivers (e.g., 6,500 delivered out of 10,000 ordered), you only pay for what was delivered. The remaining 3,500 units are automatically refunded to your wallet.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.07] flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      RFL
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-white">
                        {language === 'bn'
                          ? '৩. নন-ড্রপ ও ফ্রি রিফিল গ্যারান্টি (Refill Guarantee)'
                          : '3. Free Refill Guarantee on Refill-Enabled Services'}
                      </h3>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {language === 'bn'
                          ? 'যেসব সার্ভিসে "Refill" ব্যাজ রয়েছে, সেগুলোতে গ্যারান্টি পিরিয়ডের মধ্যে ড্রপ হলে অর্ডার পেজ থেকে ১ ক্লিকেই ফ্রি রিফিল রিকোয়েস্ট করা যায়।'
                          : 'Services tagged with a Refill badge include free automatic replacement if any drop occurs within the service guarantee period.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Interactive Pro-Rata Partial Refund Calculator */}
              <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#141B2B] to-[#0D1220] border border-[#22D3EE]/30 space-y-5 h-fit">
                <div>
                  <span className="text-[11px] font-mono text-[#22D3EE] uppercase font-bold">
                    Interactive Transparency Tool
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    {language === 'bn' ? 'পার্শিয়াল রিফান্ড ক্যালকুলেটর' : 'Partial Refund Calculator'}
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {language === 'bn'
                      ? 'আমাদের সিস্টেম কীভাবে আনুপাতিক রিফান্ড হিসাব করে তা নিচে টেস্ট করে দেখুন:'
                      : 'See the exact mathematical formula our server uses for partial order refunds:'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                      {language === 'bn' ? 'মোট অর্ডারের মূল্য (Total Order Charge BDT)' : 'Total Order Charge (BDT)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={sampleOrderCharge}
                      onChange={(e) => setSampleOrderCharge(Math.max(1, Number(e.target.value) || 0))}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/10 font-mono text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                        {language === 'bn' ? 'মোট পরিমাণ (Quantity)' : 'Ordered Quantity'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={sampleOrderQty}
                        onChange={(e) => setSampleOrderQty(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/10 font-mono text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                        {language === 'bn' ? 'বাকি অংশ (Remains)' : 'Undelivered Remains'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={sampleOrderQty}
                        value={sampleRemainsQty}
                        onChange={(e) => setSampleRemainsQty(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/10 font-mono text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#080B14] border border-[#22C55E]/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>{language === 'bn' ? 'ডেলিভারি সম্পন্ন হয়েছে:' : 'Delivered Quantity:'}</span>
                    <span className="font-mono font-bold text-white">
                      {Math.max(0, sampleOrderQty - sampleRemainsQty).toLocaleString()} units
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>{language === 'bn' ? 'অটোমেটিক ওয়ালেট রিফান্ড:' : 'Automatic Wallet Refund:'}</span>
                    <span className="text-lg font-black font-mono text-[#22C55E]">
                      {formatPrice(calculatedPartialRefund)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </article>
        )}

        {/* =====================================================================
            PAGE 6: 404 NOT FOUND SMART RECOVERY HUB
           ===================================================================== */}
        {page === '404' && (
          <article className="p-6 sm:p-10 rounded-3xl bg-[#0D1220] border border-white/[0.08] text-center max-w-3xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {language === 'bn'
                  ? 'আপনি কি কোনো নির্দিষ্ট SMM সার্ভিস খুঁজছেন?'
                  : 'Looking for a Specific SMM Service or Tool?'}
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                {language === 'bn'
                  ? 'নিচে আপনার কাঙ্ক্ষিত সার্ভিসের নাম লিখুন অথবা কুইক বাটন থেকে মূল পেজে ফিরে যান।'
                  : 'Search our live Bangladesh service catalog directly below or jump to a core module.'}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onNavigateTab('services', { searchQuery: recoverySearch });
              }}
              className="flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recoverySearch}
                  onChange={(e) => setRecoverySearch(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'যেমন: Facebook 60k Watchtime, YouTube Subscribers...'
                      : 'Search Facebook Followers, 60k Watchtime, TikTok Views...'
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#080B14] border border-white/10 text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-extrabold"
              >
                {language === 'bn' ? 'সার্ভিস খুঁজুন' : 'Search Catalog'}
              </button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab(user ? 'home' : 'landing')}
                className="p-3.5 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-white/[0.07] text-xs font-bold text-white flex flex-col items-center gap-1.5"
              >
                <Home className="w-4 h-4 text-[#22D3EE]" />
                <span>{language === 'bn' ? 'হোম পেজ' : 'Home Page'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('services')}
                className="p-3.5 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-white/[0.07] text-xs font-bold text-white flex flex-col items-center gap-1.5"
              >
                <Layers className="w-4 h-4 text-[#8B5CF6]" />
                <span>{language === 'bn' ? 'সার্ভিস ক্যাটালগ' : 'Services Catalog'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('track-order')}
                className="p-3.5 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-white/[0.07] text-xs font-bold text-white flex flex-col items-center gap-1.5"
              >
                <Clock className="w-4 h-4 text-[#22C55E]" />
                <span>{language === 'bn' ? 'অর্ডার ট্র্যাকার' : 'Order Tracker'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('contact')}
                className="p-3.5 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-white/[0.07] text-xs font-bold text-white flex flex-col items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>{language === 'bn' ? 'হেল্প সেন্টার' : 'Help Center'}</span>
              </button>
            </div>
          </article>
        )}

        {/* =====================================================================
            PAGE 7: MAINTENANCE MODE SCREEN
           ===================================================================== */}
        {page === 'maintenance' && (
          <article className="p-6 sm:p-10 rounded-3xl bg-[#0D1220] border border-amber-500/30 text-center max-w-3xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Wrench className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[11px] font-bold">
                SYSTEM UPGRADE IN PROGRESS
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
                {language === 'bn'
                  ? 'আপনার পূর্ববর্তী সকল অর্ডার এবং ওয়ালেট ব্যালেন্স ১০০% নিরাপদ রয়েছে'
                  : 'All Active Orders & Wallet Balances Remain 100% Safe'}
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed max-w-xl mx-auto">
                {language === 'bn'
                  ? 'আমাদের ব্যাকএন্ড ৫-মিনিট ক্লাউড সিঙ্ক ইঞ্জিন মেইনটেন্যান্স চলাকালীন সময়েও স্বয়ংক্রিয়ভাবে চলমান অর্ডারগুলো প্রসেস করছে। জরুরি প্রয়োজনে আমাদের হোয়াটসঅ্যাপ বা টেলিগ্রামে যোগাযোগ করুন।'
                  : 'Our background synchronization engine continues processing in-progress orders automatically during this maintenance window. For urgent assistance, reach us via WhatsApp or Telegram below.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={siteSettings.whatsappUrl || 'https://wa.me/8801700000000'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-[#22C55E]/15 hover:bg-[#22C55E] text-[#22C55E] hover:text-slate-950 border border-[#22C55E]/35 text-xs font-extrabold flex items-center gap-2 transition-all"
              >
                <span>{language === 'bn' ? 'হোয়াটসঅ্যাপ সাপোর্ট' : 'WhatsApp Support'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={siteSettings.telegramUrl || 'https://t.me/amartrendsmm'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-[#22D3EE]/15 hover:bg-[#22D3EE] text-[#22D3EE] hover:text-slate-950 border border-[#22D3EE]/35 text-xs font-extrabold flex items-center gap-2 transition-all"
              >
                <span>{language === 'bn' ? 'টেলিগ্রাম চ্যানেল' : 'Telegram Updates'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab('admin')}
                  className="px-5 py-3 rounded-2xl bg-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'bn' ? 'অ্যাডমিন প্যানেলে যান' : 'Open Admin Control Center'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-5 py-3 rounded-2xl bg-[#080B14] border border-white/10 text-xs font-bold text-[#94A3B8] hover:text-white"
                >
                  {language === 'bn' ? 'অ্যাডমিন লগইন' : 'Admin Sign In'}
                </button>
              )}
            </div>
          </article>
        )}

        {/* Crawlable Bangladesh SEO Internal Link & Keyword Cluster Footer Block */}
        <section
          aria-label="Bangladesh SMM Quick Links and SEO Keyword Directory"
          className="rounded-3xl bg-[#0D1220]/80 border border-white/[0.07] p-6 space-y-5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="space-y-2">
              <h3 className="font-extrabold text-white uppercase tracking-wider text-[11px] font-mono">
                {language === 'bn' ? 'প্ল্যাটফর্ম ও কোম্পানি' : 'Company & Info'}
              </h3>
              <ul className="space-y-1.5 text-[#94A3B8]">
                <li>
                  <button type="button" onClick={() => onNavigateTab('about')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'আমাদের সম্পর্কে (About Us)' : 'About Us'}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigateTab('contact')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'যোগাযোগ ও হেল্প সেন্টার' : 'Contact & Help Center'}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigateTab('services')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'লাইভ সার্ভিস ও রেট লিস্ট' : 'Services & BDT Price List'}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigateTab('api-docs')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'ডেভেলপার REST API v2' : 'Developer API v2 Docs'}
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-white uppercase tracking-wider text-[11px] font-mono">
                {language === 'bn' ? 'লিগ্যাল ও গ্যারান্টি' : 'Legal & Policies'}
              </h3>
              <ul className="space-y-1.5 text-[#94A3B8]">
                <li>
                  <button type="button" onClick={() => onNavigateTab('terms')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'ব্যবহারের শর্তাবলী (Terms)' : 'Terms of Service'}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigateTab('privacy')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'গোপনীয়তা নীতি (Privacy)' : 'Privacy Policy'}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigateTab('refund')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'অটোমেটিক রিফান্ড পলিসি' : 'Refund & Refill Policy'}
                  </button>
                </li>
                <li>
                  <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-[#22D3EE]">
                    XML Sitemap (Google BD)
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-white uppercase tracking-wider text-[11px] font-mono">
                {language === 'bn' ? 'জনপ্রিয় ক্যাটাগরি (BD)' : 'Top BD Categories'}
              </h3>
              <ul className="space-y-1.5 text-[#94A3B8]">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('services', { category: 'Facebook' })}
                    className="hover:text-[#22D3EE]"
                  >
                    Facebook Page Monetization BD
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('services', { category: 'YouTube' })}
                    className="hover:text-[#22D3EE]"
                  >
                    YouTube 4000h Watchtime BD
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('services', { category: 'TikTok' })}
                    className="hover:text-[#22D3EE]"
                  >
                    TikTok Views & Followers BD
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('services', { category: 'Instagram' })}
                    className="hover:text-[#22D3EE]"
                  >
                    Instagram Reels & Followers BD
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-white uppercase tracking-wider text-[11px] font-mono">
                {language === 'bn' ? 'পেমেন্ট ও টুলস' : 'Wallet & Tools'}
              </h3>
              <ul className="space-y-1.5 text-[#94A3B8]">
                <li>
                  <button type="button" onClick={() => onNavigateTab('add-funds')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'বিকাশ ও নগদ অটো ডিপোজিট' : 'bKash & Nagad Auto Deposit'}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigateTab('track-order')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'লাইভ অর্ডার ট্র্যাকার' : 'Live Order Tracker'}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigateTab('affiliates')} className="hover:text-[#22D3EE]">
                    {language === 'bn' ? 'অ্যাফিলিয়েট ও প্রোমো ভাউচার' : 'Affiliates & Promo Vouchers'}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] text-[11px] text-[#94A3B8] leading-relaxed">
            {[BD_MAIN_SEO_KEYWORD, ...BD_SUB_SEO_KEYWORDS.slice(0, 8)].map((kw, idx, arr) => (
              <React.Fragment key={kw}>
                <button
                  type="button"
                  onClick={() => onNavigateTab('services')}
                  className="hover:text-white transition-colors inline"
                >
                  {kw}
                </button>
                {idx < arr.length - 1 && <span className="mx-2 text-slate-600">·</span>}
              </React.Fragment>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
