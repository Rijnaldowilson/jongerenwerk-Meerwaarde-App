// app.config.js
export default {
  expo: {
    name: "MeerWaarde Jongerenwerk", // naam zoals zichtbaar op telefoon
    slug: "meerwaarde-jongerenwerk",
    scheme: "meerwaarde", // voor deep linking, mag je zo laten
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png", // zorg dat deze bestaat
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png", // mag ook iets simpels zijn
      resizeMode: "contain",
      backgroundColor: "#FFFFFF",
    },
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "nl.meerwaarde.jongerenwerk", // 1x kiezen en zo laten
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF",
      },
      package: "nl.meerwaarde.jongerenwerk",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      eas: {
        projectId: "REPLACE-ME-WITH-EAS-PROJECT-ID",
      },
      SUPABASE_URL: "https://JOUW-PROJECT.supabase.co",
      SUPABASE_ANON_KEY: "JOUW_SUPABASE_ANON_KEY",
      ENV: "production",
    },
  },
};
