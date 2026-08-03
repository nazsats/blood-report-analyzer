// lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

let adminApp: admin.app.App | null = null;
let adminDbInstance: admin.firestore.Firestore | null = null;

export function getAdminApp(): admin.app.App {
  if (adminApp) return adminApp;

  // Check if default app already exists (prevents duplicate init)
  const existingApps = admin.apps;
  if (existingApps.length > 0) {
    adminApp = existingApps[0]!; // Use the first (default) app
    console.log('✅ Reusing existing Firebase Admin app');
    return adminApp;
  }

  try {
    let projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    let clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // Fallback: read the service-account JSON that GOOGLE_APPLICATION_CREDENTIALS points at.
    // Keeps local dev working when only that variable is set.
    if (!clientEmail || !privateKey) {
      const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (saPath && fs.existsSync(saPath)) {
        console.log('ℹ️  Falling back to service account file at GOOGLE_APPLICATION_CREDENTIALS');
        const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        projectId = projectId || sa.project_id;
        clientEmail = clientEmail || sa.client_email;
        privateKey = privateKey || sa.private_key;
      }
    }

    if (!projectId) {
      throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }
    if (!clientEmail) {
      throw new Error('Missing FIREBASE_ADMIN_CLIENT_EMAIL (and no usable GOOGLE_APPLICATION_CREDENTIALS file)');
    }
    if (!privateKey) {
      throw new Error('Missing or invalid FIREBASE_ADMIN_PRIVATE_KEY (and no usable GOOGLE_APPLICATION_CREDENTIALS file)');
    }

    console.log('✅ Initializing new Firebase Admin app');

    adminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });

    return adminApp;
  } catch (error: any) {
    console.error('❌ Firebase Admin init FAILED:', error.message);
    throw error;
  }
}

export function getAdminDb(): admin.firestore.Firestore {
  if (adminDbInstance) return adminDbInstance;
  
  const app = getAdminApp();
  adminDbInstance = getFirestore(app);
  return adminDbInstance;
}

// Backward compatibility.
// Lazy proxy: initialising at module scope meant a missing credential threw while the
// route module was still being imported, so the handler's try/catch never ran and the
// caller got an opaque HTML 500 instead of a JSON error.
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    const db = getAdminDb();
    const value = (db as any)[prop];
    // Bind methods to the real Firestore instance so `this` is never the proxy.
    return typeof value === 'function' ? value.bind(db) : value;
  },
});