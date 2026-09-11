import { Resend } from 'resend';

interface IngresoBody {
  nombre: string;
  email: string;
  procedencia: string;
  dedicacion: string;
  proyecto: string;
  'cf-turnstile-response': string;
}

const DEDICACIONES: Record<string, string> = {
  estudiante: 'Estudiante',
  profesor: 'Profesor / Docente',
  cloud: 'Cloud / Infraestructura',
  software: 'Desarrollo de Software',
  ia: 'Inteligencia Artificial',
  diseno: 'Diseño / UX',
  datos: 'Datos / Analytics',
  cybersecurity: 'Ciberseguridad',
  devops: 'DevOps / SRE',
  emprendedor: 'Emprendedor',
  otro: 'Otro',
};

export async function onRequest(context: { request: Request; env: Record<string, string | undefined> }) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: IngresoBody = await request.json();
    const token = body['cf-turnstile-response'];

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return new Response(JSON.stringify({ ok: false, error: 'Verificación anti-bot fallida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { nombre, email, procedencia, dedicacion, proyecto } = body;

    const errors: string[] = [];
    if (!nombre?.trim()) errors.push('nombre');
    if (!email?.trim()) errors.push('email');
    if (!procedencia?.trim()) errors.push('procedencia');
    if (!dedicacion?.trim()) errors.push('dedicacion');

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

    const STRAPI_URL = (env.STRAPI_URL || '').replace(/\/$/, '');
    const STRAPI_TOKEN = env.STRAPI_TOKEN;

    if (STRAPI_URL && STRAPI_TOKEN) {
      const strapiRes = await fetch(`${STRAPI_URL}/api/community-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            name: nombre.trim(),
            email: email.trim().toLowerCase(),
            address: procedencia.trim(),
            occupation: dedicacion.trim(),
            promo: proyecto?.trim() || '',
          },
        }),
      });

      if (!strapiRes.ok) {
        const strapiError = await strapiRes.text();
        console.error('Strapi error:', strapiRes.status, strapiError);
      }
    }

    const RESEND_API_KEY = env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta RESEND_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(RESEND_API_KEY);

    const dedicacionLabel = DEDICACIONES[dedicacion] || dedicacion;

    const { error: resendError } = await resend.emails.send({
      from: `Nexis Oaxaca Tech <contacto@nexisoaxaca.tech>`,
      to: email.trim().toLowerCase(),
      subject: 'Sigue lo próximo de Nexis Oaxaca',
      html: `
        <div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background-color: #FCFAF7;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://nexisoaxaca.tech/nexis.svg" alt="Nexis Oaxaca Tech" style="width: 120px; height: auto;" />
          </div>

          <h1 style="font-family: 'Space Grotesk', sans-serif; color: #234A57; font-size: 28px; margin-bottom: 8px; text-align: center;">
            Hola, ${nombre}
          </h1>

          <p style="color: #234A57; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
            Gracias por querer seguir lo próximo de Nexis Oaxaca.
          </p>

          <div style="background-color: #234A57; border-radius: 24px; padding: 32px; margin-bottom: 32px;">
            <h2 style="font-family: 'Space Grotesk', sans-serif; color: #FCFAF7; font-size: 20px; margin-bottom: 16px; text-align: center;">
              Recibe próximos encuentros y oportunidades
            </h2>
            <p style="color: #F6F2EA; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
              En este canal compartimos próximos encuentros, talleres, oportunidades, recursos y novedades.
            </p>
            <div style="text-align: center;">
              <a href="https://chat.whatsapp.com/JdTX77UhRSbKMkTTEUXZtX"
                 style="display: inline-block; background-color: #2D8380; color: white; text-decoration: none; padding: 16px 40px; border-radius: 18px; font-weight: bold; font-size: 16px;">
                Abrir el canal de WhatsApp
              </a>
            </div>
          </div>

          <div style="margin-bottom: 32px;">
            <h3 style="font-family: 'Space Grotesk', sans-serif; color: #234A57; font-size: 18px; margin-bottom: 16px;">
              ¿Qué es Nexis Oaxaca?
            </h3>
            <p style="color: #234A57; font-size: 14px; line-height: 1.6;">
              Nexis Oaxaca es una iniciativa juvenil que crea espacios y experiencias para aprender, conectar y descubrir oportunidades en tecnología.
            </p>
          </div>

          <div style="margin-bottom: 32px;">
            <h3 style="font-family: 'Space Grotesk', sans-serif; color: #234A57; font-size: 18px; margin-bottom: 16px;">
              Lo que puedes encontrar
            </h3>
            <ul style="color: #234A57; font-size: 14px; line-height: 1.8; padding-left: 20px;">
              <li>Charlas, talleres y encuentros</li>
              <li>Oportunidades y convocatorias compartidas</li>
              <li>Recursos y novedades</li>
              <li>Formas de colaborar y aportar</li>
            </ul>
          </div>

          <div style="margin-bottom: 32px;">
            <h3 style="font-family: 'Space Grotesk', sans-serif; color: #234A57; font-size: 18px; margin-bottom: 16px;">
              Conéctate con nosotros
            </h3>
            <p style="color: #234A57; font-size: 14px; line-height: 1.6;">
              Síguenos en Instagram: <a href="https://instagram.com/nexisoaxaca" style="color: #2D8380;">@nexisoaxaca</a><br />
              Visita nuestro sitio web: <a href="https://nexisoaxaca.tech" style="color: #2D8380;">nexisoaxaca.tech</a>
            </p>
          </div>

          <div style="border-top: 1px solid #E5E7EB; padding-top: 24px; text-align: center;">
            <p style="color: #9CA3AF; font-size: 12px;">
              Este mensaje fue enviado porque solicitaste recibir novedades de Nexis Oaxaca.<br />
              Si no solicitaste este registro, ignora este correo.
            </p>
          </div>
        </div>
      `,
    });

    if (resendError) {
      console.error('Resend error:', JSON.stringify(resendError));
      return new Response(JSON.stringify({ ok: false, error: resendError.message ?? 'Error al enviar el correo' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, message: 'Registro exitoso' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error en /api/ingreso:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
