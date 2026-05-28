export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
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
