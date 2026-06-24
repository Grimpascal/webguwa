'use client';

import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { api, Transaction, getAssetUrl } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import * as htmlToImage from 'html-to-image';
import Script from 'next/script';

interface PageProps {
  params: Promise<{ invoice_id: string }>;
}

export default function InvoiceDetail({ params }: PageProps) {
  const { invoice_id } = use(params);
  const { user, isAuthenticated } = useAuth();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [webName, setWebName] = useState('YOI Store');
  const [midtransActive, setMidtransActive] = useState(false);
  const [midtransClientKey, setMidtransClientKey] = useState('');
  const [midtransMode, setMidtransMode] = useState('sandbox');
  const [successMsg, setSuccessMsg] = useState('');
  const [customShopName, setCustomShopName] = useState('');
  const [customPrice, setCustomPrice] = useState<number | ''>('');

  // Auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

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

  // Set customPrice to totalAmount when transaction and dbPaymentMethods are loaded for the first time
  useEffect(() => {
    if (transaction && dbPaymentMethods.length > 0 && customPrice === '') {
      const matchedMethod = dbPaymentMethods.find((pm) => pm.id === transaction.payment_method);
      const fee = transaction.payment_method === 'SALDO' ? 0 : (matchedMethod ? parseFloat(matchedMethod.fee) : 0);
      const totalAmount = parseFloat(transaction.amount) + fee;
      setCustomPrice(totalAmount);
    }
  }, [transaction, dbPaymentMethods, customPrice]);

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
        link.download = `nota-${transaction?.invoice_id}.png`;
        link.href = dataUrl;
        link.click();
        setSuccessMsg('Nota berhasil diunduh sebagai gambar PNG!');
        setDownloadingImage(false);
      })
      .catch((err) => {
        console.error('Failed to generate receipt image:', err);
        showAlert('Gagal', 'Gagal mengunduh gambar nota belanja.', 'danger');
        setDownloadingImage(false);
      });
  };

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

  useEffect(() => {
    api.getPaymentMethods()
      .then(methods => setDbPaymentMethods(methods))
      .catch(err => console.error("Gagal memuat metode pembayaran di invoice", err));
 
    api.getPublicSettings()
      .then(settings => {
        if (settings.web_name) setWebName(settings.web_name);
        if (settings.midtrans_is_active) setMidtransActive(settings.midtrans_is_active);
        if (settings.midtrans_client_key) setMidtransClientKey(settings.midtrans_client_key);
        if (settings.midtrans_mode) setMidtransMode(settings.midtrans_mode);
      })
      .catch(err => console.error("Gagal memuat settings di invoice", err));
  }, []);

  async function loadTransaction(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const data = await api.getTransaction(invoice_id);
      setTransaction(data);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Transaksi tidak ditemukan');
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    loadTransaction(true);

    // Set up auto-refresh polling every 5 seconds when transaction is pending or processing
    const interval = setInterval(() => {
      setRefreshing(true);
      api.getTransaction(invoice_id)
        .then((data) => {
          setTransaction(data);
          setRefreshing(false);
        })
        .catch((err) => {
          console.error('Polling error', err);
          setRefreshing(false);
        });
    }, 5000);

    return () => clearInterval(interval);
  }, [invoice_id]);

  const handleSimulatePayment = async () => {
    if (!transaction) return;
    setPaying(true);
    try {
      const updatedData = await api.payTransaction(transaction.invoice_id);
      setTransaction(updatedData);
      showAlert('Simulasi Berhasil', 'Simulasi pembayaran berhasil! Status transaksi diperbarui.', 'success');
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal', err.message || 'Gagal memproses simulasi pembayaran', 'danger');
    } finally {
      setPaying(false);
    }
  };

  const handleMidtransPay = () => {
    if (!transaction?.snap_token) {
      showAlert('Gagal', 'Token pembayaran Midtrans tidak ditemukan.', 'danger');
      return;
    }
 
    if (typeof window !== 'undefined' && (window as any).snap) {
      (window as any).snap.pay(transaction.snap_token, {
        onSuccess: (result: any) => {
          showAlert('Sukses', 'Pembayaran Anda berhasil diverifikasi!', 'success');
          loadTransaction(true);
        },
        onPending: (result: any) => {
          showAlert('Pending', 'Pembayaran sedang diproses, silakan selesaikan tagihan Anda.', 'info');
          loadTransaction(true);
        },
        onError: (result: any) => {
          showAlert('Gagal', 'Pembayaran gagal. Silakan coba kembali.', 'danger');
          loadTransaction(true);
        },
        onClose: () => {
          showAlert('Info', 'Anda menutup panel pembayaran sebelum selesai.', 'warning');
        }
      });
    } else {
      showAlert('Peringatan', 'Layanan pembayaran Midtrans sedang dimuat, silakan coba lagi dalam beberapa detik.', 'warning');
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getPaymentStatusBadge = (status: Transaction['payment_status']) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-success/15 text-success border border-success/20">LUNAS</span>;
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-warning/15 text-warning border border-warning/20">PENDING</span>;
      case 'failed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-error/15 text-error border border-error/20">GAGAL</span>;
      case 'expired':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-400 border border-slate-200">EXPIRED</span>;
      default:
        return null;
    }
  };

  const getDeliveryStatusBadge = (status: Transaction['delivery_status']) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-success/15 text-success border border-success/20">SUKSES</span>;
      case 'processing':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200 animate-pulse">DIPROSES</span>;
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-500 border border-slate-250">ANTRE</span>;
      case 'failed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-error/15 text-error border border-error/20">GAGAL</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <p className="text-foreground/50 animate-pulse text-sm">Memuat detail invoice...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <h2 className="text-xl font-bold text-error font-heading">Terjadi Kesalahan</h2>
        <p className="text-sm text-foreground/60 mt-2">{error || 'Transaksi tidak ditemukan'}</p>
        <Link href={isAuthenticated ? (user?.role === 'admin' ? "/admin" : "/dashboard") : "/"} className="mt-6 inline-flex text-xs font-bold text-primary underline">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // Calculate fees (simulated from dynamic payment methods settings)
  const matchedMethod = dbPaymentMethods.find((pm) => pm.id === transaction.payment_method);
  const fee = transaction.payment_method === 'SALDO' ? 0 : (matchedMethod ? parseFloat(matchedMethod.fee) : 0);
  const discount = transaction.discount ? parseFloat(transaction.discount) : 0;
  const originalProductPrice = parseFloat(transaction.amount) + discount;
  const totalAmount = parseFloat(transaction.amount) + fee;

  const getFriendlyPaymentName = (method: string) => {
    if (method === 'SALDO') return `Saldo Akun ${webName}`;
    const matched = dbPaymentMethods.find((pm) => pm.id === method);
    return matched ? matched.name : method;
  };

  return (
    <div className="bg-slate-50 py-8 min-h-screen">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href={isAuthenticated ? (user?.role === 'admin' ? "/admin" : "/dashboard") : "/"} className="text-xs font-semibold text-foreground/50 hover:text-primary transition-colors">
            &larr; Kembali ke Beranda
          </Link>
          <button
            onClick={() => loadTransaction(false)}
            disabled={refreshing}
            className="text-xs font-semibold text-primary bg-primary-light/50 px-3 py-1.5 rounded-lg border border-primary/10 hover:bg-primary-light transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>{refreshing ? '🔄 Sinkron...' : '🔄 Refresh Status'}</span>
          </button>
        </div>

        <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden mb-6">
          {/* Status Banner */}
          <div className={`p-6 border-b border-border text-center ${
            transaction.payment_status === 'paid' ? 'bg-primary-light/20' : 'bg-amber-50/30'
          }`}>
            <h2 className="text-lg font-extrabold text-foreground font-heading flex items-center justify-center gap-1.5">
              <span>Invoice: {transaction.invoice_id}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(transaction.invoice_id);
                  setSuccessMsg('Nomor invoice berhasil disalin!');
                }}
                className="text-primary hover:text-primary-hover p-1 cursor-pointer bg-transparent border-0 flex items-center justify-center"
                title="Salin Invoice ID"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </button>
            </h2>
            <p className="text-xs text-foreground/40 mt-1">
              Dibuat pada: {formatDate(transaction.created_at)}
            </p>
            <div className="mt-4 flex items-center justify-center space-x-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-foreground/40 mb-1">Status Bayar</p>
                {getPaymentStatusBadge(transaction.payment_status)}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-foreground/40 mb-1">Status Pengiriman</p>
                {getDeliveryStatusBadge(transaction.delivery_status)}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Realtime Timeline */}
            <div>
              <h3 className="font-extrabold text-sm text-foreground mb-4 uppercase tracking-wider">
                Alur Transaksi Real-time
              </h3>
              <div className="relative border-l border-slate-200 ml-3 space-y-6 text-xs">
                {/* Step 1: Checkout */}
                <div className="relative pl-6">
                  <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-success border border-white" />
                  <p className="font-bold text-foreground/80">Pesanan Berhasil Dibuat</p>
                  <p className="text-foreground/40 mt-0.5">Invoice berhasil di-generate dan masuk sistem.</p>
                </div>

                {/* Step 2: Payment */}
                <div className="relative pl-6">
                  <div className={`absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border border-white ${
                    transaction.payment_status === 'paid' ? 'bg-success' : 'bg-warning animate-ping'
                  }`} />
                  {transaction.payment_status === 'paid' ? (
                    <>
                      <p className="font-bold text-foreground/80">Pembayaran Sukses</p>
                      <p className="text-foreground/40 mt-0.5">Pembayaran via {getFriendlyPaymentName(transaction.payment_method)} telah diterima.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-foreground/85 text-warning">Menunggu Pembayaran</p>
                      <p className="text-foreground/45 mt-0.5">Menunggu transfer dana / pembayaran QRIS diselesaikan.</p>
                    </>
                  )}
                </div>

                {/* Step 3: Digiflazz Delivery */}
                <div className="relative pl-6">
                  <div className={`absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border border-white ${
                    transaction.delivery_status === 'completed' 
                      ? 'bg-success' 
                      : (transaction.delivery_status === 'processing' ? 'bg-primary animate-pulse' : 'bg-slate-300')
                  }`} />
                  {transaction.delivery_status === 'completed' && (
                    <>
                      <p className="font-bold text-foreground/85">Produk Berhasil Dikirim</p>
                      <p className="text-success font-semibold mt-0.5">
                        Item game telah dikreditkan ke ID: {transaction.target_id} {transaction.target_zone && `(${transaction.target_zone})`}.
                      </p>
                    </>
                  )}
                  {transaction.delivery_status === 'processing' && (
                    <>
                      <p className="font-bold text-primary">Proses Pengiriman Otomatis</p>
                      <p className="text-foreground/40 mt-0.5">Pesanan sedang diproses oleh sistem.</p>
                    </>
                  )}
                  {transaction.delivery_status === 'failed' && (
                    <>
                      <p className="font-bold text-error">Pengiriman Gagal</p>
                      <p className="text-error/70 mt-0.5">Terjadi kesalahan pada target akun atau respon provider.</p>
                    </>
                  )}
                  {transaction.delivery_status === 'pending' && (
                    <>
                      <p className="font-bold text-foreground/35">Pengiriman Item Game</p>
                      <p className="text-foreground/35 mt-0.5">Pengiriman dilakukan otomatis sesaat setelah pembayaran lunas.</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bill Details */}
            <div className="border-t border-border pt-6">
              <h3 className="font-extrabold text-sm text-foreground mb-4 uppercase tracking-wider">
                Rincian Tagihan & Produk
              </h3>
              
              <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-foreground/50">Game:</span>
                  <div className="flex items-center space-x-2 font-bold text-foreground/80">
                    {transaction.game?.thumbnail ? (
                      <img
                        src={getAssetUrl(transaction.game.thumbnail)}
                        alt={transaction.game.name}
                        className="w-6 h-6 rounded-md object-cover border border-slate-200"
                      />
                    ) : null}
                    <span>{transaction.game?.name || 'Loading...'}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50">Item:</span>
                  <span className="font-bold text-foreground/80">{transaction.product?.name || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50">Tujuan Akun (Target):</span>
                  <span className="font-bold text-foreground/80">
                    {transaction.target_id} {transaction.target_zone && `(${transaction.target_zone})`}
                  </span>
                </div>
                {transaction.nickname && (
                  <div className="flex justify-between text-success">
                    <span className="text-foreground/50">Nickname Akun:</span>
                    <span className="font-extrabold">{transaction.nickname}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-foreground/50">Metode Pembayaran:</span>
                  <span className="font-bold text-foreground/80">{getFriendlyPaymentName(transaction.payment_method)}</span>
                </div>
                <div className="border-t border-dashed border-slate-200 my-2 pt-2" />
                <div className="flex justify-between">
                  <span className="text-foreground/50">Harga Item:</span>
                  <span className="font-bold text-foreground/80">{formatCurrency(originalProductPrice)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Potongan Voucher ({transaction.voucher_code}):</span>
                    <span className="font-extrabold">- {formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-foreground/50">Biaya Admin:</span>
                  <span className="font-bold text-foreground/80">{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span className="font-bold text-foreground/90">Total Bayar:</span>
                  <span className="font-black text-primary">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Response/Notes from Provider */}
            {transaction.notes && (
              <div className="border-t border-border pt-6">
                <h3 className="font-extrabold text-sm text-foreground mb-2 uppercase tracking-wider">
                  Catatan Transaksi
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-foreground/60 leading-relaxed font-mono">
                  {transaction.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alat Cetak Nota (Reseller) */}
        {transaction.delivery_status === 'completed' && (
          <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden p-6 mb-6">
            <h3 className="text-sm font-extrabold text-foreground mb-1 uppercase tracking-wider font-heading flex items-center gap-2">
              <span>📥 Buat & Unduh Nota Belanja</span>
            </h3>
            <p className="text-xs text-foreground/50 mb-5">
              Kustomisasi struk/nota pembelian untuk pelanggan Anda (cocok untuk Reseller). Perubahan ini hanya untuk gambar unduhan dan tidak mempengaruhi transaksi asli.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Editor Form */}
              <div className="md:col-span-5 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1.5 tracking-wider">
                    Nama Toko Anda
                  </label>
                  <input
                    type="text"
                    value={customShopName}
                    onChange={(e) => handleShopNameChange(e.target.value)}
                    placeholder={webName}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <p className="text-[10px] text-foreground/40 mt-1.5 leading-snug">
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
                    placeholder={totalAmount.toString()}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <p className="text-[10px] text-foreground/40 mt-1.5 leading-snug">
                    Harga beli Anda: <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={downloadReceiptImage}
                    disabled={downloadingImage}
                    className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-slate-200 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{downloadingImage ? 'Mengunduh...' : 'Unduh Gambar Nota (PNG)'}</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Column */}
              <div className="md:col-span-7 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-foreground/40 mb-3 tracking-wider">Live Preview Struk (Thermal 80mm)</span>
                
                {/* Receipt Body */}
                <div ref={receiptRef} className="w-full max-w-[280px] bg-white text-black p-5 rounded-xl shadow-md border border-slate-200/60 font-mono text-[10px] leading-relaxed flex flex-col items-center">
                  <div className="font-bold text-xs uppercase text-center tracking-tight leading-tight w-full break-words">
                    {customShopName || webName}
                  </div>
                  <div className="text-[8px] text-slate-500 uppercase mt-0.5 text-center">Struk Pembelian Game</div>
                  
                  <div className="w-full border-t border-dashed border-slate-300 my-2" />
                  
                  <div className="w-full text-left space-y-0.5 text-[9px]">
                    <div className="flex justify-between">
                      <span>No. Invoice:</span>
                      <span className="font-bold">{transaction.invoice_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tanggal:</span>
                      <span>{new Date(transaction.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-bold text-emerald-600">{transaction.payment_status === 'paid' ? 'LUNAS' : 'PENDING'}</span>
                    </div>
                  </div>
                  
                  <div className="w-full border-t border-dashed border-slate-300 my-2" />
                  
                  <div className="w-full text-left space-y-1 text-[9px]">
                    <div className="font-bold uppercase tracking-tight break-words">{transaction.game?.name}</div>
                    <div className="flex justify-between text-slate-600 pl-2">
                      <span className="break-words">- {transaction.product?.name}</span>
                      <span className="shrink-0 ml-2">1x</span>
                    </div>
                    <div className="pl-2 text-slate-700">
                      <span>ID: {transaction.target_id} {transaction.target_zone ? `(${transaction.target_zone})` : ''}</span>
                    </div>
                    {transaction.nickname && (
                      <div className="pl-2 italic text-slate-500">
                        <span>Nick: {transaction.nickname}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full border-t border-dashed border-slate-300 my-2" />
                  
                  <div className="w-full flex justify-between font-bold text-[11px] pt-0.5">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(customPrice || 0)}</span>
                  </div>
                  
                  <div className="w-full border-t border-dashed border-slate-300 my-2" />
                  
                  <div className="text-[8px] text-slate-500 uppercase mt-1 font-bold">Terima Kasih</div>
                  <div className="text-[7px] text-slate-400 text-center">Struk ini adalah bukti pembayaran sah</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Actions */}
        {transaction.payment_status === 'pending' && (
          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm text-center space-y-4">
            {transaction.snap_token ? (
              <div>
                <h4 className="text-sm font-extrabold text-foreground font-heading mb-2">
                  🔒 Selesaikan Pembayaran Anda
                </h4>
                <p className="text-xs text-foreground/50 mb-4 max-w-md mx-auto">
                  Silakan klik tombol di bawah untuk membayar menggunakan Midtrans Secure Payment Gateway.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleMidtransPay}
                    className="px-8 py-3 rounded-xl bg-primary hover:bg-primary-hover font-bold uppercase text-xs tracking-wider text-white shadow-md transition-all inline-flex items-center space-x-2 cursor-pointer"
                  >
                    <span>Bayar Sekarang (Midtrans)</span>
                  </button>
                  
                  {/* Keep Simulator option for Admin testing */}
                  {user?.role === 'admin' && (
                    <button
                      onClick={handleSimulatePayment}
                      disabled={paying}
                      className="px-6 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 font-bold uppercase text-xs tracking-wider text-amber-600 transition-all inline-flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>Simulasi Bayar (Admin)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-bold text-amber-800 font-heading mb-2">
                  🛠️ Simulator Pembayaran Sandbox (Demo)
                </h4>
                <p className="text-xs text-amber-700/80 mb-4 max-w-md mx-auto">
                  Karena Anda berada dalam mode demo atau Midtrans dinonaktifkan, gunakan tombol di bawah ini untuk mensimulasikan pembayaran lunas.
                </p>
                <button
                  onClick={handleSimulatePayment}
                  disabled={paying}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold uppercase text-xs tracking-wider text-white shadow-md transition-all inline-flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {paying ? (
                    <span>Memproses Pembayaran...</span>
                  ) : (
                    <span>Bayar Sekarang (Simulasi)</span>
                  )}
                </button>
              </div>
            )}
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

      {successMsg && (
        <div className="fixed bottom-5 right-5 left-5 sm:left-auto bg-success text-white px-5 py-4 rounded-xl shadow-2xl border border-success-hover flex items-center space-x-3 z-50 animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold text-xs leading-snug">{successMsg}</span>
        </div>
      )}

      {midtransActive && midtransClientKey && (
        <Script
          id="midtrans-snap"
          src={midtransMode === 'production' ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js'}
          data-client-key={midtransClientKey}
          strategy="lazyOnload"
        />
      )}
    </div>
  </div>
);
}





