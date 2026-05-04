// Stub for NativeReactNativeFeatureFlags — Expo Go SDK 54's native binary
// does not expose all TurboModule methods. This stub returns false for any
// missing method so ReactNativeFeatureFlags falls back to its defaults safely.
module.exports = new Proxy({}, {
  get: function (_, prop) {
    if (typeof prop === 'string') {
      return function () { return false; };
    }
    return undefined;
  },
});
