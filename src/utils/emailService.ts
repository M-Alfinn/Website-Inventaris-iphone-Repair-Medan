/**
 * Real Email Dispatch Service for OTP Verification via Resend
 */

export interface SendEmailOtpResult {
  success: boolean;
  message: string;
}

export async function dispatchRealEmailOtp(
  email: string,
  otpCode: string,
  userName: string,
  type: 'verification' | 'reset' | 'unlink' = 'verification'
): Promise<SendEmailOtpResult> {
  const cleanEmail = email.trim().toLowerCase();
  
  try {
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        otp: otpCode,
        name: userName,
        type,
      }),
    });

    let data: any = null;
    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (response.ok && data?.success) {
      return {
        success: true,
        message: data.message || `Kode OTP resmi telah dikirim ke alamat email ${cleanEmail}. Periksa kotak masuk atau spam Gmail Anda.`,
      };
    } else {
      const errorMsg = data?.message || (response.status === 404 ? 'Serverless endpoint pengiriman email belum aktif di server hosting.' : `Gagal mengirim email OTP (${response.status}: ${response.statusText || 'Kesalahan server'}).`);
      return {
        success: false,
        message: errorMsg,
      };
    }
  } catch (error: any) {
    console.warn('[EmailService] Error calling /api/send-otp:', error);
    return {
      success: false,
      message: error?.message?.includes('Failed to fetch')
        ? 'Koneksi ke server pengiriman email terputus. Pastikan koneksi internet stabil.'
        : 'Koneksi ke server pengiriman email terganggu.',
    };
  }
}
