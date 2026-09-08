import React from 'react';

export default function LocationSection() {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-emerald-100 my-16 mx-auto max-w-6xl">
      <h2 className="text-3xl font-bold mb-4 text-gray-900">Konum & Ulaşım</h2>
      <p className="mb-8 text-gray-600 text-center max-w-2xl">
        Dikilitaş Kamp Alanı'na kolayca ulaşmak için aşağıdaki haritayı inceleyebilir veya doğrudan telefonunuzdan yol tarifi alabilirsiniz.
      </p>

      {/* Google Maps (Koordinatlarınla ayarlandı) */}
      <div className="w-full overflow-hidden rounded-xl shadow-md border border-gray-100">
        <iframe
          src="https://maps.google.com/maps?q=36.0899,32.9221&hl=tr&z=15&output=embed"
          width="100%"
          height="450"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Dikilitaş Kamp Konumu"
        ></iframe>
      </div>

      {/* Mobilden girenler için direkt harita uygulamasına yönlendiren buton */}
      <div className="mt-8">
        <a
          href="https://maps.app.goo.gl/DHvwZmA3N452NNH88"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition duration-300 shadow-sm hover:shadow"
        >
          📍 Yol Tarifi Al
        </a>
      </div>
    </div>
  );
}