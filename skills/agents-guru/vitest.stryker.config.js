import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/test/**/*.test.js"],
    // WHY: vale.test.js spawns Vale to test .vale.ini, prose config Stryker cannot mutate, so it kills no mutant and only lengthens every run.
    exclude: [...configDefaults.exclude, "scripts/test/vale.test.js"],
    // WHY: Stryker reads any failing test as a kill, so Vitest's fixed limits turned a slow stretch under load into false kills; zero turns them off and leaves Stryker's own limit, which scales with each mutant's measured time and reports a runaway mutant as Timeout.
    testTimeout: 0,
    hookTimeout: 0,
  },
});
