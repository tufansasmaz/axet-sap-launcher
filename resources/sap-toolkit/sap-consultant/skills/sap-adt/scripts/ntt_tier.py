"""NTT Studio: sistem kademesi (DEV/QA/PRD) ajanın değiştiremediği kaynaktan.

Motorun kademe kapısı (`guardrails.get_active_tier`, satıcı dosyası) değeri
`.conn_adt`'deki `ADT_SAP_TIER` satırından okuyor; satır yoksa DEV varsayıyor.
`.conn_adt` ajanın çalışma klasöründe, düz metin: ajan `ADT_SAP_TIER=DEV`
yazarak ya da satırı silerek QA/PRD sistemde yazma kapısını (`GR_TIER`) ve
KVKK okuma kapısını (`GR_PII`) açabiliyordu. Kararı veren tek kaynak buydu.

NTT Studio sunucuyu başlatırken kademeyi kendi yapılandırmasından
(`config.systemTiers`) sürecin ortamına `NTT_STUDIO_SAP_TIER` olarak koyuyor.
Bu modül:

  * ortamdaki değeri motor İÇE AKTARILMADAN önce bir kez yakalıyor
    (`capture_env_tier`). Motor içe aktarılırken `.conn_adt`'yi
    `load_dotenv(override=True)` ile ortama yüklüyor; `.conn_adt`'ye yazılmış
    bir `NTT_STUDIO_SAP_TIER=DEV` satırı sonradan okunsa ortamdaki değeri ezerdi.
  * `guardrails.get_active_tier`'ı, yakalanan değerle `.conn_adt`'deki değerin
    DAHA KISITLAYICI olanını döndüren bir sarmalayıcıyla değiştiriyor
    (`install`). `require_writable_tier` ve `require_data_access` işlevi modül
    global'i üzerinden çağırıyor, yani ikisi de sarmalayıcıdan geçiyor.

Ajan `.conn_adt`'yi yalnızca daha kısıtlayıcı yöne çekebilir (DEV'i PRD
yapmak), tersine çeviremez. Ortamda değer YOKSA (sunucuyu NTT Studio değil
biri elle başlatmışsa) hiçbir şey değişmiyor: o sürecin ortamı zaten
başlatanın elinde, ondan gelen bir değer güvenilir kaynak olmazdı. DEV'deki
onaylı sunucu o durumda onay ucunun adresini de bilmiyor, her yazma
`approval_unavailable` ile reddediliyor.

Kullanım (sarmalayıcı sunucular):
    import ntt_tier
    _ENV_TIER = ntt_tier.capture_env_tier()     # motor içe aktarılmadan ÖNCE
    import adt_mcp_server as engine
    import guardrails
    ntt_tier.install(guardrails, _ENV_TIER)
"""

from __future__ import annotations

import os
from typing import Callable, Mapping, Optional

ENV_KEY = "NTT_STUDIO_SAP_TIER"

# Kısıtlayıcılık sırası. Tanınmayan bir değer en kısıtlayıcıdan da kısıtlayıcı
# sayılıyor: motor da DEV dışındaki her değeri yazmaya kapalı tutuyor.
_RANK = {"DEV": 0, "QA": 1, "PRD": 2}
_UNKNOWN_RANK = 3

# guardrails._TIER_ALIASES'ın yedeği: satıcı tablosu bir senkronda adını
# değiştirirse normalleştirme sessizce bozulmasın diye en yaygın adlar burada.
_FALLBACK_ALIASES = {
    "DEVELOPMENT": "DEV", "DEV": "DEV",
    "QUALITY": "QA", "QA": "QA", "QAS": "QA", "TEST": "QA",
    "PRODUCTION": "PRD", "PRD": "PRD", "PROD": "PRD",
}


def capture_env_tier(environ: Optional[Mapping[str, str]] = None) -> Optional[str]:
    """Ortamdaki ham kademe değeri; yoksa ya da boşsa None."""
    env = os.environ if environ is None else environ
    raw = (env.get(ENV_KEY) or "").strip()
    return raw or None


def normalize(raw: Optional[str], aliases: Optional[Mapping[str, str]] = None) -> Optional[str]:
    """DEV/QA/PRD'ye çevir; tanınmayan değer büyük harfle olduğu gibi kalır."""
    if raw is None or not str(raw).strip():
        return None
    key = str(raw).strip().upper()
    table = aliases if aliases is not None else _FALLBACK_ALIASES
    return table.get(key, _FALLBACK_ALIASES.get(key, key))


def _rank(tier: str) -> int:
    return _RANK.get(tier, _UNKNOWN_RANK)


def stricter(a: Optional[str], b: Optional[str]) -> Optional[str]:
    """İki kademeden daha kısıtlayıcı olanı; biri None ise diğeri."""
    if a is None:
        return b
    if b is None:
        return a
    return a if _rank(a) >= _rank(b) else b


def install(guardrails_mod, env_tier: Optional[str]) -> bool:
    """`guardrails.get_active_tier`'ı sar. Ortam değeri yoksa dokunmaz, False döner."""
    aliases = getattr(guardrails_mod, "_TIER_ALIASES", None)
    pinned = normalize(env_tier, aliases)
    if pinned is None:
        return False
    current: Callable[[], str] = guardrails_mod.get_active_tier
    # İkinci kez çağrılırsa sarmalayıcıyı sarmalamasın: özgün işlev saklanıyor.
    original: Callable[[], str] = getattr(current, "__ntt_original__", current)

    def get_active_tier() -> str:
        # `.conn_adt` her çağrıda yeniden okunuyor (motorun kendi davranışı);
        # okunamazsa ya da tuhaf bir değer dönerse sabitlenen değer geçerli.
        try:
            from_conn = normalize(original(), aliases)
        except Exception:  # noqa: BLE001 — okuma hatası kapıyı açmasın
            from_conn = None
        return stricter(pinned, from_conn) or pinned

    get_active_tier.__ntt_original__ = original  # type: ignore[attr-defined]
    get_active_tier.__ntt_pinned__ = pinned  # type: ignore[attr-defined]
    guardrails_mod.get_active_tier = get_active_tier
    return True


def pinned_tier(guardrails_mod) -> Optional[str]:
    """`install` ile sabitlenen kademe; kurulmadıysa None."""
    return getattr(guardrails_mod.get_active_tier, "__ntt_pinned__", None)
