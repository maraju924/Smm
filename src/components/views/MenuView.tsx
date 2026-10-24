import React from 'react';
import {
  User,
  Wallet,
  Layers,
  BarChart3,
  Clock,
  Sparkles,
  Gift,
  MessageSquare,
  Code2,
  ShieldCheck,
  Globe,
  LogOut,
  ChevronRight,
  Zap,
  Package,
  BookOpen
} from 'lucide-react';
import { SiteSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface MenuViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenAuth: () => void;
  siteSettings?: SiteSettings;
}

export const MenuView: React.FC<MenuViewProps> = ({
  onNavigateTab,
  onOpenAuth
}) => {
  const {
    user,
    profile,
    isAdmin,
    logout,
    currency,
    setCurrency,
    language,
    setLanguage,
    formatPrice,
    t
  } = useAuth();

  const modules = [
    {
      id: 'analytics',
      label: t('অ্যানালিটিক্স ও খরচ রিপোর্ট', 'Analytics & Spending'),
      desc: t('অর্ডার ভলিউম, ক্যাটাগরি এবং খরচের চার্ট', 'Order volume, completion rate & category metrics'),
      icon: BarChart3,
      accent: 'text-[#22D3EE] bg-[#22D3EE]/10 border-[#22D3EE]/25'
    },
    {
      id: 'services',
      label: t('সার্ভিস ক্যাটালগ', 'Services Explorer'),
      desc: t('সকল প্ল্যাটফর্মের লাইভ রেট ও ফিল্টার', 'Search, compare, and bookmark live services'),
      icon: Layers,
      accent: 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/25'
    },
    {
      id: 'track-order',
      label: t('লাইভ অর্ডার ট্র্যাকার', 'Live Order Tracker'),
      desc: t('অর্ডার আইডি দিয়ে রিয়েল-টাইম অগ্রগতি দেখুন', 'Track delivery timeline by Order ID'),
      icon: Clock,
      accent: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/25'
    },
    {
      id: 'mass-order',
      label: t('ম্যাস অর্ডার (Bulk)', 'Mass Order Console'),
      desc: t('একসাথে একাধিক লিংকে বাল্ক অর্ডার সাবমিট করুন', 'Submit multiple orders simultaneously'),
      icon: Sparkles,
      accent: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/25'
    },
    {
      id: 'tickets',
      label: t('সাপোর্ট হেল্পডেস্ক', 'Support Helpdesk'),
      desc: t('যেকোনো সমস্যায় সরাসরি অ্যাডমিনের সাথে চ্যাট', 'Open a ticket for order or payment assistance'),
      icon: MessageSquare,
      accent: 'text-[#22D3EE] bg-[#22D3EE]/10 border-[#22D3EE]/25'
    },
    {
      id: 'affiliates',
      label: t('প্রোমো, রিওয়ার্ড ও অ্যাফিলিয়েট', 'Promo, Rewards & Affiliates'),
      desc: t('প্রোমো কোড, ডেইলি বোনাস এবং রেফারেল আয়', 'Redeem promo codes, daily rewards & invite friends'),
      icon: Gift,
      accent: 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/25'
    },
    {
      id: 'blog',
      label: t('ব্লগ ও এসএমএম গাইড', 'SMM Blog & Guides'),
      desc: t('ফেসবুক মনিটাইজেশন, টিকটক ও ইউটিউব গ্রোথ গাইড', 'Facebook monetization, TikTok & YouTube growth tutorials'),
      icon: BookOpen,
      accent: 'text-[#EC4899] bg-[#EC4899]/10 border-[#EC4899]/25'
    },
    {
      id: 'profile',
      label: t('প্রোফাইল ও সেটিংস', 'Profile & Settings'),
      desc: t('অ্যাকাউন্ট তথ্য, পাসওয়ার্ড এবং ভাষা সেটিংস', 'Manage account profile, password and preferences'),
      icon: User,
      accent: 'text-[#94A3B8] bg-white/[0.06] border-white/[0.12]'
    }
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* User Summary Banner */}
      <div className="rounded-3xl hybrid-glass-elevated p-5 border border-white/[0.08]">
        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-[#8B5CF6]/25">
                {(profile?.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">
                  {profile?.displayName || 'Boostlagbe Member'}
                </h2>
                <p className="text-xs text-[#94A3B8]">{user.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-mono text-xs font-bold text-[#22D3EE]">
                    {formatPrice(profile?.balance ?? 0)}
                  </span>
                  <span className="text-[#64748B]">•</span>
                  <button
                    onClick={() => onNavigateTab('add-funds')}
                    className="text-xs font-semibold text-[#8B5CF6] hover:underline"
                  >
                    + {t('ব্যালেন্স যোগ করুন', 'Add Funds')}
                  </button>
                </div>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => onNavigateTab('admin')}
                className="px-4 py-2.5 rounded-2xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/35 text-[#F1F5F9] text-xs font-bold flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
                {t('অ্যাডমিন কন্ট্রোল প্যানেল', 'Admin Control Panel')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#F1F5F9]">
                {t('আপনার অ্যাকাউন্টে লগইন করুন', 'Sign In to Your Account')}
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {t('অর্ডার ট্র্যাকিং, ওয়ালেট এবং প্রোমো বোনাস সুবিধা পেতে লগইন করুন', 'Access order tracking, wallet deposits, and promo rewards')}
              </p>
            </div>
            <button
              onClick={onOpenAuth}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-[#8B5CF6]/25"
            >
              {t('লগইন / রেজিস্টার', 'Sign In / Register')}
            </button>
          </div>
        )}
      </div>

      {/* Quick Language & Currency Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
          className="p-3.5 rounded-2xl bg-[#0D1220] border border-white/[0.07] flex items-center justify-between text-xs font-semibold text-[#F1F5F9]"
        >
          <span className="flex items-center gap-2 text-[#94A3B8]">
            <Globe className="w-4 h-4 text-[#22D3EE]" />
            {t('ভাষা', 'Language')}
          </span>
          <span className="font-bold text-[#F1F5F9]">{language === 'bn' ? 'বাংলা' : 'English'}</span>
        </button>

        <button
          onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
          className="p-3.5 rounded-2xl bg-[#0D1220] border border-white/[0.07] flex items-center justify-between text-xs font-semibold text-[#F1F5F9]"
        >
          <span className="flex items-center gap-2 text-[#94A3B8]">
            <Wallet className="w-4 h-4 text-[#8B5CF6]" />
            {t('কারেন্সি', 'Currency')}
          </span>
          <span className="font-mono font-bold text-[#22D3EE]">{currency}</span>
        </button>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => onNavigateTab(mod.id)}
              className="p-4 rounded-2xl bg-[#0D1220] hover:bg-[#141B2B] border border-white/[0.07] flex items-center justify-between gap-3 text-left transition-all group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${mod.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-[#F1F5F9] group-hover:text-[#22D3EE] transition-colors">
                    {mod.label}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">{mod.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-[#F1F5F9] shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Company, Help Center & Legal Policies Section */}
      <div className="rounded-3xl bg-[#0D1220] border border-white/[0.07] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#22D3EE]">
            {t('কোম্পানি, হেল্প সেন্টার ও পলিসি', 'Company, Help & Legal Policies')}
          </span>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-[#94A3B8] hover:text-white"
          >
            Sitemap.xml
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => onNavigateTab('about')}
            className="p-3 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-white/[0.06] text-[#F1F5F9] text-left transition-colors"
          >
            <span className="block text-[#22D3EE] text-[10px] font-mono">INFO</span>
            <span className="mt-0.5 block">{t('আমাদের সম্পর্কে', 'About Us')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('contact')}
            className="p-3 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-white/[0.06] text-[#F1F5F9] text-left transition-colors"
          >
            <span className="block text-[#8B5CF6] text-[10px] font-mono">24/7 HELP</span>
            <span className="mt-0.5 block">{t('যোগাযোগ ও সাপোর্ট', 'Contact & Help')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('refund')}
            className="p-3 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-white/[0.06] text-[#F1F5F9] text-left transition-colors"
          >
            <span className="block text-[#22C55E] text-[10px] font-mono">100% AUTO</span>
            <span className="mt-0.5 block">{t('রিফান্ড পলিসি', 'Refund Policy')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('terms')}
            className="p-3 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-white/[0.06] text-[#F1F5F9] text-left transition-colors"
          >
            <span className="block text-amber-400 text-[10px] font-mono">LEGAL</span>
            <span className="mt-0.5 block">{t('ব্যবহারের শর্তাবলী', 'Terms of Service')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('privacy')}
            className="p-3 rounded-2xl bg-[#080B14] hover:bg-[#141B2B] border border-white/[0.06] text-[#F1F5F9] text-left transition-colors col-span-2 sm:col-span-1"
          >
            <span className="block text-[#94A3B8] text-[10px] font-mono">SECURITY</span>
            <span className="mt-0.5 block">{t('প্রাইভেসি পলিসি', 'Privacy Policy')}</span>
          </button>
        </div>
      </div>

      {user && (
        <button
          onClick={logout}
          className="w-full py-3.5 rounded-2xl bg-[#F87171]/10 hover:bg-[#F87171]/20 border border-[#F87171]/25 text-[#F87171] font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('লগআউট করুন', 'Sign Out')}
        </button>
      )}
    </div>
  );
};
