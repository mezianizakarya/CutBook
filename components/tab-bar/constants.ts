/** Shared sizing and motion tokens for the floating tab bar. */
export const TAB_BAR = {
  /** Height of the floating capsule. */
  height: 72,
  /** Horizontal margin from the screen edges. */
  horizontalMargin: 20,
  /** Gap between the screen content and the top of the capsule. */
  topMargin: 12,
  /** Gap between the capsule and the safe area bottom edge. */
  bottomMargin: 18,
  /** Size of regular tab icons. */
  iconSize: 24,
  /** Diameter of the profile avatar inside the bar. */
  avatarSize: 28,
  /** Duration of the active/inactive transition, feels native on iOS. */
  animationDuration: 200,
} as const;
