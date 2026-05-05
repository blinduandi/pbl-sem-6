/**
 * Room Manager — design tokens.
 * Supabase-inspired dark palette. Used by every screen and component.
 */

export const colors = {
  bgPage: '#171717',
  bgSurface: '#1c1c1c',
  bgElevated: '#202020',
  bgButton: '#0f0f0f',
  textPrimary: '#fafafa',
  textSecondary: '#b4b4b4',
  textMuted: '#898989',
  borderSubtle: '#242424',
  borderDefault: '#2e2e2e',
  borderProminent: '#363636',
  brandGreen: '#3ecf8e',
  brandGreenLink: '#00c573',
  brandGreenBorder: 'rgba(62, 207, 142, 0.3)',
  brandGreenGlow: 'rgba(62, 207, 142, 0.12)',
  warning: '#f5a524',
  danger: '#e5484d',
  info: '#5b8bf7',
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const typography = {
  hero: {
    fontFamily: 'Inter_400Regular',
    fontSize: 40,
    lineHeight: 40,
  },
  heading: {
    fontFamily: 'Inter_400Regular',
    fontSize: 24,
    lineHeight: 30,
  },
  cardTitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.16,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 16,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  techLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
} as const;

export type ThemeColors = typeof colors;
