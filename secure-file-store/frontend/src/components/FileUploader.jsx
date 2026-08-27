import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText } from 'lucide-react';
import { useFileUpload } from '../hooks/useFileUpload';

const MAX_SIZE = 200 * 1024 * 1024;

export default function FileUploader({ onUploaded }) {
  const { upload, progress, reset } = useFileUpload(onUploaded);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      reset();
      for (const file of acceptedFiles) {
        const result = await upload(file);
        if (result) setTimeout(() => reset(), 3000);
      }
    },
    [upload, reset],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    multiple: true,
    disabled: progress?.status === 'uploading' || progress?.status === 'completing',
  });

  const pct =
    progress && progress.totalParts > 0
      ? Math.round((progress.completedParts / progress.totalParts) * 100)
      : 0;

  return (
    <div>
      <div {...getRootProps()} className={`uploader-zone${isDragActive ? ' active' : ''}`} id="upload-dropzone">
        <input {...getInputProps()} id="file-input" />
        <UploadCloud size={40} className="uploader-icon" />
        {isDragActive ? (
          <p className="uploader-title">Drop files here…</p>
        ) : (
          <>
            <p className="uploader-title">Drag & drop files, or click to browse</p>
            <p className="uploader-sub">Any file type up to 200 MB</p>
          </>
        )}
      </div>

      {fileRejections.length > 0 && (
        <p className="form-error" style={{ marginBottom: '0.75rem' }}>
          {fileRejections[0].errors[0].message}
        </p>
      )}

      {progress && (
        <div className="progress-card">
          <div className="progress-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="progress-name">{progress.fileName}</span>
            </div>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill${progress.status === 'completing' ? ' pulse' : ''}`}
              style={{ width: `${progress.status === 'completing' ? 100 : pct}%` }}
            />
          </div>
          <p className={`progress-status${progress.status === 'error' ? ' error' : progress.status === 'done' ? ' done' : ''}`}>
            {progress.status === 'uploading' && `Uploading… ${progress.completedParts}/${progress.totalParts} parts`}
            {progress.status === 'completing' && 'Finalizing upload…'}
            {progress.status === 'done' && '✓ Upload complete'}
            {progress.status === 'error' && `✕ ${progress.error}`}
          </p>
        </div>
      )}
    </div>
  );
}
