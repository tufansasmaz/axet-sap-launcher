> **Gerçek bir vakanın kaydı.** Bu belge, `adobe-gen` bu hâle gelirken yaşanan
> oturumdan çıkmıştır — bir bakım emri çıktısı (BERP-1958) DS4 üzerinde sıfırdan
> üretilirken. Nesne adları (`ZPM001_*`) o projeye aittir, örnek olarak bırakıldı.
>
> SKILL.md kuralların **özetini** taşır; buradaki değer ise **nasıl bulunduklarıdır**.
> §7'deki teşhis prensipleri Adobe formlarına özel değildir: belgelenmemiş bir SAP
> API'siyle her boğuşmada aynı yöntem işe yarar — kaynağı oku, geri okuyarak doğrula,
> kör noktayı açmak için geçici mod ekle.

---

# BERP-1958 — Adobe Form/Interface Otomasyonu: Karşılaşılan Problemler ve Çözümler

**Proje:** ZPM001_AF_MAINT_ORDER_PRINT (Adobe Form) + ZPM001_IF_MAINT_ORDER_PRINT (Adobe Interface)
**Sistem:** DS4 (S/4HANA 2023), client 100
**Araç:** `adobe-gen` skill'i → `ZAI_FM_ADOBE_GEN` (RFC-enabled generator FM, SOAP-RFC üzerinden çağrılır)
**Tarih:** 2026-08-06

---

## 0. Bağlam — Neden bu yol gerekli oldu

SAP ADT (Eclipse tabanlı REST API), Adobe Form (`SFPF`) ve Adobe Interface (`SFPI`) nesne tiplerini **hiç tanımıyor** — `repository/typestructure` ve `discovery` endpoint'lerinde bu tipler yok, dolayısıyla klasik `create_object`/`get_object_source` akışı bu nesnelerde çalışmaz.

Bunun tek resmi çözümü SAP'nin kendi workbench API'si (`SAFPAPI` paketi: `CL_FP_WB_INTERFACE`, `CL_FP_WB_FORM`, `CL_FP_CONTEXT`, ...) — ama bu API'ler **dialog context** ister. `adt_classrun` (ADT'nin arka planda kod çalıştırma kanalı) üzerinden çağrıldığında `400 "Session Timed Out"` ile patlar.

**Çözüm mimarisi (screen-gen skill'inden ödünç alınan pattern):**
```
Python script → POST /sap/bc/soap/rfc → ZAI_FM_ADOBE_GEN (RFC-enabled FM)
                (dialog context sağlar)      |
                                    CL_FP_WB_INTERFACE / CL_FP_WB_FORM / CL_FP_CONTEXT
```

FM sistemde `$TMP` paketinde (transport'suz, yerel) yaşıyor ve bir kere RFC-enable edilmiş durumdaydı (screen-gen kurulumundan). Yeni "mod"lar eklerken bu ayarı bozmadım — sadece FM'in **imzasını** ve **body'sini** genişlettim.

---

## 1. Problem: Workbench UI aktivasyonu pencere sistemi istiyor

**Belirti:**
```
Sending of dynpro SAPLSEWORKINGAREA 0205 not possible: No window system type specified
```

**Kök neden:** `CL_FP_WB_INTERFACE=>ACTIVATE` (public metod) SAP GUI'nin normal workbench aktivasyon akışını kullanır — bu akış bir dynpro göndermeye çalışır. SOAP-RFC kanalı dialog context sağlar ama **pencere sistemi** sağlamaz.

**Denenen 1. çözüm (kısmen işe yaradı, sonra sorun çıkardı):**
`RS_WORKING_OBJECT_ACTIVATE` FM'ini `ui_decoupled = 'X'` parametresiyle çağırmak — bu, SAP'nin "dark mode" aktivasyon yoludur (`CL_FP_WB_OBJECT=>M_DARK` set edildiğinde içeride yapılan çağrının manuel eşdeğeri).

```abap
lv_objclass = 'SFPI'.
lv_objname  = iv_interface.
CALL FUNCTION 'RS_WORKING_OBJECT_ACTIVATE'
  EXPORTING
    object                    = lv_objclass
    obj_name                  = lv_objname
    activate_only_this_object = abap_true
    ui_decoupled              = abap_true.
```

Bu, `EV_RC=0` ile "başarılı" dönüyordu ve `create`/`save`/`generate` adımları da hatasız geçiyordu.

**Ek tuzak — E071 tip uyumsuzluğu:** `RS_WORKING_OBJECT_ACTIVATE`'in `object`/`obj_name` parametreleri `E071-OBJECT`/`E071-OBJ_NAME` tipinde; `FPNAME` tipini doğrudan geçmek `"type is not compatible"` hatası verdi. Çözüm: ara değişkenlerle (`TROBJTYPE`, `TROBJ_NAME`) geçiş yapmak.

---

## 2. Problem: "Aktif" görünen nesne gerçekte inaktif kalıyor

**Belirti:** Kullanıcı SFP'de interface'i açtığında **parametreler doluydu ama nesne inaktif görünüyordu.**

**Teşhis yöntemi:** FM'e bir `STATUS` modu ekleyip `CL_FP_WB_INTERFACE=>LOAD` → `GET_STATE()` ile gerçek DB durumunu (`A`=aktif / `I`=inaktif) doğrudan sorguladım:

```abap
IF iv_mode = 'STATUS'.
  DATA(lo_wb_if_st) = cl_fp_wb_interface=>load( i_name = iv_interface ).
  lv_if_state = lo_wb_if_st->get_state( ).
  ...
```

Sonuç: `RS_WORKING_OBJECT_ACTIVATE` ile "aktive edilen" interface'in state'i gerçekte **`I` (inaktif)** kalıyordu — çağrı sessizce başarılı dönüyor ama object state'i DB'de güncellemiyordu.

**Kök neden:** `RS_WORKING_OBJECT_ACTIVATE`, workbench UI'nin **popup/onay akışının** arkasındaki mekanizma; SFPI/SFPF gibi özel obje tipleri için object-state senkronizasyonunu güvenilir şekilde tetiklemiyor.

**Gerçek çözüm — kaynak kod incelemesi ile bulundu:**
`CL_FP_WB_HELPER` sınıfı (SFPI/SFPF'nin `global friends` listesinde), tam olarak bu ihtiyaç için **public, dialog-free** wrapper metodlar sunuyor:

```abap
class-methods INTERFACE_ACTIVATE
  importing !I_NAME type E071-OBJ_NAME
  raising CX_FP_API_USAGE CX_FP_API_REPOSITORY CX_FP_API_INTERNAL.

class-methods FORM_ACTIVATE
  importing !I_NAME type E071-OBJ_NAME !I_LANGUAGE type LANGU default SY-LANGU
  raising ...
```

İçeride bunlar `CL_FP_WB_INTERFACE=>LOAD_INTERNAL(...)->INT_ACTIVATE()` çağırıyor — **doğrudan** protected/internal aktivasyon metodunu tetikliyor, dynpro/UI katmanına hiç girmiyor.

```abap
cl_fp_wb_helper=>interface_activate( i_name = CONV e071-obj_name( iv_interface ) ).
cl_fp_wb_helper=>form_activate( i_name = CONV e071-obj_name( iv_form ) ).
```

**Doğrulama:** `STATUS` modu tekrar çalıştırıldı → `state=A` her ikisi için de doğrulandı.

**Ek tip notu:** `IV_INTERFACE`/`IV_FORM` parametreleri `FPNAME` tipinde, `INTERFACE_ACTIVATE`'in beklediği `I_NAME` ise `E071-OBJ_NAME` — açık `CONV e071-obj_name(...)` dönüşümü gerekti (implicit assignment tip hatası veriyordu: `"IV_INTERFACE" is not type-compatible with formal parameter "I_NAME"`).

---

## 3. Problem: Layout (XDP) yazma API'si "yok" sanılıyordu

**Varsayım (başlangıçta):** SAP dokümantasyonu ve skill'in kendi SKILL.md'si, `SAFPAPI`'nin layout için **sadece okuma** sunduğunu belirtiyordu (`FORM_LAYOUT_EXISTS`, `FORM_LAYOUT_URL`).

**Gerçek durum (kaynak kod taramasıyla bulundu):** `IF_FP_LAYOUT` interface'inde **hem** okuma **hem yazma** metodu var:

```abap
methods GET_LAYOUT_DATA
  importing value(I_MLAYOUT) type ABAP_BOOL optional
  returning value(R_LAYOUT_DATA) type XSTRING.

methods SET_LAYOUT_DATA
  importing !I_LAYOUT_DATA type XSTRING
            !I_SET_XLIFF_IDS type ABAP_BOOL default ABAP_TRUE
  raising CX_FP_API_INTERNAL.
```

**Çözüm — erişim zinciri:**
```
CL_FP_WB_FORM=>LOAD(i_name, i_dark=abap_true)
  → GET_OBJECT()                     " IF_FP_OBJECT
  → downcast IF_FP_FORM
  → GET_LAYOUT()                     " IF_FP_LAYOUT
  → GET_LAYOUT_DATA() / SET_LAYOUT_DATA(xdp_xstring)
  → WB_FORM->SAVE()
  → CL_FP_WB_HELPER=>FORM_ACTIVATE()
```

**SOAP-RFC üzerinden binary taşıma:** XDP bir XML/binary karışımı (`xstring`). SOAP-RFC kanalında güvenilir taşımak için **Base64 string** olarak paketlendi:
```abap
ev_layout_base64 = cl_http_utility=>encode_x_base64( lv_xdp ).
lv_xdp = cl_http_utility=>decode_x_base64( iv_layout_base64 ).
```
Python tarafında `base64.b64encode/b64decode` ile eşleştirildi.

**Doğrulama — roundtrip testi:** `SET_LAYOUT` ile yazılan XDP, hemen ardından `GET_LAYOUT` ile geri okundu; SAP'nin eklediği XLIFF ID'leri hariç (20221 byte gönderildi, 23431 byte geri okundu — SAP'nin kendi normalize etmesi) içerik tutarlı çıktı. Bu, "yazıldı" mesajının gerçek bir persist olduğunu, sahte-başarı olmadığını kanıtladı.

---

## 4. Problem: DDIC Table Type'ın RTTI'de "elementer tip" görünmesi

**Belirti:** `SYNC_CONTEXT` modu (bkz. §6) çalıştırıldığında:
```
Source type \CLASS=CL_ABAP_ELEMDESCR is not compatible, for the purposes
of assignment, with target type \CLASS=CL_ABAP_STRUCTDESCR
```

**Teşhis:** FM'e bir `RTTI_DEBUG` modu eklenip `CL_ABAP_TYPEDESCR=>DESCRIBE_BY_NAME` ile table type'ın runtime tip tanımı doğrudan sorgulandı:
```abap
lo_td_dbg = cl_abap_typedescr=>describe_by_name( iv_param1_type ).
ev_message = |kind={ lo_td_dbg->kind } absolute_name={ lo_td_dbg->absolute_name }|.
IF lo_td_dbg->kind = cl_abap_typedescr=>kind_table.
  lo_tab_dbg ?= lo_td_dbg.
  lo_line_dbg = lo_tab_dbg->get_table_line_type( ).
  ev_message = |{ ev_message } lineKind={ lo_line_dbg->kind } lineName={ lo_line_dbg->absolute_name }|.
ENDIF.
```

Sonuç:
```
ZPM001_TT_MAINT_ORDER_OP: kind=T absolute_name=\TYPE=ZPM001_TT_MAINT_ORDER_OP
lineKind=E lineName=\TYPE=%_T00006S00000000O0000000293
```

`lineKind=E` (elementary) + anonim isim (`%_T0000...`) — table type'ın satır tipi **structure değil, tek karakterlik anonim bir CHAR** olarak tanımlanmıştı.

**Kök neden:** Table type'ı ADT üzerinden ilk oluştururken (bkz. önceki mesajlarda `create_table_type` çağrısı), XML payload'da `rowType`'ın `builtInType` alt-elemanı **boş/hatalı** bırakılmıştı — SAP bunu "row type = anonim built-in tip" olarak yorumlamış, `typeName` referansını (structure adı) sessizce görmezden gelmişti. ADT'nin kendi metadata görüntüsü (`GET /ddic/tabletypes/...`) yanıltıcı şekilde doğru görünüyordu; gerçek DDIC/RTTI durumu farklıydı.

**Çözüm:** Table type'ı doğru `rowType` XML yapısıyla (dictionaryType + typeName + **doğru biçimlendirilmiş boş `builtInType`/`rangeType` alt-elemanları**) yeniden PUT ettim:
```xml
<ttyp:rowType>
    <ttyp:typeKind>dictionaryType</ttyp:typeKind>
    <ttyp:typeName>ZPM001_S_MAINT_ORDER_OP</ttyp:typeName>
    <ttyp:builtInType>
        <ttyp:dataType></ttyp:dataType>
        <ttyp:length>000000</ttyp:length>
        <ttyp:decimals>000000</ttyp:decimals>
    </ttyp:builtInType>
    <ttyp:rangeType></ttyp:rangeType>
</ttyp:rowType>
```

**Kritik XML detayı:** `<ttyp:dataType/>` (self-closing) SAP'nin XML parser'ını `"System expected the element ... builtInType"` hatasına düşürüyordu; `<ttyp:dataType></ttyp:dataType>` (açık-kapalı boş etiket) kabul edildi. SAP'nin ADT XML parser'ı self-closing ve boş-ama-açık etiketleri **eşdeğer saymıyor** — bu, birkaç deneme-hata turu gerektirdi.

**Doğrulama:** `RTTI_DEBUG` tekrar çalıştırıldı → `lineKind=S lineName=\TYPE=ZPM001_S_MAINT_ORDER_OP` — düzeldi.

---

## 5. Problem: Interface parametrelerinin (IS_HDR/IT_OPS) API ile eklenmesi

**İhtiyaç:** SFP'de manuel "Import Parameters" ekranına girmeden, interface'e `IS_HDR TYPE ZPM001_S_MAINT_ORDER_HDR` ve `IT_OPS TYPE ZPM001_TT_MAINT_ORDER_OP` parametrelerini eklemek.

**Kaynak kod taraması ile bulunan zincir:**
```
CL_FP_WB_INTERFACE=>LOAD(i_name, i_mode=WRITE)
  → GET_OBJECT()                    " IF_FP_OBJECT
  → downcast IF_FP_INTERFACE
  → GET_INTERFACE_DATA()            " IF_FP_INTERFACE_DATA
  → GET_PARAMETERS()                " IF_FP_PARAMETERS
  → SET_IMPORT_PARAMETERS(lt_import) " TYPE TFPIOPAR (SFPIOPAR satırları)
  → WB_INTERFACE->SAVE()
  → CL_FP_WB_HELPER=>INTERFACE_ACTIVATE()
```

`SFPIOPAR` yapısı (DDIC'te doğrulandı): `NAME`, `TYPING`, `TYPENAME`, `OPTIONAL`, `BYVALUE`, `DEFAULTVAL`, `STANDARD`, `CONSTANT`.

```abap
CLEAR ls_import.
ls_import-name     = iv_param1_name.
ls_import-typing   = 'TYPE'.
ls_import-typename = iv_param1_type.
APPEND ls_import TO lt_import.
lo_params_set->set_import_parameters( lt_import ).
```

**Doğrulama yöntemi:** Ayrı bir `GET_PARAMS` modu eklenip `GET_IMPORT_PARAMETERS()` ile geri okundu — ADT bu nesne tipini görüntüleyemediği için **tek güvenilir doğrulama yolu** buydu:
```
INTERFACE ZPM001_IF_MAINT_ORDER_PRINT import parametreleri:
[IS_HDR:ZPM001_S_MAINT_ORDER_HDR] [IT_OPS:ZPM001_TT_MAINT_ORDER_OP]
```

---

## 6. Problem: Form'un "Bağlam" (Context) sekmesi boş kalıyor

**Belirti (kullanıcı ekran görüntüsüyle bildirdi):** Interface parametreleri (`IS_HDR`, `IT_OPS`) dolu ve interface aktifti; form da aktifti ve layout tasarımı görünüyordu. Ama SFP'nin **Bağlam** sekmesi (SFP'nin "Arayüzden Al" / "Get from Interface" komutuyla normalde otomatik doldurduğu alan) **tamamen boştu**.

**Kök neden:** Parametre eklemek (§5) ve layout yazmak (§3) **birbirinden bağımsız** işlemler — hiçbiri formun kendi **Context ağacını** (`IF_FP_CONTEXT` node hiyerarşisi: hangi alanın hangi DDIC alanına `field` bind'ı olduğunu tutan iç yapı) güncellemiyor. SFP GUI'de "Arayüzden Al" butonuna basıldığında SAP bu ağacı **otomatik** kurar (`CL_FP_CONTEXT=>CREATE_NODES_FROM_PARAMETER` — kaynağı okundu), ama bizim API zincirimizde bu adım hiç tetiklenmemişti.

**Çözüm — `SYNC_CONTEXT` modu inşası:**

`IF_FP_CONTEXT` üzerinde public olarak sunulan node-oluşturma metodları (kaynak kodda doğrulandı):
```abap
methods CREATE_DATA      importing !I_NAME !I_FIELD !I_PARENT !I_BEFORE returning value(R_DATA) type ref to IF_FP_DATA.
methods CREATE_STRUCTURE importing !I_NAME !I_FIELD !I_PARENT !I_BEFORE returning value(R_STRUCTURE) type ref to IF_FP_STRUCTURE.
methods CREATE_LOOP      importing !I_NAME !I_TABLE_NAME !I_PARENT !I_BEFORE returning value(R_LOOP) type ref to IF_FP_LOOP.
```

RTTI (`CL_ABAP_TYPEDESCR`) ile parametre tipini (`kind_struct` / `kind_table` / elementer) tespit edip uygun node tipini seçen, alt alanları döngüyle ekleyen bir algoritma yazıldı:

```abap
lo_typedescr = cl_abap_typedescr=>describe_by_name( iv_param1_type ).
CASE lo_typedescr->kind.
  WHEN cl_abap_typedescr=>kind_struct.
    lo_structdescr ?= lo_typedescr.
    lo_struct_node = lo_ctx_sync->create_structure(
      i_name = CONV fpnodename( iv_param1_name )
      i_field = CONV fpfield( iv_param1_name )
      i_parent = lo_ctx_sync ).
    LOOP AT lo_structdescr->get_components( ) INTO ls_component.
      lo_data_node = lo_ctx_sync->create_data(
        i_name = CONV fpnodename( ls_component-name )
        i_parent = lo_struct_node ).
      lo_data_node->set_field( |{ iv_param1_name }-{ ls_component-name }| ).
    ENDLOOP.
  WHEN cl_abap_typedescr=>kind_table.
    " bkz. §6.1 — loop için ayrı bir tuzak var
  WHEN OTHERS.
    " elementer tip fallback
ENDCASE.
```

### 6.1. Alt-problem: Loop node'a doğrudan child eklemek "forma tayin edilmemiş" hatası veriyor

**Belirti:**
```
SYNC_CONTEXT basarisiz [checkpoint=P2_LOOP_SET_FIELD_VORNR]:
Nesne forma tayin edilmediğinden işlev yürütülemez
```
(`CX_FP_API_USAGE` exception, `textid = OBJECT_NOT_IN_A_FORM`)

**Teşhis:** Bir `lv_checkpoint` string değişkeni ile kod her adımda "şu anda nerede olduğumu" işaretleyip exception handler'da bunu mesaja bastım — bu, hatanın **tam olarak** `create_loop`'un döndürdüğü node'a `create_data` ile child eklerken oluştuğunu gösterdi.

**Kök neden (kaynak kod ile doğrulandı):** `CL_FP_LOOP` bir "akıllı" node değil — `CREATE_LOOP` çağrıldığında SAP kendi içinde **otomatik** olarak loop'un altına özel bir `CL_FP_LOOP_DATA` alt-node'u ekliyor (constructor'da: `CREATE OBJECT l_loop_data EXPORTING i_context = i_context i_name = 'DATA' i_parent = me`). SAP'nin kendi `INT_REFRESH` metodu (SFP'nin "Arayüzden Al" komutunun arkasındaki gerçek implementasyon) alanları **loop node'a değil, bu `LOOP_DATA` node'una** ekliyor:
```abap
" CL_FP_LOOP->INT_REFRESH (SAP kaynağı):
l_loop_data = if_fp_loop~get_loop_data( ).
...
l_data_node ?= l_context->if_fp_context~create_data( i_name = l_name i_parent = m_parent i_before = me ).
```
`m_parent` burada loop'un babası, ama alanlar **loop_data'nın çocukları** olarak modelleniyor (`IF_FP_LOOP_DATA` de `IF_FP_NODE`'u implement ediyor, yani geçerli bir `i_parent` adayı).

**Çözüm:**
```abap
lo_loop_node = lo_ctx_sync->create_loop( i_name = ... i_table_name = ... i_parent = lo_ctx_sync ).
DATA(lo_loop_data) = lo_loop_node->get_loop_data( ).   " <-- eksik olan adım
LOOP AT lt_components INTO ls_component.
  lo_data_node = lo_ctx_sync->create_data( i_name = ... i_parent = lo_loop_data ).  " loop_node DEĞİL
  lo_data_node->set_field( |{ iv_param_name }-{ ls_component-name }| ).
ENDLOOP.
```

**Doğrulama:**
```
FORM ZPM001_AF_MAINT_ORDER_PRINT: baglam senkronize edildi.
IS_HDR: 12 alan eklendi. IT_OPS: 3 alan eklendi.
```
Ardından `STATUS` modu ile `state=A` (her iki nesne) ve "interface'ten görünen import param sayısı=2" tekrar doğrulandı.

---

## 7. Genel teşhis metodolojisi — tekrar kullanılabilir prensipler

1. **ADT'nin "başarılı" dediği her şeye güvenme.** SFPI/SFPF ADT'nin görmediği nesneler; tek gerçek doğrulama, aynı API'yi **geri okuma** (`GET_STATE`, `GET_IMPORT_PARAMETERS`, `GET_LAYOUT_DATA`) ile yapmaktır. Bu proje boyunca üç kez ("aktif" ama `state=I`; "yazıldı" ama layout eski; "eklendi" ama context boş) görünürdeki başarı gerçek durumdan farklı çıktı.

2. **Kaynak kodu oku, dokümantasyona güvenme.** SKILL.md'nin kendisi "layout sadece okunur" diyordu — yanlıştı, `SET_LAYOUT_DATA` mevcuttu. SAP'nin resmi API dokümantasyonu bu iç sınıfları (`CL_FP_WB_HELPER`, `CL_FP_LOOP_DATA`) hiç belgelemez; tek güvenilir kaynak method implementasyonlarını doğrudan `ADT /source/main` üzerinden okumaktı.

3. **Checkpoint/debug modları ekleyerek kör noktaları aç.** `STATUS`, `GET_PARAMS`, `RTTI_DEBUG` ve `lv_checkpoint` stringi olmadan hiçbir hata mesajı ("forma tayin edilmemiş", "tip uyumsuz") tek başına yeterli bilgi vermiyordu — her biri bir üretim koduna eklenmiş, sorun çözüldükten sonra kalıcı diagnostic tool olarak bırakılmış geçici bir sondaydı.

4. **RFC/SOAP üzerinden binary veri taşırken Base64'ü unutma.** `xstring` alanları (layout XDP) doğrudan SOAP XML'e gömülemez; encode/decode simetrik olmalı.

5. **Explicit CONV kullan, implicit assignment'a güvenme.** ABAP'ın tip uyumluluğu (`FPNAME` vs `E071-OBJ_NAME` vs `FPFIELD` vs `FPNODENAME`) SOAP-RFC parametrelerinde otomatik çözülmüyor; her sınır geçişinde `CONV <tip>( ... )` gerekti.

6. **XML self-closing vs boş-açık etiket farkı SAP ADT parser'ında önemli.** `<tag/>` ile `<tag></tag>` bazı SAP endpoint'lerinde farklı davranıyor.

---

## 8. Sonuç — nihai çalışan mod listesi (`ZAI_FM_ADOBE_GEN`)

| Mod | Ne yapar | Bu oturumda eklendi/düzeltildi mi? |
|---|---|---|
| `WRITE` | Interface + Form oluşturur, `CL_FP_WB_HELPER` ile aktive eder | ✅ Aktivasyon mekanizması değiştirildi |
| `READ` | Var/yok durumunu SAP'nin kendi mesajıyla bildirir | Değişmedi |
| `DELETE` | Form + Interface siler (bağımlılık sırasıyla) | Değişmedi |
| `GET_LAYOUT` | XDP'yi base64 olarak okur | ✅ Yeni eklendi |
| `SET_LAYOUT` | Base64 XDP'yi yazar + aktive eder | ✅ Yeni eklendi, aktivasyon düzeltildi |
| `SET_PARAMS` | Interface'e 2 adede kadar import parametresi ekler | ✅ Yeni eklendi |
| `GET_PARAMS` | Interface'in import parametrelerini doğrulama amaçlı geri okur | ✅ Yeni eklendi (debug) |
| `STATUS` | Interface/Form gerçek `A`/`I` state'ini + context'ten görünen param sayısını raporlar | ✅ Yeni eklendi (debug) |
| `RTTI_DEBUG` | Bir DDIC tipinin runtime RTTI kind/satır-tipini raporlar | ✅ Yeni eklendi (debug, table type sorununu bulmak için) |
| `SYNC_CONTEXT` | RTTI'den context ağacını (struct/loop/data node'ları) otomatik inşa eder | ✅ Yeni eklendi — en karmaşık kısım |

Tüm değişiklikler `$TMP` paketindeki tek bir FM'e (`ZAI_FM_ADOBE_GEN`) yapıldı; hiçbir yeni transport nesnesi gerekmedi (FM local/sistem-geneli bir araç). Asıl iş nesneleri (`ZPM001_IF_MAINT_ORDER_PRINT`, `ZPM001_AF_MAINT_ORDER_PRINT`) `ZPM001` paketinde, `DS4K900067` transportunda.

---

## 9. Zeyil — 2026-08-07, skill marketplace'e taşınırken bulunan iki kök neden

> Bu bölüm orijinal kaydın (§0–8, 2026-08-06) parçası değildir. Skill
> `ntt-claude-marketplace`'e taşınıp `ZND_FM_ADOBE_GEN` adıyla kendini kurar hâle
> getirilirken, aynı sistemde (DS4) iki yeni kök neden daha bulundu. Yöntem aynı:
> kaynağı oku, geri okuyarak doğrula.

### 9.1. Şablonsuz form oluşturma: layout'u olmayan form aktive edilemez

**Belirti:** `--template` verilmeden yaratılan her form, aktivasyonda hiçbir şey
söylemeyen bir hatayla düşüyordu:

```
Nesne verilerini dönüştürme sırasında hata     (error converting object data)
```

Mesaj `SAVE_OBJECT` içindeki `CALL TRANSFORMATION`'dan geliyor ve neyin eksik olduğunu
söylemiyor.

**Eleme ile teşhis:** context kuruldu → yine düştü; layout tipi `S` yapıldı → yine
düştü; **bir XDP yüklendiği anda aynı form ilk denemede aktive oldu.** Kural: SAP,
layout'u olmayan bir formu aktive etmez.

Bu tek eksik varsayılan iki yanılsamayı birden üretmişti: "şablonsuz form yaratmak
imkânsız" ve `--template`'i alışkanlık hâline getirmek — kopyalanan formun XDP'siyle
birlikte **context'i de** gelir, ki `CALL_FUNCTION_CONFLICT_TYPE`'ın kaynağı budur
(çağrılabilir FM'in imzası interface'ten değil context'ten üretilir).

**Çözüm:** 653 baytlık boş bir A4 XFA subform (`bootstrap/blank.xdp`) şablonsuz her
`WRITE`'tan sonra otomatik uygulanıyor; FM de layout'suz aktivasyonu artık hiç
denemiyor — durumu söyleyip formu layout adımına bırakıyor.

### 9.2. Dolu context yeniden yazılamaz — `SAVE_OBJECT` izleme kaydı

`SYNC_CONTEXT`'in dolu bir context'i düzeltememesinin nedeni, kaynak üzerinde satır
satır izlendi:

```abap
" CL_FP_WB_FORM=>SAVE_OBJECT
IF m_delayed_loading IS INITIAL OR m_context_raw IS INITIAL.
    " …re-serialise from the live object…
ELSE.
    l_context->context = l_object->m_context_raw.   " ← ham blob aynen geri yazılır
ENDIF.

" CL_FP_WB_HELPER=>FORM_ACTIVATE
l_wb_form ?= cl_fp_wb_form=>load_internal( … i_delayed_loading = 'X' ).
l_wb_form->int_activate( ).
```

Aktivasyon formu **delayed loading** ile yeniden yükler; context zaten doluysa ELSE
dalı çalışır ve veritabanından okunan blob, az önce kaydettiğinizin üzerine geri
yazılır. Tabloda adım adım:

```
save() sonrası     :  state=A (eski)      state=I (bizim düzeltilmiş ağaç)
activate() sonrası :  state=A (eski)      — I satırı tüketildi, A hiç değişmedi
```

`save()` sorunsuz: inaktif satırı doğru yazıyor. Aynı bellek-içi nesne üzerinden
aktive etmek değişikliği taşıyor ama o yol pencere sistemi istiyor ve
*"operation cancelled by client"* ile düşüyor. Kıskaç. Boş context bundan kurtulur
çünkü `m_context_raw` initial'dır — ilk dal çalışır.

Sonuç: `SYNC_CONTEXT` dolu context'te `EV_RC=4` ile reddediyor; onarım SFP'de manuel
("Get from Interface"). Kural SKILL.md'de.
