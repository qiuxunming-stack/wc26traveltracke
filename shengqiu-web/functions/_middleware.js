export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 只拦截 /api/* 请求，其他正常返回
  if (url.pathname.startsWith('/api/')) {
    const apiPath = url.pathname.replace(/^\/api/, '') + url.search;
    const targetUrl = 'https://worldcup26.ir' + apiPath;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', url.origin);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  // 非 /api/* 请求正常处理（返回 HTML 等静态资源）
  return next();
}
