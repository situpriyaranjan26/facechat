// Automatic Geolocation & Country Detection Utility

export interface GeoLocationResult {
  countryCode: string;
  countryName: string;
  flag: string;
  city?: string;
  isAutoDetected: boolean;
}

// Convert 2-letter ISO country code to Emoji Flag
export function getCountryFlag(code?: string): string {
  if (!code || code === 'Global' || code.length !== 2) return '🌐';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Map common timezones to ISO country codes as fast instant offline fallback
const TIMEZONE_TO_COUNTRY: Record<string, { code: string; name: string }> = {
  'America/New_York': { code: 'US', name: 'United States' },
  'America/Los_Angeles': { code: 'US', name: 'United States' },
  'America/Chicago': { code: 'US', name: 'United States' },
  'America/Denver': { code: 'US', name: 'United States' },
  'America/Toronto': { code: 'CA', name: 'Canada' },
  'America/Vancouver': { code: 'CA', name: 'Canada' },
  'Europe/London': { code: 'GB', name: 'United Kingdom' },
  'Europe/Paris': { code: 'FR', name: 'France' },
  'Europe/Berlin': { code: 'DE', name: 'Germany' },
  'Europe/Rome': { code: 'IT', name: 'Italy' },
  'Europe/Madrid': { code: 'ES', name: 'Spain' },
  'Asia/Kolkata': { code: 'IN', name: 'India' },
  'Asia/Calcutta': { code: 'IN', name: 'India' },
  'Asia/Tokyo': { code: 'JP', name: 'Japan' },
  'Asia/Seoul': { code: 'KR', name: 'South Korea' },
  'Asia/Shanghai': { code: 'CN', name: 'China' },
  'Asia/Singapore': { code: 'SG', name: 'Singapore' },
  'Australia/Sydney': { code: 'AU', name: 'Australia' },
  'Australia/Melbourne': { code: 'AU', name: 'Australia' },
  'America/Sao_Paulo': { code: 'BR', name: 'Brazil' },
  'America/Mexico_City': { code: 'MX', name: 'Mexico' },
};

export async function detectUserCountry(): Promise<GeoLocationResult> {
  // 1. Try public IP Geolocation services (fast & accurate)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      cache: 'force-cache',
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.country_code) {
        const code = data.country_code.toUpperCase();
        return {
          countryCode: code,
          countryName: data.country_name || code,
          flag: getCountryFlag(code),
          city: data.city,
          isAutoDetected: true,
        };
      }
    }
  } catch {
    // Try secondary IP lookup
  }

  try {
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 3000);
    const res2 = await fetch('https://api.country.is', {
      signal: controller2.signal,
    });
    clearTimeout(timeout2);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.country) {
        const code = data2.country.toUpperCase();
        return {
          countryCode: code,
          countryName: code,
          flag: getCountryFlag(code),
          isAutoDetected: true,
        };
      }
    }
  } catch {
    // Fallback to client browser timezone
  }

  // 2. High-precision Timezone mapping fallback (instant, 100% offline)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_COUNTRY[tz]) {
      const match = TIMEZONE_TO_COUNTRY[tz];
      return {
        countryCode: match.code,
        countryName: match.name,
        flag: getCountryFlag(match.code),
        isAutoDetected: true,
      };
    }

    // Continent-level parse
    if (tz?.startsWith('Asia/')) return { countryCode: 'IN', countryName: 'India', flag: '🇮🇳', isAutoDetected: true };
    if (tz?.startsWith('America/')) return { countryCode: 'US', countryName: 'United States', flag: '🇺🇸', isAutoDetected: true };
    if (tz?.startsWith('Europe/')) return { countryCode: 'GB', countryName: 'United Kingdom', flag: '🇬🇧', isAutoDetected: true };
    if (tz?.startsWith('Australia/')) return { countryCode: 'AU', countryName: 'Australia', flag: '🇦🇺', isAutoDetected: true };
  } catch {
    // Ignore
  }

  // Final fallback
  return {
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    isAutoDetected: true,
  };
}
