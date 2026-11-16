# Catatan dataset RuteKita

Sumber: arsip `tfb-route-kml.zip` (385 file KML, Transport for Bandung / OpenStreetMap).

## Aturan klasifikasi (urutan prioritas)
1. Nama file memuat Commuter Line / Feeder / Elf → `confirmed`.
2. Nama file berawalan "Jalur" (penomoran jalur DAMRI) atau ada titik "Pangkalan DAMRI" → DAMRI (`confirmed`). Nama terminal "Terminal Elang Damri" TIDAK dipakai, karena itu nama terminal, bukan operator (trayek 28 Elang–Gedebage–Ujungberung ternyata angkot).
3. Nama titik/file memuat "Shuttle", atau awalan `KBP` / `Summarecon` → Shuttle (`confirmed`).
4. Awalan "Koridor" → BRT (`likely`). Dipisah Metro Jabar Trans vs Trans Metro Bandung dari nama rute (Soreang, Kota Baru, Baleendah/BEC, Dago, Jatinangor, Dipatiukur, Majalaya → MJT; selain itu TMB). Ini inferensi, bukan data operator.
5. Nama titik memuat "Pangkalan Angkot" / "Terminal Angkot" → Angkot (`confirmed`).
6. Kode + nama cocok dengan daftar trayek angkot Kota Bandung (kode 9, 10, 15, 22–30) → Angkot (`confirmed`). Kode angka kecil lainnya atau 0xx → Angkot (dugaan, `likely`).
7. Sisanya (kode 9xx, kode huruf, tanpa kode) → "Angkot/minibus (belum pasti)" (`unknown`): hampir pasti minibus trayek tetap, tetapi angkot, angkutan pedesaan, dan Elf tidak bisa dibedakan dari KML. Kode 9xx tidak dipakai sebagai angkot karena Elf 936/940 di dataset yang sama juga berkode 9xx.

## Makna angka
- Titik bernama: fitur Point bernama di KML, bukan jumlah seluruh halte.
- Potongan geometri: segmen garis, bukan jumlah jalan.

## Tarif
Lihat `fare-estimates.json` (estimasi + sumber + keyakinan) dan `fares.json` (hanya nominal terverifikasi, saat ini semua null). Jangan campur keduanya.

## Penggabungan arah / versi
Kunci grup = (awalan layanan seperti Koridor/Jalur/Feeder/Elf bila ada) + himpunan nama ujung trayek, tanpa memperhatikan urutan, kode angka, dan teks "via ...". Dengan begitu `Ciparay _ Tegallega`, `925_ Tegallega _ Ciparay`, dan kebalikannya jadi satu trayek. Awalan layanan ikut dalam kunci supaya, misalnya, DAMRI "Jalur KBP" tidak ikut tergabung dengan BRT "Koridor 2" yang ujungnya sama. Klasifikasi grup mengikuti anggota dengan keyakinan tertinggi. Trayek Ciparay–Tegallega diberi label Angkot (dugaan) berdasarkan informasi pemilik situs, belum dari sumber resmi.
