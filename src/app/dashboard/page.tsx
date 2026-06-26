'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, Transaction, Game, TopupMethod, TopupRequest, Announcement, getAssetUrl, Ticket, TicketMessage, BalanceHistory } from '@/services/api';
import Link from 'next/link';
import * as htmlToImage from 'html-to-image';

type TabType = 'dashboard' | 'topup' | 'transactions' | 'topup_history' | 'balance_history' | 'profile' | 'developer' | 'tickets';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Nota Modal state
  const [notaModalTransaction, setNotaModalTransaction] = useState<Transaction | null>(null);
  const [customShopName, setCustomShopName] = useState('');
  const [customPrice, setCustomPrice] = useState<number | ''>('');

  // Load custom shop name from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('yoi_nota_shop_name');
      if (savedName) {
        setCustomShopName(savedName);
      }
    }
  }, []);

  const handleShopNameChange = (val: string) => {
    setCustomShopName(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('yoi_nota_shop_name', val);
    }
  };

  const handleOpenNotaModal = (tx: Transaction) => {
    setNotaModalTransaction(tx);
    setCustomPrice(parseFloat(tx.amount));
  };

  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloadingImage, setDownloadingImage] = useState(false);

  const downloadReceiptImage = () => {
    if (receiptRef.current === null) return;
    setDownloadingImage(true);
    
    htmlToImage.toPng(receiptRef.current, { 
      backgroundColor: '#ffffff',
      style: {
        transform: 'scale(1)',
        margin: '0',
        padding: '20px'
      }
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `nota-${notaModalTransaction?.invoice_id}.png`;
        link.href = dataUrl;
        link.click();
        setSuccessMsg('Nota berhasil diunduh sebagai gambar PNG!');
        setDownloadingImage(false);
      })
      .catch((err) => {
        console.error('Failed to generate receipt image:', err);
        setError('Gagal mengunduh gambar nota belanja.');
        setDownloadingImage(false);
      });
  };

  // Category selection state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [webName, setWebName] = useState('YOI Store');

  // Top-up states
  const [topupMethods, setTopupMethods] = useState<TopupMethod[]>([]);
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [balanceHistories, setBalanceHistories] = useState<BalanceHistory[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(true);
  const [instructionModalRequest, setInstructionModalRequest] = useState<TopupRequest | null>(null);

  // Search & Filter states for Transactions
  const [txSearch, setTxSearch] = useState('');
  const [txStatus, setTxStatus] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Profile Edit states
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Developer API states
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Support Tickets states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const repliedTicketsCount = tickets.filter(t => t.status === 'replied').length;
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'transaksi' | 'topup' | 'akun' | 'lainnya'>('transaksi');
  const [ticketInitialMsg, setTicketInitialMsg] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketReplySubmitting, setTicketReplySubmitting] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [loadingTicketDetail, setLoadingTicketDetail] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setProfileError('Nama lengkap harus diisi.');
      return;
    }
    
    setSavingProfile(true);
    setProfileError('');
    try {
      const payload: { name: string; password?: string } = {
        name: profileName.trim(),
      };
      if (profilePassword) {
        if (profilePassword.length < 8) {
          setProfileError('Password minimal harus 8 karakter.');
          setSavingProfile(false);
          return;
        }
        payload.password = profilePassword;
      }
      
      await api.updateProfile(payload);
      setSuccessMsg('Profil Anda berhasil diperbarui!');
      setProfilePassword('');
      await refreshUser();
      
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setProfileError(err.message || 'Gagal memperbarui profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGenerateApiKey = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Buat API Key Baru',
      message: 'Apakah Anda yakin ingin membuat/regenerasi API Key baru? API Key lama Anda tidak akan dapat digunakan lagi.',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setGeneratingKey(true);
        try {
          await api.generateApiKey();
          setSuccessMsg('API Key baru berhasil dibuat!');
          await refreshUser(); // Refresh user data to load new api_token
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal membuat API Key.');
        } finally {
          setGeneratingKey(false);
        }
      }
    });
  };

  const handleSelectTicket = async (id: number) => {
    setSelectedTicketId(id);
    setLoadingTicketDetail(true);
    setError('');
    try {
      const data = await api.getTicket(id);
      setActiveTicket(data);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat detail tiket.');
    } finally {
      setLoadingTicketDetail(false);
    }
  };

  const handleReplyTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim() || !selectedTicketId) return;

    setTicketReplySubmitting(true);
    try {
      await api.replyTicket(selectedTicketId, ticketMessage.trim());
      setTicketMessage('');
      // Reload ticket detail
      const updatedTicket = await api.getTicket(selectedTicketId);
      setActiveTicket(updatedTicket);
      
      // Reload list of tickets to update order/status
      const ticketList = await api.getUserTickets();
      setTickets(ticketList);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal membalas tiket.');
    } finally {
      setTicketReplySubmitting(false);
    }
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketInitialMsg.trim()) {
      setError('Harap isi semua kolom');
      return;
    }

    setTicketSubmitting(true);
    setError('');
    try {
      const newTicket = await api.createTicket({
        title: ticketTitle.trim(),
        category: ticketCategory,
        message: ticketInitialMsg.trim()
      });
      setTicketTitle('');
      setTicketInitialMsg('');
      setTicketCategory('transaksi');
      setShowNewTicketForm(false);
      
      // Reload list and select new ticket
      const ticketList = await api.getUserTickets();
      setTickets(ticketList);
      
      handleSelectTicket(newTicket.id);
      setSuccessMsg('Tiket bantuan berhasil dibuat.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal membuat tiket bantuan.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleCloseTicket = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Tutup Tiket',
      message: 'Apakah Anda yakin ingin menutup tiket bantuan ini? Status tiket akan diubah menjadi Ditutup.',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await api.closeTicket(id);
          setSuccessMsg('Tiket berhasil ditutup.');
          
          // Reload ticket detail and list
          const updatedTicket = await api.getTicket(id);
          setActiveTicket(updatedTicket);
          const ticketList = await api.getUserTickets();
          setTickets(ticketList);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal menutup tiket.');
        }
      }
    });
  };

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

  useEffect(() => {
    if (activeTab === 'balance_history' && isAuthenticated) {
      api.getUserBalanceHistory().then(data => setBalanceHistories(data)).catch(console.error);
    }
  }, [activeTab, isAuthenticated]);

  async function loadDashboardData() {
    try {
      setFetching(true);
      const [txsData, gamesData, methodsData, requestsData, publicSettingsData, announcementsData, ticketsData, balanceHistData] = await Promise.all([
        api.getUserTransactions(),
        api.getGames(),
        api.getTopupMethods(),
        api.getTopupRequests(),
        api.getPublicSettings(),
        api.getAnnouncements(),
        api.getUserTickets(),
        api.getUserBalanceHistory()
      ]);
      setTransactions(txsData);
      setGames(gamesData);
      setTopupMethods(methodsData);
      setTopupRequests(requestsData);
      setBalanceHistories(balanceHistData);
      setAnnouncements(announcementsData || []);
      setTickets(ticketsData || []);
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
        {/* Top Row: E-Wallet Card (Left) and Announcements / Quick Info (Right) */}
        {announcements.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Left: Card Saldo Utama */}
            <div className="lg:col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 shadow-xl text-white flex flex-col justify-between min-h-[220px]">
              {/* Background elements */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl -ml-6 -mb-6" />

              <div className="relative flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">{(webName || '').split(' ')[0] || 'YOI'} E-WALLET</span>
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

            {/* Right: Announcements */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-bold text-foreground/80 font-heading uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>📢</span> Pengumuman Terbaru
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {announcements.slice(0, 2).map((ann) => {
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
                        className={`relative overflow-hidden rounded-2xl border p-4.5 transition-all duration-300 hover:shadow-md ${alertThemeClass} flex gap-3.5 items-start`}
                      >
                        <div className="text-lg shrink-0 select-none mt-0.5">{icon}</div>
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
                          <h3 className="font-extrabold text-foreground text-xs font-heading leading-snug">
                            {ann.title}
                          </h3>
                          {ann.subtitle && (
                            <p className="text-[11px] text-foreground/75 leading-relaxed font-medium line-clamp-2">
                              {ann.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Left: Card Saldo Utama (Opaque max-w-md if no announcements) */
          <div className="max-w-md relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 shadow-xl text-white flex flex-col justify-between min-h-[220px]">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl -ml-6 -mb-6" />

            <div className="relative flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">{(webName || '').split(' ')[0] || 'YOI'} E-WALLET</span>
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
        )}

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
                          src={getAssetUrl(game.thumbnail)}
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
                <th className="px-6 py-4 text-center">Aksi</th>
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
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenNotaModal(tx)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-primary-light hover:text-primary hover:border-primary/20 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-xs"
                      title="Unduh Nota"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span className="text-[9px] font-bold uppercase tracking-wider hidden md:inline">Nota</span>
                    </button>
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

  const renderBalanceHistoryTab = () => {
    return (
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm animate-in fade-in duration-300">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-bold text-foreground font-heading">Riwayat Mutasi Saldo</h2>
          <p className="text-[11px] text-foreground/45">Semua riwayat pengurangan dan penambahan saldo Anda</p>
        </div>

        {balanceHistories.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400 text-xs font-medium">
            Belum ada riwayat mutasi saldo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-border text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Tipe</th>
                  <th className="px-5 py-3">Nominal</th>
                  <th className="px-5 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balanceHistories.map((hist) => {
                  const isRefund = hist.type === 'refund' || hist.description.toLowerCase().includes('pengembalian dana');
                  return (
                    <tr key={hist.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                        {new Date(hist.created_at).toLocaleString('id-ID', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isRefund ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                            Refund
                          </span>
                        ) : hist.type === 'addition' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            Penambahan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                            Pengurangan
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-bold">
                        {isRefund ? (
                          <span className="text-blue-600 font-extrabold">+ {formatPrice(hist.amount)}</span>
                        ) : hist.type === 'addition' ? (
                          <span className="text-emerald-600 font-extrabold">+ {formatPrice(hist.amount)}</span>
                        ) : (
                          <span className="text-rose-600 font-extrabold">- {formatPrice(hist.amount)}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-medium font-sans">
                        {hist.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

  const renderDeveloperTab = () => {
    const apiBaseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:8000';

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-36 h-36 bg-white/5 rounded-full blur-2xl -mr-10 -mb-10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-base md:text-lg font-black font-heading tracking-tight uppercase">Reseller API Developer Hub</h2>
            <p className="text-[10px] sm:text-xs text-white/85 mt-1 font-medium">Integrasikan sistem penjualan Anda langsung dengan store kami menggunakan API RESTful berkinerja tinggi.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* API Key Management Card */}
          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm font-heading mb-1 uppercase tracking-wider">Kredensial API Key Anda</h3>
              <p className="text-[10px] text-slate-500 font-medium">Simpan API Key Anda dengan aman. Jangan pernah membagikan API Key Anda kepada siapa pun.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-grow relative rounded-xl border border-slate-200 shadow-sm focus-within:border-primary transition-all">
                <input
                  type={apiKeyVisible ? 'text' : 'password'}
                  readOnly
                  value={user?.api_token || ''}
                  placeholder={user?.api_token ? '' : 'Belum memiliki API Key. Klik generate.'}
                  className="block w-full px-4 py-3 text-xs font-mono rounded-xl focus:outline-none text-slate-700 font-bold bg-slate-50 select-all pr-10"
                />
                {user?.api_token && (
                  <button
                    type="button"
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0"
                  >
                    {apiKeyVisible ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {user?.api_token && (
                <button
                  type="button"
                  onClick={() => handleCopy(user.api_token || '', 'API Key')}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer active:scale-95 transition-all bg-white"
                >
                  Salin API Key
                </button>
              )}

              <button
                type="button"
                onClick={handleGenerateApiKey}
                disabled={generatingKey}
                className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-primary/10 border-0 shrink-0"
              >
                {generatingKey ? 'Menghubungkan...' : user?.api_token ? 'Regenerasi API Key' : 'Generate API Key'}
              </button>
            </div>
          </div>

          {/* Interactive API Documentation */}
          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm font-heading mb-1 uppercase tracking-wider">Integrasi & Dokumentasi API</h3>
              <p className="text-[10px] text-slate-500 font-medium">Dokumentasi API lengkap untuk reseller memesan voucher game secara otomatis.</p>
            </div>

            <div className="space-y-6 text-xs text-slate-700 leading-relaxed font-sans">
              
              {/* Authentication */}
              <div className="space-y-2 pb-5 border-b border-slate-100">
                <h4 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  1. Keamanan & Autentikasi
                </h4>
                <p>
                  Setiap request API ke sistem kami wajib diautentikasi menggunakan <strong>API Key</strong> Anda. 
                  Anda dapat menyertakan API Key tersebut dengan salah satu cara berikut:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Mengirimkan header HTTP <code>X-API-KEY</code> (Sangat direkomendasikan)</li>
                  <li>Mengirimkan parameter query string <code>api_key</code></li>
                </ul>
              </div>

              {/* Check Balance */}
              <div className="space-y-3 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-green-600 text-white font-black px-2 py-0.5 rounded text-[10px] leading-none uppercase">GET</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">/api/v1/profile</span>
                </div>
                <p className="text-slate-600">Mengecek profil dan sisa saldo akun reseller Anda.</p>
                <div className="bg-slate-900 rounded-xl p-4 text-white overflow-x-auto font-mono text-[10px] space-y-3">
                  <div>
                    <span className="text-amber-400 font-bold">// HTTP Request (cURL)</span>
                    <pre className="mt-1.5 text-slate-300">curl -X GET &quot;{apiBaseUrl}/api/v1/profile&quot; \<br />  -H &quot;X-API-KEY: YOUR_API_KEY_HERE&quot;</pre>
                  </div>
                  <div className="border-t border-slate-800 pt-2.5">
                    <span className="text-emerald-400 font-bold">// Response Sukses (200 OK)</span>
                    <pre className="mt-1.5 text-slate-300">{JSON.stringify({
  "success": true,
  "data": {
    "name": "Member Reseller",
    "email": "reseller@example.com",
    "balance": 250000.00
  }
}, null, 2)}</pre>
                  </div>
                </div>
              </div>

              {/* Get Products */}
              <div className="space-y-3 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-green-600 text-white font-black px-2 py-0.5 rounded text-[10px] leading-none uppercase">GET</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">/api/v1/products</span>
                </div>
                <p className="text-slate-600">Mengambil daftar produk game aktif, lengkap dengan SKU Code, harga reseller, dan status flash sale.</p>
                <div className="bg-slate-900 rounded-xl p-4 text-white overflow-x-auto font-mono text-[10px] space-y-3">
                  <div>
                    <span className="text-amber-400 font-bold">// HTTP Request (cURL)</span>
                    <pre className="mt-1.5 text-slate-300">curl -X GET &quot;{apiBaseUrl}/api/v1/products&quot; \<br />  -H &quot;X-API-KEY: YOUR_API_KEY_HERE&quot;</pre>
                  </div>
                  <div className="border-t border-slate-800 pt-2.5">
                    <span className="text-emerald-400 font-bold">// Response Sukses (200 OK)</span>
                    <pre className="mt-1.5 text-slate-300">{JSON.stringify({
  "success": true,
  "data": [
    {
      "sku": "ML-5",
      "name": "5 Diamonds",
      "category": "Mobile Legends",
      "price": 1450,
      "is_flash_sale": false
    },
    {
      "sku": "FF-140",
      "name": "140 Diamonds",
      "category": "Free Fire",
      "price": 19000,
      "is_flash_sale": true
    }
  ]
}, null, 2)}</pre>
                  </div>
                </div>
              </div>

              {/* Create Transaction */}
              <div className="space-y-3 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-blue-600 text-white font-black px-2 py-0.5 rounded text-[10px] leading-none uppercase">POST</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">/api/v1/order</span>
                </div>
                <p className="text-slate-600">Memesan top-up dengan memotong saldo reseller Anda. Pengiriman produk akan diproses secara instan via Digiflazz.</p>
                
                {/* Parameters Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-[11px] border-collapse bg-slate-50/50">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <th className="p-3">Parameter</th>
                        <th className="p-3">Tipe</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-600">
                      <tr>
                        <td className="p-3 font-mono font-bold">buyer_sku_code</td>
                        <td className="p-3 font-mono">string</td>
                        <td className="p-3 font-semibold text-error">Wajib</td>
                        <td className="p-3">Kode SKU Produk (didapat dari API /products).</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold">target_id</td>
                        <td className="p-3 font-mono">string</td>
                        <td className="p-3 font-semibold text-error">Wajib</td>
                        <td className="p-3">Nomor Tujuan / ID Game Pelanggan.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold">target_zone</td>
                        <td className="p-3 font-mono">string</td>
                        <td className="p-3 font-semibold text-slate-400">Opsional</td>
                        <td className="p-3">Zone ID / Server ID (Wajib untuk game tertentu seperti Mobile Legends).</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold">ref_id</td>
                        <td className="p-3 font-mono">string</td>
                        <td className="p-3 font-semibold text-error">Wajib</td>
                        <td className="p-3">Kode invoice unik dari sistem Anda (maksimal 100 karakter). Digunakan untuk mencegah duplikasi order.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-900 rounded-xl p-4 text-white overflow-x-auto font-mono text-[10px] space-y-3">
                  <div>
                    <span className="text-amber-400 font-bold">// HTTP Request (cURL)</span>
                    <pre className="mt-1.5 text-slate-300">curl -X POST &quot;{apiBaseUrl}/api/v1/order&quot; \<br />  -H &quot;X-API-KEY: YOUR_API_KEY_HERE&quot; \<br />  -H &quot;Content-Type: application/json&quot; \<br />  -d &apos;{JSON.stringify({
  "buyer_sku_code": "ML-5",
  "target_id": "12345678",
  "target_zone": "1234",
  "ref_id": "INV-20260621-009"
}, null, 2)}&apos;</pre>
                  </div>
                  <div className="border-t border-slate-800 pt-2.5">
                    <span className="text-emerald-400 font-bold">// Response Sukses (200 OK)</span>
                    <pre className="mt-1.5 text-slate-300">{JSON.stringify({
  "success": true,
  "message": "Transaksi berhasil dibuat.",
  "data": {
    "invoice_id": "INV-20260621-009",
    "ref_id": "INV-20260621-009",
    "sku": "ML-5",
    "amount": 1450,
    "payment_status": "paid",
    "delivery_status": "completed",
    "notes": "Top-up berhasil. SN: 981726354891823",
    "sn": "981726354891823",
    "created_at": "2026-06-21T10:32:00.000000Z"
  }
}, null, 2)}</pre>
                  </div>
                </div>
              </div>

              {/* Check Status */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-green-600 text-white font-black px-2 py-0.5 rounded text-[10px] leading-none uppercase">GET</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">/api/v1/order/&#123;ref_id&#125;</span>
                </div>
                <p className="text-slate-600">Mengecek status pembayaran dan status pengiriman voucher game berdasarkan <code>ref_id</code> (Invoice ID) transaksi.</p>
                <div className="bg-slate-900 rounded-xl p-4 text-white overflow-x-auto font-mono text-[10px] space-y-3">
                  <div>
                    <span className="text-amber-400 font-bold">// HTTP Request (cURL)</span>
                    <pre className="mt-1.5 text-slate-300">curl -X GET &quot;{apiBaseUrl}/api/v1/order/INV-20260621-009&quot; \<br />  -H &quot;X-API-KEY: YOUR_API_KEY_HERE&quot;</pre>
                  </div>
                  <div className="border-t border-slate-800 pt-2.5">
                    <span className="text-emerald-400 font-bold">// Response Sukses (200 OK)</span>
                    <pre className="mt-1.5 text-slate-300">{JSON.stringify({
  "success": true,
  "data": {
    "invoice_id": "INV-20260621-009",
    "amount": 1450,
    "payment_status": "paid",
    "delivery_status": "completed",
    "notes": "Top-up berhasil. SN: 981726354891823",
    "sn": "981726354891823",
    "created_at": "2026-06-21T10:32:00.000000Z"
  }
}, null, 2)}</pre>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfileTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
      {/* Profil Info Panel */}
      <div className="md:col-span-1 bg-white border border-border p-6 rounded-2xl shadow-sm flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl font-heading mb-4">
          {user?.name.charAt(0).toUpperCase()}
        </div>
        <h3 className="font-extrabold text-foreground text-lg leading-tight">{user?.name}</h3>
        <span className="text-xs text-foreground/45 font-bold uppercase tracking-wider mt-1 block">
          {user?.role === 'admin' ? 'Administrator' : 'Pengguna Terdaftar'}
        </span>
        
        <div className="border-t border-slate-100 dark:border-slate-800 my-4 pt-4 w-full text-xs space-y-3 text-left">
          <div className="flex justify-between">
            <span className="text-slate-400">Tipe Akun:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{user?.role === 'admin' ? 'Admin' : 'Regular'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Bergabung:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Form Edit Panel */}
      <div className="md:col-span-2 bg-white border border-border p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-foreground font-heading mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
          Edit Informasi Profil
        </h2>
        
        {profileError && (
          <div className="p-3 mb-4 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-semibold">
            {profileError}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              disabled={savingProfile}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Alamat Email</span>
              <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-normal">
                Tidak Dapat Diubah
              </span>
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-sm text-foreground/45 cursor-not-allowed"
            />
            <p className="text-[10px] text-foreground/40 mt-1 italic leading-normal">
              *Email dikunci demi keamanan akun dan validasi transaksi.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-1.5">
              Password Baru (Opsional)
            </label>
            <input
              type="password"
              placeholder="Kosongkan jika tidak ingin mengubah password"
              value={profilePassword}
              onChange={(e) => setProfilePassword(e.target.value)}
              disabled={savingProfile}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="glow-button w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            >
              {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderTicketsTab = () => {
    const getStatusBadge = (status: Ticket['status']) => {
      switch (status) {
        case 'open':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 uppercase">
              Menunggu Admin
            </span>
          );
        case 'replied':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20 uppercase">
              Dibalas
            </span>
          );
        case 'closed':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 uppercase">
              Ditutup
            </span>
          );
        default:
          return null;
      }
    };

    const getCategoryLabel = (category: Ticket['category']) => {
      switch (category) {
        case 'transaksi':
          return 'Masalah Transaksi';
        case 'topup':
          return 'Top Up Saldo';
        case 'akun':
          return 'Masalah Akun';
        default:
          return 'Lainnya';
      }
    };

    if (selectedTicketId && activeTicket) {
      return (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm animate-in fade-in duration-300 flex flex-col min-h-[60vh]">
          {/* Ticket Detail Header */}
          <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-4 shrink-0 bg-slate-50">
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedTicketId(null);
                  setActiveTicket(null);
                }}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer mb-2"
              >
                &larr; Kembali ke Daftar Tiket
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-800 font-heading">
                  #{activeTicket.id} - {activeTicket.title}
                </h2>
                {getStatusBadge(activeTicket.status)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Kategori: <span className="font-bold text-slate-600">{getCategoryLabel(activeTicket.category)}</span> • Dibuat pada {new Date(activeTicket.created_at).toLocaleString('id-ID')}
              </p>
            </div>
            {activeTicket.status !== 'closed' && (
              <button
                onClick={() => handleCloseTicket(activeTicket.id)}
                className="bg-error/10 hover:bg-error/20 text-error px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                Tutup Tiket
              </button>
            )}
          </div>

          {/* Ticket Messages Thread */}
          <div className="flex-grow p-5 overflow-y-auto space-y-4 max-h-[450px] bg-slate-50/30">
            {loadingTicketDetail ? (
              <div className="flex justify-center items-center py-10">
                <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : (
              activeTicket.messages?.map((msg) => {
                const isAdminMsg = msg.sender?.role === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdminMsg ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className="max-w-[80%] flex flex-col space-y-1">
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed font-sans shadow-xs ${
                          isAdminMsg
                            ? 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                            : 'bg-primary text-white rounded-tr-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span
                        className={`text-[9px] text-slate-400 px-1 font-mono ${
                          isAdminMsg ? 'text-left' : 'text-right'
                        }`}
                      >
                        {isAdminMsg ? 'Admin' : 'Anda'} • {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ticket Messages Input */}
          <div className="p-4 border-t border-border bg-white shrink-0">
            {activeTicket.status === 'closed' ? (
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs font-semibold text-slate-500">
                Tiket ini telah ditutup. Kirim pesan di bawah untuk membuka kembali tiket bantuan ini.
              </div>
            ) : null}

            <form onSubmit={handleReplyTicketSubmit} className="mt-3 flex items-stretch gap-2">
              <input
                type="text"
                placeholder="Tulis pesan balasan Anda..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                disabled={ticketReplySubmitting}
                className="flex-grow px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-200 focus:border-primary text-slate-800 font-medium placeholder-slate-400"
                required
              />
              <button
                type="submit"
                disabled={ticketReplySubmitting || !ticketMessage.trim()}
                className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-xs px-5 rounded-xl transition-all border-0 cursor-pointer flex items-center justify-center shrink-0"
              >
                {ticketReplySubmitting ? 'Mengirim...' : 'Kirim'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (showNewTicketForm) {
      return (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 font-heading">Buat Tiket Bantuan Baru</h2>
              <p className="text-[11px] text-slate-400">Ajukan pertanyaan atau laporkan masalah Anda</p>
            </div>
            <button
              onClick={() => setShowNewTicketForm(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
            >
              Batal
            </button>
          </div>

          <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1.5">
                Kategori Masalah
              </label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700 font-bold"
              >
                <option value="transaksi">Masalah Transaksi</option>
                <option value="topup">Top Up Saldo</option>
                <option value="akun">Masalah Akun</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1.5">
                Subjek / Judul Tiket
              </label>
              <input
                type="text"
                placeholder="Contoh: Saldo belum masuk / Invoice YOI-XXXX"
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 font-bold placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1.5">
                Isi Pesan Detail
              </label>
              <textarea
                rows={4}
                placeholder="Jelaskan kendala Anda secara rinci agar admin dapat membantu dengan cepat..."
                value={ticketInitialMsg}
                onChange={(e) => setTicketInitialMsg(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 font-medium placeholder-slate-400 resize-none font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={ticketSubmitting}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md shadow-primary/10 border-0 cursor-pointer"
            >
              {ticketSubmitting ? 'Membuat Tiket...' : 'Kirim Tiket Bantuan'}
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm animate-in fade-in duration-300">
        <div className="p-5 border-b border-border flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground font-heading">Tiket Bantuan Saya</h2>
            <p className="text-[11px] text-foreground/45 mt-0.5">Ajukan bantuan atau keluhan langsung ke Customer Support</p>
          </div>
          <button
            onClick={() => setShowNewTicketForm(true)}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/10 border-0 cursor-pointer active:scale-95"
          >
            Buat Tiket Baru
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="font-bold text-slate-700 text-xs font-heading">Belum Ada Tiket Bantuan</h3>
            <p className="text-[10px] text-slate-400 mt-1">Anda tidak memiliki tiket aduan aktif saat ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-border text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Tiket ID</th>
                  <th className="px-5 py-3">Subjek / Judul</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Tanggal Update</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => handleSelectTicket(t.id)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-primary">
                      #{t.id}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700 max-w-xs truncate">
                      {t.title}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-500">
                      {getCategoryLabel(t.category)}
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-medium">
                      {new Date(t.updated_at).toLocaleDateString('id-ID', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      {getStatusBadge(t.status)}
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

  return (
    <div className="bg-slate-50 py-8 min-h-screen">
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
            
            {/* Mobile Navigation Dropdown (Burger Style) */}
            <div className="md:hidden w-full relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-full flex items-center justify-between bg-white border border-border px-4 py-3 rounded-xl shadow-sm text-xs font-bold text-foreground hover:bg-slate-50 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-slate-400">Navigasi:</span>
                  <span className="text-primary font-black uppercase">
                    {activeTab === 'dashboard' && 'Dashboard'}
                    {activeTab === 'topup' && 'Isi Saldo'}
                    {activeTab === 'transactions' && 'Riwayat Transaksi'}
                    {activeTab === 'topup_history' && 'Riwayat Isi Saldo'}
                    {activeTab === 'balance_history' && 'Riwayat Saldo'}
                    {activeTab === 'profile' && 'Profil'}
                    {activeTab === 'developer' && 'API Developer'}
                    {activeTab === 'tickets' && 'Tiket Bantuan'}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <svg className={`w-4 h-4 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {menuOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-1 space-y-1">
                    {[
                      { key: 'dashboard', name: 'Dashboard' },
                      { key: 'topup', name: 'Isi Saldo' },
                      { key: 'transactions', name: 'Riwayat Transaksi' },
                      { key: 'topup_history', name: 'Riwayat Isi Saldo' },
                      { key: 'balance_history', name: 'Riwayat Saldo' },
                      { key: 'profile', name: 'Profil' },
                      { key: 'developer', name: 'API Developer' },
                      { key: 'tickets', name: 'Tiket Bantuan' }
                    ].map((tab) => {
                      const isSelected = activeTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => {
                            setActiveTab(tab.key as any);
                            setMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary/5 text-primary font-black'
                              : 'text-slate-500 hover:text-foreground hover:bg-slate-50'
                          }`}
                        >
                          <span>{tab.name}</span>
                          {tab.key === 'tickets' && repliedTicketsCount > 0 && (
                            <span className="w-4 h-4 bg-error text-white font-extrabold rounded-full flex items-center justify-center text-[9px] scale-95 shrink-0 animate-pulse">
                              {repliedTicketsCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                    <button
                      onClick={() => setActiveTab('balance_history')}
                      className={`w-full flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg text-left bg-transparent border-0 cursor-pointer ${
                        activeTab === 'balance_history'
                          ? 'bg-primary/5 text-primary font-bold'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                      <span>Riwayat Saldo</span>
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

              <button
                onClick={() => setActiveTab('developer')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 border-t-0 border-r-0 border-b-0 text-left bg-transparent ${
                  activeTab === 'developer'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>API Developer</span>
              </button>

              <button
                onClick={() => setActiveTab('tickets')}
                className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 border-t-0 border-r-0 border-b-0 text-left bg-transparent ${
                  activeTab === 'tickets'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span>Tiket Bantuan</span>
                </div>
                {repliedTicketsCount > 0 && (
                  <span className="w-4 h-4 bg-error text-white font-extrabold rounded-full flex items-center justify-center text-[9px] scale-95 shrink-0 animate-pulse">
                    {repliedTicketsCount}
                  </span>
                )}
              </button>
            </div>
          </aside>

          {/* Main Content Pane */}
          <main className="flex-grow w-full overflow-hidden">
            {activeTab === 'dashboard' && renderDashboardTab()}
            {activeTab === 'transactions' && renderTransactionsTab()}
            {activeTab === 'topup' && renderTopupTab()}
            {activeTab === 'topup_history' && renderTopupHistoryTab()}
            {activeTab === 'balance_history' && renderBalanceHistoryTab()}
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'developer' && renderDeveloperTab()}
            {activeTab === 'tickets' && renderTicketsTab()}
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
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Atas Nama (a.n)</span>
                        <span className="font-bold text-slate-800 text-xs">{method?.account_name}</span>
                      </div>
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
                      {tx.nickname && (
                        <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/50 text-emerald-600 dark:text-emerald-400">
                          <span className="text-slate-400">Nickname Akun</span>
                          <span className="font-extrabold text-xs text-right">{tx.nickname}</span>
                        </div>
                      )}
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

        {/* Custom Confirmation Modal (No Emotes) */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl border border-border p-5 animate-in zoom-in-95 duration-200 text-center flex flex-col items-center">
              {/* Visual Icon - Key SVG */}
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-9 5a3 3 0 11-6 0 3 3 0 016 0zM19 9a3 3 0 11-6 0 3 3 0 016 0zM4 11h16m-2 4h.01M4 15h.01" />
                </svg>
              </div>
              <h4 className="text-xs font-extrabold text-slate-800 font-heading mt-3 uppercase tracking-wider">
                {confirmModal.title}
              </h4>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed font-sans">
                {confirmModal.message}
              </p>
              <div className="flex items-center justify-center space-x-2.5 mt-5 w-full">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-wider cursor-pointer flex-1 bg-transparent"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2.5 rounded-lg bg-primary text-white text-[10px] font-bold hover:bg-primary-hover active:bg-primary-dark transition-all uppercase tracking-wider cursor-pointer flex-1 border-0"
                >
                  Setuju
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nota Modal Popup (Cetak Struk) */}
      {notaModalTransaction && (() => {
        const tx = notaModalTransaction;
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-border p-6 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-foreground font-heading flex items-center gap-1.5">
                    <span>📥 Buat & Unduh Nota Belanja</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium font-sans">Kustomisasi nama toko dan harga jual untuk pembeli Anda.</p>
                </div>
                <button
                  onClick={() => setNotaModalTransaction(null)}
                  className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto flex-grow pr-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Editor Forms */}
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1.5 tracking-wider">
                        Nama Toko Anda
                      </label>
                      <input
                        type="text"
                        value={customShopName}
                        onChange={(e) => handleShopNameChange(e.target.value)}
                        placeholder={webName}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans font-medium"
                      />
                      <p className="text-[9px] text-slate-400 mt-1.5 leading-snug">
                        Jika kosong, otomatis memakai nama default: <span className="font-semibold">{webName}</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1.5 tracking-wider">
                        Harga Jual di Nota (Rp)
                      </label>
                      <input
                        type="number"
                        value={customPrice === '' ? '' : customPrice}
                        onChange={(e) => setCustomPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder={tx.amount.toString()}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans font-bold"
                      />
                      <p className="text-[9px] text-slate-400 mt-1.5 leading-snug">
                        Harga beli Anda: <span className="font-semibold">{formatPrice(tx.amount)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-foreground/45 mb-3 tracking-wider">Live Preview Struk (80mm)</span>
                    
                    <div ref={receiptRef} className="w-full max-w-[240px] bg-white text-black p-4 rounded-xl shadow-md border border-slate-200/60 font-mono text-[9px] leading-relaxed flex flex-col items-center">
                      <div className="font-bold text-xs uppercase text-center tracking-tight leading-tight w-full break-words">
                        {customShopName || webName}
                      </div>
                      <div className="text-[8px] text-slate-500 uppercase mt-0.5 text-center">Struk Pembelian Game</div>
                      
                      <div className="w-full border-t border-dashed border-slate-300 my-1.5" />
                      
                      <div className="w-full text-left space-y-0.5 text-[8px]">
                        <div className="flex justify-between">
                          <span>No. Invoice:</span>
                          <span className="font-bold">{tx.invoice_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tanggal:</span>
                          <span>{new Date(tx.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-bold text-emerald-600">{tx.payment_status === 'paid' ? 'LUNAS' : 'PENDING'}</span>
                        </div>
                      </div>
                      
                      <div className="w-full border-t border-dashed border-slate-300 my-1.5" />
                      
                      <div className="w-full text-left space-y-0.5 text-[8px]">
                        <div className="font-bold uppercase tracking-tight break-words">{tx.game?.name}</div>
                        <div className="flex justify-between text-slate-600 pl-1.5">
                          <span className="break-words">- {tx.product?.name}</span>
                          <span className="shrink-0 ml-2">1x</span>
                        </div>
                        <div className="pl-1.5 text-slate-700">
                          <span>ID: {tx.target_id} {tx.target_zone ? `(${tx.target_zone})` : ''}</span>
                        </div>
                        {tx.nickname && (
                          <div className="pl-1.5 italic text-slate-500">
                            <span>Nick: {tx.nickname}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="w-full border-t border-dashed border-slate-300 my-1.5" />
                      
                      <div className="w-full flex justify-between font-bold text-[10px] pt-0.5">
                        <span>TOTAL:</span>
                        <span>{formatPrice(customPrice || 0)}</span>
                      </div>
                      
                      <div className="w-full border-t border-dashed border-slate-300 my-1.5" />
                      
                      <div className="text-[8px] text-slate-500 uppercase mt-0.5 font-bold">Terima Kasih</div>
                      <div className="text-[7px] text-slate-400 text-center">Struk ini adalah bukti pembayaran sah</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 border-t border-slate-100 pt-4 mt-4 shrink-0 font-sans">
                <button
                  type="button"
                  onClick={() => setNotaModalTransaction(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider cursor-pointer border-0 transition-all text-center"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={downloadReceiptImage}
                  disabled={downloadingImage}
                  className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-slate-200 text-white font-bold text-xs uppercase tracking-wider cursor-pointer border-0 transition-all text-center shadow-md shadow-primary/10 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{downloadingImage ? 'Mengunduh...' : 'Unduh Gambar Nota (PNG)'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
