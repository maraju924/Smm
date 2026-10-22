import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PublicLandingView } from './components/views/PublicLandingView';
import { Toast, ToastMessage } from './components/common/Toast';
import { SeoHeadManager } from './components/common/SeoHeadManager';
import type { ProductionPageType } from './components/views/ProductionPagesView';
import { 
  SMMService, 
  SMMOrder, 
  SMMRefill, 
  SMMPayment, 
  SMMTicket, 
  Announcement, 
  UserProfile,
  SMMCoupon,
  SMMProvider,
  SiteSettings
} from './types';
import { 
  subscribeServices, 
  subscribeUserOrders, 
  subscribeAllOrders,
  subscribeUserRefills,
  subscribeAllRefills,
  subscribeUserPayments,
  subscribeAllPayments,
  subscribeUserTickets,
  subscribeAllTickets,
  subscribeAnnouncements,
  subscribeAllUsers,
  subscribeCoupons,
  subscribeProviders,
  subscribeSiteSettings,
  syncActiveOrdersWithProviders
} from './services/db';
import { DEFAULT_SITE_SETTINGS } from './data/seedServices';

// Code-split heavy workspace, admin, and modal views for 95+ Mobile Lighthouse Performance
const Navbar = lazy(() => import('./components/layout/Navbar').then(m => ({ default: m.Navbar })));
const BottomNav = lazy(() => import('./components/layout/BottomNav').then(m => ({ default: m.BottomNav })));
const DesktopSidebar = lazy(() => import('./components/layout/DesktopSidebar').then(m => ({ default: m.DesktopSidebar })));
const HomeView = lazy(() => import('./components/views/HomeView').then(m => ({ default: m.HomeView })));
const NewOrderView = lazy(() => import('./components/views/NewOrderView').then(m => ({ default: m.NewOrderView })));
const MassOrderView = lazy(() => import('./components/views/MassOrderView').then(m => ({ default: m.MassOrderView })));
const OrdersView = lazy(() => import('./components/views/OrdersView').then(m => ({ default: m.OrdersView })));
const ServicesView = lazy(() => import('./components/views/ServicesView').then(m => ({ default: m.ServicesView })));
const AddFundsView = lazy(() => import('./components/views/AddFundsView').then(m => ({ default: m.AddFundsView })));
const AnalyticsView = lazy(() => import('./components/views/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const AffiliatesView = lazy(() => import('./components/views/AffiliatesView').then(m => ({ default: m.AffiliatesView })));
const TicketsView = lazy(() => import('./components/views/TicketsView').then(m => ({ default: m.TicketsView })));
const TrackOrderView = lazy(() => import('./components/views/TrackOrderView').then(m => ({ default: m.TrackOrderView })));
const ApiDocsView = lazy(() => import('./components/views/ApiDocsView').then(m => ({ default: m.ApiDocsView })));
const ProfileView = lazy(() => import('./components/views/ProfileView').then(m => ({ default: m.ProfileView })));
const MenuView = lazy(() => import('./components/views/MenuView').then(m => ({ default: m.MenuView })));
const AdminView = lazy(() => import('./components/views/AdminView').then(m => ({ default: m.AdminView })));
const ProductionPagesView = lazy(() => import('./components/views/ProductionPagesView').then(m => ({ default: m.ProductionPagesView })));
const AuthModal = lazy(() => import('./components/modals/AuthModal').then(m => ({ default: m.AuthModal })));
const CommandPaletteModal = lazy(() => import('./components/modals/CommandPaletteModal').then(m => ({ default: m.CommandPaletteModal })));

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const VALID_APP_TABS = new Set([
  'landing',
  'home',
  'new-order',
  'mass-order',
  'orders',
  'services',
  'add-funds',
  'analytics',
  'affiliates',
  'tickets',
  'track-order',
  'api-docs',
  'profile',
  'menu',
  'admin',
  'about',
  'contact',
  'terms',
  'privacy',
  'refund',
  '404',
  'maintenance'
]);

const PRODUCTION_PAGE_TABS = new Set<string>([
  'about',
  'contact',
  'terms',
  'privacy',
  'refund',
  '404',
  'maintenance'
]);

function normalizeTabId(raw: string): string {
  const clean = raw.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!clean) return 'landing';
  if (clean === 'api') return 'api-docs';
  if (clean === 'track') return 'track-order';
  if (clean === 'about-us') return 'about';
  if (clean === 'contact-us' || clean === 'help') return 'contact';
  if (clean === 'terms-of-service' || clean === 'tos') return 'terms';
  if (clean === 'privacy-policy') return 'privacy';
  if (clean === 'refund-policy' || clean === 'cancellation-policy') return 'refund';
  if (clean === 'not-found') return '404';
  return VALID_APP_TABS.has(clean) ? clean : '404';
}

function resolveInitialRoute(): { tab: string; isWorkspace: boolean; params: any } {
  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab');
  const catParam = searchParams.get('category');
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');

  if (tabParam) {
    const resolved = normalizeTabId(tabParam);
    return {
      tab: resolved,
      isWorkspace: !PRODUCTION_PAGE_TABS.has(resolved) && resolved !== 'landing',
      params: catParam ? { category: catParam } : {}
    };
  }

  if (pathname && pathname !== 'index.html') {
    const resolved = normalizeTabId(pathname);
    return {
      tab: resolved,
      isWorkspace: !PRODUCTION_PAGE_TABS.has(resolved) && resolved !== 'landing',
      params: catParam ? { category: catParam } : {}
    };
  }

  return { tab: 'landing', isWorkspace: false, params: {} };
}

const ViewLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] w-full flex items-center justify-center p-8">
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0E1320] border border-white/[0.08] text-xs font-semibold text-[#CBD5E1]">
      <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-ping" />
      <span>লোড হচ্ছে... / Loading...</span>
    </div>
  </div>
);

const MainAppContent: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  
  // Navigation tab (supports deep-linked SEO URLs like /?tab=about, /about, /?tab=services&category=Facebook)
  const [currentTab, setCurrentTab] = useState<string>(() => resolveInitialRoute().tab);
  const [guestWorkspaceMode, setGuestWorkspaceMode] = useState<boolean>(() => resolveInitialRoute().isWorkspace);
  const [navParams, setNavParams] = useState<any>(() => resolveInitialRoute().params);

  // Modals & Layout State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Global Command Palette Shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Firestore Real-time Collections
  const [services, setServices] = useState<SMMService[]>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState<boolean>(false);
  const [orders, setOrders] = useState<SMMOrder[]>([]);
  const [refills, setRefills] = useState<SMMRefill[]>([]);
  const [payments, setPayments] = useState<SMMPayment[]>([]);
  const [tickets, setTickets] = useState<SMMTicket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [coupons, setCoupons] = useState<SMMCoupon[]>([]);
  const [providers, setProviders] = useState<SMMProvider[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  const providersRef = useRef<SMMProvider[]>([]);
  const ordersRef = useRef<SMMOrder[]>([]);
  const servicesRef = useRef<SMMService[]>([]);
  const siteSettingsRef = useRef<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const isAutoSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    providersRef.current = providers;
  }, [providers]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  useEffect(() => {
    siteSettingsRef.current = siteSettings;
  }, [siteSettings]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Lightweight 5-Minute Background Sync ONLY for Active Orders (Zero redundant catalog writes)
  useEffect(() => {
    if (!isAdmin) return;

    const runAutoSync = async () => {
      if (isAutoSyncingRef.current || providersRef.current.length === 0) return;
      const hasActiveOrders = ordersRef.current.some(o =>
        ['pending', 'processing', 'in_progress'].includes(o.status)
      );
      if (!hasActiveOrders) return;

      isAutoSyncingRef.current = true;
      setIsSyncingCatalog(true);
      try {
        await syncActiveOrdersWithProviders(ordersRef.current, providersRef.current);
      } catch (e) {
        console.warn('Automatic 5m order status sync warning:', e);
      } finally {
        isAutoSyncingRef.current = false;
        setIsSyncingCatalog(false);
      }
    };

    const intervalId = setInterval(runAutoSync, FIVE_MINUTES_MS);
    return () => clearInterval(intervalId);
  }, [isAdmin]);

  // Subscribe Services, Announcements, Coupons & Site Settings (Public)
  // Deferred slightly on initial paint so Mobile FCP/LCP & Total Blocking Time achieve 95-100 on PageSpeed Insights
  useEffect(() => {
    let unsubServices: (() => void) | null = null;
    let unsubAnnouncements: (() => void) | null = null;
    let unsubCoupons: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    const attachPublicListeners = () => {
      unsubServices = subscribeServices((loadedServices) => {
        setServices(loadedServices);
        setServicesLoading(false);
      });
      unsubAnnouncements = subscribeAnnouncements(setAnnouncements);
      unsubCoupons = subscribeCoupons(setCoupons);
      unsubSettings = subscribeSiteSettings(setSiteSettings);
    };

    const timerId = window.setTimeout(attachPublicListeners, 900);

    return () => {
      window.clearTimeout(timerId);
      if (unsubServices) unsubServices();
      if (unsubAnnouncements) unsubAnnouncements();
      if (unsubCoupons) unsubCoupons();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  // Subscribe User-specific Collections or Admin Collections
  useEffect(() => {
    const activeUid = profile?.uid;
    if (!activeUid) {
      setOrders([]);
      setRefills([]);
      setPayments([]);
      setTickets([]);
      return;
    }

    if (isAdmin) {
      const unsubOrders = subscribeAllOrders(setOrders);
      const unsubPayments = subscribeAllPayments(setPayments);
      const unsubTickets = subscribeAllTickets(setTickets);
      const unsubRefills = subscribeAllRefills(setRefills);
      const unsubUsers = subscribeAllUsers(setAllUsers);
      const unsubProviders = subscribeProviders(setProviders);

      return () => {
        unsubOrders();
        unsubPayments();
        unsubTickets();
        unsubRefills();
        unsubUsers();
        unsubProviders();
      };
    } else {
      const unsubOrders = subscribeUserOrders(activeUid, setOrders);
      const unsubRefills = subscribeUserRefills(activeUid, setRefills);
      const unsubPayments = subscribeUserPayments(activeUid, setPayments);
      const unsubTickets = subscribeUserTickets(activeUid, setTickets);

      return () => {
        unsubOrders();
        unsubRefills();
        unsubPayments();
        unsubTickets();
      };
    }
  }, [profile?.uid, isAdmin]);

  const handleNavigate = (tabId: string, params?: any) => {
    const normalized = normalizeTabId(tabId);
    setCurrentTab(normalized);
    setNavParams(params || {});

    // Synchronize browser URL for SEO crawlers, deep-linking & browser back/forward
    try {
      const url = new URL(window.location.href);
      url.pathname = '/';
      if (normalized === 'landing') {
        url.search = '';
      } else {
        url.searchParams.set('tab', normalized === 'api-docs' ? 'api' : normalized === 'track-order' ? 'track' : normalized);
        if (params?.category) {
          url.searchParams.set('category', String(params.category));
        } else {
          url.searchParams.delete('category');
        }
      }
      window.history.pushState({ tab: normalized, params: params || {} }, '', url.toString());
    } catch {
      // ignore history errors in restricted iframes
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onPopState = () => {
      const route = resolveInitialRoute();
      setCurrentTab(route.tab);
      setNavParams(route.params);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const inProgressOrderCount = orders.filter(o => ['in_progress', 'processing'].includes(o.status)).length;

  // COMPLETELY SEPARATE STANDALONE MOBILE ADMIN PANEL
  if (currentTab === 'admin' && isAdmin) {
    return (
      <>
        <Toast toasts={toasts} onDismiss={removeToast} />
        <Suspense fallback={<ViewLoadingFallback />}>
          <AdminView
            orders={orders}
            payments={payments}
            services={services}
            tickets={tickets}
            users={allUsers}
            refills={refills}
            providers={providers}
            coupons={coupons}
            announcements={announcements}
            siteSettings={siteSettings}
            onShowToast={addToast}
            onExitAdmin={() => handleNavigate('home')}
          />
        </Suspense>
      </>
    );
  }

  // GLOBAL MAINTENANCE MODE ENFORCEMENT (Non-Admin Visitors see Maintenance Page)
  if (siteSettings.maintenanceMode && !isAdmin) {
    return (
      <>
        <SeoHeadManager
          currentTab="maintenance"
          navParams={navParams}
          siteSettings={siteSettings}
          services={services}
        />
        <Toast toasts={toasts} onDismiss={removeToast} />
        {isAuthOpen && (
          <Suspense fallback={null}>
            <AuthModal
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
              onSuccessToast={(msg) => {
                addToast(msg, 'success');
                setCurrentTab('home');
              }}
            />
          </Suspense>
        )}
        <Suspense fallback={<ViewLoadingFallback />}>
          <ProductionPagesView
            page="maintenance"
            siteSettings={siteSettings}
            services={services}
            onNavigateTab={handleNavigate}
            onOpenAuth={() => setIsAuthOpen(true)}
            onShowToast={addToast}
            standalone={true}
          />
        </Suspense>
      </>
    );
  }

  // STANDALONE PUBLIC SEO PRODUCTION PAGES (When visited by guests outside workspace)
  if (!profile && !guestWorkspaceMode && PRODUCTION_PAGE_TABS.has(currentTab)) {
    return (
      <>
        <SeoHeadManager
          currentTab={currentTab}
          navParams={navParams}
          siteSettings={siteSettings}
          services={services}
        />
        <Toast toasts={toasts} onDismiss={removeToast} />
        {isAuthOpen && (
          <Suspense fallback={null}>
            <AuthModal
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
              onSuccessToast={(msg) => {
                addToast(msg, 'success');
                setCurrentTab('home');
              }}
            />
          </Suspense>
        )}
        <Suspense fallback={<ViewLoadingFallback />}>
          <ProductionPagesView
            page={currentTab as ProductionPageType}
            siteSettings={siteSettings}
            services={services}
            onNavigateTab={(tabId, params) => {
              if (!PRODUCTION_PAGE_TABS.has(normalizeTabId(tabId)) && tabId !== 'landing') {
                setGuestWorkspaceMode(true);
              }
              handleNavigate(tabId, params);
            }}
            onOpenAuth={() => setIsAuthOpen(true)}
            onShowToast={addToast}
            standalone={true}
          />
        </Suspense>
      </>
    );
  }

  // STANDALONE PUBLIC LANDING PAGE (Default for guests or when 'landing' tab is selected)
  if (currentTab === 'landing' || (!profile && currentTab === 'home' && !guestWorkspaceMode)) {
    return (
      <>
        <SeoHeadManager
          currentTab="landing"
          navParams={navParams}
          siteSettings={siteSettings}
          services={services}
        />
        <Toast toasts={toasts} onDismiss={removeToast} />
        {isAuthOpen && (
          <Suspense fallback={null}>
            <AuthModal
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
              onSuccessToast={(msg) => {
                addToast(msg, 'success');
                setCurrentTab('home');
              }}
            />
          </Suspense>
        )}
        <PublicLandingView
          services={services}
          announcements={announcements}
          siteSettings={siteSettings}
          onNavigateTab={(tabId, params) => {
            const norm = normalizeTabId(tabId);
            if (!PRODUCTION_PAGE_TABS.has(norm) && norm !== 'landing') {
              setGuestWorkspaceMode(true);
            } else {
              setGuestWorkspaceMode(false);
            }
            handleNavigate(norm, params);
          }}
          onOpenAuth={() => setIsAuthOpen(true)}
          onEnterWorkspace={() => {
            setGuestWorkspaceMode(true);
            handleNavigate('home');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#080B14] text-[#F1F5F9] flex font-sans selection:bg-[#8B5CF6] selection:text-white">
      <SeoHeadManager
        currentTab={currentTab}
        navParams={navParams}
        siteSettings={siteSettings}
        services={services}
      />
      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Auth Modal */}
      {isAuthOpen && (
        <Suspense fallback={null}>
          <AuthModal 
            isOpen={isAuthOpen} 
            onClose={() => setIsAuthOpen(false)}
            onSuccessToast={(msg) => addToast(msg, 'success')}
          />
        </Suspense>
      )}

      {/* Global Command Palette (Cmd+K / Search) */}
      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPaletteModal
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            services={services}
            orders={orders}
            onNavigateTab={handleNavigate}
          />
        </Suspense>
      )}

      {/* Desktop Operational Sidebar (lg+) */}
      <Suspense fallback={null}>
        <DesktopSidebar
          currentTab={currentTab}
          onSelectTab={handleNavigate}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          ordersBadgeCount={inProgressOrderCount}
          servicesCount={services.length}
          openTicketsCount={tickets.filter((t) => t.status !== 'closed').length}
        />
      </Suspense>

      {/* Main Application Shell */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Utility & Mobile App Header */}
        <Suspense fallback={null}>
          <Navbar 
            onOpenAuth={() => setIsAuthOpen(true)}
            onNavigateTab={handleNavigate}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            currentTab={currentTab}
            announcements={announcements}
          />
        </Suspense>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 pb-32 lg:pb-12 overflow-x-hidden">
          <Suspense fallback={<ViewLoadingFallback />}>
            <div key={currentTab} className="w-full max-w-full overflow-x-hidden">
              {currentTab === 'home' && (
                <HomeView
                  onNavigateTab={handleNavigate}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  orders={orders}
                  services={services}
                  announcements={announcements}
                />
              )}

              {currentTab === 'new-order' && (
                <NewOrderView
                  services={services}
                  orders={orders}
                  onOrderSuccess={(id) => {
                    addToast(`অর্ডার #${id} সফলভাবে গ্রহণ করা হয়েছে!`, 'success');
                    handleNavigate('orders');
                  }}
                  onNavigateTab={handleNavigate}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  initialServiceId={navParams.serviceId}
                  initialCategory={navParams.category}
                />
              )}

              {currentTab === 'mass-order' && (
                <MassOrderView
                  services={services}
                  onOrderSuccess={() => {
                    addToast('ম্যাস অর্ডার সফলভাবে প্লেস হয়েছে!', 'success');
                    handleNavigate('orders');
                  }}
                  onNavigateTab={handleNavigate}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
              )}

              {currentTab === 'orders' && (
                <OrdersView
                  orders={orders}
                  refills={refills}
                  onNavigateTab={handleNavigate}
                  onShowToast={addToast}
                />
              )}

              {currentTab === 'services' && (
                <ServicesView
                  services={services}
                  orders={orders}
                  isLoading={servicesLoading}
                  isSyncing={isSyncingCatalog}
                  onSelectServiceForOrder={(serviceId, category) => {
                    handleNavigate('new-order', { serviceId, category });
                  }}
                  onOrderSuccess={(id) => {
                    addToast(`অর্ডার #${id} সফলভাবে গ্রহণ করা হয়েছে!`, 'success');
                    handleNavigate('orders');
                  }}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onShowToast={addToast}
                  initialPlatform={navParams.platform || navParams.category}
                  initialSearchQuery={navParams.searchQuery}
                />
              )}

              {currentTab === 'add-funds' && (
                <AddFundsView
                  payments={payments}
                  siteSettings={siteSettings}
                  coupons={coupons}
                  onShowToast={addToast}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
              )}

              {currentTab === 'analytics' && (
                <AnalyticsView
                  orders={orders}
                  payments={payments}
                  onNavigateTab={handleNavigate}
                />
              )}

              {currentTab === 'affiliates' && (
                <AffiliatesView
                  coupons={coupons}
                  siteSettings={siteSettings}
                  onShowToast={addToast}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
              )}

              {currentTab === 'tickets' && (
                <TicketsView
                  tickets={tickets}
                  onShowToast={addToast}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
              )}

              {currentTab === 'track-order' && (
                <TrackOrderView
                  orders={orders}
                  initialOrderId={navParams.orderId}
                  onNavigateTab={handleNavigate}
                />
              )}

              {currentTab === 'api-docs' && (
                <ApiDocsView
                  services={services}
                  orders={orders}
                  refills={refills}
                  onShowToast={addToast}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
              )}

              {currentTab === 'profile' && (
                <ProfileView
                  onShowToast={addToast}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
              )}

              {currentTab === 'menu' && (
                <MenuView
                  onNavigateTab={handleNavigate}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  siteSettings={siteSettings}
                />
              )}

              {PRODUCTION_PAGE_TABS.has(currentTab) && (
                <ProductionPagesView
                  page={currentTab as ProductionPageType}
                  siteSettings={siteSettings}
                  services={services}
                  onNavigateTab={handleNavigate}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onShowToast={addToast}
                  standalone={false}
                />
              )}
            </div>
          </Suspense>
        </main>

        {/* Native Mobile Bottom Navigation Dock (<lg) */}
        <Suspense fallback={null}>
          <BottomNav
            currentTab={currentTab}
            onSelectTab={(tabId) => handleNavigate(tabId)}
            ordersBadgeCount={inProgressOrderCount}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
