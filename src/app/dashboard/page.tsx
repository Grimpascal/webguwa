'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, Transaction, Game, TopupMethod, TopupRequest, Announcement } from '@/services/api';
import Link from 'next/link';

type TabType = 'dashboard' | 'topup' | 'transactions' | 'topup_history' | 'profile';

const CATEGORIES = [
  { id: 'games', name: 'Game Voucher', icon: '🎮', color: 'bg-primary/10 text-primary' },
  { id: 'pln', name: 'Token PLN', icon: '⚡', color: 'bg-amber-500/10 text-amber-500' },
  { id: 'pulsa', name: 'Pulsa & Data', icon: '📱', color: 'bg-emerald-500/10 text-emerald-500' },
  { id: 'ewallet', name: 'E-Wallet', icon: '💳', color: 'bg-purple-500/10 text-purple-500' },
  { id: 'streaming', name: 'Voucher & Streaming', icon: '📺', color: 'bg-rose-500/10 text-rose-500' }
];

const getCategoryKey = (slug: string): string => {
  const s = slug.toLowerCase();
  if (s === 'pln') return 'pln';
  if (['dana', 'go-pay', 'linkaja', 'mandiri-e-toll', 'ovo', 'shopee-pay'].includes(s)) return 'ewallet';
  if (['axis', 'byu', 'indosat', 'smartfren', 'telkomsel', 'tri', 'xl'].includes(s)) return 'pulsa';
  if (['garena', 'google-play-indonesia', 'google-play-us-region', 'riot-cash', 'steam-wallet-idr', 'unipin-voucher', 'vidio', 'wetv', 'wifi-id', 'xbox'].includes(s)) return 'streaming';
  return 'games';
};

export default function UserDashboard() {
  const { user, isAuthenticated, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Category selection state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [webName, setWebName] = useState('YOI Store');

  // Top-up states
  const [topupMethods, setTopupMethods] = useState<TopupMethod[]>([]);
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(true);
  const [instructionModalRequest, setInstructionModalRequest] = useState<TopupRequest | null>(null);

  // Search & Filter states for Transactions
  const [txSearch, setTxSearch] = useState('');
  const [txStatus, setTxStatus] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  async function loadDashboardData() {
    try {
      setFetching(true);
      const [txsData, gamesData, methodsData, requestsData, publicSettingsData, announcementsData] = await Promise.all([
        api.getUserTransactions(),
        api.getGames(),
        api.getTopupMethods(),
        api.getTopupRequests(),
        api.getPublicSettings(),
        api.getAnnouncements()
      ]);
      setTransactions(txsData);
      setGames(gamesData);
      setTopupMethods(methodsData);
      setTopupRequests(requestsData);
      setAnnouncements(announcementsData || []);
      if (publicSettingsData?.web_name) {
        setWebName(publicSettingsData.web_name);
      }

      // Select first method by default if available
      if (methodsData.length > 0 && !selectedMethodId) {
        setSelectedMethodId(methodsData[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data dashboard.');
    } finally {
      setFetching(false);
    }
  }

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount < 1000) {
      setError('Nominal top-up minimal Rp 1.000');
      return;
    }

    if (!selectedMethodId) {
      setError('Silakan pilih metode transfer pembayaran.');
      return;
    }

    const method = topupMethods.find(m => m.id === selectedMethodId);
    if (method && amount < parseFloat(method.min_amount)) {
      setError(`Nominal kurang dari batas minimal transfer metode ini (${formatPrice(method.min_amount)})`);
      return;
    }

    setTopupLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.createTopupRequest({
        topup_method_id: selectedMethodId,
        amount
      });
      setInstructionModalRequest(res);
      setSuccessMsg(`Pengajuan isi saldo berhasil diajukan!`);
      setTopupAmount('');
      
      // Reload requests history
      const reqsData = await api.getTopupRequests();
      setTopupRequests(reqsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengajukan pengisian saldo.');
    } finally {
      setTopupLoading(false);
    }
  };

  const formatPrice = (priceStr: string | number) => {
    const num = parseFloat(priceStr.toString());
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMsg(`${type} berhasil disalin!`);
  };

  // Filter Transaction
  const filteredTransactions = transactions.filter(tx => {
    const query = txSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      tx.invoice_id.toLowerCase().includes(query) ||
      tx.game?.name?.toLowerCase().includes(query) ||
      tx.product?.name?.toLowerCase().includes(query) ||
      tx.target_id.toLowerCase().includes(query);

    const matchesStatus = txStatus === 'all' ||
      (txStatus === 'paid' && tx.payment_status === 'paid') ||
      (txStatus === 'pending' && tx.payment_status === 'pending') ||
      (txStatus === 'completed' && tx.delivery_status === 'completed') ||
      (txStatus === 'failed' && (tx.payment_status === 'failed' || tx.delivery_status === 'failed'));

    return matchesSearch && matchesStatus;
  });

  const getPaymentStatusBadge = (status: Transaction['payment_status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
            Lunas
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20">
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-error/10 text-error border border-error/20">
            Gagal
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200">
            Kedaluwarsa
          </span>
        );
      default:
        return null;
    }
  };

  const getDeliveryStatusBadge = (status: Transaction['delivery_status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
            Sukses
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 animate-pulse">
            Diproses
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
            Menunggu
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-error/10 text-error border border-error/20">
            Gagal
          </span>
        );
      default:
        return null;
    }
  };

  if (loading || (fetching && transactions.length === 0 && games.length === 0)) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium text-foreground/60">Memuat dashboard...</span>
        </div>
      </div>
    );
  }

  // --- Sub-Renders for Tabs ---

  const renderDashboardTab = () => {
    // Filter games based on selected category
    const filteredGames = games.filter(g => getCategoryKey(g.slug) === selectedCategory);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Card Saldo Utama */}
          <div className="max-w-md relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 shadow-xl text-white">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl -ml-6 -mb-6" />

            <div className="relative flex flex-col h-full justify-between min-h-[160px]">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">{webName.split(' ')[0] || 'YOI'} E-Wallet</span>
                  {/* Decorative credit card chip */}
                  <div className="w-10 h-7 rounded bg-amber-500/80 opacity-90 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 border border-amber-600/30 grid grid-cols-3 grid-rows-3" />
                  </div>
                </div>
                
                <span className="text-xs text-slate-400 font-medium block mb-1">Total Saldo Anda</span>
                <span className="text-3xl font-extrabold font-heading tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                  {formatPrice(user?.balance || 0)}
                </span>
              </div>

              <div className="mt-8 flex justify-between items-end">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Pemegang Kartu</span>
                  <span className="text-sm font-bold tracking-wide uppercase text-slate-200 truncate max-w-[150px] block">
                    {user?.name}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('topup')}
                  className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-lg shadow-primary/20 flex items-center gap-1.5 active:scale-95 cursor-pointer border-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Isi Saldo
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Layanan Card (Categories & Brands) */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm transition-all duration-300">
            {selectedCategory === null ? (
              <div>
                <h2 className="text-sm font-bold text-foreground/80 font-heading mb-4 uppercase tracking-wider">Layanan {webName}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-100 hover:border-primary/30 hover:bg-primary-light/10 transition-all text-center group cursor-pointer"
                    >
                      <div className={`w-12 h-12 rounded-full ${cat.color} flex items-center justify-center mb-3 text-2xl group-hover:scale-110 transition-transform shadow-sm`}>
                        {cat.icon}
                      </div>
                      <span className="text-xs font-extrabold text-slate-700 font-heading">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs font-bold text-primary hover:text-primary-hover hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    &larr; Kembali ke Kategori
                  </button>
                  <span className="text-xs font-extrabold text-foreground/45 font-heading uppercase tracking-wider">
                    Kategori: {CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {filteredGames.length === 0 ? (
                    <p className="col-span-full text-center py-8 text-slate-400 text-xs font-bold">
                      Tidak ada brand aktif dalam kategori ini.
                    </p>
                  ) : (
                    filteredGames.map((game) => (
                      <Link
                        key={game.id}
                        href={`/game/${game.slug}`}
                        className="flex items-center space-x-3 p-3.5 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary-light/5 transition-all group"
                      >
                        {/* Game Category Thumbnail */}
                        {game.thumbnail ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${game.thumbnail}`}
                            alt={game.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-xs group-hover:border-primary/30 transition-colors shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 uppercase tracking-tight group-hover:from-primary/10 group-hover:to-primary/20 group-hover:text-primary transition-colors">
                            {game.code.slice(0, 3)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-700 truncate leading-tight group-hover:text-primary transition-colors">
                          {game.name}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Announcements Section */}
          {announcements.length > 0 && (
            <div className="space-y-3.5 animate-in fade-in duration-500">
              <h2 className="text-sm font-bold text-foreground/80 font-heading uppercase tracking-wider pl-1 flex items-center gap-2">
                <span>📢</span> Pengumuman Terbaru
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcements.map((ann) => {
                  let alertThemeClass = '';
                  let icon = '💡';
                  switch (ann.type) {
                    case 'success':
                      alertThemeClass = 'bg-success/5 border-success/20 text-success';
                      icon = '✅';
                      break;
                    case 'warning':
                      alertThemeClass = 'bg-warning/5 border-warning/20 text-warning';
                      icon = '⚠️';
                      break;
                    case 'danger':
                      alertThemeClass = 'bg-error/5 border-error/20 text-error';
                      icon = '🚨';
                      break;
                    default:
                      alertThemeClass = 'bg-primary/5 border-primary/20 text-primary';
                      icon = '📢';
                  }

                  return (
                    <div
                      key={ann.id}
                      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${alertThemeClass} flex gap-4 items-start`}
                    >
                      <div className="text-xl shrink-0 select-none mt-0.5">{icon}</div>
                      <div className="space-y-1 w-full min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {ann.type_label && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-current/10 font-sans leading-none">
                              {ann.type_label}
                            </span>
                          )}
                          <span className="text-[10px] opacity-60 font-semibold font-mono text-foreground/50">
                            {new Date(ann.created_at).toLocaleDateString('id-ID', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-foreground text-sm font-heading leading-snug">
                          {ann.title}
                        </h3>
                        {ann.subtitle && (
                          <p className="text-xs text-foreground/75 leading-relaxed font-medium">
                            {ann.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTransactionsTab = () => (
    <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground font-heading">Riwayat Transaksi</h2>
          <p className="text-xs text-foreground/40 mt-0.5">Pantau semua pesanan top-up yang telah Anda lakukan</p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Cari Invoice/Game/ID..."
            value={txSearch}
            onChange={(e) => setTxSearch(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-800 font-medium placeholder-slate-400 min-w-[150px]"
          />
          <select
            value={txStatus}
            onChange={(e) => setTxStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-600 font-bold"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="pending">Pending</option>
            <option value="completed">Sukses Pengiriman</option>
            <option value="failed">Gagal</option>
          </select>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-16 px-4">
          <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="font-bold text-foreground font-heading">Tidak Ada Transaksi</h3>
          <p className="text-xs text-foreground/45 mt-1">Transaksi tidak ditemukan atau filter tidak cocok.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border text-foreground/60 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nomor Invoice</th>
                <th className="px-6 py-4">Game & Produk</th>
                <th className="px-6 py-4">Tujuan</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4">Pembayaran</th>
                <th className="px-6 py-4">Pengiriman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  onClick={() => setSelectedTransaction(tx)}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTransaction(tx);
                        }}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        {tx.invoice_id}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(tx.invoice_id, 'Nomor invoice');
                        }}
                        className="text-slate-400 hover:text-primary p-0.5 cursor-pointer bg-transparent border-0 flex items-center justify-center"
                        title="Salin Invoice ID"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </button>
                    </div>
                    <span className="block text-[10px] text-foreground/45 mt-0.5">
                      {new Date(tx.created_at).toLocaleString('id-ID', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-foreground block leading-tight">
                      {tx.game?.name}
                    </span>
                    <span className="text-xs text-foreground/50 block">
                      {tx.product?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {tx.target_id} {tx.target_zone ? `(${tx.target_zone})` : ''}
                  </td>
                  <td className="px-6 py-4 font-bold text-foreground">
                    {formatPrice(tx.amount)}
                  </td>
                  <td className="px-6 py-4">
                    {getPaymentStatusBadge(tx.payment_status)}
                    <span className="block text-[10px] text-foreground/40 mt-1 uppercase">
                      {tx.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getDeliveryStatusBadge(tx.delivery_status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderTopupTab = () => {
    const selectedMethod = topupMethods.find(m => m.id === selectedMethodId);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saldo Status Card & Instructions */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 shadow-xl text-white">
              <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="relative flex flex-col justify-between min-h-[140px]">
                <div>
                  <span className="text-xs font-bold tracking-widest text-slate-400 uppercase block mb-6">Dompet {webName.split(' ')[0] || 'YOI'}</span>
                  <span className="text-xs text-slate-400 font-medium block mb-1">Saldo Saat Ini</span>
                  <span className="text-2xl font-extrabold font-heading text-slate-100">
                    {formatPrice(user?.balance || 0)}
                  </span>
                </div>
                <span className="text-sm font-semibold tracking-wide uppercase text-slate-400 truncate mt-6 block">
                  {user?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Topup Request Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-foreground font-heading">Isi Saldo Dompet</h2>
            <p className="text-xs text-foreground/50 mt-0.5 mb-6">Pilih rekening transfer deposit dan tentukan nominal pengisian</p>

            <form onSubmit={handleTopupSubmit} className="space-y-5">
              {/* Select Payment Method */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider">Pilih Rekening Tujuan</label>
                {topupMethods.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 font-medium">
                    Belum ada metode transfer deposit aktif saat ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {topupMethods.map((m) => {
                      const isSelected = selectedMethodId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedMethodId(m.id);
                            setError('');
                          }}
                          className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-24 ${
                            isSelected
                              ? 'border-primary bg-primary-light/20 ring-2 ring-primary/10 font-bold'
                              : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <div>
                            <p className="font-extrabold text-xs text-slate-800">{m.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{m.account_number}</p>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Min. Transfer: {formatPrice(m.min_amount)}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Preset Nominal */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider">Pilih Nominal Cepat</label>
                <div className="grid grid-cols-3 gap-2">
                  {[10000, 25000, 50000, 100000, 250000, 500000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTopupAmount(amount.toString())}
                      className={`py-2.5 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        topupAmount === amount.toString()
                          ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {formatPrice(amount)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Nominal input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider">Nominal Kustom</label>
                <div className="relative rounded-xl border border-slate-200 shadow-sm focus-within:border-primary transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm font-bold">Rp</span>
                  </div>
                  <input
                    type="number"
                    min="1000"
                    placeholder="Masukkan nominal pengisian"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="block w-full pl-9 pr-3.5 py-3 text-sm rounded-xl focus:outline-none text-slate-800 font-bold placeholder-slate-400"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={topupLoading || !topupAmount || !selectedMethodId}
                className="w-full mt-4 bg-primary hover:bg-primary-hover disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white font-bold text-sm py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/10 cursor-pointer border-0"
              >
                {topupLoading ? 'Mengirim Pengajuan...' : 'Ajukan Pengisian Saldo'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderTopupHistoryTab = () => {
    return (
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm animate-in fade-in duration-300">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-bold text-foreground font-heading">Riwayat Pengisian Saldo</h2>
          <p className="text-[11px] text-foreground/45">Semua riwayat pengajuan isi ulang saldo Anda</p>
        </div>

        {topupRequests.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400 text-xs font-medium">
            Belum ada pengajuan pengisian saldo terdaftar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-border text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Metode Transfer</th>
                  <th className="px-5 py-3">Nominal</th>
                  <th className="px-5 py-3">Instruksi / Catatan</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topupRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setInstructionModalRequest(req)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    title="Klik untuk melihat petunjuk transfer"
                  >
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                      {new Date(req.created_at).toLocaleString('id-ID', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">
                      {req.method?.name || 'Unknown'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-slate-900 block">
                        {formatPrice(parseFloat(req.amount) + (req.unique_code || 0))}
                      </span>
                      {req.unique_code > 0 && (
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                          Base: {formatPrice(req.amount)} (Kode: {req.unique_code})
                        </span>
                      )}
                      {req.status === 'approved' && req.previous_balance !== undefined && req.previous_balance !== null && (
                        <span className="text-[10px] text-slate-500 block mt-1 font-semibold">
                          Saldo sebelum: {formatPrice(req.previous_balance)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-[11px] max-w-xs break-words font-sans">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate max-w-[120px]">{req.notes || '-'}</span>
                        <span className="text-[10px] text-primary hover:underline font-bold shrink-0">
                          Petunjuk
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 uppercase">
                          Pending
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20 uppercase">
                          Disetujui
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-error/10 text-error border border-error/20 uppercase">
                          Ditolak
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderProfileTab = () => (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm max-w-xl">
      <h2 className="text-lg font-bold text-foreground font-heading mb-6">Informasi Akun</h2>
      
      <div className="space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl font-heading">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-extrabold text-foreground text-lg leading-tight">{user?.name}</h3>
            <span className="text-xs text-foreground/45 font-bold uppercase tracking-wider">
              {user?.role === 'admin' ? 'Administrator' : 'Pengguna Terdaftar'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="block text-xs font-bold text-foreground/45 uppercase tracking-wider mb-1">Nama Lengkap</span>
            <span className="text-foreground/80 font-semibold text-base">{user?.name}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-foreground/45 uppercase tracking-wider mb-1">Alamat Email</span>
            <span className="text-foreground/80 font-semibold text-base">{user?.email}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-foreground/45 uppercase tracking-wider mb-1">Tipe Akun</span>
            <span className="inline-block mt-1 text-xs uppercase px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
              {user?.role === 'admin' ? 'Admin' : 'Pengguna Biasa'}
            </span>
          </div>
          <div>
            <span className="block text-xs font-bold text-foreground/45 uppercase tracking-wider mb-1">Terdaftar Sejak</span>
            <span className="text-foreground/80 font-semibold text-base">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl">
      {/* Alert Notifications */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 left-5 sm:left-auto bg-success text-white px-5 py-4 rounded-xl shadow-2xl border border-success-hover flex items-center space-x-3 z-50 animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold text-xs leading-snug">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="fixed bottom-5 right-5 left-5 sm:left-auto bg-error text-white px-5 py-4 rounded-xl shadow-2xl border border-red-600 flex items-center space-x-3 z-50 animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold text-xs leading-snug">{error}</span>
        </div>
      )}

      {/* Tabbed Sidebar Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col space-y-4">
          
          {/* Mobile Navigation Tabs */}
          <div className="md:hidden bg-slate-100 p-1 rounded-xl flex overflow-x-auto space-x-1 scrollbar-hide shadow-inner w-full shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-grow text-center py-2.5 px-4 text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border-0 ${
                activeTab === 'dashboard'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('topup')}
              className={`flex-grow text-center py-2.5 px-4 text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border-0 ${
                activeTab === 'topup'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Isi Saldo
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-grow text-center py-2.5 px-4 text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border-0 ${
                activeTab === 'transactions'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Riwayat Tx
            </button>
            <button
              onClick={() => setActiveTab('topup_history')}
              className={`flex-grow text-center py-2.5 px-4 text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border-0 ${
                activeTab === 'topup_history'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Riwayat Saldo
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-grow text-center py-2.5 px-4 text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border-0 ${
                activeTab === 'profile'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Profil
            </button>
          </div>

          {/* Desktop Navigation Sidebar */}
          <div className="hidden md:flex flex-col space-y-1 bg-white p-3.5 rounded-2xl border border-border shadow-sm w-full font-heading">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 border-t-0 border-r-0 border-b-0 text-left bg-transparent ${
                activeTab === 'dashboard'
                  ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('topup')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 border-t-0 border-r-0 border-b-0 text-left bg-transparent ${
                activeTab === 'topup'
                  ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Isi Saldo</span>
            </button>

            {/* Collapsible Riwayat Group */}
            <div className="space-y-0.5">
              <button
                onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 text-slate-500 transition-all cursor-pointer bg-transparent border-0"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Riwayat</span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${historyDropdownOpen ? 'transform rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {historyDropdownOpen && (
                <div className="pl-6 space-y-0.5 animate-in slide-in-from-top duration-200">
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className={`w-full flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg text-left bg-transparent border-0 cursor-pointer ${
                      activeTab === 'transactions'
                        ? 'bg-primary/5 text-primary font-bold'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    <span>Riwayat Transaksi</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('topup_history')}
                    className={`w-full flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg text-left bg-transparent border-0 cursor-pointer ${
                      activeTab === 'topup_history'
                        ? 'bg-primary/5 text-primary font-bold'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    <span>Riwayat Isi Saldo</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 border-t-0 border-r-0 border-b-0 text-left bg-transparent ${
                activeTab === 'profile'
                  ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profil</span>
            </button>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main className="flex-grow w-full overflow-hidden">
          {activeTab === 'dashboard' && renderDashboardTab()}
          {activeTab === 'transactions' && renderTransactionsTab()}
          {activeTab === 'topup' && renderTopupTab()}
          {activeTab === 'topup_history' && renderTopupHistoryTab()}
          {activeTab === 'profile' && renderProfileTab()}
        </main>
      </div>

      {/* Instruction Modal Popup */}
      {instructionModalRequest && (() => {
        const totalPay = parseFloat(instructionModalRequest.amount) + (instructionModalRequest.unique_code || 0);
        const method = instructionModalRequest.method || topupMethods.find(m => m.id === instructionModalRequest.topup_method_id);
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-border overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-foreground font-heading">
                  Petunjuk Transfer Pembayaran
                </h3>
                <button
                  onClick={() => setInstructionModalRequest(null)}
                  className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-grow space-y-5 text-xs text-slate-600">
                {/* Status indicator */}
                <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">ID Permintaan</span>
                  <span className="font-mono text-slate-800 font-extrabold">REQ-{instructionModalRequest.id}</span>
                </div>

                {/* Previous balance if approved */}
                {instructionModalRequest.status === 'approved' && instructionModalRequest.previous_balance !== undefined && instructionModalRequest.previous_balance !== null && (
                  <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Saldo Sebelum Top-up</span>
                    <span className="font-mono text-slate-800 font-extrabold">{formatPrice(instructionModalRequest.previous_balance)}</span>
                  </div>
                )}

                {/* Pay Amount Section */}
                <div className="bg-primary/5 rounded-2xl border border-primary/10 p-5 text-center space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl -mr-6 -mt-6" />
                  
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jumlah Harus Ditransfer</span>
                    <span className="text-2xl font-extrabold text-primary font-heading block select-all tracking-wide">
                      {formatPrice(totalPay)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200/40 my-2 pt-2 grid grid-cols-2 gap-2 text-left">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Nominal Dasar</span>
                      <span className="font-semibold text-slate-700 text-xs">{formatPrice(instructionModalRequest.amount)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Kode Unik</span>
                      <span className="font-bold text-amber-600 text-xs">+{instructionModalRequest.unique_code}</span>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 text-center">
                    <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider block mb-0.5">Nominal Diterima (Masuk Saldo)</span>
                    <span className="font-extrabold text-green-700 text-sm font-heading">{formatPrice(totalPay)}</span>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(totalPay.toString(), 'Nominal transfer')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm active:scale-95 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Salin Nominal
                    </button>
                  </div>
                </div>

                {/* Transfer Destination details */}
                {method ? (
                  <div className="space-y-3">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rekening Tujuan Transfer</span>
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4.5 space-y-3.5 shadow-inner">
                      <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
                        <span className="text-slate-400">Provider / Bank</span>
                        <span className="font-extrabold text-slate-800 text-xs uppercase">{method.name}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
                        <span className="text-slate-400">Nomor Rekening / VA</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-slate-900 text-sm tracking-wide select-all">{method.account_number}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(method.account_number, 'Nomor rekening')}
                            className="text-primary hover:text-primary-hover p-1 cursor-pointer bg-transparent border-0"
                            title="Salin nomor"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Atas Nama (a.n)</span>
                        <span className="font-bold text-slate-800 text-xs">{method.account_name}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-400 italic">
                    Data rekening metode transfer tidak ditemukan.
                  </div>
                )}

                {/* Note alert warning */}
                <div className="bg-amber-50 rounded-xl border border-amber-200/60 p-3.5 text-amber-800 flex items-start space-x-2.5 leading-relaxed">
                  <svg className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-bold text-[10px] text-amber-900 uppercase tracking-wider mb-0.5">Penting!</p>
                    <p>Harap transfer **TEPAT** sesuai nominal di atas hingga 3 digit terakhir. Perbedaan nominal transfer akan memperlambat atau menggagalkan proses verifikasi manual oleh administrator.</p>
                  </div>
                </div>
              </div>

              {/* Footer action */}
              <div className="p-5 border-t border-border bg-slate-50/50 flex shrink-0">
                <button
                  type="button"
                  onClick={() => setInstructionModalRequest(null)}
                  className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer border-0 active:scale-95 transition-all shadow-md shadow-slate-900/10"
                >
                  Saya Mengerti
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Transaction Detail Modal Popup */}
      {selectedTransaction && (() => {
        const tx = selectedTransaction;
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-border overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-bold text-foreground font-heading">
                    Detail Transaksi
                  </h3>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[10px] text-foreground/40 font-mono block">{tx.invoice_id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(tx.invoice_id, 'Nomor invoice')}
                      className="text-primary hover:text-primary-hover p-0.5 cursor-pointer bg-transparent border-0 flex items-center justify-center"
                      title="Salin Invoice ID"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-grow space-y-5 text-xs text-slate-600">
                {/* Badges Status */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status Pembayaran</span>
                    {getPaymentStatusBadge(tx.payment_status)}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status Pengiriman</span>
                    {getDeliveryStatusBadge(tx.delivery_status)}
                  </div>
                </div>

                {/* Game & Product Info */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Informasi Produk</span>
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4.5 space-y-3 shadow-inner">
                    <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/50">
                      <span className="text-slate-400">Game</span>
                      <span className="font-extrabold text-slate-800 text-xs text-right">{tx.game?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/50">
                      <span className="text-slate-400">Produk</span>
                      <span className="font-bold text-slate-800 text-xs text-right">{tx.product?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/50">
                      <span className="text-slate-400">ID Tujuan</span>
                      <span className="font-mono font-bold text-slate-800 text-xs text-right select-all">
                        {tx.target_id} {tx.target_zone ? `(${tx.target_zone})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/50">
                      <span className="text-slate-400">Metode Bayar</span>
                      <span className="font-bold text-slate-800 text-xs uppercase text-right">{tx.payment_method}</span>
                    </div>
                    <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/50">
                      <span className="text-slate-400">Tanggal</span>
                      <span className="text-slate-700 text-[11px] text-right">
                        {new Date(tx.created_at).toLocaleString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {tx.discount && parseFloat(tx.discount) > 0 ? (
                      <>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
                          <span className="text-slate-400">Harga Item</span>
                          <span className="font-bold text-slate-800 text-xs">{formatPrice(parseFloat(tx.amount) + parseFloat(tx.discount))}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50 text-success">
                          <span className="text-success">Potongan Voucher ({tx.voucher_code})</span>
                          <span className="font-extrabold text-xs text-right">- {formatPrice(tx.discount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Total Bayar</span>
                          <span className="font-extrabold text-primary text-sm font-heading">{formatPrice(tx.amount)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total Harga</span>
                        <span className="font-extrabold text-primary text-sm font-heading">{formatPrice(tx.amount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SN / Notes Section */}
                {(tx.digiflazz_ref_id || tx.notes) && (
                  <div className="space-y-3">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keterangan Provider</span>
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4.5 space-y-3.5 shadow-inner">
                      {tx.digiflazz_ref_id && (
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
                          <span className="text-slate-400">SN / Ref ID</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-extrabold text-slate-800 text-xs select-all">{tx.digiflazz_ref_id}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.digiflazz_ref_id || '', 'SN / Ref ID')}
                              className="text-primary hover:text-primary-hover p-1 cursor-pointer bg-transparent border-0 flex items-center justify-center"
                              title="Salin SN"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      {tx.notes && (
                        <div className="flex flex-col space-y-1.5 text-left">
                          <span className="text-slate-400">Catatan</span>
                          <span className="font-medium text-slate-700 bg-white p-2.5 rounded-xl border border-slate-150 break-words leading-relaxed">
                            {tx.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer action */}
              <div className="p-5 border-t border-border bg-slate-50/50 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider cursor-pointer border-0 active:scale-95 transition-all text-center"
                >
                  Tutup
                </button>
                <Link
                  href={`/invoice/${tx.invoice_id}`}
                  className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider cursor-pointer border-0 active:scale-95 transition-all text-center shadow-md shadow-primary/10 flex items-center justify-center"
                >
                  Invoice &rarr;
                </Link>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
