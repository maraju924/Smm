import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { HomeView } from './components/views/HomeView';
import { NewOrderView } from './components/views/NewOrderView';
import { MassOrderView } from './components/views/MassOrderView';
import { OrdersView } from './components/views/OrdersView';
import { ServicesView } from './components/views/ServicesView';
import { AddFundsView } from './components/views/AddFundsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AffiliatesView } from './components/views/AffiliatesView';
import { TicketsView } from './components/views/TicketsView';
import { TrackOrderView } from './components/views/TrackOrderView';
import { ApiDocsView } from './components/views/ApiDocsView';
import { ProfileView } from './components/views/ProfileView';
import { MenuView } from './components/views/MenuView';
import { AdminView } from './components/views/AdminView';
import { PublicLandingView } from './components/views/PublicLandingView';
import { AuthModal } from './components/modals/AuthModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { Toast, ToastMessage } from './components/common/Toast';
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
  purgeAllDemoDataFromServer, 
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
  autoSyncAllProvidersEverything
} from './services/db';
import { DEFAULT_SITE_SETTINGS } from './data/seedServices';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const MainAppContent: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  
  // Navigation tab
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [guestWorkspaceMode, setGuestWorkspaceMode] = useState<boolean>(false);
  const [navParams, setNavParams] = useState<any>({});

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

  // Purge any legacy demo records on server when admin is active
  useEffect(() => {
    if (isAdmin) {
      purgeAllDemoDataFromServer();
    }
  }, [isAdmin]);

  // Automatic 5-Minute Background Sync for All API Providers (All Services + Balances + Order Statuses)
  useEffect(() => {
    if (!isAdmin) return;

    const runAutoSync = async () => {
      if (isAutoSyncingRef.current || providersRef.current.length === 0) return;
      isAutoSyncingRef.current = true;
      setIsSyncingCatalog(true);
      try {
        await autoSyncAllProvidersEverything(
          providersRef.current,
          ordersRef.current,
          servicesRef.current,
          siteSettingsRef.current.usdToBdtRate || 122
        );
      } catch (e) {
        console.warn('Automatic 5m provider sync warning:', e);
      } finally {
        isAutoSyncingRef.current = false;
        setIsSyncingCatalog(false);
      }
    };

    const intervalId = setInterval(runAutoSync, FIVE_MINUTES_MS);
    return () => clearInterval(intervalId);
  }, [isAdmin]);

  // Trigger immediate background sync if any connected provider has incomplete catalog (e.g. 100 vs 1046) or is older than 5 minutes
  useEffect(() => {
    if (!isAdmin || providers.length === 0 || isAutoSyncingRef.current) return;

    const needsImmediateFullSync = providers.some(prv => {
      if (prv.status !== 'active' || !prv.apiUrl || !prv.apiKey) return false;
      const localLinkedCount = services.filter(s => s.providerId === prv.id).length;
      const hasMissingCatalogServices =
        prv.totalRemoteServices !== undefined &&
        prv.totalRemoteServices > 0 &&
        localLinkedCount < prv.totalRemoteServices;
      const isStaleSync = !prv.lastSyncAt || Date.now() - prv.lastSyncAt >= FIVE_MINUTES_MS;
      return hasMissingCatalogServices || isStaleSync;
    });

    if (needsImmediateFullSync) {
      isAutoSyncingRef.current = true;
      setIsSyncingCatalog(true);
      autoSyncAllProvidersEverything(
        providers,
        ordersRef.current,
        servicesRef.current,
        siteSettingsRef.current.usdToBdtRate || 122
      )
        .catch(() => {})
        .finally(() => {
          isAutoSyncingRef.current = false;
          setIsSyncingCatalog(false);
        });
    }
  }, [isAdmin, providers.length]);

  // Subscribe Services, Announcements, Coupons & Site Settings (Public)
  useEffect(() => {
    const unsubServices = subscribeServices((loadedServices) => {
      setServices(loadedServices);
      setServicesLoading(false);
    });
    const unsubAnnouncements = subscribeAnnouncements(setAnnouncements);
    const unsubCoupons = subscribeCoupons(setCoupons);
    const unsubSettings = subscribeSiteSettings(setSiteSettings);
    return () => {
      unsubServices();
      unsubAnnouncements();
      unsubCoupons();
      unsubSettings();
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
    setCurrentTab(tabId);
    setNavParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inProgressOrderCount = orders.filter(o => ['in_progress', 'processing'].includes(o.status)).length;

  // COMPLETELY SEPARATE STANDALONE MOBILE ADMIN PANEL
  if (currentTab === 'admin' && isAdmin) {
    return (
      <>
        <Toast toasts={toasts} onDismiss={removeToast} />
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
      </>
    );
  }

  // STANDALONE PUBLIC LANDING PAGE (Default for guests or when 'landing' tab is selected)
  if (currentTab === 'landing' || (!profile && currentTab === 'home' && !guestWorkspaceMode)) {
    return (
      <>
        <Toast toasts={toasts} onDismiss={removeToast} />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccessToast={(msg) => {
            addToast(msg, 'success');
            setCurrentTab('home');
          }}
        />
        <PublicLandingView
          services={services}
          announcements={announcements}
          siteSettings={siteSettings}
          onNavigateTab={(tabId, params) => {
            setGuestWorkspaceMode(true);
            handleNavigate(tabId === 'api' ? 'api-docs' : tabId, params);
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
      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)}
        onSuccessToast={(msg) => addToast(msg, 'success')}
      />

      {/* Global Command Palette (Cmd+K / Search) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        services={services}
        orders={orders}
        onNavigateTab={handleNavigate}
      />

      {/* Desktop Operational Sidebar (lg+) */}
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

      {/* Main Application Shell */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Utility & Mobile App Header */}
        <Navbar 
          onOpenAuth={() => setIsAuthOpen(true)}
          onNavigateTab={handleNavigate}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          currentTab={currentTab}
          announcements={announcements}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 pb-32 lg:pb-12 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-full max-w-full overflow-x-hidden"
            >
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
                  initialPlatform={navParams.platform}
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
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Native Mobile Bottom Navigation Dock (<lg) */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tabId) => handleNavigate(tabId)}
          ordersBadgeCount={inProgressOrderCount}
        />
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
