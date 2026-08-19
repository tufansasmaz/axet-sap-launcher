import { app } from "electron";
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const SKILLS: Record<string, string> = {
  "sap-adt-readonly": "abaper/skills/sap-adt-readonly",
  "clean-core": "abaper/skills/clean-core",
  "sap-docs": "abaper/skills/sap-docs",
  "screen-gen": "abaper/skills/screen-gen",
  fs2ts: "abaper/skills/fs2ts",
  "fs-generator": "abaper/skills/fs-generator",
  "abapgit-workflow": "abapgit-bridge/skills/abapgit-workflow",
  "abapgit-export-zip": "abapgit-bridge/skills/abapgit-export-zip",
  "abapgit-import-status-zip": "abapgit-bridge/skills/abapgit-import-status-zip",
  "abapgit-howto": "abapgit-bridge/skills/abapgit-howto",
  "office-excel-read": "office-tools/skills/office-excel-read",
  "office-excel-write": "office-tools/skills/office-excel-write",
  "office-excel-transform": "office-tools/skills/office-excel-transform",
  "office-excel-report": "office-tools/skills/office-excel-report",
  "office-excel-compare": "office-tools/skills/office-excel-compare",
  "office-excel-images": "office-tools/skills/office-excel-images",
  "office-slides": "office-tools/skills/office-slides",
  "office-pdf": "office-tools/skills/office-pdf",
  "office-pptx": "office-tools/skills/office-pptx",
  "office-docx": "office-tools/skills/office-docx",
  "office-manual": "office-tools/skills/office-manual"
};

export function getToolkitRoot(): string | null {
  const candidate = app.isPackaged
    ? path.join(process.resourcesPath, "sap-toolkit")
    : path.join(app.getAppPath(), "resources", "sap-toolkit");
  return existsSync(candidate) ? candidate : null;
}

export interface SkillInstallResult {
  installed: string[];
  skipped: string[];
  toolkitRoot: string | null;
}

export function installSkillsIntoProject(projectDir: string): SkillInstallResult {
  const toolkitRoot = getToolkitRoot();
  const result: SkillInstallResult = { installed: [], skipped: [], toolkitRoot };
  if (!toolkitRoot) return result;

  const destRoot = path.join(projectDir, ".axet-code", "skills");
  mkdirSync(destRoot, { recursive: true });

  for (const [name, relPath] of Object.entries(SKILLS)) {
    const src = path.join(toolkitRoot, ...relPath.split("/"));
    const skillMd = path.join(src, "SKILL.md");
    if (!existsSync(skillMd)) {
      result.skipped.push(name);
      continue;
    }
    const dest = path.join(destRoot, name);
    try {
      cpSync(src, dest, { recursive: true, force: true });
      result.installed.push(name);
    } catch {
      result.skipped.push(name);
    }
  }

  return result;
}

export function countInstalledSkills(projectDir: string): number {
  const destRoot = path.join(projectDir, ".axet-code", "skills");
  if (!existsSync(destRoot)) return 0;
  try {
    return readdirSync(destRoot).filter((entry) => {
      const full = path.join(destRoot, entry);
      return statSync(full).isDirectory() && existsSync(path.join(full, "SKILL.md"));
    }).length;
  } catch {
    return 0;
  }
}
