import React, { useState } from 'react';
import {
  User,
  Mail,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Globe,
  LogOut,
  Lock,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { regenerateUserApiKeyOnServer } from '../../services/db';

interface ProfileViewProps {
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onShowToast, onOpenAuth }) => {
  const {
    user,
    profile,
    logout,
    resetPassword,
    currency,
    setCurrency,
    language,
    setLanguage,
    formatPrice,
    t
  } = useAuth();

  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  if (!user || !profile) {
    return (
      <div className="rounded-3xl bg-[#0D1220] border border-white/[0.07] p-10 text-center max-w-md mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-[#141B2B] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-[#8B5CF6]">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#F1F5F9] mb-1">
          {t('লগইন প্রয়োজন', 'Sign In Required')}
        </h2>
        <p className="text-xs text-[#94A3B8] mb-5">
          {t('আপনার প্রোফাইল, এপিআই কী এবং সিকিউরিটি সেটিংস দেখতে লগইন করুন।', 'Sign in to manage your account settings, API keys, and preferences.')}
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-[#8B5CF6]/25"
        >
          {t('লগইন / রেজিস্টার করুন', 'Sign In / Create Account')}
        </button>
      </div>
    );
  }

  const maskedApiKey = profile.apiKey
    ? `${profile.apiKey.slice(0, 7)}••••••••••••••••••••${profile.apiKey.slice(-4)}`
    : 'No API Key Generated';

  const handleCopyKey = () => {
    if (!profile.apiKey) return;
    navigator.clipboard.writeText(profile.apiKey);
    setCopiedKey(true);
    onShowToast(t('API Key কপি করা হয়েছে!', 'API Key copied to clipboard!'), 'info');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = async () => {
    setIsRegenerating(true);
    try {
      await regenerateUserApiKeyOnServer(user.uid, profile.apiKey);
      setConfirmRegenerate(false);
      setShowApiKey(true);
      onShowToast(t('নতুন API Key তৈরি করা হয়েছে!', 'New API Key generated!'), 'success');
    } catch (err: any) {
      onShowToast(err.message || t('API Key তৈরি ব্যর্থ হয়েছে', 'Failed to regenerate API key'), 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setSendingReset(true);
    try {
      await resetPassword(user.email);
      onShowToast(
        t(`পাসওয়ার্ড রিসেট লিংক ${user.email}-এ পাঠানো হয়েছে!`, `Password reset email sent to ${user.email}`),
        'success'
      );
    } catch (err: any) {
      onShowToast(err.message || t('রিসেট ইমেইল পাঠানো যায়নি', 'Failed to send password reset email'), 'error');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] tracking-tight">
          {t('প্রোফাইল ও অ্যাকাউন্ট সেটিংস', 'Profile & Account Settings')}
        </h1>
        <p className="text-xs text-[#94A3B8] mt-0.5">
          {t('আপনার ব্যক্তিগত তথ্য, ভাষা, কারেন্সি এবং সিকিউরিটি পরিচালনা করুন', 'Manage your identity, language preferences, and account security')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Account Identity & Preferences (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Identity Card */}
          <div className="rounded-3xl bg-[#0D1220] border border-white/[0.07] p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] p-[1px] shrink-0">
                <div className="w-full h-full rounded-[15px] bg-[#0D1220] flex items-center justify-center text-xl font-extrabold text-[#F1F5F9]">
                  {(profile.displayName || profile.email || 'U')[0].toUpperCase()}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-[#F1F5F9] truncate">
                    {profile.displayName || 'Boostlagbe Member'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/25 text-[#22C55E] text-[10px] font-semibold">
                    {profile.role === 'admin' ? 'Administrator' : 'Verified Member'}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] truncate flex items-center gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.06]">
              <div className="p-3.5 rounded-2xl bg-[#141B2B]/70 border border-white/[0.05]">
                <span className="text-[11px] text-[#94A3B8] block">{t('বর্তমান ব্যালেন্স', 'Available Balance')}</span>
                <span className="font-mono text-base font-bold text-[#22D3EE] mt-0.5 block">
                  {formatPrice(profile.balance || 0)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#141B2B]/70 border border-white/[0.05]">
                <span className="text-[11px] text-[#94A3B8] block">{t('রেফারেল আয়', 'Affiliate Earnings')}</span>
                <span className="font-mono text-base font-bold text-[#F1F5F9] mt-0.5 block">
                  {formatPrice(profile.referralEarnings || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preferences & Security (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Workspace Preferences */}
          <div className="rounded-3xl bg-[#0D1220] border border-white/[0.07] p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#22D3EE]" />
              {t('ভাষা ও কারেন্সি সেটিংস', 'Language & Currency Preferences')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-2xl bg-[#141B2B]/70 border border-white/[0.06]">
                <span className="text-xs font-semibold text-[#94A3B8] block mb-2">
                  {t('ইন্টারফেস ভাষা (Language)', 'Interface Language')}
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#080B14]">
                  <button
                    type="button"
                    onClick={() => setLanguage('bn')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      language === 'bn' ? 'bg-[#8B5CF6] text-white' : 'text-[#94A3B8]'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      language === 'en' ? 'bg-[#8B5CF6] text-white' : 'text-[#94A3B8]'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#141B2B]/70 border border-white/[0.06]">
                <span className="text-xs font-semibold text-[#94A3B8] block mb-2">
                  {t('প্রদর্শিত কারেন্সি (Currency)', 'Display Currency')}
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#080B14]">
                  <button
                    type="button"
                    onClick={() => setCurrency('BDT')}
                    className={`py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                      currency === 'BDT' ? 'bg-[#8B5CF6] text-white' : 'text-[#94A3B8]'
                    }`}
                  >
                    ৳ BDT
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                      currency === 'USD' ? 'bg-[#8B5CF6] text-white' : 'text-[#94A3B8]'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#141B2B]/70 border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#8B5CF6]" />
                <div>
                  <p className="text-xs font-semibold text-[#F1F5F9]">
                    {t('অর্ডার স্ট্যাটাস নোটিফিকেশন', 'Order Status Notifications')}
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    {t('অর্ডার সম্পন্ন বা রিফিল আপডেট হলে তাৎক্ষণিক অ্যালার্ট', 'Receive live updates when orders complete')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                  notificationsEnabled ? 'bg-[#8B5CF6]' : 'bg-[#080B14] border border-white/[0.1]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Security & Session Card */}
          <div className="rounded-3xl bg-[#0D1220] border border-white/[0.07] p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#8B5CF6]" />
              {t('সিকিউরিটি ও সেশন কন্ট্রোল', 'Security & Session Controls')}
            </h3>

            <div className="p-3.5 rounded-2xl bg-[#141B2B]/70 border border-white/[0.06] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#F1F5F9]">
                  {t('পাসওয়ার্ড পরিবর্তন / রিসেট', 'Reset Account Password')}
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  {t('আপনার ইমেইলে নিরাপদ পাসওয়ার্ড রিসেট লিংক পাঠান', 'Send an official password reset link to your email')}
                </p>
              </div>
              <button
                type="button"
                disabled={sendingReset}
                onClick={handlePasswordReset}
                className="px-3.5 py-2 rounded-xl bg-[#192337] hover:bg-[#8B5CF6] text-[#F1F5F9] hover:text-white text-xs font-semibold border border-white/[0.08] shrink-0 transition-colors"
              >
                {sendingReset ? t('পাঠানো হচ্ছে...', 'Sending...') : t('রিসেট লিংক পাঠান', 'Send Reset Link')}
              </button>
            </div>

            {!confirmLogout ? (
              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                className="w-full py-3 rounded-2xl bg-[#F87171]/10 hover:bg-[#F87171]/20 text-[#F87171] font-bold text-xs border border-[#F87171]/25 flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('অ্যাকাউন্ট থেকে লগআউট করুন', 'Sign Out of Account')}
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F87171]/10 border border-[#F87171]/30 space-y-3">
                <p className="text-xs text-[#F87171] font-semibold">
                  {t('আপনি কি নিশ্চিতভাবে লগআউট করতে চান?', 'Are you sure you want to sign out of your session?')}
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={logout}
                    className="px-4 py-2 rounded-xl bg-[#F87171] text-white font-bold text-xs"
                  >
                    {t('হ্যাঁ, লগআউট করুন', 'Yes, Sign Out')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmLogout(false)}
                    className="px-4 py-2 rounded-xl bg-[#141B2B] text-[#94A3B8] font-semibold text-xs"
                  >
                    {t('না, থাকুক', 'Cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
