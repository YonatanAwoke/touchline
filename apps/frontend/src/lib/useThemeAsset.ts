import { useTheme } from "./theme";

/**
 * Pick the asset that matches the resolved theme.
 * Usage: const src = useThemeAsset(lightImg, darkImg);
 */
export function useThemeAsset<T = string>(light: T, dark: T): T {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? dark : light;
}
