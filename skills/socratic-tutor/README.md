> 🤖 Written by AI --- read/modified by izkreny! 🤓

# socratic-tutor

A tutor that helps you work out the answer to your own question instead of handing it over. It asks one probing question at a time, builds each question on your last answer, gives graded hints when you are stuck, and gives the final answer only when you have reached it or ask for it. It is not for when you want the answer straight away, or for work you want done on your behalf.

## Why it exists

An agent asked a question answers it, and an answer read is rarely an answer understood. This skill holds the agent to the other job: it works out the answer privately, plans a few checkpoints you have to reach, and then asks rather than tells, flexibly enough to follow your own route when it differs from the plan.

## Install

```bash
npx skills add izkreny/agentifico -g -y -s socratic-tutor
```

That is the [skills CLI](https://skills.sh).

## Invocation

Type `/socratic-tutor` followed by your question. The skill never fires on its own: its frontmatter sets `disable-model-invocation: true`, and its description says so for agents that ignore that field. It takes no arguments beyond the question. Ask for the final answer at any point to end the questions.

## Inspiration

Each link to a git host is pinned to the upstream commit this skill was last compared against, so later upstream changes can be read as a diff.

- [Paul & Elder, *The Art of Socratic Questioning*](https://www.criticalthinking.org/files/SocraticQuestioning2006.pdf): each question built on the last answer, and the directions a question can take around a claim.
- [mattpocock/skills, `grilling`](https://github.com/mattpocock/skills/blob/7739eaed7f8f3915437a8def198a6d0d7206dbc7/skills/productivity/grilling/SKILL.md): the agent looks up facts itself and asks the user only for what the user alone can supply.
- [EveryInc/teach-skill, the curriculum mode](https://github.com/EveryInc/teach-skill/blob/02ec4c8c2f49e5f490dcd300256fa443fda27b86/references/curriculum.md): asking what the learner already knows before teaching.
- [ChatGPT study mode system prompt](https://gist.github.com/idcesares/c28c7a7189726dc3d8a89b6db92c1c8d/82c66256579f12be38acf7086df5b1916141a1de): building from what the user already knows, one question per step.
- [Sharan0516/socratic-tutor](https://github.com/Sharan0516/socratic-tutor/blob/0013716e69b468e439de6ed0d4fb6305d96178dd/SKILL.md): asking why a correct answer is correct, "what would happen if that were true?" for a wrong one, and stepping back after a run of short replies.
- [github/awesome-copilot, `mentoring-juniors`](https://github.com/github/awesome-copilot/blob/306a2d30e62b3e419bb695677cdb4a9dc212e2b7/skills/mentoring-juniors/SKILL.md): the graded hint ladder, and "not yet" in place of "wrong".
- [Gemini guided learning system prompt](https://github.com/asgeirtj/system_prompts_leaks/blob/573abf404fb51d56afa1526f13899c51b21b173e/Google/gemini-2.5-pro-guided-learning.md): no empty praise, and a way out for a learner stuck after repeated attempts, which this skill turns into a reminder rather than the answer.
- [Anthropic interviewer system prompt](https://github.com/asgeirtj/system_prompts_leaks/blob/b74fa3370fab695b36211e573d66a93250965579/Anthropic/anthropic-interviewer.md): acknowledging an answer without parroting it back.
