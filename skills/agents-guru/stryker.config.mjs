export default {
  testRunner: "vitest",
  mutate: ["scripts/check.js", "scripts/lint-config.js", "scripts/rules/*.js"],
  // WHY: check.test.js imports nothing from check.js, so related mode would find no test for a check.js mutant.
  vitest: { configFile: "vitest.stryker.config.js", related: false },
};
