'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, Transaction, AdminStats, User, TopupMethod, TopupRequest, Voucher, Announcement, Game, getAssetUrl, Ticket, TicketMessage, BalanceHistory } from '@/services/api';
import Link from 'next/link';

type TabType = 'summary' | 'users' | 'products' | 'settings' | 'topup_requests' | 'topup_methods' | 'games' | 'web_settings' | 'vouchers' | 'announcements' | 'flash_sales' | 'digiflazz_topup' | 'tickets' | 'midtrans' | 'turnstile' | 'google';

const CATEGORIES = [
  { id: 'games', name: 'Game Voucher' },
  { id: 'pln', name: 'Token PLN' },
  { id: 'pulsa', name: 'Pulsa & Data' },
  { id: 'ewallet', name: 'E-Wallet' },
  { id: 'streaming', name: 'Voucher & Streaming' }
];

const getCategoryKey = (slug: string): string => {
  const s = (slug || '').toLowerCase();
  if (s === 'pln') return 'pln';
  if (['dana', 'go-pay', 'linkaja', 'mandiri-e-toll', 'ovo', 'shopee-pay'].includes(s)) return 'ewallet';
  if (['axis', 'byu', 'indosat', 'smartfren', 'telkomsel', 'tri', 'xl'].includes(s)) return 'pulsa';
  if (['garena', 'google-play-indonesia', 'google-play-us-region', 'riot-cash', 'steam-wallet-idr', 'unipin-voucher', 'vidio', 'wetv', 'wifi-id', 'xbox'].includes(s)) return 'streaming';
  return 'games';
};

export default function AdminDashboard() {
  const { user: currentUser, isAdmin, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Navigation state
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [menuOpen, setMenuOpen] = useState(false);

  // Loading & Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [failingTxId, setFailingTxId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [uploadingGameId, setUploadingGameId] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
          
  // Search & Filters state
  const [txSearch, setTxSearch] = useState('');
  const [txStatus, setTxStatus] = useState('all');
  
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productGameFilter, setProductGameFilter] = useState('all');
  const [gameSearch, setGameSearch] = useState('all');

  // User CRUD Modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    balance: 0
  });
  const [userFormErrors, setUserFormErrors] = useState<any>({});
  const [userModalSubmitting, setUserModalSubmitting] = useState(false);

  // User Balance History Modal state
  const [adminUserBalanceHistoryModalOpen, setAdminUserBalanceHistoryModalOpen] = useState(false);
  const [selectedBalanceHistories, setSelectedBalanceHistories] = useState<BalanceHistory[]>([]);
  const [balanceHistoryUser, setBalanceHistoryUser] = useState<User | null>(null);
  const [loadingBalanceHistory, setLoadingBalanceHistory] = useState(false);

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    digiflazz_username: '',
    digiflazz_api_key: '',
    digiflazz_mode: 'development',
    global_markup_type: 'percent',
    global_markup_value: 10,
    midtrans_server_key: '',
    midtrans_client_key: '',
    midtrans_mode: 'sandbox',
    midtrans_is_active: false,
    turnstile_enabled: false,
    turnstile_site_key: '',
    turnstile_secret_key: '',
    google_login_enabled: false,
    google_client_id: ''
  });

  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);
  const [webNameForm, setWebNameForm] = useState('YOI Store');
  const [webSettingsSubmitting, setWebSettingsSubmitting] = useState(false);
  const [footerDescForm, setFooterDescForm] = useState('');
  const [footerWAForm, setFooterWAForm] = useState('');
  const [footerEmailForm, setFooterEmailForm] = useState('');
  const [footerHoursForm, setFooterHoursForm] = useState('');
  const [digiflazzBalance, setDigiflazzBalance] = useState<number | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [serverIp, setServerIp] = useState<string>('');
  const [copiedIp, setCopiedIp] = useState(false);

  // Digiflazz Deposit states
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositBank, setDepositBank] = useState<string>('BCA');
  const [depositOwnerName, setDepositOwnerName] = useState<string>('');
  const [depositSubmitting, setDepositSubmitting] = useState<boolean>(false);
  const [depositTicket, setDepositTicket] = useState<{
    bank: string;
    payment_method: string;
    account_no: string;
    notes: string;
    amount: number;
  } | null>(null);
  const [copiedDepositNotes, setCopiedDepositNotes] = useState<boolean>(false);
  const [copiedDepositAmount, setCopiedDepositAmount] = useState<boolean>(false);
  const [copiedDepositAccount, setCopiedDepositAccount] = useState<boolean>(false);
  const [depositHistory, setDepositHistory] = useState<any[]>([]);

  // Voucher management states
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'flat',
    discount_value: 0,
    min_transaction: 0,
    max_discount: '' as string | number,
    quota: 0,
    is_active: true
  });
  const [voucherSubmitting, setVoucherSubmitting] = useState(false);
  const [voucherFormErrors, setVoucherFormErrors] = useState<any>({});

  // Announcement management states
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    subtitle: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'danger',
    type_label: '',
    is_active: true
  });
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [announcementFormErrors, setAnnouncementFormErrors] = useState<any>({});

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  // Support Tickets Admin states
  const [adminTickets, setAdminTickets] = useState<Ticket[]>([]);
  const [selectedAdminTicketId, setSelectedAdminTicketId] = useState<number | null>(null);
  const [activeAdminTicket, setActiveAdminTicket] = useState<Ticket | null>(null);
  const [adminTicketReply, setAdminTicketReply] = useState('');
  const [adminReplySubmitting, setAdminReplySubmitting] = useState(false);
  const [loadingAdminTicketDetail, setLoadingAdminTicketDetail] = useState(false);
  const [adminTicketFilter, setAdminTicketFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('all');
  const [adminTicketSearch, setAdminTicketSearch] = useState('');

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' | 'success' = 'info') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    });
  };

  const showAlert = (title: string, message: string, type: 'danger' | 'warning' | 'info' | 'success' = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };


  // Product Edit Modal / State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productForm, setProductForm] = useState<{
    markup_type: string;
    markup_value: number;
    is_available: boolean;
    flash_sale_price: string;
  }>({
    markup_type: 'global',
    markup_value: 0,
    is_available: true,
    flash_sale_price: ''
  });
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);

  // Game Edit Modal / State
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameModalOpen, setGameModalOpen] = useState(false);
  const [gameForm, setGameForm] = useState({
    is_active: true,
    flash_sale_end: ''
  });
  const [gameSubmitting, setGameSubmitting] = useState(false);
  const [gameFormErrors, setGameFormErrors] = useState<any>({});

  // Flash Sale Edit Modal / State
  const [editingFlashSaleProduct, setEditingFlashSaleProduct] = useState<any | null>(null);
  const [flashSaleForm, setFlashSaleForm] = useState({ price: '', end: '' });
  const [flashSaleSubmitting, setFlashSaleSubmitting] = useState(false);
  const [flashSaleFormErrors, setFlashSaleFormErrors] = useState<any>({});

  // Topup States
  const [adminTopupRequests, setAdminTopupRequests] = useState<TopupRequest[]>([]);
  const [adminTopupMethods, setAdminTopupMethods] = useState<TopupMethod[]>([]);
  const [topupRequestSearch, setTopupRequestSearch] = useState('');
  const [topupRequestStatus, setTopupRequestStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  const [topupMethodModalOpen, setTopupMethodModalOpen] = useState(false);
  const [editingTopupMethod, setEditingTopupMethod] = useState<TopupMethod | null>(null);
  const [topupMethodForm, setTopupMethodForm] = useState({
    name: '',
    account_number: '',
    account_name: '',
    min_amount: 0,
    is_active: true
  });
  const [topupMethodSubmitting, setTopupMethodSubmitting] = useState(false);
  const [topupMethodFormErrors, setTopupMethodFormErrors] = useState<any>({});
  const [approvingRequestId, setApprovingRequestId] = useState<number | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);

  const pendingTicketsCount = adminTickets.filter(t => t.status === 'open').length;

  // Check auth
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  // Load Initial Data
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadAllData();
    }
  }, [isAuthenticated, isAdmin]);

  async function loadAllData() {
    setFetching(true);
    setError('');
    try {
      const [statsData, txsData, usersData, productsData, settingsData, topupRequestsData, topupMethodsData, publicSettingsData, gamesData, vouchersData, announcementsData, depositsData, ticketsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminTransactions(),
        api.getUsers(),
        api.getAdminProducts(),
        api.getAdminSettings(),
        api.getAdminTopupRequests(),
        api.getAdminTopupMethods(),
        api.getPublicSettings(),
        api.getAdminGames(),
        api.getAdminVouchers(),
        api.getAdminAnnouncements(),
        api.getDigiflazzDeposits().catch(() => []),
        api.getAdminTickets().catch(() => [])
      ]);
      
      setStats(statsData);
      setTransactions(txsData);
      setUsers(usersData);
      setProducts(productsData);
      setGames(gamesData || []);
      setSettingsForm({
        digiflazz_username: settingsData.digiflazz_username || '',
        digiflazz_api_key: settingsData.digiflazz_api_key || '',
        digiflazz_mode: settingsData.digiflazz_mode || 'development',
        global_markup_type: settingsData.global_markup_type || 'percent',
        global_markup_value: parseFloat(settingsData.global_markup_value) || 0,
        midtrans_server_key: settingsData.midtrans_server_key || '',
        midtrans_client_key: settingsData.midtrans_client_key || '',
        midtrans_mode: settingsData.midtrans_mode || 'sandbox',
        midtrans_is_active: settingsData.midtrans_is_active ?? false,
        turnstile_enabled: settingsData.turnstile_enabled ?? false,
        turnstile_site_key: settingsData.turnstile_site_key || '',
        turnstile_secret_key: settingsData.turnstile_secret_key || '',
        google_login_enabled: settingsData.google_login_enabled ?? false,
        google_client_id: settingsData.google_client_id || ''
      });
      setBrandLogo(publicSettingsData?.brand_logo || null);
      setFavicon(publicSettingsData?.favicon || null);
      setWebNameForm(publicSettingsData?.web_name || 'YOI Store');
      setFooterDescForm(publicSettingsData?.footer_description || '');
      setFooterWAForm(publicSettingsData?.footer_whatsapp || '');
      setFooterEmailForm(publicSettingsData?.footer_email || '');
      setFooterHoursForm(publicSettingsData?.footer_working_hours || '');
      setServerIp(settingsData.server_ip || 'Gagal memuat IP');
      setAdminTopupRequests(topupRequestsData);
      setAdminTopupMethods(topupMethodsData);
      setVouchers(vouchersData || []);
      setAnnouncements(announcementsData || []);
      setDepositHistory(depositsData || []);
      setAdminTickets(ticketsData || []);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data administrator.');
    } finally {
      setFetching(false);
    }
  }

  const handleSelectAdminTicket = async (id: number) => {
    setSelectedAdminTicketId(id);
    setLoadingAdminTicketDetail(true);
    setError('');
    try {
      const data = await api.getAdminTicket(id);
      setActiveAdminTicket(data);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat detail tiket bantuan.');
    } finally {
      setLoadingAdminTicketDetail(false);
    }
  };

  const handleAdminReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTicketReply.trim() || !selectedAdminTicketId) return;

    setAdminReplySubmitting(true);
    try {
      await api.replyAdminTicket(selectedAdminTicketId, adminTicketReply.trim());
      setAdminTicketReply('');
      
      // Reload ticket detail
      const updatedTicket = await api.getAdminTicket(selectedAdminTicketId);
      setActiveAdminTicket(updatedTicket);
      
      // Reload list of tickets to update order/status
      const ticketList = await api.getAdminTickets();
      setAdminTickets(ticketList);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal membalas tiket bantuan.');
    } finally {
      setAdminReplySubmitting(false);
    }
  };

  const handleAdminCloseTicket = async (id: number, status: 'closed' | 'open') => {
    setConfirmModal({
      isOpen: true,
      title: status === 'closed' ? 'Tutup Tiket' : 'Buka Kembali Tiket',
      message: `Apakah Anda yakin ingin ${status === 'closed' ? 'menutup' : 'membuka kembali'} tiket bantuan ini?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await api.closeAdminTicket(id, status);
          setSuccessMsg(`Status tiket berhasil diubah menjadi ${status === 'closed' ? 'Ditutup' : 'Terbuka'}.`);
          
          // Reload ticket detail and list
          const updatedTicket = await api.getAdminTicket(id);
          setActiveAdminTicket(updatedTicket);
          const ticketList = await api.getAdminTickets();
          setAdminTickets(ticketList);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal mengubah status tiket.');
        }
      },
      type: 'warning'
    });
  };

  // Auto-dismiss alert messages
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

  // Digiflazz Balance Check
  const handleCheckBalance = async () => {
    setCheckingBalance(true);
    setDigiflazzBalance(null);
    try {
      const res = await api.getDigiflazzBalance();
      if (res.success) {
        setDigiflazzBalance(res.balance);
        setSuccessMsg(res.message || 'Saldo berhasil diperbarui.');
      } else {
        setError(res.message || 'Gagal mengecek saldo.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal terhubung ke server.');
    } finally {
      setCheckingBalance(false);
    }
  };

  // Digiflazz Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSubmitting(true);
    try {
      const res = await api.updateAdminSettings(settingsForm);
      if (res.success) {
        setSuccessMsg('Pengaturan Digiflazz berhasil disimpan.');
        handleCheckBalance();
      } else {
        setError(res.message || 'Gagal menyimpan pengaturan.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // Midtrans Settings Save
  const handleSaveMidtransSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSubmitting(true);
    try {
      const res = await api.updateAdminSettings(settingsForm);
      if (res.success) {
        setSuccessMsg('Konfigurasi Midtrans berhasil disimpan.');
      } else {
        setError(res.message || 'Gagal menyimpan konfigurasi.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan konfigurasi.');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // Turnstile Settings Save
  const handleSaveTurnstileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSubmitting(true);
    try {
      const res = await api.updateAdminSettings(settingsForm);
      if (res.success) {
        setSuccessMsg('Konfigurasi Cloudflare Turnstile berhasil disimpan.');
      } else {
        setError(res.message || 'Gagal menyimpan konfigurasi Turnstile.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan konfigurasi Turnstile.');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // Google Settings Save
  const handleSaveGoogleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSubmitting(true);
    try {
      const res = await api.updateAdminSettings(settingsForm);
      if (res.success) {
        setSuccessMsg('Konfigurasi Google Login berhasil disimpan.');
      } else {
        setError(res.message || 'Gagal menyimpan konfigurasi Google.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan konfigurasi Google.');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // Web Settings Save
  const handleSaveWebSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebSettingsSubmitting(true);
    try {
      const res = await api.updateWebSettings({ 
        web_name: webNameForm,
        footer_description: footerDescForm,
        footer_whatsapp: footerWAForm,
        footer_email: footerEmailForm,
        footer_working_hours: footerHoursForm,
      });
      if (res.success) {
        setSuccessMsg('Konfigurasi identitas website dan footer berhasil disimpan.');
        window.dispatchEvent(new Event('webNameUpdated'));
      } else {
        setError(res.message || 'Gagal menyimpan identitas website.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan identitas website.');
    } finally {
      setWebSettingsSubmitting(false);
    }
  };

  const handleCopyIp = () => {
    if (!serverIp) return;
    navigator.clipboard.writeText(serverIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const handleRequestDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || parseInt(depositAmount) < 200000) {
      setError('Nominal deposit minimal adalah Rp 200.000');
      return;
    }
    if (!depositOwnerName.trim()) {
      setError('Nama pemilik rekening pengirim wajib diisi');
      return;
    }

    setDepositSubmitting(true);
    try {
      const res = await api.requestDigiflazzDeposit({
        amount: parseInt(depositAmount),
        bank: depositBank,
        owner_name: depositOwnerName,
      });
      if (res.success && res.data) {
        setDepositTicket(res.data);
        setSuccessMsg('Tiket deposit berhasil dibuat. Silakan lakukan transfer.');
        
        // Refresh deposit history
        const historyData = await api.getDigiflazzDeposits().catch(() => []);
        setDepositHistory(historyData);
      } else {
        setError(res.message || 'Gagal membuat tiket deposit.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan koneksi.');
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleCopyText = (text: string, type: 'notes' | 'amount' | 'account') => {
    navigator.clipboard.writeText(text);
    if (type === 'notes') {
      setCopiedDepositNotes(true);
      setTimeout(() => setCopiedDepositNotes(false), 2000);
    } else if (type === 'amount') {
      setCopiedDepositAmount(true);
      setTimeout(() => setCopiedDepositAmount(false), 2000);
    } else if (type === 'account') {
      setCopiedDepositAccount(true);
      setTimeout(() => setCopiedDepositAccount(false), 2000);
    }
  };


  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await api.uploadBrandLogo(formData);
      if (res.success) {
        setBrandLogo(res.data.brand_logo);
        setSuccessMsg('Logo brand berhasil diunggah!');
        window.dispatchEvent(new Event('brandLogoUpdated'));
      }
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal Unggah Logo', err.message || 'Gagal mengunggah logo brand.', 'danger');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaviconUploading(true);
    const formData = new FormData();
    formData.append('favicon', file);

    try {
      const res = await api.uploadFavicon(formData);
      if (res.success) {
        setFavicon(res.data.favicon);
        setSuccessMsg('Favicon website berhasil diunggah!');
        window.dispatchEvent(new Event('faviconUpdated'));
      }
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal Unggah Favicon', err.message || 'Gagal mengunggah favicon website.', 'danger');
    } finally {
      setFaviconUploading(false);
      e.target.value = '';
    }
  };

  // User CRUD Functions
  const handleOpenUserModal = (userToEdit: User | null = null) => {
    setEditingUser(userToEdit);
    setUserFormErrors({});
    if (userToEdit) {
      setUserForm({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        role: userToEdit.role,
        balance: parseFloat(userToEdit.balance) || 0
      });
    } else {
      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        balance: 0
      });
    }
    setUserModalOpen(true);
  };

  const handleOpenBalanceHistory = async (user: User) => {
    setBalanceHistoryUser(user);
    setLoadingBalanceHistory(true);
    setAdminUserBalanceHistoryModalOpen(true);
    try {
      const data = await api.getAdminUserBalanceHistory(user.id);
      setSelectedBalanceHistories(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat riwayat saldo.');
    } finally {
      setLoadingBalanceHistory(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalSubmitting(true);
    setUserFormErrors({});
    try {
      if (editingUser) {
        const payload: any = {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          balance: userForm.balance
        };
        if (userForm.password) {
          payload.password = userForm.password;
        }
        await api.updateUser(editingUser.id, payload);
        setSuccessMsg('Pengguna berhasil diperbarui.');
      } else {
        if (!userForm.password) {
          setUserFormErrors({ password: 'Password wajib diisi untuk pengguna baru' });
          setUserModalSubmitting(false);
          return;
        }
        await api.createUser(userForm);
        setSuccessMsg('Pengguna baru berhasil ditambahkan.');
      }
      setUserModalOpen(false);
      const usersList = await api.getUsers();
      setUsers(usersList);
    } catch (err: any) {
      console.error(err);
      if (err.errors) {
        setUserFormErrors(err.errors);
      } else {
        setError(err.message || 'Operasi gagal.');
      }
    } finally {
      setUserModalSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (userId === currentUser?.id) {
      setError('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }

    showConfirm(
      'Hapus Pengguna',
      'Apakah Anda yakin ingin menghapus pengguna ini? Semua data terkait mungkin akan ikut terhapus.',
      async () => {
        try {
          await api.deleteUser(userId);
          setSuccessMsg('Pengguna berhasil dihapus.');
          const usersList = await api.getUsers();
          setUsers(usersList);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal menghapus pengguna.');
        }
      },
      'danger'
    );
  };

  // Topup Action Handlers
  const handleApproveTopup = async (id: number) => {
    showConfirm(
      'Setujui Permintaan Topup',
      'Apakah Anda yakin ingin menyetujui permintaan isi saldo ini? Saldo pengguna akan otomatis bertambah.',
      async () => {
        setApprovingRequestId(id);
        try {
          await api.approveTopupRequest(id);
          setSuccessMsg('Permintaan isi saldo disetujui, saldo pengguna telah dikreditkan.');
          const [requests, statsData, usersList] = await Promise.all([
            api.getAdminTopupRequests(),
            api.getAdminStats(),
            api.getUsers()
          ]);
          setAdminTopupRequests(requests);
          setStats(statsData);
          setUsers(usersList);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal menyetujui permintaan isi saldo.');
        } finally {
          setApprovingRequestId(null);
        }
      },
      'success'
    );
  };

  const handleRejectTopup = async (id: number) => {
    showConfirm(
      'Tolak Permintaan Topup',
      'Apakah Anda yakin ingin menolak permintaan isi saldo ini?',
      async () => {
        setRejectingRequestId(id);
        try {
          await api.rejectTopupRequest(id);
          setSuccessMsg('Permintaan isi saldo telah ditolak.');
          const requests = await api.getAdminTopupRequests();
          setAdminTopupRequests(requests);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal menolak permintaan isi saldo.');
        } finally {
          setRejectingRequestId(null);
        }
      },
      'danger'
    );
  };

  const handleFailTransaction = async (invoiceId: string) => {
    setFailingTxId(invoiceId);
    try {
      const res = await api.failAdminTransaction(invoiceId);
      setSelectedTxForDetail(res);
      setSuccessMsg('Status pengiriman berhasil diubah menjadi Gagal.');
      
      // Refresh transactions and admin stats in background
      const [statsData, txsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminTransactions()
      ]);
      setStats(statsData);
      setTransactions(txsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengubah status transaksi.');
    } finally {
      setFailingTxId(null);
    }
  };

  const handleOpenMethodModal = (method: TopupMethod | null = null) => {
    setEditingTopupMethod(method);
    setTopupMethodFormErrors({});
    if (method) {
      setTopupMethodForm({
        name: method.name,
        account_number: method.account_number,
        account_name: method.account_name,
        min_amount: parseFloat(method.min_amount) || 0,
        is_active: !!method.is_active
      });
    } else {
      setTopupMethodForm({
        name: '',
        account_number: '',
        account_name: '',
        min_amount: 10000,
        is_active: true
      });
    }
    setTopupMethodModalOpen(true);
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopupMethodSubmitting(true);
    setTopupMethodFormErrors({});
    try {
      if (editingTopupMethod) {
        await api.updateAdminTopupMethod(editingTopupMethod.id, topupMethodForm);
        setSuccessMsg('Metode pembayaran berhasil diperbarui.');
      } else {
        await api.createAdminTopupMethod(topupMethodForm);
        setSuccessMsg('Metode pembayaran baru berhasil ditambahkan.');
      }
      setTopupMethodModalOpen(false);
      const methods = await api.getAdminTopupMethods();
      setAdminTopupMethods(methods);
    } catch (err: any) {
      console.error(err);
      if (err.errors) {
        setTopupMethodFormErrors(err.errors);
      } else {
        setError(err.message || 'Gagal menyimpan metode pembayaran.');
      }
    } finally {
      setTopupMethodSubmitting(false);
    }
  };

  const handleDeleteMethod = async (id: number) => {
    showConfirm(
      'Hapus Metode Transfer',
      'Apakah Anda yakin ingin menghapus metode pembayaran ini?',
      async () => {
        try {
          await api.deleteAdminTopupMethod(id);
          setSuccessMsg('Metode pembayaran berhasil dihapus.');
          const methods = await api.getAdminTopupMethods();
          setAdminTopupMethods(methods);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal menghapus metode pembayaran.');
        }
      },
      'danger'
    );
  };

  // Product Sync & Update Functions
  const handleSyncProducts = async () => {
    setSyncingProducts(true);
    try {
      const res = await api.syncDigiflazzProducts();
      setSuccessMsg(res.message || 'Sinkronisasi produk berhasil.');
      const productsList = await api.getAdminProducts();
      setProducts(productsList);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyinkronkan produk.');
    } finally {
      setSyncingProducts(false);
    }
  };

  // Bulk Markup state
  const [bulkForm, setBulkForm] = useState({
    game_id: 'all',
    markup_type: 'global',
    markup_value: 0
  });
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const handleBulkUpdateMarkup = async (e: React.FormEvent) => {
    e.preventDefault();
    showConfirm(
      'Perbarui Margin Keuntungan Massal',
      'Apakah Anda yakin ingin memperbarui keuntungan (markup) untuk produk terpilih secara massal? Tindakan ini akan memicu kalkulasi ulang harga jual pelanggan.',
      async () => {
        setBulkSubmitting(true);
        try {
          const res = await api.bulkUpdateAdminProductsMarkup({
            game_id: bulkForm.game_id,
            markup_type: bulkForm.markup_type,
            markup_value: bulkForm.markup_value
          });
          if (res.success) {
            setSuccessMsg(res.message || 'Pembaruan massal berhasil.');
            const productsList = await api.getAdminProducts();
            setProducts(productsList);
          } else {
            setError(res.message || 'Gagal memperbarui massal.');
          }
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal terhubung ke server.');
        } finally {
          setBulkSubmitting(false);
        }
      },
      'warning'
    );
  };

  const handleOpenProductEdit = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      markup_type: product.markup_type || 'global',
      markup_value: parseFloat(product.markup_value) || 0,
      is_available: !!product.is_available,
      flash_sale_price: product.flash_sale_price ? product.flash_sale_price.toString() : ''
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setProductSubmitting(true);
    try {
      await api.updateAdminProduct(editingProduct.id, productForm);
      setSuccessMsg('Produk berhasil diperbarui.');
      setEditingProduct(null);
      const productsList = await api.getAdminProducts();
      setProducts(productsList);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memperbarui produk.');
    } finally {
      setProductSubmitting(false);
    }
  };

  const calculatePreviewPrice = () => {
    if (!editingProduct) return 0;
    const cost = parseFloat(editingProduct.original_price) || 0;
    let type = productForm.markup_type;
    let val = productForm.markup_value;
    if (type === 'global') {
      type = settingsForm.global_markup_type;
      val = settingsForm.global_markup_value;
    }
    if (type === 'percent') {
      return Math.ceil(cost + (cost * val / 100));
    }
    return Math.ceil(cost + val);
  };

  const getProductMarkupLabel = (prod: any) => {
    if (prod.markup_type === 'global') {
      const gType = settingsForm.global_markup_type === 'percent' ? '%' : 'Rp';
      const gVal = settingsForm.global_markup_value;
      const gTypeLabel = gType === '%' ? `${gVal}%` : formatPrice(gVal);
      return `Global (${gTypeLabel})`;
    } else if (prod.markup_type === 'percent') {
      return `Kustom (${prod.markup_value}%)`;
    } else {
      return `Kustom (${formatPrice(prod.markup_value)})`;
    }
  };

  // Helpers
  const isFlashActive = (endStr: string | null | undefined): boolean => {
    if (!endStr) return false;
    const date = new Date(endStr);
    return !isNaN(date.getTime()) && date.getTime() > Date.now();
  };

  const calculateFlashSaleMargin = () => {
    if (!editingFlashSaleProduct) return { margin: 0, pct: 0, isNegative: false };
    const cost = parseFloat(editingFlashSaleProduct.original_price) || 0;
    const flashPrice = parseFloat(flashSaleForm.price) || 0;
    if (flashPrice <= 0) return { margin: 0, pct: 0, isNegative: false };
    const margin = flashPrice - cost;
    const pct = cost > 0 ? Math.round((margin / cost) * 100) : 0;
    return { margin, pct, isNegative: margin < 0 };
  };

  const formatPrice = (priceStr: string | number) => {
    const num = parseFloat(priceStr.toString());
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getLatestProductUpdate = () => {
    if (products.length === 0) return '-';
    const dates = products
      .map((p) => new Date(p.updated_at).getTime())
      .filter((t) => !isNaN(t));
    if (dates.length === 0) return '-';
    const latestTime = Math.max(...dates);
    return new Date(latestTime).toLocaleString('id-ID', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter Transaction
  const filteredTransactions = transactions.filter(tx => {
    const query = txSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      tx.invoice_id.toLowerCase().includes(query) ||
      tx.game?.name?.toLowerCase().includes(query) ||
      tx.product?.name?.toLowerCase().includes(query) ||
      tx.target_id.toLowerCase().includes(query) ||
      tx.user?.name?.toLowerCase().includes(query) ||
      tx.user?.email?.toLowerCase().includes(query);

    const matchesStatus = txStatus === 'all' ||
      (txStatus === 'paid' && tx.payment_status === 'paid') ||
      (txStatus === 'pending' && tx.payment_status === 'pending') ||
      (txStatus === 'completed' && tx.delivery_status === 'completed') ||
      (txStatus === 'failed' && (tx.payment_status === 'failed' || tx.delivery_status === 'failed'));

    return matchesSearch && matchesStatus;
  });

  // Filter Users
  const filteredUsers = users.filter(usr => {
    const query = userSearch.toLowerCase().trim();
    return !query || 
      usr.name.toLowerCase().includes(query) ||
      usr.email.toLowerCase().includes(query) ||
      usr.role.toLowerCase().includes(query);
  });

  // Filter Products
  const filteredProducts = products.filter(prod => {
    const query = productSearch.toLowerCase().trim();
    const matchesSearch = !query ||
      prod.name.toLowerCase().includes(query) ||
      prod.buyer_sku_code.toLowerCase().includes(query);

    const matchesGame = productGameFilter === 'all' || prod.game_id.toString() === productGameFilter;

    return matchesSearch && matchesGame;
  });

  // Filter Topup Requests
  const filteredTopupRequests = adminTopupRequests.filter(req => {
    const query = topupRequestSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      req.id.toString().includes(query) ||
      req.user?.name?.toLowerCase().includes(query) ||
      req.user?.email?.toLowerCase().includes(query) ||
      req.method?.name?.toLowerCase().includes(query) ||
      req.amount.toString().includes(query);

    const matchesStatus = topupRequestStatus === 'all' || req.status === topupRequestStatus;

    return matchesSearch && matchesStatus;
  });

  // Unique list of games for filtering products
  const uniqueGames = Array.from(new Set(products.map(p => JSON.stringify(p.game)))).map(s => JSON.parse(s)).filter(Boolean);

  const getPaymentStatusBadge = (status: Transaction['payment_status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-success/10 text-success border border-success/20 text-[10px] font-bold uppercase">
            Lunas
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20 text-[10px] font-bold uppercase">
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-error/10 text-error border border-error/20 text-[10px] font-bold uppercase">
            Gagal
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold uppercase">
            Expired
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-success/10 text-success border border-success/20 text-[10px] font-bold uppercase">
            Sukses
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase animate-pulse">
            Proses
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-250 text-[10px] font-bold uppercase">
            Antre
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-error/10 text-error border border-error/20 text-[10px] font-bold uppercase">
            Gagal
          </span>
        );
      default:
        return null;
    }
  };

  const renderTopupRequests = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              placeholder="Cari transaksi topup..."
              value={topupRequestSearch}
              onChange={(e) => setTopupRequestSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 shadow-sm"
            />
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={topupRequestStatus}
              onChange={(e) => setTopupRequestStatus(e.target.value as any)}
              className="w-full sm:w-48 px-4 py-2.5 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer shadow-sm"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu Persetujuan</option>
              <option value="approved">Disetujui (Sukses)</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>
        </div>

        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {filteredTopupRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs text-foreground/40 font-medium">Tidak ada riwayat isi saldo.</p>
            </div>
          ) : (
            filteredTopupRequests.map((req) => (
              <div key={req.id} className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-primary font-mono">REQ-{req.id}</span>
                    <h4 className="font-bold text-foreground text-sm mt-0.5">{req.user?.name}</h4>
                    <p className="text-foreground/50 text-[10px]">{req.user?.email}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    req.status === 'approved'
                      ? 'bg-success/10 text-success border border-success/20'
                      : req.status === 'rejected'
                      ? 'bg-error/10 text-error border border-error/20'
                      : 'bg-warning/10 text-warning border border-warning/20'
                  }`}>
                    {req.status === 'approved' ? 'Disetujui' : req.status === 'rejected' ? 'Ditolak' : 'Pending'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-[10px] border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Metode</span>
                    <span className="font-semibold text-foreground">{req.method?.name || 'Manual'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jumlah Bayar</span>
                    <span className="font-extrabold text-primary block">
                      {formatPrice(parseFloat(req.amount) + (req.unique_code || 0))}
                    </span>
                    {req.unique_code > 0 && (
                      <span className="text-[9px] text-slate-400 block">
                        Base: {formatPrice(req.amount)} (Kode: {req.unique_code})
                      </span>
                    )}
                    {req.status === 'approved' && req.previous_balance !== undefined && req.previous_balance !== null && (
                      <span className="text-[9px] text-slate-500 block mt-0.5 font-semibold">
                        Sebelum: {formatPrice(req.previous_balance)}
                      </span>
                    )}
                  </div>
                  {req.method && (
                    <div className="col-span-2 border-t border-slate-200/50 pt-1.5 mt-1">
                      <span className="text-slate-400 block">Rekening Tujuan</span>
                      <span className="font-mono text-foreground font-semibold">
                        {req.method.name} - {req.method.account_number} ({req.method.account_name})
                      </span>
                    </div>
                  )}
                  {req.notes && (
                    <div className="col-span-2 border-t border-slate-200/50 pt-1.5 mt-1">
                      <span className="text-slate-400 block">Catatan</span>
                      <span className="text-foreground">{req.notes}</span>
                    </div>
                  )}
                </div>
                {req.status === 'pending' && (
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => handleApproveTopup(req.id)}
                      disabled={approvingRequestId === req.id || rejectingRequestId === req.id}
                      className="flex-grow inline-flex items-center justify-center py-2 rounded-lg bg-success text-white font-bold text-[10px] uppercase tracking-wider hover:bg-success-hover disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {approvingRequestId === req.id ? 'Memproses...' : 'Setujui'}
                    </button>
                    <button
                      onClick={() => handleRejectTopup(req.id)}
                      disabled={approvingRequestId === req.id || rejectingRequestId === req.id}
                      className="flex-grow inline-flex items-center justify-center py-2 rounded-lg bg-error text-white font-bold text-[10px] uppercase tracking-wider hover:bg-error-hover disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {rejectingRequestId === req.id ? 'Memproses...' : 'Tolak'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {filteredTopupRequests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-foreground/40 font-medium">Tidak ada riwayat isi saldo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-foreground/60 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">ID / Tanggal</th>
                    <th className="px-6 py-4">Pengguna</th>
                    <th className="px-6 py-4">Metode & Rekening</th>
                    <th className="px-6 py-4">Jumlah</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTopupRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-foreground block">REQ-{req.id}</span>
                        <span className="text-[10px] text-foreground/40 mt-0.5 block">
                          {new Date(req.created_at).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-foreground block text-xs">{req.user?.name}</span>
                        <span className="text-[10px] text-foreground/50 block">{req.user?.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-foreground block text-xs">{req.method?.name || 'Manual'}</span>
                        {req.method && (
                          <span className="text-[10px] text-foreground/50 font-mono block">
                            {req.method.account_number} ({req.method.account_name})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-primary block">
                          {formatPrice(parseFloat(req.amount) + (req.unique_code || 0))}
                        </span>
                        {req.unique_code > 0 && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Base: {formatPrice(req.amount)} (Kode: {req.unique_code})
                          </span>
                        )}
                        {req.status === 'approved' && req.previous_balance !== undefined && req.previous_balance !== null && (
                          <span className="text-[10px] text-slate-500 block mt-1 font-semibold">
                            Saldo sebelum: {formatPrice(req.previous_balance)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          req.status === 'approved'
                            ? 'bg-success/10 text-success border border-success/20'
                            : req.status === 'rejected'
                            ? 'bg-error/10 text-error border border-error/20'
                            : 'bg-warning/10 text-warning border border-warning/20'
                        }`}>
                          {req.status === 'approved' ? 'Disetujui' : req.status === 'rejected' ? 'Ditolak' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {req.status === 'pending' ? (
                          <div className="inline-flex space-x-2">
                            <button
                              onClick={() => handleApproveTopup(req.id)}
                              disabled={approvingRequestId === req.id || rejectingRequestId === req.id}
                              className="px-3 py-1.5 rounded-lg bg-success text-white font-bold text-[10px] uppercase tracking-wider hover:bg-success-hover disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                              {approvingRequestId === req.id ? '...' : 'Setujui'}
                            </button>
                            <button
                              onClick={() => handleRejectTopup(req.id)}
                              disabled={approvingRequestId === req.id || rejectingRequestId === req.id}
                              className="px-3 py-1.5 rounded-lg bg-error text-white font-bold text-[10px] uppercase tracking-wider hover:bg-error-hover disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                              {rejectingRequestId === req.id ? '...' : 'Tolak'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-foreground/30 font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTopupMethods = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="text-xs text-foreground/50">
            Daftar bank / e-wallet kustom yang dapat dipilih pengguna untuk transfer deposit saldo.
          </div>
          <button
            onClick={() => handleOpenMethodModal(null)}
            className="glow-button inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap cursor-pointer text-center"
          >
            + Tambah Metode
          </button>
        </div>

        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {adminTopupMethods.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs text-foreground/40 font-medium">Belum ada metode pembayaran kustom.</p>
            </div>
          ) : (
            adminTopupMethods.map((method) => (
              <div key={method.id} className="p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{method.name}</h4>
                    <span className="text-[10px] text-foreground/50 font-mono">
                      {method.account_number} a.n {method.account_name}
                    </span>
                  </div>
                  <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                    method.is_active
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {method.is_active ? 'Aktif' : 'Non-aktif'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-[10px]">
                  <span className="text-slate-400 font-bold">Min. Transfer: <span className="text-primary font-extrabold">{formatPrice(method.min_amount)}</span></span>
                  <div className="space-x-3 text-xs">
                    <button
                      onClick={() => handleOpenMethodModal(method)}
                      className="font-bold text-primary hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMethod(method.id)}
                      className="font-bold text-error hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {adminTopupMethods.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-foreground/40 font-medium">Belum ada metode pembayaran kustom.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-foreground/60 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Nama Bank / Provider</th>
                    <th className="px-6 py-4">No. Rekening / VA</th>
                    <th className="px-6 py-4">Atas Nama (a.n)</th>
                    <th className="px-6 py-4">Min. Transfer</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminTopupMethods.map((method) => (
                    <tr key={method.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">{method.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-foreground/80">{method.account_number}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-foreground/70">{method.account_name}</td>
                      <td className="px-6 py-4 font-bold text-primary">{formatPrice(method.min_amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                          method.is_active
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {method.is_active ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenMethodModal(method)}
                          className="inline-flex items-center text-xs font-bold text-primary hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMethod(method.id)}
                          className="inline-flex items-center text-xs font-bold text-error hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Topup Method CRUD */}
        {topupMethodModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-border overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-foreground font-heading">
                  {editingTopupMethod ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran Baru'}
                </h3>
                <button
                  onClick={() => setTopupMethodModalOpen(false)}
                  className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSaveMethod} className="overflow-y-auto flex-grow">
                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Nama Bank / Provider</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: BCA, DANA, Mandiri"
                      value={topupMethodForm.name}
                      onChange={(e) => setTopupMethodForm({ ...topupMethodForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground"
                    />
                    {topupMethodFormErrors.name && <span className="text-[9px] text-error mt-1 block">{topupMethodFormErrors.name[0]}</span>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Nomor Rekening / VA / Telepon</label>
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nomor rekening atau nomor e-wallet"
                      value={topupMethodForm.account_number}
                      onChange={(e) => setTopupMethodForm({ ...topupMethodForm, account_number: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-mono"
                    />
                    {topupMethodFormErrors.account_number && <span className="text-[9px] text-error mt-1 block">{topupMethodFormErrors.account_number[0]}</span>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Atas Nama (a.n)</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama pemilik rekening/e-wallet"
                      value={topupMethodForm.account_name}
                      onChange={(e) => setTopupMethodForm({ ...topupMethodForm, account_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground"
                    />
                    {topupMethodFormErrors.account_name && <span className="text-[9px] text-error mt-1 block">{topupMethodFormErrors.account_name[0]}</span>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Minimum Transfer (Rp)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      placeholder="Contoh: 10000"
                      value={topupMethodForm.min_amount}
                      onChange={(e) => setTopupMethodForm({ ...topupMethodForm, min_amount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                    />
                    {topupMethodFormErrors.min_amount && <span className="text-[9px] text-error mt-1 block">{topupMethodFormErrors.min_amount[0]}</span>}
                  </div>
                  <div className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      id="is_active_checkbox"
                      checked={topupMethodForm.is_active}
                      onChange={(e) => setTopupMethodForm({ ...topupMethodForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary/20 cursor-pointer"
                    />
                    <label htmlFor="is_active_checkbox" className="text-xs font-semibold text-foreground/80 cursor-pointer select-none">
                      Metode Aktif (Tampilkan kepada pengguna)
                    </label>
                  </div>
                </div>
                <div className="p-5 border-t border-border bg-slate-50/50 shrink-0 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setTopupMethodModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={topupMethodSubmitting}
                    className="glow-button px-5 py-2.5 rounded-xl text-xs font-bold text-white uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {topupMethodSubmitting ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleOpenGameEdit = (game: Game) => {
    setEditingGame(game);
    let formattedEnd = '';
    if (game.flash_sale_end) {
      const date = new Date(game.flash_sale_end);
      if (!isNaN(date.getTime())) {
        const localOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - localOffset)).toISOString().slice(0, 16);
        formattedEnd = localISOTime;
      }
    }
    setGameForm({
      is_active: !!game.is_active,
      flash_sale_end: formattedEnd
    });
    setGameFormErrors({});
    setGameModalOpen(true);
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;
    setGameSubmitting(true);
    setGameFormErrors({});
    try {
      let apiEndVal: string | null = null;
      if (gameForm.flash_sale_end) {
        apiEndVal = gameForm.flash_sale_end.replace('T', ' ') + ':00';
      }
      
      const updatedGame = await api.updateGame(editingGame.id, {
        is_active: gameForm.is_active,
        flash_sale_end: apiEndVal
      });

      setSuccessMsg(`Brand ${updatedGame.name} berhasil diperbarui.`);
      setGameModalOpen(false);
      setEditingGame(null);
      const gamesList = await api.getAdminGames();
      setGames(gamesList);
    } catch (err: any) {
      console.error(err);
      if (err.errors) {
        setGameFormErrors(err.errors);
      } else {
        setError(err.message || 'Gagal memperbarui game.');
      }
    } finally {
      setGameSubmitting(false);
    }
  };

  const handleOpenFlashSaleEdit = (product: any) => {
    setEditingFlashSaleProduct(product);
    let formattedEnd = '';
    const game = product.game;
    if (game && game.flash_sale_end) {
      const date = new Date(game.flash_sale_end);
      if (!isNaN(date.getTime())) {
        const localOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - localOffset)).toISOString().slice(0, 16);
        formattedEnd = localISOTime;
      }
    }
    setFlashSaleForm({
      price: product.flash_sale_price ? product.flash_sale_price.toString() : '',
      end: formattedEnd
    });
    setFlashSaleFormErrors({});
  };

  const handleSaveFlashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlashSaleProduct) return;
    setFlashSaleSubmitting(true);
    setFlashSaleFormErrors({});
    try {
      const gameId = editingFlashSaleProduct.game_id;
      let apiEndVal: string | null = null;
      if (flashSaleForm.end) {
        apiEndVal = flashSaleForm.end.replace('T', ' ') + ':00';
      }

      // 1. Update the game's flash_sale_end and make sure is_active is true
      await api.updateGame(gameId, {
        is_active: true,
        flash_sale_end: apiEndVal
      });

      // 2. Update the product's flash_sale_price
      await api.updateAdminProduct(editingFlashSaleProduct.id, {
        markup_type: editingFlashSaleProduct.markup_type || 'global',
        markup_value: parseFloat(editingFlashSaleProduct.markup_value) || 0,
        is_available: !!editingFlashSaleProduct.is_available,
        flash_sale_price: flashSaleForm.price || null
      });

      setSuccessMsg('Pengaturan Flash Sale berhasil disimpan.');
      setEditingFlashSaleProduct(null);
      
      const [productsList, gamesList] = await Promise.all([
        api.getAdminProducts(),
        api.getAdminGames()
      ]);
      setProducts(productsList);
      setGames(gamesList);
    } catch (err: any) {
      console.error(err);
      if (err.errors) {
        setFlashSaleFormErrors(err.errors);
      } else {
        setError(err.message || 'Gagal menyimpan pengaturan Flash Sale.');
      }
    } finally {
      setFlashSaleSubmitting(false);
    }
  };

  const handleGameThumbnailUpload = async (gameId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingGameId(gameId);
    const formData = new FormData();
    formData.append('thumbnail', file);

    try {
      const res = await api.uploadGameThumbnail(gameId, formData);
      if (res.success) {
        setGames(prev => prev.map(g => g.id === gameId ? { ...g, thumbnail: res.data.thumbnail } : g));
        setSuccessMsg('Thumbnail game berhasil diperbarui!');
      }
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal Unggah Gambar', err.message || 'Gagal mengunggah thumbnail game.', 'danger');
    } finally {
      setUploadingGameId(null);
      e.target.value = '';
    }
  };

  const getAdminGameIconFallback = (code: string) => {
    switch (code) {
      case 'MLBB':
        return <span className="text-primary font-black text-xl">ML</span>;
      case 'FREEFIRE':
        return <span className="text-orange-500 font-black text-xl">FF</span>;
      case 'PUBGM':
        return <span className="text-amber-600 font-black text-xl">PUBG</span>;
      default:
        const initials = (code || 'GP').substring(0, 3).toUpperCase();
        return <span className="text-slate-400 font-black text-sm">{initials}</span>;
    }
  };

  const renderFlashSales = () => {
    const formatEndDate = (endStr: string | null | undefined): string => {
      if (!endStr) return 'Tidak Aktif';
      const date = new Date(endStr);
      if (isNaN(date.getTime())) return 'Format Salah';
      
      return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300 text-xs">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-orange-500 text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-36 h-36 bg-white/5 rounded-full blur-2xl -mr-10 -mb-10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-base md:text-lg font-black font-heading tracking-tight uppercase">Sentra Manajemen Flash Sale</h2>
            <p className="text-[10px] sm:text-xs text-white/85 mt-1 font-medium">Atur batas waktu aktif flash sale per game dan berikan harga diskon khusus produk di satu tempat terpusat.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Section 1: Games/Brands Flash Sale status */}
          <div className="xl:col-span-2 bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col space-y-4">
            <div>
              <h3 className="font-extrabold text-foreground text-sm font-heading mb-1 uppercase tracking-wider">1. Waktu Flash Sale Game</h3>
              <p className="text-[10px] text-foreground/45">Aktifkan periode flash sale dan batas waktu hitung mundur game.</p>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
              {games && games.length > 0 ? (
                games.map((g) => {
                  const active = isFlashActive(g.flash_sale_end);
                  return (
                    <div key={g.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 hover:border-slate-200 transition-all">
                      <div className="flex items-center space-x-3 min-w-0">
                        {g.thumbnail ? (
                          <img
                            src={getAssetUrl(g.thumbnail)}
                            alt={g.name}
                            className="w-10 h-10 rounded-lg object-cover shadow-xs border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {g.code.slice(0, 3)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{g.name}</p>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5">{g.code}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                        {active ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-200 leading-none">
                            AKTIF
                          </span>
                        ) : (
                          <span className="bg-slate-200 text-slate-600 text-[8px] font-bold px-2 py-0.5 rounded-full leading-none">
                            OFF
                          </span>
                        )}
                        <p className="text-[9px] font-semibold text-foreground/60">{formatEndDate(g.flash_sale_end)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center py-6 text-foreground/40 text-xs">Belum ada data game.</p>
              )}
            </div>
          </div>

          {/* Section 2: Products Flash Sale Prices */}
          <div className="xl:col-span-3 bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-foreground text-sm font-heading mb-1 uppercase tracking-wider">2. Harga Promo Nominal Produk</h3>
                <p className="text-[10px] text-foreground/45">Atur nominal harga khusus diskon flash sale per item produk.</p>
              </div>

              {/* Game filter dropdown */}
              <select
                value={productGameFilter}
                onChange={(e) => setProductGameFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-primary cursor-pointer self-start sm:self-auto"
              >
                <option value="all">Semua Game</option>
                {uniqueGames.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-foreground/50 uppercase tracking-wider font-bold">
                    <th className="pb-3 pl-3">Game / Item</th>
                    <th className="pb-3 text-right">Harga Reguler</th>
                    <th className="pb-3 text-right pl-4">Harga Flash Sale</th>
                    <th className="pb-3 text-right pl-4">Margin FS</th>
                    <th className="pb-3 text-center">Status Diskon</th>
                    <th className="pb-3 pr-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products && products.length > 0 ? (
                    products
                      .filter((p) => {
                        if (!p) return false;
                        if (productGameFilter === 'all') return true;
                        return p.game_id?.toString() === productGameFilter.toString();
                      })
                      .map((p) => {
                        const hasSale = !!p.flash_sale_price;
                        const gameInfo = p.game;
                        const gameSaleActive = gameInfo && isFlashActive(gameInfo.flash_sale_end);
                        
                        const cost = parseFloat(p.original_price);
                        const flashPrice = hasSale ? parseFloat(p.flash_sale_price!) : 0;
                        const fsMarkup = hasSale ? (flashPrice - cost) : 0;
                        const fsMarkupPct = (hasSale && cost > 0) ? Math.round((fsMarkup / cost) * 100) : 0;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 pl-3">
                              <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded mr-1.5 uppercase font-bold border border-slate-200">
                                {gameInfo?.name || 'N/A'}
                              </span>
                              <span className="font-extrabold text-slate-700">{p.name}</span>
                            </td>
                            <td className="py-3 text-right font-bold text-slate-600">
                              {formatPrice(p.price)}
                            </td>
                            <td className="py-3 text-right font-black text-[#e11d48] pl-4">
                              {p.flash_sale_price ? formatPrice(p.flash_sale_price) : '-'}
                            </td>
                            <td className="py-3 text-right pl-4 font-semibold text-xs">
                              {hasSale ? (
                                <span className={fsMarkup < 0 ? 'text-error font-extrabold' : 'text-success'}>
                                  {formatPrice(fsMarkup)} ({fsMarkupPct}%)
                                </span>
                              ) : (
                                <span className="text-foreground/30 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-3 text-center">
                              {hasSale ? (
                                gameSaleActive ? (
                                  <span className="bg-[#e11d48]/10 text-[#e11d48] text-[8px] font-black px-2 py-0.5 rounded border border-[#e11d48]/20">
                                    LIVE PROMO
                                  </span>
                                ) : (
                                  <span className="bg-yellow-50 text-yellow-700 text-[8px] font-bold px-2 py-0.5 rounded border border-yellow-200">
                                    PENDING (GAME OFF)
                                  </span>
                                )
                              ) : (
                                <span className="text-foreground/30 text-[9px]">Tidak Ada</span>
                              )}
                            </td>
                            <td className="py-3 text-center pr-3">
                              <button
                                type="button"
                                onClick={() => handleOpenFlashSaleEdit(p)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-bold uppercase transition-colors cursor-pointer border border-slate-200"
                              >
                                Atur Harga
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-foreground/40 text-xs">
                        Tidak ada nominal produk tersedia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGames = () => {
    const filteredGames = games ? games.filter(g => {
      if (!g) return false;
      if (gameSearch === 'all' || !gameSearch) return true;
      return getCategoryKey(g.slug) === gameSearch;
    }) : [];

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGameSearch('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                gameSearch === 'all'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua Kategori
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setGameSearch(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  gameSearch === cat.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-foreground/40 leading-none">
            * Kelola logo brand dan identitas visual 1:1 untuk setiap kategori di katalog utama.
          </p>
        </div>

        {/* Grid layout for Game categories */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredGames.length === 0 ? (
            <div className="col-span-full text-center py-12 text-foreground/45 font-medium">
              Tidak ada brand / kategori game yang cocok.
            </div>
          ) : (
            filteredGames.map((g) => (
              <div key={g.id} className="premium-card bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden">
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`inline-block text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                    g.is_active
                      ? 'bg-success/15 text-success border-success/20'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {g.is_active ? 'Aktif' : 'Off'}
                  </span>
                </div>

                {/* Logo Image / Fallback Icon */}
                <div className="relative w-20 h-20 mt-4 mb-4 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-150 overflow-hidden">
                  {g.thumbnail ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${g.thumbnail}`}
                      alt={g.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getAdminGameIconFallback(g.code)
                  )}

                  {uploadingGameId === g.id && (
                    <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-15">
                      <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Game Info */}
                <div className="mb-4">
                  <h4 className="font-extrabold text-slate-800 text-sm font-heading">{g.name}</h4>
                  <span className="font-mono text-[9px] text-slate-400 font-bold block mt-0.5">{g.code}</span>
                </div>

                {/* Actions Button */}
                <div className="w-full flex gap-2">
                  <label className="flex-1 inline-flex items-center justify-center px-2 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors text-[9px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer text-center">
                    <span>{uploadingGameId === g.id ? '...' : 'Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingGameId !== null}
                      onChange={(e) => handleGameThumbnailUpload(g.id, e)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenGameEdit(g)}
                    className="flex-1 inline-flex items-center justify-center px-2 py-2 rounded-xl border border-primary/20 text-primary hover:bg-primary-light active:bg-primary-light/40 transition-colors text-[9px] font-bold uppercase tracking-wider cursor-pointer text-center bg-white"
                  >
                    Edit Info
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const handleOpenVoucherModal = (voucher: Voucher | null = null) => {
    setEditingVoucher(voucher);
    setVoucherFormErrors({});
    if (voucher) {
      setVoucherForm({
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        min_transaction: voucher.min_transaction,
        max_discount: voucher.max_discount !== null ? voucher.max_discount : '',
        quota: voucher.quota,
        is_active: voucher.is_active
      });
    } else {
      setVoucherForm({
        code: '',
        discount_type: 'percent',
        discount_value: 0,
        min_transaction: 0,
        max_discount: '',
        quota: 0,
        is_active: true
      });
    }
    setVoucherModalOpen(true);
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherSubmitting(true);
    setVoucherFormErrors({});
    
    const payload: any = {
      code: voucherForm.code.toUpperCase().trim(),
      discount_type: voucherForm.discount_type,
      discount_value: Number(voucherForm.discount_value),
      min_transaction: Number(voucherForm.min_transaction),
      max_discount: voucherForm.max_discount === '' ? null : Number(voucherForm.max_discount),
      quota: Number(voucherForm.quota),
      is_active: voucherForm.is_active
    };

    try {
      if (editingVoucher) {
        await api.updateAdminVoucher(editingVoucher.id, payload);
        setSuccessMsg(`Voucher ${payload.code} berhasil diperbarui.`);
      } else {
        await api.createAdminVoucher(payload);
        setSuccessMsg(`Voucher ${payload.code} berhasil ditambahkan.`);
      }
      
      const vouchersData = await api.getAdminVouchers();
      setVouchers(vouchersData);
      setVoucherModalOpen(false);
    } catch (err: any) {
      console.error(err);
      if (err.errors) {
        setVoucherFormErrors(err.errors);
      } else {
        setError(err.message || 'Gagal menyimpan voucher.');
      }
    } finally {
      setVoucherSubmitting(false);
    }
  };

  const handleDeleteVoucher = (id: number, code: string) => {
    showConfirm(
      'Hapus Voucher',
      `Apakah Anda yakin ingin menghapus kode voucher ${code}? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          await api.deleteAdminVoucher(id);
          setSuccessMsg(`Voucher ${code} berhasil dihapus.`);
          const vouchersData = await api.getAdminVouchers();
          setVouchers(vouchersData);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal menghapus voucher.');
        }
      },
      'danger'
    );
  };

  const renderVouchers = () => {
    const filteredVouchers = vouchers.filter(v => {
      const query = voucherSearch.toLowerCase().trim();
      return !query || v.code.toLowerCase().includes(query);
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center w-full sm:w-auto gap-2">
            <input
              type="text"
              placeholder="Cari kode voucher..."
              value={voucherSearch}
              onChange={(e) => setVoucherSearch(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-foreground bg-slate-50 focus:outline-none focus:border-primary placeholder-slate-400 font-semibold w-full sm:w-56"
            />
          </div>
          <button
            onClick={() => handleOpenVoucherModal(null)}
            className="glow-button inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap cursor-pointer text-center"
          >
            + Tambah Voucher
          </button>
        </div>

        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {filteredVouchers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic text-xs font-semibold">
              Voucher tidak ditemukan.
            </div>
          ) : (
            filteredVouchers.map((v) => (
              <div key={v.id} className="p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-foreground text-sm font-heading">{v.code}</h4>
                    <span className="text-[10px] text-foreground/50 font-sans block mt-0.5">
                      Tipe: {v.discount_type === 'percent' ? 'Persen' : 'Nominal Flat'}
                    </span>
                  </div>
                  <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                    v.is_active
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {v.is_active ? 'Aktif' : 'Non-aktif'}
                  </span>
                </div>
                <div className="border-t border-slate-50 pt-2 flex flex-col space-y-1.5 text-[10px] text-slate-500 font-medium">
                  <div className="flex justify-between">
                    <span>Nilai Potongan:</span>
                    <span className="font-bold text-primary">
                      {v.discount_type === 'percent' ? `${v.discount_value}%` : formatPrice(v.discount_value)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min. Transaksi:</span>
                    <span className="font-bold text-slate-700">{formatPrice(v.min_transaction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maks. Potongan:</span>
                    <span className="font-bold text-slate-700">{v.max_discount ? formatPrice(v.max_discount) : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sisa Kuota:</span>
                    <span className="font-bold text-amber-600">{v.quota}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 text-xs font-bold border-t border-slate-100">
                  <button
                    onClick={() => handleOpenVoucherModal(v)}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteVoucher(v.id, v.code)}
                    className="text-error hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {filteredVouchers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-foreground/45 font-medium">Belum ada kode voucher yang ditambahkan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-foreground/60 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Kode Voucher</th>
                    <th className="px-6 py-4">Tipe Diskon</th>
                    <th className="px-6 py-4">Nilai Diskon</th>
                    <th className="px-6 py-4">Min. Belanja</th>
                    <th className="px-6 py-4">Maks. Diskon</th>
                    <th className="px-6 py-4">Sisa Kuota</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground tracking-wide font-heading">{v.code}</td>
                      <td className="px-6 py-4 text-xs font-medium text-foreground/65 capitalize">
                        {v.discount_type === 'percent' ? 'Persen (%)' : 'Flat (Nominal)'}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-primary">
                        {v.discount_type === 'percent' ? `${v.discount_value}%` : formatPrice(v.discount_value)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{formatPrice(v.min_transaction)}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                        {v.max_discount ? formatPrice(v.max_discount) : '-'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-amber-600">{v.quota}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                          v.is_active
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {v.is_active ? 'Aktif' : 'Off'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenVoucherModal(v)}
                          className="text-xs font-bold text-primary hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVoucher(v.id, v.code)}
                          className="text-xs font-bold text-error hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTickets = () => {
    const getStatusBadge = (status: Ticket['status']) => {
      switch (status) {
        case 'open':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 uppercase">
              Menunggu Balasan
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

    if (selectedAdminTicketId && activeAdminTicket) {
      return (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm animate-in fade-in duration-300 flex flex-col min-h-[60vh] text-xs">
          {/* Ticket Detail Header */}
          <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-4 shrink-0 bg-slate-50">
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedAdminTicketId(null);
                  setActiveAdminTicket(null);
                }}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer mb-2"
              >
                &larr; Kembali ke Daftar Tiket
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-800 font-heading">
                  #{activeAdminTicket.id} - {activeAdminTicket.title}
                </h2>
                {getStatusBadge(activeAdminTicket.status)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Pelanggan: <span className="font-bold text-slate-700">{activeAdminTicket.user?.name} ({activeAdminTicket.user?.email})</span> • Kategori: <span className="font-bold text-slate-600">{getCategoryLabel(activeAdminTicket.category)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeAdminTicket.status === 'closed' ? (
                <button
                  onClick={() => handleAdminCloseTicket(activeAdminTicket.id, 'open')}
                  className="bg-success/10 hover:bg-success/20 text-success px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer active:scale-95"
                >
                  Buka Kembali Tiket
                </button>
              ) : (
                <button
                  onClick={() => handleAdminCloseTicket(activeAdminTicket.id, 'closed')}
                  className="bg-error/10 hover:bg-error/20 text-error px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer active:scale-95"
                >
                  Tutup Tiket
                </button>
              )}
            </div>
          </div>

          {/* Ticket Messages Thread */}
          <div className="flex-grow p-5 overflow-y-auto space-y-4 max-h-[450px] bg-slate-50/30">
            {loadingAdminTicketDetail ? (
              <div className="flex justify-center items-center py-10">
                <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : (
              activeAdminTicket.messages?.map((msg) => {
                const isAdminMsg = msg.sender?.role === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdminMsg ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[80%] flex flex-col space-y-1">
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed font-sans shadow-xs ${
                          isAdminMsg
                            ? 'bg-primary text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span
                        className={`text-[9px] text-slate-400 px-1 font-mono ${
                          isAdminMsg ? 'text-right' : 'text-left'
                        }`}
                      >
                        {isAdminMsg ? 'Anda (Admin)' : `${msg.sender?.name || 'User'}`} • {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ticket Messages Input */}
          <div className="p-4 border-t border-border bg-white shrink-0">
            {activeAdminTicket.status === 'closed' ? (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center font-semibold text-slate-500 mb-2">
                Tiket ini telah ditutup. Buka kembali tiket untuk mengirimkan pesan tanggapan.
              </div>
            ) : (
              <form onSubmit={handleAdminReplySubmit} className="flex items-stretch gap-2">
                <input
                  type="text"
                  placeholder="Tulis pesan tanggapan admin..."
                  value={adminTicketReply}
                  onChange={(e) => setAdminTicketReply(e.target.value)}
                  disabled={adminReplySubmitting}
                  className="flex-grow px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-200 focus:border-primary text-slate-800 font-medium placeholder-slate-400"
                  required
                />
                <button
                  type="submit"
                  disabled={adminReplySubmitting || !adminTicketReply.trim()}
                  className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-xs px-5 rounded-xl transition-all border-0 cursor-pointer flex items-center justify-center shrink-0"
                >
                  {adminReplySubmitting ? 'Mengirim...' : 'Kirim Balasan'}
                </button>
              </form>
            )}
          </div>
        </div>
      );
    }

    const filteredTickets = adminTickets.filter((t) => {
      const matchesFilter = adminTicketFilter === 'all' || t.status === adminTicketFilter;
      const query = adminTicketSearch.toLowerCase().trim();
      const matchesSearch = !query || 
        t.title.toLowerCase().includes(query) ||
        t.id.toString().includes(query) ||
        t.user?.name?.toLowerCase().includes(query) ||
        t.user?.email?.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300 text-xs">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground font-heading">Tiket Bantuan Pelanggan</h2>
            <p className="text-[11px] text-foreground/45 mt-0.5">Kelola aduan dan berikan tanggapan support untuk pelanggan</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari ID, Judul, Pelanggan..."
              value={adminTicketSearch}
              onChange={(e) => setAdminTicketSearch(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-foreground bg-slate-50 focus:outline-none focus:border-primary placeholder-slate-400 font-semibold flex-grow sm:flex-grow-0 sm:w-56"
            />
            <select
              value={adminTicketFilter}
              onChange={(e) => setAdminTicketFilter(e.target.value as any)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-foreground bg-slate-50 focus:outline-none focus:border-primary font-bold cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="open">Menunggu Balasan (Open)</option>
              <option value="replied">Sudah Dibalas (Replied)</option>
              <option value="closed">Ditutup (Closed)</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-foreground/40 font-medium">Tidak ada tiket bantuan yang ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-foreground/60 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Pelanggan</th>
                    <th className="px-6 py-4">Subjek / Judul</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Tanggal Update</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-primary">#{t.id}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-foreground block">{t.user?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-slate-400 block">{t.user?.email || '-'}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 max-w-xs truncate">{t.title}</td>
                      <td className="px-6 py-4 font-bold text-slate-500">{getCategoryLabel(t.category)}</td>
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {new Date(t.updated_at).toLocaleString('id-ID', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleSelectAdminTicket(t.id)}
                          className="text-xs font-bold text-primary hover:underline cursor-pointer bg-transparent border-0"
                        >
                          Buka Tiket &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleOpenAnnouncementModal = (announcement: Announcement | null = null) => {
    setEditingAnnouncement(announcement);
    setAnnouncementFormErrors({});
    if (announcement) {
      setAnnouncementForm({
        title: announcement.title,
        subtitle: announcement.subtitle || '',
        type: announcement.type,
        type_label: announcement.type_label || '',
        is_active: announcement.is_active
      });
    } else {
      setAnnouncementForm({
        title: '',
        subtitle: '',
        type: 'info',
        type_label: '',
        is_active: true
      });
    }
    setAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnouncementSubmitting(true);
    setAnnouncementFormErrors({});

    const payload = {
      title: announcementForm.title.trim(),
      subtitle: announcementForm.subtitle.trim() || null,
      type: announcementForm.type,
      type_label: announcementForm.type_label.trim() || null,
      is_active: announcementForm.is_active
    };

    try {
      if (editingAnnouncement) {
        await api.updateAdminAnnouncement(editingAnnouncement.id, payload);
        setSuccessMsg(`Pengumuman "${payload.title}" berhasil diperbarui.`);
      } else {
        await api.createAdminAnnouncement(payload);
        setSuccessMsg(`Pengumuman "${payload.title}" berhasil ditambahkan.`);
      }

      const announcementsData = await api.getAdminAnnouncements();
      setAnnouncements(announcementsData);
      setAnnouncementModalOpen(false);
    } catch (err: any) {
      console.error(err);
      if (err.errors) {
        setAnnouncementFormErrors(err.errors);
      } else {
        setError(err.message || 'Gagal menyimpan pengumuman.');
      }
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = (id: number, title: string) => {
    showConfirm(
      'Hapus Pengumuman',
      `Apakah Anda yakin ingin menghapus pengumuman "${title}"? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          await api.deleteAdminAnnouncement(id);
          setSuccessMsg(`Pengumuman "${title}" berhasil dihapus.`);
          const announcementsData = await api.getAdminAnnouncements();
          setAnnouncements(announcementsData);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal menghapus pengumuman.');
        }
      },
      'danger'
    );
  };

  const renderAnnouncements = () => {
    const filteredAnnouncements = announcements.filter(a => {
      const query = announcementSearch.toLowerCase().trim();
      return !query || 
        a.title.toLowerCase().includes(query) || 
        (a.subtitle && a.subtitle.toLowerCase().includes(query)) ||
        (a.type_label && a.type_label.toLowerCase().includes(query));
    });

    const getTypeColorClass = (type: 'info' | 'success' | 'warning' | 'danger') => {
      switch (type) {
        case 'success':
          return 'bg-success/15 text-success border-success/20';
        case 'warning':
          return 'bg-warning/15 text-warning border-warning/20';
        case 'danger':
          return 'bg-error/15 text-error border-error/20';
        default:
          return 'bg-primary/10 text-primary border-primary/20';
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center w-full sm:w-auto gap-2">
            <input
              type="text"
              placeholder="Cari pengumuman..."
              value={announcementSearch}
              onChange={(e) => setAnnouncementSearch(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-foreground bg-slate-50 focus:outline-none focus:border-primary placeholder-slate-400 font-semibold w-full sm:w-56"
            />
          </div>
          <button
            onClick={() => handleOpenAnnouncementModal(null)}
            className="glow-button inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap cursor-pointer text-center"
          >
            + Tambah Pengumuman
          </button>
        </div>

        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic text-xs font-semibold">
              Pengumuman tidak ditemukan.
            </div>
          ) : (
            filteredAnnouncements.map((a) => (
              <div key={a.id} className="p-4 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {a.type_label && (
                        <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${getTypeColorClass(a.type)}`}>
                          {a.type_label}
                        </span>
                      )}
                      <span className={`inline-block text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        a.is_active
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        {a.is_active ? 'Aktif' : 'Off'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-foreground text-sm font-heading">{a.title}</h4>
                    {a.subtitle && (
                      <p className="text-foreground/75 text-xs font-medium">{a.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 text-xs font-bold border-t border-slate-100">
                  <button
                    onClick={() => handleOpenAnnouncementModal(a)}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAnnouncement(a.id, a.title)}
                    className="text-error hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {filteredAnnouncements.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-foreground/45 font-medium">Belum ada pengumuman yang ditambahkan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-foreground/60 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Label</th>
                    <th className="px-6 py-4">Judul / Sub Judul</th>
                    <th className="px-6 py-4">Tipe Alert</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAnnouncements.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        {a.type_label ? (
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${getTypeColorClass(a.type)}`}>
                            {a.type_label}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-foreground block font-heading">{a.title}</span>
                        {a.subtitle && (
                          <span className="text-xs text-foreground/60 block mt-0.5">{a.subtitle}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize font-semibold text-xs font-mono">{a.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                          a.is_active
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {a.is_active ? 'Aktif' : 'Off'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAnnouncementModal(a)}
                          className="text-xs font-bold text-primary hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(a.id, a.title)}
                          className="text-xs font-bold text-error hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading || fetching) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium text-foreground/60">Memuat panel administrator...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl">
      {/* Alert Notification system */}
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



      {/* Dashboard Layout (Sidebar on Desktop, Stack on Mobile) */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Navigation Sidebar (Desktop: Left, Mobile: Top) */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col space-y-4">
          
          {/* Mobile Tab Control (Visible on mobile, hamburger menu) */}
          <div className="md:hidden w-full relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-full flex items-center justify-between bg-white border border-border px-4 py-3 rounded-xl shadow-sm text-xs font-bold text-foreground hover:bg-slate-50 transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-slate-400">Navigasi Admin:</span>
                <span className="text-primary font-black uppercase">
                  {activeTab === 'summary' && 'Ringkasan'}
                  {activeTab === 'users' && 'Pengguna'}
                  {activeTab === 'products' && 'Produk'}
                  {activeTab === 'settings' && 'API Config'}
                  {activeTab === 'midtrans' && 'Konfigurasi Midtrans'}
                  {activeTab === 'turnstile' && 'Cloudflare Turnstile'}
                  {activeTab === 'google' && 'Integrasi Google'}
                  {activeTab === 'digiflazz_topup' && 'Isi Saldo Digiflazz'}
                  {activeTab === 'topup_requests' && 'Persetujuan Topup'}
                  {activeTab === 'topup_methods' && 'Metode Transfer'}
                  {activeTab === 'games' && 'Brand / Game'}
                  {activeTab === 'web_settings' && 'Identitas Web'}
                  {activeTab === 'vouchers' && 'Voucher'}
                  {activeTab === 'announcements' && 'Pengumuman'}
                  {activeTab === 'flash_sales' && 'Flash Sale'}
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
                    { key: 'summary', name: 'Ringkasan' },
                    { key: 'users', name: 'Pengguna' },
                    { key: 'games', name: 'Brand / Game' },
                    { key: 'products', name: 'Produk' },
                    { key: 'vouchers', name: 'Voucher' },
                    { key: 'flash_sales', name: 'Flash Sale' },
                    { key: 'announcements', name: 'Pengumuman' },
                    { key: 'topup_requests', name: 'Persetujuan Topup' },
                    { key: 'topup_methods', name: 'Metode Transfer' },
                    { key: 'settings', name: 'API Config' },
                    { key: 'midtrans', name: 'Konfigurasi Midtrans' },
                    { key: 'turnstile', name: 'Cloudflare Turnstile' },
                    { key: 'google', name: 'Integrasi Google' },
                    { key: 'digiflazz_topup', name: 'Isi Saldo Digiflazz' },
                    { key: 'web_settings', name: 'Identitas Web' },
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
                        {tab.key === 'tickets' && pendingTicketsCount > 0 && (
                          <span className="w-4 h-4 bg-error text-white font-extrabold rounded-full flex items-center justify-center text-[9px] scale-95 shrink-0 animate-pulse">
                            {pendingTicketsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Navigation Sidebar (Hidden on mobile, visible on desktop) */}
          <div className="hidden md:flex flex-col bg-white p-3 border border-border rounded-2xl shadow-sm w-full font-heading space-y-4">
            {/* Group: Dashboard */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-1.5 block">
                Dashboard
              </span>
              <button
                onClick={() => setActiveTab('summary')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'summary'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Ringkasan</span>
              </button>
            </div>

            {/* Group: Manajemen */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-1.5 block">
                Manajemen
              </span>
              
              <button
                onClick={() => setActiveTab('users')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'users'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Pengguna</span>
              </button>

              <button
                onClick={() => setActiveTab('games')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'games'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Brand / Game</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'products'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Produk</span>
              </button>

              <button
                onClick={() => setActiveTab('vouchers')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'vouchers'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span>Voucher</span>
              </button>

              <button
                onClick={() => setActiveTab('flash_sales')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'flash_sales'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Flash Sale</span>
              </button>

              <button
                onClick={() => setActiveTab('announcements')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'announcements'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Pengumuman</span>
              </button>

              <button
                onClick={() => setActiveTab('tickets')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
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
                {pendingTicketsCount > 0 && (
                  <span className="w-4 h-4 bg-error text-white font-extrabold rounded-full flex items-center justify-center text-[9px] scale-95 shrink-0 animate-pulse">
                    {pendingTicketsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Group: Keuangan */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-1.5 block">
                Keuangan
              </span>
              
              <button
                onClick={() => setActiveTab('topup_requests')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'topup_requests'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Persetujuan Topup</span>
              </button>

              <button
                onClick={() => setActiveTab('topup_methods')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'topup_methods'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Metode Transfer</span>
              </button>

            </div>

            {/* Group: Digiflazz */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-1.5 block">
                Digiflazz
              </span>
              
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'settings'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>API Config</span>
              </button>

              <button
                onClick={() => setActiveTab('digiflazz_topup')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'digiflazz_topup'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Isi Saldo</span>
              </button>
            </div>

            {/* Group: Midtrans */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-1.5 block">
                Midtrans
              </span>
              
              <button
                onClick={() => setActiveTab('midtrans')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'midtrans'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Konfigurasi Midtrans</span>
              </button>
            </div>

            {/* Group: Keamanan */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-1.5 block">
                Keamanan
              </span>
              
              <button
                onClick={() => setActiveTab('turnstile')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'turnstile'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Cloudflare Turnstile</span>
              </button>

              <button
                onClick={() => setActiveTab('google')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'google'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Integrasi Google</span>
              </button>
            </div>

            {/* Group: Konfigurasi Sistem */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-1.5 block">
                Konfigurasi Sistem
              </span>
              
              <button
                onClick={() => setActiveTab('web_settings')}
                className={`w-[calc(100%-0.75rem)] ml-3 flex items-center space-x-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-l-4 ${
                  activeTab === 'web_settings'
                    ? 'bg-primary/5 text-primary border-primary font-extrabold pl-3'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>Identitas Web</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Content Wrapper */}
        <div className="flex-grow min-w-0 w-full">

      {/* TAB 1: SUMMARY & TRANSACTIONS */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
            <div className="bg-white p-4.5 rounded-2xl border border-border shadow-sm col-span-2 md:col-span-1">
              <span className="block text-[9px] font-bold text-foreground/45 uppercase tracking-wider mb-1">Total Omset</span>
              <span className="text-lg font-extrabold text-success font-heading block leading-none">
                {formatPrice(stats?.total_sales || 0)}
              </span>
              <span className="text-[9px] text-slate-400 mt-1 block">Transaksi lunas</span>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-border shadow-sm">
              <span className="block text-[9px] font-bold text-foreground/45 uppercase tracking-wider mb-1">Total Pesanan</span>
              <span className="text-xl font-extrabold text-foreground font-heading block leading-none">
                {stats?.total_transactions || 0}
              </span>
              <span className="text-[9px] text-slate-400 mt-1 block">Seluruh order</span>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-border shadow-sm">
              <span className="block text-[9px] font-bold text-foreground/45 uppercase tracking-wider mb-1">Top-Up Sukses</span>
              <span className="text-xl font-extrabold text-success font-heading block leading-none">
                {stats?.success_transactions || 0}
              </span>
              <span className="text-[9px] text-success mt-1 block font-bold">
                {stats?.total_transactions ? Math.round((stats.success_transactions / stats.total_transactions) * 100) : 0}% rate
              </span>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-border shadow-sm">
              <span className="block text-[9px] font-bold text-foreground/45 uppercase tracking-wider mb-1">Menunggu Bayar</span>
              <span className="text-xl font-extrabold text-warning font-heading block leading-none">
                {stats?.pending_transactions || 0}
              </span>
              <span className="text-[9px] text-slate-400 mt-1 block">Invoice pending</span>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-border shadow-sm">
              <span className="block text-[9px] font-bold text-foreground/45 uppercase tracking-wider mb-1">Gagal / Cancel</span>
              <span className="text-xl font-extrabold text-error font-heading block leading-none">
                {stats?.failed_transactions || 0}
              </span>
              <span className="text-[9px] text-slate-400 mt-1 block">Gagal top-up/bayar</span>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-border shadow-sm">
              <span className="block text-[9px] font-bold text-foreground/45 uppercase tracking-wider mb-1">Total Pengguna</span>
              <span className="text-xl font-extrabold text-primary font-heading block leading-none">
                {stats?.total_users || 0}
              </span>
              <span className="text-[9px] text-slate-400 mt-1 block">User terdaftar</span>
            </div>
          </div>

          {/* Transactions Filters */}
          <div className="bg-white p-4 md:p-6 rounded-t-2xl border border-border border-b-0 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
            <h2 className="text-base md:text-lg font-bold text-foreground font-heading self-start md:self-center">
              Daftar Transaksi ({filteredTransactions.length})
            </h2>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full md:max-w-xl">
              <input
                type="text"
                placeholder="Cari Invoice, Game, Akun..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-200 focus:border-primary text-foreground placeholder-slate-400"
              />
              <select
                value={txStatus}
                onChange={(e) => setTxStatus(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="paid">Hanya Lunas</option>
                <option value="pending">Hanya Pending</option>
                <option value="completed">Pengiriman Sukses</option>
                <option value="failed">Pengiriman Gagal</option>
              </select>
            </div>
          </div>

          {/* Transactions Cards for MOBILE */}
          <div className="block sm:hidden divide-y divide-slate-100 bg-white rounded-b-2xl border border-border shadow-sm overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-foreground/40 font-medium">Tidak ada transaksi yang cocok.</p>
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedTxForDetail(tx)}
                        className="font-mono font-bold text-xs text-primary hover:underline bg-transparent border-0 cursor-pointer p-0 text-left"
                      >
                        {tx.invoice_id}
                      </button>
                      <span className="block text-[9px] text-foreground/45 mt-0.5">
                        {new Date(tx.created_at).toLocaleString('id-ID', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground block">{formatPrice(tx.amount)}</span>
                      <span className="text-[9px] text-slate-400 font-medium">{tx.payment_method}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Pelanggan</span>
                      <span className="font-semibold text-foreground/80 leading-tight block">
                        {tx.user ? tx.user.name : 'Guest (Tamu)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Game/Produk</span>
                      <span className="font-semibold text-foreground/80 leading-tight block">
                        {tx.game?.name} - {tx.product?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">No. Tujuan</span>
                      <span className="font-mono text-foreground/80 block">
                        {tx.target_id} {tx.target_zone ? `(${tx.target_zone})` : ''}
                      </span>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        {getPaymentStatusBadge(tx.payment_status)}
                        {getDeliveryStatusBadge(tx.delivery_status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Transactions Table for DESKTOP */}
          <div className="hidden sm:block bg-white rounded-b-2xl border border-border overflow-hidden shadow-sm">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-foreground/40 font-medium">Tidak ada transaksi yang cocok.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border text-foreground/60 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Invoice / Tanggal</th>
                      <th className="px-6 py-4">Pelanggan</th>
                      <th className="px-6 py-4">Item Game</th>
                      <th className="px-6 py-4">No. Tujuan</th>
                      <th className="px-6 py-4">Harga</th>
                      <th className="px-6 py-4">Pembayaran</th>
                      <th className="px-6 py-4">Pengiriman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedTxForDetail(tx)}
                            className="font-mono text-xs font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer p-0 text-left block"
                          >
                            {tx.invoice_id}
                          </button>
                          <span className="text-[10px] text-foreground/40 mt-0.5 block">
                            {new Date(tx.created_at).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {tx.user ? (
                            <div>
                              <span className="font-bold text-foreground block">{tx.user.name}</span>
                              <span className="text-foreground/50 block">{tx.user.email}</span>
                            </div>
                          ) : (
                            <span className="text-foreground/40 font-semibold px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                              Guest
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-foreground block leading-tight text-xs">
                            {tx.game?.name}
                          </span>
                          <span className="text-[10px] text-foreground/50 block">
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
                          <div className="flex flex-col items-start gap-1">
                            {getPaymentStatusBadge(tx.payment_status)}
                            <span className="text-[9px] text-foreground/40 uppercase font-semibold">{tx.payment_method}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1">
                            {getDeliveryStatusBadge(tx.delivery_status)}
                            {tx.digiflazz_ref_id && (
                              <span className="text-[9px] text-slate-400 font-mono">SN: {tx.digiflazz_ref_id}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <input
                type="text"
                placeholder="Cari pengguna berdasarkan nama/email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 shadow-sm"
              />
            </div>
            <button
              onClick={() => handleOpenUserModal(null)}
              className="glow-button inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap cursor-pointer text-center"
            >
              + Tambah Pengguna
            </button>
          </div>

          {/* Users Cards for MOBILE */}
          <div className="block sm:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-foreground/40 font-medium">Tidak ada pengguna ditemukan.</p>
              </div>
            ) : (
              filteredUsers.map((usr) => (
                <div key={usr.id} className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-foreground text-sm flex items-center">
                        {usr.name}
                        {usr.id === currentUser?.id && (
                          <span className="ml-1 text-[9px] text-primary italic font-normal bg-primary-light px-1 py-0.5 rounded">
                            (Anda)
                          </span>
                        )}
                      </h4>
                      <p className="text-foreground/60 text-xs mt-0.5">{usr.email}</p>
                    </div>
                    <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                      usr.role === 'admin' 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {usr.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                    <span>Terdaftar: {new Date(usr.created_at).toLocaleDateString('id-ID')}</span>
                    <div className="space-x-2.5 text-xs">
                      <button
                        onClick={() => handleOpenBalanceHistory(usr)}
                        className="font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Riwayat Saldo
                      </button>
                      <button
                        onClick={() => handleOpenUserModal(usr)}
                        className="font-bold text-primary hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      {usr.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(usr.id)}
                          className="font-bold text-error hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Users Table for DESKTOP */}
          <div className="hidden sm:block bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-foreground/40 font-medium">Tidak ada pengguna ditemukan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border text-foreground/60 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Nama</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Terdaftar</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground">
                          {usr.name} {usr.id === currentUser?.id && <span className="text-[10px] text-primary italic font-normal">(Anda)</span>}
                        </td>
                        <td className="px-6 py-4 text-foreground/80">{usr.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            usr.role === 'admin' 
                              ? 'bg-primary/10 text-primary border-primary/20' 
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {usr.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-foreground/50">
                          {new Date(usr.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenBalanceHistory(usr)}
                            className="inline-flex items-center text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                          >
                            Riwayat Saldo
                          </button>
                          <button
                            onClick={() => handleOpenUserModal(usr)}
                            className="inline-flex items-center text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          {usr.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(usr.id)}
                              className="inline-flex items-center text-xs font-bold text-error hover:underline cursor-pointer"
                            >
                              Hapus
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create/Edit User Modal (Mobile Bottom-Sheet and Desktop Centered layout) */}
          {userModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-border overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
                  <h3 className="text-base font-bold text-foreground font-heading">
                    {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                  </h3>
                  <button
                    onClick={() => setUserModalOpen(false)}
                    className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSaveUser} className="overflow-y-auto flex-grow">
                  <div className="p-5 space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground"
                      />
                      {userFormErrors.name && <span className="text-[9px] text-error mt-1 block">{userFormErrors.name[0]}</span>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground"
                      />
                      {userFormErrors.email && <span className="text-[9px] text-error mt-1 block">{userFormErrors.email[0]}</span>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">
                        Password {editingUser && <span className="text-slate-400 lowercase font-normal">(isi jika diganti)</span>}
                      </label>
                      <input
                        type="password"
                        placeholder={editingUser ? 'Kosongkan jika tidak ingin diubah' : 'Min. 8 karakter'}
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground"
                      />
                      {userFormErrors.password && <span className="text-[9px] text-error mt-1 block">{editingUser ? userFormErrors.password[0] : userFormErrors.password}</span>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Saldo Pengguna (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Masukkan nominal saldo"
                        value={userForm.balance}
                        onChange={(e) => setUserForm({ ...userForm, balance: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                      />
                      {userFormErrors.balance && <span className="text-[9px] text-error mt-1 block">{userFormErrors.balance[0]}</span>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Role/Hak Akses</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                        disabled={editingUser?.id === currentUser?.id}
                      >
                        <option value="user">User (Pengguna Biasa)</option>
                        <option value="admin">Admin (Administrator)</option>
                      </select>
                      {editingUser?.id === currentUser?.id && (
                        <span className="text-[9px] text-slate-400 mt-1 block">Anda tidak bisa menurunkan hak akses Anda sendiri.</span>
                      )}
                    </div>
                  </div>
                  <div className="p-5 border-t border-border flex items-center justify-end space-x-3 bg-slate-50 shrink-0">
                    <button
                      type="button"
                      onClick={() => setUserModalOpen(false)}
                      className="px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={userModalSubmitting}
                      className="glow-button px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 cursor-pointer"
                    >
                      {userModalSubmitting ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {adminUserBalanceHistoryModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
              <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-border overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[85vh] flex flex-col">
                <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-base font-bold text-foreground font-heading">
                      Riwayat Saldo Pengguna
                    </h3>
                    <p className="text-[11px] text-foreground/45 mt-0.5 font-semibold">
                      {balanceHistoryUser ? `${balanceHistoryUser.name} (${balanceHistoryUser.email})` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setAdminUserBalanceHistoryModalOpen(false)}
                    className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer bg-transparent border-0"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-5 overflow-y-auto min-h-[300px] max-h-[50vh]">
                  {loadingBalanceHistory ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-foreground/60 mt-4 font-bold">Memuat riwayat saldo...</span>
                    </div>
                  ) : selectedBalanceHistories.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                      Belum ada riwayat mutasi saldo terdaftar untuk pengguna ini.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-border text-slate-500 font-bold uppercase tracking-wider">
                            <th className="px-4 py-3">Tanggal</th>
                            <th className="px-4 py-3">Tipe</th>
                            <th className="px-4 py-3">Nominal</th>
                            <th className="px-4 py-3">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedBalanceHistories.map((hist) => {
                            const isRefund = hist.type === 'refund' || hist.description.toLowerCase().includes('pengembalian dana');
                            return (
                              <tr key={hist.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-4 whitespace-nowrap text-slate-500 font-medium">
                                  {new Date(hist.created_at).toLocaleString('id-ID', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {isRefund ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                                      Refund
                                    </span>
                                  ) : hist.type === 'addition' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                                      Penambahan
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                                      Pengurangan
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap font-bold">
                                  {isRefund ? (
                                    <span className="text-blue-600 font-extrabold">+ {formatPrice(hist.amount)}</span>
                                  ) : hist.type === 'addition' ? (
                                    <span className="text-emerald-600 font-extrabold">+ {formatPrice(hist.amount)}</span>
                                  ) : (
                                    <span className="text-rose-600 font-extrabold">- {formatPrice(hist.amount)}</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-slate-700 font-medium font-sans">
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
                <div className="p-5 border-t border-border flex items-center justify-end bg-slate-50 shrink-0">
                  <button
                    onClick={() => setAdminUserBalanceHistoryModalOpen(false)}
                    className="px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCT MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Filter & Sync Panel */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-border shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2.5 w-full md:max-w-xl">
                <input
                  type="text"
                  placeholder="Cari SKU atau Nama Produk..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400"
                />
                <select
                  value={productGameFilter}
                  onChange={(e) => setProductGameFilter(e.target.value)}
                  className="w-full sm:w-60 px-4 py-2.5 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                >
                  <option value="all">Semua Kategori Game</option>
                  {uniqueGames.map((game) => (
                    <option key={game.id} value={game.id.toString()}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                type="button"
                onClick={handleSyncProducts}
                disabled={syncingProducts}
                className="glow-button inline-flex items-center justify-center w-full md:w-auto px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap disabled:opacity-50 cursor-pointer text-center"
              >
                {syncingProducts ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Syncing...</span>
                  </div>
                ) : (
                  'Sinkronisasi'
                )}
              </button>
            </div>
          </div>

          {/* Bulk Markup Update Panel */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
                Pengaturan Markup Massal (Bulk Update)
              </h3>
              <span className="text-[10px] font-medium text-foreground/40 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shrink-0">
                Terakhir diupdate: <span className="font-mono font-bold text-slate-500">{getLatestProductUpdate()}</span>
              </span>
            </div>
            <form onSubmit={handleBulkUpdateMarkup} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Filter Kategori</label>
                <select
                  value={bulkForm.game_id}
                  onChange={(e) => setBulkForm({ ...bulkForm, game_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  {uniqueGames.map((game) => (
                    <option key={game.id} value={game.id.toString()}>{game.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tipe Keuntungan Baru</label>
                <select
                  value={bulkForm.markup_type}
                  onChange={(e) => setBulkForm({ ...bulkForm, markup_type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                >
                  <option value="global">Ikuti Global</option>
                  <option value="percent">Persentase (%)</option>
                  <option value="flat">Rupiah (Flat IDR)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                  Nilai Keuntungan
                </label>
                <input
                  type="number"
                  required
                  disabled={bulkForm.markup_type === 'global'}
                  value={bulkForm.markup_value}
                  onChange={(e) => setBulkForm({ ...bulkForm, markup_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold disabled:opacity-50"
                  placeholder="Nilai kustom"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="glow-button w-full px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap disabled:opacity-50 cursor-pointer text-center"
                >
                  {bulkSubmitting ? 'Menerapkan...' : 'Terapkan Massal'}
                </button>
              </div>
            </form>
          </div>



          {/* Products Cards for MOBILE */}
          <div className="block sm:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-foreground/40 font-medium">Tidak ada produk ditemukan. Klik sinkronisasi.</p>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const cost = parseFloat(prod.original_price);
                const isFlashSale = prod.flash_sale_price && prod.game && isFlashActive(prod.game.flash_sale_end);
                const sell = isFlashSale ? parseFloat(prod.flash_sale_price!) : parseFloat(prod.price);
                const markup = sell - cost;
                const markupPct = cost > 0 ? Math.round((markup / cost) * 100) : 0;

                return (
                  <div key={prod.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-flex items-center text-[9px] font-bold text-primary uppercase tracking-wide bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded leading-none">
                          <span>{prod.game?.name || 'Unknown'}</span>
                        </span>
                        <h4 className="font-bold text-foreground text-sm mt-1.5 leading-snug">{prod.name}</h4>
                        <span className="font-mono text-[9px] text-slate-400 block mt-0.5">SKU: {prod.buyer_sku_code}</span>
                      </div>
                      
                      {prod.is_available ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-success/10 text-success border border-success/20 text-[9px] font-bold uppercase">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-error/10 text-error border border-error/20 text-[9px] font-bold uppercase">
                          Kosong
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px]">
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <div>
                          <span className="text-slate-400 block text-[9px]">Modal (Digi)</span>
                          <span className="font-mono font-semibold text-slate-500">{formatPrice(prod.original_price)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Jual ({(webNameForm.split(' ')[0] || 'YOI')})</span>
                          <span className="font-mono font-bold text-foreground">{formatPrice(prod.price)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Aturan / Margin Profit</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isFlashSale ? (
                              <>
                                <span className={markup < 0 ? 'text-error font-extrabold' : 'text-[#e11d48] font-extrabold'}>
                                  {formatPrice(markup)} ({markupPct}%)
                                </span>
                                <span className="text-[8px] font-black text-[#e11d48] bg-[#e11d48]/10 border border-[#e11d48]/20 px-1.5 py-0.5 rounded leading-none uppercase shrink-0">
                                  Flash Sale
                                </span>
                              </>
                            ) : (
                              <span className="font-semibold text-success block">
                                {getProductMarkupLabel(prod)} &rarr; {formatPrice(markup)} ({markupPct}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleOpenProductEdit(prod)}
                        className="font-bold text-primary hover:underline cursor-pointer border border-primary/20 hover:bg-primary-light px-2.5 py-1 rounded-lg text-xs"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Products Table for DESKTOP */}
          <div className="hidden sm:block bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-foreground/40 font-medium">Tidak ada produk ditemukan. Silakan klik sinkronisasi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border text-foreground/60 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Brand/Game</th>
                      <th className="px-6 py-4">Nama Item</th>
                      <th className="px-6 py-4">SKU Code</th>
                      <th className="px-6 py-4">Harga Modal (Digiflazz)</th>
                      <th className="px-6 py-4">Aturan Markup</th>
                      <th className="px-6 py-4">Harga Jual ({(webNameForm.split(' ')[0] || 'YOI')})</th>
                      <th className="px-6 py-4 text-[#e11d48]">Harga Flash Sale</th>
                      <th className="px-6 py-4">Margin Profit</th>
                      <th className="px-6 py-4">Ketersediaan</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((prod) => {
                      const cost = parseFloat(prod.original_price);
                      const isFlashSale = prod.flash_sale_price && prod.game && isFlashActive(prod.game.flash_sale_end);
                      const sell = isFlashSale ? parseFloat(prod.flash_sale_price!) : parseFloat(prod.price);
                      const markup = sell - cost;
                      const markupPct = cost > 0 ? Math.round((markup / cost) * 100) : 0;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-foreground text-xs uppercase">
                            <span>{prod.game?.name || 'Unknown'}</span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-foreground">{prod.name}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{prod.buyer_sku_code}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">{formatPrice(prod.original_price)}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{getProductMarkupLabel(prod)}</td>
                          <td className="px-6 py-4 font-mono font-bold text-foreground">
                            {isFlashSale ? (
                              <div className="flex flex-col">
                                <span className="line-through text-slate-400 text-[10px]">{formatPrice(prod.price)}</span>
                                <span className="font-black text-[#e11d48]">{formatPrice(prod.flash_sale_price!)}</span>
                              </div>
                            ) : (
                              formatPrice(prod.price)
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-semibold text-[#e11d48]">
                             {prod.flash_sale_price ? formatPrice(prod.flash_sale_price) : '-'}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold">
                            {isFlashSale ? (
                              <div className="flex flex-col">
                                <span className={markup < 0 ? 'text-error font-extrabold' : 'text-[#e11d48] font-extrabold'}>
                                  {formatPrice(markup)} ({markupPct}%)
                                </span>
                                <span className="text-[8px] font-black text-[#e11d48] uppercase tracking-wider leading-none mt-1 bg-[#e11d48]/10 px-1.5 py-0.5 rounded border border-[#e11d48]/20 self-start">
                                  Flash Sale Aktif
                                </span>
                              </div>
                            ) : (
                              <span className="text-success font-semibold">
                                {formatPrice(markup)} <span className="text-[10px] text-success/60 font-medium">({markupPct}%)</span>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {prod.is_available ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-success/10 text-success border border-success/20 text-[10px] font-bold uppercase">
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-error/10 text-error border border-error/20 text-[10px] font-bold uppercase">
                                Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenProductEdit(prod)}
                              className="inline-flex items-center text-xs font-bold text-primary hover:underline cursor-pointer"
                            >
                              Edit Harga
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: API SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 text-xs">
          {/* Settings Form Wrapper */}
          <div className="md:col-span-2 space-y-6">
            {/* Card 1: Digiflazz API Config */}
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-5">Konfigurasi Digiflazz API</h2>
              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Digiflazz Username</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.digiflazz_username}
                      onChange={(e) => setSettingsForm({ ...settingsForm, digiflazz_username: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-medium"
                      placeholder="Username Digiflazz"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">API Mode</label>
                    <select
                      value={settingsForm.digiflazz_mode}
                      onChange={(e) => setSettingsForm({ ...settingsForm, digiflazz_mode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                    >
                      <option value="development">Development (Testing Sandbox)</option>
                      <option value="production">Production (Live Real-Balance)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Developer API Key</label>
                  <input
                    type="password"
                    required
                    value={settingsForm.digiflazz_api_key}
                    onChange={(e) => setSettingsForm({ ...settingsForm, digiflazz_api_key: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-mono"
                    placeholder="Digiflazz API Key"
                  />
                </div>

                <div className="border-t border-border pt-5 mt-5">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 leading-none">
                    Default Keuntungan Global (Markup)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Tipe Keuntungan</label>
                      <select
                        value={settingsForm.global_markup_type}
                        onChange={(e) => setSettingsForm({ ...settingsForm, global_markup_type: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                      >
                        <option value="percent">Persentase (%)</option>
                        <option value="flat">Rupiah (Flat IDR)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Nilai Keuntungan</label>
                      <input
                        type="number"
                        required
                        value={settingsForm.global_markup_value}
                        onChange={(e) => setSettingsForm({ ...settingsForm, global_markup_value: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                        placeholder={settingsForm.global_markup_type === 'percent' ? 'Contoh: 10 untuk 10%' : 'Contoh: 1500 untuk Rp 1.500'}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={settingsSubmitting}
                    className="glow-button px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {settingsSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Server IP */}
          <div className="flex flex-col gap-6">
            {/* Server IP Card */}
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm flex flex-col space-y-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-1">IP Server Anda</h2>
                <p className="text-xs text-foreground/45">Daftarkan IP ini pada whitelist koneksi IP Digiflazz Anda</p>
              </div>

              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-none">Alamat IP Publik</span>
                <span className="text-sm md:text-base font-mono font-bold text-foreground select-all break-all text-center">
                  {serverIp || 'Memuat...'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyIp}
                disabled={!serverIp}
                className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors uppercase tracking-wider cursor-pointer"
              >
                {copiedIp ? (
                  <span className="text-success font-semibold flex items-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    IP Berhasil Disalin
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3h2a2 2 0 012 2v2m-6-4H8a2 2 0 00-2 2v2" />
                    </svg>
                    Salin IP Server
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MIDTRANS CONFIG */}
      {activeTab === 'midtrans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 text-xs">
          {/* Settings Form Wrapper */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-5">Konfigurasi Midtrans Payment Gateway</h2>
              <form onSubmit={handleSaveMidtransSettings} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Status Aktif</label>
                    <div
                      onClick={() => setSettingsForm({ ...settingsForm, midtrans_is_active: !settingsForm.midtrans_is_active })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer select-none transition-all hover:bg-slate-100/50 min-h-[42px]"
                    >
                      <span className="text-xs font-semibold text-foreground/80">
                        {settingsForm.midtrans_is_active ? 'Aktif (Gunakan Midtrans)' : 'Non-Aktif (Sembunyikan)'}
                      </span>
                      <button
                        type="button"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          settingsForm.midtrans_is_active ? 'bg-primary' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            settingsForm.midtrans_is_active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Midtrans Mode</label>
                    <select
                      value={settingsForm.midtrans_mode}
                      onChange={(e) => setSettingsForm({ ...settingsForm, midtrans_mode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                    >
                      <option value="sandbox">Sandbox (Testing / Demo)</option>
                      <option value="production">Production (Live Payments)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Client Key</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.midtrans_client_key}
                    onChange={(e) => setSettingsForm({ ...settingsForm, midtrans_client_key: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-semibold"
                    placeholder="Contoh: SB-Mid-client-XXXXX"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Server Key</label>
                  <input
                    type="password"
                    required
                    value={settingsForm.midtrans_server_key}
                    onChange={(e) => setSettingsForm({ ...settingsForm, midtrans_server_key: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-mono"
                    placeholder="Contoh: SB-Mid-server-XXXXX"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={settingsSubmitting}
                    className="glow-button px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {settingsSubmitting ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Webhook URL */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm flex flex-col space-y-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-1">Webhook URL Notification</h2>
                <p className="text-xs text-foreground/45">Daftarkan URL ini di dashboard Midtrans (Settings &rarr; Payment &rarr; Notification URL)</p>
              </div>

              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-none">URL Callback Webhook</span>
                <span className="text-sm md:text-base font-mono font-bold text-foreground select-all break-all text-center">
                  {typeof window !== 'undefined' ? `${window.location.origin.replace('3000', '8000')}/api/webhooks/midtrans` : 'Memuat...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CLOUDFLARE TURNSTILE */}
      {activeTab === 'turnstile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 text-xs">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-5">Konfigurasi Cloudflare Turnstile</h2>
              <form onSubmit={handleSaveTurnstileSettings} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Status Proteksi Bot</label>
                  <div
                    onClick={() => setSettingsForm({ ...settingsForm, turnstile_enabled: !settingsForm.turnstile_enabled })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer select-none transition-all hover:bg-slate-100/50 min-h-[42px]"
                  >
                    <span className="text-xs font-semibold text-foreground/80">
                      {settingsForm.turnstile_enabled ? 'Aktif (Gunakan Turnstile)' : 'Non-Aktif (Sembunyikan)'}
                    </span>
                    <button
                      type="button"
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settingsForm.turnstile_enabled ? 'bg-primary' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settingsForm.turnstile_enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Turnstile Site Key</label>
                  <input
                    type="text"
                    required={settingsForm.turnstile_enabled}
                    value={settingsForm.turnstile_site_key}
                    onChange={(e) => setSettingsForm({ ...settingsForm, turnstile_site_key: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-semibold"
                    placeholder="Masukkan Cloudflare Turnstile Site Key"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Turnstile Secret Key</label>
                  <input
                    type="password"
                    required={settingsForm.turnstile_enabled}
                    value={settingsForm.turnstile_secret_key}
                    onChange={(e) => setSettingsForm({ ...settingsForm, turnstile_secret_key: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-mono"
                    placeholder="Masukkan Cloudflare Turnstile Secret Key"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={settingsSubmitting}
                    className="glow-button px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {settingsSubmitting ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm flex flex-col space-y-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-1">Tentang Turnstile</h2>
                <p className="text-xs text-foreground/45 leading-relaxed">
                  Cloudflare Turnstile adalah alternatif reCAPTCHA gratis, ramah pengguna, dan menjaga privasi. Fitur ini memverifikasi bahwa pengunjung adalah manusia tanpa memberikan tantangan visual (puzzle) yang mengganggu.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <a
                    href="https://dash.cloudflare.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Dapatkan Kunci Turnstile &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: GOOGLE INTEGRATION */}
      {activeTab === 'google' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 text-xs">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-5">Integrasi Google Login</h2>
              <form onSubmit={handleSaveGoogleSettings} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Status Login Google</label>
                  <div
                    onClick={() => setSettingsForm({ ...settingsForm, google_login_enabled: !settingsForm.google_login_enabled })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer select-none transition-all hover:bg-slate-100/50 min-h-[42px]"
                  >
                    <span className="text-xs font-semibold text-foreground/80">
                      {settingsForm.google_login_enabled ? 'Aktif (Gunakan Login Google)' : 'Non-Aktif (Sembunyikan)'}
                    </span>
                    <button
                      type="button"
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settingsForm.google_login_enabled ? 'bg-primary' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settingsForm.google_login_enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Google Client ID</label>
                  <input
                    type="text"
                    required={settingsForm.google_login_enabled}
                    value={settingsForm.google_client_id}
                    onChange={(e) => setSettingsForm({ ...settingsForm, google_client_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-semibold"
                    placeholder="Masukkan Google Client ID"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={settingsSubmitting}
                    className="glow-button px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {settingsSubmitting ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm flex flex-col space-y-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-1">Tentang Integrasi Google</h2>
                <p className="text-xs text-foreground/45 leading-relaxed">
                  Integrasi Google Login memungkinkan reseller/pengguna Anda untuk mendaftar atau masuk ke akun mereka hanya dengan satu klik menggunakan akun Google mereka. Hal ini meningkatkan konversi pendaftaran dan mempermudah pengalaman pengguna.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Buka Google Cloud Console &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DIGIFLAZZ TOPUP */}
      {activeTab === 'digiflazz_topup' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 text-xs">
          {/* Top Up Saldo Digiflazz Panel */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm flex flex-col space-y-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-1">Top Up Saldo Digiflazz</h2>
                <p className="text-xs text-foreground/45">Buat tiket deposit saldo untuk ditransfer</p>
              </div>

              {!depositTicket ? (
                <form onSubmit={handleRequestDeposit} className="space-y-3 text-left">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nominal Top Up</label>
                    <input
                      type="number"
                      required
                      min={200000}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Minimal 200000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-primary text-xs font-semibold text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tujuan Bank</label>
                    <select
                      value={depositBank}
                      onChange={(e) => setDepositBank(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-primary text-xs font-semibold text-foreground cursor-pointer"
                    >
                      <option value="BCA">BCA (Perusahaan)</option>
                      <option value="MANDIRI">MANDIRI (Perusahaan)</option>
                      <option value="BRI">BRI (Perusahaan)</option>
                      <option value="BNI">BNI (Perusahaan)</option>
                      <option value="Flip">Flip (Perorangan)</option>
                      <option value="ShopeePay">ShopeePay (Perorangan)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Pemilik Rekening Anda</label>
                    <input
                      type="text"
                      required
                      value={depositOwnerName}
                      onChange={(e) => setDepositOwnerName(e.target.value)}
                      placeholder="Nama Pengirim Transfer"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-primary text-xs font-semibold text-foreground"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={depositSubmitting}
                    className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-colors uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    {depositSubmitting ? 'Memproses...' : 'Buat Tiket Deposit'}
                  </button>
                </form>
              ) : (
                <div className="space-y-3.5 text-left animate-in fade-in duration-300">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-[11px] text-amber-800 leading-relaxed font-medium">
                    ⚠️ Silakan transfer dana tepat sesuai instruksi di bawah agar deposit dapat diverifikasi secara otomatis oleh Digiflazz.
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3 font-mono text-[11px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Bank Tujuan</span>
                      <span className="font-extrabold text-foreground">{depositTicket.bank} ({depositTicket.payment_method})</span>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 relative">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Nomor Rekening</span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{depositTicket.account_no}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(depositTicket.account_no, 'account')}
                          className="text-[10px] font-sans font-bold text-primary hover:underline cursor-pointer"
                        >
                          {copiedDepositAccount ? 'Disalin' : 'Salin'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Nominal Wajib Transfer</span>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-error text-xs">
                          {formatPrice(depositTicket.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(depositTicket.amount.toString(), 'amount')}
                          className="text-[10px] font-sans font-bold text-primary hover:underline cursor-pointer"
                        >
                          {copiedDepositAmount ? 'Disalin' : 'Salin'}
                        </button>
                      </div>
                    </div>

                    {depositTicket.notes && (
                      <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Berita / Keterangan Transfer</span>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground bg-slate-100 px-1.5 py-0.5 rounded">{depositTicket.notes}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(depositTicket.notes, 'notes')}
                            className="text-[10px] font-sans font-bold text-primary hover:underline cursor-pointer"
                          >
                            {copiedDepositNotes ? 'Disalin' : 'Salin'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCheckBalance()}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Cek Saldo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDepositTicket(null);
                        setDepositAmount('');
                        setDepositOwnerName('');
                      }}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Buat Tiket Baru
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Riwayat Pengajuan Tiket Deposit */}
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-1">Riwayat Pengajuan Tiket Deposit</h2>
                <p className="text-xs text-foreground/45">Daftar tiket pengisian saldo Digiflazz yang telah diajukan</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-foreground/50 uppercase tracking-wider font-bold">
                      <th className="pb-3 pl-3">Waktu Pengajuan</th>
                      <th className="pb-3">Pengirim</th>
                      <th className="pb-3">Bank & Rekening Tujuan</th>
                      <th className="pb-3 text-right">Nominal Transfer</th>
                      <th className="pb-3 text-right pr-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {depositHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-foreground/40 font-medium">
                          Belum ada riwayat tiket deposit yang diajukan.
                        </td>
                      </tr>
                    ) : (
                      depositHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pl-3">
                            <span className="font-semibold text-slate-700 block">
                              {new Date(item.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {new Date(item.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-slate-800">
                            {item.owner_name}
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-slate-700 block">{item.bank}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{item.account_no}</span>
                          </td>
                          <td className="py-3 text-right font-extrabold text-error font-mono">
                            {formatPrice(item.final_amount)}
                            {item.final_amount !== item.amount && (
                              <span className="text-[9px] text-slate-400 block font-sans font-normal">
                                Base: {formatPrice(item.amount)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right pr-3 text-slate-600 font-mono text-[10px] max-w-[180px] truncate" title={item.notes || ''}>
                            {item.notes ? (
                              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block select-all">
                                {item.notes}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-sans">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Cek Saldo */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm flex flex-col justify-between space-y-5">
              <div>
                <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-1">Cek Saldo</h2>
                <p className="text-xs text-foreground/45">Pantau saldo deposit akun Digiflazz Anda</p>
              </div>
              
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 leading-none">Saldo Deposit</span>
                {checkingBalance ? (
                  <div className="py-2.5 flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : digiflazzBalance !== null ? (
                  <span className="text-xl font-extrabold text-success font-heading block leading-tight tracking-tight">
                    {formatPrice(digiflazzBalance)}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400 block py-2.5 leading-none">
                    Belum dicek
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleCheckBalance}
                disabled={checkingBalance}
                className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Cek Saldo Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'topup_requests' && renderTopupRequests()}
      {activeTab === 'topup_methods' && renderTopupMethods()}
      {activeTab === 'games' && renderGames()}
      {activeTab === 'vouchers' && renderVouchers()}
      {activeTab === 'announcements' && renderAnnouncements()}
      {activeTab === 'flash_sales' && renderFlashSales()}
      {activeTab === 'tickets' && renderTickets()}

      {activeTab === 'web_settings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 text-xs">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-5">Nama Website & Footer</h2>
              <form onSubmit={handleSaveWebSettings} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Nama Website Kustom</label>
                  <input
                    type="text"
                    required
                    value={webNameForm}
                    onChange={(e) => setWebNameForm(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-semibold"
                    placeholder="Contoh: YOI Store"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Deskripsi Footer</label>
                  <textarea
                    rows={3}
                    value={footerDescForm}
                    onChange={(e) => setFooterDescForm(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-medium"
                    placeholder="Deskripsi singkat platform Anda di bagian footer..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">WhatsApp Hubungi Kami</label>
                    <input
                      type="text"
                      value={footerWAForm}
                      onChange={(e) => setFooterWAForm(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-semibold"
                      placeholder="Contoh: +62 812-3456-7890"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Email Hubungi Kami</label>
                    <input
                      type="email"
                      value={footerEmailForm}
                      onChange={(e) => setFooterEmailForm(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-semibold"
                      placeholder="Contoh: support@domain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Jam Operasional</label>
                    <input
                      type="text"
                      value={footerHoursForm}
                      onChange={(e) => setFooterHoursForm(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground placeholder-slate-400 font-semibold"
                      placeholder="Contoh: 24 Jam Non-stop"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={webSettingsSubmitting}
                    className="glow-button px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {webSettingsSubmitting ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-1">Identitas Visual Website</h2>
              <p className="text-xs text-foreground/45 mb-5">Sesuaikan logo dan ikon favicon website Anda</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                {/* Upload Logo Panel */}
                <div className="flex flex-col items-center p-5 rounded-2xl border border-slate-100 bg-slate-50 relative overflow-hidden text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 block leading-none">Logo Website (Rasio 1:1)</span>
                  <div className="relative w-24 h-24 flex items-center justify-center bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    {brandLogo ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${brandLogo}`}
                        alt="Logo Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-400 font-extrabold text-xl font-heading">
                        {(webNameForm.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase()) || 'YOI'}
                      </span>
                    )}
                    {logoUploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <label className="mt-4 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 active:bg-slate-200 rounded-xl text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer shadow-xs transition-colors">
                    <span>{logoUploading ? 'Mengunggah...' : 'Pilih Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={logoUploading}
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Upload Favicon Panel */}
                <div className="flex flex-col items-center p-5 rounded-2xl border border-slate-100 bg-slate-50 relative overflow-hidden text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 block leading-none">Favicon Website (ICO/PNG)</span>
                  <div className="relative w-24 h-24 flex items-center justify-center bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    {favicon ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${favicon}`}
                        alt="Favicon Preview"
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary-light border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        Fav
                      </div>
                    )}
                    {faviconUploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <label className="mt-4 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 active:bg-slate-200 rounded-xl text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer shadow-xs transition-colors">
                    <span>{faviconUploading ? 'Mengunggah...' : 'Pilih Favicon'}</span>
                    <input
                      type="file"
                      disabled={faviconUploading}
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-sm flex flex-col space-y-4">
              <h2 className="text-base md:text-lg font-bold text-foreground font-heading mb-1">Informasi Web</h2>
              <p className="text-xs text-foreground/50 leading-relaxed">
                Nama website Anda digunakan di berbagai lokasi seperti header halaman, judul halaman browser tab, dan notifikasi transaksi. 
              </p>
              <p className="text-xs text-foreground/50 leading-relaxed">
                Logo digunakan untuk identitas brand di navigasi utama, sedangkan favicon digunakan sebagai ikon tab browser.
              </p>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Voucher Modal Form */}
      {voucherModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground font-heading">
                {editingVoucher ? 'Edit Voucher' : 'Tambah Voucher Baru'}
              </h3>
              <button
                onClick={() => setVoucherModalOpen(false)}
                className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveVoucher} className="flex-grow flex flex-col overflow-hidden text-xs">
              <div className="p-5 overflow-y-auto flex-grow space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Kode Voucher</label>
                  <input
                    type="text"
                    required
                    value={voucherForm.code}
                    onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold uppercase"
                    placeholder="Contoh: PROMO10"
                  />
                  {voucherFormErrors.code && (
                    <p className="text-error mt-1 text-[10px] font-semibold">{voucherFormErrors.code[0]}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Tipe Diskon</label>
                    <select
                      value={voucherForm.discount_type}
                      onChange={(e) => setVoucherForm({ ...voucherForm, discount_type: e.target.value as 'percent' | 'flat' })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                    >
                      <option value="percent">Persentase (%)</option>
                      <option value="flat">Flat (Nominal)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">
                      {voucherForm.discount_type === 'percent' ? 'Nilai Persen (%)' : 'Nominal Potongan (Rp)'}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={voucherForm.discount_value}
                      onChange={(e) => setVoucherForm({ ...voucherForm, discount_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                      placeholder="Contoh: 10 atau 10000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Min. Belanja (Rp)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={voucherForm.min_transaction}
                      onChange={(e) => setVoucherForm({ ...voucherForm, min_transaction: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                      placeholder="Contoh: 10000"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Maks. Potongan (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={voucherForm.max_discount}
                      onChange={(e) => setVoucherForm({ ...voucherForm, max_discount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                      placeholder="Kosongkan jika flat"
                      disabled={voucherForm.discount_type === 'flat'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Kuota Pemakaian</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={voucherForm.quota}
                      onChange={(e) => setVoucherForm({ ...voucherForm, quota: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                      placeholder="Contoh: 100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Status Aktif</label>
                    <select
                      value={voucherForm.is_active ? 'aktif' : 'nonaktif'}
                      onChange={(e) => setVoucherForm({ ...voucherForm, is_active: e.target.value === 'aktif' })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                    >
                      <option value="aktif">Aktif (Dapat digunakan)</option>
                      <option value="nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-border shrink-0 flex items-center justify-end space-x-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setVoucherModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-100 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={voucherSubmitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover active:bg-primary-dark transition-colors uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {voucherSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal Form */}
      {announcementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col text-xs">
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground font-heading">
                {editingAnnouncement ? 'Edit Pengumuman' : 'Tambah Pengumuman Baru'}
              </h3>
              <button
                onClick={() => setAnnouncementModalOpen(false)}
                className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveAnnouncement} className="flex-grow flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto flex-grow space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Judul Pengumuman</label>
                  <input
                    type="text"
                    required
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                    placeholder="Contoh: Pemeliharaan Sistem, Promo Spesial"
                  />
                  {announcementFormErrors.title && (
                    <p className="text-error mt-1 text-[10px] font-semibold">{announcementFormErrors.title[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Sub Judul / Detail</label>
                  <textarea
                    value={announcementForm.subtitle}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, subtitle: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-medium"
                    placeholder="Contoh: Kami akan melakukan pemeliharaan sistem pada pukul 02:00 WIB..."
                  />
                  {announcementFormErrors.subtitle && (
                    <p className="text-error mt-1 text-[10px] font-semibold">{announcementFormErrors.subtitle[0]}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Tipe Alert (Tema Warna)</label>
                    <select
                      value={announcementForm.type}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                    >
                      <option value="info">Info (Biru/Indigo)</option>
                      <option value="success">Sukses (Hijau)</option>
                      <option value="warning">Peringatan (Kuning/Oranye)</option>
                      <option value="danger">Bahaya (Merah)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Label Tipe (e.g. PROMO, PENTING)</label>
                    <input
                      type="text"
                      value={announcementForm.type_label}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, type_label: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold uppercase"
                      placeholder="Contoh: PROMO, PENTING, INFO"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id="announcement_is_active_checkbox"
                    checked={announcementForm.is_active}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary/20 cursor-pointer"
                  />
                  <label htmlFor="announcement_is_active_checkbox" className="text-xs font-semibold text-foreground/80 cursor-pointer select-none">
                    Pengumuman Aktif (Tampilkan kepada pengguna)
                  </label>
                </div>
              </div>
              <div className="p-5 border-t border-border shrink-0 flex items-center justify-end space-x-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-100 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={announcementSubmitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover active:bg-primary-dark transition-colors uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {announcementSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Game (Brand) Modal Form */}
      {gameModalOpen && editingGame && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col text-xs">
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground font-heading">
                Pengaturan Brand: <span className="text-primary">{editingGame.name}</span>
              </h3>
              <button
                onClick={() => setGameModalOpen(false)}
                className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveGame} className="flex-grow flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto flex-grow space-y-4">
                <div className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id="game_is_active_checkbox"
                    checked={gameForm.is_active}
                    onChange={(e) => setGameForm({ ...gameForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary/20 cursor-pointer"
                  />
                  <label htmlFor="game_is_active_checkbox" className="text-xs font-semibold text-foreground/80 cursor-pointer select-none">
                    Brand Aktif (Tampilkan di katalog halaman utama)
                  </label>
                </div>
              </div>
              <div className="p-5 border-t border-border shrink-0 flex items-center justify-end space-x-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setGameModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-100 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={gameSubmitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover active:bg-primary-dark transition-colors uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {gameSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Product Modal Form */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col text-xs">
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground font-heading">
                Atur Harga & Markup: <span className="text-primary">{editingProduct.name}</span>
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="flex-grow flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto flex-grow space-y-4">
                
                {/* Cost Info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[10px] font-bold text-foreground/50 uppercase mb-1">Harga Modal (Provider)</span>
                    <span className="block font-mono font-black text-slate-600 text-sm leading-none pt-1">{formatPrice(editingProduct.original_price)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-foreground/50 uppercase mb-1">Estimasi Harga Jual</span>
                    <span className="block font-mono font-black text-success text-sm leading-none pt-1">{formatPrice(calculatePreviewPrice())}</span>
                  </div>
                </div>

                {/* Markup Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Tipe Keuntungan (Markup)</label>
                    <select
                      value={productForm.markup_type}
                      onChange={(e) => setProductForm({ ...productForm, markup_type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                    >
                      <option value="global">Ikuti Global</option>
                      <option value="percent">Persentase (%)</option>
                      <option value="flat">Rupiah (Flat IDR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Nilai Keuntungan</label>
                    <input
                      type="number"
                      required
                      disabled={productForm.markup_type === 'global'}
                      value={productForm.markup_value}
                      onChange={(e) => setProductForm({ ...productForm, markup_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Flash Sale Price */}
                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Harga Flash Sale (Opsional)</label>
                  <input
                    type="number"
                    placeholder="Masukkan harga promo, cth: 15000"
                    value={productForm.flash_sale_price}
                    onChange={(e) => setProductForm({ ...productForm, flash_sale_price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                  />
                  {/* Estimasi Margin Profit Flash Sale */}
                  {productForm.flash_sale_price && parseFloat(productForm.flash_sale_price) > 0 && (
                    <div className="mt-2 text-[10px] font-semibold flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500">Estimasi Margin Profit Flash Sale:</span>
                      {(() => {
                        const cost = parseFloat(editingProduct.original_price) || 0;
                        const flashPrice = parseFloat(productForm.flash_sale_price) || 0;
                        const margin = flashPrice - cost;
                        const pct = cost > 0 ? Math.round((margin / cost) * 100) : 0;
                        const isNegative = margin < 0;
                        return (
                          <span className={isNegative ? 'text-error font-black animate-pulse' : 'text-success font-black'}>
                            {formatPrice(margin)} ({pct}%)
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  <p className="text-[9px] text-foreground/45 mt-1 leading-relaxed">
                    *Harga promo ini hanya akan aktif jika periode flash sale pada brand game produk ini diaktifkan.
                  </p>
                </div>

                {/* Product Availability */}
                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">Status Stok / Ketersediaan</label>
                  <select
                    value={productForm.is_available ? '1' : '0'}
                    onChange={(e) => setProductForm({ ...productForm, is_available: e.target.value === '1' })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-semibold cursor-pointer"
                  >
                    <option value="1">Aktif / Tersedia</option>
                    <option value="0">Nonaktif / Kosong</option>
                  </select>
                </div>

              </div>

              <div className="p-5 border-t border-border shrink-0 flex items-center justify-end space-x-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-100 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={productSubmitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover active:bg-primary-dark transition-colors uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {productSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Flash Sale Modal Form */}
      {editingFlashSaleProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col text-xs">
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground font-heading">
                Pengaturan Flash Sale: <span className="text-primary">{editingFlashSaleProduct.name}</span>
              </h3>
              <button
                onClick={() => setEditingFlashSaleProduct(null)}
                className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSaveFlashSale} className="flex-grow flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto flex-grow space-y-4">
                
                {/* Cost & Normal Price Info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[10px] font-bold text-foreground/50 uppercase mb-1">Harga Modal</span>
                    <span className="block font-mono font-black text-slate-600 text-sm leading-none pt-1">
                      {formatPrice(editingFlashSaleProduct.original_price)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-foreground/50 uppercase mb-1">Harga Reguler (Jual)</span>
                    <span className="block font-mono font-black text-slate-700 text-sm leading-none pt-1">
                      {formatPrice(editingFlashSaleProduct.price)}
                    </span>
                  </div>
                </div>

                {/* Flash Sale Price */}
                <div>
                  <label className="block text-[10px] font-bold text-[#e11d48] uppercase tracking-wider mb-2">Harga Flash Sale (IDR)</label>
                  <input
                    type="number"
                    placeholder="Masukkan harga promo, kosongkan untuk hapus promo"
                    value={flashSaleForm.price}
                    onChange={(e) => setFlashSaleForm({ ...flashSaleForm, price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-[#e11d48] text-foreground font-bold"
                  />
                  {/* Estimasi Margin Profit Flash Sale */}
                  {flashSaleForm.price && parseFloat(flashSaleForm.price) > 0 && (
                    <div className="mt-2 text-[10px] font-semibold flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500">Estimasi Margin Profit Flash Sale:</span>
                      {(() => {
                        const { margin, pct, isNegative } = calculateFlashSaleMargin();
                        return (
                          <span className={isNegative ? 'text-error font-black animate-pulse' : 'text-success font-black'}>
                            {formatPrice(margin)} ({pct}%)
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  {flashSaleFormErrors.price && (
                    <p className="text-error mt-1 text-[10px] font-semibold">{flashSaleFormErrors.price[0]}</p>
                  )}
                </div>

                {/* Flash Sale End Time */}
                <div>
                  <label className="block text-[10px] font-bold text-foreground/75 uppercase tracking-wider mb-2">
                    Batas Waktu Flash Sale
                  </label>
                  <input
                    type="datetime-local"
                    value={flashSaleForm.end}
                    onChange={(e) => setFlashSaleForm({ ...flashSaleForm, end: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-xs focus:outline-none border border-slate-200 focus:border-primary text-foreground font-bold"
                  />
                  <p className="text-[9px] text-foreground/45 mt-1 leading-relaxed">
                    *Tentukan kapan periode flash sale untuk brand <strong>{editingFlashSaleProduct.game?.name || 'ini'}</strong> berakhir. Kosongkan untuk menonaktifkan flash sale pada brand ini.
                  </p>
                  {flashSaleFormErrors.end && (
                    <p className="text-error mt-1 text-[10px] font-semibold">{flashSaleFormErrors.end[0]}</p>
                  )}
                </div>

              </div>

              <div className="p-5 border-t border-border shrink-0 flex items-center justify-end space-x-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setEditingFlashSaleProduct(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-100 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={flashSaleSubmitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover active:bg-primary-dark transition-colors uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {flashSaleSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>

      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl border border-border p-5 animate-in zoom-in-95 duration-200 text-center flex flex-col items-center">
            {confirmModal.type === 'danger' && (
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 text-xl font-bold">
                ⚠️
              </div>
            )}
            {confirmModal.type === 'warning' && (
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 text-xl font-bold">
                🔔
              </div>
            )}
            {confirmModal.type === 'success' && (
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 text-xl font-bold">
                ✅
              </div>
            )}
            {confirmModal.type === 'info' && (
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-500 text-xl font-bold">
                ℹ️
              </div>
            )}
            <h4 className="text-xs font-extrabold text-slate-800 font-heading mt-3 uppercase tracking-wider">
              {confirmModal.title}
            </h4>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-center space-x-2.5 mt-5 w-full">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-wider cursor-pointer flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({ ...confirmModal, isOpen: false });
                  confirmModal.onConfirm();
                }}
                className={`px-4 py-2.5 rounded-lg text-[10px] font-bold text-white transition-all uppercase tracking-wider cursor-pointer flex-1 ${
                  confirmModal.type === 'danger' ? 'bg-red-500 hover:bg-red-600' :
                  confirmModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                  confirmModal.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' :
                  'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl border border-border p-5 animate-in zoom-in-95 duration-200 text-center flex flex-col items-center">
            {alertModal.type === 'danger' && (
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 text-xl font-bold">
                ❌
              </div>
            )}
            {alertModal.type === 'warning' && (
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 text-xl font-bold">
                ⚠️
              </div>
            )}
            {alertModal.type === 'success' && (
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 text-xl font-bold">
                🎉
              </div>
            )}
            {alertModal.type === 'info' && (
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-500 text-xl font-bold">
                💡
              </div>
            )}
            <h4 className="text-xs font-extrabold text-slate-800 font-heading mt-3 uppercase tracking-wider">
              {alertModal.title}
            </h4>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              {alertModal.message}
            </p>
            <div className="mt-5 w-full">
              <button
                type="button"
                onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 transition-all uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-border overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground font-heading">
                Detail Transaksi
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="text-slate-400 hover:text-foreground focus:outline-none p-1 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-grow p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-100 space-y-2 text-center">
                <span className="font-mono font-extrabold text-sm text-primary block leading-none">{selectedTxForDetail.invoice_id}</span>
                <span className="text-[10px] text-slate-400 block">{new Date(selectedTxForDetail.created_at).toLocaleString('id-ID')}</span>
                <div className="flex justify-center gap-1.5 pt-1.5">
                  {getPaymentStatusBadge(selectedTxForDetail.payment_status)}
                  {getDeliveryStatusBadge(selectedTxForDetail.delivery_status)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Pelanggan:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {selectedTxForDetail.user ? (
                      <>
                        <span className="block font-bold">{selectedTxForDetail.user.name}</span>
                        <span className="block text-[10px] text-slate-400">{selectedTxForDetail.user.email}</span>
                      </>
                    ) : (
                      'Guest (Tamu)'
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Game / Kategori:</span>
                  <span className="font-bold text-slate-800">{selectedTxForDetail.game?.name || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Item Produk:</span>
                  <span className="font-bold text-slate-800">{selectedTxForDetail.product?.name || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Tujuan Akun (Target ID):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedTxForDetail.target_id} {selectedTxForDetail.target_zone ? `(${selectedTxForDetail.target_zone})` : ''}
                  </span>
                </div>
                {selectedTxForDetail.nickname && (
                  <div className="flex justify-between py-1 border-b border-slate-50 text-emerald-600 dark:text-emerald-400">
                    <span className="text-slate-400">Nickname Akun:</span>
                    <span className="font-extrabold">{selectedTxForDetail.nickname}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Metode Pembayaran:</span>
                  <span className="font-bold text-slate-800 uppercase">{selectedTxForDetail.payment_method}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Total Pembayaran:</span>
                  <span className="font-extrabold text-primary">{formatPrice(selectedTxForDetail.amount)}</span>
                </div>
                {selectedTxForDetail.digiflazz_ref_id && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">SN / Ref ID:</span>
                    <span className="font-mono font-bold text-slate-700">{selectedTxForDetail.digiflazz_ref_id}</span>
                  </div>
                )}
                {selectedTxForDetail.notes && (
                  <div className="py-2.5">
                    <span className="text-slate-400 block mb-1">Catatan Transaksi:</span>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-[10px] text-slate-600 break-all leading-normal whitespace-pre-wrap">
                      {selectedTxForDetail.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-border bg-slate-50/50 shrink-0 flex flex-col gap-3">
              {selectedTxForDetail.delivery_status === 'processing' && (
                <button
                  type="button"
                  onClick={() => handleFailTransaction(selectedTxForDetail.invoice_id)}
                  disabled={failingTxId === selectedTxForDetail.invoice_id}
                  className="w-full px-5 py-3 rounded-xl bg-error hover:bg-red-650 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer text-center shadow-md border-0"
                >
                  {failingTxId === selectedTxForDetail.invoice_id ? 'Sedang Memproses...' : '❌ Tandai Pengiriman Gagal'}
                </button>
              )}
              <div className="flex items-center justify-between gap-3 w-full">
                <Link
                  href={`/invoice/${selectedTxForDetail.invoice_id}`}
                  target="_blank"
                  className="px-4 py-2.5 rounded-xl border border-primary/20 text-primary hover:bg-primary-light transition-colors text-xs font-bold uppercase tracking-wider text-center shrink-0"
                >
                  Buka Link Invoice &rarr;
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedTxForDetail(null)}
                  className="glow-button px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer flex-grow text-center"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
