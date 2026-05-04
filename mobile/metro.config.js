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

// Expo Go SDK 54: redirect NativeReactNativeFeatureFlags to a stub so missing
// TurboModule methods never reach logUnavailableNativeModuleError.
config.resolver.resolveRequest = (context, moduleName, _platform) => {
  if (moduleName.includes('NativeReactNativeFeatureFlags')) {
    return { type: 'sourceFile', filePath: path.resolve(__dirname, 'mocks/NativeReactNativeFeatureFlags.js') };
  }
  return context.resolveRequest(context, moduleName, _platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
