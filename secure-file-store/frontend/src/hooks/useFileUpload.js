import { useCallback, useState } from 'react';
import axios from 'axios';
import api from '../lib/api';

const PART_SIZE = 5 * 1024 * 1024; // 5 MB

export function useFileUpload(onSuccess) {
  const [progress, setProgress] = useState(null);

  const reset = useCallback(() => setProgress(null), []);

  const upload = useCallback(
    async (file) => {
      const fileId = crypto.randomUUID();
      const totalParts = Math.ceil(file.size / PART_SIZE);

      setProgress({ fileId, fileName: file.name, totalParts, completedParts: 0, status: 'uploading' });

      let storageKey = '';
      let uploadId = '';

      try {
        const { data: initData } = await api.post('/files/upload/init', {
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        });

        storageKey = initData.storageKey;
        uploadId = initData.uploadId;

        const completedParts = [];
        const parts = initData.parts;
        const BATCH_SIZE = 3;

        for (let i = 0; i < parts.length; i += BATCH_SIZE) {
          const batch = parts.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async ({ partNumber, url }) => {
              const start = (partNumber - 1) * PART_SIZE;
              const end = Math.min(start + PART_SIZE, file.size);
              const chunk = file.slice(start, end);

              const response = await axios.put(url, chunk, {
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
              });

              const etag = response.headers['etag'];
              completedParts.push({ PartNumber: partNumber, ETag: etag });

              setProgress((prev) =>
                prev ? { ...prev, completedParts: prev.completedParts + 1 } : prev,
              );
            }),
          );
        }

        setProgress((prev) => prev ? { ...prev, status: 'completing' } : prev);

        const { data: completeData } = await api.post('/files/upload/complete', {
          storageKey,
          uploadId,
          parts: completedParts,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        });

        setProgress((prev) => prev ? { ...prev, status: 'done' } : prev);
        onSuccess?.(completeData.file);
        return completeData.file;
      } catch (err) {
        if (storageKey && uploadId) {
          await api.post('/files/upload/abort', { storageKey, uploadId }).catch(() => {});
        }

        const message = axios.isAxiosError(err)
          ? (err.response?.data?.error ?? 'Upload failed.')
          : 'Upload failed.';

        setProgress((prev) => prev ? { ...prev, status: 'error', error: message } : prev);
        return null;
      }
    },
    [onSuccess],
  );

  return { upload, progress, reset };
}
