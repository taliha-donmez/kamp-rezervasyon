"use client";

import { useEffect, useState } from "react";

type WeatherData = {
  main: { temp: number };
  weather: [{ description: string; icon: string }];
  name: string;
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
        
        // Dikilitaş Kamp Alanı'nın tam koordinatları (Bozyazı/Anamur - Mersin)
        const lat = "36.0899";
        const lon = "32.9221"; 
        
        if (!apiKey) {
          console.error("API Key bulunamadı!");
          setError(true);
          setLoading(false);
          return;
        }

        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=tr&appid=${apiKey}`
        );

        if (!res.ok) throw new Error("Hava durumu çekilemedi");
        
        const data = await res.json();
        setWeather(data);
      } catch (err) {
        console.error("Hava durumu hatası:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) return <div className="animate-pulse bg-emerald-50 h-16 rounded-xl w-48"></div>;
  if (error || !weather) return null;

  const desc = weather.weather[0].description;
  const capitalizedDesc = desc.charAt(0).toUpperCase() + desc.slice(1);
  const temp = Math.round(weather.main.temp);

  return (
    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-emerald-100 shadow-sm rounded-xl px-4 py-2 hover:shadow-md transition-shadow">
      <div className="flex-shrink-0">
         <img 
            src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} 
            alt="Hava Durumu İkonu"
            className="w-12 h-12"
         />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">
           {temp}°C <span className="text-gray-400 font-normal mx-1">|</span> {capitalizedDesc}
        </p>
        <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mt-0.5">
          Dikilitaş Kamp Alanı
        </p>
      </div>
    </div>
  );
}