import fs from "node:fs";

// WHY: Stryker's Vitest runner collects mutant coverage in the test process only, so a spawned check hands its own back through a file, or every mutant only the spawn reaches is planned as uncovered and never run.
process.on("exit", () => {
  const coverage = globalThis.__stryker__?.mutantCoverage;
  if (coverage) fs.writeFileSync(process.env.STRYKER_CHILD_COVERAGE, JSON.stringify(coverage));
});
