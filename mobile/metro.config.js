const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Allow importing from ../shared
config.watchFolders = [path.resolve(__dirname, "../shared")];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// Polyfill missing NativeReactNativeFeatureFlags methods for Expo Go SDK 54
const existingGetPolyfills = config.serializer.getPolyfills ?? (() => []);
config.serializer.getPolyfills = (...args) => [
  ...existingGetPolyfills(...args),
  path.resolve(__dirname, 'polyfills/rn-feature-flags-compat.js'),
];

module.exports = withNativeWind(config, { input: "./global.css" });
