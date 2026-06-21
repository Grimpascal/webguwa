'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, getAssetUrl } from '@/services/api';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [webName, setWebName] = useState<string>('YOI Store');
  const pathname = usePathname();
  const isPanel = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard');
  const hideNavLinks = isPanel || pathname?.startsWith('/game') || pathname?.startsWith('/invoice');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const fetchLogo = async () => {
    try {
      const publicSettings = await api.getPublicSettings();
      setBrandLogo(publicSettings.brand_logo);
      setWebName(publicSettings.web_name || 'YOI Store');
    } catch (err) {
      console.error('Failed to load brand logo in Navbar', err);
    }
  };

  useEffect(() => {
    fetchLogo();

    // Dark/Light Theme Initialization
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }

    window.addEventListener('brandLogoUpdated', fetchLogo);
    window.addEventListener('webNameUpdated', fetchLogo);
    return () => {
      window.removeEventListener('brandLogoUpdated', fetchLogo);
      window.removeEventListener('webNameUpdated', fetchLogo);
    };
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2.5">
          {brandLogo && (
            <img 
              src={getAssetUrl(brandLogo)} 
              alt={`${webName} Logo`} 
              className="w-8 h-8 rounded-lg object-cover shadow-xs border border-slate-150"
            />
          )}
          <span className="text-xl font-bold tracking-tight text-primary font-heading">
            {webName.toLowerCase().includes('yoi') ? (
              <>
                {webName.substring(0, 3)}
                <span className="text-accent font-extrabold text-[#d8a800]">{webName.substring(3)}</span>
              </>
            ) : (
              webName
            )}
          </span>
        </Link>

        {/* Navigation Links (Desktop) */}
        {!hideNavLinks && (
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium hover:text-primary transition-colors text-foreground/80"
            >
              Beranda
            </Link>
            <Link
              href="/#games"
              className="text-sm font-medium hover:text-primary transition-colors text-foreground/80"
            >
              Katalog Game
            </Link>
            <Link
              href="/#check-invoice"
              className="text-sm font-medium hover:text-primary transition-colors text-foreground/80"
            >
              Cek Transaksi
            </Link>
          </nav>
        )}

        {/* Auth status & actions (Desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-primary transition-all cursor-pointer shadow-xs mr-1"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
              </svg>
            )}
          </button>

          {loading ? (
            <div className="w-20 h-8 bg-slate-100 animate-pulse rounded-lg" />
          ) : isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <span className="text-xs text-foreground/60 font-medium">
                Halo, <span className="font-bold text-foreground">{user?.name}</span>
                <span className="ml-1 text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                  {user?.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </span>

              {/* Show Dashboard/Admin Panel button ONLY when NOT already on the panel */}
              {!isPanel && (
                <Link
                  href={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
                >
                  {user?.role === 'admin' ? 'Panel Admin' : 'Dashboard'}
                </Link>
              )}

              <button
                onClick={logout}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg text-white bg-error hover:bg-red-600 hover:shadow-md transition-all cursor-pointer"
              >
                Keluar
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="glow-button inline-flex items-center justify-center px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg text-white"
              >
                Daftar
              </Link>
            </>
          )}
        </div>

        {/* Mobile Action Controls */}
        <div className="flex md:hidden items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-primary transition-all cursor-pointer shadow-xs"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
              </svg>
            )}
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex p-2 text-foreground/80 focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white p-4 space-y-4 shadow-lg animate-in slide-in-from-top duration-200">
          {!hideNavLinks && (
            <>
              <nav className="flex flex-col space-y-3">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                >
                  Beranda
                </Link>
                <Link
                  href="/#games"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                >
                  Katalog Game
                </Link>
                <Link
                  href="/#check-invoice"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                >
                  Cek Transaksi
                </Link>
              </nav>

              <hr className="border-border" />
            </>
          )}

          {loading ? (
            <div className="w-full h-8 bg-slate-100 animate-pulse rounded-lg" />
          ) : isAuthenticated ? (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/60 font-medium">
                  Halo, <span className="font-bold text-foreground">{user?.name}</span>
                </span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                  {user?.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {!isPanel && (
                  <Link
                    href={user?.role === 'admin' ? '/admin' : '/dashboard'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg text-center text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
                  >
                    {user?.role === 'admin' ? 'Panel Admin' : 'Dashboard'}
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg text-white bg-error hover:bg-red-600 transition-all cursor-pointer text-center"
                >
                  Keluar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="glow-button flex items-center justify-center w-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg text-white"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
