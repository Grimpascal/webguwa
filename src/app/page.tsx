'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Game } from '@/services/api';

export default function Home() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [error, setError] = useState('');
  const [webName, setWebName] = useState('YOI Store');

  useEffect(() => {
    async function loadGames() {
      try {
        const data = await api.getGames();
        setGames(data);
      } catch (err) {
        console.error('Failed to load games', err);
        setError('Gagal memuat katalog game. Pastikan backend Laravel sudah berjalan.');
      } finally {
        setLoading(false);
      }
    }
    loadGames();

    api.getPublicSettings()
      .then(settings => {
        if (settings.web_name) setWebName(settings.web_name);
      })
      .catch(err => console.error("Gagal memuat setting web_name di homepage", err));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInvoice.trim()) return;
    router.push(`/invoice/${searchInvoice.trim()}`);
  };

  // Helper to render beautiful vector icons if thumbnails are not loaded
  const getGameIcon = (code: string) => {
    switch (code) {
      case 'MLBB':
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
            ML
          </div>
        );
      case 'FREEFIRE':
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-yellow-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
            FF
          </div>
        );
      case 'PUBGM':
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-600 to-amber-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
            PUBG
          </div>
        );
      default:
        const initials = (code || 'GP').substring(0, 3).toUpperCase();
        return (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-400 flex items-center justify-center text-white font-extrabold text-lg shadow-md uppercase tracking-wider">
            {initials}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-light/40 via-white to-white py-16 md:py-24 overflow-hidden">
        {/* Decorative light glows */}
        <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />

        <div className="container mx-auto px-4 text-center max-w-4xl">
          <span className="accent-badge px-3 py-1.5 rounded-full text-xs uppercase tracking-widest inline-block mb-4">
            🚀 PROSES OTOMATIS 24 JAM
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground font-heading mb-6 leading-tight">
            Top Up Game Favoritmu <br />
            <span className="text-primary">Instan & Terpercaya</span>
          </h1>
          <p className="text-base md:text-lg text-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            Nikmati layanan top up diamond, UC, dan credit game tercepat dengan harga termurah. 
            Didukung pembayaran digital lengkap dan transaksi instan otomatis.
          </p>

          {/* Search/Track Invoice Form */}
          <div id="check-invoice" className="max-w-md mx-auto bg-white p-2 rounded-2xl border border-border shadow-xl mb-12">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={`Masukkan Nomor Invoice (e.g. ${(webName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase()) || 'YOI'}-2026...)`}
                value={searchInvoice}
                onChange={(e) => setSearchInvoice(e.target.value)}
                className="flex-grow px-4 py-3 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-100 focus:border-primary text-foreground"
              />
              <button
                type="submit"
                className="glow-button px-6 py-3 rounded-xl text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer"
              >
                Cek Pesanan
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Games Catalog Section */}
      <section id="games" className="py-12 bg-white flex-grow">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="border-b border-border pb-5 mb-8 flex flex-col sm:flex-row sm:items-end justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground font-heading">
                Katalog Top Up Game
              </h2>
              <p className="text-sm text-foreground/50 mt-1">
                Pilih game favoritmu dan isi nominal yang kamu inginkan
              </p>
            </div>
            <div className="mt-4 sm:mt-0 text-xs text-foreground/40 font-medium">
              Update otomatis dari Digiflazz
            </div>
          </div>

          {error && (
            <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse border border-slate-100 rounded-2xl p-6 flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl" />
                  <div className="h-4 bg-slate-100 w-24 rounded-md" />
                  <div className="h-3 bg-slate-100 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {games.length === 0 ? (
                <div className="col-span-full text-center py-12 text-foreground/50 text-sm">
                  Tidak ada game yang aktif saat ini.
                </div>
              ) : (
                games.map((game) => (
                  <Link key={game.id} href={`/game/${game.slug}`} className="group">
                    <div className="premium-card rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer relative overflow-hidden bg-white">
                      {/* Accent glow on card hover */}
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors blur-xl" />

                      {/* Icon */}
                      <div className="mb-4 transform group-hover:scale-105 transition-transform duration-300">
                        {game.thumbnail ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${game.thumbnail}`}
                            alt={game.name}
                            className="w-16 h-16 rounded-2xl object-cover shadow-md border border-slate-200"
                          />
                        ) : (
                          getGameIcon(game.code)
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-foreground font-heading group-hover:text-primary transition-colors text-base">
                        {game.name}
                      </h3>
                      
                      {/* Subtitle */}
                      <span className="text-xs text-foreground/40 mt-1 font-medium">
                        Instant Delivery
                      </span>

                      {/* Hover Arrow */}
                      <span className="mt-4 inline-flex items-center text-xs text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Top Up Sekarang &rarr;
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
