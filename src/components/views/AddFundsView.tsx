import React, { useState } from 'react';
import { 
  Wallet, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Gift 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SMMPayment, SiteSettings, SMMCoupon, PaymentGateway } from '../../types';
import { submitDepositPayment, redeemCouponCode } from '../../services/db';
import { DEFAULT_SITE_SETTINGS } from '../../data/seedServices';

interface AddFundsViewProps {
  payments: SMMPayment[];
  siteSettings?: SiteSettings;
  coupons?: SMMCoupon[];
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth: () => void;
}

export const AddFundsView: React.FC<AddFundsViewProps> = ({
  payments,
  siteSettings = DEFAULT_SITE_SETTINGS,
  coupons = [],
  onShowToast,
  onOpenAuth
}) => {
  const { profile, language, formatPrice } = useAuth();

  const methods: {
    id: PaymentGateway;
    name: string;
    type: string;
    number: string;
    bonus: string;
    bonusPct: number;
    instruction: string;
  }[] = [
    {
      id: 'bKash',
      name: 'bKash (বিকাশ)',
      type: 'Personal / Merchant',
      number: siteSettings.bkashNumber || '',
      bonus: siteSettings.bkashBonusPercent > 0
        ? `${siteSettings.bkashBonusPercent}% Bonus (৳${siteSettings.minDepositForBonus}+)`
        : 'Instant Credit',
      bonusPct: siteSettings.bkashBonusPercent || 0,
      instruction: 'বিকাশ অ্যাপ বা *247# দিয়ে নম্বরটিতে টাকা পাঠান এবং প্রাপ্ত TrxID নিচে দিন।'
    },
    {
      id: 'Nagad',
      name: 'Nagad (নগদ)',
      type: 'Personal / Merchant',
      number: siteSettings.nagadNumber || '',
      bonus: siteSettings.nagadBonusPercent > 0
        ? `${siteSettings.nagadBonusPercent}% Bonus (৳${siteSettings.minDepositForBonus}+)`
        : 'Instant Credit',
      bonusPct: siteSettings.nagadBonusPercent || 0,
      instruction: 'নগদ অ্যাপ বা *167# দিয়ে নম্বরটিতে টাকা পাঠান এবং TrxID সাবমিট করুন।'
    },
    {
      id: 'Rocket',
      name: 'Rocket (রকেট)',
      type: 'Personal Send Money',
      number: siteSettings.rocketNumber || '',
      bonus: 'Instant Credit',
      bonusPct: 0,
      instruction: 'রকেট নম্বরে Send Money করে আপনার TrxID জমা দিন।'
    },
    {
      id: 'Upay',
      name: 'Upay (উপায়)',
      type: 'Personal Send Money',
      number: siteSettings.upayNumber || '',
      bonus: 'Instant Credit',
      bonusPct: 0,
      instruction: 'উপায় নম্বরে Send Money করে TrxID সাবমিট করুন।'
    },
    {
      id: 'Binance_USDT',
      name: 'Binance / Crypto (USDT)',
      type: 'TRC-20 / BEP-20',
      number: siteSettings.usdtAddress || '',
      bonus: siteSettings.usdtBonusPercent > 0
        ? `${siteSettings.usdtBonusPercent}% Bonus`
        : 'Global Crypto',
      bonusPct: siteSettings.usdtBonusPercent || 0,
      instruction: `Send USDT to the wallet address above. 1 USD = ${siteSettings.usdToBdtRate || 122} BDT.`
    }
  ];

  const [selectedMethodId, setSelectedMethodId] = useState<PaymentGateway>('bKash');
  const [amount, setAmount] = useState<number>(500);
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Promo Code state
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const selectedMethod = methods.find(m => m.id === selectedMethodId) || methods[0];

  const minForBonus = siteSettings.minDepositForBonus || 500;
  const bonusAmount = amount >= minForBonus && selectedMethod.bonusPct > 0
    ? Math.round(amount * (selectedMethod.bonusPct / 100))
    : 0;

  const handleCopyNumber = () => {
    if (!selectedMethod.number) return;
    navigator.clipboard.writeText(selectedMethod.number);
    onShowToast(language === 'bn' ? 'নম্বর কপি করা হয়েছে!' : 'Account copied!', 'success');
  };

  const handleRedeemQuickCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const reward = await redeemCouponCode(couponInput, profile, coupons);
      onShowToast(
        language === 'bn'
          ? `প্রোমো কোড সফল! ৳${reward} আপনার ওয়ালেটে যুক্ত হয়েছে!`
          : `Coupon redeemed! ৳${reward} added to your balance!`,
        'success'
      );
      setCouponInput('');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to redeem promo code', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) {
      onOpenAuth();
      return;
    }

    if (!selectedMethod.number) {
      setError(
        language === 'bn'
          ? 'এই পেমেন্ট মেথডটির নম্বর এখনো অ্যাডমিন সেটিংস থেকে যুক্ত করা হয়নি।'
          : 'This payment gateway account has not been configured by the administrator yet.'
      );
      return;
    }

    if (amount < 50) {
      setError(language === 'bn' ? 'সর্বনিম্ন ডিপোজিট ৫০ টাকা' : 'Minimum deposit is ৳50');
      return;
    }

    if (!transactionId.trim()) {
      setError(language === 'bn' ? 'ট্রানজেকশন আইডি (TrxID) দিন' : 'Please provide Transaction ID');
      return;
    }

    setLoading(true);
    try {
      await submitDepositPayment({
        userId: profile.uid,
        userEmail: profile.email,
        gateway: selectedMethod.id,
        amount,
        senderNumber: selectedMethod.id === 'Binance_USDT' ? 'USDT-WALLET' : senderNumber.trim(),
        transactionId: transactionId.trim().toUpperCase(),
        bonus: bonusAmount
      });

      onShowToast(
        language === 'bn' 
          ? 'ডিপোজিট রিকোয়েস্ট সার্ভারে সফলভাবে জমা হয়েছে!' 
          : 'Deposit request submitted to server for verification.',
        'success'
      );

      setSenderNumber('');
      setTransactionId('');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Deposit submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* Wallet Balance Hero */}
      <div className="p-5 rounded-3xl bg-[#0d1322] border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 block">
            {language === 'bn' ? 'বর্তমান ওয়ালেট ব্যালেন্স' : 'Current Wallet Balance'}
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-0.5 font-mono tabular-nums">
            {profile ? formatPrice(profile.balance) : '৳০.০০'}
          </h2>
          <p className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {language === 'bn' ? 'ক্লাউড সার্ভার অ্যাটমিক ডিপোজিট ভেরিফিকেশন' : 'Server-verified atomic balance credit'}
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6 stroke-[2.5]" />
        </div>
      </div>

      {/* Quick Promo / Gift Coupon Bar */}
      <form onSubmit={handleRedeemQuickCoupon} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
        <Gift className="w-4 h-4 text-rose-400 shrink-0 ml-1" />
        <input
          type="text"
          value={couponInput}
          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
          placeholder={language === 'bn' ? 'প্রোমো বা গিফট কোড লিখুন...' : 'Enter Promo / Gift Code...'}
          className="flex-1 bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none min-w-0 uppercase"
        />
        <button
          type="submit"
          disabled={couponLoading || !couponInput.trim()}
          className="py-1.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs whitespace-nowrap shrink-0 transition-all"
        >
          {couponLoading ? '...' : (language === 'bn' ? 'রিডিম' : 'Redeem')}
        </button>
      </form>

      {/* Select Gateway */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          {language === 'bn' ? '১. পেমেন্ট মেথড নির্বাচন করুন' : '1. Select Gateway'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {methods.map((m) => {
            const isSelected = selectedMethodId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMethodId(m.id)}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-rose-950/20 border-rose-500 shadow-sm'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <h4 className="text-xs font-bold text-white truncate">{m.name}</h4>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{m.type}</p>
                <span className="text-[10px] font-bold text-emerald-400 block mt-1">
                  {m.bonus}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions & Form */}
      <form onSubmit={handleSubmit} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl text-xs">
        <div className="pb-3 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">
              {selectedMethod.name}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {selectedMethod.type}
            </span>
          </div>

          {/* Copyable Account Box */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                {selectedMethod.id === 'Binance_USDT' ? 'USDT Wallet Address' : 'Merchant / Personal Account'}
              </span>
              {selectedMethod.number ? (
                <span className="font-mono text-sm sm:text-base font-bold text-emerald-400 select-all break-all">
                  {selectedMethod.number}
                </span>
              ) : (
                <span className="text-xs text-amber-400 font-semibold">
                  {language === 'bn'
                    ? 'অ্যাডমিন প্যানেল (Settings) থেকে নম্বর সেট করুন'
                    : 'Configure account number in Admin Settings'}
                </span>
              )}
            </div>
            {selectedMethod.number && (
              <button
                type="button"
                onClick={handleCopyNumber}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center gap-1 shrink-0"
              >
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'bn' ? 'কপি' : 'Copy'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {selectedMethod.instruction}
          </p>
        </div>

        {/* Amount Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'bn' ? 'টাকার পরিমাণ (BDT)' : 'Deposit Amount (BDT)'}
          </label>
          <input
            type="number"
            min={50}
            max={100000}
            required
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl p-3 text-sm font-mono font-bold text-white focus:outline-none tabular-nums"
          />

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[100, 300, 500, 1000, 2000, 5000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val)}
                className="py-1 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 active:scale-95 transition-all"
              >
                ৳{val}
              </button>
            ))}
          </div>

          {bonusAmount > 0 && (
            <p className="text-[11px] text-emerald-400 font-semibold pt-1">
              +৳{bonusAmount} ক্যাশব্যাক বোনাস সহ মোট ক্রেডিট: ৳{amount + bonusAmount}
            </p>
          )}
        </div>

        {/* Sender Number */}
        {selectedMethod.id !== 'Binance_USDT' && (
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'bn' ? 'যে নম্বর থেকে টাকা পাঠিয়েছেন' : 'Your Sender Number'}
            </label>
            <input
              type="text"
              required
              placeholder="01XXXXXXXXX"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl p-3 text-xs text-white focus:outline-none"
            />
          </div>
        )}

        {/* TrxID */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'bn' ? 'ট্রানজেকশন আইডি (TrxID)' : 'Transaction ID (TrxID)'}
          </label>
          <input
            type="text"
            required
            placeholder="e.g. BIK9283K9X"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>{loading ? 'সার্ভারে জমা হচ্ছে...' : (language === 'bn' ? 'পেমেন্ট জমা দিন' : 'Submit Deposit')}</span>
        </button>
      </form>

      {/* History */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2.5">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          {language === 'bn' ? 'ডিপোজিট হিস্টোরি' : 'Deposit Records'}
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            {language === 'bn' ? 'কোনো ডিপোজিট রেকর্ড নেই' : 'No deposits on record yet'}
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {payments.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{p.gateway}</span>
                    <span className="text-[10px] font-mono text-slate-400">Trx: {p.transactionId}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-bold text-emerald-400 block font-mono tabular-nums">
                    ৳{p.amount.toLocaleString()}
                  </span>
                  <span className={`capitalize font-bold text-[10px] ${
                    p.status === 'approved' ? 'text-emerald-400' :
                    p.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
