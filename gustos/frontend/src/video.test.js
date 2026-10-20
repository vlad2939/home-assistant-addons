import { describe, expect, it } from "vitest";
import { embedUrl, parseVideo, siteLabel, thumbnailUrl } from "./video.js";

describe("parseVideo", () => {
  it("recunoaște formele de link YouTube", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=HoZFE_V-11E",
      "https://youtu.be/HoZFE_V-11E?t=10",
      "https://m.youtube.com/watch?feature=share&v=HoZFE_V-11E",
      "https://www.youtube.com/shorts/HoZFE_V-11E",
      "https://www.youtube-nocookie.com/embed/HoZFE_V-11E",
    ]) {
      expect(parseVideo(url)).toEqual({ kind: "youtube", id: "HoZFE_V-11E", url: "https://www.youtube.com/watch?v=HoZFE_V-11E" });
    }
  });

  it("recunoaște Vimeo și lasă celelalte linkuri ca link simplu", () => {
    expect(parseVideo("https://player.vimeo.com/video/76979871?h=1")).toMatchObject({ kind: "vimeo", id: "76979871" });
    expect(parseVideo("https://www.facebook.com/watch/?v=1")).toEqual({ kind: "link", url: "https://www.facebook.com/watch/?v=1" });
    expect(parseVideo("https://www.youtube.com/@jamilacuisine")).toMatchObject({ kind: "link" });
  });

  it("ignoră linkurile goale sau periculoase", () => {
    expect(parseVideo("")).toBeNull();
    expect(parseVideo(null)).toBeNull();
    expect(parseVideo("javascript:alert(1)")).toBeNull();
  });
});

describe("player", () => {
  it("YouTube fără cookie-uri, cu imagine de previzualizare", () => {
    const v = parseVideo("https://youtu.be/HoZFE_V-11E");
    expect(embedUrl(v)).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/HoZFE_V-11E\?/);
    expect(thumbnailUrl(v)).toBe("https://i.ytimg.com/vi/HoZFE_V-11E/hqdefault.jpg");
    expect(siteLabel(v)).toBe("YouTube");
  });

  it("linkurile simple nu au player", () => {
    const v = parseVideo("https://www.tiktok.com/@x/video/1");
    expect(embedUrl(v)).toBeNull();
    expect(siteLabel(v)).toBe("tiktok.com");
  });
});
