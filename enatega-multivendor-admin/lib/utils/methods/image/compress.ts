export const compressImage = (
  file: File,
  maxWidth = 800,
  maxHeight?: number,
  quality = 0.7
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      let targetWidth = maxWidth;
      let targetHeight = maxHeight || maxWidth;

      // Calculate ratios for cover crop
      const ratio = Math.max(targetWidth / img.width, targetHeight / img.height);
      const drawWidth = img.width * ratio;
      const drawHeight = img.height * ratio;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Center the image (crop edges)
      const offsetX = (targetWidth - drawWidth) / 2;
      const offsetY = (targetHeight - drawHeight) / 2;

      // Fill background (optional, for transparent pngs)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob!], file.name, { type: file.type }));
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};