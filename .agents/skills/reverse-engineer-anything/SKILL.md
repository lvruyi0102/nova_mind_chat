---
name: reverse-engineer-anything
description: Use REA (Reverse Engineer Anything) to inspect authorized applications, JavaScript/Electron bundles, websites, .NET assemblies, and native binaries with evidence before proposing a reconstruction or code change.
---

# REA reverse-engineering workflow

Use the upstream REA tool; do not copy its implementation into the Nova-Mind production runtime.

Upstream project: https://github.com/morluto/rea  
License: MIT. Respect the target owner's authorization and applicable law.

## Setup

Requirements: Node.js 22.19+, 24.11+, or 26+, plus npm.

Check availability without changing project dependencies:

```bash
npx -y rea-agents@latest --help
npx -y rea-agents@latest capabilities
```

To register REA with a supported local coding agent and install its full workflow skill, review the proposed changes first:

```bash
npx rea-agents setup
```

Do not run setup automatically in production or CI. It changes local agent configuration. Restart the coding agent after setup.

## Investigation procedure

1. Confirm the target is owned by the user or that explicit permission exists.
2. Identify the target type and read the matching REA command's `--help` and provider requirements.
3. Prefer static inspection first. Do not execute an unknown application or binary merely to inspect it.
4. Use REA against a specific target path/origin, not the whole machine or unrelated files.
5. Preserve the returned evidence, references, limitations, and unknowns. Separate observed facts from hypotheses.
6. Before reconstructing a feature, describe the behavior and evidence, then implement the smallest isolated change.
7. Run relevant tests and compare behavior against the evidence. Do not claim equivalence unless verified.
8. Never send credentials, secrets, customer data, or private source code to an external model unless the user has authorized that data flow.

## Example: static JavaScript/Electron inspection

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

Replace the example path with the authorized target. This command inspects a supplied local app directory or ASAR; it does not automatically analyze this repository just because the skill exists.

## Scope and limitations

- REA is a development/research tool, not a Nova-Mind runtime dependency.
- Native binary analysis may require Hopper, Ghidra, or IDA; static JavaScript and .NET analysis have different prerequisites.
- Website and runtime capture may access the target or interact with it. Read the command-specific documentation before use.
- Treat findings as evidence with limitations, not as guaranteed complete truth.
- Review upstream updates and dependency/security changes before upgrading.
