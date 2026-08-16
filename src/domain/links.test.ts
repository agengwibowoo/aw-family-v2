import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { cleanUrl, isYouTube, platformOf, titleFromUrl } from "./links";

describe("a link pasted from a chat", () => {
  it("strips the tracking that makes one product look like two", () => {
    assert.equal(
      cleanUrl(
        "https://shopee.co.id/botol-susu-i.123.456?sp_atk=abc&xptdk=def&utm_source=whatsapp",
      ),
      "https://shopee.co.id/botol-susu-i.123.456",
    );
  });

  it("keeps the parameters that identify the thing", () => {
    // Stripping the product id would be worse than keeping the tracking.
    assert.equal(
      cleanUrl("https://www.youtube.com/watch?v=abc123&utm_medium=share&si=xyz"),
      "https://www.youtube.com/watch?v=abc123",
    );
  });

  it("makes two shares of the same thing compare equal", () => {
    // This is what the dedupe index actually compares.
    const a = cleanUrl("https://tokopedia.com/x/y?utm_source=a&extParam=1");
    const b = cleanUrl("https://tokopedia.com/x/y?gclid=zzz");
    assert.equal(a, b);
  });

  it("leaves something unparseable alone rather than losing it", () => {
    // A failed clean still has to save. Losing the link is worse than keeping
    // a messy one.
    assert.equal(cleanUrl("  not a url  "), "not a url");
  });

  it("names the app that should open it", () => {
    assert.equal(platformOf("https://www.tiktok.com/@a/video/1"), "TikTok");
    assert.equal(platformOf("https://youtu.be/abc"), "YouTube");
    assert.equal(platformOf("https://shopee.co.id/x"), "Shopee");
    assert.equal(platformOf("https://example.com/x"), "example.com");
    assert.equal(platformOf("nonsense"), null);
  });

  it("allows inline play for YouTube and nothing else", () => {
    assert.equal(isYouTube("https://www.youtube.com/watch?v=a"), true);
    assert.equal(isYouTube("https://www.tiktok.com/@a/video/1"), false);
  });

  it("falls back to a readable title when the preview fails", () => {
    assert.equal(
      titleFromUrl("https://example.com/reviews/wide-neck-bottles"),
      "wide neck bottles",
    );
    assert.equal(titleFromUrl("https://example.com/"), "example.com");
  });
});
