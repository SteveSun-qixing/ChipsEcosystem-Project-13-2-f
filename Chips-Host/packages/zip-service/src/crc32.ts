const table = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let c = i;
  for (let j = 0; j < 8; j += 1) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c >>>= 1;
    }
  }
  table[i] = c >>> 0;
}

export const crc32 = (data: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of data) {
    const lookup = table[(crc ^ byte) & 0xff] ?? 0;
    crc = lookup ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
