import imageCompression from 'browser-image-compression';

/**
 * Comprime uma imagem antes de fazer o upload para o Supabase.
 * Alvo: max 800px de largura/altura, 80% qualidade, conversão pra WebP para poupar dados.
 * @param {File} file Arquivo de imagem original
 * @returns {Promise<File>} Arquivo de imagem comprimido
 */
export const compressImage = async (file) => {
  if (!file) return file;

  const options = {
    maxSizeMB: 0.3, // Alvo: ~300kb (Supabase limit free tier friendly)
    maxWidthOrHeight: 1200, // Bom para web/mobile PWA
    useWebWorker: true,
    fileType: 'image/webp' // Converte para WebP para economizar muito espaço
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // Preserva o nome original mas muda a extensao se foi convertido
    const newFileName = file.name.replace(/\.[^/.]+$/, ".webp");
    return new File([compressedFile], newFileName, {
      type: 'image/webp',
    });
  } catch (error) {
    console.error('Erro ao comprimir imagem:', error);
    return file; // Se der erro, tenta subir a original mesmo
  }
};
