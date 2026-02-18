# KateringPro - Setup Guide

## Prerequisites

1. **PocketBase Installation**
   - Download PocketBase from [pocketbase.io](https://pocketbase.io)
   - Extract and run it locally or deploy to your server
   - Access the admin panel at `http://localhost:8090/admin` (or your server URL)

2. **Import Database Schema**
   - Use the provided PocketBase collections JSON file to set up your database
   - In the Admin UI, go to Collections and import the schema

3. **Create Auth Collection (if not in schema)**
   - In PocketBase Admin, create a `users` collection if it doesn't exist
   - Add fields: email, password, username, verified
   - Configure authentication settings

## Installation Steps

### 1. Configure Environment Variables
Create a `.env.local` file in the project root:
```bash
# Copy from example
cp .env.example .env.local

# Edit the file and set your PocketBase URL
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Run Development Server
```bash
npm run dev
# or
pnpm dev
```

### 4. Access Application
- Open [http://localhost:3000](http://localhost:3000) in your browser
- You'll be redirected to the login page
- Sign in with your PocketBase user credentials

## First-Time Setup

### In PocketBase Admin Panel:

1. **Create Collections** (if using provided schema file):
   - Navigate to Collections
   - Import the `catering_pb_collections.json` file
   - This creates all necessary collections

2. **Set Up Users Collection**:
   - Create a `users` collection with auth enabled
   - Add at least one user account for testing

3. **Configure Auth Rules**:
   - Set collection rules to require authentication (`@request.auth.id != ''`)
   - This is usually pre-configured in the provided schema

4. **Create Sample Data**:
   - Add customers in the `customers` collection
   - Add menu categories in `menu_categories`
   - Add menu items in `menu_items`
   - Create sample orders to test the dashboard

## Features

### Implemented
- ✅ Authentication with PocketBase
- ✅ Dashboard with statistics and trends
- ✅ Customer management (list, view, delete)
- ✅ Orders management (list, view)
- ✅ Responsive dark theme UI
- ✅ Real-time data fetching

### Coming Soon
- Menu management system
- Invoice generation and tracking
- Payment management
- Expense tracking
- Inventory management
- Advanced reporting

## Environment Configuration

The app automatically stores:
- `pb_url` - Your PocketBase server URL
- `pb_auth` - Authentication token (in localStorage)

No additional environment variables needed!

## Troubleshooting

### "Failed to connect to PocketBase"
- Verify your PocketBase URL is correct
- Ensure PocketBase is running
- Check CORS settings if accessing from different domain

### "Login failed"
- Verify the user account exists in PocketBase
- Check that the `users` collection is properly configured with auth

### Data not showing
- Ensure you have proper read permissions in collection rules
- Verify data exists in PocketBase Admin panel
- Check browser console for error messages

## Building for Production

```bash
npm run build
npm run start
```

Deploy to your preferred platform (Vercel, Netlify, etc.) and update the PocketBase URL to your production instance.

## API Collections Used

- `customers` - Customer records
- `menu_categories` - Menu category definitions
- `menu_items` - Individual menu items
- `suppliers` - Supplier information
- `ingredients` - Ingredient inventory
- `orders` - Customer orders
- `order_items` - Items within an order
- `invoices` - Invoice records
- `payments` - Payment tracking
- `expenses` - Expense records
- `users` - User accounts (auth)

## Need Help?

For PocketBase documentation, visit: [docs.pocketbase.io](https://docs.pocketbase.io)
For this application, check the source code comments and component documentation.
