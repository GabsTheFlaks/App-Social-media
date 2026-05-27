import { describe, it, expect, vi } from 'vitest';
import { compressImage } from './imageUtils';
import imageCompression from 'browser-image-compression';

// Mock do browser-image-compression
vi.mock('browser-image-compression', () => {
  return {
    default: vi.fn(),
  };
});

describe('imageUtils', () => {
  describe('compressImage', () => {
    it('returns null if input file is null', async () => {
      const result = await compressImage(null);
      expect(result).toBeNull();
    });

    it('returns compressed File if input is a valid image', async () => {
      const mockOriginalFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const mockCompressedBlob = new Blob(['compressed content'], { type: 'image/webp' });

      // Mock da implementação de sucesso
      imageCompression.mockResolvedValueOnce(mockCompressedBlob);

      const result = await compressImage(mockOriginalFile);

      expect(imageCompression).toHaveBeenCalledWith(mockOriginalFile, expect.any(Object));
      expect(result).toBeInstanceOf(File);
      expect(result.name).toBe('test.webp');
      expect(result.type).toBe('image/webp');
    });

    it('throws an error if image compression fails', async () => {
      const mockOriginalFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const mockError = new Error('Compression failed');

      // Mock da implementação com falha
      imageCompression.mockRejectedValueOnce(mockError);

      await expect(compressImage(mockOriginalFile)).rejects.toThrow('Falha ao comprimir imagem');
    });
  });
});
