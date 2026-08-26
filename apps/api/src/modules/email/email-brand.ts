// Shell HTML de marca para todos los correos salientes -- los templates en
// /admin/email-templates solo escriben el contenido interno (como siempre),
// este wrapper les agrega header/footer con logo y colores una sola vez acá
// en vez de duplicar HTML de diseño en cada fila de EmailTemplate. Tablas +
// estilos inline a propósito: es lo único que renderiza consistente en
// clientes de correo (Gmail, Outlook, Apple Mail no soportan flexbox/grid ni
// <style> de forma confiable).
const LOGO_URL = 'https://codebuddies.tech/icon.png';
const BRAND_YELLOW = '#facc15';
const BRAND_BLACK = '#0a0a0a';

export function wrapBrandedEmailHtml(subject: string, innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_BLACK};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background-color:${BRAND_BLACK};padding:20px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <img src="${LOGO_URL}" width="32" height="32" alt="" style="display:block;border-radius:6px;">
                </td>
                <td style="vertical-align:middle;">
                  <span style="color:${BRAND_YELLOW};font-size:20px;font-weight:900;">CodeBuddies</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px;color:#111111;font-size:15px;line-height:1.6;">
            ${innerHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color:${BRAND_BLACK};padding:16px 28px;text-align:center;">
            <span style="color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} CodeBuddies · codebuddies.tech</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
