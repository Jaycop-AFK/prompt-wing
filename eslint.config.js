// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    // These compiler-oriented rules flag established React Native patterns in this app:
    // loading persisted state in effects, reading a stable clock value while rendering,
    // and updating Reanimated shared values. Keep the runtime behavior during the SDK 57
    // migration; the React Compiler safely skips components it cannot optimize.
    rules: {
      // Expo SDK 57 packages expose several TypeScript source entry points that the
      // current import resolver reports as missing even though Node, TypeScript,
      // Expo Doctor, and Metro resolve them correctly. Keep checks for every other import.
      'import/no-unresolved': ['error', { ignore: ['^expo(?:$|-)', '^expo-router/'] }],
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
