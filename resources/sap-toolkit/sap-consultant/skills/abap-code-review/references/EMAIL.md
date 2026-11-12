# Email from ABAP — HTML body, attachment, delivery

For classic ABAP (`ecc`, `s4-*`); these APIs do not exist on `public`. Sending mail is an
outward action: the recipients and the content of a test mail are the consultant's call.

## 0. Which API

- **`SO_DOCUMENT_SEND_API1`** works, also in a background job. Leave working code on it.
- **`CL_BCS`** for new work, for attachments and for a subject longer than 50 characters
  or with Turkish letters (§6).
- The **sender** is the organisation's rule, not the code's: start with §1.

## 1. Sender — ask for the policy first

A corporate relay (Microsoft 365 / Exchange Online) often accepts mail **only from an
authorised technical address** ("Send As"). With the SAP user as sender the relay refuses;
SOES shows `XS 812` with `554 5.2.252 SendAsDenied; <account> not allowed to send as
<From>`. The second half of that text names the account and the refused sender. Hundreds
of 812s have sat for months read as "test systems send no mail".

- Before a new mail job, ask the consultant / Basis for the sender policy and have them
  look for 812 / SendAsDenied in SOES.
- A mandatory technical address: `lo_send->set_sender( cl_cam_address_bcs=>create_internet_address(
  i_address_string = <address> ) )`, the address from ONE documented place (constant with
  its source in a comment, or a maintenance table) — given by the consultant, never invented.
- If the relay allows it, the job's own user sends: `sender_address = CONV #( sy-uname )`,
  `sender_address_type = 'B'`. Never a hard-coded SAP user name; never type `'U'` with an
  SAP user name (`'U'` is for a real SMTP address).

**Delivery in SOST / SOES:** `XS 718` type I with `250 2.1.5 Recipient OK` = the relay took
it. `XS 812` = sender refused (above). Status `W` for months is not "not run yet" — check
the SCOT send job and the node. `SO596` when opening an HTML attachment in SOST is only the
GUI viewer stripping `<style>`. Ask for the **full error line**, not the status code.
Never assume "the test system sends nothing": test recipients in maintenance tables may be
real customer addresses — send the test mail only to yourself.

## 2. Recipients

From a Z maintenance table, never in the code; skip inactive ones; no recipient → log and
go on. `copy` / `blind_copy` for CC/BCC.

## 3. HTML body — five traps

1. **`<head><style>` is ignored** by Outlook, Gmail and the SAP viewer: inline styles on
   each element.
2. **One assignment truncates at 255** (`SOLISTI1-LINE` is CHAR255) and breaks tags: append
   the HTML in 255-character pieces (or `cl_bcs_convert=>string_to_soli( )` on `CL_BCS`).
   A comment saying a routine splits is not proof — read it.
3. **Aligned columns are `<table><td>`** with a fixed label width, not div/span.
4. **Numbers:** quantities in pieces `|{ val DECIMALS = 0 }|`, weights and amounts with
   their decimals. Never `WRITE … TO` — it uses the user's decimal separator.
5. **Turkish letters:** `<meta … charset=utf-8>` in the body usually works; names can still
   come out as `?` through SAPconnect's code page. Fully UTF-8 content goes in an attachment.

## 4. Subject

`SO_DOCUMENT_SEND_API1` / `create_document( i_subject )` hold 50 characters: the key fact
and the status first; `condense( |{ f ALPHA = OUT }| )` or the padding pushes it over 50.
Longer or Turkish: `CL_BCS` `set_message_subject( ip_subject = <string> )`.

## 5. Attachment instead of a wide table

Eight or more columns overflow most inboxes: a short body plus a file.
- Excel: `ZCL_EXCEL` (abap2xlsx) if installed (installing it needs Basis); else HTML saved as
  `.xls` with a UTF-8 BOM (background-safe); CSV only with a BOM and `;`. In the `.xls`
  HTML, `mso-number-format:"\@"` keeps leading zeros; escape `& < > "` (`&` first).
- `SO_DOCUMENT_SEND_API1`: the attachment is the second `packing_list` line,
  `transf_bin = 'X'`, `doc_type = 'XLS'` (CHAR3 — `.xlsx` does not fit),
  `doc_size = xstrlen( … )` (else junk bytes at the end), `&SO_FILENAME=<name>.xls` in
  `object_header`. **`commit_work = abap_true`** — without it the mail looks sent and never leaves.

## 6. `CL_BCS` skeleton

```abap
TRY.
    DATA(lo_send) = cl_bcs=>create_persistent( ).
    DATA(lo_doc)  = cl_document_bcs=>create_document(
      i_type = 'HTM'                                  " not RAW: it adds line breaks
      i_text = cl_bcs_convert=>string_to_soli( iv_html )  i_subject = CONV #( iv_subject ) ).
    lo_doc->add_attachment( i_attachment_type = 'XLS' i_attachment_subject = 'Report.xls'
                            i_att_content_hex = cl_bcs_convert=>xstring_to_solix( lv_xstr ) ).
    lo_send->set_document( lo_doc ).
    lo_send->set_sender( cl_sapuser_bcs=>create( sy-uname ) ).   " or the technical address, §1
    lo_send->set_message_subject( ip_subject = iv_long_subject ).
    lo_send->add_recipient( cl_cam_address_bcs=>create_internet_address( iv_email ) ).
    lo_send->send( ).
    COMMIT WORK.                                      " required
  CATCH cx_bcs INTO DATA(lx).                         " log it, do not stop the run
ENDTRY.
```

## Review checklist

Sender per policy, no hard-coded SAP user · recipients from a table · inline styles · body
in ≤255 pieces · no `WRITE … TO` for numbers · subject ≤50 or `CL_BCS` · commit present ·
errors caught and logged · a test mail went only to the developer.

---
Adapted from Ozgur Yilmaz's axet-template (MIT, `skills-sap/sap-classic-abap/references/
email.md`). Its live evidence is one S/4 private 2025 system (the SendAsDenied case, the
CL_BCS long Turkish subject, the `.xls` attachment); nothing here was re-measured on ours.
