/// <reference types="vitest" />
import baseConfig from "../../vitest.config.base";
import { mergeConfig } from "vitest/config";

export default mergeConfig(baseConfig, {
  test: {
    name: "@helios/ui",
    environment: "jsdom",
    server: {
      deps: {
        inline: [
          /@creit\.tech\/stellar-wallets-kit/,
          /@stellar\/freighter-api/,
        ],
      },
    },
  },
});
