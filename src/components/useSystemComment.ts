import { useEffect, useRef, useState } from "react";
import type { SapService } from "../../app-electron/shared/types";

export type CommentSource = "saved" | "sapLogon" | "none";

// Seçili sistemin notu: yükleme, sistemler arası taslak koruma ve kaydetme.
// `SystemPanel`'den olduğu gibi taşındı (Logon sağ taraf planı, görev 2);
// davranış aynı, yalnızca görünümden ayrıldı.
export function useSystemComment(selection: { service: SapService; itemUuid: string } | null) {
  const [comment, setComment] = useState("");
  const [originalComment, setOriginalComment] = useState("");
  const [commentSource, setCommentSource] = useState<CommentSource>("none");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Kaydedilmemiş yorum taslakları, sistem uuid'i başına. Kullanıcı yazarken
  // ağaçtan başka bir sisteme tıklarsa o metin HENÜZ diskte değil, sadece
  // `comment` state'inde duruyor — aşağıdaki yükleme efekti onu koşulsuz
  // ezerse yazılan şey sessizce kaybolur, üstelik arayüz tam o sırada
  // "Kaydedilmemiş değişiklik" rozetini gösterirken. Bu yüzden geçişte taslak
  // buraya alınıyor ve sisteme geri dönüldüğünde yerine konuyor.
  const draftsRef = useRef<Map<string, string>>(new Map());
  // Yükleme efektinin temizlik fonksiyonu çalıştığı anda `comment`/
  // `originalComment` state'leri hâlâ ESKİ sisteme ait, ama efektin kendi
  // kapanışı bayat olabilir — o yüzden en güncel değerler bir ref'te
  // aynalanıyor. Efekt sırası: önce tüm temizlikler, sonra tüm efektler;
  // yani temizlik okuduğunda bu ref hâlâ eski sistemi gösteriyor.
  const liveRef = useRef<{ uuid: string; comment: string; original: string } | null>(null);

  // SystemPanel'deki liveRef aynalama efekti, aynen.
  useEffect(() => {
    if (!selection) return;
    liveRef.current = { uuid: selection.service.uuid, comment, original: originalComment };
  }, [selection?.service.uuid, comment, originalComment]);

  // SystemPanel'deki yükleme efekti, içindeki iki yorumla birlikte aynen.
  useEffect(() => {
    if (!selection) return;
    const uuid = selection.service.uuid;
    let cancelled = false;
    setCommentLoading(true);
    setCommentSaved(false);
    window.api
      .getSystemCommentDefault(uuid)
      .then((result) => {
        if (cancelled) return;
        const draft = draftsRef.current.get(uuid);
        // Taslak varsa metin olarak o geri geliyor, ama `originalComment`
        // diskteki hâl olarak kalıyor — böylece "kaydedilmemiş" rozeti ve
        // Kaydet butonu doğru şekilde açık kalıyor.
        setComment(draft ?? result.comment);
        setOriginalComment(result.comment);
        setCommentSource(result.source);
        setCommentLoading(false);
      })
      .catch(() => {
        // Yutulan reddediş `commentLoading`'i sonsuza kadar true bırakıyordu:
        // yorum kartı hep iskelet hâlinde kalır, kullanıcı sebebini göremezdi.
        if (cancelled) return;
        setCommentLoading(false);
      });
    return () => {
      cancelled = true;
      const live = liveRef.current;
      if (live && live.comment !== live.original) draftsRef.current.set(live.uuid, live.comment);
    };
  }, [selection?.itemUuid]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 140), 420)}px`;
  }, [comment, commentLoading]);

  const isDirty = comment !== originalComment;

  async function save() {
    if (!selection || commentSaving || commentLoading) return;
    const uuid = selection.service.uuid;
    setCommentSaving(true);
    try {
      await window.api.setSystemComment(uuid, comment);
    } catch {
      // Yazma başarısızsa taslak DURUYOR (silinmiyor) ve `originalComment`
      // değişmiyor — yani metin ekranda kalıyor, rozet "kaydedilmemiş"
      // demeye devam ediyor. Eskiden buradaki reddediş `commentSaving`'i
      // kilitli bırakıp Kaydet butonunu kalıcı olarak devre dışı bırakıyordu.
      setCommentSaving(false);
      return;
    }
    // Artık diskte — taslağın yaşaması için bir sebep kalmadı.
    draftsRef.current.delete(uuid);
    setOriginalComment(comment);
    setCommentSource("saved");
    setCommentSaving(false);
    setCommentSaved(true);
    setTimeout(() => setCommentSaved(false), 2000);
  }

  return {
    comment,
    setComment,
    originalComment,
    commentSource,
    commentLoading,
    commentSaving,
    commentSaved,
    isDirty,
    save,
    textareaRef
  };
}

export type SystemCommentState = ReturnType<typeof useSystemComment>;
