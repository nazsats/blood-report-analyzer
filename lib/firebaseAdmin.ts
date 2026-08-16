// lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { createPrivateKey } from 'crypto';
import fs from 'fs';

let adminApp: admin.app.App | null = null;
let adminDbInstance: admin.firestore.Firestore | null = null;

/**
 * Turn however the private key was stored into a PEM OpenSSL will accept.
 *
 * A .env loader strips the quotes around a value and leaves the \n sequences escaped;
 * a hosting dashboard does neither, so a key pasted straight from .env arrives wrapped
 * in literal quote characters. That key then fails to sign with
 * "error:1E08010C:DECODER routines::unsupported" — and not on startup, but on the first
 * Firestore call, because verifying an ID token only needs Google's public certs while
 * minting an access token needs this key. Normalising every variant here keeps that
 * mismatch from depending on where the value was pasted.
 */
function normalizePrivateKey(input: string): string {
  let key = input.trim();

  // Strip one layer of matching wrapping quotes, single or double.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Some dashboards round-trip the value through JSON and double the backslashes.
  key = key.replace(/\\\\n/g, '\\n');
  // Escaped newlines -> real ones. A key stored with real newlines is unaffected.
  key = key.replace(/\\n/g, '\n');
  // CRLF breaks the base64 body; PEM wants bare LF.
  key = key.replace(/\r/g, '');

  return key.endsWith('\n') ? key : key + '\n';
}

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
    const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    let privateKey = rawPrivateKey ? normalizePrivateKey(rawPrivateKey) : undefined;

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

    // Prove the key can actually sign before handing it to Firebase. Otherwise a bad key
    // stays silent until the first Firestore call and surfaces there as a bare OpenSSL
    // "DECODER routines::unsupported", which names neither the variable nor the cause.
    try {
      createPrivateKey(privateKey);
    } catch (keyError: unknown) {
      const detail = keyError instanceof Error ? keyError.message : String(keyError);
      throw new Error(
        `FIREBASE_ADMIN_PRIVATE_KEY is not a valid PEM private key (${detail}). ` +
          'Expected a value beginning "-----BEGIN PRIVATE KEY-----". Copy the private_key ' +
          'field from the service-account JSON, and do not include the surrounding quotes ' +
          'when pasting it into a hosting dashboard.'
      );
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