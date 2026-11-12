# A class is not one source file

Moved out of SKILL.md on 2026-11-12. SKILL.md keeps the rules; this is the detail.

`source/main` is the **global class only**. Local class definitions and
implementations, macros and test classes each live behind their own ADT include,
and `adt_get_source` without arguments does not return them — nor do `grep=` /
`method=`, which only slice whatever main contained.

This bites hardest on **RAP behaviour pools (`ZBP_*`)**: main is a generated
shell (`CLASS zbp_x DEFINITION … FOR BEHAVIOR OF …` + `ENDCLASS.`) and the entire
handler — `LHC_*`, every `FOR MODIFY` / `FOR READ` method — is in the
`implementations` include. Read main alone and the class looks empty.

```
adt_get_source(name="ZBP_I_ORDER")                        # main + a note if it is a shell
adt_get_source(name="ZBP_I_ORDER", include="implementations")   # the LHC_* handler
adt_get_source(name="ZCL_FOO",     include="testclasses")       # the unit tests
adt_get_source(name="ZCL_FOO",     include="all")               # every include, labelled
```

You do not have to remember this. When main implements nothing, the plain call
adds `includes` (a name → line-count map) and a `note` naming where the code is:

```
includes: {definitions: 3, implementations: 55, macros: 2, testclasses: 1}
note: main implements nothing; 55 lines are in the 'implementations' include.
```

Counts matter because *advertised* is not *populated* — every class advertises
`definitions`/`implementations`/`macros` whether or not they hold anything, and
SAP's empty stubs read as 1–3 lines of comment. The extra round trips are only
spent on the shell case; an ordinary class costs exactly what it always did.

> **Never build the include URL.** It is `…/includes/implementations` with **no**
> `/source/main` suffix — unlike the class itself — and a class with no test
> classes 404s on `testclasses`. The tool reads SAP's own `sourceUri` from the
> class resource and asks only for what SAP advertised. Measured on S/4HANA 2023.

**Writing the includes** — `adt_push` writes `source/main` only, so use
`adt_write_class_include` (since 2026-11-11; the old "not supported, use abapGit" note
was wrong and made agents give up on test classes and behaviour pools):

```
adt_write_class_include(name="ZCL_FOO",   include="testclasses",     source_file=…, transport=…)
adt_write_class_include(name="ZBP_I_ORD", include="implementations", source_file=…, transport=…)
adt_activate(name=…, object_type="class")   # then adt_unit_test for tests
```

Recipe for a **RAP behaviour pool**: `adt_create_behavior_definition` (BDEF) → `adt_create`
the class `ZBP_…` and `adt_push` its shell (`CLASS zbp_… DEFINITION PUBLIC ABSTRACT FINAL
FOR BEHAVIOR OF <root> …`) → `adt_write_class_include(include="implementations")` with
the `LHC_*` handler classes → `adt_activate` the class, then the BDEF. Recipe for a
**service**: CDS views → `adt_create_service_definition` → `adt_activate(object_type="srvd")`
→ `adt_create_service_binding` → `adt_publish_service_binding`. `adt_capabilities`
reports both under `creates_with`; do not read `behavior_implementation: false` from an
older build as "impossible".

