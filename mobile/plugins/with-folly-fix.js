const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// expo-build-properties ccFlags only reaches the main app target, NOT pod targets.
// CocoaPods forbids multiple post_install blocks, so we inject inside the existing one.
// Sets -DFOLLY_CFG_NO_COROUTINES=1 on every pod target to prevent folly/Expected.h
// from trying to include folly/coro/Coroutine.h (missing on Xcode 16 / RN 0.81.x).
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

      // Inject our lines right after the opening "post_install do |installer|" line
      const injection = [
        `  ${tag}`,
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |cfg|',
        "      flags = cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'",
        "      cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] = \"#{flags} -DFOLLY_CFG_NO_COROUTINES=1\"",
        '    end',
        '  end',
      ].join('\n');

      podfile = podfile.replace(
        /^(post_install do \|installer\|)\s*$/m,
        `$1\n${injection}`
      );

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
