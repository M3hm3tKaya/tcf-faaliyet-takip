import webpush from "web-push";

export async function onRequestPost(context) {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, TCF_SUBS } = context.env;

  const { message } = await context.request.json();
  if (!message || message.length > 100) {
    return Response.json({ error: "Mesaj boş veya 100 karakterden uzun" }, { status: 400 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const subs = JSON.parse(await TCF_SUBS.get("subs") || "[]");
  if (subs.length === 0) {
    return Response.json({ error: "Abone yok" }, { status: 404 });
  }

  const payload = JSON.stringify({
    title: "TCF Bildirim",
    body: message,
    url: "/",
    tag: "admin-" + Date.now(),
  });

  let sent = 0;
  let failed = 0;
  const remaining = [];

  for (const sub of subs) {
    try {
      const details = webpush.generateRequestDetails(sub, payload, {
        vapidDetails: { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY },
        TTL: 86400,
      });

      const resp = await fetch(details.endpoint, {
        method: details.method,
        headers: details.headers,
        body: details.body,
      });

      if (resp.status === 410 || resp.status === 404) {
        failed++;
      } else {
        sent++;
        remaining.push(sub);
      }
    } catch {
      failed++;
    }
  }

  if (remaining.length !== subs.length) {
    await TCF_SUBS.put("subs", JSON.stringify(remaining));
  }

  return Response.json({ sent, failed, total: subs.length });
}
