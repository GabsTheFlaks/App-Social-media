import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageUtils';

export function useStorageUpload({ bucket, pathPrefix, allowAudio = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);
  const abortControllerRef = useRef(null);

  // Cancela o upload se o componente desmontar
  useEffect(() => {
    return () => {
      cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setUploading(false);
    }
  }, []);

  const upload = async (file) => {
    if (!file) return null;

    setUploading(true);
    setError(null);

    // Validações
    if (file.size > 10 * 1024 * 1024) {
      const err = new Error('O arquivo excede o limite de 10MB.');
      setError(err);
      setUploading(false);
      throw err;
    }

    if (!file.type.startsWith('image/')) {
      if (!allowAudio || !file.type.startsWith('audio/')) {
        const err = new Error('Formato de arquivo inválido.');
        setError(err);
        setUploading(false);
        throw err;
      }
    }

    try {
      abortControllerRef.current = new AbortController();

      // Compressão (Apenas imagens)
      let finalFile = file;
      if (file.type.startsWith('image/')) {
        finalFile = await compressImage(file);
      }

      const fileExt = finalFile.name ? finalFile.name.split('.').pop() : (allowAudio ? 'webm' : 'webp');
      const randomId = Math.random().toString(36).substring(2, 15);

      // Monta o fileName garantindo que o prefixo e nome não percam formato
      let fileName = `${randomId}.${fileExt}`;
      // Em alguns casos, pathPrefix já inclui userId ou 'chat'/'chat-audio'
      const filePath = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;

      // Upload Options
      const uploadOptions = {
         cacheControl: '3600',
         upsert: false,
         duplex: 'half'
      };

      if (allowAudio && file.type.startsWith('audio/')) {
          uploadOptions.contentType = 'audio/webm';
      }

      // Hack para dar suporte a AbortController na versão atual do supabase-js
      // que as vezes depende de axios ou fetch subjacente.
      // O Supabase storage-js suporta isso a depender da versão.
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, finalFile, uploadOptions);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      setUrl(publicUrl);
      return publicUrl;

    } catch (err) {
      if (err.name === 'AbortError') {
         console.log('Upload cancelado.');
         return null;
      }
      console.error('Erro no upload hook:', err);
      setError(err);
      throw err;
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  return { upload, cancel, uploading, error, url };
}
