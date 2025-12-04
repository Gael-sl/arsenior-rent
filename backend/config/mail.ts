import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Resend API para producción (Railway no permite SMTP)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const USE_RESEND = process.env.NODE_ENV === 'production' && RESEND_API_KEY;

// Configuración del transporter de email (para desarrollo)
interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

const getMailConfig = (): MailConfig => {
  return {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASS || ''
    }
  };
};

let transporter: Transporter | null = null;

// Inicializar transporter (solo para desarrollo)
export const initMailer = async (): Promise<void> => {
  if (USE_RESEND) {
    console.log('[MAIL] Usando Resend API para envío de correos');
    return;
  }

  const config = getMailConfig();
  
  if (!config.auth.user || !config.auth.pass) {
    console.log('[MAIL] No hay credenciales SMTP configuradas');
    return;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass
    }
  });
  
  try {
    await transporter.verify();
    console.log('[MAIL] Transporter SMTP verificado correctamente');
  } catch (error: any) {
    console.log('[MAIL] Error verificando SMTP:', error.message);
  }
};

// Obtener el remitente
const getFromAddress = (): string => {
  // Resend requiere un dominio verificado o usar onboarding@resend.dev para pruebas
  if (USE_RESEND) {
    return 'Arsenior Rent <onboarding@resend.dev>';
  }
  const mailUser = process.env.MAIL_USER || 'no-reply@arseniorrent.com';
  return process.env.MAIL_FROM || `"Arsenior Rent" <${mailUser}>`;
};

// URL base del frontend
const getFrontendUrl = (): string => {
  return process.env.FRONTEND_URL || 'http://localhost:4200';
};

// Enviar email usando Resend API
const sendWithResend = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: [to],
        subject: subject,
        html: html
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[RESEND] Error:', error);
      return false;
    }

    const data = await response.json();
    console.log('[RESEND] Email enviado:', data.id);
    return true;
  } catch (error: any) {
    console.error('[RESEND] Error:', error.message);
    return false;
  }
};

// Enviar email usando Nodemailer (desarrollo)
const sendWithNodemailer = async (to: string, subject: string, html: string): Promise<boolean> => {
  if (!transporter) {
    console.error('[MAIL] Transporter no inicializado');
    return false;
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: to,
      subject: subject,
      html: html
    });
    return true;
  } catch (error: any) {
    console.error('[MAIL] Error enviando:', error.message);
    return false;
  }
};

// Función genérica para enviar emails
const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  if (USE_RESEND) {
    return sendWithResend(to, subject, html);
  }
  return sendWithNodemailer(to, subject, html);
};

// Enviar email de verificación de cuenta
export const sendVerificationEmail = async (
  email: string, 
  firstName: string, 
  token: string
): Promise<boolean> => {
  const verificationUrl = `${getFrontendUrl()}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifica tu cuenta</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #1c1917; color: white; padding: 40px 20px; text-align: center; }
        .header h1 { font-family: Georgia, serif; margin: 0; font-size: 28px; font-weight: normal; }
        .content { padding: 40px 30px; }
        .content h2 { color: #1c1917; font-family: Georgia, serif; margin-top: 0; }
        .content p { color: #57534e; line-height: 1.6; }
        .button { display: inline-block; background: #1c1917; color: white !important; padding: 14px 32px; text-decoration: none; margin: 20px 0; font-size: 14px; letter-spacing: 1px; }
        .footer { background: #fafaf9; padding: 20px 30px; text-align: center; color: #a8a29e; font-size: 12px; }
        .code { background: #f5f5f4; padding: 15px 20px; font-family: monospace; font-size: 14px; margin: 20px 0; text-align: center; border-radius: 4px; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ARSENIOR RENT</h1>
        </div>
        <div class="content">
          <h2>¡Bienvenido, ${firstName}!</h2>
          <p>Gracias por registrarte en Arsenior Rent. Para completar tu registro y acceder a nuestra flota de vehículos de lujo, por favor verifica tu email haciendo clic en el siguiente botón:</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">VERIFICAR MI CUENTA</a>
          </p>
          <p>O copia y pega este enlace en tu navegador:</p>
          <div class="code">${verificationUrl}</div>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no creaste esta cuenta, puedes ignorar este email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Arsenior Rent. Todos los derechos reservados.</p>
          <p>Sinaloa, México</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, 'Verifica tu cuenta - Arsenior Rent', html);
};

// Enviar email de recuperación de contraseña
export const sendPasswordResetEmail = async (
  email: string, 
  firstName: string, 
  token: string
): Promise<boolean> => {
  const resetUrl = `${getFrontendUrl()}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperar contraseña</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #1c1917; color: white; padding: 40px 20px; text-align: center; }
        .header h1 { font-family: Georgia, serif; margin: 0; font-size: 28px; font-weight: normal; }
        .content { padding: 40px 30px; }
        .content h2 { color: #1c1917; font-family: Georgia, serif; margin-top: 0; }
        .content p { color: #57534e; line-height: 1.6; }
        .button { display: inline-block; background: #1c1917; color: white !important; padding: 14px 32px; text-decoration: none; margin: 20px 0; font-size: 14px; letter-spacing: 1px; }
        .footer { background: #fafaf9; padding: 20px 30px; text-align: center; color: #a8a29e; font-size: 12px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; color: #92400e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ARSENIOR RENT</h1>
        </div>
        <div class="content">
          <h2>Recuperar contraseña</h2>
          <p>Hola ${firstName},</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el siguiente botón para crear una nueva contraseña:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">RESTABLECER CONTRASEÑA</a>
          </p>
          <div class="warning">
            <strong>Importante:</strong> Este enlace expirará en 1 hora por seguridad.
          </div>
          <p>Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña actual permanecerá sin cambios.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Arsenior Rent. Todos los derechos reservados.</p>
          <p>Sinaloa, México</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, 'Recuperar contraseña - Arsenior Rent', html);
};

// Enviar email de recordatorio
export const sendReminderEmail = async (
  email: string,
  firstName: string,
  type: 'pickup' | 'return',
  carBrand: string,
  carModel: string,
  date: string,
  reservationId: number
): Promise<boolean> => {
  const isPickup = type === 'pickup';
  const subject = isPickup 
    ? `Recordatorio: Tu reserva comienza mañana - Arsenior Rent`
    : `Recordatorio: Devolución de vehículo mañana - Arsenior Rent`;

  const actionText = isPickup ? 'recoger' : 'devolver';
  const actionTitle = isPickup ? 'Recogida de Vehículo' : 'Devolución de Vehículo';

  const tips = isPickup
    ? `
      <li>Lleva tu identificación oficial vigente (INE/Pasaporte)</li>
      <li>Lleva tu licencia de conducir vigente</li>
      <li>Revisa el vehículo antes de recibirlo</li>
      <li>Confirma el nivel de combustible</li>
    `
    : `
      <li>Devuelve el vehículo con el tanque lleno</li>
      <li>Retira todas tus pertenencias personales</li>
      <li>Revisa que no haya daños nuevos</li>
      <li>Entrega las llaves al personal autorizado</li>
    `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${actionTitle}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #1c1917; color: white; padding: 40px 20px; text-align: center; }
        .header h1 { font-family: Georgia, serif; margin: 0; font-size: 28px; font-weight: normal; }
        .content { padding: 40px 30px; }
        .content h2 { color: #1c1917; font-family: Georgia, serif; margin-top: 0; }
        .content p { color: #57534e; line-height: 1.6; }
        .highlight-box { background: #f5f5f4; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .highlight-box h3 { margin: 0 0 10px 0; color: #1c1917; font-size: 16px; }
        .highlight-box .car { font-size: 20px; font-weight: bold; color: #1c1917; }
        .highlight-box .date { font-size: 16px; color: #57534e; margin-top: 5px; }
        .tips { background: ${isPickup ? '#ecfdf5' : '#fef3c7'}; border-left: 4px solid ${isPickup ? '#10b981' : '#f59e0b'}; padding: 15px 20px; margin: 20px 0; }
        .tips h4 { margin: 0 0 10px 0; color: ${isPickup ? '#065f46' : '#92400e'}; }
        .tips ul { margin: 0; padding-left: 20px; color: ${isPickup ? '#065f46' : '#92400e'}; }
        .tips li { margin: 5px 0; }
        .button { display: inline-block; background: #1c1917; color: white !important; padding: 14px 32px; text-decoration: none; margin: 20px 0; font-size: 14px; letter-spacing: 1px; border-radius: 4px; }
        .footer { background: #fafaf9; padding: 20px 30px; text-align: center; color: #a8a29e; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ARSENIOR RENT</h1>
        </div>
        <div class="content">
          <h2>${actionTitle} Mañana</h2>
          <p>Hola ${firstName},</p>
          <p>Este es un recordatorio de que mañana debes ${actionText} tu vehículo rentado.</p>
          
          <div class="highlight-box">
            <h3>Detalles de la reserva:</h3>
            <div class="car">${carBrand} ${carModel}</div>
            <div class="date">Fecha: ${date}</div>
            <div style="margin-top: 10px; font-size: 14px; color: #78716c;">
              Reserva: #${reservationId}
            </div>
          </div>

          <div class="tips">
            <h4>${isPickup ? 'Recuerda llevar:' : 'Antes de entregar:'}</h4>
            <ul>
              ${tips}
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${getFrontendUrl()}/my-reservations" class="button">VER MI RESERVA</a>
          </p>

          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Arsenior Rent. Todos los derechos reservados.</p>
          <p>Sinaloa, México</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
};

export default transporter;
