// lib/firebaseClient.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

/**
 * Firebase app and auth. Deliberately no Firestore or Storage.
 *
 * This file used to also create `db` and `storage` at module scope. Because
 * every page needs auth — the header alone imports it — that meant the entire
 * Firestore and Storage SDKs were pulled into the first-load bundle of every
 * single route. 465 KB of database client was downloading on the homepage, a
 * static marketing page that issues no queries at all.
 *
 * A getter would not have helped: a top-level `import 'firebase/firestore'`
 * makes the bundler include it regardless of whether anything calls it. The
 * import itself had to move, so Firestore now lives in lib/firebaseDb.ts and
 * only the five files that actually query the database pull it in.
 *
 * If you need the database, import from '@/lib/firebaseDb'. Adding a Firestore
 * import back into this file silently undoes the split.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Security check: Ensure all config values are present
const missingVars = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0 && typeof window !== 'undefined') {
  console.error('❌ Firebase Client Error: Missing environment variables:', missingVars);
}

export const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
