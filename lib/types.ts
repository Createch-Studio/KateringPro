// PocketBase Collection Types
export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
}

// Customers
export interface Customer extends BaseRecord {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  type: 'individual' | 'company' | 'government' | 'ngo';
  company_name?: string;
  npwp?: string;
  notes?: string;
  is_active?: boolean;
}

// Menu Categories
export interface MenuCategory extends BaseRecord {
  name: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Menu Items
export interface MenuItem extends BaseRecord {
  name: string;
  description?: string;
  category_id: string;
  sku?: string;
  unit: 'porsi' | 'box' | 'pax' | 'paket' | 'loyang' | 'kg' | 'liter';
  price: number;
  min_order?: number;
  photo?: string;
  is_active?: boolean;
  notes?: string;
}

// Suppliers
export interface Supplier extends BaseRecord {
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  category?: 'bahan_baku' | 'peralatan' | 'packaging' | 'jasa' | 'lainnya';
  npwp?: string;
  is_active?: boolean;
  notes?: string;
}

// Ingredients
export interface Ingredient extends BaseRecord {
  name: string;
  unit: 'kg' | 'gram' | 'liter' | 'ml' | 'pcs' | 'pack' | 'ikat' | 'buah' | 'lembar';
  current_stock: number;
  min_stock?: number;
  last_price?: number;
  supplier_id?: string;
  category?: 'sayuran' | 'daging' | 'bumbu' | 'minyak' | 'tepung' | 'minuman' | 'packaging' | 'lainnya';
  is_active?: boolean;
}

// Orders
export interface Order extends BaseRecord {
  order_number: string;
  customer_id: string;
  order_date: string;
  event_date: string;
  event_name?: string;
  event_location?: string;
  total_pax?: number;
  status: 'draft' | 'confirmed' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  down_payment?: number;
  paid_amount?: number;
  payment_type?: 'cash' | 'transfer' | 'qris' | 'tempo';
  notes?: string;
}

// Order Items
export interface OrderItem extends BaseRecord {
  order_id: string;
  menu_id: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  total: number;
  notes?: string;
}

// Invoices
export interface Invoice extends BaseRecord {
  invoice_number: string;
  order_id: string;
  invoice_date: string;
  due_date?: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
}

// Payments
export interface Payment extends BaseRecord {
  invoice_id?: string;
  order_id?: string;
  session_id?: string;
  payment_date: string;
  amount: number;
  method: 'cash' | 'transfer_bank' | 'qris' | 'giro' | 'cheque';
  reference_number?: string;
  bank_name?: string;
  payment_type: 'down_payment' | 'installment' | 'full_payment' | 'refund';
  notes?: string;
}

// Expenses
export interface Expense extends BaseRecord {
  expense_date: string;
  category: 'bahan_baku' | 'tenaga_kerja' | 'transportasi' | 'peralatan' | 'marketing' | 'utilities' | 'sewa' | 'lainnya';
  description: string;
  amount: number;
  supplier_id?: string;
  notes?: string;
  is_deleted?: boolean;
}

// Accounts (Chart of Accounts)
export interface Account extends BaseRecord {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normal_balance: 'debit' | 'credit';
  is_active?: boolean;
  description?: string;
}

export interface JournalEntry extends BaseRecord {
  entry_date: string;
  reference?: string;
  account_id: string;
  description?: string;
  debit: number;
  credit: number;
  source?: 'manual' | 'system';
  notes?: string;
}

// User (PocketBase Auth)
export interface User extends BaseRecord {
  email: string;
  username?: string;
  verified?: boolean;
  emailVisibility?: boolean;
}

// Employees
export interface Employee extends BaseRecord {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  role:
    | 'admin'
    | 'manager'
    | 'cashier'
    | 'production'
    | 'accounting'
    | 'waiter'
    | 'driver';
  status: 'active' | 'inactive';
  user_id?: string;
  base_salary?: number;
  join_date?: string;
  note?: string;
  notes?: string;
}

// Role-based permissions
export type EmployeeRole = Employee['role'];

export interface RolePermission extends BaseRecord {
  role: EmployeeRole;
  permissions: string[];
}

// Dashboard Stats
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingPayments: number;
  completedOrders: number;
  monthlyRevenue: Array<{ month: string; amount: number }>;
  recentOrders: Order[];
}

// Cash Register Sessions
export interface CashRegisterSession extends BaseRecord {
  user_id: string;
  open_time: string;
  close_time?: string;
  opening_balance: number;
  closing_balance?: number;
  status: 'open' | 'closed';
  notes?: string;
}
