import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Zap,
  Layers,
  LogIn,
  UserPlus,
  Gift,
  Globe,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ClipboardPaste
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { BRAND_LOGO_URL } from '../../data/seedServices';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
  initialMode?: 'login' | 'register' | 'reset';
}

const QUICK_EMAIL_DOMAINS = ['@gmail.com', '@yahoo.com', '@outlook.com'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
  initialMode = 'login'
}) => {
  const {
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    language,
    setLanguage
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [referralCode, setReferralCode] = useState(() => {
    try {
      return sessionStorage.getItem('boostlagbe_ref_code') || '';
    } catch {
      return '';
    }
  });
  const [showReferralInput, setShowReferralInput] = useState(() => {
    try {
      return Boolean(sessionStorage.getItem('boostlagbe_ref_code'));
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setResetSent(false);
      try {
        const storedRef = sessionStorage.getItem('boostlagbe_ref_code');
        if (storedRef) {
          setReferralCode(storedRef);
          setShowReferralInput(true);
        }
      } catch {
        // Ignore storage error
      }
    }
  }, [isOpen, initialMode]);

  const passwordChecks = useMemo(() => {
    const hasMinLen = password.length >= 6;
    const hasGoodLen = password.length >= 8;
    const hasNumberOrUpper = /[0-9]/.test(password) || /[A-Z]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (hasMinLen) score++;
    if (hasGoodLen) score++;
    if (hasNumberOrUpper) score++;
    if (hasSpecial) score++;

    let label = '';
    let color = 'bg-slate-800';
    let textColor = 'text-slate-400';

    if (password.length > 0) {
      if (score <= 1) {
        label = language === 'bn' ? 'দুর্বল পাসওয়ার্ড' : 'Weak password';
        color = 'bg-[#F87171]';
        textColor = 'text-[#F87171]';
      } else if (score === 2) {
        label = language === 'bn' ? 'মাঝারি পাসওয়ার্ড' : 'Fair password';
        color = 'bg-[#FBBF24]';
        textColor = 'text-[#FBBF24]';
      } else if (score === 3) {
        label = language === 'bn' ? 'ভালো পাসওয়ার্ড' : 'Good password';
        color = 'bg-[#38BDF8]';
        textColor = 'text-[#38BDF8]';
      } else {
        label = language === 'bn' ? 'শক্তিশালী পাসওয়ার্ড' : 'Strong password';
        color = 'bg-[#4ADE80]';
        textColor = 'text-[#4ADE80]';
      }
    }

    return {
      score,
      hasMinLen,
      hasNumberOrUpper,
      label,
      color,
      textColor
    };
  }, [password, language]);

  const formatAuthError = (err: any): string => {
    const code = String(err?.code || '');
    const rawMsg = String(err?.message || '');

    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      return language === 'bn'
        ? 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে পুনরায় যাচাই করুন।'
        : 'Invalid email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return language === 'bn'
        ? 'এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।'
        : 'An account already exists with this email. Please sign in instead.';
    }
    if (code === 'auth/invalid-email') {
      return language === 'bn'
        ? 'সঠিক ইমেইল অ্যাড্রেস লিখুন (যেমন: name@gmail.com)।'
        : 'Please enter a valid email address.';
    }
    if (code === 'auth/weak-password') {
      return language === 'bn'
        ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
        : 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/too-many-requests') {
      return language === 'bn'
        ? 'অতিরিক্ত ভুল চেষ্টার কারণে সাময়িকভাবে লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন বা পাসওয়ার্ড রিসেট করুন।'
        : 'Too many failed attempts. Please wait a moment or reset your password.';
    }
    if (
      code === 'auth/operation-not-allowed' ||
      rawMsg.includes('auth/operation-not-allowed')
    ) {
      return language === 'bn'
        ? 'সার্ভার অথেনটিকেশন সিঙ্ক হচ্ছে, অনুগ্রহ করে পেজটি রিফ্রেশ করে আবার চেষ্টা করুন অথবা Google দিয়ে ১-ক্লিকে সাইন ইন করুন।'
        : 'Authentication service is syncing. Please refresh and try again, or use Quick Sign Up with Google.';
    }
    return (
      rawMsg ||
      (language === 'bn'
        ? 'অথেনটিকেশন সম্পন্ন হয়নি। আবার চেষ্টা করুন।'
        : 'Authentication failed. Please try again.')
    );
  };

  const syncReferralToSession = () => {
    const cleaned = referralCode.trim().toUpperCase();
    if (cleaned) {
      try {
        sessionStorage.setItem('boostlagbe_ref_code', cleaned);
      } catch {
        // Ignore storage error
      }
    }
  };

  const handlePasteReferral = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setReferralCode(text.trim().toUpperCase());
      }
    } catch {
      // Ignore clipboard permission denial
    }
  };

  const handleEmailDomainQuickTap = (domain: string) => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const prefix = trimmed.split('@')[0];
    setEmail(`${prefix}${domain}`);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    syncReferralToSession();
    try {
      await signInWithGoogle();
      onSuccessToast?.(
        language === 'bn'
          ? 'সফলভাবে গুগল অ্যাকাউন্টে প্রবেশ করা হয়েছে!'
          : 'Signed in with Google successfully!'
      );
      onClose();
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email.trim(), password);
        onSuccessToast?.(
          language === 'bn'
            ? 'সফলভাবে আপনার অ্যাকাউন্টে লগইন হয়েছে!'
            : 'Signed in successfully!'
        );
        onClose();
      } else if (mode === 'register') {
        if (!name.trim()) {
          throw new Error(
            language === 'bn'
              ? 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন'
              : 'Please enter your full name'
          );
        }
        if (password.length < 6) {
          throw new Error(
            language === 'bn'
              ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'
              : 'Password must be at least 6 characters'
          );
        }
        syncReferralToSession();
        await registerWithEmail(name.trim(), email.trim(), password);
        onSuccessToast?.(
          language === 'bn'
            ? 'অভিনন্দন! আপনার নতুন অ্যাকাউন্ট তৈরি হয়েছে।'
            : 'Welcome! Your account has been created.'
        );
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(email.trim());
        setResetSent(true);
        onSuccessToast?.(
          language === 'bn'
            ? 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে!'
            : 'Password reset link sent to your email!'
        );
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const showEmailDomainSuggestions =
    email.trim().length >= 2 && !email.includes('@');

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md lg:max-w-4xl max-h-[95dvh] sm:max-h-[90vh] flex flex-col lg:grid lg:grid-cols-12 items-stretch rounded-t-[30px] sm:rounded-[28px] bg-[#0B0F1C] border border-white/[0.09] shadow-2xl overflow-hidden text-[#F1F5F9]"
          >
            {/* ==============================================================
                LEFT PANEL (Desktop Split Showcase - lg:col-span-5)
               ============================================================== */}
            <div className="hidden lg:flex lg:col-span-5 p-8 bg-[#070A14] border-r border-white/[0.07] flex-col justify-between relative overflow-hidden">
              <div className="space-y-6 relative z-10">
                {/* Brand Lockup */}
                <div className="flex items-center gap-3">
                  <img
                    src={BRAND_LOGO_URL}
                    alt="Boostlagbe.com অফিশিয়াল লোগো"
                    width={44}
                    height={44}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-2xl object-contain bg-[#0D1324] border border-white/[0.12] p-1 shrink-0 shadow-md"
                  />
                  <div>
                    <span className="text-base font-black text-white tracking-tight block leading-none">
                      Boostlagbe.com
                    </span>
                    <span className="text-xs text-[#94A3B8] block mt-1">
                      বুস্ট লাগবে · অটোমেটিক সোশ্যাল গ্রোথ অ্যাপ
                    </span>
                  </div>
                </div>

                {/* Dynamic Context Headline */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-2xl font-black text-white leading-tight tracking-tight">
                    {mode === 'register'
                      ? language === 'bn'
                        ? 'মাত্র ৩০ সেকেন্ডে আপনার ফ্রি অ্যাকাউন্ট তৈরি করুন'
                        : 'Create Your Free Account in 30 Seconds'
                      : language === 'bn'
                      ? 'আপনার সোশ্যাল মিডিয়া বুস্ট ড্যাশবোর্ডে স্বাগতম'
                      : 'Welcome Back to Your Growth Dashboard'}
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {language === 'bn'
                      ? 'বিকাশ ও নগদে তাৎক্ষণিক ব্যালেন্স রিচার্জ, লাইভ অর্ডার ট্র্যাকিং এবং সরাসরি পাইকারি রেটে সকল সোশ্যাল মিডিয়া বুস্ট সার্ভিস।'
                      : 'Instant bKash & Nagad wallet top-up, real-time order progress tracking, and wholesale social media growth services.'}
                  </p>
                </div>

                {/* Native Feature Rows */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#0D1324]/90 border border-white/[0.06]">
                    <div className="w-9 h-9 rounded-xl bg-[#6D28D9]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-[#C4B5FD] shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white">
                        {language === 'bn'
                          ? 'তাৎক্ষণিক অটোমেটিক ডেলিভারি'
                          : 'Instant Automated Delivery'}
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
                        {language === 'bn'
                          ? 'অর্ডার সাবমিট করার সাথে সাথেই স্বয়ংক্রিয়ভাবে কাজ শুরু হয়'
                          : 'Orders start automatically within seconds of placement'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#0D1324]/90 border border-white/[0.06]">
                    <div className="w-9 h-9 rounded-xl bg-[#0891B2]/20 border border-[#22D3EE]/30 flex items-center justify-center text-[#67E8F9] shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white">
                        {language === 'bn'
                          ? 'বিকাশ, নগদ ও রকেট অটো পেমেন্ট'
                          : 'Instant bKash, Nagad & Rocket Top-Up'}
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
                        {language === 'bn'
                          ? 'পিন বা স্ক্রিনশট ছাড়াই ১ ক্লিকে তাৎক্ষণিক ওয়ালেট রিচার্জ'
                          : 'Seamless instant wallet funding with zero manual waiting'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#0D1324]/90 border border-white/[0.06]">
                    <div className="w-9 h-9 rounded-xl bg-[#16A34A]/20 border border-[#4ADE80]/30 flex items-center justify-center text-[#4ADE80] shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white">
                        {language === 'bn'
                          ? 'প্রতি ভেরিফাইড রেফারে ৳১০ + কমিশন'
                          : '৳10 Per Verified Referral + Commission'}
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
                        {language === 'bn'
                          ? 'বন্ধুদের ইনভাইট করে ওয়ালেট বা বিকাশে আয় উত্তোলন করুন'
                          : 'Invite friends and withdraw earnings to wallet or mobile banking'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quantitative Trust Bar (Tabular Numerals, Unboxed Metadata) */}
              <div className="relative z-10 pt-6 border-t border-white/[0.07] space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <strong className="text-lg font-black text-white font-mono tabular-nums block">
                      ৳5/1K
                    </strong>
                    <span className="text-[11px] text-[#94A3B8]">
                      {language === 'bn' ? 'শুরু রেট' : 'Starting Rate'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-lg font-black text-[#4ADE80] font-mono tabular-nums block">
                      24/7
                    </strong>
                    <span className="text-[11px] text-[#94A3B8]">
                      {language === 'bn' ? 'অটো সার্ভার' : 'Auto Server'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-lg font-black text-[#67E8F9] font-mono tabular-nums block">
                      100%
                    </strong>
                    <span className="text-[11px] text-[#94A3B8]">
                      {language === 'bn' ? 'নিরাপদ ওয়ালেট' : 'Secure Wallet'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                  <span>Facebook</span>
                  <span aria-hidden="true">·</span>
                  <span>YouTube</span>
                  <span aria-hidden="true">·</span>
                  <span>TikTok</span>
                  <span aria-hidden="true">·</span>
                  <span>Instagram</span>
                  <span aria-hidden="true">·</span>
                  <span>Telegram</span>
                </div>
              </div>
            </div>

            {/* ==============================================================
                RIGHT / MOBILE NATIVE APP AUTH SCREEN (lg:col-span-7)
               ============================================================== */}
            <div className="lg:col-span-7 flex flex-col max-h-[95dvh] sm:max-h-[90vh] overflow-hidden bg-[#0B0F1C]">
              {/* Mobile Bottom-Sheet Drag Handle */}
              <div className="pt-2.5 pb-1 sm:hidden shrink-0">
                <div className="w-11 h-1.5 bg-slate-700/90 rounded-full mx-auto" />
              </div>

              {/* Sticky Native Mobile App Bar */}
              <div className="px-5 sm:px-8 pt-2 sm:pt-6 pb-3 flex items-center justify-between gap-3 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {mode === 'reset' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#131B2E] hover:bg-[#19233A] border border-white/[0.08] flex items-center justify-center text-white active:scale-95 transition-all shrink-0"
                      aria-label="Back to Sign In"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  ) : (
                    <img
                      src={BRAND_LOGO_URL}
                      alt="Boostlagbe.com"
                      width={40}
                      height={40}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-2xl object-contain bg-[#131B2E] border border-white/[0.1] p-0.5 shrink-0 lg:hidden"
                    />
                  )}
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                      {mode === 'login'
                        ? language === 'bn'
                          ? 'অ্যাকাউন্টে লগইন'
                          : 'Sign In to Account'
                        : mode === 'register'
                        ? language === 'bn'
                          ? 'নতুন অ্যাকাউন্ট খুলুন'
                          : 'Create Free Account'
                        : language === 'bn'
                        ? 'পাসওয়ার্ড রিসেট'
                        : 'Reset Password'}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] truncate">
                      <span>Boostlagbe.com</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {mode === 'login'
                          ? language === 'bn'
                            ? 'স্বাগতম'
                            : 'Welcome back'
                          : mode === 'register'
                          ? language === 'bn'
                            ? 'ফ্রি মেম্বারশিপ'
                            : 'Instant access'
                          : language === 'bn'
                          ? 'অ্যাকাউন্ট পুনরুদ্ধার'
                          : 'Account recovery'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right App Bar Controls: Language Toggle & Close */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                    className="min-h-[44px] px-3 rounded-2xl bg-[#131B2E] hover:bg-[#19233A] border border-white/[0.08] text-xs font-bold text-[#E2E8F0] flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap shrink-0"
                    aria-label="Toggle Language"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#67E8F9]" />
                    <span>{language === 'bn' ? 'EN' : 'বাং'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#131B2E] hover:bg-[#19233A] border border-white/[0.08] flex items-center justify-center text-[#94A3B8] hover:text-white active:scale-95 transition-all shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Form Canvas */}
              <div className="px-5 sm:px-8 py-5 space-y-4 overflow-y-auto flex-1">
                {/* Segmented Control Switcher (Login vs Register) */}
                {mode !== 'reset' && (
                  <div
                    role="tablist"
                    aria-label="Authentication Mode"
                    className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#060912] border border-white/[0.08] rounded-2xl"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'login'}
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className={`min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                        mode === 'login'
                          ? 'bg-[#6D28D9] text-white shadow-md shadow-[#6D28D9]/30'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <LogIn className="w-4 h-4 shrink-0" />
                      <span>{language === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'register'}
                      onClick={() => {
                        setMode('register');
                        setError(null);
                      }}
                      className={`min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                        mode === 'register'
                          ? 'bg-[#6D28D9] text-white shadow-md shadow-[#6D28D9]/30'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span>{language === 'bn' ? 'রেজিস্টার করুন' : 'Create Account'}</span>
                    </button>
                  </div>
                )}

                {/* One-Tap Google Authentication Button (Top Priority on Mobile) */}
                {mode !== 'reset' && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full min-h-[50px] px-4 rounded-2xl bg-[#131B2E] hover:bg-[#182238] border border-white/[0.12] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span className="whitespace-nowrap">
                        {mode === 'login'
                          ? language === 'bn'
                            ? 'Google দিয়ে ১-ক্লিকে লগইন করুন'
                            : 'Continue with Google'
                          : language === 'bn'
                          ? 'Google দিয়ে দ্রুত অ্যাকাউন্ট খুলুন'
                          : 'Quick Sign Up with Google'}
                      </span>
                    </button>

                    {/* Clean Hairline Divider */}
                    <div className="relative py-1 text-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/[0.07]" />
                      </div>
                      <span className="relative px-3 bg-[#0B0F1C] text-[#94A3B8] text-[11px] font-semibold">
                        {language === 'bn'
                          ? 'অথবা ইমেইল ও পাসওয়ার্ড ব্যবহার করুন'
                          : 'Or continue with email'}
                      </span>
                    </div>
                  </>
                )}

                {/* Password Reset Instructions Banner */}
                {mode === 'reset' && (
                  <div className="p-4 rounded-2xl bg-[#131B2E]/80 border border-white/[0.08] space-y-1">
                    <h3 className="text-xs font-extrabold text-white">
                      {language === 'bn'
                        ? 'আপনার অ্যাকাউন্টের ইমেইল দিন'
                        : 'Enter your registered email address'}
                    </h3>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {language === 'bn'
                        ? 'আমরা আপনার ইমেইলে একটি নিরাপদ পাসওয়ার্ড রিসেট লিংক পাঠিয়ে দেবো, যা দিয়ে নতুন পাসওয়ার্ড সেট করতে পারবেন।'
                        : 'We will send a secure password reset link to your inbox so you can choose a new password.'}
                    </p>
                  </div>
                )}

                {/* Error Alert Banner */}
                {error && (
                  <div
                    role="alert"
                    className="p-3.5 text-xs text-[#FCA5A5] bg-rose-950/60 border border-[#F87171]/40 rounded-2xl flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{error}</span>
                  </div>
                )}

                {/* Password Reset Sent Banner */}
                {resetSent && (
                  <div
                    role="status"
                    className="p-3.5 text-xs text-[#86EFAC] bg-emerald-950/60 border border-[#4ADE80]/40 rounded-2xl flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">
                      {language === 'bn'
                        ? 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে! ইনবক্স ও স্প্যাম ফোল্ডার চেক করুন।'
                        : 'Password reset link sent! Please check your email inbox and spam folder.'}
                    </span>
                  </div>
                )}

                {/* Main Native Touch Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  {/* Full Name Field (Register Mode Only) */}
                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="auth-full-name"
                        className="text-xs font-bold text-[#CBD5E1] block px-1"
                      >
                        {language === 'bn' ? 'আপনার পূর্ণ নাম' : 'Full Name'}
                      </label>
                      <div className="group flex items-center gap-2.5 px-3 min-h-[52px] rounded-2xl bg-[#060912] border border-white/[0.1] focus-within:border-[#8B5CF6] focus-within:bg-[#0D1324] transition-all">
                        <div className="w-9 h-9 rounded-xl bg-[#131B2E] group-focus-within:bg-[#6D28D9]/25 flex items-center justify-center text-[#94A3B8] group-focus-within:text-[#C4B5FD] shrink-0 transition-colors">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          id="auth-full-name"
                          type="text"
                          required
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={
                            language === 'bn'
                              ? 'আপনার নাম লিখুন'
                              : 'Enter your full name'
                          }
                          className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none py-3"
                        />
                        {name.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setName('')}
                            className="min-h-[36px] min-w-[36px] rounded-xl text-slate-400 hover:text-white flex items-center justify-center shrink-0"
                            aria-label="Clear name"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email Address Field */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="auth-email"
                      className="text-xs font-bold text-[#CBD5E1] block px-1"
                    >
                      {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                    </label>
                    <div className="group flex items-center gap-2.5 px-3 min-h-[52px] rounded-2xl bg-[#060912] border border-white/[0.1] focus-within:border-[#8B5CF6] focus-within:bg-[#0D1324] transition-all">
                      <div className="w-9 h-9 rounded-xl bg-[#131B2E] group-focus-within:bg-[#6D28D9]/25 flex items-center justify-center text-[#94A3B8] group-focus-within:text-[#C4B5FD] shrink-0 transition-colors">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-email"
                        type="email"
                        inputMode="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@gmail.com"
                        className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none py-3"
                      />
                      {email.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setEmail('')}
                          className="min-h-[36px] min-w-[36px] rounded-xl text-slate-400 hover:text-white flex items-center justify-center shrink-0"
                          aria-label="Clear email"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Native Mobile Quick Email Domain Tap Bar */}
                    {showEmailDomainSuggestions && (
                      <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                        {QUICK_EMAIL_DOMAINS.map((domain) => (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => handleEmailDomainQuickTap(domain)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#131B2E] hover:bg-[#1D2842] border border-white/[0.08] text-[11px] font-mono text-[#CBD5E1] hover:text-white transition-colors whitespace-nowrap shrink-0"
                          >
                            {email.trim().split('@')[0]}
                            <span className="text-[#67E8F9] font-bold">{domain}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Password Field */}
                  {mode !== 'reset' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <label
                          htmlFor="auth-password"
                          className="text-xs font-bold text-[#CBD5E1]"
                        >
                          {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                        </label>
                        {mode === 'register' && password.length > 0 && (
                          <span className={`text-[11px] font-bold ${passwordChecks.textColor}`}>
                            {passwordChecks.label}
                          </span>
                        )}
                      </div>

                      <div className="group flex items-center gap-2.5 pl-3 pr-1.5 min-h-[52px] rounded-2xl bg-[#060912] border border-white/[0.1] focus-within:border-[#8B5CF6] focus-within:bg-[#0D1324] transition-all">
                        <div className="w-9 h-9 rounded-xl bg-[#131B2E] group-focus-within:bg-[#6D28D9]/25 flex items-center justify-center text-[#94A3B8] group-focus-within:text-[#C4B5FD] shrink-0 transition-colors">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete={
                            mode === 'login' ? 'current-password' : 'new-password'
                          }
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={
                            mode === 'register'
                              ? language === 'bn'
                                ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন'
                                : 'At least 6 characters'
                              : '••••••••'
                          }
                          className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none py-3"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="min-h-[44px] min-w-[44px] rounded-xl text-[#94A3B8] hover:text-white flex items-center justify-center shrink-0 transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Register Mode: 4-Bar Strength Meter & Checklist */}
                      {mode === 'register' && password.length > 0 && (
                        <div className="pt-1.5 px-1 space-y-2">
                          <div className="grid grid-cols-4 gap-1.5 h-1.5">
                            {[1, 2, 3, 4].map((bar) => (
                              <div
                                key={bar}
                                className={`rounded-full transition-colors ${
                                  bar <= passwordChecks.score
                                    ? passwordChecks.color
                                    : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                            <span
                              className={`flex items-center gap-1 ${
                                passwordChecks.hasMinLen
                                  ? 'text-[#4ADE80]'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>
                                {language === 'bn' ? 'কমপক্ষে ৬ অক্ষর' : '6+ characters'}
                              </span>
                            </span>
                            <span
                              className={`flex items-center gap-1 ${
                                passwordChecks.hasNumberOrUpper
                                  ? 'text-[#4ADE80]'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>
                                {language === 'bn'
                                  ? 'সংখ্যা বা বড় হাতের অক্ষর'
                                  : 'Number or uppercase'}
                              </span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Login Mode: Remember Me & Forgot Password Bar */}
                  {mode === 'login' && (
                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className="min-h-[40px] flex items-center gap-2 text-xs text-[#CBD5E1] hover:text-white select-none"
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            rememberMe
                              ? 'bg-[#6D28D9] border-[#8B5CF6] text-white'
                              : 'bg-[#060912] border-slate-700'
                          }`}
                        >
                          {rememberMe && <Check className="w-3 h-3" />}
                        </div>
                        <span>
                          {language === 'bn' ? 'লগইন মনে রাখুন' : 'Keep me signed in'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setError(null);
                        }}
                        className="min-h-[40px] px-1 text-xs text-[#67E8F9] hover:underline font-bold whitespace-nowrap shrink-0"
                      >
                        {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                      </button>
                    </div>
                  )}

                  {/* Register Mode: Optional Referral Code Accordion */}
                  {mode === 'register' && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowReferralInput(!showReferralInput)}
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#111829] hover:bg-[#151E33] border border-white/[0.07] flex items-center justify-between text-xs font-bold text-[#CBD5E1] transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-[#67E8F9]" />
                          <span>
                            {referralCode.trim()
                              ? language === 'bn'
                                ? `রেফারেল কোড যুক্ত: ${referralCode.trim().toUpperCase()}`
                                : `Referral code applied: ${referralCode.trim().toUpperCase()}`
                              : language === 'bn'
                              ? 'রেফারেল কোড আছে? (ঐচ্ছিক)'
                              : 'Have a referral code? (Optional)'}
                          </span>
                        </span>
                        {showReferralInput ? (
                          <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                        )}
                      </button>

                      {showReferralInput && (
                        <div className="mt-2 flex items-center gap-2 px-3 min-h-[48px] rounded-2xl bg-[#060912] border border-white/[0.1] focus-within:border-[#22D3EE]">
                          <input
                            type="text"
                            value={referralCode}
                            onChange={(e) =>
                              setReferralCode(e.target.value.toUpperCase())
                            }
                            placeholder={
                              language === 'bn'
                                ? 'যেমন: BL-XXXXXX'
                                : 'Enter code e.g. BL-XXXXXX'
                            }
                            className="w-full bg-transparent text-xs font-mono uppercase text-white placeholder:text-slate-500 focus:outline-none py-2.5"
                          />
                          <button
                            type="button"
                            onClick={handlePasteReferral}
                            className="min-h-[36px] px-2.5 rounded-xl bg-[#131B2E] hover:bg-[#19233A] text-[11px] font-bold text-[#67E8F9] flex items-center gap-1 shrink-0"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'পেস্ট' : 'Paste'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Thumb-Zone Action CTA Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[52px] px-5 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-extrabold text-sm shadow-lg shadow-[#6D28D9]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50"
                    >
                      {mode === 'reset' ? (
                        <KeyRound className="w-4 h-4 shrink-0" />
                      ) : (
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      )}
                      <span className="whitespace-nowrap">
                        {loading
                          ? language === 'bn'
                            ? 'যাচাই করা হচ্ছে...'
                            : 'Authenticating...'
                          : mode === 'login'
                          ? language === 'bn'
                            ? 'অ্যাকাউন্টে প্রবেশ করুন'
                            : 'Sign In to Dashboard'
                          : mode === 'register'
                          ? language === 'bn'
                            ? 'ফ্রি অ্যাকাউন্ট তৈরি করুন'
                            : 'Create Free Account'
                          : language === 'bn'
                          ? 'পাসওয়ার্ড রিসেট লিংক পাঠান'
                          : 'Send Reset Link'}
                      </span>
                    </button>
                  </div>
                </form>

                {/* Bottom Mode Toggle & Security Note */}
                <div className="pt-2 pb-1 text-center space-y-2.5">
                  {mode !== 'reset' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'register' : 'login');
                        setError(null);
                      }}
                      className="min-h-[44px] px-4 rounded-xl text-xs font-bold text-[#94A3B8] hover:text-white inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>
                        {mode === 'login'
                          ? language === 'bn'
                            ? 'এখনো অ্যাকাউন্ট নেই?'
                            : "Don't have an account?"
                          : language === 'bn'
                          ? 'আগে থেকেই অ্যাকাউন্ট আছে?'
                          : 'Already have an account?'}
                      </span>
                      <span className="text-[#A78BFA] font-extrabold underline underline-offset-4">
                        {mode === 'login'
                          ? language === 'bn'
                            ? 'নতুন অ্যাকাউন্ট খুলুন'
                            : 'Create Account'
                          : language === 'bn'
                          ? 'লগইন করুন'
                          : 'Sign In'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className="min-h-[44px] px-4 rounded-xl text-xs font-bold text-[#94A3B8] hover:text-white inline-flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>
                        {language === 'bn' ? 'লগইন পেজে ফিরে যান' : 'Back to Sign In'}
                      </span>
                    </button>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
                    <span>
                      {language === 'bn'
                        ? 'এনক্রিপ্টেড লগইন · নিরাপদ ওয়ালেট · ২৪/৭ সাপোর্ট'
                        : 'Encrypted Auth · Secure Wallet · 24/7 Support'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
