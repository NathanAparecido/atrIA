/**
 * CorpAI — DocumentUpload
 * Drag & drop de arquivos com barra de progresso.
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const EXTENSOES_ACEITAS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

export default function DocumentUpload({ onUpload, uploading, progress }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0 && onUpload) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: EXTENSOES_ACEITAS,
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-corpai-500 bg-corpai-500/10'
          : uploading
          ? 'border-dark-600 cursor-wait opacity-60'
          : 'border-dark-600 hover:border-corpai-500/50 hover:bg-corpai-500/5'
      }`}
    >
      <input {...getInputProps()} />

      {uploading ? (
        <div className="space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-corpai-500 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Processando documento...
          </p>
          {progress > 0 && (
            <div className="max-w-xs mx-auto">
              <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-corpai-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{progress}%</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-surface-hover)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-corpai-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {isDragActive ? 'Solte o arquivo aqui' : 'Arraste ou clique para enviar'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              PDF, DOCX, XLSX, TXT, MD
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
