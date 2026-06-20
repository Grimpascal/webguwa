'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/services/api';

export default function Footer() {
  const pathname = usePathname();
  const [webName, setWebName] = useState<string>('YOI Store');
  const [footerDesc, setFooterDesc] = useState<string>('');
  const [footerWA, setFooterWA] = useState<string>('');
  const [footerEmail, setFooterEmail] = useState<string>('');
  const [footerHours, setFooterHours] = useState<string>('');

  if (pathname !== '/') {
    return null;
  }

  const fetchWebSettings = async () => {
    try {
      const publicSettings = await api.getPublicSettings();
      setWebName(publicSettings.web_name || 'YOI Store');
      setFooterDesc(publicSettings.footer_description || 'Platform top up game tercepat, termurah, dan terpercaya di Indonesia. Memproses transaksi otomatis 24/7 dengan dukungan integrasi Digiflazz API.');
      setFooterWA(publicSettings.footer_whatsapp || '+62 812-3456-7890');
      setFooterEmail(publicSettings.footer_email || 'support@yoistore.com');
      setFooterHours(publicSettings.footer_working_hours || '24 Jam Non-stop');
    } catch (err) {
      console.error('Failed to load website settings in Footer', err);
    }
  };

  useEffect(() => {
    fetchWebSettings();

    window.addEventListener('webNameUpdated', fetchWebSettings);
    return () => {
      window.removeEventListener('webNameUpdated', fetchWebSettings);
    };
  }, []);

  return (
    <footer className="w-full border-t border-border bg-slate-50 py-10 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <span className="text-xl font-bold text-primary font-heading">
              {webName.toLowerCase().includes('yoi') ? (
                <>
                  {webName.substring(0, 3)}
                  <span className="text-accent font-extrabold text-[#d8a800]">{webName.substring(3)}</span>
                </>
              ) : (
                webName
              )}
            </span>
            <p className="mt-3 text-sm text-foreground/60 max-w-sm leading-relaxed">
              {footerDesc}
            </p>
          </div>
          
          <div>
            <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-4">Peta Situs</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  Beranda
                </Link>
              </li>
              <li>
                <Link href="/#games" className="hover:text-primary transition-colors">
                  Katalog Game
                </Link>
              </li>
              <li>
                <Link href="/#check-invoice" className="hover:text-primary transition-colors">
                  Cek Transaksi
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-4">Hubungi Kami</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              {footerWA && <li>WhatsApp: {footerWA}</li>}
              {footerEmail && <li>Email: {footerEmail}</li>}
              {footerHours && <li>Jam Operasional: {footerHours}</li>}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 flex items-center justify-center text-xs text-foreground/40">
          <p>&copy; {new Date().getFullYear()} {webName}. Seluruh Hak Cipta Dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
