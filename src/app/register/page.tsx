'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

declare global {
  interface Window {
    google?: any;
  }
}

export default function RegisterPage() {
  const { register, loginWithGoogle, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Google login configurations
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');

  // Fetch Google settings
  useEffect(() => {
    api.getPublicSettings()
      .then((settings) => {
        if (settings.google_login_enabled && settings.google_client_id) {
          setGoogleEnabled(true);
          setGoogleClientId(settings.google_client_id);
        }
      })
      .catch(console.error);
  }, []);

  // Load Google SDK and initialize
  useEffect(() => {
    if (!googleEnabled || !googleClientId) return;

    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const initGoogleSignUp = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              setError('');
              setSubmitting(true);
              try {
                await loginWithGoogle(response.credential, true);
              } catch (err: any) {
                console.error(err);
                setError(err.message || 'Gagal daftar menggunakan Google.');
              } finally {
                setSubmitting(false);
              }
            },
          });

          const buttonParent = document.getElementById('googleSignUpButtonDiv');
          if (buttonParent) {
            window.google.accounts.id.renderButton(buttonParent, {
              theme: 'outline',
              size: 'large',
              width: 380,
              text: 'signup_with',
              shape: 'rectangular',
            });
          }
        } catch (e) {
          console.error('Google Sign-Up initialization failed', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleSignUp();
    } else {
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGoogleSignUp();
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, [googleEnabled, googleClientId, loginWithGoogle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !passwordConfirmation) {
      setError('Harap isi semua kolom');
      return;
    }

    if (password.length < 8) {
      setError('Kata sandi harus minimal 8 karakter');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registrasi gagal. Email mungkin sudah terdaftar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-light/20 via-white to-white relative overflow-hidden">
      {/* Dynamic light glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-border shadow-2xl relative">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-foreground font-heading">
            Daftar Akun Baru
          </h2>
          <p className="mt-2 text-center text-sm text-foreground/50">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>

        {error && (
          <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl text-xs flex items-center space-x-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-foreground/75 uppercase tracking-wider mb-2">
                Nama Lengkap
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-100 focus:border-primary text-foreground placeholder-slate-400"
                placeholder="Masukkan nama lengkap Anda"
              />
            </div>

            <div>
              <label htmlFor="email-address" className="block text-xs font-bold text-foreground/75 uppercase tracking-wider mb-2">
                Alamat Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-100 focus:border-primary text-foreground placeholder-slate-400"
                placeholder="Masukkan email aktif Anda"
              />
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="block text-xs font-bold text-foreground/75 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-100 focus:border-primary text-foreground placeholder-slate-400 pr-10"
                  placeholder="Min. 8 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-foreground focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="password-confirmation" className="block text-xs font-bold text-foreground/75 uppercase tracking-wider mb-2">
                Konfirmasi Kata Sandi
              </label>
              <input
                id="password-confirmation"
                name="password_confirmation"
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-100 focus:border-primary text-foreground placeholder-slate-400"
                placeholder="Ulangi kata sandi Anda"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || loading}
              className="glow-button w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold uppercase tracking-wider text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Membuat Akun...</span>
                </div>
              ) : (
                'Daftar Sekarang'
              )}
            </button>
          </div>
        </form>

        {googleEnabled && (
          <div className="space-y-4 pt-2">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Atau daftar dengan</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <div className="flex justify-center">
              <div id="googleSignUpButtonDiv" className="w-full flex justify-center min-h-[44px]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
