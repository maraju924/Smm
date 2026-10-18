import React, { useState } from 'react';
import { 
  User, 
  Wallet, 
  Globe, 
  Moon, 
  Sun, 
  Key, 
  LogOut, 
  Copy,
  RefreshCw,
  Server
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { regenerateUserApiKeyOnServer } from '../../services/db';

interface ProfileViewProps {
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onShowToast,
  onOpenAuth
}) => {
  const { 
    profile, 
    currency, 
    setCurrency, 
    language, 
    setLanguage, 
    darkMode, 
    setDarkMode, 
    logout, 
    formatPrice, 
    isAdmin 
  } = useAuth();
  const [rotatingKey, setRotatingKey] = useState(false);

  if (!profile) {
    return (
      <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 max-w-md mx-auto my-8">
        <User className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-extrabold text-white">
          {language === 'bn' ? 'প্রোফাইল দেখতে লগইন করুন' : 'Sign in to view your profile'}
        </h3>
        <p className="text-xs text-slate-400">
          {language === 'bn' ? 'ক্লাউড সার্ভার ওয়ালেট ও অর্ডার হিস্টোরি অ্যাক্সেস করতে সাইন ইন করুন' : 'Access your cloud wallet, orders and server-synced settings'}
        </p>
        <button
          onClick={onOpenAuth}
          className="py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg active:scale-95 transition-all"
        >
          {language === 'bn' ? 'লগইন করুন' : 'Sign In Now'}
        </button>
      </div>
    );
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} copied!`, 'info');
  };

  const handleRotateApiKey = async () => {
    setRotatingKey(true);
    try {
      await regenerateUserApiKeyOnServer(profile.uid);
      onShowToast(
        language === 'bn' ? 'নতুন API Key সার্ভারে সংরক্ষিত হয়েছে!' : 'New API Key saved to cloud server!',
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to rotate key', 'error');
    } finally {
      setRotatingKey(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pb-8 overflow-x-hidden">
      {/* Profile Header Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shrink-0">
          {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white truncate">
              {profile.displayName}
            </h2>
            {isAdmin && (
              <span className="py-0.5 px-2 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold uppercase">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">{profile.email}</p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-emerald-400 font-bold font-mono">
              {language === 'bn' ? 'ব্যালেন্স' : 'Balance'}: {formatPrice(profile.balance)}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-mono">
              {language === 'bn' ? 'খরচ' : 'Spent'}: {formatPrice(profile.totalSpent)}
            </span>
          </div>
        </div>
      </div>

      {/* Server-Synced Preferences Section */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            {language === 'bn' ? 'ক্লাউড সার্ভার প্রিফারেন্স' : 'Cloud Server Preferences'}
          </h3>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
            <Server className="w-3 h-3" /> Synced to Server
          </span>
        </div>

        {/* Currency Switch */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-white">
                {language === 'bn' ? 'কারেন্সি (Currency)' : 'Display Currency'}
              </p>
              <p className="text-[10px] text-slate-400">Saved in your cloud profile</p>
            </div>
          </div>
          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setCurrency('BDT')}
              className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                currency === 'BDT' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'
              }`}
            >
              ৳ BDT
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                currency === 'USD' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'
              }`}
            >
              $ USD
            </button>
          </div>
        </div>

        {/* Language Switch */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-sky-400" />
            <div>
              <p className="text-xs font-bold text-white">
                {language === 'bn' ? 'ভাষা (Language)' : 'App Language'}
              </p>
              <p className="text-[10px] text-slate-400">English or বাংলা</p>
            </div>
          </div>
          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setLanguage('bn')}
              className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                language === 'bn' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400'
              }`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                language === 'en' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Dark Mode Switch */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-2.5">
            {darkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <div>
              <p className="text-xs font-bold text-white">
                {language === 'bn' ? 'ডার্ক মোড (Dark Theme)' : 'Dark Theme'}
              </p>
              <p className="text-[10px] text-slate-400">AMOLED high-contrast mode</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              darkMode ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
          </button>
        </div>
      </div>

      {/* API Key Box */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            Server API v2 Credentials
          </h3>
          <button
            onClick={handleRotateApiKey}
            disabled={rotatingKey}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${rotatingKey ? 'animate-spin' : ''}`} />
            <span>{language === 'bn' ? 'নতুন কি তৈরি করুন' : 'Regenerate Key'}</span>
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono">
          <span className="truncate text-emerald-400 font-bold select-all">{profile.apiKey}</span>
          <button
            onClick={() => handleCopy(profile.apiKey, 'API Key')}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={logout}
        className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        <LogOut className="w-4 h-4" />
        <span>{language === 'bn' ? 'লগআউট করুন' : 'Sign Out of Account'}</span>
      </button>
    </div>
  );
};
