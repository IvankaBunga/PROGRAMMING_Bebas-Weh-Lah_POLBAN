# Changelog RuteKita

### Pembaruan v4 (tampilan)
- Tema baru pastel-sticker (krem berpola titik, outline tebal, bayangan offset, aksen lime/pink/sky/ungu), font judul Bricolage Grotesque, ukuran teks lebih besar, copy lebih santai.
- Ilustrasi bawaan di hero dihapus. Hero hanya menampilkan kendaraan yang punya foto (`img/<kode>.jpg` atau Wikimedia). Kendaraan tanpa foto otomatis dilewati. Taruh foto sendiri di `img/` (damri, feeder, elf, shuttle, dst.) supaya muncul lagi.
- Struktur HTML dan JS tidak diubah, jadi semua fitur lama tetap jalan.

### Pembaruan v3.5
- Hero kini galeri kendaraan (MJT, TMB, DAMRI, Feeder, Angkot, Elf, Shuttle, Commuter Line) dengan keterangan singkat. Urutan sumber gambar: `img/<kode>.jpg` milikmu, foto Wikimedia Commons, lalu ilustrasi bawaan. Lihat `img/README.txt`.
- Istilah "potongan geometri" dihapus dari halaman detail.
- Jam & status operasional diisi dari `data/schedules.json`: jam per koridor MJT, jadwal Commuter Line, dan jam DAMRI Ledeng–Leuwipanjang berasal dari sumber (tag "dari sumber"). Sisanya perkiraan kasar (tag "perkiraan"). Edit file itu untuk memperbarui.

### Yang baru (v3)
- **Arah & versi digabung.** Sumber KML memisahkan tiap arah (pergi/pulang) dan sering menyimpan versi ganda (dengan dan tanpa kode trayek). Sekarang digabung jadi 1 kartu per trayek (`group_id`). Di panel detail, tiap file asli tetap bisa disorot di peta lewat tombol "Arah & versi data".
- **Klasifikasi ulang 385 file KML** memakai nama file *dan* nama titik (sebelumnya hanya nama file). Setiap trayek kini punya `mode`, `mode_confidence` (`confirmed` / `likely` / `unknown`), `mode_basis` (alasan klasifikasi), dan `fare_key`.
- **Estimasi tarif** per kategori di `data/fare-estimates.json`, lengkap dengan rentang (min–max), tingkat keyakinan (kuat / sedang / kasar), dasar estimasi, dan link sumber.
- Tarif **terverifikasi** di `data/fares.json` tetap menimpa estimasi bila diisi.

### Fitur Cari Rute (asal → tujuan)
Bagian "Mau ke mana?" di atas direktori. Isi asal dan tujuan (nama tempat dari data, atau klik 📍 Peta), lalu RuteKita menyusun urutan trayek, titik oper (maks. 2 kali), jalan kaki, dan estimasi total tarif. Berdiri sendiri di `js/planner.js` dan `data/planner-index.json`; direktori trayek, detail, dan peta lama tidak diubah. Setelah data KML berubah, jalankan `python3 tools/build_planner_index.py`. Rute disusun dari kedekatan jalur di KML (bukan jadwal/arah resmi).
