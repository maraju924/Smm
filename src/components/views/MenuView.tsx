import React from 'react';
import { 
  Zap, 
  Layers, 
  Wallet, 
  Package, 
  MessageSquare, 
  Clock, 
  Code2, 
  User, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  PhoneCall,
  Send,
  Gift
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SiteSettings } from '../../types';
import { DEFAULT_SITE_SETTINGS } from '../../data/seedServices';

interface MenuViewProps {
  onNavigateTab: (tabId: string) => void;
  onOpenAuth: () => void;
  siteSettings?: SiteSettings;
}

export const MenuView: React.FC<MenuViewProps> = ({
  onNavigateTab,
  onOpenAuth,
  siteSettings = DEFAULT_SITE_SETTINGS
}) => {
  const { profile, isAdmin, language } = useAuth();

  const menuSections = [
    {
      title: language === 'bn' ? 'অর্ডার ও সেবা' : 'Orders & Services',
      items: [
        { id: 'new-order', label: language === 'bn' ? 'নতুন সিঙ্গেল অর্ডার' : 'New Single Order', icon: Zap, color: 'text-rose-500' },
        { id: 'mass-order', label: language === 'bn' ? 'ম্যাস অর্ডার (Mass Order)' : 'Mass Order', icon: Sparkles, color: 'text-indigo-400' },
        { id: 'orders', label: language === 'bn' ? 'আমার অর্ডার হিস্টোরি' : 'My Orders History', icon: Package, color: 'text-amber-400' },
        { id: 'services', label: language === 'bn' ? 'সার্ভিস তালিকা ও প্রাইসিং' : 'Services & Price List', icon: Layers, color: 'text-sky-400' },
      ]
    },
    {
      title: language === 'bn' ? 'ওয়ালেট, বোনাস ও অ্যাফিলিয়েট' : 'Wallet, Promo & Affiliate',
      items: [
        { id: 'add-funds', label: language === 'bn' ? 'টাকা ডিপোজিট করুন (bKash/Nagad)' : 'Deposit Funds', icon: Wallet, color: 'text-emerald-400' },
        { id: 'affiliates', label: language === 'bn' ? 'প্রোমো কোড ও রেফারেল আয় (৫% কমিশন)' : 'Promo Codes & Affiliate Program', icon: Gift, color: 'text-rose-400' },
      ]
    },
    {
      title: language === 'bn' ? 'টুলস ও সাপোর্ট' : 'Tools & Assistance',
      items: [
        { id: 'track-order', label: language === 'bn' ? 'লাইভ অর্ডার ট্র্যাকার' : 'Live Order Tracker', icon: Clock, color: 'text-cyan-400' },
        { id: 'tickets', label: language === 'bn' ? 'কাস্টমার সাপোর্ট টিকিট' : 'Support Tickets', icon: MessageSquare, color: 'text-pink-400' },
        { id: 'api-docs', label: language === 'bn' ? 'এপিআই ডকুমেন্টস (API v2)' : 'API v2 Documentation', icon: Code2, color: 'text-purple-400' },
        { id: 'profile', label: language === 'bn' ? 'আমার অ্যাকাউন্ট ও সেটিংস' : 'Profile & Settings', icon: User, color: 'text-blue-400' },
      ]
    }
  ];

  const telegramHref = siteSettings.telegramUrl || '';
  const whatsappHref = siteSettings.whatsappUrl || '';

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pb-8 overflow-x-hidden">
      {/* User greeting chip */}
      {profile ? (
        <div 
          onClick={() => onNavigateTab('profile')}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-all shadow-md active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg">
              {profile.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{profile.displayName}</h3>
                {isAdmin && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">{profile.email}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white">
              {language === 'bn' ? 'আপনি লগইন করেননি' : 'Guest Mode'}
            </h4>
            <p className="text-[10px] text-slate-400">
              {language === 'bn' ? 'ব্যালেন্স ও অর্ডার সংরক্ষণের জন্য লগইন করুন' : 'Sign in to access your orders and wallet'}
            </p>
          </div>
          <button
            onClick={onOpenAuth}
            className="py-1.5 px-3 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-md"
          >
            {language === 'bn' ? 'লগইন' : 'Sign In'}
          </button>
        </div>
      )}

      {/* Admin Quick Entry if Admin */}
      {isAdmin && (
        <div 
          onClick={() => onNavigateTab('admin')}
          className="p-4 rounded-3xl bg-slate-900 border border-amber-500/40 flex items-center justify-between cursor-pointer hover:border-amber-500 shadow-xl active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-300">
                {language === 'bn' ? 'অ্যাডমিন কন্ট্রোল রুম' : 'Admin Management Panel'}
              </h4>
              <p className="text-[11px] text-slate-300">
                {language === 'bn' ? 'অর্ডার, ডিপোজিট, এপিআই প্রোভাইডার, কুপন ও সাইট সেটিংস' : 'Manage orders, deposits, API providers, coupons & site settings'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400" />
        </div>
      )}

      {/* Menu Sections */}
      {menuSections.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
            {section.title}
          </span>
          <div className="rounded-3xl bg-slate-900 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-md">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigateTab(item.id)}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-slate-850 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Live Support Channel Badges */}
      {(telegramHref || whatsappHref) && (
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {language === 'bn' ? 'তাৎক্ষণিক হেল্পলাইন' : 'Direct Support Hotline'}
            </h4>
            <span className="text-[10px] text-emerald-400 font-semibold">24/7 Cloud Support</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {telegramHref && (
              <a
                href={telegramHref}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Telegram Channel</span>
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                <span>WhatsApp 24/7</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
