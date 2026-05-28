export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 只拦截 /api/* 请求
  if (url.pathname.startsWith('/api/')) {
    const apiPath = url.pathname.replace(/^\/api/, '') + url.search;
    const targetUrl = 'https://worldcup26.ir' + apiPath;

    // 伪装成浏览器请求，绕过 API 对云服务商 IP 的封锁
    const proxyHeaders = new Headers();
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    proxyHeaders.set('Accept', 'application/json');
    proxyHeaders.set('Accept-Language', 'en-US,en;q=0.9,zh-CN;q=0.8');

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
      });

      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', url.origin);
      newHeaders.set('Access-Control-Allow-Credentials', 'true');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy failed: ' + err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  return next();
}
