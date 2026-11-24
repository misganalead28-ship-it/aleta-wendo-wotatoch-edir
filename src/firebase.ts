import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, type Firestore } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

const envApiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim();
const envAuthDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim();
const envProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim();
const envStorageBucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined)?.trim();
const envMessagingSenderId = (
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined
)?.trim();
const envAppId = (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim();
const envDatabaseUrl = (import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined)?.trim();
const envFirestoreDatabaseId = (
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string | undefined
)?.trim();

const firebaseConfig = {
  apiKey: envApiKey || appletConfig.apiKey,
  authDomain: envAuthDomain || appletConfig.authDomain,
  databaseURL: envDatabaseUrl || 'https://aleta-pt-default-rtdb.firebaseio.com',
  projectId: envProjectId || appletConfig.projectId,
  storageBucket: envStorageBucket || appletConfig.storageBucket,
  messagingSenderId: envMessagingSenderId || appletConfig.messagingSenderId,
  appId: envAppId || appletConfig.appId,
  firestoreDatabaseId: envFirestoreDatabaseId || appletConfig.firestoreDatabaseId,
};

export const firebaseConfigStatus = {
  hasExplicitEnvVars: Boolean(envApiKey && envProjectId && envAppId),
  isConfigured: Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      !firebaseConfig.projectId.includes('remixed')
  ),
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
};

const app: FirebaseApp = initializeApp(firebaseConfig);

export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithFirebaseGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeFirebaseAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ?? [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  if (!firebaseConfigStatus.isConfigured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: client is offline.');
    }
  }
}

void testConnection();
