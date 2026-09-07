// Bağlayıcı maliyeti.
//
// Testin ağırlığı "BİLİNMİYOR" ile "SIFIR" ayrımında. Ekranda gösterilen sayı
// bir tahmin ve tahminin girdisi günlükten okunan kayıt sayısı — yarım bir
// senkronizasyon bloğuna bakıp "hiç bağlayıcın yok, bedel sıfır" demek,
// kullanıcıya güvenle yanlış bilgi vermek olurdu. Bu yüzden eksik/yarım her
// girdi `known: false` üretmek zorunda.

import { describe, expect, it } from "vitest";
import { COST_ANCHOR, buildInventory, parseConnectorBlock } from "../app-electron/main/connectorInventory";

function resolved(uuid: string, name: string, type: string, disabled = false): string {
  return JSON.stringify({
    time: "2026-09-07T10:00:00+03:00",
    level: "INFO",
    msg: "connector.sync.resolved",
    mcp_name: `conn_${uuid}`,
    display_name: name,
    type,
    url: `https://axet.nttdata.com/api/agentic-mcp-tools/${type}_tools/mcp`,
    disabled
  });
}

const START = '{"msg":"connector.sync.start"}';
const complete = (count: number) => `{"msg":"connector.sync.complete","count":${count}}`;

const BLOCK = [
  START,
  resolved("c32089b6-2367-4e46-a2dd-a7861ae2b5f1", "Outlook", "outlook"),
  resolved("1884738d-719e-43df-941a-c004b3de8556", "Sharepoint", "sharepoint"),
  complete(2)
].join("\n");

describe("parseConnectorBlock", () => {
  it("son tam bloktaki kayitlari dosyadaki SIRAYLA verir", () => {
    const records = parseConnectorBlock(BLOCK);
    expect(records?.map((r) => r.displayName)).toEqual(["Outlook", "Sharepoint"]);
    expect(records?.[0].uuid).toBe("c32089b6-2367-4e46-a2dd-a7861ae2b5f1");
    expect(records?.[0].type).toBe("outlook");
    expect(records?.[0].url).toContain("outlook_tools");
  });

  it("dosyada birden fazla blok varsa SONUNCUSU okunur", () => {
    // Her surec acilisinda bir blok dusuyor; eski bir blok, portalde silinmis
    // kayitlari hala varmis gibi gosterirdi.
    const older = [START, resolved("aaaaaaaa-0000-0000-0000-000000000000", "Eski", "outlook"), complete(1)].join("\n");
    const records = parseConnectorBlock(`${older}\n${BLOCK}`);
    expect(records?.map((r) => r.displayName)).toEqual(["Outlook", "Sharepoint"]);
  });

  it("blok yarimsa (complete yok) BILINMIYOR doner", () => {
    expect(parseConnectorBlock([START, resolved("a".repeat(8), "Outlook", "outlook")].join("\n"))).toBeNull();
  });

  it("blogun basi okuma penceresinin disinda kaldiysa BILINMIYOR doner", () => {
    // `start` gorunmuyorsa listenin tamamini gordugumuzu bilemeyiz; eksik bir
    // liste, bedeli oldugundan dusuk gosterirdi.
    expect(parseConnectorBlock([resolved("b".repeat(8), "Outlook", "outlook"), complete(9)].join("\n"))).toBeNull();
  });

  it("hic blok yoksa BILINMIYOR doner", () => {
    expect(parseConnectorBlock('{"msg":"agent turn finished"}')).toBeNull();
  });

  it("bozuk bir satir blogun tamamini goturmez", () => {
    const withJunk = [START, '{"msg":"connector.sync.resolved","mcp_n', resolved("c".repeat(8), "Outlook", "outlook"), complete(1)].join("\n");
    expect(parseConnectorBlock(withJunk)?.map((r) => r.displayName)).toEqual(["Outlook"]);
  });

  it("adi bos olan kayit uuid ile gosterilir", () => {
    const line = JSON.stringify({ msg: "connector.sync.resolved", mcp_name: "conn_dddddddd", display_name: "", type: "outlook" });
    expect(parseConnectorBlock([START, line, complete(1)].join("\n"))?.[0].displayName).toBe("dddddddd");
  });
});

describe("buildInventory", () => {
  const records = parseConnectorBlock(BLOCK)!;

  it("kayit YOKLUGU ile BILINMEMESI ayri seyler", () => {
    // Ekrandaki fark: biri "bedelin su kadar", digeri "okuyamadim". Ikisini
    // birlestirmek, gunlugu olmayan bir makinede "bedel sifir" demekti.
    expect(buildInventory(null, []).known).toBe(false);
    expect(buildInventory([], []).known).toBe(true);
    expect(buildInventory([], []).estimatedTokens).toBe(0);
  });

  it("arac sayisi TUR basina, kayit basina degil", () => {
    // Eski surum kayit basina sabit 23 arac sayiyordu ve 46 derdi; olculen
    // gercek 25 + 17 = 42 (2026-09-08, ctrl+b baglayici penceresi).
    const inv = buildInventory(records, []);
    expect(inv.activeCount).toBe(2);
    expect(inv.estimatedTools).toBe(42);
    expect(inv.estimatedTokens).toBe(Math.round(42 * COST_ANCHOR.tokensPerTool));
    expect(inv.unmeasuredCount).toBe(0);
  });

  it("her kayit KENDI arac sayisini tasiyor", () => {
    const inv = buildInventory(records, []);
    expect(inv.records.map((r) => r.tools)).toEqual([25, 17]);
    expect(inv.records.every((r) => r.measured)).toBe(true);
  });

  it("olculmemis tur ortalamaya duser ve BUNU SOYLER", () => {
    // Sessizce bir sayi uydurmak, ekranda olculmus gibi gorunurdu.
    const inv = buildInventory([{ ...records[0], type: "jira" }], []);
    expect(inv.records[0].tools).toBe(COST_ANCHOR.fallbackTools);
    expect(inv.records[0].measured).toBe(false);
    expect(inv.unmeasuredCount).toBe(1);
  });

  it("KAPALI kaydin olculmemis turu uyari uretmez", () => {
    // Sayiyi etkilemiyorsa uyarisi da cikmamali.
    const inv = buildInventory([{ ...records[0], type: "jira", disabledInLog: true }], []);
    expect(inv.unmeasuredCount).toBe(0);
  });

  it("tur buyuk harfle gelse de eslesir", () => {
    expect(buildInventory([{ ...records[0], type: "Outlook" }], []).records[0].tools).toBe(25);
  });

  it("YEREL kapatma gunlugun uzerine biner", () => {
    // Gunluk surec acilisinda yaziliyor, durum dosyasi sonradan degisebiliyor
    // — yani durum dosyasi "su an", gunluk "o an oyleydi".
    const inv = buildInventory(records, ["C32089B6-2367-4E46-A2DD-A7861AE2B5F1"]);
    expect(inv.records[0].disabledInLog).toBe(true);
    expect(inv.activeCount).toBe(1);
    expect(inv.estimatedTools).toBe(17); // yalnizca sharepoint kaldi
  });

  it("gunlukte kapali gorunen kayit bedele girmez", () => {
    const off = [{ ...records[0], disabledInLog: true }, records[1]];
    expect(buildInventory(off, []).activeCount).toBe(1);
  });

  it("capa arayuze oldugu gibi tasiniyor", () => {
    expect(buildInventory(records, []).anchor).toEqual(COST_ANCHOR);
  });
});
