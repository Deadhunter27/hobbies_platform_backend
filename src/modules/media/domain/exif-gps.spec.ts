import { jpegHasGpsMetadata } from './exif-gps';

/** Minimal JPEG: SOI, APP1(Exif) with IFD0 holding the given tags, then SOS. */
function jpegWithTags(tags: number[], order: 'II' | 'MM'): Uint8Array {
  const little = order === 'II';
  const u16 = (v: number) => (little ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff]);
  const u32 = (v: number) =>
    little
      ? [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24]
      : [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  const entries = tags.flatMap((tag) => [...u16(tag), ...u16(4), ...u32(1), ...u32(0)]);
  const tiff = [
    ...(little ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(8),
    ...u16(tags.length),
    ...entries,
    ...u32(0),
  ];
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = exif.length + 2;
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 0xff, ...exif, 0xff, 0xda, 0, 2]);
}

describe('jpegHasGpsMetadata', () => {
  it.each(['II', 'MM'] as const)('finds a GPS IFD pointer (%s byte order)', (order) => {
    expect(jpegHasGpsMetadata(jpegWithTags([0x010f, 0x8825], order))).toBe(true);
  });

  it.each(['II', 'MM'] as const)('passes EXIF without GPS (%s byte order)', (order) => {
    expect(jpegHasGpsMetadata(jpegWithTags([0x010f, 0x0112], order))).toBe(false);
  });

  it('passes a JPEG with no EXIF at all', () => {
    expect(jpegHasGpsMetadata(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(false);
  });

  it('does not treat non-JPEG bytes or truncated data as GPS', () => {
    expect(jpegHasGpsMetadata(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(jpegHasGpsMetadata(jpegWithTags([0x8825], 'II').subarray(0, 12))).toBe(false);
  });
});
