// SAP GUI Scripting AI Agent — action sözlüğü. `src/flows/agent/tools.js`'in
// AYNI JSON-aksiyon protokolü desenini izler (LLM'e OpenAI-function-style
// tam bir `tools` array'i GÖNDERİLMİYOR — CLI stdin ile çağrıldığı için,
// bunun yerine `ACTIONS_DOC` düz metin olarak system prompt'a gömülür).
//
// axet.flows'tan TEK yapısal fark: burada mutasyon YAPILACAK bir in-memory
// model (FlowModel) yok — her aksiyon gerçek bir IPC round-trip'i (SAP GUI
// Scripting bridge'ine HTTP isteği). Bu yüzden `createExecutor` ASENKRON
// bir `executeTool` döner (flows'taki senkron switch'in aksine).
//
// KASITLI TASARIM KURALI (agent'ın gerçek ID uydurmasını önlemek için):
// `set_text`/`press`/`select`/`double_click`/`send_vkey`/
// `select_context_menu_item` HİÇBİRİ kendi başına bir element ID
// İCAT EDEMEZ — agent önce `get_node` ile gerçek ağacı okumalı, sadece
// GÖRDÜĞÜ node'ların `id` alanını kullanabilir. Bu kural kod SEVİYESİNDE
// zorlanmıyor (executor teknik olarak herhangi bir string id'yi
// `findById`'e iletir, Python bridge zaten geçersiz bir ID'de kendi COM
// hatasını verir) — asıl disiplin system prompt'taki kural + `get_node`
// çağrısının HER YENİ ekran için zorunlu tutulmasıyla sağlanıyor (bkz.
// systemPrompt.ts kural #2).

export const ACTIONS_DOC = `Kullanabilecegin action'lar:

- list_connections {}
  Su an acik olan SAP GUI baglantilarini listeler (index, description, sessionCount).
- list_sessions {"conn_idx": 0}
  Bir baglantidaki oturumlari listeler (index, Transaction, Program, SystemName, Client, User).
- get_node {"conn_idx": 0, "sess_idx": 0, "id": "wnd[0]/usr/txtRSYST-BNAME", "row_offset": 0}
  Bir ekran elemaninin GERCEK detayini (id, type, name, text, tooltip, changeable, children,
  varsa grid verisi) doner. "id" bos/atlanirsa aktif ana pencere (wnd[0]) doner. YENI bir ekrana
  gecince (T-code degisti, bir buton basildiktan sonra) BU action'i tekrar cagirip ekranin
  GERCEKTEN degistigini/hangi elemanlarin oldugunu KONTROL ET - asla onceki turda gordugun
  ID'lerin hala gecerli oldugunu VARSAYMA.
  BIR GRID'DE satirlar SAYFA SAYFA gelir (bir kerede ~15 satir; tamamini okumak canli bir
  ALV'de 16 saniye suruyor ve o sure boyunca baska hicbir sey yapilamiyor). Cevaptaki
  "grid.previewNote" hangi satirlara baktigini ve sonraki sayfayi nasil isteyecegini soyler:
  "row_offset" ver. "grid.rows" icindeki satirlarin numaralari MUTLAKTIR (0'dan degil,
  "grid.rowOffset"tan baslar) - double_click'e verecegin "row" iste o numaradir.
- set_text {"conn_idx": 0, "sess_idx": 0, "id": "...", "value": "..."}
  Bir alana metin yazar (GuiTextField/GuiCTextField/GuiPasswordField vb.).
- press {"conn_idx": 0, "sess_idx": 0, "id": "..."}
  Bir butona basar (GuiButton).
- select {"conn_idx": 0, "sess_idx": 0, "id": "..."}
  Bir elemani secer (radio button, tab, grid satiri vb.).
- double_click {"conn_idx": 0, "sess_idx": 0, "id": "...", "row": 0, "column": "VBELN"}
  Bir elemana cift tiklar. DIKKAT - bir ALV GRID'de (get_node cevabinda "grid.kind":"alv")
  "row" ZORUNLUDUR: SAP'nin imzasi doubleClick(satir, sutun) seklinde ve grid SATIRLARININ
  KENDI ID'SI YOKTUR - "id" her zaman GRID'IN kendi id'sidir ("...\/shellcont\/shell" gibi),
  satiri "id"nin sonuna EKLEME. "row" 0 tabanli satir numarasi, "column" ise get_node
  cevabindaki "grid.columns" listesinden bir sutun adi (verilmezse ilk sutun kullanilir).
  Grid DISINDAKI elemanlarda (agac dugumu, liste satiri) sadece "id" yeterli.
- send_vkey {"conn_idx": 0, "sess_idx": 0, "id": "...", "vkey": 0}
  Bir tus kodu gonderir (0=Enter, 3=F3/Geri, 8=F8/Calistir, 11=Ctrl+S, 12=F12/Iptal). "id" bos
  birakilirsa ana pencereye (wnd[0]) gonderilir - COK SIK kullanilan bir aksiyondur (T-code'a
  Enter ile gecmek icin).
- select_context_menu_item {"conn_idx": 0, "sess_idx": 0, "id": "...", "value": "...", "by": "position"}
  Bir elemanin sag-tik menusunden bir ogeyi secer. "by": "position" (menudeki sira, 0 tabanli),
  "text" (menude GORUNEN etiket) veya "code" (SAP islev kodu, orn "&XXL").
  Menu ONCE acilir, sonra oge secilir - bunu sen yapmiyorsun, tek action yeterli.
  MENUNUN ICINDEKILERI OKUMANIN YOLU YOK: get_node baglam menusunu GORMEZ (SAP onu bilesen
  agacinda hic gostermiyor - canli dogrulandi). Yani "text" ve "code" degerlerini ancak
  TAHMIN edebilirsin, ve tahmin genelde tutmaz: canli bir ALV'de menudeki ogenin etiketi
  "Ara..." iken actigi popup'in basligi "Bul" idi - "Bul"/"Find..."/"Ayrintilar" gibi dokuz
  mantikli tahminin hepsi reddedildi.
  BU YUZDEN "position" ILE SONDALA: "0"dan baslayip artir. Gecersiz/ayirac bir konum
  ZARARSIZCA reddedilir (hata metnini gorursun, ekran degismez), gecerli bir konum ise ISLEMI
  YAPAR - her denemeden sonra get_node ile ekranin degisip degismedigine bak. Yanlis bir oge
  calistiysa (beklenmedik popup) F12/Iptal (send_vkey 12) ile geri don.
- ask_user {"question": "...", "options": ["...", "..."]}
  Belirsiz bir noktada kullaniciya soru sor ve dur; cevap bir sonraki KULLANICI mesaji olarak
  gelecek. "options" opsiyoneldir. Bir batch icindeyse bundan sonraki action'lar CALISTIRILMAZ.
- finish {"summary": "..."}
  Yapilacak baska bir sey kalmadiginda kisa bir Turkce ozet ile dur. Bir batch icindeyse
  bundan sonraki action'lar CALISTIRILMAZ.`;

export const BATCH_FORMAT_DOC = `BATCH FORMATI:
Her LLM cevabin bir alt-process baslatiyor (yavas ve maliyetli) - TEK bir cevapta BIRDEN FAZLA
action dondurebilirsin:

{"actions": [
  {"action": "set_text", "args": {"conn_idx": 0, "sess_idx": 0, "id": "...", "value": "..."}},
  {"action": "send_vkey", "args": {"conn_idx": 0, "sess_idx": 0, "vkey": 0}}
]}

- Tek bir action yeterliyse basit formu da kullanabilirsin: {"action": "...", "args": {...}}.
- DIKKAT: flow builder'daki "ref" mekanizmasi BURADA YOK - SAP GUI element ID'leri (orn
  "wnd[0]/usr/txtRSYST-BNAME") zaten SAP'in kendi verdigi SABIT string'ler, sen yeni bir id
  URETMIYORSUN, sadece get_node ile GORDUGUN id'leri kullaniyorsun.
- Bir batch'te en fazla ~6 action calisir (flow builder'dan DAHA DUSUK bir sinir - burada her
  action GERCEK bir ekranin durumunu degistirebiliyor, bu yuzden "kor" uzun zincirler flow
  eklemekten daha risklidir). Bir T-code'a girip Enter'a basmak gibi ekran DEGISTIREN bir
  action'dan SONRA, ayni batch'te devam etmek yerine bir sonraki turda get_node ile YENI
  ekrani DOGRULA - kor sekilde devam etme.`;
