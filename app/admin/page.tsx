"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase"; 
import { useAuth } from "../../hooks/useAuth"; 
import { useRouter } from "next/navigation";
import Link from "next/link";


export default function AdminPanel() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [rezervasyonlar, setRezervasyonlar] = useState<any[]>([]);

  // Yetkisiz girişi engelle
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/");
    }
  }, [user, isAdmin, loading, router]);

  // Rezervasyonları getir
// Rezervasyonları getir
useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(collection(db, "rezervasyonlar"), (snapshot) => {
      
      // DEĞİŞİKLİK BURADA: as any[] ekliyoruz ki TypeScript hata vermesin
      const veriler = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Tarihe göre en yeniler üstte olacak şekilde sırala
      veriler.sort((a, b) => new Date(b.kayitZamani).getTime() - new Date(a.kayitZamani).getTime());
      
      setRezervasyonlar(veriler);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const rezervasyonSil = async (id: string) => {
    if (window.confirm("Bu rezervasyonu silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, "rezervasyonlar", id));
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-emerald-600">Yetkiler kontrol ediliyor...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Üst Kısım: Mobilde alt alta (flex-col), masaüstünde yan yana (md:flex-row) */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yönetim Paneli</h1>
            <p className="text-sm text-gray-500">Tüm rezervasyonları buradan yönetebilirsiniz.</p>
          </div>
          <Link href="/" className="rounded-lg bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200 w-full md:w-auto text-center">
            Ana Sayfaya Dön
          </Link>
        </div>

        {/* 1. MASAÜSTÜ GÖRÜNÜMÜ (Mobilde gizlenir: hidden md:block) */}
        <div className="hidden md:block overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-emerald-50 text-emerald-900">
              <tr>
                <th className="px-6 py-4 font-semibold">Müşteri</th>
                <th className="px-6 py-4 font-semibold">Kamp Türü / Parsel</th>
                <th className="px-6 py-4 font-semibold">Tarih Aralığı</th>
                <th className="px-6 py-4 font-semibold">Tutar</th>
                <th className="px-6 py-4 font-semibold text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rezervasyonlar.map((rez) => (
                <tr key={rez.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{rez.kullaniciAdi}</td>
                  <td className="px-6 py-4">
                    {rez.kampAdi} 
                    {rez.parsel && <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs">P: {rez.parsel.satir * 4 + rez.parsel.sutun + 1}</span>}
                  </td>
                  <td className="px-6 py-4">
                    {rez.girisTarihi} / {rez.cikisTarihi}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600">{rez.toplamTutar.toLocaleString("tr-TR")} ₺</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => rezervasyonSil(rez.id)}
                      title="Rezervasyonu Sil"
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {rezervasyonlar.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Henüz hiç rezervasyon yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 2. MOBİL GÖRÜNÜM (Masaüstünde gizlenir: md:hidden) */}
        <div className="flex flex-col gap-4 md:hidden">
          {rezervasyonlar.map((rez) => (
            <div key={rez.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
              
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="font-semibold text-gray-900 text-lg">{rez.kullaniciAdi}</span>
                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md">
                  {rez.toplamTutar.toLocaleString("tr-TR")} ₺
                </span>
              </div>
              
              <div className="text-sm text-gray-600 flex flex-col gap-2">
                <p>
                  <span className="font-medium text-gray-900">Kamp Türü:</span> {rez.kampAdi} 
                  {rez.parsel && <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">P: {rez.parsel.satir * 4 + rez.parsel.sutun + 1}</span>}
                </p>
                <p><span className="font-medium text-gray-900">Tarihler:</span> {rez.girisTarihi} / {rez.cikisTarihi}</p>
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => rezervasyonSil(rez.id)}
                  className="px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Sil
                </button>
              </div>

            </div>
          ))}
          {rezervasyonlar.length === 0 && (
            <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
              Henüz hiç rezervasyon yok.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}