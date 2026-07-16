// Kaynak repo bug'u: tailwind CDN config script'i, CDN script'inden ÖNCE tanımlı
// -> "tailwind is not defined" (dark-mode class config hiç uygulanmıyor, konsol hatası).
// Doğru sıra: <script src=cdn.tailwindcss.com> ÖNCE, config script'i SONRA.
const fs = require('fs');
const p = 'dist/index.html';
let html = fs.readFileSync(p, 'utf8');
const configBlock = /<script>\s*\/\/ FIX:[\s\S]*?tailwind\.config[\s\S]*?<\/script>\s*/;
const match = html.match(configBlock);
const cdnTag = '<script src="https://cdn.tailwindcss.com"></script>';
if (match && html.includes(cdnTag)) {
  html = html.replace(configBlock, '');
  html = html.replace(cdnTag, cdnTag + '\n  ' + match[0].trim());
  fs.writeFileSync(p, html);
  console.log('tailwind config reordered (after cdn script)');
} else {
  console.log('tailwind config block or cdn tag not found, skipping reorder');
}
