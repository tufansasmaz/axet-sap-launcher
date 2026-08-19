# abapGit folder layout — reference

abapGit serialises each SAP object into one or more files under `src/`. Claude must produce files in this exact layout; the SAP-side bridge deserialises via abapGit.

## Standard layout

```
repo-root/
├── .abapgit.xml                       # abapGit's own config (generated, don't edit)
├── .abapgit-ai.yaml                    # bridge policy (editable)
├── .abapgit-status/                    # status files (written by bridge, don't edit)
│   ├── a235f18.json
│   └── ...
└── src/
    ├── zpkg_demo.devc.xml              # package (one per abapGit repo)
    ├── zcl_foo.clas.abap               # class: implementation
    ├── zcl_foo.clas.xml                # class: metadata
    ├── zcl_foo.clas.testclasses.abap   # class: test classes (optional)
    ├── zcl_foo.clas.locals_def.abap    # class: local class definitions (optional)
    ├── zcl_foo.clas.locals_imp.abap    # class: local class implementations (optional)
    ├── zif_bar.intf.abap               # interface source
    ├── zif_bar.intf.xml
    └── ...
```

## Object type ↔ file extensions

| ABAP type | abapGit 4-letter | Files |
|---|---|---|
| Class | CLAS | `.clas.abap`, `.clas.xml`, `.clas.testclasses.abap?`, `.clas.locals_def.abap?`, `.clas.locals_imp.abap?`, `.clas.macros.abap?` |
| Interface | INTF | `.intf.abap`, `.intf.xml` |
| Report / Executable | PROG | `.prog.abap`, `.prog.xml` |
| Include | PROG (subtype) | `.prog.abap`, `.prog.xml` |
| Function group | FUGR | `.fugr.xml` + `.fugr.<functionname>.abap` per FM + `.fugr.<include>.abap` per include |
| Domain | DOMA | `.doma.xml` (metadata only) |
| Data element | DTEL | `.dtel.xml` |
| Structure / Table | TABL | `.tabl.xml` |
| Table type | TTYP | `.ttyp.xml` |
| Search help | SHLP | `.shlp.xml` |
| Lock object | ENQU | `.enqu.xml` |
| View (ABAP) | VIEW | `.view.xml` |
| CDS view | DDLS | `.ddls.asddls` (source) + `.ddls.xml` |
| CDS access control | DCLS | `.dcls.asdcls` + `.dcls.xml` |
| CDS metadata ext. | DDLX | `.ddlx.asddlx` + `.ddlx.xml` |
| Behavior definition | BDEF | `.bdef.asbdef` + `.bdef.xml` |
| Behavior impl. | Included in class CLAS | — |
| Service def. | SRVD | `.srvd.asrvd` + `.srvd.xml` |
| Service binding | SRVB | `.srvb.xml` |
| Message class | MSAG | `.msag.xml` |
| Transformation | XSLT | `.xslt.xml` + `.xslt.source.xml` |
| Enhancement impl. | ENHO | `.enho.xml` |
| SmartForm | SSFO | `.ssfo.xml` |
| Package | DEVC | `.devc.xml` |

## Critical pairing rules

1. **Source + metadata must ship together.** A `.clas.abap` without its `.clas.xml` is invalid. abapGit will refuse to deserialize half-objects.
2. **Case in filenames is always lowercase.** ABAP names are case-insensitive but abapGit filenames must be lowercase: `zcl_foo.clas.abap`, not `ZCL_FOO.clas.abap`.
3. **Names are flat — no subfolders per object.** All Z* / Y* objects for a given package live directly under `src/` (unless using abapGit's "folder logic" for nested packages — see below).

## Nested packages (optional)

If `.abapgit.xml` has `<FOLDER_LOGIC>FULL</FOLDER_LOGIC>`, subpackages map to subfolders:

```
src/
├── zpkg_demo.devc.xml
├── sub1/
│   ├── zpkg_demo_sub1.devc.xml
│   └── zcl_sub1_helper.clas.abap
└── sub2/
    └── ...
```

For PREFIX logic (default), packages don't map to folders — all files are flat under `src/`.

## Minimal class example

**`src/zcl_greetings.clas.abap`**
```abap
CLASS zcl_greetings DEFINITION PUBLIC CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS hello
      IMPORTING iv_name TYPE string
      RETURNING VALUE(rv_msg) TYPE string.
ENDCLASS.

CLASS zcl_greetings IMPLEMENTATION.
  METHOD hello.
    rv_msg = |Hello, { iv_name }|.
  ENDMETHOD.
ENDCLASS.
```

**`src/zcl_greetings.clas.xml`**
```xml
<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_CLAS" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <VSEOCLASS>
    <CLSNAME>ZCL_GREETINGS</CLSNAME>
    <LANGU>E</LANGU>
    <DESCRIPT>Greeting utility</DESCRIPT>
    <STATE>1</STATE>
    <CLSCCINCL>X</CLSCCINCL>
    <FIXPT>X</FIXPT>
    <UNICODE>X</UNICODE>
   </VSEOCLASS>
  </asx:values>
 </asx:abap>
</abapGit>
```

## Minimal domain example

**`src/zd_status.doma.xml`**
```xml
<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_DOMA" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <DD01V>
    <DOMNAME>ZD_STATUS</DOMNAME>
    <DDLANGUAGE>E</DDLANGUAGE>
    <DATATYPE>CHAR</DATATYPE>
    <LENG>000010</LENG>
    <OUTPUTLEN>000010</OUTPUTLEN>
    <DDTEXT>Processing status</DDTEXT>
   </DD01V>
   <DD07V_TAB>
    <DD07V>
     <DOMVALUE_L>OK</DOMVALUE_L>
     <DDTEXT>OK</DDTEXT>
    </DD07V>
    <DD07V>
     <DOMVALUE_L>FAIL</DOMVALUE_L>
     <DDTEXT>Failed</DDTEXT>
    </DD07V>
   </DD07V_TAB>
  </asx:values>
 </asx:abap>
</abapGit>
```

## Checking your output

After writing, run:

```bash
# Visual check
ls -la src/

# Lint (if installed)
abaplint --format standard src/
```

If you get an abaplint error about "missing metadata file," you forgot the `.xml` sibling.

## Authoritative reference

abapGit documentation: https://docs.abapgit.org/ref-file-format.html — definitive source for all serialization formats.
