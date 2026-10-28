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
  getDoc,
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
const EMAIL_SESSION_STORAGE_KEY = 'boostlagbe_email_session';

const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email.toLowerCase());
};

async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback hash if subtle crypto is unavailable
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

async function deriveEmailUid(email: string): Promise<string> {
  const clean = email.trim().toLowerCase();
  const hex = await sha256Hex(`boostlagbe_uid_v1:${clean}`);
  return `usr_${hex.substring(0, 24)}`;
}

async function hashEmailPassword(email: string, password: string): Promise<string> {
  const clean = email.trim().toLowerCase();
  return sha256Hex(`boostlagbe_pw_v1:${clean}:${password}`);
}

function createSyntheticFirebaseUser(uid: string, email: string, displayName: string): User {
  return {
    uid,
    email,
    displayName,
    photoURL: '',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [{ providerId: 'password', uid: email, displayName, email, phoneNumber: null, photoURL: null }],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({ uid, email, displayName }),
    phoneNumber: null,
    providerId: 'password'
  } as unknown as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const activeProfileUnsubRef = useRef<(() => void) | null>(null);

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

  const attachUserProfileListener = (activeUser: User, isNativeFirebaseAuth: boolean) => {
    if (activeProfileUnsubRef.current) {
      activeProfileUnsubRef.current();
      activeProfileUnsubRef.current = null;
    }

    try {
      localStorage.setItem('amartrend_auth_active', '1');
    } catch {
      // Ignore if storage is restricted
    }

    const isEmailAdmin = isNativeFirebaseAuth && isSuperAdminEmail(activeUser.email);
    setUser(activeUser);

    setProfile((prev) => prev || {
      uid: activeUser.uid,
      email: activeUser.email || '',
      displayName: activeUser.displayName || (activeUser.email ? activeUser.email.split('@')[0] : 'User'),
      photoURL: activeUser.photoURL || '',
      balance: 0,
      totalSpent: 0,
      role: isEmailAdmin ? 'admin' : 'user',
      currency: 'BDT',
      language: 'bn',
      darkMode: true,
      apiKey: '',
      referralCode: `BL-${activeUser.uid.replace(/^usr_/, '').substring(0, 6).toUpperCase()}`,
      referralCount: 0,
      referralEarnings: 0,
      unpaidReferralEarnings: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const userRef = doc(db, 'users', activeUser.uid);

    const unSubDoc = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;

        if (isEmailAdmin && data.role !== 'admin' && !isFirestoreQuotaExhausted()) {
          try {
            await setDoc(userRef, { role: 'admin' }, { merge: true });
            await setDoc(doc(db, 'admins', activeUser.uid), {
              email: activeUser.email,
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
            : `BL-${activeUser.uid.replace(/^usr_/, '').substring(0, 6).toUpperCase()}`;

        setProfile({
          ...data,
          referralCode: normalizedRefCode,
          role: isEmailAdmin ? 'admin' : data.role
        });
      } else {
        // Create clean production user document on server (0 starter balance, no fake funds)
        const newProfile: UserProfile = {
          uid: activeUser.uid,
          email: activeUser.email || '',
          displayName: activeUser.displayName || (activeUser.email ? activeUser.email.split('@')[0] : 'User'),
          photoURL: activeUser.photoURL || '',
          balance: 0,
          totalSpent: 0,
          role: isEmailAdmin ? 'admin' : 'user',
          currency: 'BDT',
          language: 'bn',
          darkMode: true,
          apiKey: 'amt_live_' + Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join(''),
          referralCode: `BL-${activeUser.uid.replace(/^usr_/, '').substring(0, 6).toUpperCase()}`,
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
              uid: activeUser.uid,
              updatedAt: Date.now()
            }, { merge: true });
            if (isEmailAdmin) {
              await setDoc(doc(db, 'admins', activeUser.uid), {
                email: activeUser.email,
                active: true
              }, { merge: true });
            }
            // Automatically link referral code if user signed up with a referral code
            try {
              const pendingRefCode = sessionStorage.getItem('boostlagbe_ref_code');
              if (pendingRefCode && pendingRefCode.trim()) {
                await applyReferralCode(pendingRefCode.trim(), newProfile);
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

    activeProfileUnsubRef.current = unSubDoc;
  };

  // Real-time Firebase Authentication & Server Profile Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          localStorage.removeItem(EMAIL_SESSION_STORAGE_KEY);
        } catch {
          // ignore
        }
        attachUserProfileListener(currentUser, true);
      } else {
        // Check if there is an active Firestore-backed Email/Password session
        let restoredEmailUser: User | null = null;
        try {
          const rawSession = localStorage.getItem(EMAIL_SESSION_STORAGE_KEY);
          if (rawSession) {
            const parsed = JSON.parse(rawSession);
            if (parsed?.uid && parsed?.email) {
              restoredEmailUser = createSyntheticFirebaseUser(
                String(parsed.uid),
                String(parsed.email),
                String(parsed.displayName || parsed.email.split('@')[0])
              );
            }
          }
        } catch {
          // ignore invalid session JSON
        }

        if (restoredEmailUser) {
          attachUserProfileListener(restoredEmailUser, false);
        } else {
          if (activeProfileUnsubRef.current) {
            activeProfileUnsubRef.current();
            activeProfileUnsubRef.current = null;
          }
          try {
            localStorage.removeItem('amartrend_auth_active');
          } catch {
            // Ignore if storage is restricted
          }
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
      if (activeProfileUnsubRef.current) {
        activeProfileUnsubRef.current();
        activeProfileUnsubRef.current = null;
      }
    };
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
    const cleanEmail = email.trim().toLowerCase();
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      return;
    } catch (err: any) {
      const code = String(err?.code || '');
      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/configuration-not-found' ||
        code === 'auth/admin-restricted-operation' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found'
      ) {
        const uid = await deriveEmailUid(cleanEmail);
        const pwHash = await hashEmailPassword(cleanEmail, password);
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          const notFoundErr: any = new Error('Invalid email or password');
          notFoundErr.code = 'auth/invalid-credential';
          throw notFoundErr;
        }

        const data = snap.data() as any;
        if (!data.passwordHash || data.passwordHash !== pwHash) {
          const wrongPwErr: any = new Error('Invalid email or password');
          wrongPwErr.code = 'auth/wrong-password';
          throw wrongPwErr;
        }

        const displayName = data.displayName || cleanEmail.split('@')[0];
        try {
          localStorage.setItem(
            EMAIL_SESSION_STORAGE_KEY,
            JSON.stringify({ uid, email: cleanEmail, displayName })
          );
          localStorage.setItem('amartrend_auth_active', '1');
        } catch {
          // ignore storage restriction
        }

        const synthUser = createSyntheticFirebaseUser(uid, cleanEmail, displayName);
        attachUserProfileListener(synthUser, false);
        return;
      }
      throw err;
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
        await setDoc(
          doc(db, 'users', cred.user.uid),
          sanitizeForFirestore({ displayName: cleanName, updatedAt: Date.now() }),
          { merge: true }
        );
      }
      return;
    } catch (err: any) {
      const code = String(err?.code || '');
      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/configuration-not-found' ||
        code === 'auth/admin-restricted-operation'
      ) {
        const uid = await deriveEmailUid(cleanEmail);
        const pwHash = await hashEmailPassword(cleanEmail, password);
        const userRef = doc(db, 'users', uid);
        const existingSnap = await getDoc(userRef);

        if (existingSnap.exists()) {
          const existsErr: any = new Error('Email already in use');
          existsErr.code = 'auth/email-already-in-use';
          throw existsErr;
        }

        const newProfile: UserProfile & { passwordHash: string } = {
          uid,
          email: cleanEmail,
          displayName: cleanName || cleanEmail.split('@')[0],
          photoURL: '',
          balance: 0,
          totalSpent: 0,
          role: 'user',
          currency: 'BDT',
          language: 'bn',
          darkMode: true,
          apiKey:
            'amt_live_' +
            Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join(''),
          referralCode: `BL-${uid.replace(/^usr_/, '').substring(0, 6).toUpperCase()}`,
          referralCount: 0,
          referralEarnings: 0,
          unpaidReferralEarnings: 0,
          passwordHash: pwHash,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await setDoc(userRef, sanitizeForFirestore(newProfile));
        await setDoc(
          doc(db, 'api_keys', newProfile.apiKey),
          {
            uid,
            updatedAt: Date.now()
          },
          { merge: true }
        );

        try {
          const pendingRefCode = sessionStorage.getItem('boostlagbe_ref_code');
          if (pendingRefCode && pendingRefCode.trim()) {
            await applyReferralCode(pendingRefCode.trim(), newProfile);
          }
        } catch {
          // Ignore invalid referral code on signup
        }

        try {
          localStorage.setItem(
            EMAIL_SESSION_STORAGE_KEY,
            JSON.stringify({ uid, email: cleanEmail, displayName: newProfile.displayName })
          );
          localStorage.setItem('amartrend_auth_active', '1');
        } catch {
          // ignore storage restriction
        }

        const synthUser = createSyntheticFirebaseUser(uid, cleanEmail, newProfile.displayName);
        attachUserProfileListener(synthUser, false);
        return;
      }
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      const code = String(err?.code || '');
      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/configuration-not-found' ||
        code === 'auth/admin-restricted-operation'
      ) {
        // Verify the account exists in Firestore
        const uid = await deriveEmailUid(cleanEmail);
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) {
          const notFoundErr: any = new Error('User not found');
          notFoundErr.code = 'auth/user-not-found';
          throw notFoundErr;
        }
        return;
      }
      throw err;
    }
  };

  const logout = async () => {
    if (activeProfileUnsubRef.current) {
      activeProfileUnsubRef.current();
      activeProfileUnsubRef.current = null;
    }
    try {
      localStorage.removeItem(EMAIL_SESSION_STORAGE_KEY);
      localStorage.removeItem('amartrend_auth_active');
    } catch {
      // ignore
    }
    setUser(null);
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
