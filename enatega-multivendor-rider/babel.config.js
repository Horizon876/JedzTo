module.exports = function (api) {
  api.cache(true)
  const isProduction = process.env.NODE_ENV === 'production'
  const plugins = []

  if (isProduction) {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }])
  }

  // Must be last
  plugins.push('react-native-reanimated/plugin')

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins,
  }
}
