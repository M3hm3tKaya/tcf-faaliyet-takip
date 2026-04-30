export async function onRequestGet(context) {
  return Response.json({ publicKey: context.env.VAPID_PUBLIC_KEY });
}
