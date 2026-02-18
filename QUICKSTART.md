# KateringPro - Quick Start Guide

## 1️⃣ Download & Setup PocketBase

### Option A: Local Development
```bash
# Download from pocketbase.io
# Extract the downloaded file
cd path/to/pocketbase

# Make it executable (macOS/Linux)
chmod +x ./pocketbase

# Run PocketBase
./pocketbase serve
```
PocketBase will be running at `http://localhost:8090`

### Option B: Docker
```bash
docker run -d -p 8090:8090 --name pocketbase \
  -v pocketbase_data:/pb_data \
  ghcr.io/pocketbase/pocketbase:latest
```

## 2️⃣ Set Up PocketBase Collections

1. Open PocketBase Admin: `http://localhost:8090/admin`
2. Go to **Collections**
3. Click **Import collections**
4. Upload the `catering_pb_collections.json` file from the project

## 3️⃣ Create a Test User

1. In PocketBase Admin, go to **Collections** → **users**
2. Click **New record**
3. Enter:
   - **Email**: `test@example.com`
   - **Password**: `password123`
   - Verify/check any required fields
4. Save the record

## 4️⃣ Configure Environment Variables

1. Create `.env.local` file in the project root
2. Add your PocketBase URL:
```bash
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```

Or copy from the example:
```bash
cp .env.example .env.local
```

Then edit `.env.local` if needed for your setup.

## 5️⃣ Install & Run the App

```bash
# Install dependencies
npm install
# or
pnpm install

# Run development server
npm run dev
# or
pnpm dev
```

The app will be running at `http://localhost:3000`

## 6️⃣ Login & Test

1. Open http://localhost:3000
2. You'll be directed to the login page
3. Enter your test credentials:
   - Email: `test@example.com`
   - Password: `password123`
4. Click "Sign In"
5. You should now see the Dashboard! 🎉

## 📊 Create Sample Data (Optional)

To see the dashboard with data, use the PocketBase Admin panel:

### Add a Customer
1. Go to `http://localhost:8090/admin` → Collections → customers
2. Click "New record"
3. Fill in:
   - **Name**: Your Cafe
   - **Phone**: +62812345678
   - **Email**: cafe@example.com
   - **Type**: company
4. Save

### Create an Order
1. Go to Collections → orders
2. Click "New record"
3. Fill in:
   - **order_number**: ORD-001
   - **customer**: (select the customer you created)
   - **status**: draft
   - **subtotal**: 500000
   - **total**: 500000
4. Save

You'll see this data in the app immediately!

## 🚀 Common Next Steps

### Add More Features
- Go to `/menus` page - ready to add menu management
- Go to `/customers` page - already has customer listing
- Go to `/orders` page - shows your orders from the dashboard

### Customize the Look
- Edit colors in components (search for `orange-500`)
- Change the app name in `Sidebar.tsx` and `Login.tsx`
- Modify the dashboard layout in `app/dashboard/page.tsx`

### Add Database Data
- Use PocketBase Admin UI to create records
- The app will fetch them automatically
- Try adding customers and orders to see the dashboard populate

## 🛠️ Development Tips

### Enable Debug Logging
Add this to any component:
```typescript
console.log("[v0] Debug message:", variable)
```

### View Network Requests
- Open DevTools (F12)
- Go to Network tab
- Look for requests to your PocketBase server

### Common Errors
- **"PocketBase not initialized"**: Enter the correct URL on login
- **"Login failed"**: Check user exists in PocketBase and credentials are correct
- **Empty dashboard**: Create sample orders (see above)

## 📱 Access the App

### Locally
- Main app: http://localhost:3000
- PocketBase Admin: http://localhost:8090/admin

### From Another Device
Replace `localhost` with your computer's IP address:
- Find IP: `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux)
- Example: `http://192.168.1.100:3000`

## 📚 Learn More

- [PocketBase Docs](https://docs.pocketbase.io)
- [Next.js Docs](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- See `SETUP.md` for detailed setup instructions
- See `IMPLEMENTATION.md` for technical details

## ✅ Checklist

- [ ] PocketBase downloaded and running
- [ ] Collections imported from JSON
- [ ] Test user created in PocketBase
- [ ] App dependencies installed (`npm install`)
- [ ] Dev server running (`npm run dev`)
- [ ] Can login with test credentials
- [ ] Dashboard loads without errors
- [ ] Can see sidebar navigation
- [ ] Can access different pages (Customers, Orders, etc.)

You're all set! Happy catering! 🍽️
