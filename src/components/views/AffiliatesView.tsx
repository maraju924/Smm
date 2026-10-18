import React, { useState } from 'react';
import { 
  Gift, 
  Users, 
  Copy, 
  Wallet, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Share2, 
  Tag 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMCoupon, SiteSettings } from '../../types';
import { 
  redeemCouponCode, 
  applyReferralCode, 
  claimAffiliateEarnings 
} from '../../services/db';

interface AffiliatesViewProps {
  coupons: SMMCoupon[];
  siteSettings: SiteSettings;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth: () => void;
}

export const AffiliatesView: React.FC<AffiliatesViewProps> = ({
  coupons,
  siteSettings,
  onShowToast,
  onOpenAuth
}) => {
  const { profile, language, formatPrice, updateUserBalance } = useAuth();

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const [friendRefCode, setFriendRefCode] = useState('');
  const [refLoading, setRefLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  const myReferralCode = profile?.referralCode || (profile ? `AMT-${profile.uid.substring(0, 6).toUpperCase()}` : 'AMT-GUEST');
  const myReferralLink = `${window.location.origin}/?ref=${myReferralCode}`;

  const activeCoupons = coupons.filter(c => c.active && c.usedCount < c.maxUses);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(
      language === 'bn' ? `${label} কপি করা হয়েছে!` : `${label} copied!`,
      'success'
    );
  };

  const handleRedeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!promoCodeInput.trim()) return;

    setPromoLoading(true);
    try {
      const reward = await redeemCouponCode(
        promoCodeInput,
        profile,
        coupons
      );
      onShowToast(
        language === 'bn'
          ? `অভিনন্দন! প্রোমো কোড রিডিম হয়ে ৳${reward} আপনার ওয়ালেটে যোগ হয়েছে!`
          : `Promo code redeemed! ৳${reward} added to your wallet!`,
        'success'
      );
      setPromoCodeInput('');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to redeem promo code', 'error');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleApplyFriendReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!friendRefCode.trim()) return;

    setRefLoading(true);
    try {
      const bonus = await applyReferralCode(
        friendRefCode,
        profile
      );
      onShowToast(
        language === 'bn'
          ? `রেফারেল যুক্ত হয়েছে! আপনি ৳${bonus} ওয়েলকাম বোনাস পেয়েছেন!`
          : `Referral linked! You received ৳${bonus} welcome bonus!`,
        'success'
      );
      setFriendRefCode('');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to apply referral code', 'error');
    } finally {
      setRefLoading(false);
    }
  };

  const handleClaimPayout = async () => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    setClaimLoading(true);
    try {
      const claimed = await claimAffiliateEarnings(profile, siteSettings.minAffiliatePayout || 100);
      if (profile.uid.startsWith('demo_')) {
        await updateUserBalance(claimed);
      }
      onShowToast(
        language === 'bn'
          ? `৳${claimed} সফলভাবে আপনার মূল ওয়ালেটে স্থানান্তর করা হয়েছে!`
          : `৳${claimed} transferred to your main wallet!`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Payout failed', 'error');
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Gift className="w-5 h-5 text-rose-500" />
            {language === 'bn' ? 'প্রোমো কোড ও অ্যাফিলিয়েট প্রোগ্রাম' : 'Promo Codes & Affiliate Hub'}
          </h2>
          <p className="text-xs text-slate-400">
            {language === 'bn'
              ? `বন্ধুদের আমন্ত্রণ জানিয়ে আজীবন ${siteSettings.referralCommissionPercent}% কমিশন ও গিফট কুপন জিতুন`
              : `Earn ${siteSettings.referralCommissionPercent}% lifetime deposit commission & redeem gift coupons`}
          </p>
        </div>
      </div>

      {/* SECTION 1: PROMO CODE / GIFT COUPON REDEMPTION */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'bn' ? 'গিফট কুপন / প্রোমো কোড রিডিম করুন' : 'Redeem Gift Coupon / Promo Code'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'প্রোমো কোড ব্যবহার করে তাৎক্ষণিক ফ্রি ওয়ালেট ব্যালেন্স পান' : 'Enter a valid promo code for instant free wallet balance'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleRedeemCoupon} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
            placeholder={language === 'bn' ? 'কুপন কোড লিখুন (যেমন: WELCOME50)' : 'Enter Coupon Code (e.g. WELCOME50)'}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-white uppercase placeholder-slate-500 focus:outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={promoLoading || !promoCodeInput.trim()}
            className="py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap shrink-0"
          >
            {promoLoading
              ? (language === 'bn' ? 'যাচাই হচ্ছে...' : 'Checking...')
              : (language === 'bn' ? 'বোনাস নিন' : 'Claim Bonus')}
          </motion.button>
        </form>

        {/* Active Public Promo Codes */}
        {activeCoupons.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 block">
              {language === 'bn' ? 'সক্রিয় প্রোমো কোডসমূহ (ক্লিক করে ব্যবহার করুন):' : 'Available Active Promo Codes (Click to fill):'}
            </span>
            <div className="flex flex-wrap gap-2">
              {activeCoupons.map(cp => {
                const alreadyUsed = profile ? cp.usedBy?.includes(profile.uid) : false;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    disabled={alreadyUsed}
                    onClick={() => setPromoCodeInput(cp.code)}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
                      alreadyUsed
                        ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-emerald-400'
                    }`}
                  >
                    <span className="font-bold">{cp.code}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-white font-sans font-semibold">{formatPrice(cp.rewardAmount)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {alreadyUsed ? (language === 'bn' ? 'ব্যবহৃত' : 'Claimed') : `${cp.maxUses - cp.usedCount} left`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: AFFILIATE & REFERRAL DASHBOARD */}
      <div className="p-5 rounded-3xl bg-[#0d1322] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              {language === 'bn' ? 'অ্যাফিলিয়েট ড্যাশবোর্ড' : 'Affiliate Partner Dashboard'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn'
                ? `আপনার রেফারেল লিঙ্ক শেয়ার করুন এবং প্রতিটি ডিপোজিট থেকে ${siteSettings.referralCommissionPercent}% কমিশন আয় করুন`
                : `Share your referral code and earn ${siteSettings.referralCommissionPercent}% commission on every deposit`}
            </p>
          </div>
        </div>

        {/* Affiliate Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {language === 'bn' ? 'মোট রেফারেল' : 'Total Referrals'}
            </span>
            <p className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {profile?.referralCount || 0}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {language === 'bn' ? 'কমিশন রেট' : 'Commission Rate'}
            </span>
            <p className="text-lg font-bold text-sky-400 font-mono tabular-nums mt-0.5">
              {siteSettings.referralCommissionPercent}%
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {language === 'bn' ? 'মোট আয়' : 'Total Earned'}
            </span>
            <p className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
              {formatPrice(profile?.referralEarnings || 0)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {language === 'bn' ? 'উত্তোলনযোগ্য' : 'Available Payout'}
            </span>
            <p className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-0.5">
              {formatPrice(profile?.unpaidReferralEarnings || 0)}
            </p>
          </div>
        </div>

        {/* Copy Referral Code & Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                {language === 'bn' ? 'আপনার রেফারেল কোড' : 'Your Referral Code'}
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400 select-all">
                {myReferralCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(myReferralCode, 'Referral Code')}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>{language === 'bn' ? 'কপি' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                {language === 'bn' ? 'রেফারেল ইনভাইট লিঙ্ক' : 'Referral Invite Link'}
              </span>
              <span className="text-xs font-mono text-slate-300 truncate block">
                {myReferralLink}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(myReferralLink, 'Invite Link')}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{language === 'bn' ? 'শেয়ার' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Transfer Affiliate Balance to Main Wallet */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            <p className="font-bold text-white">
              {language === 'bn' ? 'রেফারেল আয় মূল ওয়ালেটে ট্রান্সফার করুন' : 'Transfer Affiliate Earnings to Main Wallet'}
            </p>
            <p className="text-[11px] text-slate-400">
              {language === 'bn'
                ? `সর্বনিম্ন উত্তোলন সীমা: ${formatPrice(siteSettings.minAffiliatePayout || 100)}`
                : `Minimum payout threshold: ${formatPrice(siteSettings.minAffiliatePayout || 100)}`}
            </p>
          </div>
          <button
            type="button"
            disabled={claimLoading || (profile?.unpaidReferralEarnings || 0) < (siteSettings.minAffiliatePayout || 100)}
            onClick={handleClaimPayout}
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all whitespace-nowrap shrink-0"
          >
            {claimLoading
              ? (language === 'bn' ? 'ট্রান্সফার হচ্ছে...' : 'Transferring...')
              : (language === 'bn' ? 'ওয়ালেটে ট্রান্সফার করুন' : 'Transfer to Wallet')}
          </button>
        </div>

        {/* Link a Referrer Code if not already referred */}
        {profile && !profile.referredBy && (
          <form onSubmit={handleApplyFriendReferral} className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={friendRefCode}
              onChange={(e) => setFriendRefCode(e.target.value.toUpperCase())}
              placeholder={language === 'bn' ? 'কারো রেফারেল কোড থাকলে দিন (৳২৫ বোনাস পান)' : 'Have a friend referral code? Enter for ৳25 bonus'}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={refLoading || !friendRefCode.trim()}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs whitespace-nowrap shrink-0"
            >
              {refLoading
                ? (language === 'bn' ? 'যুক্ত হচ্ছে...' : 'Applying...')
                : (language === 'bn' ? 'রেফারেল যুক্ত করুন' : 'Apply Code')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
