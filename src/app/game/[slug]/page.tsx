'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Game, Product, Voucher, getAssetUrl } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const getValidatorGameName = (code: string): string | null => {
  const c = (code || '').toUpperCase();
  if (c.includes('MLBB') || c.includes('MOBILE_LEGEND') || c.includes('MOBILELEGEND')) return 'mobilelegends';
  if (c.includes('FREEFIRE') || c.includes('FREE_FIRE') || c === 'FF') return 'freefire';
  if (c.includes('PUBG')) return 'pubgm';
  if (c.includes('CODM') || c.includes('CALL_OF_DUTY') || c.includes('CALLOFDUTY')) return 'codm';
  if (c.includes('GENSHIN')) return 'genshinimpact';
  if (c.includes('STARRAIL') || c.includes('STAR_RAIL') || c === 'HSR') return 'honkaistarrail';
  if (c.includes('HONKAI') && c.includes('IMPACT')) return 'honkaiimpact';
  if (c.includes('SAUSAGE')) return 'sausageman';
  if (c.includes('AOV') || c.includes('VALOR')) return 'arenaofvalor';
  if (c.includes('WILDRIFT') || c.includes('WILD_RIFT')) return 'lolwildrift';
  if (c.includes('FC') && c.includes('MOBILE')) return 'fcmobile';
  if (c.includes('CLASH') && c.includes('ROYALE')) return 'clashroyale';
  return null;
};

const DEFAULT_MIDTRANS_METHODS = [
  { id: 'QRIS', name: 'QRIS (GoPay, OVO, LinkAja, dll)', type: 'E-Wallet', fee: 0, color: 'text-rose-500 bg-rose-50 border-rose-200' },
  { id: 'DANA', name: 'DANA', type: 'E-Wallet', fee: 0, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { id: 'OVO', name: 'OVO', type: 'E-Wallet', fee: 0, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'GOPAY', name: 'GoPay', type: 'E-Wallet', fee: 0, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'SHOPEEPAY', name: 'ShopeePay', type: 'E-Wallet', fee: 0, color: 'text-orange-500 bg-orange-50 border-orange-200' },
  { id: 'LINKAJA', name: 'LinkAja', type: 'E-Wallet', fee: 0, color: 'text-red-600 bg-red-50 border-red-200' },
  { id: 'VA_BCA', name: 'BCA Virtual Account', type: 'Transfer Bank', fee: 0, color: 'text-blue-800 bg-blue-50 border-blue-200' },
  { id: 'VA_MANDIRI', name: 'Mandiri Virtual Account', type: 'Transfer Bank', fee: 0, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 'VA_BNI', name: 'BNI Virtual Account', type: 'Transfer Bank', fee: 0, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 'VA_BRI', name: 'BRI Virtual Account', type: 'Transfer Bank', fee: 0, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'VA_PERMATA', name: 'Permata Virtual Account', type: 'Transfer Bank', fee: 0, color: 'text-green-700 bg-green-50 border-green-200' },
];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function GameDetail({ params }: PageProps) {
  const router = useRouter();
  const { slug } = use(params);
  const { user, isAuthenticated } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Nickname validation states
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [validatedNickname, setValidatedNickname] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  
  // Form states
  const [targetId, setTargetId] = useState('');
  const [targetZone, setTargetZone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<'ewallet' | 'bank' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [webName, setWebName] = useState('YOI Store');
  const [midtransActive, setMidtransActive] = useState(false);

  // Voucher states
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');
  const [voucherError, setVoucherError] = useState(false);
  const [checkingVoucher, setCheckingVoucher] = useState(false);

  // Flash sale timer state
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  // Clear voucher when changing product selection
  useEffect(() => {
    setVoucherCode('');
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setVoucherMessage('');
  }, [selectedProductId]);

  // Auto-verify game nickname when target ID or zone changes (debounced by 1s)
  useEffect(() => {
    const validatorGame = getValidatorGameName(game?.code || '');
    if (!validatorGame) {
      setValidatedNickname(null);
      setNicknameError(null);
      return;
    }

    if (!targetId.trim()) {
      setValidatedNickname(null);
      setNicknameError(null);
      return;
    }

    if (validatorGame === 'mobilelegends' && !targetZone.trim()) {
      setValidatedNickname(null);
      setNicknameError(null);
      return;
    }

    setCheckingNickname(true);
    setValidatedNickname(null);
    setNicknameError(null);

    const delayDebounceFn = setTimeout(async () => {
      try {
        let url = `https://cek-username.onrender.com/game/${validatorGame}?uid=${targetId.trim()}`;
        if (validatorGame === 'mobilelegends') {
          url += `&zone=${targetZone.trim()}`;
        }
        
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.message === 'Success' && json.data) {
          setValidatedNickname(json.data);
        } else {
          setNicknameError('Data akun tidak ditemukan.');
        }
      } catch (err) {
        console.error('Failed to verify nickname:', err);
        setNicknameError('Gagal memverifikasi.');
      } finally {
        setCheckingNickname(false);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [targetId, targetZone, game?.code]);

  // Alert modal state
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

  const showAlert = (title: string, message: string, type: 'danger' | 'warning' | 'info' | 'success' = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  // Fetch payment methods from backend
  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const methods = await api.getPaymentMethods();
        setDbPaymentMethods(methods);
      } catch (err) {
        console.error("Gagal memuat metode pembayaran", err);
      }
    }
    loadPaymentMethods();

    api.getPublicSettings()
      .then(settings => {
        if (settings.web_name) setWebName(settings.web_name);
        if (settings.midtrans_is_active) setMidtransActive(settings.midtrans_is_active);
      })
      .catch(err => console.error("Gagal memuat setting web_name di game detail", err));
  }, []);

  const displayPaymentMethods = (midtransActive && dbPaymentMethods.length === 0)
    ? DEFAULT_MIDTRANS_METHODS
    : dbPaymentMethods;

  const eWalletMethods = displayPaymentMethods.filter((m) => m.type === 'E-Wallet');
  const bankMethods = displayPaymentMethods.filter((m) => m.type === 'Transfer Bank');

  // Auto-expand payment group if restored or selected
  useEffect(() => {
    if (selectedPayment) {
      if (eWalletMethods.some(m => m.id === selectedPayment)) {
        setActiveGroup('ewallet');
      } else if (bankMethods.some(m => m.id === selectedPayment)) {
        setActiveGroup('bank');
      }
    }
  }, [selectedPayment, dbPaymentMethods, midtransActive]);

  useEffect(() => {
    async function loadGame() {
      try {
        const data = await api.getGame(slug);
        setGame(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Game tidak ditemukan');
      } finally {
        setLoading(false);
      }
    }
    loadGame();
  }, [slug]);

  useEffect(() => {
    if (!game?.flash_sale_end) {
      setTimeRemaining('');
      return;
    }

    const end = new Date(game.flash_sale_end).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hStr = hours.toString().padStart(2, '0');
      const mStr = minutes.toString().padStart(2, '0');
      const sStr = seconds.toString().padStart(2, '0');

      setTimeRemaining(`${hStr}:${mStr}:${sStr}`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [game?.flash_sale_end]);

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getProductPrice = (product: Product | null | undefined): number => {
    if (!product) return 0;
    if (timeRemaining && product.flash_sale_price) {
      return parseFloat(product.flash_sale_price);
    }
    return parseFloat(product.price);
  };

  const handleApplyVoucher = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      showAlert('Peringatan', 'Pilih produk nominal top up terlebih dahulu.', 'warning');
      return;
    }

    const selectedProduct = game?.products?.find((p) => p.id === selectedProductId);
    if (!selectedProduct) return;

    if (!voucherCode.trim()) {
      showAlert('Peringatan', 'Harap masukkan kode voucher.', 'warning');
      return;
    }

    setCheckingVoucher(true);
    setVoucherMessage('');
    setVoucherError(false);

    try {
      const res = await api.checkVoucher(voucherCode, getProductPrice(selectedProduct));
      if (res.success) {
        setAppliedVoucher(res.voucher || null);
        setDiscountAmount(res.discount);
        setVoucherMessage(res.message);
        setVoucherError(false);
      } else {
        setAppliedVoucher(null);
        setDiscountAmount(0);
        setVoucherMessage(res.message || 'Gagal menerapkan voucher.');
        setVoucherError(true);
      }
    } catch (err: any) {
      console.error(err);
      setAppliedVoucher(null);
      setDiscountAmount(0);
      setVoucherMessage(err.message || 'Gagal menerapkan voucher.');
      setVoucherError(true);
    } finally {
      setCheckingVoucher(false);
    }
  };



  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game) return;

    if (!targetId.trim()) {
      showAlert('Peringatan', 'Harap masukkan User ID tujuan.', 'warning');
      return;
    }

    if (game.code === 'MLBB' && !targetZone.trim()) {
      showAlert('Peringatan', 'Mobile Legends memerlukan Zone ID.', 'warning');
      return;
    }

    if (!selectedProductId) {
      showAlert('Peringatan', 'Harap pilih produk nominal top up.', 'warning');
      return;
    }

    if (!selectedPayment) {
      showAlert('Peringatan', 'Harap pilih metode pembayaran.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const transaction = await api.createTransaction({
        game_id: game.id,
        product_id: selectedProductId,
        target_id: targetId,
        target_zone: targetZone || undefined,
        nickname: validatedNickname || undefined,
        payment_method: selectedPayment,
        voucher_code: appliedVoucher ? appliedVoucher.code : undefined,
      });

      router.push(`/invoice/${transaction.invoice_id}`);
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal', err.message || 'Gagal memproses transaksi', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const availablePaymentMethods = [
    ...(isAuthenticated && user
      ? [
          {
            id: 'SALDO',
            name: `Saldo Akun ${webName} (Sisa: ${formatCurrency(user.balance)})`,
            type: `E-Wallet ${webName.split(' ')[0] || 'YOI'}`,
            fee: 0,
          },
        ]
      : []),
    ...displayPaymentMethods,
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl text-center">
        <p className="text-foreground/50 animate-pulse text-sm">Memuat detail game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl text-center">
        <h2 className="text-xl font-bold text-error font-heading">Terjadi Kesalahan</h2>
        <p className="text-sm text-foreground/60 mt-2">{error || 'Game tidak ditemukan'}</p>
        <Link href={isAuthenticated ? (user?.role === 'admin' ? "/admin" : "/dashboard") : "/"} className="mt-6 inline-flex text-xs font-bold text-primary underline">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const activeFlashSale = !!timeRemaining;
  const selectedProduct = game.products?.find((p) => p.id === selectedProductId);
  const selectedProductPrice = selectedProduct ? getProductPrice(selectedProduct) : 0;
  const isSaldo = selectedPayment === 'SALDO';
  const balanceInsufficient = isSaldo && user && selectedProduct && (parseFloat(user.balance) < (selectedProductPrice - discountAmount));

  const sortedProducts = game.products ? [...game.products].sort((a, b) => {
    const aIsFlash = activeFlashSale && !!a.flash_sale_price;
    const bIsFlash = activeFlashSale && !!b.flash_sale_price;
    if (aIsFlash && !bIsFlash) return -1;
    if (!aIsFlash && bIsFlash) return 1;
    return parseFloat(a.price) - parseFloat(b.price);
  }) : [];

  return (
    <div className="bg-slate-50 py-8 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6">
          <Link href={isAuthenticated ? (user?.role === 'admin' ? "/admin" : "/dashboard") : "/"} className="text-xs font-semibold text-foreground/50 hover:text-primary transition-colors flex items-center space-x-1">
            <span>&larr;</span> <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {timeRemaining && (
          <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-orange-500 text-white p-4 sm:p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative overflow-hidden text-center sm:text-left animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="absolute right-0 bottom-0 w-36 h-36 bg-white/5 rounded-full blur-2xl -mr-10 -mb-10 pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10">
              <div className="text-3xl animate-bounce">🔥</div>
              <div>
                <h3 className="font-black text-base sm:text-lg font-heading tracking-tight uppercase leading-none">FLASH SALE KILAT</h3>
                <p className="text-[10px] sm:text-[11px] text-white/80 font-medium mt-1.5 sm:mt-1">Dapatkan harga promo top-up game termurah hari ini!</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 relative z-10 shrink-0">
              <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider bg-black/20 px-2.5 py-1 rounded-lg">Berakhir Dalam:</span>
              <div className="flex items-center font-mono font-black text-lg sm:text-xl bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/10 tracking-widest shadow-md">
                {timeRemaining}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Game Details Instructions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-border p-5 sm:p-6 rounded-2xl shadow-sm">
              <div className="flex flex-row lg:flex-col items-center lg:items-start gap-4 lg:gap-0">
                {game.thumbnail ? (
                  <img
                    src={getAssetUrl(game.thumbnail)}
                    alt={game.name}
                    className="w-14 h-14 lg:w-20 lg:h-20 rounded-2xl object-cover lg:mb-4 shadow-md border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-tr from-primary to-cyan-500 flex items-center justify-center text-white font-extrabold text-2xl lg:text-3xl lg:mb-4 shadow-md shrink-0">
                    {game.code.slice(0, 4)}
                  </div>
                )}
                <div>
                  <h1 className="text-xl lg:text-2xl font-extrabold font-heading text-foreground">{game.name}</h1>
                  <p className="text-[10px] lg:text-xs text-primary font-bold mt-0.5 lg:mt-1 uppercase tracking-widest">Layanan Instan &bull; 24/7 Otomatis</p>
                </div>
              </div>
              
              <div className="border-t border-border mt-5 pt-5">
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full flex lg:hidden items-center justify-between text-xs font-black text-foreground/80 hover:text-primary transition-colors cursor-pointer uppercase tracking-wider"
                >
                  <span>Cara Top Up</span>
                  <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${showInstructions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <div className={`mt-4 lg:mt-0 space-y-4 lg:block ${showInstructions ? 'block animate-fadeIn' : 'hidden'}`}>
                  <p className="hidden lg:block font-bold text-foreground/90 text-sm">Cara Top Up:</p>
                  <ol className="list-decimal pl-5 space-y-2 text-xs text-foreground/60 leading-relaxed font-medium">
                    <li>Masukkan data ID akun Anda sesuai kolom input.</li>
                    <li>Pilih nominal Diamond/UC yang diinginkan.</li>
                    <li>Pilih metode pembayaran yang Anda inginkan.</li>
                    <li>Masukkan nomor WhatsApp (opsional).</li>
                    <li>Klik tombol **Beli Sekarang**.</li>
                    <li>Lakukan pembayaran pada halaman tagihan, lalu item akan masuk secara otomatis.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Forms */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleCheckout} className="space-y-6">
              {/* STEP 1: Account Input */}
              <div className="bg-white border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                <div className="flex items-center space-x-3 mb-4">
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">1</span>
                  <h3 className="font-extrabold text-foreground text-base font-heading">Masukkan Data Akun</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                      User ID
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 12345678"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                    />
                  </div>

                  {game.code === 'MLBB' && (
                    <div>
                      <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                        Zone ID
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 1234"
                        value={targetZone}
                        onChange={(e) => setTargetZone(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                      />
                    </div>
                  )}
                </div>
                {getValidatorGameName(game.code) && (
                  <div className="mt-3.5 flex flex-wrap items-center gap-3 text-xs min-h-[1.75rem]">
                    {checkingNickname && (
                      <span className="text-foreground/50 flex items-center gap-1.5 animate-pulse font-medium bg-slate-50 border border-slate-200/50 px-3 py-2 rounded-xl shadow-inner">
                        <svg className="animate-spin h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Memverifikasi ID akun...
                      </span>
                    )}
                    {validatedNickname && !checkingNickname && (
                      <span className="text-success font-bold flex items-center gap-1 bg-success/5 border border-success/15 px-3 py-2 rounded-xl shadow-xs">
                        ✓ Nickname: <strong className="text-foreground">{validatedNickname}</strong>
                      </span>
                    )}
                    {nicknameError && !checkingNickname && (
                      <span className="text-error font-semibold flex items-center gap-1 bg-error/5 border border-error/15 px-3 py-2 rounded-xl shadow-xs">
                        ✗ {nicknameError}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-foreground/40 mt-3 italic">
                  *Kesalahan penulisan data ID akun diluar tanggung jawab kami. Mohon teliti kembali.
                </p>
              </div>

              {/* STEP 2: Product Select */}
              <div className="bg-white border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                <div className="flex items-center space-x-3 mb-4">
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">2</span>
                  <h3 className="font-extrabold text-foreground text-base font-heading">Pilih Nominal Top Up</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {sortedProducts && sortedProducts.length > 0 ? (
                    sortedProducts.map((product) => {
                      const isSelected = selectedProductId === product.id;
                      const isFlashProduct = activeFlashSale && !!product.flash_sale_price;
                      const productPrice = isFlashProduct ? parseFloat(product.flash_sale_price!) : parseFloat(product.price);
                      const originalPrice = parseFloat(product.price);
                      
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => setSelectedProductId(product.id)}
                          className={`text-left p-3 sm:p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[6.5rem] lg:min-h-[7rem] ${
                            isSelected
                              ? 'border-primary bg-primary-light/30 ring-2 ring-primary/10'
                              : 'border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200'
                          }`}
                        >
                          {isFlashProduct && (
                            <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-pink-600 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm leading-none z-10">
                              🔥 FLASH
                            </div>
                          )}
                          <div>
                            <p className={`font-bold text-[11px] sm:text-xs leading-snug ${isSelected ? 'text-primary' : 'text-foreground/80'}`}>
                              {product.name}
                            </p>
                          </div>
                          <div className="mt-2">
                            {/* Price crossed out if flash sale */}
                            {isFlashProduct && (
                              <p className="text-[10px] text-foreground/30 line-through leading-none mb-0.5">
                                {formatCurrency(originalPrice)}
                              </p>
                            )}
                            <p className={`font-extrabold text-sm ${isSelected ? 'text-primary font-black' : 'text-foreground/90'} ${isFlashProduct ? 'text-[#e11d48]' : ''}`}>
                              {formatCurrency(productPrice)}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="col-span-full text-center py-6 text-foreground/40 text-xs">
                      Tidak ada nominal produk tersedia.
                    </p>
                  )}
                </div>
              </div>

              {/* STEP 3: Payment Method */}
              <div className="bg-white border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                <div className="flex items-center space-x-3 mb-4">
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">3</span>
                  <h3 className="font-extrabold text-foreground text-base font-heading">Pilih Metode Pembayaran</h3>
                </div>

                <div className="space-y-4">
                  {/* GROUP 1: SALDO */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                    {isAuthenticated && user ? (
                      (() => {
                        const isSelected = selectedPayment === 'SALDO';
                        const totalPay = selectedProduct ? parseFloat(selectedProduct.price) : 0;
                        return (
                          <button
                            type="button"
                            onClick={() => setSelectedPayment('SALDO')}
                            className={`w-full flex items-center justify-between p-4 text-sm transition-all cursor-pointer ${
                              isSelected
                                ? 'border-primary bg-primary-light/20 ring-2 ring-primary/10'
                                : 'bg-slate-50/50 hover:bg-slate-100/70'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-foreground/80 text-xs">Saldo Akun {webName}</p>
                                <p className="text-[10px] text-foreground/40 mt-0.5">Sisa Saldo: {formatCurrency(user.balance)}</p>
                              </div>
                            </div>
                            {selectedProductPrice > 0 && (
                              <div className="text-right">
                                <p className="text-[9px] text-foreground/40">Total bayar</p>
                                <p className={`font-extrabold text-xs ${isSelected ? 'text-primary' : 'text-foreground/80'}`}>{formatCurrency(selectedProductPrice)}</p>
                              </div>
                            )}
                          </button>
                        );
                      })()
                    ) : (
                      <div className="w-full flex items-center justify-between p-4 bg-slate-50/50 text-sm opacity-70">
                        <div className="flex items-center space-x-3">
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-200 bg-slate-100" />
                          <div className="text-left">
                            <p className="font-bold text-foreground/40 text-xs">Saldo Akun {webName}</p>
                            <p className="text-[10px] text-primary font-bold mt-0.5">
                              <Link href="/login" className="underline hover:text-primary-dark">Login untuk menggunakan saldo</Link>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* GROUP 2: E-WALLET */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setActiveGroup(activeGroup === 'ewallet' ? null : 'ewallet')}
                      className={`w-full flex items-center justify-between p-4 text-sm transition-all cursor-pointer bg-slate-50 hover:bg-slate-100 ${
                        activeGroup === 'ewallet' ? 'border-b border-slate-100' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded-lg bg-primary-light/30">
                          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold text-foreground/80 text-xs flex items-center gap-1.5">
                            <span>E-Wallet</span>
                            {selectedPayment && eWalletMethods.some(m => m.id === selectedPayment) && (
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                {selectedPayment} Terpilih
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-foreground/40 mt-0.5 font-medium">QRIS, DANA, OVO, GoPay, ShopeePay, dll</p>
                        </div>
                      </div>
                      <svg className={`w-4 h-4 text-foreground/45 transition-transform duration-200 ${activeGroup === 'ewallet' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {activeGroup === 'ewallet' && (
                      <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-200 animate-fadeIn">
                        {eWalletMethods.map((pm) => {
                          const isSelected = selectedPayment === pm.id;
                          const totalPay = selectedProduct 
                            ? getProductPrice(selectedProduct) + pm.fee
                            : 0;

                          return (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setSelectedPayment(pm.id)}
                              className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                                isSelected
                                  ? 'border-primary bg-primary-light/20 ring-2 ring-primary/10'
                                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase border ${pm.color}`}>
                                  {pm.id}
                                </span>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'}`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <p className="font-bold text-foreground/80 text-[11px]">{pm.name}</p>
                                <p className="text-[9px] text-foreground/45 mt-0.5">Biaya Admin: {formatCurrency(pm.fee)}</p>
                              </div>

                              {totalPay > 0 && (
                                <div className="mt-2 pt-2 border-t border-dashed border-slate-200 flex justify-between items-center w-full">
                                  <span className="text-[9px] text-foreground/40">Total bayar</span>
                                  <span className={`font-extrabold text-[11px] ${isSelected ? 'text-primary' : 'text-foreground/85'}`}>{formatCurrency(totalPay)}</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* GROUP 3: BANK TRANSFER / VA */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setActiveGroup(activeGroup === 'bank' ? null : 'bank')}
                      className={`w-full flex items-center justify-between p-4 text-sm transition-all cursor-pointer bg-slate-50 hover:bg-slate-100 ${
                        activeGroup === 'bank' ? 'border-b border-slate-100' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded-lg bg-primary-light/30">
                          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold text-foreground/80 text-xs flex items-center gap-1.5">
                            <span>Virtual Account</span>
                            {selectedPayment && bankMethods.some(m => m.id === selectedPayment) && (
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                {selectedPayment.replace('VA_', '')} Terpilih
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-foreground/40 mt-0.5 font-medium">BCA, Mandiri, BNI, BRI, Permata Bank</p>
                        </div>
                      </div>
                      <svg className={`w-4 h-4 text-foreground/45 transition-transform duration-200 ${activeGroup === 'bank' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {activeGroup === 'bank' && (
                      <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-200 animate-fadeIn">
                        {bankMethods.map((pm) => {
                          const isSelected = selectedPayment === pm.id;
                          const totalPay = selectedProduct 
                            ? getProductPrice(selectedProduct) + pm.fee
                            : 0;

                          return (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setSelectedPayment(pm.id)}
                              className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                                isSelected
                                  ? 'border-primary bg-primary-light/20 ring-2 ring-primary/10'
                                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase border ${pm.color}`}>
                                  {pm.id.replace('VA_', '')}
                                </span>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'}`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <p className="font-bold text-foreground/80 text-[11px]">{pm.name}</p>
                                <p className="text-[9px] text-foreground/45 mt-0.5">Biaya Admin: {formatCurrency(pm.fee)}</p>
                              </div>

                              {totalPay > 0 && (
                                <div className="mt-2 pt-2 border-t border-dashed border-slate-200 flex justify-between items-center w-full">
                                  <span className="text-[9px] text-foreground/40">Total bayar</span>
                                  <span className={`font-extrabold text-[11px] ${isSelected ? 'text-primary' : 'text-foreground/85'}`}>{formatCurrency(totalPay)}</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* STEP 3.5: Voucher Code (Optional) */}
              <div className="bg-white border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                <div className="flex items-center space-x-3 mb-4">
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">3.5</span>
                  <h3 className="font-extrabold text-foreground text-base font-heading">Punya Kode Voucher? (Opsional)</h3>
                </div>

                <div className="flex gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Masukkan kode voucher..."
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    disabled={!selectedProductId}
                    className="flex-grow px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-primary text-foreground placeholder-slate-400 font-semibold uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={checkingVoucher || !selectedProductId || !voucherCode.trim()}
                    className="glow-button px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap cursor-pointer text-center disabled:opacity-50"
                  >
                    {checkingVoucher ? 'Memproses...' : 'Terapkan'}
                  </button>
                </div>
                {!selectedProductId && (
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Pilih nominal top up terlebih dahulu untuk memasukkan voucher.</p>
                )}
                {voucherMessage && (
                  <p className={`mt-2 font-semibold text-[11px] ${voucherError ? 'text-error' : 'text-success'}`}>
                    {voucherError ? '❌ ' : '✅ '} {voucherMessage}
                  </p>
                )}
              </div>

              {/* STEP 4: Checkout Summary and Button */}
              <div className="bg-white border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                <div className="flex items-center space-x-3 mb-4">
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">4</span>
                  <h3 className="font-extrabold text-foreground text-base font-heading">Konfirmasi Pemesanan</h3>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6 text-xs text-foreground/60 space-y-2">
                  <div className="flex justify-between">
                    <span>Game:</span>
                    <span className="font-bold text-foreground/80">{game.name}</span>
                  </div>
                  {targetId && (
                    <div className="flex justify-between">
                      <span>Tujuan Akun:</span>
                      <span className="font-bold text-foreground/80">{targetId} {targetZone && `(${targetZone})`}</span>
                    </div>
                  )}
                  {validatedNickname && (
                    <div className="flex justify-between text-success">
                      <span>Nickname Terverifikasi:</span>
                      <span className="font-bold">{validatedNickname}</span>
                    </div>
                  )}
                  {selectedProduct && (
                    <div className="flex justify-between">
                      <span>Item:</span>
                      <span className="font-bold text-foreground/80">{selectedProduct.name}</span>
                    </div>
                  )}
                  {selectedProduct && (
                    <div className="flex justify-between">
                      <span>Harga:</span>
                      <span className="font-bold text-foreground/80">
                        {activeFlashSale && selectedProduct.flash_sale_price ? (
                          <>
                            <span className="text-xs text-foreground/30 line-through mr-1.5 font-normal">
                              {formatCurrency(parseFloat(selectedProduct.price))}
                            </span>
                            <span className="text-[#e11d48] font-extrabold">
                              {formatCurrency(parseFloat(selectedProduct.flash_sale_price))}
                            </span>
                          </>
                        ) : (
                          formatCurrency(parseFloat(selectedProduct.price))
                        )}
                      </span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Potongan Voucher ({appliedVoucher?.code}):</span>
                      <span className="font-extrabold">- {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  {selectedPayment && (
                    <div className="flex justify-between">
                      <span>Metode Pembayaran:</span>
                      <span className="font-bold text-foreground/80">
                        {selectedPayment === 'SALDO' ? `Saldo Akun ${webName}` : (dbPaymentMethods.find(m => m.id === selectedPayment)?.name || selectedPayment)}
                      </span>
                    </div>
                  )}
                  {selectedPayment && (
                    <div className="flex justify-between">
                      <span>Biaya Admin:</span>
                      <span className="font-bold text-foreground/80">
                        {formatCurrency(availablePaymentMethods.find(m => m.id === selectedPayment)?.fee || 0)}
                      </span>
                    </div>
                  )}
                </div>

                {balanceInsufficient && (
                  <div className="p-3 text-xs bg-error/10 border border-error/20 text-error rounded-xl font-medium mb-4">
                    Saldo Anda tidak mencukupi untuk melakukan transaksi ini. Silakan isi saldo terlebih dahulu di Dashboard.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !!balanceInsufficient}
                  className="glow-button w-full py-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Memproses Transaksi...</span>
                  ) : (
                    <span>Beli Sekarang &bull; {selectedProduct ? formatCurrency(selectedProductPrice - discountAmount + (availablePaymentMethods.find(m => m.id === selectedPayment)?.fee || 0)) : 'Pilih Item'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
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
    </div>
  );
}
