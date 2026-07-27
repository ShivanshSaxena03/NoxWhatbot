import QRCode from "qrcode";

export async function generateQrDataUrl(qr: string): Promise<string> {
  try {
    return await QRCode.toDataURL(qr, {
      margin: 2,
      scale: 8,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    });
  } catch (err) {
    console.error("[QR Code Generation Error]:", err);
    return "";
  }
}
