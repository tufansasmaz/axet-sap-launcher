# Başsız köprü: sohbet ↔ axet-code, terminalsiz

Tarih: 2026-10-16 · Durum: tasarım sohbette onaylandı · Dal: `ozellik/basiz-kopru`

## 1. Neden

Sohbet ekranı bugün axet-code'u **görünmez bir terminalde** etkileşimli ekranıyla çalıştırıyor:
- mesajı o ekrana yapıştırıyor;
- menü, Esc ve Ctrl+S tuşlarını oraya gönderiyor;
- cevabı axet-code'un veritabanından okuyor.

Hangi sohbetin hangi oturuma ait olduğu ve turun ne zaman bittiği **tahmin ediliyor**: ekran yazıları, sabit beklemeler, başlık etiketleri ve mesaj metni eşleştirmesi. 2026-10-16 analizinde bulunanlar:
- 46 düzeltmenin çoğu bu tahminlerin bir başka hâlini kapatıyor.
- 60 dakikayı geçen işler sessizce öldürülüyor.
- "Bozuk geçmiş" kurtarması 12 olayın 10'unda axet-code'u çökertiyor.
- İptal (Esc) sonraki mesaja çarpabiliyor.
- Asıl akışların hiçbirinin davranış testi yok.

axet-code 1.4'te `run` başsız modu oturum sürdürüyor ve makine okunur sonuç veriyor. Kullanıcı kararı (2026-10-16): **eski yol tamamen kaldırılır**; 1.4'ten eski sürümde sohbet açık bir hata verir.

## 2. Ölçülenler (axet-code 1.4.1, geçici klasörde, 2026-10-16)

| Konu | Sonuç |
|---|---|
| Sonuç belgesi | `--output-format json` → `{type:"result", session_id, result, is_error, usage:{prompt_tokens, completion_tokens, cost}, version}` (stdout, tek satır) |
| Oturum sürdürme | `--resume <id>`: hafıza korunuyor, aynı `session_id` dönüyor |
| Oturum kimliği erken | `-v` ile stderr'de ~3,3 sn'de `INFO Created session for non-interactive run session_id=<uuid>`; veritabanında aynı anda |
| İzinler | `-y` olmadan da sorulmadan kabul ediliyor (dosya yazıldı) |
| Soru aracı | `ask_user` sonucu: "No interactive user is available… Proceed using your best judgment." (`is_error:true`); ajan kendisi seçiyor |
| İptal | Süreç ağacı öldürülünce yarım asistan mesajı `finish`'siz kalıyor; ardından `--resume` sorunsuz |
| Canlı akış | Veritabanı tur sırasında parça parça yazılıyor |
| Bağlayıcı açık | ~5,6–6,9 sn, 58k istem jetonu |
| Bağlayıcı kapalı (`AXET_MCP_BASE_URL=http://127.0.0.1:9`) | ~2,8–3,3 sn, 32k jeton |
| Model değişimi | `--resume` + farklı `-m` (sağlayıcı dahil): hafıza korunuyor |
| İstem girişi | stdin'den, Türkçe karakterle sorunsuz |
| Güncelleme | Her `run` güncelleme denetimi yapıyor. Güncelleyici exe kullanımdayken onu 0 bayta indirip "başarılı" diyor (iki kez görüldü) |

## 3. Kapsam

**Kaldırılan:**
- `axetChatTui.ts` (2850 satır) ve `tuiPaste.ts`;
- `axetChat.ts`'teki eski `run -v` yedek yolu ve önceden ısıtılmış süreç;
- `axetChat:prewarm` ve `axetChat:updateAvailable` IPC'leri;
- `escapeTuiMenus`, oturum başlığı etiketleri, `renameSession` (axet-code veritabanına yazma);
- `setAxetModel`'in sohbet için global ayar dosyasına yazması (model artık tur başına `-m`).

Uygulamanın **Terminal ekranına dokunulmaz.**

**Yeni:**
- `app-electron/main/axetHeadless.ts`: tek tur çalıştırıcı.
- `app-electron/main/axetVersion.ts`: sürüm ve bozuk exe denetimi.

**Değişen:**
- `axetChat.ts`: dış yüz aynı kalır, içi başsız çalıştırıcıyı çağırır.
- `axetSessionDb.ts`: oturuma göre yalnız yeni satırları okur; hatalar günlüğe gider.
- `axetSessionBinding.ts`: sohbet → oturum kimliği, kesin.
- `axetChatRecovery.ts`: kimlikle kurtarır.
- `AxetCodeHome.tsx`, `chatStore.ts`: renderer ve kalıcılık düzeltmeleri.
- Doktor.

## 4. Bir tur

1. **Süreç:** `axet-code run -v -q --output-format json [--resume <oturum>] -c <cwd> [-m <sağlayıcı/model>]`.
   - İstem stdin'den gider.
   - Ortam bugünkü `axetSpawnEnv` ile kurulur; bağlayıcı kararı her turda ayrı verilir (§7).
2. **Oturum kimliği:**
   - Sohbetin bağlı oturumu varsa (`axetSessionBinding`) `--resume` ile o kullanılır.
   - Yoksa stderr'deki `Created session … session_id=<uuid>` satırından alınır. Tahmin, mesaj eşleştirmesi ve zaman penceresi yok.
   - Kimlik, ilk görüldüğü anda bağlamaya yazılır (çökme durumunda kurtarma için).
3. **Canlı akış:** veritabanından yalnız `session_id = <oturum>` ve tur başından sonraki mesajlar okunur.
   - Yoklama 150 ms; `updated_at` imleciyle yalnız değişen satırlar.
   - Metin, araç adımları, todo ve jeton olayları bugünkü renderer olaylarıyla aynı biçimde yayılır (`axetChat:chunk`, `axetChat:activity`, `axetChat:progress`).
   - Bir asistan mesajındaki metin parçaları ile ardışık asistan mesajları arasına, yapışmasınlar diye bir satır sonu konur.
4. **Bitiş:** süreç çıkınca stdout'taki JSON okunur.
   - `is_error:false` → başarı; cevap `result`.
   - `is_error:true` ya da JSON yok ya da çıkış kodu ≠ 0 → hata (§6).
   - Veritabanında `finish.reason = "error"` varsa onun metni hata metnidir.
5. **Süre:**
   - 5 dakika sessizlikte "hâlâ çalışıyor" uyarısı; tur öldürülmez.
   - 6 saat sert sınır.
   - Çalışan bir tur **hiçbir koşulda** boşta kalma, rol veya skill değişikliği yüzünden öldürülmez. Yalnız kullanıcı iptali ve uygulama kapanışı turu durdurur.

## 5. İptal ve seçenekli sorular

**İptal:** süreç ağacı `taskkill /T /F` ile öldürülür. Her turun bir numarası var; geç gelen iptal başka bir turu etkilemez. Yarım kalan metin "durduruldu" işaretiyle kalır. Sonraki mesaj aynı oturumda `--resume` ile devam eder.

**Seçenekli sorular:**
- **İlk katman:** başsız turlarda istemin başına şu kural eklenir: "`ask_user` aracını kullanma. Kullanıcıdan karar gerekiyorsa turu sorunla bitir. Seçenekleri şu blokta ver:"

  ```
  \`\`\`secenekler
  - Seçenek 1
  - Seçenek 2
  \`\`\`
  ```

  Sohbet bu bloğu düğmelere çevirir, metinden çıkarır. Serbest cevap kutusu da kalır.
- **Güvenlik ağı:** ajan yine `ask_user` çağırırsa köprü araç çağrısını veritabanında gördüğü anda süreci öldürür. Soru ve seçenekler aracın girdisinden okunur, bugünkü soru kutusu gösterilir. Böylece transport ya da paket gibi kararlar ajana bırakılmaz.
- **Cevap:** bir sonraki tur olarak aynı oturuma gider: `Kullanıcının cevabı: <seçim>`.
- **Bekleme sınırı yok:** süreç zaten kapalı, beklemek bir şey tüketmiyor.

## 6. Hata ve yeniden deneme

- Hatalar `axetCodeLog.classifyFailure` ile sınıflandırılır: yetki, bağlam, sağlayıcı, politika. Yalnız bu oturuma ait günlük satırları sayılır; oturum kimliği olmayan satır bu tura yüklenmez.
- **Otomatik yeniden deneme yalnız bu turda hiçbir araç çalışmadıysa yapılır**, tek sefer. Yetki hatasında 15 sn beklenir.
- Araç çalıştıysa yeniden gönderme yapılmaz. Hata metni ve **"Devam et"** düğmesi gösterilir; düğme aynı oturuma "Kaldığın yerden devam et" gönderir. Böylece aynı dosya yazması ya da `adt_push` iki kez yapılmaz.
- Bağlam doldu hatasında yeni oturum açılır ve geçmiş özetle tohumlanır (bugünkü `buildSeedPrompt`). Kullanıcıya bir satırla söylenir.
- Gösterilen hata metni gerçek metindir, maskelenmiş ve kırpılmış. Genel "boş cevap" yalnız gerçekten metin yoksa çıkar.

## 7. Bağlayıcılar ve model

- Bağlayıcı kararı her turda `connectorPolicy`'ye göre ayrı verilir (bugün bir kez açılınca açık kalıyordu). Kapalı turda ortam `AXET_MCP_BASE_URL=http://127.0.0.1:9`.
- Model tur başına `-m sağlayıcı/model`. axet-code'un global ayar dosyasına yazılmaz; sohbetler birbirinin modelini değiştirmez.

## 8. Sürüm ve bozuk program denetimi

`axetVersion.ts`:
- `axet-code --version` (5 sn sınır) → `axet-code version X.Y.Z`. Sonuç uygulama açıkken önbellekte tutulur; tur başlatılamazsa yeniden sorulur.

Sohbet, gönderimden önce şu durumları açık mesajla durdurur:

| Durum | Mesaj (özet) |
|---|---|
| Sürüm < 1.4.0 | "Sohbet için axet-code 1.4 veya üstü gerekiyor; kurulu sürüm X. axet-code'u güncelleyin." |
| exe yok | "axet-code bulunamadı; kurun." |
| exe 0 bayt ya da çalışmıyor (`--version` boş, WinError 193) | "axet-code dosyası bozuk (güncelleme yarıda kalmış olabilir). `%TEMP%\axet-code-update.msi` varsa onarın: `msiexec /fa …`; yoksa yeniden kurun." |

Doktor aynı denetimi bir satır olarak gösterir.

## 9. Kalıcılık ve kurtarma

- **`chatStore.ts`:**
  - Sınır aşılınca en eski **güncellenen** sohbet düşer, en eski oluşturulan değil.
  - Kaydetme hatası `{ok:false}` renderer'a döner ve bir kez bildirim olarak gösterilir.
- **`AxetCodeHome.tsx`:** akış sürerken de en geç 10 saniyede bir kaydedilir. Bugün akış bitene kadar hiç kaydedilmiyordu.
- **Kurtarma (`recoverAnswer`):** uygulama tur ortasında kapandıysa, bağlamadaki oturum kimliğiyle o turun asistan metni okunur. Yalnız `finish.reason` `tool_use` olmayan bir bitiş varsa "tamamlandı" sayılır; yoksa "yarım kaldı" diye işaretlenir.
- **Bağlamalar:** sohbet silinince bağlaması da silinir.

## 10. Renderer değişiklikleri (`AxetCodeHome.tsx`)

**Kaldırılan:**
- önceden ısıtma (`prewarm`) çağrıları;
- `updateAvailable` yoklaması;
- `cancelStuck` afişi: öldürmek kesin, "durmadı" durumu yok.

**Eklenen:**
- `secenekler` bloğunu düğmeye çevirme;
- "Devam et" düğmesi;
- sürüm ve bozuk program hata satırı.

**Değişen:**
- Soru cevabı (`answerQuestion`) artık yeni bir tur gönderiyor.
- Geçmişi düzenleyip yeniden gönderme yeni oturum açıp geçmişi tohumluyor; bugün geçmiş sıfırlama ile yapılıyordu.

## 11. Günlük

| Etiket | Alanlar |
|---|---|
| `kopru.tur` | sohbet, oturum (yeni/sürdü), saniye, ilkHarf, arac, baglayici, model, sonuc |
| `kopru.hata` | sohbet, sınıf, aracCalisti, yenidenDenendi |
| `kopru.iptal` | sohbet, turNo |
| `kopru.soru` | sohbet, katman (metin/ağ) |
| `kopru.surum` | surum, durum |

Mesaj içeriği günlüğe yazılmaz. Bugünkü `appLog`'un ilk yazma hatasında kalıcı susması düzeltilir: sonraki yazmalar yine denenir.

## 12. Test

Sahte axet-code: `tests/fixtures/fake-axet-run.cjs`. Node 26'nın yerleşik `node:sqlite` modülüyle gerçek şemada bir veritabanına yazar, `-v` satırını ve JSON'u basar. Senaryo ortam değişkeniyle seçilir:
- basit cevap;
- çok parçalı metin ve araç;
- `ask_user`;
- hata (araçsız ve araçlı);
- uzun tur (iptal için);
- `--resume`;
- bozuk JSON.

Davranış testleri:
- tur ve kimlik bağlama;
- `--resume`;
- canlı olayların sırası;
- parçalar arasında satır sonu;
- iptalin yalnız kendi turunu durdurması;
- `ask_user` ağının süreci öldürüp soruyu yayması;
- `secenekler` ayrıştırma;
- araçlı hatada yeniden göndermeme;
- araçsız hatada tek yeniden deneme;
- sürüm < 1.4 / 0 bayt / yok mesajları;
- `chatStore` sınırı ve kaydetme hatası;
- akış sırasında periyodik kayıt;
- kurtarmada yarım/tamam ayrımı.

Gerçek axet-code ile elle bir duman testi; kullanıcıya liste olarak verilir.

## 13. Kapsam dışı

- axet-cli ekibine bildirim (güncelleyici hatası; `ask_user`'ın başsız modda dışarı verilmesi isteği): ayrı metin olarak hazırlanır, kodda değil.
- Uygulamanın Terminal ekranı.
- Çoklu sistem (ertelenmiş karar).
