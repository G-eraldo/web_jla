const escapeHtml = (value) =>
  String(value || "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

export function withdrawalEmailHtml({ title, intro, declaration, closing }) {
  const details = [
    ["Nom", `${declaration.firstName} ${declaration.lastName}`],
    ["E-mail", declaration.email],
    ["Commande", declaration.orderReference],
    ["Produit ou produits", declaration.products],
    ["Date de commande", declaration.orderedAt],
    ["Date de réception", declaration.receivedAt || "non renseignée"],
    ["Déclaration envoyée le", declaration.sentAt],
    ["Référence de demande", declaration.reference],
  ]
    .map(
      ([label, value]) =>
        `<tr><th align="left" valign="top" style="padding:8px 10px 8px 0;font-weight:normal;color:#776b64">${escapeHtml(label)}</th><td style="padding:8px 0;color:#302722">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<div style="margin:0;padding:40px 20px;background:#f5eee6;font-family:Arial,sans-serif;color:#302722"><div style="max-width:600px;margin:0 auto;background:#ffffff"><div style="padding:32px;text-align:center;border-bottom:1px solid #e9ddd3"><div style="font-family:Georgia,serif;font-size:30px;color:#302722">Maison JLA</div></div><div style="padding:32px"><h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:26px;font-weight:normal">${escapeHtml(title)}</h1><p style="line-height:1.6">${escapeHtml(intro)}</p><div style="margin:26px 0;padding:20px;background:#fdf7f2"><p style="margin:0 0 12px;font-weight:bold">Votre déclaration</p><table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5">${details}</table></div><p style="line-height:1.6">${escapeHtml(closing)}</p><p style="margin-top:28px">À très vite,<br>Maison JLA</p></div><div style="padding:18px 32px;border-top:1px solid #e9ddd3;text-align:center;font-size:12px;color:#776b64">Maison JLA — Julia Touret EI<br>5 Rue Joliot-Curie — 80200 Doingt<br>contact@maisonjla.fr — 06 77 88 69 09</div></div></div>`;
}
