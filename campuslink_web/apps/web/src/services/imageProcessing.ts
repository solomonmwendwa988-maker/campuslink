export function optimizeImage(file: File, maxDimension = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Select an image file.'));
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onerror = () => { URL.revokeObjectURL(source); reject(new Error('This image could not be opened.')); };
    image.onload = () => {
      URL.revokeObjectURL(source);
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Image preview is not supported in this browser.'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.src = source;
  });
}
