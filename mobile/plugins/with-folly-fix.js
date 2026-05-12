const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// expo-build-properties ccFlags only reaches the main app target, NOT pod targets.
// This plugin injects a post_install hook into the Podfile that sets
// -DFOLLY_CFG_NO_COROUTINES=1 on every pod's build configuration, which prevents
// folly/Expected.h from trying to include folly/coro/Coroutine.h (missing on RN 0.81.x + old arch).
module.exports = function withFollyFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const tag = '# withFollyFix: FOLLY_CFG_NO_COROUTINES';
      if (podfile.includes(tag)) {
        return config;
      }

      const hook = [
        '',
        tag,
        'post_install do |installer|',
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |cfg|',
        "      flags = cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'",
        "      cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] = \"#{flags} -DFOLLY_CFG_NO_COROUTINES=1\"",
        '    end',
        '  end',
        'end',
        '',
      ].join('\n');

      fs.writeFileSync(podfilePath, podfile + hook);
      return config;
    },
  ]);
};
