'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api, Transaction } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

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
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

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
      })
      .catch(err => console.error("Gagal memuat setting web_name di invoice", err));
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
                      <p className="font-bold text-primary">Proses Pengiriman via Digiflazz</p>
                      <p className="text-foreground/40 mt-0.5">Menunggu konfirmasi sukses dari API Digiflazz.</p>
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
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${transaction.game.thumbnail}`}
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

        {/* Demo Mode Actions: Payment Simulator */}
        {transaction.payment_status === 'pending' && (
          <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-2xl shadow-sm text-center">
            <h4 className="text-sm font-bold text-amber-800 font-heading mb-2">
              🛠️ Simulator Pembayaran Sandbox (Demo)
            </h4>
            <p className="text-xs text-amber-700/80 mb-4 max-w-md mx-auto">
              Karena Anda berada dalam mode demo, gunakan tombol di bawah ini untuk mensimulasikan pembayaran lunas. 
              Ini akan memicu status transaksi menjadi <strong>Paid</strong> dan menjalankan request order Digiflazz.
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
    </div>
    </div>
  );
}
