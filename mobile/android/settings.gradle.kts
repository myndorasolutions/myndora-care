pluginManagement {
    val localPropertiesFile = settingsDir.resolve("local.properties")
    val properties = java.util.Properties()

    if (localPropertiesFile.exists()) {
        localPropertiesFile.inputStream().use { properties.load(it) }
    }

    val flutterSdkPath = properties.getProperty("flutter.sdk")
        ?: System.getenv("FLUTTER_ROOT")
        ?: error("Flutter SDK path not found. Ensure local.properties or FLUTTER_ROOT is set.")

    includeBuild("$flutterSdkPath/packages/flutter_tools/gradle")

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("dev.flutter.flutter-plugin-loader") version "1.0.0"
    id("com.android.application") version "8.11.1" apply false
    id("org.jetbrains.kotlin.android") version "2.2.20" apply false
}

include(":app")