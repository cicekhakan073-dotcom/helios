/// <reference types="vitest" />
import baseConfig from "../../vitest.config.base";
import { mergeConfig } from "vitest/config";

export default mergeConfig(baseConfig, {
  test: {
    name: "@helios/sdk",
    environment: "node",
    server: {
      deps: {
        // Wallet kit + Freighter API CJS/ESM dual hatalarını inline transform ile aş
        inline: [
          /@creit\.tech\/stellar-wallets-kit/,
          /@stellar\/freighter-api/,
        ],
      },
    },
  },
});
