/**
 * 天气服务实现
 * 负责 open-meteo 查询、缓存与天气文本格式化
 */

import type { Context, Session } from "koishi";
import { FORECAST_API_BASE_URL, GEO_API_BASE_URL } from "../constants";
import type {
  CurrentWeather,
  LogFn,
  WeatherConfig,
  WeatherQueryOptions,
  WeatherService,
} from "../types";

const MAX_RETRY = 3;

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "晴",
  1: "多云",
  2: "多云",
  3: "阴",
  45: "有雾",
  48: "雾冻",
  51: "小雨",
  53: "中雨",
  55: "大雨",
  56: "小雨",
  57: "中雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "阵雨",
  81: "阵雨",
  82: "暴雨",
  85: "阵雪",
  86: "阵雪",
  95: "雷阵雨",
  96: "雷阵雨",
  99: "雷阵雨",
};

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

interface GeoResponse {
  results?: GeoResult[];
}

interface ForecastCurrent {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  weather_code: number;
  wind_speed_10m?: number;
}

interface ForecastDaily {
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

interface ForecastResponse {
  timezone: string;
  current?: ForecastCurrent;
  daily?: ForecastDaily;
}

interface CachedWeatherData {
  current: CurrentWeather;
  dailyWeather: string;
  hourlyWeather: string;
  dailyTemp: number;
  dailyMinTemp: number;
  dailyMaxTemp: number;
  hourlyTemp: number;
}

interface WeatherServiceDeps {
  ctx: Context;
  weatherConfig: WeatherConfig;
  log: LogFn;
}

function resolveSessionCity(session?: Session): string {
  const direct = (session as unknown as { city?: unknown })?.city;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const locale = (session as unknown as { locale?: unknown })?.locale;
  if (typeof locale === "string") {
    const match = locale.match(/[\u4e00-\u9fa5]{2,}(市|区|县)?/);
    if (match?.[0]) return match[0];
  }

  return "";
}

const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const formatTemp = (value: number): string => {
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(1))}`;
};

const resolveWeatherText = (code?: number): string => {
  if (code === undefined || code === null) return "";
  return WEATHER_CODE_MAP[code] || "未知";
};

const formatWeatherText = (weather: CurrentWeather): string => {
  const lines = [
    `📍 ${weather.province} ${weather.city}`,
    `📅 ${weather.date} ${weather.time}`,
    `🌤️ ${weather.weather}，${formatTemp(weather.temp)}°C（${formatTemp(weather.minTemp)}~${formatTemp(weather.maxTemp)}°C）`,
    `💨 ${weather.wind} ${weather.windLevel}`,
    `💧 湿度 ${weather.humidity}`,
  ];

  if (weather.airLevel) {
    lines.push(`🌫️ 空气质量：${weather.airLevel}`);
  }

  return lines.join("\n");
};

const formatCurrentWeather = (
  geo: GeoResult,
  current: ForecastCurrent,
  daily: ForecastDaily | undefined,
  timezone: string,
): CurrentWeather => {
  const now = new Date(current.time);
  const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const minTemp = daily?.temperature_2m_min?.[0];
  const maxTemp = daily?.temperature_2m_max?.[0];

  return {
    city: geo.name,
    province: geo.admin1 || geo.country || "",
    date: current.time.slice(0, 10),
    time: timeFormatter.format(now),
    weather: resolveWeatherText(current.weather_code),
    temp: current.temperature_2m,
    minTemp: minTemp ?? current.temperature_2m,
    maxTemp: maxTemp ?? current.temperature_2m,
    wind: "风速",
    windLevel: `${formatTemp(current.wind_speed_10m ?? 0)} km/h`,
    humidity: `${current.relative_humidity_2m}%`,
    airLevel: "",
    airTips: "",
  };
};

export function createWeatherService(deps: WeatherServiceDeps): WeatherService {
  const { ctx, weatherConfig, log } = deps;
  const defaultTimezone = "Asia/Shanghai";
  const cache = new Map<string, CachedWeatherData>();
  const geoCache = new Map<string, { result: GeoResult; expiresAt: number }>();

  const getEffectiveCityName = (session?: Session): string => {
    return weatherConfig.cityName?.trim() || resolveSessionCity(session);
  };

  const formatCityKey = (options?: WeatherQueryOptions): string => {
    return (options?.city || weatherConfig.cityName || "").trim();
  };

  const buildCacheKey = (
    now: Date,
    cityKey: string,
    timezone: string,
  ): string => {
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: weatherConfig.hourlyRefresh ? "2-digit" : undefined,
      hour12: false,
    });

    return `${cityKey}-${formatter.format(now).replace(/[\/\s:]/g, "-")}`;
  };

  const geocode = async (
    city: string,
    retryCount = 0,
  ): Promise<GeoResult | null> => {
    if (!city) return null;

    const now = Date.now();
    const cached = geoCache.get(city);
    if (cached && cached.expiresAt > now) return cached.result;

    try {
      const params = new URLSearchParams({
        name: city,
        count: "1",
        language: "zh",
        format: "json",
      });
      const response = await ctx.http.get<GeoResponse>(
        `${GEO_API_BASE_URL}?${params.toString()}`,
      );
      const result = response.results?.[0];
      if (!result) {
        log("warn", "未找到城市经纬度", { city });
        return null;
      }
      geoCache.set(city, { result, expiresAt: now + 24 * 60 * 60 * 1000 });
      return result;
    } catch (error) {
      if (retryCount < MAX_RETRY - 1) {
        log(
          "warn",
          `地理编码失败，${retryCount + 1}/${MAX_RETRY} 次重试中...`,
          { city, error },
        );
        await wait(2000 * (retryCount + 1));
        return geocode(city, retryCount + 1);
      }
      log("warn", "地理编码失败，已达到最大重试次数", { city, error });
      return null;
    }
  };

  const fetchWeather = async (
    options?: WeatherQueryOptions,
    retryCount = 0,
  ): Promise<CachedWeatherData | null> => {
    if (!weatherConfig.enabled) return null;

    const cityKey = formatCityKey(options);
    if (!cityKey) return null;

    const geo = await geocode(cityKey);
    if (!geo) return null;

    const timezone = geo.timezone || defaultTimezone;
    const currentKey = buildCacheKey(new Date(), cityKey, timezone);

    const cachedData = cache.get(currentKey);
    if (cachedData) return cachedData;

    try {
      const params = new URLSearchParams({
        latitude: String(geo.latitude),
        longitude: String(geo.longitude),
        current:
          "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min",
        timezone,
      });

      const response = await ctx.http.get<ForecastResponse>(
        `${FORECAST_API_BASE_URL}?${params.toString()}`,
      );
      const current = response.current;
      if (!current) {
        log("warn", "天气 API 缺少当前天气数据", { city: cityKey });
        return null;
      }

      const weather = formatCurrentWeather(
        geo,
        current,
        response.daily,
        timezone,
      );
      const weatherText = resolveWeatherText(current.weather_code);
      const minTemp =
        response.daily?.temperature_2m_min?.[0] ?? current.temperature_2m;
      const maxTemp =
        response.daily?.temperature_2m_max?.[0] ?? current.temperature_2m;

      const result: CachedWeatherData = {
        current: weather,
        dailyWeather: weatherText,
        hourlyWeather: weatherText,
        dailyTemp: current.temperature_2m,
        dailyMinTemp: minTemp,
        dailyMaxTemp: maxTemp,
        hourlyTemp: current.temperature_2m,
      };

      cache.set(currentKey, result);
      return result;
    } catch (error) {
      if (retryCount < MAX_RETRY - 1) {
        log(
          "warn",
          `获取天气数据失败，${retryCount + 1}/${MAX_RETRY} 次重试中...`,
          error,
        );
        await wait(2000 * (retryCount + 1));
        return fetchWeather(options, retryCount + 1);
      }

      log("warn", "获取天气数据失败，已达到最大重试次数", error);
      return cache.get(currentKey) || null;
    }
  };

  return {
    getCurrentWeather: async (options?: WeatherQueryOptions) => {
      const data = await fetchWeather(options);
      return data?.current || null;
    },
    getWeatherText: async (options?: WeatherQueryOptions) => {
      const data = await fetchWeather(options);
      if (!data) return "";
      return formatWeatherText(data.current);
    },
    getDailyWeather: async (options?: WeatherQueryOptions) => {
      const data = await fetchWeather(options);
      if (!data) return "";
      return `${data.dailyWeather}，${data.dailyTemp}°C（${data.dailyMinTemp}~${data.dailyMaxTemp}°C）`;
    },
    getHourlyWeather: async (options?: WeatherQueryOptions) => {
      const data = await fetchWeather(options);
      if (!data) return "";
      return `${data.hourlyWeather}，${data.hourlyTemp}°C`;
    },
    getEffectiveCityName,
    invalidateCache: () => {
      cache.clear();
    },
  };
}
