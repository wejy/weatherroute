import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^server-only$": "<rootDir>/src/__tests__/mocks/server-only.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node16",
          esModuleInterop: true,
          isolatedModules: true,
          rootDir: ".",
          types: ["node", "jest"],
        },
      },
    ],
  },
  clearMocks: true,
};

export default config;
