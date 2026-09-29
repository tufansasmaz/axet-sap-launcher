// @vitest-environment jsdom
//
// Ortak form parçaları (tasarım sistemi temeli, spec §6.2–6.3). Testlerin
// çoğu erişilebilirlik bağlarını sabitliyor: etiket girdiye, ipucu ve hata
// `aria-describedby`'a bağlı mı. Bunlar gözle görünmüyor; kırıldıklarında
// ekran okuyucu kullanıcısı hatayı hiç duymuyor.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import { Button } from "../src/ui/Button";
import { Field, Input, Select, Textarea } from "../src/ui/Field";
import { Toggle } from "../src/ui/Toggle";

afterEach(cleanup);

function wrap(ui: React.ReactNode) {
  return render(<LanguageProvider language="tr">{ui}</LanguageProvider>);
}

function describedTexts(el: HTMLElement): string[] {
  const ids = (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
  return ids.map((id) => document.getElementById(id)?.textContent ?? `<yok:${id}>`);
}

describe("Button", () => {
  it("varsayılan type=button: formun içinde formu göndermiyor", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    wrap(
      <form onSubmit={onSubmit}>
        <Button>Ekle</Button>
      </form>
    );
    const button = screen.getByRole("button", { name: "Ekle" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("type=submit verilince formu gönderiyor", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    wrap(
      <form onSubmit={onSubmit}>
        <Button type="submit">Kaydet</Button>
      </form>
    );
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("md 40px, sm 32px; ton sınıfı ve ek sınıf geçiyor", () => {
    wrap(
      <>
        <Button variant="primary">Büyük</Button>
        <Button size="sm" variant="danger" className="ml-auto">
          Küçük
        </Button>
      </>
    );
    const big = screen.getByRole("button", { name: "Büyük" }).className;
    const small = screen.getByRole("button", { name: "Küçük" }).className;
    expect(big).toContain("h-10");
    expect(big).toContain("bg-accent-500");
    expect(small).toContain("h-8");
    expect(small).toContain("--status-danger-solid");
    expect(small).toContain("ml-auto");
  });

  it("disabled iken tıklama işlemiyor", () => {
    const onClick = vi.fn();
    wrap(
      <Button disabled onClick={onClick}>
        Sil
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Field", () => {
  it("etiket girdiye bağlı", () => {
    wrap(
      <Field label="Ad">
        <Input />
      </Field>
    );
    expect(screen.getByLabelText("Ad").tagName).toBe("INPUT");
  });

  it("ipucu aria-describedby'da; hata yokken aria-invalid yok", () => {
    wrap(
      <Field label="Ad" hint="Boş bırakılabilir">
        <Input />
      </Field>
    );
    const input = screen.getByLabelText("Ad");
    expect(describedTexts(input)).toEqual(["Boş bırakılabilir"]);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("hata varken aria-invalid=true ve hata metni de okunuyor", () => {
    wrap(
      <Field label="Ad" hint="İpucu" error="Bu alan zorunlu">
        <Input />
      </Field>
    );
    const input = screen.getByLabelText("Ad");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(describedTexts(input)).toEqual(["İpucu", "Bu alan zorunlu"]);
  });

  it("Textarea ve Select de bağlanıyor", () => {
    wrap(
      <>
        <Field label="Açıklama">
          <Textarea />
        </Field>
        <Field label="Dil">
          <Select>
            <option value="tr">Türkçe</option>
          </Select>
        </Field>
      </>
    );
    expect(screen.getByLabelText("Açıklama").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Dil").tagName).toBe("SELECT");
  });

  it("girdinin kendi id'si ve aria-describedby'ı korunuyor", () => {
    wrap(
      <>
        <p id="dis">dış açıklama</p>
        <Field label="Ad" hint="İpucu">
          <Input id="kendi-id" aria-describedby="dis" />
        </Field>
      </>
    );
    const input = screen.getByLabelText("Ad");
    expect(input.id).toBe("kendi-id");
    expect(describedTexts(input)).toEqual(["dış açıklama", "İpucu"]);
  });

  it("Field dışında Input düz bir girdi", () => {
    wrap(<Input aria-label="Arama" />);
    const input = screen.getByLabelText("Arama");
    expect(input.hasAttribute("aria-describedby")).toBe(false);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });
});

describe("Toggle", () => {
  it("role=switch, aria-checked ve tıklayınca tersini bildiriyor", () => {
    const onChange = vi.fn();
    wrap(<Toggle checked={false} onChange={onChange} label="Bildirimler" />);
    const toggle = screen.getByRole("switch", { name: "Bildirimler" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("açıkken aria-checked=true, tıklayınca false", () => {
    const onChange = vi.fn();
    wrap(<Toggle checked onChange={onChange} label="Bildirimler" />);
    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("disabled iken değişmiyor", () => {
    const onChange = vi.fn();
    wrap(<Toggle checked={false} disabled onChange={onChange} label="Bildirimler" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Field içinde etiketi Field'dan alıyor", () => {
    wrap(
      <Field label="Otomatik güncelle" hint="Açılışta denetler">
        <Toggle checked={false} onChange={vi.fn()} />
      </Field>
    );
    const toggle = screen.getByRole("switch", { name: "Otomatik güncelle" });
    expect(describedTexts(toggle)).toEqual(["Açılışta denetler"]);
  });

  it("Field içinde label verilmeyince label prop'u kullanmıyor", () => {
    wrap(
      <Field label="Bildirimler" hint="Açılışta denetler">
        <Toggle checked={false} onChange={vi.fn()} />
      </Field>
    );
    const toggle = screen.getByRole("switch", { name: "Bildirimler" });
    expect(toggle).toBeTruthy();
  });

  it("Field dışında label prop'u aria-label olarak gidiyor", () => {
    wrap(<Toggle checked={false} onChange={vi.fn()} label="Bildirimler" />);
    const toggle = screen.getByRole("switch", { name: "Bildirimler" });
    expect(toggle).toBeTruthy();
  });

  it("klavye odak halkası görünür yoğunlukta (/20 değil /50)", () => {
    // /20 koyu zeminde neredeyse seçilmiyordu; klavyeyle gezen kullanıcı
    // odağın nerede olduğunu göremiyordu.
    wrap(<Toggle checked={false} onChange={vi.fn()} label="Bildirimler" />);
    const classes = screen.getByRole("switch").className.split(/\s+/);
    expect(classes).toContain("focus-visible:ring-accent-500/50");
    expect(classes).not.toContain("focus-visible:ring-accent-500/20");
  });
});

describe("Field erişilebilirlik (iç içe ve kenar durumları)", () => {
  it("iç içe: <Field><div><Input /></div></Field> etiket girdiye bağlı ve ipucu aria-describedby'da", () => {
    wrap(
      <Field label="Ad" hint="İpucu">
        <div>
          <Input />
        </div>
      </Field>
    );
    const input = screen.getByLabelText("Ad");
    expect(input.tagName).toBe("INPUT");
    expect(describedTexts(input)).toEqual(["İpucu"]);
  });

  it("hint boşken ipucu <p> yok ve aria-describedby yok", () => {
    wrap(
      <Field label="Ad" hint="">
        <Input />
      </Field>
    );
    const input = screen.getByLabelText("Ad");
    expect(input.hasAttribute("aria-describedby")).toBe(false);
  });
});
