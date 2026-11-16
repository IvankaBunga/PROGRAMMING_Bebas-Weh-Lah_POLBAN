# RuteKita: Geodata Explorer v3

## Fitur baru: Cari Rute (asal → tujuan)
Bagian "Mau ke mana?" di atas direktori. Isi asal dan tujuan (nama tempat dari data, atau klik 📍 Peta), lalu RuteKita menyusun urutan trayek, titik oper (maks. 2 kali), jalan kaki, dan estimasi total tarif. Berdiri sendiri di `js/planner.js` dan `data/planner-index.json`; direktori trayek, detail, dan peta lama tidak diubah. Setelah data KML berubah, jalankan `python3 tools/build_planner_index.py`. Rute disusun dari kedekatan jalur di KML (bukan jadwal/arah resmi).

## Pembaruan v4 (tampilan)
- Tema baru pastel-sticker (krem berpola titik, outline tebal, bayangan offset, aksen lime/pink/sky/ungu), font judul Bricolage Grotesque, ukuran teks lebih besar, copy lebih santai.
- Ilustrasi bawaan di hero dihapus. Hero hanya menampilkan kendaraan yang punya foto (`img/<kode>.jpg` atau Wikimedia). Kendaraan tanpa foto otomatis dilewati. Taruh foto sendiri di `img/` (damri, feeder, elf, shuttle, dst.) supaya muncul lagi.
- Struktur HTML dan JS tidak diubah, jadi semua fitur lama tetap jalan.

## Pembaruan v3.5
- Hero kini galeri kendaraan (MJT, TMB, DAMRI, Feeder, Angkot, Elf, Shuttle, Commuter Line) dengan keterangan singkat. Urutan sumber gambar: `img/<kode>.jpg` milikmu, foto Wikimedia Commons, lalu ilustrasi bawaan. Lihat `img/README.txt`.
- Istilah "potongan geometri" dihapus dari halaman detail.
- Jam & status operasional diisi dari `data/schedules.json`: jam per koridor MJT, jadwal Commuter Line, dan jam DAMRI Ledeng–Leuwipanjang berasal dari sumber (tag "dari sumber"). Sisanya perkiraan kasar (tag "perkiraan"). Edit file itu untuk memperbarui.

## Yang baru (v3)
- **Arah & versi digabung.** Sumber KML memisahkan tiap arah (pergi/pulang) dan sering menyimpan versi ganda (dengan dan tanpa kode trayek). Sekarang digabung jadi 1 kartu per trayek (`group_id`). Di panel detail, tiap file asli tetap bisa disorot di peta lewat tombol "Arah & versi data".
- **Klasifikasi ulang 385 file KML** memakai nama file *dan* nama titik (sebelumnya hanya nama file). Setiap trayek kini punya `mode`, `mode_confidence` (`confirmed` / `likely` / `unknown`), `mode_basis` (alasan klasifikasi), dan `fare_key`.
- **Estimasi tarif** per kategori di `data/fare-estimates.json`, lengkap dengan rentang (min–max), tingkat keyakinan (kuat / sedang / kasar), dasar estimasi, dan link sumber.
- Tarif **terverifikasi** di `data/fares.json` tetap menimpa estimasi bila diisi.

## Hasil klasifikasi (151 trayek unik dari 385 file KML)
- Angkot/minibus (belum pasti) (unknown): 58
- Angkot (dugaan) (likely): 35
- Angkot (confirmed): 26
- Metro Jabar Trans (BRT) (likely): 6
- Trans Metro Bandung (BRT) (likely): 5
- DAMRI (confirmed): 5
- Feeder (confirmed): 4
- Elf (confirmed): 4
- Shuttle (confirmed): 4
- Commuter Line Bandung Raya (confirmed): 2
- Angkot (likely): 1
- Commuter Line Garut (confirmed): 1

`confirmed` = terbaca eksplisit dari nama file/titik. `likely` = inferensi dari pola penamaan (kode angka angkot, awalan "Koridor"). `unknown` = hampir pasti minibus trayek tetap, tetapi angkot / angkutan pedesaan / Elf belum bisa dibedakan dari data KML.

## Menjalankan
Ekstrak ZIP, buka folder di VS Code, jalankan `index.html` dengan Live Server (data dimuat via `fetch()`, jangan buka lewat `file://`).

## Batasan penting
- Estimasi tarif BUKAN tarif resmi per trayek. Tingkat "kasar" berarti sumbernya lemah atau batasnya perkiraan sendiri. Riset tarif dilakukan 16 Nov 2026; tarif bisa berubah.
- Label "dugaan" tidak boleh dianggap fakta. Verifikasi ke Dishub/operator sebelum dipakai untuk navigasi nyata.
- Geometri KML bukan bukti layanan masih aktif.

## Mengubah estimasi
Edit `min`, `max`, `confidence`, dan `sources` pada kategori terkait di `data/fare-estimates.json`. Untuk tarif pasti satu trayek, isi `data/fares.json` (kunci = id trayek).

## Atribusi
Data geografis: Transport for Bandung / OpenStreetMap contributors (patuhi ODbL). Peta dasar: © OpenStreetMap contributors.
