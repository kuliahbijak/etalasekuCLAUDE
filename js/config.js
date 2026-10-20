/**
 * KONFIGURASI FRONTEND — satu-satunya nilai yang perlu diisi.
 *
 * GAS_URL = URL Web App Apps Script (berakhiran /exec), didapat dari
 * Deploy → New deployment → Web app. URL ini memang publik; keamanan dijaga
 * token sesi + pengecekan peran di server. JANGAN menaruh token, kunci API,
 * sandi, atau Client ID di file ini — semuanya tinggal di Script Properties.
 */
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyTk1Ek9lzWb2mbAGZGusdJ7rDiEPMQ-6SMi_T9iyB2rrKTq_8TYj4nct441sYKFB8Q/exec',
  VERSI: '1.0.0'
};
