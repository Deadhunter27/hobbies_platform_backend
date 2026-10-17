/**
 * Detects a GPS IFD pointer (tag 0x8825) in a JPEG's EXIF (APP1) segment.
 * The app strips EXIF before upload; this is the server-side backstop so a
 * photo can never leak where it was taken (ADR-0030). Pure and bounded: it
 * only walks the segment headers of the first bytes it is given.
 */
export function jpegHasGpsMetadata(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return false;
    const marker = bytes[offset + 1]!;
    if (marker === 0xda || marker === 0xd9) return false; // image data / end: no more metadata
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (length < 2) return false;
    const segmentStart = offset + 4;
    const segmentEnd = Math.min(offset + 2 + length, bytes.length);
    if (marker === 0xe1 && hasGpsInExif(bytes.subarray(segmentStart, segmentEnd))) return true;
    offset += 2 + length;
  }
  return false;
}

function hasGpsInExif(segment: Uint8Array): boolean {
  // "Exif\0\0" header followed by a TIFF header.
  if (
    segment.length < 14 ||
    segment[0] !== 0x45 ||
    segment[1] !== 0x78 ||
    segment[2] !== 0x69 ||
    segment[3] !== 0x66
  ) {
    return false;
  }
  const tiff = segment.subarray(6);
  const little = tiff[0] === 0x49 && tiff[1] === 0x49;
  const big = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!little && !big) return false;
  const u16 = (at: number) =>
    at + 2 > tiff.length
      ? -1
      : little
        ? tiff[at]! | (tiff[at + 1]! << 8)
        : (tiff[at]! << 8) | tiff[at + 1]!;
  const u32 = (at: number) =>
    at + 4 > tiff.length
      ? -1
      : little
        ? (tiff[at]! | (tiff[at + 1]! << 8) | (tiff[at + 2]! << 16) | (tiff[at + 3]! << 24)) >>> 0
        : ((tiff[at]! << 24) | (tiff[at + 1]! << 16) | (tiff[at + 2]! << 8) | tiff[at + 3]!) >>> 0;
  const ifd0 = u32(4);
  if (ifd0 < 0) return false;
  const entries = u16(ifd0);
  if (entries < 0 || entries > 512) return false;
  for (let i = 0; i < entries; i += 1) {
    if (u16(ifd0 + 2 + i * 12) === 0x8825) return true;
  }
  return false;
}
