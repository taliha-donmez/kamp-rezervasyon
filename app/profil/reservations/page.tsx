'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase'; // Firebase import yolu (hata verirse '../firebase' veya '../../firebase' yapabilirsin)
import Link from 'next/link';

interface Reservation {
  id: string;
  kampAdi: string;
  girisTarihi: string;
  cikisTarihi: string;
  toplamTutar: number;
  kayitZamani: string;
  parsel?: {
    satir: number;
    sutun: number;
  };
}

export default function MyReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 1. Önce kullanıcının giriş yapıp yapmadığını dinliyoruz
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 2. Sadece bu kullanıcıya ait rezervasyonları sorguluyoruz
          const q = query(
            collection(db, "rezervasyonlar"), 
            where("kullaniciId", "==", user.uid)
          );
          
          const querySnapshot = await getDocs(q);
          const userReservations: Reservation[] = [];
          
          querySnapshot.forEach((doc) => {
            // Firestore'dan gelen veriyi kendi formatımıza çeviriyoruz
            userReservations.push({
              id: doc.id,
              ...doc.data()
            } as Reservation);
          });
          
          // Tarihe göre sıralama (En yeni rezervasyon en üstte görünsün)
          userReservations.sort((a, b) => 
            new Date(b.kayitZamani).getTime() - new Date(a.kayitZamani).getTime()
          );

          setReservations(userReservations);
        } catch (err) {
          console.error("Veri çekme hatası:", err);
          setError("Rezervasyonlarınız yüklenirken bir hata oluştu.");
        }
      } else {
        // Kullanıcı giriş yapmamışsa
        setReservations([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function formatTutar(tutar: number) {
    return tutar.toLocaleString("tr-TR") + " ₺";
  }

  // Tarihleri GG.AA.YYYY formatına çevirir
  function formatTarih(tarihStr: string) {
    if (!tarihStr) return "";
    const [yil, ay, gun] = tarihStr.split('-');
    return `${gun}.${ay}.${yil}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Üst Bar (Geri dönüş ve Başlık) */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profil" className="p-2 rounded-full hover:bg-gray-200 transition text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Geçmiş Rezervasyonlarım!</h1>
        </div>
        
        {/* Hata Mesajı */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Rezervasyon Yoksa */}
        {!loading && reservations.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">🏕️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Henüz bir rezervasyonunuz yok</h3>
            <p className="text-gray-500 mb-6">Doğayla buluşmak için hemen yeni bir kamp planı yapın.</p>
            <Link href="/" className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg">
              Kamp Alanlarını İncele
            </Link>
          </div>
        )}

        {/* Rezervasyon Listesi */}
        {reservations.length > 0 && (
          <div className="space-y-5">
            {reservations.map((res) => {
              // Bitiş tarihi bugün veya bugünden eskiyse "Tamamlandı", değilse "Yaklaşan" göster
              const isPast = new Date(res.cikisTarihi) < new Date();

              return (
                <div key={res.id} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  
                  {/* Renkli Sol Kenar Çizgisi */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isPast ? 'bg-gray-300' : 'bg-emerald-500'}`}></div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pl-2">
                    
                    <div className="flex gap-4 items-center">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl ${isPast ? 'bg-gray-100' : 'bg-emerald-50'}`}>
                        {res.kampAdi?.includes('Karavan') ? '🚐' : '⛺'}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{res.kampAdi}</h3>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                            isPast ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {isPast ? 'Tamamlandı' : 'Yaklaşan'}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm font-medium flex items-center gap-1.5">
                          <span>📅</span> {formatTarih(res.girisTarihi)} - {formatTarih(res.cikisTarihi)}
                        </p>
                        {res.parsel && (
                          <p className="text-xs text-gray-400 mt-1">
                            Seçilen Alan: Satır {res.parsel.satir + 1}, Sütun {res.parsel.sutun + 1}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="w-full sm:w-auto border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0 sm:text-right">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Ödenen Tutar</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatTutar(res.toplamTutar)}</p>
                    </div>
                    
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}