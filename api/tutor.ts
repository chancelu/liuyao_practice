// Vercel Edge Function：/api/tutor —— 通用 OpenAI 兼容助教代理（生产环境）
// 默认端点为 Kimi K3；前端可在 body 里传 endpoint 切换到任意 OpenAI 兼容服务。
// 安全规则：环境变量 KIMI_API_KEY 只用于默认 Kimi 端点；自定义端点必须用户自带 Key（请求头 x-api-key）。
export const config = { runtime: 'edge' };

const DEFAULT_ENDPOINT = 'https://api.kimi.com/coding/v1/chat/completions';
const DEFAULT_MODEL = 'k3-256k';

export default async function handler(req: Request): Promise<Response> {
  // GET：探测服务端是否已配置 KIMI_API_KEY（前端据此显示「站点默认模型已就绪」）
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ serverKey: !!process.env.KIMI_API_KEY, defaultModel: DEFAULT_MODEL }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: { model?: string; messages?: unknown; endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 });
  }

  // 端点校验：必须是 https 的合法 URL，缺省走 Kimi
  let endpoint = DEFAULT_ENDPOINT;
  if (typeof body.endpoint === 'string' && body.endpoint.trim()) {
    try {
      const u = new URL(body.endpoint.trim());
      if (u.protocol !== 'https:') throw new Error('not https');
      endpoint = u.toString();
    } catch {
      return new Response('Bad Request: endpoint 必须是合法的 https URL', { status: 400 });
    }
  }

  // Key：请求头（用户在设置中填入，仅存其浏览器）优先；环境变量仅限默认端点兜底
  const headerKey = req.headers.get('x-api-key') || req.headers.get('x-kimi-key') || '';
  const isDefaultEndpoint = endpoint === DEFAULT_ENDPOINT;
  const apiKey = headerKey || (isDefaultEndpoint ? process.env.KIMI_API_KEY ?? '' : '');
  if (!apiKey) {
    return new Response(
      isDefaultEndpoint
        ? '未提供 API Key：请在右上角「设置」中配置助教模型，或由管理员配置环境变量 KIMI_API_KEY'
        : '自定义端点必须在「设置」中填入你自己的 API Key（站点环境变量 Key 不会转发给第三方端点）',
      { status: 401 },
    );
  }

  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model ?? DEFAULT_MODEL,
      messages: body.messages,
      stream: true,
    }),
  });
  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: `上游 API ${upstream.status}: ${await upstream.text()}` }), {
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
