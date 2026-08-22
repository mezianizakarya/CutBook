import { createContext, useContext } from "react";

const ShopCountryContext = createContext<string | null>(null);

export const ShopCountryProvider = ShopCountryContext.Provider;

export function useShopCountry(): string | null {
  return useContext(ShopCountryContext);
}
