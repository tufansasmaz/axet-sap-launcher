# SAP DEV yazma onayı — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajan DEV sistemine, NTT Studio'da kullanıcının gördüğü ve onayladığı bir pencere olmadan, incelenmemiş ya da kritik bulgulu kodla, onaylanandan farklı bir nesne/transport ile yazamasın; her karar bir günlükte dursun.

**Architecture:** DEV'de 8787'de artık motorun kendisi (`adt_mcp_server.py`) değil, onu import edip yazma araçlarını sarmalayan `adt_gated_server.py` çalışır. Katman bilgi toplar (nesne, paket, transport, kaynak hash'i, fark), kalite kapısını uygular ve kararı launcher'ın yerel onay ucuna (`127.0.0.1:<rastgele>`, ayrı token) sorar. Karar mantığı, modlar, oturum/teslim izinleri, pencere ve günlük launcher'dadır (TypeScript). `abapgit-deploy` script'leri `tier_gate.py` üzerinden aynı akışa 8787'deki `axet_abapgit_onay` aracıyla girer.

**Tech Stack:** Electron main (Node `http`, `crypto`), React + Tailwind (renderer), vitest + @testing-library/react (jsdom), Python 3 (FastMCP motoru, `urllib`, `inspect`, `difflib`, `zipfile`), manuel `py -3` test script'leri.

**Spec:** `docs/superpowers/specs/2026-09-24-sap-dev-yazma-onayi-design.md`

## Global Constraints

- Güvenlik sınırı değil, yanlışlık önleme: kasıtlı atlatma hedef dışı. Ama belirsizlik hiçbir zaman onaysız geçmez (fail-closed).
- Bugünkü yapı kalıyor: 8787 portu, `ABAP_HTTP_TOKEN` Bearer, ajanın `POST /tool/<ad>` biçimi, `.conn_adt` (içindeki şifre bilinçli borç). Proxy yok.
- `-y` ve yerel iş akışı değişmiyor; kapı yalnızca SAP DEV yazması için.
- QA/PRD davranışı değişmiyor (`adt_readonly_server.py`).
- Onay token'ı (`ADT_APPROVAL_TOKEN`) ve ADT token'ı hiçbir dosyaya, `sap-context.md`'ye, günlüğe yazılmaz. `app-electron/main/launcher.ts` `getAdtHttpToken` ya da `ADT_APPROVAL_TOKEN` içermez.
- `ABAP_HTTP_ALLOW_NO_AUTH` kullanılmaz.
- Sahibi olmadığımız process öldürülmez.
- Yukarı akış motor dosyaları (`sap-adt/scripts/` altındaki mevcut dosyalar) DEĞİŞMEZ. Yeni dosyalar serbest; her yeni dosya "NTT Studio" kelimesini içerir ve `resources/sap-toolkit/CLAUDE.md` tablosuna yazılır.
- Günlük (`sap-yazma-gunlugu.jsonl`): şifre, token, kaynak kodun kendisi ve fark YOK.
- Kalite kapısı kesin engel: `kritik > 0` → pencere hiç açılmaz, aşma seçeneği yok.
- Uyarı renkleri `--status-warning-*`; lime yalnızca seçim için.
- Prettier ile biçimlendirme yapılmaz; dosyaların satır sonları korunur (bu plandaki tüm dosyalar LF).
- Kaynak yorumları tam Türkçe karakterlerle; commit mesajları ASCII'leştirilmiş Türkçe, sonunda `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `release-1.6.8/`, `release-pub/`, `resources/rfc-runtime`, `resources/guiscript-runtime` asla `git add` edilmez. Her commit'te dosyalar tek tek eklenir (`git add -A` yok).
- Push, yayın, sürüm artırma yok (her biri ayrıca açık onay ister).
- Müşteri sistemlerine (MAYA, LED ve diğerleri) ADT çağrısı yok; SAP'lı doğrulama yalnızca DS4'te, kullanıcıyla.
- `abapgit-deploy`'da "ajan basar, geliştirici çalıştırır" kuralı sürer.
- Paket adı tahmin edilmez; transport kullanıcıya onaylatılmadan yazılmaz.

## Review Focus

1. **Ajan aynı çağrıyı farklı anahtar sırasıyla ya da tek argümanı değiştirerek tekrar gönderiyor** → anahtar sırası hash'i değiştirmez (kanonik JSON, `sort_keys`), tek argüman farkı yeni istek açar. Test: Task 4 `t_arg_hash_canonical` + `t_arg_hash_changes`.
2. **Launcher yeniden başlarken eski gated sunucu ayakta** → eski sunucunun onay token'ı artık geçersiz (401) → her yazma `approval_unavailable`; kalp atışı 3 kaçırmada sunucuyu kapatır; yeni launcher portta duran gated sunucuyu ASLA devralmaz. Test: Task 4 `t_launcher_401_is_unavailable`, Task 5 "gated modda portta canlı sunucu devralınmıyor".
3. **Onaydan ya da incelemeden sonra kaynak dosya düzenleniyor** → kaynak hash'i argüman hash'ine girer: yeni istek; `.sap-review` hash'leri tutmuyorsa `inceleme_eski`. Test: Task 4 `t_source_edit_after_review`.
4. **İki DEV projesi aynı 8787'yi paylaşıyor** → ikinci proje açılınca birincinin (bizim başlattığımız) sunucusu durdurulur, port boşalana kadar beklenir, yeni oturum yeni token'la açılır; eski oturumun izinleri yeni oturuma geçmez. Test: Task 5 "başka projenin sunucusu durdurulup port boşalınca yenisi başlıyor".
5. **Pencere cevapsız kalıyor ya da uygulama kapanıyor; namespace'li nesne** → 10 dk sonra `sure_doldu`, 10 dk boyunca aynı hash'e yapışkan; uygulama kapanınca onay yok. `/ABC/CL_X` inceleme dosyası `CLAS_#ABC#CL_X.json`. Test: Task 1 `sure_doldu yapışkan`, Task 4 `t_namespace_review_path`.

Testle kapatılamayan, review'da bakılacak üç açık (spec: "güvenlik sınırı değil" — yalnızca talimatla kapalı, talimatın varlığını Task 8'in sözleşme testi kilitliyor):

6. **`adt-tool.ps1 -Method` her HTTP metodunu kabul ediyor.** Ajan 8787'yi atlayıp ADT'ye doğrudan PUT/POST gönderebilir; sap-context.md "`adt-tool.ps1` ile SAP'a YAZMA" diyor. Teknik kapı (DEV'de GET dışını reddetmek) ayrı iş.
7. **`generate_screen.py` / `generate_adobe.py` CLI'ları onaya sormuyor**, yalnızca DEV kapısından geçiyor. 8787'deki `adt_generate_screen`/`adt_generate_adobe` onaylı; talimat CLI'ı adıyla yasaklıyor.
8. **`abapgit_deploy.py` alt adımında bekleyen onay yukarı taşınmıyor.** Alt adımlar `AXET_ABAPGIT_ONAY_ID` ile `ust_onay` gönderiyor; 60 dk'lık üst onay dolmuşsa alt adım çıkış 3 döner ve ebeveyn bunu "bekliyor" değil genel adım hatası olarak raporlar. Geliştirici komutu yeniden çalıştırınca yeni onay istenir; veri kaybı yok, mesaj yanıltıcı.

## Spec'ten ayrılan noktalar (kod okunarak bulundu)

1. **Motor 33 değil 50 araç kaydediyor.** Sınıf tablosu 50'yi kapsar: SERBEST 22, TRANSPORT_ONAYLI 17, HER_SEFER 8, KARMA 3. Drift kontrolü bu sabitlerle motoru karşılaştırır.
2. **`KARMA` araçta mod argümanı ham istekte yoksa ya da boşsa → `mod_belirtilmeli` reddi** (spec: HER_SEFER). Sebep: `adt_generate_screen`'in varsayılanı `WRITE`; eksik modu HER_SEFER saymak kullanıcıya "ne yazılacak" sorusunu cevapsız bir pencereyle sorardı. Tanınmayan (dolu ama bilinmeyen) mod spec'teki gibi HER_SEFER.
3. **Kaynak taşıyan araçlarda `source_file` zorunlu, satır içi `source`/`types_and_constants` reddedilir** (`kaynak_dosyasi_gerekli`). Kalite kapısı dosya hash'i ile `.sap-review` kaydını eşliyor; satır içi kaynak bu bağı koparırdı.
4. **`$TMP` paketinde transport'suz oturum izni verilebilir.** Oturum izni `(transport, paket)` çiftine bağlı; transport boşsa yalnızca paket `$TMP` iken.
5. **Renderer tek olay dinliyor** (`sap-write:changed`, yüksüz); durum her seferinde `sap-write:state` ile çekilir.
6. **İnceleme kaydının anahtarı R3TR tipi** (`CLAS_ZCL_X.json`); namespace `/` → `#`. `kaynak_sha256` tek değer değil LİSTE (bir sınıfın birden çok include'u), kontrol "gönderilen hash'ler ⊆ incelenen hash'ler"; hash CRLF→LF normalize edilerek alınır (abapGit ZIP'i ile yerel dosyanın satır sonu farkı yüzünden).
7. **`transport_belirsiz` reddi:** imzasında `transport` olan araçta argüman boş, nesnenin sahibi transport yok, oturuma sabitlenmiş transport yok ve paket `$TMP` değilse. Çözülen transport motora argüman olarak GEÇİRİLİR (pencerede görünen ile yazılan aynı olsun).
8. **`ust_onay` zinciri:** `abapgit_deploy.py` alt adımları (`_run_step` alt process'leri) ebeveynin onay kimliğini `AXET_ABAPGIT_ONAY_ID` ortam değişkeniyle taşır; 60 dk içinde aynı transport'ta yeniden pencere açılmaz.
9. **Üçüncü axet aracı `axet_inceleme_kaydet`:** `.sap-review` kaydını ajan elle yazmaz; hash'leri sunucu hesaplar. Böylece hash hatası ya da uydurma hash olmaz.
10. **Yerel modda HER_SEFER araçlar reddedilmez, pencereye gider** (spec: `yerel_mod` reddi). Transport açma/paket açma gibi işler yerel çalışmada da gerekiyor; zaten her seferinde pencere açılıyor.
11. **Mod penceresi atlanamaz** (Escape bir şey yapmaz). Mod seçilmeden her yazma `mod_secilmedi`.
12. **Başka projenin sunucusu durdurulur** (bugünkü `startReadonlyServer` yalnızca aynı `projectDir` anahtarına bakıyor; iki DEV projesi aynı 8787'yi paylaşınca ikincisi birincinin sunucusunu "harici" sanıp devralıyordu — onay oturumu yanlış projeye bağlanırdı).
13. **Teslim izni nesne başına tüketilmez:** 4 saat ya da oturum kapanışına kadar geçerli (spec: "liste tükenince"). Aynı nesne teslimde push + activate olarak iki çağrı alıyor; tüketmek ikinciyi reddederdi. Sınır yine listede olmayan nesne/değişmiş kaynak/farklı transport.
14. **`approval_pending` çıkış kodu 3**, `abapgit_deploy.py`'nin export hatasıyla çakışıyor. Ayırt edici olan stdout'taki `approval_pending` satırı; talimat bunu söyler.
15. **Python testleri manuel** (`py -3 <dosya>`): CI'da Python yok. Task'lar bu script'leri çalıştırmayı adım olarak içerir.
16. **Önizleme modları serbest:** `adt_delete_object` ve `adt_delete_transport` onay (`confirm_*` + `force=True`) olmadan yalnızca önizleme döndürüyor; bu çağrılar pencere açmaz.
17. **Kalite reddi günlüğe `POST /events` ile yazılır** — log-only uç; hiçbir izin vermez.
18. **abapGit onayında fark yok:** `axet_teslim(yontem="abapgit")` ve `axet_abapgit_onay` penceresi nesne listesi + kalite durumunu gösterir, satır farkı göstermez (ZIP'teki nesnenin SAP'taki hâli okunmuyor).
19. **ZIP nesneleri `.asddls/.asbdef/.asdcls/.asddlxs` kaynaklarını da kapsar**; `zip_sha256` XML dahil TÜM girdilerin normalize edilmiş, ada göre sıralı hash'i.
20. **`$` ile başlayan paketler `transport_belirsiz` için yerel sayılır**; oturum izni ise yine yalnızca tam `$TMP`'de transport'suz verilir.
21. **`arg_hash` çözülen transport, paket ve nesne bilgilerini de içerir** — launcher eşleştirmeyi yalnızca hash'le yapıyor; transport çözümü değişirse aynı argümanlar yeni istek açar.
22. **8787 her başladığında launcher tüm yazma oturumlarını kapatır** (port tek sahipli; eski oturumun izni yeni sunucuya geçmez).
23. **`ADT_CWD` başlatılan her sunucu için açıkça verilir** (kaynak dosya yolları proje klasörüne göre çözülsün).
24. **`surfaceMismatch` sayıları `toolCount`'tan gelir**; `/health`'te `axet_teslim` görünüyorsa sunucu "gated" sayılır.
25. Ek notlar: enjeksiyon süzgeci SQL'den ÖNCE çalışır; silme önizlemesi tespiti muhafazakâr (şüphede önizleme sayılmaz, pencereye gider); onaylı sunucu yalnızca `--http` ile çalışır (stdio yok).
26. **Task 7 — abapGit kapısı:** ZIP'in hash'i yerine mutlak yolu (`zip_dosyasi`) gönderilir, hash'i sunucu hesaplar; 8787'ye `ProxyHandler({})` ile gidilir (sistem proxy'si loopback'i yutmasın); `url` parametresi yalnızca testler için; `abapgit_deploy.py` onayı ZIP belli olunca, login'den önce ister; 8787'den 503 → çıkış 2.
27. **Araç sayıları:** motor 50; DEV'deki onaylı sunucu 53 (50 + 3 `axet_*`); read-only sarmalayıcı 19 araç gösterir + 3'ü ortamla açılır, 28 yazan araç kaydedilmez. Eski 33 / 17 / 13 her yerde (yukarı akışın readonly SKILL.md'si ve README dahil) düzeltilir.
28. **DEV'de sunucuyu elle başlatmak talimatla yasak:** elle açılan onaylı sunucuda onay ortamı yok, her yazma `approval_unavailable`. Otomatik başlatma başarısızsa sap-context.md'deki durum satırı kullanıcıdan yeniden bağlanmasını istemeyi söyler.

## Açık maddeler (bu planın kapsamı dışında, kullanıcıya not)

- Proje başına ayrı port (bugün tek 8787; iki DEV projesi aynı anda çalışamıyor — 12. madde bunu güvenli kılıyor, çözmüyor).
- `sap-screen-gen`, `sap-adobe-gen`, `bootstrap_fm` CLI script'leri 8787'yi atlayıp motoru doğrudan çağırabiliyor; SKILL.md bloğu "kabuktan dolanma" diyor, teknik kapı yok.
- `adt-tool.ps1 -Method` her HTTP metodunu kabul ediyor (Review Focus 6).
- `AXET_ABAPGIT_ONAY_ID` 60 dk içinde başka bir abapGit script'inde tekrar kullanılabilir (aynı transport şartıyla).
- `abap-code-checker` skorbordu (spec §6 "gönderimden sonra") bu planda yalnızca talimat; otomatik tetik yok.

## Dosya yapısı

| Dosya | Durum | Sorumluluk |
|---|---|---|
| `app-electron/shared/sapWriteTypes.ts` | Yeni | Main ↔ renderer ↔ Python sözleşme tipleri (yalnızca tip) |
| `app-electron/main/sapWrite/policy.ts` | Yeni | Saf karar mantığı: `decide`, `respond`, `sweep`, izinler, `validateFact` |
| `app-electron/main/sapWrite/log.ts` | Yeni | `sap-yazma-gunlugu.jsonl`'a satır ekleme, fact → günlük alanları |
| `app-electron/main/sapWrite/server.ts` | Yeni | Onay ucu HTTP sunucusu, oturumlar, token, bildirim, süpürme |
| `app-electron/main/sapWrite/ipc.ts` | Yeni | Renderer ↔ onay sunucusu IPC kayıtları (durum, mod, cevap, değişti olayı) |
| `app-electron/main/adtReadonlyServerManager.ts` | Değişir | `gate` seçeneği, başka proje sunucusunu durdurma, `waitPortFree`, gated'ı devralmama |
| `app-electron/main/launcher.ts` | Değişir | DEV'de `adt_gated_server.py`, onay oturumu açma/kapama, talimat metinleri |
| `app-electron/main/index.ts` | Değişir | IPC, notifier, kapanışta `stopApprovalServer` |
| `app-electron/preload/index.ts`, `src/window.d.ts` | Değişir | `getSapWriteState`, `setSapWriteMode`, `respondSapWrite`, `onSapWriteChanged` |
| `src/components/SapWriteGate.tsx` | Yeni | Durum sahibi; mod penceresi + onay penceresi |
| `src/App.tsx` | Değişir | `<SapWriteGate />` |
| `app-electron/main/i18n/{tr,en}.ts`, `src/i18n/{tr,en}.ts` | Değişir | Metinler |
| `resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/adt_gated_server.py` | Yeni | Onay katmanı (sınıflama, sarmalama, bilgi toplama, axet araçları, kalp atışı) |
| `.../sap-adt/scripts/gated_quality.py` | Yeni | Hash, `.sap-review` okuma/yazma, ZIP gruplama, fark |
| `.../sap-adt/scripts/gated_collect.py` | Yeni | Bilgi toplama (yalnızca okur): paket TADIR'dan, transport çözümü, aktif kaynak; okunamayan bilgi → ret |
| `.../sap-adt/scripts/test_gated_quality.py`, `test_gated_collect.py`, `test_gated_flow.py` | Yeni | SAP'sız Python testleri |
| `resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/tier_gate.py` | Değişir | `require_write_approval` |
| 9 abapGit yazma script'i | Değişir | `require_write_approval` çağrısı |
| `.../abapgit-deploy/scripts/test_tier_gate_approval.py` | Yeni | Sahte 8787 ile Python testi |
| `sap-adt/SKILL.md`, `sap-adt-readonly/SKILL.md`, `abap-code-review/SKILL.md`, `abapgit-deploy/SKILL.md` | Değişir | Onay blokları, inceleme kaydı adımı, sayılar |
| `resources/sap-toolkit/CLAUDE.md`, `resources/sap-toolkit/README.md`, `sapToolkit.ts`, `skillProfiles.ts` | Değişir | Dördüncü kapı, uyarlama tablosu, sayılar |
| `tests/sapWritePolicy.test.ts`, `tests/sapWriteServer.test.ts`, `tests/sapWriteIpc.test.ts`, `tests/sapWriteGate.test.tsx`, `tests/sapWriteGateContract.test.ts` | Yeni | vitest |
| `tests/adtHttpToken.test.ts`, `tests/tierWriteGates.test.ts` | Değişir | Yeni davranışlar |

---

### Task 0: Ölçümler (koda geçmeden)

Koddan okunarak kapananlar (tekrar ölçülmez, yalnızca ölçüm dosyasına not düşülür):

- `sap_client._find_existing_transport` yan etkisiz: E071⋈E070 üzerinde tek SELECT, `TRSTATUS='D'`, S→K çözümü, mevcut kullanıcıya süzme; hiçbir şey kilitlemiyor.
- `push_object` `source_file`'ı process'in cwd'sine göre çözüyor (launcher cwd = projectDir) ve `utf-8` okuyor.
- `run_sql_query` hata durumunda yazdırıp istisna fırlatıyor → her çağrı `try` içinde.
- Motor her aracı `_tool_reporting_failures` ile kaydediyor: `ok:false` sonuç `ToolFailure` olarak FIRLATILIYOR (`adt_mcp_server.py` l.262-289). Katman bunu yakalayıp `/results`'a yazmalı, sonra yeniden fırlatmalı.

**Files:**
- Create: `docs/superpowers/measurements/2026-09-24-sap-yazma-onayi-olcumler.md`

**Interfaces:**
- Consumes: yok
- Produces: ölçüm dosyası. Bir sonuç tasarımla çelişirse DUR, kullanıcıya dön.

- [ ] **Step 1: axet-code `approval_pending` sonrası tekrar ediyor mu (yerel, SAP'sız, kullanıcıyla)**

Geçici bir klasörde sahte 8787 çalıştır (8787 boş olmalı: önce `curl -s -m 2 http://127.0.0.1:8787/health` hiçbir şey döndürmemeli; doluysa DURDURMA, kullanıcıya sor):

```bash
mkdir -p /tmp/onay-olcum && cat > /tmp/onay-olcum/fake8787.py <<'EOF'
import json, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
calls = []
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(json.dumps({"ok": True, "tools": ["adt_push"]}).encode())
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n).decode("utf-8")
        calls.append(body)
        sys.stderr.write(f"CALL {len(calls)} {self.path} {body}\n"); sys.stderr.flush()
        if len(calls) == 1:
            out = {"ok": False, "error": "approval_pending", "approval_id": "x1",
                   "message": "Onay NTT Studio penceresinde bekliyor. Kullanıcıya pencereyi söyle; onaylayınca AYNI çağrıyı AYNI argümanlarla tekrar gönder."}
        else:
            out = {"ok": True, "success": True, "activated": True}
        data = json.dumps(out, ensure_ascii=False).encode("utf-8")
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(data)
ThreadingHTTPServer(("127.0.0.1", 8787), H).serve_forever()
EOF
py -3 /tmp/onay-olcum/fake8787.py
```

Kullanıcıdan NTT Studio'da bir DEV olmayan, SAP'a bağlanmayan boş bir sohbet açmasını ve ajana şunu yazmasını iste: "8787'deki adt_push'u name=ZCL_X object_type=class source_file=zcl_x.clas.abap ile çağır". Sahte sunucunun stderr'inde ikinci `CALL 2` satırının GELDİĞİNİ ve gövdesinin birinciyle aynı olduğunu kaydet. Gelmezse (ajan pes ediyorsa) ölçüm dosyasına yaz ve kullanıcıya dön: talimat metni (Task 8) güçlendirilmeli.

- [ ] **Step 2: ZIP girdisi baytları `src/` ile aynı mı (yerel)**

Elinde abapGit ZIP'i olan bir yerel repo varsa (kullanıcıya sor, yoksa atla ve "atlandı" yaz):

```bash
py -3 - <<'EOF'
import hashlib, sys, zipfile
from pathlib import Path
zp, src = Path(sys.argv[1] if len(sys.argv) > 1 else "dist/x.zip"), Path("src")
with zipfile.ZipFile(zp) as z:
    for n in z.namelist():
        if not n.endswith(".abap"): continue
        zb = z.read(n); f = src / Path(n).name
        if not f.is_file(): print("YOK", n); continue
        fb = f.read_bytes()
        norm = lambda b: hashlib.sha256(b.replace(b"\r\n", b"\n")).hexdigest()
        print("HAM", zb == fb, "NORM", norm(zb) == norm(fb), n)
EOF
```

Beklenen: `NORM True` her satırda. `NORM False` varsa (ör. BOM, sondaki boş satır) ölçüm dosyasına örnekle yaz ve kullanıcıya dön.

- [ ] **Step 3: DS4'te okuma süreleri (kullanıcının gözü önünde)**

DS4'e NTT Studio ile DEV olarak bağlıyken (bugünkü motor 8787'de), kullanıcının verdiği bir test nesnesi `<NESNE>`/`<TIP>` için:

```bash
H="Authorization: Bearer $ABAP_HTTP_TOKEN"
time curl -s -H "$H" -X POST http://127.0.0.1:8787/tool/adt_sql -d '{"query":"SELECT devclass FROM tadir WHERE pgmid = '\''R3TR'\'' AND object = '\''CLAS'\'' AND obj_name = '\''<NESNE>'\''","max_rows":1}'
time curl -s -H "$H" -X POST http://127.0.0.1:8787/tool/adt_get_source -d '{"name":"<NESNE>","object_type":"class"}' -o /dev/null
time curl -s -H "$H" -X POST http://127.0.0.1:8787/tool/adt_sql -d '{"query":"SELECT trkorr, as4text, as4user, trstatus FROM e070 WHERE trkorr = '\''<TR>'\''","max_rows":1}'
```

Üç süreyi yaz. Toplam > 5 sn ise kullanıcıya dön (her yazmaya eklenecek süre).

- [ ] **Step 4: Fonksiyon modülünün TADIR karşılığı (DS4)**

```bash
curl -s -H "$H" -X POST http://127.0.0.1:8787/tool/adt_sql -d '{"query":"SELECT pname FROM tfdir WHERE funcname = '\''<FM>'\''","max_rows":1}'
curl -s -H "$H" -X POST http://127.0.0.1:8787/tool/adt_sql -d '{"query":"SELECT devclass FROM tadir WHERE pgmid = '\''R3TR'\'' AND object = '\''FUGR'\'' AND obj_name = '\''<FUGR>'\''","max_rows":1}'
```

Beklenen: `pname = SAPL<FUGR>`, TADIR'da `FUGR <FUGR>` satırı paketle. Değilse kullanıcıya dön.

- [ ] **Step 5: Ölçüm dosyasını yaz ve commit et**

`docs/superpowers/measurements/2026-09-24-sap-yazma-onayi-olcumler.md` içine: yukarıdaki dört kod okuması (Task 0 başı), Step 1-4 sonuçları (komut, tarih, çıktı özeti, "tasarımla uyumlu/çelişkili"). Müşteri adı yazma.

```bash
git add docs/superpowers/measurements/2026-09-24-sap-yazma-onayi-olcumler.md
git commit -m "Olcum: SAP DEV yazma onayi on olcumleri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Sözleşme tipleri ve karar mantığı (`policy.ts`)

Saf fonksiyonlar; HTTP, dosya, Electron yok. Zaman ve kimlik üretimi parametre, testler deterministik.

**Files:**
- Create: `app-electron/shared/sapWriteTypes.ts`
- Create: `app-electron/main/sapWrite/policy.ts`
- Test: `tests/sapWritePolicy.test.ts`

**Interfaces:**
- Consumes: yok
- Produces:
  - `sapWriteTypes.ts`: `ToolClass`, `WorkMode`, `Choice`, `Decision`, `DecisionSource`, `Quality`, `FactObject`, `TransportInfo`, `WriteFact`, `SessionView`, `ApprovalView`, `SapWriteState` (aşağıdaki tanımlar birebir).
  - `policy.ts`: `PENDING_TTL_MS`, `STICKY_TTL_MS`, `APPROVED_TTL_MS`, `TESLIM_TTL_MS`, `UST_ONAY_TTL_MS`; tipler `RecordStatus`, `ApprovalRecord`, `Identity`, `WriteSessionState`, `DecideResult`; fonksiyonlar `newSessionState(id, projectDir, identity): WriteSessionState`, `factPackages(fact): string[]`, `canSession(mode, fact): boolean`, `teslimCovers(state, fact, now): string | null`, `sweep(state, now): { expired: string[]; changed: boolean }`, `decide(state, fact, now, newId?): DecideResult`, `respond(state, id, choice, now): { ok: boolean; error?: "bulunamadi" | "karar_verilmis" | "oturum_izni_verilemez" }`, `setMode(state, mode): boolean`, `validateFact(x: unknown): x is WriteFact`.

- [ ] **Step 1: Tipleri yaz**

`app-electron/shared/sapWriteTypes.ts`:

```ts
// SAP DEV yazma onayı — main süreci, renderer ve adt_gated_server.py arasındaki sözleşme.
// Yalnızca tip: renderer da import ediyor, çalışma zamanı kodu buraya girmez.
// Alan adları Python tarafının gönderdiği JSON ile birebir aynı (Türkçe, ASCII).

export type ToolClass = "SERBEST" | "TRANSPORT_ONAYLI" | "HER_SEFER";
export type WorkMode = "dogrudan" | "yerel";
export type Choice = "reddet" | "bu_seferlik" | "oturum";
export type Decision = "izinli" | "bekliyor" | "reddedildi" | "sure_doldu" | "yerel_mod" | "mod_secilmedi";
export type DecisionSource = "pencere" | "oturum_izni" | "teslim_izni" | "ust_onay";

export interface Quality {
  kritik: number;
  yuksek: number;
  orta: number;
  dusuk: number;
}

export interface FactObject {
  ad: string;
  /** R3TR tipi: CLAS, PROG, FUNC, DDLS ... */
  tip: string;
  paket: string;
  yeni: boolean;
  /** CRLF→LF normalize edilmiş kaynak dosyalarının sha256'ları. */
  kaynak_sha256?: string[];
  /** Sistemdeki aktif sürümle birleşik fark (kırpılmış olabilir). Günlüğe YAZILMAZ. */
  fark?: string;
  fark_kirpildi?: boolean;
  kalite?: Quality;
}

export interface TransportInfo {
  aciklama: string;
  sahip: string;
  durum: string;
}

export interface WriteFact {
  arac: string;
  sinif: "TRANSPORT_ONAYLI" | "HER_SEFER";
  nesneler: FactObject[];
  /** Nesnesiz araçlarda (transport/paket açma) ve teslimde hedef paket. */
  paket?: string;
  transport: string;
  transport_bilgi: TransportInfo | null;
  /** Aracın bağlanmış argümanları + kaynak hash'lerinin kanonik JSON sha256'sı. */
  arg_hash: string;
  teslim?: { yontem: string; zip_sha256?: string };
  abapgit?: { script: string; zip_sha256?: string; paket?: string };
  ust_onay?: string;
}

export interface SessionView {
  id: string;
  sid: string;
  client: string;
  user: string;
  mode: WorkMode | null;
}

export interface ApprovalView {
  id: string;
  sessionId: string;
  createdAt: number;
  fact: WriteFact;
  canSession: boolean;
  mode: WorkMode | null;
  sid: string;
  client: string;
  user: string;
}

export interface SapWriteState {
  sessions: SessionView[];
  pending: ApprovalView[];
}
```

- [ ] **Step 2: Başarısız testleri yaz**

`tests/sapWritePolicy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { FactObject, WriteFact } from "../app-electron/shared/sapWriteTypes";
import {
  APPROVED_TTL_MS,
  PENDING_TTL_MS,
  STICKY_TTL_MS,
  TESLIM_TTL_MS,
  UST_ONAY_TTL_MS,
  canSession,
  decide,
  newSessionState,
  respond,
  setMode,
  sweep,
  validateFact,
  type WriteSessionState,
} from "../app-electron/main/sapWrite/policy";

const H = (c: string) => c.repeat(64);
const T0 = 1_000_000;

function obj(over: Partial<FactObject> = {}): FactObject {
  return { ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("1")], ...over };
}

function fact(over: Partial<WriteFact> = {}): WriteFact {
  return {
    arac: "adt_push",
    sinif: "TRANSPORT_ONAYLI",
    nesneler: [obj()],
    transport: "DS4K900001",
    transport_bilgi: { aciklama: "Test", sahip: "DEV1", durum: "D" },
    arg_hash: H("a"),
    ...over,
  };
}

function session(mode: "dogrudan" | "yerel" | null = "dogrudan"): WriteSessionState {
  const s = newSessionState("s1", "C:/p", { sid: "DS4", client: "100", user: "DEV1" });
  if (mode) setMode(s, mode);
  return s;
}

function ids() {
  let n = 0;
  return () => `id${++n}`;
}

describe("decide — temel akış", () => {
  it("mod seçilmeden her yazma mod_secilmedi", () => {
    const s = session(null);
    expect(decide(s, fact(), T0, ids()).karar).toBe("mod_secilmedi");
    expect(s.records).toHaveLength(0);
  });

  it("ilk çağrı bekliyor; aynı hash tekrar gelince aynı kayıt, yeni pencere yok", () => {
    const s = session();
    const next = ids();
    const a = decide(s, fact(), T0, next);
    const b = decide(s, fact(), T0 + 1000, next);
    expect(a).toMatchObject({ karar: "bekliyor", id: "id1", created: true });
    expect(b).toMatchObject({ karar: "bekliyor", id: "id1", created: false });
    expect(s.records).toHaveLength(1);
  });

  it("bu_seferlik onay tek kullanımlık: bir kez izinli, sonra yeni istek", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    expect(respond(s, "id1", "bu_seferlik", T0 + 1000)).toEqual({ ok: true });
    expect(decide(s, fact(), T0 + 2000, next)).toMatchObject({ karar: "izinli", id: "id1", kaynak: "pencere" });
    expect(decide(s, fact(), T0 + 3000, next)).toMatchObject({ karar: "bekliyor", id: "id2", created: true });
  });

  it("tek argüman farkı (farklı hash) yeni istek açar", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "bu_seferlik", T0 + 1000);
    expect(decide(s, fact({ arg_hash: H("b") }), T0 + 2000, next)).toMatchObject({ karar: "bekliyor", id: "id2" });
  });

  it("onay 60 dakika sonra kullanılamaz", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    expect(decide(s, fact(), T0 + APPROVED_TTL_MS + 1, next)).toMatchObject({ karar: "bekliyor", id: "id2" });
  });

  it("red yapışkan: 10 dk boyunca aynı hash reddedildi, sonra yeni istek", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "reddet", T0);
    expect(decide(s, fact(), T0 + STICKY_TTL_MS - 1, next).karar).toBe("reddedildi");
    expect(decide(s, fact(), T0 + STICKY_TTL_MS + 1, next)).toMatchObject({ karar: "bekliyor", id: "id2" });
  });

  it("sure_doldu yapışkan: cevapsız 10 dk → sure_doldu, 10 dk daha aynı cevap", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    const t1 = T0 + PENDING_TTL_MS;
    expect(sweep(s, t1).expired).toEqual(["id1"]);
    expect(decide(s, fact(), t1 + 1, next).karar).toBe("sure_doldu");
    expect(decide(s, fact(), t1 + STICKY_TTL_MS - 1, next).karar).toBe("sure_doldu");
    expect(decide(s, fact(), t1 + STICKY_TTL_MS + 1, next)).toMatchObject({ karar: "bekliyor", id: "id2" });
  });

  it("süresi dolmuş bekleyen kayda sonradan onay verilemez", () => {
    const s = session();
    decide(s, fact(), T0, ids());
    expect(respond(s, "id1", "bu_seferlik", T0 + PENDING_TTL_MS + 1)).toEqual({ ok: false, error: "karar_verilmis" });
  });

  it("respond: bilinmeyen id ve iki kez cevap", () => {
    const s = session();
    decide(s, fact(), T0, ids());
    expect(respond(s, "yok", "reddet", T0)).toEqual({ ok: false, error: "bulunamadi" });
    respond(s, "id1", "reddet", T0);
    expect(respond(s, "id1", "bu_seferlik", T0)).toEqual({ ok: false, error: "karar_verilmis" });
  });

  it("setMode yalnızca bir kez", () => {
    const s = session(null);
    expect(setMode(s, "yerel")).toBe(true);
    expect(setMode(s, "dogrudan")).toBe(false);
    expect(s.mode).toBe("yerel");
  });
});

describe("oturum izni", () => {
  it("aynı transport + paket için sonraki nesneler pencere açmaz", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    expect(respond(s, "id1", "oturum", T0)).toEqual({ ok: true });
    const other = fact({ arg_hash: H("c"), nesneler: [obj({ ad: "ZCL_B" })] });
    const r = decide(s, other, T0 + 1000, next);
    expect(r).toMatchObject({ karar: "izinli", kaynak: "oturum_izni" });
    expect(r.id).toBeTruthy();
  });

  it("farklı transport ya da farklı paket yeni pencere açar", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "oturum", T0);
    expect(decide(s, fact({ arg_hash: H("c"), transport: "DS4K900002" }), T0, next).karar).toBe("bekliyor");
    expect(decide(s, fact({ arg_hash: H("d"), nesneler: [obj({ paket: "ZDIGER" })] }), T0, next).karar).toBe("bekliyor");
  });

  it("canSession: yalnızca doğrudan mod, TRANSPORT_ONAYLI, tek paket, transport ya da $TMP", () => {
    expect(canSession("dogrudan", fact())).toBe(true);
    expect(canSession("yerel", fact())).toBe(false);
    expect(canSession("dogrudan", fact({ sinif: "HER_SEFER" }))).toBe(false);
    expect(canSession("dogrudan", fact({ arac: "axet_teslim" }))).toBe(false);
    expect(canSession("dogrudan", fact({ nesneler: [obj(), obj({ ad: "ZCL_B", paket: "ZDIGER" })] }))).toBe(false);
    expect(canSession("dogrudan", fact({ transport: "" }))).toBe(false);
    expect(canSession("dogrudan", fact({ transport: "", nesneler: [obj({ paket: "$TMP" })] }))).toBe(true);
    expect(canSession("dogrudan", fact({ nesneler: [], paket: "" }))).toBe(false);
  });

  it("canSession false iken oturum cevabı reddedilir", () => {
    const s = session();
    decide(s, fact({ sinif: "HER_SEFER", arac: "adt_delete_object" }), T0, ids());
    expect(respond(s, "id1", "oturum", T0)).toEqual({ ok: false, error: "oturum_izni_verilemez" });
    expect(s.records[0].status).toBe("bekliyor");
  });

  it("HER_SEFER oturum izniyle geçmez", () => {
    const s = session();
    const next = ids();
    decide(s, fact(), T0, next);
    respond(s, "id1", "oturum", T0);
    const del = fact({ arac: "adt_delete_object", sinif: "HER_SEFER", arg_hash: H("e") });
    expect(decide(s, del, T0, next).karar).toBe("bekliyor");
  });
});

describe("yerel mod ve teslim", () => {
  const teslim = (over: Partial<WriteFact> = {}) =>
    fact({
      arac: "axet_teslim",
      arg_hash: H("f"),
      nesneler: [obj(), obj({ ad: "ZR_X", tip: "PROG", kaynak_sha256: [H("2")] })],
      teslim: { yontem: "adt" },
      ...over,
    });

  it("yerel modda tek tek TRANSPORT_ONAYLI yazma yerel_mod; HER_SEFER ve teslim pencereye gider", () => {
    const s = session("yerel");
    const next = ids();
    expect(decide(s, fact(), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, fact({ arac: "adt_create_transport", sinif: "HER_SEFER", nesneler: [], arg_hash: H("9") }), T0, next).karar).toBe("bekliyor");
    expect(decide(s, teslim(), T0, next).karar).toBe("bekliyor");
  });

  it("onaylı teslim listedeki nesneleri aynı transport'ta 4 saat kapsar", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim(), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    const push = fact({ arg_hash: H("3"), nesneler: [obj({ ad: "ZR_X", tip: "PROG", kaynak_sha256: [H("2")] })] });
    expect(decide(s, push, T0 + 1000, next)).toMatchObject({ karar: "izinli", kaynak: "teslim_izni" });
    expect(decide(s, { ...push, arg_hash: H("4") }, T0 + 2000, next)).toMatchObject({ karar: "izinli", kaynak: "teslim_izni" });
    expect(decide(s, { ...push, arg_hash: H("5") }, T0 + TESLIM_TTL_MS + 1, next).karar).toBe("yerel_mod");
  });

  it("teslimden sonra değişen kaynak, listede olmayan nesne ve farklı transport kapsanmaz", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim(), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    expect(decide(s, fact({ arg_hash: H("3"), nesneler: [obj({ kaynak_sha256: [H("7")] })] }), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, fact({ arg_hash: H("4"), nesneler: [obj({ ad: "ZCL_YOK" })] }), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, fact({ arg_hash: H("5"), transport: "DS4K900009" }), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, fact({ arg_hash: H("6"), nesneler: [obj({ paket: "ZDIGER" })] }), T0, next).karar).toBe("yerel_mod");
  });

  it("teslim, nesnesiz araçlardan yalnızca aynı transport'a adt_set_transport'u kapsar", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim(), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    expect(decide(s, fact({ arac: "adt_set_transport", nesneler: [], arg_hash: H("3") }), T0, next).karar).toBe("izinli");
    expect(decide(s, fact({ arac: "adt_activate", nesneler: [], arg_hash: H("4") }), T0, next).karar).toBe("yerel_mod");
  });

  it("abapGit teslimi: aynı ZIP hash'i kapsanır, farklı ZIP kapsanmaz", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim({ teslim: { yontem: "abapgit", zip_sha256: H("z") }, paket: "ZPKG" }), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    const ag = (zip: string, h: string) =>
      fact({ arac: "axet_abapgit_onay", nesneler: [], arg_hash: H(h), abapgit: { script: "abapgit_deploy", zip_sha256: zip } });
    expect(decide(s, ag(H("z"), "3"), T0, next)).toMatchObject({ karar: "izinli", kaynak: "teslim_izni" });
    expect(decide(s, ag(H("y"), "4"), T0, next).karar).toBe("yerel_mod");
  });

  it("abapGit teslimi ZIP'siz script'te paketle eşleşir", () => {
    const s = session("yerel");
    const next = ids();
    decide(s, teslim({ teslim: { yontem: "abapgit", zip_sha256: H("z") }, paket: "ZPKG" }), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    const ag = (paket: string, h: string) =>
      fact({ arac: "axet_abapgit_onay", nesneler: [], arg_hash: H(h), abapgit: { script: "gui_import_zip", paket } });
    expect(decide(s, ag("ZPKG", "3"), T0, next).karar).toBe("izinli");
    expect(decide(s, ag("", "4"), T0, next).karar).toBe("yerel_mod");
    expect(decide(s, ag("ZDIGER", "5"), T0, next).karar).toBe("yerel_mod");
  });
});

describe("üst onay zinciri (abapgit_deploy alt adımları)", () => {
  const ag = (over: Partial<WriteFact> = {}) =>
    fact({ arac: "axet_abapgit_onay", nesneler: [], abapgit: { script: "abapgit_deploy", paket: "ZPKG" }, ...over });

  it("onaylı ebeveynin alt adımı pencere açmaz", () => {
    const s = session();
    const next = ids();
    decide(s, ag({ arg_hash: H("1") }), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    decide(s, ag({ arg_hash: H("1") }), T0, next);
    const child = ag({ arg_hash: H("2"), abapgit: { script: "gui_import_zip", paket: "ZPKG" }, ust_onay: "id1" });
    expect(decide(s, child, T0 + 1000, next)).toMatchObject({ karar: "izinli", kaynak: "ust_onay" });
  });

  it("farklı transport, 60 dk sonrası ya da abapGit olmayan ebeveyn geçmez", () => {
    const s = session();
    const next = ids();
    decide(s, ag({ arg_hash: H("1") }), T0, next);
    respond(s, "id1", "bu_seferlik", T0);
    expect(decide(s, ag({ arg_hash: H("2"), ust_onay: "id1", transport: "DS4K900002" }), T0, next).karar).toBe("bekliyor");
    expect(decide(s, ag({ arg_hash: H("3"), ust_onay: "id1" }), T0 + UST_ONAY_TTL_MS + 1, next).karar).toBe("bekliyor");
    decide(s, fact({ arg_hash: H("4") }), T0, next);
    const pushId = s.records[s.records.length - 1].id;
    respond(s, pushId, "bu_seferlik", T0);
    expect(decide(s, ag({ arg_hash: H("5"), ust_onay: pushId }), T0, next).karar).toBe("bekliyor");
  });
});

describe("validateFact", () => {
  it("geçerli bilgiyi kabul eder", () => {
    expect(validateFact(fact())).toBe(true);
    expect(validateFact(fact({ transport_bilgi: null, nesneler: [], paket: "ZPKG" }))).toBe(true);
  });

  it("bozuk bilgiyi reddeder", () => {
    expect(validateFact(null)).toBe(false);
    expect(validateFact({ ...fact(), arg_hash: "abc" })).toBe(false);
    expect(validateFact({ ...fact(), arg_hash: H("A") })).toBe(false);
    expect(validateFact({ ...fact(), sinif: "SERBEST" })).toBe(false);
    expect(validateFact({ ...fact(), arac: "" })).toBe(false);
    expect(validateFact({ ...fact(), nesneler: [{ ad: "X" }] })).toBe(false);
    expect(validateFact({ ...fact(), nesneler: [obj({ kaynak_sha256: ["kisa"] })] })).toBe(false);
    expect(validateFact({ ...fact(), transport: 5 })).toBe(false);
    expect(validateFact({ ...fact(), transport_bilgi: { aciklama: "x" } })).toBe(false);
  });
});
```

- [ ] **Step 3: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/sapWritePolicy.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/main/sapWrite/policy"`.

- [ ] **Step 4: `policy.ts`'yi yaz**

`app-electron/main/sapWrite/policy.ts`:

```ts
// SAP DEV yazma onayının karar mantığı. Saf: HTTP, dosya ve Electron bilmez; zaman
// ve kimlik üretimi dışarıdan gelir. server.ts bunu çağırır, testler doğrudan çağırır.
//
// Kurallar spec §5'te. Özet: aynı argüman hash'i tek bir kayda bağlanır (tekrar gelen
// çağrı yeni pencere açmaz), onay tek kullanımlıktır, red ve süre dolması 10 dakika
// yapışkandır, oturum izni (transport, paket) çiftine, teslim izni nesne listesine ve
// kaynak hash'lerine bağlıdır.

import { randomUUID } from "node:crypto";
import type {
  Choice,
  Decision,
  DecisionSource,
  WorkMode,
  WriteFact,
} from "../../shared/sapWriteTypes";

export const PENDING_TTL_MS = 10 * 60_000;
export const STICKY_TTL_MS = 10 * 60_000;
export const APPROVED_TTL_MS = 60 * 60_000;
export const TESLIM_TTL_MS = 4 * 60 * 60_000;
export const UST_ONAY_TTL_MS = 60 * 60_000;

export type RecordStatus = "bekliyor" | "onaylandi" | "reddedildi" | "sure_doldu";

export interface ApprovalRecord {
  id: string;
  fact: WriteFact;
  status: RecordStatus;
  createdAt: number;
  decidedAt: number | null;
  /** Pencere onayı tek kullanımlık; izinli döndüğü anda true olur. */
  consumed: boolean;
  source: DecisionSource;
}

export interface Identity {
  sid: string;
  client: string;
  user: string;
}

export interface SessionGrant {
  transport: string;
  paket: string;
}

export interface TeslimGrant {
  recordId: string;
  fact: WriteFact;
  grantedAt: number;
}

export interface WriteSessionState {
  id: string;
  projectDir: string;
  identity: Identity;
  mode: WorkMode | null;
  records: ApprovalRecord[];
  sessionGrants: SessionGrant[];
  teslimGrants: TeslimGrant[];
}

export interface DecideResult {
  karar: Decision;
  /** izinli ve bekliyor/reddedildi/sure_doldu için kayıt kimliği; diğerlerinde null. */
  id: string | null;
  kaynak: DecisionSource | null;
  /** Bu çağrı yeni bir bekleyen kayıt (yeni pencere) açtı mı. */
  created: boolean;
}

export type RespondError = "bulunamadi" | "karar_verilmis" | "oturum_izni_verilemez";

export function newSessionState(id: string, projectDir: string, identity: Identity): WriteSessionState {
  return { id, projectDir, identity, mode: null, records: [], sessionGrants: [], teslimGrants: [] };
}

export function setMode(state: WriteSessionState, mode: WorkMode): boolean {
  if (state.mode !== null) return false;
  state.mode = mode;
  return true;
}

/** Yazmanın dokunduğu paketler. Nesnesiz araçlarda fact.paket (yoksa abapGit paketi). */
export function factPackages(fact: WriteFact): string[] {
  if (fact.nesneler.length > 0) return [...new Set(fact.nesneler.map((o) => o.paket))];
  return [fact.paket ?? fact.abapgit?.paket ?? ""];
}

export function canSession(mode: WorkMode | null, fact: WriteFact): boolean {
  if (mode !== "dogrudan") return false;
  if (fact.sinif !== "TRANSPORT_ONAYLI" || fact.arac === "axet_teslim") return false;
  const pk = factPackages(fact);
  if (pk.length !== 1 || !pk[0]) return false;
  // Transport'suz oturum izni yalnızca yerel ($TMP) pakette: orada transport kaydı yok.
  return fact.transport !== "" || pk[0] === "$TMP";
}

function sessionCovers(state: WriteSessionState, fact: WriteFact): boolean {
  if (!canSession(state.mode, fact)) return false;
  const paket = factPackages(fact)[0];
  return state.sessionGrants.some((g) => g.transport === fact.transport && g.paket === paket);
}

/** Onaylı bir teslim bu yazmayı kapsıyorsa teslim kaydının kimliği, yoksa null. */
export function teslimCovers(state: WriteSessionState, fact: WriteFact, now: number): string | null {
  for (const g of state.teslimGrants) {
    if (now - g.grantedAt >= TESLIM_TTL_MS) continue;
    const t = g.fact.teslim;
    if (!t) continue;
    if (t.yontem === "abapgit") {
      if (fact.arac !== "axet_abapgit_onay") continue;
      if (fact.transport && fact.transport !== g.fact.transport) continue;
      const zip = fact.abapgit?.zip_sha256;
      if (zip) {
        if (zip === t.zip_sha256) return g.recordId;
        continue;
      }
      const paket = fact.abapgit?.paket ?? "";
      if (paket && paket === (g.fact.paket ?? "")) return g.recordId;
      continue;
    }
    // ADT teslimi: listedeki nesneler, aynı transport, incelenen kaynağın alt kümesi.
    if (fact.arac === "axet_abapgit_onay" || fact.arac === "axet_teslim") continue;
    if (fact.sinif !== "TRANSPORT_ONAYLI" || fact.transport !== g.fact.transport) continue;
    if (fact.nesneler.length === 0) {
      if (fact.arac === "adt_set_transport") return g.recordId;
      continue;
    }
    const covered = fact.nesneler.every((o) => {
      const m = g.fact.nesneler.find((x) => x.ad === o.ad && x.tip === o.tip);
      if (!m || m.paket !== o.paket) return false;
      const allowed = new Set(m.kaynak_sha256 ?? []);
      return (o.kaynak_sha256 ?? []).every((h) => allowed.has(h));
    });
    if (covered) return g.recordId;
  }
  return null;
}

function ustOnayValid(state: WriteSessionState, fact: WriteFact, now: number): boolean {
  if (fact.arac !== "axet_abapgit_onay" || !fact.ust_onay) return false;
  const parent = state.records.find((r) => r.id === fact.ust_onay);
  if (!parent || parent.status !== "onaylandi" || parent.fact.arac !== "axet_abapgit_onay") return false;
  if (now - (parent.decidedAt ?? parent.createdAt) >= UST_ONAY_TTL_MS) return false;
  if (fact.transport && parent.fact.transport && fact.transport !== parent.fact.transport) return false;
  return true;
}

export function sweep(state: WriteSessionState, now: number): { expired: string[]; changed: boolean } {
  const expired: string[] = [];
  for (const r of state.records) {
    if (r.status === "bekliyor" && now - r.createdAt >= PENDING_TTL_MS) {
      r.status = "sure_doldu";
      r.decidedAt = now;
      expired.push(r.id);
    }
  }
  const recordCount = state.records.length;
  state.records = state.records.filter((r) => {
    if (r.status === "bekliyor") return true;
    const at = r.decidedAt ?? r.createdAt;
    return now - at < (r.status === "onaylandi" ? APPROVED_TTL_MS : STICKY_TTL_MS);
  });
  const grantCount = state.teslimGrants.length;
  state.teslimGrants = state.teslimGrants.filter((g) => now - g.grantedAt < TESLIM_TTL_MS);
  const changed =
    expired.length > 0 || state.records.length !== recordCount || state.teslimGrants.length !== grantCount;
  return { expired, changed };
}

function latestByHash(state: WriteSessionState, hash: string): ApprovalRecord | undefined {
  for (let i = state.records.length - 1; i >= 0; i--) {
    if (state.records[i].fact.arg_hash === hash) return state.records[i];
  }
  return undefined;
}

/** Pencere açmadan verilen izin de bir kayıt bırakır: /results ve üst onay zinciri kimliğe bağlanır. */
function grantRecord(
  state: WriteSessionState,
  fact: WriteFact,
  now: number,
  source: DecisionSource,
  newId: () => string,
): DecideResult {
  const id = newId();
  state.records.push({ id, fact, status: "onaylandi", createdAt: now, decidedAt: now, consumed: true, source });
  return { karar: "izinli", id, kaynak: source, created: false };
}

export function decide(
  state: WriteSessionState,
  fact: WriteFact,
  now: number,
  newId: () => string = randomUUID,
): DecideResult {
  sweep(state, now);
  if (state.mode === null) return { karar: "mod_secilmedi", id: null, kaynak: null, created: false };

  const same = latestByHash(state, fact.arg_hash);
  if (same) {
    if (same.status === "bekliyor") return { karar: "bekliyor", id: same.id, kaynak: null, created: false };
    if (same.status === "reddedildi" || same.status === "sure_doldu") {
      if (now - (same.decidedAt ?? same.createdAt) < STICKY_TTL_MS) {
        return { karar: same.status, id: same.id, kaynak: null, created: false };
      }
    }
    if (
      same.status === "onaylandi" &&
      same.source === "pencere" &&
      !same.consumed &&
      now - (same.decidedAt ?? same.createdAt) < APPROVED_TTL_MS
    ) {
      same.consumed = true;
      return { karar: "izinli", id: same.id, kaynak: "pencere", created: false };
    }
  }

  if (ustOnayValid(state, fact, now)) return grantRecord(state, fact, now, "ust_onay", newId);
  if (teslimCovers(state, fact, now)) return grantRecord(state, fact, now, "teslim_izni", newId);
  if (state.mode === "dogrudan" && sessionCovers(state, fact)) {
    return grantRecord(state, fact, now, "oturum_izni", newId);
  }
  if (state.mode === "yerel" && fact.sinif === "TRANSPORT_ONAYLI" && fact.arac !== "axet_teslim") {
    return { karar: "yerel_mod", id: null, kaynak: null, created: false };
  }

  const id = newId();
  state.records.push({ id, fact, status: "bekliyor", createdAt: now, decidedAt: null, consumed: false, source: "pencere" });
  return { karar: "bekliyor", id, kaynak: null, created: true };
}

export function respond(
  state: WriteSessionState,
  id: string,
  choice: Choice,
  now: number,
): { ok: boolean; error?: RespondError } {
  sweep(state, now);
  const r = state.records.find((x) => x.id === id);
  if (!r) return { ok: false, error: "bulunamadi" };
  if (r.status !== "bekliyor") return { ok: false, error: "karar_verilmis" };
  if (choice === "oturum" && !canSession(state.mode, r.fact)) return { ok: false, error: "oturum_izni_verilemez" };
  r.decidedAt = now;
  if (choice === "reddet") {
    r.status = "reddedildi";
    return { ok: true };
  }
  r.status = "onaylandi";
  if (choice === "oturum") {
    const paket = factPackages(r.fact)[0];
    if (!state.sessionGrants.some((g) => g.transport === r.fact.transport && g.paket === paket)) {
      state.sessionGrants.push({ transport: r.fact.transport, paket });
    }
  }
  if (r.fact.arac === "axet_teslim") state.teslimGrants.push({ recordId: r.id, fact: r.fact, grantedAt: now });
  return { ok: true };
}

const HASH_RE = /^[0-9a-f]{64}$/;
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function validObject(o: unknown): boolean {
  if (!isObj(o)) return false;
  if (!isStr(o.ad) || !o.ad || !isStr(o.tip) || !o.tip || !isStr(o.paket) || typeof o.yeni !== "boolean") return false;
  if (o.kaynak_sha256 !== undefined) {
    if (!Array.isArray(o.kaynak_sha256) || !o.kaynak_sha256.every((h) => isStr(h) && HASH_RE.test(h))) return false;
  }
  if (o.fark !== undefined && !isStr(o.fark)) return false;
  if (o.fark_kirpildi !== undefined && typeof o.fark_kirpildi !== "boolean") return false;
  if (o.kalite !== undefined) {
    const k = o.kalite;
    if (!isObj(k) || !isNum(k.kritik) || !isNum(k.yuksek) || !isNum(k.orta) || !isNum(k.dusuk)) return false;
  }
  return true;
}

/** Python tarafından gelen bilginin şekli. Tutmayan istek pencere açmaz, 400 döner. */
export function validateFact(x: unknown): x is WriteFact {
  if (!isObj(x)) return false;
  if (!isStr(x.arac) || !x.arac) return false;
  if (x.sinif !== "TRANSPORT_ONAYLI" && x.sinif !== "HER_SEFER") return false;
  if (!Array.isArray(x.nesneler) || !x.nesneler.every(validObject)) return false;
  if (x.paket !== undefined && !isStr(x.paket)) return false;
  if (!isStr(x.transport)) return false;
  if (x.transport_bilgi !== null) {
    const t = x.transport_bilgi;
    if (!isObj(t) || !isStr(t.aciklama) || !isStr(t.sahip) || !isStr(t.durum)) return false;
  }
  if (!isStr(x.arg_hash) || !HASH_RE.test(x.arg_hash)) return false;
  if (x.teslim !== undefined) {
    const t = x.teslim;
    if (!isObj(t) || !isStr(t.yontem) || (t.zip_sha256 !== undefined && !isStr(t.zip_sha256))) return false;
  }
  if (x.abapgit !== undefined) {
    const a = x.abapgit;
    if (!isObj(a) || !isStr(a.script) || !a.script) return false;
    if (a.zip_sha256 !== undefined && !isStr(a.zip_sha256)) return false;
    if (a.paket !== undefined && !isStr(a.paket)) return false;
  }
  if (x.ust_onay !== undefined && !isStr(x.ust_onay)) return false;
  return true;
}
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npx vitest run tests/sapWritePolicy.test.ts`
Expected: PASS (tüm testler).

Run: `npm run typecheck`
Expected: hata yok.

- [ ] **Step 6: Commit**

```bash
git add app-electron/shared/sapWriteTypes.ts app-electron/main/sapWrite/policy.ts tests/sapWritePolicy.test.ts
git commit -m "SAP yazma onayi: karar mantigi (mod, tek kullanimlik onay, oturum/teslim izni)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Günlük ve onay ucu (`log.ts`, `server.ts`)

Launcher'ın içinde, yalnızca `127.0.0.1`'e bağlanan tek bir HTTP sunucusu. Her DEV projesi bir **oturum** açar; oturumun token'ı hem kimlik doğrulama hem de oturum seçimidir. Token yalnızca bellekte ve gated sunucunun ortam değişkeninde yaşar.

**Files:**
- Create: `app-electron/main/sapWrite/log.ts`
- Create: `app-electron/main/sapWrite/server.ts`
- Test: `tests/sapWriteServer.test.ts`

**Interfaces:**
- Consumes (Task 1): `decide`, `respond`, `sweep`, `setMode`, `canSession`, `validateFact`, `newSessionState`, `Identity`, `WriteSessionState`; tipler `Choice`, `Decision`, `SapWriteState`, `WorkMode`, `WriteFact`.
- Produces:
  - `log.ts`: `LOG_FILE = "sap-yazma-gunlugu.jsonl"`, `factLogFields(fact: WriteFact): Record<string, unknown>`, `resultLogFields(x: unknown): Record<string, unknown>`, `appendDecisionLog(projectDir: string, entry: Record<string, unknown>, now?: number): void`.
  - `server.ts`: `openWriteSession(projectDir: string, identity: Identity): Promise<{ url: string; token: string; sessionId: string }>`, `closeWriteSession(projectDir: string): void`, `closeAllWriteSessions(): void`, `setWriteMode(sessionId: string, mode: WorkMode): boolean`, `respondToApproval(id: string, choice: Choice): { ok: boolean; error?: string }`, `listWriteState(): SapWriteState`, `setWriteNotifier(fn: (() => void) | null): void`, `sweepNow(now?: number): void`, `stopApprovalServer(): Promise<void>`.
  - HTTP sözleşmesi (Python tarafı bunu kullanır, hepsi `Authorization: Bearer <oturum token'ı>`):
    - `GET /health` → 200 `{"ok":true}`; token geçersizse 401.
    - `POST /approvals` gövde `WriteFact` → 200 `{"karar": Decision, "id": string|null, "mesaj": string}`; şekil bozuksa 400 `{"hata":"gecersiz_bilgi"}`.
    - `POST /results` gövde `{"id": string, "sap_sonucu": object, "atc"?: object}` → 200 `{"ok":true}`; bilinmeyen id 404 `{"hata":"bulunamadi"}`.
    - `POST /events` gövde `{"tur":"kalite_reddi", "arac": string, "nesneler": [{ad,tip}], "sebep": string}` → 200 `{"ok":true}`; başka `tur` 400.
    - 4 MB'tan büyük gövde 413; bilinmeyen yol 404; token yok/yanlış 401.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/sapWriteServer.test.ts`:

```ts
// Onay ucu: launcher'ın içindeki yerel HTTP sunucusu. Python katmanı (adt_gated_server.py)
// her yazmadan önce buraya sorar. Burada ölçülenler: token oturumu seçiyor, kapanan
// oturumun token'ı ölü, günlük kaynak kodu/farkı/token'ı İÇERMİYOR.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WriteFact } from "../app-electron/shared/sapWriteTypes";
import {
  closeWriteSession,
  listWriteState,
  openWriteSession,
  respondToApproval,
  setWriteMode,
  setWriteNotifier,
  stopApprovalServer,
  sweepNow,
} from "../app-electron/main/sapWrite/server";
import { LOG_FILE } from "../app-electron/main/sapWrite/log";

const H = (c: string) => c.repeat(64);
const ID = { sid: "DS4", client: "100", user: "DEV1" };

function fact(over: Partial<WriteFact> = {}): WriteFact {
  return {
    arac: "adt_push",
    sinif: "TRANSPORT_ONAYLI",
    nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("1")], fark: "+GIZLI_KAYNAK_SATIRI" }],
    transport: "DS4K900001",
    transport_bilgi: { aciklama: "Test", sahip: "DEV1", durum: "D" },
    arg_hash: H("a"),
    ...over,
  };
}

let dir: string;

async function call(url: string, token: string | null, method: string, p: string, body?: unknown) {
  const res = await fetch(url + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

function logLines(): Record<string, unknown>[] {
  return readFileSync(path.join(dir, LOG_FILE), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "sapwrite-"));
});

afterEach(async () => {
  setWriteNotifier(null);
  await stopApprovalServer();
  rmSync(dir, { recursive: true, force: true });
});

describe("onay ucu", () => {
  it("health token ister; yanlış ya da eksik token 401", async () => {
    const s = await openWriteSession(dir, ID);
    expect((await call(s.url, s.token, "GET", "/health")).status).toBe(200);
    expect((await call(s.url, null, "GET", "/health")).status).toBe(401);
    expect((await call(s.url, "x".repeat(64), "GET", "/health")).status).toBe(401);
    expect(s.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });

  it("mod seçilmeden mod_secilmedi; seçildikten sonra bekliyor ve bildirim", async () => {
    const s = await openWriteSession(dir, ID);
    const notify = vi.fn();
    setWriteNotifier(notify);
    expect((await call(s.url, s.token, "POST", "/approvals", fact())).json.karar).toBe("mod_secilmedi");
    expect(setWriteMode(s.sessionId, "dogrudan")).toBe(true);
    const r = await call(s.url, s.token, "POST", "/approvals", fact());
    expect(r.status).toBe(200);
    expect(r.json.karar).toBe("bekliyor");
    expect(r.json.mesaj).toContain("AYNI çağrıyı AYNI argümanlarla");
    expect(notify).toHaveBeenCalled();
    const st = listWriteState();
    expect(st.sessions).toEqual([{ id: s.sessionId, sid: "DS4", client: "100", user: "DEV1", mode: "dogrudan" }]);
    expect(st.pending).toHaveLength(1);
    expect(st.pending[0]).toMatchObject({ id: r.json.id, canSession: true, sid: "DS4" });
  });

  it("pencereden onay → aynı çağrı izinli; sonuç kaydı 200, bilinmeyen id 404", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    const r = await call(s.url, s.token, "POST", "/approvals", fact());
    expect(respondToApproval(r.json.id, "bu_seferlik")).toEqual({ ok: true });
    const again = await call(s.url, s.token, "POST", "/approvals", fact());
    expect(again.json).toMatchObject({ karar: "izinli", id: r.json.id });
    expect(listWriteState().pending).toHaveLength(0);
    const ok = await call(s.url, s.token, "POST", "/results", { id: r.json.id, sap_sonucu: { success: true, corrnr: "DS4K900001" } });
    expect(ok.status).toBe(200);
    expect((await call(s.url, s.token, "POST", "/results", { id: "yok", sap_sonucu: {} })).status).toBe(404);
  });

  it("bozuk bilgi 400, büyük gövde 413, bilinmeyen yol 404", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    const bad = await call(s.url, s.token, "POST", "/approvals", { ...fact(), arg_hash: "x" });
    expect(bad).toEqual({ status: 400, json: { hata: "gecersiz_bilgi" } });
    expect((await call(s.url, s.token, "POST", "/approvals", "{bozuk")).status).toBe(400);
    const big = await call(s.url, s.token, "POST", "/approvals", JSON.stringify({ x: "a".repeat(4 * 1024 * 1024 + 10) }));
    expect(big.status).toBe(413);
    expect((await call(s.url, s.token, "GET", "/yok")).status).toBe(404);
  });

  it("kapanan oturumun token'ı ölü; yeni oturum eski onayları görmüyor", async () => {
    const a = await openWriteSession(dir, ID);
    setWriteMode(a.sessionId, "dogrudan");
    await call(a.url, a.token, "POST", "/approvals", fact());
    closeWriteSession(dir);
    expect((await call(a.url, a.token, "GET", "/health")).status).toBe(401);
    expect(listWriteState()).toEqual({ sessions: [], pending: [] });
    const b = await openWriteSession(dir, ID);
    expect(b.token).not.toBe(a.token);
    expect((await call(b.url, b.token, "POST", "/approvals", fact())).json.karar).toBe("mod_secilmedi");
  });

  it("aynı proje için ikinci açılış öncekini kapatıyor", async () => {
    const a = await openWriteSession(dir, ID);
    const b = await openWriteSession(dir, ID);
    expect((await call(a.url, a.token, "GET", "/health")).status).toBe(401);
    expect((await call(b.url, b.token, "GET", "/health")).status).toBe(200);
    expect(listWriteState().sessions).toHaveLength(1);
  });

  it("iki projenin token'ı birbirinin oturumuna girmiyor", async () => {
    const other = mkdtempSync(path.join(tmpdir(), "sapwrite-b-"));
    try {
      const a = await openWriteSession(dir, ID);
      const b = await openWriteSession(other, { ...ID, sid: "DS5" });
      setWriteMode(a.sessionId, "dogrudan");
      const r = await call(b.url, b.token, "POST", "/approvals", fact());
      expect(r.json.karar).toBe("mod_secilmedi");
      expect(a.url).toBe(b.url);
    } finally {
      closeWriteSession(other);
      rmSync(other, { recursive: true, force: true });
    }
  });

  it("süpürme: cevapsız istek 10 dk sonra sure_doldu olur ve günlüğe yazılır", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    await call(s.url, s.token, "POST", "/approvals", fact());
    const notify = vi.fn();
    setWriteNotifier(notify);
    sweepNow(Date.now() + 10 * 60_000 + 1);
    expect(listWriteState().pending).toHaveLength(0);
    expect(notify).toHaveBeenCalled();
    expect(logLines().some((l) => l.tur === "karar" && l.karar === "sure_doldu")).toBe(true);
  });

  it("kalite reddi olayı günlüğe yazılır; başka olay 400", async () => {
    const s = await openWriteSession(dir, ID);
    const ok = await call(s.url, s.token, "POST", "/events", {
      tur: "kalite_reddi",
      arac: "adt_push",
      nesneler: [{ ad: "ZCL_A", tip: "CLAS" }],
      sebep: "kritik_bulgu",
    });
    expect(ok.status).toBe(200);
    expect((await call(s.url, s.token, "POST", "/events", { tur: "baska" })).status).toBe(400);
    expect(logLines().find((l) => l.tur === "kalite_reddi")).toMatchObject({ arac: "adt_push", sebep: "kritik_bulgu" });
  });

  it("günlük: kimlik ve karar var; kaynak farkı ve token YOK", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    const r = await call(s.url, s.token, "POST", "/approvals", fact());
    respondToApproval(r.json.id, "bu_seferlik");
    await call(s.url, s.token, "POST", "/approvals", fact());
    await call(s.url, s.token, "POST", "/results", { id: r.json.id, sap_sonucu: { success: false, error: "e".repeat(2000) } });
    const raw = readFileSync(path.join(dir, LOG_FILE), "utf8");
    expect(raw).not.toContain("GIZLI_KAYNAK_SATIRI");
    expect(raw).not.toContain(s.token);
    const lines = logLines();
    expect(lines.map((l) => l.tur)).toEqual(["mod", "karar", "cevap", "karar", "sonuc"]);
    expect(lines[1]).toMatchObject({ sid: "DS4", client: "100", kullanici: "DEV1", mod: "dogrudan", karar: "bekliyor" });
    expect(lines[2]).toMatchObject({ secim: "bu_seferlik" });
    expect(String((lines[4].sap_sonucu as Record<string, unknown>).error).length).toBeLessThanOrEqual(500);
    for (const l of lines) expect(typeof l.zaman).toBe("string");
  });

  it("aynı istek tekrar geldikçe günlüğe yeni 'bekliyor' satırı yazılmıyor", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    await call(s.url, s.token, "POST", "/approvals", fact());
    await call(s.url, s.token, "POST", "/approvals", fact());
    await call(s.url, s.token, "POST", "/approvals", fact());
    expect(logLines().filter((l) => l.tur === "karar")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/sapWriteServer.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/main/sapWrite/server"`.

- [ ] **Step 3: `log.ts`'yi yaz**

`app-electron/main/sapWrite/log.ts`:

```ts
// SAP yazma kararlarının günlüğü: proje klasöründe `sap-yazma-gunlugu.jsonl`,
// satır başına bir JSON. Kim, hangi sistemde, hangi nesneye, hangi transport'la,
// neye karar verildi, SAP ne dedi.
//
// Günlüğe GİRMEYENLER: kaynak kodun kendisi, fark, şifre, token. Proje klasörü
// OneDrive'a eşitlenebiliyor; günlük bir kaynak kopyasına dönüşmemeli.

import { appendFileSync } from "node:fs";
import path from "node:path";
import type { WriteFact } from "../../shared/sapWriteTypes";

export const LOG_FILE = "sap-yazma-gunlugu.jsonl";

const MAX_TEXT = 500;

export function factLogFields(fact: WriteFact): Record<string, unknown> {
  return {
    arac: fact.arac,
    sinif: fact.sinif,
    transport: fact.transport,
    nesneler: fact.nesneler.map((o) => ({
      ad: o.ad,
      tip: o.tip,
      paket: o.paket,
      yeni: o.yeni,
      ...(o.kalite ? { kalite: o.kalite } : {}),
    })),
    ...(fact.paket ? { paket: fact.paket } : {}),
    ...(fact.teslim ? { teslim: fact.teslim } : {}),
    ...(fact.abapgit ? { abapgit: fact.abapgit } : {}),
    ...(fact.ust_onay ? { ust_onay: fact.ust_onay } : {}),
  };
}

/** SAP sonucundan günlüğe yalnızca özet alanlar; uzun metinler kırpılır. */
export function resultLogFields(x: unknown): Record<string, unknown> {
  if (typeof x !== "object" || x === null) return {};
  const src = x as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ["ok", "success", "activated", "corrnr", "error", "error_type", "message"]) {
    const v = src[key];
    if (v === undefined) continue;
    out[key] = typeof v === "string" ? v.slice(0, MAX_TEXT) : typeof v === "boolean" || typeof v === "number" ? v : String(v).slice(0, MAX_TEXT);
  }
  return out;
}

export function appendDecisionLog(projectDir: string, entry: Record<string, unknown>, now: number = Date.now()): void {
  const line = JSON.stringify({ zaman: new Date(now).toISOString(), ...entry });
  try {
    appendFileSync(path.join(projectDir, LOG_FILE), line + "\n", "utf8");
  } catch (err) {
    // Günlük yazılamadı (klasör silinmiş, OneDrive kilidi): karar yine geçerli.
    // Yazmayı günlük yüzünden durdurmak, kullanıcının verdiği onayı yok saymak olurdu.
    console.warn(`[sap-yazma] günlük yazılamadı: ${String(err)}`);
  }
}
```

- [ ] **Step 4: `server.ts`'yi yaz**

`app-electron/main/sapWrite/server.ts`:

```ts
// SAP DEV yazma onayının yerel ucu. adt_gated_server.py her yazmadan önce buraya
// sorar; karar policy.ts'de, pencere renderer'da.
//
// Tek sunucu, 127.0.0.1'de rastgele port. Her DEV projesi bir oturum açar; oturumun
// 32 baytlık token'ı hem kimlik doğrulama hem de oturum seçimidir. Token yalnızca
// bellekte ve gated sunucunun ortam değişkeninde yaşar — dosyaya, sap-context.md'ye,
// günlüğe yazılmaz. Oturum kapanınca token ölür: eski gated sunucu bir daha onay
// alamaz (her yazması approval_unavailable).

import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import type { Choice, Decision, SapWriteState, WorkMode } from "../../shared/sapWriteTypes";
import { appendDecisionLog, factLogFields, resultLogFields } from "./log";
import {
  canSession,
  decide,
  newSessionState,
  respond,
  setMode,
  sweep,
  validateFact,
  type Identity,
  type WriteSessionState,
} from "./policy";

const MAX_BODY = 4 * 1024 * 1024;
const SWEEP_INTERVAL_MS = 30_000;

interface Session {
  state: WriteSessionState;
  token: string;
}

const sessions = new Map<string, Session>();
let server: Server | null = null;
let serverPort = 0;
let starting: Promise<void> | null = null;
let sweeper: NodeJS.Timeout | null = null;
let notifier: (() => void) | null = null;

const MESAJ: Record<Decision, string> = {
  izinli: "Onaylandı.",
  bekliyor:
    "Onay NTT Studio penceresinde bekliyor. Kullanıcıya pencereyi söyle ve bekle; kullanıcı onaylayınca AYNI çağrıyı AYNI argümanlarla tekrar gönder. Argümanı değiştirirsen yeni bir onay açılır.",
  reddedildi: "Kullanıcı reddetti. Tekrar deneme, başka yoldan da deneme. Kullanıcıya ne yapmak istediğini sor.",
  sure_doldu:
    "Onay penceresi 10 dakika cevapsız kaldı. Kullanıcıya sor; isterse 10 dakika sonra aynı çağrıyı tekrar gönder.",
  yerel_mod:
    "Bu oturum yerel modda: SAP'a tek tek yazılmaz. Değişiklikleri yerelde bitir, sonra axet_teslim ile listenin tamamını tek seferde onaylat.",
  mod_secilmedi:
    "Kullanıcı bu oturum için çalışma modunu henüz seçmedi. NTT Studio penceresinden seçmesini iste, sonra tekrar dene.",
};

function sameDir(a: string, b: string): boolean {
  const na = path.resolve(a);
  const nb = path.resolve(b);
  return process.platform === "win32" ? na.toLowerCase() === nb.toLowerCase() : na === nb;
}

function notify(): void {
  try {
    notifier?.();
  } catch {
    // Pencere kapanmış olabilir; karar akışını bildirim yüzünden bozma.
  }
}

function identityFields(s: WriteSessionState): Record<string, unknown> {
  return { sid: s.identity.sid, client: s.identity.client, kullanici: s.identity.user, mod: s.mode };
}

function findSession(req: IncomingMessage): Session | null {
  const header = req.headers.authorization ?? "";
  const got = Buffer.from(header);
  for (const s of sessions.values()) {
    const want = Buffer.from(`Bearer ${s.token}`);
    if (got.length === want.length && timingSafeEqual(got, want)) return s;
  }
  return null;
}

function send(res: ServerResponse, code: number, body: unknown): void {
  const data = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": data.length });
  res.end(data);
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooBig = false;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        tooBig = true;
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(tooBig ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const session = findSession(req);
  if (!session) {
    // Gövdeyi okumadan kapat: token'sız istemciye 4 MB okuma bedava verilmesin.
    send(res, 401, { hata: "yetkisiz" });
    return;
  }
  const url = req.url ?? "";
  if (req.method === "GET" && url === "/health") {
    send(res, 200, { ok: true });
    return;
  }
  if (req.method !== "POST" || !["/approvals", "/results", "/events"].includes(url)) {
    send(res, 404, { hata: "yok" });
    return;
  }
  const text = await readBody(req);
  if (text === null) {
    send(res, 413, { hata: "govde_buyuk" });
    return;
  }
  const body = parseJson(text);
  const state = session.state;
  const now = Date.now();

  if (url === "/approvals") {
    if (!validateFact(body)) {
      send(res, 400, { hata: "gecersiz_bilgi" });
      return;
    }
    const r = decide(state, body, now);
    // Aynı bekleyen isteğin tekrarı (ajan yoklarken) günlüğü şişirmesin.
    if (!(r.karar === "bekliyor" && !r.created)) {
      appendDecisionLog(
        state.projectDir,
        { tur: "karar", id: r.id, karar: r.karar, kaynak: r.kaynak, ...factLogFields(body), ...identityFields(state) },
        now,
      );
    }
    if (r.created) notify();
    send(res, 200, { karar: r.karar, id: r.id, mesaj: MESAJ[r.karar] });
    return;
  }

  if (url === "/results") {
    const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
    const id = typeof b.id === "string" ? b.id : "";
    const rec = state.records.find((r) => r.id === id);
    if (!rec) {
      send(res, 404, { hata: "bulunamadi" });
      return;
    }
    appendDecisionLog(
      state.projectDir,
      {
        tur: "sonuc",
        id,
        arac: rec.fact.arac,
        transport: rec.fact.transport,
        sap_sonucu: resultLogFields(b.sap_sonucu),
        ...(b.atc !== undefined ? { atc: b.atc } : {}),
        ...identityFields(state),
      },
      now,
    );
    send(res, 200, { ok: true });
    return;
  }

  // /events — yalnızca günlük; hiçbir izin vermez.
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (b.tur !== "kalite_reddi" || typeof b.arac !== "string") {
    send(res, 400, { hata: "gecersiz_olay" });
    return;
  }
  const nesneler = Array.isArray(b.nesneler)
    ? b.nesneler
        .filter((o): o is Record<string, unknown> => typeof o === "object" && o !== null)
        .map((o) => ({ ad: String(o.ad ?? ""), tip: String(o.tip ?? "") }))
    : [];
  appendDecisionLog(
    state.projectDir,
    { tur: "kalite_reddi", arac: b.arac, nesneler, sebep: String(b.sebep ?? "").slice(0, 200), ...identityFields(state) },
    now,
  );
  send(res, 200, { ok: true });
}

async function ensureServer(): Promise<void> {
  if (server) return;
  if (starting) return starting;
  starting = new Promise<void>((resolve, reject) => {
    const srv = createServer((req, res) => {
      handle(req, res).catch(() => {
        if (!res.headersSent) send(res, 500, { hata: "ic_hata" });
      });
    });
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      server = srv;
      serverPort = (srv.address() as AddressInfo).port;
      sweeper = setInterval(() => sweepNow(), SWEEP_INTERVAL_MS);
      sweeper.unref();
      resolve();
    });
  });
  try {
    await starting;
  } finally {
    starting = null;
  }
}

export async function openWriteSession(
  projectDir: string,
  identity: Identity,
): Promise<{ url: string; token: string; sessionId: string }> {
  await ensureServer();
  closeWriteSession(projectDir);
  const sessionId = randomUUID();
  const token = randomBytes(32).toString("hex");
  sessions.set(sessionId, { state: newSessionState(sessionId, projectDir, identity), token });
  notify();
  return { url: `http://127.0.0.1:${serverPort}`, token, sessionId };
}

export function closeWriteSession(projectDir: string): void {
  let changed = false;
  for (const [id, s] of sessions) {
    if (sameDir(s.state.projectDir, projectDir)) {
      sessions.delete(id);
      changed = true;
    }
  }
  if (changed) notify();
}

export function closeAllWriteSessions(): void {
  if (sessions.size === 0) return;
  sessions.clear();
  notify();
}

export function setWriteMode(sessionId: string, mode: WorkMode): boolean {
  const s = sessions.get(sessionId);
  if (!s || !setMode(s.state, mode)) return false;
  appendDecisionLog(s.state.projectDir, { tur: "mod", ...identityFields(s.state) });
  notify();
  return true;
}

export function respondToApproval(id: string, choice: Choice): { ok: boolean; error?: string } {
  for (const s of sessions.values()) {
    const rec = s.state.records.find((r) => r.id === id);
    if (!rec) continue;
    const r = respond(s.state, id, choice, Date.now());
    if (r.ok) {
      appendDecisionLog(s.state.projectDir, {
        tur: "cevap",
        id,
        secim: choice,
        ...factLogFields(rec.fact),
        ...identityFields(s.state),
      });
    }
    notify();
    return r;
  }
  return { ok: false, error: "bulunamadi" };
}

export function listWriteState(): SapWriteState {
  const out: SapWriteState = { sessions: [], pending: [] };
  for (const s of sessions.values()) {
    const st = s.state;
    out.sessions.push({ id: st.id, sid: st.identity.sid, client: st.identity.client, user: st.identity.user, mode: st.mode });
    for (const r of st.records) {
      if (r.status !== "bekliyor") continue;
      out.pending.push({
        id: r.id,
        sessionId: st.id,
        createdAt: r.createdAt,
        fact: r.fact,
        canSession: canSession(st.mode, r.fact),
        mode: st.mode,
        sid: st.identity.sid,
        client: st.identity.client,
        user: st.identity.user,
      });
    }
  }
  out.pending.sort((a, b) => a.createdAt - b.createdAt);
  return out;
}

export function setWriteNotifier(fn: (() => void) | null): void {
  notifier = fn;
}

export function sweepNow(now: number = Date.now()): void {
  let changed = false;
  for (const s of sessions.values()) {
    const r = sweep(s.state, now);
    for (const id of r.expired) {
      const rec = s.state.records.find((x) => x.id === id);
      appendDecisionLog(
        s.state.projectDir,
        { tur: "karar", id, karar: "sure_doldu", ...(rec ? factLogFields(rec.fact) : {}), ...identityFields(s.state) },
        now,
      );
    }
    if (r.changed) changed = true;
  }
  if (changed) notify();
}

export async function stopApprovalServer(): Promise<void> {
  if (sweeper) clearInterval(sweeper);
  sweeper = null;
  sessions.clear();
  const srv = server;
  server = null;
  serverPort = 0;
  if (!srv) return;
  srv.closeAllConnections?.();
  await new Promise<void>((resolve) => srv.close(() => resolve()));
}
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npx vitest run tests/sapWriteServer.test.ts tests/sapWritePolicy.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: hata yok.

- [ ] **Step 6: Commit**

```bash
git add app-electron/main/sapWrite/log.ts app-electron/main/sapWrite/server.ts tests/sapWriteServer.test.ts
git commit -m "SAP yazma onayi: yerel onay ucu ve karar gunlugu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Kalite kapısı ve bilgi toplama (Python)

Motora dokunmadan, gated katmanın (Task 4) kullanacağı iki saf modül. `gated_quality.py` SAP'a hiç dokunmaz: kaynak hash'i, `.sap-review/` kayıtları, abapGit ZIP'i, fark. `gated_collect.py` her onaylı yazmadan önce SAP'tan yalnızca **okur** (TADIR/TFDIR, transport, aktif kaynak) ve onay penceresinin göstereceği bilgiyi (`WriteFact`'in nesne/transport kısmı) üretir. Okunamayan bilgi onaysız geçmez: `CollectError` fırlatılır.

Motor dosyaları (`adt_mcp_server.py`, `sap_client.py`, `object_types.py`) vendored'dır, **değiştirilmez**; yalnızca import edilir. Yeni dosyaların `resources/sap-toolkit/CLAUDE.md` tablosuna kaydı Task 8'de.

CI'da Python yok; testler yerelde `py -3` ile koşar, çıkış kodu 0 = hepsi geçti (`test_readonly_surface.py` ile aynı stil).

**Files:**
- Create: `resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/gated_quality.py`
- Create: `resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/gated_collect.py`
- Test: `resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_quality.py`
- Test: `resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_collect.py`

**Interfaces:**
- Consumes (motor, salt import): `object_types.get_adt_type`, `get_source_url`, `normalize_object_type`; `SAPClient.run_sql_query(q, max_rows)` → `{'data': [[...]], ...}`, `SAPClient._find_existing_transport(name, normalized_type, requested)`, `SAPClient.get_transport_info(tr)` → `{number, owner, status, description} | None`, `SAPClient.session_transport`, `SAPClient.adt_client.get_object_source(url, version="active")`.
- Produces (Task 4 ve Task 7 kullanır):
  - `gated_quality`: `REVIEW_DIR = ".sap-review"`, `MAX_DIFF_LINES = 400`, `MAX_DIFF_CHARS = 60_000`, `ZIP_SOURCE_EXT`, `SEVERITIES = ("kritik","yuksek","orta","dusuk")`, `src_hash(data: bytes) -> str`, `file_hash(path) -> str`, `review_path(project_dir, tip, ad) -> Path`, `read_review(...) -> dict | None`, `quality_counts(bulgular) -> dict | None`, `check(project_dir, tip, ad, hashes) -> tuple[str | None, dict | None]` (ret sebepleri: `inceleme_yok`, `inceleme_eski`, `kritik_bulgu`), `write_review(project_dir, ad, tip, kaynak_dosyalari, bulgular, rapor="", skill="abap-code-review", now=None) -> dict` (`ValueError` fırlatır), `zip_objects(zip_path) -> tuple[list[dict], str]`, `diff(old, new) -> tuple[str, bool]`.
  - `gated_collect`: `CollectError(reason, message)` (sebepler: `gecersiz_ad`, `bilgi_toplanamadi`, `transport_belirsiz`, `kaynak_dosyasi_gerekli`, `kaynak_dosyasi_yok`), `MSG_TRANSPORT_BELIRSIZ`, `SOURCE_CREATES`, `PLAIN_CREATES`, `r3tr(object_type) -> str`, `collect(sap, arac, args, project_dir) -> dict`, `collect_teslim(sap, project_dir, nesneler, paket, transport, yontem, zip_dosyasi="") -> dict`, `collect_abapgit(sap, project_dir, script, paket="", transport="", zip_dosyasi="") -> dict`.
  - `collect*` dönüşü: `{"nesneler": [FactObject], "transport": str, "transport_bilgi": {aciklama,sahip,durum} | None, "enjekte_transport": str, "kalite": bool}`; `paket` yalnızca teslim/abapGit/`adt_create_transport`'ta; `collect_teslim` ek olarak `teslim: {yontem, zip_sha256?}`, `collect_abapgit` ek olarak `abapgit: {script, paket?, zip_sha256?}`. `FactObject` alanları Task 1'deki `FactObject` ile birebir: `ad, tip (R3TR), paket, yeni, kaynak_sha256?, fark?, fark_kirpildi?` (`kalite`yı Task 4 ekler).
  - `enjekte_transport` boş değilse Task 4 onaydan sonra `args["transport"]`'a yazar (argüman boşsa); pencerede görünen transport ile motorun yazdığı aynı olur.

- [ ] **Step 1: Kalite kapısı için başarısız testi yaz**

`resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_quality.py`:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — gated_quality.py testleri. SAP yok, ağ yok.

    py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_quality.py

Her test yakaladığı hatayı söyler. Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import json
import sys
import tempfile
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import gated_quality as gq  # noqa: E402

RESULTS = []


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — çökme de başarısızlık
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


def tmpdir() -> Path:
    return Path(tempfile.mkdtemp(prefix="gq-"))


def put_review(pd: Path, tip, ad, hashes, **bulgular):
    b = {"kritik": 0, "yuksek": 0, "orta": 0, "dusuk": 0, **bulgular}
    p = gq.review_path(pd, tip, ad)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"nesne": ad, "tip": tip, "kaynak_sha256": hashes, "bulgular": b}), encoding="utf-8")


def t_src_hash_crlf():
    assert gq.src_hash(b"a\r\nb\r\n") == gq.src_hash(b"a\nb\n")
    assert gq.src_hash(b"a\nb") != gq.src_hash(b"a\nc")


def t_review_path():
    pd = Path("/p")
    assert gq.review_path(pd, "clas", "zcl_a").name == "CLAS_ZCL_A.json"
    assert gq.review_path(pd, "CLAS", "/ABC/CL_X").name == "CLAS_#ABC#CL_X.json"
    assert gq.review_path(pd, "CLAS", "/ABC/CL_X").parent.name == ".sap-review"


def t_check_no_hashes_no_gate():
    assert gq.check(tmpdir(), "DOMA", "ZD", []) == (None, None)


def t_check_missing():
    assert gq.check(tmpdir(), "CLAS", "ZCL_A", ["1" * 64]) == ("inceleme_yok", None)


def t_check_corrupt():
    pd = tmpdir()
    p = gq.review_path(pd, "CLAS", "ZCL_A")
    p.parent.mkdir(parents=True)
    p.write_text("{bozuk", encoding="utf-8")
    assert gq.check(pd, "CLAS", "ZCL_A", ["1" * 64])[0] == "inceleme_yok"
    put_review(pd, "CLAS", "ZCL_A", ["1" * 64], kritik=True)
    assert gq.check(pd, "CLAS", "ZCL_A", ["1" * 64])[0] == "inceleme_yok", "bool sayı kabul edildi"
    put_review(pd, "CLAS", "ZCL_A", "1" * 64)
    assert gq.check(pd, "CLAS", "ZCL_A", ["1" * 64])[0] == "inceleme_yok", "liste olmayan hash kabul edildi"


def t_check_stale():
    pd = tmpdir()
    put_review(pd, "CLAS", "ZCL_A", ["1" * 64], yuksek=2)
    reason, kalite = gq.check(pd, "CLAS", "ZCL_A", ["2" * 64])
    assert reason == "inceleme_eski" and kalite["yuksek"] == 2


def t_check_subset_ok():
    pd = tmpdir()
    put_review(pd, "CLAS", "ZCL_A", ["1" * 64, "2" * 64], orta=3)
    assert gq.check(pd, "CLAS", "ZCL_A", ["2" * 64]) == (None, {"kritik": 0, "yuksek": 0, "orta": 3, "dusuk": 0})
    assert gq.check(pd, "CLAS", "ZCL_A", ["2" * 64, "3" * 64])[0] == "inceleme_eski"


def t_check_kritik():
    pd = tmpdir()
    put_review(pd, "CLAS", "ZCL_A", ["1" * 64], kritik=1)
    assert gq.check(pd, "CLAS", "ZCL_A", ["1" * 64])[0] == "kritik_bulgu"


def t_write_review():
    pd = tmpdir()
    (pd / "src").mkdir()
    (pd / "src" / "zcl_a.clas.abap").write_bytes(b"CLASS zcl_a.\r\nENDCLASS.\r\n")
    rec = gq.write_review(pd, "zcl_a", "clas", ["src/zcl_a.clas.abap"], {"kritik": 0, "yuksek": 1})
    assert rec["kaynak_sha256"] == [gq.src_hash(b"CLASS zcl_a.\nENDCLASS.\n")]
    assert rec["nesne"] == "ZCL_A" and rec["tip"] == "CLAS"
    assert rec["bulgular"] == {"kritik": 0, "yuksek": 1, "orta": 0, "dusuk": 0}
    assert gq.check(pd, "CLAS", "ZCL_A", rec["kaynak_sha256"]) == (None, rec["bulgular"])
    assert not list((pd / ".sap-review").glob("*.tmp")), "geçici dosya kaldı"


def t_write_review_refuses():
    pd = tmpdir()
    for files, bulgular in ((["yok.abap"], {"kritik": 0}), ([], {"kritik": 0}),
                            (["x"], {"kritik": -1}), (["x"], {"kritik": "0"})):
        try:
            gq.write_review(pd, "ZCL_A", "CLAS", files, bulgular)
        except ValueError:
            continue
        raise AssertionError(f"kabul edildi: {files} {bulgular}")
    assert not (pd / ".sap-review").exists()


def _zip(path: Path, entries):
    with zipfile.ZipFile(path, "w") as z:
        for name, data in entries:
            z.writestr(name, data)


def t_zip_objects():
    d = tmpdir()
    entries = [
        ("src/zcl_a.clas.abap", b"CLASS zcl_a.\r\n"),
        ("src/zcl_a.clas.locals_imp.abap", b"* yerel\n"),
        ("src/zcl_a.clas.xml", b"<xml/>"),
        ("src/#abc#cl_x.clas.abap", b"CLASS /abc/cl_x.\n"),
        ("src/zi_v.ddls.asddls", b"define view entity ZI_V"),
        ("src/package.devc.xml", b"<devc/>"),
    ]
    _zip(d / "a.zip", entries)
    objs, h1 = gq.zip_objects(d / "a.zip")
    keys = [(o["tip"], o["ad"], len(o["kaynak_sha256"])) for o in objs]
    assert keys == [("CLAS", "/ABC/CL_X", 1), ("CLAS", "ZCL_A", 2), ("DDLS", "ZI_V", 1)], keys
    assert gq.src_hash(b"CLASS zcl_a.\n") in objs[1]["kaynak_sha256"]
    # Sıra ve satır sonu ZIP hash'ini değiştirmez; XML içeriği değiştirir.
    _zip(d / "b.zip", [(n, b.replace(b"\r\n", b"\n")) for n, b in reversed(entries)])
    assert gq.zip_objects(d / "b.zip")[1] == h1
    _zip(d / "c.zip", [(n, b"<xml2/>" if n.endswith("clas.xml") else b) for n, b in entries])
    assert gq.zip_objects(d / "c.zip")[1] != h1


def t_diff():
    assert gq.diff(None, "x") == ("", False)
    text, cut = gq.diff("a\r\nb\r\n", "a\nc\n")
    assert "-b" in text and "+c" in text and not cut
    assert gq.diff("a\n", "a\n") == ("", False)
    text, cut = gq.diff("", "\n".join(f"s{i}" for i in range(1000)))
    assert cut and len(text.splitlines()) == gq.MAX_DIFF_LINES
    text, cut = gq.diff("", "x" * 100_000)
    assert cut and len(text) == gq.MAX_DIFF_CHARS


TESTS = [
    ("src_hash_crlf", "abapGit ZIP'i ile yerel dosya satır sonu yüzünden farklı hash alıyor", t_src_hash_crlf),
    ("review_path", "namespace'li nesnenin inceleme dosyası alt klasöre düşüyor", t_review_path),
    ("check_no_hashes", "kaynaksız yazma (domain) inceleme istiyor", t_check_no_hashes_no_gate),
    ("check_missing", "incelenmemiş kaynak geçiyor", t_check_missing),
    ("check_corrupt", "bozuk/uydurma kayıt geçiyor", t_check_corrupt),
    ("check_stale", "inceleme sonrası değişen kaynak geçiyor", t_check_stale),
    ("check_subset", "include'lu sınıfın tek include'u reddediliyor ya da yeni include geçiyor", t_check_subset_ok),
    ("check_kritik", "kritik bulgulu kaynak geçiyor", t_check_kritik),
    ("write_review", "kayıt hash'i dosyadan değil beyandan geliyor", t_write_review),
    ("write_review_refuses", "eksik dosya/geçersiz sayı ile kayıt yazılıyor", t_write_review_refuses),
    ("zip_objects", "ZIP nesnelere yanlış bölünüyor ya da ZIP hash'i kararsız", t_zip_objects),
    ("diff", "fark kırpılmıyor ya da satır sonu farkı fark sayılıyor", t_diff),
]


def main():
    for name, catches, fn in TESTS:
        check(name, catches, fn)
    for status, name, catches, detail in RESULTS:
        print(f"{status}  {name}  — {catches}")
        if detail:
            print(f"      {detail}")
    failed = sum(1 for r in RESULTS if r[0] == "FAIL")
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_quality.py`
Expected: `ModuleNotFoundError: No module named 'gated_quality'`

- [ ] **Step 3: `gated_quality.py`'yi yaz**

`resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/gated_quality.py`:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — SAP DEV yazma onayı: kalite kapısı yardımcıları. SAP'a dokunmaz.

adt_gated_server.py kullanır. Burada dört iş var:

- kaynak hash'i (CRLF→LF normalize; abapGit ZIP'i ile yerel dosyanın satır sonu
  farkı aynı kaynağı iki farklı hash'e çevirmesin),
- `.sap-review/<TIP>_<NESNE>.json` inceleme kayıtlarını okuma/yazma ve kontrol,
- abapGit ZIP'ini nesnelere bölme ve ZIP'in içerik hash'i,
- onay penceresinde gösterilen birleşik fark.
"""
from __future__ import annotations

import difflib
import hashlib
import json
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path

REVIEW_DIR = ".sap-review"
MAX_DIFF_LINES = 400
MAX_DIFF_CHARS = 60_000
# abapGit'in kaynak taşıyan dosya uzantıları. XML'ler nesne sayılmaz ama ZIP hash'ine girer.
ZIP_SOURCE_EXT = (".abap", ".asddls", ".asbdef", ".asdcls", ".asddlxs")
SEVERITIES = ("kritik", "yuksek", "orta", "dusuk")


def src_hash(data: bytes) -> str:
    return hashlib.sha256(data.replace(b"\r\n", b"\n")).hexdigest()


def file_hash(path) -> str:
    return src_hash(Path(path).read_bytes())


def review_path(project_dir, tip: str, ad: str) -> Path:
    # Namespace'in '/'si dosya adında dizin ayırıcı olurdu; abapGit de '#' kullanıyor.
    return Path(project_dir) / REVIEW_DIR / f"{tip.upper()}_{ad.upper().replace('/', '#')}.json"


def read_review(project_dir, tip: str, ad: str) -> dict | None:
    try:
        data = json.loads(review_path(project_dir, tip, ad).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def quality_counts(bulgular) -> dict | None:
    """Bulgu sayıları; şekli tutmuyorsa None (bozuk kayıt, onaysız geçmez)."""
    if not isinstance(bulgular, dict):
        return None
    out = {}
    for k in SEVERITIES:
        v = bulgular.get(k, 0)
        if isinstance(v, bool) or not isinstance(v, int) or v < 0:
            return None
        out[k] = v
    return out


def check(project_dir, tip: str, ad: str, hashes) -> tuple[str | None, dict | None]:
    """(ret_sebebi, kalite). Gönderilen hash'ler incelenenlerin alt kümesi olmalı."""
    if not hashes:
        return None, None
    rec = read_review(project_dir, tip, ad)
    if rec is None:
        return "inceleme_yok", None
    kalite = quality_counts(rec.get("bulgular"))
    reviewed = rec.get("kaynak_sha256")
    if kalite is None or not isinstance(reviewed, list):
        return "inceleme_yok", None
    if not set(hashes) <= set(reviewed):
        return "inceleme_eski", kalite
    if kalite["kritik"] > 0:
        return "kritik_bulgu", kalite
    return None, kalite


def write_review(project_dir, ad: str, tip: str, kaynak_dosyalari, bulgular,
                 rapor: str = "", skill: str = "abap-code-review", now: datetime | None = None) -> dict:
    """İnceleme kaydını yazar; hash'leri dosyalardan BURADA hesaplar (ajan hash yazmaz)."""
    kalite = quality_counts(bulgular)
    if kalite is None:
        raise ValueError("bulgular: kritik/yuksek/orta/dusuk negatif olmayan tam sayı olmalı")
    if not isinstance(kaynak_dosyalari, list) or not kaynak_dosyalari:
        raise ValueError("kaynak_dosyalari boş olamaz")
    base = Path(project_dir)
    hashes = set()
    for f in kaynak_dosyalari:
        p = Path(f) if Path(f).is_absolute() else base / f
        if not p.is_file():
            raise ValueError(f"kaynak dosyası yok: {f}")
        hashes.add(file_hash(p))
    rec = {
        "nesne": ad.upper(),
        "tip": tip.upper(),
        "kaynak_sha256": sorted(hashes),
        "kaynak_dosyalari": [str(f) for f in kaynak_dosyalari],
        "skill": skill,
        "tarih": (now or datetime.now(timezone.utc)).isoformat(),
        "bulgular": kalite,
        "rapor": rapor,
    }
    path = review_path(project_dir, tip, ad)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)
    return rec


def zip_objects(zip_path) -> tuple[list[dict], str]:
    """abapGit ZIP'i → ([{ad, tip, kaynak_sha256}], zip_sha256).

    Nesne anahtarı dosya adından: `zcl_a.clas.locals_imp.abap` → (CLAS, ZCL_A),
    `#abc#cl_x.clas.abap` → (CLAS, /ABC/CL_X). ZIP hash'i TÜM girdilerin
    (ad, normalize hash) sıralı listesinden: girdi sırası ve satır sonu değişmez,
    XML dahil herhangi bir içerik değişirse değişir.
    """
    groups: dict[tuple[str, str], set[str]] = {}
    entries = []
    with zipfile.ZipFile(zip_path) as z:
        for info in z.infolist():
            if info.is_dir():
                continue
            h = src_hash(z.read(info))
            entries.append((info.filename, h))
            base = info.filename.rsplit("/", 1)[-1]
            if not base.lower().endswith(ZIP_SOURCE_EXT):
                continue
            parts = base.split(".")
            if len(parts) < 3:
                continue
            key = (parts[1].upper(), parts[0].upper().replace("#", "/"))
            groups.setdefault(key, set()).add(h)
    digest = hashlib.sha256()
    for name, h in sorted(entries):
        digest.update(f"{name}\0{h}\n".encode("utf-8"))
    objs = [{"ad": ad, "tip": tip, "kaynak_sha256": sorted(hs)} for (tip, ad), hs in sorted(groups.items())]
    return objs, digest.hexdigest()


def diff(old: str | None, new: str) -> tuple[str, bool]:
    """SAP'taki aktif sürüm ↔ gönderilecek. (metin, kırpıldı_mı). old None → yeni nesne."""
    if old is None:
        return "", False
    a = old.replace("\r\n", "\n").splitlines()
    b = new.replace("\r\n", "\n").splitlines()
    lines = list(difflib.unified_diff(a, b, "SAP (aktif)", "gönderilecek", lineterm="", n=3))
    kirpildi = False
    if len(lines) > MAX_DIFF_LINES:
        lines = lines[:MAX_DIFF_LINES]
        kirpildi = True
    text = "\n".join(lines)
    if len(text) > MAX_DIFF_CHARS:
        text = text[:MAX_DIFF_CHARS]
        kirpildi = True
    return text, kirpildi
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_quality.py`
Expected: son satır `12/12 geçti`, çıkış kodu 0.

- [ ] **Step 5: Bilgi toplama için başarısız testi yaz**

Sahte SAP istemcisi (`FakeSap`) motorun kullanılan yüzünü taklit eder ve her SQL'i kaydeder; böylece "süzülmemiş ad SQL'e girmiyor" ölçülebiliyor. `FakeSap.get_object_source` kaynağı URL'nin sondan üçüncü parçasıyla (nesne adı, küçük harf) bulur: `/sap/bc/adt/oo/classes/zcl_a/source/main` → `zcl_a`.

`resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_collect.py`:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — gated_collect.py testleri. Sahte SAP istemcisiyle; SAP yok, ağ yok.

    py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_collect.py

Her test yakaladığı hatayı söyler. Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import re
import sys
import tempfile
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import gated_collect as gc  # noqa: E402
import gated_quality as gq  # noqa: E402

RESULTS = []
TR = "DS4K900001"
TR2 = "DS4K900002"


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — çökme de başarısızlık
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


class FakeSap:
    """SAPClient'ın gated_collect'in kullandığı yüzü. Okumaları kaydeder."""

    def __init__(self, tadir=None, tfdir=None, owners=None, sources=None, session_transport=None,
                 fail_sql=False):
        self.tadir = tadir or {}          # (R3TR, AD) → paket
        self.tfdir = tfdir or {}          # FM → PNAME
        self.owners = owners or {}        # AD → transport
        self.sources = sources or {}      # URL'deki küçük harfli ad → aktif kaynak
        self.session_transport = session_transport
        self.fail_sql = fail_sql
        self.queries, self.source_urls = [], []
        self.adt_client = self

    def run_sql_query(self, query, max_rows=100):
        self.queries.append(query)
        if self.fail_sql:
            raise RuntimeError("HTTP 500")
        m = re.search(r"FROM tadir WHERE pgmid = 'R3TR' AND object = '([^']*)' AND obj_name = '([^']*)'", query)
        if m:
            v = self.tadir.get((m.group(1), m.group(2)))
        else:
            m = re.search(r"FROM tfdir WHERE funcname = '([^']*)'", query)
            v = self.tfdir.get(m.group(1)) if m else None
        return {"columns": ["X"], "data": [[v]] if v else [], "total_rows": 1 if v else 0}

    def _find_existing_transport(self, name, otype, requested):
        return self.owners.get(name, requested)

    def get_transport_info(self, tr):
        return {"number": tr, "owner": "DEV1", "status": "D", "description": f"Açıklama {tr}"}

    def get_object_source(self, url, return_etag=False, version=None):
        self.source_urls.append((url, version))
        key = url.split("/")[-3]
        if key not in self.sources:
            raise RuntimeError("404")
        return self.sources[key]


def project(files=None) -> Path:
    pd = Path(tempfile.mkdtemp(prefix="gc-"))
    for name, data in (files or {}).items():
        (pd / name).parent.mkdir(parents=True, exist_ok=True)
        (pd / name).write_bytes(data)
    return pd


def refused(reason, fn):
    try:
        fn()
    except gc.CollectError as exc:
        assert exc.reason == reason, f"{exc.reason} != {reason}: {exc.message}"
        return exc
    raise AssertionError(f"{reason} bekleniyordu, geçti")


def push_args(**over):
    return {"name": "ZCL_A", "object_type": "class", "source_file": "zcl_a.clas.abap",
            "transport": "", "ack_drop": "", **over}


NEW_SRC = b"CLASS zcl_a.\r\n  yeni.\r\nENDCLASS.\r\n"


def t_push_existing():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, owners={"ZCL_A": TR},
                  sources={"zcl_a": "CLASS zcl_a.\n  eski.\nENDCLASS.\n"})
    pd = project({"zcl_a.clas.abap": NEW_SRC})
    r = gc.collect(sap, "adt_push", push_args(), pd)
    o = r["nesneler"][0]
    assert (o["ad"], o["tip"], o["paket"], o["yeni"]) == ("ZCL_A", "CLAS", "ZPKG", False), o
    assert o["kaynak_sha256"] == [gq.src_hash(NEW_SRC)]
    assert "-  eski." in o["fark"] and "+  yeni." in o["fark"] and o["fark_kirpildi"] is False
    assert r["transport"] == TR and r["enjekte_transport"] == TR and r["kalite"] is True
    assert r["transport_bilgi"] == {"aciklama": f"Açıklama {TR}", "sahip": "DEV1", "durum": "D"}
    assert sap.source_urls == [("/sap/bc/adt/oo/classes/zcl_a/source/main", "active")]
    assert "paket" not in r


def t_push_arg_wins():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, owners={"ZCL_A": TR}, sources={"zcl_a": ""})
    r = gc.collect(sap, "adt_push", push_args(transport=TR2.lower()), project({"zcl_a.clas.abap": NEW_SRC}))
    assert r["transport"] == TR2 and r["enjekte_transport"] == ""


def t_push_session_fallback():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, sources={"zcl_a": ""}, session_transport=TR2)
    r = gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC}))
    assert r["transport"] == TR2 and r["enjekte_transport"] == TR2


def t_push_transport_belirsiz():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, sources={"zcl_a": ""})
    refused("transport_belirsiz", lambda: gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC})))


def t_push_local_package():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "$TMP"}, sources={"zcl_a": ""})
    r = gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC}))
    assert r["transport"] == "" and r["transport_bilgi"] is None and r["enjekte_transport"] == ""


def t_push_new_object():
    sap = FakeSap(session_transport=TR)
    r = gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC}))
    o = r["nesneler"][0]
    assert o["yeni"] is True and o["paket"] == "" and "fark" not in o
    assert sap.source_urls == [], "yeni nesnede kaynak okundu"


def t_push_unreadable_source():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, owners={"ZCL_A": TR})
    r = gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC}))
    assert "okunamadı" in r["nesneler"][0]["fark"]


def t_sql_failure_refuses():
    sap = FakeSap(fail_sql=True, session_transport=TR)
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_push", push_args(), project({"zcl_a.clas.abap": NEW_SRC})))


def t_injection_refused():
    sap = FakeSap(session_transport=TR)
    pd = project({"zcl_a.clas.abap": NEW_SRC})
    refused("gecersiz_ad", lambda: gc.collect(sap, "adt_push", push_args(name="ZCL_A' OR '1'='1"), pd))
    refused("gecersiz_ad", lambda: gc.collect(sap, "adt_push", push_args(transport="X' OR 1=1"), pd))
    assert sap.queries == [], f"süzülmemiş ad SQL'e gitti: {sap.queries}"


def t_bad_type_and_file():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, session_transport=TR)
    pd = project()
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_push", push_args(object_type="muz"), pd))
    refused("kaynak_dosyasi_yok", lambda: gc.collect(sap, "adt_push", push_args(), pd))
    refused("kaynak_dosyasi_gerekli", lambda: gc.collect(sap, "adt_push", push_args(source_file=""), pd))
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_push", push_args(object_type="function"), pd))


def fm_args(**over):
    return {"name": "Z_FM", "function_group": "ZFG", "source_file": "z_fm.abap", "description": "", "transport": TR, **over}


def t_write_fm():
    sap = FakeSap(tadir={("FUGR", "ZFG"): "ZPKG"}, tfdir={"Z_FM": "SAPLZFG"}, sources={"z_fm": "FUNCTION z_fm.\n"})
    r = gc.collect(sap, "adt_write_function_module", fm_args(), project({"z_fm.abap": b"FUNCTION z_fm.\n* x\n"}))
    o = r["nesneler"][0]
    assert (o["ad"], o["tip"], o["paket"], o["yeni"]) == ("Z_FM", "FUNC", "ZPKG", False), o
    assert sap.source_urls[0][0].endswith("/groups/zfg/fmodules/z_fm/source/main"), sap.source_urls
    assert r["transport"] == TR and r["kalite"] is True


def t_write_fm_rules():
    pd = project({"z_fm.abap": b"x"})
    sap = FakeSap(tadir={("FUGR", "ZFG"): "ZPKG"}, tfdir={"Z_FM": "SAPLZOTHER"})
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_write_function_module", fm_args(), pd))
    refused("bilgi_toplanamadi", lambda: gc.collect(FakeSap(), "adt_write_function_module", fm_args(), pd))
    sap = FakeSap(tadir={("FUGR", "ZFG"): "ZPKG"}, session_transport=TR2)
    refused("transport_belirsiz", lambda: gc.collect(sap, "adt_write_function_module", fm_args(transport=""), pd))
    sap = FakeSap(tadir={("FUGR", "/ABC/ZFG"): "ZPKG"}, tfdir={"/ABC/Z_FM": "/ABC/SAPLZFG"})
    r = gc.collect(sap, "adt_write_function_module", fm_args(name="/abc/z_fm", function_group="/ABC/ZFG"), pd)
    assert r["nesneler"][0]["paket"] == "ZPKG" and r["nesneler"][0]["yeni"] is False


def t_creates():
    pd = project({"zi_v.ddls.asddls": b"define view entity ZI_V"})
    sap = FakeSap(session_transport=TR)
    r = gc.collect(sap, "adt_create_domain", {"name": "zd_x", "package": "zpkg", "description": "d", "transport": ""}, pd)
    assert r["nesneler"] == [{"ad": "ZD_X", "tip": "DOMA", "paket": "ZPKG", "yeni": True}] and r["kalite"] is False
    assert r["enjekte_transport"] == TR
    r = gc.collect(sap, "adt_create_cds_view", {"name": "ZI_V", "package": "ZPKG", "description": "d", "source": "",
                                               "source_file": "zi_v.ddls.asddls", "transport": TR2}, pd)
    o = r["nesneler"][0]
    assert o["tip"] == "DDLS" and o["yeni"] and o["kaynak_sha256"] and r["kalite"] and r["transport"] == TR2
    r = gc.collect(sap, "adt_create_ddic_shell", {"name": "ZT", "object_type": "structure", "package": "ZPKG",
                                                 "description": "d", "transport": ""}, pd)
    assert r["nesneler"][0]["tip"] == "TABL"
    refused("transport_belirsiz", lambda: gc.collect(FakeSap(), "adt_create", {
        "object_type": "class", "name": "ZCL_B", "package": "ZPKG", "description": "d", "transport": ""}, pd))
    refused("kaynak_dosyasi_gerekli", lambda: gc.collect(sap, "adt_create_type_group", {
        "name": "ZTG", "package": "ZPKG", "description": "d", "types_and_constants": "", "source_file": "",
        "transport": TR}, pd))


def t_create_existing_uses_sap_package():
    sap = FakeSap(tadir={("DOMA", "ZD_X"): "ZREAL"}, session_transport=TR)
    r = gc.collect(sap, "adt_create_domain", {"name": "ZD_X", "package": "ZWRONG", "description": "d", "transport": ""},
                   project())
    assert r["nesneler"][0]["paket"] == "ZREAL" and r["nesneler"][0]["yeni"] is False


def t_activate():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG", ("DDLS", "ZI_V"): "ZPKG"}, owners={"ZCL_A": TR})
    r = gc.collect(sap, "adt_activate", {"name": "", "object_type": "class", "objects": [
        {"name": "ZI_V", "object_type": "cds"}, {"name": "ZCL_A"}]}, project())
    assert [(o["tip"], o["ad"]) for o in r["nesneler"]] == [("DDLS", "ZI_V"), ("CLAS", "ZCL_A")]
    assert r["transport"] == TR and r["kalite"] is False
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_activate", {"name": "", "object_type": "class",
                                                                          "objects": None}, project()))


def t_objectless_tools():
    sap = FakeSap()
    r = gc.collect(sap, "adt_set_transport", {"transport": TR}, project())
    assert r["nesneler"] == [] and r["transport"] == TR and "paket" not in r
    r = gc.collect(sap, "adt_create_transport", {"description": "x", "package": "zpkg"}, project())
    assert r["nesneler"] == [] and r["paket"] == "ZPKG" and r["transport"] == ""
    r = gc.collect(sap, "adt_delete_transport", {"transport": TR, "confirm_transport": TR, "force": True,
                                                 "recursive": False, "remove_locked_objects": False}, project())
    assert r["transport"] == TR
    r = gc.collect(sap, "adt_create_package", {"name": "ZNEW", "description": "d", "super_package": "ZPARENT",
                                               "transport": TR}, project())
    assert r["nesneler"] == [{"ad": "ZNEW", "tip": "DEVC", "paket": "ZPARENT", "yeni": True}]


def t_delete_object_injects_owner():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, owners={"ZCL_A": TR})
    r = gc.collect(sap, "adt_delete_object", {"name": "ZCL_A", "object_type": "class", "transport": "",
                                              "confirm_name": "ZCL_A", "force": True}, project())
    assert r["transport"] == TR and r["enjekte_transport"] == TR
    r = gc.collect(sap, "adt_clear_lock", {"name": "ZCL_A", "object_type": "class", "transport": "",
                                           "function_group": ""}, project())
    assert r["transport"] == TR and r["enjekte_transport"] == ""


def t_karma_tools():
    sap = FakeSap(tadir={("PROG", "ZREP"): "ZPKG", ("MSAG", "ZMSG"): "ZPKG"}, owners={"ZREP": TR, "ZMSG": TR})
    r = gc.collect(sap, "adt_generate_screen", {"program": "zrep", "transport": ""}, project())
    assert r["nesneler"][0]["tip"] == "PROG" and r["enjekte_transport"] == TR
    refused("bilgi_toplanamadi", lambda: gc.collect(sap, "adt_generate_screen", {"program": "ZNONE", "transport": ""},
                                                    project()))
    r = gc.collect(sap, "adt_generate_adobe", {"interface": "ZIF_F", "form": "ZF_F", "devclass": "$TMP",
                                               "transport": ""}, project())
    assert [(o["tip"], o["paket"], o["yeni"]) for o in r["nesneler"]] == [("SFPI", "$TMP", True), ("SFPF", "$TMP", True)]
    refused("transport_belirsiz", lambda: gc.collect(sap, "adt_generate_adobe", {
        "interface": "ZIF_F", "devclass": "ZPKG", "transport": ""}, project()))
    r = gc.collect(sap, "adt_message_class", {"name": "ZMSG", "action": "write", "package": "", "transport": ""},
                   project())
    assert r["nesneler"][0]["paket"] == "ZPKG" and r["transport"] == TR


def t_teslim_adt():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"}, sources={"zcl_a": "eski\n"})
    pd = project({"zcl_a.clas.abap": NEW_SRC})
    r = gc.collect_teslim(sap, pd, [{"ad": "ZCL_A", "tip": "class", "kaynak_dosyasi": "zcl_a.clas.abap"},
                                    {"ad": "ZD_X", "tip": "DOMA"}], "zpkg", TR, "adt")
    a, b = r["nesneler"]
    assert a["paket"] == "ZPKG" and not a["yeni"] and a["kaynak_sha256"] == [gq.src_hash(NEW_SRC)] and "fark" in a
    assert b == {"ad": "ZD_X", "tip": "DOMA", "paket": "ZPKG", "yeni": True}
    assert r["teslim"] == {"yontem": "adt"} and r["paket"] == "ZPKG" and r["kalite"] is True
    refused("transport_belirsiz", lambda: gc.collect_teslim(sap, pd, [{"ad": "ZD_X", "tip": "DOMA"}], "ZPKG", "", "adt"))
    refused("bilgi_toplanamadi", lambda: gc.collect_teslim(sap, pd, [], "ZPKG", TR, "adt"))
    refused("bilgi_toplanamadi", lambda: gc.collect_teslim(sap, pd, [], "ZPKG", TR, "ftp"))


def _zip(pd: Path, name="dist/x.zip"):
    p = pd / name
    p.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(p, "w") as z:
        z.writestr("src/zcl_a.clas.abap", NEW_SRC)
        z.writestr("src/zcl_a.clas.xml", b"<x/>")
    return name


def t_teslim_and_abapgit_zip():
    sap = FakeSap(tadir={("CLAS", "ZCL_A"): "ZPKG"})
    pd = project()
    name = _zip(pd)
    r = gc.collect_teslim(sap, pd, None, "ZPKG", TR, "abapgit", name)
    assert [(o["tip"], o["ad"]) for o in r["nesneler"]] == [("CLAS", "ZCL_A")]
    zsha = r["teslim"]["zip_sha256"]
    assert re.fullmatch(r"[0-9a-f]{64}", zsha)
    g = gc.collect_abapgit(sap, pd, "abapgit_deploy.py", "zpkg", TR, name)
    assert g["abapgit"] == {"script": "abapgit_deploy.py", "paket": "ZPKG", "zip_sha256": zsha}, g["abapgit"]
    assert g["kalite"] is True and g["nesneler"][0]["kaynak_sha256"] == [gq.src_hash(NEW_SRC)]
    g = gc.collect_abapgit(sap, pd, "gui_stage_commit.py")
    assert g["abapgit"] == {"script": "gui_stage_commit.py"} and g["nesneler"] == [] and g["kalite"] is False
    refused("gecersiz_ad", lambda: gc.collect_abapgit(sap, pd, "x; rm -rf /"))
    refused("kaynak_dosyasi_yok", lambda: gc.collect_abapgit(sap, pd, "abapgit_deploy.py", "", "", "yok.zip"))


TESTS = [
    ("push_existing", "paket beyandan geliyor / fark yok / motorun çözeceği transport görünmüyor", t_push_existing),
    ("push_arg_wins", "ajanın verdiği transport sahip transport'la eziliyor", t_push_arg_wins),
    ("push_session", "oturuma sabitlenmiş transport pencerede görünmüyor", t_push_session_fallback),
    ("push_belirsiz", "transport'u belirsiz yazma pencereye transport'suz gidiyor", t_push_transport_belirsiz),
    ("push_local", "$TMP'de transport isteniyor", t_push_local_package),
    ("push_new", "yeni nesnede SAP'tan kaynak okunmaya çalışılıyor", t_push_new_object),
    ("push_unreadable", "aktif kaynak okunamayınca fark boş (değişiklik yok) görünüyor", t_push_unreadable_source),
    ("sql_failure", "TADIR okunamayınca onay bilgisiz gidiyor", t_sql_failure_refuses),
    ("injection", "süzülmemiş ad SQL'e giriyor", t_injection_refused),
    ("bad_type_file", "tanınmayan tip/eksik dosya/FM push'u geçiyor", t_bad_type_and_file),
    ("write_fm", "FM paketi grup üzerinden okunmuyor", t_write_fm),
    ("write_fm_rules", "yanlış grup/olmayan grup/transport'suz FM ya da namespace'li grup", t_write_fm_rules),
    ("creates", "oluşturma araçlarında tip/kalite/transport yanlış", t_creates),
    ("create_existing", "var olan nesnede paket argümandan alınıyor", t_create_existing_uses_sap_package),
    ("activate", "çoklu aktivasyonda nesneler ya da transport eksik", t_activate),
    ("objectless", "nesnesiz araçların bilgisi eksik", t_objectless_tools),
    ("delete_object", "silme sahip transport'a değil hayalet transport'a kaydediliyor", t_delete_object_injects_owner),
    ("karma", "ekran/adobe/mesaj sınıfı bilgisi yanlış", t_karma_tools),
    ("teslim_adt", "teslim listesi yanlış toplanıyor", t_teslim_adt),
    ("teslim_abapgit", "ZIP hash'i teslim ile abapGit onayında farklı", t_teslim_and_abapgit_zip),
]


def main():
    for name, catches, fn in TESTS:
        check(name, catches, fn)
    for status, name, catches, detail in RESULTS:
        print(f"{status}  {name}  — {catches}")
        if detail:
            print(f"      {detail}")
    failed = sum(1 for r in RESULTS if r[0] == "FAIL")
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 6: Testin başarısız olduğunu gör**

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_collect.py`
Expected: `ModuleNotFoundError: No module named 'gated_collect'`

- [ ] **Step 7: `gated_collect.py`'yi yaz**

Notlar (kodun kendisi aşağıda tam):
- SQL'e giren her ad `_NAME_RE` ile, transport `_TR_RE` ile süzülür; `collect` transport'u **SAP'a gitmeden** süzer.
- Paket her zaman TADIR'dan; argümandaki `package` yalnızca SAP'ta henüz olmayan nesnede kullanılır. FM'nin paketi TFDIR → grup → TADIR(FUGR).
- Transport sırası motorunkiyle aynı: argüman → nesnenin açık transport'u (`_find_existing_transport`) → oturum pini. Hiçbiri yoksa ve paket `$` ile başlamıyorsa `transport_belirsiz`.
- `adt_write_function_module` ve `adt_generate_adobe` motorda transport'u kendileri çözmez; bu yüzden orada yalnızca argüman kabul edilir.
- Aktif kaynak okunamazsa fark boş bırakılmaz, "(SAP'taki aktif sürüm okunamadı)" yazılır: boş fark "değişiklik yok" diye okunur.

`resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/gated_collect.py`:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — SAP DEV yazma onayı: bir yazma çağrısı için bilgi toplama.

adt_gated_server.py her onaylı yazmadan önce buradan geçer. Paket SAP'tan okunur
(TADIR), ajanın beyanından değil; transport motorun çözeceği sırayla çözülür
(argüman → nesnenin açık transport'u → oturuma sabitlenmiş transport) ve
çözülen değer motora argüman olarak geçirilir: pencerede görünen ile yazılan
aynı olsun.

Yalnızca okur: TADIR/TFDIR SELECT'leri, transport listesi, aktif kaynak.
Okunamayan bilgi onaysız geçmez: CollectError fırlatılır, çağrı reddedilir.
`sap` bir SAPClient (testlerde sahte); SQL'e giren her ad önce süzülür.
"""
from __future__ import annotations

import re
from pathlib import Path

import gated_quality as gq
from object_types import get_adt_type, get_source_url, normalize_object_type

_NAME_RE = re.compile(r"^[A-Z0-9_/$]{1,60}$")
_TR_RE = re.compile(r"^[A-Z0-9]{10}$")
_SCRIPT_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}$")
_FUGR_RE = re.compile(r"^(/[A-Z0-9_]+/)?SAPL(.+)$")

# Kaynak taşıyan oluşturma araçları → R3TR tipi. Kalite kapısı bunlarda çalışır.
SOURCE_CREATES = {
    "adt_create_cds_view": "DDLS",
    "adt_create_metadata_extension": "DDLX",
    "adt_create_access_control": "DCLS",
    "adt_create_behavior_definition": "BDEF",
    "adt_create_type_group": "TYPE",
}
PLAIN_CREATES = {
    "adt_create_domain": "DOMA",
    "adt_create_data_element": "DTEL",
    "adt_create_table_type": "TTYP",
    "adt_create_function_group": "FUGR",
    "adt_create_service_binding": "SRVB",
    "adt_create_lock_object": "ENQU",
}

MSG_TRANSPORT_BELIRSIZ = (
    "Hangi transport'a yazılacağı belli değil: nesnenin açık bir transport'u yok, oturuma "
    "sabitlenmiş transport yok ve paket yerel değil. Kullanıcıya transport'u sor "
    "(adt_list_transports), sonra transport argümanıyla tekrar çağır."
)


class CollectError(Exception):
    def __init__(self, reason: str, message: str):
        super().__init__(message)
        self.reason = reason
        self.message = message


def _name(value, field: str) -> str:
    v = str(value or "").strip().upper()
    if not _NAME_RE.match(v):
        raise CollectError("gecersiz_ad", f"{field} geçersiz: {value!r}")
    return v


def _tr(value) -> str:
    v = str(value or "").strip().upper()
    if v and not _TR_RE.match(v):
        raise CollectError("gecersiz_ad", f"transport geçersiz: {value!r}")
    return v


def _local(paket: str) -> bool:
    # '$' ile başlayan paketler yereldir ($TMP, $ZDENEME): transport kaydı yok.
    return paket.startswith("$")


def r3tr(object_type) -> str:
    try:
        return get_adt_type(object_type).split("/")[0].upper()
    except (KeyError, ValueError):
        raise CollectError("bilgi_toplanamadi", f"tanınmayan nesne tipi: {object_type!r}")


def _select_one(sap, query: str) -> str | None:
    try:
        res = sap.run_sql_query(query, max_rows=1)
    except Exception as exc:  # noqa: BLE001 — okunamayan bilgi = ret
        raise CollectError("bilgi_toplanamadi", f"SAP'tan okunamadı: {exc}")
    rows = (res or {}).get("data") or []
    if not rows or not rows[0]:
        return None
    return (rows[0][0] or "").strip() or None


def tadir_devclass(sap, tip: str, ad: str) -> str | None:
    return _select_one(
        sap, f"SELECT devclass FROM tadir WHERE pgmid = 'R3TR' AND object = '{tip}' AND obj_name = '{ad}'")


def fm_group(sap, fm: str) -> str | None:
    pname = _select_one(sap, f"SELECT pname FROM tfdir WHERE funcname = '{fm}'")
    m = _FUGR_RE.match((pname or "").upper())
    return (m.group(1) or "") + m.group(2) if m else None


def package_of(sap, tip: str, ad: str) -> str | None:
    if tip == "FUNC":
        fg = fm_group(sap, ad)
        return tadir_devclass(sap, "FUGR", fg) if fg else None
    return tadir_devclass(sap, tip, ad)


def owner_transport(sap, ad: str, object_type) -> str:
    try:
        return (sap._find_existing_transport(ad, normalize_object_type(object_type), "") or "").upper()
    except Exception:  # noqa: BLE001 — motor da sessizce boşa düşüyor
        return ""


def session_transport(sap) -> str:
    return (getattr(sap, "session_transport", None) or "").upper()


def transport_info(sap, tr: str) -> dict | None:
    if not tr:
        return None
    try:
        info = sap.get_transport_info(tr)
    except Exception:  # noqa: BLE001
        info = None
    if not info:
        return None
    return {"aciklama": str(info.get("description") or ""),
            "sahip": str(info.get("owner") or ""),
            "durum": str(info.get("status") or "")}


def active_source(sap, ad: str, object_type, fg: str | None = None) -> str | None:
    try:
        return sap.adt_client.get_object_source(get_source_url(ad, object_type, fg), version="active")
    except Exception:  # noqa: BLE001
        return None


def _read_source(project_dir, source_file) -> bytes:
    if not source_file:
        raise CollectError("kaynak_dosyasi_gerekli", "source_file gerekli.")
    p = Path(source_file)
    if not p.is_absolute():
        p = Path(project_dir) / p
    if not p.is_file():
        raise CollectError("kaynak_dosyasi_yok", f"kaynak dosyası bulunamadı: {source_file}")
    return p.read_bytes()


def source_object(sap, project_dir, source_file, ad, object_type, tip, paket, yeni, fg=None) -> dict:
    data = _read_source(project_dir, source_file)
    obj = {"ad": ad, "tip": tip, "paket": paket, "yeni": yeni, "kaynak_sha256": [gq.src_hash(data)]}
    if not yeni:
        old = active_source(sap, ad, object_type, fg)
        if old is None:
            obj["fark"], obj["fark_kirpildi"] = "(SAP'taki aktif sürüm okunamadı)", False
        else:
            obj["fark"], obj["fark_kirpildi"] = gq.diff(old, data.decode("utf-8", "replace"))
    return obj


def _resolve(sap, arg, owner: str, paket: str) -> tuple[str, str]:
    """(transport, motora_geçirilecek). Argüman varsa enjekte edilecek bir şey yok."""
    tr = _tr(arg)
    if tr:
        return tr, ""
    tr = owner or session_transport(sap)
    if not tr and not _local(paket):
        raise CollectError("transport_belirsiz", MSG_TRANSPORT_BELIRSIZ)
    return tr, tr


def _result(sap, nesneler, tr, *, paket=None, enjekte="", kalite=False) -> dict:
    out = {"nesneler": nesneler, "transport": tr, "transport_bilgi": transport_info(sap, tr),
           "enjekte_transport": enjekte, "kalite": kalite}
    if paket is not None:
        out["paket"] = paket
    return out


def _existing(sap, tip, ad, fallback_paket=""):
    paket = package_of(sap, tip, ad)
    return (paket or fallback_paket), paket is None


# --- araç başına toplayıcılar ------------------------------------------------
def _push(sap, pd, a):
    ad, ot = _name(a.get("name"), "name"), a.get("object_type")
    tip = r3tr(ot)
    if tip == "FUNC":
        raise CollectError("bilgi_toplanamadi",
                           "Fonksiyon modülü adt_push ile yazılmaz; adt_write_function_module kullan.")
    paket, yeni = _existing(sap, tip, ad)
    owner = "" if yeni else owner_transport(sap, ad, ot)
    tr, enj = _resolve(sap, a.get("transport"), owner, paket)
    obj = source_object(sap, pd, a.get("source_file"), ad, ot, tip, paket, yeni)
    return _result(sap, [obj], tr, enjekte=enj, kalite=True)


def _write_fm(sap, pd, a):
    ad, fg = _name(a.get("name"), "name"), _name(a.get("function_group"), "function_group")
    paket = tadir_devclass(sap, "FUGR", fg)
    if paket is None:
        raise CollectError("bilgi_toplanamadi", f"Fonksiyon grubu {fg} SAP'ta yok; önce adt_create_function_group.")
    mevcut = fm_group(sap, ad)
    if mevcut and mevcut != fg:
        raise CollectError("bilgi_toplanamadi", f"{ad} SAP'ta {mevcut} grubunda, {fg} değil.")
    tr = _tr(a.get("transport"))
    if not tr and not _local(paket):
        raise CollectError("transport_belirsiz", MSG_TRANSPORT_BELIRSIZ)
    obj = source_object(sap, pd, a.get("source_file"), ad, "function", "FUNC", paket, mevcut is None, fg=fg)
    return _result(sap, [obj], tr, kalite=True)


def _create(sap, pd, a, arac):
    ad, pk = _name(a.get("name"), "name"), _name(a.get("package"), "package")
    if arac in SOURCE_CREATES:
        tip = SOURCE_CREATES[arac]
    elif arac in PLAIN_CREATES:
        tip = PLAIN_CREATES[arac]
    else:  # adt_create, adt_create_ddic_shell
        tip = r3tr(a.get("object_type"))
    paket, yeni = _existing(sap, tip, ad, pk)
    tr, enj = _resolve(sap, a.get("transport"), "", paket)
    if arac in SOURCE_CREATES:
        obj = source_object(sap, pd, a.get("source_file"), ad, tip, tip, paket, yeni)
        return _result(sap, [obj], tr, enjekte=enj, kalite=True)
    return _result(sap, [{"ad": ad, "tip": tip, "paket": paket, "yeni": yeni}], tr, enjekte=enj)


def _activate(sap, pd, a):
    items = a.get("objects") or ([{"name": a.get("name"), "object_type": a.get("object_type")}]
                                 if a.get("name") else [])
    if not items or not isinstance(items, list):
        raise CollectError("bilgi_toplanamadi", "name ya da objects gerekli.")
    nesneler, tr = [], ""
    for it in items:
        if not isinstance(it, dict):
            raise CollectError("bilgi_toplanamadi", "objects öğeleri {name, object_type} olmalı.")
        ad, ot = _name(it.get("name"), "name"), it.get("object_type") or "class"
        tip = r3tr(ot)
        paket, yeni = _existing(sap, tip, ad)
        nesneler.append({"ad": ad, "tip": tip, "paket": paket, "yeni": yeni})
        if not tr and not yeni:
            tr = owner_transport(sap, ad, ot)
    return _result(sap, nesneler, tr or session_transport(sap))


def _object_tool(sap, pd, a, *, inject: bool):
    """Tek nesneli HER_SEFER araçları: silme, transport'tan çıkarma, kilit temizleme."""
    ad, ot = _name(a.get("name"), "name"), a.get("object_type") or "class"
    tip = r3tr(ot)
    paket, yeni = _existing(sap, tip, ad)
    tr = _tr(a.get("transport"))
    enj = ""
    if not tr and not yeni:
        tr = owner_transport(sap, ad, ot) or (session_transport(sap) if inject else "")
        enj = tr if inject else ""
    return _result(sap, [{"ad": ad, "tip": tip, "paket": paket, "yeni": yeni}], tr, enjekte=enj)


def _srvb(sap, pd, a):
    ad = _name(a.get("name"), "name")
    paket, yeni = _existing(sap, "SRVB", ad)
    tr = ("" if yeni else owner_transport(sap, ad, "SRVB")) or session_transport(sap)
    return _result(sap, [{"ad": ad, "tip": "SRVB", "paket": paket, "yeni": yeni}], tr)


def _screen(sap, pd, a):
    ad = _name(a.get("program"), "program")
    paket, yeni = _existing(sap, "PROG", ad)
    if yeni:
        raise CollectError("bilgi_toplanamadi", f"{ad} programı SAP'ta yok; ekran var olan programa üretilir.")
    tr, enj = _resolve(sap, a.get("transport"), owner_transport(sap, ad, "program"), paket)
    return _result(sap, [{"ad": ad, "tip": "PROG", "paket": paket, "yeni": yeni}], tr, enjekte=enj)


def _adobe(sap, pd, a):
    pk = _name(a.get("devclass") or "$TMP", "devclass")
    nesneler = []
    for field, tip in (("interface", "SFPI"), ("form", "SFPF")):
        if a.get(field):
            ad = _name(a.get(field), field)
            paket, yeni = _existing(sap, tip, ad, pk)
            nesneler.append({"ad": ad, "tip": tip, "paket": paket, "yeni": yeni})
    if not nesneler:
        raise CollectError("bilgi_toplanamadi", "interface ya da form gerekli.")
    tr = _tr(a.get("transport"))
    if not tr and not _local(pk):
        raise CollectError("transport_belirsiz", MSG_TRANSPORT_BELIRSIZ)
    return _result(sap, nesneler, tr)


def _msag(sap, pd, a):
    ad = _name(a.get("name"), "name")
    pk = _name(a.get("package"), "package") if a.get("package") else ""
    paket, yeni = _existing(sap, "MSAG", ad, pk)
    owner = "" if yeni else owner_transport(sap, ad, "MSAG")
    tr, enj = _resolve(sap, a.get("transport"), owner, paket)
    return _result(sap, [{"ad": ad, "tip": "MSAG", "paket": paket, "yeni": yeni}], tr, enjekte=enj)


def _set_transport(sap, pd, a):
    return _result(sap, [], _tr(a.get("transport")))


def _delete_transport(sap, pd, a):
    return _result(sap, [], _tr(a.get("transport")))


def _create_transport(sap, pd, a):
    pk = _name(a.get("package"), "package") if a.get("package") else ""
    return _result(sap, [], "", paket=pk)


def _create_package(sap, pd, a):
    ad = _name(a.get("name"), "name")
    ust = _name(a.get("super_package"), "super_package") if a.get("super_package") else ""
    return _result(sap, [{"ad": ad, "tip": "DEVC", "paket": ust, "yeni": True}], _tr(a.get("transport")))


_COLLECTORS = {
    "adt_push": _push,
    "adt_write_function_module": _write_fm,
    "adt_activate": _activate,
    "adt_set_transport": _set_transport,
    "adt_delete_object": lambda s, p, a: _object_tool(s, p, a, inject=True),
    "adt_remove_from_transport": lambda s, p, a: _object_tool(s, p, a, inject=False),
    "adt_clear_lock": lambda s, p, a: _object_tool(s, p, a, inject=False),
    "adt_delete_transport": _delete_transport,
    "adt_create_transport": _create_transport,
    "adt_create_package": _create_package,
    "adt_publish_service_binding": _srvb,
    "adt_unpublish_service_binding": _srvb,
    "adt_generate_screen": _screen,
    "adt_generate_adobe": _adobe,
    "adt_message_class": _msag,
}
for _arac in (*SOURCE_CREATES, *PLAIN_CREATES, "adt_create", "adt_create_ddic_shell"):
    _COLLECTORS[_arac] = (lambda arac: lambda s, p, a: _create(s, p, a, arac))(_arac)


def collect(sap, arac: str, args: dict, project_dir) -> dict:
    """Bir yazma çağrısının bilgisi:
    {nesneler, transport, transport_bilgi, enjekte_transport, kalite[, paket]}.
    `kalite` True ise adt_gated_server her nesnede gated_quality.check çalıştırır.
    """
    fn = _COLLECTORS.get(arac)
    if fn is None:
        raise CollectError("bilgi_toplanamadi", f"{arac} için bilgi toplayıcı yok.")
    # Transport SAP'a gidilmeden süzülür: geçersiz argümanla hiçbir okuma yapılmasın.
    _tr(args.get("transport"))
    return fn(sap, project_dir, args)


# --- teslim ve abapGit -------------------------------------------------------
def _zip_nesneler(sap, project_dir, zip_dosyasi, paket) -> tuple[list[dict], str]:
    if not zip_dosyasi:
        raise CollectError("kaynak_dosyasi_gerekli", "zip_dosyasi gerekli.")
    p = Path(zip_dosyasi)
    if not p.is_absolute():
        p = Path(project_dir) / p
    if not p.is_file():
        raise CollectError("kaynak_dosyasi_yok", f"ZIP bulunamadı: {zip_dosyasi}")
    try:
        objs, zip_sha = gq.zip_objects(p)
    except Exception as exc:  # noqa: BLE001 — bozuk ZIP
        raise CollectError("bilgi_toplanamadi", f"ZIP okunamadı: {exc}")
    nesneler = []
    for o in objs:
        ad = _name(o["ad"], "ZIP'teki nesne adı")
        sap_paket, yeni = _existing(sap, o["tip"], ad, paket)
        nesneler.append({"ad": ad, "tip": o["tip"], "paket": sap_paket, "yeni": yeni,
                         "kaynak_sha256": o["kaynak_sha256"]})
    return nesneler, zip_sha


def collect_teslim(sap, project_dir, nesneler, paket, transport, yontem, zip_dosyasi="") -> dict:
    """axet_teslim: yerel modda biten işin tamamı, tek pencere."""
    if yontem not in ("adt", "abapgit"):
        raise CollectError("bilgi_toplanamadi", "yontem 'adt' ya da 'abapgit' olmalı.")
    pk = _name(paket, "paket")
    tr = _tr(transport)
    if not tr and not _local(pk):
        raise CollectError("transport_belirsiz", MSG_TRANSPORT_BELIRSIZ)
    if yontem == "abapgit":
        objs, zip_sha = _zip_nesneler(sap, project_dir, zip_dosyasi, pk)
        out = _result(sap, objs, tr, paket=pk, kalite=True)
        out["teslim"] = {"yontem": "abapgit", "zip_sha256": zip_sha}
        return out
    if not isinstance(nesneler, list) or not nesneler:
        raise CollectError("bilgi_toplanamadi", "nesneler boş olamaz.")
    objs = []
    for o in nesneler:
        if not isinstance(o, dict):
            raise CollectError("bilgi_toplanamadi", "nesneler öğeleri {ad, tip, kaynak_dosyasi?} olmalı.")
        ad, ot = _name(o.get("ad"), "ad"), o.get("tip")
        tip = r3tr(ot)
        sap_paket, yeni = _existing(sap, tip, ad, pk)
        if o.get("kaynak_dosyasi"):
            fg = fm_group(sap, ad) if tip == "FUNC" and not yeni else None
            objs.append(source_object(sap, project_dir, o["kaynak_dosyasi"], ad, ot, tip, sap_paket, yeni, fg=fg))
        else:
            objs.append({"ad": ad, "tip": tip, "paket": sap_paket, "yeni": yeni})
    out = _result(sap, objs, tr, paket=pk, kalite=True)
    out["teslim"] = {"yontem": "adt"}
    return out


def collect_abapgit(sap, project_dir, script, paket="", transport="", zip_dosyasi="") -> dict:
    """axet_abapgit_onay: tier_gate.require_write_approval'ın sorduğu script çalıştırması."""
    s = str(script or "").strip()
    if not _SCRIPT_RE.match(s):
        raise CollectError("gecersiz_ad", f"script geçersiz: {script!r}")
    pk = _name(paket, "paket") if paket else ""
    tr = _tr(transport)
    abapgit = {"script": s}
    if pk:
        abapgit["paket"] = pk
    objs = []
    if zip_dosyasi:
        objs, abapgit["zip_sha256"] = _zip_nesneler(sap, project_dir, zip_dosyasi, pk)
    out = _result(sap, objs, tr, paket=pk, kalite=bool(zip_dosyasi))
    out["abapgit"] = abapgit
    return out
```

- [ ] **Step 8: Testlerin geçtiğini gör**

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_collect.py`
Expected: son satır `20/20 geçti`, çıkış kodu 0.

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_quality.py`
Expected: `12/12 geçti`.

- [ ] **Step 9: Commit**

```bash
git add resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/gated_quality.py resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/gated_collect.py resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_quality.py resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_collect.py
git commit -m "SAP yazma onayi: kalite kapisi ve bilgi toplama (Python)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Onaylı sunucu `adt_gated_server.py` (Python)

Motorla aynı süreç, aynı kalıcı SAP oturumu, aynı 8787 ve token; ama yazan her araç önce NTT Studio'ya sorulur. Katman motorun modül global'lerini sarmalayıcıyla değiştirir: `engine.run_http` → `_http_tool_specs()` aracı `getattr(engine, ad)` ile bulduğu için HTTP'den gelen her çağrı sarmalayıcıdan geçer. stdio MCP yolu araçları kendi tablosundan çağırdığı için bu yolu atlardı; bu yüzden sunucu **yalnızca `--http`** ile başlar.

Sınıflama (spec §4): 22 SERBEST, 17 TRANSPORT_ONAYLI, 8 HER_SEFER, 3 KARMA = motorun 50 aracı; üstüne 3 `axet_*` aracı → 53. Sınıflanmamış ya da kaybolmuş bir araç sunucunun başlamasını engeller (`adt_readonly_server.py` ile aynı drift kontrolü).

Önemli davranışlar (hepsi testte):
- Launcher önceki isteği **yalnızca `arg_hash`** ile eşler (Task 2). Bu yüzden hash; argümanlar + çözülen transport + paket + nesnelerin `(tip, ad, paket, kaynak_sha256)` bilgisidir. Onaydan sonra sabitlenen transport ya da düzenlenen kaynak yeni istek olur. `fark` ve `kalite` hash'e girmez.
- Kaynak taşıyan yazmada (`collect` → `kalite: true`) her nesnenin `.sap-review` kaydı kontrol edilir; ret launcher'a **sorulmadan** döner ve `/events`'e `kalite_reddi` düşer. `kritik_bulgu` için aşma yolu yok.
- Satır içi `source` / `types_and_constants` reddedilir (`kaynak_dosyasi_gerekli`): kalite kapısı dosya hash'ine bağlı.
- Silme önizlemesi (force ya da confirm boş) ve `adt_set_transport(transport="")` onaysız geçer. force + dolu confirm her zaman pencereye gider, eşleşmese bile (motorun kendi koşulundan geniş).
- Karar yalnızca tam olarak `izinli` ise motor çağrılır. Ağ hatası, 401, bozuk JSON, tanınmayan karar, eksik ortam değişkeni → `approval_unavailable`.
- İzinden sonra argümanda transport yoksa ve `enjekte_transport` doluysa motor o transport'la çağrılır; SAP başka bir `corrnr` kaydederse sonuca `axet_uyari` eklenir. `adt_push` ve ≤10 nesneli `adt_activate` sonrası ATC özeti `axet_atc` olarak eklenir ve `/results`'a gider.
- Kalp atışı: `GET /health` üst üste 3 kez 200 dönmezse (401 dahil: launcher yeniden başladıysa eski token ölüdür) süren çağrının kilidi beklenir ve süreç `os._exit(3)` ile çıkar; port yeni launcher'a kalır.

`test_gated_flow.py` gerçek motoru içe aktarır (`mcp` paketi gerekir, SAP bağlantısı gerekmez) ve Task 3'teki `test_gated_collect.FakeSap`'i kullanır. Launcher yerel portta sahte bir `ThreadingHTTPServer`'dır. `t_build` en son koşar, çünkü motor global'lerini gerçekten değiştirir.

**Files:**
- Create: `resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/adt_gated_server.py`
- Test: `resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_flow.py`

**Interfaces:**
- Consumes:
  - Motor (salt import, değiştirilmez): `engine.mcp` (`_tool_manager._tools`, `tool()`), `engine.ToolFailure` (yük JSON string), `engine._get_client()`, `engine.adt_atc_check(name, object_type)` → `{findings: [{priority, ...}]}`, `engine._HTTP_CALL_LOCK`, `engine.run_http(host, port)`, `engine._http_tool_specs()`.
  - Task 3: `gated_collect.collect / collect_teslim / collect_abapgit / CollectError / _name / r3tr`, `gated_quality.check / write_review / review_path`.
  - Task 2 (launcher onay ucu): `POST /approvals` (`WriteFact`) → `{karar, id, mesaj}`; `POST /results {id, sap_sonucu, atc?}`; `POST /events {tur:"kalite_reddi", arac, nesneler:[{ad,tip}], sebep}`; `GET /health` → `{ok:true}`. Hepsi `Authorization: Bearer <ADT_APPROVAL_TOKEN>`.
- Produces:
  - Ortam: `ADT_APPROVAL_URL`, `ADT_APPROVAL_TOKEN` (Task 5 yalnızca bu sunucunun ortamına koyar), `ABAP_HTTP_TOKEN` (8787, değişmedi), `ADT_CWD` (proje klasörü; `.sap-review/` burada).
  - Komut: `py adt_gated_server.py --http --port 8787` (Task 5 başlatır); `--list-tools` araçları sınıflarıyla yazar.
  - Ajana dönen hata kodları (Task 8 talimatları bunları anlatır): `approval_pending` (+`approval_id`), `approval_denied`, `approval_unavailable`, `yerel_mod`, `mod_secilmedi`, `mod_belirtilmeli`, `kaynak_dosyasi_gerekli`, `kaynak_dosyasi_yok`, `inceleme_yok`, `inceleme_eski`, `kritik_bulgu`, `transport_belirsiz`, `gecersiz_ad`, `gecersiz_inceleme`, `bilgi_toplanamadi`.
  - Yeni araçlar: `axet_teslim(nesneler=None, paket="", transport="", yontem="adt", zip_dosyasi="")` → `{ok, onay_id, message}`; `axet_abapgit_onay(script, paket="", transport="", zip_dosyasi="", ust_onay="")` → `{ok, onay_id}` (Task 7'deki `tier_gate` çağırır); `axet_inceleme_kaydet(nesne, tip, kaynak_dosyalari, bulgular, rapor="", skill="abap-code-review")` → `{ok, kayit, kaynak_sha256, bulgular, message?}`.
  - Başarılı yazma sonucunda ek alanlar: `axet_atc: [{nesne, tip, toplam, oncelik} | {nesne, tip, hata}]`, `axet_uyari: str`.

- [ ] **Step 1: Başarısız testi yaz**

`resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_flow.py`:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — adt_gated_server.py akış testleri. SAP yok; launcher sahte (yerel port).

    py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_flow.py

Gerçek motoru içe aktarır (`mcp` paketi gerekir; SAP bağlantısı gerekmez) ve
test_gated_collect.py'deki FakeSap'i kullanır. Her test yakaladığı hatayı söyler.
Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import inspect
import json
import os
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import adt_gated_server as gs  # noqa: E402
import gated_quality as gq  # noqa: E402
from test_gated_collect import FakeSap  # noqa: E402

engine = gs.engine
RESULTS = []
TOKEN = "t" * 43


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — çökme de başarısızlık
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


# --- sahte launcher ------------------------------------------------------------
class FakeLauncher:
    """Onay ucunun yerine geçer: her isteği kaydeder, programlanan cevabı döner."""

    def __init__(self):
        self.requests = []
        self.karar = "izinli"
        self.status = 200
        self.raw = None           # verilirse gövde olarak bu gider (bozuk JSON testi)
        self.health_status = 200
        outer = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _send(self, status, body):
                data = body if isinstance(body, bytes) else json.dumps(body).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                outer.requests.append(("GET", self.path, self.headers.get("Authorization"), None))
                self._send(outer.health_status, {"ok": outer.health_status == 200})

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                body = json.loads(self.rfile.read(n).decode("utf-8"))
                outer.requests.append(("POST", self.path, self.headers.get("Authorization"), body))
                if outer.raw is not None:
                    return self._send(200, outer.raw)
                if self.path == "/approvals":
                    return self._send(outer.status, {"karar": outer.karar, "id": "onay-1", "mesaj": ""})
                self._send(200, {"ok": True})

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"

    def reset(self, karar="izinli", status=200):
        self.requests.clear()
        self.karar, self.status, self.raw, self.health_status = karar, status, None, 200

    def paths(self):
        return [r[1] for r in self.requests]

    def bodies(self, path):
        return [r[3] for r in self.requests if r[1] == path]


LAUNCHER = FakeLauncher()
os.environ["ADT_APPROVAL_URL"] = LAUNCHER.url
os.environ["ADT_APPROVAL_TOKEN"] = TOKEN


class Env:
    """Bir test için sahte SAP + proje klasörü; gs._sap/_project_dir'i yamalar."""

    def __init__(self, files=None, **sap_kw):
        self.pd = Path(tempfile.mkdtemp(prefix="gf-"))
        for name, data in (files or {}).items():
            (self.pd / name).parent.mkdir(parents=True, exist_ok=True)
            (self.pd / name).write_bytes(data)
        self.sap = FakeSap(**sap_kw)
        gs._sap = lambda: self.sap
        gs._project_dir = lambda: self.pd
        LAUNCHER.reset()

    def review(self, tip, ad, files, **bulgular):
        b = {"kritik": 0, "yuksek": 0, "orta": 0, "dusuk": 0, **bulgular}
        return gq.write_review(self.pd, ad, tip, files, b)


class FakeTool:
    """Motor aracının yerine: gerçek imzayı taşır, çağrıları kaydeder."""

    def __init__(self, name, result=None, raises=None):
        self.calls = []
        self.result = {"ok": True, "success": True} if result is None else result
        self.raises = raises
        real = getattr(engine, name)
        self.__signature__ = inspect.signature(real)
        self.__name__ = name
        self.__doc__ = real.__doc__
        self.__qualname__ = name
        self.__module__ = "fake"

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        if self.raises:
            raise self.raises
        return dict(self.result)


def gated(name, **kw):
    fake = FakeTool(name, **kw)
    return gs.make_wrapper(name, fake), fake


def no_atc():
    calls = []

    def atc(name, object_type="class", variant="DEFAULT"):
        calls.append((name, object_type))
        return {"ok": True, "findings": [{"priority": 1}, {"priority": 2}, {"priority": 2}]}
    engine.adt_atc_check = atc
    return calls


SRC = b"CLASS zcl_a DEFINITION.\nENDCLASS.\n"
PUSH_OWNED = dict(tadir={("CLAS", "ZCL_A"): "ZPAKET"}, owners={"ZCL_A": "DS4K900111"},
                  sources={"zcl_a": "CLASS zcl_a DEFINITION.\nENDCLASS.\n* eski\n"})


# --- testler ---------------------------------------------------------------------
def t_arg_hash_canonical():
    info = {"transport": "DS4K900111", "nesneler": [{"tip": "CLAS", "ad": "ZCL_A", "paket": "Z",
                                                     "kaynak_sha256": ["b" * 64, "a" * 64]}]}
    h1 = gs.arg_hash("adt_push", {"name": "ZCL_A", "transport": ""}, info)
    info2 = {"nesneler": [{"kaynak_sha256": ["a" * 64, "b" * 64], "paket": "Z", "ad": "ZCL_A", "tip": "CLAS",
                           "fark": "başka fark", "kalite": {"kritik": 0}}], "transport": "DS4K900111"}
    h2 = gs.arg_hash("adt_push", {"transport": "", "name": "ZCL_A"}, info2)
    assert h1 == h2, "sıra ya da fark/kalite hash'i değiştirdi"
    assert len(h1) == 64 and all(c in "0123456789abcdef" for c in h1)


def t_arg_hash_changes():
    base = {"transport": "DS4K900111", "nesneler": [{"tip": "CLAS", "ad": "ZCL_A", "paket": "Z",
                                                     "kaynak_sha256": ["a" * 64]}]}
    h = gs.arg_hash("adt_push", {"name": "ZCL_A"}, base)
    assert gs.arg_hash("adt_push", {"name": "ZCL_A"}, {**base, "transport": "DS4K900222"}) != h, \
        "sabitleme değişince aynı onay kullanılır"
    other = {**base, "nesneler": [{**base["nesneler"][0], "kaynak_sha256": ["c" * 64]}]}
    assert gs.arg_hash("adt_push", {"name": "ZCL_A"}, other) != h, "kaynak değişince aynı onay kullanılır"
    assert gs.arg_hash("adt_push", {"name": "ZCL_B"}, base) != h
    assert gs.arg_hash("adt_activate", {"name": "ZCL_A"}, base) != h


def t_classify():
    assert gs.classify("adt_generate_screen", {"mode": "write"}) == "TRANSPORT_ONAYLI"
    assert gs.classify("adt_generate_screen", {"mode": " read "}) == "SERBEST"
    assert gs.classify("adt_generate_adobe", {"mode": "SET_LAYOUT"}) == "TRANSPORT_ONAYLI"
    assert gs.classify("adt_generate_adobe", {"mode": "YENI_MOD"}) == "HER_SEFER", "tanınmayan mod gevşek"
    assert gs.classify("adt_message_class", {"action": "READ"}) == "SERBEST"
    assert gs.classify("adt_message_class", {}) == "mod_belirtilmeli", "msag varsayılanı sessizce okuma"
    assert gs.classify("adt_generate_screen", {"mode": ""}) == "mod_belirtilmeli"
    assert gs.classify("adt_delete_object", {}) == "HER_SEFER"
    assert gs.classify("adt_sql", {}) == "SERBEST"


def t_classes_and_drift():
    gs._check_classification()
    registered = gs._registered_names(engine.mcp) - set(gs.AXET_TOOLS)
    gs._check_drift(registered)
    for bad, word in ((registered | {"adt_yeni_arac"}, "adt_yeni_arac"),
                      (registered - {"adt_push"}, "adt_push")):
        try:
            gs._check_drift(bad)
        except SystemExit as exc:
            assert word in str(exc), str(exc)
            continue
        raise AssertionError(f"drift geçti: {word}")
    saved = set(gs.SERBEST)
    gs.SERBEST.add("adt_push")
    try:
        gs._check_classification()
        raise AssertionError("iki sınıftaki araç geçti")
    except SystemExit as exc:
        assert "adt_push" in str(exc)
    finally:
        gs.SERBEST.clear()
        gs.SERBEST.update(saved)


def t_karma_read_passes():
    Env()
    fn, fake = gated("adt_message_class")
    fn(name="ZMSG", action="read")
    assert len(fake.calls) == 1 and LAUNCHER.requests == [], LAUNCHER.paths()


def t_missing_mode():
    Env()
    fn, fake = gated("adt_message_class")
    out = fn(name="ZMSG")
    assert out["error"] == "mod_belirtilmeli" and not fake.calls and not LAUNCHER.requests


def t_inline_source_refused():
    Env()
    fn, fake = gated("adt_create_cds_view")
    out = fn(name="ZI_V", package="ZPAKET", description="x", source="define view entity ZI_V ...")
    assert out["error"] == "kaynak_dosyasi_gerekli" and not fake.calls and not LAUNCHER.requests


def t_quality_refusals():
    for setup, reason in ((lambda e: None, "inceleme_yok"),
                          (lambda e: e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"], kritik=1), "kritik_bulgu")):
        e = Env({"zcl_a.clas.abap": SRC}, **PUSH_OWNED)
        setup(e)
        fn, fake = gated("adt_push")
        out = fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
        assert out.get("error") == reason, out
        assert "/approvals" not in LAUNCHER.paths(), "kalite reddinde onay soruldu"
        ev = LAUNCHER.bodies("/events")
        assert ev and ev[0]["tur"] == "kalite_reddi" and ev[0]["sebep"] == reason, ev
        assert ev[0]["nesneler"] == [{"ad": "ZCL_A", "tip": "CLAS"}]
        assert not fake.calls


def t_source_edit_after_review():
    e = Env({"zcl_a.clas.abap": SRC}, **PUSH_OWNED)
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    fn, fake = gated("adt_push")
    LAUNCHER.karar = "bekliyor"
    fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    h1 = LAUNCHER.bodies("/approvals")[0]["arg_hash"]
    (e.pd / "zcl_a.clas.abap").write_bytes(SRC + b"* sonradan\n")
    LAUNCHER.reset("izinli")
    out = fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    assert out["error"] == "inceleme_eski", out
    assert not fake.calls and "/approvals" not in LAUNCHER.paths()
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    LAUNCHER.reset("bekliyor")
    fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    assert LAUNCHER.bodies("/approvals")[0]["arg_hash"] != h1, "düzenlenen kaynak eski onayla eşleşir"


def t_pending_no_engine():
    e = Env({"zcl_a.clas.abap": SRC}, **PUSH_OWNED)
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"], orta=2)
    LAUNCHER.karar = "bekliyor"
    fn, fake = gated("adt_push")
    out = fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    assert out["error"] == "approval_pending" and out["approval_id"] == "onay-1", out
    assert not fake.calls, "onay beklerken motor çağrıldı"
    req = [r for r in LAUNCHER.requests if r[1] == "/approvals"][0]
    assert req[2] == f"Bearer {TOKEN}"
    fact = req[3]
    assert fact["arac"] == "adt_push" and fact["sinif"] == "TRANSPORT_ONAYLI"
    assert fact["transport"] == "DS4K900111" and fact["transport_bilgi"]["sahip"] == "DEV1"
    o = fact["nesneler"][0]
    assert o["kalite"] == {"kritik": 0, "yuksek": 0, "orta": 2, "dusuk": 0} and o["yeni"] is False
    assert "-* eski" in o["fark"], o.get("fark")


def t_denied_and_modes():
    for karar, error in (("reddedildi", "approval_denied"), ("sure_doldu", "approval_denied"),
                         ("yerel_mod", "yerel_mod"), ("mod_secilmedi", "mod_secilmedi"),
                         ("bilinmeyen", "approval_unavailable")):
        Env(tadir={("DOMA", "ZD"): "ZPAKET"}, owners={}, session_transport="DS4K900111")
        LAUNCHER.karar = karar
        fn, fake = gated("adt_create_domain")
        out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
        assert out["error"] == error, (karar, out)
        assert not fake.calls
    assert out["message"]


def t_izinli_injects_and_reports():
    e = Env({"zcl_a.clas.abap": SRC}, **PUSH_OWNED)
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    atc_calls = no_atc()
    fn, fake = gated("adt_push", result={"success": True, "activated": True, "corrnr": "DS4K900999"})
    out = fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap")
    assert fake.calls == [{"name": "ZCL_A", "object_type": "class", "source_file": "zcl_a.clas.abap",
                           "transport": "DS4K900111"}], fake.calls
    assert atc_calls == [("ZCL_A", "class")]
    assert out["axet_atc"][0]["toplam"] == 3 and out["axet_atc"][0]["oncelik"] == {"1": 1, "2": 2}
    assert "DS4K900111" in out["axet_uyari"] and "DS4K900999" in out["axet_uyari"]
    res = LAUNCHER.bodies("/results")
    assert len(res) == 1 and res[0]["id"] == "onay-1" and res[0]["sap_sonucu"]["activated"] is True
    assert res[0]["atc"][0]["toplam"] == 3


def t_explicit_transport_not_overridden():
    e = Env({"zcl_a.clas.abap": SRC}, **PUSH_OWNED)
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    no_atc()
    fn, fake = gated("adt_push")
    fn(name="ZCL_A", object_type="class", source_file="zcl_a.clas.abap", transport="ds4k900222")
    assert fake.calls[0]["transport"] == "ds4k900222"
    assert LAUNCHER.bodies("/approvals")[0]["transport"] == "DS4K900222"


def t_toolfailure_reported_and_reraised():
    Env(tadir={("DOMA", "ZD"): "ZPAKET"}, session_transport="DS4K900111")
    payload = {"ok": False, "error": "activation failed", "error_type": "ActivationError"}
    fn, fake = gated("adt_create_domain", raises=engine.ToolFailure(json.dumps(payload)))
    try:
        fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
        raise AssertionError("ToolFailure yutuldu")
    except engine.ToolFailure:
        pass
    res = LAUNCHER.bodies("/results")
    assert res == [{"id": "onay-1", "sap_sonucu": payload}], res


def t_delete_preview_passes():
    Env(tadir={("CLAS", "ZCL_A"): "ZPAKET"}, owners={"ZCL_A": "DS4K900111"})
    fn, fake = gated("adt_delete_object")
    fn(name="ZCL_A", object_type="class")
    fn(name="ZCL_A", object_type="class", force=True)
    fn(name="ZCL_A", object_type="class", confirm_name="ZCL_A")
    assert len(fake.calls) == 3 and not LAUNCHER.requests, LAUNCHER.paths()
    LAUNCHER.karar = "bekliyor"
    out = fn(name="ZCL_A", object_type="class", force=True, confirm_name="YANLIS")
    assert out["error"] == "approval_pending", "eşleşmeyen confirm onaysız geçti"
    assert LAUNCHER.bodies("/approvals")[0]["sinif"] == "HER_SEFER"
    fn2, fake2 = gated("adt_set_transport")
    LAUNCHER.reset()
    fn2(transport="")
    assert fake2.calls and not LAUNCHER.requests


def t_env_missing_unavailable():
    Env(tadir={("DOMA", "ZD"): "ZPAKET"}, session_transport="DS4K900111")
    saved = os.environ.pop("ADT_APPROVAL_TOKEN")
    try:
        fn, fake = gated("adt_create_domain")
        out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
    finally:
        os.environ["ADT_APPROVAL_TOKEN"] = saved
    assert out["error"] == "approval_unavailable" and not fake.calls and not LAUNCHER.requests


def t_launcher_401_is_unavailable():
    for status, raw in ((401, None), (200, b"<html>")):
        Env(tadir={("DOMA", "ZD"): "ZPAKET"}, session_transport="DS4K900111")
        LAUNCHER.status, LAUNCHER.raw = status, raw
        fn, fake = gated("adt_create_domain")
        out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
        assert out["error"] == "approval_unavailable", (status, out)
        assert not fake.calls


def t_collect_error_and_bad_args():
    Env()
    fn, fake = gated("adt_create_domain")
    out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10,
             transport="X' OR 1=1")
    assert out["error"] == "gecersiz_ad" and not fake.calls and not LAUNCHER.requests
    Env(fail_sql=True)
    out = fn(name="ZD", package="ZPAKET", description="x", datatype="CHAR", length=10)
    assert out["error"] == "bilgi_toplanamadi"
    try:
        fn(name="ZD", bilinmeyen=1)
        raise AssertionError("bilinmeyen argüman geçti")
    except TypeError:
        pass


def t_namespace_review_path():
    e = Env({"src/#abc#cl_x.clas.abap": b"CLASS /abc/cl_x.\n"},
            tadir={("CLAS", "/ABC/CL_X"): "/ABC/PAKET"}, owners={"/ABC/CL_X": "DS4K900111"})
    out = gs.axet_inceleme_kaydet(nesne="/abc/cl_x", tip="class",
                                  kaynak_dosyalari=["src/#abc#cl_x.clas.abap"],
                                  bulgular={"kritik": 0, "yuksek": 1})
    assert out["ok"] and out["kayit"].endswith("CLAS_#ABC#CL_X.json"), out
    assert (e.pd / ".sap-review" / "CLAS_#ABC#CL_X.json").is_file()
    LAUNCHER.karar = "bekliyor"
    fn, _ = gated("adt_push")
    res = fn(name="/ABC/CL_X", object_type="class", source_file="src/#abc#cl_x.clas.abap")
    assert res["error"] == "approval_pending", res


def t_inceleme_kaydet_refuses():
    e = Env({"a.abap": b"x\n"})
    assert gs.axet_inceleme_kaydet("ZCL_A", "class", ["yok.abap"], {"kritik": 0})["error"] == "gecersiz_inceleme"
    assert gs.axet_inceleme_kaydet("ZCL A", "class", ["a.abap"], {"kritik": 0})["error"] == "gecersiz_ad"
    out = gs.axet_inceleme_kaydet("ZCL_A", "class", ["a.abap"], {"kritik": 2})
    assert out["ok"] and out["message"] == gs.MESAJ["kritik_bulgu"]
    assert not LAUNCHER.requests
    assert not (e.pd / ".sap-review" / "CLAS_ZCL A.json").exists()


def t_teslim():
    e = Env({"zcl_a.clas.abap": SRC}, tadir={})
    e.review("CLAS", "ZCL_A", ["zcl_a.clas.abap"])
    out = gs.axet_teslim(nesneler=[{"ad": "ZCL_A", "tip": "class", "kaynak_dosyasi": "zcl_a.clas.abap"}],
                         paket="ZPAKET", transport="DS4K900111")
    assert out["ok"] and out["onay_id"] == "onay-1", out
    fact = LAUNCHER.bodies("/approvals")[0]
    assert fact["arac"] == "axet_teslim" and fact["teslim"] == {"yontem": "adt"} and fact["paket"] == "ZPAKET"
    assert fact["nesneler"][0]["yeni"] is True and fact["nesneler"][0]["paket"] == "ZPAKET"
    Env({"zcl_a.clas.abap": SRC}, tadir={})
    out = gs.axet_teslim(nesneler=[{"ad": "ZCL_A", "tip": "class", "kaynak_dosyasi": "zcl_a.clas.abap"}],
                         paket="ZPAKET", transport="DS4K900111")
    assert out["error"] == "inceleme_yok" and "/approvals" not in LAUNCHER.paths()


def t_abapgit_onay():
    Env()
    out = gs.axet_abapgit_onay(script="deploy.py", paket="ZPAKET", transport="DS4K900111", ust_onay="onay-0")
    assert out == {"ok": True, "onay_id": "onay-1"}, out
    fact = LAUNCHER.bodies("/approvals")[0]
    assert fact["ust_onay"] == "onay-0" and fact["abapgit"]["script"] == "deploy.py"
    assert out == gs.axet_abapgit_onay(script="deploy.py", paket="ZPAKET", transport="DS4K900111",
                                       ust_onay="onay-0")
    h = [b["arg_hash"] for b in LAUNCHER.bodies("/approvals")]
    assert h[0] == h[1], "aynı çağrı farklı hash üretti"
    assert gs.axet_abapgit_onay(script="../x.sh")["error"] == "gecersiz_ad"


def t_heartbeat():
    Env()
    dead = []
    hb = gs.Heartbeat(interval=0.01, max_miss=3, on_dead=lambda: dead.append(1))
    LAUNCHER.health_status = 401
    assert hb.tick() and hb.tick()
    LAUNCHER.health_status = 200
    assert hb.tick() and hb.misses == 0, "başarılı yoklama sayacı sıfırlamadı"
    LAUNCHER.health_status = 500
    assert hb.tick() and hb.tick() and not dead
    assert hb.tick() is False and dead == [1]
    assert all(r[2] == f"Bearer {TOKEN}" for r in LAUNCHER.requests)


def t_main_refuses_stdio():
    called = []
    saved = gs.build, engine.run_http
    gs.build = lambda: called.append("build") or set()
    engine.run_http = lambda *a, **k: called.append("run_http")
    try:
        gs.main([])
        raise AssertionError("stdio'da başladı")
    except SystemExit as exc:
        assert "stdio" in str(exc) and "--http" in str(exc), str(exc)
    finally:
        gs.build, engine.run_http = saved
    assert not called, f"reddetmeden önce çalıştı: {called}"


def t_build():
    """En son çalışır: motor global'lerini gerçekten değiştirir."""
    real_sql = engine.adt_sql
    tools = gs.build()
    assert set(gs.AXET_TOOLS) <= tools, tools
    assert len(tools) == 53, len(tools)
    for name in gs.TRANSPORT_ONAYLI | gs.HER_SEFER | set(gs.KARMA):
        assert getattr(getattr(engine, name), "_axet_gated", False), f"{name} sarmalanmadı"
    for name in gs.SERBEST:
        assert not getattr(getattr(engine, name), "_axet_gated", False), f"{name} gereksiz sarmalandı"
    assert engine.adt_sql is real_sql
    specs = engine._http_tool_specs()
    assert getattr(specs["adt_push"]["fn"], "_axet_gated", False), "HTTP sarmalayıcıyı görmüyor"
    assert "axet_teslim" in specs and specs["axet_teslim"]["schema"]["properties"]["nesneler"]


TESTS = [
    ("arg_hash_canonical", "aynı çağrı farklı hash alıyor ya da fark/kalite hash'e giriyor", t_arg_hash_canonical),
    ("arg_hash_changes", "transport/kaynak değişince eski onay geçerli sayılıyor", t_arg_hash_changes),
    ("classify", "KARMA mod gevşek sınıflanıyor ya da eksik mod okuma sayılıyor", t_classify),
    ("classes_and_drift", "sınıflanmamış/kaybolmuş/iki sınıflı araçla sunucu başlıyor", t_classes_and_drift),
    ("karma_read_passes", "KARMA okuma pencere açıyor", t_karma_read_passes),
    ("missing_mode", "mod verilmeyen KARMA çağrısı geçiyor", t_missing_mode),
    ("inline_source", "satır içi kaynak kalite kapısını atlıyor", t_inline_source_refused),
    ("quality_refusals", "incelenmemiş/kritik kaynak için onay soruluyor ya da günlüğe düşmüyor", t_quality_refusals),
    ("source_edit_after_review", "incelemeden sonra düzenlenen kaynak geçiyor", t_source_edit_after_review),
    ("pending_no_engine", "onay beklerken SAP'a yazılıyor ya da pencere eksik bilgi alıyor", t_pending_no_engine),
    ("denied_and_modes", "ret/yerel mod/anlaşılmayan karar yazmaya izin veriyor", t_denied_and_modes),
    ("izinli_injects", "izinli çağrı onaylanan transport'a gitmiyor ya da sonuç/ATC bildirilmiyor",
     t_izinli_injects_and_reports),
    ("explicit_transport", "verilen transport eziliyor", t_explicit_transport_not_overridden),
    ("toolfailure", "SAP hatası günlüğe düşmüyor ya da yutuluyor", t_toolfailure_reported_and_reraised),
    ("delete_preview", "önizleme silme pencere açıyor ya da eşleşmeyen confirm onaysız geçiyor",
     t_delete_preview_passes),
    ("env_missing", "onay ucu yokken yazılıyor", t_env_missing_unavailable),
    ("launcher_401", "401/bozuk cevap izin sayılıyor", t_launcher_401_is_unavailable),
    ("collect_error", "geçersiz argüman/okunamayan SAP bilgisiyle onay soruluyor", t_collect_error_and_bad_args),
    ("namespace_review", "namespace'li nesnenin incelemesi bulunamıyor", t_namespace_review_path),
    ("inceleme_kaydet", "geçersiz inceleme kaydı yazılıyor", t_inceleme_kaydet_refuses),
    ("teslim", "teslim penceresi eksik/incelemesiz geçiyor", t_teslim),
    ("abapgit_onay", "abapGit onayı üst onayı taşımıyor ya da hash kararsız", t_abapgit_onay),
    ("heartbeat", "launcher ölünce sunucu açık kalıyor", t_heartbeat),
    ("main_stdio", "stdio'da başlayıp onayı atlıyor", t_main_refuses_stdio),
    ("build", "yazan araç sarmalanmıyor ya da HTTP sarmalayıcıyı görmüyor", t_build),
]


def main():
    for name, catches, fn in TESTS:
        check(name, catches, fn)
    for status, name, catches, detail in RESULTS:
        print(f"{status}  {name}  — {catches}")
        if detail:
            print(f"      {detail}")
    failed = sum(1 for r in RESULTS if r[0] == "FAIL")
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_flow.py`
Expected: `ModuleNotFoundError: No module named 'adt_gated_server'`

- [ ] **Step 3: `adt_gated_server.py`'yi yaz**

`resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/adt_gated_server.py`:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — SAP DEV yazma onayı: onaylı giriş noktası.

adt_mcp_server.py ile aynı motor, aynı kalıcı oturum, aynı 8787 ve token; ama SAP'a
yazan her araç çağrısı önce NTT Studio'ya (launcher'ın onay ucuna) sorulur.

NE YAPAR
  - Motorun kaydettiği her araç tam olarak bir sınıfta olmalı (SERBEST,
    TRANSPORT_ONAYLI, HER_SEFER, KARMA). Sınıflanmamış ya da kaybolmuş bir araç
    sunucunun BAŞLAMASINI engeller ve adını söyler — adt_readonly_server.py'deki
    drift kontrolünün aynısı.
  - Yazan araçların modül global'leri sarmalayıcıyla değiştirilir. HTTP katmanı
    (engine.run_http → _http_tool_specs) aracı getattr(engine, ad) ile bulduğu için
    HTTP'den gelen her çağrı sarmalayıcıdan geçer.
  - Sarmalayıcı: bilgi toplar (gated_collect), kaynak taşıyan yazmada kalite
    kapısını çalıştırır (gated_quality), launcher'a sorar, yalnızca `izinli`
    cevabında motoru çağırır, sonucu launcher günlüğüne bildirir.
  - Üç araç ekler: axet_teslim, axet_abapgit_onay, axet_inceleme_kaydet.

NEDEN YALNIZCA --http
  stdio MCP yolu araçları kendi kayıt tablosundan çağırır, modül global'lerinden
  değil; sarmalayıcıyı atlardı. Bu yüzden bu sunucu stdio'da çalışmayı reddeder.

KARAR BURADA DEĞİL
  Bu dosya kendi başına izin vermez. Karar mantığı launcher'da (policy.ts);
  launcher'a ulaşılamazsa, cevap anlaşılmazsa ya da ortam değişkenleri yoksa
  sonuç `approval_unavailable`: onay yok, yazma yok.

ÇALIŞTIRMA (launcher başlatır)
  ADT_APPROVAL_URL=http://127.0.0.1:<port> ADT_APPROVAL_TOKEN=<oturum token'ı> \\
  ABAP_HTTP_TOKEN=<8787 token'ı> py adt_gated_server.py --http --port 8787
"""
from __future__ import annotations

import functools
import hashlib
import inspect
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) in sys.path:
    sys.path.remove(str(_SCRIPTS_DIR))
sys.path.insert(0, str(_SCRIPTS_DIR))

import adt_mcp_server as engine  # noqa: E402
import gated_collect as gc  # noqa: E402
import gated_quality as gq  # noqa: E402


def _assert_origin(mod, expected: Path) -> None:
    """İçe aktarılan modül, bu klasördeki dosya olmalı (aynı adlı başka modül gölgelemesin)."""
    got = getattr(mod, "__file__", None)
    if got is None or Path(got).resolve() != expected.resolve():
        raise SystemExit(
            f"[adt-gated] BAŞLAMIYOR: {mod.__name__!r} {got!r} dosyasından geldi, "
            f"beklenen {expected}. Sarmalanan motor servis edilen motor olmazdı.\n")


_assert_origin(engine, _SCRIPTS_DIR / "adt_mcp_server.py")
_assert_origin(gc, _SCRIPTS_DIR / "gated_collect.py")
_assert_origin(gq, _SCRIPTS_DIR / "gated_quality.py")


# --- sınıflar -----------------------------------------------------------------
SERBEST = {
    "ping", "adt_capabilities", "adt_doctor", "adt_logon", "adt_sql", "adt_list_transports",
    "adt_get_source", "adt_list_package", "adt_where_used", "adt_transport_status",
    "adt_service_binding_status", "adt_transport_check", "adt_check_scatter",
    "adt_syntax_check", "adt_atc_check", "adt_unit_test", "adt_search", "adt_code_search",
    "adt_revisions", "adt_inactive_objects", "adt_badi_discovery", "adt_dumps",
}
TRANSPORT_ONAYLI = {
    "adt_set_transport", "adt_push", "adt_create_domain", "adt_create_data_element",
    "adt_create_cds_view", "adt_create_metadata_extension", "adt_create_access_control",
    "adt_create_behavior_definition", "adt_create_lock_object", "adt_create_type_group",
    "adt_create_table_type", "adt_create_function_group", "adt_write_function_module",
    "adt_create_service_binding", "adt_create_ddic_shell", "adt_create", "adt_activate",
}
HER_SEFER = {
    "adt_clear_lock", "adt_unpublish_service_binding", "adt_publish_service_binding",
    "adt_delete_object", "adt_remove_from_transport", "adt_create_package",
    "adt_create_transport", "adt_delete_transport",
}
S, T_O, H_S = "SERBEST", "TRANSPORT_ONAYLI", "HER_SEFER"
# Mod argümanına göre sınıf. Tanınmayan mod HER_SEFER; eksik/boş mod ayrıca reddedilir.
KARMA = {
    "adt_generate_screen": ("mode", str.upper, {"READ": S, "WRITE": T_O, "DELETE": H_S}),
    "adt_generate_adobe": ("mode", str.upper, {
        "READ": S, "STATUS": S, "GET_PARAMS": S, "GET_LAYOUT": S, "RTTI_DEBUG": S,
        "WRITE": T_O, "SET_LAYOUT": T_O, "SET_PARAMS": T_O, "SYNC_CONTEXT": T_O,
        "DELETE": H_S}),
    "adt_message_class": ("action", str.lower, {"read": S, "create": T_O, "write": T_O}),
}
AXET_TOOLS = ("axet_teslim", "axet_abapgit_onay", "axet_inceleme_kaydet")
# Kaynağı satır içi taşıyabilen argümanlar: kalite kapısı dosya hash'ine bağlı, bunlar reddedilir.
INLINE_SOURCE_ARGS = ("source", "types_and_constants")
ATC_MAX_OBJECTS = 10
APPROVAL_TIMEOUT_S = 10

MSG_DENIED = "Kullanıcı reddetti. Tekrar deneme, başka yoldan da deneme."
MESAJ = {
    "approval_pending": ("NTT Studio'da onay penceresi açıldı. Kullanıcıya pencereyi onaylamasını "
                         "söyle; onaydan sonra AYNI çağrıyı AYNI argümanlarla tekrar gönder."),
    "approval_denied": MSG_DENIED,
    "yerel_mod": ("Bu oturum 'önce yerelde çalış' modunda: SAP'a doğrudan yazılmaz. İş bitince "
                  "axet_teslim ile tek seferde teslim et."),
    "mod_secilmedi": ("NTT Studio'da bu oturumun çalışma modu seçilmedi. Kullanıcıdan NTT Studio'da "
                      "modu seçmesini iste; seçilmeden SAP'a yazılmaz."),
    "approval_unavailable": ("NTT Studio'nun onay ucuna ulaşılamadı; onay yoksa yazma yok. "
                             "Kullanıcıya NTT Studio'nun açık olduğunu sor. Başka yoldan yazmayı deneme."),
    "mod_belirtilmeli": "Bu araçta mod argümanı açıkça verilmeli (okuma da olsa).",
    "kaynak_dosyasi_gerekli": ("Kaynak satır içi gönderilmez: dosyaya yaz ve source_file ile ver. "
                               "Kalite kapısı dosyanın hash'ini inceleme kaydıyla eşliyor."),
    "inceleme_yok": ("Bu kaynak için inceleme kaydı yok. Önce abap-code-review çalıştır, sonra "
                     "axet_inceleme_kaydet ile kaydet."),
    "inceleme_eski": ("Kaynak incelemeden sonra değişmiş. abap-code-review'u bu kaynakla yeniden "
                      "çalıştır ve axet_inceleme_kaydet ile kaydet."),
    "kritik_bulgu": ("İncelemede kritik bulgu var: kritik bulgular düzeltilmeden SAP'a yazılmaz. "
                     "Aşma yolu yok; düzelt, yeniden incele."),
}


def _registered_names(mcp) -> set:
    return set(mcp._tool_manager._tools)


def _check_classification() -> None:
    sets = {"SERBEST": SERBEST, "TRANSPORT_ONAYLI": TRANSPORT_ONAYLI,
            "HER_SEFER": HER_SEFER, "KARMA": set(KARMA)}
    names = list(sets)
    bad = []
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            both = sets[a] & sets[b]
            if both:
                bad.append(f"    {a} & {b}: {', '.join(sorted(both))}\n")
    if bad:
        raise SystemExit("[adt-gated] BAŞLAMIYOR: bir araç iki sınıfta:\n" + "".join(bad))


def _check_drift(registered: set) -> None:
    classified = SERBEST | TRANSPORT_ONAYLI | HER_SEFER | set(KARMA)
    unknown = sorted(registered - classified)
    missing = sorted(classified - registered)
    if unknown:
        raise SystemExit(
            "[adt-gated] BAŞLAMIYOR: motor bu katmanın sınıflamadığı araç(lar) kaydediyor:\n"
            + "".join(f"    {n}\n" for n in unknown)
            + "  Her birinin okuyup okumadığına bir insan karar verip adt_gated_server.py'deki "
              "sınıflardan birine eklemeli.\n")
    if missing:
        raise SystemExit(
            "[adt-gated] BAŞLAMIYOR: sınıflanan araç(lar) motorda yok (yeniden adlandırılmış "
            "olabilir):\n" + "".join(f"    {n}\n" for n in missing))


def classify(arac: str, raw_kwargs: dict) -> str:
    """Çağrının sınıfı; KARMA araçta ham argümandaki moda göre. 'mod_belirtilmeli' dönebilir."""
    if arac in KARMA:
        param, norm, table = KARMA[arac]
        raw = raw_kwargs.get(param)
        if not isinstance(raw, str) or not raw.strip():
            return "mod_belirtilmeli"
        return table.get(norm(raw.strip()), H_S)
    if arac in HER_SEFER:
        return H_S
    if arac in TRANSPORT_ONAYLI:
        return T_O
    return S


def is_preview(arac: str, args: dict) -> bool:
    """Onaysız geçen, yazmayan çağrılar: önizleme silmeleri ve sabitlemeyi kaldırma.

    Motorun kendi onay koşulundan (force + eşleşen confirm) daha geniş: force ya da
    confirm dolu olan her çağrı pencereye gider, eşleşmese bile.
    """
    if arac == "adt_set_transport":
        return not str(args.get("transport") or "").strip()
    if arac == "adt_delete_object":
        return not (args.get("force") and str(args.get("confirm_name") or "").strip())
    if arac == "adt_delete_transport":
        return not (args.get("force") and str(args.get("confirm_transport") or "").strip())
    return False


def arg_hash(arac: str, args: dict, info: dict) -> str:
    """Kanonik JSON'un SHA-256'sı: argümanlar + pencerede görünen çözülmüş bilgi.

    Launcher onaylanan isteği yalnızca bu hash'le eşler. Bu yüzden çözülen transport,
    paketler ve kaynak hash'leri de içeride: onaydan sonra sabitlenen transport ya da
    düzenlenen kaynak dosyası yeni bir istek olur.
    """
    payload = {
        "arac": arac,
        "args": args,
        "transport": info.get("transport", ""),
        "paket": info.get("paket", ""),
        "nesneler": [[o.get("tip"), o.get("ad"), o.get("paket"), sorted(o.get("kaynak_sha256") or [])]
                     for o in info.get("nesneler", [])],
        "teslim": info.get("teslim"),
        "abapgit": info.get("abapgit"),
    }
    text = json.dumps(payload, sort_keys=True, ensure_ascii=True, separators=(",", ":"), default=str)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# --- launcher onay ucu ----------------------------------------------------------
class ApprovalUnavailable(Exception):
    pass


_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def _approval_env() -> tuple[str, str]:
    url = os.environ.get("ADT_APPROVAL_URL", "").strip().rstrip("/")
    token = os.environ.get("ADT_APPROVAL_TOKEN", "").strip()
    if not url or not token:
        raise ApprovalUnavailable("ADT_APPROVAL_URL / ADT_APPROVAL_TOKEN yok")
    return url, token


def _launcher(method: str, path: str, body: dict | None = None) -> dict:
    """Onay ucuna tek istek. 200 dışı, ağ hatası ya da JSON olmayan cevap → ApprovalUnavailable."""
    url, token = _approval_env()
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url + path, data=data, method=method, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with _OPENER.open(req, timeout=APPROVAL_TIMEOUT_S) as resp:
            text = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raise ApprovalUnavailable(f"onay ucu {exc.code} döndü")
    except (urllib.error.URLError, OSError) as exc:
        raise ApprovalUnavailable(f"onay ucuna ulaşılamadı: {exc}")
    try:
        out = json.loads(text)
    except ValueError:
        raise ApprovalUnavailable("onay ucunun cevabı JSON değil")
    if not isinstance(out, dict):
        raise ApprovalUnavailable("onay ucunun cevabı nesne değil")
    return out


def _post_quiet(path: str, body: dict) -> None:
    """Günlük bildirimi: başarısızlığı yazmayı durdurmaz, stderr'e not düşer."""
    try:
        _launcher("POST", path, body)
    except ApprovalUnavailable as exc:
        sys.stderr.write(f"[adt-gated] günlük bildirimi gitmedi ({path}): {exc}\n")


def _fail(error: str, message: str | None = None, **extra) -> dict:
    return {"ok": False, "error": error, "message": message or MESAJ.get(error, error), **extra}


def ask(fact: dict) -> tuple[dict | None, str | None]:
    """(izin, None) ya da (None, ret yükü). İzin yalnızca karar tam olarak 'izinli' ise."""
    try:
        out = _launcher("POST", "/approvals", fact)
    except ApprovalUnavailable as exc:
        return None, _fail("approval_unavailable", detail=str(exc))
    karar = out.get("karar")
    onay_id = out.get("id")
    mesaj = out.get("mesaj") if isinstance(out.get("mesaj"), str) and out.get("mesaj") else None
    if karar == "izinli" and isinstance(onay_id, str) and onay_id:
        return {"id": onay_id}, None
    if karar == "bekliyor" and isinstance(onay_id, str) and onay_id:
        return None, _fail("approval_pending", mesaj or MESAJ["approval_pending"], approval_id=onay_id)
    if karar in ("reddedildi", "sure_doldu"):
        return None, _fail("approval_denied", MSG_DENIED, karar=karar)
    if karar in ("yerel_mod", "mod_secilmedi"):
        return None, _fail(karar, mesaj or MESAJ[karar])
    return None, _fail("approval_unavailable", detail=f"anlaşılmayan karar: {karar!r}")


# --- bilgi + kalite + karar -----------------------------------------------------
def _sap():
    return engine._get_client()


def _project_dir() -> Path:
    return Path(os.getenv("ADT_CWD") or os.getcwd())


def quality_gate(arac: str, info: dict, pd: Path) -> dict | None:
    """Kaynaklı her nesnede inceleme kaydı kontrolü; ret yükü ya da None. kalite'yi nesneye yazar."""
    if not info.get("kalite"):
        return None
    for o in info["nesneler"]:
        reason, kalite = gq.check(pd, o["tip"], o["ad"], o.get("kaynak_sha256") or [])
        if kalite is not None:
            o["kalite"] = kalite
        if reason:
            _post_quiet("/events", {"tur": "kalite_reddi", "arac": arac,
                                    "nesneler": [{"ad": o["ad"], "tip": o["tip"]}], "sebep": reason})
            return _fail(reason, nesne=f"{o['tip']} {o['ad']}",
                         inceleme_dosyasi=str(gq.review_path(pd, o["tip"], o["ad"])))
    return None


def build_fact(arac: str, sinif: str, args: dict, info: dict) -> dict:
    fact = {
        "arac": arac,
        "sinif": sinif,
        "nesneler": info["nesneler"],
        "transport": info["transport"],
        "transport_bilgi": info["transport_bilgi"],
        "arg_hash": arg_hash(arac, args, info),
    }
    for key in ("paket", "teslim", "abapgit"):
        if info.get(key) is not None:
            fact[key] = info[key]
    return fact


def _atc_summary(name: str, object_type: str) -> dict:
    out = {"nesne": name, "tip": object_type}
    try:
        res = engine.adt_atc_check(name=name, object_type=object_type)
    except Exception as exc:  # noqa: BLE001 — ToolFailure dahil; ATC yazmayı geri almaz
        return {**out, "hata": str(exc)[:200]}
    findings = res.get("findings") or [] if isinstance(res, dict) else []
    counts: dict[str, int] = {}
    for f in findings:
        key = str((f or {}).get("priority", "?"))
        counts[key] = counts.get(key, 0) + 1
    return {**out, "toplam": len(findings), "oncelik": counts}


def run_atc(arac: str, args: dict) -> list | None:
    if arac == "adt_push":
        return [_atc_summary(args["name"], args["object_type"])]
    if arac == "adt_activate":
        items = args.get("objects") or [{"name": args.get("name"), "object_type": args.get("object_type")}]
        if len(items) > ATC_MAX_OBJECTS:
            return None
        return [_atc_summary(it.get("name"), it.get("object_type") or "class") for it in items]
    return None


def make_wrapper(arac: str, orig):
    sig = inspect.signature(orig)

    @functools.wraps(orig)
    def gated(**kwargs):
        sinif = classify(arac, kwargs)
        if sinif == "mod_belirtilmeli":
            param = KARMA[arac][0]
            return _fail("mod_belirtilmeli", f"{MESAJ['mod_belirtilmeli']} ({param})")
        bound = sig.bind(**kwargs)  # bilinmeyen/eksik argüman: TypeError → HTTP 400 bad_args
        bound.apply_defaults()
        args = dict(bound.arguments)
        if sinif == S or is_preview(arac, args):
            return orig(**kwargs)
        for key in INLINE_SOURCE_ARGS:
            if str(args.get(key) or "").strip():
                return _fail("kaynak_dosyasi_gerekli")
        pd = _project_dir()
        try:
            info = gc.collect(_sap(), arac, args, pd)
        except gc.CollectError as exc:
            return _fail(exc.reason, exc.message)
        except Exception as exc:  # noqa: BLE001 — SAP'a bağlanılamadı: bilgi yoksa onay yok
            return _fail("bilgi_toplanamadi", f"SAP'tan bilgi okunamadı: {exc}")
        refused = quality_gate(arac, info, pd)
        if refused:
            return refused
        grant, refused = ask(build_fact(arac, sinif, args, info))
        if refused:
            return refused
        call = dict(kwargs)
        if "transport" in sig.parameters and not str(args.get("transport") or "").strip() \
                and info.get("enjekte_transport"):
            call["transport"] = info["enjekte_transport"]
        try:
            result = orig(**call)
        except engine.ToolFailure as exc:
            try:
                payload = json.loads(str(exc))
            except ValueError:
                payload = {"ok": False, "error": "tool_failure", "message": str(exc)}
            _post_quiet("/results", {"id": grant["id"], "sap_sonucu": payload})
            raise
        except Exception as exc:
            _post_quiet("/results", {"id": grant["id"], "sap_sonucu": {
                "ok": False, "error": type(exc).__name__, "message": str(exc)}})
            raise
        body = {"id": grant["id"], "sap_sonucu": result if isinstance(result, dict) else {"ok": True}}
        if isinstance(result, dict):
            atc = run_atc(arac, args)
            if atc is not None:
                result["axet_atc"] = atc
                body["atc"] = atc
            corrnr = str(result.get("corrnr") or "").upper()
            if corrnr and info["transport"] and corrnr != info["transport"]:
                result["axet_uyari"] = (f"Onaylanan transport {info['transport']}, SAP'ın kaydettiği "
                                        f"{corrnr}. Kullanıcıya söyle.")
        _post_quiet("/results", body)
        return result

    gated._axet_gated = True
    return gated


# --- katmanın kendi araçları -----------------------------------------------------
def _ask_for(arac: str, args: dict, info: dict, pd: Path, *, extra: dict | None = None) -> dict:
    refused = quality_gate(arac, info, pd)
    if refused:
        return refused
    fact = build_fact(arac, T_O, args, info)
    if extra:
        fact.update(extra)
    grant, refused = ask(fact)
    if refused:
        return refused
    return {"ok": True, "onay_id": grant["id"]}


def axet_teslim(nesneler: list | None = None, paket: str = "", transport: str = "",
                yontem: str = "adt", zip_dosyasi: str = "") -> dict:
    """Yerel modda biten işi tek pencerede SAP'a teslim için onay iste. SAP'a YAZMAZ.

    nesneler: [{"ad": "ZCL_X", "tip": "class", "kaynak_dosyasi": "src/zcl_x.clas.abap"}, ...]
    (yontem="adt"); yontem="abapgit" ise zip_dosyasi verilir, nesneler ZIP'ten okunur.
    Her kaynaklı nesnenin abap-code-review kaydı (axet_inceleme_kaydet) güncel olmalı.
    ok:true dönerse aynı nesneleri aynı kaynak dosyalarıyla, aynı transport'a normal
    araçlarla (adt_push, adt_activate ...) yaz; o çağrılar pencere açmadan geçer.
    """
    args = {"nesneler": nesneler, "paket": paket, "transport": transport,
            "yontem": yontem, "zip_dosyasi": zip_dosyasi}
    pd = _project_dir()
    try:
        info = gc.collect_teslim(_sap(), pd, nesneler, paket, transport, yontem, zip_dosyasi)
    except gc.CollectError as exc:
        return _fail(exc.reason, exc.message)
    except Exception as exc:  # noqa: BLE001
        return _fail("bilgi_toplanamadi", f"SAP'tan bilgi okunamadı: {exc}")
    out = _ask_for("axet_teslim", args, info, pd)
    if out.get("ok"):
        out["message"] = ("Teslim onaylandı. Şimdi aynı nesneleri aynı kaynak dosyalarıyla ve aynı "
                          "transport'la yaz; listede olmayan ya da değişmiş kaynak reddedilir.")
    return out


def axet_abapgit_onay(script: str, paket: str = "", transport: str = "",
                      zip_dosyasi: str = "", ust_onay: str = "") -> dict:
    """abapgit-deploy script'lerinin (tier_gate.py) SAP'a yazmadan önce sorduğu onay. SAP'a YAZMAZ."""
    args = {"script": script, "paket": paket, "transport": transport,
            "zip_dosyasi": zip_dosyasi, "ust_onay": ust_onay}
    pd = _project_dir()
    try:
        info = gc.collect_abapgit(_sap(), pd, script, paket, transport, zip_dosyasi)
    except gc.CollectError as exc:
        return _fail(exc.reason, exc.message)
    except Exception as exc:  # noqa: BLE001
        return _fail("bilgi_toplanamadi", f"SAP'tan bilgi okunamadı: {exc}")
    extra = {"ust_onay": ust_onay.strip()} if ust_onay and ust_onay.strip() else None
    return _ask_for("axet_abapgit_onay", args, info, pd, extra=extra)


def axet_inceleme_kaydet(nesne: str, tip: str, kaynak_dosyalari: list, bulgular: dict,
                         rapor: str = "", skill: str = "abap-code-review") -> dict:
    """abap-code-review bittikten sonra inceleme kaydını yaz (.sap-review/<TIP>_<NESNE>.json).

    Hash'leri sunucu kaynak dosyalarından hesaplar; ajan hash yazmaz. bulgular:
    {"kritik": n, "yuksek": n, "orta": n, "dusuk": n}. Kritik > 0 ise kayıt yazılır ama
    o kaynak SAP'a gönderilemez.
    """
    pd = _project_dir()
    try:
        ad = gc._name(nesne, "nesne")
        r3 = gc.r3tr(tip)
        rec = gq.write_review(pd, ad, r3, kaynak_dosyalari, bulgular, rapor=rapor, skill=skill)
    except gc.CollectError as exc:
        return _fail(exc.reason, exc.message)
    except ValueError as exc:
        return _fail("gecersiz_inceleme", str(exc))
    out = {"ok": True, "kayit": str(gq.review_path(pd, r3, ad)),
           "kaynak_sha256": rec["kaynak_sha256"], "bulgular": rec["bulgular"]}
    if rec["bulgular"]["kritik"] > 0:
        out["message"] = MESAJ["kritik_bulgu"]
    return out


# --- kalp atışı -------------------------------------------------------------------
class Heartbeat:
    """Launcher'ın onay ucunu yoklar; üst üste `max_miss` kaçırmada on_dead çağrılır.

    401 de kaçırmadır: launcher yeniden başladıysa eski token ölüdür ve bu sunucu
    artık hiçbir yazmaya onay alamaz; portu yeni launcher'a bırakmalı.
    """

    def __init__(self, interval: float = 10.0, max_miss: int = 3, on_dead=None):
        self.interval = interval
        self.max_miss = max_miss
        self.on_dead = on_dead or _die
        self.misses = 0
        self._stop = threading.Event()

    def tick(self) -> bool:
        try:
            ok = _launcher("GET", "/health").get("ok") is True
        except ApprovalUnavailable:
            ok = False
        self.misses = 0 if ok else self.misses + 1
        if self.misses >= self.max_miss:
            self.on_dead()
            return False
        return True

    def run(self) -> None:
        while not self._stop.wait(self.interval):
            if not self.tick():
                return

    def start(self) -> threading.Thread:
        t = threading.Thread(target=self.run, name="axet-heartbeat", daemon=True)
        t.start()
        return t

    def stop(self) -> None:
        self._stop.set()


def _die() -> None:
    sys.stderr.write("[adt-gated] NTT Studio'nun onay ucu yanıt vermiyor; süren çağrı bitince "
                     "kapanıyorum.\n")
    sys.stderr.flush()
    # Kilidi alan son çağrı biter; kilidi tuttuğumuz için yenisi başlamaz (503).
    engine._HTTP_CALL_LOCK.acquire(timeout=180)
    os._exit(3)


# --- kurulum ------------------------------------------------------------------------
def build() -> set:
    """Sınıflamayı doğrula, yazan araçları sarmala, axet araçlarını kaydet. Araç kümesini döner."""
    mcp = engine.mcp
    _check_classification()
    _check_drift(_registered_names(mcp))
    for name in sorted(TRANSPORT_ONAYLI | HER_SEFER | set(KARMA)):
        setattr(engine, name, make_wrapper(name, getattr(engine, name)))
    for fn in (axet_teslim, axet_abapgit_onay, axet_inceleme_kaydet):
        setattr(engine, fn.__name__, mcp.tool()(fn))
    return _registered_names(mcp)


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="NTT Studio — onaylı SAP ADT sunucusu (DEV)")
    ap.add_argument("--http", action="store_true", help="HTTP taşıması (zorunlu)")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--list-tools", action="store_true",
                    help="Araçları sınıflarıyla yaz ve çık (SAP bağlantısı yok)")
    args = ap.parse_args(argv)
    if not args.http and not args.list_tools:
        raise SystemExit("[adt-gated] BAŞLAMIYOR: yalnızca --http ile çalışır. stdio MCP yolu "
                         "araçları kendi tablosundan çağırır ve onay katmanını atlardı.\n")
    tools = build()
    if args.list_tools:
        for name in sorted(tools):
            sinif = "AXET" if name in AXET_TOOLS else ("KARMA" if name in KARMA else classify(name, {}))
            sys.stdout.write(f"{name}  [{sinif}]\n")
        return
    try:
        _approval_env()
        Heartbeat().start()
    except ApprovalUnavailable:
        sys.stderr.write("[adt-gated] UYARI: ADT_APPROVAL_URL/ADT_APPROVAL_TOKEN yok; her yazma "
                         "approval_unavailable ile reddedilecek.\n")
    sys.stderr.write(f"[adt-gated] onaylı yüzey: {len(tools)} araç "
                     f"({len(TRANSPORT_ONAYLI | HER_SEFER | set(KARMA))} yazan araç onaya bağlı)\n")
    sys.stderr.flush()
    engine.run_http(args.host, args.port)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_flow.py`
Expected: son satır `25/25 geçti`, çıkış kodu 0.

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_collect.py` ve `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_quality.py`
Expected: `20/20 geçti` ve `12/12 geçti` (Task 3 bozulmadı).

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/adt_gated_server.py --list-tools`
Expected: 53 satır; `adt_push  [TRANSPORT_ONAYLI]`, `adt_delete_object  [HER_SEFER]`, `adt_message_class  [KARMA]`, `axet_teslim  [AXET]`, `adt_sql  [SERBEST]`.

Run: `py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/adt_gated_server.py`
Expected: `[adt-gated] BAŞLAMIYOR: yalnızca --http ile çalışır...`, çıkış kodu 1.

- [ ] **Step 5: Commit**

```bash
git add resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/adt_gated_server.py resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_flow.py
git commit -m "SAP yazma onayi: gated sunucu (Python)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Launcher 8787'yi DEV'de onaylı başlatıyor (yönetici + `launcher.ts`)

DEV + teknik danışmanda 8787'de artık `adt_mcp_server.py` değil `adt_gated_server.py` (Task 4) çalışır. Launcher bağlanırken önce onay oturumunu açar (Task 2 `openWriteSession`), oturumun adresini ve token'ını yalnızca bu çocuğun ortamına koyar (`ADT_APPROVAL_URL`, `ADT_APPROVAL_TOKEN`), sonra sunucuyu başlatır.

Yöneticinin (`adtReadonlyServerManager.ts`) üç yeni kuralı var:

1. **Gated modda portta duran hiçbir sunucu devralınmaz.** Devralınan process'in ortamındaki onay token'ını bilemeyiz: ya ölü bir oturuma sorar (her yazma `approval_unavailable`) ya da başka projenin oturumuna. Canlı ve bizim token'ımızı kabul eden sunucu → `adtServer.gatedPortBusy`. 401 dönen sunucu (önceki launcher'dan kalan gated sunucu, onay ucu artık onu tanımıyor ve kalp atışında kendini kapatacak) → en çok 45 sn portun boşalması beklenir, boşalmazsa `adtServer.foreignTokenGated`. Hiçbir durumda sahibi olmadığımız process öldürülmez.
2. **Port tek, sahibi tek proje.** Portu bizim başlattığımız BAŞKA bir projenin sunucusu tutuyorsa o durdurulur ve port TCP ile boşalana kadar beklenir (`py` başlatıcısını öldürmek Python'u da kapatıyor; ölçüldü, port 300 ms'den kısa sürede boşalıyor). Eskiden portta "sağlıklı bir sunucu" bulunup devralınıyordu; oysa o sunucu öbür projenin klasöründe, öbür projenin `.conn_adt`'ıyla çalışıyordu (gated olmayan modda da gerçek bir hataydı; burada birlikte kapanıyor).
3. **Aynı projede oturum değişirse sunucu yeniden başlar.** Gated'da yüzey yetmez, çocuğun ortamındaki token o anki oturumun token'ı olmalı. Launcher her bağlanışta yeni oturum açtığı için DEV'e yeniden bağlanmak gated sunucuyu yeniden başlatır (birkaç saniye).

Ayrıca:
- `/health`'te `axet_teslim` varsa sunucu gated sayılır (`HealthInfo.gated`). Gated olmayan istek de gated sunucuyu devralmaz (`surfaceMismatch`).
- Başlatma sonrası sağlık beklemesi yalnızca "ayakta mı"ya değil yüzeye de bakar: başlattığımız process portu alamadıysa cevap veren başkası olabilir.
- Çocuğa `ADT_CWD=<projectDir>` açıkça verilir: motor `.conn_adt`'ı, gated katman `.sap-review/`'u oradan okuyor; launcher ortamından miras kalan bir `ADT_CWD` başka projenin sistemine bağlardı.

Launcher tarafı:
- Bu bağlantı 8787'yi alacaksa önce `closeAllWriteSessions()` (başka projelerin oturumları artık hiçbir sunucuya ait değil; açık kalsalar NTT Studio ölü bir oturum için mod sorardı), DEV yazma yüzeyiyse `openWriteSession(projectDir, {sid, client, user})`.
- Onay ucu açılamazsa DEV'e onaysız yazan sunucu AÇILMAZ; `detailNote` bunu söyler.
- Başlatma başarısızsa oturum kapatılır.
- `launcher.ts` `ADT_APPROVAL_TOKEN` ve `getAdtHttpToken` İÇERMEZ (test ediliyor): ortam değişkeninin adı yalnızca yöneticide, token launcher'da yalnızca bellekte bir değer olarak geçer.
- Uygulama kapanışında oturumların kapatılması ve `stopApprovalServer` Task 6'da (`index.ts`).

Bu task Task 1-2'nin dosyalarına (`sapWrite/server.ts`, `sapWrite/policy.ts`) bağlı; önce onlar işlenmiş olmalı.

**Files:**
- Modify: `app-electron/main/adtReadonlyServerManager.ts` (tamamı aşağıda)
- Modify: `app-electron/main/launcher.ts:11` (import), `:308-319` (`adtServerScriptFor` ve yorumu), `:321-365` (`attemptReadonlyServerAutoStart`), `:1235` (çağrı yeri)
- Modify: `app-electron/main/i18n/tr.ts`, `app-electron/main/i18n/en.ts` (üç anahtar, `adtServer.spawnFailed`'dan hemen önce)
- Test: `tests/adtHttpToken.test.ts` (tamamı aşağıda)

**Interfaces:**
- Consumes (Task 2): `openWriteSession(projectDir: string, identity: Identity): Promise<{ url: string; token: string; sessionId: string }>`, `closeWriteSession(projectDir: string): void`, `closeAllWriteSessions(): void`. (Task 1): `Identity { sid: string; client: string; user: string }` (`app-electron/main/sapWrite/policy.ts`).
- Consumes (Task 4): `adt_gated_server.py --http --port <n>` ortamdan `ABAP_HTTP_TOKEN`, `ADT_APPROVAL_URL`, `ADT_APPROVAL_TOKEN`, `ADT_CWD` okur; `/health` araç listesinde `axet_teslim` vardır.
- Produces:
  - `ReadonlyServerStartOptions.gate?: ApprovalGate`, `ReadonlyServerStartOptions.staleWaitMs?: number` (yalnızca testler), `export interface ApprovalGate { url: string; token: string }`.
  - i18n anahtarları: `adtServer.gatedPortBusy {port}`, `adtServer.foreignTokenGated {port}`, `adtServer.previousStillRunning {port}`.
  - `adtServerScriptFor(true).rel` = `["sap-adt", "scripts", "adt_gated_server.py"]` — Task 8'in talimat metni (`buildContextMarkdown`) bu yolu `adtServerScript` olarak zaten okuyor.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/adtHttpToken.test.ts`'in TAMAMI (mevcut testler aynen duruyor; yeni olanlar `FAKE_GATED_SERVER`, `projectDir`, `health`, `foreignServer`, `GATE_A/B`, "onaylı (gated) sunucu" bloğu ve "ajana verilen komutlar"daki iki ek):

```ts
// 8787'deki yazma sunucusuyla bearer token sözleşmesi.
//
// Yeniden üretilen arıza (2026-09-23, MAYA, DEV + teknik danışman): yazan motor
// (`adt_mcp_server.py --http`) `ABAP_HTTP_TOKEN` verilmezse kendi token'ını
// üretiyor ve `/health` DAHİL her isteğe token'sız 401 dönüyor. Launcher onu
// token'sız başlatıp token'sız yokluyordu; 401'i "ölü" sayıp 15 sn sonra
// sunucuyu kendi eliyle öldürüyordu. Log'da "listening" yazarken ajan
// "SAP aracı yok" diyordu. 1.6.7'de görünmüyordu çünkü o sürüm her sistemde
// token istemeyen salt-okur sunucuyu açıyordu.
//
// Sahte sunucu motorun kapısını birebir taklit ediyor (adt_mcp_server.py,
// `_guard` → `_auth_ok`): token'ı YALNIZCA ortamdan okuyor, `/health` de
// kapının arkasında. Python PATH'te olmadığı için gerçek motor değil, onun
// sözleşmesi test ediliyor.
//
// `.ts` (`.tsx` değil): `app-electron/main`'den import ediyor, node tsconfig'ine ait.

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

// i18n → store → electron zinciri testte yüklenemiyor; metnin kendisi değil
// hangi anahtarın seçildiği önemli.
vi.mock("../app-electron/main/i18n", () => ({
  mt: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
}));

const { getAdtHttpToken } = await import("../app-electron/main/adtHttpToken");
const { startReadonlyServer, stopAllReadonlyServers } = await import("../app-electron/main/adtReadonlyServerManager");
const { axetSpawnEnv } = await import("../app-electron/main/axetSpawnEnv");

/** Boş bir port: 0'a bağlan, işletim sisteminin verdiğini oku, bırak. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      s.close(() => (typeof addr === "object" && addr ? resolve(addr.port) : reject(new Error("port yok"))));
    });
  });
}

// Yazan motorun HTTP kapısının kopyası. Token ortamdan; yoksa üretir ve
// token'sız her isteği reddeder — gerçek motorun varsayılanı tam olarak bu.
const FAKE_WRITE_SERVER = `
const http = require("node:http");
const crypto = require("node:crypto");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const token = (process.env.ABAP_HTTP_TOKEN || "").trim() || crypto.randomBytes(32).toString("base64url");
http.createServer((req, res) => {
  if (req.headers.authorization !== "Bearer " + token) {
    res.writeHead(401, { "WWW-Authenticate": "Bearer" });
    return res.end('{"ok":false,"error":"unauthorized"}');
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, tool_count: 2, tools: ["adt_get_source", "adt_push"] }));
}).listen(port, "127.0.0.1", () => process.stderr.write("[adt-http] listening\\n"));
`;

// Onay katmanının (adt_gated_server.py) kopyası: aynı token kapısı, araç
// listesinde `axet_teslim`, ve test için /health'te ortamdan aldığı onay
// adresi/token'ı ile çalışma klasörü. Gerçek sunucu bunları DÖNDÜRMEZ; burada
// yalnızca launcher'ın çocuğa ne verdiğini görmek için.
const FAKE_GATED_SERVER = `
const http = require("node:http");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const token = (process.env.ABAP_HTTP_TOKEN || "").trim();
http.createServer((req, res) => {
  if (!token || req.headers.authorization !== "Bearer " + token) {
    res.writeHead(401, { "WWW-Authenticate": "Bearer" });
    return res.end('{"ok":false,"error":"unauthorized"}');
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    ok: true, tool_count: 3, tools: ["adt_get_source", "adt_push", "axet_teslim"],
    approvalUrl: process.env.ADT_APPROVAL_URL || null,
    approvalToken: process.env.ADT_APPROVAL_TOKEN || null,
    cwd: process.cwd(),
    adtCwd: process.env.ADT_CWD || null
  }));
}).listen(port, "127.0.0.1", () => process.stderr.write("[adt-http] listening\\n"));
`;

let workDir = "";
let fakeScript = "";
let fakeGatedScript = "";

beforeAll(() => {
  workDir = mkdtempSync(path.join(tmpdir(), "adt-token-"));
  fakeScript = path.join(workDir, "fake_adt_server.cjs");
  writeFileSync(fakeScript, FAKE_WRITE_SERVER);
  fakeGatedScript = path.join(workDir, "fake_gated_server.cjs");
  writeFileSync(fakeGatedScript, FAKE_GATED_SERVER);
});

function projectDir(name: string): string {
  const dir = path.join(workDir, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 8787'ye ajanın gönderdiği gibi (ADT token'ıyla) /health. */
function health(port: number): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    httpRequest(
      { host: "127.0.0.1", port, path: "/health", headers: { Authorization: `Bearer ${process.env.ABAP_HTTP_TOKEN}` } },
      (res) => {
        let text = "";
        res.setEncoding("utf-8");
        res.on("data", (c: string) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : {} }));
      }
    )
      .on("error", reject)
      .end();
  });
}

/** Test içinde, sahibi launcher OLMAYAN bir sunucu. */
async function foreignServer(port: number, handler: Parameters<typeof createServer>[1]): Promise<Server> {
  const srv = createServer(handler);
  foreign.push(srv);
  await new Promise<void>((r) => srv.listen(port, "127.0.0.1", () => r()));
  return srv;
}

const GATE_A = { url: "http://127.0.0.1:1", token: "a".repeat(64) };
const GATE_B = { url: "http://127.0.0.1:2", token: "b".repeat(64) };

const foreign: Server[] = [];
afterEach(() => {
  stopAllReadonlyServers();
  for (const s of foreign.splice(0)) s.close();
});

describe("token", () => {
  it("süreç boyunca TEK token: iki çağrı aynı değeri veriyor ve ortama yazılıyor", () => {
    const a = getAdtHttpToken();
    expect(a).toBe(getAdtHttpToken());
    expect(process.env.ABAP_HTTP_TOKEN).toBe(a);
    // 32 rastgele bayt, base64url → 43 karakter.
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it("ajan token'ı görüyor: bağlayıcılar açık da kapalı da", () => {
    const token = getAdtHttpToken();
    expect(axetSpawnEnv(true).ABAP_HTTP_TOKEN).toBe(token);
    expect(axetSpawnEnv(false).ABAP_HTTP_TOKEN).toBe(token);
  });

  it("ortamdaki değer silinse bile token DEĞİŞMİYOR (çalışan sunucuyla eşleşme bozulmasın)", () => {
    const token = getAdtHttpToken();
    delete process.env.ABAP_HTTP_TOKEN;
    // axetSpawnEnv token'ı ortama bırakmıyor, kendisi istiyor.
    expect(axetSpawnEnv(false).ABAP_HTTP_TOKEN).toBe(token);
    expect(process.env.ABAP_HTTP_TOKEN).toBe(token);
  });
});

describe("yazma sunucusu ayağa kalkıyor", () => {
  it("launcher'ın başlattığı sunucu token'lı yoklamaya cevap veriyor ve ÖLDÜRÜLMÜYOR", async () => {
    const port = await freePort();
    const result = await startReadonlyServer({
      projectDir: workDir,
      scriptPath: fakeScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true
    });
    expect(result.message).toBe("adtServer.started " + JSON.stringify({ port }));
    expect(result.ok).toBe(true);

    // Ajanın yapacağı çağrı: aynı ortamdaki token'la.
    const status = await new Promise<number>((resolve, reject) => {
      httpRequest(
        { host: "127.0.0.1", port, path: "/health", headers: { Authorization: `Bearer ${process.env.ABAP_HTTP_TOKEN}` } },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        }
      )
        .on("error", reject)
        .end();
    });
    expect(status).toBe(200);
  }, 20_000);

  it("portta token'ını BİLMEDİĞİMİZ bir sunucu varsa bunu ADIYLA söylüyor", async () => {
    // Önceki bir oturumdan kalmış, başka token'lı sunucu.
    const port = await freePort();
    const stale = createServer((_req, res) => {
      res.writeHead(401, { "WWW-Authenticate": "Bearer" });
      res.end();
    });
    foreign.push(stale);
    await new Promise<void>((r) => stale.listen(port, "127.0.0.1", () => r()));

    const result = await startReadonlyServer({
      projectDir: workDir,
      scriptPath: fakeScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true
    });
    expect(result.ok).toBe(false);
    expect(result.external).toBe(true);
    expect(result.message).toContain("adtServer.foreignToken");
  });
});

describe("onaylı (gated) sunucu", () => {
  it("onay adresi ve token'ı YALNIZCA çocuğun ortamına gidiyor, launcher'ın ortamına değil", async () => {
    const port = await freePort();
    const result = await startReadonlyServer({
      projectDir: projectDir("gated-env"),
      scriptPath: fakeGatedScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true,
      gate: GATE_A
    });
    expect(result.ok).toBe(true);
    const { body } = await health(port);
    expect(body.approvalUrl).toBe(GATE_A.url);
    expect(body.approvalToken).toBe(GATE_A.token);
    // Ajan launcher'ın ortamını miras alıyor.
    expect(process.env.ADT_APPROVAL_TOKEN).toBeUndefined();
    expect(process.env.ADT_APPROVAL_URL).toBeUndefined();
  }, 20_000);

  it("aynı oturum: yeniden başlatılmıyor; yeni oturum: yeniden başlıyor ve yeni token çocukta", async () => {
    const port = await freePort();
    const dir = projectDir("gated-session");
    const base = { projectDir: dir, scriptPath: fakeGatedScript, pythonPath: process.execPath, port, expectWritable: true };
    expect((await startReadonlyServer({ ...base, gate: GATE_A })).ok).toBe(true);
    const again = await startReadonlyServer({ ...base, gate: GATE_A });
    expect(again.alreadyRunning).toBe(true);
    const next = await startReadonlyServer({ ...base, gate: GATE_B });
    expect(next.ok).toBe(true);
    expect(next.alreadyRunning).toBe(false);
    expect((await health(port)).body.approvalToken).toBe(GATE_B.token);
  }, 40_000);

  it("gated modda portta canlı bir sunucu DEVRALINMIYOR ve öldürülmüyor", async () => {
    const port = await freePort();
    await foreignServer(port, (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, tools: ["adt_push", "axet_teslim"] }));
    });
    const result = await startReadonlyServer({
      projectDir: projectDir("gated-busy"),
      scriptPath: fakeGatedScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true,
      gate: GATE_A
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("adtServer.gatedPortBusy");
    expect((await health(port)).status).toBe(200);
  });

  it("gated olmayan istek de portta duran gated sunucuyu devralmıyor", async () => {
    const port = await freePort();
    await foreignServer(port, (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, tools: ["adt_push", "axet_teslim"] }));
    });
    const result = await startReadonlyServer({
      projectDir: projectDir("plain-vs-gated"),
      scriptPath: fakeScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("adtServer.surfaceMismatch");
  });

  it("401 dönen eski sunucu kapanınca yenisi başlıyor (öldürülmeden beklendi)", async () => {
    const port = await freePort();
    const stale = await foreignServer(port, (_req, res) => {
      res.writeHead(401, { "WWW-Authenticate": "Bearer" });
      res.end();
    });
    // Önceki launcher'ın gated sunucusu: kalp atışı kaçırınca kendini kapatır.
    setTimeout(() => stale.close(), 1000);
    const result = await startReadonlyServer({
      projectDir: projectDir("gated-stale"),
      scriptPath: fakeGatedScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true,
      gate: GATE_A,
      staleWaitMs: 10_000
    });
    expect(result.ok).toBe(true);
    expect(result.alreadyRunning).toBe(false);
    expect((await health(port)).body.approvalToken).toBe(GATE_A.token);
  }, 30_000);

  it("401 dönen sunucu kapanmazsa bunu adıyla söylüyor ve öldürmüyor", async () => {
    const port = await freePort();
    await foreignServer(port, (_req, res) => {
      res.writeHead(401, { "WWW-Authenticate": "Bearer" });
      res.end();
    });
    const result = await startReadonlyServer({
      projectDir: projectDir("gated-stale-stuck"),
      scriptPath: fakeGatedScript,
      pythonPath: process.execPath,
      port,
      expectWritable: true,
      gate: GATE_A,
      staleWaitMs: 800
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("adtServer.foreignTokenGated");
    expect((await health(port)).status).toBe(401);
  });

  it("başka projenin (bizim) sunucusu durdurulup port boşalınca yenisi o projenin klasöründe başlıyor", async () => {
    const port = await freePort();
    const dirA = projectDir("proj-a");
    const dirB = projectDir("proj-b");
    const base = { scriptPath: fakeGatedScript, pythonPath: process.execPath, port, expectWritable: true };
    expect((await startReadonlyServer({ ...base, projectDir: dirA, gate: GATE_A })).ok).toBe(true);
    const b = await startReadonlyServer({ ...base, projectDir: dirB, gate: GATE_B });
    expect(b.ok).toBe(true);
    expect(b.external).toBe(false);
    expect(b.alreadyRunning).toBe(false);
    const { body } = await health(port);
    expect(body.approvalToken).toBe(GATE_B.token);
    expect(path.resolve(String(body.cwd))).toBe(path.resolve(dirB));
    expect(body.adtCwd).toBe(dirB);
  }, 40_000);
});

describe("ajana verilen komutlar", () => {
  it("sap-context.md'deki her 8787 çağrısı token başlığını taşıyor, token'ın DEĞERİNİ taşımıyor", () => {
    const launcher = readFileSync(path.join(__dirname, "..", "app-electron", "main", "launcher.ts"), "utf8");
    const calls = launcher.match(/requests\.(get|post)\('http:\/\/127\.0\.0\.1:8787[^\n]*/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const call of calls) expect(call).toContain("ABAP_HTTP_TOKEN");
    // Proje klasörü OneDrive'da senkronlanıyor: değer oraya yazılmamalı.
    // sap-context.md'yi üreten modül token'ın kendisine hiç erişmiyor.
    expect(launcher).not.toContain("getAdtHttpToken");
    // Onay token'ı da: launcher onu yalnızca yöneticiye değer olarak geçiriyor.
    expect(launcher).not.toContain("ADT_APPROVAL_TOKEN");
  });

  it("DEV'in yazan yüzeyi motorun kendisi değil, onay katmanı", () => {
    const launcher = readFileSync(path.join(__dirname, "..", "app-electron", "main", "launcher.ts"), "utf8");
    expect(launcher).toContain('["sap-adt", "scripts", "adt_gated_server.py"]');
    expect(launcher).not.toContain('["sap-adt", "scripts", "adt_mcp_server.py"]');
  });
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/adtHttpToken.test.ts`
Expected: 14 testten 8'i FAIL — "onaylı (gated) sunucu" bloğunun yedisi (ör. `approvalToken` `null` geliyor çünkü `gate` yok sayılıyor; `gatedPortBusy` yerine `externalOnPort`; başka projenin sunucusu devralınıp `alreadyRunning: true`) ve "DEV'in yazan yüzeyi motorun kendisi değil, onay katmanı". Eski 6 test geçer.

- [ ] **Step 3: Yöneticiyi yaz**

`app-electron/main/adtReadonlyServerManager.ts`'in TAMAMI (`healthCheck` kalkıyor, yerini `probeHealth` + `surfaceMatches` alıyor):

```ts
import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { request as httpRequest } from "node:http";
import { connect as netConnect } from "node:net";
import { getAdtHttpToken } from "./adtHttpToken";
import { mt } from "./i18n";

// `adt_readonly_server.py`'yi (bkz. resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/scripts)
// launcher'ın kendisi başlatır — RFC bridge otomatik başlatmasıyla (rfcBridgeManager.ts)
// BİREBİR AYNI desen: kullanıcı/agent artık her bağlanışta elle
// "ADT_CWD=$(pwd) py adt_readonly_server.py --port 8787" çalıştırmak zorunda değil,
// terminal açıldığında %sap-adt-readonly zaten canlı bir sunucuya sahiptir.
//
// Bu sunucu (RFC bridge'in aksine) pyrfc/SAP NW RFC SDK'ya HİÇ ihtiyaç duymuyor —
// sadece `requests`/`mcp`/`python-dotenv` (bkz. requirements.txt), düz HTTP(S)
// ile ADT'ye (veya router-only sistemlerde yerel RFC bridge'e) konuşuyor. Bu
// yüzden gömülü RFC runtime'ı KULLANILMIYOR, sistemdeki "py" çalıştırıcısı
// kullanılıyor (mevcut elle kurulum dokümantasyonuyla aynı varsayım).

export interface ReadonlyServerStartOptions {
  projectDir: string;
  scriptPath: string;
  pythonPath: string;
  port: number;
  /**
   * DEV sistemde yazan motoru (33 araç), aksi hâlde sarmalayıcıyı (17 araç)
   * başlatıyoruz. Bu bayrak, portta ZATEN duran bir sunucuyu sahiplenmeden
   * önce onun gerçekten doğru yüzey olduğunu doğrulamak için gerekiyor —
   * bkz. `probeHealth`/`surfaceMismatch`.
   */
  expectWritable: boolean;
  /**
   * DEV'de yazan motor doğrudan değil, onay katmanıyla (`adt_gated_server.py`)
   * başlıyor ve her yazmayı launcher'ın onay ucuna soruyor. Adres ve oturum
   * token'ı YALNIZCA bu çocuğun ortamına konur, `process.env`'e değil: ajan
   * (axet-code) launcher'ın ortamını miras alıyor ve onay oturumunu tanıması
   * için hiçbir sebep yok.
   */
  gate?: ApprovalGate;
  /**
   * Gated modda portta token'ını bilmediğimiz (401) bir sunucu varsa, önceki
   * launcher'dan kalmış gated sunucunun kalp atışıyla kapanması bu kadar
   * beklenir. Yalnızca testler kısaltır.
   */
  staleWaitMs?: number;
}

export interface ApprovalGate {
  url: string;
  token: string;
}

export interface ReadonlyServerStartResult {
  ok: boolean;
  alreadyRunning: boolean;
  external: boolean;
  message: string;
}

interface RunningServer {
  proc: ChildProcess | null;
  port: number;
  logStream: WriteStream | null;
  tail: string[];
  exited: boolean;
  exitInfo: string;
  external: boolean;
  /** Bu process'e verilen onay oturumu token'ı; gated değilse null. */
  gateToken: string | null;
}

/**
 * Önceki launcher'dan kalan gated sunucu, onay ucu artık onu tanımadığı için
 * kalp atışında (10 sn aralık, 3 kaçırma) kendini kapatır. Üstüne pay.
 */
const STALE_GATED_WAIT_MS = 45_000;
/** Kendi durdurduğumuz process'in portu bırakması (ölçüldü: 300 ms'den az). */
const OWN_STOP_WAIT_MS = 10_000;

const running = new Map<string, RunningServer>();

function pushTail(server: RunningServer, chunk: Buffer): void {
  const text = chunk.toString("utf-8");
  server.logStream?.write(text);
  server.tail.push(text);
  if (server.tail.length > 60) server.tail.shift();
}

/**
 * `/health` cevabı. `tools` alanı iki sunucuda da var ve ASIL KAYNAK odur:
 * yazan motor `adt_push`'ı listeler, sarmalayıcı listelemez çünkü o araç MCP
 * kaydına hiç girmemiştir. Yani yüzeyi bir etiketten değil, sunucunun kendi
 * saydığı araçlardan okuyoruz.
 */
interface HealthInfo {
  alive: boolean;
  writable: boolean;
  toolCount: number;
  /**
   * Portta biri var ama bizim token'ımızı reddediyor (401): önceki bir
   * oturumdan kalmış, başka token'la başlamış bir yazma sunucusu. "Ölü" ile
   * aynı şey değil — üstüne spawn etmek EADDRINUSE'a düşer.
   */
  unauthorized: boolean;
  /**
   * Onay katmanı (`adt_gated_server.py`): motorun araçlarına ek olarak
   * `axet_teslim`'i listeler. Motorun kendisi de `adt_push`'u listelediği için
   * `writable` ikisini ayırmıyor.
   */
  gated: boolean;
}

const DEAD: HealthInfo = { alive: false, writable: false, toolCount: 0, unauthorized: false, gated: false };

function probeHealth(port: number, timeoutMs = 2000): Promise<HealthInfo> {
  return new Promise((resolve) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port,
        path: "/health",
        method: "GET",
        timeout: timeoutMs,
        // Yazan motor `/health`'i de kapının arkasında tutuyor; token'sız
        // yoklama ayakta bir sunucuyu ölü sanıp öldürüyordu (bkz. adtHttpToken.ts).
        headers: { Authorization: `Bearer ${getAdtHttpToken()}` }
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status === 401) {
          res.resume();
          resolve({ ...DEAD, unauthorized: true });
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          resolve(DEAD);
          return;
        }
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk: string) => {
          // 33 araç adı birkaç KB; sınırı aşan bir cevap bizim sunucumuz değil.
          if (body.length < 64_000) body += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body) as { tools?: unknown; tool_count?: unknown };
            const tools = Array.isArray(parsed.tools) ? parsed.tools.map(String) : [];
            resolve({
              alive: true,
              writable: tools.includes("adt_push"),
              toolCount: typeof parsed.tool_count === "number" ? parsed.tool_count : tools.length,
              unauthorized: false,
              gated: tools.includes("axet_teslim")
            });
          } catch {
            // Ayakta ama cevabı okunamıyor: sahiplenmek için yeterli değil.
            resolve(DEAD);
          }
        });
        res.on("error", () => resolve(DEAD));
      }
    );
    req.on("error", () => resolve(DEAD));
    req.on("timeout", () => {
      req.destroy();
      resolve(DEAD);
    });
    req.end();
  });
}

/**
 * Portta dinleyen var mı: HTTP değil TCP, çünkü 401 dönen ya da HTTP
 * konuşmayan bir process de portu tutar. Zaman aşımı "dolu" sayılır; emin
 * olmadan spawn etmek EADDRINUSE'a düşer.
 */
function portInUse(port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = netConnect({ host: "127.0.0.1", port });
    const done = (busy: boolean): void => {
      sock.destroy();
      resolve(busy);
    };
    sock.setTimeout(timeoutMs, () => done(true));
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
  });
}

async function waitPortFree(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (!(await portInUse(port))) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** Ayaktaki sunucu bu isteğin yüzeyini mi sunuyor? */
function surfaceMatches(info: HealthInfo, opts: ReadonlyServerStartOptions): boolean {
  if (opts.gate) return info.gated;
  return !info.gated && info.writable === opts.expectWritable;
}

function describeFailure(server: RunningServer): string {
  const tail = server.tail.join("").trim();
  let hint = "";
  if (/no module named ['"]requests['"]/i.test(tail)) {
    hint = mt("adtServer.requestsMissing");
  } else if (/no module named ['"]mcp['"]/i.test(tail)) {
    hint = mt("adtServer.mcpMissing");
  } else if (/no module named ['"]dotenv['"]|python-dotenv/i.test(tail)) {
    hint = mt("adtServer.dotenvMissing");
  } else if (/no module named/i.test(tail)) {
    hint = mt("adtServer.someDepMissing");
  } else if (/address already in use|eaddrinuse/i.test(tail)) {
    hint = mt("adtServer.portInUse", { port: server.port });
  } else if (!tail && server.exited) {
    hint = mt("adtServer.exitedEarly", { detail: server.exitInfo });
  } else if (!tail) {
    hint = mt("adtServer.pythonMissing");
  }
  const detail = tail ? mt("common.detailSuffix", { tail: tail.slice(-400) }) : "";
  return hint
    ? mt("adtServer.failureWithHint", { hint, detail, port: server.port })
    : mt("adtServer.didNotStart", { port: server.port, detail });
}

export async function startReadonlyServer(opts: ReadonlyServerStartOptions): Promise<ReadonlyServerStartResult> {
  const key = opts.projectDir;
  const existing = running.get(key);
  if (existing && existing.port === opts.port && (existing.external || (!existing.proc?.killed && !existing.exited))) {
    const info = await probeHealth(existing.port);
    // Gated'da yüzey yetmez, oturum da tutmalı: process'in ortamındaki token
    // eski oturumunsa her yazması 401 → approval_unavailable olur.
    const sameGate = opts.gate ? existing.gateToken === opts.gate.token : existing.gateToken === null;
    if (info.alive && surfaceMatches(info, opts) && sameGate) {
      return { ok: true, alreadyRunning: true, external: existing.external, message: mt("adtServer.alreadyRunning") };
    }
    // Ayakta ama YANLIŞ yüzey: kullanıcı bu proje klasörünü başka bir tier'la
    // açmış olabilir (sistemi DEV işaretlemek gibi). Kendi process'imiz, bizim
    // kapatma hakkımız var — doğrusuyla değiştir.
    stopReadonlyServer(key);
    if (!existing.external && !(await waitPortFree(opts.port, OWN_STOP_WAIT_MS))) {
      return { ok: false, alreadyRunning: false, external: false, message: mt("adtServer.previousStillRunning", { port: opts.port }) };
    }
  }

  // Port tek, sahibi tek proje. Portu BİZİM başka bir projemiz tutuyorsa onu
  // durduruyoruz. Eskiden bu durumda aşağıdaki yoklama portta "sağlıklı bir
  // sunucu" bulup onu devralıyordu; oysa o sunucu öbür projenin klasöründe
  // çalışıyor, onun `.conn_adt`'ını okuyor. Gated'da daha kötüsü: onay
  // oturumu yanlış projeye bağlanırdı. Devralınmış (external) kayıt yalnızca
  // unutulur; sahibi olmadığımız process'e dokunmuyoruz, aşağıdaki yoklama
  // ona karar verir.
  for (const [otherKey, other] of Array.from(running.entries())) {
    if (otherKey === key || other.port !== opts.port) continue;
    stopReadonlyServer(otherKey);
    if (!other.external && !(await waitPortFree(opts.port, OWN_STOP_WAIT_MS))) {
      return { ok: false, alreadyRunning: false, external: false, message: mt("adtServer.previousStillRunning", { port: opts.port }) };
    }
  }

  // Uygulama kapanıp yeniden açıldıysa veya kullanıcı elle başlattıysa, bu
  // portta zaten sağlıklı bir sunucu olabilir — kendi process'imiz olmadan
  // ikinci bir process spawn edip EADDRINUSE'a düşmek yerine bunu kabul et.
  //
  // AMA yalnızca yüzeyi tutuyorsa. Eskiden buradaki tek soru "ayakta mı"ydı ve
  // tek bir sunucu vardı, dolayısıyla cevap da tekti. Artık iki sunucu var:
  // DEV'de bırakılmış YAZAN bir sunucu, ardından PRD'ye bağlanıldığında sessizce
  // sahiplenilir ve canlı sisteme push edilebilir bir oturum açardı. Tersi de
  // yanlış ama zararsız: DEV'de 17 araçlık sunucuyu devralıp "neden push yok"
  // sorusunu doğurur. İkisini de reddediyoruz; sahibi olmadığımız bir process'i
  // öldürmek yerine durumu söylüyoruz.
  //
  // Gated modda HİÇ devralmıyoruz: devralınan process'in ortamındaki onay
  // token'ını bilemeyiz; ya ölü bir oturuma sorar (her yazma reddedilir) ya da
  // başka bir projenin oturumuna.
  let onPort = await probeHealth(opts.port);
  if (onPort.unauthorized && opts.gate) {
    // Büyük olasılıkla önceki launcher'dan kalan gated sunucu: onay ucu artık
    // onu tanımıyor, kalp atışında kendini kapatacak. Öldürmüyoruz, bekliyoruz.
    if (!(await waitPortFree(opts.port, opts.staleWaitMs ?? STALE_GATED_WAIT_MS))) {
      return { ok: false, alreadyRunning: false, external: true, message: mt("adtServer.foreignTokenGated", { port: opts.port }) };
    }
    onPort = DEAD;
  }
  if (onPort.unauthorized) {
    // Token'ını bilmediğimiz bir sunucu: ne kullanabiliriz ne de sahibiyiz.
    // Öldürmüyoruz; kullanıcıya adıyla söylüyoruz.
    return { ok: false, alreadyRunning: false, external: true, message: mt("adtServer.foreignToken", { port: opts.port }) };
  }
  if (onPort.alive && opts.gate) {
    return { ok: false, alreadyRunning: false, external: true, message: mt("adtServer.gatedPortBusy", { port: opts.port }) };
  }
  if (onPort.alive) {
    if (!surfaceMatches(onPort, opts)) {
      return {
        ok: false,
        alreadyRunning: false,
        external: true,
        message: mt("adtServer.surfaceMismatch", {
          port: opts.port,
          found: String(onPort.toolCount),
          expected: opts.expectWritable ? "50" : "17"
        })
      };
    }
    running.set(key, { proc: null, port: opts.port, logStream: null, tail: [], exited: false, exitInfo: "", external: true, gateToken: null });
    return { ok: true, alreadyRunning: true, external: true, message: mt("adtServer.externalOnPort") };
  }

  let logStream: WriteStream | null = null;
  try {
    logStream = createWriteStream(`${opts.projectDir}/adt-readonly.log`, { flags: "a" });
  } catch {
    logStream = null;
  }

  const server: RunningServer = {
    proc: null,
    port: opts.port,
    logStream,
    tail: [],
    exited: false,
    exitInfo: "",
    external: false,
    gateToken: opts.gate?.token ?? null
  };

  // ADT_CWD: motor `.conn_adt`'ı (gated katman `.sap-review/`'u) buradan
  // okuyor. Launcher'ın ortamından miras kalan bir değer başka projenin
  // sistemine bağlardı; cwd ile aynı olduğu için açıkça veriyoruz.
  const env: NodeJS.ProcessEnv = { ...process.env, ABAP_HTTP_TOKEN: getAdtHttpToken(), ADT_CWD: opts.projectDir };
  if (opts.gate) {
    env.ADT_APPROVAL_URL = opts.gate.url;
    env.ADT_APPROVAL_TOKEN = opts.gate.token;
  }

  let proc: ChildProcess;
  try {
    // `--http` ŞART. Yukarı akış motoru böldüğünde her iki sunucunun da
    // varsayılan taşıması stdio MCP oldu; bayraksız çalıştırmak sessizce
    // stdin'i dinleyen, /health'i olmayan bir process bırakıyor ve biz 15
    // saniye boyunca gelmeyecek bir cevabı bekliyorduk.
    proc = spawn(opts.pythonPath, [opts.scriptPath, "--http", "--port", String(opts.port)], {
      cwd: opts.projectDir,
      // Token verilmezse motor kendi token'ını üretip log'a basıyor — hem biz
      // onu bilmiyoruz hem de log OneDrive'daki proje klasöründe.
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    logStream?.end();
    return { ok: false, alreadyRunning: false, external: false, message: mt("adtServer.spawnFailed", { pythonPath: opts.pythonPath, detail: (err as Error).message }) };
  }

  server.proc = proc;
  proc.stdout?.on("data", (chunk: Buffer) => pushTail(server, chunk));
  proc.stderr?.on("data", (chunk: Buffer) => pushTail(server, chunk));
  proc.on("exit", (code, signal) => {
    server.exited = true;
    server.exitInfo = `exit code=${code ?? "?"} signal=${signal ?? "-"}`;
  });
  proc.on("error", (err) => {
    server.exited = true;
    server.exitInfo = err.message;
  });

  running.set(key, server);

  const timeoutMs = 15000;
  const intervalMs = 500;
  const deadline = Date.now() + timeoutMs;
  let healthy = false;
  while (Date.now() < deadline) {
    if (server.exited) break;
    // "Ayakta" yetmez: başlattığımız process portu alamadıysa cevap veren
    // başka biri olabilir. Yüzey de tutmalı.
    const info = await probeHealth(opts.port, 1200);
    if (info.alive && surfaceMatches(info, opts)) {
      healthy = true;
      break;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (!healthy) {
    const message = describeFailure(server);
    stopReadonlyServer(key);
    return { ok: false, alreadyRunning: false, external: false, message };
  }

  return { ok: true, alreadyRunning: false, external: false, message: mt("adtServer.started", { port: opts.port }) };
}

export function stopReadonlyServer(key: string): void {
  const entry = running.get(key);
  if (!entry) return;
  if (!entry.external) {
    try {
      entry.proc?.kill();
    } catch {
      // best effort
    }
  }
  try {
    entry.logStream?.end();
  } catch {
    // best effort
  }
  running.delete(key);
}

export function stopAllReadonlyServers(): void {
  for (const key of Array.from(running.keys())) {
    stopReadonlyServer(key);
  }
}

export function isReadonlyServerRunning(key: string): boolean {
  const entry = running.get(key);
  return Boolean(entry && (entry.external || (!entry.proc?.killed && !entry.exited)));
}
```

- [ ] **Step 4: i18n anahtarlarını ekle**

`app-electron/main/i18n/tr.ts` — `"adtServer.spawnFailed"` satırının hemen ÖNCESİNE:

```ts
  // DEV'in onaylı sunucusu hiçbir zaman devralınmıyor (bkz. adtReadonlyServerManager.ts):
  // devralınan process'in onay token'ını bilemeyiz.
  "adtServer.gatedPortBusy":
    "{port} portunda başka bir ADT sunucusu çalışıyor. DEV'in onaylı sunucusu başka bir process'i devralmaz — o process'i kapat, sonra sisteme yeniden bağlan. O kapanana kadar DEV'e yazılamaz.",
  "adtServer.foreignTokenGated":
    "{port} portundaki eski ADT sunucusu 45 saniye içinde kapanmadı (önceki bir oturumdan kalmış olabilir). Devralınmadı, öldürülmedi — o process'i kapat, sonra sisteme yeniden bağlan. O kapanana kadar DEV'e yazılamaz.",
  "adtServer.previousStillRunning":
    "{port} portundaki önceki ADT sunucusu (başka bir proje için başlatılmıştı) durduruldu ama portu bırakmadı. Birkaç saniye sonra sisteme yeniden bağlan.",
```

`app-electron/main/i18n/en.ts` — `"adtServer.spawnFailed"` satırının hemen ÖNCESİNE:

```ts
  "adtServer.gatedPortBusy":
    "Another ADT server is running on port {port}. The approval-gated DEV server never adopts another process — stop that process, then reconnect to the system. Writing to DEV is not possible until it is gone.",
  "adtServer.foreignTokenGated":
    "The old ADT server on port {port} did not exit within 45 seconds (probably left over from an earlier session). Not adopted, not killed — stop that process, then reconnect to the system. Writing to DEV is not possible until it is gone.",
  "adtServer.previousStillRunning":
    "The previous ADT server on port {port} (started for another project) was stopped but has not released the port. Reconnect to the system in a few seconds.",
```

- [ ] **Step 5: `launcher.ts`'i değiştir**

Import (satır 11'in altına):

```ts
import { startReadonlyServer } from "./adtReadonlyServerManager";
import { closeAllWriteSessions, closeWriteSession, openWriteSession } from "./sapWrite/server";
import type { Identity } from "./sapWrite/policy";
```

`adtServerScriptFor`'un üstündeki yorumda "(33'e karşı\n// 17)." → "(53'e karşı\n// 17)." ve hemen altına yeni paragraf; fonksiyonun yazma dalı:

```ts
// değişmiyor, yalnızca /health'in saydığı araç sayısı değişiyor (53'e karşı
// 17).
//
// DEV'de açılan motorun kendisi (`adt_mcp_server.py`) DEĞİL, onu içeri alıp 28
// yazan aracını sarmalayan onay katmanı (`adt_gated_server.py`): her yazma
// launcher'ın onay ucuna sorulur, NTT Studio'da pencere açılır (bkz.
// sapWrite/server.ts). Motoru doğrudan açan bir yol kalmadı.
//
```

```ts
function adtServerScriptFor(writeSurface: boolean): { rel: string[]; label: string } {
  return writeSurface
    ? { rel: ["sap-adt", "scripts", "adt_gated_server.py"], label: "ADT sunucusu (onaylı yazma, 53 araç)" }
    : { rel: ["sap-adt-readonly", "scripts", "adt_readonly_server.py"], label: "ADT read-only sunucusu (17 araç)" };
}
```

`attemptReadonlyServerAutoStart` imzası:

```ts
async function attemptReadonlyServerAutoStart(
  skillInstall: SkillInstallResult,
  projectDir: string,
  port: number,
  identity: Identity
): Promise<ReadonlyServerOutcome> {
```

Aynı fonksiyonda `scriptPath` kontrolünden SONRAKİ `startReadonlyServer` çağrısı ve başarısızlık dalının başı (dalın geri kalanı değişmiyor):

```ts
  // 8787 tek, sahibi tek proje (yönetici başka projenin sunucusunu durduruyor).
  // Onay oturumu sahibini izliyor: bu bağlantı portu alacaksa, başka projelerin
  // oturumları artık hiçbir sunucuya ait değil. Açık kalsalar NTT Studio
  // ölü bir oturum için mod sorar, pencere gösterirdi.
  closeAllWriteSessions();
  let gate: { url: string; token: string } | undefined;
  if (writeSurface) {
    try {
      const session = await openWriteSession(projectDir, identity);
      gate = { url: session.url, token: session.token };
    } catch (err) {
      // Onay ucu yoksa DEV'e onaysız yazan bir sunucu açmıyoruz.
      return {
        started: false,
        alreadyRunning: false,
        detailNote: `${label} başlatılmadı: NTT Studio'nun onay ucu açılamadı (${(err as Error).message}). DEV'e yazma onaysız açılmaz; sisteme yeniden bağlan.`
      };
    }
  }

  const startResult = await startReadonlyServer({
    projectDir,
    scriptPath,
    pythonPath: "py",
    port,
    expectWritable: writeSurface,
    gate
  });
  if (!startResult.ok) {
    if (gate) closeWriteSession(projectDir);
    return {
```

`connectToSystem` içindeki çağrı yeri:

```ts
    readonlyOutcome = await attemptReadonlyServerAutoStart(skillInstall, projectDir, DEFAULT_READONLY_SERVER_PORT, {
      sid: req.service.systemId,
      client: credentials.client.trim(),
      user: credentials.username.trim().toUpperCase()
    });
```

- [ ] **Step 6: Testleri ve tip kontrolünü koş**

Run: `npx vitest run tests/adtHttpToken.test.ts tests/i18n.test.ts`
Expected: iki dosya da PASS (`adtHttpToken` 14/14).

Run: `npm run typecheck`
Expected: hatasız.

Run: `npx vitest run`
Expected: hepsi PASS (Task 1-2'nin testleri dahil; bu planın yazıldığı sırada Task 1-2 + 5 ile 30 dosya / 310 test).

Run: `git grep -n "ADT_APPROVAL_TOKEN\|getAdtHttpToken" -- app-electron/main/launcher.ts`
Expected: çıktı yok.

- [ ] **Step 7: Commit**

```bash
git add app-electron/main/adtReadonlyServerManager.ts app-electron/main/launcher.ts app-electron/main/i18n/tr.ts app-electron/main/i18n/en.ts tests/adtHttpToken.test.ts
git commit -m "SAP yazma onayi: DEV'de 8787 onayli sunucuyla basliyor

Launcher once onay oturumunu aciyor, adresi ve token'i yalnizca cocugun
ortamina veriyor. Gated modda portta duran sunucu devralinmiyor; baska
projenin (bizim) sunucusu durdurulup port bosalinca yenisi basliyor.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: NTT Studio onay penceresi (IPC + `SapWriteGate`)

Task 2'nin onay ucu istekleri bellekte tutuyor ve her değişiklikte `setWriteNotifier`'a haber veriyor; bu task o durumu kullanıcıya gösterip kararını geri taşıyor. İki parça:

- **`main/sapWrite/ipc.ts`** — renderer köprüsü. Üç kanal: `sap-write:state` (durumu oku), `sap-write:set-mode` (oturumun modu), `sap-write:respond` (bekleyen isteğin cevabı). Renderer'dan gelen değerin yalnızca BİÇİMİ doğrulanıyor (bilinmeyen mod/seçim, string olmayan kimlik → reddedilir); "bu isteğe oturum izni verilebilir mi" gibi her karar Task 1'in `policy.ts`'inde, buraya taşınmıyor. Her değişiklik `sap-write:changed` ile tam durum olarak pencereye gidiyor. Yeni bir istek geldiğinde pencere öndeyse zaten görünüyor; değilse `flashFrame(true)` ile görev çubuğunda yanıp sönüyor. Pencere öne FIRLATILMIYOR: kullanıcı başka yere yazarken odağı çalmak, yanlışlıkla Enter'la bir düğmeye basmak demek. `electron` import edilmiyor, `ipcMain` ve pencere parametre (`activeContext.ts` ile aynı kalıp) — test sahte nesnelerle koşuyor.
- **`src/components/SapWriteGate.tsx`** — iki pencere, ikisi de kapatılamıyor (Escape ve arka plan tıklaması bir şey yapmıyor; `z-[70]`, `TierPromptModal`'ın `z-[65]`'inin üstünde):
  - **Mod seçimi**, modu henüz seçilmemiş ilk oturum için. İki seçenek, hiçbiri önceden seçili değil; seçilene kadar onay düğmesi kapalı. "Şimdi değil" yok: mod seçilmeden her yazma `mod_secilmedi` ile reddediliyor, iki seçenek de güvenli.
  - **Onay**, bekleyen isteklerin en eskisi (`pending` main'de `createdAt`'e göre sıralı), tek tek; birden fazlaysa kuyruk sayısı yazar. İşlemin Türkçe adı + araç adı, HER_SEFER uyarısı, nesneler (tip, ad, paket, yeni mi, kalite özeti, renkli fark), paket, transport (açıklama · sahip · durum), teslim bilgisi, 10 dk süre notu. Düğmeler: **Reddet** (varsayılan odak), **Bu oturumda {transport}'ye izin ver** (yalnızca `canSession`), **Bu seferlik onayla**. Cevap sürerken üçü de kapalı; başarısız cevap hatayı yazar.

Renk kuralları (tasarım ilkeleri): lime YALNIZ seçili mod kartında; uyarı `--status-warning-*`; fark satırları `--status-success-text` / `--status-danger-text`.

Uygulama kapanırken (`window-all-closed`, `before-quit`) `stopApprovalServer()` çağrılır: oturumlar kapanır, bekleyen istekler cevapsız kalır ve gated sunucular (Task 4) kalp atışında kendilerini kapatır.

**Files:**
- Create: `app-electron/main/sapWrite/ipc.ts`
- Create: `src/components/SapWriteGate.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts` (`"tierPrompt.saveFailed"` satırının hemen ARKASINA)
- Modify: `app-electron/preload/index.ts` (import + `api` nesnesinin sonuna dört üye)
- Modify: `src/window.d.ts` (import + `AxetApi`'nin sonuna dört üye)
- Modify: `src/App.tsx` (import, durum, abonelik, `UpdatePromptModal`'dan sonra `<SapWriteGate>`)
- Modify: `app-electron/main/index.ts` (import, `registerSapWriteIpc`, iki kapanış olayı)
- Test: `tests/sapWriteIpc.test.ts`, `tests/sapWriteGate.test.tsx`

**Interfaces:**
- Consumes (Task 2, `app-electron/main/sapWrite/server.ts`): `listWriteState(): SapWriteState`, `setWriteMode(sessionId: string, mode: WorkMode): boolean`, `respondToApproval(id: string, choice: Choice): { ok: boolean; error?: "bulunamadi" | "karar_verilmis" | "oturum_izni_verilemez" }`, `setWriteNotifier(fn: (() => void) | null): void`, `stopApprovalServer(): Promise<void>`, `openWriteSession(projectDir, identity): Promise<{ url; token; sessionId }>`.
- Consumes (Task 1, `app-electron/shared/sapWriteTypes.ts`): `WorkMode`, `Choice`, `SapWriteState { sessions: SessionView[]; pending: ApprovalView[] }`, `SessionView`, `ApprovalView`, `WriteFact`, `FactObject`.
- Consumes (Task 2 HTTP): `POST <url>/approvals` (`Authorization: Bearer <token>`, gövde `WriteFact`) → `{ id, karar: "bekliyor" | ... }` — yalnızca testte, gerçek istemci Task 4.
- Produces:
  - `registerSapWriteIpc(ipc: IpcMainLike, getWindow: () => WindowLike | null): void`, `IpcMainLike`, `WindowLike`.
  - IPC kanalları: `sap-write:state`, `sap-write:set-mode`, `sap-write:respond` (invoke), `sap-write:changed` (main → renderer). Geçersiz cevap isteği: `{ ok: false, error: "gecersiz_istek" }`.
  - `window.api.getSapWriteState()`, `setSapWriteMode(sessionId, mode)`, `respondSapWrite(id, choice)`, `onSapWriteChanged(cb) → unsubscribe`.
  - `SapWriteGate` default export, props `{ state: SapWriteState; onSetMode; onRespond }`.
  - Task 9 (DS4 uçtan uca) bu pencereyi ve metinlerini kullanıyor: `"Bu seferlik onayla"`, `"Bu oturumda <TR>'ye izin ver"`, `"Reddet"`.

- [ ] **Step 1: IPC için başarısız testi yaz**

`tests/sapWriteIpc.test.ts`:

```ts
// Onay penceresinin main tarafı: renderer'ın gönderdiği mod/cevap biçimce
// doğrulanıyor, her değişiklik pencereye yayılıyor, yeni istek gelince arka
// plandaki pencere yanıp sönüyor ama öne fırlatılmıyor.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SapWriteState, WriteFact } from "../app-electron/shared/sapWriteTypes";
import { registerSapWriteIpc, type WindowLike } from "../app-electron/main/sapWrite/ipc";
import { listWriteState, openWriteSession, setWriteNotifier, stopApprovalServer } from "../app-electron/main/sapWrite/server";

const H = (c: string) => c.repeat(64);
const ID = { sid: "DS4", client: "100", user: "DEV1" };

function fact(over: Partial<WriteFact> = {}): WriteFact {
  return {
    arac: "adt_push",
    sinif: "TRANSPORT_ONAYLI",
    nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("1")] }],
    transport: "DS4K900001",
    transport_bilgi: { aciklama: "Test", sahip: "DEV1", durum: "D" },
    arg_hash: H("a"),
    ...over,
  };
}

async function ask(url: string, token: string, body: unknown): Promise<{ id: string; karar: string }> {
  const res = await fetch(url + "/approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { id: string; karar: string };
}

type Listener = (event: unknown, ...args: unknown[]) => unknown;

function fakeIpc() {
  const handlers = new Map<string, Listener>();
  return {
    ipc: { handle: (channel: string, fn: Listener) => void handlers.set(channel, fn) },
    invoke: (channel: string, ...args: unknown[]) => {
      const fn = handlers.get(channel);
      if (!fn) throw new Error(`kayıtsız kanal: ${channel}`);
      return fn({}, ...args);
    },
  };
}

function fakeWindow(focused: boolean) {
  const sent: SapWriteState[] = [];
  const win: WindowLike & { flashFrame: ReturnType<typeof vi.fn> } = {
    isDestroyed: () => false,
    isFocused: () => focused,
    flashFrame: vi.fn(),
    webContents: {
      send: (channel: string, state: unknown) => {
        if (channel === "sap-write:changed") sent.push(state as SapWriteState);
      },
    },
  };
  return { win, sent };
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "sapwrite-ipc-"));
});

afterEach(async () => {
  setWriteNotifier(null);
  await stopApprovalServer();
  rmSync(dir, { recursive: true, force: true });
});

describe("sap-write IPC", () => {
  it("durum okunuyor, mod seçiliyor, geçersiz mod reddediliyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win } = fakeWindow(true);
    registerSapWriteIpc(ipc, () => win);
    const s = await openWriteSession(dir, ID);
    expect((invoke("sap-write:state") as SapWriteState).sessions[0]).toMatchObject({ id: s.sessionId, mode: null });
    expect(invoke("sap-write:set-mode", s.sessionId, "hepsi")).toBe(false);
    expect(invoke("sap-write:set-mode", 42, "dogrudan")).toBe(false);
    expect(listWriteState().sessions[0].mode).toBeNull();
    expect(invoke("sap-write:set-mode", s.sessionId, "dogrudan")).toBe(true);
    // Mod oturum başına bir kez: değiştirmek yeniden bağlanmak demek.
    expect(invoke("sap-write:set-mode", s.sessionId, "yerel")).toBe(false);
    expect(listWriteState().sessions[0].mode).toBe("dogrudan");
  });

  it("cevap: geçersiz seçim reddediliyor, geçerli seçim isteği kapatıyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win } = fakeWindow(true);
    registerSapWriteIpc(ipc, () => win);
    const s = await openWriteSession(dir, ID);
    invoke("sap-write:set-mode", s.sessionId, "dogrudan");
    const r = await ask(s.url, s.token, fact());
    expect(r.karar).toBe("bekliyor");
    expect(invoke("sap-write:respond", r.id, "hepsine_izin")).toEqual({ ok: false, error: "gecersiz_istek" });
    expect(invoke("sap-write:respond", null, "reddet")).toEqual({ ok: false, error: "gecersiz_istek" });
    expect(listWriteState().pending).toHaveLength(1);
    expect(invoke("sap-write:respond", r.id, "reddet")).toEqual({ ok: true });
    expect(listWriteState().pending).toHaveLength(0);
  });

  it("HER_SEFER isteğine oturum izni pencereden de verilemiyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win } = fakeWindow(true);
    registerSapWriteIpc(ipc, () => win);
    const s = await openWriteSession(dir, ID);
    invoke("sap-write:set-mode", s.sessionId, "dogrudan");
    const r = await ask(s.url, s.token, fact({ arac: "adt_delete_object", sinif: "HER_SEFER" }));
    expect(invoke("sap-write:respond", r.id, "oturum")).toMatchObject({ ok: false, error: "oturum_izni_verilemez" });
    expect(listWriteState().pending).toHaveLength(1);
  });

  it("her değişiklik pencereye gidiyor; yeni istek arka plandaki pencereyi yanıp söndürüyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win, sent } = fakeWindow(false);
    registerSapWriteIpc(ipc, () => win);
    const s = await openWriteSession(dir, ID);
    expect(sent.at(-1)?.sessions).toHaveLength(1);
    invoke("sap-write:set-mode", s.sessionId, "dogrudan");
    expect(win.flashFrame).not.toHaveBeenCalled();
    const r = await ask(s.url, s.token, fact());
    expect(sent.at(-1)?.pending.map((p) => p.id)).toEqual([r.id]);
    expect(win.flashFrame).toHaveBeenCalledTimes(1);
    expect(win.flashFrame).toHaveBeenCalledWith(true);
    // Aynı istek için ikinci bildirim (ör. cevap) yeniden yanıp söndürmüyor.
    invoke("sap-write:respond", r.id, "reddet");
    expect(sent.at(-1)?.pending).toEqual([]);
    expect(win.flashFrame).toHaveBeenCalledTimes(1);
  });

  it("öndeki pencere yanıp sönmüyor; pencere yoksa bildirim sessizce düşüyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win } = fakeWindow(true);
    let current: WindowLike | null = win;
    registerSapWriteIpc(ipc, () => current);
    const s = await openWriteSession(dir, ID);
    invoke("sap-write:set-mode", s.sessionId, "dogrudan");
    await ask(s.url, s.token, fact());
    expect(win.flashFrame).not.toHaveBeenCalled();
    current = null;
    const r = await ask(s.url, s.token, fact({ arg_hash: H("b") }));
    expect(r.karar).toBe("bekliyor");
  });
});
```

- [ ] **Step 2: Testi koş, başarısız olduğunu gör**

Run: `npx vitest run tests/sapWriteIpc.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/main/sapWrite/ipc"`.

- [ ] **Step 3: `ipc.ts`'i yaz**

`app-electron/main/sapWrite/ipc.ts`:

```ts
// SAP DEV yazma onayı — renderer köprüsü. Pencere durumu okur ve yalnızca iki
// karar verir: oturumun modu ve bekleyen isteğin cevabı. Karar mantığı
// policy.ts'de; buradaki doğrulama renderer'dan gelen değerin biçimi için.
//
// `electron` import edilmiyor: ipcMain ve pencere parametre olarak geliyor, test
// sahte nesnelerle koşuyor (activeContext.ts ile aynı kalıp).

import type { Choice, SapWriteState, WorkMode } from "../../shared/sapWriteTypes";
import { listWriteState, respondToApproval, setWriteMode, setWriteNotifier } from "./server";

export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

export interface WindowLike {
  isDestroyed(): boolean;
  isFocused(): boolean;
  flashFrame(flag: boolean): void;
  webContents: { send(channel: string, ...args: unknown[]): void };
}

const MODES: ReadonlySet<string> = new Set<WorkMode>(["dogrudan", "yerel"]);
const CHOICES: ReadonlySet<string> = new Set<Choice>(["reddet", "bu_seferlik", "oturum"]);

export function registerSapWriteIpc(ipc: IpcMainLike, getWindow: () => WindowLike | null): void {
  ipc.handle("sap-write:state", (): SapWriteState => listWriteState());

  ipc.handle("sap-write:set-mode", (_event, sessionId, mode): boolean => {
    if (typeof sessionId !== "string" || typeof mode !== "string" || !MODES.has(mode)) return false;
    return setWriteMode(sessionId, mode as WorkMode);
  });

  ipc.handle("sap-write:respond", (_event, id, choice): { ok: boolean; error?: string } => {
    if (typeof id !== "string" || typeof choice !== "string" || !CHOICES.has(choice)) {
      return { ok: false, error: "gecersiz_istek" };
    }
    return respondToApproval(id, choice as Choice);
  });

  // Yeni bir istek geldiğinde pencere öndeyse zaten görünüyor; değilse görev
  // çubuğunda yanıp sönüyor. Öne FIRLATILMIYOR: kullanıcı başka bir yere
  // yazarken odağı çalmak, yanlışlıkla Enter'la bir düğmeye basmak demek.
  let seen = new Set<string>();
  setWriteNotifier(() => {
    const state = listWriteState();
    const hasNew = state.pending.some((p) => !seen.has(p.id));
    seen = new Set(state.pending.map((p) => p.id));
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    win.webContents.send("sap-write:changed", state);
    if (hasNew && !win.isFocused()) win.flashFrame(true);
  });
}
```

- [ ] **Step 4: Testi koş, geçtiğini gör**

Run: `npx vitest run tests/sapWriteIpc.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Pencere için başarısız testi yaz**

`tests/sapWriteGate.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// SAP DEV yazma onayı — NTT Studio'daki pencere (SapWriteGate).
//
// Pencere karar vermiyor, main'in verdiği durumu gösterip kullanıcının
// seçimini taşıyor. Doğrulanan şey o seçimin güvenli yapılması:
//
//   - **Mod seçiminde hiçbir şey önceden seçili değil.** Onay düğmesi seçim
//     yapılana kadar kapalı.
//   - **Varsayılan odak Reddet'te.** Yanlışlıkla basılan Enter bir yazmayı
//     onaylamasın.
//   - **Oturum izni düğmesi yalnızca main izin verdiğinde (`canSession`)
//     görünüyor.** Silme, yayınlama, transport/paket açma her seferinde sorulur.
//   - **İstekler tek tek, en eskisi önce.** Kuyrukta kaç tane olduğu yazıyor.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApprovalView, Choice, SapWriteState, SessionView, WorkMode, WriteFact } from "../app-electron/shared/sapWriteTypes";
import SapWriteGate from "../src/components/SapWriteGate";
import { LanguageProvider } from "../src/i18n";

const H = (c: string) => c.repeat(64);

function session(over: Partial<SessionView> = {}): SessionView {
  return { id: "s1", sid: "DS4", client: "100", user: "DEV1", mode: "dogrudan", ...over };
}

function fact(over: Partial<WriteFact> = {}): WriteFact {
  return {
    arac: "adt_push",
    sinif: "TRANSPORT_ONAYLI",
    nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("1")] }],
    transport: "DS4K900001",
    transport_bilgi: { aciklama: "Fatura düzeltmesi", sahip: "DEV1", durum: "D" },
    arg_hash: H("a"),
    ...over,
  };
}

function approval(over: Partial<ApprovalView> = {}): ApprovalView {
  return {
    id: "a1",
    sessionId: "s1",
    createdAt: 1,
    fact: fact(),
    canSession: true,
    mode: "dogrudan",
    sid: "DS4",
    client: "100",
    user: "DEV1",
    ...over,
  };
}

function mount(
  state: SapWriteState,
  respond: (id: string, choice: Choice) => Promise<{ ok: boolean; error?: string }> = async () => ({ ok: true })
) {
  const onSetMode = vi.fn<(sessionId: string, mode: WorkMode) => Promise<boolean>>(async () => true);
  const onRespond = vi.fn(respond);
  render(
    <LanguageProvider language="tr">
      <SapWriteGate state={state} onSetMode={onSetMode} onRespond={onRespond} />
    </LanguageProvider>
  );
  return { onSetMode, onRespond };
}

const button = (name: string | RegExp) => screen.getByRole("button", { name });

afterEach(cleanup);

describe("SapWriteGate — mod seçimi", () => {
  it("hiçbir mod önceden seçili değil; seçilene kadar onay kapalı", () => {
    const { onSetMode } = mount({ sessions: [session({ mode: null })], pending: [] });
    expect(screen.getByText("Bu oturumda nasıl çalışılsın?")).toBeTruthy();
    expect(button("Bu modla başla").hasAttribute("disabled")).toBe(true);
    fireEvent.click(button("Bu modla başla"));
    expect(onSetMode).not.toHaveBeenCalled();
  });

  it("seçilen mod oturumun kimliğiyle main'e gidiyor", async () => {
    const { onSetMode } = mount({ sessions: [session({ id: "s9", mode: null })], pending: [] });
    fireEvent.click(screen.getByText("Önce yerelde çalış, sonra teslim et"));
    fireEvent.click(button("Bu modla başla"));
    await waitFor(() => expect(onSetMode).toHaveBeenCalledWith("s9", "yerel"));
  });

  it("main reddederse hata yazıyor", async () => {
    const onSetMode = vi.fn(async () => false);
    render(
      <LanguageProvider language="tr">
        <SapWriteGate state={{ sessions: [session({ mode: null })], pending: [] }} onSetMode={onSetMode} onRespond={vi.fn()} />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByText("Doğrudan DEV'de çalış"));
    fireEvent.click(button("Bu modla başla"));
    expect(await screen.findByText(/Mod kaydedilemedi/)).toBeTruthy();
  });

  it("mod bekleyen oturum varken onay penceresi gösterilmiyor", () => {
    mount({ sessions: [session({ mode: null })], pending: [approval()] });
    expect(screen.queryByText("SAP'a yazma onayı")).toBeNull();
  });

  it("durum boşsa hiçbir şey çizilmiyor", () => {
    mount({ sessions: [session()], pending: [] });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("SapWriteGate — onay", () => {
  it("varsayılan odak Reddet'te", () => {
    mount({ sessions: [session()], pending: [approval()] });
    expect(document.activeElement).toBe(button("Reddet"));
  });

  it("oturum izni düğmesi transport'u adıyla söylüyor ve 'oturum' gönderiyor", async () => {
    const { onRespond } = mount({ sessions: [session()], pending: [approval()] });
    fireEvent.click(button("Bu oturumda DS4K900001'ye izin ver"));
    await waitFor(() => expect(onRespond).toHaveBeenCalledWith("a1", "oturum"));
  });

  it("canSession yoksa oturum izni düğmesi yok, uyarı var (HER_SEFER)", () => {
    mount({
      sessions: [session()],
      pending: [approval({ canSession: false, fact: fact({ arac: "adt_delete_object", sinif: "HER_SEFER" }) })],
    });
    expect(screen.queryByRole("button", { name: /izin ver/ })).toBeNull();
    expect(screen.getByText("Nesneyi SİL")).toBeTruthy();
    expect(screen.getByText(/her seferinde ayrıca onay ister/)).toBeTruthy();
  });

  it("Reddet ve Bu seferlik doğru seçimi gönderiyor", async () => {
    const { onRespond } = mount({ sessions: [session()], pending: [approval()] });
    fireEvent.click(button("Bu seferlik onayla"));
    await waitFor(() => expect(onRespond).toHaveBeenCalledWith("a1", "bu_seferlik"));
    fireEvent.click(button("Reddet"));
    await waitFor(() => expect(onRespond).toHaveBeenLastCalledWith("a1", "reddet"));
  });

  it("en eski istek gösteriliyor, kuyruk sayısı yazıyor", () => {
    mount({
      sessions: [session()],
      pending: [
        approval({ id: "eski", fact: fact({ nesneler: [{ ad: "ZCL_ESKI", tip: "CLAS", paket: "ZPKG", yeni: false }] }) }),
        approval({ id: "yeni", createdAt: 2, fact: fact({ nesneler: [{ ad: "ZCL_YENI", tip: "CLAS", paket: "ZPKG", yeni: false }] }) }),
      ],
    });
    expect(screen.getByText("ZCL_ESKI")).toBeTruthy();
    expect(screen.queryByText("ZCL_YENI")).toBeNull();
    expect(screen.getByText("Sırada 2 istek")).toBeTruthy();
  });

  it("nesne, transport, fark ve kalite özeti görünüyor", () => {
    mount({
      sessions: [session()],
      pending: [
        approval({
          fact: fact({
            nesneler: [
              {
                ad: "ZCL_A",
                tip: "CLAS",
                paket: "ZPKG",
                yeni: false,
                kaynak_sha256: [H("1")],
                fark: "@@ -1 +1 @@\n-  x = 1.\n+  x = 2.",
                fark_kirpildi: true,
                kalite: { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 },
              },
            ],
          }),
        }),
      ],
    });
    expect(screen.getByText("paket ZPKG")).toBeTruthy();
    expect(screen.getByText("DS4K900001")).toBeTruthy();
    expect(screen.getByText(/Fatura düzeltmesi · DEV1 · D/)).toBeTruthy();
    // Test kütüphanesi metindeki ardışık boşlukları teke indiriyor.
    expect(screen.getByText("+ x = 2.").className).toContain("--status-success-text");
    expect(screen.getByText("- x = 1.").className).toContain("--status-danger-text");
    expect(screen.getByText("@@ -1 +1 @@").className).toContain("text-slate-500");
    expect(screen.getByText(/Fark kırpıldı/)).toBeTruthy();
    expect(screen.getByText("İnceleme: kritik 0 · yüksek 1 · orta 2 · düşük 3")).toBeTruthy();
    expect(screen.getByText("inceleme bu kaynağa ait ✓")).toBeTruthy();
  });

  it("yeni nesne işaretleniyor; farkı okunamayan mevcut nesne söyleniyor", () => {
    mount({
      sessions: [session()],
      pending: [
        approval({
          fact: fact({
            nesneler: [
              { ad: "ZCL_YENI", tip: "CLAS", paket: "ZPKG", yeni: true, kaynak_sha256: [H("2")] },
              { ad: "ZCL_ESKI", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("3")] },
            ],
          }),
        }),
      ],
    });
    expect(screen.getByText(/yeni nesne/)).toBeTruthy();
    expect(screen.getAllByText("Sistemdeki sürümle fark okunamadı.")).toHaveLength(1);
  });

  it("transport yoksa ve oturum izni $TMP içinse etiket $TMP diyor", () => {
    mount({
      sessions: [session()],
      pending: [approval({ fact: fact({ transport: "", transport_bilgi: null, nesneler: [{ ad: "ZCL_T", tip: "CLAS", paket: "$TMP", yeni: true }] }) })],
    });
    expect(screen.getByText(/Transport yok/)).toBeTruthy();
    expect(button("Bu oturumda $TMP'ye izin ver")).toBeTruthy();
  });

  it("cevap sürerken düğmeler kapalı; başarısız cevap hatayı yazıyor", async () => {
    let finish: (r: { ok: boolean; error?: string }) => void = () => {};
    mount({ sessions: [session()], pending: [approval()] }, () => new Promise((resolve) => (finish = resolve)));
    fireEvent.click(button("Bu seferlik onayla"));
    await waitFor(() => expect(button("Reddet").hasAttribute("disabled")).toBe(true));
    expect(button("Bu seferlik onayla").hasAttribute("disabled")).toBe(true);
    expect(button(/izin ver/).hasAttribute("disabled")).toBe(true);
    finish({ ok: false, error: "karar_verilmis" });
    expect(await screen.findByText(/Cevap kaydedilemedi \(karar_verilmis\)/)).toBeTruthy();
    expect(button("Reddet").hasAttribute("disabled")).toBe(false);
  });

  it("bilinmeyen araç genel başlıkla, adt_create_* ailesi tek başlıkla gösteriliyor", () => {
    mount({ sessions: [session()], pending: [approval({ fact: fact({ arac: "adt_create_domain" }) })] });
    expect(screen.getByText("Yeni nesne oluştur")).toBeTruthy();
    cleanup();
    mount({ sessions: [session()], pending: [approval({ fact: fact({ arac: "adt_gelecekteki_arac" }) })] });
    expect(screen.getByText("SAP'a yazan işlem")).toBeTruthy();
    expect(screen.getByText("adt_gelecekteki_arac")).toBeTruthy();
  });
});
```

- [ ] **Step 6: Testi koş, başarısız olduğunu gör**

Run: `npx vitest run tests/sapWriteGate.test.tsx`
Expected: FAIL — `Failed to resolve import "../src/components/SapWriteGate"`.

- [ ] **Step 7: Renderer i18n anahtarlarını ekle**

`src/i18n/tr.ts` — `"tierPrompt.saveFailed"` satırının hemen ARKASINA:

```ts
  // SAP DEV yazma onayı (SapWriteGate). Mod seçimi oturum başına bir kez;
  // onay penceresi bekleyen her yazma için.
  "sapWrite.mode.title": "Bu oturumda nasıl çalışılsın?",
  "sapWrite.mode.option.dogrudan": "Doğrudan DEV'de çalış",
  "sapWrite.mode.desc.dogrudan":
    "Ajan değişiklikleri tek tek DEV'e gönderir; her yazma önce buraya, onayına gelir. Normal yazmalarda bir transport için bu oturum boyunca izin verebilirsin.",
  "sapWrite.mode.option.yerel": "Önce yerelde çalış, sonra teslim et",
  "sapWrite.mode.desc.yerel":
    "Ajan kodu yerelde yazar ve inceler, SAP'a hiçbir şey gitmez. İş bitince bütün nesneleri, farklarıyla, tek pencerede görüp onaylarsın.",
  "sapWrite.mode.once": "Seçim bu bağlantı boyunca geçerli. Değiştirmek için sisteme yeniden bağlan. Hangisini seçersen seç, SAP'a giden her yazma onayına gelir.",
  "sapWrite.mode.confirm": "Bu modla başla",
  "sapWrite.mode.failed": "Mod kaydedilemedi: oturum kapanmış olabilir. Sisteme yeniden bağlan.",
  "sapWrite.op.push": "Kaynağı yükle ve aktive et",
  "sapWrite.op.activate": "Nesneyi aktive et",
  "sapWrite.op.writeFunctionModule": "Fonksiyon modülünü oluştur/yaz",
  "sapWrite.op.setTransport": "Oturumun transport'unu sabitle",
  "sapWrite.op.deleteObject": "Nesneyi SİL",
  "sapWrite.op.deleteTransport": "Transport'u SİL",
  "sapWrite.op.createTransport": "Yeni transport aç",
  "sapWrite.op.createPackage": "Yeni paket oluştur",
  "sapWrite.op.clearLock": "Nesnenin kilidini kaldır",
  "sapWrite.op.removeFromTransport": "Nesneyi transport'tan çıkar",
  "sapWrite.op.publishBinding": "Servis bağlamasını yayınla",
  "sapWrite.op.unpublishBinding": "Servis bağlamasının yayınını kaldır",
  "sapWrite.op.generateScreen": "Dynpro ekranı üret/değiştir/sil",
  "sapWrite.op.generateAdobe": "Adobe form/arayüz yaz",
  "sapWrite.op.messageClass": "Mesaj sınıfı oluştur/yaz",
  "sapWrite.op.teslim": "Yerelde hazırlanan işi DEV'e teslim et",
  "sapWrite.op.abapgit": "abapGit ile DEV'e yükle",
  "sapWrite.op.create": "Yeni nesne oluştur",
  "sapWrite.op.other": "SAP'a yazan işlem",
  "sapWrite.approval.title": "SAP'a yazma onayı",
  "sapWrite.approval.queue": "Sırada {count} istek",
  "sapWrite.approval.mode.dogrudan": "Mod: doğrudan DEV",
  "sapWrite.approval.mode.yerel": "Mod: yerelde çalış, teslim et",
  "sapWrite.approval.everyTime": "Bu işlem her seferinde ayrıca onay ister; oturum izni kapsamaz.",
  "sapWrite.approval.objects": "Nesneler",
  "sapWrite.approval.package": "Paket",
  "sapWrite.approval.transport": "Transport",
  "sapWrite.approval.noDescription": "(açıklamasız)",
  "sapWrite.approval.noTransport": "Transport yok (yerel nesne ya da transport açmayan işlem)",
  "sapWrite.approval.delivery": "Teslim",
  "sapWrite.approval.deliveryMethod": "Yöntem: {method}",
  "sapWrite.approval.inPackage": "paket {package}",
  "sapWrite.approval.newObject": "yeni nesne",
  "sapWrite.approval.quality": "İnceleme: kritik {kritik} · yüksek {yuksek} · orta {orta} · düşük {dusuk}",
  "sapWrite.approval.reviewMatches": "inceleme bu kaynağa ait ✓",
  "sapWrite.approval.diffTrimmed": "Fark kırpıldı; tamamı için kaynak dosyasına bak.",
  "sapWrite.approval.noDiff": "Sistemdeki sürümle fark okunamadı.",
  "sapWrite.approval.expiry": "10 dakika içinde cevap verilmezse istek reddedilmiş sayılır.",
  "sapWrite.approval.failed": "Cevap kaydedilemedi ({error}). İsteğin süresi dolmuş ya da zaten cevaplanmış olabilir.",
  "sapWrite.approval.reject": "Reddet",
  "sapWrite.approval.session": "Bu oturumda {transport}'ye izin ver",
  "sapWrite.approval.once": "Bu seferlik onayla",
```

`src/i18n/en.ts` — `"tierPrompt.saveFailed"` satırının hemen ARKASINA:

```ts
  "sapWrite.mode.title": "How should this session work?",
  "sapWrite.mode.option.dogrudan": "Work directly in DEV",
  "sapWrite.mode.desc.dogrudan":
    "The agent sends changes to DEV one by one; every write comes here for your approval first. For normal writes you can allow one transport for the rest of this session.",
  "sapWrite.mode.option.yerel": "Work locally first, then deliver",
  "sapWrite.mode.desc.yerel":
    "The agent writes and reviews the code locally; nothing goes to SAP. When the work is done you see every object, with its diff, in one window and approve it.",
  "sapWrite.mode.once": "The choice holds for this connection. Reconnect to the system to change it. Whichever you choose, every write to SAP comes to you for approval.",
  "sapWrite.mode.confirm": "Start with this mode",
  "sapWrite.mode.failed": "Could not save the mode: the session may have closed. Reconnect to the system.",
  "sapWrite.op.push": "Upload source and activate",
  "sapWrite.op.activate": "Activate object",
  "sapWrite.op.writeFunctionModule": "Create/write function module",
  "sapWrite.op.setTransport": "Pin the session transport",
  "sapWrite.op.deleteObject": "DELETE object",
  "sapWrite.op.deleteTransport": "DELETE transport",
  "sapWrite.op.createTransport": "Open a new transport",
  "sapWrite.op.createPackage": "Create a new package",
  "sapWrite.op.clearLock": "Clear the object lock",
  "sapWrite.op.removeFromTransport": "Remove object from transport",
  "sapWrite.op.publishBinding": "Publish service binding",
  "sapWrite.op.unpublishBinding": "Unpublish service binding",
  "sapWrite.op.generateScreen": "Generate/change/delete Dynpro screen",
  "sapWrite.op.generateAdobe": "Write Adobe form/interface",
  "sapWrite.op.messageClass": "Create/write message class",
  "sapWrite.op.teslim": "Deliver the locally prepared work to DEV",
  "sapWrite.op.abapgit": "Upload to DEV with abapGit",
  "sapWrite.op.create": "Create a new object",
  "sapWrite.op.other": "Operation that writes to SAP",
  "sapWrite.approval.title": "Approve write to SAP",
  "sapWrite.approval.queue": "{count} requests queued",
  "sapWrite.approval.mode.dogrudan": "Mode: directly in DEV",
  "sapWrite.approval.mode.yerel": "Mode: work locally, deliver",
  "sapWrite.approval.everyTime": "This operation needs its own approval every time; a session permission does not cover it.",
  "sapWrite.approval.objects": "Objects",
  "sapWrite.approval.package": "Package",
  "sapWrite.approval.transport": "Transport",
  "sapWrite.approval.noDescription": "(no description)",
  "sapWrite.approval.noTransport": "No transport (local object or an operation that records none)",
  "sapWrite.approval.delivery": "Delivery",
  "sapWrite.approval.deliveryMethod": "Method: {method}",
  "sapWrite.approval.inPackage": "package {package}",
  "sapWrite.approval.newObject": "new object",
  "sapWrite.approval.quality": "Review: critical {kritik} · high {yuksek} · medium {orta} · low {dusuk}",
  "sapWrite.approval.reviewMatches": "review belongs to this source ✓",
  "sapWrite.approval.diffTrimmed": "Diff trimmed; see the source file for all of it.",
  "sapWrite.approval.noDiff": "Could not read the diff against the system version.",
  "sapWrite.approval.expiry": "If there is no answer within 10 minutes, the request counts as rejected.",
  "sapWrite.approval.failed": "Could not record the answer ({error}). The request may have expired or already been answered.",
  "sapWrite.approval.reject": "Reject",
  "sapWrite.approval.session": "Allow {transport} for this session",
  "sapWrite.approval.once": "Approve this once",
```

`tests/i18n.test.ts` iki dilde aynı anahtarları, aynı yer tutucuları ve boş değer olmadığını zaten denetliyor.

- [ ] **Step 8: `SapWriteGate.tsx`'i yaz**

`src/components/SapWriteGate.tsx`:

```tsx
import { useState, type ReactNode } from "react";
import { Check, FolderCode, PenLine, ShieldAlert } from "lucide-react";
import type { ApprovalView, Choice, FactObject, SapWriteState, SessionView, WorkMode } from "../../app-electron/shared/sapWriteTypes";
import { useT, type TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { btn, DIALOG_CONFIRM_BUTTON } from "../ui/buttons";
import TierBadge from "./TierBadge";

interface Props {
  state: SapWriteState;
  onSetMode: (sessionId: string, mode: WorkMode) => Promise<boolean>;
  onRespond: (id: string, choice: Choice) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * SAP DEV yazma onayı — NTT Studio tarafı (bkz. main/sapWrite, spec §5.2, §7).
 *
 * İki pencere, ikisi de kapatılamıyor (Escape ve arka plan tıklaması bir şey
 * yapmıyor):
 *
 *   - **Mod seçimi.** DEV'e bağlanınca bir kez sorulur, oturum boyunca geçerli.
 *     Seçilmeden her yazma `mod_secilmedi` ile reddediliyor; iki seçenek de
 *     güvenli (her yazma yine onaya geliyor), o yüzden "şimdi değil" yok.
 *     Hiçbiri ÖNCEDEN seçili gelmiyor.
 *   - **Onay.** Bekleyen istekler sırayla, en eskisi önce, tek tek. Varsayılan
 *     odak Reddet'te: yanlışlıkla basılan Enter bir yazmayı onaylamasın.
 *
 * Renderer karar VERMİYOR, yalnızca kullanıcının seçimini main'e taşıyor;
 * "oturum izni verilebilir mi" gibi her şey `ApprovalView.canSession` ile
 * main'den geliyor.
 */
export default function SapWriteGate({ state, onSetMode, onRespond }: Props) {
  const modeSession = state.sessions.find((s) => s.mode === null);
  if (modeSession) return <ModeChooser key={modeSession.id} session={modeSession} onSetMode={onSetMode} />;
  const head = state.pending[0];
  if (head) return <ApprovalDialog key={head.id} item={head} total={state.pending.length} onRespond={onRespond} />;
  return null;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="animate-backdrop-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-[var(--overlay-scrim)] backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="animate-modal-pop-in flex max-h-[88vh] w-[640px] flex-col rounded-2xl border border-line/60 bg-card shadow-2xl shadow-black/50"
      >
        {children}
      </div>
    </div>
  );
}

function IdentityLine({ sid, client, user }: { sid: string; client: string; user: string }) {
  return (
    <span className="flex items-center gap-2 text-xs text-slate-400">
      <TierBadge tier="DEV" />
      <span className="font-mono">
        {sid}/{client}
      </span>
      <span>·</span>
      <span className="font-mono">{user}</span>
    </span>
  );
}

// --- Mod seçimi ---------------------------------------------------------------

const MODES: WorkMode[] = ["dogrudan", "yerel"];

function ModeChooser({ session, onSetMode }: { session: SessionView; onSetMode: Props["onSetMode"] }) {
  const t = useT();
  const [mode, setMode] = useState<WorkMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    if (!mode) return;
    setBusy(true);
    setFailed(false);
    const ok = await onSetMode(session.id, mode).catch(() => false);
    setBusy(false);
    if (!ok) setFailed(true);
  }

  return (
    <Shell>
      <div className="border-b border-line/50 px-6 py-4">
        <h3 className="text-base font-semibold text-white">{t("sapWrite.mode.title")}</h3>
        <div className="mt-1.5">
          <IdentityLine sid={session.sid} client={session.client} user={session.user} />
        </div>
      </div>
      <div className="space-y-2 px-6 py-4">
        {MODES.map((id) => {
          const selected = mode === id;
          const Icon = id === "dogrudan" ? PenLine : FolderCode;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                selected
                  ? "border-lime-400/60 bg-lime-400/10"
                  : "border-line/60 bg-control/40 hover:border-line hover:bg-control/70"
              }`}
            >
              <Icon size={15} className={`mt-0.5 shrink-0 ${selected ? "text-lime-300" : "text-slate-400"}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{t(`sapWrite.mode.option.${id}`)}</span>
                  {selected && <Check size={13} className="text-lime-300" />}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{t(`sapWrite.mode.desc.${id}`)}</span>
              </span>
            </button>
          );
        })}
        <p className="pt-1 text-xs text-slate-500">{t("sapWrite.mode.once")}</p>
        {failed && <p className="text-xs text-[var(--status-danger-text)]">{t("sapWrite.mode.failed")}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line/50 px-6 py-4">
        <button
          type="button"
          disabled={mode === null || busy}
          onClick={() => void confirm()}
          className={`${DIALOG_CONFIRM_BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {t("sapWrite.mode.confirm")}
        </button>
      </div>
    </Shell>
  );
}

// --- Onay ---------------------------------------------------------------------

// Aracın Türkçe adı. `adt_create_*` ailesi tek başlık altında: hangi nesnenin
// oluşturulduğunu nesne satırı zaten söylüyor. Listede olmayan araç (motor
// güncellenip yeni bir yazma aracı gelirse) genel başlıkla gösterilir; araç
// adı her durumda küçük yazıyla altta duruyor.
const OPERATION: Record<string, TranslationKey> = {
  adt_push: "sapWrite.op.push",
  adt_activate: "sapWrite.op.activate",
  adt_write_function_module: "sapWrite.op.writeFunctionModule",
  adt_set_transport: "sapWrite.op.setTransport",
  adt_delete_object: "sapWrite.op.deleteObject",
  adt_delete_transport: "sapWrite.op.deleteTransport",
  adt_create_transport: "sapWrite.op.createTransport",
  adt_create_package: "sapWrite.op.createPackage",
  adt_clear_lock: "sapWrite.op.clearLock",
  adt_remove_from_transport: "sapWrite.op.removeFromTransport",
  adt_publish_service_binding: "sapWrite.op.publishBinding",
  adt_unpublish_service_binding: "sapWrite.op.unpublishBinding",
  adt_generate_screen: "sapWrite.op.generateScreen",
  adt_generate_adobe: "sapWrite.op.generateAdobe",
  adt_message_class: "sapWrite.op.messageClass",
  axet_teslim: "sapWrite.op.teslim",
  axet_abapgit_onay: "sapWrite.op.abapgit",
};

function operationKey(arac: string): TranslationKey {
  return OPERATION[arac] ?? (arac.startsWith("adt_create") ? "sapWrite.op.create" : "sapWrite.op.other");
}

function ApprovalDialog({ item, total, onRespond }: { item: ApprovalView; total: number; onRespond: Props["onRespond"] }) {
  const t = useT();
  const { fact } = item;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(choice: Choice) {
    setBusy(true);
    setError(null);
    const r = await onRespond(item.id, choice).catch((e: unknown) => ({ ok: false, error: String(e) }));
    setBusy(false);
    if (!r.ok) setError(r.error ?? "?");
  }

  const packageOnly = fact.nesneler.length === 0 ? (fact.paket ?? fact.abapgit?.paket ?? "") : "";

  return (
    <Shell>
      <div className="border-b border-line/50 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">{t("sapWrite.approval.title")}</h3>
          {total > 1 && <span className="text-xs text-slate-500">{t("sapWrite.approval.queue", { count: total })}</span>}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <IdentityLine sid={item.sid} client={item.client} user={item.user} />
          {item.mode && <span className="text-xs text-slate-500">{t(`sapWrite.approval.mode.${item.mode}`)}</span>}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <section>
          <div className="text-sm font-medium text-white">{t(operationKey(fact.arac))}</div>
          <div className="mt-0.5 font-mono text-2xs text-slate-500">{fact.arac}</div>
        </section>

        {fact.sinif === "HER_SEFER" && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs text-[var(--status-warning-text)]">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <span>{t("sapWrite.approval.everyTime")}</span>
          </div>
        )}

        {fact.nesneler.length > 0 && (
          <section className="space-y-3">
            <Label t={t} k="sapWrite.approval.objects" />
            {fact.nesneler.map((o) => (
              <ObjectBlock key={`${o.tip}:${o.ad}`} obj={o} t={t} />
            ))}
          </section>
        )}

        {packageOnly && (
          <section>
            <Label t={t} k="sapWrite.approval.package" />
            <div className="font-mono text-sm text-slate-200">{packageOnly}</div>
          </section>
        )}

        <section>
          <Label t={t} k="sapWrite.approval.transport" />
          {fact.transport ? (
            <div className="text-sm text-slate-200">
              <span className="font-mono">{fact.transport}</span>
              {fact.transport_bilgi && (
                <span className="text-slate-400">
                  {" — "}
                  {fact.transport_bilgi.aciklama || t("sapWrite.approval.noDescription")} · {fact.transport_bilgi.sahip} ·{" "}
                  {fact.transport_bilgi.durum}
                </span>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-400">{t("sapWrite.approval.noTransport")}</div>
          )}
        </section>

        {(fact.teslim || fact.abapgit) && (
          <section>
            <Label t={t} k="sapWrite.approval.delivery" />
            <div className="text-sm text-slate-200">
              {fact.teslim && t("sapWrite.approval.deliveryMethod", { method: fact.teslim.yontem })}
              {fact.abapgit && (
                <span className="font-mono">
                  {fact.abapgit.script}
                  {fact.abapgit.zip_sha256 && ` · ZIP ${fact.abapgit.zip_sha256.slice(0, 12)}`}
                </span>
              )}
            </div>
          </section>
        )}

        <p className="text-xs text-slate-500">{t("sapWrite.approval.expiry")}</p>
        {error && <p className="text-xs text-[var(--status-danger-text)]">{t("sapWrite.approval.failed", { error })}</p>}
      </div>

      <div className="flex justify-end gap-2 border-t border-line/50 px-6 py-4">
        <button type="button" autoFocus disabled={busy} onClick={() => void answer("reddet")} className={btn("neutral", "lg")}>
          {t("sapWrite.approval.reject")}
        </button>
        {item.canSession && (
          <button type="button" disabled={busy} onClick={() => void answer("oturum")} className={btn("neutral", "lg")}>
            {t("sapWrite.approval.session", { transport: fact.transport || "$TMP" })}
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => void answer("bu_seferlik")} className={btn("primary", "lg")}>
          {t("sapWrite.approval.once")}
        </button>
      </div>
    </Shell>
  );
}

function Label({ t, k }: { t: TranslateFn; k: TranslationKey }) {
  return <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{t(k)}</div>;
}

function ObjectBlock({ obj, t }: { obj: FactObject; t: TranslateFn }) {
  return (
    <div className="rounded-lg border border-line/60 bg-control/30 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-mono text-2xs text-slate-500">{obj.tip}</span>
        <span className="font-mono text-white">{obj.ad}</span>
        <span className="text-xs text-slate-400">{t("sapWrite.approval.inPackage", { package: obj.paket })}</span>
        {obj.yeni && <span className="text-xs text-slate-400">· {t("sapWrite.approval.newObject")}</span>}
      </div>
      {obj.kalite && (
        <div className="mt-1 text-xs text-slate-400">
          <span className={obj.kalite.yuksek > 0 ? "text-[var(--status-warning-text)]" : undefined}>
            {t("sapWrite.approval.quality", {
              kritik: obj.kalite.kritik,
              yuksek: obj.kalite.yuksek,
              orta: obj.kalite.orta,
              dusuk: obj.kalite.dusuk,
            })}
          </span>
          <span className="ml-2 text-slate-500">{t("sapWrite.approval.reviewMatches")}</span>
        </div>
      )}
      {obj.fark ? (
        <>
          <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-app px-2 py-1.5 font-mono text-2xs leading-relaxed">
            {obj.fark.split("\n").map((line, i) => (
              <div key={i} className={diffLineClass(line)}>
                {line || " "}
              </div>
            ))}
          </pre>
          {obj.fark_kirpildi && <div className="mt-1 text-2xs text-slate-500">{t("sapWrite.approval.diffTrimmed")}</div>}
        </>
      ) : (
        !obj.yeni &&
        obj.kaynak_sha256 && <div className="mt-1 text-2xs text-slate-500">{t("sapWrite.approval.noDiff")}</div>
      )}
    </div>
  );
}

function diffLineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) return "text-slate-500";
  if (line.startsWith("+")) return "text-[var(--status-success-text)]";
  if (line.startsWith("-")) return "text-[var(--status-danger-text)]";
  return "text-slate-300";
}
```

- [ ] **Step 9: Pencereyi uygulamaya bağla**

`app-electron/preload/index.ts` — `} from "../shared/types";` satırının altına:

```ts
import type { Choice, SapWriteState, WorkMode } from "../shared/sapWriteTypes";
```

Aynı dosyada `api` nesnesinin son üyesi `cancelGuiScriptAgentStep`'in ardına (virgül ekleyerek):

```ts
  cancelGuiScriptAgentStep: (requestId: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("sapGuiScript:cancelAgentStep", requestId),
  // SAP DEV yazma onayı (main/sapWrite): oturumların modu ve bekleyen istekler.
  // Karar yalnızca bu iki çağrıyla veriliyor; pencere gösterimi `onSapWriteChanged`.
  getSapWriteState: (): Promise<SapWriteState> => ipcRenderer.invoke("sap-write:state"),
  setSapWriteMode: (sessionId: string, mode: WorkMode): Promise<boolean> =>
    ipcRenderer.invoke("sap-write:set-mode", sessionId, mode),
  respondSapWrite: (id: string, choice: Choice): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("sap-write:respond", id, choice),
  onSapWriteChanged: (callback: (state: SapWriteState) => void) => {
    const listener = (_event: unknown, state: SapWriteState) => callback(state);
    ipcRenderer.on("sap-write:changed", listener);
    return () => ipcRenderer.removeListener("sap-write:changed", listener);
  }
};
```

`src/window.d.ts` — `} from "../app-electron/shared/types";` satırının altına:

```ts
import type { Choice, SapWriteState, WorkMode } from "../app-electron/shared/sapWriteTypes";
```

Aynı dosyada `AxetApi`'nin son üyesi `cancelGuiScriptAgentStep`'in ardına:

```ts
  getSapWriteState: () => Promise<SapWriteState>;
  setSapWriteMode: (sessionId: string, mode: WorkMode) => Promise<boolean>;
  respondSapWrite: (id: string, choice: Choice) => Promise<{ ok: boolean; error?: string }>;
  onSapWriteChanged: (callback: (state: SapWriteState) => void) => () => void;
```

`src/App.tsx` — `UpdatePromptModal` import'unun altına:

```tsx
import SapWriteGate from "./components/SapWriteGate";
import type { SapWriteState } from "../app-electron/shared/sapWriteTypes";
```

`const [updateStatus, setUpdateStatus] = ...` satırının altına:

```tsx
  const [sapWriteState, setSapWriteState] = useState<SapWriteState>({ sessions: [], pending: [] });
```

`window.api.onUpdateStatus(setUpdateStatus)` aboneliğini yapan `useEffect`'in hemen ardına:

```tsx
  // SAP DEV yazma onayı: main her değişikliği (oturum açıldı/kapandı, mod
  // seçildi, istek geldi/cevaplandı/süresi doldu) tam durum olarak yayınlıyor.
  // Mount'ta bir kez çekiliyor — pencere açılmadan önce gelen istek kaybolmasın.
  useEffect(() => {
    window.api.getSapWriteState().then(setSapWriteState);
    return window.api.onSapWriteChanged(setSapWriteState);
  }, []);
```

`<UpdatePromptModal ... />` bloğunun hemen ardına:

```tsx
        <SapWriteGate
          state={sapWriteState}
          onSetMode={window.api.setSapWriteMode}
          onRespond={window.api.respondSapWrite}
        />
```

`app-electron/main/index.ts` — `import { stopAllReadonlyServers } from "./adtReadonlyServerManager";` satırının altına:

```ts
import { stopApprovalServer } from "./sapWrite/server";
import { registerSapWriteIpc } from "./sapWrite/ipc";
```

`ipcMain.handle("updates:getLastStatus", ...)` satırının ardına:

```ts

  // SAP DEV yazma onayı: mod seçimi ve bekleyen isteklerin cevabı. Onay ucunun
  // kendisi (127.0.0.1, rastgele port) ilk DEV bağlantısında açılıyor.
  registerSapWriteIpc(ipcMain, () => mainWindow);
```

`app.on("window-all-closed", ...)` VE `app.on("before-quit", ...)` içinde, `stopAllReadonlyServers();` satırının hemen altına (iki yerde de):

```ts
  stopApprovalServer().catch(() => {});
```

- [ ] **Step 10: Testleri ve tip kontrolünü koş**

Run: `npx vitest run tests/sapWriteGate.test.tsx tests/sapWriteIpc.test.ts tests/i18n.test.ts`
Expected: üç dosya PASS (`sapWriteGate` 15, `sapWriteIpc` 5).

Run: `npm run typecheck`
Expected: hatasız (web ve node tsconfig'leri).

Run: `npx vitest run`
Expected: hepsi PASS (bu planın yazıldığı sırada Task 1-2 + 5 + 6 ile 32 dosya / 330 test).

Bu adım yazılırken pencereye yedi mutasyon denendi (autoFocus kaldırmak, oturum düğmesini hep göstermek, modu önceden seçmek, en yeni isteği göstermek, meşgulken düğmeyi açık bırakmak, HER_SEFER uyarısını kaldırmak, yeni nesnede "fark okunamadı" yazmak); yedisini de testler yakaladı.

- [ ] **Step 11: Commit**

```bash
git add app-electron/main/sapWrite/ipc.ts src/components/SapWriteGate.tsx src/i18n/tr.ts src/i18n/en.ts
git add app-electron/preload/index.ts src/window.d.ts src/App.tsx app-electron/main/index.ts
git add tests/sapWriteIpc.test.ts tests/sapWriteGate.test.tsx
git commit -m "SAP yazma onayi: NTT Studio onay penceresi

Mod secimi (oturum basina bir kez, hicbiri onceden secili degil) ve
bekleyen yazmalarin onayi (en eskisi once, varsayilan odak Reddet'te,
oturum izni yalnizca politika izin verirse). Yeni istek arka plandaki
pencereyi yanip sonduruyor, one firlatmiyor.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: abapGit script'leri NTT Studio onayına soruyor (`tier_gate.py`)

**Files:**
- Modify: `resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/tier_gate.py` (docstring, import'lar, dosya sonuna `require_write_approval`)
- Modify: yazan 9 script'in `main()`'i: `abapgit_deploy.py`, `abapgit_bootstrap.py`, `gui_import_zip.py`, `gui_activate_package.py`, `gui_stage_commit.py`, `gui_run_zabapgit_auto.py`, `gui_run_zabapgit_bootstrap.py`, `gui_run_zabapgit_bootstrap_multi.py`, `gui_run_zabapgit_deploy_multi.py`
- Create: `resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/test_tier_gate_approval.py`
- Modify: `tests/tierWriteGates.test.ts` (yeni `it` blokları)

**Interfaces:**
- Consumes: Task 4'ün `axet_abapgit_onay(script, paket="", transport="", zip_dosyasi="", ust_onay="")` aracı — 8787'de `POST /tool/axet_abapgit_onay`, gövde JSON kwargs, `Authorization: Bearer $ABAP_HTTP_TOKEN`. Cevap: `{"ok": true, "onay_id": "<kimlik>"}` ya da `{"ok": false, "error": "approval_pending"|"approval_denied"|"approval_unavailable"|..., "message": "..."}`.
- Produces:
  - `require_write_approval(script: str, paket: str = "", transport: str = "", zip_dosyasi: str = "", url: str = ADT_HTTP_URL) -> int | None` — `None` = onaylı (kimlik `os.environ["AXET_ABAPGIT_ONAY_ID"]`'ye yazılır, `_run_step` alt process'leri onu miras alır ve `ust_onay` olarak gönderir); `3` = bekliyor (stdout'a `approval_pending: <mesaj>`); `2` = ret ya da ulaşılamıyor (stderr'e `REFUSED [GR_APPROVAL] ...`). `url` yalnızca testler için.
  - Sabitler: `ADT_HTTP_URL = "http://127.0.0.1:8787"`, `APPROVAL_ENV = "AXET_ABAPGIT_ONAY_ID"`, `EXIT_PENDING = 3`, `EXIT_REFUSED = 2`.
  - Script'ler onay ucunun adresini ve token'ını (`ADT_APPROVAL_URL`/`ADT_APPROVAL_TOKEN`) GÖRMEZ; yalnızca 8787'ye sorar.

Bu task yazılırken plandan ayrılan noktalar (uygulanmış hâli aşağıda):
- ZIP'in hash'i değil **mutlak yolu** (`zip_dosyasi`) gönderiliyor; hash'i sunucu hesaplıyor (Task 4'ün `axet_abapgit_onay`'ı zaten yolu alıyor).
- 8787'ye `urllib.request.build_opener(urllib.request.ProxyHandler({}))` ile gidiliyor: sistem proxy'si tanımlıysa loopback isteği proxy'ye gitmesin.
- `abapgit_deploy.py` onayı `main()`'in başında değil, ZIP belli olunca (export yerel, SAP'a dokunmuyor) ve `gui_login.py`'den ÖNCE istiyor.
- 8787'den 503 (onaylı sunucu launcher'a ulaşamıyor) → çıkış 2, "bekliyor" değil.

- [ ] **Step 1: Başarısız testi yaz — davranış (`py -3`)**

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/test_tier_gate_approval.py` (yeni dosya, LF):

````python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — tier_gate.require_write_approval testleri. Sahte 8787 ile; SAP yok.

    py -3 resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/test_tier_gate_approval.py

Sahte sunucu rastgele portta dinliyor; tier_gate.ADT_HTTP_URL test süresince ona
çevriliyor. 9 yazma script'inin main()'i de gerçekten çağrılıyor: onay beklerken
SAP GUI'ye bağlanmaya (attach_scripting_engine / _run_step) HİÇ gelmemeli.
Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import contextlib
import importlib
import io
import json
import os
import subprocess
import sys
import tempfile
import threading
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import tier_gate as tg  # noqa: E402

TOKEN = "test-token"


class Fake:
    """Sıradaki cevabı veren, gelen her isteği kaydeden sahte 8787."""

    def __init__(self):
        self.calls: list[dict] = []
        self.replies: list[tuple[int, object]] = []
        fake = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                fake.calls.append({"path": self.path, "auth": self.headers.get("Authorization"),
                                   "body": json.loads(self.rfile.read(n).decode("utf-8"))})
                code, body = fake.replies.pop(0) if fake.replies else (200, {"ok": False, "error": "yok"})
                data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8")
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        self.srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self.srv.server_address[1]}"
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def reply(self, code, body):
        self.replies.append((code, body))


FAKE = Fake()
tg.ADT_HTTP_URL = FAKE.url


@contextlib.contextmanager
def fresh(**kv):
    """Temiz sahte sunucu + ortam: token var, üst onay yok, proxy yok (kv ile değiştirilir)."""
    FAKE.calls.clear()
    FAKE.replies.clear()
    want = {"ABAP_HTTP_TOKEN": TOKEN, tg.APPROVAL_ENV: None, "HTTP_PROXY": None, "http_proxy": None}
    want.update(kv)
    old = {k: os.environ.get(k) for k in want}
    for k, v in want.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    try:
        yield
    finally:
        for k, v in old.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def run(fn):
    """fn() → (dönüş, stdout, stderr)."""
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        rc = fn()
    return rc, out.getvalue(), err.getvalue()


TESTS = []


def test(fn):
    TESTS.append(fn)
    return fn


# --- fonksiyon -------------------------------------------------------------------
@test
def token_yoksa_sorulmadan_ret():
    with fresh(ABAP_HTTP_TOKEN=None):
        rc, out, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc == 2 and not FAKE.calls, (rc, FAKE.calls)
        assert "REFUSED [GR_APPROVAL] approval_unavailable" in err, err


@test
def izinli_kimligi_ortama_yaziyor_ve_dogru_soruyor():
    with fresh(), tempfile.TemporaryDirectory() as d:
        FAKE.reply(200, {"ok": True, "onay_id": "onay-1"})
        z = Path(d) / "a.zip"
        z.write_bytes(b"x")
        cwd = os.getcwd()
        os.chdir(d)
        try:
            rc, out, err = run(lambda: tg.require_write_approval(
                str(HERE / "gui_run_zabapgit_auto.py"), paket="ZPKG", transport="DS4K900001",
                zip_dosyasi="a.zip"))
        finally:
            os.chdir(cwd)
        assert rc is None, (rc, err)
        assert os.environ.get(tg.APPROVAL_ENV) == "onay-1"
        c = FAKE.calls[0]
        assert c["path"] == "/tool/axet_abapgit_onay", c
        assert c["auth"] == f"Bearer {TOKEN}", c
        # Script yalnızca adıyla gidiyor; ZIP mutlak yolla (sunucunun cwd'si başka).
        assert c["body"] == {"script": "gui_run_zabapgit_auto.py", "paket": "ZPKG",
                             "transport": "DS4K900001", "zip_dosyasi": str(z.resolve()),
                             "ust_onay": ""}, c["body"]


@test
def ust_onay_ortamdan_gidiyor():
    with fresh(**{tg.APPROVAL_ENV: "onay-ebeveyn"}):
        FAKE.reply(200, {"ok": True, "onay_id": "onay-2"})
        rc, _, _ = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc is None
        assert FAKE.calls[0]["body"]["ust_onay"] == "onay-ebeveyn"
        assert os.environ[tg.APPROVAL_ENV] == "onay-2"


@test
def bekliyor_stdoutta_approval_pending_ve_3():
    with fresh():
        FAKE.reply(200, {"ok": False, "error": "approval_pending", "approval_id": "x1",
                         "message": "NTT Studio'da onay penceresi açıldı."})
        rc, out, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc == 3, (rc, out, err)
        assert out.startswith("approval_pending: NTT Studio'da onay penceresi açıldı."), out
        assert tg.APPROVAL_ENV not in os.environ


@test
def ret_ve_mod_hatalari_2():
    for error in ("approval_denied", "yerel_mod", "mod_secilmedi", "kalite_kaydi_yok", "approval_unavailable"):
        with fresh():
            FAKE.reply(200, {"ok": False, "error": error, "message": "m"})
            rc, out, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
            assert rc == 2 and f"REFUSED [GR_APPROVAL] {error}: m" in err, (error, rc, err)
            assert "approval_pending" not in out
            assert tg.APPROVAL_ENV not in os.environ


@test
def ok_ama_kimlik_yoksa_ret():
    for body in ({"ok": True}, {"ok": True, "onay_id": ""}, {"ok": "true", "onay_id": "a"}, ["ok"]):
        with fresh():
            FAKE.reply(200, body)
            rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
            assert rc == 2 and tg.APPROVAL_ENV not in os.environ, (body, rc, err)


@test
def http_hatalari_2():
    for code, word in ((401, "401"), (404, "axet_abapgit_onay yok"), (503, "sap_session_busy"), (500, "HTTP 500")):
        with fresh():
            FAKE.reply(code, {"ok": False, "error": "x"})
            rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
            assert rc == 2 and word in err, (code, rc, err)


@test
def bozuk_govde_2():
    with fresh():
        FAKE.reply(200, b"<html>")
        rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc == 2 and "approval_unavailable" in err, err


@test
def ulasilamazsa_2():
    with fresh():
        rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py", url="http://127.0.0.1:9"))
        assert rc == 2 and "ulaşılamadı" in err, err


@test
def proxy_tanimliyken_loopback_dogrudan():
    with fresh(HTTP_PROXY="http://127.0.0.1:9", http_proxy="http://127.0.0.1:9"):
        FAKE.reply(200, {"ok": True, "onay_id": "p1"})
        rc, _, err = run(lambda: tg.require_write_approval("gui_import_zip.py"))
        assert rc is None, err


# --- 9 script: onay beklerken SAP GUI'ye dokunulmuyor ------------------------------
def _dev_dir(d: Path):
    (d / ".conn_adt").write_text("ADT_SAP_TIER=DEV\n", encoding="utf-8")
    with zipfile.ZipFile(d / "p.zip", "w") as z:
        z.writestr("src/zcl_a.clas.abap", "CLASS zcl_a DEFINITION.\nENDCLASS.\n")
    (d / "objs.txt").write_text("CLAS ZCL_A\n", encoding="utf-8")


def _boom(*a, **k):
    raise AssertionError("onay beklerken SAP GUI'ye / alt adıma gidildi")


# script → (argv, beklenen gövde). "{d}" geçici DEV klasörü.
SCRIPTS = {
    "abapgit_bootstrap.py": (["--package", "ZPKG", "--cwd", "{d}"], {"paket": "ZPKG"}),
    "abapgit_deploy.py": (["--offline-repo", "ZREPO", "--package", "ZPKG", "--transport", "DS4K900001",
                           "--no-export", "--zip", "{d}/p.zip"],
                          {"paket": "ZPKG", "transport": "DS4K900001", "zip": True}),
    "gui_activate_package.py": (["--package", "ZPKG"], {"paket": "ZPKG"}),
    "gui_import_zip.py": (["--offline-repo", "ZREPO", "--zip", "{d}/p.zip"], {"zip": True}),
    "gui_run_zabapgit_auto.py": (["--offline-repo", "ZREPO", "--zip", "{d}/p.zip", "--transport", "DS4K900001"],
                                 {"transport": "DS4K900001", "zip": True}),
    "gui_run_zabapgit_bootstrap.py": (["--package", "ZPKG", "--out", "{d}/o.zip"], {"paket": "ZPKG"}),
    "gui_run_zabapgit_bootstrap_multi.py": (["--objs", "{d}/objs.txt", "--root", "ZPKG", "--out", "{d}/o.zip"], {}),
    "gui_run_zabapgit_deploy_multi.py": (["--zip", "{d}/p.zip", "--root", "ZPKG", "--transport", "DS4K900001"],
                                         {"transport": "DS4K900001", "zip": True}),
    "gui_stage_commit.py": (["--message", "m"], {}),
}


def _script_test(name, argv, expect):
    def t():
        mod = importlib.import_module(name[:-3])
        for attr in ("attach_scripting_engine", "_run_step"):
            if hasattr(mod, attr):
                setattr(mod, attr, _boom)
        with tempfile.TemporaryDirectory() as tmp, fresh():
            d = Path(tmp)
            _dev_dir(d)
            if name == "abapgit_deploy.py":
                subprocess.run(["git", "init", "-q", str(d)], check=True)
            FAKE.reply(200, {"ok": False, "error": "approval_pending", "approval_id": "x", "message": "bekle"})
            cwd, old_argv = os.getcwd(), sys.argv
            os.chdir(d)
            sys.argv = [name] + [a.replace("{d}", str(d)) for a in argv]
            try:
                rc, out, err = run(mod.main)
            finally:
                os.chdir(cwd)
                sys.argv = old_argv
            assert rc == 3, (name, rc, out, err)
            assert "approval_pending: bekle" in out, out
            assert len(FAKE.calls) == 1, FAKE.calls
            b = FAKE.calls[0]["body"]
            assert b["script"] == name, b
            assert b["paket"] == expect.get("paket", ""), b
            assert b["transport"] == expect.get("transport", ""), b
            if expect.get("zip"):
                assert Path(b["zip_dosyasi"]) == (d / "p.zip").resolve(), b
            else:
                assert b["zip_dosyasi"] == "", b
    t.__name__ = f"script_{name[:-3]}"
    return t


for _n, (_a, _e) in SCRIPTS.items():
    test(_script_test(_n, _a, _e))


@test
def qa_sisteminde_onaya_hic_sorulmuyor():
    mod = importlib.import_module("gui_import_zip")
    with tempfile.TemporaryDirectory() as tmp, fresh():
        d = Path(tmp)
        (d / ".conn_adt").write_text("ADT_SAP_TIER=QA\n", encoding="utf-8")
        cwd, old_argv = os.getcwd(), sys.argv
        os.chdir(d)
        sys.argv = ["gui_import_zip.py", "--offline-repo", "Z", "--zip", "p.zip"]
        try:
            rc, _, err = run(mod.main)
        finally:
            os.chdir(cwd)
            sys.argv = old_argv
        assert rc == 2 and "GR_TIER" in err and not FAKE.calls, (rc, err, FAKE.calls)


def main():
    ok = 0
    for t in TESTS:
        try:
            t()
            ok += 1
            print(f"geçti  {t.__name__}")
        except Exception as exc:  # noqa: BLE001
            print(f"KALDI  {t.__name__}: {exc!r}")
    print(f"{ok}/{len(TESTS)} geçti")
    return 0 if ok == len(TESTS) else 1


if __name__ == "__main__":
    sys.exit(main())
````

- [ ] **Step 2: Başarısız testi yaz — kaynak kilidi (vitest)**

`tests/tierWriteGates.test.ts` — `describe("abapgit-deploy — SAP GUI sürücülerinde DEV kapısı", ...)` bloğunun sonuna:

````diff
diff --git a/tests/tierWriteGates.test.ts b/tests/tierWriteGates.test.ts
index 1d11edb..6598988 100644
--- a/tests/tierWriteGates.test.ts
+++ b/tests/tierWriteGates.test.ts
@@ -108,6 +108,48 @@ describe("abapgit-deploy — SAP GUI sürücülerinde DEV kapısı", () => {
     expect(body.slice(parsed, gate)).not.toMatch(/attach_scripting_engine|_run_step|subprocess/);
     expect(body.slice(gate)).toMatch(/if refused:\s*\n\s*print\(refused, file=sys\.stderr\)\s*\n\s*return 2/);
   });
+
+  // NTT Studio — SAP DEV yazma onayı (2026-09-24). DEV kapısından sonra her
+  // yazma, SAP GUI'ye dokunmadan önce 8787'deki onaylı sunucuya soruyor.
+  // Davranış `test_tier_gate_approval.py`'de sahte 8787 ile ölçülüyor
+  // (`py -3`); burada kapının varlığı ve yeri kilitleniyor.
+  it("require_write_approval 8787'ye soruyor, launcher'a doğrudan gitmiyor, kapalı başarısız", () => {
+    const gate = read(...dir, "tier_gate.py");
+    const fn = pyFunction(gate, "require_write_approval");
+    expect(gate).toContain('ADT_HTTP_URL = "http://127.0.0.1:8787"');
+    expect(fn).toContain('"/tool/axet_abapgit_onay"');
+    expect(fn).toContain('os.environ.get("ABAP_HTTP_TOKEN"');
+    expect(fn).toContain("ProxyHandler({})");
+    // Yalnızca tam 'ok: True' + kimlik geçiriyor; kimlik alt adımlara ortamla gidiyor.
+    expect(fn).toMatch(/if out\.get\("ok"\) is True and isinstance\(onay_id, str\) and onay_id:\s*\n\s*os\.environ\[APPROVAL_ENV\] = onay_id\s*\n\s*return None/);
+    expect(gate).toContain('APPROVAL_ENV = "AXET_ABAPGIT_ONAY_ID"');
+    expect(gate).toContain("EXIT_PENDING = 3");
+    expect(fn).toContain('print(f"approval_pending: {message}", flush=True)');
+    // Onay ucunun adresi ve token'ı yalnızca sunucuda; script'ler onları görmüyor.
+    expect(gate).not.toMatch(/ADT_APPROVAL_(URL|TOKEN)/);
+  });
+
+  const APPROVAL = /from tier_gate import require_write_approval\s*\n\s*rc = require_write_approval\(__file__[\s\S]*?\)\s*\n\s*if rc is not None:\s*\n\s*return rc/;
+
+  it.each(WRITERS.filter((f) => f !== "abapgit_deploy.py"))("%s DEV kapısından hemen sonra onay istiyor", (file) => {
+    const body = pyFunction(read(...dir, file), "main");
+    const gate = body.indexOf("require_dev_tier(");
+    const approval = body.search(APPROVAL);
+    expect(approval, "onay çağrısı yok").toBeGreaterThan(gate);
+    // DEV kapısı ile onay arasında SAP'a giden hiçbir şey yok.
+    expect(body.slice(gate, approval)).not.toMatch(/attach_scripting_engine\(|_run_step\(|subprocess\./);
+  });
+
+  it("abapgit_deploy.py ZIP belli olunca ve login'den ÖNCE onay istiyor", () => {
+    const body = pyFunction(read(...dir, "abapgit_deploy.py"), "main");
+    const zip = body.indexOf('print(f"      ZIP: {zip_path}")');
+    const approval = body.search(APPROVAL);
+    const login = body.indexOf('"gui_login.py"');
+    expect(zip).toBeGreaterThanOrEqual(0);
+    expect(approval).toBeGreaterThan(zip);
+    expect(login).toBeGreaterThan(approval);
+    expect(body.slice(approval)).toMatch(/require_write_approval\(__file__, paket=args\.package, transport=args\.transport,\s*zip_dosyasi=str\(zip_path\)\)/);
+  });
 });
 
 describe("ajana giden not — GR_TIER reddi arıza değil", () => {
````

- [ ] **Step 3: Testlerin kırıldığını gör**

Run: `PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/test_tier_gate_approval.py`
Expected: FAIL — `ImportError: cannot import name 'require_write_approval' from 'tier_gate'`.

Run: `npx vitest run tests/tierWriteGates.test.ts`
Expected: FAIL — `def require_write_approval` yok, 9 script'te onay çağrısı yok.

- [ ] **Step 4: `tier_gate.py`'ye `require_write_approval`'ı ekle**

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/tier_gate.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/tier_gate.py
index 778280f..7af99ed 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/tier_gate.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/tier_gate.py
@@ -17,10 +17,23 @@ Usage, at the top of a writing script's main():
     if refused:
         print(refused, file=sys.stderr)
         return 2
+
+NTT Studio — SAP DEV yazma onayı (2026-09-24). DEV kapısından geçen script,
+SAP'a dokunmadan önce `require_write_approval` ile 8787'deki onaylı sunucunun
+`axet_abapgit_onay` aracına sorar; karar NTT Studio penceresinde verilir:
+    from tier_gate import require_dev_tier, require_write_approval
+    ...
+    rc = require_write_approval(__file__, paket=..., transport=..., zip_dosyasi=...)
+    if rc is not None:
+        return rc
 """
 from __future__ import annotations
 
+import json
 import os
+import sys
+import urllib.error
+import urllib.request
 from pathlib import Path
 
 # Same aliases as sap-adt/scripts/guardrails.py _TIER_ALIASES.
@@ -76,3 +89,76 @@ def require_dev_tier(start: Path | str | None = None) -> str | None:
                 "intended behaviour, not a fault — deploy on the development system and "
                 "let the transport carry it onward.")
     return None
+
+
+# --- NTT Studio: SAP DEV yazma onayı ------------------------------------------
+# Onaylı sunucu (adt_gated_server.py) launcher'ın DEV'de 8787'de başlattığı
+# süreç; token ajanın ortamındaki ABAP_HTTP_TOKEN. Launcher'ın onay ucuna buradan
+# gidilmez — karar her zaman sunucunun üzerinden, aynı kayıtla verilir.
+ADT_HTTP_URL = "http://127.0.0.1:8787"
+APPROVAL_ENV = "AXET_ABAPGIT_ONAY_ID"
+EXIT_REFUSED = 2
+EXIT_PENDING = 3
+_TIMEOUT_S = 120
+
+
+def _refuse(error: str, message: str) -> int:
+    print(f"REFUSED [GR_APPROVAL] {error}: {message}", file=sys.stderr, flush=True)
+    return EXIT_REFUSED
+
+
+def require_write_approval(script: str, paket: str = "", transport: str = "",
+                           zip_dosyasi: str = "", url: str | None = None) -> int | None:
+    """None: yazma onaylı (kimlik AXET_ABAPGIT_ONAY_ID'de, alt adımlara geçer).
+
+    Aksi hâlde script'in döneceği çıkış kodu; mesaj basılmış olur:
+      3 — onay NTT Studio penceresinde bekliyor. stdout'a `approval_pending:` ile
+          başlayan satır basılır; kullanıcı onaylayınca AYNI komut tekrar çalıştırılır.
+      2 — reddedildi, mod uygun değil, sunucuya ulaşılamadı ya da cevap anlaşılmadı.
+    Kapalı başarısız: 'izinli' dışındaki her şey ret.
+    """
+    token = os.environ.get("ABAP_HTTP_TOKEN", "")
+    if not token:
+        return _refuse("approval_unavailable",
+                       "ABAP_HTTP_TOKEN ortamda yok. Bu script NTT Studio'nun DEV oturumundaki "
+                       "ajan terminalinden çalıştırılmalı.")
+    zip_abs = str(Path(zip_dosyasi).resolve()) if zip_dosyasi else ""
+    body = {"script": Path(script).name, "paket": paket or "", "transport": transport or "",
+            "zip_dosyasi": zip_abs, "ust_onay": os.environ.get(APPROVAL_ENV, "")}
+    req = urllib.request.Request(
+        (url or ADT_HTTP_URL) + "/tool/axet_abapgit_onay",
+        data=json.dumps(body).encode("utf-8"),
+        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
+        method="POST")
+    # Kurumsal makinede HTTP(S)_PROXY tanımlı olabilir; loopback proxy'ye gitmesin.
+    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
+    try:
+        with opener.open(req, timeout=_TIMEOUT_S) as resp:
+            out = json.loads(resp.read().decode("utf-8"))
+    except urllib.error.HTTPError as exc:
+        if exc.code == 401:
+            return _refuse("approval_unavailable", "8787 token'ı kabul etmedi (401).")
+        if exc.code == 404:
+            return _refuse("approval_unavailable",
+                           "8787'deki sunucuda axet_abapgit_onay yok: onaylı sunucu çalışmıyor. "
+                           "NTT Studio'da sistemi DEV olarak yeniden aç.")
+        if exc.code == 503:
+            return _refuse("sap_session_busy",
+                           "SAP oturumu başka bir çağrıda meşgul. Biraz sonra aynı komutu tekrar çalıştır.")
+        return _refuse("approval_unavailable", f"8787 HTTP {exc.code} döndü.")
+    except (urllib.error.URLError, OSError, ValueError) as exc:
+        return _refuse("approval_unavailable",
+                       f"8787'ye ulaşılamadı ya da cevap okunamadı ({exc}). "
+                       "Onaylı sunucu olmadan SAP'a yazılmaz.")
+    if not isinstance(out, dict):
+        return _refuse("approval_unavailable", "8787'nin cevabı anlaşılmadı.")
+    onay_id = out.get("onay_id")
+    if out.get("ok") is True and isinstance(onay_id, str) and onay_id:
+        os.environ[APPROVAL_ENV] = onay_id
+        return None
+    error = str(out.get("error") or "approval_unavailable")
+    message = str(out.get("message") or error)
+    if error == "approval_pending":
+        print(f"approval_pending: {message}", flush=True)
+        return EXIT_PENDING
+    return _refuse(error, message)
````

- [ ] **Step 5: Yazan 9 script'e onay çağrısını ekle**

Sekiz script'te çağrı DEV kapısının (`require_dev_tier`) hemen ardından, SAP GUI'ye dokunan ilk satırdan önce. `abapgit_deploy.py`'de ZIP belli olunca, login'den önce.

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py`:

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py
index a463bea..49bf402 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py
@@ -167,6 +167,15 @@ def main() -> int:
         zip_path = str(zips[0])
     print(f"      ZIP: {zip_path}")
 
+    # NTT Studio — SAP DEV yazma onayı. ZIP ancak export'tan sonra belli (export
+    # yereldir, SAP'a dokunmaz); onay ZIP'in kendisine veriliyor, login'den önce.
+    # Onay kimliği AXET_ABAPGIT_ONAY_ID ile alt adımlara geçer; onlar yeniden sormaz.
+    from tier_gate import require_write_approval
+    rc = require_write_approval(__file__, paket=args.package, transport=args.transport,
+                                zip_dosyasi=str(zip_path))
+    if rc is not None:
+        return rc
+
     # ---- 2/4: ensure SAPGUI session ----
     if not args.no_login:
         rc, _ = _run_step(f"[2/4] gui_login.py --system {args.system!r}",
````

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_bootstrap.py`:

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_bootstrap.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_bootstrap.py
index be04f6f..7db87e8 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_bootstrap.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_bootstrap.py
@@ -93,6 +93,12 @@ def main() -> int:
         print(refused, file=sys.stderr)
         return 2
 
+    # NTT Studio — SAP DEV yazma onayı: SAP'a dokunmadan önce NTT Studio penceresine sor.
+    from tier_gate import require_write_approval
+    rc = require_write_approval(__file__, paket=args.package)
+    if rc is not None:
+        return rc
+
     cwd = Path(args.cwd).resolve()
     cwd.mkdir(parents=True, exist_ok=True)
     package = args.package.upper()
````

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_import_zip.py`:

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_import_zip.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_import_zip.py
index 6fcba97..4eef9c0 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_import_zip.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_import_zip.py
@@ -162,6 +162,12 @@ def main() -> int:
         print(refused, file=sys.stderr)
         return 2
 
+    # NTT Studio — SAP DEV yazma onayı: SAP'a dokunmadan önce NTT Studio penceresine sor.
+    from tier_gate import require_write_approval
+    rc = require_write_approval(__file__, zip_dosyasi=args.zip)
+    if rc is not None:
+        return rc
+
     zip_path = Path(args.zip).resolve()
     if not zip_path.exists():
         print(f"FAIL: ZIP not found: {zip_path}", file=sys.stderr)
````

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_activate_package.py`:

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_activate_package.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_activate_package.py
index 0d2252c..af5503c 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_activate_package.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_activate_package.py
@@ -173,6 +173,12 @@ def main() -> int:
         print(refused, file=sys.stderr)
         return 2
 
+    # NTT Studio — SAP DEV yazma onayı: SAP'a dokunmadan önce NTT Studio penceresine sor.
+    from tier_gate import require_write_approval
+    rc = require_write_approval(__file__, paket=args.package)
+    if rc is not None:
+        return rc
+
     try:
         app = attach_scripting_engine()
         session = get_session(app, args.connection_index, args.session_index)
````

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_stage_commit.py`:

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_stage_commit.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_stage_commit.py
index 62b1cf8..1eb301c 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_stage_commit.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_stage_commit.py
@@ -111,6 +111,12 @@ def main() -> int:
         print(refused, file=sys.stderr)
         return 2
 
+    # NTT Studio — SAP DEV yazma onayı: SAP'a dokunmadan önce NTT Studio penceresine sor.
+    from tier_gate import require_write_approval
+    rc = require_write_approval(__file__)
+    if rc is not None:
+        return rc
+
     try:
         app = attach_scripting_engine()
         session = get_session(app, args.connection_index, args.session_index)
````

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_auto.py`:

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_auto.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_auto.py
index f025c38..c666cad 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_auto.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_auto.py
@@ -126,6 +126,12 @@ def main() -> int:
         print(refused, file=sys.stderr)
         return 2
 
+    # NTT Studio — SAP DEV yazma onayı: SAP'a dokunmadan önce NTT Studio penceresine sor.
+    from tier_gate import require_write_approval
+    rc = require_write_approval(__file__, transport=args.transport, zip_dosyasi=args.zip)
+    if rc is not None:
+        return rc
+
     zip_path = Path(args.zip).resolve()
     if not zip_path.exists():
         print(f"FAIL: ZIP not found: {zip_path}", file=sys.stderr)
````

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap.py`:

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap.py
index a52e508..d3044f1 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap.py
@@ -107,6 +107,12 @@ def main() -> int:
         print(refused, file=sys.stderr)
         return 2
 
+    # NTT Studio — SAP DEV yazma onayı: SAP'a dokunmadan önce NTT Studio penceresine sor.
+    from tier_gate import require_write_approval
+    rc = require_write_approval(__file__, paket=args.package)
+    if rc is not None:
+        return rc
+
     out_path = Path(args.out).resolve()
     out_path.parent.mkdir(parents=True, exist_ok=True)
     if out_path.exists():
````

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap_multi.py`:

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap_multi.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap_multi.py
index 003c384..b415520 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap_multi.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap_multi.py
@@ -121,6 +121,12 @@ def main() -> int:
         print(refused, file=sys.stderr)
         return 2
 
+    # NTT Studio — SAP DEV yazma onayı: SAP'a dokunmadan önce NTT Studio penceresine sor.
+    from tier_gate import require_write_approval
+    rc = require_write_approval(__file__)
+    if rc is not None:
+        return rc
+
     objs_path = Path(args.objs).resolve()
     if not objs_path.exists():
         print(f"FAIL: picks file not found: {objs_path}", file=sys.stderr)
````

`resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_deploy_multi.py`:

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_deploy_multi.py b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_deploy_multi.py
index 9fb4fe0..f5f0eb5 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_deploy_multi.py
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_deploy_multi.py
@@ -120,6 +120,12 @@ def main() -> int:
         print(refused, file=sys.stderr)
         return 2
 
+    # NTT Studio — SAP DEV yazma onayı: SAP'a dokunmadan önce NTT Studio penceresine sor.
+    from tier_gate import require_write_approval
+    rc = require_write_approval(__file__, transport=args.transport, zip_dosyasi=args.zip)
+    if rc is not None:
+        return rc
+
     zip_path = Path(args.zip).resolve()
     if not zip_path.exists():
         print(f"FAIL: ZIP not found: {zip_path}", file=sys.stderr)
````

- [ ] **Step 6: Testleri koş**

Run: `PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/test_tier_gate_approval.py`
Expected: son satır `20/20 geçti`.

Run: `npx vitest run tests/tierWriteGates.test.ts`
Expected: `25 passed`.

Bu adım yazılırken 11 mutasyon denendi (proxy korunmuyor, `ok` gevşek, bekleyene 2 dönmek, kimliği ortama yazmamak, ZIP'i göreli göndermek, `ust_onay`'ı göndermemek, token yokken sormak, `gui_import_zip`'i kapısız bırakmak, `abapgit_deploy`'da onayı login'den sonraya almak, `gui_stage_commit`'i kapısız bırakmak, script'e `ADT_APPROVAL_URL` yazmak); hepsini testler yakaladı.

- [ ] **Step 7: Commit**

```bash
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/tier_gate.py resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/test_tier_gate_approval.py tests/tierWriteGates.test.ts
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_bootstrap.py
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_import_zip.py
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_activate_package.py
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_stage_commit.py
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_auto.py
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap.py
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_bootstrap_multi.py
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/scripts/gui_run_zabapgit_deploy_multi.py
git commit -m "SAP yazma onayi: abapGit script'leri NTT Studio onayina soruyor

DEV kapisindan gecen her yazan script, SAP GUI'ye dokunmadan once 8787'deki
onayli sunucunun axet_abapgit_onay aracina soruyor. Cikis 3 +
'approval_pending:' satiri = onay bekliyor, cikis 2 + REFUSED [GR_APPROVAL]
= ret. Onay kimligi alt adimlara AXET_ABAPGIT_ONAY_ID ile geciyor.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Ajan talimatları ve araç sayıları

**Files:**
- Create: `tests/sapWriteGateContract.test.ts`
- Modify: `app-electron/main/launcher.ts` (`adtServerScriptFor` yorumu/etiketi, `buildContextMarkdown` DEV metinleri, `readonlyServerStatusLine`)
- Modify: `app-electron/main/adtReadonlyServerManager.ts`, `app-electron/main/sapToolkit.ts`, `app-electron/main/skillProfiles.ts` (sayılar)
- Modify: `resources/sap-toolkit/CLAUDE.md`, `resources/sap-toolkit/README.md`
- Modify: `resources/sap-toolkit/sap-consultant/skills/sap-adt/SKILL.md`, `resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/SKILL.md`, `resources/sap-toolkit/sap-consultant/skills/abap-code-review/SKILL.md`, `resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/SKILL.md`

**Interfaces:**
- Consumes: Task 3-4'ün hata kodları (`approval_pending`, `approval_denied`, `approval_unavailable`, `yerel_mod`, `mod_secilmedi`, `mod_belirtilmeli`, `kaynak_dosyasi_gerekli`, `kaynak_dosyasi_yok`, `inceleme_yok`, `inceleme_eski`, `kritik_bulgu`, `transport_belirsiz`) ve üç aracı (`axet_teslim`, `axet_abapgit_onay`, `axet_inceleme_kaydet(nesne, tip, kaynak_dosyalari, bulgular, rapor="", skill="abap-code-review")`); Task 5'in `adtServerScriptFor` ve yönetici `expected` alanı; Task 7'nin çıkış kodları.
- Produces: ajana giden metin (sap-context.md, SKILL.md'ler) ve metni kilitleyen sözleşme testi. Kod davranışı değişmez.

**Araç sayıları (ölçüldü, `py -3 adt_gated_server.py --list-tools` ve readonly sunucunun kaydı):** motor 50 araç; DEV'deki onaylı sunucu **53** (50 + 3 `axet_*`); read-only sarmalayıcı **19** araç gösteriyor + 3'ü ortam değişkeniyle açılıyor (`adt_unit_test`, `adt_sql`, `adt_dumps`), **28** yazan araç hiç kaydedilmiyor. Eski metinlerdeki 33 / 17 / 13 her yerde (yukarı akışın readonly belgesi ve README dahil) bu sayılarla değişiyor.

**Bilinen dolanma yolları — yalnızca talimatla kapatılıyor** (spec: "güvenlik sınırı değil"): `adt-tool.ps1 -Method` her HTTP metodunu kabul ediyor; `generate_screen.py`/`generate_adobe.py` CLI'ları onaya sormuyor (yalnızca DEV kapısı var). Talimat ikisini de adıyla yasaklıyor; teknik kapı Review Focus'ta.

- [ ] **Step 1: Başarısız sözleşme testini yaz**

`tests/sapWriteGateContract.test.ts` (yeni dosya, LF):

````ts
// SAP DEV yazma onayı — kablolama ve ajana giden talimatlar. Senkron ya da bir
// yeniden yazım silerse bu test kırılsın.
//
// Onay kapısı üç parçadan oluşuyor ve hiçbiri tek başına yetmiyor: launcher'ın
// onay ucu (sapWrite/server.ts), 8787'deki onaylı sunucu (adt_gated_server.py)
// ve abapGit script'lerinin kapısı (tier_gate.py). Ajan kapıyı yalnızca bir
// hata kodu olarak görüyor; ne yapacağını bilmezse `approval_pending`'i arıza
// sanıp başka yoldan yazmayı dener. O yüzden talimatların varlığı da burada
// kilitleniyor. Davranış Python testlerinde (`py -3`) ölçülüyor; CI'da Python
// olmadığı için burada statik kontrol ediliyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");

const SKILLS = ["resources", "sap-toolkit", "sap-consultant", "skills"];
const launcher = read("app-electron", "main", "launcher.ts");
const manager = read("app-electron", "main", "adtReadonlyServerManager.ts");
const gated = read(...SKILLS, "sap-adt", "scripts", "adt_gated_server.py");
const tierGate = read("resources", "sap-toolkit", "sapgui-scriptter", "skills", "abapgit-deploy", "scripts", "tier_gate.py");

describe("kablolama — DEV'de açılan sunucu onaylı sunucu", () => {
  it("adtServerScriptFor DEV'de adt_gated_server.py'yi açıyor, motoru doğrudan açmıyor", () => {
    const fn = launcher.slice(launcher.indexOf("function adtServerScriptFor("));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain('"adt_gated_server.py"');
    expect(body).not.toContain("adt_mcp_server.py");
    expect(body).toContain("53 araç");
    expect(body).toContain("(19 araç)");
  });

  it("onay ucunun adresi ve token'ı yalnızca onaylı sunucunun ortamına gidiyor", () => {
    expect(manager).toContain("env.ADT_APPROVAL_URL =");
    expect(manager).toContain("env.ADT_APPROVAL_TOKEN =");
    expect(gated).toContain('os.environ.get("ADT_APPROVAL_URL"');
    expect(gated).toContain('os.environ.get("ADT_APPROVAL_TOKEN"');
    // sap-context.md launcher'da üretiliyor; token oraya sızmasın.
    expect(launcher).not.toContain("ADT_APPROVAL_TOKEN");
    // abapGit script'leri launcher'a doğrudan gitmiyor, 8787'deki sunucuya soruyor.
    expect(tierGate).toContain('"/tool/axet_abapgit_onay"');
    expect(tierGate).not.toMatch(/ADT_APPROVAL_(URL|TOKEN)/);
  });

  it("/health sayısı yüzeyle uyuşmazsa beklenen 53 / 19", () => {
    expect(manager).toContain('expected: opts.expectWritable ? "53" : "19"');
  });

  it("hiçbir yerde eski 33 / 17 / 13 araç sayısı kalmadı", () => {
    const files = [
      launcher,
      manager,
      read("app-electron", "main", "sapToolkit.ts"),
      read("app-electron", "main", "skillProfiles.ts"),
      read("resources", "sap-toolkit", "CLAUDE.md"),
      read(...SKILLS, "sap-adt", "SKILL.md"),
      read(...SKILLS, "sap-adt-readonly", "SKILL.md")
    ];
    for (const src of files) {
      expect(src).not.toMatch(/\b(33|17|13) (araç|tool)|\b(33|17) araçlık|yazan 13|all 33|— 33 tools|engine's 33/);
    }
  });
});

describe("sap-context.md — DEV'de ajana onay akışı anlatılıyor", () => {
  const dev = launcher.slice(launcher.indexOf("function buildContextMarkdown("));

  it.each([
    "approval_pending",
    "approval_denied",
    "approval_unavailable",
    "yerel_mod",
    "axet_teslim",
    "%abap-code-review",
    "axet_inceleme_kaydet",
    "kritik_bulgu",
    "transport_belirsiz",
    "source_file"
  ])("%s geçiyor", (needle) => {
    expect(dev).toContain(needle);
  });

  it("approval_pending'de aynı çağrı aynı argümanlarla tekrarlanıyor (MCP ve abapGit ayrı ayrı)", () => {
    // İkisi de `approval_pending` geçiyor; biri silinince öteki testi yeşil tutmasın.
    expect(dev).toContain("**AYNI çağrıyı AYNI argümanlarla** tekrar gönder");
    expect(dev).toContain("\\`approval_pending:\\` satırı ve çıkış kodu 3");
  });

  it("DEV'de sunucuyu elle başlatma deniyor (onay ortamı olmadan her yazma reddedilir)", () => {
    expect(dev).toContain("DEV'de sunucuyu ELLE BAŞLATMA");
  });

  it("adt-tool.ps1 DEV'de yazma için kullanılmıyor", () => {
    // Kaynakta şablon dizesi içinde: ters tırnaklar kaçışlı.
    expect(dev).toContain("\\`adt-tool.ps1\\` ile SAP'a YAZMA");
  });
});

describe("SKILL.md — onay blokları", () => {
  const sapAdt = read(...SKILLS, "sap-adt", "SKILL.md");
  const deploy = read("resources", "sap-toolkit", "sapgui-scriptter", "skills", "abapgit-deploy", "SKILL.md");
  const review = read(...SKILLS, "abap-code-review", "SKILL.md");

  it("sap-adt: onay akışı, source_file, dolanma yasağı, 53/19", () => {
    expect(sapAdt).toContain("NTT Studio uyarlaması — SAP DEV yazma onayı");
    for (const s of ["approval_pending", "approval_denied", "yerel_mod", "axet_teslim", "source_file", "kritik_bulgu"]) {
      expect(sapAdt).toContain(s);
    }
    expect(sapAdt).toContain("DEV'de 53 araç");
    expect(sapAdt).toContain("diğer sistemlerde 19");
  });

  it("abapgit-deploy: exit 3 + approval_pending tekrar yazdırılıyor, exit 2 + GR_APPROVAL duruyor", () => {
    expect(deploy).toContain("NTT Studio uyarlaması — SAP DEV yazma onayı");
    // Üstteki blok ve döngünün çıkış listesi ayrı ayrı: biri kaybolursa ajan
    // döngüdeyken bekleyen onayı arıza sanıyor.
    expect(deploy).toContain("> - Çıktıda `approval_pending:` satırı ve **çıkış kodu 3**");
    expect(deploy).toContain("> - `REFUSED [GR_APPROVAL]` ve **çıkış kodu 2**");
    expect(deploy).toContain("**Exit 3 with an `approval_pending:` line**");
    expect(deploy).toContain("**Exit 2 with `REFUSED [GR_APPROVAL]`**");
    expect(deploy).toContain('tip="functiongroup"');
  });

  it("abap-code-review: inceleme axet_inceleme_kaydet ile kaydediliyor, token ortamdan", () => {
    expect(review).toContain("/tool/axet_inceleme_kaydet");
    expect(review).toContain("os.environ['ABAP_HTTP_TOKEN']");
    for (const s of ["kaynak_dosyalari", "bulgular", '"kritik"', "functiongroup"]) {
      expect(review).toContain(s);
    }
  });
});

describe("CLAUDE.md — uyarlama tablosu", () => {
  const claude = read("resources", "sap-toolkit", "CLAUDE.md");

  it.each([
    "adt_gated_server.py",
    "gated_collect.py",
    "gated_quality.py",
    "tier_gate.py",
    "test_tier_gate_approval.py",
    "abap-code-review/SKILL.md",
    "abapgit-deploy/SKILL.md"
  ])("%s satırı var", (file) => {
    const table = claude.slice(claude.indexOf("| Dosya | Ne degistirildi | Neden |"));
    expect(table).toContain(file);
  });

  it("dördüncü kapı: NTT Studio onayı", () => {
    expect(claude).toContain("NTT Studio write approval");
  });
});
````

- [ ] **Step 2: Testin kırıldığını gör**

Run: `npx vitest run tests/sapWriteGateContract.test.ts`
Expected: FAIL — araç sayıları (`(19 araç)`, `"53" : "19"`, eski 33/17/13), sap-context metinleri, SKILL.md blokları, CLAUDE.md satırları. "onay ucunun adresi ve token'ı…" testi Task 3, 5 ve 7'den dolayı zaten geçer.

- [ ] **Step 3: `launcher.ts` — talimatlar ve sayılar**

Her "Bul" metni dosyada tam bir kez geçer. Şablon dizelerindeki ters tırnaklar kaynakta kaçışlı (`\``) — olduğu gibi kopyala.

1. Bul:

````text
// değişmiyor, yalnızca /health'in saydığı araç sayısı değişiyor (53'e karşı
// 17).
````

   Şununla değiştir:

````text
// değişmiyor, yalnızca /health'in saydığı araç sayısı değişiyor (53'e karşı
// 19).
````

2. Bul:

````text
label: "ADT read-only sunucusu (17 araç)"
````

   Şununla değiştir:

````text
label: "ADT read-only sunucusu (19 araç)"
````

3. Bul:

````text
          ? `- **\`%sap-adt\`** — bu sistem **DEV** olarak işaretli, yani ADT motoru **yazma açık** çalışıyor: 33 araç, \`adt_push\`/\`adt_activate\`/\`adt_create\`/\`adt_create_transport\` dahil. Bu klasördeki \`.conn_adt\` zaten bu server ile **aynı formatta ve doğrulanmış** — doğrudan kullanılabilir, tekrar kimlik/URL sormaya gerek yok.
  - **Her yazmadan önce transport'u kullanıcıya doğrulat** (\`adt_list_transports\` ile göster, hangisi olduğunu SOR). Paket adını asla tahmin etme, sor.

````

   Şununla değiştir:

````text
          ? `- **\`%sap-adt\`** — bu sistem **DEV** olarak işaretli, yani ADT sunucusu **onaylı yazma** ile çalışıyor: 53 araç (motorun 50 aracı + \`axet_teslim\`, \`axet_abapgit_onay\`, \`axet_inceleme_kaydet\`). Okuyan araçlar serbest; SAP'a yazan her çağrı NTT Studio'da kullanıcının önüne bir **onay penceresi** açar. Bu klasördeki \`.conn_adt\` zaten bu server ile **aynı formatta ve doğrulanmış** — doğrudan kullanılabilir, tekrar kimlik/URL sormaya gerek yok.
  - **Çalışma modunu kullanıcı seçer** (NTT Studio, oturum başına): "doğrudan DEV'e yaz" ya da "önce yerelde çalış, sonra teslim et". Mod seçilmeden yazma \`mod_secilmedi\` ile reddedilir — kullanıcıdan NTT Studio'da seçmesini iste, modu sen seçme.
  - Yazan bir çağrı \`approval_pending\` dönerse: kullanıcıya NTT Studio'daki onay penceresini söyle; onayladıktan sonra **AYNI çağrıyı AYNI argümanlarla** tekrar gönder. \`approval_denied\` → dur, başka bir yoldan deneme, kullanıcıya ne istediğini sor. \`approval_unavailable\` → NTT Studio'nun açık olduğunu sor; onay yoksa yazma yok.
  - \`yerel_mod\` → bu oturum yerelde çalışıyor: \`src/\` altında geliştir, iş bitince \`axet_teslim\` ile tek pencerede teslim onayı iste, sonra aynı nesneleri aynı kaynak dosyalarıyla ve aynı transport'la yaz.
  - **Kod yazan her işte önce \`%abap-code-review\`**, ardından \`axet_inceleme_kaydet\` ile kaydet (hash'i sunucu hesaplar). Kaynak satır içi gönderilmez: dosyaya yaz, \`source_file\` ile ver. \`inceleme_yok\` / \`inceleme_eski\` → incelemeyi bu kaynakla yeniden çalıştır. \`kritik_bulgu\` **kesin engel**: aşma yolu yok, kodu düzelt ve yeniden incele.
  - \`transport_belirsiz\` → hangi transport olduğunu kullanıcıya SOR (\`adt_list_transports\` ile göster). Paket adını asla tahmin etme, sor.
  - \`adt-tool.ps1\` ile SAP'a YAZMA; kabuktan, \`generate_screen.py\`/\`generate_adobe.py\` script'lerini doğrudan çalıştırarak ya da SAP GUI'den dolanarak da yazma. Ekran/Adobe üretimi DEV'de 8787'deki \`adt_generate_screen\`/\`adt_generate_adobe\` araçlarından geçer — onay penceresinin amacı her yazmayı kullanıcının görmesi.

````

4. Bul:

````text
salt okunur** yüzeyle çalışıyor: yazan 13 araç MCP kaydına hiç girmiyor. 17 araç var (
````

   Şununla değiştir:

````text
salt okunur** yüzeyle çalışıyor: yazan 28 araç MCP kaydına hiç girmiyor. 19 araç var (
````

5. Bul:

````text
" (geliştirici SAPGUI'de import eder). DEV'de doğrudan `adt_push` da mümkün; hangisinin istendiğini kullanıcıya sor — ekibin teslim akışı senin tercihin değil."
````

   Şununla değiştir:

````text
" (geliştirici SAPGUI'de import eder). DEV'de doğrudan yazmak mı, yerelde çalışıp teslim etmek mi — bunu NTT Studio'da kullanıcının seçtiği çalışma modu belirler; ekibin teslim akışı senin tercihin değil."
````

6. Bul:

````text
— bu sistem DEV, yazma açık. Her yazmadan önce transport'u ve paketi kullanıcıya doğrulat.`
````

   Şununla değiştir:

````text
— bu sistem DEV, yazma açık ama onaylı. Her yazmadan önce transport'u ve paketi kullanıcıya doğrulat. \`%abapgit-deploy\` script'leri SAP GUI'ye dokunmadan önce NTT Studio onayı ister: \`approval_pending:\` satırı ve çıkış kodu 3 → kullanıcıya pencereyi söyle, onaydan sonra AYNI komutu yeniden ver; \`REFUSED [GR_APPROVAL]\` ve çıkış kodu 2 → dur, başka yoldan deneme.`
````

7. Bul:

````text
          ? ", 33 tool (okuma + yazma: adt_push, adt_activate, adt_create*, adt_create_transport, …)"
          : ", 17 read-only tool (
````

   Şununla değiştir:

````text
          ? ", 53 tool (okuma + onaylı yazma: adt_push, adt_activate, adt_create*, adt_create_transport, … + axet_teslim, axet_abapgit_onay, axet_inceleme_kaydet)"
          : ", 19 read-only tool (
````

8. Bul:

````text
# SADECE yukarıdaki durum "BAŞARISIZ" ise elle başlat (run_in_background: true).
````

   Şununla değiştir:

````text
# SADECE yukarıdaki durum "BAŞARISIZ" ise ve sistem DEV DEĞİLSE elle başlat (run_in_background: true).
````

9. Bul:

````text
          ? `Bu sistem DEV: server yazma araçlarını da sunuyor. Yazmadan önce transport'u kullanıcıya doğrulat, paket adını sor. QA/PRD'ye bağlıyken aynı server hiç açılmaz — onun yerine 17 araçlık sarmalayıcı açılır.`
          : `Bu server SAP'a yazmayı **yüzeyden** engelliyor: yazan 13 araç MCP kaydına hiç girmiyor, yani 404 bile dönmüyor — öyle bir araç yok. Bir yolunu arama.`
````

   Şununla değiştir:

````text
          ? `Bu sistem DEV: server yazma araçlarını da sunuyor, her yazma NTT Studio'nun onayından geçer (yukarıdaki \`%sap-adt\` maddesine bak). **DEV'de sunucuyu ELLE BAŞLATMA**: onay ucunun adresi ve anahtarı yalnızca NTT Studio'nun başlattığı sunucuya verilir; elle açılan sunucu her yazmayı \`approval_unavailable\` ile reddeder. Otomatik başlatma başarısızsa kullanıcıdan sistemi NTT Studio'da yeniden bağlamasını iste. QA/PRD'ye bağlıyken bu server hiç açılmaz — onun yerine 19 araçlık sarmalayıcı açılır.`
          : `Bu server SAP'a yazmayı **yüzeyden** engelliyor: yazan 28 araç MCP kaydına hiç girmiyor, yani 404 bile dönmüyor — öyle bir araç yok. Bir yolunu arama.`
````

10. Bul:

````text
    }
    return `- **Otomatik başlatma BAŞARISIZ**: ${readonlyOutcome.detailNote}\n  Elle başlatman gerekiyor
````

   Şununla değiştir:

````text
    }
    if (writable) {
      return `- **Otomatik başlatma BAŞARISIZ**: ${readonlyOutcome.detailNote}\n  Bu sistem DEV: sunucuyu elle başlatma (onay ucu olmadan her yazma reddedilir). Kullanıcıdan sistemi NTT Studio'da yeniden bağlamasını iste.`;
    }
    return `- **Otomatik başlatma BAŞARISIZ**: ${readonlyOutcome.detailNote}\n  Elle başlatman gerekiyor
````

- [ ] **Step 4: Yönetici, `sapToolkit.ts`, `skillProfiles.ts` — sayılar**

`app-electron/main/adtReadonlyServerManager.ts`:

1. Bul:

````text
DEV sistemde yazan motoru (33 araç), aksi hâlde sarmalayıcıyı (17 araç)
````

   Şununla değiştir:

````text
DEV sistemde onaylı yazma sunucusunu (53 araç), aksi hâlde sarmalayıcıyı (19 araç)
````

2. Bul:

````text
// 33 araç adı birkaç KB;
````

   Şununla değiştir:

````text
// 53 araç adı birkaç KB;
````

3. Bul:

````text
yanlış ama zararsız: DEV'de 17 araçlık sunucuyu
````

   Şununla değiştir:

````text
yanlış ama zararsız: DEV'de 19 araçlık sunucuyu
````

4. Bul:

````text
expected: opts.expectWritable ? "50" : "17"
````

   Şununla değiştir:

````text
expected: opts.expectWritable ? "53" : "19"
````

`app-electron/main/sapToolkit.ts`:

1. Bul:

````text
mu açılacak (`sap-adt`, 33 araç),
   * yoksa sarmalayıcı mı (`sap-adt-readonly`, 17 araç)?
````

   Şununla değiştir:

````text
mu açılacak (`sap-adt`, onaylı yazma, 53 araç),
   * yoksa sarmalayıcı mı (`sap-adt-readonly`, 19 araç)?
````

`app-electron/main/skillProfiles.ts`:

1. Bul:

````text
//   sap-adt              motorun kendisi, 33 araç, yazma dahil
````

   Şununla değiştir:

````text
//   sap-adt              motor (50 araç) + onay katmanı, 53 araç, onaylı yazma dahil
````

2. Bul:

````text
//                        13 yazan aracı MCP kaydından siliyor (17 araç kalır)
````

   Şununla değiştir:

````text
//                        28 yazan aracı MCP kaydından siliyor (19 araç kalır)
````

3. Bul:

````text
// yüzey: yazan 13 araç MCP kaydına hiç girmiyor,
````

   Şununla değiştir:

````text
// yüzey: yazan 28 araç MCP kaydına hiç girmiyor,
````

4. Bul:

````text
motorun TAMAMINI alır — 33 araç, push/activate/transport
````

   Şununla değiştir:

````text
motorun TAMAMINI alır — 53 araç, push/activate/transport
````

5. Bul:

````text
`sap-adt-readonly`'ye düşer (17 araç).
````

   Şununla değiştir:

````text
`sap-adt-readonly`'ye düşer (19 araç).
````

6. Bul:

````text
DEV'e bağlandığı anda 33 araçlık yazan motoru alırdı
````

   Şununla değiştir:

````text
DEV'e bağlandığı anda 53 araçlık yazan sunucuyu alırdı
````

7. Bul:

````text
onun 33 aracının her birine
````

   Şununla değiştir:

````text
onun 28 yazan aracının her birine
````

- [ ] **Step 5: `resources/sap-toolkit/CLAUDE.md` — dördüncü kapı ve uyarlama tablosu**

Dosya çalışma ağacında CRLF; düzenlemeden sonra satır sonları korunmalı (index'te LF).

````diff
diff --git a/resources/sap-toolkit/CLAUDE.md b/resources/sap-toolkit/CLAUDE.md
index a4b7d99..f77bfb3 100644
--- a/resources/sap-toolkit/CLAUDE.md
+++ b/resources/sap-toolkit/CLAUDE.md
@@ -21,7 +21,7 @@ single file.
 Until 2026-09-23 this toolkit could not write to SAP at all. That changed by user
 decision (*"artık sap sistemlerindeki readonly modu kaldırabiliriz dev sistemde
 geliştirme, deploy gibi işlemleri yapabiliriz"*) — but the gate did not disappear, it
-**moved**, and there are now three of them. They are deliberately redundant; do not
+**moved**, and there are now four of them. They are deliberately redundant; do not
 collapse them into one.
 
 | # | Gate | Where | What it sees |
@@ -29,6 +29,7 @@ collapse them into one.
 | 1 | which skills are installed | `planSkills()` in the launcher's `skillProfiles.ts` | role + tier |
 | 2 | which server is started on 8787 | `adtServerScriptFor()` in `launcher.ts`, fed from `SkillInstallResult.adtWriteSurface` | role + tier |
 | 3 | the engine's own `require_writable()` | `sap-adt/scripts/guardrails.py`, `_WRITABLE_TIERS = {"DEV"}` | tier only |
+| 4 | NTT Studio write approval | `sap-adt/scripts/adt_gated_server.py` (28 write tools) and `abapgit-deploy/scripts/tier_gate.py` (`require_write_approval`) ask the launcher's approval endpoint (`app-electron/main/sapWrite/`) | every single write: work mode, transport, review record |
 
 Gate 3 **cannot see the role**, which is why gate 2 has to exist: skills are documentation
 the agent reads, but the HTTP port is the surface it actually calls. If those two were
@@ -51,7 +52,7 @@ preserve its two internal locks:
 
 - **Belt** — `ADT_READONLY=true` is set *before* the engine is imported, so every write
   path refuses at source (`GR_READONLY`).
-- **Suspenders** — the 13 write-capable tools are removed from the registry before the
+- **Suspenders** — the 28 write-capable tools are removed from the registry before the
   transport starts, so they are neither listed nor callable (`404 unknown_tool`).
   Unsetting `ADT_READONLY` afterwards does not bring them back.
 
@@ -60,7 +61,7 @@ ALLOW / GATED / DENY, and an unclassified one makes the server refuse to start,
 A new upstream write tool therefore cannot silently inherit "exposed".
 
 The engine under `sap-adt/scripts/` is **vendored verbatim** from upstream. Do not edit it
-to add features here — both servers wrap it unchanged, and the read-only one imports it
+to add features here — the read-only and the gated server both wrap it unchanged and import it
 from its sibling folder rather than keeping a second copy.
 
 ## How SAP is reached (the MCP workaround)
@@ -69,11 +70,13 @@ aXet.code can't speak MCP stdio, so SAP ADT runs behind a localhost HTTP server
 **one persistent SAP session**. Two entrypoints, one engine, exactly one running:
 
 ```bash
-# Read-only surface — 17 tools. NOTE: --http is mandatory; without it this speaks MCP stdio.
+# Read-only surface — 19 tools. NOTE: --http is mandatory; without it this speaks MCP stdio.
 ADT_CWD=$(pwd) py sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py --http --port 8787
 
-# Write surface — the engine's 33 tools. Technical consultant + DEV only.
-ADT_CWD=$(pwd) py sap-consultant/skills/sap-adt/scripts/adt_mcp_server.py --http --port 8787
+# Write surface — 53 tools: the engine's 50 behind the approval layer, + 3 axet_* tools.
+# Technical consultant + DEV only. The LAUNCHER starts it with ADT_APPROVAL_URL/ADT_APPROVAL_TOKEN;
+# started by hand it has neither, and refuses every write with approval_unavailable.
+ADT_CWD=$(pwd) py sap-consultant/skills/sap-adt/scripts/adt_gated_server.py --http --port 8787
 
 # Health / auth — /health names the surface and lists the tools. Ask it; never guess.
 python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())"
@@ -226,7 +229,8 @@ Where a transport is not the vehicle, use the `abapgit-workflow` skill: Claude e
 developer-in-the-loop by design; there is no SAP-side automation.
 
 None of this replaces the older rule: **every SAP write needs a named human's approval and
-a transport they confirmed.** The three gates cannot enforce that one for you.
+a transport they confirmed.** Gate 4 is the window where that human says yes; it asks, it
+does not decide for them — the agent still confirms transport and package in the chat.
 
 ## Upstream'den AYRILAN dosyalar (yenilerken üstüne yazma)
 
@@ -242,7 +246,9 @@ cikan sayi, ustune yazilmis bir uyarlamadir. 2026-09-23'te tam da bu oldu: topta
 
 | Dosya | Ne degistirildi | Neden |
 | --- | --- | --- |
-| `sap-consultant/skills/sap-adt/SKILL.md` | `description`'a + govdenin basina "MCP degil, HTTP" blogu (8787, bearer token, "`adt_*` gormemek bagli olmamak degil") | 2026-09-24, MAYA: ajan `adt_*` araci goremeyince "bagli degilim" dedi, tek cagri yapmadi. `tests/skillHttpAdaptation.test.ts` kilitliyor |
+| `sap-consultant/skills/sap-adt/SKILL.md` | `description`'a + govdenin basina "MCP degil, HTTP" blogu (8787, bearer token, "`adt_*` gormemek bagli olmamak degil"); ardindan "SAP DEV yazma onayi" blogu (mod, `approval_pending`, `source_file`, `kritik_bulgu`) | 2026-09-24, MAYA: ajan `adt_*` araci goremeyince "bagli degilim" dedi, tek cagri yapmadi. `tests/skillHttpAdaptation.test.ts` + `tests/sapWriteGateContract.test.ts` kilitliyor |
+| `.../sap-adt/scripts/adt_gated_server.py`, `gated_collect.py`, `gated_quality.py` + `test_gated_quality.py`, `test_gated_collect.py`, `test_gated_flow.py` | YENI dosyalar (yukari akista yok): motoru import edip 28 yazan araci NTT Studio onayina bagliyor; `axet_teslim`, `axet_abapgit_onay`, `axet_inceleme_kaydet` | 2026-09-24 kullanici karari: DEV'e her yazma onaylanir, kritik inceleme bulgusu kesin engel. Motor degismedi. `py -3 test_gated_*.py` + `tests/sapWriteGateContract.test.ts` |
+| `.../abap-code-review/SKILL.md` | 8. adim: inceleme bitince `axet_inceleme_kaydet` (bulgu sayilari, kaynak dosyalari; FUGR/FUNC notu) | Kalite kapisi inceleme kaydi olmadan yazdirmiyor |
 | `sap-consultant/skills/sap-adt-readonly/SKILL.md` | Ayni blok + "8790 degil 8787" + `/tools` (sap-adt kurulu olmayabilir) | 1.6.7'deki "aXet.code edition" d2cb667 senkronunda ezilmisti; ayni test |
 | `.../screen-gen/SKILL.md`, `.../sap-object-transfer/SKILL.md` | MCP araci/oturumu = 8787'ye POST; transfer icin `--port 8787` | `transfer_deploy.py` varsayilani 8786 |
 | `.../sap-adt-router-bridge/scripts/adt_rfc_bridge.py` + SKILL.md basi | Script: yukari akisinki DEGIL, launcher'la sahada calisan eski surum (`.conn_adt`'ten `ADT_RFC_*`, `--port`, `/health`, router'siz calisma). SKILL.md: "launcher baslatir, 8788, `.env`/8410/`selftest` burada gecersiz" blogu | 2026-09-24, LED: d2cb667 senkronu script'i `.env`'den `RFC_ASHOST` bekleyen, router'i zorunlu tutan, 8410'da dinleyen ve `/health`'i olmayan surumle degistirdi; router'li her sistem "RFC_ASHOST is not set" ile bagli degil kaldi (v1.6.8 dahil). `tests/rfcBridgeContract.test.ts` kilitliyor |
@@ -259,6 +265,9 @@ cikan sayi, ustune yazilmis bir uyarlamadir. 2026-09-23'te tam da bu oldu: topta
 | `.../test-scenarios/scripts/scan_doc_types.py` | ADT motoru import'u -> `ReadOnlyHttpClient` | `../../sap-adt/scripts` kurulu agacta HIC yok (`excludeDirs`) |
 | `.../sap-enduser-doc/SKILL.md` | MCP -> HTTP + npm bagimliligi uyarisi | ayni |
 | `.../fs-generator/SKILL.md`, `.../ts-generator/SKILL.md` | `${CLAUDE_PLUGIN_ROOT}` notu | Eklenti koku yok |
+| `sapgui-scriptter/skills/abapgit-deploy/scripts/tier_gate.py` + yazan 9 script (`abapgit_deploy.py`, `abapgit_bootstrap.py`, `gui_import_zip.py`, `gui_activate_package.py`, `gui_stage_commit.py`, `gui_run_zabapgit_auto.py`, `gui_run_zabapgit_bootstrap.py`, `gui_run_zabapgit_bootstrap_multi.py`, `gui_run_zabapgit_deploy_multi.py`) | `require_dev_tier` (DEV kapisi) + `require_write_approval`: SAP GUI'ye dokunmadan once 8787'ye `axet_abapgit_onay` sorusu; cikis 3 = onay bekliyor, 2 = ret | Yazma yalnizca DEV'de ve onayla. `tests/tierWriteGates.test.ts` |
+| `.../abapgit-deploy/scripts/test_tier_gate_approval.py` | YENI: sahte 8787 ile onay davranisi (`py -3`) | CI'da Python yok |
+| `sapgui-scriptter/skills/abapgit-deploy/SKILL.md` | "SAP DEV yazma onayi" blogu (cikis 3 + `approval_pending:`, cikis 2 + `REFUSED [GR_APPROVAL]`, FUGR incelemesi) | Ajan cikis 3'u ariza sanip dolanmasin |
 | `sapgui-scriptter/skills/sapgui-screenshots/SKILL.md` | "PRD'de sadece goruntuleme" kurali | Tus basabiliyor, yanlislikla kaydedebilir; ADT tier kapisi buraya UZANMIYOR |
 | `requirements.txt`, `CLAUDE.md`, `README.md`, `toolkit-version.json` | Bu dagitima ait | Yukari akista yok |
 
````

- [ ] **Step 6: `resources/sap-toolkit/README.md` — sayılar**

````diff
diff --git a/resources/sap-toolkit/README.md b/resources/sap-toolkit/README.md
index 60bab63..8ea5008 100644
--- a/resources/sap-toolkit/README.md
+++ b/resources/sap-toolkit/README.md
@@ -114,8 +114,8 @@ Repo layout (each `skills/<name>` folder is installed into a project's `.axet-co
 ```
 sap-toolkit/
 ├── sap-consultant/skills/{sap-adt, sap-adt-readonly, sap-adt-router-bridge, clean-core, sap-docs, abap-code-checker, abap-code-review, sap-incident, sap-cr-scope, sap-cr-handover, fs-generator, ts-generator, ...}/
-│   ├── sap-adt/scripts/adt_mcp_server.py                 # the engine, 33 tools (DEV only)
-│   ├── sap-adt-readonly/scripts/adt_readonly_server.py   # the wrapper, 17 tools — imports the engine next door
+│   ├── sap-adt/scripts/adt_gated_server.py               # the engine (50 tools) behind NTT Studio write approval, 53 tools (DEV only)
+│   ├── sap-adt-readonly/scripts/adt_readonly_server.py   # the wrapper, 19 tools — imports the engine next door
 │   ├── fs-generator/scripts/{extract_pdf.js, render_pdf.py}  # requirements → FS → branded PDF
 │   └── ts-generator/scripts/{extract_pdf.js, merge_and_pdf.py}  # FS→TS: PDF in, branded PDF out
 ├── abapgit-bridge/skills/{abapgit-workflow, abapgit-export-zip, ...}/
@@ -278,8 +278,8 @@ becomes a different server with the same name.
 
 | Entrypoint | Surface | Default port |
 |---|---|---|
-| `sap-consultant/skills/sap-adt/scripts/adt_mcp_server.py` | the engine's full 33 tools | 8787 |
-| `sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py` | 17, and never a write | 8790 |
+| `sap-consultant/skills/sap-adt/scripts/adt_gated_server.py` | 53: the engine's 50, every write asks NTT Studio, + 3 `axet_*` | 8787 |
+| `sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py` | 19, and never a write | 8790 |
 
 The launcher starts whichever one the role and the tier call for, always on **8787**.
 
@@ -288,12 +288,12 @@ The launcher starts whichever one the role and the tier call for, always on **87
 | Lock | Mechanism |
 |---|---|
 | **Belt** | It forces `ADT_READONLY=true` into the environment before the engine loads, so every write path (`push`/`create`/`activate`/`delete`/…) refuses with `GR_READONLY`. |
-| **Suspenders** | The 13 tools that can write are **removed from the registry before the transport starts**, so they are neither listed nor callable: `POST /tool/adt_push` → `404 unknown_tool`. Unsetting `ADT_READONLY` afterwards does not bring them back — they do not exist in that process. |
+| **Suspenders** | The 28 tools that can write are **removed from the registry before the transport starts**, so they are neither listed nor callable: `POST /tool/adt_push` → `404 unknown_tool`. Unsetting `ADT_READONLY` afterwards does not bring them back — they do not exist in that process. |
 
 Belt alone would not be enough: with the write tools still advertised, the model plans a
 push, spends the turn on it, and only then learns it was refused.
 
-**Surface: 17 tools on install, 20 with all three gates open.** Three read tools are
+**Surface: 19 tools on install, 22 with all three gates open.** Three read tools are
 gated behind their own variable because "read-only" reads as "harmless" and these are not:
 
 | Tool | Variable | Why gated |
@@ -422,7 +422,7 @@ Invoke with `%skill-name`.
 ### SAP
 | Skill | What it does |
 |---|---|
-| `%sap-adt` | The full ADT surface, 33 tools. **Installed only for the technical-consultant role, and only serves writes on a `DEV` system.** |
+| `%sap-adt` | The full ADT surface, 53 tools, every write approved in NTT Studio. **Installed only for the technical-consultant role, and only serves writes on a `DEV` system.** |
 | `%sap-adt-readonly` | The same engine behind a surface that cannot write: source, SELECT-only SQL, search, ATC, syntax check, where-used, revisions, packages, transports, dumps. |
 | `%clean-core` | Clean Core / ABAP Cloud compatibility reference (knowledge, no SAP writes). |
 | `%sap-docs` | SAP documentation search & reference (knowledge). |
@@ -476,8 +476,8 @@ cmd /c dir ".axet-code\skills"           # Windows
 
 # which surface is on 8787? read `server` and `tool_count`, never assume:
 python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())"
-# read-only  -> {"ok": true, "server": "abaper-sap-adt-readonly-http", "readonly": true, "tool_count": 17, ...}
-# write      -> the full engine, 33 tools
+# read-only  -> {"ok": true, "server": "abaper-sap-adt-readonly-http", "readonly": true, "tool_count": 19, ...}
+# write      -> the gated engine, 53 tools
 
 # on the read-only surface a write tool is refused:
 python -c "import requests; print(requests.post('http://127.0.0.1:8787/tool/adt_push', json={}).status_code)"
@@ -518,7 +518,7 @@ agentic AI workflows on business data. This toolkit is scoped accordingly:
   **abapgit-workflow** path (manual abapGit ZIP cycle, each step executed by the
   developer) — never the SAP server.
 - Every write needs a **named human's approval and a transport they confirmed**. That
-  rule is not one of the three gates; it is the one the gates cannot enforce for you.
+  rule is what the NTT Studio approval window asks for; the window asks, the human decides.
 
 By using this toolkit you accept responsibility for compliance with your own SAP
 agreement.
````

- [ ] **Step 7: `sap-adt/SKILL.md` — sayı ve onay bloğu**

````diff
diff --git a/resources/sap-toolkit/sap-consultant/skills/sap-adt/SKILL.md b/resources/sap-toolkit/sap-consultant/skills/sap-adt/SKILL.md
index 73394a1..941a6e1 100644
--- a/resources/sap-toolkit/sap-consultant/skills/sap-adt/SKILL.md
+++ b/resources/sap-toolkit/sap-consultant/skills/sap-adt/SKILL.md
@@ -28,7 +28,7 @@ allowed-tools: Bash(python:*), Bash(cd:*), Read, Write, Edit, Grep, Glob
 > - Her istekte `Authorization: Bearer $ABAP_HTTP_TOKEN` gerekiyor, `/health` dahil.
 >   Token ortamda duruyor; değerini ekrana basma, hiçbir dosyaya yazma.
 > - İlk iş `GET /health`: `tools` listesi o an hangi yüzeyin ayakta olduğunu söylüyor.
->   DEV'de 33 araç (`adt_push`/`adt_activate` dahil); diğer sistemlerde 17, yazanlar
+>   DEV'de 53 araç (`adt_push`/`adt_activate` ve onay araçları dahil); diğer sistemlerde 19, yazanlar
 >   `404 unknown_tool` döner. Hangisinin açık olduğunu varsayma, sor.
 > - Sunucuyu kendin başlatma, `adt_mcp_server.py`'yi doğrudan çalıştırma: ikinci süreç
 >   ikinci SAP oturumu demek. Durum için proje klasöründeki `sap-context.md`'ye bak;
@@ -43,6 +43,38 @@ allowed-tools: Bash(python:*), Bash(cd:*), Read, Write, Edit, Grep, Glob
 > python -c "import os, requests; h={'Authorization': 'Bearer ' + os.environ['ABAP_HTTP_TOKEN']}; print(requests.post('http://127.0.0.1:8787/tool/adt_logon', json={}, headers=h).json())"
 > ```
 
+> **NTT Studio uyarlaması — SAP DEV yazma onayı.** DEV'de 8787'deki sunucu motorun
+> kendisi değil, onu saran onay katmanı (`adt_gated_server.py`). Okuyan araçlar olduğu
+> gibi çalışır; SAP'a yazan her çağrı NTT Studio'da kullanıcının önüne bir onay
+> penceresi açar. Aşağıdaki "confirm the transport with the user" kuralları geçerli,
+> pencere onların yerine geçmiyor — üstüne ekleniyor.
+>
+> - **Çalışma modunu kullanıcı seçer** (oturum başına): doğrudan DEV'e yazmak ya da
+>   önce yerelde çalışıp sonra teslim etmek. Seçilmemişse yazma `mod_secilmedi` döner;
+>   kullanıcıdan NTT Studio'da seçmesini iste, modu sen seçme.
+> - `approval_pending` → kullanıcıya NTT Studio'daki onay penceresini söyle; onayladıktan
+>   sonra **aynı çağrıyı aynı argümanlarla** tekrar gönder. Argümanı değiştirirsen bu yeni
+>   bir yazmadır ve yeni pencere açar.
+> - `approval_denied` → dur. Aynı işi başka araçla, kabuktan ya da SAP GUI'den dolanarak
+>   yapmaya kalkma; kullanıcıya ne istediğini sor. `approval_unavailable` → NTT Studio'ya
+>   ulaşılamıyor: onay yoksa yazma yok, kullanıcıya NTT Studio'nun açık olduğunu sor.
+> - `yerel_mod` → bu oturum yerelde çalışıyor. `src/` altında geliştir; iş bitince
+>   `axet_teslim` ile tek pencerede teslim onayı iste (`nesneler`, `paket`, `transport`;
+>   abapGit için `yontem="abapgit"` ve `zip_dosyasi`), ardından aynı nesneleri aynı kaynak
+>   dosyalarıyla ve aynı transport'la yaz — o çağrılar pencere açmadan geçer.
+> - **Kaynak her zaman dosyadan:** `adt_push` ve kardeşlerine kaynağı satır içi `source`
+>   olarak verme, dosyaya yaz ve `source_file` ile ver (`kaynak_dosyasi_gerekli`). Kalite
+>   kapısı dosyanın hash'ini inceleme kaydıyla eşliyor.
+> - **Kod yazan her işte önce `%abap-code-review`**, sonra `axet_inceleme_kaydet`.
+>   `inceleme_yok` / `inceleme_eski` → incelemeyi bu kaynakla yeniden çalıştır.
+>   `kritik_bulgu` **kesin engel**: aşma yolu yok; kodu düzelt, yeniden incele, yeniden kaydet.
+> - `transport_belirsiz` → transport'u kullanıcıya sor (`adt_list_transports`). Paket adını
+>   asla tahmin etme.
+> - Başarılı bir yazmanın cevabında `axet_atc` (ATC özeti) ve `axet_uyari` olabilir;
+>   kullanıcıya ilet.
+> - Sunucuyu elle başlatma: onay ucunun adresi yalnızca NTT Studio'nun başlattığı sunucuda;
+>   elle açılan sunucu her yazmayı reddeder.
+
 SAP ABAP development and analysis through the ADT REST API. **Every SAP operation goes
 through the MCP tools (`adt_*`)** — one long-lived server, one persistent authenticated
 session. There is no parallel CLI path (v1.3.0+); anything that says `python
@@ -99,7 +131,7 @@ Claude Code's own process env.
 ### Read-only entrypoint — the `sap-adt-readonly` skill
 
 For a system that must be unwriteable: a second entrypoint onto **this same engine**
-that never registers the write tools (**17 tools instead of 33**; `ADT_READONLY` alone
+that never registers the write tools (**19 tools instead of 50**; `ADT_READONLY` alone
 is only a call-time belt). `adt_unit_test`, `adt_sql` and `adt_dumps` are additionally
 gated behind individual opt-in variables. Surface table, rationale and fail-closed
 matrix: [`../sap-adt-readonly/SKILL.md`](../sap-adt-readonly/SKILL.md).
````

- [ ] **Step 8: `sap-adt-readonly/SKILL.md` — sayılar ve tablo**

````diff
diff --git a/resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/SKILL.md b/resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/SKILL.md
index 25c7a94..270be5a 100644
--- a/resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/SKILL.md
+++ b/resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/SKILL.md
@@ -5,7 +5,7 @@ description: >
   an audit, a code review board, a demo, a training session, or a consultant who should
   not be able to push. Starts the same ADT engine as sap-adt with the write tools removed
   from the MCP registry, so push, create, activate, delete, transport creation and lock
-  clearing are not listed and cannot be called. 17 tools instead of 33, with SQL, dumps
+  clearing are not listed and cannot be called. 19 tools instead of 50, with SQL, dumps
   and unit-test execution each behind their own opt-in.
   Triggers in Turkish or English: "read-only", "salt okunur", "sadece okuma",
   "yazma yapmasın", "PRD'ye bağlan ama dokunma", "QA connection", "production system",
@@ -43,7 +43,7 @@ allowed-tools: Bash(python:*), Bash(py:*), Read, Grep, Glob
 > ```
 
 Same engine as [`sap-adt`](../sap-adt/SKILL.md), same persistent session, same
-`.conn_adt`, same guardrails. **17 tools instead of 33**, because the write tools are
+`.conn_adt`, same guardrails. **19 tools instead of 50**, because the write tools are
 never registered — not listed, not callable, and not restored by unsetting an
 environment variable.
 
@@ -67,7 +67,7 @@ about what is exposed and why.
 ## Why this exists, when `ADT_READONLY=true` already does something
 
 `ADT_READONLY` is a **belt**. `guardrails.require_writable()` reads it at call time, so
-all 33 tools stay advertised and a write is refused only once the agent has decided to
+all 50 tools stay advertised and a write is refused only once the agent has decided to
 write, assembled the push, and spent the turn. That is right for a DEV connection
 someone froze for an afternoon. It is wrong when the system must not be writeable at
 all, for two reasons:
@@ -88,13 +88,14 @@ continue on suspenders alone.
 
 ## The surface
 
-**17 tools on install. 20 with all three gates open. Out of 33.**
+**19 tools on install. 22 with all three gates open. Out of 50.**
 
 | Group | Tools |
 |---|---|
-| Session / diagnostics | `ping`, `adt_doctor`, `adt_logon` |
+| Session / diagnostics | `ping`, `adt_doctor`, `adt_logon`, `adt_capabilities` |
 | Source and repository | `adt_get_source`, `adt_list_package`, `adt_search`, `adt_code_search`, `adt_revisions`, `adt_inactive_objects`, `adt_badi_discovery`, `adt_where_used` |
 | Static analysis | `adt_syntax_check`, `adt_atc_check` |
+| Services (read) | `adt_service_binding_status` |
 | Transports (read) | `adt_list_transports`, `adt_transport_status`, `adt_transport_check`, `adt_check_scatter` |
 
 **Gated, each off by default and each with its own variable:**
@@ -255,7 +256,7 @@ Point a client at this file **instead of** `adt_mcp_server.py`:
 }
 ```
 
-If both servers are registered at once, the agent sees the union — 33 tools — and this
+If both servers are registered at once, the agent sees the union — 50 tools or more — and this
 skill has bought you nothing. Run one or the other.
 
 ---
````

- [ ] **Step 9: `abapgit-deploy/SKILL.md` — onay bloğu ve döngü çıkışları**

````diff
diff --git a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/SKILL.md b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/SKILL.md
index 3ab34f7..3ba874f 100644
--- a/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/SKILL.md
+++ b/resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/SKILL.md
@@ -14,6 +14,30 @@ description: >
 
 This skill teaches Claude how to drive the **autonomous deploy loop** via SAPGUI scripting. The developer asks for a feature; Claude edits the source, deploys, watches activation, fixes errors, iterates - all without the developer touching SAPGUI.
 
+> **NTT Studio uyarlaması — SAP DEV yazma onayı.** Bu klasördeki SAP'a yazan her script
+> (`abapgit_deploy.py`, `abapgit_bootstrap.py`, `gui_import_zip.py`,
+> `gui_activate_package.py`, `gui_stage_commit.py`, `gui_run_zabapgit_*.py`) önce DEV
+> kapısından (`REFUSED [GR_TIER]`), sonra NTT Studio onayından geçer: SAP GUI'ye dokunmadan
+> önce 8787'deki sunucuya (`axet_abapgit_onay`) sorar, NTT Studio'da kullanıcının önüne bir
+> pencere açılır. Aşağıdaki "agent prints, developer runs" kuralı aynen geçerli.
+>
+> - Çıktıda `approval_pending:` satırı ve **çıkış kodu 3** → onay bekleniyor. Geliştiriciye
+>   NTT Studio'daki pencereyi onaylamasını söyle, sonra **aynı komutu** (aynı argümanlarla)
+>   yeniden yazdır. `approval_pending:` satırı yoksa çıkış 3, `abapgit_deploy.py`'nin kendi
+>   ZIP dışa aktarma hatasıdır — onay değil.
+> - `REFUSED [GR_APPROVAL]` ve **çıkış kodu 2** → reddedildi ya da NTT Studio'ya
+>   ulaşılamadı. Dur; aynı işi başka script'le, genel SAP GUI komutlarıyla ya da ADT'den
+>   dolanarak yapmaya kalkma. Kullanıcıya ne yapmak istediğini sor.
+> - Onay kimliği alt adımlara `AXET_ABAPGIT_ONAY_ID` ortam değişkeniyle geçer; elle verme,
+>   silme.
+> - ZIP'teki her kaynaklı nesne için güncel bir `%abap-code-review` kaydı gerekir
+>   (`axet_inceleme_kaydet`, bkz. abap-code-review SKILL.md). Hata döngüsünde `src/`'yi
+>   her düzelttiğinde değişen nesneleri yeniden incele ve kaydet, sonra bir sonraki turun
+>   komutunu yazdır. Kritik bulgu kesin engel: düzeltmeden komut yazdırma.
+> - Function group ZIP'te tek nesnedir (FUGR): incelemeyi `tip="functiongroup"` ile ve
+>   grubun bütün `<ad>.fugr.*.abap` kaynak dosyalarını vererek kaydet; tek tek function
+>   module (`tip="function"`) kaydı ZIP için sayılmaz.
+
 ## Hard rule: agent prints, developer runs (every SAPGUI command)
 
 SAP's API usage policy (April 2026) permits agent-driven SAPGUI scripting **only when the developer has explicitly approved that specific run**. To comply unambiguously, this plugin uses a stricter rule: **Claude never invokes the SAPGUI-driving scripts itself.** The developer runs each one by hand.
@@ -181,6 +205,8 @@ When the user says "deploy", "ship", "make it green", or similar:
 4. **Wait.** Do not run the command yourself. The developer executes it.
 5. **When the developer reports back** (or `.abapgit-status/` shows a fresh entry):
    - **Exit 0** → report success with the commit SHA and transport (if visible).
+   - **Exit 3 with an `approval_pending:` line** → the NTT Studio approval window is open; ask the developer to approve it, then print the **same** command again.
+   - **Exit 2 with `REFUSED [GR_APPROVAL]`** → refused or NTT Studio unreachable; stop and ask the user (see the NTT Studio block at the top).
    - **Exit 1** →
      a. Read `.abapgit-status/<latest>` (the deploy script just wrote it).
      b. Parse the error — which object, which line, which type of error.
````

- [ ] **Step 10: `abap-code-review/SKILL.md` — 8. adım: inceleme kaydı**

````diff
diff --git a/resources/sap-toolkit/sap-consultant/skills/abap-code-review/SKILL.md b/resources/sap-toolkit/sap-consultant/skills/abap-code-review/SKILL.md
index 4fbdc32..60b7299 100644
--- a/resources/sap-toolkit/sap-consultant/skills/abap-code-review/SKILL.md
+++ b/resources/sap-toolkit/sap-consultant/skills/abap-code-review/SKILL.md
@@ -70,6 +70,31 @@ this skill never edits or pushes code, it only produces a review report.
    [references/SAP_HELP_VERSION_LOOKUP.md](references/SAP_HELP_VERSION_LOOKUP.md))
    and verify against the release-matched SAP ABAP Keyword Documentation
    instead of assuming or using the "latest" docs blindly.
+8. **NTT Studio uyarlaması — inceleme kaydı (SAP DEV yazma onayı).** NTT Studio'da
+   SAP DEV'e yazılan her kaynak için güncel bir inceleme kaydı gerekiyor; kayıt yoksa ya da
+   kaynak incelemeden sonra değiştiyse yazma `inceleme_yok` / `inceleme_eski` ile reddedilir.
+   Raporu verdikten sonra, incelediğin **her nesne için** kaydı yaz:
+
+   ```bash
+   python -c "import os, requests; h={'Authorization': 'Bearer ' + os.environ['ABAP_HTTP_TOKEN']}; print(requests.post('http://127.0.0.1:8787/tool/axet_inceleme_kaydet', json={'nesne': 'ZCL_ORNEK', 'tip': 'class', 'kaynak_dosyalari': ['src/zcl_ornek.clas.abap', 'src/zcl_ornek.clas.locals_imp.abap'], 'bulgular': {'kritik': 0, 'yuksek': 0, 'orta': 2, 'dusuk': 1}, 'rapor': 'Executive Summary: ...'}, headers=h).json())"
+   ```
+
+   - `bulgular`: raporun **Critical Issues** maddeleri `"kritik"`; güvenlik/performans/hata
+     yönetimi gibi yayına engel olmayan ama önemli bulgular `"yuksek"`; **Clean Code
+     Improvements** maddeleri `"orta"`; biçim/isimlendirme ayrıntıları `"dusuk"`. Sayıları
+     rapordan say, yuvarlama ya da eksiltme yapma: `"kritik"` > 0 ise kayıt yazılır ama o
+     kaynak SAP'a **gönderilemez** (`kritik_bulgu`, kesin engel). Düzelt, yeniden incele,
+     yeniden kaydet.
+   - `kaynak_dosyalari`: incelediğin dosyalar, proje klasörüne göre yol. Nesnenin bütün
+     `.abap` kaynaklarını ver (sınıfta `locals_*`/`testclasses` dahil). Hash'i sunucu
+     hesaplar; sen hash yazma. SAP'a giden dosya bu dosyanın aynısı olmalı (`source_file`).
+   - `tip`: `class`, `interface`, `program`, `include`, `function` (tek function module,
+     ADT'nin `adt_write_function_module` yolu), `functiongroup` (abapGit ZIP'te grup tek
+     nesnedir: `<grup>.fugr.*.abap` dosyalarının hepsini ver). ZIP ile teslimde function
+     module kaydı sayılmaz, grup kaydı gerekir.
+   - Token ortamda duruyor (`ABAP_HTTP_TOKEN`); değerini ekrana basma, dosyaya yazma. 8787
+     cevap vermiyorsa (QA/PRD'de kayıt aracı yoktur) bu adımı atla — orada zaten SAP'a
+     yazılmıyor.
 
 ## Program header / künye (mandatory, top of main program)
 
````

- [ ] **Step 11: Testleri, tüm paketi ve tip kontrolünü koş**

Run: `npx vitest run tests/sapWriteGateContract.test.ts tests/tierWriteGates.test.ts tests/skillHttpAdaptation.test.ts tests/adtHttpToken.test.ts tests/rfcBridgeContract.test.ts`
Expected: 5 dosya / 79 test PASS (`sapWriteGateContract` 28, `tierWriteGates` 25, `adtHttpToken` 14, `skillHttpAdaptation` 6, `rfcBridgeContract` 6).

Run: `npx vitest run`
Expected: 33 dosya / 368 test PASS.

Run: `npm run -s typecheck`
Expected: çıkış 0.

Run: `PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/adt_gated_server.py --list-tools | grep -c "\["`
Expected: `53`.

Bu adım yazılırken sözleşme testine 7 mutasyon denendi (DEV'de motoru doğrudan açmak, `/health` beklentisini 50 yapmak, `approval_pending` sonrası "aynı çağrıyı aynı argümanlarla" talimatını silmek, abapGit'in çıkış 3 talimatını silmek, inceleme adımını silmek, abapgit-deploy'da `GR_APPROVAL` satırını silmek, CLAUDE.md tablo satırını silmek); hepsini test yakaladı. İlk sürümde iki mutant yaşadı çünkü aranan kelime (`approval_pending`, `REFUSED [GR_APPROVAL]`) metinde iki kez geçiyordu; testler bu yüzden her talimatı kendi cümlesiyle arıyor.

- [ ] **Step 12: Commit**

```bash
git add tests/sapWriteGateContract.test.ts
git add app-electron/main/launcher.ts app-electron/main/adtReadonlyServerManager.ts app-electron/main/sapToolkit.ts app-electron/main/skillProfiles.ts
git add resources/sap-toolkit/CLAUDE.md resources/sap-toolkit/README.md
git add resources/sap-toolkit/sap-consultant/skills/sap-adt/SKILL.md resources/sap-toolkit/sap-consultant/skills/sap-adt-readonly/SKILL.md resources/sap-toolkit/sap-consultant/skills/abap-code-review/SKILL.md
git add resources/sap-toolkit/sapgui-scriptter/skills/abapgit-deploy/SKILL.md
git commit -m "SAP yazma onayi: ajan talimatlari ve arac sayilari

sap-context.md ve SKILL.md'ler onay akisini anlatiyor: mod secimi,
approval_pending'de ayni cagriyi ayni argumanlarla tekrar gondermek,
yerel modda axet_teslim, her kod isinde %abap-code-review +
axet_inceleme_kaydet, kritik_bulgu kesin engel. DEV'de sunucuyu elle
baslatma yasak (onay ortami yok). Arac sayilari 53 / 19 / 28.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: DS4'te uçtan uca doğrulama (kullanıcıyla)

**Files:** yok (kod değişmez). Bulunan her hata kendi task'ında testle birlikte düzeltilir, burada değil.

**Önkoşul:** Task 1-8 commit'li, `npx vitest run` ve Python testleri yeşil, `npm run dev` ile NTT Studio açık. **Yalnızca DS4.** Müşteri sistemlerine (MAYA, LED ve diğerleri) hiçbir çağrı yok. Test paketini ve transport'u KULLANICI verir; paket adı tahmin edilmez, transport kullanıcı onaylamadan kullanılmaz. Test nesneleri kullanıcının verdiği pakette `Z` ile başlayan, adında `AXET_ONAY_TEST` geçen nesnelerdir; iş bitince kullanıcıya silinip silinmeyeceği sorulur.

- [ ] **Step 1: Kurulum**

1. NTT Studio'da DS4'ü teknik danışman profiliyle DEV olarak bağla.
2. `adt-readonly.log`'da onaylı sunucunun başladığını gör; ajanın terminalinde:
   `curl -s -H "Authorization: Bearer $ABAP_HTTP_TOKEN" http://127.0.0.1:8787/health`
   Expected: `tool_count` 53.
3. Kullanıcıdan test paketini ve transport'u al; `adt_list_transports` ile transport'un listede ve değiştirilebilir olduğunu gör.

- [ ] **Step 2: Mod seçilmeden yazma**

Mod penceresini cevaplamadan ajana küçük bir sınıf yazdır.
Expected: `mod_secilmedi`; SAP'ta nesne yok (`adt_search`); günlükte (`sap-yazma-gunlugu.jsonl`) satır var.

- [ ] **Step 3: Doğrudan mod — tam döngü**

1. Modu "doğrudan DEV'e yaz" seç.
2. Ajana `ZCL_AXET_ONAY_TEST` sınıfını `src/` altında yazdır, `%abap-code-review` çalıştırt, `axet_inceleme_kaydet` ile kaydettir.
3. `adt_push` (source_file ile) → Expected: `approval_pending`; NTT Studio'da pencere: nesne, paket, transport, fark doğru.
4. Onayla; ajan AYNI çağrıyı AYNI argümanlarla tekrar göndersin → Expected: push başarılı, nesne aktif.
5. 4. adımda pencerede oturum izni verildiyse aynı transport'ta ikinci bir yazma → Expected: pencere açılmadan geçer, günlük satırında `oturum_izni`. HER_SEFER sınıfı bir araç (ör. `adt_create_transport`) ise her seferinde yine pencere.

- [ ] **Step 4: Ret**

Başka bir değişiklik iste, pencerede "Reddet" → Expected: `approval_denied`; ajan başka yoldan (`adt-tool.ps1`, kabuk, SAP GUI) denemiyor, kullanıcıya soruyor; SAP'taki nesne değişmedi (`adt_get_source`).

- [ ] **Step 5: Kalite kapısı**

1. Kaynağı değiştir ama incelemeyi yenileme → Expected: `inceleme_eski`, pencere açılmıyor.
2. İnceleme kaydını `bulgular.kritik = 1` ile yaptır → Expected: `kritik_bulgu`, pencere HİÇ açılmıyor, aşma seçeneği yok; günlükte ret satırı.

- [ ] **Step 6: Yerel mod ve teslim**

1. Yeni oturumda modu "önce yerelde çalış" seç.
2. Doğrudan `adt_push` → Expected: `yerel_mod`.
3. `axet_teslim` (nesneler + transport) → Expected: tek pencere, liste doğru; onaydan sonra listedeki nesneler aynı kaynakla yazılıyor, listede olmayan bir nesne yeniden pencere açıyor.

- [ ] **Step 7: abapGit çıkış kodları**

Ajan `%abapgit-deploy` komutunu basar, KULLANICI çalıştırır:
1. İlk çalıştırma → Expected: stdout'ta `approval_pending: ...`, çıkış kodu 3, SAP GUI'ye dokunulmamış.
2. Onayla, aynı komutu tekrar çalıştır → Expected: import ilerliyor; alt adımlar yeniden pencere açmıyor.
3. Pencerede Reddet → Expected: `REFUSED [GR_APPROVAL]`, çıkış kodu 2.

- [ ] **Step 8: Elle başlatılan sunucu**

NTT Studio'yu kapat (sunucu da kapanır). Ajanın terminalinde `adt_gated_server.py --http --port 8787`'yi elle başlat, bir yazma dene → Expected: `approval_unavailable`. Sunucuyu kapat.

- [ ] **Step 9: Sonuç**

Kullanıcıya adım adım sonucu raporla (geçen/kalan, günlükten ilgili satırlar — token ve kaynak kodu günlükte olmamalı; `grep -c "Bearer\|ABAP_HTTP_TOKEN" sap-yazma-gunlugu.jsonl` → 0). Test nesnelerinin silinip silinmeyeceğini sor; silme de onay penceresinden geçer.
