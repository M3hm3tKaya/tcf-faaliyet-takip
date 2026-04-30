export async function onRequestPost(context) {
  const sub = await context.request.json();
  if (!sub.endpoint) {
    return Response.json({ error: "Geçersiz subscription" }, { status: 400 });
  }

  const kv = context.env.TCF_SUBS;
  const existing = JSON.parse(await kv.get("subs") || "[]");
  const endpoints = new Set(existing.map(s => s.endpoint));

  if (!endpoints.has(sub.endpoint)) {
    existing.push(sub);
    await kv.put("subs", JSON.stringify(existing));
  }

  return Response.json({ status: "ok", total: existing.length });
}
