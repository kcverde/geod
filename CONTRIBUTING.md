# Contributing

This project uses a lightweight, solo-friendly workflow:

> Issue → short-lived branch → focused pull request → automated checks → squash merge

## 1. Create an issue

Create one issue for each bug, feature, or maintenance task. Keep it focused and include:

- **Problem:** what is wrong or missing and why it matters.
- **Approach:** the intended solution at a high level.
- **Acceptance criteria:** observable requirements, tests, and build expectations.
- **Notes:** relevant files, dependencies, or follow-up work.

Use only helpful labels such as `bug`, `enhancement`, `testing`, or `maintenance`.

## 2. Create a branch

Start from the latest `main` and include the issue number in the branch name:

```sh
git switch main
git pull --ff-only
git switch -c fix/42-short-description
```

Common prefixes are `fix/`, `feature/`, `test/`, `refactor/`, and `chore/`. Keep unrelated work out of the branch; create another issue when needed.

## 3. Implement and verify

Make small, intentional commits. Stage specific files rather than using `git add .`.

Before opening a pull request, run:

```sh
npm test
npm run build
```

Manually test affected gameplay or UI behavior when automated tests cannot cover it.

## 4. Open a pull request

Open a pull request into `main`. Use a draft PR for work that spans multiple sessions. The description should contain:

- `Closes #42` to link and close the issue when merged.
- A short summary of what changed.
- Tests and manual verification performed.
- Any risks or follow-up work.

Review the complete diff yourself, confirm the acceptance criteria, and wait for all automated checks to pass.

## 5. Merge and clean up

Squash merge the pull request, delete its branch, and update local `main`:

```sh
git switch main
git pull --ff-only
```

Use an imperative squash commit title, such as `Fix completed-wave progression`.

## Repository settings

Protect `main` with lightweight rules:

- Require changes through a pull request.
- Require CI checks once configured.
- Require linear history and block force pushes.
- Require zero approvals while there is only one developer.
- Enable squash merging and automatic branch deletion.

Avoid long-lived development branches and process that does not provide practical value to the project.
