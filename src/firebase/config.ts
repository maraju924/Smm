import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  type Auth
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal @firebase/firestore SDK backoff/quota console error spam
try {
  setLogLevel('silent');
} catch {
  // ignore
}

/**
 * Purges orphaned Firebase Auth popup/redirect event keys in Web Storage
 * that cause "@firebase/auth: INTERNAL ASSERTION FAILED: Pending promise was never set"
 * when an iframe reloads or cancels a popup flow.
 */
export function clearStaleFirebaseAuthEvents(): void {
  if (typeof window === 'undefined') return;
  try {
    const storages = [window.sessionStorage, window.localStorage];
    for (const storage of storages) {
      if (!storage) continue;
      const keysToDelete: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (
          key &&
          (key.includes('firebase:AuthEvent') ||
            key.includes('firebase:pendingRedirect') ||
            key.includes('firebase:redirectUser') ||
            key.includes('firebase:popup'))
        ) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        storage.removeItem(key);
      }
    }
  } catch {
    // ignore storage access errors in restricted iframes
  }
}

// 1. Clean any stale popup/redirect events BEFORE initializing Firebase Auth
clearStaleFirebaseAuthEvents();

// 2. Guard against uncaught Firebase Auth popup assertion errors in restricted iframes
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      const msg = String(event?.message || event?.error?.message || '');
      if (msg.includes('Pending promise was never set') || msg.includes('INTERNAL ASSERTION FAILED')) {
        clearStaleFirebaseAuthEvents();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const msg = String(event?.reason?.message || event?.reason || '');
      if (msg.includes('Pending promise was never set') || msg.includes('INTERNAL ASSERTION FAILED')) {
        clearStaleFirebaseAuthEvents();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function createCleanAuthInstance(): Auth {
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence
      ],
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createCleanAuthInstance();

// Critical constraint: Test connection on initial boot (deferred after first paint for 95+ Lighthouse Performance)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration or network.');
    }
  }
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    void testConnection();
  }, 2000);
}
