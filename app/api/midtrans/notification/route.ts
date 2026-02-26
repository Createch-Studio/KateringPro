import { NextResponse } from 'next/server';
import crypto from 'crypto';
import PocketBase from 'pocketbase';

// Fungsi untuk memverifikasi notifikasi dari Midtrans
async function verifyMidtransSignature(body: any): Promise<boolean> {
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const signatureKey = body.signature_key;
    const orderId = body.order_id;
    const statusCode = body.status_code;
    const grossAmount = body.gross_amount;

    const hash = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

    return hash === signatureKey;
}

export async function POST(request: Request) {
    // Inisialisasi PocketBase manual per request untuk memastikan fresh instance di serverless
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    if (!pbUrl) {
        console.error('NEXT_PUBLIC_POCKETBASE_URL is missing');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    try {
        // Login sebagai admin untuk mendapatkan akses penuh
        const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
        const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.error('POCKETBASE_ADMIN_EMAIL or POCKETBASE_ADMIN_PASSWORD is missing');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        await pb.admins.authWithPassword(adminEmail, adminPassword);
    } catch (authError) {
        console.error('Failed to authenticate as admin:', authError);
        return NextResponse.json({ error: 'Database authentication failed' }, { status: 500 });
    }

    try {
        const body = await request.json();
        console.log('Received Midtrans notification:', JSON.stringify(body, null, 2));

        // 1. Verifikasi signature key untuk keamanan
        const isSignatureValid = await verifyMidtransSignature(body);
        if (!isSignatureValid) {
            console.error('Invalid Midtrans signature key.');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        const orderId = body.order_id;
        const transactionStatus = body.transaction_status;
        const fraudStatus = body.fraud_status;

        // 2. Periksa status transaksi dari Midtrans
        // Kita hanya proses jika transaksi 'settlement' (berhasil) atau 'capture' (untuk kartu kredit)
        // dan fraud statusnya 'accept'.
        if (
            (transactionStatus === 'settlement' || transactionStatus === 'capture') &&
            fraudStatus === 'accept'
        ) {
            console.log(`Processing successful payment for order_id: ${orderId}`);

            // 3. Cari invoice di PocketBase berdasarkan midtrans_order_id (Invoice) atau order_number (Order)
            let invoice;
            try {
                // Percobaan 1: Cari langsung di Invoice via midtrans_order_id
                const invoices = await pb.collection('invoices').getList(1, 1, {
                    filter: `midtrans_order_id = "${orderId}"`,
                });
                if (invoices.items.length > 0) {
                    invoice = invoices.items[0];
                }
            } catch (err) {
                console.warn(`Could not find invoice by midtrans_order_id: ${err}`);
            }

            // Percobaan 2: Jika tidak ketemu, cari via Order (order_number = midtrans order_id)
            if (!invoice) {
                try {
                    console.log(`Searching via Order for order_number: ${orderId}`);
                    const orders = await pb.collection('orders').getList(1, 1, {
                        filter: `order_number = "${orderId}"`,
                    });
                    
                    if (orders.items.length > 0) {
                        const order = orders.items[0];
                        // Cari Invoice yang terhubung ke Order ini
                        const relatedInvoices = await pb.collection('invoices').getList(1, 1, {
                            filter: `order_id = "${order.id}"`,
                        });
                        if (relatedInvoices.items.length > 0) {
                            invoice = relatedInvoices.items[0];
                            console.log(`Found invoice ${invoice.id} via Order ${order.id}`);
                        }
                    }
                } catch (err) {
                    console.error(`Error searching via Order fallback: ${err}`);
                }
            }

            if (!invoice) {
                console.error(`Invoice for order_id: ${orderId} not found (tried midtrans_order_id and order_number fallback).`);
                // Penting: Kembalikan status 200 agar Midtrans tidak mengirim notifikasi berulang
                return NextResponse.json({ message: 'Invoice not found, but notification acknowledged.' });
            }

            // 4. Update status pembayaran di PocketBase menjadi 'paid'
            if (invoice.status !== 'paid') {
                await pb.collection('invoices').update(invoice.id, {
                    status: 'paid',
                    midtrans_transaction_id: body.transaction_id, // Simpan ID transaksi Midtrans
                    payment_details: JSON.stringify(body), // Simpan seluruh payload notifikasi untuk audit
                });
                console.log(`Invoice ${invoice.id} for order ${orderId} successfully updated to 'paid'.`);
            } else {
                console.log(`Invoice ${invoice.id} for order ${orderId} was already 'paid'. Ignoring notification.`);
            }
        } else {
            console.log(`Ignoring notification for order ${orderId} with status: ${transactionStatus}`);
        }

        // 5. Selalu kembalikan status 200 OK ke Midtrans
        return NextResponse.json({ message: 'Notification processed successfully.' });

    } catch (error: any) {
        console.error('Error processing Midtrans notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        try {
            // Logout untuk membersihkan sesi admin
            pb.authStore.clear();
        } catch (e) {
            // Ignore logout errors
        }
    }
}
