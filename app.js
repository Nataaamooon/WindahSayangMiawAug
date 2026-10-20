// Tempel URL Web App dari Apps Script (Deploy > Manage deployments) di sini:
const API_URL = "https://script.google.com/macros/s/AKfycbxWoUBjmwmB5_CfVWbpuLbzZAQ9d6YivaYdb3sln9GltUK2K7MfnzeSwznQ3EH8BCM/exec";

document.documentElement.classList.add("js");
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = { code: "", host: false, me: "", lobby: "", names: "", timer: null, busy: false };

async function api(p) {
  if (API_URL.startsWith("PASTE")) throw Error("Isi API_URL di app.js dulu");
  const r = await fetch(API_URL + "?" + new URLSearchParams(p));
  return r.json();
}

let tt;
function toast(m) {
  const t = $("toast");
  t.textContent = m;
  t.classList.add("on");
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove("on"), 3200);
}

const view = v => ["home", "lobby", "booth"].forEach(x => ($(x).hidden = x !== v));

// Buat lobby
$("fCreate").onsubmit = async e => {
  e.preventDefault();
  const name = $("cName").value.trim();
  try {
    const d = await api({ action: "create", name, lobby: $("cLobby").value.trim() });
    if (!d.ok) throw Error(d.msg);
    enter(d.code, true, name);
  } catch (err) { toast(err.message); }
};

// Gabung lobby
$("fJoin").onsubmit = async e => {
  e.preventDefault();
  const name = $("jName").value.trim();
  const code = $("jCode").value.trim().toUpperCase();
  try {
    const d = await api({ action: "join", code, name });
    if (!d.ok) throw Error(d.msg);
    enter(code, false, name);
  } catch (err) { toast(err.message); }
};

function enter(code, host, me) {
  Object.assign(S, { code, host, me });
  $("lCode").textContent = code;
  view("lobby");
  poll();
  S.timer = setInterval(poll, 2500);
}

async function poll() {
  if (S.busy) return;
  try {
    const d = await api({ action: "status", code: S.code });
    if (!d.ok || S.busy) return;
    S.lobby = d.lobby;
    S.names = d.guest ? d.host + " & " + d.guest : d.host;
    $("lName").textContent = d.lobby;
    $("s1").textContent = "👑 " + d.host;
    $("s1").classList.add("on");
    $("s2").textContent = d.guest ? "💖 " + d.guest : "Menunggu teman...";
    $("s2").classList.toggle("on", !!d.guest);
    $("startBtn").disabled = !(S.host && d.guest);
    $("startBtn").textContent = S.host ? "Mulai foto" : "Menunggu host mulai...";
    if (d.status === "foto") shoot();
  } catch (e) { /* abaikan, coba lagi di polling berikutnya */ }
}

$("lCode").onclick = () =>
  navigator.clipboard && navigator.clipboard.writeText(S.code).then(() => toast("Kode disalin"));

$("startBtn").onclick = async () => {
  try {
    await api({ action: "start", code: S.code });
    shoot();
  } catch (err) { toast(err.message); }
};

// Sesi foto: 4 jepretan dengan hitung mundur
async function shoot() {
  if (S.busy) return;
  S.busy = true;
  clearInterval(S.timer);
  view("booth");
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    $("vid").srcObject = stream;
  } catch (e) { toast("Kamera tidak aktif. Foto memakai frame kosong."); }
  await sleep(900);
  const shots = [];
  for (let i = 1; i <= 4; i++) {
    $("bInfo").textContent = "Foto " + i + " dari 4";
    for (let n = 3; n > 0; n--) { $("cnt").innerHTML = "<i>" + n + "</i>"; await sleep(1000); }
    $("cnt").innerHTML = "";
    const f = $("flash");
    f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    shots.push(snap());
    await sleep(600);
  }
  if (stream) stream.getTracks().forEach(t => t.stop());
  makeStrip(shots);
}

function snap() {
  const c = document.createElement("canvas"), v = $("vid");
  c.width = 320; c.height = 240;
  const x = c.getContext("2d");
  if (v.videoWidth) {
    const r = Math.min(v.videoWidth / 320, v.videoHeight / 240), w = 320 * r, h = 240 * r;
    x.translate(320, 0); x.scale(-1, 1);
    x.drawImage(v, (v.videoWidth - w) / 2, (v.videoHeight - h) / 2, w, h, 0, 0, 320, 240);
  } else {
    x.fillStyle = "#ffc2e0"; x.fillRect(0, 0, 320, 240);
    x.font = "80px serif"; x.textAlign = "center"; x.fillText("📷", 160, 150);
  }
  return c;
}

function makeStrip(shots) {
  const c = $("strip"), x = c.getContext("2d");
  c.width = 360; c.height = 1130;
  x.fillStyle = "#ff8fc7"; x.fillRect(0, 0, 360, 1130);
  shots.forEach((s, i) => {
    const y = 20 + i * 264;
    x.fillStyle = "#fff"; x.fillRect(14, y - 6, 332, 252);
    x.drawImage(s, 20, y, 320, 240);
  });
  x.fillStyle = "#2a1626"; x.textAlign = "center";
  x.font = "800 24px system-ui, sans-serif";
  x.fillText("PHOTO BOOTH - " + S.lobby, 180, 1086);
  x.font = "600 16px system-ui, sans-serif";
  x.fillText(S.names + " - " + new Date().toLocaleDateString("id-ID"), 180, 1114);
  $("dl").href = c.toDataURL("image/png");
  $("cam").hidden = true;
  $("bInfo").textContent = "Strip fotomu sudah jadi";
  $("result").hidden = false;
}

$("again").onclick = () => location.reload();

// Animasi muncul saat di-scroll (ringan, hanya opacity dan transform)
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); }
}), { threshold: 0.15 });
document.querySelectorAll(".rv").forEach(el => io.observe(el));
