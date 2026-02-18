# Ledgr — ERP & Akuntansi

A modern business management system built with **Next.js 16** and **PocketBase**, designed for managing customers, orders, menus, invoices, and finances.

## 🎯 Features

### Implemented ✅
- **Authentication** - Secure login with PocketBase
- **Dashboard** - Real-time statistics and revenue trends
- **Customer Management** - List, view, and manage customers
- **Order Management** - Create and track orders with status
- **Dark Theme UI** - Modern, responsive design matching professional standards
- **Real-time Data** - Instant data synchronization with PocketBase

### Ready for Development 🚀
- Menu Management - Categories and menu items
- Invoice Generation - Auto-generate from orders
- Payment Tracking - Multiple payment methods
- Expense Management - Track business expenses
- Inventory System - Stock management and alerts
- Advanced Analytics - Detailed reporting

## 📋 System Architecture

```
┌─────────────┐
│  Next.js 16 │ (Frontend)
├─────────────┤
│  React 19   │
├─────────────┤
│  PocketBase │ (Backend + Database)
└─────────────┘
```

### Core Technologies
- **Frontend**: Next.js 16 with App Router, React 19, TypeScript
- **Backend**: PocketBase (serverless SQLite)
- **Styling**: Tailwind CSS v4 with shadcn/ui
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Notifications**: Sonner toast

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ and npm/pnpm
- PocketBase server running locally or deployed
- The provided `catering_pb_collections.json` file

### 2. Setup PocketBase

```bash
# Download from https://pocketbase.io
# Run it
./pocketbase serve

# In another terminal, import collections:
# Go to http://localhost:8090/admin
# Upload catering_pb_collections.json to Collections
```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### 4. Login
- **PocketBase URL**: `http://localhost:8090`
- **Email**: Your PocketBase user email
- **Password**: Your PocketBase password

📖 **[Detailed Setup Guide](./SETUP.md)** | 📖 **[Quick Start](./QUICKSTART.md)** | 📖 **[Technical Details](./IMPLEMENTATION.md)**

## 📁 Project Structure

```
Ledgr/
├── app/
│   ├── (auth)/login          # Login page
│   ├── dashboard             # Main dashboard
│   ├── customers             # Customer management
│   ├── orders                # Order management
│   ├── menus                 # Menu management (ready)
│   ├── invoices              # Invoice management (ready)
│   ├── inventory             # Inventory tracking (ready)
│   ├── expenses              # Expense tracking (ready)
│   └── settings              # Settings (ready)
├── components/
│   ├── layout/               # Sidebar, Topbar, MainLayout
│   ├── dashboard/            # Dashboard components
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── types.ts              # TypeScript types for PocketBase
│   ├── auth-context.tsx      # Authentication state
│   ├── pocketbase.ts         # PocketBase client
│   ├── api.ts                # Helper functions
│   └── utils.ts              # Utility functions
├── SETUP.md                  # Detailed setup instructions
├── QUICKSTART.md             # Quick start guide
├── IMPLEMENTATION.md         # Technical implementation details
└── package.json              # Dependencies

```

## 🎨 Design System

### Color Palette
- **Background**: `#0f1117` (slate-950)
- **Card**: `#1e2538` (slate-900)
- **Accent**: `#f97316` (orange-500)
- **Text**: `#e2e8f0` (slate-100)
- **Muted**: `#94a3b8` (slate-400)

### Components
- Responsive sidebar navigation
- Sticky topbar with search
- Status badges (draft, confirmed, completed, cancelled)
- Interactive tables with hover effects
- Toast notifications
- Loading skeletons
- Modal forms (ready for implementation)

## 🔐 Authentication Flow

1. User opens the app → redirected to `/login`
2. Enters PocketBase URL (stored in localStorage)
3. Authenticates with email/password
4. Auth token stored securely
5. Redirected to `/dashboard`
6. Token persists across sessions

## 📊 Database Collections

The PocketBase schema includes:

- **customers** - Customer information and types
- **menu_categories** - Menu category definitions
- **menu_items** - Individual menu items with pricing
- **suppliers** - Supplier contact information
- **ingredients** - Ingredient inventory and stock
- **orders** - Customer orders with status tracking
- **order_items** - Individual items within orders
- **invoices** - Invoice records and status
- **payments** - Payment tracking and methods
- **expenses** - Business expense records
- **users** - User accounts (authentication)

## 🛠️ API Integration

All PocketBase collections are fully typed in `lib/types.ts` for type safety. API calls use:

```typescript
const pb = useAuth().pb; // Get PocketBase client
const records = await pb.collection('customers').getList(1, 50);
```

Helper functions available in `lib/api.ts`:
- `formatCurrency()` - Format numbers as Indonesian Rupiah
- `formatDate()` - Format dates with locale
- `formatDateTime()` - Format dates with time
- `uploadFile()` - Upload files to PocketBase
- `getFileUrl()` - Get file URLs for media

## 📱 Responsive Design

- **Mobile**: Full-width single column layout, collapsible sidebar
- **Tablet**: Two-column grid layouts with optimized spacing
- **Desktop**: Full sidebar + content area with multi-column grids

## 🚢 Deployment

### To Vercel
```bash
npm run build
vercel --prod
```

### To Other Platforms
1. Build: `npm run build`
2. Start: `npm run start`
3. Update PocketBase URL to production instance

### Environment
No environment variables needed! The app stores:
- `pb_url` - PocketBase server URL (localStorage)
- `pb_auth` - Auth token (localStorage)

## 📈 Development Roadmap

### Phase 1: Core Features ✅
- [x] Authentication system
- [x] Dashboard with statistics
- [x] Customer management
- [x] Order listing

### Phase 2: Order Management 🔄
- [ ] Create orders with items
- [ ] Order status workflow
- [ ] Order detail page
- [ ] Invoice generation

### Phase 3: Business Features 📋
- [ ] Menu management
- [ ] Inventory tracking
- [ ] Expense management
- [ ] Advanced analytics

### Phase 4: Advanced 🚀
- [ ] User roles and permissions
- [ ] Email notifications
- [ ] SMS alerts
- [ ] API webhooks
- [ ] Multi-user support
- [ ] Accounting integration

## 🐛 Troubleshooting

### Can't connect to PocketBase
- Verify PocketBase is running
- Check URL format (http://localhost:8090)
- Verify CORS is enabled if remote server

### Login fails
- Confirm user exists in PocketBase
- Check password is correct
- Verify `users` collection exists and has auth enabled

### Dashboard is empty
- Create sample data in PocketBase Admin
- Refresh the page
- Check browser console for errors

### Collections not found
- Import `catering_pb_collections.json` into PocketBase
- Verify collection permissions allow authenticated access

## 📚 Documentation

- 📖 [Detailed Setup Guide](./SETUP.md) - Complete setup instructions
- 🚀 [Quick Start Guide](./QUICKSTART.md) - Get running in 5 minutes
- 🔧 [Technical Implementation](./IMPLEMENTATION.md) - Architecture & components
- 📦 [PocketBase Docs](https://docs.pocketbase.io) - Backend documentation
- ⚛️ [Next.js Docs](https://nextjs.org/docs) - Framework documentation
- 🎨 [shadcn/ui](https://ui.shadcn.com) - Component documentation

## 💡 Tips & Tricks

### Debug API Calls
Add to components:
```typescript
console.log("[v0] API Response:", data)
```

### Access PocketBase Admin
- Local: http://localhost:8090/admin
- View all data and manage collections
- Create test records for development

### Customize Styling
- Colors defined in components (search `orange-500`)
- Tailwind classes throughout the app
- Edit `app/globals.css` for global styles

### Add New Features
1. Create page in `app/` directory
2. Wrap with `<MainLayout title="..." />`
3. Use `useAuth()` hook for PocketBase client
4. Follow existing patterns in other pages

## 🤝 Contributing

Improvements welcome! Some ideas:
- Add form validation with Zod
- Implement advanced filtering
- Add export to PDF/Excel
- Create mobile-friendly forms
- Add dark/light mode toggle
- Implement search optimization

## 📄 License

Feel free to use this template for your catering business or as a foundation for your own ERP system.

## 🎉 Let's Build!

This is a fully functional starting point for a modern catering management system. Add features, customize the design, and deploy to help catering businesses manage their operations efficiently.

**Questions?** Check the documentation files or the source code comments!

---

**Built with ❤️ using Next.js, PocketBase, and Tailwind CSS**
