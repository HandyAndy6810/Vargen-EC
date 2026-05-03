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

module.exports = withNativeWind(config, { input: "./global.css" });
