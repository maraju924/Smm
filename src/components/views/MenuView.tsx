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
  ShieldCheck,
  Globe,
  LogOut,
  ChevronRight,
  BookOpen,
  Sun,
  Moon,
  Code2,
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
  onOpenAuth,
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
    darkMode,
    setDarkMode,
    formatPrice,
    t,
  } = useAuth();

  const modules = [
    {
      id: 'services',
      label: t('সার্ভিস ও পাইকারি রেট ক্যাটালগ', 'Services & Wholesale Rates'),
      desc: t('সকল প্ল্যাটফর্মের লাইভ রেট ও ফিল্টার', 'Search, compare, and order live services'),
      icon: Layers,
      accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'add-funds',
      label: t('বিকাশ / নগদ অটো ডিপোজিট', 'bKash & Nagad Wallet Top-Up'),
      desc: t('ZiniPay অটো পেমেন্ট ও ডিপোজিট হিস্ট্রি', 'Instant automated mobile banking deposit'),
      icon: Wallet,
      accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'track-order',
      label: t('লাইভ অর্ডার ট্র্যাকার', 'Live Order Tracker'),
      desc: t('অর্ডার আইডি দিয়ে রিয়েল-টাইম অগ্রগতি দেখুন', 'Track delivery timeline by Order ID'),
      icon: Clock,
      accent: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      id: 'mass-order',
      label: t('ম্যাস অর্ডার (Bulk Order)', 'Mass Order Console'),
      desc: t('একসাথে একাধিক লিংকে বাল্ক অর্ডার সাবমিট করুন', 'Submit multiple orders simultaneously'),
      icon: Sparkles,
      accent: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'analytics',
      label: t('অ্যানালিটিক্স ও খরচ রিপোর্ট', 'Analytics & Spending'),
      desc: t('অর্ডার ভলিউম, ক্যাটাগরি এবং খরচের চার্ট', 'Order volume, completion rate & category metrics'),
      icon: BarChart3,
      accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'affiliates',
      label: t('প্রোমো, রিওয়ার্ড ও রেফারেল', 'Promo, Rewards & Referrals'),
      desc: t('প্রোমো কোড, ডেইলি বোনাস এবং রেফারেল আয়', 'Redeem promo codes, daily rewards & invite friends'),
      icon: Gift,
      accent: 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20',
    },
    {
      id: 'tickets',
      label: t('সাপোর্ট হেল্পডেস্ক (২৪/৭)', '24/7 Support Helpdesk'),
      desc: t('যেকোনো সমস্যায় সরাসরি অ্যাডমিনের সাথে চ্যাট', 'Open a ticket for order or payment assistance'),
      icon: MessageSquare,
      accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'api-docs',
      label: t('রিসেলার REST API v2', 'Reseller REST API v2'),
      desc: t('এজেন্সি ও চাইল্ড প্যানেল কানেকশন ডকুমেন্টেশন', 'Connect your child panel or agency storefront'),
      icon: Code2,
      accent: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20',
    },
    {
      id: 'blog',
      label: t('ব্লগ ও এসএমএম গাইড', 'SMM Blog & Guides'),
      desc: t('ফেসবুক মনিটাইজেশন, টিকটক ও ইউটিউব গ্রোথ গাইড', 'Facebook monetization, TikTok & YouTube growth tutorials'),
      icon: BookOpen,
      accent: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'profile',
      label: t('প্রোফাইল ও সেটিংস', 'Profile & Settings'),
      desc: t('অ্যাকাউন্ট তথ্য, পাসওয়ার্ড এবং API Key সেটিংস', 'Manage account profile, password and API keys'),
      icon: User,
      accent: 'text-slate-600 dark:text-slate-300 bg-slate-500/10 border-slate-500/20',
    },
  ];

  const cardSurface = darkMode
    ? 'bg-slate-900 border border-slate-800 text-slate-100'
    : 'bg-white border border-slate-200 text-slate-900 shadow-xs';
  const subtleSurface = darkMode
    ? 'bg-slate-950 border border-slate-800 text-slate-200'
    : 'bg-slate-50 border border-slate-200 text-slate-800';
  const mutedText = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-5 pb-10">
      {/* User Summary Banner */}
      <div className={`rounded-2xl p-5 ${cardSurface}`}>
        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-xs">
                {(profile?.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {profile?.displayName || 'Boostlagbe Member'}
                </h2>
                <p className={`text-xs ${mutedText}`}>{user.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(profile?.balance ?? 0)}
                  </span>
                  <span className={mutedText}>·</span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('add-funds')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    + {t('ব্যালেন্স যোগ করুন', 'Add Funds')}
                  </button>
                </div>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigateTab('admin')}
                className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {t('অ্যাডমিন কন্ট্রোল প্যানেল', 'Admin Control Panel')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">
                {t('আপনার অ্যাকাউন্টে লগইন করুন', 'Sign In to Your Account')}
              </h2>
              <p className={`text-xs mt-0.5 ${mutedText}`}>
                {t(
                  'অর্ডার ট্র্যাকিং, ওয়ালেট এবং প্রোমো বোনাস সুবিধা পেতে লগইন করুন',
                  'Access order tracking, wallet deposits, and promo rewards'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
            >
              {t('লগইন / রেজিস্টার', 'Sign In / Register')}
            </button>
          </div>
        )}
      </div>

      {/* Quick Theme, Language & Currency Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold cursor-pointer ${cardSurface}`}
        >
          <span className={`flex items-center gap-2 ${mutedText}`}>
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
            {t('থিম মোড', 'Theme Mode')}
          </span>
          <span className="font-bold">
            {darkMode ? t('ডার্ক মোড', 'Dark Mode') : t('লাইট মোড', 'Light Studio')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold cursor-pointer ${cardSurface}`}
        >
          <span className={`flex items-center gap-2 ${mutedText}`}>
            <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {t('ভাষা', 'Language')}
          </span>
          <span className="font-bold">{language === 'bn' ? 'বাংলা' : 'English'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold cursor-pointer ${cardSurface}`}
        >
          <span className={`flex items-center gap-2 ${mutedText}`}>
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t('কারেন্সি', 'Currency')}
          </span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {currency === 'BDT' ? '৳ BDT' : '$ USD'}
          </span>
        </button>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onNavigateTab(mod.id)}
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer hover:border-indigo-500 group ${cardSurface}`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${mod.accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {mod.label}
                  </h3>
                  <p className={`text-[11px] truncate mt-0.5 ${mutedText}`}>{mod.desc}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${mutedText}`} />
            </button>
          );
        })}
      </div>

      {/* Company, Help Center & Legal Policies Section */}
      <div className={`rounded-2xl p-4 sm:p-5 space-y-3 ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {t('কোম্পানি, হেল্প সেন্টার ও পলিসি', 'Company, Help & Legal Policies')}
          </span>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[11px] font-mono hover:underline ${mutedText}`}
          >
            Sitemap.xml
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => onNavigateTab('about')}
            className={`p-3 rounded-xl text-left transition-colors cursor-pointer hover:border-indigo-500 ${subtleSurface}`}
          >
            <span className="block text-indigo-600 dark:text-indigo-400 text-[10px] font-mono">
              INFO
            </span>
            <span className="mt-0.5 block">{t('আমাদের সম্পর্কে', 'About Us')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('contact')}
            className={`p-3 rounded-xl text-left transition-colors cursor-pointer hover:border-indigo-500 ${subtleSurface}`}
          >
            <span className="block text-indigo-600 dark:text-indigo-400 text-[10px] font-mono">
              24/7 HELP
            </span>
            <span className="mt-0.5 block">{t('যোগাযোগ ও সাপোর্ট', 'Contact & Help')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('refund')}
            className={`p-3 rounded-xl text-left transition-colors cursor-pointer hover:border-indigo-500 ${subtleSurface}`}
          >
            <span className="block text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">
              100% AUTO
            </span>
            <span className="mt-0.5 block">{t('রিফান্ড পলিসি', 'Refund Policy')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('terms')}
            className={`p-3 rounded-xl text-left transition-colors cursor-pointer hover:border-indigo-500 ${subtleSurface}`}
          >
            <span className="block text-amber-600 dark:text-amber-400 text-[10px] font-mono">
              LEGAL
            </span>
            <span className="mt-0.5 block">{t('ব্যবহারের শর্তাবলী', 'Terms of Service')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('privacy')}
            className={`p-3 rounded-xl text-left transition-colors cursor-pointer hover:border-indigo-500 col-span-2 sm:col-span-1 ${subtleSurface}`}
          >
            <span className={`block text-[10px] font-mono ${mutedText}`}>SECURITY</span>
            <span className="mt-0.5 block">{t('প্রাইভেসি পলিসি', 'Privacy Policy')}</span>
          </button>
        </div>
      </div>

      {user && (
        <button
          type="button"
          onClick={logout}
          className="w-full py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          {t('লগআউট করুন', 'Sign Out')}
        </button>
      )}
    </div>
  );
};
