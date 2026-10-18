import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Wallet,
  Server,
  Layers,
  AlertTriangle,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Search,
  ShieldAlert,
  Users,
  BarChart3,
  PieChart,
  Calculator,
  Save,
  Zap,
  Clock,
  Calendar,
  Activity,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  SMMOrder,
  SMMPayment,
  SMMService,
  SMMProvider,
  UserProfile,
  SMMCoupon,
  SiteSettings
} from '../../types';
import {
  saveService,
  saveProvider,
  pingProviderOnServer,
  recalculateProviderServicesPrices
} from '../../services/db';

interface AdminFinanceViewProps {
  orders: SMMOrder[];
  payments: SMMPayment[];
  services: SMMService[];
  providers: SMMProvider[];
  users: UserProfile[];
  coupons: SMMCoupon[];
  siteSettings: SiteSettings;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateSection?: (section: any) => void;
}

type FinanceSubTab = 'pnl' | 'services' | 'providers' | 'cashflow' | 'simulator';
type DateRangeKey = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';
type ChartViewMode = 'spline' | 'margin' | 'bars';

/**
 * Generates a smooth SVG cubic bezier path ("M ... C ...") from an array of [x, y] points.
 */
function buildSmoothSvgPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  }
  let path = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const cpx1 = x0 + (x1 - x0) * 0.42;
    const cpy1 = y0;
    const cpx2 = x1 - (x1 - x0) * 0.42;
    const cpy2 = y1;
    path += ` C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return path;
}

export const AdminFinanceView: React.FC<AdminFinanceViewProps> = ({
  orders,
  payments,
  services,
  providers,
  users,
  coupons,
  siteSettings,
  onShowToast
}) => {
  const { formatPrice, language } = useAuth();
  const [subTab, setSubTab] = useState<FinanceSubTab>('pnl');
  const [dateRange, setDateRange] = useState<DateRangeKey>('30d');

  // Custom Date Range State (YYYY-MM-DD)
  const defaultEndStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultStartStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  }, []);
  const [customStartDate, setCustomStartDate] = useState<string>(defaultStartStr);
  const [customEndDate, setCustomEndDate] = useState<string>(defaultEndStr);

  // Provider Filter for Global Financial Intelligence
  const [providerFilterId, setProviderFilterId] = useState<string>('all');

  // Refined Trend Chart Interactive State
  const [chartMode, setChartMode] = useState<ChartViewMode>('spline');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<{
    revenue: boolean;
    cost: boolean;
    profit: boolean;
    margin: boolean;
  }>({
    revenue: true,
    cost: true,
    profit: true,
    margin: true
  });

  // Service Margin Inspector State
  const [serviceQuery, setServiceQuery] = useState('');
  const [marginFilter, setMarginFilter] = useState<'all' | 'low_margin' | 'top_profit' | 'unlinked'>('all');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newSellingRate, setNewSellingRate] = useState<number>(0);
  const [savingServiceRate, setSavingServiceRate] = useState(false);

  // Provider actions state
  const [pingingProviderId, setPingingProviderId] = useState<string | null>(null);

  // Simulator State
  const defaultUsdRate = siteSettings.usdToBdtRate || 122;
  const [simMonthlyVolume, setSimMonthlyVolume] = useState<number>(150000);
  const [simTargetMargin, setSimTargetMargin] = useState<number>(30);
  const [simUsdRate, setSimUsdRate] = useState<number>(defaultUsdRate);
  const [simBonusPercent, setSimBonusPercent] = useState<number>(siteSettings.bkashBonusPercent || 2);
  const [simSelectedProviderId, setSimSelectedProviderId] = useState<string>(providers[0]?.id || '');
  const [applyingSimRule, setApplyingSimRule] = useState(false);

  // Fast Lookup Maps
  const serviceMap = useMemo(() => {
    const map = new Map<string, SMMService>();
    services.forEach(s => map.set(s.id, s));
    return map;
  }, [services]);

  const providerMap = useMemo(() => {
    const map = new Map<string, SMMProvider>();
    providers.forEach(p => map.set(p.id, p));
    return map;
  }, [providers]);

  // Compute accurate upstream operational cost in BDT for an order
  const getOrderFinancials = (order: SMMOrder) => {
    const srv = serviceMap.get(order.serviceId);
    const prvId = order.providerId || srv?.providerId;
    const prv = prvId ? providerMap.get(prvId) : undefined;
    const usdRate = prv?.customExchangeRate || siteSettings.usdToBdtRate || 122;

    let realizedRevenue = order.charge;
    let refundedAmount = 0;

    if (order.status === 'canceled' || order.status === 'refunded') {
      realizedRevenue = 0;
      refundedAmount = order.charge;
    } else if (order.status === 'partial' && order.quantity > 0 && order.remains !== undefined) {
      const clampedRemains = Math.min(Math.max(0, order.remains), order.quantity);
      const deliveredRatio = (order.quantity - clampedRemains) / order.quantity;
      realizedRevenue = Number((order.charge * deliveredRatio).toFixed(2));
      refundedAmount = Number((order.charge - realizedRevenue).toFixed(2));
    }

    let apiCost = 0;
    if (realizedRevenue > 0) {
      const deliveredQty =
        order.status === 'partial' && order.remains !== undefined
          ? Math.max(0, order.quantity - order.remains)
          : order.quantity;

      if (order.providerCost !== undefined && order.providerCost > 0) {
        const ratio = order.quantity > 0 ? deliveredQty / order.quantity : 1;
        apiCost = Number((order.providerCost * ratio).toFixed(2));
      } else if (srv?.originalRate !== undefined && srv.originalRate > 0) {
        const isUsd = !prv || prv.currency?.toUpperCase() === 'USD';
        const costPer1kBdt = isUsd ? srv.originalRate * usdRate : srv.originalRate;
        apiCost = Number(((costPer1kBdt * deliveredQty) / 1000).toFixed(2));
      } else if (prv?.profitMargin !== undefined && prv.profitMargin > 0) {
        apiCost = Number((realizedRevenue / (1 + prv.profitMargin / 100)).toFixed(2));
      } else if (prvId) {
        apiCost = Number((realizedRevenue / 1.25).toFixed(2));
      } else {
        apiCost = 0;
      }
    }

    const netProfit = Number((realizedRevenue - apiCost).toFixed(2));
    const marginPercent = realizedRevenue > 0 ? (netProfit / realizedRevenue) * 100 : 0;

    return {
      grossCharge: order.charge,
      realizedRevenue,
      refundedAmount,
      apiCost,
      netProfit,
      marginPercent,
      providerId: prvId,
      category: order.category || srv?.category || 'Uncategorized'
    };
  };

  // Compute exact [startTimestamp, endTimestamp] and previous comparison window
  const timeWindow = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let startMs = 0;
    let endMs = now;
    let spanDays = 30;

    if (dateRange === 'today') {
      startMs = startOfToday.getTime();
      spanDays = 1;
    } else if (dateRange === '7d') {
      startMs = now - 7 * 24 * 60 * 60 * 1000;
      spanDays = 7;
    } else if (dateRange === '30d') {
      startMs = now - 30 * 24 * 60 * 60 * 1000;
      spanDays = 30;
    } else if (dateRange === '90d') {
      startMs = now - 90 * 24 * 60 * 60 * 1000;
      spanDays = 90;
    } else if (dateRange === 'custom') {
      const s = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
      const e = customEndDate ? new Date(`${customEndDate}T23:59:59.999`).getTime() : now;
      startMs = Number.isNaN(s) ? 0 : Math.min(s, e);
      endMs = Number.isNaN(e) ? now : Math.max(s, e);
      spanDays = Math.max(1, Math.ceil((endMs - startMs) / (24 * 60 * 60 * 1000)));
    } else {
      // 'all'
      const earliestOrder = orders.reduce(
        (min, o) => (o.createdAt && o.createdAt < min ? o.createdAt : min),
        now - 30 * 24 * 60 * 60 * 1000
      );
      startMs = 0;
      spanDays = Math.max(7, Math.min(90, Math.ceil((now - earliestOrder) / (24 * 60 * 60 * 1000))));
    }

    const durationMs = Math.max(24 * 60 * 60 * 1000, endMs - startMs);
    const prevStartMs = startMs > 0 ? startMs - durationMs : 0;
    const prevEndMs = startMs > 0 ? startMs - 1 : 0;

    return { startMs, endMs, prevStartMs, prevEndMs, spanDays };
  }, [dateRange, customStartDate, customEndDate, orders]);

  // Filtered Orders & Payments for Current Period (and optional Provider filter)
  const periodOrders = useMemo(
    () =>
      orders.filter(o => {
        const ts = o.createdAt || 0;
        if (ts < timeWindow.startMs || ts > timeWindow.endMs) return false;
        if (providerFilterId !== 'all') {
          const srv = serviceMap.get(o.serviceId);
          const pId = o.providerId || srv?.providerId || 'manual';
          return pId === providerFilterId;
        }
        return true;
      }),
    [orders, timeWindow, providerFilterId, serviceMap]
  );

  // Previous Period Orders for Delta % Comparison
  const previousPeriodOrders = useMemo(() => {
    if (timeWindow.prevEndMs <= 0) return [];
    return orders.filter(o => {
      const ts = o.createdAt || 0;
      if (ts < timeWindow.prevStartMs || ts > timeWindow.prevEndMs) return false;
      if (providerFilterId !== 'all') {
        const srv = serviceMap.get(o.serviceId);
        const pId = o.providerId || srv?.providerId || 'manual';
        return pId === providerFilterId;
      }
      return true;
    });
  }, [orders, timeWindow, providerFilterId, serviceMap]);

  const periodPayments = useMemo(
    () =>
      payments.filter(p => {
        const ts = p.createdAt || 0;
        return ts >= timeWindow.startMs && ts <= timeWindow.endMs;
      }),
    [payments, timeWindow]
  );

  // Core Executive Financial Aggregations + Period-over-Period Deltas
  const coreMetrics = useMemo(() => {
    let grossOrderVolume = 0;
    let realizedRevenue = 0;
    let totalApiCost = 0;
    let grossOrderProfit = 0;
    let totalRefunded = 0;
    let profitableOrdersCount = 0;
    let lossMakingOrdersCount = 0;

    periodOrders.forEach(o => {
      const fin = getOrderFinancials(o);
      grossOrderVolume += fin.grossCharge;
      realizedRevenue += fin.realizedRevenue;
      totalApiCost += fin.apiCost;
      grossOrderProfit += fin.netProfit;
      totalRefunded += fin.refundedAmount;
      if (fin.realizedRevenue > 0) {
        if (fin.netProfit > 0) profitableOrdersCount++;
        else if (fin.netProfit < 0) lossMakingOrdersCount++;
      }
    });

    // Previous Period Aggregations
    let prevRevenue = 0;
    let prevApiCost = 0;
    let prevProfit = 0;
    previousPeriodOrders.forEach(o => {
      const fin = getOrderFinancials(o);
      prevRevenue += fin.realizedRevenue;
      prevApiCost += fin.apiCost;
      prevProfit += fin.netProfit;
    });
    const prevMarginPercent = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;

    // Approved Deposits & Bonus Expenses
    const approvedDeposits = periodPayments.filter(p => p.status === 'approved');
    const pendingDeposits = periodPayments.filter(p => p.status === 'pending');
    const totalApprovedDepositBdt = approvedDeposits.reduce((acc, p) => acc + p.amount, 0);
    const totalPendingDepositBdt = pendingDeposits.reduce((acc, p) => acc + p.amount, 0);
    const totalDepositBonusExpense = approvedDeposits.reduce((acc, p) => acc + (p.bonus || 0), 0);

    // Promo Coupon Expenses
    const totalCouponExpense = coupons.reduce(
      (acc, c) => acc + (c.usedCount || 0) * (c.rewardAmount || 0),
      0
    );

    // Total Operational Costs (Provider API COGS + Deposit Bonuses)
    const totalOperationalCost = Number((totalApiCost + totalDepositBonusExpense).toFixed(2));

    // Net Operating Profit after Deposit Bonuses
    const netOperatingProfit = Number((grossOrderProfit - totalDepositBonusExpense).toFixed(2));
    const grossMarginPercent = realizedRevenue > 0 ? (grossOrderProfit / realizedRevenue) * 100 : 0;
    const netMarginPercent = realizedRevenue > 0 ? (netOperatingProfit / realizedRevenue) * 100 : 0;
    const roiPercent = totalApiCost > 0 ? (grossOrderProfit / totalApiCost) * 100 : 100;
    const costRatioPercent = realizedRevenue > 0 ? (totalApiCost / realizedRevenue) * 100 : 0;

    // Deltas vs Previous Period
    const revenueDeltaPercent =
      prevRevenue > 0 ? ((realizedRevenue - prevRevenue) / prevRevenue) * 100 : realizedRevenue > 0 ? 100 : 0;
    const costDeltaPercent =
      prevApiCost > 0 ? ((totalApiCost - prevApiCost) / prevApiCost) * 100 : totalApiCost > 0 ? 100 : 0;
    const profitDeltaPercent =
      prevProfit > 0 ? ((grossOrderProfit - prevProfit) / prevProfit) * 100 : grossOrderProfit > 0 ? 100 : 0;
    const marginDeltaPts = grossMarginPercent - prevMarginPercent;

    // Wallet Float & Upstream Liquidity Coverage
    const totalUserWalletFloat = users.reduce((acc, u) => acc + (u.balance || 0), 0);
    const totalProviderBalanceBdt = providers.reduce((acc, p) => {
      const rate =
        p.currency?.toUpperCase() === 'USD' || !p.currency
          ? p.customExchangeRate || siteSettings.usdToBdtRate || 122
          : 1;
      return acc + (p.balance || 0) * rate;
    }, 0);

    const avgCostRatio = realizedRevenue > 0 ? totalApiCost / realizedRevenue : 0.75;
    const estimatedApiCostForUserFloat = totalUserWalletFloat * avgCostRatio;
    const liquidityCoveragePercent =
      estimatedApiCostForUserFloat > 0
        ? Math.min(999, (totalProviderBalanceBdt / estimatedApiCostForUserFloat) * 100)
        : 100;
    const liquidityShortfallBdt = Math.max(0, estimatedApiCostForUserFloat - totalProviderBalanceBdt);

    return {
      grossOrderVolume,
      realizedRevenue,
      totalApiCost,
      totalOperationalCost,
      grossOrderProfit,
      netOperatingProfit,
      totalRefunded,
      grossMarginPercent,
      netMarginPercent,
      roiPercent,
      costRatioPercent,
      revenueDeltaPercent,
      costDeltaPercent,
      profitDeltaPercent,
      marginDeltaPts,
      profitableOrdersCount,
      lossMakingOrdersCount,
      totalApprovedDepositBdt,
      totalPendingDepositBdt,
      totalDepositBonusExpense,
      totalCouponExpense,
      totalUserWalletFloat,
      totalProviderBalanceBdt,
      estimatedApiCostForUserFloat,
      liquidityCoveragePercent,
      liquidityShortfallBdt
    };
  }, [
    periodOrders,
    previousPeriodOrders,
    periodPayments,
    coupons,
    users,
    providers,
    siteSettings.usdToBdtRate,
    serviceMap,
    providerMap
  ]);

  // Dynamic Time-Series Data across Selected/Custom Date Range for Refined Trend Lines
  const dailySeries = useMemo(() => {
    const endD = dateRange === 'custom' && customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
    const rawDays =
      dateRange === 'today'
        ? 7 // Show 7-day context even on Today so trend lines have a trajectory
        : dateRange === '7d'
          ? 7
          : dateRange === '30d'
            ? 15
            : dateRange === '90d'
              ? 30
              : Math.min(30, Math.max(7, timeWindow.spanDays));

    const buckets: {
      dateKey: string;
      label: string;
      revenue: number;
      cost: number;
      bonusCost: number;
      profit: number;
      marginPercent: number;
      ordersCount: number;
    }[] = [];

    for (let i = rawDays - 1; i >= 0; i--) {
      const d = new Date(endD);
      d.setDate(endD.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
      buckets.push({
        dateKey: key,
        label,
        revenue: 0,
        cost: 0,
        bonusCost: 0,
        profit: 0,
        marginPercent: 0,
        ordersCount: 0
      });
    }

    const bucketMap = new Map(buckets.map(b => [b.dateKey, b]));

    orders.forEach(o => {
      if (!o.createdAt) return;
      if (providerFilterId !== 'all') {
        const srv = serviceMap.get(o.serviceId);
        const pId = o.providerId || srv?.providerId || 'manual';
        if (pId !== providerFilterId) return;
      }
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      const bucket = bucketMap.get(key);
      if (bucket) {
        const fin = getOrderFinancials(o);
        bucket.revenue = Number((bucket.revenue + fin.realizedRevenue).toFixed(2));
        bucket.cost = Number((bucket.cost + fin.apiCost).toFixed(2));
        bucket.profit = Number((bucket.profit + fin.netProfit).toFixed(2));
        bucket.ordersCount += 1;
      }
    });

    payments.forEach(p => {
      if (!p.createdAt || p.status !== 'approved' || !p.bonus) return;
      const key = new Date(p.createdAt).toISOString().slice(0, 10);
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.bonusCost = Number((bucket.bonusCost + p.bonus).toFixed(2));
      }
    });

    buckets.forEach(b => {
      b.marginPercent = b.revenue > 0 ? Number(((b.profit / b.revenue) * 100).toFixed(1)) : 0;
    });

    return buckets;
  }, [
    orders,
    payments,
    dateRange,
    customEndDate,
    timeWindow.spanDays,
    providerFilterId,
    language,
    serviceMap,
    providerMap
  ]);

  // SVG Geometry Calculations for Refined Trend Lines
  const svgChartGeometry = useMemo(() => {
    const width = 860;
    const height = 240;
    const padLeft = 16;
    const padRight = 16;
    const padTop = 22;
    const padBottom = 26;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const maxCurrencyVal = Math.max(
      100,
      ...dailySeries.map(d => Math.max(d.revenue, d.cost, Math.max(0, d.profit)))
    );

    const count = dailySeries.length;
    const getX = (idx: number) =>
      count <= 1 ? padLeft + innerW / 2 : padLeft + (idx / (count - 1)) * innerW;
    const getYCurrency = (val: number) =>
      padTop + innerH - (Math.max(0, val) / maxCurrencyVal) * innerH;
    const getYMargin = (pct: number) =>
      padTop + innerH - (Math.min(100, Math.max(0, pct)) / 100) * innerH;

    const revPoints: [number, number][] = dailySeries.map((d, i) => [getX(i), getYCurrency(d.revenue)]);
    const costPoints: [number, number][] = dailySeries.map((d, i) => [getX(i), getYCurrency(d.cost)]);
    const profitPoints: [number, number][] = dailySeries.map((d, i) => [getX(i), getYCurrency(d.profit)]);
    const marginPoints: [number, number][] = dailySeries.map((d, i) => [getX(i), getYMargin(d.marginPercent)]);

    const revPath = buildSmoothSvgPath(revPoints);
    const costPath = buildSmoothSvgPath(costPoints);
    const profitPath = buildSmoothSvgPath(profitPoints);
    const marginPath = buildSmoothSvgPath(marginPoints);

    const baselineY = padTop + innerH;
    const firstX = getX(0);
    const lastX = getX(count - 1);

    const revArea = revPath ? `${revPath} L ${lastX.toFixed(1)} ${baselineY} L ${firstX.toFixed(1)} ${baselineY} Z` : '';
    const costArea = costPath ? `${costPath} L ${lastX.toFixed(1)} ${baselineY} L ${firstX.toFixed(1)} ${baselineY} Z` : '';
    const profitArea = profitPath ? `${profitPath} L ${lastX.toFixed(1)} ${baselineY} L ${firstX.toFixed(1)} ${baselineY} Z` : '';
    const marginArea = marginPath ? `${marginPath} L ${lastX.toFixed(1)} ${baselineY} L ${firstX.toFixed(1)} ${baselineY} Z` : '';

    return {
      width,
      height,
      padTop,
      padBottom,
      innerH,
      baselineY,
      maxCurrencyVal,
      revPoints,
      costPoints,
      profitPoints,
      marginPoints,
      revPath,
      costPath,
      profitPath,
      marginPath,
      revArea,
      costArea,
      profitArea,
      marginArea
    };
  }, [dailySeries]);

  // Mini Sparkline Paths for the 3 Executive KPI Cards
  const kpiSparklines = useMemo(() => {
    const w = 140;
    const h = 38;
    const count = dailySeries.length;
    const maxRev = Math.max(10, ...dailySeries.map(d => d.revenue));
    const maxCost = Math.max(10, ...dailySeries.map(d => d.cost));
    const maxProf = Math.max(10, ...dailySeries.map(d => Math.max(0, d.profit)));

    const mapPts = (getter: (d: typeof dailySeries[0]) => number, maxV: number): [number, number][] =>
      dailySeries.map((d, i) => [
        count <= 1 ? w / 2 : (i / (count - 1)) * w,
        h - 4 - (Math.max(0, getter(d)) / maxV) * (h - 8)
      ]);

    return {
      revSpark: buildSmoothSvgPath(mapPts(d => d.revenue, maxRev)),
      costSpark: buildSmoothSvgPath(mapPts(d => d.cost, maxCost)),
      profSpark: buildSmoothSvgPath(mapPts(d => d.profit, maxProf))
    };
  }, [dailySeries]);

  // Category / Platform Profitability Matrix
  const categoryBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { category: string; orders: number; revenue: number; cost: number; profit: number }
    >();

    periodOrders.forEach(o => {
      const fin = getOrderFinancials(o);
      const cat = fin.category;
      const existing = map.get(cat) || { category: cat, orders: 0, revenue: 0, cost: 0, profit: 0 };
      existing.orders += 1;
      existing.revenue += fin.realizedRevenue;
      existing.cost += fin.apiCost;
      existing.profit += fin.netProfit;
      map.set(cat, existing);
    });

    return Array.from(map.values())
      .map(item => ({
        ...item,
        marginPercent: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [periodOrders, serviceMap, providerMap]);

  // Service-Level Profitability & Margin Leakage Table
  const serviceAnalytics = useMemo(() => {
    const statsByService = new Map<
      string,
      { ordersCount: number; revenue: number; cost: number; profit: number; quantity: number }
    >();

    periodOrders.forEach(o => {
      const fin = getOrderFinancials(o);
      const prev = statsByService.get(o.serviceId) || {
        ordersCount: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        quantity: 0
      };
      prev.ordersCount += 1;
      prev.revenue += fin.realizedRevenue;
      prev.cost += fin.apiCost;
      prev.profit += fin.netProfit;
      prev.quantity += o.quantity;
      statsByService.set(o.serviceId, prev);
    });

    return services
      .map(srv => {
        const st = statsByService.get(srv.id) || {
          ordersCount: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          quantity: 0
        };
        const prv = srv.providerId ? providerMap.get(srv.providerId) : undefined;
        const usdRate = prv?.customExchangeRate || siteSettings.usdToBdtRate || 122;
        const isUsd = !prv || prv.currency?.toUpperCase() === 'USD';

        const upstreamCostPer1kBdt =
          srv.originalRate !== undefined && srv.originalRate > 0
            ? Number((isUsd ? srv.originalRate * usdRate : srv.originalRate).toFixed(2))
            : prv?.profitMargin
              ? Number((srv.rate / (1 + prv.profitMargin / 100)).toFixed(2))
              : 0;

        const unitProfitPer1k = Number((srv.rate - upstreamCostPer1kBdt).toFixed(2));
        const theoreticalMarginPercent =
          srv.rate > 0 && upstreamCostPer1kBdt > 0
            ? ((srv.rate - upstreamCostPer1kBdt) / srv.rate) * 100
            : srv.providerId
              ? 20
              : 100;

        return {
          service: srv,
          providerName: prv?.name || (srv.providerId ? srv.providerId : 'Manual / In-House'),
          upstreamCostPer1kBdt,
          unitProfitPer1k,
          theoreticalMarginPercent,
          ordersCount: st.ordersCount,
          realizedRevenue: st.revenue,
          realizedCost: st.cost,
          realizedProfit: st.profit
        };
      })
      .filter(item => {
        if (providerFilterId !== 'all') {
          const sPrv = item.service.providerId || 'manual';
          if (sPrv !== providerFilterId) return false;
        }
        const matchesSearch =
          !serviceQuery ||
          item.service.name.toLowerCase().includes(serviceQuery.toLowerCase()) ||
          item.service.id.toLowerCase().includes(serviceQuery.toLowerCase()) ||
          item.service.category.toLowerCase().includes(serviceQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (marginFilter === 'low_margin') {
          return item.service.providerId && item.theoreticalMarginPercent < 15;
        }
        if (marginFilter === 'top_profit') {
          return item.realizedProfit > 0;
        }
        if (marginFilter === 'unlinked') {
          return !item.service.providerId;
        }
        return true;
      })
      .sort((a, b) => {
        if (marginFilter === 'low_margin') {
          return a.theoreticalMarginPercent - b.theoreticalMarginPercent;
        }
        return b.realizedProfit - a.realizedProfit || b.theoreticalMarginPercent - a.theoreticalMarginPercent;
      });
  }, [
    services,
    periodOrders,
    serviceQuery,
    marginFilter,
    providerFilterId,
    providerMap,
    siteSettings.usdToBdtRate
  ]);

  // Provider Economics Breakdown
  const providerEconomics = useMemo(() => {
    const daysSpan = Math.max(1, timeWindow.spanDays);

    return providers.map(prv => {
      const rate =
        prv.currency?.toUpperCase() === 'USD' || !prv.currency
          ? prv.customExchangeRate || siteSettings.usdToBdtRate || 122
          : 1;
      const balanceBdt = Number(((prv.balance || 0) * rate).toFixed(2));
      const linkedServicesCount = services.filter(s => s.providerId === prv.id).length;

      let ordersRouted = 0;
      let revenueGenerated = 0;
      let apiCostBdt = 0;
      let netProfitBdt = 0;

      periodOrders.forEach(o => {
        const fin = getOrderFinancials(o);
        if (fin.providerId === prv.id) {
          ordersRouted += 1;
          revenueGenerated += fin.realizedRevenue;
          apiCostBdt += fin.apiCost;
          netProfitBdt += fin.netProfit;
        }
      });

      const dailyBurnBdt = apiCostBdt / daysSpan;
      const estimatedRunwayDays =
        dailyBurnBdt > 0 ? Math.round(balanceBdt / dailyBurnBdt) : 999;

      return {
        provider: prv,
        rate,
        balanceBdt,
        linkedServicesCount,
        ordersRouted,
        revenueGenerated,
        apiCostBdt,
        netProfitBdt,
        effectiveMarginPercent: revenueGenerated > 0 ? (netProfitBdt / revenueGenerated) * 100 : prv.profitMargin,
        dailyBurnBdt,
        estimatedRunwayDays
      };
    });
  }, [providers, services, periodOrders, timeWindow.spanDays, siteSettings.usdToBdtRate]);

  // Payment Gateway Cashflow Breakdown
  const gatewayEconomics = useMemo(() => {
    const gateways: ('ZiniPay' | 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Binance_USDT')[] = [
      'ZiniPay',
      'bKash',
      'Nagad',
      'Rocket',
      'Upay',
      'Binance_USDT'
    ];

    return gateways.map(gw => {
      const gwPayments = periodPayments.filter(p => p.gateway === gw);
      const approved = gwPayments.filter(p => p.status === 'approved');
      const pending = gwPayments.filter(p => p.status === 'pending');
      const rejected = gwPayments.filter(p => p.status === 'rejected');

      const approvedAmount = approved.reduce((acc, p) => acc + p.amount, 0);
      const bonusGiven = approved.reduce((acc, p) => acc + (p.bonus || 0), 0);
      const pendingAmount = pending.reduce((acc, p) => acc + p.amount, 0);
      const approvalRate = gwPayments.length > 0 ? (approved.length / gwPayments.length) * 100 : 100;

      return {
        gateway: gw,
        totalTxCount: gwPayments.length,
        approvedCount: approved.length,
        pendingCount: pending.length,
        rejectedCount: rejected.length,
        approvedAmount,
        bonusGiven,
        pendingAmount,
        approvalRate,
        avgTicketSize: approved.length > 0 ? approvedAmount / approved.length : 0
      };
    });
  }, [periodPayments]);

  // Top VIP Customers by Net Profit Contribution
  const customerProfitRanking = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        email: string;
        ordersCount: number;
        grossRevenue: number;
        apiCost: number;
        netProfit: number;
      }
    >();

    periodOrders.forEach(o => {
      const fin = getOrderFinancials(o);
      const prev = map.get(o.userId) || {
        userId: o.userId,
        email: o.userEmail,
        ordersCount: 0,
        grossRevenue: 0,
        apiCost: 0,
        netProfit: 0
      };
      prev.ordersCount += 1;
      prev.grossRevenue += fin.realizedRevenue;
      prev.apiCost += fin.apiCost;
      prev.netProfit += fin.netProfit;
      map.set(o.userId, prev);
    });

    return Array.from(map.values())
      .map(item => {
        const userObj = users.find(u => u.uid === item.userId);
        return {
          ...item,
          displayName: userObj?.displayName || item.email.split('@')[0],
          walletBalance: userObj?.balance || 0,
          marginPercent: item.grossRevenue > 0 ? (item.netProfit / item.grossRevenue) * 100 : 0
        };
      })
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 10);
  }, [periodOrders, users, serviceMap, providerMap]);

  // Actions: Inline Service Rate Update
  const handleSaveInlineServiceRate = async (srv: SMMService) => {
    if (newSellingRate <= 0) {
      onShowToast('Please enter a valid positive rate', 'error');
      return;
    }
    setSavingServiceRate(true);
    try {
      await saveService({
        ...srv,
        rate: Number(newSellingRate.toFixed(2))
      });
      onShowToast(`Updated selling rate for "${srv.name}" to ৳${newSellingRate}`, 'success');
      setEditingServiceId(null);
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to update service rate', 'error');
    } finally {
      setSavingServiceRate(false);
    }
  };

  // Actions: Ping Live Provider Balance
  const handlePingProvider = async (prv: SMMProvider) => {
    setPingingProviderId(prv.id);
    try {
      const res = await pingProviderOnServer(prv);
      onShowToast(
        `${prv.name}: Balance ${res.balance} ${res.currency} (${res.latencyMs}ms)`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Provider balance check failed', 'error');
    } finally {
      setPingingProviderId(null);
    }
  };

  // Actions: Apply Simulated Margin Rule to Provider
  const handleApplySimulatorToProvider = async () => {
    const prv = providers.find(p => p.id === simSelectedProviderId);
    if (!prv) {
      onShowToast('Select an API Provider first', 'error');
      return;
    }
    setApplyingSimRule(true);
    try {
      const updatedProvider: SMMProvider = {
        ...prv,
        profitMargin: simTargetMargin,
        customExchangeRate: simUsdRate
      };
      await saveProvider(updatedProvider);
      const updatedCount = await recalculateProviderServicesPrices(
        updatedProvider,
        services,
        simUsdRate
      );
      onShowToast(
        `Applied ${simTargetMargin}% margin (@ ৳${simUsdRate}/USD) to ${updatedCount} services on ${prv.name}!`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to apply simulated margin rule', 'error');
    } finally {
      setApplyingSimRule(false);
    }
  };

  // Actions: Export Financial CSV Ledger
  const handleExportFinancialCsv = () => {
    const headers = [
      'Order_ID',
      'Date',
      'Customer_Email',
      'Category',
      'Service_Name',
      'Quantity',
      'Status',
      'Gross_Charge_BDT',
      'Realized_Revenue_BDT',
      'Upstream_API_Cost_BDT',
      'Net_Profit_BDT',
      'Margin_Percent'
    ];

    const rows = periodOrders.map(o => {
      const fin = getOrderFinancials(o);
      const dateStr = o.createdAt ? new Date(o.createdAt).toISOString() : '';
      return [
        o.id,
        dateStr,
        `"${(o.userEmail || '').replace(/"/g, '""')}"`,
        `"${(fin.category || '').replace(/"/g, '""')}"`,
        `"${(o.serviceName || '').replace(/"/g, '""')}"`,
        o.quantity,
        o.status,
        fin.grossCharge.toFixed(2),
        fin.realizedRevenue.toFixed(2),
        fin.apiCost.toFixed(2),
        fin.netProfit.toFixed(2),
        fin.marginPercent.toFixed(1) + '%'
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AmarTrend_Financial_Intelligence_${dateRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Financial Intelligence P&L Ledger exported to CSV!', 'success');
  };

  // Low margin count for badge
  const lowMarginServicesCount = useMemo(
    () =>
      services.filter(s => {
        if (!s.providerId || !s.originalRate) return false;
        const prv = providerMap.get(s.providerId);
        const rate = prv?.customExchangeRate || siteSettings.usdToBdtRate || 122;
        const cost = (!prv || prv.currency?.toUpperCase() === 'USD') ? s.originalRate * rate : s.originalRate;
        return s.rate > 0 && ((s.rate - cost) / s.rate) * 100 < 15;
      }).length,
    [services, providerMap, siteSettings.usdToBdtRate]
  );

  const inspectedBucket =
    hoveredIndex !== null && dailySeries[hoveredIndex]
      ? dailySeries[hoveredIndex]
      : dailySeries[dailySeries.length - 1] || null;

  return (
    <div className="space-y-5">
      {/* =====================================================================
          TOP COMMAND BAR: FINANCIAL INTELLIGENCE + CUSTOM DATE RANGE ENGINE
         ===================================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#22D3EE] font-bold">
                Financial Intelligence & Unit Economics
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-[#F1F5F9] tracking-tight mt-0.5">
              {language === 'bn'
                ? 'ফাইন্যান্সিয়াল ইন্টেলিজেন্স: রেভিনিউ, প্রোভাইডার খরচ ও প্রফিট মার্জিন'
                : 'Financial Intelligence: Revenue, Provider Costs & Profit Margins'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Provider Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#080B14] px-3 py-1.5 rounded-2xl border border-white/[0.07]">
              <Filter className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <select
                value={providerFilterId}
                onChange={e => setProviderFilterId(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-[#F1F5F9] focus:outline-none font-mono"
              >
                <option value="all" className="bg-[#0D1220]">
                  {language === 'bn' ? 'সব প্রোভাইডার (All APIs)' : 'All Service Providers'}
                </option>
                {providers.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0D1220]">
                    {p.name}
                  </option>
                ))}
                <option value="manual" className="bg-[#0D1220]">
                  {language === 'bn' ? 'ইন-হাউস / ম্যানুয়াল' : 'In-House / Manual'}
                </option>
              </select>
            </div>

            {/* Date Horizon Pills */}
            <div className="flex flex-wrap items-center bg-[#080B14] p-1 rounded-2xl border border-white/[0.07]">
              {(
                [
                  { id: 'today', label: language === 'bn' ? 'আজ' : 'Today' },
                  { id: '7d', label: language === 'bn' ? '৭ দিন' : '7D' },
                  { id: '30d', label: language === 'bn' ? '৩০ দিন' : '30D' },
                  { id: '90d', label: language === 'bn' ? '৯০ দিন' : '90D' },
                  { id: 'all', label: language === 'bn' ? 'সব' : 'All' },
                  { id: 'custom', label: language === 'bn' ? 'কাস্টম তারিখ' : 'Custom Range' }
                ] as { id: DateRangeKey; label: string }[]
              ).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDateRange(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold font-mono transition-all ${
                    dateRange === item.id
                      ? 'bg-[#8B5CF6] text-white shadow'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* CSV Ledger Export Button */}
            <button
              type="button"
              onClick={handleExportFinancialCsv}
              className="h-9 px-3.5 rounded-2xl bg-[#141B2B] hover:bg-[#192337] border border-[#22D3EE]/30 text-[#22D3EE] text-xs font-extrabold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'CSV রিপোর্ট' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker Bar (visible when 'custom' is active or quick toggle) */}
        {dateRange === 'custom' && (
          <div className="pt-3 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs text-[#22D3EE] font-mono">
              <Calendar className="w-4 h-4 text-[#8B5CF6]" />
              <span>
                {language === 'bn'
                  ? 'কাস্টম তারিখ সীমা নির্বাচন করুন:'
                  : 'Select Custom Date Range Window:'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-[#080B14] border border-white/10 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-mono uppercase text-[#94A3B8]">From</span>
                <input
                  type="date"
                  value={customStartDate}
                  max={customEndDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <span className="text-[#94A3B8] font-mono text-xs">→</span>

              <div className="flex items-center gap-2 bg-[#080B14] border border-white/10 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-mono uppercase text-[#94A3B8]">To</span>
                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <span className="px-2.5 py-1.5 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[11px] font-mono text-[#F1F5F9]">
                {timeWindow.spanDays} {language === 'bn' ? 'দিনের হিসাব' : 'days selected'} ({periodOrders.length} orders)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          5 SUB-MODULE NAVIGATION TABS
         ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-3xl bg-[#0D1220] border border-white/[0.07]">
        {[
          {
            id: 'pnl' as FinanceSubTab,
            label: language === 'bn' ? 'ট্রেন্ড ও লাভ-ক্ষতি' : 'Revenue, Costs & Trends',
            icon: TrendingUp
          },
          {
            id: 'services' as FinanceSubTab,
            label: language === 'bn' ? 'সার্ভিস মার্জিন অডিট' : 'Service Margins',
            icon: Layers,
            badge: lowMarginServicesCount > 0 ? lowMarginServicesCount : undefined
          },
          {
            id: 'providers' as FinanceSubTab,
            label: language === 'bn' ? 'API প্রোভাইডার খরচ' : 'Provider Costs',
            icon: Server
          },
          {
            id: 'cashflow' as FinanceSubTab,
            label: language === 'bn' ? 'গেটওয়ে ক্যাশফ্লো' : 'Gateway Cashflow',
            icon: Wallet
          },
          {
            id: 'simulator' as FinanceSubTab,
            label: language === 'bn' ? 'প্রফিট সিমুলেটর ও VIP' : 'Simulator & VIPs',
            icon: Calculator
          }
        ].map(tab => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`relative py-2.5 px-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                active
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-lg shadow-[#8B5CF6]/25'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.03]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SUB-TAB 1: REVENUE, OPERATIONAL COSTS & REFINED TREND LINES
         ===================================================================== */}
      {subTab === 'pnl' && (
        <div className="space-y-4">
          {/* 3 Primary Executive KPI Cards with Embedded Refined Sparkline Curves */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: Total Revenue */}
            <div className="p-5 rounded-3xl bg-[#0D1220] border border-[#8B5CF6]/35 shadow-xl flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#8B5CF6] font-bold">
                    {language === 'bn' ? 'মোট অর্ডার রেভিনিউ' : 'Total Realized Revenue'}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#F1F5F9] font-mono tabular-nums mt-1">
                    {formatPrice(coreMetrics.realizedRevenue)}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-black ${
                    coreMetrics.revenueDeltaPercent >= 0
                      ? 'bg-[#8B5CF6]/15 text-[#22D3EE] border border-[#8B5CF6]/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {coreMetrics.revenueDeltaPercent >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(coreMetrics.revenueDeltaPercent).toFixed(1)}%
                </span>
              </div>

              {/* Embedded SVG Sparkline */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-[#94A3B8] font-mono space-y-0.5">
                  <p>Gross Volume: <strong className="text-white">{formatPrice(coreMetrics.grossOrderVolume)}</strong></p>
                  <p>Refunded: <strong className="text-rose-400">{formatPrice(coreMetrics.totalRefunded)}</strong> ({periodOrders.length} ord)</p>
                </div>
                <svg width="140" height="38" viewBox="0 0 140 38" className="shrink-0 overflow-visible">
                  <path
                    d={kpiSparklines.revSpark}
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Card 2: Operational Costs (Service Providers + Bonuses) */}
            <div className="p-5 rounded-3xl bg-[#0D1220] border border-amber-500/35 shadow-xl flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    {language === 'bn' ? 'অপারেশনাল ও API প্রোভাইডার খরচ' : 'Operational Costs (Providers)'}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums mt-1">
                    {formatPrice(coreMetrics.totalApiCost)}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-black">
                  {coreMetrics.costRatioPercent.toFixed(1)}% of Rev
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-[#94A3B8] font-mono space-y-0.5">
                  <p>Bonus Expense: <strong className="text-[#22D3EE]">{formatPrice(coreMetrics.totalDepositBonusExpense)}</strong></p>
                  <p>Total OpEx: <strong className="text-white">{formatPrice(coreMetrics.totalOperationalCost)}</strong></p>
                </div>
                <svg width="140" height="38" viewBox="0 0 140 38" className="shrink-0 overflow-visible">
                  <path
                    d={kpiSparklines.costSpark}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Card 3: Net Profit & Net Profit Margin % */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-[#141B2B] via-[#0D1220] to-[#080B14] border border-[#22C55E]/40 shadow-xl flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#22C55E] font-bold">
                    {language === 'bn' ? 'নিট প্রফিট ও প্রফিট মার্জিন' : 'Net Profit & Margin'}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#22C55E] font-mono tabular-nums mt-1">
                    +{formatPrice(coreMetrics.grossOrderProfit)}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/35 text-[#22C55E] text-xs font-mono font-black">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {coreMetrics.grossMarginPercent.toFixed(1)}% Margin
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-[#94A3B8] font-mono space-y-0.5">
                  <p>After Bonuses: <strong className="text-white">{formatPrice(coreMetrics.netOperatingProfit)}</strong> ({coreMetrics.netMarginPercent.toFixed(1)}%)</p>
                  <p>Provider ROI: <strong className="text-emerald-400">+{coreMetrics.roiPercent.toFixed(0)}%</strong></p>
                </div>
                <svg width="140" height="38" viewBox="0 0 140 38" className="shrink-0 overflow-visible">
                  <path
                    d={kpiSparklines.profSpark}
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* =================================================================
              REFINED MULTI-SERIES SVG TREND LINE CANVAS (SPLINE / MARGIN / BARS)
             ================================================================= */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-4 shadow-2xl">
            {/* Chart Top Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#22D3EE]" />
                  <h3 className="text-sm sm:text-base font-extrabold text-[#F1F5F9]">
                    {language === 'bn'
                      ? 'রেভিনিউ, প্রোভাইডার অপারেশনাল খরচ ও নিট প্রফিট ট্রেন্ড লাইন'
                      : 'Revenue, Operational Costs & Net Profit Margin Trajectory'}
                  </h3>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  {language === 'bn'
                    ? 'গ্রাফের যেকোনো বিন্দুতে মাউস বা আঙুল রাখলে ঐ দিনের নিখুঁত হিসাব দেখা যাবে'
                    : 'Interactive cubic-bezier trend lines across your selected timeframe — hover or tap any point to inspect'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Series Visibility Toggles */}
                {chartMode === 'spline' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setVisibleSeries(s => ({ ...s, revenue: !s.revenue }))}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                        visibleSeries.revenue
                          ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/40 text-[#F1F5F9]'
                          : 'bg-[#080B14] border-white/5 text-[#64748B]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                      Revenue
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisibleSeries(s => ({ ...s, cost: !s.cost }))}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                        visibleSeries.cost
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-[#080B14] border-white/5 text-[#64748B]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Provider Cost
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisibleSeries(s => ({ ...s, profit: !s.profit }))}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                        visibleSeries.profit
                          ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                          : 'bg-[#080B14] border-white/5 text-[#64748B]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      Net Profit
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisibleSeries(s => ({ ...s, margin: !s.margin }))}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                        visibleSeries.margin
                          ? 'bg-[#22D3EE]/15 border-[#22D3EE]/40 text-[#22D3EE]'
                          : 'bg-[#080B14] border-white/5 text-[#64748B]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                      Margin %
                    </button>
                  </div>
                )}

                {/* Chart Mode Switcher */}
                <div className="flex items-center bg-[#080B14] p-1 rounded-2xl border border-white/[0.07]">
                  {(
                    [
                      { id: 'spline', label: language === 'bn' ? 'ট্রেন্ড লাইন' : 'Trend Lines' },
                      { id: 'margin', label: language === 'bn' ? 'মার্জিন % কার্ভ' : 'Margin % Curve' },
                      { id: 'bars', label: language === 'bn' ? 'বার চার্ট' : 'Bars' }
                    ] as { id: ChartViewMode; label: string }[]
                  ).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setChartMode(m.id)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-extrabold transition-all ${
                        chartMode === m.id
                          ? 'bg-[#141B2B] text-[#22D3EE] border border-[#22D3EE]/30'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Crosshair Telemetry Strip */}
            {inspectedBucket && (
              <div className="p-3 rounded-2xl bg-[#080B14] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-[#141B2B] text-[#22D3EE] font-bold">
                    {inspectedBucket.label}
                  </span>
                  <span className="text-[#94A3B8] text-[11px]">
                    ({inspectedBucket.ordersCount} orders)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                  <span>
                    <span className="text-[#94A3B8]">Revenue: </span>
                    <strong className="text-[#8B5CF6]">{formatPrice(inspectedBucket.revenue)}</strong>
                  </span>
                  <span>
                    <span className="text-[#94A3B8]">Provider Cost: </span>
                    <strong className="text-amber-400">{formatPrice(inspectedBucket.cost)}</strong>
                  </span>
                  <span>
                    <span className="text-[#94A3B8]">Net Profit: </span>
                    <strong className="text-[#22C55E]">+{formatPrice(inspectedBucket.profit)}</strong>
                  </span>
                  <span>
                    <span className="text-[#94A3B8]">Margin: </span>
                    <strong className="text-[#22D3EE]">{inspectedBucket.marginPercent.toFixed(1)}%</strong>
                  </span>
                </div>
              </div>
            )}

            {/* SVG Trend Line Viewport */}
            {chartMode === 'spline' || chartMode === 'margin' ? (
              <div className="relative w-full rounded-2xl bg-[#080B14] border border-white/[0.05] p-3 overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgChartGeometry.width} ${svgChartGeometry.height}`}
                  className="w-full h-60 overflow-visible select-none"
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <defs>
                    <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="finCostGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="finProfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.34" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="finMargGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Reference Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = svgChartGeometry.padTop + ratio * svgChartGeometry.innerH;
                    const labelVal =
                      chartMode === 'margin'
                        ? `${Math.round((1 - ratio) * 100)}%`
                        : formatPrice((1 - ratio) * svgChartGeometry.maxCurrencyVal);
                    return (
                      <g key={idx}>
                        <line
                          x1={16}
                          y1={y}
                          x2={svgChartGeometry.width - 16}
                          y2={y}
                          stroke="rgba(255,255,255,0.05)"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={20}
                          y={y - 4}
                          fill="#64748B"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {labelVal}
                        </text>
                      </g>
                    );
                  })}

                  {chartMode === 'spline' ? (
                    <>
                      {/* Gradient Area Underlays */}
                      {visibleSeries.revenue && svgChartGeometry.revArea && (
                        <path d={svgChartGeometry.revArea} fill="url(#finRevGrad)" />
                      )}
                      {visibleSeries.cost && svgChartGeometry.costArea && (
                        <path d={svgChartGeometry.costArea} fill="url(#finCostGrad)" />
                      )}
                      {visibleSeries.profit && svgChartGeometry.profitArea && (
                        <path d={svgChartGeometry.profitArea} fill="url(#finProfGrad)" />
                      )}

                      {/* Smooth Cubic Bezier Trend Lines */}
                      {visibleSeries.revenue && (
                        <path
                          d={svgChartGeometry.revPath}
                          fill="none"
                          stroke="#8B5CF6"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                      )}
                      {visibleSeries.cost && (
                        <path
                          d={svgChartGeometry.costPath}
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                      )}
                      {visibleSeries.profit && (
                        <path
                          d={svgChartGeometry.profitPath}
                          fill="none"
                          stroke="#22C55E"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      )}
                      {visibleSeries.margin && (
                        <path
                          d={svgChartGeometry.marginPath}
                          fill="none"
                          stroke="#22D3EE"
                          strokeWidth="1.8"
                          strokeDasharray="5 4"
                          strokeLinecap="round"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {/* Dedicated Net Profit Margin % Curve */}
                      {svgChartGeometry.marginArea && (
                        <path d={svgChartGeometry.marginArea} fill="url(#finMargGrad)" />
                      )}
                      <path
                        d={svgChartGeometry.marginPath}
                        fill="none"
                        stroke="#22D3EE"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </>
                  )}

                  {/* Active Crosshair Vertical Line & Glowing Data Nodes */}
                  {hoveredIndex !== null && svgChartGeometry.revPoints[hoveredIndex] && (
                    <g>
                      <line
                        x1={svgChartGeometry.revPoints[hoveredIndex][0]}
                        y1={svgChartGeometry.padTop}
                        x2={svgChartGeometry.revPoints[hoveredIndex][0]}
                        y2={svgChartGeometry.baselineY}
                        stroke="rgba(34,211,238,0.45)"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      {chartMode === 'spline' ? (
                        <>
                          {visibleSeries.revenue && (
                            <circle
                              cx={svgChartGeometry.revPoints[hoveredIndex][0]}
                              cy={svgChartGeometry.revPoints[hoveredIndex][1]}
                              r="5"
                              fill="#8B5CF6"
                              stroke="#080B14"
                              strokeWidth="2"
                            />
                          )}
                          {visibleSeries.cost && (
                            <circle
                              cx={svgChartGeometry.costPoints[hoveredIndex][0]}
                              cy={svgChartGeometry.costPoints[hoveredIndex][1]}
                              r="5"
                              fill="#F59E0B"
                              stroke="#080B14"
                              strokeWidth="2"
                            />
                          )}
                          {visibleSeries.profit && (
                            <circle
                              cx={svgChartGeometry.profitPoints[hoveredIndex][0]}
                              cy={svgChartGeometry.profitPoints[hoveredIndex][1]}
                              r="5.5"
                              fill="#22C55E"
                              stroke="#080B14"
                              strokeWidth="2"
                            />
                          )}
                          {visibleSeries.margin && (
                            <circle
                              cx={svgChartGeometry.marginPoints[hoveredIndex][0]}
                              cy={svgChartGeometry.marginPoints[hoveredIndex][1]}
                              r="4.5"
                              fill="#22D3EE"
                              stroke="#080B14"
                              strokeWidth="2"
                            />
                          )}
                        </>
                      ) : (
                        <circle
                          cx={svgChartGeometry.marginPoints[hoveredIndex][0]}
                          cy={svgChartGeometry.marginPoints[hoveredIndex][1]}
                          r="6"
                          fill="#22D3EE"
                          stroke="#080B14"
                          strokeWidth="2"
                        />
                      )}
                    </g>
                  )}

                  {/* X-Axis Labels & Invisible Hover Hit Columns */}
                  {dailySeries.map((day, idx) => {
                    const x = svgChartGeometry.revPoints[idx]?.[0] || 0;
                    const showLabel =
                      dailySeries.length <= 10 ||
                      idx === 0 ||
                      idx === dailySeries.length - 1 ||
                      idx % Math.ceil(dailySeries.length / 7) === 0;
                    const colWidth = svgChartGeometry.width / Math.max(1, dailySeries.length);

                    return (
                      <g key={day.dateKey}>
                        {showLabel && (
                          <text
                            x={x}
                            y={svgChartGeometry.height - 6}
                            textAnchor="middle"
                            fill={hoveredIndex === idx ? '#22D3EE' : '#94A3B8'}
                            fontSize="9.5"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {day.label}
                          </text>
                        )}
                        <rect
                          x={x - colWidth / 2}
                          y={0}
                          width={colWidth}
                          height={svgChartGeometry.height}
                          fill="transparent"
                          className="cursor-crosshair"
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onTouchStart={() => setHoveredIndex(idx)}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              /* Comparative Bar Chart Mode */
              <div className="h-56 pt-6 pb-2 px-2 rounded-2xl bg-[#080B14] border border-white/[0.05] flex items-end justify-between gap-1.5 sm:gap-3 overflow-x-auto">
                {dailySeries.map((day, idx) => {
                  const maxV = svgChartGeometry.maxCurrencyVal;
                  const revH = Math.max(4, Math.round((day.revenue / maxV) * 150));
                  const costH = Math.max(4, Math.round((day.cost / maxV) * 150));
                  const profH = Math.max(4, Math.round((Math.max(0, day.profit) / maxV) * 150));

                  return (
                    <div
                      key={day.dateKey}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      className="group relative flex-1 min-w-[38px] flex flex-col items-center justify-end h-full cursor-pointer"
                    >
                      <div className="flex items-end gap-1 w-full justify-center">
                        <div
                          style={{ height: `${revH}px` }}
                          className="w-2 sm:w-2.5 rounded-t-md bg-[#8B5CF6]/85 group-hover:bg-[#8B5CF6] transition-all"
                        />
                        <div
                          style={{ height: `${costH}px` }}
                          className="w-2 sm:w-2.5 rounded-t-md bg-amber-400/85 group-hover:bg-amber-400 transition-all"
                        />
                        <div
                          style={{ height: `${profH}px` }}
                          className="w-2 sm:w-2.5 rounded-t-md bg-[#22C55E] group-hover:brightness-110 transition-all"
                        />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-mono text-[#94A3B8] mt-2 truncate">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wallet Liability vs Upstream API Reserve + Category Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Wallet Float Liability & API Runway Monitor (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    {language === 'bn' ? 'ওয়ালেট ফ্লোট ও কভারেজ অডিট' : 'Liability & API Float Coverage'}
                  </span>
                  <h4 className="text-sm sm:text-base font-extrabold text-[#F1F5F9] mt-0.5">
                    {language === 'bn'
                      ? 'ইউজার ব্যালেন্স বনাম API প্যানেল রিজার্ভ'
                      : 'User Wallet Liability vs. Upstream API Reserve'}
                  </h4>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-black ${
                    coreMetrics.liquidityCoveragePercent >= 100
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {coreMetrics.liquidityCoveragePercent.toFixed(0)}% Covered
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#141B2B]/90 border border-white/[0.06]">
                  <p className="text-[10px] text-[#94A3B8] font-semibold">
                    {language === 'bn' ? 'ইউজারের জমা ব্যালেন্স (Liability)' : 'User Wallet Balances'}
                  </p>
                  <p className="text-base font-black text-white font-mono tabular-nums mt-1">
                    {formatPrice(coreMetrics.totalUserWalletFloat)}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                    Est. API Cost: {formatPrice(coreMetrics.estimatedApiCostForUserFloat)}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#141B2B]/90 border border-white/[0.06]">
                  <p className="text-[10px] text-[#94A3B8] font-semibold">
                    {language === 'bn' ? 'API প্যানেলে মোট রিজার্ভ' : 'Total API Provider Balance'}
                  </p>
                  <p className="text-base font-black text-[#22D3EE] font-mono tabular-nums mt-1">
                    {formatPrice(coreMetrics.totalProviderBalanceBdt)}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                    Across {providers.length} connected APIs
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="w-full h-2.5 rounded-full bg-[#080B14] overflow-hidden border border-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      coreMetrics.liquidityCoveragePercent >= 100
                        ? 'bg-gradient-to-r from-[#22C55E] to-[#22D3EE]'
                        : 'bg-gradient-to-r from-amber-500 to-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(8, coreMetrics.liquidityCoveragePercent))}%` }}
                  />
                </div>

                {coreMetrics.liquidityShortfallBdt > 0 ? (
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-[11px] text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {language === 'bn'
                        ? `সতর্কতা: সব ইউজার একসাথে অর্ডার করলে আপনার API প্যানেলে আরও ${formatPrice(coreMetrics.liquidityShortfallBdt)} সমপরিমাণ ফান্ড লাগবে।`
                        : `Liquidity Alert: Top up ~${formatPrice(coreMetrics.liquidityShortfallBdt)} across upstream APIs to 100% back all user wallet balances.`}
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {language === 'bn'
                        ? 'আপনার API প্রোভাইডার ব্যালেন্স সম্পূর্ণ নিরাপদ এবং ইউজার ওয়ালেট ফ্লোটের চেয়ে বেশি রয়েছে।'
                        : 'Healthy Reserve: Your upstream API balances fully cover 100% of active user wallet liabilities.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Platform / Category Profit Matrix (7 cols) */}
            <div className="lg:col-span-7 p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#F1F5F9] flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#8B5CF6]" />
                  <span>
                    {language === 'bn'
                      ? 'প্ল্যাটফর্ম ও ক্যাটাগরি ভিত্তিক প্রফিট মার্জিন'
                      : 'Profitability & Operational Cost by Platform'}
                  </span>
                </h3>
                <span className="text-[11px] font-mono text-[#94A3B8]">
                  {categoryBreakdown.length} categories active
                </span>
              </div>

              {categoryBreakdown.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#080B14] text-center text-xs text-[#94A3B8]">
                  {language === 'bn'
                    ? 'নির্বাচিত সময়ে কোনো অর্ডার ডাটা পাওয়া যায়নি।'
                    : 'No orders recorded in this custom date range.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {categoryBreakdown.map(cat => (
                    <div
                      key={cat.category}
                      className="p-3.5 rounded-2xl bg-[#141B2B]/70 border border-white/[0.06] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-white truncate">{cat.category}</p>
                          <p className="text-[10px] font-mono text-[#94A3B8]">
                            {cat.orders} ord · Cost: {formatPrice(cat.cost)}
                          </p>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <span className="text-xs font-black text-[#22C55E]">
                            +{formatPrice(cat.profit)} ({cat.marginPercent.toFixed(0)}%)
                          </span>
                          <p className="text-[10px] text-[#94A3B8]">
                            Rev: {formatPrice(cat.revenue)}
                          </p>
                        </div>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-[#080B14] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#22C55E]"
                          style={{ width: `${Math.min(100, Math.max(5, cat.marginPercent * 2))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: SERVICE MARGIN INSPECTOR & 1-CLICK RATE OPTIMIZER
         ===================================================================== */}
      {subTab === 'services' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>
                    {language === 'bn'
                      ? 'সার্ভিস মার্জিন অডিট ও রেট অপটিমাইজার'
                      : 'Service Unit Economics & Margin Leakage Detector'}
                  </span>
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  {language === 'bn'
                    ? 'কোন সার্ভিসে কত খরচ এবং কত লাভ হচ্ছে দেখুন এবং সরাসরি রেট আপডেট করুন'
                    : 'Inspect wholesale API cost vs. selling rate per 1K and fix low-margin services inline'}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: language === 'bn' ? 'সব সার্ভিস' : 'All Services' },
                  {
                    id: 'low_margin',
                    label: language === 'bn' ? `কম লাভ (<15%) [${lowMarginServicesCount}]` : `Low Margin (<15%) [${lowMarginServicesCount}]`
                  },
                  { id: 'top_profit', label: language === 'bn' ? 'টপ প্রফিট' : 'Top Profit' },
                  { id: 'unlinked', label: language === 'bn' ? 'ম্যানুয়াল সার্ভিস' : 'In-House / Manual' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setMarginFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all ${
                      marginFilter === f.id
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-[#141B2B] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={serviceQuery}
                onChange={e => setServiceQuery(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'সার্ভিস নাম, আইডি বা ক্যাটাগরি লিখে খুঁজুন...'
                    : 'Search service by ID, name, or category...'
                }
                className="w-full bg-[#080B14] border border-white/[0.08] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {serviceAnalytics.slice(0, 60).map(item => {
              const isLowMargin = item.service.providerId && item.theoreticalMarginPercent < 15;
              const isNegative = item.service.providerId && item.unitProfitPer1k < 0;

              return (
                <div
                  key={item.service.id}
                  className={`p-4 rounded-3xl border transition-all ${
                    isNegative
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isLowMargin
                        ? 'bg-amber-950/15 border-amber-500/35'
                        : 'bg-[#0D1220] border-white/[0.07]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-[#141B2B] border border-white/10 text-[10px] font-mono font-bold text-[#22D3EE]">
                          #{item.service.id}
                        </span>
                        <span className="text-[10px] font-mono text-[#94A3B8] bg-white/[0.04] px-2 py-0.5 rounded-lg">
                          {item.providerName}
                        </span>
                        {isNegative && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 text-[10px] font-mono font-black">
                            LOSS ALERT (লস হচ্ছে!)
                          </span>
                        )}
                        {!isNegative && isLowMargin && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                            Low Margin ({item.theoreticalMarginPercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {item.service.name}
                      </h4>
                      <p className="text-[11px] text-[#94A3B8]">
                        {item.service.category} · {item.ordersCount} orders in period
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0 font-mono text-xs">
                      <div className="p-2.5 rounded-2xl bg-[#080B14] border border-white/[0.06]">
                        <span className="text-[9px] text-[#94A3B8] block uppercase">API Cost / 1K</span>
                        <strong className="text-amber-400">
                          {item.upstreamCostPer1kBdt > 0 ? formatPrice(item.upstreamCostPer1kBdt) : '৳0.00'}
                        </strong>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-[#080B14] border border-white/[0.06]">
                        <span className="text-[9px] text-[#94A3B8] block uppercase">Selling / 1K</span>
                        <strong className="text-white">{formatPrice(item.service.rate)}</strong>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-[#080B14] border border-white/[0.06]">
                        <span className="text-[9px] text-[#94A3B8] block uppercase">Profit / 1K</span>
                        <strong className={item.unitProfitPer1k >= 0 ? 'text-[#22C55E]' : 'text-rose-400'}>
                          {item.unitProfitPer1k >= 0 ? '+' : ''}
                          {formatPrice(item.unitProfitPer1k)} ({item.theoreticalMarginPercent.toFixed(0)}%)
                        </strong>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-[#080B14] border border-white/[0.06] flex flex-col justify-between">
                        <span className="text-[9px] text-[#94A3B8] block uppercase">Total Earned</span>
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-[#22D3EE]">{formatPrice(item.realizedProfit)}</strong>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingServiceId(item.service.id);
                              const suggestedRate =
                                item.upstreamCostPer1kBdt > 0
                                  ? Number((item.upstreamCostPer1kBdt * 1.3).toFixed(2))
                                  : item.service.rate;
                              setNewSellingRate(suggestedRate);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-[#8B5CF6]/20 hover:bg-[#8B5CF6] text-[#22D3EE] hover:text-white text-[10px] font-sans font-bold transition-colors"
                          >
                            Edit Rate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {editingServiceId === item.service.id && (
                    <div className="mt-3 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-[#94A3B8] font-mono">
                        API Cost: <strong className="text-amber-400">৳{item.upstreamCostPer1kBdt}</strong> ·
                        Suggested (+30%):{' '}
                        <strong className="text-emerald-400">
                          ৳{(item.upstreamCostPer1kBdt * 1.3).toFixed(2)}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={newSellingRate}
                          onChange={e => setNewSellingRate(parseFloat(e.target.value) || 0)}
                          className="w-28 bg-[#080B14] border border-[#8B5CF6] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                        />
                        <button
                          type="button"
                          disabled={savingServiceRate}
                          onClick={() => handleSaveInlineServiceRate(item.service)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#22C55E] text-slate-950 font-extrabold text-xs flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Rate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingServiceId(null)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#141B2B] text-[#94A3B8] text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: API PROVIDER OPERATIONAL COSTS & BALANCE BURN RATE
         ===================================================================== */}
      {subTab === 'providers' && (
        <div className="space-y-4">
          {providerEconomics.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#0D1220] border border-white/[0.08] text-center text-xs text-[#94A3B8]">
              {language === 'bn'
                ? 'কোনো API প্রোভাইডার যুক্ত করা নেই।'
                : 'No upstream API providers connected yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {providerEconomics.map(item => {
                const p = item.provider;
                const isLowRunway = item.estimatedRunwayDays < 7;

                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-white">{p.name}</h4>
                          <span className="px-2 py-0.5 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#22D3EE] text-[10px] font-mono font-bold">
                            +{p.profitMargin}% Rule
                          </span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                          {item.linkedServicesCount} linked services · 1 USD = ৳{item.rate}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePingProvider(p)}
                        disabled={pingingProviderId === p.id}
                        className="px-3 py-1.5 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/10 text-xs font-bold text-[#22D3EE] flex items-center gap-1.5 active:scale-95"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${pingingProviderId === p.id ? 'animate-spin' : ''}`}
                        />
                        <span>Ping Balance</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                      <div className="p-3 rounded-2xl bg-[#080B14] border border-white/[0.06]">
                        <span className="text-[10px] text-[#94A3B8] block">Live Balance</span>
                        <strong className="text-sm text-[#22D3EE] block mt-0.5">
                          {p.balance.toFixed(2)} {p.currency}
                        </strong>
                        <span className="text-[10px] text-[#64748B]">≈ {formatPrice(item.balanceBdt)}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#080B14] border border-white/[0.06]">
                        <span className="text-[10px] text-[#94A3B8] block">Sales Revenue</span>
                        <strong className="text-sm text-white block mt-0.5">
                          {formatPrice(item.revenueGenerated)}
                        </strong>
                        <span className="text-[10px] text-[#64748B]">{item.ordersRouted} orders</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#080B14] border border-white/[0.06]">
                        <span className="text-[10px] text-[#94A3B8] block">Provider Cost</span>
                        <strong className="text-sm text-amber-400 block mt-0.5">
                          {formatPrice(item.apiCostBdt)}
                        </strong>
                        <span className="text-[10px] text-[#64748B]">
                          Burn: {formatPrice(item.dailyBurnBdt)}/d
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#080B14] border border-white/[0.06]">
                        <span className="text-[10px] text-[#94A3B8] block">Net Profit</span>
                        <strong className="text-sm text-[#22C55E] block mt-0.5">
                          +{formatPrice(item.netProfitBdt)}
                        </strong>
                        <span className="text-[10px] text-emerald-400">
                          {item.effectiveMarginPercent.toFixed(1)}% margin
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-[#94A3B8] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
                        {language === 'bn' ? 'ব্যালেন্স রানওয়ে (কত দিন চলবে):' : 'Estimated Balance Runway:'}
                      </span>
                      <span
                        className={`font-mono font-black ${
                          isLowRunway ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {item.estimatedRunwayDays >= 900
                          ? '90+ Days (Safe)'
                          : `~${item.estimatedRunwayDays} Days remaining`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: PAYMENT GATEWAY CASHFLOW & BONUS AUDIT
         ===================================================================== */}
      {subTab === 'cashflow' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-3xl bg-[#0D1220] border border-emerald-500/30">
              <p className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                {language === 'bn' ? 'মোট অনুমোদিত ডিপোজিট (Cash In)' : 'Approved Cash Inflow'}
              </p>
              <p className="text-2xl font-black text-white font-mono mt-1">
                {formatPrice(coreMetrics.totalApprovedDepositBdt)}
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-[#0D1220] border border-amber-500/30">
              <p className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                {language === 'bn' ? 'পেন্ডিং ডিপোজিট কিউ' : 'Pending Verification Queue'}
              </p>
              <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                {formatPrice(coreMetrics.totalPendingDepositBdt)}
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-[#0D1220] border border-[#8B5CF6]/30">
              <p className="text-[10px] font-mono uppercase text-[#22D3EE] font-bold">
                {language === 'bn' ? 'মোট ডিপোজিট বোনাস ও প্রোমো খরচ' : 'Total Bonus & Coupon Expense'}
              </p>
              <p className="text-2xl font-black text-[#22D3EE] font-mono mt-1">
                {formatPrice(coreMetrics.totalDepositBonusExpense + coreMetrics.totalCouponExpense)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {gatewayEconomics.map(gw => (
              <div
                key={gw.gateway}
                className="p-4 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">{gw.gateway.replace('_', ' ')}</span>
                  <span className="px-2.5 py-0.5 rounded-xl bg-[#141B2B] text-[#22D3EE] text-[10px] font-mono font-bold">
                    {gw.approvalRate.toFixed(0)}% Approved
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="p-2.5 rounded-2xl bg-[#080B14] border border-white/[0.05]">
                    <span className="text-[10px] text-[#94A3B8] block">Approved Volume</span>
                    <strong className="text-[#22C55E]">{formatPrice(gw.approvedAmount)}</strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-[#080B14] border border-white/[0.05]">
                    <span className="text-[10px] text-[#94A3B8] block">Bonus Given</span>
                    <strong className="text-amber-400">{formatPrice(gw.bonusGiven)}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono pt-1 border-t border-white/[0.06]">
                  <span>
                    Tx: {gw.approvedCount} ok / {gw.pendingCount} wait / {gw.rejectedCount} rej
                  </span>
                  <span>Avg: {formatPrice(gw.avgTicketSize)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 5: WHAT-IF PROFIT SIMULATOR & VIP CUSTOMER LTV RANKING
         ===================================================================== */}
      {subTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 p-5 rounded-3xl bg-[#0D1220] border border-[#8B5CF6]/35 space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#22D3EE] font-bold">
                What-If Pricing Lab
              </span>
              <h3 className="text-base font-black text-white mt-0.5">
                {language === 'bn'
                  ? 'প্রফিট মার্জিন ও ফোরকাস্ট সিমুলেটর'
                  : 'Interactive Profit & Margin Simulator'}
              </h3>
              <p className="text-xs text-[#94A3B8]">
                {language === 'bn'
                  ? 'মার্জিন বা ডলার রেট পরিবর্তন করলে আপনার মাসিক নিট লাভ কত হবে তা আগেভাগেই হিসাব করুন'
                  : 'Simulate how changing markup % or USD exchange rate impacts your monthly net profit'}
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#94A3B8]">
                    {language === 'bn' ? 'টার্গেট মাসিক অর্ডার সেলস (BDT)' : 'Projected Monthly Order Sales'}
                  </span>
                  <span className="font-mono text-white">{formatPrice(simMonthlyVolume)}</span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={1000000}
                  step={10000}
                  value={simMonthlyVolume}
                  onChange={e => setSimMonthlyVolume(Number(e.target.value))}
                  className="w-full accent-[#8B5CF6]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#94A3B8]">
                    {language === 'bn' ? 'প্রফিট মার্জিন মার্কআপ (%)' : 'Global Profit Markup (%)'}
                  </span>
                  <span className="font-mono text-[#22D3EE]">+{simTargetMargin}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={150}
                  step={1}
                  value={simTargetMargin}
                  onChange={e => setSimTargetMargin(Number(e.target.value))}
                  className="w-full accent-[#22D3EE]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">
                    1 USD = BDT Rate
                  </label>
                  <input
                    type="number"
                    value={simUsdRate}
                    onChange={e => setSimUsdRate(parseFloat(e.target.value) || 122)}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">
                    Avg Deposit Bonus (%)
                  </label>
                  <input
                    type="number"
                    value={simBonusPercent}
                    onChange={e => setSimBonusPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {(() => {
              const wholesaleApiCost = simMonthlyVolume / (1 + simTargetMargin / 100);
              const grossProfit = simMonthlyVolume - wholesaleApiCost;
              const bonusCost = simMonthlyVolume * (simBonusPercent / 100);
              const netMonthlyProfit = grossProfit - bonusCost;
              const annualRunRate = netMonthlyProfit * 12;

              return (
                <div className="p-4 rounded-2xl bg-[#080B14] border border-[#22C55E]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94A3B8]">
                      {language === 'bn' ? 'সম্ভাব্য মাসিক নিট প্রফিট:' : 'Projected Monthly Net Profit:'}
                    </span>
                    <span className="text-xl font-black text-[#22C55E] font-mono">
                      {formatPrice(netMonthlyProfit)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-2 border-t border-white/[0.06]">
                    <div>
                      <span className="text-[#64748B] block">API Cost</span>
                      <strong className="text-amber-400">{formatPrice(wholesaleApiCost)}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Bonus Cost</span>
                      <strong className="text-rose-400">{formatPrice(bonusCost)}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Annual Profit</span>
                      <strong className="text-[#22D3EE]">{formatPrice(annualRunRate)}</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {providers.length > 0 && (
              <div className="pt-2 border-t border-white/[0.08] flex flex-col sm:flex-row items-center gap-2">
                <select
                  value={simSelectedProviderId}
                  onChange={e => setSimSelectedProviderId(e.target.value)}
                  className="w-full sm:w-auto flex-1 bg-[#080B14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                >
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: +{p.profitMargin}%)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={applyingSimRule}
                  onClick={handleApplySimulatorToProvider}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    {applyingSimRule
                      ? 'Applying...'
                      : language === 'bn'
                        ? `+${simTargetMargin}% প্রফিট রুল প্রয়োগ করুন`
                        : `Apply +${simTargetMargin}% Rule Now`}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 p-5 rounded-3xl bg-[#0D1220] border border-white/[0.08] space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  Customer LTV & Unit Economics
                </span>
                <h3 className="text-base font-black text-white mt-0.5 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#8B5CF6]" />
                  <span>
                    {language === 'bn'
                      ? 'সবচেয়ে লাভজনক ভিআইপি কাস্টমার'
                      : 'Top VIP Customers by Net Profit'}
                  </span>
                </h3>
              </div>
            </div>

            {customerProfitRanking.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#080B14] text-center text-xs text-[#94A3B8]">
                No customer orders in selected period.
              </div>
            ) : (
              <div className="space-y-2">
                {customerProfitRanking.map((cust, idx) => (
                  <div
                    key={cust.userId}
                    className="p-3.5 rounded-2xl bg-[#141B2B]/70 border border-white/[0.06] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#22D3EE] font-mono text-xs font-black flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-white truncate">{cust.displayName}</p>
                        <p className="text-[10px] text-[#94A3B8] font-mono truncate">
                          {cust.email} · {cust.ordersCount} orders
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <p className="text-xs font-black text-[#22C55E]">
                        +{formatPrice(cust.netProfit)} profit
                      </p>
                      <p className="text-[10px] text-[#94A3B8]">
                        Spent: {formatPrice(cust.grossRevenue)} · Bal: {formatPrice(cust.walletBalance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
