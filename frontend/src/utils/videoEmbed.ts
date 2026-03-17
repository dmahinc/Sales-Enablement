/**
 * Parse video URLs (Loom, YouTube, Vimeo) into embed URLs
 */
export function parseVideoEmbedUrl(url: string): { type: 'youtube' | 'vimeo' | 'loom' | 'direct'; embedUrl: string } | null {
  if (!url?.trim()) return null
  const u = url.trim()

  // Loom: https://www.loom.com/share/xxx -> https://www.loom.com/embed/xxx
  const loomMatch = u.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  if (loomMatch) {
    return { type: 'loom', embedUrl: `https://www.loom.com/embed/${loomMatch[1]}` }
  }
  if (u.includes('loom.com/embed/')) {
    return { type: 'loom', embedUrl: u }
  }

  // YouTube: https://www.youtube.com/watch?v=xxx or youtu.be/xxx
  const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` }
  }

  // Vimeo: https://vimeo.com/xxx
  const vimeoMatch = u.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` }
  }

  // Direct video file
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) {
    return { type: 'direct', embedUrl: u }
  }

  return null
}
