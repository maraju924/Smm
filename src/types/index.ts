export type UserRole = 'user' | 'admin';
export type Currency = 'BDT' | 'USD';
export type Language = 'en' | 'bn';

export interface AffiliatePayoutRecord {
  id: string;
  type: 'wallet_transfer' | 'mobile_banking_withdraw' | 'milestone_bonus' | 'coupon_redeem' | 'referral_welcome' | 'daily_checkin';
  amount: number;
  method?: string;
  accountNumber?: string;
  note?: string;
  status: 'completed' | 'pending';
  createdAt: number;
}

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
  referralVerified?: boolean;
  totalDeposited?: number;
  referralCount?: number;
  referralEarnings?: number;
  unpaidReferralEarnings?: number;
  claimedMilestones?: string[];
  dailyCheckInLastAt?: number;
  dailyCheckInStreak?: number;
  payoutHistory?: AffiliatePayoutRecord[];
  favoriteServices?: string[];
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
  providerCost?: number; // Upstream API cost in BDT for net profit tracking
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

export type PaymentGateway = 'ZiniPay' | 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Binance_USDT';

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
  zinipayInvoiceId?: string;
  zinipayPaymentUrl?: string;
  zinipayMethod?: string;
  verificationMode?: 'auto_zinipay' | 'manual';
  verifiedAt?: number;
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
  siteName?: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  upayNumber: string;
  usdtAddress: string;
  binanceId?: string;
  bkashBonusPercent: number;
  nagadBonusPercent: number;
  usdtBonusPercent: number;
  depositBonusPercent?: number;
  minDepositForBonus: number;
  minDepositAmount?: number;
  whatsappUrl: string;
  telegramUrl: string;
  referralCommissionPercent: number;
  minAffiliatePayout: number;
  maintenanceMode: boolean;
  usdToBdtRate?: number;
  // ZiniPay Payment Gateway Configuration
  zinipayEnabled?: boolean;
  zinipayMode?: 'sandbox' | 'live';
  zinipayApiKey?: string;
  zinipayBaseUrl?: string;
  zinipayBrandDomain?: string;
  zinipayBonusPercent?: number;
  zinipayAutoVerifyTrx?: boolean;
  zinipayFeePassToUser?: boolean;
  zinipayFeePercent?: number;
  // Bangladesh SEO & Google Indexing Configuration
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoCanonicalDomain?: string;
  googleSiteVerification?: string;
  googleAnalyticsId?: string;
  seoOgImage?: string;
  // Google Gemini AI Blog & SEO Writer Configuration
  geminiEnabled?: boolean;
  geminiApiKey?: string;
  geminiModel?: string;
  geminiDefaultLanguage?: 'bn' | 'bn_en' | 'en' | 'mixed';
  geminiAutoInternalLinks?: boolean;
  geminiAutoFaqSchema?: boolean;
  // 10-18h Automated SEO Blog Autopilot Configuration
  blogAutopilotEnabled?: boolean;
  blogAutopilotMinHours?: number;
  blogAutopilotMaxHours?: number;
  blogAutopilotMinSeoScore?: number;
  blogAutopilotCategories?: string[];
  blogAutopilotLastRunAt?: number;
  blogAutopilotNextRunAt?: number;
  blogAutopilotTotalPublished?: number;
  blogAutopilotTopicQueue?: string[];
  blogAutopilotLogs?: SMMBlogAutopilotLog[];
  updatedAt: number;
}

export interface SMMBlogFaqItem {
  question: string;
  answer: string;
}

export interface SMMBlogKeywordCandidate {
  keyword: string;
  topicTitle: string;
  suggestedTitle?: string;
  category: string;
  searchIntent: 'Informational' | 'Commercial' | 'Transactional' | 'Guide';
  intent?: string;
  monthlySearchVolumeBd: string;
  monthlyVolume?: string;
  keywordDifficulty: number;
  difficulty?: string | number;
  rankingOpportunityScore: number;
  whyItRanks: string;
  rationale?: string;
  secondaryKeywords?: string[];
  suggestedCoverImage: string;
  suggestedCoverAlt: string;
  isUnique?: boolean;
}

export interface SMMBlogAutopilotLog {
  id: string;
  timestamp: number;
  triggerType: 'auto_schedule' | 'manual_admin';
  researchedKeyword: string;
  keyword?: string;
  blogTitle: string;
  title?: string;
  blogSlug: string;
  slug?: string;
  category: string;
  seoScore: number;
  uniquenessScore: number;
  internalLinksInjected: number;
  internalLinksCount?: number;
  coverImage: string;
  status: 'published' | 'refined_and_published' | 'skipped_duplicate' | 'error';
  sitemapSynced: boolean;
  nextScheduledAt?: number;
  summary: string;
  note?: string;
}

export interface SMMBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Rich HTML or structured sections
  coverImage: string;
  coverImageAlt: string;
  category: string;
  tags: string[];
  focusKeyword: string;
  secondaryKeywords: string[];
  metaTitle?: string;
  metaDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogType?: string;
  schemaType?: 'BlogPosting' | 'NewsArticle' | 'TechArticle';
  metaRobots?: 'index, follow' | 'noindex, follow';
  faqItems: SMMBlogFaqItem[];
  keyTakeaways?: string[];
  authorName: string;
  authorRole?: string;
  authorBio?: string;
  reviewedBy?: string;
  readingTimeMinutes: number;
  wordCount?: number;
  seoScore: number; // 0 - 100
  uniquenessScore?: number; // 0 - 100
  internalLinksCount?: number;
  searchIntent?: string;
  keywordDifficulty?: number;
  status: 'published' | 'draft';
  featured?: boolean;
  views: number;
  relatedCategory?: string;
  aiGenerated?: boolean;
  autopilotGenerated?: boolean;
  publishedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface ZiniPayGatewayLog {
  id: string;
  timestamp: number;
  type: 'create_invoice' | 'verify_invoice' | 'trx_verify' | 'trx_confirm' | 'webhook' | 'ping';
  mode: 'sandbox' | 'live';
  status: 'success' | 'error' | 'pending';
  invoiceId?: string;
  transactionId?: string;
  amount?: number;
  latencyMs: number;
  summary: string;
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

