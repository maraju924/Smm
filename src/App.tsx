import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { HomeView } from './components/views/HomeView';
import { NewOrderView } from './components/views/NewOrderView';
import { MassOrderView } from './components/views/MassOrderView';
import { OrdersView } from './components/views/OrdersView';
import { ServicesView } from './components/views/ServicesView';
import { AddFundsView } from './components/views/AddFundsView';
import { AffiliatesView } from './components/views/AffiliatesView';
import { TicketsView } from './components/views/TicketsView';
import { TrackOrderView } from './components/views/TrackOrderView';
import { ApiDocsView } from './components/views/ApiDocsView';
import { ProfileView } from './components/views/ProfileView';
import { MenuView } from './components/views/MenuView';
import { AdminView } from './components/views/AdminView';
import { AuthModal } from './components/modals/AuthModal';
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
  subscribeSiteSettings
} from './services/db';
import { DEFAULT_SITE_SETTINGS } from './data/seedServices';

const MainAppContent: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  
  // Navigation tab
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [navParams, setNavParams] = useState<any>({});

  // Modals & Notifications
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Firestore Real-time Collections
  const [services, setServices] = useState<SMMService[]>([]);
  const [orders, setOrders] = useState<SMMOrder[]>([]);
  const [refills, setRefills] = useState<SMMRefill[]>([]);
  const [payments, setPayments] = useState<SMMPayment[]>([]);
  const [tickets, setTickets] = useState<SMMTicket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [coupons, setCoupons] = useState<SMMCoupon[]>([]);
  const [providers, setProviders] = useState<SMMProvider[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

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

  // Subscribe Services, Announcements, Coupons & Site Settings (Public)
  useEffect(() => {
    const unsubServices = subscribeServices(setServices);
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
    if (params) setNavParams(params);
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

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white transition-colors duration-200">
      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)}
        onSuccessToast={(msg) => addToast(msg, 'success')}
      />

      {/* Top Navbar */}
      <Navbar 
        onOpenAuth={() => setIsAuthOpen(true)}
        onNavigateTab={handleNavigate}
        currentTab={currentTab}
        announcements={announcements}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 pb-32 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
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
                onSelectServiceForOrder={(serviceId, category) => {
                  handleNavigate('new-order', { serviceId, category });
                }}
                initialPlatform={navParams.platform}
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

      {/* Fluid Native Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tabId) => handleNavigate(tabId)}
        ordersBadgeCount={inProgressOrderCount}
      />
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
