import React, { useState } from 'react';
import { X, Mail, Lock, User, Sparkles, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccessToast }) => {
  const { signInWithGoogle, loginWithEmail, registerWithEmail, resetPassword, language } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onSuccessToast?.(language === 'bn' ? 'সফলভাবে গুগল অ্যাকাউন্টে লগইন হয়েছে!' : 'Signed in with Google successfully!');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Google Sign-In failed. Please try again or use Email & Password.');
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
        await loginWithEmail(email, password);
        onSuccessToast?.(language === 'bn' ? 'সফলভাবে লগইন হয়েছে!' : 'Logged in successfully!');
        onClose();
      } else if (mode === 'register') {
        if (password.length < 6) {
          throw new Error(language === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
        }
        await registerWithEmail(name, email, password);
        onSuccessToast?.(language === 'bn' ? 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' : 'Account created successfully!');
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(email);
        setResetSent(true);
        onSuccessToast?.(language === 'bn' ? 'পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে!' : 'Password reset link sent to your email!');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 shadow-lg shadow-rose-500/20 mb-2.5">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-extrabold tracking-tight text-white">
            {mode === 'login'
              ? (language === 'bn' ? 'অমরট্রেন্ড SMM এ লগইন' : 'Sign In to AmarTrend SMM')
              : mode === 'register'
              ? (language === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create Production Account')
              : (language === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Your Password')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'bn'
              ? '১০০% ক্লাউড সার্ভার ভিত্তিক নিরাপদ SMM প্যানেল'
              : '100% Cloud Server Authenticated SMM Platform'}
          </p>
        </div>

        {/* Mode Switch Tabs */}
        {mode !== 'reset' && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'login' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? 'লগইন (Sign In)' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'register' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? 'রেজিস্টার (Sign Up)' : 'Create Account'}
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 text-xs text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-xl">
            {error}
          </div>
        )}

        {resetSent && (
          <div className="p-3 mb-4 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 rounded-xl">
            {language === 'bn'
              ? 'আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।'
              : 'Password reset email sent! Check your inbox or spam folder.'}
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'আপনার নাম' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'bn' ? 'আপনার নাম লিখুন' : 'Enter your name'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(null); }}
                    className="text-[11px] text-rose-400 hover:underline font-semibold"
                  >
                    {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mode === 'reset' ? <KeyRound className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            <span>
              {loading
                ? (language === 'bn' ? 'সার্ভারে যাচাই হচ্ছে...' : 'Authenticating with Server...')
                : mode === 'login'
                ? (language === 'bn' ? 'লগইন করুন' : 'Sign In')
                : mode === 'register'
                ? (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
                : (language === 'bn' ? 'রিসেট লিংক পাঠান' : 'Send Reset Link')}
            </span>
          </button>

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white"
            >
              {language === 'bn' ? '← লগইনে ফিরে যান' : '← Back to Sign In'}
            </button>
          )}
        </form>

        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative px-3 bg-slate-900 text-slate-500 text-[10px] tracking-wider uppercase font-bold">
            {language === 'bn' ? 'অথবা ওয়ান-ক্লিক গুগল লগইন' : 'OR GOOGLE OAUTH'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{language === 'bn' ? 'গুগল অ্যাকাউন্ট দিয়ে লগইন করুন' : 'Continue with Google Account'}</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 text-center mt-4">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Firebase Cloud Auth • Zero Browser Storage</span>
        </div>
      </div>
    </div>
  );
};
