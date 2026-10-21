import { SMMService, SMMCoupon, SMMProvider, SiteSettings } from '../types';

/**
 * Researched Low-Competition High-Intent Bangladesh SMM Keyword Matrix
 * 1 Main Primary Keyword + 15 Targeted Sub-Keywords (English + Bengali + Banglish)
 */
export const BD_MAIN_SEO_KEYWORD = 'Cheapest bKash Nagad SMM Panel Bangladesh';

export const BD_SUB_SEO_KEYWORDS: string[] = [
  'bKash Auto Payment SMM Panel BD',
  'Nagad Instant Deposit SMM Panel Bangladesh',
  'Facebook Page Monetization Watchtime Boost BD',
  'Buy Non Drop Facebook Followers Bangladesh bKash',
  'Facebook 60k Minutes Watchtime Service BD',
  'Facebook Reels Views & Profile Followers Boost BD',
  'TikTok Views & Followers Boost Bangladesh bKash',
  'YouTube 4000 Hours Watchtime & Subscribers Panel BD',
  'Instagram Followers & Reels Boost Bangladesh',
  'Telegram Channel Members Boost BD SMM Panel',
  'ZiniPay Automated SMM Panel Bangladesh',
  'Wholesale SMM Reseller API v2 Provider BD',
  'কম দামে ফেসবুক ফলোয়ার ও ওয়াচটাইম কিনুন বিকাশ নগদে',
  'বাংলাদেশি অটোমেটিক এসএমএম প্যানেল বিকাশ পেমেন্ট',
  'ইউটিউব মনিটাইজেশন সাবস্ক্রাইবার ও টিকটক ভিউ বুস্ট বাংলাদেশ'
];

export const DEFAULT_BD_SEO_KEYWORDS_STRING = [
  BD_MAIN_SEO_KEYWORD,
  ...BD_SUB_SEO_KEYWORDS
].join(', ');

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'AmarTrend SMM',
  bkashNumber: '',
  nagadNumber: '',
  rocketNumber: '',
  upayNumber: '',
  usdtAddress: '',
  bkashBonusPercent: 0,
  nagadBonusPercent: 0,
  usdtBonusPercent: 0,
  minDepositForBonus: 500,
  whatsappUrl: '',
  telegramUrl: '',
  referralCommissionPercent: 5,
  minAffiliatePayout: 100,
  maintenanceMode: false,
  usdToBdtRate: 122,
  zinipayEnabled: true,
  zinipayMode: 'sandbox',
  zinipayApiKey: '',
  zinipayBaseUrl: 'https://api.zinipay.com',
  zinipayBrandDomain: '',
  zinipayBonusPercent: 3,
  zinipayAutoVerifyTrx: true,
  zinipayFeePassToUser: false,
  zinipayFeePercent: 0,
  seoTitle: 'AmarTrend SMM – #1 Cheapest bKash Nagad SMM Panel Bangladesh',
  seoDescription:
    'বাংলাদেশের সেরা ও সবচেয়ে কম দামে অটোমেটিক SMM Panel। বিকাশ ও নগদে তাৎক্ষণিক ডিপোজিট করে Facebook Page Monetization, 60k Watchtime, Non-Drop Followers, YouTube 4000h Watchtime ও TikTok Views নিন।',
  seoKeywords: DEFAULT_BD_SEO_KEYWORDS_STRING,
  seoCanonicalDomain: '',
  googleSiteVerification: '',
  googleAnalyticsId: '',
  seoOgImage: '',
  updatedAt: 0
};

export const INITIAL_SERVICES: SMMService[] = [];
export const INITIAL_PROVIDERS: SMMProvider[] = [];
export const INITIAL_COUPONS: SMMCoupon[] = [];

export const LEGACY_DEMO_IDS = {
  services: [
    'srv-101',
    'srv-102',
    'srv-201',
    'srv-202',
    'srv-301',
    'srv-302',
    'srv-401',
    'srv-501'
  ],
  providers: ['prv-1', 'prv-2'],
  coupons: ['cpn-1', 'cpn-2'],
  announcements: ['ann-1', 'ann-2'],
  orders: ['ORD-982341', 'ORD-847120', 'ORD-761239'],
  payments: ['DEP-551920', 'DEP-448120'],
  tickets: ['TCK-10492'],
  users: ['demo-user-1', 'demo-user-2']
};

