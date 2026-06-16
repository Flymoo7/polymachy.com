// Downscale + JPEG-compress an uploaded image to a small data URL. Portraits
// live in the character's meta and sync to the GM over the P2P link, so we
// keep them light: cap the longest edge and re-encode as JPEG.

export function downscaleImage(file: File, maxDim = 512, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('no 2d context')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try { resolve(canvas.toDataURL('image/jpeg', quality)); }
      catch (e) { reject(e as Error); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not load image')); };
    img.src = url;
  });
}
