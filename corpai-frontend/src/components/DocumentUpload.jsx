/**
 * liminai — DocumentUpload
 * Dropzone para seleção de arquivo. O upload só ocorre após preencher metadados.
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

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUpload({
  onFileSelect,
  selectedFile,
  onClearFile,
  uploading,
  progress,
}) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0 && onFileSelect) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: EXTENSOES_ACEITAS,
    maxFiles: 1,
    disabled: uploading || !!selectedFile,
  });

  // ── Uploading ──────────────────────────────────────────────
  if (uploading) {
    return (
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center"
        style={{ borderColor: 'rgba(0,184,168,0.3)', background: 'rgba(0,184,168,0.04)' }}
      >
        <div className="space-y-3">
          <div
            className="w-12 h-12 mx-auto rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(0,184,168,0.5)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Processando documento...
          </p>
          {progress > 0 && (
            <div className="max-w-xs mx-auto">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-hover)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: 'rgba(0,184,168,0.8)' }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{progress}%</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Arquivo selecionado ────────────────────────────────────
  if (selectedFile) {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: 'var(--color-surface)', border: '1px solid rgba(0,184,168,0.25)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(0,184,168,0.1)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{ color: 'rgba(0,184,168,0.8)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatBytes(selectedFile.size)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearFile}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
          style={{ color: 'rgba(248,113,113,0.6)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgb(248,113,113)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(248,113,113,0.6)'}
          title="Remover arquivo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  // ── Dropzone padrão ────────────────────────────────────────
  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        isDragActive ? 'border-teal-500 bg-teal-500/10' : 'hover:border-teal-500/50 hover:bg-teal-500/5'
      }`}
      style={{ borderColor: isDragActive ? undefined : 'var(--color-border)' }}
    >
      <input {...getInputProps()} />
      <div className="space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface-hover)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" style={{ color: 'rgba(0,184,168,0.8)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {isDragActive ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            PDF, DOCX, XLSX, TXT, MD
          </p>
        </div>
      </div>
    </div>
  );
}
