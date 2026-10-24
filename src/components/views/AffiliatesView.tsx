import React, { useState, useEffect, useMemo } from 'react';
import {
  Gift,
  Users,
  Copy,
  Wallet,
  Sparkles,
  CheckCircle2,
  Share2,
  Tag,
  Trophy,
  Crown,
  Zap,
  Calculator,
  QrCode,
  CalendarCheck,
  TrendingUp,
  Edit3,
  Check,
  X,
  Send,
  MessageCircle,
  Award,
  Clock,
  HelpCircle,
  Plus,
  Trash2,
  ShieldCheck,
  ClipboardPaste,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { SMMCoupon, SiteSettings, UserProfile } from '../../types';
import {
  redeemCouponCode,
  applyReferralCode,
  claimAffiliateEarnings,
  updateCustomReferralCode,
  claimMilestoneReward,
  claimDailyPromoBonus,
  fetchReferredUsersList,
  saveCoupon,
  removeCoupon
} from '../../services/db';

interface AffiliatesViewProps {
  coupons: SMMCoupon[];
  siteSettings: SiteSettings;
  allUsers?: UserProfile[];
  onNavigateTab?: (tab: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth: () => void;
}

type SectionTab = 'all' | 'promo' | 'affiliate' | 'vip' | 'calculator' | 'history';

interface MilestoneConfig {
  id: string;
  target: number;
  reward: number;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  badge: string;
}

const MILESTONES: MilestoneConfig[] = [
  {
    id: 'm1',
    target: 1,
    reward: 10,
    titleBn: '১ম ভেরিফাইড ইনভাইট মিশন',
    titleEn: 'First Verified Invite Mission',
    descBn: '১ জন ভেরিফাইড রেফারেল (ন্যূনতম ৳১০০ ডিপোজিট) পূর্ণ করলেই তাৎক্ষণিক ৳১০ বোনাস',
    descEn: 'Get 1 verified referral (min ৳100 deposit) to unlock ৳10 instant bonus',
    badge: 'STARTER'
  },
  {
    id: 'm5',
    target: 5,
    reward: 50,
    titleBn: '৫ জন ভেরিফাইড রেফারেল স্কোয়াড',
    titleEn: '5 Verified Referrals Squad',
    descBn: '৫ জন ভেরিফাইড ইউজার রেফার করলে সিলভার টিয়ার ও অতিরিক্ত ৳৫০ বোনাস',
    descEn: 'Reach 5 verified referrals to unlock Silver Tier & ৳50 bonus',
    badge: 'SILVER'
  },
  {
    id: 'm10',
    target: 10,
    reward: 100,
    titleBn: '১০ জন প্রো প্রমোটার',
    titleEn: '10 Verified Referrals Promoter',
    descBn: '১০ জন ভেরিফাইড রেফারেল পূর্ণ করে জিতে নিন অতিরিক্ত ৳১০০ ক্যাশ বোনাস',
    descEn: 'Get 10 verified referrals to claim ৳100 wallet reward',
    badge: 'PRO'
  },
  {
    id: 'm25',
    target: 25,
    reward: 300,
    titleBn: '২৫ জন গোল্ড ইনফ্লুয়েন্সার',
    titleEn: '25 Verified Referrals Influencer',
    descBn: '২৫ জন ভেরিফাইড রেফারেল পূর্ণ হলে গোল্ড ভিআইপি ও অতিরিক্ত ৳৩০০ বোনাস',
    descEn: 'Reach 25 verified referrals for Gold VIP & ৳300 reward',
    badge: 'GOLD'
  },
  {
    id: 'm50',
    target: 50,
    reward: 750,
    titleBn: '৫০ জন ডায়মন্ড অ্যাম্বাসেডর',
    titleEn: '50 Verified Referrals Ambassador',
    descBn: '৫০ জন ভেরিফাইড রেফারেল পূর্ণ করলেই মেগা ৳৭৫০ ভিআইপি রিওয়ার্ড',
    descEn: 'Achieve 50 verified referrals to claim ৳750 Ambassador Reward',
    badge: 'DIAMOND'
  }
];

const DAILY_STREAK_REWARDS = [
  { day: 1, reward: 1 },
  { day: 2, reward: 2 },
  { day: 3, reward: 2 },
  { day: 4, reward: 3 },
  { day: 5, reward: 4 },
  { day: 6, reward: 5 },
  { day: 7, reward: 10 }
];

export const AffiliatesView: React.FC<AffiliatesViewProps> = ({
  coupons,
  siteSettings,
  allUsers = [],
  onNavigateTab,
  onShowToast,
  onOpenAuth
}) => {
  const { profile, isAdmin, language, formatPrice, updateUserBalance } = useAuth();
  const t = (bn: string, en: string) => (language === 'bn' ? bn : en);

  const [activeTab, setActiveTab] = useState<SectionTab>('all');

  // Promo Code Redemption State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  // Friend Referral Code State (auto-populated from URL ?ref= if present)
  const [friendRefCode, setFriendRefCode] = useState(() => {
    try {
      return sessionStorage.getItem('boostlagbe_ref_code') || '';
    } catch {
      return '';
    }
  });
  const [refLoading, setRefLoading] = useState(false);

  // Custom Referral Code Editor State
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [savingCustomCode, setSavingCustomCode] = useState(false);

  // Payout / Transfer Sheet State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutMode, setPayoutMode] = useState<'wallet_transfer' | 'mobile_banking_withdraw'>('wallet_transfer');
  const [payoutMethod, setPayoutMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

  // QR Code Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Daily Check-in & Milestone Claim Loading State
  const [dailyLoading, setDailyLoading] = useState(false);
  const [claimingMilestoneId, setClaimingMilestoneId] = useState<string | null>(null);

  // Interactive Calculator State
  const [calcFriends, setCalcFriends] = useState<number>(15);
  const [calcAvgDeposit, setCalcAvgDeposit] = useState<number>(2000);

  // Referred Users Network State
  const [referredUsers, setReferredUsers] = useState<Array<{
    uid: string;
    displayName: string;
    maskedEmail: string;
    totalDeposited: number;
    referralVerified: boolean;
    totalSpent: number;
    createdAt: number;
  }>>([]);
  const [loadingNetwork, setLoadingNetwork] = useState(false);

  // Admin Quick Coupon Creator State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponReward, setNewCouponReward] = useState('25');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState('100');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  const myReferralCode =
    profile?.referralCode ||
    (profile ? `BL-${profile.uid.substring(0, 6).toUpperCase()}` : 'BL-BOOST24');
  const myReferralLink = `${window.location.origin}/?ref=${myReferralCode}`;

  const referralCount = profile?.referralCount || 0;
  const pendingReferralsCount = useMemo(
    () => referredUsers.filter((u) => !u.referralVerified).length,
    [referredUsers]
  );
  const totalReferralEarned = profile?.referralEarnings || 0;
  const unpaidEarnings = profile?.unpaidReferralEarnings || 0;
  const minPayout = siteSettings.minAffiliatePayout || 100;
  const baseCommission = siteSettings.referralCommissionPercent || 5;

  // Compute VIP Tier based on verified referralCount (each referral requires >= ৳100 deposit, reward = ৳10)
  const vipTier = useMemo(() => {
    if (referralCount >= 50) {
      return {
        level: 4,
        nameBn: 'ডায়মন্ড অ্যাম্বাসেডর',
        nameEn: 'Diamond Ambassador',
        extraCommission: 10,
        signupBonus: 10,
        nextTarget: 100,
        color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30'
      };
    }
    if (referralCount >= 20) {
      return {
        level: 3,
        nameBn: 'গোল্ড পার্টনার',
        nameEn: 'Gold Partner',
        extraCommission: 5,
        signupBonus: 10,
        nextTarget: 50,
        color: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
      };
    }
    if (referralCount >= 5) {
      return {
        level: 2,
        nameBn: 'সিলভার পার্টনার',
        nameEn: 'Silver Partner',
        extraCommission: 2,
        signupBonus: 10,
        nextTarget: 20,
        color: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30'
      };
    }
    return {
      level: 1,
      nameBn: 'স্টার্টার পার্টনার',
      nameEn: 'Starter Partner',
      extraCommission: 0,
      signupBonus: 10,
      nextTarget: 5,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    };
  }, [referralCount]);

  const effectiveCommissionRate = baseCommission + vipTier.extraCommission;
  const payoutProgressPercent = Math.min(100, Math.round((unpaidEarnings / minPayout) * 100));

  // Fetch referred users when logged in
  useEffect(() => {
    if (!profile?.uid) {
      setReferredUsers([]);
      return;
    }
    let mounted = true;
    setLoadingNetwork(true);
    fetchReferredUsersList(profile.uid)
      .then((list) => {
        if (mounted) setReferredUsers(list);
      })
      .finally(() => {
        if (mounted) setLoadingNetwork(false);
      });
    return () => {
      mounted = false;
    };
  }, [profile?.uid, profile?.referralCount]);

  // Active & Redeemed Coupons
  const activeCoupons = useMemo(
    () => coupons.filter((c) => c.active && c.usedCount < c.maxUses),
    [coupons]
  );

  const myRedeemedCoupons = useMemo(
    () => (profile ? coupons.filter((c) => c.usedBy?.includes(profile.uid)) : []),
    [coupons, profile]
  );

  const totalPromoBonusEarned = useMemo(() => {
    const history = profile?.payoutHistory || [];
    const fromHistory = history
      .filter((h) => h.type === 'coupon_redeem' || h.type === 'daily_checkin' || h.type === 'referral_welcome')
      .reduce((acc, item) => acc + (item.amount || 0), 0);
    if (fromHistory > 0) return fromHistory;
    return myRedeemedCoupons.reduce((acc, c) => acc + c.rewardAmount, 0);
  }, [profile?.payoutHistory, myRedeemedCoupons]);

  // Daily Check-in availability
  const canClaimDaily = useMemo(() => {
    if (!profile?.dailyCheckInLastAt) return true;
    const elapsed = Date.now() - profile.dailyCheckInLastAt;
    return elapsed >= 20 * 60 * 60 * 1000;
  }, [profile?.dailyCheckInLastAt]);

  const currentStreak = profile?.dailyCheckInStreak || 0;

  // Interactive Calculator Output (৳10 per verified referral + deposit commission)
  const calculatorResults = useMemo(() => {
    let tierBonus = 0;
    if (calcFriends >= 50) tierBonus = 10;
    else if (calcFriends >= 20) tierBonus = 5;
    else if (calcFriends >= 5) tierBonus = 2;

    const commRate = baseCommission + tierBonus;
    const signupInstant = calcFriends * 10; // ৳10 per verified referral
    const monthlyCommission = Math.round((calcFriends * calcAvgDeposit * commRate) / 100);
    const milestoneBonus = MILESTONES.filter((m) => calcFriends >= m.target).reduce(
      (sum, m) => sum + m.reward,
      0
    );
    const yearlyTotal = monthlyCommission * 12 + signupInstant + milestoneBonus;

    return {
      commRate,
      signupInstant,
      monthlyCommission,
      milestoneBonus,
      yearlyTotal
    };
  }, [calcFriends, calcAvgDeposit, baseCommission]);

  // Top Affiliate Leaderboard (combines real top users + motivational benchmarks)
  const leaderboardList = useMemo(() => {
    const realReferrers = allUsers
      .filter((u) => (u.referralCount || 0) > 0 || (u.referralEarnings || 0) > 0)
      .map((u) => ({
        id: u.uid,
        name: u.displayName || 'Boostlagbe Partner',
        referrals: u.referralCount || 0,
        earnings: u.referralEarnings || 0,
        tier: (u.referralCount || 0) >= 50 ? 'Diamond' : (u.referralCount || 0) >= 20 ? 'Gold' : 'Silver'
      }));

    const benchmarks = [
      { id: 'top-1', name: 'Tanvir Ahmed', referrals: 84, earnings: 18450, tier: 'Diamond' },
      { id: 'top-2', name: 'Mehedi Hasan', referrals: 62, earnings: 13200, tier: 'Diamond' },
      { id: 'top-3', name: 'Sadia Islam', referrals: 39, earnings: 8650, tier: 'Gold' },
      { id: 'top-4', name: 'Rakibul Islam', referrals: 27, earnings: 5420, tier: 'Gold' },
      { id: 'top-5', name: 'Naimur Rahman', referrals: 16, earnings: 3190, tier: 'Silver' }
    ];

    const combined = [...realReferrers, ...benchmarks];
    combined.sort((a, b) => b.earnings - a.earnings);
    return combined.slice(0, 5);
  }, [allUsers]);

  // Promotional Copy Templates
  const promoTemplates = useMemo(
    () => [
      {
        id: 'fb',
        title: t('ফেসবুক গ্রুপ ও পোস্ট টেমপ্লেট', 'Facebook Post & Group Template'),
        badge: 'Facebook',
        text:
          language === 'bn'
            ? `🔥 সবচেয়ে কম খরচে Facebook, YouTube, TikTok ও Instagram বুস্ট করতে চান?\n\n✅ বিকাশ ও নগদে তাৎক্ষণিক ডিপোজিট\n✅ ১০০% অটোমেটিক ও সুপার ফাস্ট ডেলিভারি\n🎁 আমার রেফারেল কোড "${myReferralCode}" ব্যবহার করে ন্যূনতম ৳১০০ ডিপোজিট করলেই পাচ্ছেন ভেরিফাইড রেফারেল বোনাস ৳১০!\n\n👉 এখনি জয়েন করুন: ${myReferralLink}`
            : `🔥 Want to grow your Facebook, YouTube, TikTok & Instagram at the lowest rates?\n\n✅ Instant bKash & Nagad Wallet Top-up\n✅ 24/7 Automated Fast Delivery\n🎁 Use my invite code "${myReferralCode}" and deposit ৳100 to unlock ৳10 Verified Referral Bonus!\n\n👉 Join now: ${myReferralLink}`
      },
      {
        id: 'wa',
        title: t('হোয়াটসঅ্যাপ ও মেসেঞ্জার ইনবক্স', 'WhatsApp & Messenger Direct'),
        badge: 'WhatsApp / Inbox',
        text:
          language === 'bn'
            ? `দোস্ত, সোশ্যাল মিডিয়া ফলোয়ার, ভিউ ও মনিটাইজেশনের জন্য Boostlagbe.com ব্যবহার করে দেখ! আমার রেফারেল কোড ${myReferralCode} দিয়ে জয়েন করে ৳১০০ ডিপোজিট করলেই পাবি ৳১০ বোনাস। লিংক: ${myReferralLink}`
            : `Hey! Check out Boostlagbe.com for instant social media followers, views & monetization. Use my code ${myReferralCode} and deposit ৳100 to get ৳10 bonus! Link: ${myReferralLink}`
      },
      {
        id: 'bio',
        title: t('ইউটিউব ডেসক্রিপশন ও টিকটক বায়ো', 'YouTube Description & TikTok Bio'),
        badge: 'Bio / Short',
        text:
          language === 'bn'
            ? `🚀 সোশ্যাল মিডিয়া বুস্ট করুন সবচেয়ে কম দামে: ${myReferralLink} (রেফারেল কোড: ${myReferralCode})`
            : `🚀 Boost Your Social Media Instantly: ${myReferralLink} (Invite Code: ${myReferralCode})`
      }
    ],
    [language, myReferralCode, myReferralLink]
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(t(`${label} কপি করা হয়েছে!`, `${label} copied!`), 'success');
  };

  const handlePastePromo = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPromoCodeInput(text.trim().toUpperCase());
        onShowToast(t('কুপন কোড পেস্ট করা হয়েছে!', 'Promo code pasted!'), 'info');
      }
    } catch {
      onShowToast(t('ক্লিপবোর্ড থেকে পেস্ট করা যায়নি, ম্যানুয়ালি লিখুন', 'Could not read clipboard'), 'error');
    }
  };

  const handleNativeShare = async () => {
    const shareText =
      language === 'bn'
        ? `Boostlagbe.com-এ জয়েন করে আমার রেফারেল কোড ${myReferralCode} ব্যবহার করে ৳১০০ ডিপোজিট করলেই পাচ্ছেন ৳১০ বোনাস!`
        : `Join Boostlagbe.com with my invite code ${myReferralCode} and deposit ৳100 to get ৳10 bonus!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Boostlagbe.com – সোশ্যাল মিডিয়া বুস্ট ও প্রোমো বোনাস',
          text: shareText,
          url: myReferralLink
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopy(myReferralLink, t('রেফারেল লিঙ্ক', 'Referral Link'));
  };

  const handleRedeemCoupon = async (e: React.FormEvent, overrideCode?: string) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    const targetCode = (overrideCode ?? promoCodeInput).trim().toUpperCase();
    if (!targetCode) return;

    setPromoLoading(true);
    try {
      const reward = await redeemCouponCode(targetCode, profile, coupons);
      onShowToast(
        t(
          `অভিনন্দন! প্রোমো কোড (${targetCode}) রিডিম হয়ে ৳${reward} আপনার ওয়ালেটে যোগ হয়েছে!`,
          `Success! Promo code (${targetCode}) redeemed! ৳${reward} added to your wallet!`
        ),
        'success'
      );
      setPromoCodeInput('');
    } catch (err: any) {
      onShowToast(err?.message || t('প্রোমো কোড রিডিম করা যায়নি', 'Failed to redeem promo code'), 'error');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleClaimDailyBonus = async () => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    setDailyLoading(true);
    try {
      const { reward, newStreak } = await claimDailyPromoBonus(profile);
      onShowToast(
        t(
          `অভিনন্দন! ডে-${newStreak} ডেইলি চেক-ইন বোনাস ৳${reward} আপনার ওয়ালেটে যোগ হয়েছে!`,
          `Day-${newStreak} Daily Check-In Bonus ৳${reward} credited to your wallet!`
        ),
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || t('ডেইলি বোনাস নেওয়া যায়নি', 'Could not claim daily bonus'), 'error');
    } finally {
      setDailyLoading(false);
    }
  };

  const handleClaimMilestone = async (m: MilestoneConfig) => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    setClaimingMilestoneId(m.id);
    try {
      const reward = await claimMilestoneReward(
        profile,
        m.id,
        m.target,
        m.reward,
        language === 'bn' ? m.titleBn : m.titleEn
      );
      onShowToast(
        t(
          `অভিনন্দন! মাইলস্টোন বোনাস ৳${reward} আপনার মেইন ওয়ালেটে যোগ হয়েছে!`,
          `Milestone Bonus ৳${reward} added to your main wallet!`
        ),
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || t('মাইলস্টোন বোনাস নেওয়া যায়নি', 'Failed to claim milestone'), 'error');
    } finally {
      setClaimingMilestoneId(null);
    }
  };

  const handleSaveCustomCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!customCodeInput.trim()) return;

    setSavingCustomCode(true);
    try {
      const updated = await updateCustomReferralCode(profile, customCodeInput);
      onShowToast(
        t(
          `আপনার কাস্টম রেফারেল কোড (${updated}) সফলভাবে সেভ হয়েছে!`,
          `Your custom referral code (${updated}) has been saved!`
        ),
        'success'
      );
      setIsEditingCode(false);
    } catch (err: any) {
      onShowToast(err?.message || t('কোড পরিবর্তন করা যায়নি', 'Failed to update code'), 'error');
    } finally {
      setSavingCustomCode(false);
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
      const result = await applyReferralCode(friendRefCode, profile);
      if (result.verified) {
        onShowToast(
          t(
            `রেফারেল ভেরিফাইড হয়েছে! আপনি তাৎক্ষণিক ৳${result.bonus} বোনাস পেয়েছেন!`,
            `Referral verified! You received ৳${result.bonus} instant bonus!`
          ),
          'success'
        );
      } else {
        onShowToast(
          t(
            'রেফারেল কোড যুক্ত হয়েছে! ভেরিফাইড রেফারেল হিসেবে গণ্য হতে এবং ৳১০ বোনাস পেতে ন্যূনতম ৳১০০ ডিপোজিট করুন।',
            'Referral code linked! Deposit at least ৳100 to verify your referral and unlock the ৳10 bonus.'
          ),
          'info'
        );
      }
      setFriendRefCode('');
    } catch (err: any) {
      onShowToast(err?.message || t('রেফারেল কোড যুক্ত করা যায়নি', 'Failed to apply referral code'), 'error');
    } finally {
      setRefLoading(false);
    }
  };

  const handleExecutePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    const numericAmount = payoutAmount ? Number(payoutAmount) : unpaidEarnings;
    setClaimLoading(true);
    try {
      const claimed = await claimAffiliateEarnings(profile, minPayout, {
        payoutType: payoutMode,
        method: payoutMethod,
        accountNumber: payoutAccount,
        customAmount: numericAmount
      });
      if (profile.uid.startsWith('demo_') && payoutMode === 'wallet_transfer') {
        await updateUserBalance(claimed);
      }
      onShowToast(
        payoutMode === 'wallet_transfer'
          ? t(
              `৳${claimed} সফলভাবে আপনার মূল ওয়ালেটে স্থানান্তর করা হয়েছে!`,
              `৳${claimed} transferred to your main wallet!`
            )
          : t(
              `৳${claimed} (${payoutMethod}: ${payoutAccount}) উইথড্র রিকোয়েস্ট সফলভাবে গ্রহণ করা হয়েছে!`,
              `৳${claimed} (${payoutMethod}) withdrawal request submitted!`
            ),
        'success'
      );
      setIsPayoutModalOpen(false);
      setPayoutAccount('');
      setPayoutAmount('');
    } catch (err: any) {
      onShowToast(err?.message || t('ট্রান্সফার সম্পন্ন হয়নি', 'Payout failed'), 'error');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleAdminCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newCouponCode.trim()) return;
    setCreatingCoupon(true);
    try {
      const cleanCode = newCouponCode.trim().toUpperCase();
      const newCoupon: SMMCoupon = {
        id: 'CPN-' + Date.now().toString(36).toUpperCase(),
        code: cleanCode,
        rewardAmount: Math.max(1, Number(newCouponReward) || 25),
        maxUses: Math.max(1, Number(newCouponMaxUses) || 100),
        usedCount: 0,
        usedBy: [],
        active: true,
        description: newCouponDesc.trim() || undefined,
        createdAt: Date.now()
      };
      await saveCoupon(newCoupon);
      setNewCouponCode('');
      setNewCouponDesc('');
      onShowToast(
        t(`নতুন প্রোমো কোড (${cleanCode}) তৈরি হয়েছে!`, `New promo code (${cleanCode}) created!`),
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to create coupon', 'error');
    } finally {
      setCreatingCoupon(false);
    }
  };

  const sectionTabs: { id: SectionTab; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: t('সবগুলো', 'All Hub'), icon: Sparkles },
    { id: 'promo', label: t('প্রোমো ও ডেইলি বোনাস', 'Promo & Daily'), icon: Gift },
    { id: 'affiliate', label: t('রেফারেল ও শেয়ার', 'Refer & Share'), icon: Share2 },
    { id: 'vip', label: t('ভিআইপি ও মিশন', 'VIP & Missions'), icon: Trophy },
    { id: 'calculator', label: t('আয় ক্যালকুলেটর ও নেটওয়ার্ক', 'Calculator & Network'), icon: Calculator },
    { id: 'history', label: t('পেআউট ও হিস্ট্রি', 'Payout & History'), icon: Clock }
  ];

  const showPromo = activeTab === 'all' || activeTab === 'promo';
  const showAffiliate = activeTab === 'all' || activeTab === 'affiliate';
  const showVip = activeTab === 'all' || activeTab === 'vip';
  const showCalculator = activeTab === 'all' || activeTab === 'calculator';
  const showHistory = activeTab === 'all' || activeTab === 'history';

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12 overflow-x-hidden">
      {/* NATIVE MOBILE APP TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {t('প্রোমো, রিওয়ার্ড ও অ্যাফিলিয়েট হাব', 'Promo, Rewards & Affiliate Hub')}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${vipTier.color}`}>
                {language === 'bn' ? vipTier.nameBn : vipTier.nameEn}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t(
                `প্রোমো কোড রিডিম করুন, ডেইলি বোনাস নিন এবং বন্ধুদের আমন্ত্রণ জানিয়ে আজীবন ${effectiveCommissionRate}% কমিশন আয় করুন`,
                `Redeem gift codes, claim daily rewards & earn ${effectiveCommissionRate}% lifetime referral commission`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#111726] hover:bg-[#171F32] border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>{t('রেফারেল QR কোড', 'Invite QR')}</span>
          </button>
          <button
            type="button"
            onClick={handleNativeShare}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t('শেয়ার করুন', 'Quick Share')}</span>
          </button>
        </div>
      </div>

      {/* NATIVE MOBILE SEGMENTED NAVIGATION BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {sectionTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-[#111726] text-slate-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* HERO SUMMARY & INSTANT PAYOUT WALLET CARD */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#131B2E] via-[#0F1524] to-[#161B30] border border-indigo-500/25 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              {t('উত্তোলনযোগ্য অ্যাফিলিয়েট ব্যালেন্স', 'Available Affiliate Payout Balance')}
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                {formatPrice(unpaidEarnings)}
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                {effectiveCommissionRate}% {t('কমিশন রেট', 'Commission')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {t(
                `সর্বনিম্ন ট্রান্সফার বা বিকাশ/নগদ উত্তোলন সীমা: ${formatPrice(minPayout)}`,
                `Minimum wallet transfer or mobile banking withdrawal: ${formatPrice(minPayout)}`
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (!profile) {
                  onOpenAuth();
                  return;
                }
                setPayoutMode('wallet_transfer');
                setPayoutAmount(String(unpaidEarnings || minPayout));
                setIsPayoutModalOpen(true);
              }}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Wallet className="w-4 h-4" />
              <span>{t('ওয়ালেটে ট্রান্সফার', 'Transfer to Wallet')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!profile) {
                  onOpenAuth();
                  return;
                }
                setPayoutMode('mobile_banking_withdraw');
                setPayoutAmount(String(unpaidEarnings || minPayout));
                setIsPayoutModalOpen(true);
              }}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-2xl bg-[#1A233A] hover:bg-[#222D49] border border-white/10 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-rose-400" />
              <span>{t('বিকাশ / নগদে উত্তোলন', 'bKash / Nagad Cashout')}</span>
            </button>
          </div>
        </div>

        {/* Payout Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">
              {t('পেআউট লক্ষ্যমাত্রা অগ্রগতি', 'Minimum Payout Threshold Progress')}
            </span>
            <span className="font-mono font-bold text-emerald-400">{payoutProgressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900/90 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${payoutProgressPercent}%` }}
            />
          </div>
        </div>

        {/* 4 Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3.5 rounded-2xl bg-[#0B0F1A]/90 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {t('ভেরিফাইড রেফারেল', 'Verified Referrals')}
            </span>
            <p className="text-lg font-extrabold text-white font-mono mt-0.5">
              {referralCount} {t('জন', 'Verified')}
            </p>
            {pendingReferralsCount > 0 && (
              <span className="text-[10px] text-amber-400 font-medium block mt-0.5">
                {t(`পেন্ডিং: ${pendingReferralsCount} জন (৳১০০ ডিপোজিট বাকি)`, `${pendingReferralsCount} Pending (<৳100)`)}
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0B0F1A]/90 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {t('মোট রেফারেল আয়', 'Lifetime Affiliate Earned')}
            </span>
            <p className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5">
              {formatPrice(totalReferralEarned)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0B0F1A]/90 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {t('প্রোমো ও বোনাস জয়', 'Promo & Bonus Claimed')}
            </span>
            <p className="text-lg font-extrabold text-rose-400 font-mono mt-0.5">
              {formatPrice(totalPromoBonusEarned)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0B0F1A]/90 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {t('প্রতি ভেরিফাইড রেফার বোনাস', 'Per Verified Referral')}
            </span>
            <p className="text-lg font-extrabold text-amber-400 font-mono mt-0.5">
              +৳10
            </p>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              {t('ন্যূনতম ৳১০০ ডিপোজিট আবশ্যক', 'Min ৳100 deposit required')}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODULE 1: DAILY CHECK-IN & PROMO CODE REDEMPTION CENTER  */}
      {/* ======================================================== */}
      {showPromo && (
        <div className="space-y-5">
          {/* 7-Day Daily Promo Streak Card */}
          <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">
                      {t('ডেইলি প্রোমো চেক-ইন ও লাকি বোনাস', 'Daily Promo Check-In & Streak Bonus')}
                    </h2>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold">
                      {t(`স্ট্রিক: ${currentStreak}/৭ দিন`, `Streak: ${currentStreak}/7 Days`)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t(
                      'প্রতিদিন অ্যাপে প্রবেশ করে ফ্রি ওয়ালেট বোনাস ক্লেইম করুন — ৭ম দিনে মেগা ৳১০ বোনাস!',
                      'Check in daily to claim free wallet balance — unlock ৳10 Mega Bonus on Day 7!'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={dailyLoading || (Boolean(profile) && !canClaimDaily)}
                onClick={handleClaimDailyBonus}
                className={`py-2.5 px-4 rounded-2xl font-bold text-xs transition-all shrink-0 flex items-center justify-center gap-1.5 ${
                  !profile || canClaimDaily
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-400 cursor-not-allowed border border-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {dailyLoading
                    ? t('যোগ হচ্ছে...', 'Claiming...')
                    : !profile || canClaimDaily
                    ? t('আজকের ফ্রি বোনাস নিন', 'Claim Today Bonus')
                    : t('আজকের বোনাস নেওয়া হয়েছে', 'Claimed for Today')}
                </span>
              </button>
            </div>

            {/* 7-Day Visual Strip */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {DAILY_STREAK_REWARDS.map((item) => {
                const isCompleted = currentStreak >= item.day;
                const isNext = (currentStreak % 7) + 1 === item.day && canClaimDaily;
                return (
                  <div
                    key={item.day}
                    className={`p-2 sm:p-2.5 rounded-2xl border text-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                        : isNext
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-400/30'
                        : 'bg-[#0B0F1A] border-white/[0.06] text-slate-400'
                    }`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase block opacity-80">
                      {t(`দিন ${item.day}`, `Day ${item.day}`)}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold font-mono block mt-1 text-white">
                      +৳{item.reward}
                    </span>
                    <span className="text-[9px] block mt-0.5">
                      {isCompleted ? '✓' : item.day === 7 ? '🎁' : '•'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gift Coupon / Promo Code Redemption Vault */}
          <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-4 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {t('গিফট কুপন ও প্রোমো কোড রিডিম করুন', 'Redeem Gift Coupon & Promo Code')}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {t(
                      'প্রোমো কোড বা গিফট ভাউচার ব্যবহার করে তাৎক্ষণিক ফ্রি ওয়ালেট ব্যালেন্স নিন',
                      'Enter any active promo code for instant free wallet balance'
                    )}
                  </p>
                </div>
              </div>
              {activeCoupons.length > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  {activeCoupons.length} {t('টি সক্রিয় কোড', 'Active Codes')}
                </span>
              )}
            </div>

            <form onSubmit={(e) => handleRedeemCoupon(e)} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  placeholder={t('প্রোমো কোড লিখুন (যেমন: WELCOME50, BOOST25)', 'Enter Promo Code (e.g. WELCOME50)')}
                  className="w-full bg-[#090D16] border border-white/10 focus:border-rose-500 rounded-2xl pl-4 pr-20 py-3 text-xs font-mono font-bold text-white uppercase placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handlePastePromo}
                  className="absolute right-2 px-2.5 py-1.5 rounded-xl bg-[#171F32] hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1"
                >
                  <ClipboardPaste className="w-3 h-3 text-rose-400" />
                  <span>{t('পেস্ট', 'Paste')}</span>
                </button>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={promoLoading || !promoCodeInput.trim()}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all whitespace-nowrap shrink-0"
              >
                {promoLoading
                  ? t('যাচাই হচ্ছে...', 'Verifying...')
                  : t('প্রোমো বোনাস নিন', 'Redeem Code')}
              </motion.button>
            </form>

            {/* Available Active Coupons Ticket Cards */}
            {activeCoupons.length > 0 ? (
              <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                <span className="text-[11px] font-bold text-slate-300 block">
                  {t('সক্রিয় প্রোমো ভাউচারসমূহ (ক্লিক করে রিডিম করুন):', 'Available Promo Vouchers (Tap to Apply):')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeCoupons.map((cp) => {
                    const alreadyUsed = profile ? cp.usedBy?.includes(profile.uid) : false;
                    const remaining = Math.max(0, cp.maxUses - cp.usedCount);
                    const usedPercent = Math.min(100, Math.round((cp.usedCount / cp.maxUses) * 100));
                    return (
                      <div
                        key={cp.id}
                        className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${
                          alreadyUsed
                            ? 'bg-[#090D16]/60 border-white/5 opacity-60'
                            : 'bg-[#090D16] border-emerald-500/25 hover:border-emerald-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 font-mono text-xs font-extrabold text-emerald-400">
                                {cp.code}
                              </span>
                              <span className="text-sm font-extrabold font-mono text-white">
                                +{formatPrice(cp.rewardAmount)}
                              </span>
                            </div>
                            {cp.description && (
                              <p className="text-[11px] text-slate-400 mt-1">{cp.description}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={alreadyUsed || promoLoading}
                            onClick={(e) => {
                              setPromoCodeInput(cp.code);
                              handleRedeemCoupon(e, cp.code);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                              alreadyUsed
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow'
                            }`}
                          >
                            {alreadyUsed
                              ? t('ব্যবহৃত ✓', 'Claimed ✓')
                              : t('বোনাস নিন', 'Claim Now')}
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>
                              {t(`বাকি আছে: ${remaining} টি`, `${remaining} vouchers left`)}
                            </span>
                            <span>
                              {cp.usedCount}/{cp.maxUses} {t('ব্যবহৃত', 'claimed')}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full"
                              style={{ width: `${100 - usedPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#090D16] border border-white/[0.05] flex items-center justify-between text-xs text-slate-400">
                <span>
                  {t(
                    'আপনার কাছে কোনো প্রোমো বা গিফট কোড থাকলে উপরের বক্সে লিখে সাথে সাথে বোনাস নিন।',
                    'Have a special promo or event voucher code? Enter it above to claim instant balance.'
                  )}
                </span>
              </div>
            )}

            {/* Deposit Bonus Offers Showcase */}
            <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-[#090D16] border border-indigo-500/25 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-300 block">
                    {t('বিকাশ ও নগদ ডিপোজিট অফার', 'bKash & Nagad Deposit Offer')}
                  </span>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {siteSettings.bkashBonusPercent > 0
                      ? t(
                          `প্রতিটি ডিপোজিটে +${siteSettings.bkashBonusPercent}% এক্সট্রা বোনাস!`,
                          `Get +${siteSettings.bkashBonusPercent}% extra bonus on deposits!`
                        )
                      : t('বিকাশ ও নগদে তাৎক্ষণিক ফ্রি অটো-ডিপোজিট', '0% Fee Instant Wallet Deposit')}
                  </p>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('add-funds')}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shrink-0"
                  >
                    {t('ব্যালেন্স যোগ', 'Add Funds')}
                  </button>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/50 to-[#090D16] border border-emerald-500/25 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-300 block">
                    {t('ভেরিফাইড রেফারেল বোনাস', 'Verified Referral Bonus')}
                  </span>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {t(
                      'প্রতি রেফার ইউজার ৳১০০ ডিপোজিট করলেই ভেরিফাইড রেফার ও +৳১০ বোনাস!',
                      'Each referred user depositing ৳100+ counts as Verified & unlocks +৳10!'
                    )}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 font-mono text-xs font-extrabold shrink-0">
                  +৳10
                </span>
              </div>
            </div>
          </div>

          {/* Admin Inline Promo Code Creator (Visible only to Admin) */}
          {isAdmin && (
            <div className="p-5 rounded-3xl bg-[#111726] border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  {t('অ্যাডমিন কুপন ও প্রোমো কোড জেনারেটর', 'Admin Quick Promo Code Generator')}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {coupons.length} {t('টি মোট কুপন', 'Total Coupons')}
                </span>
              </div>

              <form onSubmit={handleAdminCreateCoupon} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  placeholder={t('কোড (যেমন: BOOST50)', 'Code (e.g. BOOST50)')}
                  className="bg-[#090D16] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white uppercase"
                />
                <input
                  type="number"
                  min={1}
                  value={newCouponReward}
                  onChange={(e) => setNewCouponReward(e.target.value)}
                  placeholder={t('বোনাস টাকা (৳)', 'Reward BDT (৳)')}
                  className="bg-[#090D16] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white"
                />
                <input
                  type="number"
                  min={1}
                  value={newCouponMaxUses}
                  onChange={(e) => setNewCouponMaxUses(e.target.value)}
                  placeholder={t('সর্বোচ্চ ব্যবহার সংখ্যা', 'Max Uses')}
                  className="bg-[#090D16] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white"
                />
                <button
                  type="submit"
                  disabled={creatingCoupon || !newCouponCode.trim()}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{creatingCoupon ? t('তৈরি হচ্ছে...', 'Creating...') : t('কুপন তৈরি করুন', 'Create Coupon')}</span>
                </button>
              </form>

              {coupons.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {coupons.map((c) => (
                    <div
                      key={c.id}
                      className="px-3 py-1.5 rounded-xl bg-[#090D16] border border-white/10 flex items-center gap-2 text-xs"
                    >
                      <span className="font-mono font-bold text-emerald-400">{c.code}</span>
                      <span className="text-white font-mono">৳{c.rewardAmount}</span>
                      <span className="text-[10px] text-slate-400">
                        ({c.usedCount}/{c.maxUses})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCoupon(c.id)}
                        className="text-rose-400 hover:text-rose-300 p-0.5"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODULE 2: AFFILIATE SHARE HUB, CUSTOM CODE & TEMPLATES   */}
      {/* ======================================================== */}
      {showAffiliate && (
        <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                {t('রেফারেল লিঙ্ক, কাস্টম কোড ও ওয়ান-ট্যাপ শেয়ারিং', 'Referral Link, Custom Code & 1-Tap Sharing')}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t(
                  `প্রতি রেফারকৃত ইউজার ন্যূনতম ৳১০০ ডিপোজিট করলে সেটি ভেরিফাইড রেফারেল হবে এবং আপনি পাবেন তাৎক্ষণিক ৳১০ বোনাস + আজীবন ${effectiveCommissionRate}% ডিপোজিট কমিশন!`,
                  `When your referred friend deposits at least ৳100, the referral is verified and you earn ৳10 instant bonus + ${effectiveCommissionRate}% lifetime deposit commission!`
                )}
              </p>
            </div>
          </div>

          {/* Mandatory Verification Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-slate-200 leading-relaxed">
              <span className="font-bold text-amber-300">
                {t('ভেরিফাইড রেফারেল শর্তাবলী: ', 'Verified Referral Rule: ')}
              </span>
              {t(
                'শুধু রেফার করলে বা অ্যাকাউন্ট খুললে সেটি ভেরিফাইড রেফার হিসেবে গণ্য হবে না। প্রতি রেফারকৃত ইউজারকে কমপক্ষে ৳১০০ ডিপোজিট করতে হবে। ৳১০০ ডিপোজিট সম্পন্ন হলেই রেফারেল ভেরিফাইড হবে এবং প্রতি রেফারে ৳১০ করে বোনাস যোগ হবে।',
                'Simply signing up does not count as a verified referral. Each referred user must deposit at least ৳100 to become a verified referral and unlock the ৳10 referral reward.'
              )}
            </div>
          </div>

          {/* Referral Code & Link Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Custom Referral Code Box */}
            <div className="p-4 rounded-2xl bg-[#090D16] border border-white/[0.07] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {t('আপনার রেফারেল কোড', 'Your Invite Code')}
                </span>
                {profile && !isEditingCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomCodeInput(myReferralCode);
                      setIsEditingCode(true);
                    }}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{t('নিজের নামে কোড বানান', 'Customize Code')}</span>
                  </button>
                )}
              </div>

              {!isEditingCode ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-mono font-extrabold text-emerald-400 select-all tracking-wide">
                    {myReferralCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(myReferralCode, t('রেফারেল কোড', 'Referral Code'))}
                    className="py-2 px-3.5 rounded-xl bg-[#171F32] hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('কপি কোড', 'Copy Code')}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveCustomCode} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customCodeInput}
                    onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                    placeholder="BL-YOURNAME"
                    maxLength={16}
                    className="flex-1 bg-[#111726] border border-indigo-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white uppercase focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={savingCustomCode}
                    className="p-2 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingCode(false)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-300"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Referral Invite Link Box */}
            <div className="p-4 rounded-2xl bg-[#090D16] border border-white/[0.07] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {t('ডাইরেক্ট রেফারেল ইনভাইট লিঙ্ক', 'Direct Referral Invite Link')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <QrCode className="w-3 h-3" />
                  <span>{t('QR দেখুন', 'Show QR')}</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-200 truncate block select-all">
                  {myReferralLink}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(myReferralLink, t('রেফারেল লিঙ্ক', 'Invite Link'))}
                  className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t('লিঙ্ক কপি', 'Copy Link')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1-Tap Social Media Direct Share Buttons */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-300 block">
              {t('এক ক্লিকে সোশ্যাল মিডিয়ায় শেয়ার করুন:', '1-Tap Direct Social Share:')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(promoTemplates[1].text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp শেয়ার</span>
              </a>

              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(myReferralLink)}&text=${encodeURIComponent(promoTemplates[1].text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3.5 rounded-2xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Telegram শেয়ার</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(myReferralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Facebook পোস্ট</span>
              </a>

              <button
                type="button"
                onClick={handleNativeShare}
                className="py-2.5 px-3.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>{t('অন্যান্য অ্যাপে শেয়ার', 'More Apps')}</span>
              </button>
            </div>
          </div>

          {/* Ready-to-Use Promotional Copy Templates */}
          <div className="pt-2 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {t('রেডিমেড প্রমোশনাল মেসেজ ও পোস্ট টেমপ্লেট', 'Ready-to-Copy Promotional Post Templates')}
              </span>
              <span className="text-[10px] text-slate-400">
                {t('আপনার লিঙ্ক অটো-যুক্ত করা আছে', 'Pre-filled with your link')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {promoTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3.5 rounded-2xl bg-[#090D16] border border-white/[0.06] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{tpl.title}</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 text-[10px] font-bold">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 whitespace-pre-line line-clamp-4 leading-relaxed">
                      {tpl.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(tpl.text, tpl.title)}
                    className="w-full py-2 rounded-xl bg-[#171F32] hover:bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('পোস্টটি কপি করুন', 'Copy Promo Text')}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Link a Friend's Referral Code (If user hasn't linked one yet) */}
          {(!profile || !profile.referredBy) && (
            <form
              onSubmit={handleApplyFriendReferral}
              className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-[#090D16] border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4" />
                  {t('বন্ধুর রেফারেল কোড আছে? যুক্ত করে ৳১০ ভেরিফাইড বোনাস নিন!', 'Have a Friend Invite Code? Link & Unlock ৳10 Bonus!')}
                </span>
                <p className="text-[11px] text-slate-400">
                  {t(
                    'বন্ধুর কোড যুক্ত করে ন্যূনতম ৳১০০ ডিপোজিট করলেই রেফারেল ভেরিফাইড হবে এবং ৳১০ বোনাস পাবেন',
                    'Link a friend referral code and deposit at least ৳100 to verify and receive ৳10 bonus'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={friendRefCode}
                  onChange={(e) => setFriendRefCode(e.target.value.toUpperCase())}
                  placeholder={t('রেফারেল কোড (BL-...)', 'Invite Code (BL-...)')}
                  className="bg-[#090D16] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white uppercase placeholder-slate-500 focus:outline-none w-40 sm:w-44"
                />
                <button
                  type="submit"
                  disabled={refLoading || !friendRefCode.trim()}
                  className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs whitespace-nowrap"
                >
                  {refLoading ? t('যুক্ত হচ্ছে...', 'Linking...') : t('কোড যুক্ত করুন', 'Link Code')}
                </button>
              </div>
            </form>
          )}

          {/* If user has linked a referral code but hasn't deposited ৳100 yet */}
          {profile?.referredBy && !profile.referralVerified && (profile.totalDeposited || 0) < 100 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-300 block">
                  {t('আপনার রেফারেল স্ট্যাটাস: পেন্ডিং (৳১০০ ডিপোজিট প্রয়োজন)', 'Your Referral Status: Pending (৳100 Deposit Required)')}
                </span>
                <p className="text-[11px] text-slate-300">
                  {t(
                    `আপনি এ পর্যন্ত ডিপোজিট করেছেন: ${formatPrice(profile.totalDeposited || 0)}। রেফারেল ভেরিফাই করতে কমপক্ষে ৳১০০ ডিপোজিট সম্পন্ন করুন।`,
                    `Deposited so far: ${formatPrice(profile.totalDeposited || 0)}. Complete ৳100 deposit to verify your referral.`
                  )}
                </p>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('add-funds')}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs whitespace-nowrap shrink-0"
                >
                  {t('৳১০০ ডিপোজিট করুন', 'Deposit ৳100 Now')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODULE 3: VIP PARTNER TIERS & MILESTONE MISSIONS         */}
      {/* ======================================================== */}
      {showVip && (
        <div className="space-y-5">
          {/* Multi-Level VIP Partner Ranks */}
          <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-4 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {t('অ্যাফিলিয়েট ভিআইপি পার্টনার লেভেল', 'Affiliate VIP Partner Tiers')}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {t(
                      'যত বেশি রেফার করবেন, আপনার আজীবন কমিশন রেট তত বাড়তে থাকবে!',
                      'Unlock higher lifetime commission rates as you invite more friends!'
                    )}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-300">
                {t(`আপনার বর্তমান রেট: ${effectiveCommissionRate}%`, `Your Active Rate: ${effectiveCommissionRate}%`)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {[
                {
                  level: 1,
                  name: t('স্টার্টার', 'Starter'),
                  req: t('০ - ৪ রেফারেল', '0 - 4 Referrals'),
                  rate: `${baseCommission}%`,
                  signup: '৳15',
                  active: vipTier.level === 1
                },
                {
                  level: 2,
                  name: t('সিলভার ভিআইপি', 'Silver VIP'),
                  req: t('৫ - ১৯ রেফারেল', '5 - 19 Referrals'),
                  rate: `${baseCommission + 2}%`,
                  signup: '৳20',
                  active: vipTier.level === 2
                },
                {
                  level: 3,
                  name: t('গোল্ড ভিআইপি', 'Gold VIP'),
                  req: t('২০ - ৪৯ রেফারেল', '20 - 49 Referrals'),
                  rate: `${baseCommission + 5}%`,
                  signup: '৳25',
                  active: vipTier.level === 3
                },
                {
                  level: 4,
                  name: t('ডায়মন্ড অ্যাম্বাসেডর', 'Diamond VIP'),
                  req: t('৫০+ রেফারেল', '50+ Referrals'),
                  rate: `${baseCommission + 10}%`,
                  signup: '৳30',
                  active: vipTier.level === 4
                }
              ].map((tier) => (
                <div
                  key={tier.level}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    tier.active
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                      : 'bg-[#090D16] border-white/[0.06] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white">{tier.name}</span>
                    {tier.active && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                        {t('বর্তমান', 'ACTIVE')}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{tier.req}</p>
                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t('কমিশন:', 'Commission:')}</span>
                    <span className="font-mono font-extrabold text-emerald-400">{tier.rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Claimable Referral Milestone Missions */}
          <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {t('রেফারেল মাইলস্টোন ও বোনাস মিশন', 'Referral Milestone Missions & Cash Rewards')}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {t(
                      'কমিশনের পাশাপাশি নির্দিষ্ট সংখ্যক রেফারেল পূর্ণ করলেই অতিরিক্ত নগদ বোনাস ক্লেইম করুন!',
                      'Claim extra instant cash bonuses on top of your commission when you hit referral targets!'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {MILESTONES.map((m) => {
                const isClaimed = profile?.claimedMilestones?.includes(m.id) || false;
                const isUnlocked = referralCount >= m.target;
                const progress = Math.min(100, Math.round((referralCount / m.target) * 100));

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isClaimed
                        ? 'bg-[#090D16]/70 border-emerald-500/25'
                        : isUnlocked
                        ? 'bg-gradient-to-r from-emerald-950/40 to-[#090D16] border-emerald-500/50'
                        : 'bg-[#090D16] border-white/[0.06]'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] font-mono font-bold text-indigo-300">
                          {m.badge}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-white">
                          {language === 'bn' ? m.titleBn : m.titleEn}
                        </h3>
                        <span className="text-xs font-mono font-extrabold text-emerald-400">
                          +{formatPrice(m.reward)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {language === 'bn' ? m.descBn : m.descEn}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden max-w-xs">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {Math.min(referralCount, m.target)}/{m.target} {t('জন', 'refs')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isClaimed || !isUnlocked || claimingMilestoneId === m.id}
                      onClick={() => handleClaimMilestone(m)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition-all ${
                        isClaimed
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : isUnlocked
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {claimingMilestoneId === m.id
                        ? t('ক্লেইম হচ্ছে...', 'Claiming...')
                        : isClaimed
                        ? t('বোনাস গৃহীত ✓', 'Claimed ✓')
                        : isUnlocked
                        ? t(`৳${m.reward} ক্লেইম করুন`, `Claim ৳${m.reward}`)
                        : t(`${m.target - referralCount} জন বাকি`, `${m.target - referralCount} More Needed`)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODULE 4: INTERACTIVE EARNINGS CALCULATOR & NETWORK      */}
      {/* ======================================================== */}
      {showCalculator && (
        <div className="space-y-5">
          {/* Interactive Affiliate Earnings Calculator */}
          <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {t('ইন্টারেক্টিভ অ্যাফিলিয়েট আয় ক্যালকুলেটর', 'Interactive Affiliate Income Calculator')}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {t(
                    'আপনি কতজন বন্ধু রেফার করলে মাসে এবং বছরে কত টাকা আয় করতে পারবেন তা হিসাব করে দেখুন',
                    'Estimate your monthly and yearly passive income from referrals'
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-[#090D16] border border-white/[0.06] space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold">
                      {t('আমন্ত্রিত সক্রিয় বন্ধুর সংখ্যা:', 'Invited Active Friends:')}
                    </span>
                    <span className="font-mono font-extrabold text-indigo-400">
                      {calcFriends} {t('জন', 'Friends')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={150}
                    value={calcFriends}
                    onChange={(e) => setCalcFriends(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold">
                      {t('প্রতি বন্ধুর মাসিক গড় অর্ডার/ডিপোজিট:', 'Avg. Monthly Deposit per Friend:')}
                    </span>
                    <span className="font-mono font-extrabold text-emerald-400">
                      {formatPrice(calcAvgDeposit)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={25000}
                    step={500}
                    value={calcAvgDeposit}
                    onChange={(e) => setCalcAvgDeposit(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/50 to-[#090D16] border border-indigo-500/25 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t('মাসিক প্যাসিভ কমিশন', 'Monthly Commission')}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold font-mono text-emerald-400 mt-0.5 block">
                    {formatPrice(calculatorResults.monthlyCommission)}/mo
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t('সাইনআপ ও মাইলস্টোন বোনাস', 'Signup + Milestone Bonus')}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold font-mono text-amber-400 mt-0.5 block">
                    +{formatPrice(calculatorResults.signupInstant + calculatorResults.milestoneBonus)}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {t('সম্ভাব্য বাৎসরিক মোট আয়:', 'Estimated Yearly Earnings:')}
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold font-mono text-cyan-400">
                    {formatPrice(calculatorResults.yearlyTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Referred Users Network & Top Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* My Referred Friends Network */}
            <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  {t('আমার রেফার করা ইউজার তালিকা', 'My Referred Friends Network')}
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {t(`ভেরিফাইড: ${referralCount} জন`, `Verified: ${referralCount}`)}
                </span>
              </div>

              {loadingNetwork ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {t('নেটওয়ার্ক তালিকা লোড হচ্ছে...', 'Loading referral network...')}
                </div>
              ) : referredUsers.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {referredUsers.map((ru) => (
                    <div
                      key={ru.uid}
                      className="p-3 rounded-2xl bg-[#090D16] border border-white/[0.06] flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{ru.displayName}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {ru.maskedEmail} • {t('ডিপোজিট:', 'Deposited:')} ৳{ru.totalDeposited}
                        </p>
                      </div>
                      <div className="text-right">
                        {ru.referralVerified ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                            {t('ভেরিফাইড ✓ (+৳১০)', 'Verified ✓ (+৳10)')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                            {t('আনভেরিফাইড (৳১০০ ডিপোজিট বাকি)', 'Unverified (<৳100 Deposit)')}
                          </span>
                        )}
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(ru.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#090D16] border border-white/[0.05] text-center space-y-2">
                  <p className="text-xs font-bold text-slate-300">
                    {t('এখনো কোনো বন্ধু আপনার লিঙ্কে জয়েন করেনি', 'No referred friends yet')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t(
                      'উপরের রেফারেল লিঙ্ক শেয়ার করুন — বন্ধু জয়েন করে ৳১০০ ডিপোজিট করলেই ভেরিফাইড রেফার ও ৳১০ বোনাস পাবেন!',
                      'Share your invite link — earn ৳10 bonus + lifetime commission when a friend deposits ৳100!'
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Top Affiliate Partners Leaderboard */}
            <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  {t('সেরা অ্যাফিলিয়েট লিডারবোর্ড', 'Top Affiliate Leaderboard')}
                </h3>
                <span className="text-[10px] font-bold uppercase text-amber-400">
                  {t('টপ আর্নার্স', 'Top Earners')}
                </span>
              </div>

              <div className="space-y-2">
                {leaderboardList.map((partner, idx) => (
                  <div
                    key={partner.id}
                    className="p-3 rounded-2xl bg-[#090D16] border border-white/[0.06] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center ${
                          idx === 0
                            ? 'bg-amber-500 text-slate-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white">{partner.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {partner.referrals} {t('জন রেফারেল', 'Referrals')} • {partner.tier}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-emerald-400">
                      {formatPrice(partner.earnings)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODULE 5: PAYOUT & REWARD HISTORY + 3-STEP GUIDE         */}
      {/* ======================================================== */}
      {showHistory && (
        <div className="space-y-5">
          {/* Payout & Bonus Claim History */}
          <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {t('প্রোমো, বোনাস ও পেআউট হিস্ট্রি', 'Promo, Bonus & Payout History')}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {t(
                      'আপনার সকল প্রোমো কোড রিডিম, ডেইলি বোনাস, মাইলস্টোন এবং ক্যাশআউট রেকর্ড',
                      'Complete ledger of your coupon redemptions, daily rewards, and payouts'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {profile?.payoutHistory && profile.payoutHistory.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {profile.payoutHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#090D16] border border-white/[0.06] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {item.note || item.method || 'Reward Bonus'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {item.status === 'completed'
                            ? t('সম্পন্ন', 'Completed')
                            : t('প্রসেসিং', 'Pending')}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        #{item.id} • {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-extrabold text-emerald-400 shrink-0">
                      +{formatPrice(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#090D16] border border-white/[0.05] text-center text-xs text-slate-400">
                {t(
                  'এখনো কোনো প্রোমো বা পেআউট ট্রানজেকশন নেই। ডেইলি চেক-ইন বা প্রোমো কোড ব্যবহার করে শুরু করুন!',
                  'No reward or payout records yet. Claim your Daily Check-In bonus above to get started!'
                )}
              </div>
            )}
          </div>

          {/* 3-Step Visual Guide & Rules */}
          <div className="p-5 rounded-3xl bg-[#111726] border border-white/[0.07] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              {t('কীভাবে প্রোমো ও অ্যাফিলিয়েট থেকে সর্বোচ্চ আয় করবেন?', 'How Promo & Affiliate Program Works')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#090D16] border border-white/[0.06] space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 font-mono text-[10px] font-bold">
                  STEP 01
                </span>
                <h4 className="text-xs font-bold text-white">
                  {t('লিঙ্ক বা কোড শেয়ার করুন', 'Share Your Invite Link')}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'আপনার কাস্টম রেফারেল লিঙ্ক বা QR কোড ফেসবুক, হোয়াটসঅ্যাপ ও বন্ধুদের মাঝে শেয়ার করুন।',
                    'Share your custom invite link or QR code on WhatsApp, Facebook, or YouTube.'
                  )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#090D16] border border-white/[0.06] space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold">
                  STEP 02
                </span>
                <h4 className="text-xs font-bold text-white">
                  {t('৳১০০ ডিপোজিটে ভেরিফাইড ও ৳১০ বোনাস', '৳100 Deposit Verifies & Unlocks ৳10')}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'রেফারকৃত ইউজার কমপক্ষে ৳১০০ ডিপোজিট করলে রেফারেল ভেরিফাইড হবে এবং প্রতি ভেরিফাইড রেফারে ৳১০ বোনাস + আজীবন কমিশন পাবেন।',
                    'Once your referred friend deposits at least ৳100, the referral is verified and you receive ৳10 bonus + lifetime commission.'
                  )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#090D16] border border-white/[0.06] space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 font-mono text-[10px] font-bold">
                  STEP 03
                </span>
                <h4 className="text-xs font-bold text-white">
                  {t('ওয়ালেট বা বিকাশে উত্তোলন', 'Instant Wallet or bKash Payout')}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'আয়কৃত টাকা ১ ক্লিকে মেইন ওয়ালেটে নিয়ে অর্ডার করুন অথবা বিকাশ/নগদে ক্যাশআউট করুন।',
                    'Transfer earnings instantly to your main wallet or request direct bKash/Nagad payout.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: PAYOUT / TRANSFER NATIVE MOBILE SHEET           */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isPayoutModalOpen && (
          <div
            onClick={() => setIsPayoutModalOpen(false)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#111726] border border-white/10 p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white">
                  {t('রেফারেল আয় ট্রান্সফার ও উত্তোলন', 'Affiliate Earnings Payout')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="p-2 rounded-xl bg-[#171F32] text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#090D16] border border-white/5">
                <button
                  type="button"
                  onClick={() => setPayoutMode('wallet_transfer')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                    payoutMode === 'wallet_transfer'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('মেইন ওয়ালেট (তাৎক্ষণিক)', 'Main Wallet (Instant)')}
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMode('mobile_banking_withdraw')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                    payoutMode === 'mobile_banking_withdraw'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('বিকাশ / নগদ উত্তোলন', 'bKash / Nagad')}
                </button>
              </div>

              <form onSubmit={handleExecutePayout} className="space-y-3.5">
                {payoutMode === 'mobile_banking_withdraw' && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {(['bKash', 'Nagad', 'Rocket'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPayoutMethod(m)}
                          className={`py-2 rounded-xl text-xs font-bold border ${
                            payoutMethod === m
                              ? 'bg-indigo-600/20 border-indigo-500 text-white'
                              : 'bg-[#090D16] border-white/10 text-slate-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        {t(`আপনার ${payoutMethod} পার্সোনাল নম্বর`, `Your ${payoutMethod} Account Number`)}
                      </label>
                      <input
                        type="tel"
                        required
                        value={payoutAccount}
                        onChange={(e) => setPayoutAccount(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full bg-[#090D16] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-300">{t('পরিমাণ (৳)', 'Amount (BDT)')}</span>
                    <span className="text-emerald-400 font-mono">
                      {t('উত্তোলনযোগ্য:', 'Available:')} {formatPrice(unpaidEarnings)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={minPayout}
                    max={Math.max(minPayout, unpaidEarnings)}
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full bg-[#090D16] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={claimLoading || unpaidEarnings < minPayout}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs transition-all"
                >
                  {claimLoading
                    ? t('প্রসেসিং হচ্ছে...', 'Processing...')
                    : payoutMode === 'wallet_transfer'
                    ? t('মেইন ওয়ালেটে ট্রান্সফার নিশ্চিত করুন', 'Confirm Instant Wallet Transfer')
                    : t(`${payoutMethod}-এ ক্যাশআউট রিকোয়েস্ট পাঠান`, `Submit ${payoutMethod} Cashout`)}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: REFERRAL QR CODE CARD                           */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div
            onClick={() => setIsQrModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-[#111726] border border-white/10 p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">
                  Boostlagbe.com Invite QR
                </span>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="p-1.5 rounded-xl bg-[#171F32] text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-3xl bg-white mx-auto w-52 h-52 flex items-center justify-center shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(myReferralLink)}`}
                  alt={`QR Code for ${myReferralCode}`}
                  className="w-44 h-44 object-contain"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400">{t('রেফারেল কোড', 'Invite Code')}</p>
                <p className="text-lg font-mono font-extrabold text-emerald-400">{myReferralCode}</p>
                <p className="text-[11px] text-slate-400">
                  {t(
                    'বন্ধুর ফোনের ক্যামেরা দিয়ে স্ক্যান করলেই সরাসরি ৳২৫ বোনাসসহ জয়েন পেজ ওপেন হবে!',
                    'Scan with any phone camera to open Boostlagbe.com with your ৳25 bonus code!'
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(myReferralLink, t('রেফারেল লিঙ্ক', 'Invite Link'))}
                  className="flex-1 py-2.5 rounded-xl bg-[#171F32] hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t('লিঙ্ক কপি', 'Copy Link')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t('শেয়ার করুন', 'Share')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
