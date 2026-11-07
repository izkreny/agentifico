export default {
  testRunner: "vitest",
  // WHY: the default starts a runner on every CPU but one, which leaves the machine unusable for the whole run.
  concurrency: "40%",
  mutate: ["scripts/check.js", "scripts/lint-config.js", "scripts/rules/*.js"],
  // WHY: check.test.js imports nothing from check.js, so related mode would find no test for a check.js mutant.
  vitest: { configFile: "vitest.stryker.config.js", related: false },
};
