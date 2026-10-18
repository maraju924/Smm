import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
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
import { auth, db } from '../firebase/config';
import { UserProfile, Currency, Language } from '../types';
import { handleFirestoreError, OperationType } from '../firebase/error-handler';
import { sanitizeForFirestore } from '../services/db';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BDT_TO_USD_RATE = 122; // 1 USD = 122 BDT
const SUPER_ADMIN_EMAILS = ['maraju924@gmail.com', 'maraju921@gmail.com'];

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
    setCurrencyState(c);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
          currency: c,
          updatedAt: Date.now()
        }), { merge: true });
      } catch (e) {
        console.error('Failed to sync currency preference to server:', e);
      }
    }
  };

  const setLanguage = async (l: Language) => {
    setLanguageState(l);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
          language: l,
          updatedAt: Date.now()
        }), { merge: true });
      } catch (e) {
        console.error('Failed to sync language preference to server:', e);
      }
    }
  };

  const setDarkMode = async (d: boolean) => {
    setDarkModeState(d);
    if (d) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
          darkMode: d,
          updatedAt: Date.now()
        }), { merge: true });
      } catch (e) {
        console.error('Failed to sync theme preference to server:', e);
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
        const userRef = doc(db, 'users', currentUser.uid);
        
        const unSubDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const isEmailAdmin = isSuperAdminEmail(currentUser.email);

            if (isEmailAdmin && data.role !== 'admin') {
              try {
                await setDoc(userRef, { role: 'admin' }, { merge: true });
                await setDoc(doc(db, 'admins', currentUser.uid), {
                  email: currentUser.email,
                  active: true
                }, { merge: true });
              } catch (e) {
                console.error('Error upgrading admin doc:', e);
              }
            }

            if (data.currency) setCurrencyState(data.currency);
            if (data.language) setLanguageState(data.language);
            if (data.darkMode !== undefined) setDarkModeState(data.darkMode);

            // Sync API key lookup index on server for external /api/v2 requests
            if (data.apiKey) {
              setDoc(doc(db, 'api_keys', data.apiKey), {
                uid: currentUser.uid,
                updatedAt: Date.now()
              }, { merge: true }).catch(() => {});
            }

            setProfile({
              ...data,
              referralCode: data.referralCode || `AMT-${currentUser.uid.substring(0, 6).toUpperCase()}`,
              role: isEmailAdmin ? 'admin' : data.role
            });
          } else {
            // Create clean production user document on server (0 starter balance, no fake funds)
            const isEmailAdmin = isSuperAdminEmail(currentUser.email);
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
              referralCode: `AMT-${currentUser.uid.substring(0, 6).toUpperCase()}`,
              referralCount: 0,
              referralEarnings: 0,
              unpaidReferralEarnings: 0,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };

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
              setProfile(newProfile);
            } catch (err) {
              console.error('Failed to create user profile on server:', err);
              setProfile(newProfile);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error('User doc snapshot error:', error);
          setLoading(false);
        });

        return () => unSubDoc();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
        formatPrice
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
