import { describe, expect, it } from "vitest";
import { EMAIL, renderEmailLayout } from "./email-brand";

describe("renderEmailLayout", () => {
  it("uses Grid Chicane palette and hosted F1 logo", () => {
    const html = renderEmailLayout({
      appUrl: "https://example.com",
      bodyHtml: "<p>Hello</p>",
      ctaLabel: "Go",
      ctaHref: "https://example.com/picks"
    });

    expect(html).toContain(EMAIL.carbon);
    expect(html).toContain(EMAIL.red);
    expect(html).toContain(EMAIL.offWhite);
    expect(html).toContain("https://example.com/f1-logo-white.png");
    expect(html).toContain("Fantasy League");
    expect(html).toContain("Go");
  });
});
