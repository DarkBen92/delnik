// Генерирует PNG-иконки Дельника без зависимостей (только zlib). Запуск: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(out, { recursive: true });

const GREEN = [0x1f, 0x7a, 0x6d], DARK = [0x14, 0x5a, 0x50], PAPER = [0xff, 0xfd, 0xf8];

function crc32(buf) {
  let c, crc = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel((x + 0.5) / size, (y + 0.5) / size, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// расстояние до скруглённого прямоугольника (в долях стороны); < 0 — внутри
function roundRect(u, v, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2 - r, hh = (y1 - y0) / 2 - r;
  const dx = Math.max(Math.abs(u - cx) - hw, 0), dy = Math.max(Math.abs(v - cy) - hh, 0);
  return Math.hypot(dx, dy) - r;
}
function distSeg(u, v, ax, ay, bx, by) {
  const px = u - ax, py = v - ay, qx = bx - ax, qy = by - ay;
  const t = Math.max(0, Math.min(1, (px * qx + py * qy) / (qx * qx + qy * qy)));
  return Math.hypot(px - qx * t, py - qy * t);
}

/** scale < 1 уменьшает знак внутрь «безопасной зоны» (maskable), bgFull — фон на весь холст. */
function icon(scale, bgFull) {
  return (u, v, size) => {
    const aa = 1.5 / size;
    const cov = (d) => Math.max(0, Math.min(1, 0.5 - d / aa));
    const s = (n) => 0.5 + (n - 0.5) / scale;
    const su = s(u), sv = s(v);
    let col = GREEN, alpha = bgFull ? 1 : cov(roundRect(u, v, 0, 0, 1, 1, 0.22));
    const paper = cov(roundRect(su, sv, 0.2, 0.235, 0.8, 0.765, 0.07) * scale);
    if (paper > 0) {
      const pc = sv < 0.36 ? DARK : PAPER;
      col = col.map((c, i) => c * (1 - paper) + pc[i] * paper);
      alpha = Math.max(alpha, paper);
    }
    const tick = Math.min(distSeg(su, sv, 0.33, 0.585, 0.445, 0.7), distSeg(su, sv, 0.445, 0.7, 0.675, 0.44));
    const t = cov((tick - 0.039) * scale);
    if (t > 0) { col = col.map((c, i) => c * (1 - t) + GREEN[i] * t); }
    return [Math.round(col[0]), Math.round(col[1]), Math.round(col[2]), Math.round(alpha * 255)];
  };
}

writeFileSync(join(out, 'icon-192.png'), png(192, icon(1, false)));
writeFileSync(join(out, 'icon-512.png'), png(512, icon(1, false)));
writeFileSync(join(out, 'icon-maskable-512.png'), png(512, icon(0.7, true)));
console.log('Иконки записаны в', out);
