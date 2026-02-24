import { execSync } from "node:child_process";

const commands = [
  "pnpm exec tsc --noEmit --esModuleInterop server/metaGovernance.ts",
  "pnpm vitest run server/metaGovernance.test.ts",
];

for (const cmd of commands) {
  execSync(cmd, { stdio: "inherit" });
}
