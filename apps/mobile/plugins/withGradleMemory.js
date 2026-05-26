const { withGradleProperties } = require("expo/config-plugins");

/** Expo config plugin that increases Gradle JVM memory to prevent Metaspace exhaustion. */
function withGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    // Find and replace, or add the jvmargs property
    const props = config.modResults;
    const jvmArgsIdx = props.findIndex(
      (p) => p.type === "property" && p.key === "org.gradle.jvmargs"
    );

    const newValue =
      "-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError";

    if (jvmArgsIdx >= 0) {
      props[jvmArgsIdx].value = newValue;
    } else {
      props.push({
        type: "property",
        key: "org.gradle.jvmargs",
        value: newValue,
      });
    }

    return config;
  });
}

module.exports = withGradleMemory;
