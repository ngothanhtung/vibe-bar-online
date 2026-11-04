import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when the env vars are set. Without them the app runs in offline demo mode with bots. */
export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;

export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  if (!firebaseEnabled) return null;
  app ??= getApps()[0] ?? initializeApp(config);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}
