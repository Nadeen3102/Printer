const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withMinSdkVersion(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      // Replace existing minSdkVersion line if it exists
      if (config.modResults.contents.match(/minSdkVersion\s*=\s*\d+/)) {
        config.modResults.contents = config.modResults.contents.replace(
          /minSdkVersion\s*=\s*\d+/,
          "minSdkVersion = 26"
        );
      } else {
        // Otherwise, inject it inside defaultConfig block
        config.modResults.contents = config.modResults.contents.replace(
          /defaultConfig\s*{([\s\S]*?)}/,
          (match, p1) => `defaultConfig {\n${p1}\n        minSdkVersion 26\n    }`
        );
      }
    } else {
      console.warn("⚠️ Could not modify minSdkVersion (non-Groovy Gradle format)");
    }

    return config;
  });
};
