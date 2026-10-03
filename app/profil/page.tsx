"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";

type Rezervasyon = {
  id: string;
  kampAdi: string;
  girisTarihi: string;
  cikisTarihi: string;
  parsel?: { satir: number; sutun: number } | null;
  toplamTutar: number;
  kayitZamani: string;
};

type Durum = "yaklasan" | "devam" | "tamamlandi";

const KROKI_SUTUN = 4;

const KAMP_BILGISI =
  "Mersin'in Bozyazı ilçesinde, deniz kenarında ve kızılçam ağaçları arasında yer alan Dikilitaş Kamp Alanı; çadır ve karavan kampı için doğayla iç içe, huzurlu bir ortam sunmaktadır.";

const DURUM_ETIKET: Record<Durum, { yazi: string; sinif: string }> = {
  yaklasan: { yazi: "Yaklaşan", sinif: "bg-amber-100 text-amber-800" },
  devam: { yazi: "Konaklama sürüyor", sinif: "bg-emerald-100 text-emerald-800" },
  tamamlandi: { yazi: "Tamamlandı", sinif: "bg-gray-100 text-gray-600" },
};

// "YYYY-MM-DD" formatındaki yerel bugün
function bugunStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function tarihGoster(tarih: string): string {
  const [y, a, g] = tarih.split("-").map(Number);
  if (!y || !a || !g) return tarih;
  return new Date(y, a - 1, g).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function geceSayisi(giris: string, cikis: string): number {
  const [gy, ga, gg] = giris.split("-").map(Number);
  const [cy, ca, cg] = cikis.split("-").map(Number);
  if (!gy || !cy) return 0;
  const fark = (Date.UTC(cy, ca - 1, cg) - Date.UTC(gy, ga - 1, gg)) / 86400000;
  return fark > 0 ? fark : 0;
}

function durumBul(rez: Rezervasyon, bugun: string): Durum {
  if (rez.cikisTarihi < bugun) return "tamamlandi";
  if (rez.girisTarihi <= bugun) return "devam";
  return "yaklasan";
}

export default function ProfilSayfasi() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rezervasyonlar, setRezervasyonlar] = useState<Rezervasyon[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(false);

  // Giriş yapmamış kullanıcıyı ana sayfaya yönlendir
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Sadece oturum açan kullanıcıya ait rezervasyonları dinle
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "rezervasyonlar"),
      where("kullaniciId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const veriler = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Rezervasyon[];

        // Giriş tarihine göre en yeniler üstte
        veriler.sort((a, b) => b.girisTarihi.localeCompare(a.girisTarihi));

        setRezervasyonlar(veriler);
        setHata(false);
        setYukleniyor(false);
      },
      (error) => {
        console.error("Rezervasyonlar alınamadı:", error);
        setHata(true);
        setYukleniyor(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-emerald-600">
        Profil yükleniyor...
      </div>
    );
  }

  const bugun = bugunStr();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50/40 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Üst Kısım */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Profil fotoğrafı"
                className="h-14 w-14 rounded-full border border-emerald-200"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                👤
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profilim</h1>
              <p className="text-sm text-gray-500">
                {user.displayName || user.email}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="w-full rounded-lg bg-emerald-100 px-4 py-2 text-center text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200 md:w-auto"
          >
            Ana Sayfaya Dön
          </Link>
        </div>

        {/* Kamp Alanı Bilgisi */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-6 text-white shadow-md sm:p-8">
          <span
            className="absolute -right-4 -top-6 select-none text-8xl opacity-20"
            aria-hidden="true"
          >
            🌲
          </span>
          <h2 className="text-lg font-semibold">Dikilitaş Kamp Alanı</h2>
          <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50 sm:text-base">
            {KAMP_BILGISI}
          </p>
        </section>

        {/* Rezervasyon Geçmişi */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Rezervasyon Geçmişim
            {rezervasyonlar.length > 0 && (
              <span className="ml-2 text-base font-normal text-gray-400">
                ({rezervasyonlar.length})
              </span>
            )}
          </h2>

          {yukleniyor && (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500 shadow-sm">
              Rezervasyonlar yükleniyor...
            </div>
          )}

          {!yukleniyor && hata && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">
              Rezervasyonlarınız şu an alınamadı. Sayfayı yenileyip tekrar
              deneyin.
            </div>
          )}

          {!yukleniyor && !hata && rezervasyonlar.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <p className="text-gray-600">Henüz bir rezervasyonunuz yok.</p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Kamp alanlarını incele
              </Link>
            </div>
          )}

          {!yukleniyor && !hata && rezervasyonlar.length > 0 && (
            <ul className="space-y-4">
              {rezervasyonlar.map((rez) => {
                const durum = DURUM_ETIKET[durumBul(rez, bugun)];
                const gece = geceSayisi(rez.girisTarihi, rez.cikisTarihi);

                return (
                  <li
                    key={rez.id}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {rez.kampAdi}
                        </h3>
                        {rez.parsel && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            Parsel {rez.parsel.satir * KROKI_SUTUN + rez.parsel.sutun + 1}
                          </span>
                        )}
                        <span
                          className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${durum.sinif}`}
                        >
                          {durum.yazi}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {tarihGoster(rez.girisTarihi)} -{" "}
                        {tarihGoster(rez.cikisTarihi)}
                        {gece > 0 && (
                          <span className="ml-2 text-gray-400">
                            {gece} gece
                          </span>
                        )}
                      </p>
                      {rez.kayitZamani && (
                        <p className="text-xs text-gray-400">
                          Oluşturulma:{" "}
                          {new Date(rez.kayitZamani).toLocaleDateString("tr-TR")}
                        </p>
                      )}
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-gray-500">Toplam tutar</p>
                      <p className="text-xl font-bold text-emerald-700">
                        {rez.toplamTutar.toLocaleString("tr-TR")} ₺
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}