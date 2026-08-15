"use client";

import { useMemo, useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

type KampAlani = {
  id: number;
  ad: string;
  tur: string;
  kapasite: string;
  gecelikFiyat: string;
  gradient: string;
  ikon: string;
};

type SeciliParsel = {
  satir: number;
  sutun: number;
};

type KendiCadirSecimi = "yok" | "standart" | "buyuk";

const kampAlanlari: KampAlani[] = [
  {
    id: 1,
    ad: "Çadır Alanı",
    tur: "Çadır",
    kapasite: "4 Kişi",
    gecelikFiyat: "865 ₺",
    gradient: "from-emerald-600 via-teal-500 to-cyan-400",
    ikon: "⛺",
  },
  {
    id: 2,
    ad: "Karavan Alanı",
    tur: "Karavan",
    kapasite: "4 Kişi",
    gecelikFiyat: "1.195 ₺",
    gradient: "from-amber-600 via-orange-500 to-rose-400",
    ikon: "🚐",
  },
  {
    id: 3,
    ad: "Tahta Çadır",
    tur: "Çadır",
    kapasite: "4 Kişi",
    gecelikFiyat: "2.500 ₺",
    gradient: "from-green-700 via-emerald-600 to-lime-500",
    ikon: "⛺",
  },
];

const SATIR_UZAKLIKLARI = [20, 50, 80];
const KROKI_SATIR = 3;
const KROKI_SUTUN = 4;

const BUYUK_CADIR_FIYAT = 1030;

const CADIR_EKSTRA = {
  sungerYatak: 200,
  masa: 200,
  buzdolabi: 450,
} as const;

const KARAVAN_EKSTRA = {
  masa: 200,
  buzdolabi: 450,
} as const;

function fiyatParse(str: string): number {
  return parseInt(str.replace(/[^\d]/g, ""), 10) || 0;
}

function fiyatFormat(tutar: number): string {
  return tutar.toLocaleString("tr-TR") + " ₺";
}

function hesaplaGeceSayisi(giris: string, cikis: string): number {
  if (!giris || !cikis) return 0;

  const girisParcalari = giris.split("-").map(Number);
  const cikisParcalari = cikis.split("-").map(Number);

  if (
    girisParcalari.length !== 3 ||
    cikisParcalari.length !== 3 ||
    girisParcalari.some(Number.isNaN) ||
    cikisParcalari.some(Number.isNaN)
  ) {
    return 0;
  }

  const girisUTC = Date.UTC(
    girisParcalari[0],
    girisParcalari[1] - 1,
    girisParcalari[2]
  );
  const cikisUTC = Date.UTC(
    cikisParcalari[0],
    cikisParcalari[1] - 1,
    cikisParcalari[2]
  );
  const farkGun = (cikisUTC - girisUTC) / (1000 * 60 * 60 * 24);

  if (farkGun <= 0) return 0;
  return farkGun;
}

function tahtaCadirMi(kamp: KampAlani): boolean {
  return kamp.ad === "Tahta Çadır";
}

function cadirMi(kamp: KampAlani): boolean {
  return kamp.tur === "Çadır" && !tahtaCadirMi(kamp);
}

function karavanMi(kamp: KampAlani): boolean {
  return kamp.tur === "Karavan";
}

function hesaplaGunlukToplam(
  kamp: KampAlani,
  ekstralar: {
    sungerYatak: boolean;
    masa: boolean;
    buzdolabi: boolean;
    kendiCadir: KendiCadirSecimi;
  }
): number {
  const bazFiyat = fiyatParse(kamp.gecelikFiyat);

  if (tahtaCadirMi(kamp)) {
    return bazFiyat;
  }

  if (karavanMi(kamp)) {
    let gunluk = bazFiyat;
    if (ekstralar.masa) gunluk += KARAVAN_EKSTRA.masa;
    if (ekstralar.buzdolabi) gunluk += KARAVAN_EKSTRA.buzdolabi;
    return gunluk;
  }

  let gunluk: number;
  if (ekstralar.kendiCadir === "buyuk") {
    gunluk = BUYUK_CADIR_FIYAT;
  } else {
    gunluk = bazFiyat;
  }

  if (ekstralar.sungerYatak) gunluk += CADIR_EKSTRA.sungerYatak;
  if (ekstralar.masa) gunluk += CADIR_EKSTRA.masa;
  if (ekstralar.buzdolabi) gunluk += CADIR_EKSTRA.buzdolabi;

  return gunluk;
}

function hesaplaToplam(
  kamp: KampAlani,
  ekstralar: {
    sungerYatak: boolean;
    masa: boolean;
    buzdolabi: boolean;
    kendiCadir: KendiCadirSecimi;
  },
  geceSayisi: number
): number {
  if (geceSayisi <= 0) return 0;
  return hesaplaGunlukToplam(kamp, ekstralar) * geceSayisi;
}

export default function Home() {
  // --- KULLANICI GİRİŞ SİSTEMİ DURUMLARI ---
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [kayitMi, setKayitMi] = useState(false); // true ise Kayıt Ol, false ise Giriş Yap ekranı

// E-posta ile Kayıt/Giriş fonksiyonu
const epostaIslemi = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email || !sifre) {
    alert("Lütfen e-posta ve şifrenizi girin.");
    return;
  }

  // Sadece "Kayıt Ol" aşamasında şifre kurallarını kontrol et
  if (kayitMi) {
    const sifreKurallari = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,16}$/;
    if (!sifreKurallari.test(sifre)) {
      alert("Şifreniz 8-16 karakter uzunluğunda olmalı ve en az bir büyük harf, bir rakam ve bir özel karakter (noktalama işareti) içermelidir.");
      return; // Kurallara uymazsa işlemi burada durdur
    }
  }

  try {
    if (kayitMi) {
      await createUserWithEmailAndPassword(auth, email, sifre);
    } else {
      await signInWithEmailAndPassword(auth, email, sifre);
    }
    setGirisModalAcik(false); 
    setEmail("");
    setSifre("");
  } catch (hata: any) {
    console.error("İşlem hatası:", hata);
    if (hata.code === 'auth/email-already-in-use') alert("Bu e-posta adresi zaten kullanımda.");
    else if (hata.code === 'auth/wrong-password' || hata.code === 'auth/invalid-credential') alert("Hatalı e-posta veya şifre girdiniz.");
    else alert("Bir hata oluştu. Lütfen bilgilerinizi kontrol edin.");
  }
};
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [girisModalAcik, setGirisModalAcik] = useState(false);

  // Kullanıcının giriş yapıp yapmadığını sürekli dinleyen sistem
  useEffect(() => {
    const abonelik = onAuthStateChanged(auth, (guncelKullanici) => {
      setKullanici(guncelKullanici);
    });
    return () => abonelik();
  }, []);

  // Google ile giriş fonksiyonu
  const googleIleGirisYap = async () => {
    const saglayici = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, saglayici);
      setGirisModalAcik(false);
    } catch (hata) {
      console.error("Giriş hatası:", hata);
      alert("Giriş yaparken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  // Çıkış yapma fonksiyonu
  const cikisYap = async () => {
    try {
      await signOut(auth);
    } catch (hata) {
      console.error("Çıkış hatası:", hata);
    }
  };
  // ------------------------------------------
  const [modalAcik, setModalAcik] = useState(false);
  const [odemeModalAcik, setOdemeModalAcik] = useState(false);
  const [seciliKamp, setSeciliKamp] = useState<KampAlani | null>(null);
  const [seciliParsel, setSeciliParsel] = useState<SeciliParsel | null>(null);
  const [sungerYatak, setSungerYatak] = useState(false);
  const [sungerYastik, setSungerYastik] = useState(false);
  const [masa, setMasa] = useState(false);
  const [buzdolabi, setBuzdolabi] = useState(false);
  const [kendiCadir, setKendiCadir] = useState<KendiCadirSecimi>("yok");
  const [girisTarihi, setGirisTarihi] = useState("");
  const [cikisTarihi, setCikisTarihi] = useState("");
  const bugunTarihi = new Date();
  const bugun = `${bugunTarihi.getFullYear()}-${String(bugunTarihi.getMonth() + 1).padStart(2, "0")}-${String(bugunTarihi.getDate()).padStart(2, "0")}`;
  const geceSayisi = useMemo(
    () => hesaplaGeceSayisi(girisTarihi, cikisTarihi),
    [girisTarihi, cikisTarihi]
  );

  const toplamTutar = useMemo(() => {
    if (!seciliKamp) return 0;
    return hesaplaToplam(
      seciliKamp,
      {
        sungerYatak,
        masa,
        buzdolabi,
        kendiCadir,
      },
      geceSayisi
    );
  }, [
    seciliKamp,
    sungerYatak,
    masa,
    buzdolabi,
    kendiCadir,
    geceSayisi,
  ]);

  const odemeHazir = seciliParsel !== null && geceSayisi > 0;

  const denizeUzaklik = seciliParsel
    ? SATIR_UZAKLIKLARI[seciliParsel.satir]
    : null;

  function ekstralariSifirla() {
    setSungerYatak(false);
    setSungerYastik(false);
    setMasa(false);
    setBuzdolabi(false);
    setKendiCadir("yok");
    setGirisTarihi("");
    setCikisTarihi("");
  }

  function modalAc(kamp: KampAlani) {
    setSeciliKamp(kamp);
    setSeciliParsel(null);
    ekstralariSifirla();
    setModalAcik(true);
  }

  function modalKapat() {
    setModalAcik(false);
    setSeciliKamp(null);
    setSeciliParsel(null);
    ekstralariSifirla();
  }

  function kendiCadirSec(secim: "standart" | "buyuk") {
    setKendiCadir((onceki) => (onceki === secim ? "yok" : secim));
  }

  return (
    <main className="min-h-full bg-gradient-to-b from-emerald-50 via-white to-amber-50/40">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-emerald-100/80 bg-white/70 backdrop-blur-sm">
        {/* Üst Kullanıcı Menüsü */}
        <div className="absolute right-0 top-0 z-20 w-full px-6 py-4 flex justify-end">
          {kullanici ? (
            <div className="flex items-center gap-4 rounded-full bg-white/80 px-5 py-2 shadow-sm backdrop-blur-md border border-gray-100">
              <div className="flex items-center gap-2">
                {kullanici.photoURL ? (
                  <img src={kullanici.photoURL} alt="Profil" className="h-7 w-7 rounded-full border border-emerald-200" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">👤</div>
                )}
                <span className="text-sm font-semibold text-gray-800">
                  {kullanici.displayName || "Kampçı"}
                </span>
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <button onClick={cikisYap} className="text-xs font-bold text-gray-500 transition hover:text-red-500">
                ÇIKIŞ YAP
              </button>
            </div>
          ) : (
            <button
              onClick={() => setGirisModalAcik(true)}
              className="z-20 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-200"
            >
              Giriş Yap / Üye Ol
            </button>
          )}
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/60 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20 mt-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Doğayla iç içe konaklama
          </p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Dikilitaş Kamp Alanı Rezervasyon
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-600">
            Çadır ve karavan alanlarımızı keşfedin, detayları inceleyin ve
            birkaç tıkla rezervasyonunuzu oluşturun.
          </p>
        </div>
      </header>

      {/* Kamp Alanları */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
              Kamp Alanları
            </h2>
            <p className="mt-1 text-gray-500">
              Örnek çadır ve karavan seçeneklerimiz
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-lg bg-emerald-100 px-3 py-1.5 font-medium text-emerald-800">
              ⛺ Çadır
            </span>
            <span className="rounded-lg bg-amber-100 px-3 py-1.5 font-medium text-amber-800">
              🚐 Karavan
            </span>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {kampAlanlari.map((kamp) => (
            <article
              key={kamp.id}
              className="group overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/50"
            >
              <div
                className={`relative flex h-52 items-center justify-center bg-gradient-to-br ${kamp.gradient}`}
              >
                <span className="text-7xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
                  {kamp.ikon}
                </span>
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-800 shadow-sm backdrop-blur-sm">
                  {kamp.tur}
                </span>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {kamp.ad}
                </h3>

                <ul className="mt-4 space-y-3">
                  <li className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-base">
                      👥
                    </span>
                    <span>
                      <span className="font-medium text-gray-800">
                        Kapasite:
                      </span>{" "}
                      {kamp.kapasite}
                    </span>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-base">
                      💰
                    </span>
                    <span>
                      <span className="font-medium text-gray-800">
                        Gecelik Fiyat:
                      </span>{" "}
                      <span className="text-lg font-bold text-emerald-700">
                        {kamp.gecelikFiyat}
                      </span>
                    </span>
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={() => modalAc(kamp)}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-200/60 transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg hover:shadow-emerald-300/50 active:scale-[0.98]"
                >
                  Rezervasyon Yap
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white/50 py-8 text-center text-sm text-gray-500">
        © 2026 Kamp Rezervasyon — Doğada unutulmaz anılar
      </footer>

      {/* Rezervasyon Modal */}
      {modalAcik && seciliKamp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-baslik"
        >
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={modalKapat}
            aria-label="Modalı kapat"
          />

          <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h2
                    id="modal-baslik"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {seciliKamp.ad}
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Tarih ve parsel seçin
                    {!tahtaCadirMi(seciliKamp) && ", ekstralarınızı belirleyin"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={modalKapat}
                  className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Kapat"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <p className="mt-3 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-cyan-900">
                ⚡ Elektrik ve 💧 Su tüm seçimlerimizde ücretsizdir!
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Tarih Seçimi */}
{/* Tarih Seçimi */}
<div className="mb-6">
                <p className="mb-3 text-sm font-medium text-gray-700">
                  Konaklama Tarihleri
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500">
                      Giriş Tarihi
                    </span>
                    <input
                      type="date"
                      min={bugun}
                      value={girisTarihi}
                      onChange={(e) => setGirisTarihi(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500">
                      Çıkış Tarihi
                    </span>
                    <input
                      type="date"
                      min={girisTarihi || bugun}
                      value={cikisTarihi}
                      onChange={(e) => setCikisTarihi(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                </div>
                <p
                  className={`mt-3 text-center text-sm font-medium ${
                    geceSayisi > 0 ? "text-emerald-700" : "text-gray-400"
                  }`}
                >
                  {geceSayisi > 0
                    ? `${geceSayisi} Gece konaklama`
                    : girisTarihi || cikisTarihi
                      ? "Geçerli bir tarih aralığı seçin"
                      : "Giriş ve çıkış tarihi seçin"}
                </p>
              </div>
              {/* Kroki */}
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700">
                  Parsel Seçimi
                </p>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  {/* Deniz şeridi */}
                  <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white">
                    <span>🌊</span>
                    <span>Deniz</span>
                  </div>

                  {/* Parsel grid */}
                  <div className="space-y-2 bg-emerald-50/80 p-3">
                    {Array.from({ length: KROKI_SATIR }).map((_, satir) => (
                      <div
                        key={satir}
                        className="grid grid-cols-4 gap-2"
                      >
                        {Array.from({ length: KROKI_SUTUN }).map(
                          (_, sutun) => {
                            const secili =
                              seciliParsel?.satir === satir &&
                              seciliParsel?.sutun === sutun;
                            const parselNo =
                              satir * KROKI_SUTUN + sutun + 1;

                            return (
                              <button
                                key={sutun}
                                type="button"
                                onClick={() =>
                                  setSeciliParsel({ satir, sutun })
                                }
                                className={`flex aspect-square items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all ${
                                  secili
                                    ? "border-emerald-600 bg-emerald-500 text-white shadow-md shadow-emerald-200"
                                    : "border-emerald-200 bg-white text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50"
                                }`}
                              >
                                {parselNo}
                              </button>
                            );
                          }
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <p
                  className={`mt-3 text-center text-sm font-medium ${
                    denizeUzaklik !== null
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                >
                  {denizeUzaklik !== null
                    ? `Denize ${denizeUzaklik}m`
                    : "Bir parsel seçin"}
                </p>
              </div>

              {/* Ekstralar / Bilgi — kamp türüne göre */}
              {tahtaCadirMi(seciliKamp) ? (
                <div className="mt-6 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                  <p className="text-sm leading-relaxed text-amber-900">
                    ✨ Bu konaklama türünde yatak, yastık, dolap ve masa fiyata
                    dahildir. Ekstra donanım seçmenize gerek yoktur.
                  </p>
                </div>
              ) : (
                <div className="mt-6">
                  <p className="mb-3 text-sm font-medium text-gray-700">
                    Ekstralar
                  </p>
                  <div className="space-y-3">
                    {cadirMi(seciliKamp) && (
                      <>
                        <div className="rounded-xl border border-gray-200 p-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Kendi Çadırınız
                          </p>
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => kendiCadirSec("standart")}
                              className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition ${
                                kendiCadir === "standart"
                                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                  : "border-gray-200 bg-white text-gray-800 hover:border-emerald-300"
                              }`}
                            >
                              <span className="font-medium">
                                Kendi Standart Çadırımı Getireceğim
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => kendiCadirSec("buyuk")}
                              className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition ${
                                kendiCadir === "buyuk"
                                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                  : "border-gray-200 bg-white text-gray-800 hover:border-emerald-300"
                              }`}
                            >
                              <span className="font-medium">
                                Kendi Büyük Çadırımı Getireceğim
                              </span>
                              <span className="mt-0.5 block text-gray-500">
                                Günlük yer ücreti{" "}
                                {fiyatFormat(BUYUK_CADIR_FIYAT)} uygulanır
                              </span>
                            </button>
                          </div>
                        </div>

                        <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/50 has-checked:border-emerald-400 has-checked:bg-emerald-50">
                          <input
                            type="checkbox"
                            checked={sungerYatak}
                            onChange={(e) => setSungerYatak(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            Sünger Yatak (+
                            {fiyatFormat(CADIR_EKSTRA.sungerYatak)})
                          </span>
                        </label>

                        <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/50 has-checked:border-emerald-400 has-checked:bg-emerald-50">
                          <input
                            type="checkbox"
                            checked={sungerYastik}
                            onChange={(e) =>
                              setSungerYastik(e.target.checked)
                            }
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            Sünger Yastık{" "}
                            <span className="font-normal text-emerald-600">
                              (Ücretsiz)
                            </span>
                          </span>
                        </label>
                      </>
                    )}

                    {(cadirMi(seciliKamp) || karavanMi(seciliKamp)) && (
                      <>
                        <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/50 has-checked:border-emerald-400 has-checked:bg-emerald-50">
                          <input
                            type="checkbox"
                            checked={masa}
                            onChange={(e) => setMasa(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            Masa (+
                            {fiyatFormat(
                              cadirMi(seciliKamp)
                                ? CADIR_EKSTRA.masa
                                : KARAVAN_EKSTRA.masa
                            )}
                            )
                          </span>
                        </label>

                        <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/50 has-checked:border-emerald-400 has-checked:bg-emerald-50">
                          <input
                            type="checkbox"
                            checked={buzdolabi}
                            onChange={(e) => setBuzdolabi(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            Buzdolabı (+
                            {fiyatFormat(
                              cadirMi(seciliKamp)
                                ? CADIR_EKSTRA.buzdolabi
                                : KARAVAN_EKSTRA.buzdolabi
                            )}
                            )
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-5">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Toplam Tutar
                  </span>
                  {geceSayisi > 0 && (
                    <p className="mt-0.5 text-xs text-emerald-600">
                      {geceSayisi} Gece için Toplam
                    </p>
                  )}
                </div>
                <span className="text-3xl font-bold text-emerald-700">
                  {fiyatFormat(toplamTutar)}
                </span>
              </div>
              <button
                type="button"
                disabled={!odemeHazir}
                onClick={() => setOdemeModalAcik(true)}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
              >
                Ödemeye Geç
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Ödeme Modal */}
      {odemeModalAcik && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Ödeme Bilgileri</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">Kart Üzerindeki İsim</label>
                <input type="text" placeholder="Örn: Taliha Dönmez" className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 placeholder-gray-800 font-medium focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">Kart Numarası</label>
                <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} className="w-full rounded-xl border border-gray-300 p-3 text-sm font-medium tracking-widest text-gray-900 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">Son Kullanma (AA/YY)</label>
                  <input type="text" placeholder="12/26" maxLength={5} className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">CVV</label>
                  <input type="text" placeholder="***" maxLength={3} className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => {
                    alert("Harika! Rezervasyonunuz başarıyla tamamlandı. İyi kamplar!");
                    setOdemeModalAcik(false);
                    modalKapat();
                  }}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500"
                >
                  {fiyatFormat(toplamTutar)} Öde ve Tamamla
                </button>
                <button 
                  onClick={() => setOdemeModalAcik(false)}
                  className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
{/* Kullanıcı Giriş Modal'ı */}
{girisModalAcik && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center">
            <button
              onClick={() => setGirisModalAcik(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              ✕
            </button>
            
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl shadow-inner">
              🏕️
            </div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">
              {kayitMi ? "Kayıt Ol" : "Hoş Geldiniz"}
            </h3>
            <p className="mb-6 text-sm text-gray-500">
              {kayitMi ? "Yeni bir macera için hemen hesabınızı oluşturun." : "Hızlıca rezervasyon yapmak için giriş yapın."}
            </p>
            
            <form onSubmit={epostaIslemi} className="mb-6 space-y-3 text-left">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">E-posta</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mail.com" 
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Şifre</label>
                <input 
                  type="password" 
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  placeholder="••••••" 
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500"
              >
                {kayitMi ? "Kayıt Ol" : "Giriş Yap"}
              </button>
            </form>

            <div className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500">
              <span>{kayitMi ? "Zaten üye misiniz?" : "Hesabınız yok mu?"}</span>
              <button 
                type="button"
                onClick={() => setKayitMi(!kayitMi)}
                className="font-bold text-emerald-600 hover:text-emerald-500"
              >
                {kayitMi ? "Giriş Yapın" : "Kayıt Olun"}
              </button>
            </div>

            <div className="mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200"></div>
              <span className="text-xs font-medium text-gray-400">VEYA</span>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            
            <button
              onClick={googleIleGirisYap}
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98]"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google Logo" className="h-5 w-5" />
              Google ile Devam Et
            </button>
          </div>
        </div>
      )}
    </main>
  );
}