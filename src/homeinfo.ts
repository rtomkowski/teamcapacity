// Home header preferences (per computer) and the optional weather from Open-Meteo.
// Open-Meteo (open-meteo.com) is free, needs no key or account and allows browser requests.
// Nothing is requested unless weather is switched on in Settings; only the chosen place's
// coordinates are sent, never planning data.
import { useEffect, useState } from "react";
import type { WeatherNow } from "./views";

export interface WeatherPlace {
  name: string;
  /** Region and country, for telling places apart. */
  detail?: string;
  lat: number;
  lon: number;
}
export interface HomePrefs {
  /** First name for the greeting. */
  name: string;
  weather: boolean;
  place?: WeatherPlace;
}
const KEY = "tc-home";
const CACHE = "tc-weather-cache";
const EVENT = "tc-home-change";

export function loadHomePrefs(): HomePrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const place =
      v.place && typeof v.place.lat === "number" && typeof v.place.lon === "number" && typeof v.place.name === "string"
        ? (v.place as WeatherPlace)
        : undefined;
    return { name: typeof v.name === "string" ? v.name.slice(0, 60) : "", weather: v.weather === true && !!place, place };
  } catch {
    return { name: "", weather: false };
  }
}
export function saveHomePrefs(p: HomePrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: keep for this session only */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: p }));
}
export function useHomePrefs(): HomePrefs {
  const [prefs, setPrefs] = useState(loadHomePrefs);
  useEffect(() => {
    const on = (e: Event) => setPrefs((e as CustomEvent<HomePrefs>).detail ?? loadHomePrefs());
    const st = (e: StorageEvent) => e.key === KEY && setPrefs(loadHomePrefs());
    window.addEventListener(EVENT, on);
    window.addEventListener("storage", st);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener("storage", st);
    };
  }, []);
  return prefs;
}

/** The current minute, ticking while mounted. */
export function useNow(stepMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), stepMs);
    return () => window.clearInterval(t);
  }, [stepMs]);
  return now;
}

async function getJson(url: string): Promise<any> {
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    window.clearTimeout(t);
  }
}

export async function findPlaces(query: string): Promise<WeatherPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
  );
  return ((data?.results ?? []) as any[])
    .filter((x) => typeof x.latitude === "number" && typeof x.longitude === "number")
    .map((x) => ({
      name: String(x.name),
      detail: [x.admin1, x.country].filter(Boolean).join(", ") || undefined,
      lat: Math.round(x.latitude * 100) / 100,
      lon: Math.round(x.longitude * 100) / 100,
    }));
}

/** Current weather, cached for 20 minutes per place so reloading the app does not ask again. */
export async function currentWeather(place: WeatherPlace): Promise<WeatherNow> {
  const id = `${place.lat},${place.lon}`;
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) ?? "null");
    if (c && c.id === id && Date.now() - c.at < 20 * 60_000) return { ...c.data, place: place.name };
  } catch {
    /* ignore a broken cache */
  }
  const d = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`,
  );
  const cur = d?.current;
  if (!cur || typeof cur.temperature_2m !== "number") throw new Error("No weather data");
  const data = { temp: cur.temperature_2m, code: Number(cur.weather_code ?? -1), wind: cur.wind_speed_10m };
  try {
    localStorage.setItem(CACHE, JSON.stringify({ id, at: Date.now(), data }));
  } catch {
    /* ignore */
  }
  return { ...data, place: place.name };
}

/** Weather for Home: "off", "loading", "ok", or a short reason it is missing. */
export function useWeather(prefs: HomePrefs, active: boolean): { state: string; weather?: WeatherNow } {
  const [res, setRes] = useState<{ state: string; weather?: WeatherNow }>({ state: "off" });
  const place = prefs.weather ? prefs.place : undefined;
  const id = place ? `${place.lat},${place.lon}` : "";
  useEffect(() => {
    if (!place || !active) {
      setRes((r) => (place ? r : { state: "off" }));
      return;
    }
    let live = true;
    const load = () =>
      currentWeather(place)
        .then((w) => live && setRes({ state: "ok", weather: w }))
        .catch(() => live && setRes((r) => (r.weather ? r : { state: navigator.onLine === false ? "Offline" : "Not available right now" })));
    setRes((r) => (r.weather && r.weather.place === place.name ? r : { state: "loading" }));
    load();
    const t = window.setInterval(load, 30 * 60_000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, active]);
  return res;
}
