// lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: admin.app.App | null = null;
let adminDbInstance: admin.firestore.Firestore | null = null;

export function getAdminApp() {
  if (adminApp) return adminApp;

  try {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID env var');
    }
    if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
      throw new Error('Missing FIREBASE_ADMIN_CLIENT_EMAIL env var');
    }
    if (!privateKey || privateKey.length < 100) {
      throw new Error('Missing or invalid FIREBASE_ADMIN_PRIVATE_KEY env var (too short)');
    }

    // Debug logging (remove in production)
    console.log('✅ Firebase Admin initializing...');
    console.log('   Project:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log('   Email:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.slice(0, 20) + '...');
    console.log('   Key length:', privateKey.length);

    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey,
      }),
    }, 'admin-instance');

    console.log('✅ Firebase Admin initialized successfully');
    return adminApp;
  } catch (error: any) {
    console.error('❌ Firebase Admin init FAILED:', error.message);
    throw new Error(`Firebase Admin initialization failed: ${error.message}`);
  }
}

export function getAdminDb() {
  if (adminDbInstance) return adminDbInstance;
  
  const app = getAdminApp();
  adminDbInstance = getFirestore(app);
  return adminDbInstance;
}

// Export for backward compatibility
export const adminDb = getAdminDb();