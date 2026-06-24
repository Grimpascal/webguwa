export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export function getAssetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Clean index.php from base URL if present for static assets
  const assetBaseUrl = API_BASE_URL.replace(/\/index\.php\/?$/, '');
  return `${assetBaseUrl}${cleanPath}`;
}

export interface Game {
  id: number;
  name: string;
  slug: string;
  code: string;
  thumbnail: string | null;
  input_placeholder: string;
  is_active: boolean;
  flash_sale_end?: string | null;
  products?: Product[];
}

export interface Product {
  id: number;
  game_id: number;
  name: string;
  buyer_sku_code: string;
  price: string;
  original_price: string;
  is_available: boolean;
  markup_type: 'global' | 'percent' | 'flat';
  markup_value: string;
  flash_sale_price?: string | null;
}

export interface Transaction {
  id: number;
  invoice_id: string;
  game_id: number;
  product_id: number;
  target_id: string;
  target_zone: string | null;
  nickname?: string | null;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'expired';
  delivery_status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: string;
  voucher_code?: string | null;
  discount?: string;
  notes: string | null;
  digiflazz_ref_id: string | null;
  snap_token?: string | null;
  snap_url?: string | null;
  created_at: string;
  updated_at: string;
  game?: Game;
  product?: Product;
  user?: User;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || sessionStorage.getItem('token')) : null;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store', // Disable cache for dynamic checkout/billing operations
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    throw new Error('Gagal membaca data dari server.');
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Something went wrong');
  }
  return data;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  balance: string;
  api_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BalanceHistory {
  id: number;
  user_id: number;
  type: 'addition' | 'deduction';
  amount: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  message: string;
  created_at: string;
  updated_at: string;
  sender?: User;
}

export interface Ticket {
  id: number;
  user_id: number;
  title: string;
  category: 'transaksi' | 'topup' | 'akun' | 'lainnya';
  status: 'open' | 'replied' | 'closed';
  created_at: string;
  updated_at: string;
  user?: User;
  messages?: TicketMessage[];
}

export interface TopupMethod {
  id: number;
  name: string;
  account_number: string;
  account_name: string;
  min_amount: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TopupRequest {
  id: number;
  user_id: number;
  topup_method_id: number;
  amount: string;
  unique_code: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  previous_balance?: string | null;
  created_at: string;
  updated_at: string;
  method?: TopupMethod;
  user?: User;
}

export interface Voucher {
  id: number;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  min_transaction: number;
  max_discount: number | null;
  quota: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  subtitle: string | null;
  type: 'info' | 'success' | 'warning' | 'danger';
  type_label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  total_sales: number;
  total_transactions: number;
  pending_transactions: number;
  success_transactions: number;
  failed_transactions: number;
  total_users: number;
}

export const api = {
  getGames: async (): Promise<Game[]> => {
    const res = await fetchAPI('/api/games');
    return res.data;
  },

  getGame: async (slug: string): Promise<Game> => {
    const res = await fetchAPI(`/api/games/${slug}`);
    return res.data;
  },

  getPaymentMethods: async (): Promise<any[]> => {
    const res = await fetchAPI('/api/payment-methods');
    return res.data;
  },

  createTransaction: async (payload: {
    game_id: number;
    product_id: number;
    target_id: string;
    target_zone?: string;
    nickname?: string;
    payment_method: string;
    voucher_code?: string;
  }): Promise<Transaction> => {
    const res = await fetchAPI('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getTransaction: async (invoiceId: string): Promise<Transaction> => {
    const res = await fetchAPI(`/api/transactions/${invoiceId}`);
    return res.data;
  },

  payTransaction: async (invoiceId: string): Promise<Transaction> => {
    const res = await fetchAPI(`/api/transactions/${invoiceId}/pay`, {
      method: 'POST',
    });
    return res.data;
  },

  // Auth Operations
  register: async (payload: any) => {
    return await fetchAPI('/api/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login: async (payload: any) => {
    return await fetchAPI('/api/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout: async () => {
    return await fetchAPI('/api/logout', {
      method: 'POST',
    });
  },

  me: async (): Promise<User> => {
    const res = await fetchAPI('/api/me');
    return res.data;
  },

  // User Protected Dashboard
  getUserTransactions: async (): Promise<Transaction[]> => {
    const res = await fetchAPI('/api/user/transactions');
    return res.data;
  },

  topupUserBalance: async (amount: number): Promise<User> => {
    const res = await fetchAPI('/api/user/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return res.data;
  },

  updateProfile: async (payload: { name: string; password?: string }): Promise<User> => {
    const res = await fetchAPI('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getTopupMethods: async (): Promise<TopupMethod[]> => {
    const res = await fetchAPI('/api/user/topup/methods');
    return res.data;
  },

  createTopupRequest: async (payload: { topup_method_id: number; amount: number }): Promise<TopupRequest> => {
    const res = await fetchAPI('/api/user/topup/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getTopupRequests: async (): Promise<TopupRequest[]> => {
    const res = await fetchAPI('/api/user/topup/requests');
    return res.data;
  },

  getUserBalanceHistory: async (): Promise<BalanceHistory[]> => {
    const res = await fetchAPI('/api/user/balance-history');
    return res.data;
  },

  // Admin Protected Dashboard
  getAdminTransactions: async (): Promise<Transaction[]> => {
    const res = await fetchAPI('/api/admin/transactions');
    return res.data;
  },

  failAdminTransaction: async (invoiceId: string): Promise<Transaction> => {
    const res = await fetchAPI(`/api/admin/transactions/${invoiceId}/fail`, {
      method: 'POST',
    });
    return res.data;
  },

  getAdminStats: async (): Promise<AdminStats> => {
    const res = await fetchAPI('/api/admin/stats');
    return res.data;
  },

  // Admin User CRUD
  getUsers: async (): Promise<User[]> => {
    const res = await fetchAPI('/api/admin/users');
    return res.data;
  },

  createUser: async (payload: any): Promise<User> => {
    const res = await fetchAPI('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  updateUser: async (id: number, payload: any): Promise<User> => {
    const res = await fetchAPI(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await fetchAPI(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  getAdminUserBalanceHistory: async (userId: number): Promise<BalanceHistory[]> => {
    const res = await fetchAPI(`/api/admin/users/${userId}/balance-history`);
    return res.data;
  },

  // Admin Digiflazz Settings
  getAdminSettings: async () => {
    const res = await fetchAPI('/api/admin/settings');
    return res.data;
  },

  updateAdminSettings: async (payload: any) => {
    const res = await fetchAPI('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },

  getAdminPaymentMethods: async (): Promise<any[]> => {
    const res = await fetchAPI('/api/admin/payment-methods');
    return res.data;
  },

  updateAdminPaymentMethods: async (paymentMethods: any[]): Promise<any> => {
    const res = await fetchAPI('/api/admin/payment-methods', {
      method: 'POST',
      body: JSON.stringify({ payment_methods: paymentMethods }),
    });
    return res;
  },

  getPublicSettings: async (): Promise<{ 
    brand_logo: string | null; 
    favicon: string | null; 
    web_name: string;
    footer_description?: string;
    footer_whatsapp?: string;
    footer_email?: string;
    footer_working_hours?: string;
    midtrans_is_active?: boolean;
    midtrans_client_key?: string;
    midtrans_mode?: string;
  }> => {
    const res = await fetchAPI('/api/settings/public');
    return res.data;
  },

  updateWebSettings: async (payload: { 
    web_name: string;
    footer_description?: string;
    footer_whatsapp?: string;
    footer_email?: string;
    footer_working_hours?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const res = await fetchAPI('/api/admin/web-settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },

  uploadBrandLogo: async (formData: FormData): Promise<{ success: boolean; data: { brand_logo: string }; message: string }> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}/api/admin/brand-logo`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Gagal mengunggah logo.');
    }
    return data;
  },

  uploadFavicon: async (formData: FormData): Promise<{ success: boolean; data: { favicon: string }; message: string }> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}/api/admin/favicon`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Gagal mengunggah favicon.');
    }
    return data;
  },

  getAdminGames: async (): Promise<Game[]> => {
    const res = await fetchAPI('/api/admin/games');
    return res.data;
  },

  updateGame: async (id: number, payload: { is_active: boolean; flash_sale_end: string | null }): Promise<Game> => {
    const res = await fetchAPI(`/api/admin/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  uploadGameThumbnail: async (id: number, formData: FormData): Promise<{ success: boolean; data: Game; message: string }> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}/api/admin/games/${id}/thumbnail`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Gagal mengunggah thumbnail game.');
    }
    return data;
  },

  getDigiflazzBalance: async (): Promise<{ success: boolean; balance: number; message: string }> => {
    return await fetchAPI('/api/admin/digiflazz/balance');
  },

  // Admin Topup Request & Transfer Methods
  getAdminTopupMethods: async (): Promise<TopupMethod[]> => {
    const res = await fetchAPI('/api/admin/topup/methods');
    return res.data;
  },

  createAdminTopupMethod: async (payload: any): Promise<TopupMethod> => {
    const res = await fetchAPI('/api/admin/topup/methods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  updateAdminTopupMethod: async (id: number, payload: any): Promise<TopupMethod> => {
    const res = await fetchAPI(`/api/admin/topup/methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deleteAdminTopupMethod: async (id: number): Promise<void> => {
    await fetchAPI(`/api/admin/topup/methods/${id}`, {
      method: 'DELETE',
    });
  },

  getAdminTopupRequests: async (): Promise<TopupRequest[]> => {
    const res = await fetchAPI('/api/admin/topup/requests');
    return res.data;
  },

  approveTopupRequest: async (id: number): Promise<TopupRequest> => {
    const res = await fetchAPI(`/api/admin/topup/requests/${id}/approve`, {
      method: 'POST',
    });
    return res.data;
  },

  rejectTopupRequest: async (id: number): Promise<TopupRequest> => {
    const res = await fetchAPI(`/api/admin/topup/requests/${id}/reject`, {
      method: 'POST',
    });
    return res.data;
  },

  // Admin Product Management
  getAdminProducts: async (): Promise<any[]> => {
    const res = await fetchAPI('/api/admin/products');
    return res.data;
  },

  updateAdminProduct: async (id: number, payload: { markup_type: string; markup_value: number; is_available: boolean; flash_sale_price?: string | null }): Promise<any> => {
    const res = await fetchAPI(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
 
  bulkUpdateAdminProductsMarkup: async (payload: { game_id: string; markup_type: string; markup_value: number }): Promise<{ success: boolean; message: string }> => {
    return await fetchAPI('/api/admin/products/bulk-markup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
 
  syncDigiflazzProducts: async (): Promise<{ success: boolean; message: string }> => {
    return await fetchAPI('/api/admin/products/sync', {
      method: 'POST',
    });
  },

  // Admin Voucher Management
  getAdminVouchers: async (): Promise<Voucher[]> => {
    const res = await fetchAPI('/api/admin/vouchers');
    return res.data;
  },

  createAdminVoucher: async (payload: any): Promise<Voucher> => {
    const res = await fetchAPI('/api/admin/vouchers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  updateAdminVoucher: async (id: number, payload: any): Promise<Voucher> => {
    const res = await fetchAPI(`/api/admin/vouchers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deleteAdminVoucher: async (id: number): Promise<void> => {
    await fetchAPI(`/api/admin/vouchers/${id}`, {
      method: 'DELETE',
    });
  },

  // Voucher validation (Checkout)
  checkVoucher: async (code: string, amount: number): Promise<{ success: boolean; discount: number; message: string; voucher?: Voucher }> => {
    return await fetchAPI('/api/vouchers/check', {
      method: 'POST',
      body: JSON.stringify({ code, amount }),
    });
  },

  // Public Announcements
  getAnnouncements: async (): Promise<Announcement[]> => {
    const res = await fetchAPI('/api/announcements');
    return res.data;
  },

  // Admin Announcements CRUD
  getAdminAnnouncements: async (): Promise<Announcement[]> => {
    const res = await fetchAPI('/api/admin/announcements');
    return res.data;
  },

  createAdminAnnouncement: async (payload: any): Promise<Announcement> => {
    const res = await fetchAPI('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  updateAdminAnnouncement: async (id: number, payload: any): Promise<Announcement> => {
    const res = await fetchAPI(`/api/admin/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deleteAdminAnnouncement: async (id: number): Promise<void> => {
    await fetchAPI(`/api/admin/announcements/${id}`, {
      method: 'DELETE',
    });
  },

  generateApiKey: async (): Promise<{ success: boolean; api_token: string; message: string }> => {
    return await fetchAPI('/api/user/api-key', {
      method: 'POST',
    });
  },

  requestDigiflazzDeposit: async (payload: { amount: number; bank: string; owner_name: string }): Promise<any> => {
    return await fetchAPI('/api/admin/digiflazz/deposit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getDigiflazzDeposits: async (): Promise<any[]> => {
    const res = await fetchAPI('/api/admin/digiflazz/deposits');
    return res.data;
  },

  // Support Tickets (User)
  getUserTickets: async (): Promise<Ticket[]> => {
    const res = await fetchAPI('/api/user/tickets');
    return res.data;
  },

  createTicket: async (payload: { title: string; category: string; message: string }): Promise<Ticket> => {
    const res = await fetchAPI('/api/user/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getTicket: async (id: number): Promise<Ticket> => {
    const res = await fetchAPI(`/api/user/tickets/${id}`);
    return res.data;
  },

  replyTicket: async (id: number, message: string): Promise<TicketMessage> => {
    const res = await fetchAPI(`/api/user/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return res.data;
  },

  closeTicket: async (id: number): Promise<Ticket> => {
    const res = await fetchAPI(`/api/user/tickets/${id}/close`, {
      method: 'POST',
    });
    return res.data;
  },

  // Support Tickets (Admin)
  getAdminTickets: async (): Promise<Ticket[]> => {
    const res = await fetchAPI('/api/admin/tickets');
    return res.data;
  },

  getAdminTicket: async (id: number): Promise<Ticket> => {
    const res = await fetchAPI(`/api/admin/tickets/${id}`);
    return res.data;
  },

  replyAdminTicket: async (id: number, message: string): Promise<TicketMessage> => {
    const res = await fetchAPI(`/api/admin/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return res.data;
  },

  closeAdminTicket: async (id: number, status: 'closed' | 'open' = 'closed'): Promise<Ticket> => {
    const res = await fetchAPI(`/api/admin/tickets/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },
};
