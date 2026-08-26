import * as Location from "expo-location";
import { createContext, useContext, useEffect, useState } from "react";

import { setGlobalCountry } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/expo";

export const CountryContext = createContext<string>("US");

async function detectLocation(): Promise<{ country: string; city: string | null } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    const [place] = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    if (!place) return null;
    return {
      country: place.isoCountryCode ?? "US",
      city: place.city ?? place.district ?? null,
    };
  } catch {
    return null;
  }
}

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [country, setCountry] = useState<string>("US");

  useEffect(() => {
    if (!user?.id) {
      setCountry("US");
      setGlobalCountry("US");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await detectLocation();
        const code = result?.country ?? "US";
        const city = result?.city ?? null;
        if (!cancelled) {
          setCountry(code);
          setGlobalCountry(code);
        }
        await supabase
          .from("profiles")
          .update({ country: code, city })
          .eq("id", user.id);
      } catch {
        if (!cancelled) {
          setCountry("US");
          setGlobalCountry("US");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <CountryContext.Provider value={country}>
      {children}
    </CountryContext.Provider>
  );
}

export function useUserCountry(): string {
  return useContext(CountryContext);
}
