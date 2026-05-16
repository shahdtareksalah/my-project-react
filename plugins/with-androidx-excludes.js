const { withGradleProperties, withProjectBuildGradle } = require('expo/config-plugins');

const SUPPORT_EXCLUDE_BLOCK = `
allprojects {
  configurations.configureEach {
    exclude group: 'com.android.support'

    resolutionStrategy {
      force 'androidx.core:core:1.15.0'
      force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
    }
  }
}

subprojects { subproject ->
  afterEvaluate {
    configurations.configureEach {
      exclude group: 'com.android.support'

      resolutionStrategy {
        force 'androidx.core:core:1.15.0'
        force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
      }
    }
  }
}
`;

function upsertProperty(properties, key, value) {
  const existing = properties.find((item) => item.type === 'property' && item.key === key);
  if (existing) {
    existing.value = value;
  } else {
    properties.push({ type: 'property', key, value });
  }
}

module.exports = function withAndroidXExcludes(config) {
  config = withGradleProperties(config, (config) => {
    upsertProperty(config.modResults, 'android.useAndroidX', 'true');
    upsertProperty(config.modResults, 'android.enableJetifier', 'true');
    upsertProperty(config.modResults, 'android.compileSdkVersion', '35');
    upsertProperty(config.modResults, 'android.targetSdkVersion', '34');
    upsertProperty(config.modResults, 'android.minSdkVersion', '24');
    return config;
  });

  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("exclude group: 'com.android.support'")) {
      config.modResults.contents = config.modResults.contents.replace(
        'apply plugin: "expo-root-project"',
        `${SUPPORT_EXCLUDE_BLOCK}\napply plugin: "expo-root-project"`,
      );
    }

    return config;
  });
};
