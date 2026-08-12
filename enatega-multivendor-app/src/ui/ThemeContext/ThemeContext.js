import React from 'react'

const ThemeContext = React.createContext({
  ThemeValue: 'Pink',
  ThemePreference: 'System',
  dispatch: () => {}
})

export default ThemeContext
