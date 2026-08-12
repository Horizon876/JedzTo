/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add Node.js polyfills for React Native
config.resolver.alias = {
  ...config.resolver.alias,
  assert: require.resolve("assert"),
  events: require.resolve("events"),
  stream: require.resolve("stream"),
  util: require.resolve("util"),
  buffer: require.resolve("buffer"),
  process: require.resolve("process"),
};

config.resolver.fallback = {
  ...config.resolver.fallback,
  assert: require.resolve("assert"),
  events: require.resolve("events"),
  stream: require.resolve("stream"),
  util: require.resolve("util"),
  buffer: require.resolve("buffer"),
  process: require.resolve("process"),
};

// Project-local Metro cache — fixes Windows EPERM on shared .jedzto-temp\metro-cache
const cacheRoot = path.join(__dirname, ".metro-cache");
fs.mkdirSync(cacheRoot, { recursive: true });
try {
  const { FileStore } = require("metro-cache");
  config.cacheStores = [new FileStore({ root: cacheRoot })];
} catch {
  config.cacheStores = [];
}

module.exports = withNativeWind(config, { input: "./global.css" });
