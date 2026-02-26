import { NextResponse } from 'next/server';
import Midtrans from 'midtrans-client';

// Pastikan Anda telah mengatur environment variable ini di file .env.local Anda
// Contoh:
// MIDTRANS_SERVER_KEY="SB-Mid-server-xxxxxxxxxxxxxxxxxxxx"
// MIDTRANS_IS_PRODUCTION="false"

const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

// Inisialisasi Core API dari Midtrans
let core = new Midtrans.CoreApi({
  isProduction,
  serverKey,
});

export async function POST(request: Request) {
  const { order_id, total, customer_name, customer_email } = await request.json();

  if (!order_id || !total || !customer_name) {
    return NextResponse.json(
      { error: 'Missing required fields: order_id, total, and customer_name are required.' },
      { status: 400 }
    );
  }

  // Sesuaikan parameter untuk Core API dengan payment_type: 'qris'
  const parameter = {
    payment_type: 'qris',
    transaction_details: {
      order_id: order_id,
      gross_amount: total,
    },
    customer_details: {
      first_name: customer_name,
      email: customer_email || 'noreply@example.com',
    },
  };

  try {
    const chargeResponse = await core.charge(parameter);
    console.log('Midtrans Core API charge response:', chargeResponse);
    return NextResponse.json(chargeResponse);
  } catch (e: any) {
    console.error('Error creating Midtrans transaction:', e);
    const errorMessage = e.ApiResponse ? e.ApiResponse.error_messages.join(', ') : e.message;
    return NextResponse.json(
      {
        error: 'Failed to create Midtrans transaction.',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}