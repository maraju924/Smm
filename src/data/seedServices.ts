import { SMMService, SMMCoupon, SMMProvider, SiteSettings } from '../types';

export const BRAND_LOGO_URL = '/assets/aistudio/file_00000000117c8208a1cede2cdfee706a_42e73997.png';

/**
 * Researched #1 Google Bangladesh Brand & SMM Keyword Matrix for Boostlagbe.com
 * Includes exact Bengali, English, Banglish, and phonetic variations so Boostlagbe.com ranks #1
 */
export const BD_MAIN_SEO_KEYWORD = 'Boostlagbe.com – বুস্ট লাগবে | #1 bKash Nagad SMM Panel Bangladesh';

export const BD_SUB_SEO_KEYWORDS: string[] = [
  'বুস্টলাগবে',
  'বুস্ট লাগবে',
  'বুস্ট লাগবে ডট কম',
  'বুস্টলাগবে ডট কম',
  'boostlagbe.com',
  'boost lagbe',
  'boost lagbe.com',
  'boost lagobe',
  'boostlagobe.com',
  'boost lagbe bd',
  'boostlagbe smm panel',
  'ফেসবুক বুস্ট লাগবে',
  'টিকটক ও ইউটিউব বুস্ট লাগবে',
  'বিকাশ ও নগদে বুস্ট লাগবে',
  'Cheapest bKash Nagad SMM Panel Bangladesh',
  'bKash Auto Payment SMM Panel BD',
  'Nagad Instant Deposit SMM Panel Bangladesh',
  'Facebook Page Monetization Watchtime Boost BD',
  'Buy Non Drop Facebook Followers Bangladesh bKash',
  'Facebook 60k Minutes Watchtime Service BD',
  'TikTok Views & Followers Boost Bangladesh bKash',
  'YouTube 4000 Hours Watchtime & Subscribers Panel BD',
  'Instagram Followers & Reels Boost Bangladesh',
  'Telegram Channel Members Boost BD SMM Panel',
  'Wholesale SMM Reseller API v2 Provider BD',
  'কম দামে ফেসবুক ফলোয়ার ও ওয়াচটাইম কিনুন বিকাশ নগদে'
];

export const DEFAULT_BD_SEO_KEYWORDS_STRING = [
  BD_MAIN_SEO_KEYWORD,
  ...BD_SUB_SEO_KEYWORDS
].join(', ');

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'Boostlagbe.com',
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
  seoTitle: 'Boostlagbe.com (বুস্ট লাগবে) – #1 bKash Nagad SMM Panel Bangladesh',
  seoDescription:
    'Boostlagbe.com (বুস্টলাগবে / বুস্ট লাগবে ডট কম) — বাংলাদেশের ১ নম্বর ও সবচেয়ে কম দামে অটোমেটিক SMM Panel। বিকাশ ও নগদে তাৎক্ষণিক ডিপোজিট করে Facebook Page Monetization, 60k Watchtime, Non-Drop Followers, YouTube 4000h Watchtime ও TikTok Views নিন।',
  seoKeywords: DEFAULT_BD_SEO_KEYWORDS_STRING,
  seoCanonicalDomain: 'https://boostlagbe.com',
  googleSiteVerification: 'w7Ug6xh6chsouuQ8WzhrdMJ1KvTELUYnYZBG1KAJJrE',
  googleAnalyticsId: '',
  seoOgImage: BRAND_LOGO_URL,
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

