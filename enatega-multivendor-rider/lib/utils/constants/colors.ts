/**
 * JedzTo kitchen / rider palette — aligned with the customer app dark UI.
 */

const JEDZTO = {
  page: '#121212',
  surface: '#1C1C1E',
  hairline: '#2C2C2E',
  accent: '#00A8FF',
  text: '#FFFFFF',
  muted: '#8E8E93',
  mutedSoft: '#9CA3AF',
  destructive: '#FF453A',
  white: '#FFFFFF',
  black: '#000000',
}

const jedztoTheme = {
  primary: JEDZTO.accent,
  themeBackground: JEDZTO.page,
  screenBackground: JEDZTO.page,
  iconColor: JEDZTO.text,
  tagColor: JEDZTO.accent,
  iconPink: JEDZTO.accent,
  radioColor: JEDZTO.surface,
  radioOuterColor: JEDZTO.accent,
  spinnerColor: JEDZTO.accent,
  orderComplete: JEDZTO.accent,
  orderUncomplete: JEDZTO.destructive,
  horizontalLine: JEDZTO.hairline,
  buttonBackground: JEDZTO.accent,
  buttonText: JEDZTO.white,
  buttonBackgroundPink: JEDZTO.accent,
  buttonTextPink: JEDZTO.white,
  textErrorColor: JEDZTO.destructive,
  headerBackground: JEDZTO.page,
  headerText: JEDZTO.text,
  fontMainColor: JEDZTO.text,
  fontSecondColor: JEDZTO.muted,
  cartContainer: JEDZTO.surface,
  startColor: JEDZTO.accent,
  white: JEDZTO.white,
  black: JEDZTO.black,
  tabNaviatorBackground: JEDZTO.page,
  secondaryTextColor: JEDZTO.muted,
  lowOpacityPrimaryColor: 'rgba(0, 168, 255, 0.15)',
  mainTextColor: JEDZTO.text,
  switchButtonColor: JEDZTO.accent,
  sidebarIconBackground: JEDZTO.surface,
  borderLineColor: JEDZTO.hairline,
  gray: JEDZTO.hairline,
  mapBackground: JEDZTO.surface,
}

export const Colors = {
  light: { ...jedztoTheme },
  dark: { ...jedztoTheme },
}

export const JedzToTokens = JEDZTO
