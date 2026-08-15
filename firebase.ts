import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Veritabanı modülü eklendi

const firebaseConfig = {
  apiKey: "AIzaSyAdlH9rXBBWwo7pS_GR_MsfCcpmABrhYP0",
  authDomain: "dikilitas-kamp.firebaseapp.com",
  projectId: "dikilitas-kamp",
  storageBucket: "dikilitas-kamp.firebasestorage.app",
  messagingSenderId: "340733029313",
  appId: "1:340733029313:web:8c584ffff388b0f69c9d40"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // Veritabanını dışa aktarıyoruz