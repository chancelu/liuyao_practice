// Vercel Edge Function：/api/tutor —— Kimi K3 助教代理（生产环境）
// Key 优先级：请求头 x-kimi-key（用户在界面填入，仅存其浏览器） > 环境变量 KIMI_API_KEY（管理员配置）
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const apiKey = req.headers.get('x-kimi-key') || process.env.KIMI_API_KEY;
  if (!apiKey) {
    return new Response('未提供 API Key：请在助教面板填入你的 Kimi API Key，或由管理员配置环境变量 KIMI_API_KEY', { status: 401 });
  }
  let body: { model?: string; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 });
  }
  const upstream = await fetch('https://api.kimi.com/coding/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model ?? 'k3-256k',
      messages: body.messages,
      // k3-256k 仅允许 temperature=1，不传则默认即 1
      stream: true,
    }),
  });
  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: `Kimi API ${upstream.status}: ${await upstream.text()}` }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
