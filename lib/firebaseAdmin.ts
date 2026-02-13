// lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

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
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }
    if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
      throw new Error('Missing FIREBASE_ADMIN_CLIENT_EMAIL');
    }
    if (!privateKey) {
      throw new Error('Missing or invalid FIREBASE_ADMIN_PRIVATE_KEY');
    }

    console.log('✅ Initializing new Firebase Admin app');

    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
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

// Backward compatibility
export const adminDb = getAdminDb();