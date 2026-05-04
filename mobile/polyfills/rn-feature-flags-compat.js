// Expo Go SDK 54: NativeReactNativeFeatureFlagsCxx is missing
// disableEventLoopOnBridgeless. JSI HostObjects reject direct property
// assignment, so we intercept the TurboModule via a Proxy.
function makeWrapper(original) {
  return function (name) {
    var mod = original(name);
    if (name === 'NativeReactNativeFeatureFlagsCxx') {
      var target = mod || {};
      return new Proxy(target, {
        get: function (t, prop) {
          if (typeof prop !== 'string') return t[prop];
          if (mod != null) {
            var native = mod[prop];
            if (typeof native === 'function') return native.bind(mod);
            if (native != null) return native;
          }
          // Default any missing boolean feature-flag method to () => false.
          return function () { return false; };
        },
      });
    }
    return mod;
  };
}

if (global.__turboModuleProxy) {
  global.__turboModuleProxy = makeWrapper(global.__turboModuleProxy);
} else {
  var _inner;
  Object.defineProperty(global, '__turboModuleProxy', {
    configurable: true,
    enumerable: true,
    get: function () { return _inner; },
    set: function (v) { _inner = v ? makeWrapper(v) : v; },
  });
}
