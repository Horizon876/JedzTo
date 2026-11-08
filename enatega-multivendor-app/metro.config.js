const path = require('path')
const fs = require('fs')
const { getDefaultConfig } = require('expo/metro-config')

const defaultConfig = getDefaultConfig(__dirname)
defaultConfig.resolver.sourceExts.push('cjs')
defaultConfig.useWatchman = false
// Prefer CJS `main` over broken `module` fields (e.g. react-async-hook on web).
defaultConfig.resolver.resolverMainFields = ['react-native', 'browser', 'main']

// Keep Metro cache inside the project — avoids Windows EPERM when multiple
// Expo apps share %TEMP%\metro-cache (or a shared .jedzto-temp folder).
const cacheRoot = path.join(__dirname, '.metro-cache')
fs.mkdirSync(cacheRoot, { recursive: true })
try {
  const { FileStore } = require('metro-cache')
  defaultConfig.cacheStores = [new FileStore({ root: cacheRoot })]
} catch {
  defaultConfig.cacheStores = []
}

const WEB_STUBS = {
  'react-native-maps': path.resolve(__dirname, 'src/web/stubs/react-native-maps.js'),
  'react-native-maps-directions': path.resolve(
    __dirname,
    'src/web/stubs/react-native-maps-directions.js'
  ),
  'react-native-keyboard-controller': path.resolve(
    __dirname,
    'src/web/stubs/react-native-keyboard-controller.js'
  ),
  '@react-native-google-signin/google-signin': path.resolve(
    __dirname,
    'src/web/stubs/google-signin.js'
  ),
  '@microsoft/react-native-clarity': path.resolve(
    __dirname,
    'src/web/stubs/clarity.js'
  ),
  'expo-tracking-transparency': path.resolve(
    __dirname,
    'src/web/stubs/expo-tracking-transparency.js'
  ),
  // Broken `module` field in published package; force CJS entry for web.
  'react-async-hook': path.resolve(
    __dirname,
    'node_modules/react-async-hook/dist/index.js'
  )
}

const upstreamResolveRequest = defaultConfig.resolver.resolveRequest
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return {
      filePath: WEB_STUBS[moduleName],
      type: 'sourceFile'
    }
  }
  if (typeof upstreamResolveRequest === 'function') {
    return upstreamResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = defaultConfig
