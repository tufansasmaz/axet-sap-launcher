// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import { renderMarkdownLite } from "../src/lib/markdownLite";

afterEach(cleanup);

describe("markdown kod bloğu", () => {
  it("dil başlık şeridi yok, Kopyala düğmesi köşede", () => {
    const { container } = render(
      <LanguageProvider language="tr">{renderMarkdownLite("```js\nconst a = 1;\n```")}</LanguageProvider>
    );
    expect(screen.queryByText("js")).toBeNull();
    expect(screen.getByTitle("Kopyala")).toBeTruthy();
    expect(container.querySelector("code.language-js")).toBeTruthy();
  });
});
