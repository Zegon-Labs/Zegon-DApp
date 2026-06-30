import { describe, expect, it } from "vitest";
import {
  buildShareTweetText,
  buildTwitterIntentUrl,
  ZEGON_X_HANDLE,
} from "../social/share.js";

describe("share social", () => {
  it("includes score, verify line and @Zegon_0g", () => {
    const text = buildShareTweetText({ score: 1337, verifyRounds: "5/6" });
    expect(text).toContain("1337");
    expect(text).toContain("VERIFY: 5/6 rounds sealed first");
    expect(text).toContain(ZEGON_X_HANDLE);
  });

  it("encodes twitter intent URL with text and challenge link", () => {
    const text = buildShareTweetText({ score: 800 });
    const url = "https://zegon.test/?challenge=abc";
    const intent = buildTwitterIntentUrl(text, url);
    expect(intent.startsWith("https://twitter.com/intent/tweet?")).toBe(true);
    expect(intent).toContain(encodeURIComponent("@Zegon_0g"));
    expect(intent).toContain(encodeURIComponent("800"));
    expect(intent).toContain(encodeURIComponent(url));
  });
});
