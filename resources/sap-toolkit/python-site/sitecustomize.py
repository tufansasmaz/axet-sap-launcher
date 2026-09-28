"""NTT Studio: ajanın çalıştırdığı her Python'da TLS kuralı (ntt_tls_pin).

NTT Studio bu klasörü ajan terminaline, sohbet ajanına ve 8787 sunucusuna
`PYTHONPATH` olarak veriyor (app-electron/main/pythonSiteEnv.ts). Python
açılışta `sitecustomize`'ı kendiliğinden içe aktarıyor; bu dosya:

  * `requests.adapters` içe aktarıldığı AN `ntt_tls_pin.install_global()`
    çağırıyor — `verify=False` yazan skill script'leri (login_saml_sso.py,
    auth/jwt_auth_provider.py ...) SAP adresine pin'le, geri kalan her yere
    zincir + host adıyla gidiyor. Vendored dosyalara dokunulmuyor.
  * `sap_adt_lib` içe aktarıldığı AN `ntt_tls_pin.install()` — motorun
    oturumu, sarmalayıcı sunuculardaki kuralın aynısıyla.

Tembel: `requests` kullanmayan bir Python açılışı (pip, kullanıcının kendi
aracı) hiçbir şey yüklemiyor, yalnızca meta_path'e küçük bir bulucu ekleniyor.

Açılışı ASLA düşürmüyor; ama kural bir kez yüklenmeye başladıktan sonra
bozulursa `import requests` hatayla duruyor — doğrulamasız devam etmek yerine
(ntt_tls_pin'in "açık kalmak yerine kapalı kal" ilkesi).

Başka bir `sitecustomize` (venv, conda, dağıtım) bizimki yüzünden gölgede
kalmasın diye yol listesindeki SONRAKİ `sitecustomize` de çalıştırılıyor.
"""

import sys


def _ntt_install_hooks():
    import importlib.abc
    import importlib.util
    import os

    here = os.path.dirname(os.path.abspath(__file__))
    pin_file = os.path.join(
        os.path.dirname(here), "sap-consultant", "skills", "sap-adt", "scripts", "ntt_tls_pin.py"
    )
    if not os.path.isfile(pin_file):
        # Toolkit eksik kurulmuş: kuralı sessizce varsaymak yerine hiç
        # kancalanmıyoruz; bu durum launcher'ın toolkit denetiminde görünüyor.
        return

    def load():
        module = sys.modules.get("ntt_tls_pin")
        if module is not None and hasattr(module, "install_global"):
            return module
        # Kanonik adla kaydediliyor: sonradan `import ntt_tls_pin` diyen
        # sarmalayıcı sunucu AYNI modülü alsın, `install()` iki kez sarmasın.
        spec = importlib.util.spec_from_file_location("ntt_tls_pin", pin_file)
        module = importlib.util.module_from_spec(spec)
        sys.modules["ntt_tls_pin"] = module
        try:
            spec.loader.exec_module(module)
        except BaseException:
            sys.modules.pop("ntt_tls_pin", None)
            raise
        return module

    hooks = {
        "requests.adapters": lambda: load().install_global(),
        "sap_adt_lib": lambda: load().install(),
    }

    class _AfterExecLoader:
        """Asıl yükleyiciyi çalıştırıp ardından kancayı çağıran ince kabuk."""

        def __init__(self, inner, hook):
            self._inner = inner
            self._hook = hook

        def create_module(self, spec):
            return self._inner.create_module(spec)

        def exec_module(self, module):
            self._inner.exec_module(module)
            self._hook()

        def __getattr__(self, name):
            return getattr(self._inner, name)

    class _Finder(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path, target=None):
            hook = hooks.get(fullname)
            if hook is None:
                return None
            for finder in sys.meta_path:
                if finder is self or not hasattr(finder, "find_spec"):
                    continue
                spec = finder.find_spec(fullname, path, target)
                if spec is not None:
                    break
            else:
                return None
            loader = spec.loader
            if loader is None or not hasattr(loader, "exec_module"):
                return spec
            spec.loader = _AfterExecLoader(loader, hook)
            return spec

    sys.meta_path.insert(0, _Finder())


def _ntt_chain_next_sitecustomize():
    import importlib.machinery
    import importlib.util
    import os

    def norm(p):
        return os.path.normcase(os.path.abspath(p or os.getcwd()))

    here = norm(os.path.dirname(os.path.abspath(__file__)))
    rest = [p for p in sys.path if isinstance(p, str) and norm(p) != here]
    spec = importlib.machinery.PathFinder.find_spec("sitecustomize", rest)
    if spec is None or spec.loader is None:
        return
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)


try:
    _ntt_install_hooks()
except Exception as _exc:  # açılış düşmesin
    sys.stderr.write("NTT Studio sitecustomize: TLS kancası kurulamadı: %r\n" % (_exc,))

try:
    _ntt_chain_next_sitecustomize()
except Exception as _exc:
    # site.py'nin kendi sitecustomize hatası davranışı: yaz, devam et.
    sys.stderr.write("Error in sitecustomize (NTT Studio zinciri): %r\n" % (_exc,))
