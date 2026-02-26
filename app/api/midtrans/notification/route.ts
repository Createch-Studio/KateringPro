import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPocketBase } from '@/lib/pocketbase';

const pb = getPocketBase();

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

            // 3. Cari invoice di PocketBase berdasarkan order_id
            const invoices = await pb.collection('invoices').getFullList({
                filter: `midtrans_order_id = "${orderId}"`,
            });

            if (invoices.length === 0) {
                console.error(`Invoice with midtrans_order_id: ${orderId} not found.`);
                // Penting: Kembalikan status 200 agar Midtrans tidak mengirim notifikasi berulang
                return NextResponse.json({ message: 'Invoice not found, but notification acknowledged.' });
            }

            const invoice = invoices[0];

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
    }
}
