<p align="center">
  <img src="banner.png" alt="AI Translate" width="760">
</p>

<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <a href="README.fr.md">🇫🇷&nbsp;Français</a> ·
  <b>🇮🇩&nbsp;Bahasa Indonesia</b> ·
  <a href="README.pt.md">🇧🇷&nbsp;Português</a> ·
  <a href="README.ro.md">🇷🇴&nbsp;Română</a> ·
  <a href="README.ru.md">🇷🇺&nbsp;Русский</a> ·
  <a href="README.uk.md">🇺🇦&nbsp;Українська</a> ·
  <a href="README.tr.md">🇹🇷&nbsp;Türkçe</a> ·
  <a href="README.vi.md">🇻🇳&nbsp;Tiếng Việt</a> ·
  <a href="README.ar.md">🇸🇦&nbsp;العربية</a> ·
  <a href="README.th.md">🇹🇭&nbsp;ไทย</a> ·
  <a href="README.ja.md">🇯🇵&nbsp;日本語</a> ·
  <a href="README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate

Plugin Discord yang menerjemahkan pesan Anda dengan model AI pilihan Anda, dan
melakukannya tanpa meratakan cara Anda menulis.

Pesan yang Anda kirim diterjemahkan sebelum terkirim, per obrolan. Pesan yang
Anda terima diterjemahkan saat Anda meminta, lewat menu klik kanan.

## Kenapa penerjemah lagi

Terjemahan mesin dibuat untuk prosa. Obrolan bukan prosa. Ia ditulis dengan
huruf kecil dan setengah jadi, hidup dari kaomoji, dan titik yang hilang pun
punya arti. Sebagian besar penerjemah diam-diam merapikan semua itu, dan yang
sampai di seberang terbaca seperti surat formulir tulisan orang lain.

Yang ini dibuat untuk membiarkannya apa adanya. Ia tidak menambahkan tanda baca
yang tidak Anda tulis, tidak membesarkan huruf yang Anda biarkan kecil, menjaga
pergantian baris di tempat Anda menaruhnya, dan tahu bahwa emotikon adalah
wajah, bukan kata yang harus diterjemahkan.

## Apa saja yang bisa

Terjemahan otomatis diatur per obrolan, jadi ia hanya bekerja di percakapan yang
memang Anda butuhkan. Klik kiri tombol terjemah di bilah ketik membuka panel,
klik kanan menyalakan atau mematikan obrolan yang sedang dibuka.

Pesan apa pun yang Anda terima bisa diterjemahkan lewat menu klik kanan. Kalau
terjemahannya pun tidak menolong, karena singkatan, kata yang hanya dipakai di
satu negara, atau lelucon antara dua orang, **AI Explain** di menu yang sama
menyebut bahasanya, membuka singkatannya, dan menjelaskan maksudnya.

Beberapa pesan terakhir percakapan ikut dikirim bersama setiap permintaan, jadi
"ya" yang singkat atau "tidak mau ke-paste" sampai seperti yang dimaksud. Anda
juga bisa menyematkan kosakata sendiri: kata yang tidak boleh diterjemahkan,
istilah dengan satu terjemahan tetap, jenis kelamin gramatikal untuk diri Anda,
dan apakah lawan bicara disapa secara formal atau tidak.

Satu pesan pun bisa menyimpan sebagian dirinya. Apit sebuah kata atau frasa
dengan dua garis miring terbalik, `\carpe diem\`, dan ia terkirim persis seperti
yang Anda ketik, tanpa garis miringnya; garis miring terbalik di awal baris
menjaga seluruh baris itu. Kode di dalam backtick tidak pernah diterjemahkan.

Di bawah pesan yang Anda kirim bisa tertinggal teks aslinya, hanya terlihat oleh
Anda, supaya Anda tahu apa yang benar-benar terkirim; yang itu mati sampai Anda
menyalakannya. Antarmukanya berbicara dalam 16 bahasa dan mengikuti bahasa
Discord selama Anda tidak menentukan lain.

## Penyedia

Kunci API Anda bawa sendiri, dan tetap milik Anda. Plugin ini tidak punya server
sendiri dan tidak pernah melihat kunci milik orang lain.

| Penyedia | Paket gratis |
|---|---|
| Groq | ada |
| Google Gemini | ada |
| Z.ai GLM | ada, dan bisa dipakai di tempat dua yang lain diblokir |
| Anthropic Claude | tidak |
| API apa pun yang kompatibel dengan OpenAI | tergantung penyedianya |

Penyedia kedua bisa ditunjuk sebagai cadangan. Kalau yang pertama sedang penuh,
kuotanya habis, atau menolak permintaan, terjemahan lewat yang satunya tanpa
mengganggu Anda.

Permintaan dikirim dari proses latar Discord, jadi kunci Anda tidak pernah masuk
ke bagian Discord yang bisa dijangkau halaman web.

## Pemasangan

AI Translate berjalan di dalam Vencord, mod terkenal untuk aplikasi Discord.
Satu perintah mengunduh Vencord yang sudah berisi AI Translate, sekitar satu
megabita, lalu menyambungkannya ke Discord. Tidak ada yang dikompilasi di
komputer Anda dan tidak ada yang perlu dipasang lagi. Bekerja dengan Discord
biasa, PTB, dan Canary di Windows, macOS, dan Linux.

**Windows.** Buka PowerShell (menu Start, ketik "PowerShell") lalu tempel:

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS dan Linux.** Buka Terminal lalu tempel:

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

Pilih **Install or update** dengan tombol panah lalu tekan Enter. Saat ditanya
Discord mana yang mau disambungkan, pilih dengan cara yang sama yang Anda pakai.
Di Windows perintahnya menutup Discord sendiri sebelum menyambung. Di Linux bisa
jadi Anda diminta kata sandi, karena Discord biasanya berada di tempat yang
hanya bisa ditulisi administrator. Setelah itu tutup Discord sepenuhnya,
termasuk dari ikon di baki sistem, lalu buka lagi.

Di sistem Linux atomik seperti Bazzite, Silverblue, Kinoite, atau SteamOS,
perintah yang sama tetap bekerja: tidak ada yang dipasang ke sistem, semuanya
masuk ke `~/.aiTranslate`. Discord-nya sendiri sebaiknya versi Flatpak, dan
pemasangnya akan memberi Flatpak itu akses ke berkas-berkas tersebut dengan
sendirinya. Discord yang ditanam ke dalam citra sistem lewat `rpm-ostree`
biasanya tidak bisa disambung, karena folder sistem di sana hanya bisa dibaca;
pasang versi Flatpak saja.

AI Translate sudah menyala. Buka **Pengaturan → Vencord → Plugins →
AI Translate**, pilih penyedia, lalu tempel kunci Anda.

Semua yang diunduh perintah itu berada di satu folder tersendiri:
`%LOCALAPPDATA%\aiTranslate` di Windows dan `~/.aiTranslate` di macOS dan Linux.
Menyambungkan Discord berarti menukar berkas awalannya dengan berkas kecil yang
memuat Vencord dulu lalu Discord persis seperti sebelumnya; akun, pengaturan,
dan pesan Discord Anda tidak disentuh.

## Pembaruan

Anda tidak perlu melakukan apa-apa. AI Translate mencari versi baru sendiri
setiap 2 hari, mengunduhnya di latar, dan menampilkan pemberitahuan; klik
pemberitahuan itu dan Discord dimulai ulang dengan versi baru. Kalau Anda
abaikan, pembaruan itu diterapkan begitu saja saat Discord dibuka lagi.
**Periksa pembaruan** di bagian bawah pengaturan plugin melakukan hal yang sama
seketika.

Setiap versi baru membawa Vencord terbaru juga, jadi perbaikan Vencord sendiri
datang lewat jalan yang sama. Di Windows dan Linux sambungannya juga bertahan
melewati pembaruan Discord. Kalau AI Translate sempat hilang setelah Discord
memperbarui dirinya, jalankan lagi perintah pemasangan: ia memperbaiki
pemasangan tanpa menghilangkan pengaturan Anda.

## Bagaimana build dibuat

Vencord hanya menjalankan plugin yang dikompilasi ke dalamnya, jadi yang Anda
unduh adalah Vencord dengan AI Translate di dalamnya. Tidak ada yang
mengerjakannya dengan tangan: robot di GitHub memeriksa setiap jam, dan begitu
Vencord atau AI Translate punya versi baru, ia mengompilasi keduanya dari
sumber masing-masing dan menerbitkan hasilnya di
[builds.zolatau.com](https://builds.zolatau.com/), tempat sumber persis setiap
build dicantumkan.

## Menghapus

Jalankan perintah yang sama seperti saat memasang lalu pilih **Remove**. Ia
melepas sambungan dari Discord, jadi Discord kembali persis seperti semula, lalu
bertanya apakah berkas yang diunduh juga dihapus. Tutup Discord sepenuhnya lalu
buka lagi.

Kunci API dan pengaturan Anda disimpan bersama pengaturan Vencord, bukan di
berkas yang diunduh, jadi semuanya masih ada kalau suatu saat Anda memasang
lagi.

## Sudah mem-build Vencord sendiri?

Dari folder Vencord Anda, klon repositori ini ke dalamnya sebagai userplugin
lalu build ulang:

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

Kedua baris ini sama di Windows, macOS, dan Linux, dan `git clone` membuat
`src/userplugins` kalau belum ada. Mulai ulang Discord setelahnya. Dengan
Equicord caranya sama. Salinan yang dibuat begini tidak memperbarui dirinya dari
GitHub; jalankan `git pull` lalu build lagi.

## Melaporkan sesuatu

Ikon amplop di bagian atas halaman pengaturan plugin membuka jendela untuk
laporan bug dan permintaan, lengkap dengan tangkapan layar. Server dukungan
ditautkan di jendela yang sama.

## Lisensi

GPL-3.0-or-later.
