// Cloudflare Worker entrypoint for the hosted build. The app is a static SPA:
// every request is served by the ASSETS binding, with unknown paths falling
// back to index.html (spa: true in deploy.manifest.json).
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    const headers = new Headers(response.headers)
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Referrer-Policy', 'no-referrer')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
}
