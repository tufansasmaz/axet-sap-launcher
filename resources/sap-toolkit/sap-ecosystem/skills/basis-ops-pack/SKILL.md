---
name: basis-ops-pack
description: >
  Point a consultant at the upstream SAP Basis operations skill pack
  (adam0thman/sap-basis-ops, MIT, 30 skills) and explain how to add it. Use when
  the user asks about kernel patching, SAP Host Agent, HANA system replication,
  Oracle Data Guard / DB2 HADR / SQL Server AlwaysOn / MaxDB / ASE high
  availability, saprouter, Web Dispatcher, STMS transport management, SSCR keys,
  PSE and crypto, backup and recovery, housekeeping, space reclaim, dormant
  clients, security patching, SAP software download, or system copy and
  lifecycle - and the NTT catalog has no skill for it. Also use when the user
  asks "is there a Basis skill", "do we have anything for kernel upgrade", or
  wants to know what the upstream Basis pack contains before installing it.
allowed-tools: Read, WebFetch, Bash
version: 1.0.0
---

# SAP Basis operations — the upstream pack

## The gap this fills

The NTT catalog is a **development** toolkit. `sap-adt` writes ABAP, `sap-specs`
writes documents, `office-tools` makes deliverables. Nothing in it patches a kernel,
configures system replication, or tells you which `.SAR` archive you actually need.

`adam0thman/sap-basis-ops` does exactly that, and nothing else. It is the cleanest
pack in the ecosystem to recommend: MIT licensed, 30 skills, **no MCP server, no
Python dependency, no network surface of its own**. Every skill is a runbook —
commands, SAP Note citations, and the order to run them in.

## What is in it

30 skills, grouped by what a Basis consultant actually gets paged about:

| area | skills |
|---|---|
| kernel and patching | `sap-kernel-patch`, `sap-security-patch`, `sap-software-download` |
| HANA | `sap-hana-system-replication`, `sap-hana-lifecycle-tools`, `sap-hana-xsa` |
| other databases | `sap-oracle-dataguard`, `sap-db2-hadr`, `sap-sqlserver-alwayson`, `sap-maxdb-ha`, `sap-ase-hadr`, `sap-db-command-reference` |
| network and gateway | `sap-saprouter`, `sap-web-dispatcher`, `sap-cloud-connector`, `sap-btp-cli` |
| security | `sap-crypto-pse`, `sap-sscr-keys`, `sap-compliance-docs` |
| operations | `sap-health-triage`, `sap-troubleshooting`, `sap-log-reference`, `sap-housekeeping`, `sap-space-reclaim`, `sap-backup-recovery`, `sap-dormant-clients` |
| lifecycle | `sap-system-lifecycle`, `sap-transport-mgmt`, `sap-os-executables`, `sap-gui-landscape` |

Quality is high for a community pack — `sap-kernel-patch` alone cites SAP Notes
953653, 3628821 and 19466, distinguishes SP Stack Kernels from cumulative hotfixes,
and covers Rolling Kernel Switch including the separate-ASCS prerequisite and why an
HA cluster switch is mandatory for the ASCS.

## How to add it

It is published as a Claude Code marketplace, so in **Claude Code**:

```
/plugin marketplace add adam0thman/sap-basis-ops
/plugin install sap-basis-ops
```

In **aXet.code**, which loads loose skill files and has no marketplace: clone the
repository and copy the skill folders across.

```bash
git clone https://github.com/adam0thman/sap-basis-ops.git
cp -r sap-basis-ops/skills/* "$LOCALAPPDATA/axet-code/skills/"
```

Copy only the ones you need — 30 skill descriptions is a real slice of the context
window, and a consultant who never touches Oracle does not need `sap-oracle-dataguard`
competing for attention.

## What to expect, and what to watch

- **These are runbooks, not automation.** Every skill assumes *you* have `<sid>adm`
  shell access, `sapcontrol`, and the DB client. The agent reads you the correct
  procedure; it does not run it for you. That is a feature here — kernel swaps and
  replication takeovers are not things to hand to an agent.
- **It is third-party and unsupported by NTT.** Bugs go to the upstream repository,
  not to `https://axet.nttdata.com/support/tickets.html`. Read a procedure before
  running it; verify the SAP Note it cites is still current for your release.
- **Production is production.** Nothing in this pack is gated, because nothing in it
  executes. The gate is you. The NTT rule that live work happens on non-production
  systems is not suspended because the instructions came from a skill.
- **`sap-transport-mgmt` overlaps `sap-adt` at the edges.** The upstream skill covers
  STMS at the landscape level (routes, queues, `tp` at the OS). `sap-adt` owns the
  transport a *change* is recorded on, with the ghost-transport guard behind it. Do
  not let an agent take transport advice from the Basis pack while it is mid-write in
  an ADT session.

## Licence

MIT, Copyright (c) 2026 adam0thman. Redistributable, but NTT does not redistribute
it — you install it from source, so you get its updates directly.
