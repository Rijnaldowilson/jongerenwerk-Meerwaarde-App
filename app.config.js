// app.config.js
export default {
  expo: {
    name: "MeerWaarde Jongerenwerk",
    slug: "meerwaarde-jongerenwerk",
    scheme: "meerwaarde",
    version: "1.0.0",
    orientation: "portrait",

    // ⬇️ LET OP: pad naar jouw echte icon
    icon: "./assets/images/icon.png",

    userInterfaceStyle: "light",
    splash: {
      // ⬇️ eventueel ook jouw icon gebruiken als splash image
      image: "./assets/images/icon.png",
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
      bundleIdentifier: "nl.meerwaarde.jongerenwerk",
    },

    android: {
      adaptiveIcon: {
        // ⬇️ gebruik dezelfde icon als adaptive icon
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#FFFFFF",
      },
      package: "nl.meerwaarde.jongerenwerk",
    },

    web: {
      // desnoods hetzelfde icoontje als favicon
      favicon: "./assets/images/icon.png",
    },

    extra: {
      ENV: "production",
      eas: {
        projectId: "3b4c2ea8-dce0-4c0c-a325-5beb035cf06f", // jouw projectId
      },
    },
  },
};
