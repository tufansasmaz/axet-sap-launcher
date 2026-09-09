// Ana sürecin kullanıcıya görünen metinleri. Renderer'daki `src/i18n/tr.ts`
// ile aynı işi yapar ama AYRI bir sözlüktür: bu metinler ana süreçte üretilir
// (hata/durum mesajları, menü başlıkları) ve renderer'ın sözlüğüne erişimi yok.
//
// `en.ts` ile anahtar kümesi BİREBİR aynı olmalı — eksik bir anahtar sessizce
// Türkçe'ye düşer, yani İngilizce arayüzde Türkçe metin görünür.
export const MAIN_TR = {
  // --- ortak ---
  "common.detailSuffix": " Detay: {tail}",
  // --- axet-code CLI (birden fazla dosya tarafından paylaşılıyor) ---
  "axetCode.runTimeout": "axet-code run zaman aşımına uğradı (120s).",
  "axetCode.cliNotFound": 'axet-code CLI bulunamadı (PATH\'de yok). "axet-code -v" komutunun çalıştığını doğrula.',
  "axetCode.exitCode": "axet-code çıkış kodu: {code}",
  "axetCode.runExitCode": "axet-code run kod {code} ile bitti.",
  "axetCode.testTimeout": "axet-code {seconds} saniyede cevap vermedi, test durduruldu.",

  // --- manualSystems.ts ---
  "manualSystems.invalidFormat": "Geçersiz dosya formatı: JSON dizi bekleniyor.",

  // --- sapLandscape.ts ---
  "sapLandscape.unnamed": "Adsız",

  // --- updater.ts ---
  "updater.devModeOnly": "Güncelleme kontrolü sadece paketlenmiş uygulamada çalışır (dev modda değil).",

  // --- chatAttachments.ts ---
  "chatAttachments.readFailed": "Dosya içeriği okunamadı.",
  "chatAttachments.tooLarge": "Dosya çok büyük (20MB üst sınır).",

  // --- agenticConnectors.ts ---
  "agenticConnectors.noToolCalled":
    "Ajan başarılı olduğunu bildirdi ama bu turda hiçbir bağlayıcı aracı çağırmamış — sonuç doğrulanamadı, bağlantı açılmadı.",

  // --- axetFlowsLiveDiscovery.ts ---
  "flowsLive.windowsOnly": "Otomatik keşif şu an sadece Windows'ta destekleniyor.",
  "flowsLive.appNotRunning": "Çalışan bir aXet.flows masaüstü uygulaması bulunamadı (aXet.flows.exe). Önce onu başlat.",
  "flowsLive.portUnverified": "aXet.flows.exe çalışıyor ama Designer arayüzünün portu doğrulanamadı (henüz tam açılmamış olabilir).",

  // --- axetFlowsLiveSave.ts ---
  "flowsLiveSave.requestTimeout": "İstek zaman aşımına uğradı.",
  "flowsLiveSave.noInstance": "Çalışan bir aXet.flows Canlı örneği bulunamadı.",
  "flowsLiveSave.listFailed": "Mevcut flow'lar okunamadı: {detail}",
  "flowsLiveSave.listFailedHttp": "Mevcut flow'lar okunamadı (HTTP {status}).",
  "flowsLiveSave.saveFailed": "Canlıya kaydedilemedi: {detail}",
  "flowsLiveSave.saveRejected": "Canlı host kaydı reddetti (HTTP {status}){detail}.",

  // --- axetChat.ts (boş cevap kapısı) ---
  "chat.emptyAnswerTui":
    "axet-code turu bitirdi ama hiçbir cevap metni üretmedi. Aynı mesajı \"Yeniden üret\" ile bir kez daha deneyin; tekrarlıyorsa axet-code sürümünüzü Company Portal'dan güncelleyin.",
  "chat.emptyAnswerRun":
    "axet-code hiçbir cevap metni üretmeden kapandı. Sohbet yedek kipte çalıştı ({reason}) — bu kipte cevap kaybı görülebiliyor. Kalıcı kipin açılması için sol alttaki Hazırlık ekranından bir proje klasörü seçin.",
  "chat.emptyAnswerNoReason": "sebep belirlenemedi",

  // --- axetChatTui.ts ---
  "chatTui.sessionDbUnreadable": "oturum veritabanı okunamıyor: {detail}",
  "chatTui.sessionDbMissing": "bu klasör için axet-code oturum veritabanı yok",
  "chatTui.askFallbackQuestion": "Devam etmek için bir tercihine ihtiyacım var.",
  "chatTui.sessionClosedUnexpectedly": "axet-code oturumu beklenmedik şekilde kapandı.",
  "chatTui.turnTimedOut": "axet-code {minutes} dakikadır hiçbir belirti vermedi.",
  "chatTui.turnRanTooLong": "axet-code {hours} saattir aralıksız çalışıyor; tur burada kesildi.",
  "chatTui.restartStillFailing": "axet-code oturumu yenilendi ama hata sürüyor ({failure}).",
  "chatTui.restartStillFailingAuth":
    "aXet portalı isteği yetki hatasıyla reddediyor (403). Süreç yenilendi, bir kez daha denendi, hata sürüyor. Bu arıza portal tarafında ve geçici: kendiliğinden açılıp kapanıyor. Birkaç dakika sonra aynı mesajı tekrar gönderin — uygulamayı kapatıp açmak hızlandırmıyor. Saatlerce sürerse portaldeki model yetkinizi kontrol ettirin.",
  "chatTui.updateRequired":
    "aXet.Code zorunlu bir güncelleme bekliyor ve güncellenene kadar hiçbir mesajı yanıtlayamıyor. Başlat menüsünden Company Portal'ı açın, \"aXet.code\" aratıp yeni sürümü kurun ve uygulamayı yeniden başlatın.",
  "chatTui.updateRequiredVersions":
    "aXet.Code zorunlu bir güncelleme bekliyor ({installed} → {latest}) ve güncellenene kadar hiçbir mesajı yanıtlayamıyor. Başlat menüsünden Company Portal'ı açın, \"aXet.code\" aratıp yeni sürümü kurun ve uygulamayı yeniden başlatın.",

  // --- fsExplorer.ts ---
  "fsExplorer.notAFile": "Bu bir klasör, dosya değil.",
  "fsExplorer.notText": "Bu dosya metin olarak görüntülenemiyor (ikili/binary içerik).",
  "fsExplorer.parentMissing": "Hedef klasör bulunamadı.",
  "fsExplorer.unknownImageType": "Bilinmeyen resim türü.",
  "fsExplorer.imageTooLarge": "Resim önizleme için çok büyük.",

  // --- sapGuiScriptClient.ts ---
  "guiScriptClient.requestTimeout": "SAP GUI Scripting bridge isteği zaman aşımına uğradı.",
  "guiScriptClient.diagnosticsFailed": "Teşhis çalıştırılamadı.",
  "guiScriptClient.screenStateFailed": "Ekran durumu okunamadı.",
  "guiScriptClient.screenshotFailed": "Ekran görüntüsü alınamadı.",
  "guiScriptClient.connectionListFailed": "Bağlantı listesi alınamadı.",
  "guiScriptClient.sessionListFailed": "Oturum listesi alınamadı.",
  "guiScriptClient.elementReadFailed": "Ekran elemanı okunamadı.",
  "guiScriptClient.actionFailed": "Aksiyon uygulanamadı.",

  // --- connectivity.ts ---
  "connectivity.reachable": "Sistem erişilebilir",
  "connectivity.timeout": "Zaman aşımı — VPN bağlı değil olabilir",
  "connectivity.refused": "Bağlanılamadı — VPN kontrol et",
  "connectivity.invalidUrl": "Geçersiz ADT URL",
  "connectivity.reachableViaRouter": "Sistem SAProuter üzerinden erişilebilir",
  "connectivity.hostUnresolved": "Host/port bilgisi çözümlenemedi",

  // --- sapGuiScriptManager.ts ---
  "guiScriptManager.pywin32Missing":
    "pywin32 bulunamadı — gömülü SAP GUI Scripting runtime'ı (resources/guiscript-runtime) bozuk/eksik olabilir, uygulamayı yeniden kur.",
  "guiScriptManager.windowsOnly": "SAP GUI Scripting sadece Windows'ta çalışır.",
  "guiScriptManager.portInUse": "{port} portu başka bir process tarafından kullanılıyor.",
  "guiScriptManager.exitedEarly": "process erken sonlandı ({detail}).",
  "guiScriptManager.pythonMissing": "gömülü Python çalıştırılabilir bulunamadı — uygulama kurulumu bozuk olabilir.",
  "guiScriptManager.alreadyRunning": "SAP GUI Scripting bridge zaten çalışıyor.",
  "guiScriptManager.externalOnPort": "SAP GUI Scripting bridge bu portta zaten (başka bir process tarafından) çalışıyor",
  "guiScriptManager.spawnFailed": "SAP GUI Scripting bridge process başlatılamadı ({pythonPath}): {detail}",
  "guiScriptManager.didNotStart": "SAP GUI Scripting bridge {port} portunda ayağa kalkmadı. {detail}",
  "guiScriptManager.started": "SAP GUI Scripting bridge başlatıldı (http://127.0.0.1:{port}).",

  // --- doctor.ts ---
  "doctor.timedOut": "Komut zaman aşımına uğradı.",
  "doctor.pythonMissingDetail":
    "Sistemde Python bulunamadı (`py` ve `python` çalışmadı). SAP bağlantısı Python olmadan kurulamaz.",
  "doctor.packagesOk": "{count} paketin hepsi kurulu.",
  "doctor.packagesMissing": "Eksik paket: {list}",
  "doctor.probeFailed": "Paketler sorgulanamadı.",
  "doctor.needsPython": "Önce Python kurulmalı.",
  "doctor.adtAlive": "Çalışıyor (127.0.0.1:{port}).",
  "doctor.adtDown":
    "Çalışmıyor ({port}). Bir SAP sistemine bağlandığında otomatik başlatılır; şu an bağlantı yoksa bu normaldir.",
  "doctor.rfcAlive": "Çalışıyor (127.0.0.1:{port}).",
  "doctor.rfcDown": "Çalışmıyor ({port}). Yalnızca router arkasındaki sistemlerde gerekiyor.",
  "doctor.rfcRuntimeMissing": "Gömülü RFC çalışma zamanı bulunamadı.",
  "doctor.axetUnknown": "axet-code sürümü okunamadı. Kurulu mu?",
  "doctor.toolkitMissing": "sap-toolkit klasörü bulunamadı — kurulum eksik görünüyor.",
  "doctor.nothingToInstall": "Kurulacak paket yok.",
  "doctor.catalogNotSynced":
    "NTT katalog klasörü bu makineye eşitlenmemiş (gerekli değil; uygulama kendi paketiyle geliyor).",

  // --- adtReadonlyServerManager.ts ---
  "adtServer.requestsMissing": "`requests` kurulu değil.",
  "adtServer.mcpMissing": "`mcp` paketi kurulu değil.",
  "adtServer.dotenvMissing": "`python-dotenv` kurulu değil.",
  "adtServer.someDepMissing": "Bir Python bağımlılığı kurulu değil.",
  "adtServer.portInUse": "{port} portu başka bir process tarafından kullanılıyor.",
  "adtServer.exitedEarly": "process erken sonlandı ({detail}).",
  "adtServer.pythonMissing": "python çalıştırılabilir bulunamadı (`py` PATH'te değil mi?).",
  "adtServer.failureWithHint":
    "{hint}{detail} Elle çalıştırmak için: `pip install -r requirements.txt` sonra ADT_CWD=<proje klasörü> py adt_readonly_server.py --port {port}.",
  "adtServer.didNotStart": "Sunucu {port} portunda ayağa kalkmadı.{detail}",
  "adtServer.alreadyRunning": "ADT read-only sunucusu zaten çalışıyor, yeniden başlatılmadı.",
  "adtServer.externalOnPort": "ADT read-only sunucusu bu portta zaten (başka bir process tarafından) çalışıyor durumda bulundu.",
  "adtServer.spawnFailed": "ADT read-only sunucu process'i başlatılamadı ({pythonPath}): {detail}",
  "adtServer.started": "ADT read-only sunucusu başlatıldı (http://127.0.0.1:{port}).",

  // --- rfcBridgeManager.ts ---
  "rfcBridge.pyrfcMissingEmbedded": "pyrfc bulunamadı — gömülü RFC runtime'ı (resources/rfc-runtime) bozuk/eksik olabilir, uygulamayı yeniden kur.",
  "rfcBridge.pyrfcMissing": "pyrfc kurulu değil ve gömülü RFC runtime'ı bulunamadı — uygulamayı yeniden kur.",
  "rfcBridge.sdkLoadFailedEmbedded": "Gömülü SAP NW RFC SDK DLL'leri yüklenemedi — uygulama kurulumu bozuk olabilir, yeniden kur.",
  "rfcBridge.sdkLoadFailed": "SAP NW RFC SDK yüklenemedi ve gömülü RFC runtime'ı bulunamadı — uygulamayı yeniden kur.",
  "rfcBridge.homeNotSet": "SAPNWRFC_HOME ortam değişkeni ayarlı değil.",
  "rfcBridge.dotenvMissing": "python-dotenv kurulu değil.",
  "rfcBridge.logonError": "RFC logon hatası olabilir — kullanıcı adı/şifre/route kontrol edilmeli.",
  "rfcBridge.exitedEarly": "process erken sonlandı ({detail}).",
  "rfcBridge.pythonMissingEmbedded": "gömülü Python çalıştırılabilir bulunamadı — uygulama kurulumu bozuk olabilir.",
  "rfcBridge.pythonMissing": "python çalıştırılabilir bulunamadı ve gömülü RFC runtime'ı yok — uygulamayı yeniden kur.",
  "rfcBridge.alreadyRunning": "RFC bridge zaten çalışıyor, yeniden başlatılmadı.",
  "rfcBridge.spawnFailed": "RFC bridge process başlatılamadı ({pythonPath}): {detail}",
  "rfcBridge.didNotStart": "RFC bridge {port} portunda ayağa kalkmadı. {detail}",
  "rfcBridge.started": "RFC bridge başlatıldı (http://127.0.0.1:{port}).",

  // --- sapRouter.ts ---
  "sapRouter.unexpectedResponse": "SAProuter rotayı kabul etmedi (yanıt: {type}).",
  "sapRouter.unexpectedResponseUnknown": "bilinmeyen",
  "sapRouter.permissionDenied":
    "SAProuter bu rotayı REDDETTİ ({tag}, return_code={returnCode} — izin tablosunda bu kaynak/hedef/port için kayıt yok; " +
    "router sürümüne göre bu -94/NIEROUT_PERM_DENIED ya da -93 gibi farklı bir kodla dönebilir, ikisi de aynı \"izin reddi\" " +
    "anlamına gelir). Bu bir yazılım hatası değil: router yöneticisinin (Basis/network ekibi) saprouttab izin tablosuna bu " +
    "makinenin genel IP'sinden hedef host:port'a \"ham/native\" (raw) tünelleme izni eklemesi gerekiyor — SAP GUI'nin DIAG " +
    "bağlantısı (native SAP NI protokolü) farklı bir izin kapsamında zaten çalışıyor olabilir, ama ADT/HTTPS trafiği için " +
    "ayrı bir P/S saprouttab satırı gerekir. Detay: {detail}",
  "sapRouter.rejected": "SAProuter rotayı reddetti (return_code={returnCode}). Detay: {detail}",
  "sapRouter.noDetail": "yok",
  "sapRouter.routeTooShort": "Router rotası en az bir router hop'u ve bir hedef içermeli.",
  "sapRouter.connectTimeout": "SAProuter bağlantısı zaman aşımına uğradı ({host}:{port})",
  "sapRouter.connectFailed": "SAProuter'a bağlanılamadı ({host}:{port}): {detail}",
  "sapRouter.tlsTimeout": "TLS handshake zaman aşımına uğradı (SAProuter üzerinden).",
  "sapRouter.httpTimeout": "HTTP isteği zaman aşımına uğradı (SAProuter üzerinden).",
  "sapRouter.invalidHttpResponse": "Geçersiz HTTP yanıtı (SAProuter üzerinden).",

  // --- launcher.ts (RFC bridge sonuç notları) ---
  // NOT: launcher'ın kullanıcıya dönen ÜST DÜZEY mesajları zaten kendi
  // `connectMsg()` tablosunda iki dilde. Buradakiler `rfcOutcome.detailNote`
  // zinciri — o metin `connectMsg`'in {detail} parametresine gömülüp toast'ta
  // görünüyor, yani tablo iki dilliyken içine giren metin Türkçe kalıyordu.
  // `discoveryNotes`/`sap-context.md` bu kapsamda DEĞİL: onlar axet.code'un
  // okuduğu teknik günlük, kullanıcıya gösterilmiyor (bkz. launcher.ts başı).
  "launcher.rfcRouteDeniedHint":
    "SAProuter RFC/gateway trafiğini de reddediyor — Basis'in saprouttab'a bu ashost:sysnr için ayrı bir RFC izin satırı (P) " +
    "eklemesi gerekiyor, kimlik bilgisi sorunu değil.",
  "launcher.rfcTimeoutHint":
    "Bu bir \"zaman aşımı\" — router paketi AÇIKÇA reddetmedi (NI_RTERR/-94/-93 değil), sessizce yanıtsız bıraktı. Büyük " +
    "olasılıkla router'ın izin tablosu SAP GUI'nin kullandığı DIAG/dispatcher portuna (örn. 3200) izin veriyor ama RFC " +
    "istemcisinin gerçekte bağlandığı FARKLI bir port olan GATEWAY portuna (aynı instance no ile 33xx, örn. 3300) hiç izin " +
    "vermiyor — Basis/network ekibine bu ayrımı (dispatcher değil, gateway portu) özellikle belirt. Kimlik bilgisi sorunu değil.",
  "launcher.rfcCommFailureHint":
    "RFC bağlantısının kendisi router üzerinden application server/gateway'e ulaşamadı — büyük olasılıkla Basis'in " +
    "saprouttab'daki RFC izni veya yanlış ashost/sysnr, kimlik bilgisi sorunu değil.",
  "launcher.rfcLogonRejectedHint":
    "RFC logon'un kendisi reddedildi — bu sistem için kullanıcı adı/şifre/client'ı özellikle kontrol et (RFC logon, HTTP Basic " +
    "Auth kontrolünden farklı davranabilir).",
  "launcher.rfcScriptMissing":
    "adt_rfc_bridge.py bulunamadı (SAP toolkit kurulu değil gibi görünüyor) — RFC bridge otomatik başlatılamadı, elle kuruluma bak.",
  "launcher.rfcStartFailed": "RFC bridge otomatik başlatılamadı: {detail}",
  "launcher.rfcStartedVerified": "RFC bridge otomatik başlatıldı ({url}) ve kimlik bilgileri RFC üzerinden doğrulandı ✓.",
  "launcher.rfcStartedAuthFailed": "RFC bridge çalışıyor ({url}) ama kimlik doğrulama başarısız: {detail}",
  "launcher.rfcStartedUnverified":
    "RFC bridge başlatıldı ({url}) ama kimlik doğrulaması tamamlanamadı ({detail}) — bridge yine de çalışır durumda, " +
    "%sap-adt-readonly ile tekrar denenebilir.{hint}",

  // --- index.ts ---
  "app.unexpectedErrorTitle": "NTT Studio — Beklenmeyen Hata",
  "app.windowNotReady": "Pencere hazır değil",
  "app.clipboardNotAString": "text bir metin değil",
  "explorer.folderAccessDenied": "Bu klasöre erişim izni yok.",
  "explorer.fileAccessDenied": "Bu dosyaya erişim izni yok.",
  "flows.notDeployed": "Flow deploy edilmemiş (çalışan bir HTTP sunucusu yok).",
  "flows.requestTimeout": "İstek zaman aşımına uğradı.",
  "guiScript.runtimeMissing":
    "Gömülü SAP GUI Scripting runtime'ı (resources/guiscript-runtime) bulunamadı — uygulama kurulumu eksik/bozuk olabilir.",
  "guiScript.bridgeNotRunning": "Bridge çalışmıyor — önce başlat.",

  // --- index.ts: işletim sistemi dosya diyalogları ---
  // Diyaloğun BAŞLIĞI uygulama arayüzüdür; dışa aktarılan dosyanın İÇERİĞİ
  // (chatExport.ts / chatPrint.ts) kullanıcı isteğiyle kapsam dışı.
  "dialog.exportManualSystems": "Manuel Sistemleri Dışa Aktar",
  "dialog.importManualSystems": "Manuel Sistemleri İçe Aktar",
  "dialog.exportChat": "Sohbeti dışa aktar",
  "dialog.exportChatFailed": "Sohbet dışa aktarılamadı",
  "dialog.saveFlowJson": "aXet.flows JSON olarak kaydet",
  "dialog.openFlowJson": "aXet.flows JSON dosyası aç",
  "dialog.exportDebugJson": "Debug kaydını JSON olarak dışa aktar",
  "dialog.saveGuiScriptJson": "SAP GUI Scripting kaydını JSON olarak kaydet",
  "dialog.openGuiScriptJson": "SAP GUI Scripting kaydı aç"
} as const;
