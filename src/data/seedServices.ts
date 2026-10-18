import { SiteSettings } from '../types';

/**
 * Clean production default site settings.
 * All values are managed and persisted in Firestore (`settings/global`).
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
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
  updatedAt: Date.now()
};

/**
 * List of legacy demo document IDs to purge from Firestore server
 * so the production database contains 0 demo records.
 */
export const LEGACY_DEMO_IDS = {
  services: [
    'fb-101', 'fb-102', 'fb-103', 'fb-104', 'fb-105',
    'ig-201', 'ig-202', 'ig-203',
    'yt-301', 'yt-302', 'yt-303',
    'tt-401', 'tt-402', 'tt-403',
    'tg-501', 'tg-502',
    'tw-601',
    'api-err-901', 'api-err-902', 'api-err-903',
    'api-jap-901', 'api-jap-902', 'api-jap-903'
  ],
  announcements: ['ann-1', 'ann-2'],
  coupons: ['cp-welcome', 'cp-eid', 'cp-pro'],
  providers: ['prv-peakerr', 'prv-jap'],
  users: ['demo_user_101', 'demo_admin_777']
};
