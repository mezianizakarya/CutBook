/** Shared sizing and motion tokens for the floating tab bar. */
export const TAB_BAR = {
  /** Height of the floating capsule. */
  height: 60,
  /** Horizontal margin from the screen edges. */
  horizontalMargin: 14,
  /** Gap between the screen content and the top of the capsule. */
  topMargin: 12,
  /** Gap between the capsule and the safe area bottom edge. */
  bottomMargin: 6,
  /** Size of regular tab icons. */
  iconSize: 28,
  /** Diameter of the profile avatar inside the bar. */
  avatarSize: 28,
  /** Duration of the active/inactive transition, feels native on iOS. */
  animationDuration: 100,
} as const;
