// Un archivo de video directo (subido a R2) se muestra con <video>; lo demás
// (YouTube, Vimeo...) sigue en un iframe.
export function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm)(\?|#|$)/i.test(url.trim());
}
