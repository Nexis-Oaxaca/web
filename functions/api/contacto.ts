import { Resend } from 'resend';

interface ContactBody {
  nombre: string;
  email: string;
  categoria: string;
  mensaje: string;
  'cf-turnstile-response': string;
}

export async function onRequest(context: { request: Request; env: Record<string, string | undefined> }) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: ContactBody = await request.json();
    const token = body['cf-turnstile-response'];

    //Aqui si llega el token
    console.log('Turnstile token:', token);

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });
    const verifyData = await verifyRes.json();
    console.log(verifyData);

    if (!verifyData.success) {
      return new Response(JSON.stringify({ ok: false, error: `Verificación anti-bot fallida`, debug: verifyData }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { nombre, email, categoria, mensaje } = body;

    const errors: string[] = [];
    if (!nombre?.trim()) errors.push('nombre');
    if (!email?.trim()) errors.push('email');
    if (!categoria?.trim()) errors.push('categoria');
    if (!mensaje?.trim()) errors.push('mensaje');

    if (errors.length > 0) {
      return new Response(JSON.stringify({ ok: false, error: `Campos requeridos: ${errors.join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'Email inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta RESEND_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(RESEND_API_KEY);

    const categoriaLabels: Record<string, string> = {
      empresas: 'Empresas',
      instituciones: 'Instituciones',
      profesionales: 'Profesionales',
    };
    const categoriaLabel = categoriaLabels[categoria] || categoria;

    const { error: resendError } = await resend.emails.send({
      from: `Nexis Oaxaca Website <contacto@nexisoaxaca.tech>`,
      to: 'nexisoaxaca@gmail.com',
      replyTo: email,
      subject: `Nuevo contacto - ${categoriaLabel} - ${nombre}`,
      html: `
        <h2>${nombre} (${email})</h2>
        <h3>Nuevo mensaje desde el formulario de contacto</h3>
        <table style="border-collapse:collapse;width:100%;max-width:600px">
          <tr><td style="padding:8px;font-weight:bold">Nombre:</td><td style="padding:8px">${nombre}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px">${email}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Categoría:</td><td style="padding:8px">${categoriaLabel}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Mensaje:</td><td style="padding:8px">${mensaje}</td></tr>
        </table>
      `,
    });

    if (resendError) {
      console.error('Resend error:', JSON.stringify(resendError));
      return new Response(JSON.stringify({ ok: false, error: resendError.message ?? 'Error al enviar el mensaje' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, message: 'Mensaje enviado correctamente' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error en /api/contacto:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
