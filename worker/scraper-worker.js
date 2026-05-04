const TCF_URL = "https://www.tcf.gov.tr/faaliyetler/";

async function scrapeFaaliyetler() {
  const resp = await fetch(TCF_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "tr-TR,tr;q=0.9",
    },
  });
  const html = await resp.text();
  return parseHTML(html);
}

function parseHTML(html) {
  const faaliyetler = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return faaliyetler;

  const rows = tbodyMatch[1].split(/<tr>/g).filter((r) => r.includes("<td>"));

  for (const row of rows) {
    const tds = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let m;
    while ((m = tdRegex.exec(row)) !== null) {
      tds.push(m[1]);
    }
    if (tds.length < 7) continue;

    const yil = strip(tds[0]);
    const kategori = strip(tds[1]);
    const baslik = strip(tds[2]);

    const bransSpan = tds[3].match(/<span>(.*?)<\/span>/);
    const brans = bransSpan ? strip(bransSpan[1]) : strip(tds[3]);

    const yer = strip(tds[4]);

    const tarihHidden = tds[5].match(/<span[^>]*display.*?none[^>]*>(.*?)<\/span>/);
    let tarih = strip(tds[5]);
    if (tarihHidden) {
      tarih = tarih.replace(tarihHidden[1], "").trim();
    }

    const linkMatch = tds[6].match(/href="([^"]+)"/);
    const detay_url = linkMatch ? linkMatch[1] : "";
    const slug = detay_url ? detay_url.replace(/\/$/, "").split("/").pop() : "";

    faaliyetler.push({ slug, yil, kategori, baslik, brans, yer, tarih, detay_url });
  }

  return faaliyetler;
}

function strip(html) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export default {
  async scheduled(event, env) {
    try {
      const yeniFaaliyetler = await scrapeFaaliyetler();
      if (yeniFaaliyetler.length === 0) return;

      const eskiRaw = await env.TCF_DATA.get("faaliyetler");
      const eskiFaaliyetler = eskiRaw ? JSON.parse(eskiRaw).faaliyetler : [];
      const eskiSlugs = new Set(eskiFaaliyetler.map((f) => f.slug));

      const eklenenler = yeniFaaliyetler.filter((f) => !eskiSlugs.has(f.slug));

      const now = new Date().toISOString();
      const data = JSON.stringify({
        son_guncelleme: now,
        toplam: yeniFaaliyetler.length,
        faaliyetler: yeniFaaliyetler,
      });

      await env.TCF_DATA.put("faaliyetler", data);
      await env.TCF_DATA.put("son_kontrol", now);

      if (eklenenler.length > 0) {
        await env.TCF_DATA.put("son_degisiklik", JSON.stringify({
          tarih: now,
          eklenen: eklenenler.length,
          faaliyetler: eklenenler,
        }));
        await sendPushAll(env, eklenenler);
      }
    } catch (e) {
      console.error("Scrape hatası:", e);
    }
  },

  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/data") {
      const data = await env.TCF_DATA.get("faaliyetler");
      if (!data) return Response.json({ error: "Veri yok" }, { status: 404, headers: cors });
      return new Response(data, { headers: { "Content-Type": "application/json", ...cors } });
    }

    if (url.pathname === "/api/status") {
      const sonKontrol = await env.TCF_DATA.get("son_kontrol") || null;
      const sonDegisiklik = await env.TCF_DATA.get("son_degisiklik");
      const faalRaw = await env.TCF_DATA.get("faaliyetler");
      const toplam = faalRaw ? JSON.parse(faalRaw).toplam : 0;
      return Response.json({
        son_kontrol: sonKontrol,
        son_degisiklik: sonDegisiklik ? JSON.parse(sonDegisiklik) : null,
        toplam,
      }, { headers: cors });
    }

    return new Response("TCF Scraper Worker", { status: 200, headers: cors });
  },
};

async function sendPushAll(env, eklenenler) {
  const count = eklenenler.length;
  let message;
  if (count === 1) {
    const f = eklenenler[0];
    message = `${f.baslik} (${f.brans}, ${f.yer})`;
  } else {
    const basliklar = eklenenler.slice(0, 2).map((f) => f.baslik).join(", ");
    message = `${count} yeni: ${basliklar}`;
  }

  try {
    const resp = await fetch("https://tcf.mhtbilisim.com/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.slice(0, 100) }),
    });
    const data = await resp.json();
    console.log(`Push sonuç: ${data.sent || 0} kişiye gönderildi`);
  } catch (e) {
    console.error("Push gönderme hatası:", e);
  }
}
