export default async function handler(req, res) {
  try {
    const { default: app } = await import('../server/index.js')
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`
    }
    return app(req, res)
  } catch (error) {
    console.error('[Vercel API] Failed to load Express app:', error)
    return res.status(500).json({ error: 'The API could not be started. Check the function logs for details.' })
  }
}
