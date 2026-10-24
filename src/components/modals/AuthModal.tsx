import React, { useState, useMemo } from 'react';
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
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { BRAND_LOGO_URL } from '../../data/seedServices';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast
}) => {
  const {
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    language
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-800' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
      return {
        score: 1,
        label: language === 'bn' ? 'দুর্বল' : 'Weak',
        color: 'bg-[#F87171]'
      };
    }
    if (score === 2) {
      return {
        score: 2,
        label: language === 'bn' ? 'মাঝারি' : 'Fair',
        color: 'bg-[#F59E0B]'
      };
    }
    return {
      score: 3,
      label: language === 'bn' ? 'শক্তিশালী' : 'Strong',
      color: 'bg-[#22C55E]'
    };
  }, [password, language]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onSuccessToast?.(
        language === 'bn'
          ? 'সফলভাবে গুগল অ্যাকাউন্টে লগইন হয়েছে!'
          : 'Signed in with Google successfully!'
      );
      onClose();
    } catch (err: any) {
      setError(
        err?.message ||
          (language === 'bn'
            ? 'গুগল সাইন-ইন সম্পন্ন হয়নি। ইমেইল ও পাসওয়ার্ড ব্যবহার করুন।'
            : 'Google Sign-In failed. Please try Email & Password.')
      );
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
          language === 'bn' ? 'সফলভাবে লগইন হয়েছে!' : 'Signed in successfully!'
        );
        onClose();
      } else if (mode === 'register') {
        if (password.length < 6) {
          throw new Error(
            language === 'bn'
              ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'
              : 'Password must be at least 6 characters'
          );
        }
        await registerWithEmail(name.trim(), email.trim(), password);
        onSuccessToast?.(
          language === 'bn'
            ? 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!'
            : 'Account created successfully!'
        );
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(email.trim());
        setResetSent(true);
        onSuccessToast?.(
          language === 'bn'
            ? 'পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে!'
            : 'Password reset link sent to your email!'
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md lg:max-w-3xl rounded-t-3xl sm:rounded-3xl bg-[#0D1220] border border-slate-800/90 shadow-2xl overflow-hidden text-[#F1F5F9] grid grid-cols-1 lg:grid-cols-12"
          >
            {/* Desktop Left Panel: Split Visual Identity (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:col-span-5 p-7 glass-hero flex-col justify-between border-r border-slate-800/80">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src={BRAND_LOGO_URL}
                    alt="Boostlagbe.com – বুস্ট লাগবে"
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-2xl object-contain bg-[#080B14] border border-white/10 p-0.5 shadow-lg"
                  />
                  <div>
                    <h3 className="text-sm font-extrabold text-white tracking-tight">
                      Boostlagbe.com
                    </h3>
                    <span className="text-[10px] font-mono text-[#22D3EE] tracking-wider">
                      বুস্ট লাগবে • Cloud SMM
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <h4 className="text-lg font-extrabold text-white leading-snug">
                    {language === 'bn'
                      ? 'প্রফেশনাল সোশ্যাল মিডিয়া অর্ডার ও API অটোমেশন'
                      : 'Automated SMM Order Execution & API Engine'}
                  </h4>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {language === 'bn'
                      ? 'রিয়েল-টাইম API ক্যাটালগ, তাৎক্ষণিক অর্ডার ট্র্যাকিং এবং নিরাপদ ক্লাউড ওয়ালেট।'
                      : 'Real-time provider synchronization, instant order routing, and atomic cloud wallet management.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-6 border-t border-slate-800/70 text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Zap className="w-4 h-4 text-[#22D3EE] shrink-0" />
                  <span>
                    {language === 'bn'
                      ? 'তাৎক্ষণিক API অর্ডার প্রসেসিং'
                      : 'Instant API Order Dispatch'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Layers className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span>
                    {language === 'bn'
                      ? 'লাইভ রেট ও রিফিল গ্যারান্টি'
                      : 'Live Rates & Refill Protection'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span>Firebase Cloud Authentication</span>
                </div>
              </div>
            </div>

            {/* Right / Main Form Area */}
            <div className="lg:col-span-7 p-5 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mb-1 sm:hidden" />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    {mode === 'login'
                      ? language === 'bn'
                        ? 'অ্যাকাউন্টে লগইন করুন'
                        : 'Sign In to Workspace'
                      : mode === 'register'
                      ? language === 'bn'
                        ? 'নতুন অ্যাকাউন্ট তৈরি করুন'
                        : 'Create New Account'
                      : language === 'bn'
                      ? 'পাসওয়ার্ড পুনরুদ্ধার'
                      : 'Password Recovery'}
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {mode === 'reset'
                      ? language === 'bn'
                        ? 'আপনার নিবন্ধিত ইমেইলে রিসেট লিংক পাঠানো হবে'
                        : 'Enter your registered email to receive a reset link'
                      : language === 'bn'
                      ? 'আপনার অর্ডার ও ওয়ালেট পরিচালনা করতে প্রবেশ করুন'
                      : 'Access your orders, cloud wallet, and API credentials'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-[#94A3B8] hover:text-white rounded-xl bg-[#141B2B] border border-slate-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Switch Tabs */}
              {mode !== 'reset' && (
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#080B14] border border-slate-800/90 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      mode === 'login'
                        ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'লগইন (Sign In)' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      mode === 'register'
                        ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'রেজিস্টার (Sign Up)' : 'Create Account'}
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 text-xs text-[#F87171] bg-rose-950/50 border border-[#F87171]/40 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {resetSent && (
                <div className="p-3 text-xs text-[#22C55E] bg-emerald-950/50 border border-[#22C55E]/40 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? 'পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে। ইনবক্স চেক করুন।'
                      : 'Password reset link sent! Please check your email inbox.'}
                  </span>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                      {language === 'bn' ? 'আপনার নাম' : 'Full Name'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={language === 'bn' ? 'আপনার নাম লিখুন' : 'Enter your full name'}
                        className="w-full input-surface rounded-xl pl-10 pr-3.5 py-2.5 text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                    {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full input-surface rounded-xl pl-10 pr-3.5 py-2.5 text-xs"
                    />
                  </div>
                </div>

                {mode !== 'reset' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                        {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('reset');
                            setError(null);
                          }}
                          className="text-[11px] text-[#22D3EE] hover:underline font-semibold"
                        >
                          {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full input-surface rounded-xl pl-10 pr-10 py-2.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator on Register */}
                    {mode === 'register' && password.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <div className="flex gap-1 h-1">
                          {[1, 2, 3].map(bar => (
                            <div
                              key={bar}
                              className={`flex-1 rounded-full transition-colors ${
                                bar <= passwordStrength.score
                                  ? passwordStrength.color
                                  : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-[#94A3B8] block text-right">
                          {passwordStrength.label}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {mode === 'reset' ? (
                    <KeyRound className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>
                    {loading
                      ? language === 'bn'
                        ? 'সার্ভারে যাচাই হচ্ছে...'
                        : 'Verifying...'
                      : mode === 'login'
                      ? language === 'bn'
                        ? 'লগইন করুন'
                        : 'Sign In'
                      : mode === 'register'
                      ? language === 'bn'
                        ? 'অ্যাকাউন্ট তৈরি করুন'
                        : 'Create Account'
                      : language === 'bn'
                      ? 'রিসেট লিংক পাঠান'
                      : 'Send Reset Link'}
                  </span>
                </button>

                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="w-full py-2 text-xs font-bold text-[#94A3B8] hover:text-white"
                  >
                    {language === 'bn' ? '← লগইনে ফিরে যান' : '← Back to Sign In'}
                  </button>
                )}
              </form>

              {mode !== 'reset' && (
                <>
                  <div className="relative my-3 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800" />
                    </div>
                    <span className="relative px-3 bg-[#0D1220] text-[#94A3B8] text-[10px] tracking-wider uppercase font-bold">
                      {language === 'bn' ? 'অথবা' : 'OR CONTINUE WITH'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 bg-[#141B2B] hover:bg-[#192337] border border-slate-700/80 text-[#F1F5F9] font-bold text-xs rounded-xl transition-all active:scale-98 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                    <span>
                      {language === 'bn'
                        ? 'Google অ্যাকাউন্ট দিয়ে লগইন'
                        : 'Continue with Google'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
