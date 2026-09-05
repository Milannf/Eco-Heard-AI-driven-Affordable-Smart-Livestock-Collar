export const COLORS = {
  primaryDark: '#263D18',
  primary: '#3F6228',
  secondary: '#6F8A51',
  background: '#F7F5ED',
  surface: '#FFFFFF',
  text: '#20251D',
  textLight: '#6D7268',
  border: '#E3E1D8',
  success: '#4D8A3A',
  successBg: '#EAF5E5',
  warning: '#C88618',
  warningBg: '#FFF2D8',
  danger: '#B93A35',
  dangerBg: '#FBE8E6',
  earth: '#9B5D36',
  earthBg: '#F6E3D7',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  pagePadding: 20,
};

export const FONTS = {
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  kpi: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  body: {
    fontSize: 14,
    color: COLORS.text,
  },
  caption: {
    fontSize: 12,
    color: COLORS.textLight,
  },
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 18,
  round: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
};
