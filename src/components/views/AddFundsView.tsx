import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Lock,
  ExternalLink,
  X,
  Plus
} from 'lucide-react';
import { SMMPayment, SiteSettings, SMMCoupon } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  createZiniPayCheckoutInvoice,
  completeZiniPaySandboxSession,
  verifyAndCreditZiniPayInvoice
} from '../../services/db';
import { BRAND_LOGO_URL } from '../../data/seedServices';

interface AddFundsViewProps {
  payments: SMMPayment[];
  siteSettings: SiteSettings;
  coupons: SMMCoupon[];
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth: () => void;
}

export const AddFundsView: React.FC<AddFundsViewProps> = ({
  payments,
  siteSettings,
  onShowToast,
  onOpenAuth
}) => {
  const { user, profile, formatPrice, t } = useAuth();

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [isLaunchingGateway, setIsLaunchingGateway] = useState(false);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);

  const [activeGatewaySession, setActiveGatewaySession] = useState<{
    paymentId: string;
    invoiceId: string;
    paymentUrl: string;
    amount: number;
    bonus: number;
    mode: 'sandbox' | 'live';
    sandboxSimulation: boolean;
  } | null>(null);

  const [gatewayMethod, setGatewayMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Upay'>('bKash');
  const [gatewayPhone, setGatewayPhone] = useState('01712345678');
  const [gatewayOtp, setGatewayOtp] = useState('123456');
  const [gatewayPin, setGatewayPin] = useState('12121');
  const [isCompletingGateway, setIsCompletingGateway] = useState(false);

  const bonusPercent = siteSettings.zinipayBonusPercent ?? 0;
  const minDepositForBonus = siteSettings.minDepositForBonus || 500;
  const numericAmount = parseFloat(amount) || 0;
  const calculatedBonus =
    bonusPercent > 0 && numericAmount >= minDepositForBonus
      ? Math.floor((numericAmount * bonusPercent) / 100)
      : 0;

  // Auto-detect redirect callback after online payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('zinipay_status');
    const returnedPaymentId = params.get('payment_id');
    if (!paymentStatus || !returnedPaymentId || payments.length === 0) return;

    const targetPayment = payments.find((p) => p.id === returnedPaymentId);
    if (!targetPayment || targetPayment.status !== 'pending') return;

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    if (paymentStatus === 'success') {
      handleVerifyOnlinePayment(targetPayment);
    } else if (paymentStatus === 'cancel') {
      onShowToast(
        t('পেমেন্ট বাতিল করা হয়েছে।', 'Payment was canceled.'),
        'info'
      );
    }
  }, [payments]);

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!numericAmount || numericAmount < 10) {
      onShowToast(
        t('সর্বনিম্ন ১০ টাকা লিখুন।', 'Please enter at least ৳10 to add balance.'),
        'error'
      );
      return;
    }

    setIsLaunchingGateway(true);
    try {
      const res = await createZiniPayCheckoutInvoice({
        userId: user.uid,
        userEmail: user.email || '',
        cusName: profile?.displayName || (user.email ? user.email.split('@')[0] : 'Customer'),
        amount: numericAmount,
        bonus: calculatedBonus,
        preferredMethod: 'bKash'
      });

      if (!res.sandboxSimulation && res.paymentUrl && res.paymentUrl.startsWith('http')) {
        onShowToast(
          t('নিরাপদ পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে...', 'Redirecting to secure payment page...'),
          'info'
        );
        window.location.href = res.paymentUrl;
        return;
      }

      setActiveGatewaySession({
        paymentId: res.paymentId,
        invoiceId: res.invoiceId,
        paymentUrl: res.paymentUrl,
        amount: numericAmount,
        bonus: calculatedBonus,
        mode: res.mode,
        sandboxSimulation: res.sandboxSimulation
      });
    } catch (err: any) {
      onShowToast(
        err?.message || t('পেমেন্ট শুরু করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'Could not start payment. Please try again.'),
        'error'
      );
    } finally {
      setIsLaunchingGateway(false);
    }
  };

  const handleCompleteOnlinePayment = async () => {
    if (!activeGatewaySession || !user) return;
    setIsCompletingGateway(true);
    try {
      const sbxRes = await completeZiniPaySandboxSession({
        invoiceId: activeGatewaySession.invoiceId,
        paymentMethod: gatewayMethod,
        senderNumber: gatewayPhone,
        action: 'complete'
      });

      const targetPayment: SMMPayment = payments.find(
        (p) => p.id === activeGatewaySession.paymentId
      ) || {
        id: activeGatewaySession.paymentId,
        userId: user.uid,
        userEmail: user.email || '',
        gateway: gatewayMethod,
        amount: activeGatewaySession.amount,
        bonus: activeGatewaySession.bonus,
        transactionId: activeGatewaySession.invoiceId,
        senderNumber: gatewayPhone,
        status: 'pending',
        zinipayInvoiceId: activeGatewaySession.invoiceId,
        zinipayPaymentUrl: activeGatewaySession.paymentUrl,
        zinipayMethod: gatewayMethod,
        verificationMode: 'auto_zinipay',
        createdAt: Date.now()
      };

      const verifyRes = await verifyAndCreditZiniPayInvoice({
        payment: targetPayment,
        referralCommissionPercent: siteSettings.referralCommissionPercent
      });

      if (verifyRes.verified) {
        onShowToast(
          t(
            `পেমেন্ট সফল! ৳${activeGatewaySession.amount + activeGatewaySession.bonus} আপনার ওয়ালেটে যোগ হয়েছে (TrxID: ${sbxRes.transactionId || verifyRes.transactionId})`,
            `Payment Successful! ৳${activeGatewaySession.amount + activeGatewaySession.bonus} added to your wallet (TrxID: ${sbxRes.transactionId || verifyRes.transactionId})`
          ),
          'success'
        );
        setActiveGatewaySession(null);
        setIsDepositOpen(false);
        setAmount('');
      } else {
        onShowToast(
          t(`পেমেন্ট স্ট্যাটাস: ${verifyRes.status}`, `Payment status: ${verifyRes.status}`),
          'info'
        );
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Payment verification failed', 'error');
    } finally {
      setIsCompletingGateway(false);
    }
  };

  const handleVerifyOnlinePayment = async (payment: SMMPayment) => {
    if (!user) return;
    const invId = payment.zinipayInvoiceId || payment.transactionId;
    if (!invId) return;

    setVerifyingPaymentId(payment.id);
    try {
      const res = await verifyAndCreditZiniPayInvoice({
        payment,
        referralCommissionPercent: siteSettings.referralCommissionPercent
      });

      if (res.verified) {
        onShowToast(
          t(
            `পেমেন্ট যাচাই সম্পন্ন! ৳${payment.amount + (payment.bonus || 0)} আপনার ব্যালেন্সে যোগ হয়েছে।`,
            `Payment verified! ৳${payment.amount + (payment.bonus || 0)} credited to your balance.`
          ),
          'success'
        );
      } else {
        onShowToast(
          t(
            `পেমেন্ট এখনো সম্পন্ন হয়নি (${res.status})।`,
            `Payment not completed yet (${res.status}).`
          ),
          'info'
        );
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Verification failed', 'error');
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-3 sm:py-6 px-1 sm:px-0 space-y-5">
      {/* =====================================================================
          NATIVE MOBILE WALLET CARD
         ===================================================================== */}
      <div className="relative rounded-3xl bg-[#111726] border border-white/[0.08] p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>{t('বর্তমান ওয়ালেট ব্যালেন্স', 'Available Wallet Balance')}</span>
          </div>

          <div className="text-4xl sm:text-5xl font-extrabold text-white font-mono tabular-nums tracking-tight my-1">
            {formatPrice(profile?.balance || 0)}
          </div>

          <p className="text-xs text-slate-400 mt-1.5 max-w-sm">
            {t(
              'বিকাশ, নগদ, রকেট ও উপায়ে তাৎক্ষণিক ব্যালেন্স যোগ করুন',
              'Instant wallet top-up via bKash, Nagad, Rocket & Upay'
            )}
          </p>

          {/* Supported Mobile Banking Badges */}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-4">
            {['bKash', 'Nagad', 'Rocket', 'Upay'].map((method) => (
              <span
                key={method}
                className="px-3 py-1 rounded-xl bg-[#090D16] border border-white/[0.08] text-[11px] font-bold text-slate-200"
              >
                {method}
              </span>
            ))}
          </div>

          {!isDepositOpen ? (
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  onOpenAuth();
                  return;
                }
                setIsDepositOpen(true);
              }}
              className="mt-6 w-full sm:w-auto min-w-[230px] inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('ব্যালেন্স যোগ করুন', 'Add Balance')}</span>
            </button>
          ) : (
            <form
              onSubmit={handleProceedToPayment}
              className="w-full mt-6 pt-5 border-t border-white/[0.08] text-left space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">
                  {t('টাকার পরিমাণ লিখুন (৳)', 'Enter Amount (BDT)')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-mono font-bold text-emerald-400">
                  ৳
                </span>
                <input
                  type="number"
                  min="10"
                  step="any"
                  autoFocus
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('যেমন: 500', 'e.g. 500')}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#090D16] border border-white/15 focus:border-indigo-500 text-xl font-mono font-bold text-white placeholder:text-slate-600 placeholder:text-sm placeholder:font-sans focus:outline-none transition-colors tabular-nums"
                />
              </div>

              {/* Quick Amount Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {[100, 300, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      Number(amount) === preset
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-[#090D16] border-white/[0.08] text-slate-300 hover:text-white'
                    }`}
                  >
                    ৳{preset}
                  </button>
                ))}
              </div>

              {calculatedBonus > 0 && (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <span>{t('বোনাস যোগ হবে', 'Bonus Included')}</span>
                  <span className="font-mono font-bold">+৳{calculatedBonus}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLaunchingGateway}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {isLaunchingGateway ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('পেমেন্ট পেজ ওপেন হচ্ছে...', 'Opening payment page...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('পেমেন্ট সম্পন্ন করুন', 'Proceed to Payment')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* =====================================================================
          RECENT DEPOSITS HISTORY
         ===================================================================== */}
      {payments.length > 0 && (
        <div className="rounded-3xl bg-[#111726] border border-white/[0.07] p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-white">
              {t('সাম্প্রতিক লেনদেন', 'Recent Transactions')}
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {payments.length} {t('টি', 'items')}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {payments.slice(0, 6).map((p) => {
              const isPendingOnline =
                p.status === 'pending' && (p.gateway === 'ZiniPay' || Boolean(p.zinipayInvoiceId));
              const displayMethod =
                p.zinipayMethod ||
                (p.gateway === 'ZiniPay' ? t('অনলাইন পেমেন্ট', 'Online Payment') : p.gateway);

              return (
                <div
                  key={p.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-white tabular-nums">
                        ৳{p.amount.toLocaleString()}
                      </span>
                      {p.bonus && p.bonus > 0 ? (
                        <span className="text-xs font-mono text-emerald-400">+৳{p.bonus}</span>
                      ) : null}
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs font-medium text-slate-300">{displayMethod}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                      {p.transactionId} · {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPendingOnline && (
                      <button
                        type="button"
                        disabled={verifyingPaymentId === p.id}
                        onClick={() => handleVerifyOnlinePayment(p)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-[11px] font-semibold text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${verifyingPaymentId === p.id ? 'animate-spin' : ''}`}
                        />
                        <span>{t('যাচাই', 'Verify')}</span>
                      </button>
                    )}

                    {p.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('সফল', 'Completed')}</span>
                      </span>
                    ) : p.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{t('বাতিল', 'Canceled')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('অপেক্ষমান', 'Pending')}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          NATIVE MOBILE PAYMENT CHECKOUT SHEET
         ===================================================================== */}
      {activeGatewaySession && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#111726] border border-white/[0.1] shadow-2xl overflow-hidden">
            {/* Checkout Header */}
            <div className="bg-[#171F32] px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={BRAND_LOGO_URL}
                  alt="Boostlagbe.com"
                  className="w-10 h-10 rounded-xl object-contain bg-[#090D16] border border-white/10 p-0.5"
                />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {t('নিরাপদ অনলাইন পেমেন্ট', 'Secure Mobile Payment')}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Boostlagbe.com • {t('অটোমেটিক ওয়ালেট রিচার্জ', 'Instant Top-Up')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveGatewaySession(null)}
                className="p-2 rounded-xl bg-white/[0.06] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Payable Total Banner */}
              <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-[#090D16] border border-white/[0.08]">
                <div>
                  <div className="text-xs text-slate-400">
                    {t('পরিশোধযোগ্য পরিমাণ', 'Payable Amount')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {siteSettings.siteName || 'Boostlagbe.com'}
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
                  ৳{activeGatewaySession.amount.toLocaleString()}
                </div>
              </div>

              {!activeGatewaySession.sandboxSimulation ? (
                <div className="space-y-4 text-center py-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t(
                      'নিচের বাটনে ট্যাপ করে আপনার পছন্দের মোবাইল ব্যাংকিং (বিকাশ/নগদ/রকেট) দিয়ে পেমেন্ট সম্পন্ন করুন। পেমেন্ট শেষ হলে স্বয়ংক্রিয়ভাবে ব্যালেন্স যোগ হবে।',
                      'Tap below to complete your mobile payment. Your wallet balance will be credited automatically.'
                    )}
                  </p>
                  <a
                    href={activeGatewaySession.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>{t('পেমেন্ট পেজ খুলুন', 'Open Payment Page')}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      {t('মোবাইল ব্যাংকিং নির্বাচন করুন', 'Select Mobile Banking')}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['bKash', 'Nagad', 'Rocket', 'Upay'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setGatewayMethod(m)}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            gatewayMethod === m
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-[#090D16] border-white/[0.08] text-slate-400 hover:text-white'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {gatewayMethod} {t('নম্বর', 'Account Number')}
                      </label>
                      <input
                        type="text"
                        value={gatewayPhone}
                        onChange={(e) => setGatewayPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D16] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">OTP কোড</label>
                        <input
                          type="text"
                          value={gatewayOtp}
                          onChange={(e) => setGatewayOtp(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#090D16] border border-white/10 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">পিন (PIN)</label>
                        <input
                          type="password"
                          value={gatewayPin}
                          onChange={(e) => setGatewayPin(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#090D16] border border-white/10 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isCompletingGateway}
                    onClick={handleCompleteOnlinePayment}
                    className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    {isCompletingGateway ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('পেমেন্ট প্রসেস হচ্ছে...', 'Processing Payment...')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {t(
                            `পেমেন্ট নিশ্চিত করুন (৳${activeGatewaySession.amount})`,
                            `Confirm Payment (৳${activeGatewaySession.amount})`
                          )}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('১০০% নিরাপদ ও তাৎক্ষণিক অটোমেটিক পেমেন্ট', '100% Secure & Instant Mobile Payment')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
