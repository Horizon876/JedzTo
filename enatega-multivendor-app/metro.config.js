const path = require('path')
const fs = require('fs')
const { getDefaultConfig } = require('expo/metro-config')

const defaultConfig = getDefaultConfig(__dirname)
defaultConfig.resolver.sourceExts.push('cjs')
defaultConfig.useWatchman = false

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

module.exports = defaultConfig
