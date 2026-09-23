FUNCTION znd_fm_adobe_gen
  IMPORTING
    VALUE(iv_interface) TYPE fpname OPTIONAL
    VALUE(iv_form) TYPE fpname OPTIONAL
    VALUE(iv_devclass) TYPE devclass DEFAULT '$TMP'
    VALUE(iv_transport) TYPE trkorr OPTIONAL
    VALUE(iv_language) TYPE langu DEFAULT sy-langu
    VALUE(iv_if_text) TYPE fptext OPTIONAL
    VALUE(iv_form_text) TYPE fptext OPTIONAL
    VALUE(iv_template) TYPE fpname OPTIONAL
    VALUE(iv_mode) TYPE char20 DEFAULT 'WRITE'
    VALUE(iv_layout_base64) TYPE string OPTIONAL
    VALUE(iv_param1_name) TYPE fpvarname OPTIONAL
    VALUE(iv_param1_type) TYPE fptypename OPTIONAL
    VALUE(iv_param2_name) TYPE fpvarname OPTIONAL
    VALUE(iv_param2_type) TYPE fptypename OPTIONAL
    VALUE(iv_layout_type) TYPE fplayouttype DEFAULT 'S'
  EXPORTING
    VALUE(ev_rc) TYPE i
    VALUE(ev_message) TYPE string
    VALUE(ev_layout_base64) TYPE string.



* GENERIC Adobe Form / Adobe Interface URETECI.
* ADT bu iki nesne tipini (SFPI / SFPF) HIC tanımaz - desteklenen tip listesinde
* yoklar. SAP'in kendi workbench API'si (paket SAFPAPI) ise tam yetkili:
* CL_FP_WB_INTERFACE / CL_FP_WB_FORM. Bu FM o API'yi sarar.
*
* NEDEN RFC + SOAP-RFC: bu generation API'leri dialog context ister. classrun'dan
* çağırınca "Session Timed Out" alınır - screen-gen skill'inde aynı tuzak belgeli.
* Bu yüzden FM RFC-enabled olmalı ve /sap/bc/soap/rfc üzerinden çağrılmalı.
*
* IKINCI TUZAK (screen-gen'de YOK, burada var): SOAP-RFC dialog CONTEXT verir ama
* PENCERE SISTEMI vermez. Workbench'in normal aktivasyon yolu dynpro göndermeye
* çalışır ve su hatayla patlar:
*   "Sending of dynpro SAPLSEWORKINGAREA 0205 not possible: No window system type
*    specified"                                    (06.08.2026, DS4'te ölçüldü)
*
* BU TUZAĞIN ILK ÇÖZÜMÜ YANLIŞTI - ve yanlışlığı SESSIZDI. "Dark mode"un yaptığı
* çağrıyı (RS_WORKING_OBJECT_ACTIVATE + UI_DECOUPLED='X') elle yapmak EV_RC=0
* döndürüyor, create/save/generate hatasız geçiyor, nesne TADIR'da görünüyor -
* ama state DB'de 'I' (INAKTIF) kalıyor. Kullanıcı SFP'de açınca "parametreler
* dolu ama nesne inaktif" görüyor. O çağrı SFPI/SFPF için object-state
* senkronizasyonunu tetiklemiyor.
*
* DOGRU ÇÖZÜM: CL_FP_WB_HELPER=>INTERFACE_ACTIVATE / FORM_ACTIVATE. Bu sinif
* SFPI/SFPF'nin GLOBAL FRIEND'i ve tam bu ihtiyac için public, dialog-free
* sarmalayıcılar sunuyor; iceride LOAD_INTERNAL(...)->INT_ACTIVATE() cagirip
* UI katmanina hic girmiyor.
*
* ORADAN CIKAN GENEL KURAL: bu nesnelerde "basarili" mesajina ASLA güvenme.
* ADT SFPI/SFPF'i görmediği için tek gerçek doğrulama aynı API'yi GERI OKUMAKTIR
* (STATUS -> GET_STATE, GET_PARAMS -> GET_IMPORT_PARAMETERS, GET_LAYOUT ->
* GET_LAYOUT_DATA). Bu FM geliştirilirken görünürdeki başarı UC KEZ gerçek
* durumdan farklı çıktı: "aktif" ama state=I, "yazildi" ama layout eski,
* "eklendi" ama context boş.
*
* AKIS (SAP'in kendi sirasi - CREATE kalıcı YAZMAZ, sadece bellekte INSERT modunda
* nesne kurar; SAVE cagrilmazsa hiçbir sey oluşmaz):
*   cl_fp_interface=>create( )        -> IF_FP_INTERFACE (boş icerik)
*   cl_fp_wb_interface=>create( )     -> IF_FP_WB_INTERFACE (bellekte, INACTIVE)
*   ->save( )                         -> repository'ye yaz
*   cl_fp_wb_helper=>interface_activate( ) -> aktive et (yukaridaki nedenle)
*   aynı sira form için: cl_fp_form=>create / cl_fp_wb_form=>create / save /
*   cl_fp_wb_helper=>form_activate / generate
*
* LAYOUT (XDP): IV_MODE = 'GET_LAYOUT' / 'SET_LAYOUT' ile okunur/yazılır -
* CL_FP_WB_FORM=>LOAD -> GET_OBJECT (IF_FP_OBJECT) -> downcast IF_FP_FORM ->
* GET_LAYOUT (IF_FP_LAYOUT) -> GET_LAYOUT_DATA/SET_LAYOUT_DATA (XSTRING).
* SOAP-RFC üzerinden binary taşıma riskini azaltmak için base64 STRING kullanilir
* (SSF/ICM CL_HTTP_UTILITY=>ENCODE_X_BASE64 / DECODE_X_BASE64).
*
* IV_MODE - üretim modları:
*   WRITE        interface + form yarat ve aktive et
*   READ         var/yok durumunu SAP'in kendi metniyle bildir
*   DELETE       form + interface sil (bağımlılık sırasıyla)
*   GET_LAYOUT   XDP'yi base64 oku
*   SET_LAYOUT   base64 XDP yaz + layout tipi + aktive et
*   SET_LAYOUT_TYPE  yalnızca layout tipini düzeltir (mevcut XDP'ye dokunmaz)
*   SET_PARAMS   interface'e import parametresi ekle (2 slot)
*   GET_CONTEXT  context ağacını geri oku (cift düğüm teshisi)
*   SYNC_CONTEXT parametrelerden formun context ağacını kur (SFP'deki
*                "Arayuzden Al" karşılığı). YALNIZCA BOŞ CONTEXTTE çalışır -
*                dolu contexti reddeder, sebebi aşağıda.
* IV_MODE - teşhis modları (uretimde de bırakıldı, çünkü tek doğrulama yolu):
*   STATUS       gerçek A/I state'i + gorunen parametre sayisi
*   GET_PARAMS   interface'in import parametrelerini geri oku
*   RTTI_DEBUG   bir DDIC tipinin runtime kind/satır-tipini bildir
* EV_RC: 0 = tamam / 4 = zaten vardi, dokunulmadi / 8 = hata (EV_MESSAGE'a bak).

  DATA: lo_if       TYPE REF TO if_fp_interface,
        lo_wb_if    TYPE REF TO if_fp_wb_interface,
        lo_form     TYPE REF TO if_fp_form,
        lo_wb_form  TYPE REF TO if_fp_wb_form,
        lo_object   TYPE REF TO if_fp_object,
        lo_layout   TYPE REF TO if_fp_layout,
        lv_xdp      TYPE xstring,
        lv_done     TYPE string,
        lv_skipped  TYPE string,
        lv_gen_note TYPE string.

  CLEAR: ev_rc, ev_message, ev_layout_base64.

*----------------------------------------------------------------------
* GET_LAYOUT - formun mevcut XDP'sini xstring olarak okur, base64 dondurur
*----------------------------------------------------------------------
  IF iv_mode = 'GET_LAYOUT'.
    IF iv_form IS INITIAL.
      ev_rc = 8.
      ev_message = 'IV_FORM bos - okunacak form adi zorunlu.'.
      RETURN.
    ENDIF.
    TRY.
        lo_wb_form = cl_fp_wb_form=>load( i_name = iv_form i_dark = abap_true ).
        lo_object  = lo_wb_form->get_object( ).
        lo_form   ?= lo_object.
        lo_layout  = lo_form->get_layout( ).
        lv_xdp     = lo_layout->get_layout_data( ).

        ev_layout_base64 = cl_http_utility=>encode_x_base64( lv_xdp ).
        ev_rc = 0.
        ev_message = |FORM { iv_form }: layout okundu ({ xstrlen( lv_xdp ) } byte).|.
      CATCH cx_root INTO DATA(lx_get).
        ev_rc = 8.
        ev_message = |GET_LAYOUT basarisiz: { lx_get->get_text( ) }|.
    ENDTRY.
    RETURN.
  ENDIF.

*----------------------------------------------------------------------
* SET_LAYOUT - base64 XDP'yi forma yazar, aktive eder
*----------------------------------------------------------------------
  IF iv_mode = 'SET_LAYOUT' OR iv_mode = 'SET_LAYOUT_TYPE'.
    IF iv_form IS INITIAL.
      ev_rc = 8.
      ev_message = 'IV_FORM zorunlu.'.
      RETURN.
    ENDIF.
    IF iv_mode = 'SET_LAYOUT' AND iv_layout_base64 IS INITIAL.
      ev_rc = 8.
      ev_message = 'SET_LAYOUT icin IV_LAYOUT_BASE64 zorunlu.'.
      RETURN.
    ENDIF.
    TRY.
        lo_wb_form = cl_fp_wb_form=>load( i_name = iv_form i_mode = if_fp_wb_object=>c_mode_write
                                          i_ordernum = iv_transport i_dark = abap_true ).
        lo_object  = lo_wb_form->get_object( ).
        lo_form   ?= lo_object.
        lo_layout  = lo_form->get_layout( ).

        IF iv_mode = 'SET_LAYOUT'.
          lv_xdp = cl_http_utility=>decode_x_base64( iv_layout_base64 ).
          lo_layout->set_layout_data( i_layout_data = lv_xdp ).
        ENDIF.

*       LAYOUT TIPI AYRI BIR ALANDIR (FPLAYOUT-TYPE) ve SET_LAYOUT_DATA ONU
*       SET ETMEZ. Boş bırakılırsa domain'de karşılığı "Unbekannter Layout Typ"
*       olur; form aktive olur, ekranda dogru görünür, ama kullanıcı SFP'de
*       KAYDET'e basınca FPUIFB101 "Layout type 'Unknown' is no longer valid"
*       hatası alır. (06.08.2026, DS4'te ölçüldü.) Geçerli değerler:
*       S=Standardlayout (yazdirma formlari için normal olan) / Z=ZCI /
*       A=xACF / boş=bilinmiyor. Bu yüzden varsayilan 'S'.
        lo_layout->set_layout_type( i_layout_type = iv_layout_type ).
        lo_wb_form->save( ).

*       CL_FP_WB_HELPER (SFPI/SFPF'in global friend'i) INT_ACTIVATE'i
*       doğrudan çağırır - workbench UI/dynpro yolundan GEÇMEZ, dialog
*       veya pencere sistemi gerektirmez. RS_WORKING_OBJECT_ACTIVATE'den
*       daha guvenilir: object state'i gercekten A (aktif) yapar.
        cl_fp_wb_helper=>form_activate( i_name = CONV e071-obj_name( iv_form ) ).
*       AKTIVASYONU GENERATE IZLEMELI. Cagrilabilir fonksiyon modulu (/1BCDWB/SM*)
*       bununla uretilir; olmadan form AKTIF gorunur, context dogrudur, STATUS
*       temiz doner - ama cagiran programin cozecegi bir FM yoktur.
*       (07.08.2026, DS4: sablonsuz form aktive oldu, FUPARAREF'te karsiligi
*        cikmadi.) Ayri sarilir: burada patlarsa nesne yine de aktif kalir.
        TRY.
            cl_fp_wb_form=>generate( i_name = iv_form ).
          CATCH cx_root INTO DATA(lx_gsl).
            lv_gen_note = | (generate atlandi: { lx_gsl->get_text( ) })|.
        ENDTRY.

        ev_rc = 0.
        IF iv_mode = 'SET_LAYOUT'.
          ev_message = |FORM { iv_form }: layout yazildi ({ xstrlen( lv_xdp ) } byte), | &&
                       |tip='{ iv_layout_type }', aktive edildi{ lv_gen_note }.|.
        ELSE.
          ev_message = |FORM { iv_form }: layout tipi '{ iv_layout_type }' yazildi ve aktive edildi.|.
        ENDIF.
      CATCH cx_root INTO DATA(lx_set).
        ev_rc = 8.
        ev_message = |SET_LAYOUT basarisiz: { lx_set->get_text( ) }|.
    ENDTRY.
    RETURN.
  ENDIF.

*----------------------------------------------------------------------
* SET_PARAMS - Adobe Interface'e IMPORT parametreleri ekler (max 2 - bu
* skill'in kapsami sadece IS_HDR/IT_OPS gibi tekil header+table cifti için
* genisletildi; SOAP üzerinden serbest bir TFPIOPAR tablosu taşımak yerine
* iki sabit slot kullanildi).
*----------------------------------------------------------------------
  IF iv_mode = 'SET_PARAMS'.
    IF iv_interface IS INITIAL OR iv_param1_name IS INITIAL OR iv_param1_type IS INITIAL.
      ev_rc = 8.
      ev_message = 'IV_INTERFACE, IV_PARAM1_NAME, IV_PARAM1_TYPE zorunlu.'.
      RETURN.
    ENDIF.
    TRY.
        DATA: lo_wb_if_set  TYPE REF TO if_fp_wb_interface,
              lo_object_set TYPE REF TO if_fp_object,
              lo_if_set     TYPE REF TO if_fp_interface,
              lo_data_set   TYPE REF TO if_fp_interface_data,
              lo_params_set TYPE REF TO if_fp_parameters,
              lt_import     TYPE tfpiopar,
              ls_import     TYPE sfpiopar.

        lo_wb_if_set = cl_fp_wb_interface=>load( i_name = iv_interface
                                                  i_mode = if_fp_wb_object=>c_mode_write
                                                  i_ordernum = iv_transport ).
        lo_object_set = lo_wb_if_set->get_object( ).
        lo_if_set ?= lo_object_set.
        lo_data_set = lo_if_set->get_interface_data( ).
        lo_params_set = lo_data_set->get_parameters( ).

        CLEAR ls_import.
        ls_import-name     = iv_param1_name.
        ls_import-typing   = 'TYPE'.
        ls_import-typename = iv_param1_type.
        APPEND ls_import TO lt_import.

        IF iv_param2_name IS NOT INITIAL AND iv_param2_type IS NOT INITIAL.
          CLEAR ls_import.
          ls_import-name     = iv_param2_name.
          ls_import-typing   = 'TYPE'.
          ls_import-typename = iv_param2_type.
          APPEND ls_import TO lt_import.
        ENDIF.

        lo_params_set->set_import_parameters( lt_import ).
        lo_wb_if_set->save( ).

        cl_fp_wb_helper=>interface_activate( i_name = CONV e071-obj_name( iv_interface ) ).

        ev_rc = 0.
        ev_message = |INTERFACE { iv_interface }: parametreler yazildi ve aktive edildi.|.
      CATCH cx_root INTO DATA(lx_par).
        ev_rc = 8.
        ev_message = |SET_PARAMS basarisiz: { lx_par->get_text( ) }|.
    ENDTRY.
    RETURN.
  ENDIF.

*----------------------------------------------------------------------
* GET_PARAMS - doğrulama: mevcut IMPORT parametrelerini okur, tek satirlik
* metin olarak dondurur (name/typename cifti).
*----------------------------------------------------------------------
  IF iv_mode = 'GET_PARAMS'.
    IF iv_interface IS INITIAL.
      ev_rc = 8.
      ev_message = 'IV_INTERFACE bos.'.
      RETURN.
    ENDIF.
    TRY.
        DATA: lo_wb_if_get  TYPE REF TO if_fp_wb_interface,
              lo_object_get TYPE REF TO if_fp_object,
              lo_if_get     TYPE REF TO if_fp_interface,
              lo_data_get   TYPE REF TO if_fp_interface_data,
              lo_params_get TYPE REF TO if_fp_parameters,
              lt_import_get TYPE tfpiopar,
              lv_list       TYPE string.

        lo_wb_if_get = cl_fp_wb_interface=>load( i_name = iv_interface ).
        lo_object_get = lo_wb_if_get->get_object( ).
        lo_if_get ?= lo_object_get.
        lo_data_get = lo_if_get->get_interface_data( ).
        lo_params_get = lo_data_get->get_parameters( ).
        lt_import_get = lo_params_get->get_import_parameters( ).

        LOOP AT lt_import_get INTO DATA(ls_import_get).
          lv_list = |{ lv_list }[{ ls_import_get-name }:{ ls_import_get-typename }] |.
        ENDLOOP.

        ev_rc = 0.
        ev_message = |INTERFACE { iv_interface } import parametreleri: { lv_list }|.
      CATCH cx_root INTO DATA(lx_getp).
        ev_rc = 8.
        ev_message = |GET_PARAMS basarisiz: { lx_getp->get_text( ) }|.
    ENDTRY.
    RETURN.
  ENDIF.

*----------------------------------------------------------------------
* SYNC_CONTEXT - "Arayuzden Al" (Get from Interface) SFP GUI komutunun
* API karşılığı. IF_FP_CONTEXT sadece PUBLIC create_structure/create_loop/
* create_data sunar; RTTI (CL_ABAP_TYPEDESCR) ile PARAM1/PARAM2 tipini
* okuyup struct/table ayrimini biz yapiyoruz, cocuk DATA node'lari elle
* ekliyoruz. Boylece Bagalam (Context) sekmesi SFP'de dolu görünür.
*----------------------------------------------------------------------
*----------------------------------------------------------------------
* GET_CONTEXT - context ağacını GERI OKUR ve aynı adli düğümleri bildirir.
* SFP "Düğüm adi X benzersiz değil" dedigi anda tek doğrulama yolu budur:
* ADT bu nesneyi gosteremez, FPCONTEXT tablosundaki alan da serilestirilmis
* halde durur. Yazan tarafa değil, okuyan tarafa sorulur.
*----------------------------------------------------------------------
  IF iv_mode = 'GET_CONTEXT'.
    IF iv_form IS INITIAL.
      ev_rc = 8.
      ev_message = 'IV_FORM bos.'.
      RETURN.
    ENDIF.
    TRY.
        DATA: lo_wb_f_gc TYPE REF TO if_fp_wb_form,
              lo_obj_gc  TYPE REF TO if_fp_form,
              lo_ctx_gc  TYPE REF TO if_fp_context,
              lo_n1      TYPE REF TO if_fp_node,
              lo_n2      TYPE REF TO if_fp_node,
              lv_names   TYPE string,
              lv_top     TYPE i,
              lv_leaf    TYPE i.

        lo_wb_f_gc = cl_fp_wb_form=>load( i_name = iv_form i_dark = abap_true ).
        lo_obj_gc ?= lo_wb_f_gc->get_object( ).
        lo_ctx_gc  = lo_obj_gc->get_context( ).

        lo_n1 = lo_ctx_gc->if_fp_node~get_child( ).
        WHILE lo_n1 IS BOUND.
          lv_top = lv_top + 1.
          lv_names = |{ lv_names }[{ lo_n1->get_name( ) }|.
          lo_n2 = lo_n1->get_child( ).
          WHILE lo_n2 IS BOUND.
            lv_leaf = lv_leaf + 1.
            lv_names = |{ lv_names }:{ lo_n2->get_name( ) }|.
            lo_n2 = lo_n2->get_successor( ).
          ENDWHILE.
          lv_names = |{ lv_names }]|.
          lo_n1 = lo_n1->get_successor( ).
        ENDWHILE.

        ev_rc = 0.
        ev_message = |FORM { iv_form } baglam: { lv_top } ust dugum, | &&
                     |{ lv_leaf } alt dugum. { lv_names }|.
      CATCH cx_root INTO DATA(lx_gc).
        ev_rc = 8.
        ev_message = |GET_CONTEXT basarisiz: { lx_gc->get_text( ) }|.
    ENDTRY.
    RETURN.
  ENDIF.

  IF iv_mode = 'SYNC_CONTEXT'.
    IF iv_form IS INITIAL.
      ev_rc = 8.
      ev_message = 'IV_FORM bos.'.
      RETURN.
    ENDIF.
    DATA lv_checkpoint TYPE string VALUE 'START'.
    TRY.
        DATA: lo_wb_form_sync TYPE REF TO if_fp_wb_form,
              lo_object_sync  TYPE REF TO if_fp_object,
              lo_form_sync    TYPE REF TO if_fp_form,
              lo_ctx_sync     TYPE REF TO if_fp_context,
              lv_sync_msg     TYPE string,
              lo_typedescr    TYPE REF TO cl_abap_typedescr,
              lo_structdescr  TYPE REF TO cl_abap_structdescr,
              lo_tabledescr   TYPE REF TO cl_abap_tabledescr,
              lo_line_descr   TYPE REF TO cl_abap_structdescr,
              lt_components   TYPE abap_component_tab,
              ls_component    TYPE abap_componentdescr,
              lo_data_node    TYPE REF TO if_fp_data,
              lo_struct_node  TYPE REF TO if_fp_structure,
              lo_loop_node    TYPE REF TO if_fp_loop,
              lv_child_count  TYPE i,
              lo_child        TYPE REF TO if_fp_node,
              lv_existing     TYPE i.

        lv_checkpoint = 'LOAD_FORM'.
        lo_wb_form_sync = cl_fp_wb_form=>load( i_name = iv_form
                                                i_mode = if_fp_wb_object=>c_mode_write
                                                i_ordernum = iv_transport
                                                i_dark = abap_true ).
        lv_checkpoint = 'GET_OBJECT'.
        lo_object_sync = lo_wb_form_sync->get_object( ).
        lo_form_sync ?= lo_object_sync.
        lv_checkpoint = 'GET_CONTEXT'.
        lo_ctx_sync = lo_form_sync->get_context( ).

*       DOLU BIR CONTEXT'I API ILE DUZELTMEK MUMKUN DEĞIL - sessizce
*       basarisiz olmaktansa acikca reddediyoruz. Mekanizma (06.08.2026, DS4'te
*       kaynak okunarak ve tabloda adım adım izlenerek bulundu):
*         CL_FP_WB_FORM=>SAVE_OBJECT:
*           IF m_delayed_loading IS INITIAL OR m_context_raw IS INITIAL.
*             ...nesneden yeniden serilestir...
*           ELSE.
*             l_context->context = l_object->m_context_raw.  "ham blob aynen geri
*         CL_FP_WB_HELPER=>FORM_ACTIVATE ise formu TAZE yukler ve
*         i_delayed_loading='X' geceer -> context'i dolu bir formda ELSE dali
*         çalışır ve diskten okunan eski blob geri yazılır.
*       Olculen sonuç: save() inaktif satiri DOGRU icerikle yazıyor (state=I
*       gorundu), aktivasyon o satiri yutuyor ve aktif satır değişmeden kalıyor.
*       Aynı instance üzerinden activate() denendi: "Islem istemci tarafından
*       iptal edildi" - o yol pencere sistemi istiyor. Iki uçlu kıskaç.
*       Context BOSKEN çalışır, çünkü o zaman m_context_raw INITIAL olur ve
*       ilk dal devreye girer. Bu yüzden kural: bu mod yalnızca boş contextte.
        lv_checkpoint = 'CHECK_EMPTY'.
        lo_child = lo_ctx_sync->if_fp_node~get_child( ).
        WHILE lo_child IS BOUND.
          lv_existing = lv_existing + 1.
          lo_child = lo_child->get_successor( ).
        ENDWHILE.
        IF lv_existing > 0.
          ev_rc = 4.
          ev_message = |FORM { iv_form }: baglam ZATEN DOLU ({ lv_existing } ust | &&
                       |dugum) - API ile yeniden yazilamaz, denenirse sessizce | &&
                       |hicbir sey degismez. SFP'de Baglam sekmesinden dugumleri | &&
                       |silip "Arayuzden Al" ile kurun. Once GET_CONTEXT ile | &&
                       |mevcut agaci gorebilirsiniz.|.
          RETURN.
        ENDIF.

        IF iv_param1_name IS NOT INITIAL AND iv_param1_type IS NOT INITIAL.
          CLEAR lv_child_count.
          lv_checkpoint = 'P1_DESCRIBE'.
          lo_typedescr = cl_abap_typedescr=>describe_by_name( iv_param1_type ).
          CASE lo_typedescr->kind.
            WHEN cl_abap_typedescr=>kind_struct.
              lo_structdescr ?= lo_typedescr.
              lv_checkpoint = 'P1_CREATE_STRUCTURE'.
              lo_struct_node = lo_ctx_sync->create_structure( i_name = CONV fpnodename( iv_param1_name )
                                                               i_field = CONV fpfield( iv_param1_name )
                                                               i_parent = lo_ctx_sync ).
              lt_components = lo_structdescr->get_components( ).
              LOOP AT lt_components INTO ls_component.
                lv_checkpoint = |P1_CREATE_DATA_{ ls_component-name }|.
                lo_data_node = lo_ctx_sync->create_data( i_name = CONV fpnodename( ls_component-name ) i_parent = lo_struct_node ).
                lv_checkpoint = |P1_SET_FIELD_{ ls_component-name }|.
                lo_data_node->set_field( |{ iv_param1_name }-{ ls_component-name }| ).
                lv_child_count = lv_child_count + 1.
              ENDLOOP.
            WHEN cl_abap_typedescr=>kind_table.
              lo_tabledescr ?= lo_typedescr.
              lv_checkpoint = 'P1_GET_LINE_TYPE'.
              lo_line_descr ?= lo_tabledescr->get_table_line_type( ).
              lv_checkpoint = 'P1_CREATE_LOOP'.
              lo_loop_node = lo_ctx_sync->create_loop( i_name = CONV fpnodename( iv_param1_name )
                                                        i_table_name = CONV fpfield( iv_param1_name )
                                                        i_parent = lo_ctx_sync ).
              DATA(lo_loop_data1) = lo_loop_node->get_loop_data( ).
              lt_components = lo_line_descr->get_components( ).
              LOOP AT lt_components INTO ls_component.
                lv_checkpoint = |P1_LOOP_CREATE_DATA_{ ls_component-name }|.
                lo_data_node = lo_ctx_sync->create_data( i_name = CONV fpnodename( ls_component-name ) i_parent = lo_loop_data1 ).
                lv_checkpoint = |P1_LOOP_SET_FIELD_{ ls_component-name }|.
                lo_data_node->set_field( |{ iv_param1_name }-{ ls_component-name }| ).
                lv_child_count = lv_child_count + 1.
              ENDLOOP.
            WHEN OTHERS.
              lo_data_node = lo_ctx_sync->create_data( i_name = CONV fpnodename( iv_param1_name ) i_parent = lo_ctx_sync ).
              lo_data_node->set_field( CONV fpfield( iv_param1_name ) ).
              lv_child_count = 1.
          ENDCASE.
          lv_sync_msg = |{ lv_sync_msg } { iv_param1_name }: { lv_child_count } alan eklendi.|.
        ENDIF.

        IF iv_param2_name IS NOT INITIAL AND iv_param2_type IS NOT INITIAL.
          CLEAR lv_child_count.
          lv_checkpoint = 'P2_DESCRIBE'.
          lo_typedescr = cl_abap_typedescr=>describe_by_name( iv_param2_type ).
          CASE lo_typedescr->kind.
            WHEN cl_abap_typedescr=>kind_struct.
              lo_structdescr ?= lo_typedescr.
              lv_checkpoint = 'P2_CREATE_STRUCTURE'.
              lo_struct_node = lo_ctx_sync->create_structure( i_name = CONV fpnodename( iv_param2_name )
                                                               i_field = CONV fpfield( iv_param2_name )
                                                               i_parent = lo_ctx_sync ).
              lt_components = lo_structdescr->get_components( ).
              LOOP AT lt_components INTO ls_component.
                lv_checkpoint = |P2_CREATE_DATA_{ ls_component-name }|.
                lo_data_node = lo_ctx_sync->create_data( i_name = CONV fpnodename( ls_component-name ) i_parent = lo_struct_node ).
                lv_checkpoint = |P2_SET_FIELD_{ ls_component-name }|.
                lo_data_node->set_field( |{ iv_param2_name }-{ ls_component-name }| ).
                lv_child_count = lv_child_count + 1.
              ENDLOOP.
            WHEN cl_abap_typedescr=>kind_table.
              lo_tabledescr ?= lo_typedescr.
              lv_checkpoint = 'P2_GET_LINE_TYPE'.
              lo_line_descr ?= lo_tabledescr->get_table_line_type( ).
              lv_checkpoint = 'P2_CREATE_LOOP'.
              lo_loop_node = lo_ctx_sync->create_loop( i_name = CONV fpnodename( iv_param2_name )
                                                        i_table_name = CONV fpfield( iv_param2_name )
                                                        i_parent = lo_ctx_sync ).
              DATA(lo_loop_data2) = lo_loop_node->get_loop_data( ).
              lt_components = lo_line_descr->get_components( ).
              LOOP AT lt_components INTO ls_component.
                lv_checkpoint = |P2_LOOP_CREATE_DATA_{ ls_component-name }|.
                lo_data_node = lo_ctx_sync->create_data( i_name = CONV fpnodename( ls_component-name ) i_parent = lo_loop_data2 ).
                lv_checkpoint = |P2_LOOP_SET_FIELD_{ ls_component-name }|.
                lo_data_node->set_field( |{ iv_param2_name }-{ ls_component-name }| ).
                lv_child_count = lv_child_count + 1.
              ENDLOOP.
            WHEN OTHERS.
              lo_data_node = lo_ctx_sync->create_data( i_name = CONV fpnodename( iv_param2_name ) i_parent = lo_ctx_sync ).
              lo_data_node->set_field( CONV fpfield( iv_param2_name ) ).
              lv_child_count = 1.
          ENDCASE.
          lv_sync_msg = |{ lv_sync_msg } { iv_param2_name }: { lv_child_count } alan eklendi.|.
        ENDIF.

        lv_checkpoint = 'SAVE'.
        lo_wb_form_sync->save( ).

*       COMMIT SART. SAVE guncelleme gorevine yazıyor; RFC ile cagrildigimizda
*       LUW fonksiyon donunce kapanir ve commit edilmemis is ATILIR. Belirtisi
*       tam bir sahte-başarı: EV_RC=0, "12 alan eklendi", basliktaki zaman
*       damgasi bile guncellenir - ama agac diskte eski haliyle kalır.
*       (06.08.2026, DS4: aynı çağrı icinde kaydettikten SONRA taze yukleyip
*        saydiginda 15 yerine 25 düğüm gorunuyordu.)
        lv_checkpoint = 'COMMIT'.
        COMMIT WORK AND WAIT.

*       AKTIVASYONU AYNI NESNE ÜZERINDEN YAP. CL_FP_WB_HELPER=>FORM_ACTIVATE
*       formu TAZE yukler (i_delayed_loading='X') ve CL_FP_WB_FORM=>SAVE_OBJECT
*       icindeki su dal devreye girer:
*         IF m_delayed_loading IS INITIAL OR m_context_raw IS INITIAL. ... ELSE.
*           l_context->context = l_object->m_context_raw.   "ham blob aynen geri
*       Yani bizim kaydettigimiz context, aktivasyon sirasinda diskten okunan
*       ESKI ham blob ile ezilir. Aynı instance'in kendi activate'i ise bellekteki
*       (degistirilmis) agaci tasir. (06.08.2026, DS4'te ölçüldü.)
        lv_checkpoint = 'ACTIVATE'.
        cl_fp_wb_helper=>form_activate( i_name = CONV e071-obj_name( iv_form ) ).
*       AKTIVASYONU GENERATE IZLEMELI. Cagrilabilir fonksiyon modulu (/1BCDWB/SM*)
*       bununla uretilir; olmadan form AKTIF gorunur, context dogrudur, STATUS
*       temiz doner - ama cagiran programin cozecegi bir FM yoktur.
*       (07.08.2026, DS4: sablonsuz form aktive oldu, FUPARAREF'te karsiligi
*        cikmadi.) Ayri sarilir: burada patlarsa nesne yine de aktif kalir.
        TRY.
            cl_fp_wb_form=>generate( i_name = iv_form ).
          CATCH cx_root INTO DATA(lx_gsc).
            lv_gen_note = | (generate atlandi: { lx_gsc->get_text( ) })|.
        ENDTRY.

        ev_rc = 0.
        ev_message = |FORM { iv_form }: baglam kuruldu.{ lv_sync_msg } | &&
                     |{ lv_gen_note } GET_CONTEXT ile dogrulayin.|.
      CATCH cx_root INTO DATA(lx_sync).
        ev_rc = 8.
        ev_message = |SYNC_CONTEXT basarisiz [checkpoint={ lv_checkpoint }]: { lx_sync->get_text( ) }|.
    ENDTRY.
    RETURN.
  ENDIF.

*----------------------------------------------------------------------
* RTTI_DEBUG - IV_PARAM1_TYPE'in gerçek RTTI kind'ini ve (tablo ise)
* satır tipinin kind/adini raporlar - DDIC ADT metadata ile RTTI runtime
* arasindaki farkı teşhis etmek için.
*----------------------------------------------------------------------
  IF iv_mode = 'RTTI_DEBUG'.
    TRY.
        DATA lo_td_dbg TYPE REF TO cl_abap_typedescr.
        DATA lo_tab_dbg TYPE REF TO cl_abap_tabledescr.
        DATA lo_line_dbg TYPE REF TO cl_abap_datadescr.
        lo_td_dbg = cl_abap_typedescr=>describe_by_name( iv_param1_type ).
        ev_message = |{ iv_param1_type }: kind={ lo_td_dbg->kind } absolute_name={ lo_td_dbg->absolute_name }|.
        IF lo_td_dbg->kind = cl_abap_typedescr=>kind_table.
          lo_tab_dbg ?= lo_td_dbg.
          lo_line_dbg = lo_tab_dbg->get_table_line_type( ).
          ev_message = |{ ev_message } | &&
                       |lineKind={ lo_line_dbg->kind } lineName={ lo_line_dbg->absolute_name }|.
        ENDIF.
        ev_rc = 0.
      CATCH cx_root INTO DATA(lx_dbg).
        ev_rc = 8.
        ev_message = |RTTI_DEBUG basarisiz: { lx_dbg->get_text( ) }|.
    ENDTRY.
    RETURN.
  ENDIF.

*----------------------------------------------------------------------
* STATUS - interface + form için GET_STATE (A=active/I=inactive) ve
* formun GET_INTERFACE ile gordugu parametre sayisini raporlar - context
* bosluk sebebini teşhis etmek için.
*----------------------------------------------------------------------
  IF iv_mode = 'STATUS'.
    DATA: lv_if_state   TYPE fpstate,
          lv_form_state TYPE fpstate,
          lv_ctx_count  TYPE i,
          lv_status_msg TYPE string.

    IF iv_interface IS NOT INITIAL.
      TRY.
          DATA(lo_wb_if_st) = cl_fp_wb_interface=>load( i_name = iv_interface ).
          lv_if_state = lo_wb_if_st->get_state( ).
          lv_status_msg = |INTERFACE { iv_interface } state={ lv_if_state } (A=aktif/I=inaktif). |.
        CATCH cx_root INTO DATA(lx_st1).
          lv_status_msg = |INTERFACE { iv_interface } state okunamadi: { lx_st1->get_text( ) }. |.
      ENDTRY.
    ENDIF.

    IF iv_form IS NOT INITIAL.
      TRY.
          DATA(lo_wb_form_st) = cl_fp_wb_form=>load( i_name = iv_form i_dark = abap_true ).
          lv_form_state = lo_wb_form_st->get_state( ).
          DATA(lo_object_st) = lo_wb_form_st->get_object( ).
          DATA lo_form_st TYPE REF TO if_fp_form.
          lo_form_st ?= lo_object_st.
          TRY.
              DATA(lo_lay_st) = lo_form_st->get_layout( ).
          DATA(lv_lay_type) = lo_lay_st->get_layout_type( ).
          IF lv_lay_type IS INITIAL.
*           Boş tip = "Unknown"; form aktif görünür ama SFP'de KAYDET
*           FPUIFB101 ile reddeder. Sessiz bir bozukluk, burada yakalanir.
            lv_status_msg = |{ lv_status_msg }UYARI: layout tipi BOS | &&
                            |(=Unknown) -> SFP'de kaydetme FPUIFB101 verir; | &&
                            |SET_LAYOUT_TYPE ile duzelt. |.
          ELSE.
            lv_status_msg = |{ lv_status_msg }layout tipi='{ lv_lay_type }'. |.
          ENDIF.
          DATA(lo_ctx_if) = lo_form_st->get_interface( ).
              IF lo_ctx_if IS BOUND.
                DATA(lo_ctx_data) = lo_ctx_if->get_interface_data( ).
                DATA(lo_ctx_params) = lo_ctx_data->get_parameters( ).
                DATA(lt_imp_st) = lo_ctx_params->get_import_parameters( ).
                lv_ctx_count = lines( lt_imp_st ).

*               CONTEXT ile INTERFACE PARAMETRELERINI KARSILASTIR.
*               Cagrilabilir fonksiyon modulu formun CONTEXT'inden uretilir,
*               interface'in parametrelerinden DEGIL. Ikisi ayrisabilir - en kolay
*               ayrisma yolu --template ile kopyalamaktir: yeni form sablonun
*               context'ini miras alir, kendi interface'ine baglanir, her sey
*               aktif ve saglikli gorunur. Sonra uretilen FM eski yapiyi bekler
*               ve cagiran program CALL_FUNCTION_CONFLICT_TYPE ile duser.
*               (07.08.2026'da yasandi; teshis iki gun surdu cunku hicbir yerde
*                gorunmuyordu.) Ust seviye dugum adlari parametre adlariyla
*               birebir olmali - burada bakiyoruz.
                DATA: lv_ctx_names TYPE string,
                      lv_par_names TYPE string,
                      lo_cchild    TYPE REF TO if_fp_node.
                LOOP AT lt_imp_st INTO DATA(ls_imp_st).
                  lv_par_names = |{ lv_par_names }[{ ls_imp_st-name }]|.
                ENDLOOP.
                lo_cchild = lo_form_st->get_context( )->if_fp_node~get_child( ).
                WHILE lo_cchild IS BOUND.
                  lv_ctx_names = |{ lv_ctx_names }[{ lo_cchild->get_name( ) }]|.
                  lo_cchild = lo_cchild->get_successor( ).
                ENDWHILE.
                IF lv_ctx_names <> lv_par_names.
                  lv_status_msg = |{ lv_status_msg }UYARI: context ile interface | &&
                                  |UYUSMUYOR - context { lv_ctx_names }, interface | &&
                                  |{ lv_par_names }. Cagrilabilir FM context'ten | &&
                                  |uretilir, yani cagiran program | &&
                                  |CALL_FUNCTION_CONFLICT_TYPE ile duser. Sablondan | &&
                                  |kopyalanan formlarda tipik. Duzeltme SFP'de: | &&
                                  |Baglam sekmesi -> dugumleri sil -> "Arayuzden Al". |.
                ELSE.
                  lv_status_msg = |{ lv_status_msg }context/interface uyumlu | &&
                                  |{ lv_par_names }. |.
                ENDIF.
              ENDIF.
            CATCH cx_root INTO DATA(lx_ctx).
              lv_status_msg = |{ lv_status_msg }FORM->GET_INTERFACE basarisiz: { lx_ctx->get_text( ) }. |.
          ENDTRY.
          lv_status_msg = |{ lv_status_msg }FORM { iv_form } state={ lv_form_state } | &&
                          |(A=aktif/I=inaktif), interface'ten gorunen import param sayisi={ lv_ctx_count }.|.
        CATCH cx_root INTO DATA(lx_st2).
          lv_status_msg = |{ lv_status_msg }FORM { iv_form } state okunamadi: { lx_st2->get_text( ) }.|.
      ENDTRY.
    ENDIF.

    ev_rc = 0.
    ev_message = lv_status_msg.
    RETURN.
  ENDIF.

  IF iv_interface IS INITIAL.
    ev_rc = 8.
    ev_message = 'IV_INTERFACE bos - Adobe Interface adi zorunlu.'.
    RETURN.
  ENDIF.

*----------------------------------------------------------------------
* READ - yalnızca durum bildirir, hiçbir sey degistirmez
*----------------------------------------------------------------------
*   DIKKAT: ..._EXISTS metotları HER IKI durumda da exception atar, yalnızca metin
*   degisir ("Nesne X onceden mevcut" / "X nesnesi mevcut değil") - 06.08.2026'da
*   ölçüldü. Bu yüzden "var/yok" diye ETIKET KOYMUYORUZ; SAP'in kendi metnini
*   oldugu gibi veriyoruz. Uydurma bir etiket burada doğrudan yanlis bilgi olurdu.
    IF iv_mode = 'READ'.
      TRY.
          cl_fp_wb_helper=>interface_exists( i_name = iv_interface ).
          ev_message = |INTERFACE { iv_interface }: (mesajsiz dondu)|.
        CATCH cx_root INTO DATA(lx_r1).
          ev_message = |INTERFACE { iv_interface }: { lx_r1->get_text( ) }|.
      ENDTRY.
      IF iv_form IS NOT INITIAL.
        TRY.
            cl_fp_wb_helper=>form_exists( i_name = iv_form ).
            ev_message = |{ ev_message } | && |FORM { iv_form }: (mesajsiz dondu)|.
          CATCH cx_root INTO DATA(lx_r2).
            ev_message = |{ ev_message } | && |FORM { iv_form }: { lx_r2->get_text( ) }|.
        ENDTRY.
      ENDIF.
    ev_rc = 0.
    RETURN.
  ENDIF.

*----------------------------------------------------------------------
* DELETE - önce form, sonra interface (bağımlılık sirasi)
*----------------------------------------------------------------------
  IF iv_mode = 'DELETE'.
    TRY.
        IF iv_form IS NOT INITIAL.
          cl_fp_wb_form=>delete( i_name = iv_form i_ordernum = iv_transport
                                 i_dark = abap_true ).
          lv_done = |FORM { iv_form } silindi. |.
        ENDIF.
        cl_fp_wb_interface=>delete( i_name = iv_interface i_ordernum = iv_transport ).
        ev_message = |{ lv_done }INTERFACE { iv_interface } silindi.|.
        ev_rc = 0.
      CATCH cx_root INTO DATA(lx_del).
        ev_rc = 8.
        ev_message = |DELETE basarisiz: { lx_del->get_text( ) }|.
    ENDTRY.
    RETURN.
  ENDIF.

  IF iv_mode <> 'WRITE'.
    ev_rc = 8.
    ev_message = |Bilinmeyen IV_MODE '{ iv_mode }' - WRITE/READ/DELETE/GET_LAYOUT/SET_LAYOUT/SET_PARAMS/GET_PARAMS/STATUS/SYNC_CONTEXT bekleniyor.|.
    RETURN.
  ENDIF.

*----------------------------------------------------------------------
* WRITE - 1) Adobe Interface
* "zaten var" durumunu exists-kontroluyle değil, CREATE'in kendi hatasiyla
* ayırt ediyoruz: check_existance'in hangi yönde raise ettigi belgeli değil,
* varsayım uzerine kurulan bir dal sessizce ters çalışırdı.
*----------------------------------------------------------------------
  TRY.
      lo_if = cl_fp_interface=>create( i_language = iv_language ).
      IF iv_if_text IS NOT INITIAL.
        lo_if->if_fp_object~set_description( i_description = iv_if_text ).
      ENDIF.

      lo_wb_if = cl_fp_wb_interface=>create( i_name      = iv_interface
                                             i_interface = lo_if
                                             i_devclass  = iv_devclass
                                             i_ordernum  = iv_transport ).
      lo_wb_if->save( ).
*     CL_FP_WB_INTERFACE=>ACTIVATE (public) workbench UI yolundan gider ve
*     dynpro göndermeye çalışır (SAPLSEWORKINGAREA 0205) - SOAP-RFC'de
*     pencere sistemi olmadigi için patlar. Çözüm: CL_FP_WB_HELPER
*     (SFPI/SFPF'in global friend'i) INT_ACTIVATE'i doğrudan çağırır -
*     dialog/pencere sistemi gerektirmeden object state'i A yapar.
      cl_fp_wb_helper=>interface_activate( i_name = CONV e071-obj_name( iv_interface ) ).
      lv_done = |INTERFACE { iv_interface } olusturuldu ve aktive edildi. |.

    CATCH cx_fp_api_repository INTO DATA(lx_ifrep).
*     Bu dal en cok "ad zaten kullanimda" için çalışır. Mevcut nesneyi EZMEYIZ -
*     bilerek atlayip devam ederiz, çünkü form yine de yaratilabilir.
      lv_skipped = |INTERFACE { iv_interface } atlandi ({ lx_ifrep->get_text( ) }). |.
    CATCH cx_root INTO DATA(lx_if).
      ev_rc = 8.
      ev_message = |INTERFACE { iv_interface } olusturulamadi: { lx_if->get_text( ) }|.
      RETURN.
  ENDTRY.

*----------------------------------------------------------------------
* WRITE - 2) Adobe Form (istege bagli)
*----------------------------------------------------------------------
  IF iv_form IS INITIAL.
    ev_rc = COND #( WHEN lv_skipped IS INITIAL THEN 0 ELSE 4 ).
    ev_message = |{ lv_done }{ lv_skipped }|.
    RETURN.
  ENDIF.

  DATA lv_fcp TYPE string VALUE 'START'.
  TRY.
      IF iv_template IS NOT INITIAL.
        lv_fcp = 'COPY'.
*       Şablondan kopyala - layout da beraberinde gelir. Boş formdan baslamanin
*       tek alternatifi LiveCycle'da sifirdan cizmektir.
        cl_fp_wb_form=>copy( i_source   = iv_template
                             i_name     = iv_form
                             i_devclass = iv_devclass
                             i_ordernum = iv_transport
                             i_dark     = abap_true ).
        lv_done = |{ lv_done }FORM { iv_form }, { iv_template } sablonundan kopyalandi. |.
      ELSE.
        lv_fcp = 'FORM_CREATE'.
        lo_form = cl_fp_form=>create( i_language = iv_language ).
        IF iv_form_text IS NOT INITIAL.
          lo_form->if_fp_object~set_description( i_description = iv_form_text ).
        ENDIF.
        lo_form->set_interface_name( i_interface_name = iv_interface ).

        lv_fcp = 'WB_CREATE'.
        lo_wb_form = cl_fp_wb_form=>create( i_name     = iv_form
                                            i_form     = lo_form
                                            i_devclass = iv_devclass
                                            i_ordernum = iv_transport
                                            i_dark     = abap_true ).
        lv_fcp = 'SAVE'.
        lo_wb_form->save( ).
        lv_done = |{ lv_done }FORM { iv_form } olusturuldu (layout BOS - LiveCycle'da cizilecek). |.
      ENDIF.

*     CL_FP_WB_FORM=>ACTIVATE (public), I_DARK verilse bile "Islem istemci
*     tarafından iptal edildi" ile duser (06.08.2026, DS4'te ölçüldü):
*     m_dark yalnızca taban sinifin activate'inde okunuyor, formun kendi
*     INT_ACTIVATE redefinition'i onu gormuyor. Çözüm interface'teki ile
*     aynı: CL_FP_WB_HELPER=>FORM_ACTIVATE doğrudan INT_ACTIVATE çağırır.
*     LAYOUTSUZ BIR FORM AKTIVE EDILEMEZ. Denenirse SAVE_OBJECT'teki
*     CALL TRANSFORMATION duser ve "Nesne verilerini donusturme sirasinda hata"
*     gelir - hata metni sebebi hic ele vermez. (07.08.2026, DS4'te olculdu:
*     context kuruldu, layout tipi 'S' yapildi, yine de duser; XDP yuklenir
*     yuklenmez ayni form sorunsuz aktive oldu.)
*     Bu, sablonsuz form yaratmanin neden "hep patliyor" sanildiginin da cevabi:
*     --template ile kopyalanan form layout'u beraberinde getirdigi icin
*     calisiyordu, ve o kopya sablonun CONTEXT'ini de miras birakiyordu.
*     Bu yuzden burada aktive ETMIYORUZ: cagirici bos bir XDP yukleyecek
*     (SET_LAYOUT), o zaten tipi set edip aktive ediyor.
      IF iv_template IS NOT INITIAL.
        lv_fcp = 'ACTIVATE'.
        cl_fp_wb_helper=>form_activate( i_name = CONV e071-obj_name( iv_form ) ).
        lv_done = |{ lv_done }FORM aktive edildi. |.
      ELSE.
        lv_done = |{ lv_done }FORM aktive EDILMEDI - layoutsuz aktivasyon | &&
                  |mumkun degil; SET_LAYOUT ile bir XDP yuklendiginde aktive olur. |.
      ENDIF.

*     GENERATE'in I_DARK'i yok; UI istemesi ihtimaline karsi AYRI sarilir -
*     burada patlarsa nesneler yine de yerinde ve aktif kalır.
      TRY.
          lv_fcp = 'GENERATE'.
          IF iv_template IS NOT INITIAL.
            cl_fp_wb_form=>generate( i_name = iv_form ).
          ENDIF.
          lv_done = |{ lv_done }Generate edildi.|.
        CATCH cx_root INTO DATA(lx_gen).
          lv_done = |{ lv_done }Generate atlandi ({ lx_gen->get_text( ) }) - | &&
                    |form aktif, SFP'de ilk acilista uretilir.|.
      ENDTRY.

      ev_rc = COND #( WHEN lv_skipped IS INITIAL THEN 0 ELSE 4 ).
      ev_message = |{ lv_skipped }{ lv_done }|.

    CATCH cx_fp_api_repository INTO DATA(lx_frep).
      ev_rc = 4.
      ev_message = |{ lv_skipped }{ lv_done }FORM { iv_form } atlandi ({ lx_frep->get_text( ) }).|.
    CATCH cx_root INTO DATA(lx_form).
      ev_rc = 8.
      ev_message = |{ lv_skipped }{ lv_done }FORM { iv_form } olusturulamadi | &&
                   |[checkpoint={ lv_fcp }]: { lx_form->get_text( ) }|.
  ENDTRY.

ENDFUNCTION.
