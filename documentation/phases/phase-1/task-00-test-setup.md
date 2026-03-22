# Task: Add Vitest Test Framework
## Phase: 1
## Depends On: none
## Estimated Time: 1 hour

## Context Files
- package.json (add vitest, scripts)
- vitest.config.ts (create)
- lib/example.test.ts (create — sample test)

## Success Criteria
- [ ] `npm run test` exists and runs
- [ ] Vitest is installed and configured for TypeScript/Next.js
- [ ] At least one sample test exists and passes
- [ ] Test run completes without errors

## Test Cases
- Run `npm run test` → expect exit code 0 and "passed" for sample test
- Add a trivial failing test → expect test run to fail with clear output

## Implementation Prompt

```
I'm building WAiK, a Next.js 14 app. I need to add a test framework so the Tester agent can write and run tests for each task.

WHAT I NEED:

1. Install Vitest and minimal dependencies for a Next.js 14 + TypeScript project:
   npm install -D vitest @vitejs/plugin-react jsdom
   (or the current recommended approach for Next.js 14 + Vitest)

2. Create vitest.config.ts at the project root:
   - Configure for TypeScript
   - Use jsdom environment if any DOM tests will be added later
   - Include test files: **/*.test.ts, **/*.test.tsx, **/__tests__/**/*.ts
   - Exclude node_modules and .next

3. Add to package.json scripts:
   "test": "vitest run",
   "test:watch": "vitest"

4. Create a single sample test file (e.g. lib/example.test.ts or __tests__/example.test.ts):
   - One test that passes: e.g. expect(1 + 1).toBe(2) or a trivial function test
   - This proves the test runner works

5. Run npm run test and confirm it passes.

Do not change any application code or existing routes. This task is only adding the test harness.
```
