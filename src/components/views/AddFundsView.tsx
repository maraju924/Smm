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

  // Step 1: Deposit button toggle -> opens amount input field
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [isLaunchingGateway, setIsLaunchingGateway] = useState(false);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);

  // ZiniPay Hosted Gateway Overlay (used when Sandbox mode is active or inside iframe preview)
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

  // Auto-detect redirect callback from ZiniPay (?zinipay_status=success&payment_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ziniStatus = params.get('zinipay_status');
    const returnedPaymentId = params.get('payment_id');
    if (!ziniStatus || !returnedPaymentId || payments.length === 0) return;

    const targetPayment = payments.find((p) => p.id === returnedPaymentId);
    if (!targetPayment || targetPayment.status !== 'pending') return;

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    if (ziniStatus === 'success') {
      handleVerifyZiniPayment(targetPayment);
    } else if (ziniStatus === 'cancel') {
      onShowToast(
        t('জিনিপে পেমেন্ট বাতিল করা হয়েছে।', 'ZiniPay payment was canceled.'),
        'info'
      );
    }
  }, [payments]);

  // Direct ZiniPay Gateway Launch after entering amount
  const handleProceedToZiniPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!numericAmount || numericAmount < 10) {
      onShowToast(
        t('সর্বনিম্ন ১০ টাকা ডিপোজিট পরিমাণ লিখুন।', 'Please enter at least ৳10 to deposit.'),
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

      // If Live ZiniPay returned a real external payment_url, redirect directly to ZiniPay Gateway
      if (!res.sandboxSimulation && res.paymentUrl && res.paymentUrl.startsWith('http')) {
        onShowToast(
          t('জিনিপে পেমেন্ট গেটওয়েতে নিয়ে যাওয়া হচ্ছে...', 'Redirecting to ZiniPay Payment Gateway...'),
          'info'
        );
        window.location.href = res.paymentUrl;
        return;
      }

      // Otherwise open the ZiniPay Gateway Checkout Terminal directly
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
        err?.message || t('জিনিপে পেমেন্ট শুরু করতে সমস্যা হয়েছে।', 'Failed to launch ZiniPay gateway.'),
        'error'
      );
    } finally {
      setIsLaunchingGateway(false);
    }
  };

  // Complete ZiniPay Gateway Checkout (Sandbox / Integrated Gateway Flow)
  const handleCompleteZiniPayGateway = async () => {
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
        gateway: 'ZiniPay',
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
      onShowToast(err?.message || 'ZiniPay payment failed', 'error');
    } finally {
      setIsCompletingGateway(false);
    }
  };

  // Verify any pending ZiniPay deposit
  const handleVerifyZiniPayment = async (payment: SMMPayment) => {
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
            `জিনিপে পেমেন্ট ভেরিফাইড! ৳${payment.amount + (payment.bonus || 0)} আপনার ব্যালেন্সে যোগ হয়েছে।`,
            `ZiniPay payment verified! ৳${payment.amount + (payment.bonus || 0)} credited to your balance.`
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
    <div className="max-w-xl mx-auto py-4 sm:py-8 px-2 sm:px-0 space-y-6">
      {/* =====================================================================
          CLEAN WALLET CARD: TOP BALANCE + DEPOSIT BUTTON -> AMOUNT INPUT
         ===================================================================== */}
      <div className="relative rounded-3xl bg-[#0D1220]/90 border border-white/[0.08] p-6 sm:p-9 shadow-[0_24px_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Subtle Label */}
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400 mb-3">
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('ওয়ালেট ব্যালেন্স', 'Available Wallet Balance')}</span>
          </div>

          {/* Main Balance Display */}
          <div className="text-4xl sm:text-5xl font-display font-bold text-white font-mono tabular-nums tracking-tight my-1">
            {formatPrice(profile?.balance || 0)}
          </div>

          <p className="text-xs text-slate-400 mt-1.5">
            {t(
              'জিনিপে অটোমেটিক পেমেন্ট গেটওয়ের মাধ্যমে তাৎক্ষণিক ফান্ড অ্যাড করুন',
              'Instant automated wallet top-up powered by ZiniPay Gateway'
            )}
          </p>

          {/* Deposit Button (when input is closed) */}
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
              className="mt-7 w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-display font-bold text-sm tracking-wide shadow-[0_12px_32px_rgba(139,92,246,0.35)] transition-all active:scale-[0.99] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('ডিপোজিট করুন', 'Deposit Funds')}</span>
            </button>
          ) : (
            /* Expandable Deposit Input Field */
            <form
              onSubmit={handleProceedToZiniPay}
              className="w-full mt-7 pt-6 border-t border-white/[0.08] text-left space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('ডিপোজিট টাকার পরিমাণ লিখুন (৳)', 'Enter Deposit Amount (BDT)')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t('বন্ধ করুন', 'Cancel')}
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-mono font-bold text-cyan-400">
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
                  placeholder={t('টাকার পরিমাণ লিখুন (যেমন: 500)', 'Enter amount (e.g. 500)')}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl bg-[#080B14] border border-white/15 focus:border-cyan-400/60 text-xl font-mono font-bold text-white placeholder:text-slate-600 placeholder:text-sm placeholder:font-sans focus:outline-none transition-colors tabular-nums"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {[100, 300, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                      Number(amount) === preset
                        ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'
                        : 'bg-[#080B14]/70 border-white/[0.07] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    ৳{preset}
                  </button>
                ))}
              </div>

              {calculatedBonus > 0 && (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <span>{t('ডিপোজিট বোনাস যোগ হবে', 'Bonus Included')}</span>
                  <span className="font-mono font-bold">+৳{calculatedBonus}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLaunchingGateway}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 text-white font-display font-bold text-sm tracking-wide shadow-[0_12px_32px_rgba(34,211,238,0.25)] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {isLaunchingGateway ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('জিনিপে গেটওয়ে ওপেন হচ্ছে...', 'Connecting to ZiniPay...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('জিনিপে পেমেন্ট গেটওয়েতে যান', 'Proceed to ZiniPay Gateway')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* =====================================================================
          MINIMAL RECENT DEPOSITS LIST
         ===================================================================== */}
      {payments.length > 0 && (
        <div className="rounded-3xl bg-[#0D1220]/75 border border-white/[0.07] p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-bold text-white">
              {t('সাম্প্রতিক ডিপোজিট', 'Recent Deposits')}
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {payments.length} {t('টি লেনদেন', 'transactions')}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {payments.slice(0, 6).map((p) => {
              const isPendingZini =
                p.status === 'pending' && (p.gateway === 'ZiniPay' || Boolean(p.zinipayInvoiceId));
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
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-400">{p.gateway}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                      {p.transactionId} · {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPendingZini && (
                      <button
                        type="button"
                        disabled={verifyingPaymentId === p.id}
                        onClick={() => handleVerifyZiniPayment(p)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-[11px] font-semibold text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${verifyingPaymentId === p.id ? 'animate-spin' : ''}`}
                        />
                        <span>{t('ভেরিফাই', 'Verify')}</span>
                      </button>
                    )}

                    {p.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('সম্পন্ন', 'Completed')}</span>
                      </span>
                    ) : p.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{t('বাতিল', 'Canceled')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('পেন্ডিং', 'Pending')}</span>
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
          ZINIPAY PAYMENT GATEWAY CHECKOUT SCREEN (OPENS DIRECTLY ON PROCEED)
         ===================================================================== */}
      {activeGatewaySession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0D1220] border border-cyan-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* ZiniPay Gateway Header */}
            <div className="bg-gradient-to-r from-[#141B2B] via-[#192337] to-[#141B2B] px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-white font-display font-bold text-lg shadow-md">
                  Z
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-display font-bold text-white">ZiniPay Checkout</h4>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {activeGatewaySession.mode === 'live' ? 'LIVE' : 'GATEWAY'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Invoice: {activeGatewaySession.invoiceId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveGatewaySession(null)}
                className="p-1.5 rounded-xl bg-white/[0.05] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Payable Total Banner */}
              <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-[#080B14] border border-white/[0.07]">
                <div>
                  <div className="text-[11px] text-slate-400">
                    {t('পরিশোধযোগ্য পরিমাণ', 'Payable Amount')}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {siteSettings.siteName || 'AmarTrend SMM'}
                  </div>
                </div>
                <div className="text-2xl font-display font-bold text-cyan-400 font-mono tabular-nums">
                  ৳{activeGatewaySession.amount.toLocaleString()}
                </div>
              </div>

              {!activeGatewaySession.sandboxSimulation ? (
                <div className="space-y-4 text-center py-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t(
                      'নিচের বাটনে ক্লিক করে জিনিপে পেমেন্ট সম্পন্ন করুন। পেমেন্ট শেষ হলে অটোমেটিক আপনার ব্যালেন্স যোগ হবে।',
                      'Complete your payment on ZiniPay. Your balance will be credited automatically.'
                    )}
                  </p>
                  <a
                    href={activeGatewaySession.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>{t('জিনিপে পেমেন্ট পেজ খুলুন', 'Open ZiniPay Checkout')}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                /* ZiniPay Gateway Method & Instant Checkout Flow */
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      {t('পেমেন্ট মেথড নির্বাচন করুন', 'Select Mobile Banking')}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['bKash', 'Nagad', 'Rocket', 'Upay'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setGatewayMethod(m)}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            gatewayMethod === m
                              ? 'bg-cyan-500/20 border-cyan-400 text-white'
                              : 'bg-[#080B14] border-white/[0.08] text-slate-400 hover:text-white'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {gatewayMethod} {t('অ্যাকাউন্ট নম্বর', 'Account Number')}
                      </label>
                      <input
                        type="text"
                        value={gatewayPhone}
                        onChange={(e) => setGatewayPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B14] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">OTP</label>
                        <input
                          type="text"
                          value={gatewayOtp}
                          onChange={(e) => setGatewayOtp(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/10 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">PIN</label>
                        <input
                          type="password"
                          value={gatewayPin}
                          onChange={(e) => setGatewayPin(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/10 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isCompletingGateway}
                    onClick={handleCompleteZiniPayGateway}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
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
                            `পেমেন্ট সম্পন্ন করুন (৳${activeGatewaySession.amount})`,
                            `Confirm Payment (৳${activeGatewaySession.amount})`
                          )}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Secured by ZiniPay Gateway</span>
                </span>
                <span className="font-mono">SSL 256-Bit</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
