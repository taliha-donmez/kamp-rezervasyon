// SADECE sunucu tarafında (route handler'larda) kullanılır.
// İstemci bileşenlerinden (use client) asla import etme.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// .env dosyalarında satır sonları "\n" olarak saklanır, burada gerçek satır sonuna çeviriyoruz
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Firebase Admin ortam değişkenleri eksik: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
  );
}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
