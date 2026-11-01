/** Build-time app role: kitchen app vs rider/delivery app. */
export type AppRole = 'kitchen' | 'delivery'

/**
 * Resolves the locked app role from Expo public env.
 * Defaults to kitchen so existing Sunmi / kitchen builds keep previous behaviour.
 */
export function resolveAppRole(
  raw: string | undefined | null = process.env.EXPO_PUBLIC_APP_ROLE
): AppRole {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
  if (value === 'delivery' || value === 'rider' || value === 'kierowca') {
    return 'delivery'
  }
  return 'kitchen'
}

export const APP_ROLE = resolveAppRole()
