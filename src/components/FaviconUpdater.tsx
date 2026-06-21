'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { api, getAssetUrl } from '@/services/api';

let cachedWebName = '';
let cachedFavicon = '';

export default function FaviconUpdater() {
  const pathname = usePathname();

  const fetchFavicon = async (force = false) => {
    try {
      if (!force && cachedWebName) {
        document.title = `${cachedWebName} - Top Up Game Cepat, Aman & Terpercaya`;
        if (cachedFavicon) {
          updateFaviconLink(cachedFavicon);
        }
        return;
      }

      const publicSettings = await api.getPublicSettings();
      if (publicSettings.web_name) {
        cachedWebName = publicSettings.web_name;
        document.title = `${publicSettings.web_name} - Top Up Game Cepat, Aman & Terpercaya`;
      }
      if (publicSettings.favicon) {
        cachedFavicon = publicSettings.favicon;
        updateFaviconLink(publicSettings.favicon);
      }
    } catch (err) {
      console.error('Failed to load website settings in FaviconUpdater', err);
    }
  };

  const updateFaviconLink = (faviconUrl: string) => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = getAssetUrl(faviconUrl);
  };

  // Re-run when pathname changes to ensure title remains custom
  useEffect(() => {
    fetchFavicon();
  }, [pathname]);

  // Listen to manual settings updates from admin panel
  useEffect(() => {
    const handleUpdate = () => fetchFavicon(true);
    window.addEventListener('faviconUpdated', handleUpdate);
    window.addEventListener('webNameUpdated', handleUpdate);
    return () => {
      window.removeEventListener('faviconUpdated', handleUpdate);
      window.removeEventListener('webNameUpdated', handleUpdate);
    };
  }, []);

  return null;
}
