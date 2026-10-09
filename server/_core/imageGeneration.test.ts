import { describe, expect, it } from "vitest";
import { assertImagePayloadMatchesMime } from "./imageGeneration";

describe("assertImagePayloadMatchesMime", () => {
  it("accepts matching PNG, JPEG and WebP signatures", () => {
    expect(() => assertImagePayloadMatchesMime(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "image/png",
    )).not.toThrow();
    expect(() => assertImagePayloadMatchesMime(
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      "image/jpeg",
    )).not.toThrow();
    expect(() => assertImagePayloadMatchesMime(
      Buffer.from("RIFF0000WEBP", "ascii"),
      "image/webp",
    )).not.toThrow();
  });

  it("rejects empty payloads and mismatched or unsupported MIME types", () => {
    expect(() => assertImagePayloadMatchesMime(Buffer.alloc(0), "image/png"))
      .toThrow(/empty decoded image payload/);
    expect(() => assertImagePayloadMatchesMime(
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      "image/png",
    )).toThrow(/signature does not match/);
    expect(() => assertImagePayloadMatchesMime(Buffer.from("not an image"), "image/gif"))
      .toThrow(/signature does not match/);
  });
});
