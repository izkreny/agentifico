# Setting up the check

Read this once per install, before the first run of `workflows/check.md`, and again when the check refuses for a missing or old Vale.

The check runs on the Node version `package.json` names under `engines`, with what that file declares, installed once into the skill's own directory. `<skill-dir>` is where this skill is installed, one of the placeholders `workflows/new.md` defines under *Paths must survive any working directory and any machine*:

```bash
npm --prefix <skill-dir> ci
```

The prose rules run through Vale on `PATH`, at the version `scripts/check.js` requires; a run on an older one refuses and names that version. Vale's [installation page](https://docs.vale.sh/topics/installation) gives a route per machine; a pinned version through a tool manager is the one that keeps the version the rules were written against.
