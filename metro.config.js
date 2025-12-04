// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Forceer alias: elke import van 'react-native-skia' wordt '@shopify/react-native-skia'
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'react-native-skia': '@shopify/react-native-skia',
};

module.exports = config;
