// @vitest-environment jsdom
//
// `<html lang>` dil ayarını izliyor (grafit spec §4.3). `uppercase` büyük
// harfi bu niteliğe göre yapıyor: yanlış dilde "files" → "FİLES" olur.

import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppLanguage } from "../app-electron/shared/types";
import { useDocumentLanguage } from "../src/ui/useDocumentLanguage";

afterEach(() => {
  cleanup();
  document.documentElement.lang = "";
});

function Probe({ language }: { language: AppLanguage }) {
  useDocumentLanguage(language);
  return null;
}

describe("useDocumentLanguage", () => {
  it("dil değişince <html lang> değişiyor", () => {
    const { rerender } = render(<Probe language="tr" />);
    expect(document.documentElement.lang).toBe("tr");
    rerender(<Probe language="en" />);
    expect(document.documentElement.lang).toBe("en");
  });

  it("App dil ayarıyla çağırıyor; index.html ilk kare için tr", () => {
    const root = path.join(__dirname, "..");
    expect(readFileSync(path.join(root, "src", "App.tsx"), "utf8")).toContain("useDocumentLanguage(language)");
    expect(readFileSync(path.join(root, "index.html"), "utf8")).toContain('<html lang="tr">');
  });
});
