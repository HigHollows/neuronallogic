// Génère les icônes PNG de l'application installable (sans dépendance) : public/icon-192.png, icon-512.png, icon-maskable-512.png.
// Dessin : réseau de neurones stylisé blanc sur fond bleu profond (même motif que favicon.svg).
// Usage : node tools/gen-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x1f, 0x4f, 0x8f];
const FG = [255, 255, 255];
const NODES = [[8, 10, 2.2], [8, 16, 2.2], [8, 22, 2.2], [16, 10, 2.2], [16, 16, 2.2], [16, 22, 2.2], [24, 16, 2.4]];
const LINES = [[8, 10, 16, 16], [16, 16, 8, 22], [8, 16, 16, 10], [8, 16, 16, 22], [16, 10, 24, 16], [16, 16, 24, 16], [16, 22, 24, 16]];
const LINE_W = 1.6;

const distSeg = (px, py, [x1, y1, x2, y2]) => {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

/** Couverture (0 à 1) d'un point en coordonnées 32×32 par le motif blanc. */
function motif(x, y) {
  for (const [cx, cy, r] of NODES) if (Math.hypot(x - cx, y - cy) <= r) return 1;
  for (const l of LINES) if (distSeg(x, y, l) <= LINE_W / 2) return 1;
  return 0;
}

function roundedRect(u, v, r) {
  // u, v dans [0,1] ; rayon r relatif
  const x = Math.abs(u - 0.5) - (0.5 - r), y = Math.abs(v - 0.5) - (0.5 - r);
  return x <= 0 || y <= 0 ? Math.abs(u - 0.5) <= 0.5 && Math.abs(v - 0.5) <= 0.5 : Math.hypot(x, y) <= r;
}

function render(size, { maskable }) {
  const scale = maskable ? 0.64 : 0.86; // zone de sécurité pour les icônes « maskable »
  const SS = 3;
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let px = 0; px < size; px++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const u = (px + (sx + 0.5) / SS) / size, v = (py + (sy + 0.5) / SS) / size;
        if (maskable || roundedRect(u, v, 0.22)) bg++;
        const mx = ((u - 0.5) / scale + 0.5) * 32, my = ((v - 0.5) / scale + 0.5) * 32;
        if (motif(mx, my)) fg++;
      }
      const n = SS * SS, a = bg / n, f = Math.min(fg, bg) / n;
      const o = 1 + px * 4;
      for (let c = 0; c < 3; c++) row[o + c] = Math.round(BG[c] * (1 - f / Math.max(a, 1e-6)) + FG[c] * (f / Math.max(a, 1e-6)));
      row[o + 3] = Math.round(a * 255);
    }
    rows.push(row);
  }
  return Buffer.concat(rows);
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(size, opts) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(render(size, opts), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const out = (name, size, opts) => { writeFileSync(new URL(`../public/${name}`, import.meta.url), png(size, opts)); console.log(name); };
out('icon-192.png', 192, { maskable: false });
out('icon-512.png', 512, { maskable: false });
out('icon-maskable-512.png', 512, { maskable: true });
