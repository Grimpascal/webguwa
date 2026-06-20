'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Game, Product, Voucher } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

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
  
  // Form states
  const [targetId, setTargetId] = useState('');
  const [targetZone, setTargetZone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<'ewallet' | 'bank' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [webName, setWebName] = useState('YOI Store');

  // Voucher states
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');
  const [voucherError, setVoucherError] = useState(false);
  const [checkingVoucher, setCheckingVoucher] = useState(false);

  // Clear voucher when changing product selection
  useEffect(() => {
    setVoucherCode('');
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setVoucherMessage('');
  }, [selectedProductId]);

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
      })
      .catch(err => console.error("Gagal memuat setting web_name di game detail", err));
  }, []);

  const eWalletMethods = dbPaymentMethods.filter((m) => m.type === 'E-Wallet');
  const bankMethods = dbPaymentMethods.filter((m) => m.type === 'Transfer Bank');

  // Auto-expand payment group if restored or selected
  useEffect(() => {
    if (selectedPayment) {
      if (eWalletMethods.some(m => m.id === selectedPayment)) {
        setActiveGroup('ewallet');
      } else if (bankMethods.some(m => m.id === selectedPayment)) {
        setActiveGroup('bank');
      }
    }
  }, [selectedPayment, dbPaymentMethods]);

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

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
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
      const res = await api.checkVoucher(voucherCode, parseFloat(selectedProduct.price));
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
    ...dbPaymentMethods,
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

  const selectedProduct = game.products?.find((p) => p.id === selectedProductId);
  const isSaldo = selectedPayment === 'SALDO';
  const balanceInsufficient = isSaldo && user && selectedProduct && (parseFloat(user.balance) < (parseFloat(selectedProduct.price) - discountAmount));

  return (
    <div className="bg-slate-50 py-8 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6">
          <Link href={isAuthenticated ? (user?.role === 'admin' ? "/admin" : "/dashboard") : "/"} className="text-xs font-semibold text-foreground/50 hover:text-primary transition-colors flex items-center space-x-1">
            <span>&larr;</span> <span>Kembali ke Beranda</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Game Details Instructions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-border p-6 rounded-2xl shadow-sm">
              {game.thumbnail ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${game.thumbnail}`}
                  alt={game.name}
                  className="w-20 h-20 rounded-2xl object-cover mb-4 shadow-md border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-cyan-500 flex items-center justify-center text-white font-extrabold text-3xl mb-4 shadow-md">
                  {game.code.slice(0, 4)}
                </div>
              )}
              <h1 className="text-2xl font-extrabold font-heading text-foreground">{game.name}</h1>
              <p className="text-xs text-primary font-bold mt-1 uppercase tracking-widest">Layanan Instan</p>
              
              <div className="border-t border-border mt-6 pt-6 text-sm text-foreground/75 leading-relaxed space-y-4">
                <p className="font-semibold text-foreground/90">Cara Top Up:</p>
                <ol className="list-decimal pl-5 space-y-2 text-xs text-foreground/60">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {game.products && game.products.length > 0 ? (
                    game.products.map((product) => {
                      const isSelected = selectedProductId === product.id;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => setSelectedProductId(product.id)}
                          className={`text-left p-4 rounded-xl border text-sm font-medium transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-28 ${
                            isSelected
                              ? 'border-primary bg-primary-light/30 ring-2 ring-primary/10'
                              : 'border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div>
                            <p className={`font-bold text-xs ${isSelected ? 'text-primary font-bold' : 'text-foreground/80'}`}>
                              {product.name}
                            </p>
                          </div>
                          <div className="mt-2">
                            {/* Price crossed out if discounted */}
                            {parseFloat(product.original_price) > 0 && parseFloat(product.original_price) < parseFloat(product.price) && (
                              <p className="text-[10px] text-foreground/30 line-through">
                                {formatCurrency(product.price)}
                              </p>
                            )}
                            <p className={`font-extrabold text-sm ${isSelected ? 'text-primary font-black' : 'text-foreground/90'}`}>
                              {formatCurrency(product.price)}
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
                            {totalPay > 0 && (
                              <div className="text-right">
                                <p className="text-[9px] text-foreground/40">Total bayar</p>
                                <p className={`font-extrabold text-xs ${isSelected ? 'text-primary' : 'text-foreground/80'}`}>{formatCurrency(totalPay)}</p>
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
                            ? parseFloat(selectedProduct.price) + pm.fee
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
                            ? parseFloat(selectedProduct.price) + pm.fee
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
                  {selectedProduct && (
                    <div className="flex justify-between">
                      <span>Item:</span>
                      <span className="font-bold text-foreground/80">{selectedProduct.name}</span>
                    </div>
                  )}
                  {selectedProduct && (
                    <div className="flex justify-between">
                      <span>Harga Normal:</span>
                      <span className="font-bold text-foreground/80">{formatCurrency(selectedProduct.price)}</span>
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
                    <span>Beli Sekarang &bull; {selectedProduct ? formatCurrency(parseFloat(selectedProduct.price) - discountAmount + (availablePaymentMethods.find(m => m.id === selectedPayment)?.fee || 0)) : 'Pilih Item'}</span>
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
