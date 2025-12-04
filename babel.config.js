// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            'react-native-skia': '@shopify/react-native-skia',
          },
        },
      ],
      'react-native-reanimated/plugin', // ⬅️ altijd als laatste!
    ],
  };
};
