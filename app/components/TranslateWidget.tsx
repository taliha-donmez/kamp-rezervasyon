"use client";

import React, { useEffect } from "react";

export default function TranslateWidget() {
  useEffect(() => {
    // Script'in birden fazla kez yüklenmesini engelliyoruz
    if (document.querySelector("#google-translate-script")) return;

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    // TypeScript hatalarını önlemek için window objesini 'any' olarak tanımlıyoruz
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "tr", // Sitenin orijinal dili
          includedLanguages: "en,de,ru,ar", // İngilizce, Almanca, Rusça, Arapça
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "google_translate_element"
      );
    };
  }, []);

  return (
    <div className="flex items-center justify-end px-6 py-2 bg-emerald-50 border-b border-emerald-100">
      <div id="google_translate_element" className="text-sm rounded-md overflow-hidden"></div>
    </div>
  );
}