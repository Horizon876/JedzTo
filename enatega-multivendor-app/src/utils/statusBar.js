/** @param {'Pink' | 'Dark' | string} themeValue */
export function statusBarStyleForTheme(themeValue) {
  return themeValue === 'Dark' ? 'light-content' : 'dark-content'
}
