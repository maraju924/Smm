import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Package, 
  Wallet, 
  Layers, 
  Users, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw,
  Server,
  Gift,
  Megaphone,
  Settings,
  Save,
  Activity,
  LayoutGrid,
  SlidersHorizontal,
  ArrowLeft,
  LogOut,
  Copy,
  ExternalLink,
  ChevronRight,
  Send,
  X,
  Zap,
  Terminal,
  Play,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  DollarSign,
  Cpu,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { 
  SMMOrder, 
  SMMPayment, 
  SMMService, 
  SMMTicket, 
  UserProfile,
  SMMRefill,
  SMMProvider,
  RemoteProviderService,
  ApiTrafficLog,
  SMMCoupon,
  Announcement,
  SiteSettings,
  ZiniPayGatewayLog,
  ServerHealthStatus
} from '../../types';
import { 
  updateOrderStatus, 
  approvePaymentDeposit, 
  rejectPaymentDeposit, 
  verifyAndCreditZiniPayInvoice,
  pingZiniPayGatewayOnServer,
  fetchZiniPayGatewayLogs,
  saveService, 
  removeService, 
  adminAdjustUserBalance,
  addTicketMessage,
  updateRefillStatus,
  saveProvider,
  removeProviderAndLinkedServices,
  pingProviderOnServer,
  fetchRemoteProviderCatalog,
  syncProviderServices,
  fullSyncProviderServicesAndStatuses,
  recalculateProviderServicesPrices,
  manualDispatchOrderToProvider,
  forwardRefillToProvider,
  syncActiveOrdersWithProviders,
  fetchServerApiTrafficLogs,
  clearServerApiTrafficLogs,
  runRawProviderApiTest,
  saveCoupon,
  removeCoupon,
  saveAnnouncement,
  removeAnnouncement,
  saveSiteSettings,
  purgeAllDemoDataFromServer,
  fetchServerHealthStatus
} from '../../services/db';
import { DEFAULT_SITE_SETTINGS } from '../../data/seedServices';
import { AdminFinanceView } from './AdminFinanceView';

interface AdminViewProps {
  orders: SMMOrder[];
  payments: SMMPayment[];
  services: SMMService[];
  tickets: SMMTicket[];
  users: UserProfile[];
  refills?: SMMRefill[];
  providers?: SMMProvider[];
  coupons?: SMMCoupon[];
  announcements?: Announcement[];
  siteSettings?: SiteSettings;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onExitAdmin?: () => void;
}

type AdminSection =
  | 'overview'
  | 'finance'
  | 'orders'
  | 'refills'
  | 'payments'
  | 'services'
  | 'providers'
  | 'hub'
  | 'users'
  | 'tickets'
  | 'coupons'
  | 'announcements'
  | 'settings';

type AdminApiSubTab = 'providers' | 'importer' | 'router' | 'pricing' | 'console';

const POPULAR_SMM_PROVIDER_PRESETS = [
  { name: 'JustAnotherPanel (JAP)', apiUrl: 'https://justanotherpanel.com/api/v2', currency: 'USD', margin: 25 },
  { name: 'Peakerr SMM', apiUrl: 'https://peakerr.com/api/v2', currency: 'USD', margin: 25 },
  { name: 'SMMFollows', apiUrl: 'https://smmfollows.com/api/v2', currency: 'USD', margin: 30 },
  { name: 'MoreThanPanel', apiUrl: 'https://morethanpanel.com/api/v2', currency: 'USD', margin: 20 },
  { name: 'GlobalSMM API', apiUrl: 'https://globalsmm.com/api/v2', currency: 'USD', margin: 25 },
];

export const AdminView: React.FC<AdminViewProps> = ({
  orders,
  payments,
  services,
  tickets,
  users,
  refills = [],
  providers = [],
  coupons = [],
  announcements = [],
  siteSettings = DEFAULT_SITE_SETTINGS,
  onShowToast,
  onExitAdmin
}) => {
  const { formatPrice, profile, language, setLanguage } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');

  // Server Telemetry
  const [serverHealth, setServerHealth] = useState<ServerHealthStatus | null>(null);
  const [purgingDemo, setPurgingDemo] = useState(false);

  useEffect(() => {
    fetchServerHealthStatus().then(setServerHealth);
    const timer = setInterval(() => {
      fetchServerHealthStatus().then(setServerHealth);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Metrics & Badges
  const totalRevenue = orders.reduce((acc, o) => acc + (o.status !== 'canceled' && o.status !== 'refunded' ? o.charge : 0), 0);
  const totalEstimatedNetProfit = orders.reduce((acc, o) => {
    if (o.status === 'canceled' || o.status === 'refunded') return acc;
    const srv = services.find(s => s.id === o.serviceId);
    const prv = providers.find(p => p.id === (o.providerId || srv?.providerId));
    const usdRate = prv?.customExchangeRate || siteSettings.usdToBdtRate || 122;
    let cost = 0;
    if (o.providerCost !== undefined && o.providerCost > 0) {
      cost = o.providerCost;
    } else if (srv?.originalRate !== undefined && srv.originalRate > 0) {
      const isUsd = !prv || prv.currency?.toUpperCase() === 'USD';
      cost = ((isUsd ? srv.originalRate * usdRate : srv.originalRate) * o.quantity) / 1000;
    } else if (prv?.profitMargin) {
      cost = o.charge / (1 + prv.profitMargin / 100);
    } else if (o.providerId || srv?.providerId) {
      cost = o.charge / 1.25;
    }
    return acc + (o.charge - cost);
  }, 0);
  const pendingDeposits = payments.filter(p => p.status === 'pending');
  const pendingOrders = orders.filter(o => ['pending', 'processing', 'in_progress'].includes(o.status));
  const openTickets = tickets.filter(t => t.status === 'open');
  const pendingRefills = refills.filter(r => r.status === 'pending');

  // Orders Filter & Search State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [editingCountsId, setEditingCountsId] = useState<string | null>(null);
  const [tempStartCount, setTempStartCount] = useState<number>(0);
  const [tempRemains, setTempRemains] = useState<number>(0);

  // Payments Filter & Processing State
  const [paymentFilter, setPaymentFilter] = useState<'pending' | 'all'>('pending');
  const [paymentProcessing, setPaymentProcessing] = useState<string | null>(null);

  // Services Catalog State
  const [serviceSearch, setServiceSearch] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [newService, setNewService] = useState<Partial<SMMService>>({
    id: 'srv-' + Math.floor(100 + Math.random() * 900),
    category: 'Facebook',
    name: '',
    type: 'Default',
    rate: 150,
    min: 100,
    max: 50000,
    averageTime: '30 minutes',
    description: '',
    refill: true,
    dripfeed: true,
    status: 'active'
  });

  // ============================================================================
  // ADVANCED ADMIN API PANEL STATE (5 SUB-MODULES)
  // ============================================================================
  const [apiSubTab, setApiSubTab] = useState<AdminApiSubTab>('providers');
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [showProviderSecret, setShowProviderSecret] = useState(false);
  const [testingNewProvider, setTestingNewProvider] = useState(false);
  const [newProviderPingResult, setNewProviderPingResult] = useState<{
    latencyMs: number;
    balance: number;
    currency: string;
    totalRemoteServices?: number;
  } | null>(null);
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);
  const [checkingBalanceId, setCheckingBalanceId] = useState<string | null>(null);
  const [repricingProviderId, setRepricingProviderId] = useState<string | null>(null);

  const [newProvider, setNewProvider] = useState<Partial<SMMProvider>>({
    id: 'prv-' + Math.floor(100 + Math.random() * 900),
    name: '',
    apiUrl: 'https://',
    apiKey: '',
    balance: 0,
    currency: 'USD',
    profitMargin: 25,
    fixedMarkup: 0,
    priceRounding: 'none',
    customExchangeRate: 122,
    autoForwardOrders: true,
    autoSyncRefills: true,
    lowBalanceAlert: 5,
    status: 'active'
  });

  // Sub-Tab 2: Remote Catalog Browser & Selective Importer State
  const [selectedCatalogProviderId, setSelectedCatalogProviderId] = useState<string>('');
  const [loadingRemoteCatalog, setLoadingRemoteCatalog] = useState(false);
  const [remoteCatalogServices, setRemoteCatalogServices] = useState<RemoteProviderService[]>([]);
  const [remoteCategories, setRemoteCategories] = useState<string[]>([]);
  const [selectedRemoteCategory, setSelectedRemoteCategory] = useState<string>('All');
  const [remoteSearchQuery, setRemoteSearchQuery] = useState<string>('');
  const [selectedRemoteServiceIds, setSelectedRemoteServiceIds] = useState<string[]>([]);
  const [customLocalCategoryName, setCustomLocalCategoryName] = useState<string>('');
  const [importingSelected, setImportingSelected] = useState(false);

  // Sub-Tab 3: API Order Router & Refill Dispatcher State
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null);
  const [forwardingRefillId, setForwardingRefillId] = useState<string | null>(null);

  // Sub-Tab 4: Bulk Price & Profit Optimizer State
  const [bulkRuleProviderId, setBulkRuleProviderId] = useState<string>('');
  const [bulkMarginPercent, setBulkMarginPercent] = useState<number>(25);
  const [bulkFixedMarkup, setBulkFixedMarkup] = useState<number>(0);
  const [bulkExchangeRate, setBulkExchangeRate] = useState<number>(122);
  const [bulkRounding, setBulkRounding] = useState<'none' | 'nearest_int' | 'ceil'>('none');
  const [applyingBulkPrice, setApplyingBulkPrice] = useState(false);

  // Sub-Tab 5: Live API Traffic Logs & Raw Debugger State
  const [apiLogsData, setApiLogsData] = useState<{
    totalCalls: number;
    successRate: number;
    avgLatencyMs: number;
    logs: ApiTrafficLog[];
  }>({ totalCalls: 0, successRate: 100, avgLatencyMs: 0, logs: [] });
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [rawTestProviderId, setRawTestProviderId] = useState<string>('');
  const [rawTestAction, setRawTestAction] = useState<string>('balance');
  const [rawTestOrderId, setRawTestOrderId] = useState<string>('');
  const [rawTestServiceId, setRawTestServiceId] = useState<string>('');
  const [rawTestOutput, setRawTestOutput] = useState<string | null>(null);
  const [runningRawTest, setRunningRawTest] = useState(false);

  useEffect(() => {
    if (providers.length > 0) {
      if (!selectedCatalogProviderId) setSelectedCatalogProviderId(providers[0].id);
      if (!bulkRuleProviderId) {
        const p = providers[0];
        setBulkRuleProviderId(p.id);
        setBulkMarginPercent(p.profitMargin);
        setBulkFixedMarkup(p.fixedMarkup || 0);
        setBulkExchangeRate(p.customExchangeRate || siteSettings.usdToBdtRate || 122);
        setBulkRounding(p.priceRounding || 'none');
      }
      if (!rawTestProviderId) setRawTestProviderId(providers[0].id);
    }
  }, [providers, selectedCatalogProviderId, bulkRuleProviderId, rawTestProviderId, siteSettings.usdToBdtRate]);

  const refreshApiTrafficLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchServerApiTrafficLogs();
      setApiLogsData(data);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'providers' && apiSubTab === 'console') {
      refreshApiTrafficLogs();
    }
  }, [activeSection, apiSubTab]);

  // Coupons State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponReward, setNewCouponReward] = useState<number>(50);
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<number>(100);

  // Announcements State
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnType, setNewAnnType] = useState<Announcement['type']>('info');

  // Users State
  const [userSearch, setUserSearch] = useState('');
  const [balanceAdjustUid, setBalanceAdjustUid] = useState<string | null>(null);
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState<number>(0);

  // Tickets State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Site Settings & ZiniPay Gateway State
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showZiniApiKey, setShowZiniApiKey] = useState(false);
  const [testingZiniPay, setTestingZiniPay] = useState(false);
  const [ziniPingResult, setZiniPingResult] = useState<{
    mode: 'sandbox' | 'live';
    hasApiKey: boolean;
    reachableNodes: number;
    totalNodes: number;
    primaryLatencyMs: number;
    nodes: { node: string; reachable: boolean; httpCode: number; latencyMs: number }[];
  } | null>(null);
  const [ziniLogs, setZiniLogs] = useState<ZiniPayGatewayLog[]>([]);

  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

  const refreshZiniPayLogs = async () => {
    const res = await fetchZiniPayGatewayLogs();
    setZiniLogs(res.logs || []);
  };

  useEffect(() => {
    if (activeSection === 'settings' || activeSection === 'payments') {
      refreshZiniPayLogs();
    }
  }, [activeSection]);

  const handleTestZiniPayConnection = async () => {
    setTestingZiniPay(true);
    try {
      const res = await pingZiniPayGatewayOnServer(settingsForm);
      setZiniPingResult(res);
      await refreshZiniPayLogs();
      onShowToast(
        `ZiniPay Gateway Online: ${res.reachableNodes}/${res.totalNodes} API nodes reachable (${res.primaryLatencyMs}ms)`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'ZiniPay connection diagnostic failed', 'error');
    } finally {
      setTestingZiniPay(false);
    }
  };

  const handleAdminVerifyZiniPayment = async (p: SMMPayment) => {
    setPaymentProcessing(p.id);
    try {
      const res = await verifyAndCreditZiniPayInvoice({
        payment: p,
        referralCommissionPercent: siteSettings.referralCommissionPercent || 5
      });
      await refreshZiniPayLogs();
      if (res.verified) {
        onShowToast(
          `ZiniPay Verified! Payment #${p.id} approved & ৳${p.amount + (p.bonus || 0)} credited (TrxID: ${res.transactionId}).`,
          'success'
        );
      } else {
        onShowToast(
          `ZiniPay Status for #${p.id}: ${res.status}. Not yet marked completed on ZiniPay.`,
          'info'
        );
      }
    } catch (err: any) {
      onShowToast(err?.message || 'ZiniPay verification failed', 'error');
    } finally {
      setPaymentProcessing(null);
    }
  };

  const navigateSection = (sec: AdminSection) => {
    setActiveSection(sec);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine which of the 5 Bottom Nav tabs is highlighted
  const getActiveBottomTab = (): 'overview' | 'orders' | 'payments' | 'api' | 'hub' => {
    if (activeSection === 'overview') return 'overview';
    if (activeSection === 'orders' || activeSection === 'refills') return 'orders';
    if (activeSection === 'payments') return 'payments';
    if (activeSection === 'providers' || activeSection === 'services') return 'api';
    return 'hub';
  };

  const activeBottomTab = getActiveBottomTab();

  // Handlers
  const handlePurgeDemoData = async () => {
    setPurgingDemo(true);
    try {
      await purgeAllDemoDataFromServer();
      onShowToast(
        language === 'bn' ? 'সার্ভার থেকে সকল ডেমো ডাটা মুছে ফেলা হয়েছে!' : 'All legacy demo records purged from Cloud Server!',
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to purge demo data', 'error');
    } finally {
      setPurgingDemo(false);
    }
  };

  const handleUpdateOrderStatus = async (
    ord: SMMOrder,
    newStatus: SMMOrder['status'],
    customStart?: number,
    customRemains?: number
  ) => {
    setStatusUpdating(ord.id);
    try {
      await updateOrderStatus(
        ord.id,
        newStatus,
        ord,
        customStart,
        customRemains
      );
      onShowToast(`Order #${ord.id} → ${newStatus.toUpperCase()}`, 'success');
      setEditingCountsId(null);
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to update order status', 'error');
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleSyncAllOrders = async () => {
    setSyncingOrders(true);
    try {
      const count = await syncActiveOrdersWithProviders(orders, providers);
      onShowToast(
        count > 0
          ? `${count} active orders synced live with upstream API providers!`
          : language === 'bn' ? 'সকল অর্ডার স্ট্যাটাস আপ-টু-ডেট আছে' : 'All linked provider orders are up to date.',
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to sync orders with provider server', 'error');
    } finally {
      setSyncingOrders(false);
    }
  };

  const handleApprovePayment = async (p: SMMPayment) => {
    setPaymentProcessing(p.id);
    try {
      await approvePaymentDeposit(p, siteSettings.referralCommissionPercent || 5);
      onShowToast(`Payment #${p.id} Approved! ৳${p.amount + (p.bonus || 0)} added.`, 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to approve payment', 'error');
    } finally {
      setPaymentProcessing(null);
    }
  };

  const handleRejectPayment = async (p: SMMPayment) => {
    setPaymentProcessing(p.id);
    try {
      await rejectPaymentDeposit(p.id);
      onShowToast(`Payment #${p.id} Rejected.`, 'info');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to reject payment', 'error');
    } finally {
      setPaymentProcessing(null);
    }
  };

  const handleRefillStatus = async (refillId: string, status: SMMRefill['status']) => {
    try {
      await updateRefillStatus(refillId, status);
      onShowToast(`Refill #${refillId} marked as ${status}`, 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to update refill', 'error');
    }
  };

  const handleSaveService = async (serviceToSave: SMMService) => {
    if (!serviceToSave.name?.trim()) {
      onShowToast('Please provide a service name', 'error');
      return;
    }
    try {
      await saveService(serviceToSave);
      onShowToast(`Service ${serviceToSave.id} saved to server!`, 'success');
      setIsAddingService(false);
      setNewService({
        id: 'srv-' + Math.floor(100 + Math.random() * 900),
        category: 'Facebook',
        name: '',
        type: 'Default',
        rate: 150,
        min: 100,
        max: 50000,
        averageTime: '30 minutes',
        description: '',
        refill: true,
        dripfeed: true,
        status: 'active'
      });
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to save service', 'error');
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await removeService(id);
      onShowToast(`Service ${id} deleted from server.`, 'info');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to delete service', 'error');
    }
  };

  // ============================================================================
  // ADVANCED API PROVIDER HANDLERS
  // ============================================================================

  const handleTestNewProviderConnection = async () => {
    if (!newProvider.apiUrl?.trim() || !newProvider.apiKey?.trim()) {
      onShowToast('Enter API v2 URL and API Key to test connection', 'error');
      return;
    }
    setTestingNewProvider(true);
    setNewProviderPingResult(null);
    try {
      const resp = await fetch('/api/provider/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerName: newProvider.name || 'New Provider',
          apiUrl: newProvider.apiUrl.trim(),
          apiKey: newProvider.apiKey.trim(),
          checkCatalogCount: true
        })
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        throw new Error(data.error || 'Connection test failed');
      }
      setNewProviderPingResult({
        latencyMs: data.latencyMs,
        balance: data.balance,
        currency: data.currency,
        totalRemoteServices: data.totalRemoteServices
      });
      setNewProvider(prev => ({
        ...prev,
        balance: Number(data.balance || 0),
        currency: data.currency || prev.currency || 'USD',
        lastLatencyMs: data.latencyMs,
        totalRemoteServices: data.totalRemoteServices
      }));
      onShowToast(
        `Connected (${data.latencyMs}ms)! Balance: ${data.balance} ${data.currency}`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to connect to provider API', 'error');
    } finally {
      setTestingNewProvider(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!newProvider.name?.trim() || !newProvider.apiUrl?.trim() || !newProvider.apiKey?.trim()) {
      onShowToast('Provider Name, API v2 URL, and API Key are required', 'error');
      return;
    }
    try {
      const idToSave = newProvider.id || 'prv-' + Math.floor(100 + Math.random() * 900);
      await saveProvider({
        id: idToSave,
        name: newProvider.name.trim(),
        apiUrl: newProvider.apiUrl.trim(),
        apiKey: newProvider.apiKey.trim(),
        balance: Number(newProvider.balance) || 0,
        currency: newProvider.currency || 'USD',
        profitMargin: Number(newProvider.profitMargin ?? 20),
        fixedMarkup: Number(newProvider.fixedMarkup ?? 0),
        priceRounding: newProvider.priceRounding || 'none',
        customExchangeRate: Number(newProvider.customExchangeRate || siteSettings.usdToBdtRate || 122),
        autoForwardOrders: newProvider.autoForwardOrders ?? true,
        autoSyncRefills: newProvider.autoSyncRefills ?? true,
        lowBalanceAlert: Number(newProvider.lowBalanceAlert ?? 5),
        lastLatencyMs: newProvider.lastLatencyMs,
        totalRemoteServices: newProvider.totalRemoteServices,
        status: newProvider.status || 'active',
        lastSyncAt: Date.now()
      });
      onShowToast('SMM API v2 Provider saved to Cloud Server!', 'success');
      setIsAddingProvider(false);
      setNewProviderPingResult(null);
      setSelectedCatalogProviderId(idToSave);
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to save provider', 'error');
    }
  };

  const handlePingAndCheckProvider = async (prv: SMMProvider) => {
    setCheckingBalanceId(prv.id);
    try {
      const res = await pingProviderOnServer(prv);
      onShowToast(
        `${prv.name}: ${res.balance} ${res.currency} · ${res.latencyMs}ms${res.totalRemoteServices ? ` · ${res.totalRemoteServices} services` : ''}`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Could not reach provider API URL', 'error');
    } finally {
      setCheckingBalanceId(null);
    }
  };

  const handleSyncProviderCatalog = async (prv: SMMProvider) => {
    setSyncingProviderId(prv.id);
    try {
      const result = await fullSyncProviderServicesAndStatuses(
        prv,
        orders,
        services,
        prv.customExchangeRate || siteSettings.usdToBdtRate || 122
      );
      onShowToast(
        `${prv.name}: ${result.importedServices}টি সার্ভিস ইমপোর্ট/আপডেট ও ${result.updatedOrders + result.dispatchedOrders}টি অর্ডারের স্ট্যাটাস সিঙ্ক হয়েছে (ব্যালেন্স: ${result.balance} ${result.currency})!`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Provider API sync failed', 'error');
    } finally {
      setSyncingProviderId(null);
    }
  };

  const handleRecalculateProviderPrices = async (prv: SMMProvider) => {
    setRepricingProviderId(prv.id);
    try {
      const count = await recalculateProviderServicesPrices(
        prv,
        services,
        prv.customExchangeRate || siteSettings.usdToBdtRate || 122
      );
      onShowToast(`Recalculated BDT prices for ${count} services linked to ${prv.name}!`, 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to recalculate prices', 'error');
    } finally {
      setRepricingProviderId(null);
    }
  };

  const handleDeleteProviderWithServices = async (prv: SMMProvider, alsoDeleteServices: boolean) => {
    try {
      const deletedServices = await removeProviderAndLinkedServices(prv.id, services, alsoDeleteServices);
      onShowToast(
        alsoDeleteServices
          ? `Removed ${prv.name} and ${deletedServices} linked services.`
          : `Removed provider ${prv.name}.`,
        'info'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to remove provider', 'error');
    }
  };

  const handleLoadRemoteCatalogForBrowser = async (providerIdOverride?: string) => {
    const targetId = providerIdOverride || selectedCatalogProviderId;
    const prv = providers.find(p => p.id === targetId);
    if (!prv) {
      onShowToast('Please connect and select an API Provider first', 'error');
      return;
    }

    setLoadingRemoteCatalog(true);
    setRemoteCatalogServices([]);
    setSelectedRemoteServiceIds([]);
    try {
      const res = await fetchRemoteProviderCatalog(
        prv,
        prv.customExchangeRate || siteSettings.usdToBdtRate || 122
      );
      setRemoteCategories(res.categories);
      setRemoteCatalogServices(res.services);
      setSelectedRemoteCategory('All');
      onShowToast(
        `Loaded ${res.services.length} services (${res.categories.length} categories) in ${res.latencyMs}ms!`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to load remote catalog', 'error');
    } finally {
      setLoadingRemoteCatalog(false);
    }
  };

  const handleImportSelectedRemoteServices = async () => {
    const prv = providers.find(p => p.id === selectedCatalogProviderId);
    if (!prv) return;
    if (selectedRemoteServiceIds.length === 0) {
      onShowToast('Select at least 1 remote service to import', 'error');
      return;
    }

    setImportingSelected(true);
    try {
      const count = await syncProviderServices(
        prv,
        prv.customExchangeRate || siteSettings.usdToBdtRate || 122,
        {
          limit: selectedRemoteServiceIds.length + 10,
          selectedServiceIds: selectedRemoteServiceIds,
          customCategoryName: customLocalCategoryName.trim() || undefined
        }
      );
      onShowToast(`Successfully imported ${count} selected services to your catalog!`, 'success');
      setSelectedRemoteServiceIds([]);
    } catch (err: any) {
      onShowToast(err?.message || 'Selective import failed', 'error');
    } finally {
      setImportingSelected(false);
    }
  };

  const handleManualOrderDispatch = async (ord: SMMOrder) => {
    const srv = services.find(s => s.id === ord.serviceId);
    if (!srv || !srv.providerId) {
      onShowToast('Service is not linked to an upstream API provider', 'error');
      return;
    }
    const prv = providers.find(p => p.id === srv.providerId);
    if (!prv) {
      onShowToast(`Provider ${srv.providerId} not found`, 'error');
      return;
    }

    setDispatchingOrderId(ord.id);
    try {
      const upstreamId = await manualDispatchOrderToProvider(ord, srv, prv);
      onShowToast(`Order #${ord.id} dispatched to ${prv.name} → Upstream #${upstreamId}!`, 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Order dispatch failed', 'error');
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleForwardRefillToApi = async (refill: SMMRefill) => {
    const ord = orders.find(o => o.id === refill.orderId);
    if (!ord || !ord.providerId || !ord.providerOrderId) {
      onShowToast('Order does not have an upstream API provider order ID', 'error');
      return;
    }
    const prv = providers.find(p => p.id === ord.providerId);
    if (!prv) {
      onShowToast('Linked provider not found', 'error');
      return;
    }

    setForwardingRefillId(refill.id);
    try {
      const refRes = await forwardRefillToProvider(refill, ord, prv);
      onShowToast(`Refill #${refill.id} forwarded to ${prv.name} (ID: ${refRes})!`, 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Upstream refill failed', 'error');
    } finally {
      setForwardingRefillId(null);
    }
  };

  const handleApplyBulkPricingRule = async () => {
    const prv = providers.find(p => p.id === bulkRuleProviderId);
    if (!prv) {
      onShowToast('Select a provider first', 'error');
      return;
    }
    setApplyingBulkPrice(true);
    try {
      const updatedProvider: SMMProvider = {
        ...prv,
        profitMargin: bulkMarginPercent,
        fixedMarkup: bulkFixedMarkup,
        customExchangeRate: bulkExchangeRate,
        priceRounding: bulkRounding
      };
      await saveProvider(updatedProvider);
      const updatedCount = await recalculateProviderServicesPrices(
        updatedProvider,
        services,
        bulkExchangeRate
      );
      onShowToast(
        `Updated ${prv.name} pricing rules & recalculated ${updatedCount} services!`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Bulk pricing update failed', 'error');
    } finally {
      setApplyingBulkPrice(false);
    }
  };

  const handleExecuteRawProviderTest = async () => {
    const prv = providers.find(p => p.id === rawTestProviderId);
    if (!prv) {
      onShowToast('Select a connected provider to test', 'error');
      return;
    }
    setRunningRawTest(true);
    setRawTestOutput(null);
    try {
      const res = await runRawProviderApiTest({
        providerName: prv.name,
        apiUrl: prv.apiUrl,
        apiKey: prv.apiKey,
        action: rawTestAction,
        extraParams: {
          order: rawTestOrderId,
          orders: rawTestOrderId,
          service: rawTestServiceId
        }
      });
      setRawTestOutput(JSON.stringify(res, null, 2));
      refreshApiTrafficLogs();
    } catch (err: any) {
      setRawTestOutput(JSON.stringify({ error: err?.message || 'Raw test failed' }, null, 2));
    } finally {
      setRunningRawTest(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || newCouponReward <= 0) return;
    try {
      const id = 'cp-' + newCouponCode.trim().toLowerCase() + '-' + Math.floor(10 + Math.random() * 90);
      await saveCoupon({
        id,
        code: newCouponCode.trim().toUpperCase(),
        rewardAmount: newCouponReward,
        maxUses: newCouponMaxUses,
        usedCount: 0,
        usedBy: [],
        active: true,
        createdAt: Date.now()
      });
      onShowToast(`Promo code ${newCouponCode.toUpperCase()} saved to server!`, 'success');
      setNewCouponCode('');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to create promo code', 'error');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    try {
      const id = 'ann-' + Math.floor(1000 + Math.random() * 9000);
      await saveAnnouncement({
        id,
        title: newAnnTitle.trim(),
        content: newAnnContent.trim(),
        type: newAnnType,
        active: true,
        createdAt: Date.now()
      });
      onShowToast('Announcement published on server!', 'success');
      setNewAnnTitle('');
      setNewAnnContent('');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to publish announcement', 'error');
    }
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await saveSiteSettings(settingsForm);
      onShowToast('Global Site Settings saved to server!', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to save site settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveUserBalance = async (uid: string) => {
    try {
      await adminAdjustUserBalance(uid, balanceAdjustAmount);
      onShowToast(`User balance updated to ৳${balanceAdjustAmount}!`, 'success');
      setBalanceAdjustUid(null);
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to adjust balance', 'error');
    }
  };

  const handleSendAdminReply = async (t: SMMTicket) => {
    if (!adminReplyText.trim() || !profile) return;
    try {
      await addTicketMessage(t.id, t.messages, {
        senderId: profile.uid,
        senderName: 'AmarTrend Admin',
        senderRole: 'admin',
        message: adminReplyText.trim(),
        timestamp: Date.now()
      }, 'answered');
      onShowToast('Reply sent to customer!', 'success');
      setAdminReplyText('');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to reply', 'error');
    }
  };

  const getSectionTitle = (): string => {
    switch (activeSection) {
      case 'overview': return language === 'bn' ? 'অ্যাডমিন ড্যাশবোর্ড' : 'Admin Dashboard';
      case 'finance': return language === 'bn' ? 'প্রফিট ও ফাইন্যান্সিয়াল ইন্টেলিজেন্স' : 'Financial & Profit Intelligence';
      case 'orders': return language === 'bn' ? 'অর্ডার কন্ট্রোল' : 'Orders Control';
      case 'refills': return language === 'bn' ? 'রিফিল রিকোয়েস্ট' : 'Refill Queue';
      case 'payments': return language === 'bn' ? 'পেমেন্ট ভেরিফিকেশন' : 'Deposit Requests';
      case 'services': return language === 'bn' ? 'সার্ভিস ক্যাটালগ' : 'Services Catalog';
      case 'providers': return language === 'bn' ? 'অ্যাডভান্সড API কন্ট্রোল স্টুডিও' : 'Advanced API Studio';
      case 'hub': return language === 'bn' ? 'অ্যাডমিন কন্ট্রোল হাব' : 'Admin Control Hub';
      case 'users': return language === 'bn' ? 'ইউজার ম্যানেজমেন্ট' : 'Users Management';
      case 'tickets': return language === 'bn' ? 'সাপোর্ট টিকেট' : 'Support Tickets';
      case 'coupons': return language === 'bn' ? 'প্রোমো কোড' : 'Promo Codes';
      case 'announcements': return language === 'bn' ? 'নোটিশ বোর্ড' : 'Announcements';
      case 'settings': return language === 'bn' ? 'সাইট ও পেমেন্ট সেটিংস' : 'Site Settings';
    }
  };

  const isSubHubScreen = ['finance', 'users', 'tickets', 'coupons', 'announcements', 'settings'].includes(activeSection);

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchesStatus =
      orderStatusFilter === 'all'
        ? true
        : orderStatusFilter === 'active'
          ? ['pending', 'processing', 'in_progress'].includes(o.status)
          : o.status === orderStatusFilter;
    const matchesSearch =
      !orderSearch ||
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.userEmail.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.serviceName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.link.toLowerCase().includes(orderSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtered Payments
  const filteredPayments = payments.filter(p =>
    paymentFilter === 'pending' ? p.status === 'pending' : true
  );

  // Filtered Services
  const filteredServices = services.filter(s =>
    !serviceSearch ||
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.id.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // Filtered Remote Catalog Services (for API Importer Sub-Tab)
  const filteredRemoteCatalog = remoteCatalogServices.filter(item => {
    const matchCat = selectedRemoteCategory === 'All' || item.category === selectedRemoteCategory;
    const matchQuery =
      !remoteSearchQuery ||
      item.name.toLowerCase().includes(remoteSearchQuery.toLowerCase()) ||
      item.service.toLowerCase().includes(remoteSearchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(remoteSearchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  // API Orders & Economics Analytics
  const apiLinkedServices = services.filter(s => Boolean(s.providerId));
  const apiRoutedOrders = orders.filter(o => {
    if (o.providerId || o.providerOrderId) return true;
    const srv = services.find(s => s.id === o.serviceId);
    return Boolean(srv?.providerId);
  });
  const apiOrdersRevenue = apiRoutedOrders
    .filter(o => o.status !== 'canceled')
    .reduce((acc, o) => acc + o.charge, 0);

  const totalProviderOperationalCost = Math.max(0, totalRevenue - totalEstimatedNetProfit);
  const overallNetMarginPercent = totalRevenue > 0 ? (totalEstimatedNetProfit / totalRevenue) * 100 : 0;

  const adminSidebarLinks: { id: AdminSection; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: language === 'bn' ? 'অ্যাডমিন ওভারভিউ' : 'Executive Overview', icon: LayoutGrid },
    { id: 'finance', label: language === 'bn' ? 'ফাইন্যান্সিয়াল ইন্টেলিজেন্স' : 'Financial Intelligence', icon: TrendingUp },
    { id: 'orders', label: language === 'bn' ? 'অর্ডার কন্ট্রোল' : 'Orders Control', icon: Package, badge: pendingOrders.length || undefined },
    { id: 'refills', label: language === 'bn' ? 'রিফিল কিউ' : 'Refill Queue', icon: RefreshCw, badge: pendingRefills.length || undefined },
    { id: 'payments', label: language === 'bn' ? 'ডিপোজিট ভেরিফিকেশন' : 'Deposit Verification', icon: Wallet, badge: pendingDeposits.length || undefined },
    { id: 'services', label: language === 'bn' ? 'সার্ভিস ক্যাটালগ' : 'Services Catalog', icon: Layers, badge: services.length || undefined },
    { id: 'providers', label: language === 'bn' ? 'API কন্ট্রোল স্টুডিও' : 'API Providers Studio', icon: Server, badge: providers.length || undefined },
    { id: 'users', label: language === 'bn' ? 'ইউজার ম্যানেজমেন্ট' : 'Users & Balances', icon: Users, badge: users.length || undefined },
    { id: 'tickets', label: language === 'bn' ? 'সাপোর্ট হেল্পডেস্ক' : 'Support Helpdesk', icon: MessageSquare, badge: openTickets.length || undefined },
    { id: 'coupons', label: language === 'bn' ? 'প্রোমো ভাউচার' : 'Promo Vouchers', icon: Gift },
    { id: 'announcements', label: language === 'bn' ? 'নোটিশ বোর্ড' : 'Announcements', icon: Megaphone },
    { id: 'settings', label: language === 'bn' ? 'সাইট ও পেমেন্ট সেটিংস' : 'System Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen w-full bg-[#080B14] text-[#F1F5F9] flex font-sans selection:bg-[#8B5CF6] selection:text-white overflow-x-hidden">
      {/* DESKTOP PERSISTENT ADMIN SIDEBAR (lg+) */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 fixed inset-y-0 left-0 z-50 bg-[#0D1220] border-r border-white/[0.07]">
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.07]">
          <div
            onClick={() => navigateSection('overview')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] p-[1px] shadow-lg shadow-[#8B5CF6]/20">
              <div className="w-full h-full rounded-[11px] bg-[#080B14] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F1F5F9] tracking-tight leading-none">
                Admin Suite
              </h2>
              <p className="text-[10px] font-mono text-[#22D3EE] mt-1">
                {serverHealth ? `Node ${serverHealth.nodeVersion}` : 'Cloud Server Live'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {adminSidebarLinks.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#8B5CF6]/15 text-[#F1F5F9] border border-[#8B5CF6]/35 shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#22D3EE]' : 'text-[#64748B]'}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                      active ? 'bg-[#8B5CF6] text-white' : 'bg-[#141B2B] text-[#94A3B8]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {onExitAdmin && (
          <div className="p-3 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onExitAdmin}
              className="w-full py-2.5 px-3 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.08] text-[#F1F5F9] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{language === 'bn' ? 'ইউজার প্যানেলে ফিরে যান' : 'Return to User Workspace'}</span>
            </button>
          </div>
        )}
      </aside>

      {/* MAIN ADMIN COLUMN */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* STANDALONE ADMIN TOP BAR */}
        <header className="sticky top-0 z-40 w-full bg-[#080B14]/90 backdrop-blur-2xl border-b border-white/[0.07]">
          <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 h-15 flex items-center justify-between gap-2">
            {/* Left: Back Button (if inside Hub sub-page on mobile) OR Admin App Identity */}
            <div className="flex items-center gap-2.5 min-w-0">
              {isSubHubScreen ? (
                <button
                  type="button"
                  onClick={() => navigateSection('hub')}
                  className="lg:hidden w-9 h-9 rounded-2xl bg-[#141B2B] border border-white/[0.08] flex items-center justify-center text-slate-200 active:scale-95 transition-transform shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div
                  onClick={() => navigateSection('overview')}
                  className="lg:hidden w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center text-white shadow-lg shadow-[#8B5CF6]/20 cursor-pointer shrink-0"
                >
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-extrabold text-[#F1F5F9] tracking-tight truncate">
                    {getSectionTitle()}
                  </h1>
                </div>
                <p className="text-[10px] text-[#94A3B8] font-mono truncate">
                  AmarTrend Admin Control · {serverHealth ? `Node ${serverHealth.nodeVersion}` : 'Cloud Live'}
                </p>
              </div>
            </div>

            {/* Right: Action Bar */}
            <div className="flex items-center gap-2 shrink-0">
              {/* 1-Tap API Order Sync */}
              <button
                type="button"
                onClick={handleSyncAllOrders}
                disabled={syncingOrders}
                title="Sync Active Orders with API Providers"
                className="h-9 px-3 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/35 text-[#F1F5F9] font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#22D3EE] ${syncingOrders ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">{language === 'bn' ? 'অর্ডার সিঙ্ক' : 'Sync Orders'}</span>
              </button>

              {/* Language Switch */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="w-9 h-9 rounded-xl bg-[#141B2B] border border-white/[0.08] text-[#F1F5F9] text-xs font-bold flex items-center justify-center active:scale-95"
              >
                {language === 'bn' ? 'বাং' : 'EN'}
              </button>

              {/* Exit Admin App -> Go to User Panel */}
              {onExitAdmin && (
                <button
                  type="button"
                  onClick={onExitAdmin}
                  className="h-9 px-3 rounded-xl bg-[#141B2B] hover:bg-[#192337] border border-white/[0.08] text-[#F1F5F9] font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
                  title={language === 'bn' ? 'ইউজার প্যানেলে যান' : 'Switch to User App'}
                >
                  <LogOut className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>{language === 'bn' ? 'ইউজার অ্যাপ' : 'User App'}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE WORKSPACE VIEWPORT */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 lg:px-8 pt-4 pb-28 lg:pb-12 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* =========================================================
                  SECTION 1: ADMIN OVERVIEW (HOME SCREEN)
                 ========================================================= */}
              {activeSection === 'overview' && (
                <div className="space-y-4">
                  {/* Executive Hero Wallet Card */}
                  <div className="p-5 rounded-3xl bg-[#0D1220] border border-[#8B5CF6]/30 shadow-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        {language === 'bn' ? 'মোট অর্ডার ভলিউম (রেভিনিউ)' : 'Total Revenue'}
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums mt-0.5">
                        {formatPrice(totalRevenue)}
                      </h2>
                      <p className="text-[11px] text-[#94A3B8] font-mono mt-1">
                        {language === 'bn' ? 'প্রোভাইডার অপারেশনাল খরচ:' : 'Operational Costs (Providers):'}{' '}
                        <strong className="text-amber-400">{formatPrice(totalProviderOperationalCost)}</strong>
                      </p>
                    </div>

                    <div
                      onClick={() => navigateSection('finance')}
                      className="p-3 rounded-2xl bg-[#141B2B] border border-[#22C55E]/35 flex items-center justify-between sm:justify-end gap-3 cursor-pointer hover:border-[#22C55E] transition-all"
                    >
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#22C55E] font-bold block">
                          {language === 'bn'
                            ? `নিট প্রফিট (${overallNetMarginPercent.toFixed(1)}% মার্জিন)`
                            : `Net Profit (${overallNetMarginPercent.toFixed(1)}% Margin)`}
                        </span>
                        <span className="text-lg font-black text-[#22C55E] font-mono tabular-nums">
                          +{formatPrice(totalEstimatedNetProfit)}
                        </span>
                      </div>
                      <span className="px-2.5 py-1.5 rounded-xl bg-[#22C55E]/15 text-[#22C55E] text-[11px] font-extrabold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'ফাইন্যান্সিয়াল ইন্টেলিজেন্স' : 'Financial Intelligence'}</span>
                      </span>
                    </div>
                  </div>

                  {/* 4 Mini Metrics inside Hero */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/90 text-center">
                    <div
                      onClick={() => navigateSection('orders')}
                      className="p-2 rounded-2xl bg-slate-950/70 border border-slate-800/80 cursor-pointer active:scale-95 transition-transform"
                    >
                      <p className="text-[10px] text-slate-400 font-semibold">{language === 'bn' ? 'মোট অর্ডার' : 'Orders'}</p>
                      <p className="text-sm font-extrabold text-white font-mono tabular-nums mt-0.5">{orders.length}</p>
                    </div>
                    <div
                      onClick={() => navigateSection('users')}
                      className="p-2 rounded-2xl bg-slate-950/70 border border-slate-800/80 cursor-pointer active:scale-95 transition-transform"
                    >
                      <p className="text-[10px] text-slate-400 font-semibold">{language === 'bn' ? 'ইউজার' : 'Users'}</p>
                      <p className="text-sm font-extrabold text-sky-400 font-mono tabular-nums mt-0.5">{users.length}</p>
                    </div>
                    <div
                      onClick={() => navigateSection('services')}
                      className="p-2 rounded-2xl bg-slate-950/70 border border-slate-800/80 cursor-pointer active:scale-95 transition-transform"
                    >
                      <p className="text-[10px] text-slate-400 font-semibold">{language === 'bn' ? 'সার্ভিস' : 'Services'}</p>
                      <p className="text-sm font-extrabold text-amber-400 font-mono tabular-nums mt-0.5">{services.length}</p>
                    </div>
                    <div
                      onClick={() => navigateSection('providers')}
                      className="p-2 rounded-2xl bg-slate-950/70 border border-slate-800/80 cursor-pointer active:scale-95 transition-transform"
                    >
                      <p className="text-[10px] text-slate-400 font-semibold">{language === 'bn' ? 'API প্যানেল' : 'APIs'}</p>
                      <p className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums mt-0.5">{providers.length}</p>
                    </div>
                  </div>
                </div>

                {/* Action Required Alerts (Live Queues) */}
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentFilter('pending');
                      navigateSection('payments');
                    }}
                    className="p-3.5 rounded-2xl bg-[#0B1120] border border-amber-500/30 text-left space-y-1 active:scale-95 transition-transform"
                  >
                    <div className="flex items-center justify-between">
                      <Wallet className="w-4 h-4 text-amber-400" />
                      <span className="text-base font-black text-amber-400 font-mono tabular-nums">
                        {pendingDeposits.length}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200 leading-tight">
                      {language === 'bn' ? 'পেন্ডিং পেমেন্ট' : 'Pending Deposits'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderStatusFilter('active');
                      navigateSection('orders');
                    }}
                    className="p-3.5 rounded-2xl bg-[#0B1120] border border-sky-500/30 text-left space-y-1 active:scale-95 transition-transform"
                  >
                    <div className="flex items-center justify-between">
                      <Package className="w-4 h-4 text-sky-400" />
                      <span className="text-base font-black text-sky-400 font-mono tabular-nums">
                        {pendingOrders.length}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200 leading-tight">
                      {language === 'bn' ? 'রানিং অর্ডার' : 'Active Orders'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateSection('tickets')}
                    className="p-3.5 rounded-2xl bg-[#0B1120] border border-rose-500/30 text-left space-y-1 active:scale-95 transition-transform"
                  >
                    <div className="flex items-center justify-between">
                      <MessageSquare className="w-4 h-4 text-rose-400" />
                      <span className="text-base font-black text-rose-400 font-mono tabular-nums">
                        {openTickets.length}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200 leading-tight">
                      {language === 'bn' ? 'ওপেন টিকেট' : 'Open Tickets'}
                    </p>
                  </button>
                </div>

                {/* Native Mobile OS App Launcher Grid */}
                <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                      {language === 'bn' ? 'অ্যাডমিন অ্যাপ মডিউলসমূহ' : 'Admin App Modules'}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">1-Tap Launch</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { id: 'finance', label: language === 'bn' ? 'প্রফিট ল্যাব' : 'Profit P&L', icon: TrendingUp, color: 'text-[#22C55E] bg-[#22C55E]/15 border-[#22C55E]/30' },
                      { id: 'providers', label: language === 'bn' ? 'API স্টুডিও' : 'API Studio', icon: Server, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
                      { id: 'orders', label: language === 'bn' ? 'অর্ডারস' : 'Orders', icon: Package, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
                      { id: 'payments', label: language === 'bn' ? 'ডিপোজিট' : 'Deposits', icon: Wallet, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
                      { id: 'services', label: language === 'bn' ? 'সার্ভিস' : 'Services', icon: Layers, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
                      { id: 'users', label: language === 'bn' ? 'ইউজার' : 'Users', icon: Users, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
                      { id: 'tickets', label: language === 'bn' ? 'টিকেট' : 'Tickets', icon: MessageSquare, color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' },
                      { id: 'settings', label: language === 'bn' ? 'সেটিংস' : 'Settings', icon: Settings, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigateSection(item.id as AdminSection)}
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 active:scale-90 transition-transform"
                        >
                          <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center mb-1.5 ${item.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-200 truncate max-w-full">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Server Diagnostics & Quick Tools Card */}
                <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-extrabold text-white">
                        {language === 'bn' ? 'ক্লাউড সার্ভার ও API স্ট্যাটাস' : 'Cloud Server & API Diagnostics'}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">
                      /api/v2 ONLINE
                    </span>
                  </div>

                  {serverHealth && (
                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                      <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">RAM Usage</span>
                        <strong className="text-white">{serverHealth.memoryMB} MB</strong>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">API Calls</span>
                        <strong className="text-emerald-400">{serverHealth.totalApiCalls ?? 0}</strong>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Runtime</span>
                        <strong className="text-sky-400">{serverHealth.nodeVersion}</strong>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSyncAllOrders}
                      disabled={syncingOrders}
                      className="py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingOrders ? 'animate-spin' : ''}`} />
                      <span>{syncingOrders ? 'Syncing...' : language === 'bn' ? 'অর্ডার API সিঙ্ক' : 'Sync API Orders'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePurgeDemoData}
                      disabled={purgingDemo}
                      className="py-2.5 px-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{purgingDemo ? 'Purging...' : language === 'bn' ? 'ডেমো ডাটা ক্লিয়ার' : 'Purge Demo Data'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                SECTION 1.5: CFO FINANCIAL & PROFIT INTELLIGENCE SUITE
               ========================================================= */}
            {activeSection === 'finance' && (
              <AdminFinanceView
                orders={orders}
                payments={payments}
                services={services}
                providers={providers}
                users={users}
                coupons={coupons}
                siteSettings={siteSettings}
                onShowToast={onShowToast}
                onNavigateSection={navigateSection}
              />
            )}

            {/* =========================================================
                SECTION 2: ORDERS & REFILLS MANAGEMENT (MOBILE CARDS)
               ========================================================= */}
            {(activeSection === 'orders' || activeSection === 'refills') && (
              <div className="space-y-3.5">
                {/* Sub-Navigation Toggle: Orders vs Refills */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#0B1120] border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveSection('orders')}
                    className={`py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      activeSection === 'orders'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'সকল অর্ডার' : 'Orders'} ({orders.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('refills')}
                    className={`py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      activeSection === 'refills'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'রিফিল কিউ' : 'Refills'} ({pendingRefills.length})</span>
                  </button>
                </div>

                {activeSection === 'orders' ? (
                  <>
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder={language === 'bn' ? 'অর্ডার আইডি, ইমেইল বা লিংক খুঁজুন...' : 'Search Order ID, Email, or Link...'}
                        className="w-full bg-[#0B1120] border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>

                    {/* Horizontal Status Filter Bar */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'active', label: 'Active' },
                        { id: 'pending', label: 'Pending' },
                        { id: 'in_progress', label: 'In Progress' },
                        { id: 'completed', label: 'Completed' },
                        { id: 'partial', label: 'Partial' },
                        { id: 'canceled', label: 'Canceled' },
                      ].map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setOrderStatusFilter(st.id)}
                          className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                            orderStatusFilter === st.id
                              ? 'bg-slate-100 text-slate-950'
                              : 'bg-[#0B1120] text-slate-400 border border-slate-800'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>

                    {/* Mobile Order Cards */}
                    <div className="space-y-2.5">
                      {filteredOrders.length === 0 ? (
                        <div className="p-8 text-center bg-[#0B1120] border border-slate-800 rounded-3xl text-xs text-slate-400">
                          {language === 'bn' ? 'কোনো অর্ডার পাওয়া যায়নি।' : 'No matching orders found.'}
                        </div>
                      ) : (
                        filteredOrders.map(ord => (
                          <div
                            key={ord.id}
                            className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800/90 space-y-3 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-white text-xs">
                                    #{ord.id}
                                  </span>
                                  <span className="text-[11px] text-slate-400 truncate">
                                    · {ord.userEmail}
                                  </span>
                                </div>
                                {ord.providerOrderId && (
                                  <p className="text-[10px] font-mono text-amber-400 mt-0.5">
                                    Upstream API Order #{ord.providerOrderId}
                                  </p>
                                )}
                              </div>
                              <span className="font-mono font-extrabold text-emerald-400 text-sm shrink-0">
                                {formatPrice(ord.charge)}
                              </span>
                            </div>

                            <div>
                              <p className="font-bold text-slate-100 leading-snug">{ord.serviceName}</p>
                              <a
                                href={ord.link}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[11px] text-sky-400 hover:underline flex items-center gap-1 truncate mt-1"
                              >
                                <span className="truncate">{ord.link}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>

                            {/* Counters Grid */}
                            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center font-mono text-[11px]">
                              <div>
                                <span className="text-[10px] text-slate-500 block">Quantity</span>
                                <strong className="text-white">{ord.quantity}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">Start Count</span>
                                <strong className="text-slate-200">{ord.startCount ?? 0}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">Remains</span>
                                <strong className="text-amber-400">{ord.remains ?? 0}</strong>
                              </div>
                            </div>

                            {/* Mobile Action Row */}
                            <div className="flex items-center gap-2 pt-1">
                              <select
                                value={ord.status}
                                disabled={statusUpdating === ord.id}
                                onChange={(e) => handleUpdateOrderStatus(ord, e.target.value as any)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none"
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="partial">Partial (Auto Refund Remains)</option>
                                <option value="canceled">Canceled (Full Refund)</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  if (editingCountsId === ord.id) {
                                    setEditingCountsId(null);
                                  } else {
                                    setEditingCountsId(ord.id);
                                    setTempStartCount(ord.startCount ?? 0);
                                    setTempRemains(ord.remains ?? 0);
                                  }
                                }}
                                className="py-2.5 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Counts</span>
                              </button>
                            </div>

                            {/* Expandable Start Count & Remains Drawer */}
                            {editingCountsId === ord.id && (
                              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Start Count</label>
                                    <input
                                      type="number"
                                      value={tempStartCount}
                                      onChange={(e) => setTempStartCount(parseInt(e.target.value) || 0)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Remains</label>
                                    <input
                                      type="number"
                                      value={tempRemains}
                                      onChange={(e) => setTempRemains(parseInt(e.target.value) || 0)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOrderStatus(ord, ord.status, tempStartCount, tempRemains)}
                                    className="py-2 px-3 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs"
                                  >
                                    Save Counts
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOrderStatus(ord, 'partial', tempStartCount, tempRemains)}
                                    className="py-2 px-3 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs"
                                  >
                                    Partial + Refund
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  /* REFILLS QUEUE SUB-VIEW */
                  <div className="space-y-2.5">
                    {refills.length === 0 ? (
                      <div className="p-8 text-center bg-[#0B1120] border border-slate-800 rounded-3xl text-xs text-slate-400">
                        {language === 'bn' ? 'কোনো রিফিল রিকোয়েস্ট নেই।' : 'No refill requests found.'}
                      </div>
                    ) : (
                      refills.map(r => (
                        <div
                          key={r.id}
                          className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-white">#{r.id}</span>
                            <span className="font-mono text-sky-400 font-bold">Order #{r.orderId}</span>
                          </div>
                          <p className="text-slate-200 font-bold">{r.serviceName}</p>
                          <p className="text-[11px] text-slate-400">{r.userEmail}</p>
                          <select
                            value={r.status}
                            onChange={(e) => handleRefillStatus(r.id, e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-white font-bold capitalize"
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                SECTION 3: PAYMENTS / DEPOSITS VERIFICATION + ZINIPAY GATEWAY
               ========================================================= */}
            {activeSection === 'payments' && (
              <div className="space-y-3.5">
                {/* ZiniPay Automated Payment Gateway Status Bar */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0B1120] via-[#11192E] to-[#0B1120] border border-[#22D3EE]/30 space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shrink-0">
                        <Zap className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-white text-sm">ZiniPay Payment Gateway</h4>
                          <span
                            className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold uppercase ${
                              siteSettings.zinipayEnabled !== false
                                ? siteSettings.zinipayMode === 'live'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-[#22D3EE]/20 text-[#22D3EE]'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {siteSettings.zinipayEnabled !== false
                              ? siteSettings.zinipayMode === 'live'
                                ? 'LIVE PRODUCTION'
                                : 'SANDBOX READY'
                              : 'DISABLED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Hosted Checkout (/v1/payment/create) + 2-Step Trx API (/v1/trx/verify)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateSection('settings')}
                      className="py-2 px-3 rounded-xl bg-slate-900 border border-[#22D3EE]/30 text-[#22D3EE] font-bold text-[11px] shrink-0 active:scale-95"
                    >
                      Configure ZiniPay
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 text-center font-mono text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Auto-Verified</span>
                      <strong className="text-emerald-400">
                        {payments.filter(p => p.status === 'approved' && (p.verificationMode === 'auto_zinipay' || p.gateway === 'ZiniPay')).length} Tx
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">ZiniPay Bonus</span>
                      <strong className="text-amber-400">+{siteSettings.zinipayBonusPercent ?? 3}%</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">2-Step Trx</span>
                      <strong className="text-[#22D3EE]">
                        {siteSettings.zinipayAutoVerifyTrx !== false ? 'ENABLED' : 'MANUAL'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Filter Toggle: Pending vs All */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#0B1120] border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPaymentFilter('pending')}
                    className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                      paymentFilter === 'pending'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'পেন্ডিং রিকোয়েস্ট' : 'Pending Queue'} ({pendingDeposits.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentFilter('all')}
                    className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                      paymentFilter === 'all'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'সকল পেমেন্ট হিস্ট্রি' : 'All History'} ({payments.length})
                  </button>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="p-8 text-center bg-[#0B1120] border border-slate-800 rounded-3xl text-xs text-slate-400">
                    {language === 'bn' ? 'কোনো পেমেন্ট রিকোয়েস্ট নেই।' : 'No deposit requests in this view.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredPayments.map(p => (
                      <div
                        key={p.id}
                        className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-white">{p.gateway}</span>
                              {p.verificationMode === 'auto_zinipay' && (
                                <span className="px-2 py-0.5 rounded-lg bg-[#22D3EE]/15 text-[#22D3EE] font-mono text-[10px] font-bold">
                                  ZINIPAY AUTO
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{p.userEmail}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-emerald-400 font-mono tabular-nums">
                              ৳{p.amount.toLocaleString()}
                            </span>
                            {(p.bonus || 0) > 0 && (
                              <span className="block text-[10px] text-amber-300 font-mono">
                                +৳{p.bonus} Bonus
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2 font-mono text-[11px]">
                          <div className="min-w-0">
                            <p className="text-sky-400 font-bold truncate">
                              TrxID / Invoice: {p.transactionId}
                            </p>
                            <p className="text-slate-400 text-[10px] mt-0.5">
                              Sender: {p.senderNumber || 'N/A'} · {new Date(p.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(p.transactionId);
                              onShowToast('Transaction ID copied!', 'info');
                            }}
                            className="p-2 rounded-xl bg-slate-900 text-slate-300 active:scale-95 shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {p.status === 'pending' ? (
                          <div className="space-y-2 pt-1">
                            {(p.gateway === 'ZiniPay' || p.zinipayInvoiceId) && (
                              <button
                                type="button"
                                onClick={() => handleAdminVerifyZiniPayment(p)}
                                disabled={paymentProcessing === p.id}
                                className="w-full py-2.5 px-4 rounded-2xl bg-[#22D3EE]/15 border border-[#22D3EE]/40 text-[#22D3EE] font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${paymentProcessing === p.id ? 'animate-spin' : ''}`} />
                                <span>Verify with ZiniPay API (/v1/payment/verify)</span>
                              </button>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(p)}
                                disabled={paymentProcessing === p.id}
                                className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{language === 'bn' ? 'অ্যাপ্রুভ করুন' : 'Approve & Credit'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectPayment(p)}
                                disabled={paymentProcessing === p.id}
                                className="py-3 px-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>{language === 'bn' ? 'রিজেক্ট' : 'Reject'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <span className="text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                            <span className={`font-extrabold uppercase ${
                              p.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                SECTION 4: ULTRA-ADVANCED API PANEL & SERVICES CATALOG
               ========================================================= */}
            {(activeSection === 'services' || activeSection === 'providers') && (
              <div className="space-y-3.5">
                {/* Primary Toggle: API Studio vs Local Services Catalog */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#0B1120] border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveSection('providers')}
                    className={`py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      activeSection === 'providers'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'অ্যাডভান্সড API প্যানেল' : 'API Studio'} ({providers.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('services')}
                    className={`py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      activeSection === 'services'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'সার্ভিস লিস্ট' : 'Services'} ({services.length})</span>
                  </button>
                </div>

                {activeSection === 'services' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder={language === 'bn' ? 'সার্ভিস খুঁজুন...' : 'Search services...'}
                          className="w-full bg-[#0B1120] border border-slate-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingService(true)}
                        className="py-2.5 px-3.5 rounded-2xl bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-1 shrink-0 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{language === 'bn' ? 'নতুন সার্ভিস' : 'Add'}</span>
                      </button>
                    </div>

                    {/* Add/Edit Service Sheet */}
                    {isAddingService && (
                      <div className="p-4 rounded-3xl bg-[#0B1120] border border-amber-500/40 space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-amber-400">
                            {language === 'bn' ? 'সার্ভিস যুক্ত / এডিট করুন' : 'Add / Edit Service'}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsAddingService(false)}
                            className="p-1 text-slate-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Service ID (e.g. fb-101)"
                            value={newService.id}
                            onChange={(e) => setNewService({ ...newService, id: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Category (Facebook)"
                            value={newService.category}
                            onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                          />
                        </div>

                        <input
                          type="text"
                          placeholder="Service Full Name"
                          value={newService.name}
                          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Rate/1K (৳)</label>
                            <input
                              type="number"
                              value={newService.rate}
                              onChange={(e) => setNewService({ ...newService, rate: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Min</label>
                            <input
                              type="number"
                              value={newService.min}
                              onChange={(e) => setNewService({ ...newService, min: parseInt(e.target.value) || 10 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Max</label>
                            <input
                              type="number"
                              value={newService.max}
                              onChange={(e) => setNewService({ ...newService, max: parseInt(e.target.value) || 100000 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Provider ID (Optional)"
                            value={newService.providerId || ''}
                            onChange={(e) => setNewService({ ...newService, providerId: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Upstream Service ID"
                            value={newService.providerServiceId || ''}
                            onChange={(e) => setNewService({ ...newService, providerServiceId: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                          />
                        </div>

                        <textarea
                          rows={2}
                          placeholder="Service description..."
                          value={newService.description}
                          onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        />

                        <button
                          type="button"
                          onClick={() => handleSaveService(newService as SMMService)}
                          className="w-full py-3 bg-emerald-500 text-slate-950 font-extrabold rounded-2xl"
                        >
                          {language === 'bn' ? 'সার্ভারে সেভ করুন' : 'Save Service to Server'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {filteredServices.length === 0 ? (
                        <div className="p-8 text-center bg-[#0B1120] border border-slate-800 rounded-3xl text-xs text-slate-400">
                          {language === 'bn'
                            ? 'কোনো সার্ভিস নেই। "নতুন সার্ভিস" বাটনে ক্লিক করুন অথবা API প্যানেল থেকে ইমপোর্ট করুন।'
                            : 'No services in catalog. Tap Add or import from API Studio.'}
                        </div>
                      ) : (
                        filteredServices.map(s => (
                          <div
                            key={s.id}
                            className="p-3.5 rounded-3xl bg-[#0B1120] border border-slate-800 flex items-center justify-between gap-2.5 text-xs"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-white">#{s.id}</span>
                                <span className="text-amber-400 font-semibold">{s.category}</span>
                                <span className="text-emerald-400 font-mono font-extrabold">৳{s.rate}/1k</span>
                              </div>
                              <p className="text-slate-200 font-semibold line-clamp-1">{s.name}</p>
                              <p className="text-[10px] font-mono text-slate-500">
                                Min: {s.min} · Max: {s.max}
                                {s.providerId ? ` · API: ${s.providerId} (#${s.providerServiceId})` : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewService(s);
                                  setIsAddingService(true);
                                }}
                                className="p-2.5 rounded-2xl bg-slate-900 text-sky-400 active:scale-95"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteService(s.id)}
                                className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 active:scale-95"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  /* =========================================================
                     5-MODULE ULTRA-ADVANCED ADMIN API CONTROL STUDIO
                     ========================================================= */
                  <div className="space-y-3.5">
                    {/* 5-Tab Sub-Navigation Bar for API Studio */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {[
                        { id: 'providers', label: language === 'bn' ? 'প্রোভাইডার হাব' : 'Providers', icon: Server },
                        { id: 'importer', label: language === 'bn' ? 'লাইভ ক্যাটালগ ইমপোর্টার' : 'Catalog Importer', icon: Layers },
                        { id: 'router', label: language === 'bn' ? 'অর্ডার ও রিফিল রাউটার' : 'Order Router', icon: Zap },
                        { id: 'pricing', label: language === 'bn' ? 'বাল্ক প্রাইস ও প্রফিট' : 'Price Engine', icon: DollarSign },
                        { id: 'console', label: language === 'bn' ? 'লাইভ লগ ও ডিবাগার' : 'Logs & Sandbox', icon: Terminal },
                      ].map(sub => {
                        const SubIcon = sub.icon;
                        const active = apiSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setApiSubTab(sub.id as AdminApiSubTab)}
                            className={`py-2 px-3 rounded-2xl text-[11px] font-extrabold whitespace-nowrap flex items-center gap-1.5 transition-all border ${
                              active
                                ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                                : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            <SubIcon className="w-3.5 h-3.5" />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* -------------------------------------------------------
                        API SUB-TAB 1: PROVIDERS HUB & PRESET CONNECTOR
                       ------------------------------------------------------- */}
                    {apiSubTab === 'providers' && (
                      <div className="space-y-3">
                        {/* Executive API Summary Strip */}
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-3xl bg-[#0B1120] border border-indigo-500/30 text-center font-mono text-xs">
                          <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Connected APIs</span>
                            <strong className="text-indigo-400 text-sm">{providers.length}</strong>
                          </div>
                          <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">API Services</span>
                            <strong className="text-amber-400 text-sm">{apiLinkedServices.length}</strong>
                          </div>
                          <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">API Orders</span>
                            <strong className="text-emerald-400 text-sm">{apiRoutedOrders.length}</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setNewProvider({
                              id: 'prv-' + Math.floor(100 + Math.random() * 900),
                              name: '',
                              apiUrl: 'https://',
                              apiKey: '',
                              balance: 0,
                              currency: 'USD',
                              profitMargin: 25,
                              fixedMarkup: 0,
                              priceRounding: 'none',
                              customExchangeRate: siteSettings.usdToBdtRate || 122,
                              autoForwardOrders: true,
                              autoSyncRefills: true,
                              lowBalanceAlert: 5,
                              status: 'active'
                            });
                            setNewProviderPingResult(null);
                            setIsAddingProvider(true);
                          }}
                          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>
                            {language === 'bn'
                              ? 'নতুন SMM API v2 প্রোভাইডার কানেক্ট করুন'
                              : 'Connect New SMM API v2 Provider'}
                          </span>
                        </button>

                        {/* Add / Edit Provider Modal Card with 1-Tap Presets */}
                        {isAddingProvider && (
                          <div className="p-4 rounded-3xl bg-[#0B1120] border border-amber-500/40 space-y-3.5 text-xs">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold text-amber-400 flex items-center gap-1.5">
                                <Server className="w-4 h-4" />
                                <span>Configure Upstream SMM API v2 Provider</span>
                              </h4>
                              <button type="button" onClick={() => setIsAddingProvider(false)}>
                                <X className="w-4 h-4 text-slate-400" />
                              </button>
                            </div>

                            {/* 1-Tap Popular SMM Panel Presets */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                1-Tap Popular SMM Panel Templates:
                              </span>
                              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                {POPULAR_SMM_PROVIDER_PRESETS.map(preset => (
                                  <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() =>
                                      setNewProvider({
                                        ...newProvider,
                                        name: preset.name,
                                        apiUrl: preset.apiUrl,
                                        currency: preset.currency,
                                        profitMargin: preset.margin
                                      })
                                    }
                                    className="py-1.5 px-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-[10px] font-bold text-sky-300 whitespace-nowrap active:scale-95"
                                  >
                                    + {preset.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">Provider Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. JustAnotherPanel (JAP)"
                                  value={newProvider.name}
                                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                  API v2 Endpoint URL
                                </label>
                                <input
                                  type="url"
                                  placeholder="https://domain.com/api/v2"
                                  value={newProvider.apiUrl}
                                  onChange={(e) => setNewProvider({ ...newProvider, apiUrl: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sky-300 font-mono"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                  Provider Secret API Key
                                </label>
                                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl pr-2">
                                  <input
                                    type={showProviderSecret ? 'text' : 'password'}
                                    placeholder="Paste upstream API key..."
                                    value={newProvider.apiKey}
                                    onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                                    className="flex-1 bg-transparent p-2.5 text-emerald-300 font-mono focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowProviderSecret(!showProviderSecret)}
                                    className="p-1.5 text-slate-400 hover:text-white"
                                  >
                                    {showProviderSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Pricing & Conversion Rules Grid */}
                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                  Profit Markup (%)
                                </label>
                                <input
                                  type="number"
                                  value={newProvider.profitMargin}
                                  onChange={(e) =>
                                    setNewProvider({ ...newProvider, profitMargin: parseFloat(e.target.value) || 0 })
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                  Fixed Fee Adder (+৳/1K)
                                </label>
                                <input
                                  type="number"
                                  value={newProvider.fixedMarkup ?? 0}
                                  onChange={(e) =>
                                    setNewProvider({ ...newProvider, fixedMarkup: parseFloat(e.target.value) || 0 })
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                  Provider Currency
                                </label>
                                <select
                                  value={newProvider.currency || 'USD'}
                                  onChange={(e) => setNewProvider({ ...newProvider, currency: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                                >
                                  <option value="USD">USD ($)</option>
                                  <option value="BDT">BDT (৳)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                  1 USD = BDT Rate
                                </label>
                                <input
                                  type="number"
                                  value={newProvider.customExchangeRate ?? 122}
                                  onChange={(e) =>
                                    setNewProvider({
                                      ...newProvider,
                                      customExchangeRate: parseFloat(e.target.value) || 122
                                    })
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                  Price Rounding Rule
                                </label>
                                <select
                                  value={newProvider.priceRounding || 'none'}
                                  onChange={(e) =>
                                    setNewProvider({ ...newProvider, priceRounding: e.target.value as any })
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                                >
                                  <option value="none">Exact Decimal (৳12.45)</option>
                                  <option value="nearest_int">Nearest ৳1 (৳12)</option>
                                  <option value="ceil">Round Up ৳ (৳13)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                  Low Balance Alert ($)
                                </label>
                                <input
                                  type="number"
                                  value={newProvider.lowBalanceAlert ?? 5}
                                  onChange={(e) =>
                                    setNewProvider({ ...newProvider, lowBalanceAlert: parseFloat(e.target.value) || 0 })
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                                />
                              </div>
                            </div>

                            {/* Live Ping Diagnostic Result Box */}
                            {newProviderPingResult && (
                              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-[11px] font-mono">
                                <span className="text-emerald-300 font-bold">
                                  ONLINE · {newProviderPingResult.latencyMs}ms
                                </span>
                                <span className="text-white font-extrabold">
                                  Bal: {newProviderPingResult.balance} {newProviderPingResult.currency}
                                  {newProviderPingResult.totalRemoteServices
                                    ? ` · ${newProviderPingResult.totalRemoteServices} Services`
                                    : ''}
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleTestNewProviderConnection}
                                disabled={testingNewProvider}
                                className="py-3 rounded-2xl bg-slate-900 border border-sky-500/40 text-sky-300 font-extrabold flex items-center justify-center gap-1.5 active:scale-95"
                              >
                                <Activity className={`w-3.5 h-3.5 ${testingNewProvider ? 'animate-spin' : ''}`} />
                                <span>{testingNewProvider ? 'Pinging...' : 'Test Connection'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveProvider}
                                className="py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center gap-1.5 active:scale-95"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Provider</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Connected Providers List */}
                        <div className="space-y-3">
                          {providers.length === 0 ? (
                            <div className="p-8 text-center bg-[#0B1120] border border-slate-800 rounded-3xl text-xs text-slate-400">
                              {language === 'bn'
                                ? 'কোনো API প্রোভাইডার যুক্ত করা হয়নি। উপরের বাটনে ক্লিক করে JAP/Peakerr বা যেকোনো SMM API প্যানেল কানেক্ট করুন।'
                                : 'No external SMM API providers connected yet. Tap Connect above to add an upstream panel.'}
                            </div>
                          ) : (
                            providers.map(prv => {
                              const linkedCount = services.filter(s => s.providerId === prv.id).length;
                              const isLowBalance = prv.balance < (prv.lowBalanceAlert ?? 5);

                              return (
                                <div
                                  key={prv.id}
                                  className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800/90 space-y-3 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-black text-white text-sm">{prv.name}</h4>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold">
                                          {prv.lastLatencyMs ? `${prv.lastLatencyMs}ms` : 'ACTIVE'}
                                        </span>
                                        {isLowBalance && (
                                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Low Bal
                                          </span>
                                        )}
                                      </div>
                                      <p className="font-mono text-[11px] text-sky-400 truncate max-w-[240px] mt-0.5">
                                        {prv.apiUrl}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-mono font-black text-emerald-400 text-sm block">
                                        {prv.balance.toFixed(2)} {prv.currency}
                                      </span>
                                      <span className="text-[10px] text-amber-400 font-mono">
                                        +{prv.profitMargin}%
                                        {prv.fixedMarkup ? ` +৳${prv.fixedMarkup}` : ''} Markup
                                      </span>
                                    </div>
                                  </div>

                                  {/* Provider Metrics Strip */}
                                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center font-mono text-[11px]">
                                    <div>
                                      <span className="text-[10px] text-slate-500 block">Local Synced</span>
                                      <strong className="text-white">{linkedCount} Services</strong>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 block">Remote Catalog</span>
                                      <strong className="text-sky-400">
                                        {prv.totalRemoteServices ?? '—'} Total
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 block">1 USD Rate</span>
                                      <strong className="text-amber-400">
                                        ৳{prv.customExchangeRate || siteSettings.usdToBdtRate || 122}
                                      </strong>
                                    </div>
                                  </div>

                                  {/* Primary Action Row: Ping, Browse Catalog, Quick Sync */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      disabled={checkingBalanceId === prv.id}
                                      onClick={() => handlePingAndCheckProvider(prv)}
                                      className="py-2.5 px-3 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                      <Activity className={`w-3.5 h-3.5 ${checkingBalanceId === prv.id ? 'animate-spin' : ''}`} />
                                      <span>{checkingBalanceId === prv.id ? 'Pinging...' : 'Ping & Balance'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedCatalogProviderId(prv.id);
                                        setApiSubTab('importer');
                                        handleLoadRemoteCatalogForBrowser(prv.id);
                                      }}
                                      className="py-2.5 px-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                      <Layers className="w-3.5 h-3.5" />
                                      <span>Browse Catalog</span>
                                    </button>
                                  </div>

                                  {/* Secondary Action Row: Full Import All Services + Status Sync & Recalculate Prices */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      disabled={syncingProviderId === prv.id}
                                      onClick={() => handleSyncProviderCatalog(prv)}
                                      className="py-2.5 px-3 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-300 font-extrabold text-[11px] flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                      <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${syncingProviderId === prv.id ? 'animate-spin' : ''}`} />
                                      <span className="truncate">
                                        {syncingProviderId === prv.id
                                          ? `Syncing All (${prv.totalRemoteServices || 'All'})...`
                                          : `Sync All (${prv.totalRemoteServices || 'All'}) & Status`}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={repricingProviderId === prv.id}
                                      onClick={() => handleRecalculateProviderPrices(prv)}
                                      className="py-2.5 px-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                      <span>{repricingProviderId === prv.id ? 'Updating...' : 'Re-Sync Prices'}</span>
                                    </button>
                                  </div>

                                  {/* Footer Row: Auto-Sync 5m Status, Edit & Delete */}
                                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                                    <span className="font-mono text-emerald-400/90">
                                      {prv.lastSyncAt
                                        ? `Synced: ${new Date(prv.lastSyncAt).toLocaleTimeString()} · Auto 5m`
                                        : 'Auto-Sync: Every 5m'}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewProvider(prv);
                                          setIsAddingProvider(true);
                                        }}
                                        className="text-sky-400 font-bold flex items-center gap-1"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteProviderWithServices(prv, true)}
                                        className="text-rose-400 font-bold flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Delete + Services
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {/* -------------------------------------------------------
                        API SUB-TAB 2: INTERACTIVE REMOTE CATALOG IMPORTER
                       ------------------------------------------------------- */}
                    {apiSubTab === 'importer' && (
                      <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3.5 text-xs">
                        <div>
                          <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-400" />
                            <span>
                              {language === 'bn'
                                ? 'লাইভ প্রোভাইডার ক্যাটালগ ব্রাউজার ও সিলেক্টিভ ইমপোর্টার'
                                : 'Live Remote Catalog Browser & Selective Importer'}
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Browse upstream services live, preview converted BDT prices, and import specific categories or services.
                          </p>
                        </div>

                        {/* Provider Selector + Load Catalog Button */}
                        <div className="flex gap-2">
                          <select
                            value={selectedCatalogProviderId}
                            onChange={(e) => setSelectedCatalogProviderId(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-white font-bold"
                          >
                            {providers.length === 0 ? (
                              <option value="">No Provider Connected</option>
                            ) : (
                              providers.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (+{p.profitMargin}% Markup)
                                </option>
                              ))
                            )}
                          </select>
                          <button
                            type="button"
                            disabled={loadingRemoteCatalog || providers.length === 0}
                            onClick={() => handleLoadRemoteCatalogForBrowser()}
                            className="py-2.5 px-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 active:scale-95"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingRemoteCatalog ? 'animate-spin' : ''}`} />
                            <span>{loadingRemoteCatalog ? 'Loading...' : 'Load Catalog'}</span>
                          </button>
                        </div>

                        {remoteCatalogServices.length > 0 && (
                          <>
                            {/* Filter by Remote Category & Search */}
                            <div className="space-y-2">
                              <select
                                value={selectedRemoteCategory}
                                onChange={(e) => setSelectedRemoteCategory(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-2.5 text-xs text-amber-300 font-bold"
                              >
                                <option value="All">
                                  All Remote Categories ({remoteCategories.length} categories · {remoteCatalogServices.length} services)
                                </option>
                                {remoteCategories.map(cat => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={remoteSearchQuery}
                                  onChange={(e) => setRemoteSearchQuery(e.target.value)}
                                  placeholder="Search remote service name or ID..."
                                  className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 text-xs text-white"
                                />
                                <input
                                  type="text"
                                  value={customLocalCategoryName}
                                  onChange={(e) => setCustomLocalCategoryName(e.target.value)}
                                  placeholder="Custom Local Category Name (Optional)"
                                  className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 text-xs text-sky-300"
                                />
                              </div>
                            </div>

                            {/* Selection Controls */}
                            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allFilteredIds = filteredRemoteCatalog.map(s => s.service);
                                    setSelectedRemoteServiceIds(allFilteredIds);
                                  }}
                                  className="py-1 px-2.5 rounded-lg bg-slate-800 text-sky-300 font-bold text-[11px]"
                                >
                                  Select All ({filteredRemoteCatalog.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRemoteServiceIds([])}
                                  className="py-1 px-2.5 rounded-lg bg-slate-900 text-slate-400 font-bold text-[11px]"
                                >
                                  Clear
                                </button>
                              </div>
                              <span className="font-mono font-extrabold text-emerald-400 text-[11px]">
                                {selectedRemoteServiceIds.length} Selected
                              </span>
                            </div>

                            {/* Import Selected CTA */}
                            <button
                              type="button"
                              disabled={importingSelected || selectedRemoteServiceIds.length === 0}
                              onClick={handleImportSelectedRemoteServices}
                              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-2 active:scale-95"
                            >
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                              <span>
                                {importingSelected
                                  ? 'Importing Selected Services to Cloud...'
                                  : `Import ${selectedRemoteServiceIds.length} Selected Services to Catalog`}
                              </span>
                            </button>

                            {/* Remote Services Scrollable List */}
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                              {filteredRemoteCatalog.slice(0, 150).map(item => {
                                const isChecked = selectedRemoteServiceIds.includes(item.service);
                                return (
                                  <div
                                    key={item.service}
                                    onClick={() => {
                                      setSelectedRemoteServiceIds(prev =>
                                        prev.includes(item.service)
                                          ? prev.filter(id => id !== item.service)
                                          : [...prev, item.service]
                                      );
                                    }}
                                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                                      isChecked
                                        ? 'bg-indigo-500/15 border-indigo-400'
                                        : 'bg-slate-950 border-slate-800/90'
                                    }`}
                                  >
                                    <div className="pt-0.5 text-indigo-400 shrink-0">
                                      {isChecked ? (
                                        <CheckSquare className="w-4 h-4" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-600" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono font-bold text-sky-400">
                                          #{item.service} · {item.category}
                                        </span>
                                        <span className="font-mono font-black text-emerald-400 shrink-0">
                                          ৳{item.convertedRateBdt}/1K
                                        </span>
                                      </div>
                                      <p className="text-slate-100 font-semibold leading-snug">{item.name}</p>
                                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                        <span>
                                          Provider Cost: {item.rawRate} · Min: {item.min} · Max: {item.max}
                                        </span>
                                        {item.refill && <span className="text-emerald-300">Refill✓</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* -------------------------------------------------------
                        API SUB-TAB 3: API ORDER ROUTER & REFILL DISPATCHER
                       ------------------------------------------------------- */}
                    {apiSubTab === 'router' && (
                      <div className="space-y-3.5 text-xs">
                        {/* Batch Sync Card */}
                        <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-amber-400" />
                                <span>API Order Router & Multi-Status Sync</span>
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                Batch sync up to 100 active orders per provider or manually re-dispatch pending orders.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSyncAllOrders}
                            disabled={syncingOrders}
                            className="w-full py-3 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center gap-2 active:scale-95"
                          >
                            <RefreshCw className={`w-4 h-4 ${syncingOrders ? 'animate-spin' : ''}`} />
                            <span>
                              {syncingOrders
                                ? 'Batch Syncing with Upstream Providers...'
                                : `Batch Sync All Active API Orders (${apiRoutedOrders.length})`}
                            </span>
                          </button>
                        </div>

                        {/* API Orders Queue */}
                        <div className="space-y-2.5">
                          <h5 className="text-[11px] font-extrabold uppercase text-slate-400 px-1">
                            API-Routed Orders ({apiRoutedOrders.length})
                          </h5>
                          {apiRoutedOrders.length === 0 ? (
                            <div className="p-6 text-center bg-[#0B1120] border border-slate-800 rounded-3xl text-slate-400">
                              No API-linked orders found yet.
                            </div>
                          ) : (
                            apiRoutedOrders.slice(0, 30).map(ord => (
                              <div
                                key={ord.id}
                                className="p-3.5 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-black text-white">#{ord.id}</span>
                                  {ord.providerOrderId ? (
                                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                                      Upstream #{ord.providerOrderId} ({ord.status})
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                                      Not Dispatched Yet
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-200 font-semibold truncate">{ord.serviceName}</p>
                                {!ord.providerOrderId && (
                                  <button
                                    type="button"
                                    disabled={dispatchingOrderId === ord.id}
                                    onClick={() => handleManualOrderDispatch(ord)}
                                    className="w-full py-2.5 rounded-2xl bg-indigo-500 text-white font-extrabold flex items-center justify-center gap-1.5 active:scale-95"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>
                                      {dispatchingOrderId === ord.id
                                        ? 'Dispatching to Provider...'
                                        : 'Dispatch to Upstream API Now'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Upstream Refill Dispatcher */}
                        <div className="space-y-2.5 pt-2">
                          <h5 className="text-[11px] font-extrabold uppercase text-slate-400 px-1">
                            Upstream API Refill Forwarding ({pendingRefills.length})
                          </h5>
                          {pendingRefills.map(r => (
                            <div
                              key={r.id}
                              className="p-3.5 rounded-3xl bg-[#0B1120] border border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-mono font-bold text-white">#{r.id}</span>
                                <span className="ml-2 font-mono text-sky-400">Order #{r.orderId}</span>
                                <p className="text-[11px] text-slate-400 truncate">{r.serviceName}</p>
                              </div>
                              <button
                                type="button"
                                disabled={forwardingRefillId === r.id}
                                onClick={() => handleForwardRefillToApi(r)}
                                className="py-2 px-3 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-[11px] shrink-0 active:scale-95"
                              >
                                {forwardingRefillId === r.id ? 'Sending...' : 'Forward to API'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* -------------------------------------------------------
                        API SUB-TAB 4: BULK PRICE & PROFIT ENGINE
                       ------------------------------------------------------- */}
                    {apiSubTab === 'pricing' && (
                      <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 text-xs">
                        <div>
                          <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <span>Bulk API Profit Margin & Price Recalculator</span>
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Update markup rules for any provider and atomically recalculate all linked service rates.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono">
                          <div>
                            <span className="text-[10px] text-slate-400 block">API Order Revenue</span>
                            <strong className="text-emerald-400 text-sm">{formatPrice(apiOrdersRevenue)}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">API Linked Services</span>
                            <strong className="text-amber-400 text-sm">{apiLinkedServices.length} Services</strong>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">
                              Select Target API Provider
                            </label>
                            <select
                              value={bulkRuleProviderId}
                              onChange={(e) => {
                                setBulkRuleProviderId(e.target.value);
                                const p = providers.find(prv => prv.id === e.target.value);
                                if (p) {
                                  setBulkMarginPercent(p.profitMargin);
                                  setBulkFixedMarkup(p.fixedMarkup || 0);
                                  setBulkExchangeRate(p.customExchangeRate || siteSettings.usdToBdtRate || 122);
                                  setBulkRounding(p.priceRounding || 'none');
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                            >
                              {providers.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({services.filter(s => s.providerId === p.id).length} services)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                New Profit Margin (%)
                              </label>
                              <input
                                type="number"
                                value={bulkMarginPercent}
                                onChange={(e) => setBulkMarginPercent(parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                Fixed BDT Adder (+৳/1K)
                              </label>
                              <input
                                type="number"
                                value={bulkFixedMarkup}
                                onChange={(e) => setBulkFixedMarkup(parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                USD to BDT Rate
                              </label>
                              <input
                                type="number"
                                value={bulkExchangeRate}
                                onChange={(e) => setBulkExchangeRate(parseFloat(e.target.value) || 122)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                                Price Rounding
                              </label>
                              <select
                                value={bulkRounding}
                                onChange={(e) => setBulkRounding(e.target.value as any)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                              >
                                <option value="none">Exact Decimal</option>
                                <option value="nearest_int">Nearest ৳1</option>
                                <option value="ceil">Round Up ৳</option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={applyingBulkPrice || providers.length === 0}
                            onClick={handleApplyBulkPricingRule}
                            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center gap-2 active:scale-95"
                          >
                            <RefreshCw className={`w-4 h-4 ${applyingBulkPrice ? 'animate-spin' : ''}`} />
                            <span>
                              {applyingBulkPrice
                                ? 'Recalculating Catalog Prices...'
                                : 'Apply Rule & Recalculate All Linked Services'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* -------------------------------------------------------
                        API SUB-TAB 5: LIVE TRAFFIC LOGS & RAW DEBUGGER
                       ------------------------------------------------------- */}
                    {apiSubTab === 'console' && (
                      <div className="space-y-3.5 text-xs">
                        {/* Raw Provider API Tester */}
                        <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                              <Cpu className="w-4 h-4 text-sky-400" />
                              <span>Raw Upstream Provider API Debugger</span>
                            </h4>
                            <span className="text-[10px] font-mono text-sky-400">Server Proxy</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={rawTestProviderId}
                              onChange={(e) => setRawTestProviderId(e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                            >
                              {providers.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>

                            <select
                              value={rawTestAction}
                              onChange={(e) => setRawTestAction(e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-300 font-mono font-bold"
                            >
                              <option value="balance">action=balance</option>
                              <option value="services">action=services</option>
                              <option value="status">action=status</option>
                              <option value="refill">action=refill</option>
                              <option value="cancel">action=cancel</option>
                            </select>
                          </div>

                          {['status', 'refill', 'cancel'].includes(rawTestAction) && (
                            <input
                              type="text"
                              value={rawTestOrderId}
                              onChange={(e) => setRawTestOrderId(e.target.value)}
                              placeholder="Upstream Provider Order ID (e.g. 948201)"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                            />
                          )}

                          <button
                            type="button"
                            disabled={runningRawTest || providers.length === 0}
                            onClick={handleExecuteRawProviderTest}
                            className="w-full py-3 rounded-2xl bg-sky-500 text-slate-950 font-black flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>{runningRawTest ? 'Executing Raw Call...' : 'Execute Raw Upstream Request'}</span>
                          </button>

                          {rawTestOutput && (
                            <pre className="p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-56">
                              {rawTestOutput}
                            </pre>
                          )}
                        </div>

                        {/* Live Server API Traffic Logs */}
                        <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                                <Terminal className="w-4 h-4 text-emerald-400" />
                                <span>Live Server API Traffic Stream</span>
                              </h4>
                              <p className="text-[10px] font-mono text-slate-400">
                                Total: {apiLogsData.totalCalls} · Success: {apiLogsData.successRate}% · Avg: {apiLogsData.avgLatencyMs}ms
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={refreshApiTrafficLogs}
                                className="p-2 rounded-xl bg-slate-900 text-slate-300"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await clearServerApiTrafficLogs();
                                  refreshApiTrafficLogs();
                                }}
                                className="p-2 rounded-xl bg-rose-500/15 text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {apiLogsData.logs.length === 0 ? (
                              <div className="p-6 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-500">
                                No API calls logged in this session yet.
                              </div>
                            ) : (
                              apiLogsData.logs.map(log => (
                                <div
                                  key={log.id}
                                  className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-1 font-mono text-[11px]"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                          log.direction === 'upstream'
                                            ? 'bg-indigo-500/20 text-indigo-300'
                                            : 'bg-sky-500/20 text-sky-300'
                                        }`}
                                      >
                                        {log.direction === 'upstream' ? 'OUT' : 'IN v2'}
                                      </span>
                                      <span className="font-bold text-white">{log.action}</span>
                                      <span className="text-slate-400 truncate max-w-[110px]">{log.endpoint}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className={
                                          log.status === 'success' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                                        }
                                      >
                                        {log.httpCode}
                                      </span>
                                      <span className="text-slate-500">{log.latencyMs}ms</span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-300 truncate">{log.summary}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                SECTION 5: ADMIN CONTROL HUB (MORE MENU)
               ========================================================= */}
            {activeSection === 'hub' && (
              <div className="space-y-3">
                <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-2">
                  {[
                    {
                      id: 'finance',
                      title: language === 'bn' ? 'প্রফিট ও ফাইন্যান্সিয়াল ইন্টেলিজেন্স' : 'Financial & Profit Intelligence',
                      sub: `Net Profit: ${formatPrice(totalEstimatedNetProfit)} · P&L, API Burn, Margin Audit & Simulator`,
                      icon: TrendingUp,
                      color: 'text-[#22C55E] bg-[#22C55E]/15'
                    },
                    {
                      id: 'services',
                      title: language === 'bn' ? 'সার্ভিস ক্যাটালগ ম্যানেজার' : 'Local Services Catalog',
                      sub: `${services.length} active services in database`,
                      icon: Layers,
                      color: 'text-amber-400 bg-amber-500/15'
                    },
                    {
                      id: 'users',
                      title: language === 'bn' ? 'ইউজার এবং ব্যালেন্স কন্ট্রোল' : 'Users & Balance Control',
                      sub: `${users.length} registered accounts`,
                      icon: Users,
                      color: 'text-purple-400 bg-purple-500/15'
                    },
                    {
                      id: 'tickets',
                      title: language === 'bn' ? 'কাস্টমার সাপোর্ট টিকেট' : 'Customer Support Tickets',
                      sub: `${openTickets.length} open tickets awaiting reply`,
                      icon: MessageSquare,
                      color: 'text-rose-400 bg-rose-500/15'
                    },
                    {
                      id: 'coupons',
                      title: language === 'bn' ? 'প্রোমো কোড ও গিফট ভাউচার' : 'Promo Codes & Gift Vouchers',
                      sub: `${coupons.length} active promo codes`,
                      icon: Gift,
                      color: 'text-pink-400 bg-pink-500/15'
                    },
                    {
                      id: 'announcements',
                      title: language === 'bn' ? 'অ্যাপ নোটিশ বোর্ড' : 'Live App Announcements',
                      sub: `${announcements.length} published notices`,
                      icon: Megaphone,
                      color: 'text-sky-400 bg-sky-500/15'
                    },
                    {
                      id: 'settings',
                      title: language === 'bn' ? 'পেমেন্ট নাম্বার ও সাইট সেটিংস' : 'Payment Gateways & Site Settings',
                      sub: 'bKash, Nagad, Rocket, USDT, USD Rate & Hotlines',
                      icon: Settings,
                      color: 'text-emerald-400 bg-emerald-500/15'
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateSection(item.id as AdminSection)}
                        className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3 text-left active:scale-98 transition-transform"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-white truncate">{item.title}</p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.sub}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      </button>
                    );
                  })}
                </div>

                {onExitAdmin && (
                  <button
                    type="button"
                    onClick={onExitAdmin}
                    className="w-full p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-extrabold text-xs flex items-center justify-center gap-2 active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{language === 'bn' ? 'অ্যাডমিন অ্যাপ থেকে বের হয়ে ইউজার প্যানেলে যান' : 'Exit Admin App & Return to User Panel'}</span>
                  </button>
                )}
              </div>
            )}

            {/* =========================================================
                HUB SUB-SCREEN: USERS MANAGEMENT
               ========================================================= */}
            {activeSection === 'users' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search user by email or UID..."
                    className="w-full bg-[#0B1120] border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2.5">
                  {users
                    .filter(u => !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.uid.includes(userSearch))
                    .map(u => (
                      <div
                        key={u.uid}
                        className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-2.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-extrabold text-white truncate">{u.displayName}</p>
                            <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                          </div>
                          <span className="font-mono font-black text-emerald-400 text-sm shrink-0">
                            ৳{u.balance.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                          <span>Spent: ৳{(u.totalSpent || 0).toLocaleString()}</span>
                          <span className="uppercase text-amber-400 font-bold">{u.role}</span>
                        </div>

                        {balanceAdjustUid === u.uid ? (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="number"
                              value={balanceAdjustAmount}
                              onChange={(e) => setBalanceAdjustAmount(parseFloat(e.target.value) || 0)}
                              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveUserBalance(u.uid)}
                              className="py-2 px-4 bg-emerald-500 text-slate-950 font-extrabold rounded-xl text-xs"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setBalanceAdjustUid(null)}
                              className="py-2 px-3 bg-slate-800 text-slate-400 rounded-xl text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setBalanceAdjustUid(u.uid);
                              setBalanceAdjustAmount(u.balance);
                            }}
                            className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs active:scale-95"
                          >
                            {language === 'bn' ? 'ব্যালেন্স পরিবর্তন করুন' : 'Edit User Balance'}
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* =========================================================
                HUB SUB-SCREEN: SUPPORT TICKETS
               ========================================================= */}
            {activeSection === 'tickets' && (
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center bg-[#0B1120] border border-slate-800 rounded-3xl text-xs text-slate-400">
                    No support tickets found.
                  </div>
                ) : (
                  tickets.map(t => (
                    <div key={t.id} className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white">#{t.id} · {t.department}</span>
                        <span className={`font-extrabold uppercase text-[10px] ${
                          t.status === 'open' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div>
                        <p className="font-extrabold text-white">{t.subject}</p>
                        <p className="text-[11px] text-slate-400">{t.userEmail}</p>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-[11px] max-h-44 overflow-y-auto">
                        {t.messages.map((m, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-xl ${
                              m.senderRole === 'admin'
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200 ml-4'
                                : 'bg-slate-900 text-slate-200 mr-4'
                            }`}
                          >
                            <span className="font-bold block text-[10px] opacity-75">{m.senderName}</span>
                            <p className="mt-0.5">{m.message}</p>
                          </div>
                        ))}
                      </div>

                      {selectedTicketId === t.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Write official reply..."
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleSendAdminReply(t)}
                            className="px-4 bg-amber-500 text-slate-950 font-extrabold rounded-2xl text-xs flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedTicketId(t.id)}
                          className="w-full py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 font-bold text-xs"
                        >
                          Reply to Customer
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* =========================================================
                HUB SUB-SCREEN: PROMO CODES
               ========================================================= */}
            {activeSection === 'coupons' && (
              <div className="space-y-3.5">
                <form onSubmit={handleCreateCoupon} className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3 text-xs">
                  <h4 className="font-extrabold text-white">Create Gift Promo Code</h4>
                  <input
                    type="text"
                    required
                    placeholder="PROMO CODE (e.g. BONUS50)"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono uppercase"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Reward Amount (৳)</label>
                      <input
                        type="number"
                        required
                        min={5}
                        value={newCouponReward}
                        onChange={(e) => setNewCouponReward(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-2.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Max Uses Limit</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={newCouponMaxUses}
                        onChange={(e) => setNewCouponMaxUses(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-2.5 text-white font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-amber-500 text-slate-950 font-extrabold"
                  >
                    + Save Promo Code
                  </button>
                </form>

                <div className="space-y-2">
                  {coupons.map(cp => (
                    <div
                      key={cp.id}
                      className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-black text-emerald-400 text-sm">{cp.code}</span>
                        <span className="ml-2 font-bold text-white">৳{cp.rewardAmount} Bonus</span>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Used: {cp.usedCount} / {cp.maxUses}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCoupon(cp.id)}
                        className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =========================================================
                HUB SUB-SCREEN: ANNOUNCEMENTS
               ========================================================= */}
            {activeSection === 'announcements' && (
              <div className="space-y-3.5">
                <form onSubmit={handleCreateAnnouncement} className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3 text-xs">
                  <h4 className="font-extrabold text-white">Publish Live Notice</h4>
                  <input
                    type="text"
                    required
                    placeholder="Notice Headline"
                    value={newAnnTitle}
                    onChange={(e) => setNewAnnTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white"
                  />
                  <select
                    value={newAnnType}
                    onChange={(e) => setNewAnnType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white"
                  >
                    <option value="info">Info Notice</option>
                    <option value="promo">Special Offer / Promo</option>
                    <option value="warning">Important Warning</option>
                    <option value="maintenance">Server Maintenance</option>
                  </select>
                  <textarea
                    rows={3}
                    required
                    placeholder="Write notice details..."
                    value={newAnnContent}
                    onChange={(e) => setNewAnnContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white"
                  />
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-amber-500 text-slate-950 font-extrabold"
                  >
                    Publish Notice
                  </button>
                </form>

                <div className="space-y-2">
                  {announcements.map(ann => (
                    <div
                      key={ann.id}
                      className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-white">{ann.title}</p>
                        <p className="text-slate-400 mt-1 leading-relaxed">{ann.content}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAnnouncement(ann.id)}
                        className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =========================================================
                HUB SUB-SCREEN: GLOBAL SITE & ZINIPAY PAYMENT SETTINGS
               ========================================================= */}
            {activeSection === 'settings' && (
              <form onSubmit={handleSaveGlobalSettings} className="space-y-4 text-xs">
                {/* 1. ZINIPAY AUTOMATED PAYMENT GATEWAY SUITE */}
                <div className="p-4 sm:p-5 rounded-3xl bg-[#0B1120] border border-[#22D3EE]/35 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-extrabold text-white">
                            ZiniPay Automated Payment Gateway
                          </h3>
                          <span className="px-2 py-0.5 rounded bg-[#22D3EE]/15 text-[#22D3EE] font-mono text-[10px] font-bold uppercase">
                            API v1
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Hosted Checkout (/v1/payment/create & /verify) + 2-Step Trx Verification (/v1/trx/verify & /confirm)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSettingsForm({
                          ...settingsForm,
                          zinipayEnabled: !(settingsForm.zinipayEnabled !== false)
                        })
                      }
                      className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-extrabold uppercase border transition-all ${
                        settingsForm.zinipayEnabled !== false
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {settingsForm.zinipayEnabled !== false ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Environment Mode Selector: Sandbox vs Live */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, zinipayMode: 'sandbox' })}
                      className={`py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                        (settingsForm.zinipayMode || 'sandbox') === 'sandbox'
                          ? 'bg-[#22D3EE] text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Sandbox Mode (Testing & Simulator)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, zinipayMode: 'live' })}
                      className={`py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                        settingsForm.zinipayMode === 'live'
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Live Production (api.zinipay.com)
                    </button>
                  </div>

                  {/* ZiniPay Brand API Key (zini-api-key) */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        ZiniPay Brand / Service API Key (zini-api-key)
                      </label>
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-2xl pr-2.5">
                        <input
                          type={showZiniApiKey ? 'text' : 'password'}
                          value={settingsForm.zinipayApiKey || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, zinipayApiKey: e.target.value })}
                          placeholder="Paste your Brand Key from ZiniPay Dashboard -> Main Menu -> Brands"
                          className="flex-1 bg-transparent p-3 text-emerald-300 font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowZiniApiKey(!showZiniApiKey)}
                          className="p-1.5 text-slate-400 hover:text-white"
                        >
                          {showZiniApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Primary ZiniPay API Node (Auto-Failover Enabled)
                        </label>
                        <select
                          value={settingsForm.zinipayBaseUrl || 'https://api.zinipay.com'}
                          onChange={(e) => setSettingsForm({ ...settingsForm, zinipayBaseUrl: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-sky-300 font-mono font-bold"
                        >
                          <option value="https://api.zinipay.com">https://api.zinipay.com (Primary)</option>
                          <option value="https://api2.zinipay.com">https://api2.zinipay.com (Node 2)</option>
                          <option value="https://api3.zinipay.com">https://api3.zinipay.com (Node 3)</option>
                          <option value="https://api4.zinipay.com">https://api4.zinipay.com (Node 4)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Brand Website Domain (Optional for redirect_url)
                        </label>
                        <input
                          type="text"
                          value={settingsForm.zinipayBrandDomain || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, zinipayBrandDomain: e.target.value })}
                          placeholder="e.g. https://yourdomain.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          ZiniPay Deposit Bonus (%)
                        </label>
                        <input
                          type="number"
                          value={settingsForm.zinipayBonusPercent ?? 3}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              zinipayBonusPercent: parseFloat(e.target.value) || 0
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          2-Step TrxID Auto-Verification
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setSettingsForm({
                              ...settingsForm,
                              zinipayAutoVerifyTrx: !(settingsForm.zinipayAutoVerifyTrx !== false)
                            })
                          }
                          className={`w-full p-3 rounded-2xl border font-mono font-bold text-xs flex items-center justify-between ${
                            settingsForm.zinipayAutoVerifyTrx !== false
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span>/v1/trx/verify + confirm</span>
                          <span>{settingsForm.zinipayAutoVerifyTrx !== false ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Webhook Endpoint URL Copy Box */}
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          ZiniPay Webhook & SMS Automation Callback URL:
                        </span>
                        <span className="font-mono text-[11px] text-[#22D3EE] truncate block mt-0.5">
                          {`${window.location.origin}/api/zinipay/webhook`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/zinipay/webhook`);
                          onShowToast('ZiniPay Webhook URL copied!', 'info');
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Node Ping Diagnostics */}
                  {ziniPingResult && (
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-[#22D3EE]/30 space-y-2 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold">
                          ZiniPay Nodes Reachable: {ziniPingResult.reachableNodes}/{ziniPingResult.totalNodes}
                        </span>
                        <span className="text-[#22D3EE]">
                          Primary Latency: {ziniPingResult.primaryLatencyMs}ms
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {ziniPingResult.nodes.map((n) => (
                          <div
                            key={n.node}
                            className={`p-2 rounded-xl border text-[10px] ${
                              n.reachable
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            <div className="truncate font-bold">{n.node.replace('https://', '')}</div>
                            <div>{n.reachable ? `${n.latencyMs}ms (HTTP ${n.httpCode})` : 'Offline'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={testingZiniPay}
                      onClick={handleTestZiniPayConnection}
                      className="flex-1 py-3 rounded-2xl bg-slate-900 border border-[#22D3EE]/40 text-[#22D3EE] font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Activity className={`w-4 h-4 ${testingZiniPay ? 'animate-spin' : ''}`} />
                      <span>
                        {testingZiniPay ? 'Pinging ZiniPay Nodes...' : 'Test ZiniPay Multi-Node Connection'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={refreshZiniPayLogs}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                      title="Refresh ZiniPay Logs"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Live ZiniPay Gateway Event Stream */}
                  {ziniLogs.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Recent ZiniPay Gateway & Webhook Events ({ziniLogs.length})
                      </span>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {ziniLogs.slice(0, 12).map((lg) => (
                          <div
                            key={lg.id}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2 font-mono text-[10px]"
                          >
                            <div className="min-w-0">
                              <span
                                className={`px-1.5 py-0.5 rounded mr-1.5 font-bold uppercase ${
                                  lg.status === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : lg.status === 'pending'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {lg.type}
                              </span>
                              <span className="text-slate-200">{lg.summary}</span>
                            </div>
                            <span className="text-slate-500 shrink-0">{lg.latencyMs}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. MANUAL / DIRECT GATEWAYS & GLOBAL SITE SETTINGS */}
                <div className="p-4 sm:p-5 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Direct MFS Accounts & Global Settings</h3>
                    <p className="text-[11px] text-slate-400">Synced live across all users via Cloud Firestore</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">bKash Personal/Merchant Number</label>
                      <input
                        type="text"
                        value={settingsForm.bkashNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bkashNumber: e.target.value })}
                        placeholder="01XXXXXXXXX"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nagad Number</label>
                      <input
                        type="text"
                        value={settingsForm.nagadNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, nagadNumber: e.target.value })}
                        placeholder="01XXXXXXXXX"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rocket Number</label>
                        <input
                          type="text"
                          value={settingsForm.rocketNumber}
                          onChange={(e) => setSettingsForm({ ...settingsForm, rocketNumber: e.target.value })}
                          placeholder="01XXXXXXXXX"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Upay Number</label>
                        <input
                          type="text"
                          value={settingsForm.upayNumber}
                          onChange={(e) => setSettingsForm({ ...settingsForm, upayNumber: e.target.value })}
                          placeholder="01XXXXXXXXX"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Binance / USDT (TRC-20) Address</label>
                      <input
                        type="text"
                        value={settingsForm.usdtAddress}
                        onChange={(e) => setSettingsForm({ ...settingsForm, usdtAddress: e.target.value })}
                        placeholder="T..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">bKash Bonus (%)</label>
                      <input
                        type="number"
                        value={settingsForm.bkashBonusPercent}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bkashBonusPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">USDT Bonus (%)</label>
                      <input
                        type="number"
                        value={settingsForm.usdtBonusPercent}
                        onChange={(e) => setSettingsForm({ ...settingsForm, usdtBonusPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Referral Bonus (%)</label>
                      <input
                        type="number"
                        value={settingsForm.referralCommissionPercent}
                        onChange={(e) => setSettingsForm({ ...settingsForm, referralCommissionPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">1 USD = BDT Rate</label>
                      <input
                        type="number"
                        value={settingsForm.usdToBdtRate || 122}
                        onChange={(e) => setSettingsForm({ ...settingsForm, usdToBdtRate: parseFloat(e.target.value) || 122 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">WhatsApp Support URL</label>
                      <input
                        type="text"
                        value={settingsForm.whatsappUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, whatsappUrl: e.target.value })}
                        placeholder="https://wa.me/8801XXXXXXXXX"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telegram Support URL</label>
                      <input
                        type="text"
                        value={settingsForm.telegramUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, telegramUrl: e.target.value })}
                        placeholder="https://t.me/..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving ZiniPay & Global Settings...' : 'Save ZiniPay & Global Settings'}</span>
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* STANDALONE NATIVE MOBILE ADMIN BOTTOM NAVIGATION DOCK */}
      <nav
        aria-label="Admin Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none flex justify-center pb-[max(8px,env(safe-area-inset-bottom))] px-3"
      >
        <div className="pointer-events-auto w-full max-w-md bg-[#0D1220]/95 backdrop-blur-2xl border border-[#8B5CF6]/30 rounded-[28px] shadow-[0_16px_50px_rgba(0,0,0,0.9)] p-1.5 flex items-center justify-between">
          {[
            {
              id: 'overview',
              target: 'overview' as AdminSection,
              label: language === 'bn' ? 'ড্যাশবোর্ড' : 'Home',
              icon: LayoutGrid
            },
            {
              id: 'orders',
              target: 'orders' as AdminSection,
              label: language === 'bn' ? 'অর্ডারস' : 'Orders',
              icon: Package,
              badge: pendingOrders.length > 0 ? pendingOrders.length : undefined
            },
            {
              id: 'payments',
              target: 'payments' as AdminSection,
              label: language === 'bn' ? 'ডিপোজিট' : 'Deposits',
              icon: Wallet,
              badge: pendingDeposits.length > 0 ? pendingDeposits.length : undefined
            },
            {
              id: 'api',
              target: 'providers' as AdminSection,
              label: language === 'bn' ? 'API প্যানেল' : 'API Studio',
              icon: Server,
              badge: providers.length > 0 ? providers.length : undefined
            },
            {
              id: 'hub',
              target: 'hub' as AdminSection,
              label: language === 'bn' ? 'কন্ট্রোল হাব' : 'Hub',
              icon: SlidersHorizontal,
              badge: openTickets.length > 0 ? openTickets.length : undefined
            }
          ].map((tab) => {
            const isActive = activeBottomTab === tab.id;
            const Icon = tab.icon;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigateSection(tab.target)}
                className="relative flex-1 py-1.5 px-1 rounded-2xl transition-all flex flex-col items-center justify-center min-h-[48px] focus:outline-none"
              >
                {isActive && (
                  <motion.div
                    layoutId="adminBottomNavActivePill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-gradient-to-b from-[#8B5CF6]/25 to-[#8B5CF6]/10 border border-[#8B5CF6]/40 rounded-2xl"
                  />
                )}

                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                    <Icon
                      className={`w-4.5 h-4.5 transition-colors ${
                        isActive ? 'text-[#22D3EE] stroke-[2.5]' : 'text-[#94A3B8] stroke-[2]'
                      }`}
                    />
                    {tab.badge && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#8B5CF6] text-white font-black text-[9px] flex items-center justify-center font-mono">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-0.5 tracking-tight ${
                      isActive ? 'text-[#F1F5F9] font-extrabold' : 'text-[#94A3B8] font-medium'
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </nav>
      </div>
    </div>
  );
};
