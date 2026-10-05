/**
 * NusaKota – code.gs
 * Tempel seluruh kode ini di: Spreadsheet > Ekstensi > Apps Script.
 * Sheet "Votes" akan dibuat otomatis saat data pertama masuk.
 */

const SHEET_NAME = "Votes";

/* Harus sama persis dengan daftar CITIES di app.js */
const ALLOWED_CITIES = [
  "Bali", "Yogyakarta", "Bandung", "Jakarta", "Surabaya", "Malang",
  "Labuan Bajo", "Lombok", "Medan", "Makassar", "Semarang", "Manado"
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["Waktu", "Nama", "Kota", "Alasan"]);
    sh.setFrozenRows(1);
    sh.getRange("A1:D1").setFontWeight("bold").setBackground("#0077b6").setFontColor("#ffffff");
    sh.setColumnWidth(1, 160);
    sh.setColumnWidth(4, 360);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Cegah isi sel dibaca sebagai rumus */
function safe_(v) {
  v = String(v == null ? "" : v).trim();
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

/* GET: kirim ringkasan peringkat + suara terbaru */
function doGet(e) {
  try {
    const sh = getSheet_();
    const last = sh.getLastRow();
    const counts = {};
    let recent = [];
    let total = 0;

    if (last > 1) {
      const rows = sh.getRange(2, 1, last - 1, 4).getValues();
      rows.forEach(function (r) {
        const kota = String(r[2]);
        if (!kota) return;
        counts[kota] = (counts[kota] || 0) + 1;
        total++;
      });
      recent = rows.slice(-8).reverse().map(function (r) {
        return {
          waktu: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
          nama: String(r[1]),
          kota: String(r[2]),
          alasan: String(r[3])
        };
      });
    }
    return json_({ ok: true, total: total, counts: counts, recent: recent });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* POST: simpan satu suara baru */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    const nama = safe_(body.nama).slice(0, 40);
    const kota = String(body.kota || "").trim();
    const alasan = safe_(body.alasan).slice(0, 200);

    if (!nama) return json_({ ok: false, error: "Nama wajib diisi" });
    if (ALLOWED_CITIES.indexOf(kota) === -1) return json_({ ok: false, error: "Kota tidak dikenal" });

    getSheet_().appendRow([new Date(), nama, kota, alasan]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
