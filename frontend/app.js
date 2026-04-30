let allFaaliyetler = [];
let filteredList = [];

const listEl = document.getElementById("list");
const kategoriEl = document.getElementById("filtre-kategori");
const bransEl = document.getElementById("filtre-brans");
const searchEl = document.getElementById("search-input");
const notifBar = document.getElementById("notif-bar");
const statToplam = document.getElementById("stat-toplam");
const statYarisma = document.getElementById("stat-yarisma");
const statKurs = document.getElementById("stat-kurs");
const statKamp = document.getElementById("stat-kamp");
const sendInput = document.getElementById("send-input");
const btnSend = document.getElementById("btn-send");
const charCount = document.getElementById("char-count");
const sendStatus = document.getElementById("send-status");

const WORKER_API = "https://tcf-scraper.mehmetkaya2002.workers.dev";
const statusEl = document.getElementById("update-status");
let lastUpdateISO = null;

async function loadFaaliyetler() {
  if (allFaaliyetler.length === 0) {
    listEl.innerHTML = '<div class="loading">Yükleniyor...</div>';
  }
  try {
    let data;
    const workerResp = await fetch(WORKER_API + "/api/data").catch(() => null);
    if (workerResp && workerResp.ok) {
      data = await workerResp.json();
    } else {
      const localResp = await fetch("/faaliyetler.json");
      data = await localResp.json();
    }
    if (data.faaliyetler) {
      allFaaliyetler = data.faaliyetler;
      updateStats();
      applyFilters();
    }
    if (data.son_guncelleme) lastUpdateISO = data.son_guncelleme;
  } catch (e) {
    if (allFaaliyetler.length === 0) {
      listEl.innerHTML = '<div class="empty">Veriler yüklenemedi.</div>';
    }
  }
  refreshStatus();
}

async function refreshStatus() {
  try {
    const resp = await fetch(WORKER_API + "/api/status").catch(() => null);
    if (resp && resp.ok) {
      const data = await resp.json();
      if (data.son_kontrol) lastUpdateISO = data.son_kontrol;
    }
  } catch {}
  showUpdateTime();
}

function showUpdateTime() {
  if (!statusEl) return;
  if (!lastUpdateISO) {
    statusEl.textContent = "Son kontrol: henüz yapılmadı";
    return;
  }
  const d = new Date(lastUpdateISO);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  let text;
  if (diff < 1) text = "az önce";
  else if (diff < 60) text = `${diff} dk önce`;
  else if (diff < 1440) text = `${Math.floor(diff / 60)} saat önce`;
  else text = `${Math.floor(diff / 1440)} gün önce`;
  const saat = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  statusEl.textContent = `Son kontrol: ${text} (${saat})`;
}

// Her 30 saniyede süreyi güncelle, her 60 saniyede veriyi yeniden çek
setInterval(showUpdateTime, 30000);
setInterval(loadFaaliyetler, 60000);

function updateStats() {
  statToplam.textContent = allFaaliyetler.length;
  statYarisma.textContent = allFaaliyetler.filter((f) => f.kategori === "Yarışma").length;
  statKurs.textContent = allFaaliyetler.filter((f) => f.kategori === "Kurs").length;
  statKamp.textContent = allFaaliyetler.filter((f) => f.kategori === "Kamp").length;
}

function applyFilters() {
  const kat = kategoriEl.value;
  const brans = bransEl.value;
  const q = searchEl.value.toLowerCase().trim();

  filteredList = allFaaliyetler.filter((f) => {
    if (kat && f.kategori !== kat) return false;
    if (brans && f.brans !== brans) return false;
    if (q) {
      const haystack = `${f.baslik} ${f.brans} ${f.yer} ${f.kategori}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  renderList();
}

function renderList() {
  if (filteredList.length === 0) {
    listEl.innerHTML = '<div class="empty">Sonuç bulunamadı.</div>';
    return;
  }

  listEl.innerHTML = filteredList
    .map(
      (f) => `
    <a href="${f.detay_url}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">
      <div class="faaliyet-card" data-kategori="${f.kategori}">
        <div class="baslik">${f.baslik}</div>
        <div class="meta">
          <span class="tag tag-kategori">${f.kategori}</span>
          <span class="tag tag-brans">${f.brans}</span>
          <span class="tag tag-yer">${f.yer}</span>
          <span class="tag tag-tarih">${f.tarih}</span>
        </div>
      </div>
    </a>`
    )
    .join("");
}

kategoriEl.addEventListener("change", applyFilters);
bransEl.addEventListener("change", applyFilters);
searchEl.addEventListener("input", applyFilters);

document.getElementById("btn-reset").addEventListener("click", () => {
  kategoriEl.value = "";
  bransEl.value = "";
  searchEl.value = "";
  applyFilters();
});

// --- Bildirim gönderme ---

sendInput.addEventListener("input", () => {
  charCount.textContent = `${sendInput.value.length}/100`;
});

btnSend.addEventListener("click", async () => {
  const msg = sendInput.value.trim();
  if (!msg) return;

  btnSend.disabled = true;
  sendStatus.textContent = "Gönderiliyor...";
  sendStatus.className = "";

  try {
    const resp = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    const data = await resp.json();
    if (resp.ok) {
      sendStatus.textContent = `${data.sent} kişiye gönderildi`;
      sendStatus.className = "success";
      sendInput.value = "";
      charCount.textContent = "0/100";
    } else {
      sendStatus.textContent = data.error || "Gönderilemedi";
      sendStatus.className = "error";
    }
  } catch {
    sendStatus.textContent = "Bağlantı hatası";
    sendStatus.className = "error";
  }
  btnSend.disabled = false;
});

// --- Push Notification ---

async function setupPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    notifBar.textContent = "Bu tarayıcı bildirimleri desteklemiyor.";
    notifBar.classList.add("show");
    return;
  }

  const reg = await navigator.serviceWorker.register("/sw.js");

  // SW güncelleme kontrolü — her 30 saniyede bir
  reg.addEventListener("updatefound", () => {
    const newWorker = reg.installing;
    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "activated") {
        window.location.reload();
      }
    });
  });
  setInterval(() => reg.update(), 30000);

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    notifBar.textContent = "Bildirimler aktif";
    notifBar.classList.add("show", "subscribed");
    return;
  }

  notifBar.textContent = "Bildirimleri aç — yeni faaliyetlerden haberdar ol";
  notifBar.classList.add("show");

  notifBar.addEventListener("click", async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        notifBar.textContent = "Bildirim izni reddedildi.";
        return;
      }

      const keyResp = await fetch("/api/vapid-key");
      const { publicKey } = await keyResp.json();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      notifBar.textContent = "Bildirimler aktif";
      notifBar.classList.add("subscribed");
    } catch (e) {
      notifBar.textContent = "Bildirim ayarlanamadı: " + e.message;
    }
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// --- Init ---
loadFaaliyetler();
setupPush();
