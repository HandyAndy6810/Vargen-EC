import { useEffect, useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { AlertTriangle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "@shared/schema";

interface DailyForecast {
  date: Date;
  code: number;
  maxTemp: number;
  windSpeed: number;
}

interface WeatherData {
  days: DailyForecast[];
  timezone: string;
}

const WMO_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  66: "🌨️", 67: "🌨️",
  71: "❄️", 73: "❄️", 75: "❄️", 77: "❄️",
  80: "🌦️", 81: "🌦️", 82: "🌦️",
  85: "🌨️", 86: "🌨️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

const BAD_WEATHER_CODES = new Set([
  51, 53, 55, 61, 63, 65, 66, 67,
  71, 73, 75, 77, 80, 81, 82, 85, 86,
  95, 96, 99,
]);

function getEmoji(code: number): string {
  if (WMO_EMOJI[code]) return WMO_EMOJI[code];
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌦️";
  if (code >= 71) return "❄️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 3) return "☁️";
  return "☀️";
}

function isBadWeather(code: number, windSpeed: number): boolean {
  return BAD_WEATHER_CODES.has(code) || windSpeed > 30;
}

const CACHE_KEY = "vargenezey_weather_cache";
const CACHE_TTL = 3 * 60 * 60 * 1000;

function loadCache(): { data: WeatherData; coords: [number, number]; ts: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    parsed.data.days = parsed.data.days.map((d: DailyForecast & { date: string }) => ({
      ...d,
      date: new Date(d.date),
    }));
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(data: WeatherData, coords: [number, number]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, coords, ts: Date.now() }));
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lng.toString());
  url.searchParams.set("daily", "weather_code,temperature_2m_max,wind_speed_10m_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Weather fetch failed");
  const json = await res.json();

  const days: DailyForecast[] = json.daily.time.slice(0, 7).map((dateStr: string, i: number) => ({
    date: new Date(dateStr + "T00:00:00"),
    code: json.daily.weather_code[i],
    maxTemp: Math.round(json.daily.temperature_2m_max[i]),
    windSpeed: Math.round(json.daily.wind_speed_10m_max[i]),
  }));

  return { days, timezone: json.timezone };
}

interface Props {
  jobs?: Job[];
}

export function WeatherWidget({ jobs = [] }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setWeather(cached.data);
      setCoords(cached.coords);
      setLoading(false);
      return;
    }

    const proceed = (lat: number, lng: number) => {
      setCoords([lat, lng]);
      fetchWeather(lat, lng)
        .then((data) => {
          setWeather(data);
          saveCache(data, [lat, lng]);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          proceed(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setError(true);
          setLoading(false);
        },
        { timeout: 5000 }
      );
    } else {
      setError(true);
      setLoading(false);
    }
  }, []);

  const today = new Date();
  const next7 = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(today, offset));

  const getFirstJob = (day: Date): Job | undefined => {
    return jobs
      .filter((j) => j.scheduledDate && isSameDay(new Date(j.scheduledDate), day))
      .sort((a, b) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      })[0];
  };

  const getDayForecast = (day: Date): DailyForecast | undefined => {
    return weather?.days.find((d) => isSameDay(d.date, day));
  };

  if (loading) {
    return (
      <div className="bg-secondary rounded-[2rem] p-5 text-white">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-bold text-white/60 uppercase tracking-widest">7-Day Forecast</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white/10 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-secondary rounded-[2rem] p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold text-white/60 uppercase tracking-widest">7-Day Forecast</span>
        </div>
        <p className="text-white/50 text-sm">Weather unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-secondary rounded-[2rem] p-5 text-white" data-testid="widget-weather">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">7-Day Forecast</span>
        {locationName && (
          <span className="flex items-center gap-1 text-[10px] text-white/40 font-medium">
            <MapPin className="w-3 h-3" />
            {locationName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {next7.map((day, idx) => {
          const forecast = getDayForecast(day);
          const firstJob = getFirstJob(day);
          const isToday = idx === 0;
          const bad = forecast ? isBadWeather(forecast.code, forecast.windSpeed) : false;
          const warn = bad && !!firstJob;

          return (
            <div
              key={idx}
              data-testid={`weather-day-${idx}`}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-2xl py-3 px-1 text-center transition-all",
                warn
                  ? "bg-primary/20 border border-primary/60"
                  : isToday
                    ? "bg-white/15"
                    : "bg-white/10"
              )}
            >
              {warn && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-white font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>⚠️</span>
                </span>
              )}

              <span className={`text-[9px] font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-white/50"}`}>
                {isToday ? "Today" : format(day, "EEE")}
              </span>

              <span className="text-2xl leading-none" role="img" aria-label="weather">
                {forecast ? getEmoji(forecast.code) : "—"}
              </span>

              <span className="text-sm font-bold text-white">
                {forecast ? `${forecast.maxTemp}°` : "—"}
              </span>

              <span className="text-[9px] text-white/40 font-medium leading-tight px-0.5 truncate w-full text-center">
                {firstJob ? firstJob.title : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
