// Tempel di spreadsheet: Ekstensi > Apps Script, lalu Deploy > New deployment > Web app
const NAMA_SHEET = "Lobby";
const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(NAMA_SHEET);
  if (!s) {
    s = ss.insertSheet(NAMA_SHEET);
    s.appendRow(["Waktu", "Lobby", "Kode", "Host", "Guest", "Status"]);
    s.setFrozenRows(1);
  }
  return s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Mencegah isian yang diawali = + - @ dibaca sebagai rumus
function bersih_(t) {
  return String(t || "").replace(/^[=+\-@\s]+/, "").slice(0, 24);
}

function kodeBaru_(rows) {
  const ada = rows.map(r => String(r[2]));
  let k;
  do {
    k = "PB-";
    for (let i = 0; i < 5; i++) k += HURUF[Math.floor(Math.random() * HURUF.length)];
  } while (ada.indexOf(k) > -1);
  return k;
}

function doGet(e) {
  const p = e.parameter || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = getSheet_();
    const rows = s.getDataRange().getValues();
    const nama = bersih_(p.name);
    const kode = String(p.code || "").trim().toUpperCase();

    if (p.action === "create") {
      const k = kodeBaru_(rows);
      s.appendRow([new Date(), bersih_(p.lobby), k, nama, "", "menunggu"]);
      return json_({ ok: true, code: k });
    }

    const i = rows.findIndex((r, n) => n > 0 && String(r[2]) === kode);
    if (i < 1) return json_({ ok: false, msg: "Kode tidak ditemukan" });
    const r = rows[i], baris = i + 1;

    if (p.action === "join") {
      if (r[4] && r[4] !== nama) return json_({ ok: false, msg: "Lobby sudah penuh" });
      const status = r[5] === "foto" ? "foto" : "siap";
      s.getRange(baris, 5, 1, 2).setValues([[nama, status]]);
      return json_({ ok: true, lobby: r[1], host: r[3] });
    }

    if (p.action === "start" && r[4]) {
      s.getRange(baris, 6).setValue("foto");
      r[5] = "foto";
    }
    return json_({ ok: true, lobby: r[1], host: r[3], guest: r[4], status: r[5] });
  } finally {
    lock.releaseLock();
  }
}
