// frontend/config-overrides.js
const path = require("path");

module.exports = function override(config) {
  console.log("✅ Custom Webpack override is running!");

  config.resolve = {
    ...config.resolve,
    extensions: [".js", ".jsx", ".json"],
    mainFiles: ["main", "index"],
  };

  config.entry = path.resolve(__dirname, "src/main.jsx");

  return config;
};
