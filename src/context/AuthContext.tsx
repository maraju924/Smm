import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  browserPopupRedirectResolver,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, clearStaleFirebaseAuthEvents } from '../firebase/config';
import { UserProfile, Currency, Language } from '../types';
import {
  handleFirestoreError,
  OperationType,
  isFirestoreQuotaExhausted,
  isQuotaError,
  markFirestoreQuotaExhausted
} from '../firebase/error-handler';
import { sanitizeForFirestore, applyReferralCode } from '../services/db';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserBalance: (delta: number) => Promise<void>;
  formatPrice: (amountInBDT: number) => string;
  t: (bn: string, en: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BDT_TO_USD_RATE = 122; // 1 USD = 122 BDT
const SUPER_ADMIN_EMAILS = ['maraju921@gmail.com'];

const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email.toLowerCase());
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // In-memory state synced directly with Firestore server user profile (zero browser localStorage)
  const [currency, setCurrencyState] = useState<Currency>('BDT');
  const [language, setLanguageState] = useState<Language>('bn');
  const [darkMode, setDarkModeState] = useState<boolean>(true);

  // Purge any leftover browser localStorage keys from previous versions on mount
  useEffect(() => {
    try {
      localStorage.removeItem('amartrend_demo_user');
      localStorage.removeItem('amartrend_currency');
      localStorage.removeItem('amartrend_lang');
      localStorage.removeItem('amartrend_theme');
    } catch {
      // Ignore if storage is restricted
    }
  }, []);

  const setCurrency = async (c: Currency) => {
    if (c === currency) return;
    setCurrencyState(c);
    if (user && !isFirestoreQuotaExhausted()) {
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
          currency: c,
          updatedAt: Date.now()
        }), { merge: true });
      } catch (e) {
        if (isQuotaError(e)) markFirestoreQuotaExhausted();
      }
    }
  };

  const setLanguage = async (l: Language) => {
    if (l === language) return;
    setLanguageState(l);
    if (user && !isFirestoreQuotaExhausted()) {
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
          language: l,
          updatedAt: Date.now()
        }), { merge: true });
      } catch (e) {
        if (isQuotaError(e)) markFirestoreQuotaExhausted();
      }
    }
  };

  const setDarkMode = async (d: boolean) => {
    if (d === darkMode) return;
    setDarkModeState(d);
    if (d) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (user && !isFirestoreQuotaExhausted()) {
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
          darkMode: d,
          updatedAt: Date.now()
        }), { merge: true });
      } catch (e) {
        if (isQuotaError(e)) markFirestoreQuotaExhausted();
      }
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Real-time Firebase Authentication & Server Profile Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          localStorage.setItem('amartrend_auth_active', '1');
        } catch {
          // Ignore if storage is restricted
        }

        const isEmailAdmin = isSuperAdminEmail(currentUser.email);
        // Set immediate optimistic profile so logged-in users go straight to Dashboard with zero delay
        setProfile((prev) => prev || {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User'),
          photoURL: currentUser.photoURL || '',
          balance: 0,
          totalSpent: 0,
          role: isEmailAdmin ? 'admin' : 'user',
          currency: 'BDT',
          language: 'bn',
          darkMode: true,
          apiKey: '',
          referralCode: `BL-${currentUser.uid.substring(0, 6).toUpperCase()}`,
          referralCount: 0,
          referralEarnings: 0,
          unpaidReferralEarnings: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        const userRef = doc(db, 'users', currentUser.uid);
        
        const unSubDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;

            if (isEmailAdmin && data.role !== 'admin' && !isFirestoreQuotaExhausted()) {
              try {
                await setDoc(userRef, { role: 'admin' }, { merge: true });
                await setDoc(doc(db, 'admins', currentUser.uid), {
                  email: currentUser.email,
                  active: true
                }, { merge: true });
              } catch (e) {
                if (isQuotaError(e)) markFirestoreQuotaExhausted();
              }
            }

            if (data.currency) setCurrencyState(data.currency);
            if (data.language) setLanguageState(data.language);
            if (data.darkMode !== undefined) setDarkModeState(data.darkMode);

            const normalizedRefCode =
              data.referralCode && !data.referralCode.startsWith('AMT-')
                ? data.referralCode
                : `BL-${currentUser.uid.substring(0, 6).toUpperCase()}`;

            setProfile({
              ...data,
              referralCode: normalizedRefCode,
              role: isEmailAdmin ? 'admin' : data.role
            });
          } else {
            // Create clean production user document on server (0 starter balance, no fake funds)
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User'),
              photoURL: currentUser.photoURL || '',
              balance: 0,
              totalSpent: 0,
              role: isEmailAdmin ? 'admin' : 'user',
              currency: 'BDT',
              language: 'bn',
              darkMode: true,
              apiKey: 'amt_live_' + Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join(''),
              referralCode: `BL-${currentUser.uid.substring(0, 6).toUpperCase()}`,
              referralCount: 0,
              referralEarnings: 0,
              unpaidReferralEarnings: 0,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };

            if (!isFirestoreQuotaExhausted()) {
              try {
                await setDoc(userRef, sanitizeForFirestore(newProfile));
                await setDoc(doc(db, 'api_keys', newProfile.apiKey), {
                  uid: currentUser.uid,
                  updatedAt: Date.now()
                }, { merge: true });
                if (isEmailAdmin) {
                  await setDoc(doc(db, 'admins', currentUser.uid), {
                    email: currentUser.email,
                    active: true
                  }, { merge: true });
                }
                // Automatically link referral code if user signed up with a referral code
                try {
                  const pendingRefCode = sessionStorage.getItem('boostlagbe_ref_code');
                  if (pendingRefCode && pendingRefCode.trim()) {
                    await applyReferralCode(newProfile, pendingRefCode.trim());
                  }
                } catch {
                  // Ignore invalid or expired referral code during signup
                }
              } catch (err) {
                if (isQuotaError(err)) markFirestoreQuotaExhausted();
              }
            }
            setProfile(newProfile);
          }
          setLoading(false);
        }, () => {
          setLoading(false);
        });

        return () => unSubDoc();
      } else {
        try {
          localStorage.removeItem('amartrend_auth_active');
        } catch {
          // Ignore if storage is restricted
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const popupInFlightRef = useRef(false);

  const signInWithGoogle = async () => {
    if (popupInFlightRef.current) return;
    popupInFlightRef.current = true;
    try {
      clearStaleFirebaseAuthEvents();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (err: any) {
      clearStaleFirebaseAuthEvents();
      const msg = String(err?.message || '');
      const code = String(err?.code || '');
      if (
        msg.includes('INTERNAL ASSERTION FAILED') ||
        msg.includes('Pending promise was never set') ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user'
      ) {
        throw new Error(
          language === 'bn'
            ? 'গুগল পপ-আপ বন্ধ হয়ে গেছে বা ব্লক হয়েছে। আবার চেষ্টা করুন অথবা ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।'
            : 'Google sign-in popup was closed or blocked. Please try again or use Email & Password.'
        );
      }
      throw err;
    } finally {
      popupInFlightRef.current = false;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    setProfile(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
  };

  const updateUserBalance = async (delta: number) => {
    if (!profile || !user) return;
    const newBalance = Math.max(0, Number((profile.balance + delta).toFixed(2)));
    const newTotalSpent = delta < 0
      ? Number((profile.totalSpent + Math.abs(delta)).toFixed(2))
      : profile.totalSpent;

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, sanitizeForFirestore({
        balance: newBalance,
        totalSpent: newTotalSpent,
        updatedAt: Date.now()
      }), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const formatPrice = (amountInBDT: number): string => {
    if (currency === 'USD') {
      const usdVal = amountInBDT / BDT_TO_USD_RATE;
      return `$${usdVal.toFixed(2)}`;
    }
    return `৳${amountInBDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const t = (bn: string, en: string): string => (language === 'bn' ? bn : en);

  const isAdmin = profile?.role === 'admin' || isSuperAdminEmail(user?.email);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        currency,
        setCurrency,
        language,
        setLanguage,
        darkMode,
        setDarkMode,
        signInWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        updateUserBalance,
        formatPrice,
        t
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
