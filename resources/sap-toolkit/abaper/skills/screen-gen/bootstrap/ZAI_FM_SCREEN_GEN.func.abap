FUNCTION zai_fm_screen_gen
  IMPORTING
    VALUE(iv_program) TYPE scrhprog
    VALUE(iv_dynpro) TYPE scrfdynnr DEFAULT '0100'
    VALUE(iv_transport) TYPE trkorr OPTIONAL
    VALUE(iv_title) TYPE rsmpe_titt-text DEFAULT 'Liste'
    VALUE(iv_screen_type) TYPE char10 DEFAULT 'DOCKING'
    VALUE(iv_cc_name) TYPE scrcname DEFAULT 'CC_ALV'
    VALUE(iv_mode) TYPE char10 DEFAULT 'WRITE'
    VALUE(iv_recreate) TYPE char1 DEFAULT ' '
  EXPORTING
    VALUE(ev_rc) TYPE i
    VALUE(ev_message) TYPE string.

* GENERIC ekran/GUI-status URETECI (herhangi bir klasik Z programi icin). Programa
* OZEL metin GOMULMEZ: ekran basligi/titlebar cagiran tarafindan IV_TITLE ile gecilir.
* RFC-enabled; /sap/bc/soap/rfc (dialog context, sap-language=TR) ile cagrilir.
* IV_SCREEN_TYPE: DOCKING (container yok) / CONTAINER (1 custom control CC_ALV).
* (Split AYRI tip degil: CONTAINER kullan + programda cl_gui_splitter_container.)
* 1) RPY_DYNPRO_INSERT -> hedef programda Dynpro (screen) + container(lar) + PBO/PAI.
* 2) RS_CUA_INTERNAL_FETCH/WRITE/GENERATE -> standart donör (SAPLKKBL/STANDARD)
*    GUI status'unu referansla kopyalayip STAT<dynnr> + TIT<dynnr> olarak hedef programa
*    yazar; F3/Shift+F3/F12 -> BACK/EXIT/CANCEL re-map (ADR 0005: standart sadece OKUNUR).
* HER SEY IV_DYNPRO'ya gore DINAMIK: screen no + flow modulleri (status_<n>/user_command_<n>)
* + status (STAT<n>) + title (TIT<n>). Farkli ekran icin FM kodu DEGISMEZ. IV_MODE:
* WRITE (uret) / READ (oku) / DELETE (sil).
* classrun bu iki adimi YAPAMAZ (dialog sart -> "Session Timed Out"). Recete:
* screen-gen skill: references/SCREEN_GEN_RECIPE.md. ALV ornekleri: bootstrap/ZAI_P_ALV_TEMP1/2/3.
  CONSTANTS:
    c_src_prog   TYPE trdir-name      VALUE 'SAPLKKBL',
    c_src_status TYPE rsmpe_sta-code  VALUE 'STANDARD'.
* Status + titlebar adlari da screen number'a gore DINAMIK: STAT<dynnr> / TIT<dynnr>
* (ekran 0200 -> STAT0200/TIT0200). Sabit degil -> her ekran kendi status/title'i,
* FM kodu degismez. Programdaki SET PF-STATUS/TITLEBAR ayni adi kullanmali.
  DATA: l_status TYPE rsmpe_sta-code,
        l_tit    TYPE rsmpe_tit-code.

  DATA: ls_header TYPE rpy_dyhead,
        lt_cont   TYPE dycatt_tab,
        lt_f2c    TYPE dyfatc_tab,
        lt_flow   TYPE STANDARD TABLE OF rpy_dyflow,
        ls_flow   TYPE rpy_dyflow,
        l_screen_rc TYPE i,
        l_stat_rc   TYPE i,
        l_gen_rc    TYPE i,
        adm  TYPE rsmpe_adm,
        sta  TYPE STANDARD TABLE OF rsmpe_stat,
        fun  TYPE STANDARD TABLE OF rsmpe_funt,
        men  TYPE STANDARD TABLE OF rsmpe_men,
        mtx  TYPE STANDARD TABLE OF rsmpe_mnlt,
        act  TYPE STANDARD TABLE OF rsmpe_act,
        but  TYPE STANDARD TABLE OF rsmpe_but,
        pfk  TYPE STANDARD TABLE OF rsmpe_pfk,
        sett TYPE STANDARD TABLE OF rsmpe_staf,
        doc  TYPE STANDARD TABLE OF rsmpe_atrt,
        tit  TYPE STANDARD TABLE OF rsmpe_titt,
        biv  TYPE STANDARD TABLE OF rsmpe_buts,
        l_trkey TYPE trkey.

  CLEAR: ev_rc, ev_message.
  l_status = |STAT{ iv_dynpro }|.
  l_tit    = |TIT{ iv_dynpro }|.

*--- IV_MODE='READ': mevcut Dynpro'nun container/size verisini OKU (yazma yok) -------
* (Manuel SE51 duzeltmelerinden sonra gercek konum/boyutu ogrenmek icin.)
  IF iv_mode = 'READ'.
    CALL FUNCTION 'RPY_DYNPRO_READ'
      EXPORTING
        progname              = iv_program
        dynnr                 = iv_dynpro
        suppress_exist_checks = 'X'
        suppress_corr_checks  = 'X'
      IMPORTING
        header                = ls_header
      TABLES
        containers            = lt_cont
        fields_to_containers  = lt_f2c
        flow_logic            = lt_flow
      EXCEPTIONS
        cancelled             = 1
        not_found             = 2
        permission_error      = 3
        OTHERS                = 4.
    ev_rc = sy-subrc.
    IF sy-subrc = 0.
      ev_message = |HEADER lines={ ls_header-lines } cols={ ls_header-columns }; container={ lines( lt_cont ) }|.
      LOOP AT lt_cont INTO DATA(ls_cr).
        ev_message = ev_message && | [{ ls_cr-type } { ls_cr-name } L{ ls_cr-line } C{ ls_cr-column } H{ ls_cr-height } W{ ls_cr-length } el{ ls_cr-element_of }|.
        ev_message = ev_message && | rv{ ls_cr-c_resize_v } rh{ ls_cr-c_resize_h } lmin{ ls_cr-c_line_min } cmin{ ls_cr-c_coln_min }]|.
      ENDLOOP.
    ELSE.
      ev_message = |RPY_DYNPRO_READ subrc={ sy-subrc }|.
    ENDIF.
*   CUA titlebar'larini da oku (donör artigi temizligini dogrulamak icin)
    CALL FUNCTION 'RS_CUA_INTERNAL_FETCH'
      EXPORTING program = iv_program language = sy-langu state = 'A'
      TABLES sta = sta fun = fun men = men mtx = mtx act = act
             but = but pfk = pfk set = sett doc = doc tit = tit biv = biv
      EXCEPTIONS OTHERS = 0.
    ev_message = ev_message && | TITLES={ lines( tit ) }:|.
    LOOP AT tit INTO DATA(ls_tt).
      ev_message = ev_message && | { ls_tt-code }|.
    ENDLOOP.
    ev_message = ev_message && | FUN={ lines( fun ) } PFK={ lines( pfk ) } MEN={ lines( men ) } BUT={ lines( but ) }:|.
    LOOP AT fun INTO DATA(ls_ff).
      ev_message = ev_message && | { ls_ff-code }(t={ ls_ff-type })|.
    ENDLOOP.
    ev_message = ev_message && | FLOW:|.
    LOOP AT lt_flow INTO DATA(ls_fl).
      ev_message = ev_message && | / | && ls_fl-line.
    ENDLOOP.
    RETURN.
  ENDIF.

*--- IV_MODE='DELETE': mevcut Dynpro'yu sil (yazma yok) ---------------------
  IF iv_mode = 'DELETE'.
    CALL FUNCTION 'RS_SCRP_DELETE'
      EXPORTING
        dynnr           = iv_dynpro
        progname        = iv_program
        suppress_checks = 'X'
        with_popup      = space
      CHANGING
        corrnum         = iv_transport
      EXCEPTIONS
        OTHERS          = 0.
    ev_message = |Dynpro { iv_program }/{ iv_dynpro } silindi|.
    RETURN.
  ENDIF.

*--- 1) Dynpro (screen) -------------------------------------------------
  ls_header-program    = iv_program.
  ls_header-screen     = iv_dynpro.
  ls_header-language   = sy-langu.
  ls_header-descript   = iv_title.
  ls_header-type       = 'N'.
  ls_header-nextscreen = iv_dynpro.
  ls_header-lines      = 20.
  ls_header-columns    = 120.

* Modül adlari dynpro numarasina gore (status_<dynnr> / user_command_<dynnr>) ->
* programdaki MODULE tanimlariyla eslesir (0100, 0200, ...).
  ls_flow-line = 'PROCESS BEFORE OUTPUT.'.                  APPEND ls_flow TO lt_flow.
  ls_flow-line = |  MODULE status_{ iv_dynpro }.|.          APPEND ls_flow TO lt_flow.
  ls_flow-line = 'PROCESS AFTER INPUT.'.                    APPEND ls_flow TO lt_flow.
  ls_flow-line = |  MODULE user_command_{ iv_dynpro }.|.    APPEND ls_flow TO lt_flow.

* Custom control'lere ABAP'ta cl_gui_custom_container( container_name='...' ) baglanir.
* element_of BOS birakilir -> RPY otomatik SCREEN-root'a baglar (READ'de el=SCREEN gorunur).
* element_of='SCREEN' ACIKCA verilirse INSERT 'illegal_field_value' (rc=6) verir
* (SCREEN satiri tabloda olmadigi icin). Ekran tam boyuta (200x255) buyutulur ki
* container/ALV tum pencereyi kullansin (TEMP2 manuel duzeltmesinden ogrenildi).
* 2 ekran tipi: DOCKING (container yok) / CONTAINER (tek custom control CC_ALV, tam ekran).
* SPLIT AYRI BIR TIP DEGIL: split ekran tarafinda CONTAINER ile AYNIDIR (tek CC_ALV);
* bolme PROGRAMDA cl_gui_splitter_container ile yapilir (CC_ALV'i N hucreye bol, surukle-
* ayrac). Yani split icin FM'de ozel bir sey YOK -> CONTAINER kullan. (Bkz. ZAI_P_ALV_TEMP3.)
  CASE iv_screen_type.
    WHEN 'CONTAINER'.
      ls_header-lines   = 200.
      ls_header-columns = 255.
*     c_resize_v/h='X' + c_line_min/c_coln_min=1: custom control pencereyle RESIZE olur
*     (yoksa sabit boyutta kalir -> ALV alani pencereyi doldurmaz/"bittiği yerden devam eder").
*     (TEMP3 manuel duzeltmesinden ogrenildi; bundan sonra hep set.)
      APPEND VALUE #( type = 'CUST_CTRL' name = iv_cc_name cu_cc_name = iv_cc_name
                      line = 1 column = 1 height = 200 length = 255
                      c_resize_v = 'X' c_resize_h = 'X'
                      c_line_min = 1   c_coln_min = 1 ) TO lt_cont.
    WHEN OTHERS.
      " DOCKING -> container yok (program cl_gui_docking_container ekler)
  ENDCASE.

* IV_RECREATE='X': mevcut Dynpro'yu once SIL (flow logic/container degisikligini
* uygulamak icin — RPY_DYNPRO_INSERT mevcut ekrani overwrite ETMEZ, already_exists doner).
  IF iv_recreate = 'X'.
    CALL FUNCTION 'RS_SCRP_DELETE'
      EXPORTING
        dynnr           = iv_dynpro
        progname        = iv_program
        suppress_checks = 'X'
        with_popup      = space
      CHANGING
        corrnum         = iv_transport
      EXCEPTIONS
        OTHERS          = 0.
  ENDIF.

  CALL FUNCTION 'RPY_DYNPRO_INSERT'
    EXPORTING
      header                 = ls_header
      corrnum                = iv_transport
      suppress_corr_checks   = space
    TABLES
      containers             = lt_cont
      fields_to_containers   = lt_f2c
      flow_logic             = lt_flow
    EXCEPTIONS
      cancelled              = 1
      already_exists         = 2
      program_not_exists     = 3
      not_executed           = 4
      missing_required_field = 5
      illegal_field_value    = 6
      field_not_allowed      = 7
      not_generated          = 8
      illegal_field_position = 9
      OTHERS                 = 10.
  l_screen_rc = sy-subrc.

*--- 2) GUI status + titlebar (fetch-template) --------------------------
  CALL FUNCTION 'RS_CUA_INTERNAL_FETCH'
    EXPORTING
      program         = c_src_prog
      language        = sy-langu
      state           = 'A'
    IMPORTING
      adm             = adm
    TABLES
      sta             = sta
      fun             = fun
      men             = men
      mtx             = mtx
      act             = act
      but             = but
      pfk             = pfk
      set             = sett
      doc             = doc
      tit             = tit
      biv             = biv
    EXCEPTIONS
      not_found       = 1
      unknown_version = 2
      OTHERS          = 3.
  IF sy-subrc <> 0.
    l_stat_rc = 100 + sy-subrc.
  ELSE.
*   Bloat azalt: sadece donör status'unu tut (tanim havuzlari kalir).
    DELETE sta  WHERE code   <> c_src_status.
    DELETE sett WHERE status <> c_src_status.
    READ TABLE sta WITH KEY code = c_src_status INTO DATA(ls_src).
    DATA(l_pfkcode) = ls_src-pfkcode.

*   Standart navigasyon tuslarini programin bekledigi fcode'lara re-map et:
*   F3 (pfno 03) -> BACK, Shift+F3 (15) -> EXIT, F12 (12) -> CANCEL.
*   Donör jenerik &F03/&F15/&F12 kullaniyor; program PAI 'BACK/EXIT/CANCEL' bekliyor.
    LOOP AT pfk ASSIGNING FIELD-SYMBOL(<p>) WHERE code = l_pfkcode.
      CASE <p>-pfno.
        WHEN '03'. <p>-funcode = 'BACK'.
        WHEN '15'. <p>-funcode = 'EXIT'.
        WHEN '12'. <p>-funcode = 'CANCEL'.
      ENDCASE.
    ENDLOOP.

*   Status kodunu STANDARD -> STAT0100 (sta + mevcut set).
    LOOP AT sta ASSIGNING FIELD-SYMBOL(<s>) WHERE code = c_src_status.
      <s>-code = l_status.
    ENDLOOP.
    LOOP AT sett ASSIGNING FIELD-SYMBOL(<f>) WHERE status = c_src_status.
      <f>-status = l_status.
    ENDLOOP.

*   ⚠️ TOOLBAR PRUNE GERI ALINDI: donör act/fun/toolbar'i temizlemek BACK/EXIT/CANCEL'i
*   GECERSIZ kildi (runtime "00256 Gecerli bir islev secin"). Bir fonksiyonun gecerli
*   olmasi `act` (aktif fonksiyon listesi) gerektirir; set/pfk tek basina yetmiyor.
*   Donör STANDARD'in act/fun/toolbar'i BUTUNUYLE KORUNUR -> BACK/EXIT/CANCEL donörde
*   gecerli + re-map ile F3/Sh+F3/F12'ye bagli -> butonlar + ESC(=F12) calisir.
*   (Toolbar'da donör ALV fonksiyonlari kalir; tam-minimal status from-scratch CUA isi.)
*   BACK/EXIT/CANCEL fun + set'te yoksa garanti et (donörde varsa dokunma).
    IF NOT line_exists( fun[ code = 'BACK' ] ).   APPEND VALUE #( code = 'BACK'   fun_text = 'Geri'  ) TO fun. ENDIF.
    IF NOT line_exists( fun[ code = 'EXIT' ] ).   APPEND VALUE #( code = 'EXIT'   fun_text = 'Cikis' ) TO fun. ENDIF.
    IF NOT line_exists( fun[ code = 'CANCEL' ] ). APPEND VALUE #( code = 'CANCEL' fun_text = 'Iptal' ) TO fun. ENDIF.
    IF NOT line_exists( sett[ status = l_status function = 'BACK' ] ).   APPEND VALUE #( status = l_status function = 'BACK' )   TO sett. ENDIF.
    IF NOT line_exists( sett[ status = l_status function = 'EXIT' ] ).   APPEND VALUE #( status = l_status function = 'EXIT' )   TO sett. ENDIF.
    IF NOT line_exists( sett[ status = l_status function = 'CANCEL' ] ). APPEND VALUE #( status = l_status function = 'CANCEL' ) TO sett. ENDIF.
*   3'unu de NORMAL type'a zorla (donörde EXIT type='E' geliyor -> AT EXIT-COMMAND
*   moduluyuz YOK -> Exit takilir). Normal -> user_command_0100 yakalar. ESC=F12=CANCEL.
    LOOP AT fun ASSIGNING FIELD-SYMBOL(<fn2>)
         WHERE code = 'BACK' OR code = 'EXIT' OR code = 'CANCEL'.
      CLEAR <fn2>-type.
    ENDLOOP.

*   TOOLBAR/MENU TEMIZLIGI (DIKKATLI): sadece GORUNUR menu bar (men/mtx) +
*   application toolbar (but) kaldirilir. `act` (aktif fonksiyon listesi = GECERLILIK)
*   ve fun/pfk/set KORUNUR -> fonksiyonlar gecerli kalir (00256 YOK). Onceki patinaj
*   act'i de temizlemekti -> fonksiyonlar gecersiz -> 00256. ALV grid'in KENDI toolbar'i
*   ayri (CL_GUI_ALV_GRID), etkilenmez.
    REFRESH: men, mtx, but.
    CLEAR adm-mencode.
    LOOP AT sta ASSIGNING <s>.
      CLEAR <s>-butcode.    " application toolbar yok (act/pfkcode korunur)
    ENDLOOP.

*   Titlebar: donörün TUM titlebar'larini (003/800-808/850/DYN/FIL/LS/POP/TI1/TP1...)
*   ATARIZ; sadece kendi TIT0100'umuzu birakiriz (title'lar status'tan bagimsiz, güvenli).
    REFRESH tit.
    APPEND VALUE #( code = l_tit text = iv_title ) TO tit.

*   Devclass = hedef programin GERCEK paketi (TADIR'dan turetilir) -> FM herhangi
*   bir paketteki program icin calisir (sabit paket adi GOMULMEZ). Program henuz
*   TADIR'da yoksa bos kalir (RS_CUA_INTERNAL_WRITE programin paketini kendi turetir).
    SELECT SINGLE devclass FROM tadir INTO l_trkey-devclass
      WHERE pgmid = 'R3TR' AND object = 'PROG' AND obj_name = iv_program.
    l_trkey-obj_type = 'PROG'.
    l_trkey-obj_name = iv_program.
    l_trkey-sub_type = 'CUAD'.
    l_trkey-sub_name = iv_program.

    CALL FUNCTION 'RS_CUA_INTERNAL_WRITE'
      EXPORTING
        program      = iv_program
        language     = sy-langu
        tr_key       = l_trkey
        adm          = adm
        state        = 'A'
      TABLES
        sta          = sta
        fun          = fun
        men          = men
        mtx          = mtx
        act          = act
        but          = but
        pfk          = pfk
        set          = sett
        doc          = doc
        tit          = tit
        biv          = biv
      EXCEPTIONS
        not_found    = 1
        invalid_data = 2
        OTHERS       = 3.
    l_stat_rc = sy-subrc.

*   WRITE tanimi yazar ama runtime CUA load'unu URETMEZ (hata 00264:
*   "not generated"). GENERATE ile interface'i uret (dialog context).
    IF l_stat_rc = 0.
      CALL FUNCTION 'RS_CUA_GENERATE'
        EXPORTING
          objectname           = iv_program
          without_messages     = 'X'
          without_checks       = 'X'
        EXCEPTIONS
          not_excecuted        = 1
          object_not_found     = 2
          object_not_specified = 3
          permission_failure   = 4
          OTHERS               = 5.
      l_gen_rc = sy-subrc.
    ENDIF.
  ENDIF.

*--- Sonuc --------------------------------------------------------------
  ev_rc = l_screen_rc + l_stat_rc + l_gen_rc.
  ev_message = |screen({ iv_program }/{ iv_dynpro }) rc={ l_screen_rc }; | &&
               |status({ l_status }+{ l_tit }) rc={ l_stat_rc }; | &&
               |generate rc={ l_gen_rc }|.
ENDFUNCTION.
