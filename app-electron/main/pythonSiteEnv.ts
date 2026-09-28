import { existsSync } from "node:fs";
import path from "node:path";
import { getToolkitRoot } from "./sapToolkit";

// ---------------------------------------------------------------------------
// Ajanın Python'una TLS kuralı: `PYTHONPATH` → python-site/sitecustomize.py
// ---------------------------------------------------------------------------
// Skill script'leri (login_saml_sso.py, auth/jwt_auth_provider.py, ...)
// `requests`'e `verify=False` veriyor; SAP'nin Basic Auth başlığı, çerezleri ve
// OAuth istemci sırrı araya giren her sunucuya gidebiliyordu. Script'ler
// vendored (resources/sap-toolkit/CLAUDE.md), düzenlenmiyor. Bunun yerine
// ajanın başlattığı HER Python sürecinin açılışta içe aktardığı
// `sitecustomize`'ı biz veriyoruz: `requests` yüklenince
// `ntt_tls_pin.install_global()` — SAP adresine pin, geri kalana zincir.
//
// Neden PYTHONPATH: ajan kullanıcının sistem Python'unu (`py`, `python`)
// kullanıyor; onun site-packages'ına yazmak kurulum gerektirir ve NTT Studio
// kapalıyken de etkili kalırdı. PYTHONPATH yalnızca bizim başlattığımız
// süreç ağacında geçerli. Gömülü runtime'lar (`._pth`'li) PYTHONPATH'i yok
// sayıyor — köprüler SAP'ye HTTP'den gitmediği için sorun değil.
//
// Kapsamadığı: `python -I` / `-E` / `-S`, requests dışı istemciler. Rapor:
// T3 (2026-09-28).
// ---------------------------------------------------------------------------

export const PYTHON_SITE_DIRNAME = "python-site";

/**
 * `env`'in kopyası, `siteDir` PYTHONPATH'in BAŞINDA. Saf: test edilebilir.
 *
 * Windows'ta ortam anahtarları büyük/küçük harfe duyarsız ama `{...process.env}`
 * kopyası özgün yazımı koruyor ("PythonPath" gibi). İki ayrı yazım çocuğa
 * iki ayrı anahtar olarak gider ve hangisinin kazanacağı belirsizdir; bu
 * yüzden hepsi tek bir `PYTHONPATH`'te birleştiriliyor. Kullanıcının kendi
 * PYTHONPATH'i korunuyor (arkada).
 */
export function withPythonSite(env: NodeJS.ProcessEnv, siteDir: string | null): NodeJS.ProcessEnv {
  if (!siteDir) return env;
  const out: NodeJS.ProcessEnv = { ...env };
  const keys = Object.keys(out).filter((k) => k.toUpperCase() === "PYTHONPATH");
  const existing: string[] = [];
  for (const k of keys) {
    for (const part of (out[k] ?? "").split(path.delimiter)) if (part) existing.push(part);
    delete out[k];
  }
  const same = (p: string) => path.resolve(p).toLowerCase() === path.resolve(siteDir).toLowerCase();
  out.PYTHONPATH = [siteDir, ...existing.filter((p) => !same(p))].join(path.delimiter);
  return out;
}

/** Paketlenmiş ya da geliştirme ağacındaki python-site; sitecustomize yoksa null. */
export function nttPythonSiteDir(): string | null {
  try {
    const root = getToolkitRoot();
    if (!root) return null;
    const dir = path.join(root, PYTHON_SITE_DIRNAME);
    return existsSync(path.join(dir, "sitecustomize.py")) ? dir : null;
  } catch {
    // Electron dışında (birim testi) `app` yok: kural eklenmeden devam.
    return null;
  }
}

/** Ajan / terminal / 8787 sunucusu ortamına python-site'ı ekler. */
export function withNttPythonSite(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return withPythonSite(env, nttPythonSiteDir());
}
