# AGENTS.md

## Project context

This is an interactive developer portfolio built with React, Vite, TypeScript and Phaser 3.

The portfolio is structured as a small game. The player moves through scenes, interacts with NPCs/objects, and discovers information about the developer, projects, skills and contact.

## Stack

- React
- TypeScript
- Vite
- Phaser 3
- Tailwind CSS

## General rules

- Do not rewrite the whole project unless explicitly requested.
- Prefer small, incremental changes.
- Do not introduce new dependencies unless explicitly approved.
- Keep the current architecture unless there is a clear reason to change it.
- Preserve existing scene transitions.
- Preserve existing asset paths.
- Avoid unrelated refactors.
- Explain the plan before modifying multiple files.
- After changes, explain how to test manually.

## Git workflow

- The user works with commits as checkpoints.
- Before large or risky changes, recommend a checkpoint commit.
- Keep changes scoped so each commit has a clear purpose.

## Phaser rules

- Keep scenes focused on orchestration when possible.
- Extract reusable configuration, types, helpers and UI builders when a scene becomes too large.
- Avoid duplicating player movement, interaction or transition logic if shared helpers already exist.
- Be careful with asset keys and public asset paths.
- Do not change scene keys unless explicitly requested.
- Do not break React StrictMode protections in GameCanvas.
- Keep camera, scale and room dimensions consistent across scenes unless explicitly requested.
- Prefer readable Phaser code over clever abstractions.

## CombatScene rules

- CombatScene currently works and should not be behaviorally rewritten.
- Stable refactor checkpoint: `5702847 refactor: isolate combat player movement`.
- Changes up to that commit were manually tested and preserved current gameplay.
- Refactors must preserve gameplay behavior.
- Refactor incrementally:
  1. Extract constants/config.
  2. Extract types.
  3. Extract HUD/dialog helpers.
  4. Only then consider combat logic extraction.
- Do not change combat balancing, timings, inputs or assets unless explicitly requested.
- After every refactor, list manual test steps.

## TypeScript rules

- Avoid `any`.
- Prefer explicit types for scene state, combat state and config objects.
- Keep functions small enough to understand.
- Use descriptive names.
- Do not overengineer with patterns/classes unless they simplify the current code.

## Before finishing a task

Always report:

- what changed
- files changed
- how to test manually
- possible risks
- recommended next commit message
