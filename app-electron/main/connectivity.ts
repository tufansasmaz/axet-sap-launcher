import { Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";
import type { ConnectivityResult, SapService } from "../shared/types";
import { buildFullRoute, connectThroughRouter, ROUTER_TALK_MODE_NI_MSG_IO } from "./sapRouter";

function checkTcp(host: string, port: number, uuid: string, timeoutMs: number): Promise<ConnectivityResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = new Socket();
    let settled = false;

    const finish = (result: ConnectivityResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      finish({
        serviceUuid: uuid,
        state: "reachable",
        message: "Sistem erişilebilir",
        latencyMs: Date.now() - started
      });
    });

    socket.once("timeout", () => {
      finish({
        serviceUuid: uuid,
        state: "unreachable",
        message: "Zaman aşımı — VPN bağlı değil olabilir"
      });
    });

    socket.once("error", () => {
      finish({
        serviceUuid: uuid,
        state: "unreachable",
        message: "Bağlanılamadı — VPN kontrol et"
      });
    });

    socket.connect(port, host);
  });
}

function checkHttpsUrl(rawUrl: string, uuid: string, timeoutMs: number): Promise<ConnectivityResult> {
  return new Promise((resolve) => {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      resolve({ serviceUuid: uuid, state: "unknown", message: "Geçersiz ADT URL" });
      return;
    }
    const started = Date.now();
    const port = parsed.port ? Number(parsed.port) : 443;
    // TLS SNI'ya IP yazılamaz (RFC 6066) — Node bunu DEP0123 ile uyarıyor ve
    // ileride tamamen yok sayacak. adtDiscovery.ts ve sapRouter.ts bu ayrımı
    // zaten yapıyordu, burada atlanmıştı; ADT URL'i IP içeren her sistemde
    // uygulama açılışında uyarı basılıyordu.
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname) || parsed.hostname.includes(":");
    // checkTcp'deki `settled` korumasının aynısı: zaman aşımında socket
    // destroy ediliyor, bu da bir "error" doğuruyor ve ikinci bir resolve
    // çağrısı yapılıyordu. Şu an zararsız (Promise ilk resolve'da kilitlenir)
    // ama iki dal arasındaki bu asimetri kolayca gerçek bir hataya dönüşür.
    let settled = false;
    const finish = (result: ConnectivityResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const socket = tlsConnect(
      { host: parsed.hostname, port, rejectUnauthorized: false, timeout: timeoutMs, servername: isIp ? undefined : parsed.hostname },
      () => {
        socket.end();
        finish({ serviceUuid: uuid, state: "reachable", message: "Sistem erişilebilir", latencyMs: Date.now() - started });
      }
    );
    socket.once("timeout", () => {
      socket.destroy();
      finish({ serviceUuid: uuid, state: "unreachable", message: "Zaman aşımı — VPN bağlı değil olabilir" });
    });
    socket.once("error", () => {
      finish({ serviceUuid: uuid, state: "unreachable", message: "Bağlanılamadı — VPN kontrol et" });
    });
  });
}

function checkRouter(routerString: string, host: string, port: number, uuid: string, timeoutMs: number): Promise<ConnectivityResult> {
  return (async () => {
    const started = Date.now();
    try {
      const hops = buildFullRoute(routerString, host, port);
      // SAP GUI'nin DIAG bağlantısı NI_MSG_IO (native SAP NI protokolü) ile
      // çalışır ve genelde ADT/HTTPS'e izin vermeyen router ACL'lerinde bile
      // izinlidir — bu yüzden erişilebilirlik pinglemesi için de bunu
      // kullanıyoruz. Bu, gerçek ADT bağlantısının (NI_RAW_IO gerektirir)
      // de başarılı olacağını garanti ETMEZ; sadece router+ağ erişimini
      // doğrular (bkz. PROJE-BILGI.md "BONY" bulgu notu).
      const socket = await connectThroughRouter(hops, timeoutMs, ROUTER_TALK_MODE_NI_MSG_IO);
      socket.destroy();
      return {
        serviceUuid: uuid,
        state: "reachable" as const,
        message: "Sistem SAProuter üzerinden erişilebilir",
        latencyMs: Date.now() - started
      };
    } catch (err) {
      return {
        serviceUuid: uuid,
        state: "unreachable" as const,
        message: (err as Error).message
      };
    }
  })();
}

// Sıralama önemli: sistemin GERÇEKTE nasıl erişildiği önce gelir. Host/port
// (ve varsa router) varsa yoklama oradan yapılır; ADT adresi ancak yoklanacak
// bir host/port YOKSA (yani cloud/BTP sistemlerde) kullanılır.
//
// Eskiden `manualAdtUrl` en başta bakılıyordu ve bu doğruydu, çünkü o alan
// yalnızca cloud sistemlerde dolabiliyordu. On-prem sistemlere de ADT adresi
// girilebildiğinden artık yanlış olurdu: router arkasındaki bir sisteme ADT
// adresi girilir girilmez yoklama router'ı ATLAYIP doğrudan URL'e giderdi —
// kurumsal ağ dışından bu her zaman başarısız olur, yani sistem sapasağlamken
// kırmızı nokta gösterirdi.
export function checkConnectivity(service: SapService, timeoutMs = 2500): Promise<ConnectivityResult> {
  if (service.host && service.port) {
    if (service.routerString) {
      return checkRouter(service.routerString, service.host, service.port, service.uuid, timeoutMs);
    }
    return checkTcp(service.host, service.port, service.uuid, timeoutMs);
  }
  if (service.manualAdtUrl) {
    return checkHttpsUrl(service.manualAdtUrl, service.uuid, timeoutMs);
  }
  return Promise.resolve({
    serviceUuid: service.uuid,
    state: "unknown",
    message: "Host/port bilgisi çözümlenemedi"
  });
}
