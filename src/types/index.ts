export type UserRole = 'user' | 'admin';
export type Currency = 'BDT' | 'USD';
export type Language = 'en' | 'bn';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  balance: number;
  totalSpent: number;
  role: UserRole;
  currency: Currency;
  language?: Language;
  darkMode?: boolean;
  apiKey: string;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  referralEarnings?: number;
  unpaidReferralEarnings?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface SMMService {
  id: string;
  category: string;
  name: string;
  type: 'Default' | 'Custom Comments' | 'Package' | 'Subscriptions';
  rate: number; // Rate per 1000 in BDT
  min: number;
  max: number;
  dripfeed: boolean;
  refill: boolean;
  description: string;
  averageTime: string;
  status: 'active' | 'disabled';
  providerId?: string;
  providerServiceId?: string;
  originalRate?: number;
}

export type OrderStatus = 
  | 'pending' 
  | 'processing' 
  | 'in_progress' 
  | 'completed' 
  | 'partial' 
  | 'canceled' 
  | 'refunded';

export interface SMMOrder {
  id: string;
  userId: string;
  userEmail: string;
  serviceId: string;
  serviceName: string;
  category: string;
  link: string;
  quantity: number;
  charge: number; // in BDT
  startCount?: number;
  remains?: number;
  status: OrderStatus;
  dripfeed?: boolean;
  runs?: number;
  interval?: number;
  customComments?: string;
  providerId?: string;
  providerOrderId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface SMMRefill {
  id: string;
  orderId: string;
  userId: string;
  userEmail?: string;
  serviceName: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: number;
}

export type PaymentGateway = 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Binance_USDT';

export interface SMMPayment {
  id: string;
  userId: string;
  userEmail: string;
  gateway: PaymentGateway;
  amount: number; // in BDT
  bonus?: number; // in BDT
  transactionId: string;
  senderNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface TicketMessage {
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: number;
}

export interface SMMTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  orderId?: string;
  department: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'low' | 'normal' | 'high';
  messages: TicketMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'promo' | 'warning' | 'maintenance';
  active: boolean;
  createdAt: number;
}

export interface SMMProvider {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  balance: number;
  currency: string;
  profitMargin: number; // Percentage markup e.g. 20%
  fixedMarkup?: number; // Flat BDT markup per 1K e.g. +5 BDT
  priceRounding?: 'none' | 'nearest_int' | 'ceil';
  customExchangeRate?: number; // Custom USD->BDT rate override
  autoForwardOrders?: boolean;
  autoSyncRefills?: boolean;
  lowBalanceAlert?: number;
  lastLatencyMs?: number;
  totalRemoteServices?: number;
  status: 'active' | 'inactive';
  lastSyncAt?: number;
}

export interface RemoteProviderService {
  service: string;
  name: string;
  category: string;
  type: 'Default' | 'Custom Comments' | 'Package' | 'Subscriptions';
  rawRate: number;
  convertedRateBdt: number;
  min: number;
  max: number;
  dripfeed: boolean;
  refill: boolean;
  cancel?: boolean;
  description: string;
  averageTime: string;
}

export interface ApiTrafficLog {
  id: string;
  timestamp: number;
  direction: 'upstream' | 'inbound_v2';
  action: string;
  endpoint: string;
  status: 'success' | 'error';
  httpCode: number;
  latencyMs: number;
  summary: string;
}

export interface SMMCoupon {
  id: string;
  code: string;
  rewardAmount: number; // in BDT
  maxUses: number;
  usedCount: number;
  usedBy: string[];
  active: boolean;
  createdAt: number;
}

export interface SiteSettings {
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  upayNumber: string;
  usdtAddress: string;
  bkashBonusPercent: number;
  nagadBonusPercent: number;
  usdtBonusPercent: number;
  minDepositForBonus: number;
  whatsappUrl: string;
  telegramUrl: string;
  referralCommissionPercent: number;
  minAffiliatePayout: number;
  maintenanceMode: boolean;
  usdToBdtRate?: number;
  updatedAt: number;
}

export interface ServerHealthStatus {
  status: 'online' | 'degraded';
  uptimeSeconds: number;
  serverTime: number;
  nodeVersion: string;
  memoryMB: number;
  databaseId: string;
  apiV2Active: boolean;
  totalApiCalls?: number;
}
