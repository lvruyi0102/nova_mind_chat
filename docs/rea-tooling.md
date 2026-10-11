# REA development tool

Nova-Mind can use [REA (Reverse Engineer Anything)](https://github.com/morluto/rea) as an optional, local development tool for evidence-backed software investigation.

- Project-level agent workflow: [`.agents/skills/reverse-engineer-anything/SKILL.md`](../.agents/skills/reverse-engineer-anything/SKILL.md)
- Upstream package: `rea-agents` (MIT)
- This is intentionally **not** a production dependency and is not imported by the Nova-Mind server.
- Install/configure the local agent integration on the development machine with `npx rea-agents setup` after reviewing the proposed configuration changes.
- Node.js requirement: 22.19+, 24.11+, or 26+.
- Static JavaScript/Electron inspection does not require a native reverse-engineering engine; native binary analysis may require Hopper, Ghidra, or IDA.

Start with `npx -y rea-agents@latest --help` and read the upstream documentation for the exact target type. Use only targets you own or are authorized to inspect. Prefer static analysis first; inspect command side effects before runtime capture.
