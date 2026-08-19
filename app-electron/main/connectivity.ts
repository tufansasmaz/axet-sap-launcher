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
    const socket = tlsConnect({ host: parsed.hostname, port, rejectUnauthorized: false, timeout: timeoutMs, servername: parsed.hostname }, () => {
      socket.end();
      resolve({ serviceUuid: uuid, state: "reachable", message: "Sistem erişilebilir", latencyMs: Date.now() - started });
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve({ serviceUuid: uuid, state: "unreachable", message: "Zaman aşımı — VPN bağlı değil olabilir" });
    });
    socket.once("error", () => {
      resolve({ serviceUuid: uuid, state: "unreachable", message: "Bağlanılamadı — VPN kontrol et" });
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

export function checkConnectivity(service: SapService, timeoutMs = 2500): Promise<ConnectivityResult> {
  if (service.manualAdtUrl) {
    return checkHttpsUrl(service.manualAdtUrl, service.uuid, timeoutMs);
  }
  if (!service.host || !service.port) {
    return Promise.resolve({
      serviceUuid: service.uuid,
      state: "unknown",
      message: "Host/port bilgisi çözümlenemedi"
    });
  }
  if (service.routerString) {
    return checkRouter(service.routerString, service.host, service.port, service.uuid, timeoutMs);
  }
  return checkTcp(service.host, service.port, service.uuid, timeoutMs);
}
