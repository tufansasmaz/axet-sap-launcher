// Değişikliklerin CANLI bağımlılıkları (spec 2026-10-18 degisiklikler). İnce
// ve test edilmiyor: mantık changesManager.ts, changesGit.ts ve changesFs.ts'te,
// orada sahtelerle ve gerçek geçici depoyla test ediliyor. Bu dosya
// electron'u çekiyor; testler bunu İÇE AKTARMAMALI.
import { app, shell } from "electron";
import { lstatSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { dirIsEmpty, insideRootReal, pathKind, removeEmptyDir } from "./changesFs";
import { createGitPort } from "./changesGit";
import type { ChangesManagerDeps } from "./changesManager";

/**
 * Kayıtların ve özel index dosyalarının klasörü. Var olduğu garanti ediliyor:
 * git katmanı index dosyasının yerini klasörün GERÇEK yoluyla denetliyor
 * (isOwnIndex), klasör yoksa ilk görüntü daha kayıt yazılmadan reddedilirdi.
 */
export function checkpointsDir(): string {
  const dir = path.join(app.getPath("userData"), "checkpoints");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // açılamazsa görüntü "invalid"/"git" ile düşer; uyarı satırı görünür
  }
  return dir;
}

const absolute = (root: string, rel: string) => path.join(root, ...rel.split("/"));

export function liveChangesPorts(): Pick<ChangesManagerDeps, "git" | "dirExists" | "insideRoot" | "pathExists" | "pathKind" | "removeEmptyDir" | "dirIsEmpty" | "trash"> {
  return {
    git: createGitPort({ indexDir: checkpointsDir() }),
    dirExists: (dir) => {
      try {
        return statSync(dir).isDirectory();
      } catch {
        return false;
      }
    },
    insideRoot: insideRootReal,
    pathExists: (root, rel) => {
      try {
        lstatSync(absolute(root, rel));
        return true;
      } catch {
        return false;
      }
    },
    pathKind,
    removeEmptyDir,
    dirIsEmpty,
    // Kalıcı silme yok: işletim sisteminin çöp kutusu (spec §6.3).
    trash: (root, rel) => shell.trashItem(absolute(root, rel))
  };
}
