import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET() {
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!pbUrl) return NextResponse.json({ status: 'error', message: 'NEXT_PUBLIC_POCKETBASE_URL missing' });
    if (!adminEmail) return NextResponse.json({ status: 'error', message: 'POCKETBASE_ADMIN_EMAIL missing' });
    if (!adminPassword) return NextResponse.json({ status: 'error', message: 'POCKETBASE_ADMIN_PASSWORD missing' });

    // Hapus trailing slash dan '/api' dari URL jika ada
    let cleanPbUrl = pbUrl.endsWith('/') ? pbUrl.slice(0, -1) : pbUrl;
    if (cleanPbUrl.endsWith('/api')) {
        cleanPbUrl = cleanPbUrl.slice(0, -4);
    }

    try {
        const pb = new PocketBase(cleanPbUrl);
        pb.autoCancellation(false);
        
        // Cek health dulu untuk memastikan URL benar
        try {
            await pb.health.check();
        } catch (healthError: any) {
             return NextResponse.json({
                status: 'error',
                message: 'Gagal menghubungi server PocketBase (Health Check)',
                details: {
                    used_url: cleanPbUrl,
                    original_url: pbUrl,
                    error: healthError.message
                }
            }, { status: 502 });
        }

        const startTime = Date.now();
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        const duration = Date.now() - startTime;

        return NextResponse.json({
            status: 'success',
            message: 'Berhasil login sebagai Admin!',
            details: {
                url: cleanPbUrl,
                original_url: pbUrl,
                email: adminEmail,
                duration: `${duration}ms`,
                token_preview: pb.authStore.token.substring(0, 10) + '...'
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: 'Gagal login ke PocketBase',
            error_details: error.message || error.toString(),
            suggestion: 'Periksa kembali Email dan Password Admin di Environment Variables Vercel.',
            debug_info: {
                used_url: cleanPbUrl,
                original_url: pbUrl
            }
        }, { status: 500 });
    }
}