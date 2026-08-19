// lib/firebaseDb.ts
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { app } from './firebaseClient';

/**
 * Firestore and Storage, kept apart from auth on purpose.
 *
 * Importing this file costs roughly 465 KB of JavaScript, so import it only
 * from routes that genuinely read or write the database — history, profile,
 * results, and the two components that watch a document live.
 *
 * Everything else should import `auth` from './firebaseClient', which is far
 * smaller and is what most pages actually need. Splitting these two apart is
 * the single largest bundle win in the app; folding them back together would
 * quietly hand every visitor the database client again.
 */

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
