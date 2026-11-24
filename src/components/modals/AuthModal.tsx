import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
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
  ClipboardPaste,
} from 'lucide-react';
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
  initialMode = 'login',
}) => {
  const {
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    language,
    setLanguage,
    darkMode,
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
    let color = 'bg-slate-400';
    let textColor = 'text-slate-500';

    if (password.length > 0) {
      if (score <= 1) {
        label = language === 'bn' ? 'দুর্বল পাসওয়ার্ড' : 'Weak password';
        color = 'bg-rose-500';
        textColor = 'text-rose-600 dark:text-rose-400';
      } else if (score === 2) {
        label = language === 'bn' ? 'মাঝারি পাসওয়ার্ড' : 'Fair password';
        color = 'bg-amber-500';
        textColor = 'text-amber-600 dark:text-amber-400';
      } else if (score === 3) {
        label = language === 'bn' ? 'ভালো পাসওয়ার্ড' : 'Good password';
        color = 'bg-sky-500';
        textColor = 'text-sky-600 dark:text-sky-400';
      } else {
        label = language === 'bn' ? 'শক্তিশালী পাসওয়ার্ড' : 'Strong password';
        color = 'bg-emerald-500';
        textColor = 'text-emerald-600 dark:text-emerald-400';
      }
    }

    return {
      score,
      hasMinLen,
      hasNumberOrUpper,
      label,
      color,
      textColor,
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
        ? 'অতিরিক্ত ভুল চেষ্টার কারণে সাময়িকভাবে লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।'
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

  const modalBg = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';
  const inputSurface = darkMode
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:bg-white';
  const subtleBox = darkMode
    ? 'bg-slate-950 border-slate-800 text-slate-200'
    : 'bg-slate-100 border-slate-200 text-slate-800';
  const mutedText = darkMode ? 'text-slate-400' : 'text-slate-500';

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md lg:max-w-4xl max-h-[95dvh] sm:max-h-[90vh] flex flex-col lg:grid lg:grid-cols-12 items-stretch rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 ${modalBg}`}
      >
            {/* LEFT PANEL (Desktop Showcase - 5 cols) */}
            <div className="hidden lg:flex lg:col-span-5 p-8 bg-indigo-600 text-white flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <img
                    src={BRAND_LOGO_URL}
                    alt="Boostlagbe.com"
                    width={44}
                    height={44}
                    className="w-11 h-11 rounded-2xl object-cover bg-white/10 border border-white/20 p-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-base font-extrabold tracking-tight block leading-none">
                      Boostlagbe.com
                    </span>
                    <span className="text-xs text-indigo-100 block mt-1">
                      বুস্ট লাগবে · অটোমেটেড SMM প্যানেল
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-2xl font-extrabold leading-tight tracking-tight">
                    {mode === 'register'
                      ? language === 'bn'
                        ? 'মাত্র ৩০ সেকেন্ডে আপনার ফ্রি অ্যাকাউন্ট তৈরি করুন'
                        : 'Create Your Free Account in 30 Seconds'
                      : language === 'bn'
                      ? 'আপনার সোশ্যাল মিডিয়া বুস্ট ড্যাশবোর্ডে স্বাগতম'
                      : 'Welcome Back to Your Growth Dashboard'}
                  </h3>
                  <p className="text-sm text-indigo-100 leading-relaxed">
                    {language === 'bn'
                      ? 'বিকাশ ও নগদে তাৎক্ষণিক ব্যালেন্স রিচার্জ, লাইভ অর্ডার ট্র্যাকিং এবং সরাসরি পাইকারি রেটে সকল সোশ্যাল মিডিয়া বুস্ট সার্ভিস।'
                      : 'Instant bKash & Nagad wallet top-up, real-time order progress tracking, and wholesale social media growth services.'}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 border border-white/15">
                    <Zap className="w-5 h-5 text-white shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold">
                        {language === 'bn'
                          ? 'তাৎক্ষণিক অটোমেটিক ডেলিভারি'
                          : 'Instant Automated Delivery'}
                      </h4>
                      <p className="text-[11px] text-indigo-100 mt-0.5">
                        {language === 'bn'
                          ? 'অর্ডার সাবমিট করার সাথে সাথেই স্বয়ংক্রিয়ভাবে কাজ শুরু হয়'
                          : 'Orders start automatically within seconds of placement'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 border border-white/15">
                    <Layers className="w-5 h-5 text-white shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold">
                        {language === 'bn'
                          ? 'বিকাশ, নগদ ও রকেট অটো পেমেন্ট'
                          : 'Instant bKash, Nagad & Rocket Top-Up'}
                      </h4>
                      <p className="text-[11px] text-indigo-100 mt-0.5">
                        {language === 'bn'
                          ? 'স্ক্রিনশট ছাড়াই ১ ক্লিকে তাৎক্ষণিক ওয়ালেট রিচার্জ'
                          : 'Seamless instant wallet funding with zero manual waiting'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 border border-white/15">
                    <Gift className="w-5 h-5 text-white shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold">
                        {language === 'bn'
                          ? 'রেফারেল ও প্রোমো বোনাস'
                          : 'Referral & Promo Rewards'}
                      </h4>
                      <p className="text-[11px] text-indigo-100 mt-0.5">
                        {language === 'bn'
                          ? 'বন্ধুদের ইনভাইট করে ওয়ালেট ব্যালেন্স ও কমিশন আয় করুন'
                          : 'Invite friends and earn commission directly to your wallet'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/20 text-xs text-indigo-100 flex items-center justify-between">
                <span>bKash · Nagad · Rocket</span>
                <span className="font-bold text-white">24/7 Auto API</span>
              </div>
            </div>

            {/* RIGHT PANEL (Form Area - 7 cols) */}
            <div className="lg:col-span-7 flex flex-col max-h-[95dvh] sm:max-h-[90vh] overflow-hidden">
              {/* Header Bar */}
              <div
                className={`px-5 sm:px-8 pt-4 sm:pt-6 pb-3.5 flex items-center justify-between gap-3 border-b shrink-0 ${
                  darkMode ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {mode === 'reset' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer shrink-0 ${subtleBox}`}
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
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0 lg:hidden"
                    />
                  )}
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                      {mode === 'login'
                        ? language === 'bn'
                          ? 'অ্যাকাউন্টে লগইন করুন'
                          : 'Sign In to Account'
                        : mode === 'register'
                        ? language === 'bn'
                          ? 'ফ্রি অ্যাকাউন্ট খুলুন'
                          : 'Create Free Account'
                        : language === 'bn'
                        ? 'পাসওয়ার্ড রিসেট'
                        : 'Reset Password'}
                    </h2>
                    <p className={`text-xs truncate ${mutedText}`}>
                      Boostlagbe.com · {language === 'bn' ? 'তাৎক্ষণিক মেম্বার এক্সেস' : 'Instant member access'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                    className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${subtleBox}`}
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{language === 'bn' ? 'EN' : 'বাংলা'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer ${subtleBox}`}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Form Canvas */}
              <div className="px-5 sm:px-8 py-5 space-y-4 overflow-y-auto flex-1">
                {/* Mode Switcher Tabs (Login vs Register) */}
                {mode !== 'reset' && (
                  <div className={`grid grid-cols-2 p-1 rounded-xl border ${subtleBox}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        mode === 'login'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : `${mutedText} hover:text-indigo-600`
                      }`}
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{language === 'bn' ? 'লগইন (Sign In)' : 'Sign In'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                      }}
                      className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        mode === 'register'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : `${mutedText} hover:text-indigo-600`
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{language === 'bn' ? 'রেজিস্টার (Register)' : 'Register'}</span>
                    </button>
                  </div>
                )}

                {/* Google 1-Click Sign In */}
                {mode !== 'reset' && (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGoogleLogin}
                      className={`w-full py-3 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-white'
                          : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>
                        {mode === 'register'
                          ? language === 'bn'
                            ? 'Google দিয়ে দ্রুত ফ্রি একাউন্ট খুলুন'
                            : 'Quick Sign Up with Google'
                          : language === 'bn'
                          ? 'Google দিয়ে ১-ক্লিকে লগইন করুন'
                          : 'Continue with Google'}
                      </span>
                    </button>

                    <div className="flex items-center gap-3 text-xs">
                      <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                      <span className={mutedText}>
                        {language === 'bn' ? 'অথবা ইমেইল দিয়ে' : 'Or continue with email'}
                      </span>
                      <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    </div>
                  </>
                )}

                {/* Error Alert */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Password Reset Sent Banner */}
                {resetSent && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {language === 'bn'
                        ? 'আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।'
                        : 'A password reset link has been sent to your email.'}
                    </span>
                  </div>
                )}

                {/* Main Auth Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  {mode === 'register' && (
                    <div>
                      <label className="block text-xs font-bold mb-1.5">
                        {language === 'bn' ? 'পূর্ণ নাম (Full Name)' : 'Full Name'}
                      </label>
                      <div className="relative">
                        <User className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={language === 'bn' ? 'আপনার নাম লিখুন' : 'Enter your full name'}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${inputSurface}`}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      {language === 'bn' ? 'ইমেইল অ্যাড্রেস (Email Address)' : 'Email Address'}
                    </label>
                    <div className="relative">
                      <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${inputSurface}`}
                      />
                    </div>

                    {showEmailDomainSuggestions && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {QUICK_EMAIL_DOMAINS.map((dom) => (
                          <button
                            key={dom}
                            type="button"
                            onClick={() => handleEmailDomainQuickTap(dom)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer ${subtleBox}`}
                          >
                            {dom}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {mode !== 'reset' && (
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <label>{language === 'bn' ? 'পাসওয়ার্ড (Password)' : 'Password'}</label>
                        {mode === 'login' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMode('reset');
                              setError(null);
                            }}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                          </button>
                        ) : (
                          password.length > 0 && (
                            <span className={passwordChecks.textColor}>{passwordChecks.label}</span>
                          )
                        )}
                      </div>

                      <div className="relative">
                        <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={language === 'bn' ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড' : 'Minimum 6 characters'}
                          className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-colors ${inputSurface}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer ${mutedText}`}
                          aria-label="Toggle Password Visibility"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {mode === 'register' && password.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <div className="grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`h-1 rounded-full ${
                                  passwordChecks.score >= step
                                    ? passwordChecks.color
                                    : darkMode
                                    ? 'bg-slate-800'
                                    : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-[11px]">
                            <span
                              className={`flex items-center gap-1 ${
                                passwordChecks.hasMinLen
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : mutedText
                              }`}
                            >
                              <Check className="w-3 h-3" /> 6+ characters
                            </span>
                            <span
                              className={`flex items-center gap-1 ${
                                passwordChecks.hasNumberOrUpper
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : mutedText
                              }`}
                            >
                              <Check className="w-3 h-3" /> Number or uppercase
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional Referral Code Accordion in Register Mode */}
                  {mode === 'register' && (
                    <div className={`rounded-xl border overflow-hidden ${subtleBox}`}>
                      <button
                        type="button"
                        onClick={() => setShowReferralInput(!showReferralInput)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>
                            {language === 'bn'
                              ? 'রেফারেল কোড আছে? (ঐচ্ছিক)'
                              : 'Have a referral code? (Optional)'}
                          </span>
                        </span>
                        {showReferralInput ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {showReferralInput && (
                        <div className="px-3.5 pb-3 pt-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                            placeholder="BL-XXXXXX"
                            className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono uppercase outline-none ${inputSurface}`}
                          />
                          <button
                            type="button"
                            onClick={handlePasteReferral}
                            className="px-2.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5" />
                            <span>Paste</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'login' && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={mutedText}>
                        {language === 'bn' ? 'আমাকে লগইন রাখুন' : 'Keep me signed in'}
                      </span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>
                      {loading
                        ? language === 'bn'
                          ? 'প্রসেসিং হচ্ছে...'
                          : 'Processing...'
                        : mode === 'login'
                        ? language === 'bn'
                          ? 'লগইন করুন'
                          : 'Sign In to Dashboard'
                        : mode === 'register'
                        ? language === 'bn'
                          ? 'ফ্রি অ্যাকাউন্ট তৈরি করুন'
                          : 'Create Free Account'
                        : language === 'bn'
                        ? 'রিসেট লিংক পাঠান'
                        : 'Send Reset Link'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
  );
};
