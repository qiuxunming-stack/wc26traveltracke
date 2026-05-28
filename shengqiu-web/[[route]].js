/**
 * Cloudflare Pages Function — API 代理
 * 将 /api/* 请求转发到 worldcup26.ir，绕过浏览器 CORS 限制。
 * 
 * 部署方式：整个 shengqiu-web/ 目录部署到 Cloudflare Pages 即可，
 *           Functions 会自动生效，无需额外配置。
 */

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 构建目标 URL：/api/get/games → https://worldcup26.ir/get/games
  const apiPath = url.pathname.replace(/^\/api/, '') + url.search;
  const targetUrl = 'https://worldcup26.ir' + apiPath;

  // 转发请求（保留 method / headers / body）
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  // 添加 CORS 头，允许页面跨域读取响应
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', url.origin);
  newHeaders.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
