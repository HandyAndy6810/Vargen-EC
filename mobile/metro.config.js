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

const finalConfig = withNativeWind(config, { input: "./global.css" });

// Apply AFTER withNativeWind so it doesn't overwrite us
const nativeWindResolver = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.includes('NativeReactNativeFeatureFlags')) {
    return { type: 'sourceFile', filePath: path.resolve(__dirname, 'mocks/NativeReactNativeFeatureFlags.js') };
  }
  if (nativeWindResolver) {
    return nativeWindResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = finalConfig;
