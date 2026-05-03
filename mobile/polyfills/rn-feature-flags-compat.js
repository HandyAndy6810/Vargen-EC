// Expo Go SDK 54 ships without NativeReactNativeFeatureFlags.disableEventLoopOnBridgeless.
// Patch it onto the TurboModule object before ReactNativeFeatureFlags.js loads.
if (global.__turboModuleProxy) {
  const original = global.__turboModuleProxy;
  global.__turboModuleProxy = function (name) {
    const mod = original(name);
    if (name === 'NativeReactNativeFeatureFlags' && mod != null) {
      if (typeof mod.disableEventLoopOnBridgeless !== 'function') {
        mod.disableEventLoopOnBridgeless = function () { return false; };
      }
    }
    return mod;
  };
}
