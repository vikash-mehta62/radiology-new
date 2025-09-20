const path = require('path');

module.exports = function override(config, env) {
  // Disable TypeScript type checking for faster builds
  config.plugins = config.plugins.filter(plugin => 
    plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
  );

  // Add fallbacks for Node.js modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "fs": false,
    "path": require.resolve("path-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
    "util": require.resolve("util")
  };

  // Ignore TypeScript errors
  config.module.rules.forEach(rule => {
    if (rule.oneOf) {
      rule.oneOf.forEach(oneOfRule => {
        if (oneOfRule.test && oneOfRule.test.toString().includes('tsx?')) {
          oneOfRule.options = {
            ...oneOfRule.options,
            transpileOnly: true,
            compilerOptions: {
              ...oneOfRule.options?.compilerOptions,
              noEmit: false,
              skipLibCheck: true,
              strict: false
            }
          };
        }
      });
    }
  });

  return config;
};