const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// SDK 52+ auto-configures monorepos (watchFolders / nodeModulesPaths).
// Do not set disableHierarchicalLookup — it breaks Expo Go resolution.

module.exports = config;
