# YOI Store — Frontend

Frontend aplikasi **YOI Store**, platform top-up game online berbasis Next.js 16 + TypeScript + Tailwind CSS. Terhubung ke backend Laravel melalui REST API.

---

## 🚀 Tech Stack

| Teknologi | Versi |
|---|---|
| [Next.js](https://nextjs.org) | 16.2.9 |
| [React](https://react.dev) | 19.2.4 |
| [TypeScript](https://www.typescriptlang.org) | ^5 |
| [Tailwind CSS](https://tailwindcss.com) | ^4 |

---

## ✨ Fitur

### Publik
- 🎮 Halaman daftar game dan produk top-up
- 🛒 Checkout & pembayaran (Midtrans / transfer manual)
- 🏷️ Validasi voucher diskon
- 📢 Pengumuman/banner dinamis
- 🔍 Cek status transaksi berdasarkan invoice

### User (Setelah Login)
- 🔐 Autentikasi (Register / Login / Google OAuth)
- 👤 Profil & ganti password
- 💰 Top-up saldo via transfer bank
- 📋 Riwayat transaksi & riwayat saldo
- 🎫 Support ticket (buat, balas, tutup)
- 🔑 Generate API Key

### Admin
- 📊 Dashboard statistik (total penjualan, transaksi, user)
- 🎮 Manajemen game (aktif/nonaktif, flash sale, thumbnail)
- 📦 Manajemen produk (markup harga, bulk update, sync Digiflazz)
- 👥 Manajemen user (CRUD, top-up manual, riwayat saldo)
- 💳 Metode top-up & permintaan top-up
- 🎟️ Manajemen voucher
- 📣 Manajemen pengumuman
- ⚙️ Pengaturan web (nama, logo, favicon, footer)
- 🏦 Saldo & deposit Digiflazz
- 🎫 Support ticket admin

---

## 📁 Struktur Direktori

```
src/
├── app/                  # Next.js App Router (halaman)
│   ├── admin/            # Halaman dashboard admin
│   ├── dashboard/        # Halaman dashboard user
│   ├── login/            # Halaman login
│   ├── register/         # Halaman register
│   └── ...
├── context/
│   └── AuthContext.tsx   # Context autentikasi global
└── services/
    └── api.ts            # Semua fungsi API & type definitions
```

---

## ⚙️ Setup & Instalasi

### 1. Clone repo

```bash
git clone https://github.com/Grimpascal/webguwa.git
cd webguwa
```

### 2. Install dependencies

```bash
npm install
```

### 3. Konfigurasi environment

Salin file `.env.example` menjadi `.env.local` dan sesuaikan:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

> Ganti `http://127.0.0.1:8000` dengan URL backend Laravel yang sesuai.

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 📦 Scripts

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk production |
| `npm run start` | Jalankan production server |
| `npm run lint` | Lint kode |

---

## 🔗 Koneksi ke Backend

Frontend berkomunikasi dengan backend Laravel melalui REST API. Pastikan backend sudah berjalan dan `NEXT_PUBLIC_API_URL` sudah diisi dengan benar.

Repositori backend: [YOI Backend](https://github.com/Grimpascal/webguwa)

---

## 🚢 Deployment

### Vercel (Rekomendasi)

1. Push ke GitHub
2. Connect repo di [vercel.com](https://vercel.com)
3. Set environment variable `NEXT_PUBLIC_API_URL` di dashboard Vercel
4. Deploy!

### Manual (VPS/Server)

```bash
npm run build
npm run start
```

---

## 📄 Lisensi

Private project. All rights reserved.
