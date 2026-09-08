"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // Ana dizindeki firebase.ts'den çekiyoruz

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const adminDoc = await getDoc(doc(db, "admins", currentUser.uid));
          setIsAdmin(adminDoc.exists());
        } catch (error) {
          console.error("Admin yetkisi kontrol edilemedi:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isAdmin, loading };
}