import * as Location from "expo-location";

export type PickedLocation = {
  latitude: number;
  longitude: number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
};

export async function getCurrentLocation(): Promise<Location.LocationObject> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error(
      "Location permission is needed to use your current location. You can allow it in Settings."
    );
  }
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<Location.LocationGeocodedAddress[]> {
  return Location.reverseGeocodeAsync({ latitude, longitude });
}

export function locationFromCoords(
  latitude: number,
  longitude: number,
  geocode?: Location.LocationGeocodedAddress
): PickedLocation {
  const streetParts = [geocode?.streetNumber, geocode?.street].filter(
    Boolean
  ) as string[];
  return {
    latitude,
    longitude,
    address_line1: streetParts.join(" ") || null,
    address_line2: null,
    city: geocode?.city ?? geocode?.district ?? null,
    state: geocode?.region ?? geocode?.subregion ?? null,
    country: geocode?.country ?? geocode?.isoCountryCode ?? null,
    postal_code: geocode?.postalCode ?? null,
  };
}

export function formatLocationSummary(loc: PickedLocation): string {
  const parts = [
    [loc.address_line1, loc.city].filter(Boolean).join(", "),
    [loc.state, loc.country].filter(Boolean).join(", "),
  ].filter(Boolean);
  return parts.join(" · ") || "Set your shop's location";
}

/** "City, State, Country" label from a reverse-geocode result, e.g. "Hennaya, Tlemcen, Algeria". */
export function formatGeocodeLabel(
  geocode: Location.LocationGeocodedAddress | null
): string {
  if (!geocode) {
    return "";
  }
  return [
    geocode.city ?? geocode.district,
    geocode.region ?? geocode.subregion,
    geocode.country ?? geocode.isoCountryCode,
  ]
    .filter(Boolean)
    .join(", ");
}

/** "City, State, Country" label from a picked location, matching the GPS label format. */
export function formatPickedLocationLabel(loc: PickedLocation | null): string {
  if (!loc) {
    return "";
  }
  return [loc.city, loc.state, loc.country].filter(Boolean).join(", ");
}

function parseLatLng(query: string): { latitude: number; longitude: number } | null {
  const parts = query.split(",").map((part) => part.trim());
  if (parts.length < 2) {
    return null;
  }
  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  return { latitude, longitude };
}

type NominatimAddress = {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
  country_code?: string;
  postcode?: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
};

type NominatimHit = {
  latitude: number;
  longitude: number;
  address: NominatimAddress;
};

async function nominatimSearch(query: string): Promise<NominatimHit | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "KutzMobileApp/1.0 (shop location picker)",
    },
  });
  if (!response.ok) {
    throw new Error("Could not reach the location service. Try again.");
  }
  const rows = (await response.json()) as NominatimResult[];
  const row = rows[0];
  if (!row || row.lat == null || row.lon == null) {
    return null;
  }
  const latitude = Number(row.lat);
  const longitude = Number(row.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude, address: row.address ?? {} };
}

// Google Plus Codes / Open Location Code ("8C6WXJ2C+22", short "XJ2C+22") are
// decodable to coordinates directly; Nominatim cannot resolve them.
const PLUS_CODE_ALPHABET = "23456789CFGHJMPQRVWX";
const PLUS_CODE_PATTERN = /[23456789CFGHJMPQRVWX]+\s*\+\s*[23456789CFGHJMPQRVWX]+/i;

function decodePlusCodeDigits(digits: string): {
  latitude: number;
  longitude: number;
} {
  let latitude = -90;
  let longitude = -180;
  let latResolution = 20;
  let lngResolution = 20;
  for (let i = 0; i < digits.length; i++) {
    const value = PLUS_CODE_ALPHABET.indexOf(digits[i]);
    if (i % 2 === 0) {
      latitude += value * latResolution;
      latResolution /= 20;
    } else {
      longitude += value * lngResolution;
      lngResolution /= 20;
    }
  }
  return {
    latitude: latitude + latResolution / 2,
    longitude: longitude + lngResolution / 2,
  };
}

function firstPlusCodeDigits(
  referenceLatitude: number,
  referenceLongitude: number,
  count: number
): string {
  let latValue = referenceLatitude + 90;
  let lngValue = referenceLongitude + 180;
  let latResolution = 20;
  let lngResolution = 20;
  let out = "";
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const digit = Math.floor(latValue / latResolution);
      out += PLUS_CODE_ALPHABET[digit];
      latValue -= digit * latResolution;
      latResolution /= 20;
    } else {
      const digit = Math.floor(lngValue / lngResolution);
      out += PLUS_CODE_ALPHABET[digit];
      lngValue -= digit * lngResolution;
      lngResolution /= 20;
    }
  }
  return out;
}

function decodePlusCode(code: string): {
  latitude: number;
  longitude: number;
} | null {
  const normalized = code.replace(/\s+/g, "").toUpperCase();
  const match = normalized.match(
    /^([23456789CFGHJMPQRVWX]+)\+([23456789CFGHJMPQRVWX]+)$/
  );
  if (!match) {
    return null;
  }
  const prefixLength = match[1].length;
  const totalLength = match[1].length + match[2].length;
  if (totalLength % 2 !== 0 || totalLength > 14) {
    return null;
  }
  if (prefixLength === 8) {
    return decodePlusCodeDigits(normalized.replace("+", ""));
  }
  return null;
}

function expandShortPlusCode(
  code: string,
  referenceLatitude: number,
  referenceLongitude: number
): { latitude: number; longitude: number } {
  const normalized = code.replace(/\s+/g, "").toUpperCase();
  const prefixLength = normalized.indexOf("+");
  const digits = normalized.replace("+", "");
  const prefix = firstPlusCodeDigits(
    referenceLatitude,
    referenceLongitude,
    8 - prefixLength
  );
  return decodePlusCodeDigits(prefix + digits);
}

/**
 * Extracts coordinates from a Google Maps share link. Handles the
 * "place/.../@lat,lng" path form, "?q=lat,lng" / "?ll=lat,lng" query forms,
 * and plain URLs. Returns null when there is nothing coordinate-like.
 */
function parseGoogleMapsUrl(query: string): { latitude: number; longitude: number } | null {
  const at = query.match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (at) {
    const latitude = Number(at[1]);
    const longitude = Number(at[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }
  const queryParam = query.match(/[?&](?:q|ll)=(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (queryParam) {
    const latitude = Number(queryParam[1]);
    const longitude = Number(queryParam[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }
  return null;
}

const GOOGLE_SHORT_LINK = /maps\.app\.goo\.gl|goo\.gl\/maps/i;

/**
 * Short Google Maps links (maps.app.goo.gl/…) don't carry coordinates; follow
 * the redirect (RN fetch follows automatically) and hand back the final URL.
 */
async function resolveGoogleMapsShortLink(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow" });
    return response.url || null;
  } catch {
    return null;
  }
}

async function fromCoords(
  latitude: number,
  longitude: number
): Promise<PickedLocation> {
  const [geocode] = await reverseGeocode(latitude, longitude);
  return locationFromCoords(latitude, longitude, geocode);
}

/**
 * Strips percent-encoding and invisible Unicode control marks (RTL/LTR
 * isolates, zero-width chars) that Google embeds in share-link place names.
 */
function sanitizePlaceName(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw.replace(/%2F/gi, "/").replace(/%2C/gi, ",");
  }
  return decoded
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\u200b\u200c\u200d]/g, "")
    .trim();
}

/**
 * Short Plus Codes ("WJRC+27M") need a nearby reference point. Nominatim often
 * fails on the full "Business Name, Street, City" remainder, so try the full
 * string first and then progressively drop leading comma-separated segments.
 */
async function findLocalityReference(
  locality: string
): Promise<NominatimHit | null> {
  let candidate = locality;
  while (candidate) {
    const reference = await nominatimSearch(candidate);
    if (reference) {
      return reference;
    }
    const commaIndex = candidate.indexOf(",");
    if (commaIndex === -1) {
      return null;
    }
    candidate = candidate.slice(commaIndex + 1).trim();
  }
  return null;
}

/**
 * Extracts a location from a full Google Maps URL. Place share links often
 * carry the coordinates only inside the place name (as a short Plus Code),
 * e.g. ".../maps/place/WJRC%2B27M+Hennaya/data=...". Falls back to resolving
 * the decoded place name through the regular geocode pipeline.
 */
async function resolveGoogleMapsUrl(
  url: string
): Promise<PickedLocation | null> {
  const coords = parseGoogleMapsUrl(url);
  if (coords) {
    return fromCoords(coords.latitude, coords.longitude);
  }
  const placeMatch = url.match(/google\.com\/maps\/place\/([^/?#]+)/i);
  if (placeMatch) {
    const placeName = sanitizePlaceName(placeMatch[1]);
    if (placeName) {
      return geocodeSearch(placeName);
    }
  }
  return null;
}

/**
 * Resolves a pasted location to coordinates. Accepts Google Maps share links
 * ("maps.app.goo.gl/xyz", "google.com/maps/place/…/@lat,lng,…z"), Plus Codes
 * ("XJ2C+22", "8C6WXJ2C+22 Hennaya"), "lat, lng" pairs, or any address/city
 * via the free OSM Nominatim geocoder. No API key required.
 */
export async function geocodeSearch(
  query: string
): Promise<PickedLocation | null> {
  const q = query.trim();
  if (!q) {
    return null;
  }

  const isMapUrl = /google\.com\/maps|google\.maps|google\.com\/maps\?/i.test(q);
  if (isMapUrl) {
    const resolved = await resolveGoogleMapsUrl(q);
    if (resolved) {
      return resolved;
    }
  }

  if (GOOGLE_SHORT_LINK.test(q)) {
    const finalUrl = await resolveGoogleMapsShortLink(q);
    if (finalUrl) {
      const resolved = await resolveGoogleMapsUrl(finalUrl);
      if (resolved) {
        return resolved;
      }
    }
  }

  const coords = parseLatLng(q);
  if (coords) {
    return fromCoords(coords.latitude, coords.longitude);
  }

  const plusCodeMatch = q.match(PLUS_CODE_PATTERN);
  if (plusCodeMatch) {
    const plusCode = plusCodeMatch[0].replace(/\s+/g, "");
    const decoded = decodePlusCode(plusCode);
    if (decoded) {
      return fromCoords(decoded.latitude, decoded.longitude);
    }
    const locality = sanitizePlaceName(q.replace(plusCodeMatch[0], ""));
    if (locality) {
      const reference = await findLocalityReference(locality);
      if (reference) {
        const expanded = expandShortPlusCode(
          plusCode,
          reference.latitude,
          reference.longitude
        );
        return fromCoords(expanded.latitude, expanded.longitude);
      }
    }
  }

  const result = await nominatimSearch(q);
  if (!result) {
    return null;
  }
  const address = result.address;
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    address_line1:
      [address.house_number, address.road].filter(Boolean).join(" ") || null,
    address_line2: address.suburb ?? address.neighbourhood ?? null,
    city: address.city ?? address.town ?? address.village ?? null,
    state: address.state ?? null,
    country: address.country ?? address.country_code ?? null,
    postal_code: address.postcode ?? null,
  };
}
