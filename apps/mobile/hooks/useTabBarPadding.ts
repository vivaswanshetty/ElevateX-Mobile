import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Returns the bottom padding required to keep content visible above the
 * floating AppTabBar.
 *
 * The bar sits at:  bottom = max(insets.bottom, 10)
 * The bar height:   8 (paddingTop) + 58 (minHeight) + 8 (paddingBottom) = 74px
 * Extra gap:        12px breathing room
 *
 * Total = 74 + max(insets.bottom, 10) + 12
 */
export function useTabBarPadding(): number {
  const insets = useSafeAreaInsets();
  const barBottom = Math.max(insets.bottom, 10);
  const barHeight = 74; // paddingTop(8) + minHeight(58) + paddingBottom(8)
  const gap = 12;
  return barBottom + barHeight + gap;
}
