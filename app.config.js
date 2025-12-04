// app.config.js
export default {
  expo: {
    name: "MeerWaarde Jongerenwerk",
    slug: "meerwaarde-jongerenwerk",
    scheme: "meerwaarde",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
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
    foregroundImage: "./assets/icon.png",
    backgroundColor: "#FFFFFF",
  },
  package: "nl.meerwaarde.jongerenwerk",
},


    web: {
      favicon: "./assets/favicon.png",
    },

    extra: {
      ENV: "production",
      eas: {
        projectId: "3b4c2ea8-dce0-4c0c-a325-5beb035cf06f",
      },
    },
  },
};
