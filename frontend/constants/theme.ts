/** Legacy light/dark structure expected by themed-text, themed-view, use-theme-color */
const tintColorLight = '#FF7F24';
const tintColorDark = '#fff';

export const Colors = {
  // Legacy themed tokens (used by ThemedText/ThemedView/use-theme-color)
  light: {
    text: '#11181C',
    background: '#FFF2E4',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },

  // Brand
  primary: '#FF7F24',
  primaryDark: '#DF7021',

  // Backgrounds
  cream: '#FFF2E4',
  creamCard: '#FFE4D0',
  creamShadow: '#FFDCC4',

  // Pressure Tracker (red theme)
  trackerRed: '#CA0908',
  trackerBg: '#FFF4F4',
  trackerCardBg: '#FFDDDC',

  // Navigation
  navDark: '#0D1A63',
  pressureMapBg: '#070021',

  // Alerts
  alertBlue: '#0992E7',

  // Text
  textDark: '#1E1446',
  textBrown: '#865E4A',
  textCream: '#FFF2E4',

  // Chat
  chatBubbleDark: '#8C3A00',
  chatBubbleLight: 'rgba(140,58,0,0.59)',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
};

export const PressureColors = {
  low: '#FFE283',
  mid: '#FF9A40',
  high: '#CA0606',
};

/** Map a normalised pressure value (0–1) to a colour string */
export function pressureColor(value: number): string {
  if (value <= 0) return 'transparent';
  if (value < 0.5) {
    // yellow → orange
    const t = value / 0.5;
    const r = Math.round(0xff + t * (0xff - 0xff));
    const g = Math.round(0xe2 + t * (0x9a - 0xe2));
    const b = Math.round(0x83 + t * (0x40 - 0x83));
    return `rgb(${r},${g},${b})`;
  }
  // orange → red
  const t = (value - 0.5) / 0.5;
  const r = 0xff;
  const g = Math.round(0x9a + t * (0x06 - 0x9a));
  const b = Math.round(0x40 + t * (0x06 - 0x40));
  return `rgb(${r},${g},${b})`;
}
