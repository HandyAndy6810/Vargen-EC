// Expo Go SDK 54: NativeReactNativeFeatureFlags.disableEventLoopOnBridgeless is not
// exposed in the native binary. JSI HostObjects reject direct property assignment,
// so we wrap the module in a Proxy that intercepts the missing method.
function makeWrapper(original) {
  return function (name) {
    var mod = original(name);
    if (name === 'NativeReactNativeFeatureFlags' && mod != null) {
      return new Proxy(mod, {
        get: function (target, prop) {
          if (prop === 'disableEventLoopOnBridgeless') {
            return typeof target.disableEventLoopOnBridgeless === 'function'
              ? target.disableEventLoopOnBridgeless.bind(target)
              : function () { return false; };
          }
          var val = target[prop];
          return typeof val === 'function' ? val.bind(target) : val;
        },
      });
    }
    return mod;
  };
}

if (global.__turboModuleProxy) {
  // Already installed (bridge or early-init bridgeless) — wrap immediately.
  global.__turboModuleProxy = makeWrapper(global.__turboModuleProxy);
} else {
  // Bridgeless new arch installs __turboModuleProxy after polyfills run.
  // Intercept the assignment so we wrap it the moment it appears.
  var _inner;
  Object.defineProperty(global, '__turboModuleProxy', {
    configurable: true,
    enumerable: true,
    get: function () { return _inner; },
    set: function (v) { _inner = v ? makeWrapper(v) : v; },
  });
}
