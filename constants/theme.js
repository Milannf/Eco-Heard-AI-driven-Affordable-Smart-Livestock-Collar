// AgriTrack Design System — Centralized Design Tokens
// All screens must consume these tokens. Do NOT hardcode colors.

export const COLORS = {
  // Primary Green Palette
  primaryDark: '#183D2B',
  primary: '#2F6B3B',
  secondary: '#4F8A4C',
  fresh: '#78A85A',
  softGreen: '#DCEAD7',
  veryLight: '#EEF5EA',

  // Backgrounds
  background: '#F7FAF5',
  surface: '#FFFFFF',

  // Text
  text: '#1E2A20',
  textLight: '#68756A',
  textMuted: '#9AACA0',

  // Borders
  border: '#DDE6DA',
  borderLight: '#EEF3EC',

  // Semantic — Only for health status communication
  success: '#2F6B3B',
  successMid: '#4F8A4C',
  successBg: '#EEF5EA',
  successBorder: '#C5DEB8',

  warning: '#8A6A1A',
  warningBg: '#FDF5E0',
  warningBorder: '#E8D68A',

  danger: '#9B2C2C',
  dangerBg: '#FDF0F0',
  dangerBorder: '#F5C2C2',

  // Tab bar
  tabActive: '#2F6B3B',
  tabInactive: '#A0ABA2',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  pagePadding: 20,
  inputHeight: 52,
};

export const FONTS = {
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  kpi: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.primaryDark,
    letterSpacing: -0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  body: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  round: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#183D2B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  strong: {
    shadowColor: '#183D2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  button: {
    shadowColor: '#183D2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
};
