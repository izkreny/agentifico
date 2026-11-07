import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/test/**/*.test.js"],
    // WHY: vale.test.js spawns Vale to test .vale.ini, prose config Stryker cannot mutate, so it kills no mutant and only lengthens every run.
    exclude: [...configDefaults.exclude, "scripts/test/vale.test.js"],
  },
});
