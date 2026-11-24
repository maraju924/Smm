import React, { useState, useEffect, useMemo } from 'react';
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
  TrendingUp,
  Globe,
  BookOpen,
  Sparkles,
  Filter,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Mail,
  HelpCircle,
  AlertCircle,
  FileText,
  Database,
  ShieldAlert
} from 'lucide-react';
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
  ServerHealthStatus,
  SMMBlogPost
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
  fetchServerHealthStatus,
  reconcileAndPurgeInactiveServices,
  autoSyncAllProvidersEverything
} from '../../services/db';
import { testGeminiConnectionOnServer } from '../../services/blogSeoService';
import {
  BRAND_LOGO_URL,
  DEFAULT_SITE_SETTINGS,
  BD_MAIN_SEO_KEYWORD,
  BD_SUB_SEO_KEYWORDS,
  DEFAULT_BD_SEO_KEYWORDS_STRING,
  INITIAL_SEO_BLOG_POSTS
} from '../../data/seedServices';
import { AdminFinanceView } from './AdminFinanceView';
import { AdminBlogManager } from './AdminBlogManager';

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
  blogs?: SMMBlogPost[];
  siteSettings?: SiteSettings;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onExitAdmin?: () => void;
  onPreviewBlogSlug?: (slug: string) => void;
}

type AdminSection =
  | 'overview'
  | 'finance'
  | 'orders'
  | 'refills'
  | 'payments'
  | 'services'
  | 'providers'
  | 'blogs'
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
  blogs = INITIAL_SEO_BLOG_POSTS,
  siteSettings = DEFAULT_SITE_SETTINGS,
  onShowToast,
  onExitAdmin,
  onPreviewBlogSlug
}) => {
  const { formatPrice, profile, language, setLanguage, darkMode, setDarkMode } = useAuth();
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

  // Metrics & Badges Calculation
  const totalRevenue = useMemo(() => {
    return orders.reduce((acc, o) => acc + (o.status !== 'canceled' && o.status !== 'refunded' ? o.charge : 0), 0);
  }, [orders]);

  const totalEstimatedNetProfit = useMemo(() => {
    return orders.reduce((acc, o) => {
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
  }, [orders, services, providers, siteSettings.usdToBdtRate]);

  const pendingDeposits = useMemo(() => payments.filter(p => p.status === 'pending'), [payments]);
  const pendingOrders = useMemo(() => orders.filter(o => ['pending', 'processing', 'in_progress'].includes(o.status)), [orders]);
  const openTickets = useMemo(() => tickets.filter(t => t.status === 'open'), [tickets]);
  const pendingRefills = useMemo(() => refills.filter(r => r.status === 'pending'), [refills]);

  // Orders Filter & Search State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [activeOrderDetail, setActiveOrderDetail] = useState<SMMOrder | null>(null);

  // Payments Filter & Processing State
  const [paymentFilter, setPaymentFilter] = useState<'pending' | 'all'>('pending');
  const [paymentTab, setPaymentTab] = useState<'manual' | 'zinipay'>('manual');
  const [paymentProcessing, setPaymentProcessing] = useState<string | null>(null);
  const [ziniQueryInvoiceId, setZiniQueryInvoiceId] = useState('');

  // Services Catalog State
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('All');
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<SMMService | null>(null);
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

  // API Providers Studio State
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

  // Sub-Tab 2: Remote Catalog Selective Importer
  const [selectedCatalogProviderId, setSelectedCatalogProviderId] = useState<string>('');
  const [loadingRemoteCatalog, setLoadingRemoteCatalog] = useState(false);
  const [remoteCatalogServices, setRemoteCatalogServices] = useState<RemoteProviderService[]>([]);
  const [remoteCategories, setRemoteCategories] = useState<string[]>([]);
  const [selectedRemoteCategory, setSelectedRemoteCategory] = useState<string>('All');
  const [remoteSearchQuery, setRemoteSearchQuery] = useState<string>('');
  const [selectedRemoteServiceIds, setSelectedRemoteServiceIds] = useState<string[]>([]);
  const [customLocalCategoryName, setCustomLocalCategoryName] = useState<string>('');
  const [importingSelected, setImportingSelected] = useState(false);

  // Sub-Tab 3: Order Router & Dispatcher State
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null);
  const [forwardingRefillId, setForwardingRefillId] = useState<string | null>(null);

  // Sub-Tab 4: Bulk Pricing Rule State
  const [bulkRuleProviderId, setBulkRuleProviderId] = useState<string>('');
  const [bulkMarginPercent, setBulkMarginPercent] = useState<number>(25);
  const [bulkFixedMarkup, setBulkFixedMarkup] = useState<number>(0);
  const [bulkExchangeRate, setBulkExchangeRate] = useState<number>(122);
  const [bulkRounding, setBulkRounding] = useState<'none' | 'nearest_int' | 'ceil'>('none');
  const [applyingBulkPrice, setApplyingBulkPrice] = useState(false);

  // Sub-Tab 5: Traffic Logs & Raw Terminal State
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

  // Site Settings & Gateway State
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showZiniApiKey, setShowZiniApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiStatusMsg, setGeminiStatusMsg] = useState<string | null>(null);
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

  // Actions
  const handleTestZiniPayConnection = async () => {
    setTestingZiniPay(true);
    try {
      const res = await pingZiniPayGatewayOnServer(settingsForm);
      setZiniPingResult(res);
      await refreshZiniPayLogs();
      onShowToast(
        `ZiniPay Online: ${res.reachableNodes}/${res.totalNodes} API nodes reachable (${res.primaryLatencyMs}ms)`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'ZiniPay connection diagnostic failed', 'error');
    } finally {
      setTestingZiniPay(false);
    }
  };

  const handleTestGeminiConnection = async () => {
    setTestingGemini(true);
    try {
      const res = await testGeminiConnectionOnServer({
        apiKey: settingsForm.geminiApiKey,
        model: settingsForm.geminiModel || 'gemini-2.5-flash'
      });
      setGeminiStatusMsg(
        res.message ||
          (res.configured
            ? `Google Gemini AI সচল আছে (${res.model})!`
            : 'বিল্ট-ইন SEO ইঞ্জিন রেডি। কাস্টম API Key যুক্ত করে সেভ করুন।')
      );
      onShowToast(
        res.message || `Google Gemini AI Verified (${res.model})`,
        res.configured ? 'success' : 'info'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Gemini API check failed', 'error');
    } finally {
      setTestingGemini(false);
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

  const handlePurgeDemoData = async () => {
    if (!window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে সমস্ত টেস্ট/ডেমো রেকর্ড মুছে ফেলতে চান?' : 'Are you sure you want to purge all demo data?')) {
      return;
    }
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
      await updateOrderStatus(ord.id, newStatus, ord, customStart, customRemains);
      onShowToast(`Order #${ord.id} → ${newStatus.toUpperCase()}`, 'success');
      if (activeOrderDetail?.id === ord.id) {
        setActiveOrderDetail({ ...ord, status: newStatus });
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to update order status', 'error');
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleBatchUpdateOrders = async (targetStatus: SMMOrder['status']) => {
    if (selectedOrderIds.length === 0) return;
    const confirmMsg = language === 'bn' 
      ? `নির্বাচিত ${selectedOrderIds.length}টি অর্ডারের স্ট্যাটাস '${targetStatus}' এ পরিবর্তন করবেন?`
      : `Change status of ${selectedOrderIds.length} selected orders to '${targetStatus}'?`;
    if (!window.confirm(confirmMsg)) return;

    setStatusUpdating('batch');
    try {
      for (const id of selectedOrderIds) {
        const ord = orders.find(o => o.id === id);
        if (ord) {
          await updateOrderStatus(id, targetStatus, ord);
        }
      }
      onShowToast(`Batch updated ${selectedOrderIds.length} orders to ${targetStatus}!`, 'success');
      setSelectedOrderIds([]);
    } catch (err: any) {
      onShowToast(err?.message || 'Batch update encountered an issue', 'error');
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
      onShowToast(`Payment #${p.id} Approved! ৳${p.amount + (p.bonus || 0)} credited.`, 'success');
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
      setEditingService(null);
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
    if (!window.confirm(language === 'bn' ? 'সার্ভিসটি মুছে ফেলতে চান?' : 'Delete this service permanently?')) return;
    try {
      await removeService(id);
      onShowToast(`Service ${id} deleted from catalog.`, 'info');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to delete service', 'error');
    }
  };

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
      const rawText = await resp.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error('Server API route not reachable. Please check backend.');
      }
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

  const [confirmDeleteProviderId, setConfirmDeleteProviderId] = useState<string | null>(null);
  const [autoCleaningCatalog, setAutoCleaningCatalog] = useState<boolean>(false);

  const handleSaveProvider = async () => {
    if (!newProvider.apiUrl?.trim() || !newProvider.apiKey?.trim()) {
      onShowToast('API v2 URL এবং API Key আবশ্যক (API URL and Key are required)', 'error');
      return;
    }

    let derivedName = (newProvider.name || '').trim();
    if (!derivedName) {
      try {
        const u = new URL(
          newProvider.apiUrl.trim().startsWith('http')
            ? newProvider.apiUrl.trim()
            : `https://${newProvider.apiUrl.trim()}`
        );
        derivedName = u.hostname.replace(/^www\./i, '');
      } catch {
        derivedName = 'SMM Provider';
      }
    }

    try {
      const idToSave = newProvider.id || 'prv-' + Math.floor(100 + Math.random() * 900);
      const providerObj: SMMProvider = {
        id: idToSave,
        name: derivedName,
        apiUrl: newProvider.apiUrl.trim(),
        apiKey: newProvider.apiKey.trim(),
        balance: Number(newProvider.balance) || 0,
        currency: newProvider.currency || 'USD',
        profitMargin: Number(newProvider.profitMargin ?? 25),
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
      };

      await saveProvider(providerObj);
      setIsAddingProvider(false);
      setNewProviderPingResult(null);
      setSelectedCatalogProviderId(idToSave);

      const updatedProvidersList = [
        ...providers.filter(p => p.id !== idToSave),
        providerObj
      ];

      if (providerObj.status === 'active') {
        onShowToast(
          `${providerObj.name} সংযুক্ত হয়েছে! স্বয়ংক্রিয়ভাবে সব অ্যাক্টিভ সার্ভিস সিঙ্ক হচ্ছে...`,
          'info'
        );
        setSyncingProviderId(idToSave);
        try {
          const syncRes = await fullSyncProviderServicesAndStatuses(
            providerObj,
            orders,
            services,
            providerObj.customExchangeRate || siteSettings.usdToBdtRate || 122
          );
          await reconcileAndPurgeInactiveServices(updatedProvidersList);
          onShowToast(
            `${providerObj.name}: ${syncRes.importedServices}টি অ্যাক্টিভ সার্ভিস স্বয়ংক্রিয়ভাবে সিঙ্ক সম্পন্ন!`,
            'success'
          );
        } catch (syncErr: any) {
          onShowToast(syncErr?.message || 'Provider saved, auto-sync will retry in background', 'info');
        } finally {
          setSyncingProviderId(null);
        }
      } else {
        const { purgedCount } = await reconcileAndPurgeInactiveServices(updatedProvidersList);
        onShowToast(
          `${providerObj.name} নিষ্ক্রিয় (Inactive) করা হয়েছে এবং ${purgedCount}টি সার্ভিস সরানো হয়েছে।`,
          'info'
        );
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to save provider', 'error');
    }
  };

  const handleToggleProviderStatus = async (prv: SMMProvider) => {
    const nextStatus: 'active' | 'inactive' = prv.status === 'active' ? 'inactive' : 'active';
    const updatedPrv: SMMProvider = {
      ...prv,
      status: nextStatus,
      lastSyncAt: Date.now()
    };
    const updatedList = providers.map(p => (p.id === prv.id ? updatedPrv : p));
    setSyncingProviderId(prv.id);
    try {
      await saveProvider(updatedPrv);
      if (nextStatus === 'inactive') {
        const { purgedCount } = await reconcileAndPurgeInactiveServices(updatedList);
        onShowToast(
          `${prv.name} ডিঅ্যাক্টিভেট করা হয়েছে এবং এর ${purgedCount}টি সার্ভিস অটো-রিমুভ হয়েছে।`,
          'info'
        );
      } else {
        const result = await fullSyncProviderServicesAndStatuses(
          updatedPrv,
          orders,
          services,
          updatedPrv.customExchangeRate || siteSettings.usdToBdtRate || 122
        );
        await reconcileAndPurgeInactiveServices(updatedList);
        onShowToast(
          `${prv.name} অ্যাক্টিভ করা হয়েছে এবং ${result.importedServices}টি সচল সার্ভিস অটো-সিঙ্ক হয়েছে!`,
          'success'
        );
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to toggle provider status', 'error');
    } finally {
      setSyncingProviderId(null);
    }
  };

  const handleAutoCleanAndSyncAll = async () => {
    setAutoCleaningCatalog(true);
    try {
      const res = await autoSyncAllProvidersEverything(
        providers,
        orders,
        services,
        siteSettings.usdToBdtRate || 122
      );
      onShowToast(
        `অটো-সিঙ্ক সম্পন্ন! ${res.providersSynced}টি অ্যাক্টিভ প্রোভাইডার থেকে ${res.totalServicesSynced}টি সচল সার্ভিস আপডেট ও ${res.purgedInactiveServices}টি ইনঅ্যাক্টিভ সার্ভিস ক্লিন করা হয়েছে।`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Auto-sync failed', 'error');
    } finally {
      setAutoCleaningCatalog(false);
    }
  };

  const handlePingAndCheckProvider = async (prv: SMMProvider) => {
    setCheckingBalanceId(prv.id);
    try {
      const res = await pingProviderOnServer(prv);
      onShowToast(
        `${prv.name}: ${res.balance} ${res.currency} · ${res.latencyMs}ms${res.totalRemoteServices ? ` · ${res.totalRemoteServices} active services` : ''}`,
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
      await reconcileAndPurgeInactiveServices(
        providers.map(p => (p.id === prv.id ? { ...prv, status: 'active' } : p))
      );
      onShowToast(
        `${prv.name}: ${result.importedServices}টি অ্যাক্টিভ সার্ভিস ও ${result.updatedOrders + result.dispatchedOrders}টি অর্ডার সিঙ্ক সম্পন্ন!`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Provider API sync failed', 'error');
    } finally {
      setSyncingProviderId(null);
    }
  };

  const handleDeleteProviderWithServices = async (prv: SMMProvider, alsoDeleteServices: boolean = true) => {
    setSyncingProviderId(prv.id);
    try {
      const deletedServices = await removeProviderAndLinkedServices(prv.id, services, alsoDeleteServices);
      const remainingProviders = providers.filter(p => p.id !== prv.id);
      await reconcileAndPurgeInactiveServices(remainingProviders);
      setConfirmDeleteProviderId(null);
      onShowToast(
        `${prv.name} এবং এর সাথে যুক্ত ${deletedServices}টি সার্ভিস সম্পূর্ণ মুছে ফেলা হয়েছে।`,
        'info'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to remove provider', 'error');
    } finally {
      setSyncingProviderId(null);
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

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
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
  }, [orders, orderStatusFilter, orderSearch]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (paymentFilter === 'pending') return p.status === 'pending';
      return true;
    });
  }, [payments, paymentFilter]);

  // Filtered Services
  const serviceCategories = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return ['All', ...Array.from(set)];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchCat = selectedServiceCategory === 'All' || s.category === selectedServiceCategory;
      const matchSearch = !serviceSearch ||
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.category.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(serviceSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [services, selectedServiceCategory, serviceSearch]);

  // Navigation Items
  const navSections: {
    group: string;
    items: { id: AdminSection; label: string; icon: React.ElementType; badge?: number; badgeColor?: string }[];
  }[] = [
    {
      group: language === 'bn' ? 'কোর কন্ট্রোল' : 'Core Command',
      items: [
        { id: 'overview', label: language === 'bn' ? 'এক্সিকিউটিভ ওভারভিউ' : 'Executive Overview', icon: LayoutGrid },
        { id: 'finance', label: language === 'bn' ? 'ফাইন্যান্সিয়াল ইন্টেলিজেন্স' : 'Financial Intelligence', icon: TrendingUp },
      ]
    },
    {
      group: language === 'bn' ? 'অপারেশনস' : 'Operations',
      items: [
        { 
          id: 'orders', 
          label: language === 'bn' ? 'অর্ডার কন্ট্রোল' : 'Orders Control', 
          icon: Package, 
          badge: pendingOrders.length || undefined,
          badgeColor: 'bg-amber-500 text-white' 
        },
        { 
          id: 'refills', 
          label: language === 'bn' ? 'রিফিল কিউ' : 'Refill Queue', 
          icon: RefreshCw, 
          badge: pendingRefills.length || undefined,
          badgeColor: 'bg-indigo-500 text-white' 
        },
        { 
          id: 'payments', 
          label: language === 'bn' ? 'ডিপোজিট ভেরিফিকেশন' : 'Deposit Verification', 
          icon: Wallet, 
          badge: pendingDeposits.length || undefined,
          badgeColor: 'bg-emerald-500 text-white' 
        },
      ]
    },
    {
      group: language === 'bn' ? 'ক্যাটালগ ও কন্টেন্ট' : 'Catalog & Content',
      items: [
        { id: 'services', label: language === 'bn' ? 'সার্ভিস ক্যাটালগ' : 'Services Catalog', icon: Layers, badge: services.length || undefined },
        { id: 'blogs', label: language === 'bn' ? 'SEO ব্লগ ও Gemini AI' : 'SEO Blog & Gemini AI', icon: BookOpen, badge: blogs.length || undefined },
      ]
    },
    {
      group: language === 'bn' ? 'ইন্টিগ্রেশনস' : 'Integrations',
      items: [
        { id: 'providers', label: language === 'bn' ? 'API প্রোভাইডার স্টুডিও' : 'API Providers Studio', icon: Server, badge: providers.length || undefined },
      ]
    },
    {
      group: language === 'bn' ? 'অ্যাডমিনিস্ট্রেশন' : 'Administration',
      items: [
        { id: 'users', label: language === 'bn' ? 'ইউজার ও ব্যালেন্স' : 'Users & Balances', icon: Users, badge: users.length || undefined },
        { 
          id: 'tickets', 
          label: language === 'bn' ? 'সাপোর্ট হেল্পডেস্ক' : 'Support Helpdesk', 
          icon: MessageSquare, 
          badge: openTickets.length || undefined,
          badgeColor: 'bg-rose-500 text-white'
        },
        { id: 'coupons', label: language === 'bn' ? 'প্রোমো ভাউচার' : 'Promo Vouchers', icon: Gift },
        { id: 'announcements', label: language === 'bn' ? 'নোটিশ বোর্ড' : 'Announcements', icon: Megaphone },
        { id: 'settings', label: language === 'bn' ? 'সিস্টেম ও SEO সেটিংস' : 'System & SEO Settings', icon: Settings }
      ]
    }
  ];

  const getSectionTitle = (): string => {
    switch (activeSection) {
      case 'overview': return language === 'bn' ? 'এক্সিকিউটিভ ওভারভিউ' : 'Executive Overview';
      case 'finance': return language === 'bn' ? 'প্রফিট ও ফাইন্যান্সিয়াল ইন্টেলিজেন্স' : 'Financial Intelligence';
      case 'orders': return language === 'bn' ? 'অর্ডার কন্ট্রোল ও ডিসপ্যাচ' : 'Orders Control & Dispatch';
      case 'refills': return language === 'bn' ? 'রিফিল কিউ' : 'Refill Queue';
      case 'payments': return language === 'bn' ? 'ডিপোজিট ভেরিফিকেশন' : 'Deposit Verification';
      case 'services': return language === 'bn' ? 'সার্ভিস ক্যাটালগ' : 'Services Catalog';
      case 'providers': return language === 'bn' ? 'API প্রোভাইডার স্টুডিও' : 'API Providers Studio';
      case 'blogs': return language === 'bn' ? '১০০% SEO ব্লগ ও Gemini AI' : '100% SEO Blog & Gemini AI';
      case 'hub': return language === 'bn' ? 'অ্যাডমিন কন্ট্রোল হাব' : 'Admin Control Hub';
      case 'users': return language === 'bn' ? 'ইউজার ম্যানেজমেন্ট' : 'Users Management';
      case 'tickets': return language === 'bn' ? 'সাপোর্ট হেল্পডেস্ক' : 'Support Helpdesk';
      case 'coupons': return language === 'bn' ? 'প্রোমো কোড' : 'Promo Codes';
      case 'announcements': return language === 'bn' ? 'নোটিশ বোর্ড' : 'Announcements';
      case 'settings': return language === 'bn' ? 'সাইট ও সিস্টেম সেটিংস' : 'Site & System Settings';
    }
  };

  // Surface classes based on current theme
  const surfaceCard = darkMode 
    ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-md' 
    : 'bg-white border-slate-300/90 text-slate-950 shadow-sm';
  const surfaceSubtle = darkMode 
    ? 'bg-slate-950/60 border-slate-800 text-slate-300' 
    : 'bg-slate-100 border-slate-300/80 text-slate-900';
  const tableHeader = darkMode 
    ? 'bg-slate-950 text-slate-400 border-slate-800' 
    : 'bg-slate-100 text-slate-800 border-slate-300';
  const tableRowHover = darkMode 
    ? 'hover:bg-slate-800/50' 
    : 'hover:bg-slate-100/70';

  return (
    <div
      data-theme={darkMode ? 'dark' : 'light'}
      className={`user-workspace-shell min-h-screen w-full flex font-sans transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950'
      }`}
    >
      {/* =========================================================================
          DESKTOP SIDEBAR (Sleek Obsidian Navy + Modern Minimal Structure)
         ========================================================================= */}
      <aside className="admin-dark-sidebar hidden lg:flex flex-col w-68 shrink-0 fixed inset-y-0 left-0 z-40 bg-slate-900 border-r border-slate-800 text-slate-200 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <div
            onClick={() => navigateSection('overview')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src={BRAND_LOGO_URL}
              alt="Boostlagbe Admin"
              width={34}
              height={34}
              className="w-8.5 h-8.5 rounded-xl object-contain bg-slate-950 border border-slate-700/60 p-0.5 shadow-sm group-hover:border-indigo-500 transition-colors"
            />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white tracking-tight leading-none group-hover:text-indigo-400 transition-colors">
                Boostlagbe Admin
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  {serverHealth ? `Node ${serverHealth.nodeVersion}` : 'Live Engine'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 no-scrollbar">
          {navSections.map((group) => (
            <div key={group.group} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {group.group}
              </p>
              <div className="space-y-0.5 mt-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateSection(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            active ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Exit Control */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {onExitAdmin && (
            <button
              type="button"
              onClick={onExitAdmin}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700/50"
            >
              <LogOut className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'bn' ? 'ইউজার প্যানেলে ফিরুন' : 'Return to User Panel'}</span>
            </button>
          )}
        </div>
      </aside>

      {/* =========================================================================
          MAIN COLUMN
         ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-68">
        {/* Sticky Floating Header */}
        <header className={`sticky top-0 z-30 w-full backdrop-blur-xl border-b transition-colors duration-200 ${
          darkMode 
            ? 'bg-slate-950/85 border-slate-800/80 text-slate-100' 
            : 'bg-white/85 border-slate-200 text-slate-900'
        }`}>
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
            {/* Left: Mobile Title or Identity + Back Navigation */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Native Mobile Back button if inside submodules */}
              {activeSection !== 'overview' && activeSection !== 'hub' ? (
                <button
                  type="button"
                  onClick={() => navigateSection(
                    ['finance', 'blogs', 'providers', 'users', 'tickets', 'refills', 'coupons', 'announcements', 'settings'].includes(activeSection)
                      ? 'hub'
                      : 'overview'
                  )}
                  className="lg:hidden w-8.5 h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs active:scale-90 transition-transform shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div
                  onClick={() => navigateSection('overview')}
                  className="lg:hidden w-8.5 h-8.5 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm cursor-pointer shrink-0"
                >
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                    {getSectionTitle()}
                  </h1>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse hidden xs:inline-block" />
                </div>
                <p className="text-[10px] font-mono text-slate-400 truncate hidden sm:block">
                  AmarTrend Command · {serverHealth ? `Uptime ${Math.floor(serverHealth.uptimeSeconds / 60)}m` : 'Live Connected'}
                </p>
              </div>
            </div>

            {/* Right: Operational Tooling */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Live Order Sync Button */}
              <button
                type="button"
                onClick={handleSyncAllOrders}
                disabled={syncingOrders}
                title="Sync orders with upstream provider APIs"
                className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingOrders ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{language === 'bn' ? 'অর্ডার সিঙ্ক' : 'Sync Orders'}</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors active:scale-95 ${
                  darkMode 
                    ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Language Switch */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className={`w-9 h-9 rounded-xl border font-bold text-xs flex items-center justify-center transition-colors active:scale-95 ${
                  darkMode 
                    ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' 
                    : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {language === 'bn' ? 'বাং' : 'EN'}
              </button>

              {/* Exit to User Panel */}
              {onExitAdmin && (
                <button
                  type="button"
                  onClick={onExitAdmin}
                  className={`h-9 px-3 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95 ${
                    darkMode 
                      ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' 
                      : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                  }`}
                  title={language === 'bn' ? 'ইউজার প্যানেলে যান' : 'Switch to User App'}
                >
                  <LogOut className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'ইউজার অ্যাপ' : 'User App'}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* =====================================================================
            VIEWPORT BODY CONTAINER
           ===================================================================== */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-5 pb-[max(110px,calc(env(safe-area-inset-bottom)+96px))] lg:pb-12 overflow-x-hidden">
          {/* ===================================================================
              SECTION 1: OVERVIEW (EXECUTIVE COMMAND CENTER)
             =================================================================== */}
          {activeSection === 'overview' && (
            <div className="space-y-5 animate-in fade-in-0 duration-200">
              {/* Executive Top KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* KPI 1: Gross Revenue */}
                <div className={`p-4.5 rounded-2xl border transition-all ${surfaceCard}`}>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">{language === 'bn' ? 'মোট সংগৃহীত রেভিনিউ' : 'Total Revenue'}</span>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-black tracking-tight font-mono">
                      ৳{totalRevenue.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {orders.filter(o => o.status === 'completed').length} {language === 'bn' ? 'সম্পন্ন' : 'done'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {orders.length} {language === 'bn' ? 'টি মোট অর্ডার প্রসেসড' : 'total orders processed'}
                  </p>
                </div>

                {/* KPI 2: Estimated Net Profit */}
                <div className={`p-4.5 rounded-2xl border transition-all ${surfaceCard}`}>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">{language === 'bn' ? 'আনুমানিক নেট প্রফিট' : 'Estimated Net Profit'}</span>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-black tracking-tight font-mono text-indigo-600 dark:text-indigo-400">
                      ৳{Math.round(totalEstimatedNetProfit).toLocaleString()}
                    </span>
                    <span className="text-xs font-mono font-medium text-indigo-500">
                      {totalRevenue > 0 ? `${Math.round((totalEstimatedNetProfit / totalRevenue) * 100)}%` : '0%'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {language === 'bn' ? 'প্রোভাইডার খরচ বাদ দিয়ে' : 'After provider operational costs'}
                  </p>
                </div>

                {/* KPI 3: Active Orders Queue */}
                <div 
                  onClick={() => { setOrderStatusFilter('active'); navigateSection('orders'); }}
                  className={`p-4.5 rounded-2xl border cursor-pointer hover:border-amber-500/50 transition-all ${surfaceCard}`}
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">{language === 'bn' ? 'অ্যাক্টিভ অর্ডার কিউ' : 'Active Orders Queue'}</span>
                    <Package className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-black tracking-tight font-mono text-amber-600 dark:text-amber-400">
                      {pendingOrders.length}
                    </span>
                    <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5">
                      {language === 'bn' ? 'পর্যালোচনা' : 'Review'} <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {orders.filter(o => o.status === 'pending').length} pending · {orders.filter(o => o.status === 'in_progress').length} in progress
                  </p>
                </div>

                {/* KPI 4: Pending Deposits Verification */}
                <div 
                  onClick={() => navigateSection('payments')}
                  className={`p-4.5 rounded-2xl border cursor-pointer hover:border-emerald-500/50 transition-all ${surfaceCard}`}
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">{language === 'bn' ? 'ডিপোজিট রিকোয়েস্ট' : 'Pending Deposits'}</span>
                    <Wallet className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-black tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
                      {pendingDeposits.length}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-0.5">
                      {language === 'bn' ? 'ভেরিফাই' : 'Verify'} <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    ৳{pendingDeposits.reduce((acc, p) => acc + p.amount, 0).toLocaleString()} {language === 'bn' ? 'অপেক্ষমান' : 'awaiting approval'}
                  </p>
                </div>
              </div>

              {/* Urgent Action Banners (If any item needs attention) */}
              {(pendingDeposits.length > 0 || openTickets.length > 0 || pendingRefills.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {pendingDeposits.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold truncate">
                          {pendingDeposits.length} {language === 'bn' ? 'টি নতুন ডিপোজিট ভেরিফিকেশন বাকি' : 'deposits awaiting review'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateSection('payments')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 shadow-xs"
                      >
                        {language === 'bn' ? 'অনুমোদন করুন' : 'Review'}
                      </button>
                    </div>
                  )}

                  {openTickets.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-3 text-rose-900 dark:text-rose-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MessageSquare className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="text-xs font-bold truncate">
                          {openTickets.length} {language === 'bn' ? 'টি ওপেন সাপোর্ট টিকেট' : 'open support tickets'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateSection('tickets')}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shrink-0 shadow-xs"
                      >
                        {language === 'bn' ? 'রিপ্লাই দিন' : 'Reply'}
                      </button>
                    </div>
                  )}

                  {pendingRefills.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3 text-indigo-900 dark:text-indigo-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-xs font-bold truncate">
                          {pendingRefills.length} {language === 'bn' ? 'টি রিফিল রিকোয়েস্ট' : 'refill requests in queue'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateSection('refills')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shrink-0 shadow-xs"
                      >
                        {language === 'bn' ? 'প্রসেস করুন' : 'Process'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Operation Command Hub */}
              <div className={`p-5 rounded-2xl border ${surfaceCard} space-y-4`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold tracking-tight">
                      {language === 'bn' ? 'কুইক অ্যাকশন কন্ট্রোল ও সার্ভিস ইঞ্জিন' : 'Quick Actions & Platform Engine'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{providers.length} {language === 'bn' ? 'টি কানেক্টেড API' : 'Active Providers'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setIsAddingService(true); navigateSection('services'); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:border-indigo-500 ${surfaceSubtle}`}
                  >
                    <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-semibold">{language === 'bn' ? 'নতুন সার্ভিস' : 'Add Service'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsAddingProvider(true); navigateSection('providers'); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:border-indigo-500 ${surfaceSubtle}`}
                  >
                    <Server className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span className="text-xs font-semibold">{language === 'bn' ? 'API কানেক্ট' : 'Add Provider'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setApiSubTab('importer'); navigateSection('providers'); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:border-indigo-500 ${surfaceSubtle}`}
                  >
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold">{language === 'bn' ? 'ক্যাটালগ ইমপোর্ট' : 'API Importer'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleSyncAllOrders(); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:border-indigo-500 ${surfaceSubtle}`}
                  >
                    <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold">{language === 'bn' ? 'লাইভ সিঙ্ক' : 'Sync All'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateSection('blogs')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:border-indigo-500 ${surfaceSubtle}`}
                  >
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-semibold">{language === 'bn' ? 'AI SEO ব্লগ' : 'AI Blog CMS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateSection('settings')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:border-indigo-500 ${surfaceSubtle}`}
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold">{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
                  </button>
                </div>
              </div>

              {/* Dual Column: Recent Orders + Recent Deposits */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Orders Stream */}
                <div className={`p-4.5 rounded-2xl border ${surfaceCard} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">{language === 'bn' ? 'সাম্প্রতিক অর্ডার' : 'Recent Orders'}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateSection('orders')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                      {language === 'bn' ? 'সব দেখুন' : 'View All'} ({orders.length}) <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {orders.slice(0, 5).map(o => (
                      <div key={o.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-500">#{o.id}</span>
                            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{o.serviceName}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                            {o.userEmail} · Qty: {o.quantity.toLocaleString()} · ৳{o.charge}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                          o.status === 'completed' 
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : o.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : o.status === 'in_progress' || o.status === 'processing'
                            ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {o.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <p className="py-6 text-center text-xs text-slate-400">{language === 'bn' ? 'কোনো অর্ডার নেই' : 'No orders yet'}</p>
                    )}
                  </div>
                </div>

                {/* Recent Deposit Requests Stream */}
                <div className={`p-4.5 rounded-2xl border ${surfaceCard} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">{language === 'bn' ? 'সাম্প্রতিক ডিপোজিট স্লিপ' : 'Recent Deposits'}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateSection('payments')}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                    >
                      {language === 'bn' ? 'সব দেখুন' : 'View All'} ({payments.length}) <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {payments.slice(0, 5).map(p => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">৳{p.amount.toLocaleString()}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {p.gateway || p.zinipayMethod || 'Deposit'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                            {p.senderNumber || p.userEmail} · Trx: {p.transactionId || 'N/A'}
                          </p>
                        </div>

                        {p.status === 'pending' ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleApprovePayment(p)}
                              disabled={paymentProcessing === p.id}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs disabled:opacity-50"
                            >
                              {language === 'bn' ? 'অনুমোদন' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPayment(p)}
                              disabled={paymentProcessing === p.id}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shadow-xs disabled:opacity-50"
                            >
                              {language === 'bn' ? 'বাতিল' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                            p.status === 'approved' 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            {p.status}
                          </span>
                        )}
                      </div>
                    ))}
                    {payments.length === 0 && (
                      <p className="py-6 text-center text-xs text-slate-400">{language === 'bn' ? 'কোনো পেমেন্ট স্লিপ নেই' : 'No deposits yet'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              SECTION 2: FINANCIAL INTELLIGENCE VIEW
             =================================================================== */}
          {activeSection === 'finance' && (
            <div className="animate-in fade-in-0 duration-200">
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
            </div>
          )}

          {/* ===================================================================
              SECTION 3: ORDERS CONTROL & DISPATCH
             =================================================================== */}
          {activeSection === 'orders' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              {/* Filter Tabs Bar */}
              <div className={`p-2.5 rounded-2xl border ${surfaceCard} flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3`}>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                  {[
                    { id: 'all', label: language === 'bn' ? 'সকল' : 'All', count: orders.length },
                    { id: 'active', label: language === 'bn' ? 'অ্যাক্টিভ' : 'Active', count: pendingOrders.length },
                    { id: 'pending', label: language === 'bn' ? 'পেন্ডিং' : 'Pending', count: orders.filter(o => o.status === 'pending').length },
                    { id: 'processing', label: language === 'bn' ? 'প্রসেসিং' : 'Processing', count: orders.filter(o => o.status === 'processing').length },
                    { id: 'in_progress', label: language === 'bn' ? 'চলমান' : 'In Progress', count: orders.filter(o => o.status === 'in_progress').length },
                    { id: 'completed', label: language === 'bn' ? 'সম্পন্ন' : 'Completed', count: orders.filter(o => o.status === 'completed').length },
                    { id: 'partial', label: language === 'bn' ? 'আংশিক' : 'Partial', count: orders.filter(o => o.status === 'partial').length },
                    { id: 'canceled', label: language === 'bn' ? 'বাতিল' : 'Canceled', count: orders.filter(o => o.status === 'canceled').length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOrderStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        orderStatusFilter === tab.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        orderStatusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    placeholder={language === 'bn' ? 'অর্ডার ID, ইমেইল বা লিংক খুঁজুন...' : 'Search by ID, email, link...'}
                    className={`w-full h-9 pl-9 pr-3 rounded-xl text-xs font-medium border focus:outline-none focus:border-indigo-600 transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  {orderSearch && (
                    <button
                      type="button"
                      onClick={() => setOrderSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Batch Actions Bar (when checkboxes selected) */}
              {selectedOrderIds.length > 0 && (
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
                  <div className="flex items-center gap-2 font-bold">
                    <span>{selectedOrderIds.length} {language === 'bn' ? 'টি অর্ডার নির্বাচিত' : 'orders selected'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBatchUpdateOrders('completed')}
                      disabled={statusUpdating === 'batch'}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      {language === 'bn' ? 'Mark Completed' : 'Mark Completed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBatchUpdateOrders('canceled')}
                      disabled={statusUpdating === 'batch'}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    >
                      {language === 'bn' ? 'Cancel & Refund' : 'Cancel & Refund'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderIds([])}
                      className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {language === 'bn' ? 'ক্লিয়ার' : 'Deselect'}
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile Native Card Feed (< md) */}
              <div className="block md:hidden space-y-3">
                {filteredOrders.map(o => {
                  const isSelected = selectedOrderIds.includes(o.id);
                  const srv = services.find(s => s.id === o.serviceId);
                  const prv = providers.find(p => p.id === (o.providerId || srv?.providerId));

                  return (
                    <div 
                      key={o.id}
                      className={`p-4 rounded-2xl border transition-all ${surfaceCard} ${
                        isSelected ? 'ring-2 ring-indigo-500/80 bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Top bar: ID, checkbox, date & status */}
                      <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedOrderIds(prev => [...prev, o.id]);
                              else setSelectedOrderIds(prev => prev.filter(id => id !== o.id));
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            #{o.id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateOrderStatus(o, e.target.value as SMMOrder['status'])}
                          disabled={statusUpdating === o.id}
                          className={`text-[11px] font-bold rounded-lg border px-2 py-0.5 focus:outline-none ${
                            o.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : o.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : o.status === 'in_progress' || o.status === 'processing'
                              ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                              : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="partial">Partial</option>
                          <option value="canceled">Canceled</option>
                        </select>
                      </div>

                      {/* Service Details & User */}
                      <div className="py-2.5 space-y-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                          {o.serviceName}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="truncate max-w-[200px]" title={o.userEmail}>{o.userEmail}</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Qty: {o.quantity.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Target Link */}
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                        <a
                          href={o.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[220px]"
                        >
                          {o.link}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(o.link);
                            onShowToast('Link copied to clipboard!', 'info');
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600"
                          title="Copy Link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Bottom Bar: Amount, Provider Routing & Action */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'চার্জ' : 'Charge'}</span>
                          <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                            ৳{o.charge}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {o.providerOrderId ? (
                            <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                              {prv?.name || 'Upstream'} #{o.providerOrderId}
                            </span>
                          ) : srv?.providerId ? (
                            <button
                              type="button"
                              onClick={() => handleManualOrderDispatch(o)}
                              disabled={dispatchingOrderId === o.id}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-xs flex items-center gap-1"
                            >
                              <Send className="w-2.5 h-2.5" />
                              <span>{dispatchingOrderId === o.id ? 'Dispatching...' : 'Dispatch API'}</span>
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => setActiveOrderDetail(o)}
                            className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold hover:border-indigo-500"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <div className={`p-8 text-center rounded-2xl border ${surfaceCard} text-slate-400 text-xs`}>
                    {language === 'bn' ? 'কোনো অর্ডার পাওয়া যায়নি' : 'No orders matched your filters'}
                  </div>
                )}
              </div>

              {/* Desktop Orders Data Table */}
              <div className={`hidden md:block rounded-2xl border overflow-hidden ${surfaceCard}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b font-mono font-bold uppercase text-[11px] ${tableHeader}`}>
                        <th className="py-3 px-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(filteredOrders.map(o => o.id));
                              } else {
                                setSelectedOrderIds([]);
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="py-3 px-3">Order ID</th>
                        <th className="py-3 px-3">User</th>
                        <th className="py-3 px-3">Service & Link</th>
                        <th className="py-3 px-3 text-right">Quantity</th>
                        <th className="py-3 px-3 text-right">Charge</th>
                        <th className="py-3 px-3">API Routing</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredOrders.map(o => {
                        const isSelected = selectedOrderIds.includes(o.id);
                        const srv = services.find(s => s.id === o.serviceId);
                        const prv = providers.find(p => p.id === (o.providerId || srv?.providerId));

                        return (
                          <tr key={o.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : tableRowHover}`}>
                            <td className="py-3 px-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds(prev => [...prev, o.id]);
                                  } else {
                                    setSelectedOrderIds(prev => prev.filter(id => id !== o.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-500">
                              #{o.id}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[140px]" title={o.userEmail}>
                                {o.userEmail}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(o.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]" title={o.serviceName}>
                                {o.serviceName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <a
                                  href={o.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[180px] font-mono flex items-center gap-1"
                                >
                                  {o.link} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                </a>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold">
                              {o.quantity.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              ৳{o.charge}
                            </td>
                            <td className="py-3 px-3">
                              {o.providerOrderId ? (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold block w-fit">
                                    {prv?.name || 'Upstream'} #{o.providerOrderId}
                                  </span>
                                </div>
                              ) : srv?.providerId ? (
                                <button
                                  type="button"
                                  onClick={() => handleManualOrderDispatch(o)}
                                  disabled={dispatchingOrderId === o.id}
                                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-xs flex items-center gap-1"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>{dispatchingOrderId === o.id ? 'Dispatching...' : 'Dispatch API'}</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">{language === 'bn' ? 'ম্যানুয়াল' : 'Manual'}</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={o.status}
                                onChange={(e) => handleUpdateOrderStatus(o, e.target.value as SMMOrder['status'])}
                                disabled={statusUpdating === o.id}
                                className={`text-[11px] font-bold rounded-lg border px-2 py-1 focus:outline-none focus:ring-1 ${
                                  o.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                    : o.status === 'pending'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                    : o.status === 'in_progress' || o.status === 'processing'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="partial">Partial</option>
                                <option value="canceled">Canceled</option>
                              </select>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setActiveOrderDetail(o)}
                                className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold hover:border-indigo-500 transition-colors"
                              >
                                {language === 'bn' ? 'বিস্তারিত' : 'Details'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            {language === 'bn' ? 'কোনো অর্ডার পাওয়া যায়নি' : 'No orders matched your filters'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              SECTION 4: REFILLS QUEUE
             =================================================================== */}
          {activeSection === 'refills' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className={`p-4 rounded-2xl border ${surfaceCard} flex items-center justify-between`}>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">{language === 'bn' ? 'রিফিল রিকোয়েস্ট কিউ' : 'Refill Queue Manager'}</h3>
                  <p className="text-xs text-slate-400">{refills.length} {language === 'bn' ? 'টি রিফিল হিস্ট্রি' : 'refill requests logged'}</p>
                </div>
                <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                  {pendingRefills.length} {language === 'bn' ? 'পেন্ডিং' : 'Pending'}
                </span>
              </div>

              {/* Mobile Native Card Feed (< md) */}
              <div className="block md:hidden space-y-3">
                {refills.map(r => {
                  const ord = orders.find(o => o.id === r.orderId);
                  return (
                    <div key={r.id} className={`p-4 rounded-2xl border ${surfaceCard} space-y-2.5`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">Refill #{r.id}</span>
                          <span className="font-mono text-xs text-slate-400">Order #{r.orderId}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                          r.status === 'completed' 
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : r.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {r.status}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {ord?.serviceName || 'SMM Service'}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate max-w-[200px]">{r.userEmail}</span>
                        <span className="font-mono">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>

                      {r.status === 'pending' && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleForwardRefillToApi(r)}
                            disabled={forwardingRefillId === r.id}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                          >
                            {forwardingRefillId === r.id ? 'Forwarding...' : 'Forward API'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRefillStatus(r.id, 'completed')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRefillStatus(r.id, 'rejected')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {refills.length === 0 && (
                  <div className={`p-8 text-center rounded-2xl border ${surfaceCard} text-slate-400 text-xs`}>
                    {language === 'bn' ? 'কোনো রিফিল রিকোয়েস্ট নেই' : 'No refill requests logged'}
                  </div>
                )}
              </div>

              {/* Desktop Refills Table */}
              <div className={`hidden md:block rounded-2xl border overflow-hidden ${surfaceCard}`}>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b font-mono font-bold uppercase text-[11px] ${tableHeader}`}>
                      <th className="py-3 px-4">Refill ID</th>
                      <th className="py-3 px-3">Order ID</th>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Service</th>
                      <th className="py-3 px-3">Requested Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {refills.map(r => {
                      const ord = orders.find(o => o.id === r.orderId);
                      return (
                        <tr key={r.id} className={tableRowHover}>
                          <td className="py-3 px-4 font-mono font-bold text-slate-500">#{r.id}</td>
                          <td className="py-3 px-3 font-mono font-semibold">#{r.orderId}</td>
                          <td className="py-3 px-3 font-medium">{r.userEmail}</td>
                          <td className="py-3 px-3 font-semibold truncate max-w-[200px]">{ord?.serviceName || 'SMM Service'}</td>
                          <td className="py-3 px-3 text-slate-400 font-mono">{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                              r.status === 'completed' 
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : r.status === 'pending'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            {r.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleForwardRefillToApi(r)}
                                  disabled={forwardingRefillId === r.id}
                                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px]"
                                >
                                  {forwardingRefillId === r.id ? 'Forwarding...' : 'Forward API'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRefillStatus(r.id, 'completed')}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                                >
                                  Mark Done
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRefillStatus(r.id, 'rejected')}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px]"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {refills.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          {language === 'bn' ? 'কোনো রিফিল রিকোয়েস্ট নেই' : 'No refill requests logged'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================================
              SECTION 5: PAYMENTS & DEPOSITS VERIFICATION
             =================================================================== */}
          {activeSection === 'payments' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              {/* Payment Sub-Navigation */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentTab('manual')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      paymentTab === 'manual' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : `${surfaceSubtle} hover:border-indigo-500`
                    }`}
                  >
                    {language === 'bn' ? 'ম্যানুয়াল bKash / Nagad / Rocket' : 'Manual bKash / Nagad / Rocket'} ({payments.filter(p => (p.gateway || p.zinipayMethod) !== 'ZiniPay').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentTab('zinipay')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      paymentTab === 'zinipay' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : `${surfaceSubtle} hover:border-indigo-500`
                    }`}
                  >
                    {language === 'bn' ? 'স্বয়ংক্রিয় ZiniPay গেটওয়ে লগ' : 'Automated ZiniPay Webhooks'} ({ziniLogs.length})
                  </button>
                </div>

                {paymentTab === 'manual' && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('pending')}
                      className={`px-2.5 py-1 rounded-lg border text-xs ${
                        paymentFilter === 'pending' ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-300 text-slate-500'
                      }`}
                    >
                      {language === 'bn' ? 'পেন্ডিং' : 'Pending Only'} ({pendingDeposits.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('all')}
                      className={`px-2.5 py-1 rounded-lg border text-xs ${
                        paymentFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-500'
                      }`}
                    >
                      {language === 'bn' ? 'সকল' : 'All'} ({payments.length})
                    </button>
                  </div>
                )}
              </div>

              {/* TAB 1: MANUAL DEPOSITS VIEW */}
              {paymentTab === 'manual' && (
                <>
                  {/* Mobile Native Card Feed (< md) */}
                  <div className="block md:hidden space-y-3">
                    {filteredPayments.map(p => {
                      const gw = (p.gateway || p.zinipayMethod || 'bKash').toLowerCase();
                      return (
                        <div key={p.id} className={`p-4 rounded-2xl border ${surfaceCard} space-y-3`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                gw.includes('bkash') ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300' :
                                gw.includes('nagad') ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' :
                                'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              }`}>
                                {p.gateway || p.zinipayMethod || 'Manual'}
                              </span>
                              <span className="font-mono font-bold text-xs text-slate-400">#{p.id}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                              p.status === 'approved' 
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : p.status === 'pending'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 animate-pulse'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            }`}>
                              {p.status}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'ডিপোজিট পরিমাণ' : 'Deposit Amount'}</span>
                              <span className="font-mono font-black text-xl text-slate-900 dark:text-slate-100">
                                ৳{p.amount.toLocaleString()}
                              </span>
                              {p.bonus ? <span className="text-[10px] text-emerald-500 font-semibold block">+৳{p.bonus} bonus</span> : null}
                            </div>
                            <div className="text-right text-[11px] text-slate-400 font-mono">
                              <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                              <div className="text-[10px]">{new Date(p.createdAt).toLocaleTimeString()}</div>
                            </div>
                          </div>

                          {/* TrxID box with 1-tap copy */}
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">Transaction ID (TrxID)</span>
                              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 truncate block">
                                {p.transactionId || 'N/A'}
                              </span>
                            </div>
                            {p.transactionId && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(p.transactionId);
                                  onShowToast('TrxID copied!', 'info');
                                }}
                                className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Sender Phone:</span>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{p.senderNumber || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Customer:</span>
                              <span className="truncate max-w-[180px]">{p.userEmail}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {p.status === 'pending' && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(p)}
                                disabled={paymentProcessing === p.id}
                                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{language === 'bn' ? 'অনুমোদন' : 'Approve'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectPayment(p)}
                                disabled={paymentProcessing === p.id}
                                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>{language === 'bn' ? 'বাতিল' : 'Reject'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredPayments.length === 0 && (
                      <div className={`p-8 text-center rounded-2xl border ${surfaceCard} text-slate-400 text-xs`}>
                        {language === 'bn' ? 'কোনো ডিপোজিট রিকোয়েস্ট নেই' : 'No deposits found'}
                      </div>
                    )}
                  </div>

                  {/* Desktop Table */}
                  <div className={`hidden md:block rounded-2xl border overflow-hidden ${surfaceCard}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b font-mono font-bold uppercase text-[11px] ${tableHeader}`}>
                          <th className="py-3 px-4">Payment ID</th>
                          <th className="py-3 px-3">Gateway</th>
                          <th className="py-3 px-3">Sender Phone</th>
                          <th className="py-3 px-3">Transaction ID (TrxID)</th>
                          <th className="py-3 px-3">Customer Email</th>
                          <th className="py-3 px-3 text-right">Amount</th>
                          <th className="py-3 px-3">Time</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-4 text-right">Verification Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredPayments.map(p => {
                          const gw = (p.gateway || p.zinipayMethod || 'bKash').toLowerCase();
                          return (
                          <tr key={p.id} className={tableRowHover}>
                            <td className="py-3 px-4 font-mono font-bold text-slate-500">#{p.id}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                gw.includes('bkash') ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300' :
                                gw.includes('nagad') ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' :
                                'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              }`}>
                                {p.gateway || p.zinipayMethod || 'Manual'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {p.senderNumber || 'N/A'}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                  {p.transactionId || 'N/A'}
                                </span>
                                {p.transactionId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(p.transactionId);
                                      onShowToast('TrxID copied to clipboard!', 'info');
                                    }}
                                    className="text-slate-400 hover:text-indigo-600"
                                    title="Copy TrxID"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">{p.userEmail}</td>
                            <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                              ৳{p.amount.toLocaleString()}
                              {p.bonus ? <span className="text-[10px] text-emerald-500 block">+৳{p.bonus} bonus</span> : null}
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                                p.status === 'approved' 
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : p.status === 'pending'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {p.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleApprovePayment(p)}
                                    disabled={paymentProcessing === p.id}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                                  >
                                    {language === 'bn' ? 'অনুমোদন করুন' : 'Approve'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectPayment(p)}
                                    disabled={paymentProcessing === p.id}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                                  >
                                    {language === 'bn' ? 'বাতিল' : 'Reject'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">{p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString() : 'Completed'}</span>
                              )}
                            </td>
                          </tr>
                        );
                        })}
                        {filteredPayments.length === 0 && (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              {language === 'bn' ? 'কোনো পেমেন্ট রেকর্ড নেই' : 'No deposit requests found'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
              )}

              {/* TAB 2: ZINIPAY AUTOMATED LOGS & QUERY */}
              {paymentTab === 'zinipay' && (
                <div className="space-y-4">
                  <div className={`p-4.5 rounded-2xl border ${surfaceCard} flex flex-col md:flex-row items-center justify-between gap-4`}>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {language === 'bn' ? 'ZiniPay অটোমেটেড ভেরিফিকেশন ও ডায়াগনস্টিক' : 'ZiniPay Automated Diagnostics'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {language === 'bn' ? 'ZiniPay গেটওয়ে নোড চেক এবং ম্যানুয়াল ইনভয়েস ভেরিফাই করুন' : 'Query automated invoice statuses and verify connectivity'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestZiniPayConnection}
                        disabled={testingZiniPay}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingZiniPay ? 'animate-spin' : ''}`} />
                        <span>{testingZiniPay ? 'Pinging Nodes...' : 'Test Gateway Connection'}</span>
                      </button>
                    </div>
                  </div>

                  {/* ZiniPay Logs Table */}
                  <div className={`rounded-2xl border overflow-hidden ${surfaceCard}`}>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b font-mono font-bold uppercase text-[11px] ${tableHeader}`}>
                          <th className="py-3 px-4">Event Time</th>
                          <th className="py-3 px-3">Invoice ID</th>
                          <th className="py-3 px-3">TrxID / Summary</th>
                          <th className="py-3 px-3 text-right">Amount</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-4 text-right">Diagnostic Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                        {ziniLogs.map((lg, idx) => (
                          <tr key={idx} className={tableRowHover}>
                            <td className="py-3 px-4 text-slate-400">{new Date(lg.timestamp).toLocaleTimeString()}</td>
                            <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">#{lg.invoiceId || 'N/A'}</td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{lg.transactionId || lg.summary || 'Webhook Ping'}</td>
                            <td className="py-3 px-3 text-right font-black">{lg.amount ? `৳${lg.amount}` : '-'}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                lg.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {lg.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                              Verified
                            </td>
                          </tr>
                        ))}
                        {ziniLogs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400 font-sans">
                              {language === 'bn' ? 'কোনো ZiniPay ট্রানজেকশন লগ নেই' : 'No ZiniPay webhook events logged yet'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================
              SECTION 6: SERVICES CATALOG
             =================================================================== */}
          {activeSection === 'services' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              {/* 100% Autonomous Active-Only Sync Status Banner */}
              <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${surfaceCard}`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {language === 'bn'
                        ? '১০০% অটোমেটেড অ্যাক্টিভ সার্ভিস ইঞ্জিন সচল'
                        : '100% Automated Active Provider Service Engine'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 block sm:inline sm:ml-2">
                      {language === 'bn'
                        ? `শুধুমাত্র সচল (${providers.filter(p => p.status === 'active').length}টি) API প্রোভাইডারের ${services.length}টি অ্যাক্টিভ সার্ভিস প্রদর্শিত হচ্ছে`
                        : `Showing ${services.length} active services from ${providers.filter(p => p.status === 'active').length} active API providers`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoCleanAndSyncAll}
                  disabled={autoCleaningCatalog}
                  className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${autoCleaningCatalog ? 'animate-spin' : ''}`} />
                  <span>
                    {autoCleaningCatalog
                      ? language === 'bn' ? 'অটো-সিঙ্ক হচ্ছে...' : 'Syncing...'
                      : language === 'bn' ? 'অটো-ক্লিন ও ফুল সিঙ্ক' : 'Auto-Clean & Sync All'}
                  </span>
                </button>
              </div>

              {/* Toolbar */}
              <div className={`p-4 rounded-2xl border ${surfaceCard} flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3`}>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                  {serviceCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedServiceCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedServiceCategory === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : `${surfaceSubtle} hover:border-indigo-500`
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                      placeholder={language === 'bn' ? 'সার্ভিস খুঁজুন...' : 'Search services...'}
                      className={`w-full h-9 pl-9 pr-3 rounded-xl text-xs font-medium border focus:outline-none focus:border-indigo-600 transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingService(true)}
                    className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'bn' ? 'নতুন সার্ভিস' : 'Add Service'}</span>
                  </button>
                </div>
              </div>

              {/* Mobile Native Card Feed (< md) */}
              <div className="block md:hidden space-y-3">
                {filteredServices.map(s => {
                  const prv = providers.find(p => p.id === s.providerId);
                  return (
                    <div key={s.id} className={`p-4 rounded-2xl border ${surfaceCard} space-y-2.5`}>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {s.category}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-400">#{s.id}</span>
                      </div>

                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Avg: {s.averageTime || '30 mins'} {s.refill ? '· Refill Active' : ''}
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between py-1.5 border-y border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'রেট / ১,০০০' : 'Rate / 1k'}</span>
                          <span className="font-mono font-black text-base text-indigo-600 dark:text-indigo-400">
                            ৳{s.rate}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'অর্ডার লিমিট' : 'Limits'}</span>
                          <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {s.min.toLocaleString()} - {s.max.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {prv ? `Linked: ${prv.name}` : 'Manual Fulfillment'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setEditingService(s); setIsAddingService(false); }}
                            className="p-1.5 rounded-lg border hover:border-indigo-500 text-slate-600 dark:text-slate-300"
                            title="Edit Service"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(s.id)}
                            className="p-1.5 rounded-lg border hover:border-rose-500 text-rose-500"
                            title="Delete Service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredServices.length === 0 && (
                  <div className={`p-8 text-center rounded-2xl border ${surfaceCard} text-slate-400 text-xs`}>
                    {language === 'bn' ? 'কোনো সার্ভিস পাওয়া যায়নি' : 'No services found in this category'}
                  </div>
                )}
              </div>

              {/* Desktop Services Table */}
              <div className={`hidden md:block rounded-2xl border overflow-hidden ${surfaceCard}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b font-mono font-bold uppercase text-[11px] ${tableHeader}`}>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-3">Service Name</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Selling Rate / 1k</th>
                        <th className="py-3 px-3 text-right">Min / Max</th>
                        <th className="py-3 px-3">Linked Provider</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredServices.map(s => {
                        const prv = providers.find(p => p.id === s.providerId);
                        return (
                          <tr key={s.id} className={tableRowHover}>
                            <td className="py-3 px-4 font-mono font-bold text-slate-500">#{s.id}</td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[280px]" title={s.name}>
                                {s.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Avg: {s.averageTime || '30 mins'} {s.refill ? '· Refill Active' : ''}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {s.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                              ৳{s.rate}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500">
                              {s.min.toLocaleString()} - {s.max.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-mono">
                              {prv ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                                  {prv.name} (#{s.providerServiceId || 'Auto'})
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Direct / Manual</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                s.status === 'active' 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => setEditingService(s)}
                                className="p-1.5 rounded-lg border hover:border-indigo-500 text-slate-500 hover:text-indigo-600 transition-colors"
                                title="Edit Service"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteService(s.id)}
                                className="p-1.5 rounded-lg border hover:border-rose-500 text-slate-500 hover:text-rose-600 transition-colors"
                                title="Delete Service"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredServices.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            {language === 'bn' ? 'কোনো সার্ভিস পাওয়া যায়নি' : 'No services found in this category'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              SECTION 7: API PROVIDERS STUDIO (5 SUB-MODULES)
             =================================================================== */}
          {activeSection === 'providers' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              {/* 5 Sub-Tabs Navigation */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'providers' as AdminApiSubTab, label: language === 'bn' ? 'কানেক্টেড প্রোভাইডার' : 'Connected Providers', icon: Server },
                  { id: 'importer' as AdminApiSubTab, label: language === 'bn' ? 'রিমোট ক্যাটালগ ইমপোর্টার' : 'Catalog Importer', icon: Database },
                  { id: 'router' as AdminApiSubTab, label: language === 'bn' ? 'স্মার্ট অর্ডার রাউটার' : 'Order Router', icon: Send },
                  { id: 'pricing' as AdminApiSubTab, label: language === 'bn' ? 'বাল্ক প্রাইস ক্যালকুলেটর' : 'Bulk Pricing Rules', icon: DollarSign },
                  { id: 'console' as AdminApiSubTab, label: language === 'bn' ? 'API কনসোল ও ট্রাফিক' : 'Raw API Terminal', icon: Terminal },
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setApiSubTab(tab.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                        apiSubTab === tab.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : `${surfaceSubtle} hover:border-indigo-500`
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* SUB-TAB 1: PROVIDERS LIST */}
              {apiSubTab === 'providers' && (
                <div className="space-y-4">
                  {/* Zero-Touch Automation Info & Instant Reconcile Bar */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${surfaceCard}`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {language === 'bn'
                            ? 'জিরো-টাচ অটোমেশন সক্রিয় (শুধুমাত্র অ্যাক্টিভ প্রোভাইডারের সচল সার্ভিস থাকবে)'
                            : 'Zero-Touch Automation Active (Only Active Provider Services Retained)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {language === 'bn'
                          ? 'প্রোভাইডার যুক্ত করলে স্বয়ংক্রিয়ভাবে সব অ্যাক্টিভ সার্ভিস ইমপোর্ট হয় এবং প্রোভাইডার বন্ধ বা ডিলিট করলে তার সব সার্ভিস নিজে থেকেই মুছে যায়।'
                          : 'Connecting a provider automatically imports all active services; disabling or deleting a provider automatically purges its services.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleAutoCleanAndSyncAll}
                        disabled={autoCleaningCatalog}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${autoCleaningCatalog ? 'animate-spin' : ''}`} />
                        <span>{autoCleaningCatalog ? 'Syncing...' : language === 'bn' ? 'সব অটো-সিঙ্ক ও ক্লিন' : 'Auto-Sync & Clean'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingProvider(true)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{language === 'bn' ? 'নতুন প্রোভাইডার' : 'Connect Provider'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {providers.map(prv => {
                      const linkedCount = services.filter(s => s.providerId === prv.id).length;
                      const isPrvActive = prv.status === 'active';
                      return (
                        <div key={prv.id} className={`p-4.5 rounded-2xl border space-y-3 ${surfaceCard}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">{prv.name}</h4>
                              <p className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]" title={prv.apiUrl}>
                                {prv.apiUrl}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleProviderStatus(prv)}
                              disabled={syncingProviderId === prv.id}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                                isPrvActive
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                              title={isPrvActive ? 'Click to deactivate & hide services' : 'Click to activate & auto-sync services'}
                            >
                              <span className={`w-2 h-2 rounded-full ${isPrvActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{isPrvActive ? 'Active' : 'Inactive'}</span>
                            </button>
                          </div>

                          <div className={`p-3 rounded-xl border flex items-center justify-between ${surfaceSubtle}`}>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-mono block">Live Balance</span>
                              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                ${prv.balance} {prv.currency || 'USD'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePingAndCheckProvider(prv)}
                              disabled={checkingBalanceId === prv.id}
                              className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold hover:bg-slate-300 transition-colors"
                            >
                              {checkingBalanceId === prv.id ? 'Pinging...' : 'Check Balance'}
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                            <span>Active Services: <strong className="text-slate-700 dark:text-slate-300">{linkedCount}</strong></span>
                            <span>Margin: <strong className="text-indigo-600 dark:text-indigo-400">+{prv.profitMargin}%</strong></span>
                          </div>

                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleSyncProviderCatalog(prv)}
                              disabled={syncingProviderId === prv.id}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${syncingProviderId === prv.id ? 'animate-spin' : ''}`} />
                              <span>{syncingProviderId === prv.id ? 'Syncing...' : 'Sync Active Catalog'}</span>
                            </button>

                            {confirmDeleteProviderId === prv.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProviderWithServices(prv, true)}
                                  disabled={syncingProviderId === prv.id}
                                  className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700"
                                >
                                  {language === 'bn' ? 'নিশ্চিত ডিলিট' : 'Confirm Delete'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteProviderId(null)}
                                  className="px-1.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteProviderId(prv.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete Provider & All Its Services"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {providers.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-400">
                        {language === 'bn' ? 'কোনো SMM API প্রোভাইডার সংযুক্ত নেই। উপরের বাটনে ক্লিক করে যুক্ত করুন।' : 'No API providers connected. Click Connect Provider above.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: REMOTE CATALOG IMPORTER */}
              {apiSubTab === 'importer' && (
                <div className="space-y-4">
                  <div className={`p-4.5 rounded-2xl border ${surfaceCard} space-y-3`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">{language === 'bn' ? 'রিমোট API সার্ভিস ক্যাটালগ ব্রাউজার' : 'Remote API Catalog Browser'}</h4>
                        <p className="text-xs text-slate-400">{language === 'bn' ? 'প্রোভাইডার সিলেক্ট করে লাইভ সার্ভিসসমূহ ব্রাউজ ও ১-ক্লিকে ইমপোর্ট করুন' : 'Select provider and selectively import upstream services'}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedCatalogProviderId}
                          onChange={e => {
                            setSelectedCatalogProviderId(e.target.value);
                            handleLoadRemoteCatalogForBrowser(e.target.value);
                          }}
                          className={`h-9 px-3 rounded-xl border text-xs font-semibold focus:outline-none ${
                            darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          {providers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleLoadRemoteCatalogForBrowser()}
                          disabled={loadingRemoteCatalog}
                          className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingRemoteCatalog ? 'animate-spin' : ''}`} />
                          <span>{loadingRemoteCatalog ? 'Loading...' : 'Fetch Catalog'}</span>
                        </button>
                      </div>
                    </div>

                    {remoteCatalogServices.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {selectedRemoteServiceIds.length} {language === 'bn' ? 'টি নির্বাচিত' : 'selected'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedRemoteServiceIds(remoteCatalogServices.map(s => s.service))}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          >
                            {language === 'bn' ? 'সব সিলেক্ট করুন' : 'Select All'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRemoteServiceIds([])}
                            className="text-xs text-slate-400 hover:underline"
                          >
                            {language === 'bn' ? 'ক্লিয়ার' : 'Clear'}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customLocalCategoryName}
                            onChange={e => setCustomLocalCategoryName(e.target.value)}
                            placeholder={language === 'bn' ? 'কাস্টম ক্যাটাগরি নাম (ঐচ্ছিক)' : 'Override category name (optional)'}
                            className={`h-8 px-2.5 rounded-lg border text-xs ${
                              darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={handleImportSelectedRemoteServices}
                            disabled={importingSelected || selectedRemoteServiceIds.length === 0}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                          >
                            {importingSelected ? 'Importing...' : 'Import Selected'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remote Catalog Table */}
                  {remoteCatalogServices.length > 0 && (
                    <div className={`rounded-2xl border overflow-hidden ${surfaceCard}`}>
                      <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className={`border-b font-mono font-bold uppercase text-[11px] ${tableHeader}`}>
                              <th className="py-2.5 px-3 w-8">
                                <input
                                  type="checkbox"
                                  checked={selectedRemoteServiceIds.length === remoteCatalogServices.length}
                                  onChange={e => {
                                    if (e.target.checked) setSelectedRemoteServiceIds(remoteCatalogServices.map(s => s.service));
                                    else setSelectedRemoteServiceIds([]);
                                  }}
                                />
                              </th>
                              <th className="py-2.5 px-3">Service ID</th>
                              <th className="py-2.5 px-3">Service Name</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3 text-right">Provider Rate</th>
                              <th className="py-2.5 px-3 text-right">Selling Rate (BDT)</th>
                              <th className="py-2.5 px-3 text-right">Min / Max</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {remoteCatalogServices.map(item => {
                              const isChecked = selectedRemoteServiceIds.includes(item.service);
                              return (
                                <tr key={item.service} className={`transition-colors ${isChecked ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : tableRowHover}`}>
                                  <td className="py-2 px-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        if (e.target.checked) setSelectedRemoteServiceIds(prev => [...prev, item.service]);
                                        else setSelectedRemoteServiceIds(prev => prev.filter(id => id !== item.service));
                                      }}
                                    />
                                  </td>
                                  <td className="py-2 px-3 font-mono font-bold text-slate-500">#{item.service}</td>
                                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[260px]">{item.name}</td>
                                  <td className="py-2 px-3 text-slate-500">{item.category}</td>
                                  <td className="py-2 px-3 text-right font-mono">${item.rawRate}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    ৳{item.convertedRateBdt}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-400">{item.min} - {item.max}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: ORDER ROUTER */}
              {apiSubTab === 'router' && (
                <div className="space-y-4">
                  <div className={`p-4.5 rounded-2xl border ${surfaceCard}`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2">Orders Awaiting API Dispatch</h4>
                    <p className="text-xs text-slate-400 mb-4">
                      {orders.filter(o => !o.providerOrderId && o.status !== 'canceled').length} orders pending upstream dispatch
                    </p>

                    <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {orders.filter(o => !o.providerOrderId && o.status !== 'canceled').slice(0, 10).map(o => {
                        const srv = services.find(s => s.id === o.serviceId);
                        const prv = providers.find(p => p.id === srv?.providerId);
                        return (
                          <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-mono font-bold">#{o.id}</span> · <span className="font-semibold">{o.serviceName}</span>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{o.link} · Qty: {o.quantity}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {prv ? (
                                <button
                                  type="button"
                                  onClick={() => handleManualOrderDispatch(o)}
                                  disabled={dispatchingOrderId === o.id}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                >
                                  {dispatchingOrderId === o.id ? 'Dispatching...' : `Push to ${prv.name}`}
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">No Provider Linked</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: BULK PRICING CALCULATOR */}
              {apiSubTab === 'pricing' && (
                <div className="space-y-4">
                  <div className={`p-5 rounded-2xl border ${surfaceCard} space-y-4 max-w-2xl`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Bulk Pricing Optimizer</h4>
                    <p className="text-xs text-slate-400">
                      Update profit margins and automatically recalculate BDT selling rates across all linked services for a provider.
                    </p>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="font-bold block mb-1">Select Provider</label>
                        <select
                          value={bulkRuleProviderId}
                          onChange={e => setBulkRuleProviderId(e.target.value)}
                          className={`w-full h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                        >
                          {providers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold block mb-1">Profit Margin (%)</label>
                          <input
                            type="number"
                            value={bulkMarginPercent}
                            onChange={e => setBulkMarginPercent(Number(e.target.value))}
                            className={`w-full h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">USD to BDT Rate</label>
                          <input
                            type="number"
                            value={bulkExchangeRate}
                            onChange={e => setBulkExchangeRate(Number(e.target.value))}
                            className={`w-full h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyBulkPricingRule}
                        disabled={applyingBulkPrice}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                      >
                        {applyingBulkPrice ? 'Applying Rules & Recalculating...' : 'Apply & Recalculate Catalog Prices'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 5: RAW API TERMINAL */}
              {apiSubTab === 'console' && (
                <div className="space-y-4">
                  <div className={`p-4.5 rounded-2xl border ${surfaceCard} space-y-3`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Execute Raw API Request</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={rawTestProviderId}
                        onChange={e => setRawTestProviderId(e.target.value)}
                        className={`h-9 px-3 rounded-xl border text-xs ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      >
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>

                      <select
                        value={rawTestAction}
                        onChange={e => setRawTestAction(e.target.value)}
                        className={`h-9 px-3 rounded-xl border text-xs ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      >
                        <option value="balance">Action: balance</option>
                        <option value="services">Action: services</option>
                        <option value="status">Action: status</option>
                      </select>

                      {rawTestAction === 'status' && (
                        <input
                          type="text"
                          value={rawTestOrderId}
                          onChange={e => setRawTestOrderId(e.target.value)}
                          placeholder="Provider Order ID"
                          className={`h-9 px-3 rounded-xl border text-xs ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                        />
                      )}

                      <button
                        type="button"
                        onClick={handleExecuteRawProviderTest}
                        disabled={runningRawTest}
                        className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{runningRawTest ? 'Running...' : 'Send Request'}</span>
                      </button>
                    </div>

                    {rawTestOutput && (
                      <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                        {rawTestOutput}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================
              SECTION 8: 100% SEO BLOG & GEMINI AI WRITER
             =================================================================== */}
          {activeSection === 'blogs' && (
            <div className="animate-in fade-in-0 duration-200">
              <AdminBlogManager
                blogs={blogs}
                siteSettings={siteSettings}
                onOpenGeminiSettings={() => navigateSection('settings')}
                onPreviewBlogSlug={onPreviewBlogSlug}
              />
            </div>
          )}

          {/* ===================================================================
              SECTION 9: USERS MANAGEMENT
             =================================================================== */}
          {activeSection === 'users' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className={`p-4.5 rounded-2xl border ${surfaceCard} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3`}>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">{language === 'bn' ? 'ইউজার একাউন্ট ও ব্যালেন্স কন্ট্রোল' : 'Users & Balances Control'}</h3>
                  <p className="text-xs text-slate-400">{users.length} {language === 'bn' ? 'জন নিবন্ধিত গ্রাহক' : 'registered user accounts'}</p>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder={language === 'bn' ? 'ইউজার নাম বা ইমেইল খুঁজুন...' : 'Search by name, email, UID...'}
                    className={`w-full h-9 pl-9 pr-3 rounded-xl text-xs font-medium border focus:outline-none focus:border-indigo-600 transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Users Table */}
              <div className={`rounded-2xl border overflow-hidden ${surfaceCard}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b font-mono font-bold uppercase text-[11px] ${tableHeader}`}>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3">Joined Date</th>
                        <th className="py-3 px-3 text-right">Orders Placed</th>
                        <th className="py-3 px-3 text-right">Total Spent</th>
                        <th className="py-3 px-3 text-right">Current Balance</th>
                        <th className="py-3 px-4 text-right">Adjust Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {users
                        .filter(u => !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase()))
                        .map(u => (
                          <tr key={u.uid} className={tableRowHover}>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">{u.displayName || u.email.split('@')[0]}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {u.role || 'user'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold">
                              {orders.filter(o => o.userId === u.uid).length}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                              ৳{u.totalSpent ? u.totalSpent.toLocaleString() : 0}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                              ৳{u.balance ? u.balance.toLocaleString() : 0}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setBalanceAdjustUid(u.uid);
                                  setBalanceAdjustAmount(u.balance || 0);
                                }}
                                className="px-2.5 py-1 rounded-lg border hover:border-indigo-500 text-xs font-semibold"
                              >
                                {language === 'bn' ? 'ব্যালেন্স পরিবর্তন' : 'Set Balance'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              SECTION 10: SUPPORT TICKETS HELPDESK
             =================================================================== */}
          {activeSection === 'tickets' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className={`p-4 rounded-2xl border ${surfaceCard} flex items-center justify-between`}>
                <h3 className="text-sm font-bold tracking-tight">{language === 'bn' ? 'কাস্টমার সাপোর্ট টিকেট' : 'Customer Support Helpdesk'}</h3>
                <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold">
                  {openTickets.length} {language === 'bn' ? 'ওপেন' : 'Open Tickets'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {tickets.map(t => (
                  <div key={t.id} className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCard}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-slate-400">#{t.id} · {t.department}</span>
                        <h4 className="text-sm font-bold tracking-tight mt-0.5 text-slate-900 dark:text-slate-100">{t.subject}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">{t.userEmail}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'open' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                        t.status === 'answered' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border text-xs max-h-36 overflow-y-auto space-y-2 ${surfaceSubtle}`}>
                      {t.messages.map((m, idx) => (
                        <div key={idx} className={m.senderRole === 'admin' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}>
                          <span className="font-bold">{m.senderName}: </span>
                          <span>{m.message}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={selectedTicketId === t.id ? adminReplyText : ''}
                        onChange={e => {
                          setSelectedTicketId(t.id);
                          setAdminReplyText(e.target.value);
                        }}
                        placeholder={language === 'bn' ? 'কাস্টমারকে রিপ্লাই লিখুন...' : 'Type admin reply...'}
                        className={`flex-1 h-8 px-2.5 rounded-lg border text-xs ${
                          darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSendAdminReply(t)}
                        className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Send className="w-3 h-3" />
                        <span>{language === 'bn' ? 'পাঠান' : 'Reply'}</span>
                      </button>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400">
                    {language === 'bn' ? 'কোনো সাপোর্ট টিকেট নেই' : 'No support tickets found'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================================================================
              SECTION 11: PROMO COUPONS
             =================================================================== */}
          {activeSection === 'coupons' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className={`p-4.5 rounded-2xl border ${surfaceCard}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Create New Promotional Coupon</h4>
                <form onSubmit={handleCreateCoupon} className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={e => setNewCouponCode(e.target.value)}
                    placeholder="Coupon Code (e.g. EID50)"
                    className={`h-9 px-3 rounded-xl border text-xs font-mono uppercase ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <input
                    type="number"
                    value={newCouponReward}
                    onChange={e => setNewCouponReward(Number(e.target.value))}
                    placeholder="Reward Amount in BDT"
                    className={`h-9 px-3 rounded-xl border text-xs font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <input
                    type="number"
                    value={newCouponMaxUses}
                    onChange={e => setNewCouponMaxUses(Number(e.target.value))}
                    placeholder="Max Uses"
                    className={`h-9 px-3 rounded-xl border text-xs font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                  >
                    Save Coupon
                  </button>
                </form>
              </div>

              <div className={`rounded-2xl border overflow-hidden ${surfaceCard}`}>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b font-mono font-bold uppercase text-[11px] ${tableHeader}`}>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-3">Reward</th>
                      <th className="py-3 px-3">Used / Max</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {coupons.map(cp => (
                      <tr key={cp.id} className={tableRowHover}>
                        <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{cp.code}</td>
                        <td className="py-3 px-3 font-black">৳{cp.rewardAmount}</td>
                        <td className="py-3 px-3">{cp.usedCount} / {cp.maxUses}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeCoupon(cp.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">No coupons created yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================================
              SECTION 12: ANNOUNCEMENTS / NOTICE BOARD
             =================================================================== */}
          {activeSection === 'announcements' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className={`p-4.5 rounded-2xl border ${surfaceCard} space-y-3`}>
                <h4 className="text-xs font-bold uppercase tracking-wider">Publish New Broadcast Notice</h4>
                <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newAnnTitle}
                      onChange={e => setNewAnnTitle(e.target.value)}
                      placeholder="Notice Title"
                      className={`h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                    />
                    <select
                      value={newAnnType}
                      onChange={e => setNewAnnType(e.target.value as Announcement['type'])}
                      className={`h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <option value="info">Type: Info Banner</option>
                      <option value="success">Type: Success / Promo</option>
                      <option value="warning">Type: Warning Notice</option>
                      <option value="alert">Type: Critical Alert</option>
                    </select>
                    <button
                      type="submit"
                      className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      Publish Notice
                    </button>
                  </div>
                  <textarea
                    value={newAnnContent}
                    onChange={e => setNewAnnContent(e.target.value)}
                    placeholder="Announcement message body to broadcast across user dashboard..."
                    rows={2}
                    className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {announcements.map(ann => (
                  <div key={ann.id} className={`p-4 rounded-2xl border space-y-2 ${surfaceCard}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">{ann.title}</span>
                      <button
                        type="button"
                        onClick={() => removeAnnouncement(ann.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{ann.content}</p>
                    <span className="text-[10px] text-slate-400 font-mono block">{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================================
              SECTION 13: SETTINGS & SYSTEM CONTROL
             =================================================================== */}
          {activeSection === 'settings' && (
            <div className="space-y-5 animate-in fade-in-0 duration-200 max-w-4xl">
              <form onSubmit={handleSaveGlobalSettings} className="space-y-5">
                {/* General Settings */}
                <div className={`p-5 rounded-2xl border ${surfaceCard} space-y-4`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b pb-2 border-slate-200 dark:border-slate-800">
                    Platform Identity & Currency Rate
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold block mb-1">Platform Name</label>
                      <input
                        type="text"
                        value={settingsForm.siteName || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, siteName: e.target.value })}
                        className={`w-full h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">USD to BDT Exchange Rate</label>
                      <input
                        type="number"
                        value={settingsForm.usdToBdtRate || 122}
                        onChange={e => setSettingsForm({ ...settingsForm, usdToBdtRate: Number(e.target.value) })}
                        className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Brand Logo / OpenGraph Image URL</label>
                      <input
                        type="text"
                        value={settingsForm.seoOgImage || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, seoOgImage: e.target.value })}
                        className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Support WhatsApp Number</label>
                      <input
                        type="text"
                        value={settingsForm.whatsappNumber || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                        className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Gemini AI Settings */}
                <div className={`p-5 rounded-2xl border ${surfaceCard} space-y-4`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      Google Gemini AI Key & SEO Engine
                    </h3>
                    <button
                      type="button"
                      onClick={handleTestGeminiConnection}
                      disabled={testingGemini}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold"
                    >
                      {testingGemini ? 'Testing...' : 'Test Gemini Connection'}
                    </button>
                  </div>
                  {geminiStatusMsg && (
                    <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{geminiStatusMsg}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold block mb-1">Gemini API Key</label>
                      <input
                        type={showGeminiApiKey ? 'text' : 'password'}
                        value={settingsForm.geminiApiKey || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, geminiApiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Model Alias</label>
                      <input
                        type="text"
                        value={settingsForm.geminiModel || 'gemini-2.5-flash'}
                        onChange={e => setSettingsForm({ ...settingsForm, geminiModel: e.target.value })}
                        className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                  </div>
                </div>

                {/* ZiniPay Gateway Settings */}
                <div className={`p-5 rounded-2xl border ${surfaceCard} space-y-4`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      ZiniPay Automated Payment Gateway
                    </h3>
                    <button
                      type="button"
                      onClick={handleTestZiniPayConnection}
                      disabled={testingZiniPay}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold"
                    >
                      {testingZiniPay ? 'Testing...' : 'Test ZiniPay'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold block mb-1">ZiniPay API Key</label>
                      <input
                        type={showZiniApiKey ? 'text' : 'password'}
                        value={settingsForm.zinipayApiKey || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, zinipayApiKey: e.target.value })}
                        placeholder="zini_live_..."
                        className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Referral Commission (%)</label>
                      <input
                        type="number"
                        value={settingsForm.referralCommissionPercent || 5}
                        onChange={e => setSettingsForm({ ...settingsForm, referralCommissionPercent: Number(e.target.value) })}
                        className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingSettings ? 'Saving Settings...' : 'Save All Settings'}</span>
                  </button>
                </div>
              </form>

              {/* Danger Zone: Purge Demo Data */}
              <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone: Reset Demo Records
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-300">
                  Purge all legacy mock transactions, mock orders, and initial seeded data from the Cloud Firestore database.
                </p>
                <button
                  type="button"
                  onClick={handlePurgeDemoData}
                  disabled={purgingDemo}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                >
                  {purgingDemo ? 'Purging Demo Data...' : 'Purge All Legacy Demo Data'}
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================
              SECTION 14: MOBILE CONTROL HUB & NATIVE APP LAUNCHER (hub)
             =================================================================== */}
          {activeSection === 'hub' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              {/* Executive Mobile Hero Banner */}
              <div className={`dark-hero-card p-4.5 rounded-3xl border text-white space-y-3 ${
                darkMode
                  ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-indigo-500/30'
                  : 'bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 border-indigo-600 shadow-lg shadow-indigo-600/15'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm tracking-tight text-white">
                        {language === 'bn' ? 'অ্যাডমিন কন্ট্রোল হাব' : 'Admin Control Hub'}
                      </h3>
                      <p className="text-[10px] font-mono text-indigo-200">
                        AmarTrend SMM Engine · {serverHealth ? `Uptime ${Math.floor(serverHealth.uptimeSeconds / 60)}m` : 'Live'}
                      </p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80" />
                </div>

                {/* Quick 3-Metric Mini Strip */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 font-mono">
                  <div className="bg-black/20 rounded-xl p-2 text-center">
                    <span className="text-[9px] uppercase text-slate-300 block">{language === 'bn' ? 'মোট রেভিনিউ' : 'Revenue'}</span>
                    <span className="font-bold text-xs text-emerald-400">৳{totalRevenue > 99999 ? `${Math.round(totalRevenue/1000)}k` : totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="bg-black/20 rounded-xl p-2 text-center">
                    <span className="text-[9px] uppercase text-slate-300 block">{language === 'bn' ? 'অর্ডার' : 'Orders'}</span>
                    <span className="font-bold text-xs text-amber-400">{orders.length}</span>
                  </div>
                  <div className="bg-black/20 rounded-xl p-2 text-center">
                    <span className="text-[9px] uppercase text-slate-300 block">{language === 'bn' ? 'কানেক্টেড API' : 'APIs'}</span>
                    <span className="font-bold text-xs text-sky-400">{providers.length}</span>
                  </div>
                </div>
              </div>

              {/* Native App Springboard Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    {language === 'bn' ? 'অ্যাডমিনিস্ট্রেটিভ মডিউলস' : 'Administrative Modules'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">10 Apps</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* 1. Financial Intelligence */}
                  <button
                    type="button"
                    onClick={() => navigateSection('finance')}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-emerald-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {language === 'bn' ? 'ফাইন্যান্স ও প্রফিট' : 'Financial Intelligence'}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {language === 'bn' ? 'নেট মার্জিন ও প্রফিট রিপোর্ট' : 'Net profit, margins & ROI'}
                      </p>
                    </div>
                  </button>

                  {/* 2. API Providers Studio */}
                  <button
                    type="button"
                    onClick={() => navigateSection('providers')}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-sky-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <Server className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">
                        {providers.length}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {language === 'bn' ? 'API প্রোভাইডার স্টুডিও' : 'API Providers Studio'}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {language === 'bn' ? 'SMM API v2 সিঙ্ক ও রাউটিং' : 'Catalog sync & routing'}
                      </p>
                    </div>
                  </button>

                  {/* 3. SEO Blog CMS & Gemini AI */}
                  <button
                    type="button"
                    onClick={() => navigateSection('blogs')}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-purple-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                        {blogs.length}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {language === 'bn' ? 'SEO ব্লগ ও Gemini AI' : 'SEO Blog & Gemini AI'}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {language === 'bn' ? 'অটোমেটেড কন্টেন্ট ও কীওয়ার্ড' : 'AI articles & rich snippets'}
                      </p>
                    </div>
                  </button>

                  {/* 4. Users & Balances */}
                  <button
                    type="button"
                    onClick={() => navigateSection('users')}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-blue-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                        {users.length}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {language === 'bn' ? 'ইউজার ও ওয়ালেট' : 'Users & Balances'}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {language === 'bn' ? 'ব্যালেন্স অ্যাডজাস্ট ও অ্যাকাউন্টস' : 'Manage wallets & roles'}
                      </p>
                    </div>
                  </button>

                  {/* 5. Support Helpdesk */}
                  <button
                    type="button"
                    onClick={() => navigateSection('tickets')}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-rose-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      {openTickets.length > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-bold animate-pulse">
                          {openTickets.length} open
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {language === 'bn' ? 'সাপোর্ট হেল্পডেস্ক' : 'Support Helpdesk'}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {language === 'bn' ? 'কাস্টমার মেসেজের উত্তর দিন' : 'Answer user inquiries'}
                      </p>
                    </div>
                  </button>

                  {/* 6. Refill Queue */}
                  <button
                    type="button"
                    onClick={() => navigateSection('refills')}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-amber-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      {pendingRefills.length > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold">
                          {pendingRefills.length} new
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {language === 'bn' ? 'রিফিল কিউ' : 'Refill Queue'}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {language === 'bn' ? 'রিফিল অর্ডার ফরোয়ার্ড' : 'Forward refills to API'}
                      </p>
                    </div>
                  </button>

                  {/* 7. Promo Vouchers */}
                  <button
                    type="button"
                    onClick={() => navigateSection('coupons')}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-pink-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                        <Gift className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-bold">
                        {coupons.length}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {language === 'bn' ? 'প্রোমো কোড' : 'Promo Vouchers'}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {language === 'bn' ? 'ডিসকাউন্ট ও বোনাস কোড' : 'Manage coupon codes'}
                      </p>
                    </div>
                  </button>

                  {/* 8. Announcements */}
                  <button
                    type="button"
                    onClick={() => navigateSection('announcements')}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-orange-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold">
                        {announcements.length}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {language === 'bn' ? 'নোটিশ বোর্ড' : 'Announcements'}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {language === 'bn' ? 'ইউজারদের লাইভ নোটিশ পাঠান' : 'Broadcast notifications'}
                      </p>
                    </div>
                  </button>

                  {/* 9. System & SEO Settings */}
                  <button
                    type="button"
                    onClick={() => navigateSection('settings')}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-indigo-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                        <Settings className="w-5 h-5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {language === 'bn' ? 'সিস্টেম সেটিংস' : 'System Settings'}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {language === 'bn' ? 'USD রেট, কী ও কনফিগ' : 'USD rate, keys & SEO'}
                      </p>
                    </div>
                  </button>

                  {/* 10. Switch to User App */}
                  {onExitAdmin && (
                    <button
                      type="button"
                      onClick={onExitAdmin}
                      className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${surfaceCard} hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <LogOut className="w-5 h-5" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          {language === 'bn' ? 'ইউজার প্যানেলে ফিরুন' : 'Exit to Storefront'}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {language === 'bn' ? 'কাস্টমার ভিউ প্রিভিউ করুন' : 'Switch back to user view'}
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Actions Action Bar */}
              <div className={`p-4 rounded-2xl border ${surfaceCard} space-y-2.5`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  {language === 'bn' ? 'কুইক অ্যাকশন কন্ট্রোল' : 'Quick Actions'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSyncAllOrders}
                    disabled={syncingOrders}
                    className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingOrders ? 'animate-spin' : ''}`} />
                    <span>{language === 'bn' ? 'অর্ডার সিঙ্ক' : 'Sync Orders'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingService(true); navigateSection('services'); }}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{language === 'bn' ? 'নতুন সার্ভিস' : 'Add Service'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          NATIVE MOBILE APP BOTTOM NAVIGATION DOCK (iOS / Android Native App Bar)
         ========================================================================= */}
      <nav 
        aria-label="Admin Mobile Navigation"
        className="admin-mobile-dock fixed bottom-0 inset-x-0 z-40 lg:hidden pointer-events-none"
      >
        <div className="max-w-md mx-auto px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-1">
          <div className={`pointer-events-auto backdrop-blur-2xl rounded-2xl border px-2 py-1.5 flex items-center justify-around transition-colors ${
            darkMode
              ? 'bg-slate-900/95 border-slate-700/60 shadow-2xl shadow-black/40'
              : 'bg-white/95 border-slate-300/90 shadow-2xl shadow-slate-900/15'
          }`}>
            {/* 1. Dashboard / Home Tab */}
            <button
              type="button"
              onClick={() => navigateSection('overview')}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                activeSection === 'overview'
                  ? darkMode ? 'text-white font-bold' : 'text-indigo-700 font-bold'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {activeSection === 'overview' && (
                <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/80" />
              )}
              <div className={`p-1 rounded-lg ${
                activeSection === 'overview'
                  ? darkMode ? 'bg-indigo-600/30 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
                  : ''
              }`}>
                <LayoutGrid className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-semibold tracking-tight mt-0.5">
                {language === 'bn' ? 'হোম' : 'Home'}
              </span>
            </button>

            {/* 2. Orders Tab */}
            <button
              type="button"
              onClick={() => navigateSection('orders')}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                activeSection === 'orders' || activeSection === 'refills'
                  ? darkMode ? 'text-white font-bold' : 'text-amber-700 font-bold'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {(activeSection === 'orders' || activeSection === 'refills') && (
                <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/80" />
              )}
              <div className="relative">
                <div className={`p-1 rounded-lg ${
                  activeSection === 'orders' || activeSection === 'refills'
                    ? darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                    : ''
                }`}>
                  <Package className="w-4.5 h-4.5" />
                </div>
                {pendingOrders.length > 0 && (
                  <span className={`absolute -top-1 -right-1.5 px-1 min-w-[15px] h-[15px] rounded-full bg-amber-500 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center ring-2 ${
                    darkMode ? 'ring-slate-900' : 'ring-white'
                  }`}>
                    {pendingOrders.length > 99 ? '99+' : pendingOrders.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight mt-0.5">
                {language === 'bn' ? 'অর্ডার' : 'Orders'}
              </span>
            </button>

            {/* 3. Deposits / Payments Tab */}
            <button
              type="button"
              onClick={() => navigateSection('payments')}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                activeSection === 'payments'
                  ? darkMode ? 'text-white font-bold' : 'text-emerald-700 font-bold'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {activeSection === 'payments' && (
                <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/80" />
              )}
              <div className="relative">
                <div className={`p-1 rounded-lg ${
                  activeSection === 'payments'
                    ? darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    : ''
                }`}>
                  <Wallet className="w-4.5 h-4.5" />
                </div>
                {pendingDeposits.length > 0 && (
                  <span className={`absolute -top-1 -right-1.5 px-1 min-w-[15px] h-[15px] rounded-full bg-emerald-500 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center ring-2 animate-pulse ${
                    darkMode ? 'ring-slate-900' : 'ring-white'
                  }`}>
                    {pendingDeposits.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight mt-0.5">
                {language === 'bn' ? 'ডিপোজিট' : 'Deposits'}
              </span>
            </button>

            {/* 4. Services Tab */}
            <button
              type="button"
              onClick={() => navigateSection('services')}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                activeSection === 'services'
                  ? darkMode ? 'text-white font-bold' : 'text-indigo-700 font-bold'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {activeSection === 'services' && (
                <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/80" />
              )}
              <div className={`p-1 rounded-lg ${
                activeSection === 'services'
                  ? darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
                  : ''
              }`}>
                <Layers className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-semibold tracking-tight mt-0.5">
                {language === 'bn' ? 'সার্ভিস' : 'Services'}
              </span>
            </button>

            {/* 5. Mobile Control Hub / Apps Launcher Tab */}
            <button
              type="button"
              onClick={() => navigateSection('hub')}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                ['hub', 'finance', 'blogs', 'providers', 'users', 'tickets', 'coupons', 'announcements', 'settings'].includes(activeSection)
                  ? darkMode ? 'text-white font-bold' : 'text-purple-700 font-bold'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {['hub', 'finance', 'blogs', 'providers', 'users', 'tickets', 'coupons', 'announcements', 'settings'].includes(activeSection) && (
                <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/80" />
              )}
              <div className="relative">
                <div className={`p-1 rounded-lg ${
                  ['hub', 'finance', 'blogs', 'providers', 'users', 'tickets', 'coupons', 'announcements', 'settings'].includes(activeSection)
                    ? darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                    : ''
                }`}>
                  <SlidersHorizontal className="w-4.5 h-4.5" />
                </div>
                {(openTickets.length > 0 || pendingRefills.length > 0) && (
                  <span className={`absolute -top-1 -right-1.5 px-1 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white font-mono text-[9px] font-black flex items-center justify-center ring-2 ${
                    darkMode ? 'ring-slate-900' : 'ring-white'
                  }`}>
                    {openTickets.length + pendingRefills.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight mt-0.5">
                {language === 'bn' ? 'হাব' : 'Hub'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* =========================================================================
          MODAL: ADD / EDIT SERVICE
         ========================================================================= */}
      {(isAddingService || editingService) && (
        <div 
          onClick={() => { setIsAddingService(false); setEditingService(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in-0 duration-150"
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${surfaceCard}`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-sm tracking-tight">
                {editingService ? 'Edit SMM Service' : 'Add New Service to Catalog'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsAddingService(false); setEditingService(null); }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const target = editingService || newService;
                handleSaveService(target as SMMService);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold block mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={editingService ? editingService.name : newService.name}
                  onChange={e => {
                    if (editingService) setEditingService({ ...editingService, name: e.target.value });
                    else setNewService({ ...newService, name: e.target.value });
                  }}
                  className={`w-full h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={editingService ? editingService.category : newService.category}
                    onChange={e => {
                      if (editingService) setEditingService({ ...editingService, category: e.target.value });
                      else setNewService({ ...newService, category: e.target.value });
                    }}
                    className={`w-full h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Selling Rate / 1,000 (BDT)</label>
                  <input
                    type="number"
                    required
                    value={editingService ? editingService.rate : newService.rate}
                    onChange={e => {
                      if (editingService) setEditingService({ ...editingService, rate: Number(e.target.value) });
                      else setNewService({ ...newService, rate: Number(e.target.value) });
                    }}
                    className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Min Order</label>
                  <input
                    type="number"
                    value={editingService ? editingService.min : newService.min}
                    onChange={e => {
                      if (editingService) setEditingService({ ...editingService, min: Number(e.target.value) });
                      else setNewService({ ...newService, min: Number(e.target.value) });
                    }}
                    className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Max Order</label>
                  <input
                    type="number"
                    value={editingService ? editingService.max : newService.max}
                    onChange={e => {
                      if (editingService) setEditingService({ ...editingService, max: Number(e.target.value) });
                      else setNewService({ ...newService, max: Number(e.target.value) });
                    }}
                    className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Link Upstream API Provider</label>
                <select
                  value={editingService ? editingService.providerId || '' : newService.providerId || ''}
                  onChange={e => {
                    if (editingService) setEditingService({ ...editingService, providerId: e.target.value || undefined });
                    else setNewService({ ...newService, providerId: e.target.value || undefined });
                  }}
                  className={`w-full h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="">None (Manual / Direct Fulfillment)</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.apiUrl})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Service Description</label>
                <textarea
                  rows={2}
                  value={editingService ? editingService.description || '' : newService.description || ''}
                  onChange={e => {
                    if (editingService) setEditingService({ ...editingService, description: e.target.value });
                    else setNewService({ ...newService, description: e.target.value });
                  }}
                  placeholder="Instructions or features for customers..."
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddingService(false); setEditingService(null); }}
                  className="px-4 py-2 rounded-xl border font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD API PROVIDER
         ========================================================================= */}
      {isAddingProvider && (
        <div 
          onClick={() => setIsAddingProvider(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in-0 duration-150"
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${surfaceCard}`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-sm tracking-tight">Connect SMM API v2 Provider</h3>
              <button
                type="button"
                onClick={() => setIsAddingProvider(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Popular Presets</span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SMM_PROVIDER_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setNewProvider(prev => ({
                        ...prev,
                        name: preset.name,
                        apiUrl: preset.apiUrl,
                        profitMargin: preset.margin
                      }));
                    }}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-semibold hover:border-indigo-500 ${surfaceSubtle}`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Provider Name</label>
                <input
                  type="text"
                  value={newProvider.name || ''}
                  onChange={e => setNewProvider({ ...newProvider, name: e.target.value })}
                  placeholder="e.g. Peakerr SMM"
                  className={`w-full h-9 px-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div>
                <label className="font-bold block mb-1">API v2 Endpoint URL</label>
                <input
                  type="text"
                  value={newProvider.apiUrl || ''}
                  onChange={e => setNewProvider({ ...newProvider, apiUrl: e.target.value })}
                  placeholder="https://domain.com/api/v2"
                  className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div>
                <label className="font-bold block mb-1">API Secret Key</label>
                <div className="relative">
                  <input
                    type={showProviderSecret ? 'text' : 'password'}
                    value={newProvider.apiKey || ''}
                    onChange={e => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                    placeholder="Enter API Key from provider account"
                    className={`w-full h-9 pl-3 pr-10 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowProviderSecret(!showProviderSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showProviderSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Default Profit Margin (%)</label>
                  <input
                    type="number"
                    value={newProvider.profitMargin || 25}
                    onChange={e => setNewProvider({ ...newProvider, profitMargin: Number(e.target.value) })}
                    className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Custom USD/BDT Rate</label>
                  <input
                    type="number"
                    value={newProvider.customExchangeRate || 122}
                    onChange={e => setNewProvider({ ...newProvider, customExchangeRate: Number(e.target.value) })}
                    className={`w-full h-9 px-3 rounded-xl border font-mono ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              {newProviderPingResult && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-mono text-xs">
                  Ping: {newProviderPingResult.latencyMs}ms · Balance: ${newProviderPingResult.balance} {newProviderPingResult.currency}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTestNewProviderConnection}
                  disabled={testingNewProvider}
                  className="px-3 py-2 rounded-xl border font-bold flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-indigo-500" />
                  <span>{testingNewProvider ? 'Pinging...' : 'Test Ping'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingProvider(false)}
                    className="px-4 py-2 rounded-xl border font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProvider}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    Save Provider
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: BALANCE ADJUSTMENT (USER CONTROL)
         ========================================================================= */}
      {balanceAdjustUid && (
        <div 
          onClick={() => setBalanceAdjustUid(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in-0 duration-150"
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-sm p-5 rounded-3xl border shadow-2xl space-y-4 ${surfaceCard}`}
          >
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-sm tracking-tight">Adjust Customer Balance</h3>
              <button
                type="button"
                onClick={() => setBalanceAdjustUid(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">New Balance in BDT (৳)</label>
                <input
                  type="number"
                  value={balanceAdjustAmount}
                  onChange={e => setBalanceAdjustAmount(Number(e.target.value))}
                  className={`w-full h-10 px-3 rounded-xl border font-mono text-base font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceAdjustUid(null)}
                  className="px-3.5 py-1.5 rounded-xl border font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveUserBalance(balanceAdjustUid)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Update Balance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER / MODAL: ORDER DETAILS
         ========================================================================= */}
      {activeOrderDetail && (
        <div 
          onClick={() => setActiveOrderDetail(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in-0 duration-150"
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-md p-5 rounded-3xl border shadow-2xl space-y-3.5 ${surfaceCard}`}
          >
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                <h3 className="font-extrabold text-sm tracking-tight">Order #{activeOrderDetail.id} Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveOrderDetail(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{activeOrderDetail.userEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Service:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{activeOrderDetail.serviceName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Quantity:</span>
                <span className="font-semibold">{activeOrderDetail.quantity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Charge:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">৳{activeOrderDetail.charge}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Target Link:</span>
                <a
                  href={activeOrderDetail.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[200px]"
                >
                  {activeOrderDetail.link}
                </a>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Upstream Provider:</span>
                <span className="font-semibold">{activeOrderDetail.providerOrderId ? `Provider #${activeOrderDetail.providerOrderId}` : 'Not dispatched'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Order Placed:</span>
                <span>{new Date(activeOrderDetail.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveOrderDetail(null)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
