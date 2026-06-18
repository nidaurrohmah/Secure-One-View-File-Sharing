export const handler = async (event) => {
  console.log("Event received:", event);

  // 1. Handle CORS preflight request (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
      },
      body: JSON.stringify({ message: "CORS preflight successful" }),
    };
  }

  try {
    // 2. Parse request body
    const body = JSON.parse(event.body);
    const { token, recipientId, currentUserId, expiresAt, status } = body;

    let result = { ok: true, reason: '', message: '' };

    // 3. Logic Validasi (Persis seperti yang diinginkan dosen: cek waktu, user, dan status one-view)
    
    // Cek: Apakah sudah expired?
    if (new Date(expiresAt) < new Date()) {
      result = { ok: false, reason: 'EXPIRED', message: 'Link sudah expired.' };
    }
    // Cek: Apakah sudah pernah dibuka? (One-View)
    else if (status === 'viewed') {
      result = { ok: false, reason: 'ALREADY_VIEWED', message: 'File ini sudah pernah dibuka. Akses telah dicabut.' };
    }
    // Cek: Apakah user yang login sesuai dengan target penerima?
    else if (recipientId !== currentUserId) {
      result = { ok: false, reason: 'UNAUTHORIZED', message: 'Anda tidak memiliki akses ke file ini.' };
    }

    // 4. Return response ke Frontend
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // WAJIB untuk menghindari error CORS di frontend
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ ok: false, reason: 'BAD_REQUEST', message: 'Data yang dikirim ke API tidak valid.' }),
    };
  }
};
