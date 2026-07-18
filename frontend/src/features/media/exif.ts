/**
 * Strips EXIF metadata from image files using an HTML5 Canvas approach.
 * For non-images or browsers lacking Canvas support, returns original Blob.
 */
export async function stripExif(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    // Cannot strip EXIF from non-images easily in browser
    return file;
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback if canvas is unsupported
        resolve(file);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Re-exporting via canvas strips EXIF metadata entirely
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(file);
        }
      }, file.type, 1.0);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback on error
    };
    
    img.src = url;
  });
}
