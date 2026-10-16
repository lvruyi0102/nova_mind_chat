/** Verify an image payload's byte signature matches its declared media type. */
export function assertImagePayloadMatchesMime(buffer: Buffer, mimeType: string): void {
  if (buffer.length === 0) {
    throw new Error("Image provider returned an empty decoded image payload");
  }
  const isPng = buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = buffer.length >= 3
    && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp = buffer.length >= 12
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP";
  const matches = mimeType === "image/png" ? isPng
    : mimeType === "image/jpeg" ? isJpeg
    : mimeType === "image/webp" ? isWebp
    : false;
  if (!matches) {
    throw new Error(`Image payload signature does not match declared MIME type: ${mimeType}`);
  }
}
