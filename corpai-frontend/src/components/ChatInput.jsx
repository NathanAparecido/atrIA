/**
 * liminai — ChatInput
 * Campo de entrada estilo Claude com upload, paste detection, drag-drop e rate limiting.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  SlidersHorizontal,
  ArrowUp,
  X,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  Loader2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Constantes ──────────────────────────────────────────────────────────────
const MAX_FILES        = 10;
const MAX_FILE_SIZE    = 50 * 1024 * 1024; // 50 MB
const PASTE_THRESHOLD  = 200;              // chars mínimos para tratar como "colado"

// rate limit: janela deslizante
const RATE_LIMIT_MAX    = 5;       // mensagens máximas
const RATE_LIMIT_WINDOW = 60_000;  // por janela de 60 s

// ── Helpers de arquivo ──────────────────────────────────────────────────────
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileTypeLabel = (type) => {
  const parts = type.split('/');
  let label = parts[parts.length - 1].toUpperCase();
  if (label.length > 7 && label.includes('-')) label = label.substring(0, label.indexOf('-'));
  if (label.length > 10) label = label.substring(0, 10) + '...';
  return label;
};

const getFileExtension = (filename) => {
  const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
  return ext.length > 8 ? ext.substring(0, 8) + '...' : ext;
};

const isTextualFile = (file) => {
  const textualTypes = ['text/', 'application/json', 'application/xml', 'application/javascript'];
  const textualExtensions = [
    'txt','md','py','js','ts','jsx','tsx','html','htm','css','scss','sass','json','xml',
    'yaml','yml','csv','sql','sh','bash','php','rb','go','java','c','cpp','h','hpp',
    'cs','rs','swift','kt','scala','r','vue','svelte','astro','config','conf','ini',
    'toml','log','gitignore','dockerfile','makefile','readme',
  ];
  const isTextualMime = textualTypes.some((t) => file.type.toLowerCase().startsWith(t));
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isTextualExt = textualExtensions.includes(ext)
    || file.name.toLowerCase().includes('readme')
    || file.name.toLowerCase().includes('dockerfile')
    || file.name.toLowerCase().includes('makefile');
  return isTextualMime || isTextualExt;
};

const readFileAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload  = (e) => resolve(e.target?.result || '');
  reader.onerror = (e) => reject(e);
  reader.readAsText(file);
});

// ── Cartão: arquivo textual ─────────────────────────────────────────────────
function TextualFilePreviewCard({ file, onRemove }) {
  const preview       = file.textContent?.slice(0, 150) || '';
  const needsTruncate = (file.textContent?.length || 0) > 150;
  const ext           = getFileExtension(file.file.name);

  return (
    <div
      className="relative rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}
    >
      {/* conteúdo textual */}
      <div
        className="text-[8px] whitespace-pre-wrap break-words max-h-24 overflow-y-auto"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {file.textContent
          ? <>{preview}{needsTruncate ? '...' : ''}</>
          : <div className="flex items-center justify-center h-full">
              <Loader2 className="h-4 w-4 animate-spin text-corpai-400" />
            </div>
        }
      </div>

      {/* overlay degradê */}
      <div
        className="group absolute inset-0 flex items-end justify-start p-2 overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, transparent 30%, var(--color-surface-hover))' }}
      >
        <span
          className="text-xs px-2 py-1 rounded-md"
          style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {ext}
        </span>

        {file.uploadStatus === 'uploading' && (
          <div className="absolute top-2 left-2"><Loader2 className="h-3.5 w-3.5 animate-spin text-corpai-400" /></div>
        )}
        {file.uploadStatus === 'error' && (
          <div className="absolute top-2 left-2"><AlertCircle className="h-3.5 w-3.5 text-red-400" /></div>
        )}

        <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {file.textContent && (
            <Button size="icon" variant="outline" className="size-6"
              onClick={() => navigator.clipboard.writeText(file.textContent || '')}
              title="Copiar conteúdo">
              <Copy className="h-3 w-3" />
            </Button>
          )}
          <Button size="icon" variant="outline" className="size-6"
            onClick={() => onRemove(file.id)} title="Remover arquivo">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Cartão: arquivo genérico / imagem ───────────────────────────────────────
function FilePreviewCard({ file, onRemove }) {
  const isImage   = file.type.startsWith('image/');
  const isTextual = isTextualFile(file.file);

  if (isTextual) return <TextualFilePreviewCard file={file} onRemove={onRemove} />;

  return (
    <div
      className={cn('relative group rounded-lg size-[125px] shadow-md flex-shrink-0 overflow-hidden', isImage ? 'p-0' : 'p-3')}
      style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}
    >
      {isImage && file.preview ? (
        <img src={file.preview} alt={file.file.name} className="w-full h-full object-cover rounded-lg" />
      ) : (
        <div className="flex-1 min-w-0 overflow-hidden h-full">
          <div
            className="absolute inset-0 flex items-end justify-start p-2"
            style={{ background: 'linear-gradient(to bottom, transparent 30%, var(--color-surface-hover))' }}
          >
            <span
              className="text-xs px-2 py-1 rounded-md"
              style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {getFileTypeLabel(file.type)}
            </span>
          </div>
          {file.uploadStatus === 'uploading' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-corpai-400 absolute top-2 left-2" />
          )}
          {file.uploadStatus === 'error' && (
            <AlertCircle className="h-3.5 w-3.5 text-red-400 absolute top-2 left-2" />
          )}
          <p
            className="text-xs font-medium truncate max-w-[90%] mt-1"
            title={file.file.name}
            style={{ color: 'var(--color-text)' }}
          >
            {file.file.name}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {formatFileSize(file.file.size)}
          </p>
        </div>
      )}

      <Button
        size="icon" variant="outline"
        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(file.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Cartão: conteúdo colado ─────────────────────────────────────────────────
function PastedContentCard({ content, onRemove }) {
  const preview       = content.content.slice(0, 150);
  const needsTruncate = content.content.length > 150;

  return (
    <div
      className="relative rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="text-[8px] whitespace-pre-wrap break-words max-h-24 overflow-y-auto"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {needsTruncate ? preview + '...' : content.content}
      </div>

      <div
        className="group absolute inset-0 flex items-end justify-start p-2 overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, transparent 30%, var(--color-surface-hover))' }}
      >
        <span
          className="text-xs px-2 py-1 rounded-md"
          style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          colado
        </span>

        <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button size="icon" variant="outline" className="size-6"
            onClick={() => navigator.clipboard.writeText(content.content)} title="Copiar">
            <Copy className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="outline" className="size-6"
            onClick={() => onRemove(content.id)} title="Remover">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export default function ChatInput({
  onSend,
  disabled      = false,
  placeholder   = 'Digite sua mensagem...',
  maxFiles      = MAX_FILES,
  maxFileSize   = MAX_FILE_SIZE,
  acceptedFileTypes,
}) {
  const [message,       setMessage]       = useState('');
  const [files,         setFiles]         = useState([]);
  const [pastedContent, setPastedContent] = useState([]);
  const [isDragging,    setIsDragging]    = useState(false);
  const [cooldownSec,   setCooldownSec]   = useState(0);

  const textareaRef    = useRef(null);
  const fileInputRef   = useRef(null);
  const sentTimestamps = useRef([]);   // timestamps das msgs enviadas (rate limit)
  const cooldownTimer  = useRef(null);

  // ── countdown do cooldown ──────────────────────────────────────────────
  useEffect(() => {
    if (cooldownSec <= 0) return;
    cooldownTimer.current = setTimeout(() => setCooldownSec((s) => s - 1), 1000);
    return () => clearTimeout(cooldownTimer.current);
  }, [cooldownSec]);

  // ── checa rate limit (sliding window) ─────────────────────────────────
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    sentTimestamps.current = sentTimestamps.current.filter((t) => now - t < RATE_LIMIT_WINDOW);
    if (sentTimestamps.current.length >= RATE_LIMIT_MAX) {
      const waitMs = RATE_LIMIT_WINDOW - (now - sentTimestamps.current[0]);
      setCooldownSec(Math.ceil(waitMs / 1000));
      return false;
    }
    sentTimestamps.current.push(now);
    return true;
  }, []);

  // ── auto-resize do textarea ────────────────────────────────────────────
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    const maxH = parseInt(getComputedStyle(textareaRef.current).maxHeight, 10) || 120;
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxH) + 'px';
  }, [message]);

  // ── seleção de arquivos ────────────────────────────────────────────────
  const handleFileSelect = useCallback((selectedFiles) => {
    if (!selectedFiles) return;
    const available = maxFiles - files.length;
    if (available <= 0) { alert(`Máximo de ${maxFiles} arquivos permitido.`); return; }

    const toAdd = Array.from(selectedFiles).slice(0, available).filter((file) => {
      if (file.size > maxFileSize) {
        alert(`"${file.name}" (${formatFileSize(file.size)}) excede ${formatFileSize(maxFileSize)}.`);
        return false;
      }
      return true;
    }).map((file) => ({
      id:             Math.random().toString(36).slice(2),
      file,
      preview:        file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type:           file.type || 'application/octet-stream',
      uploadStatus:   'pending',
      uploadProgress: 0,
    }));

    setFiles((prev) => [...prev, ...toAdd]);

    toAdd.forEach((f) => {
      if (isTextualFile(f.file)) {
        readFileAsText(f.file)
          .then((textContent) => setFiles((prev) => prev.map((p) => p.id === f.id ? { ...p, textContent } : p)))
          .catch(() => setFiles((prev) => prev.map((p) => p.id === f.id ? { ...p, textContent: 'erro ao ler' } : p)));
      }

      setFiles((prev) => prev.map((p) => p.id === f.id ? { ...p, uploadStatus: 'uploading' } : p));
      let progress = 0;
      const iv = setInterval(() => {
        progress += Math.random() * 25 + 5;
        if (progress >= 100) {
          clearInterval(iv);
          setFiles((prev) => prev.map((p) => p.id === f.id ? { ...p, uploadStatus: 'complete', uploadProgress: 100 } : p));
        } else {
          setFiles((prev) => prev.map((p) => p.id === f.id ? { ...p, uploadProgress: progress } : p));
        }
      }, 120);
    });
  }, [files.length, maxFiles, maxFileSize]);

  const removeFile = useCallback((id) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // ── paste ──────────────────────────────────────────────────────────────
  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData.items);
    const fileItems = items.filter((i) => i.kind === 'file');
    if (fileItems.length > 0 && files.length < maxFiles) {
      e.preventDefault();
      const dt = new DataTransfer();
      fileItems.map((i) => i.getAsFile()).filter(Boolean).forEach((f) => dt.items.add(f));
      handleFileSelect(dt.files);
      return;
    }
    const text = e.clipboardData.getData('text');
    if (text && text.length > PASTE_THRESHOLD && pastedContent.length < 5) {
      e.preventDefault();
      setMessage((prev) => prev + text.slice(0, PASTE_THRESHOLD) + '…');
      setPastedContent((prev) => [...prev, {
        id:        Math.random().toString(36).slice(2),
        content:   text,
        timestamp: new Date(),
        wordCount: text.split(/\s+/).filter(Boolean).length,
      }]);
    }
  }, [handleFileSelect, files.length, maxFiles, pastedContent.length]);

  // ── drag-drop ──────────────────────────────────────────────────────────
  const handleDragOver  = useCallback((e) => { e.preventDefault(); setIsDragging(true);  }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop      = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // ── envio ──────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (disabled || (!message.trim() && files.length === 0 && pastedContent.length === 0)) return;
    if (files.some((f) => f.uploadStatus === 'uploading')) { alert('Aguarde o upload finalizar.'); return; }
    if (!checkRateLimit()) return;

    onSend?.(message.trim() || '[arquivo(s) anexado(s)]');
    setMessage('');
    files.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [message, files, pastedContent, disabled, onSend, checkRateLimit]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const hasContent  = message.trim() || files.length > 0 || pastedContent.length > 0;
  const isThrottled = cooldownSec > 0;
  const canSend     = hasContent && !disabled && !files.some((f) => f.uploadStatus === 'uploading') && !isThrottled;

  return (
    <div
      className="px-4 pb-4 pt-2"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="relative max-w-4xl mx-auto">

        {/* overlay de drag — fora do card, cobre tudo */}
        {isDragging && (
          <div
            className="absolute inset-0 z-50 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none"
            style={{ backgroundColor: 'rgba(11,0,221,0.07)', border: '2px dashed var(--color-border)' }}
          >
            <ImageIcon className="h-6 w-6 text-corpai-400 opacity-70" />
            <p className="text-sm text-corpai-400">solte os arquivos aqui</p>
          </div>
        )}

        {/* container principal */}
        <div
          className="rounded-2xl shadow-lg flex flex-col"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            minHeight: '130px',
          }}
        >
          {/* textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 w-full px-4 pt-4 pb-2 resize-none focus:outline-none bg-transparent text-sm sm:text-base placeholder:opacity-40"
            style={{
              color:      'var(--color-text)',
              maxHeight:  '120px',
              minHeight:  '90px',
            }}
          />

          {/* barra de ações */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <Button
                type="button" size="icon" variant="ghost"
                className="h-9 w-9 p-0 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || files.length >= maxFiles}
                title={files.length >= maxFiles ? `máximo de ${maxFiles} arquivos` : 'anexar arquivo'}
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Button
                type="button" size="icon" variant="ghost"
                className="h-9 w-9 p-0 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                disabled={disabled} title="opções"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {isThrottled && (
                <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  aguarde {cooldownSec}s
                </span>
              )}
              <Button
                type="button" size="icon"
                className={cn(
                  'h-9 w-9 p-0 rounded-lg transition-colors',
                  canSend
                    ? 'bg-corpai-600 hover:bg-corpai-700 text-white'
                    : 'opacity-30 cursor-not-allowed'
                )}
                style={canSend ? undefined : { backgroundColor: 'var(--color-surface-hover)' }}
                onClick={handleSend}
                disabled={!canSend}
                title={isThrottled ? `limite atingido — aguarde ${cooldownSec}s` : 'enviar mensagem'}
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* prévia de arquivos e conteúdo colado */}
          {(files.length > 0 || pastedContent.length > 0) && (
            <div
              className="overflow-x-auto border-t p-3"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
            >
              <div className="flex gap-3">
                {pastedContent.map((c) => (
                  <PastedContentCard
                    key={c.id}
                    content={c}
                    onRemove={(id) => setPastedContent((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
                {files.map((f) => (
                  <FilePreviewCard key={f.id} file={f} onRemove={removeFile} />
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-2" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
          liminai pode cometer erros. sempre verifique informações críticas.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={acceptedFileTypes?.join(',')}
        onChange={(e) => { handleFileSelect(e.target.files); if (e.target) e.target.value = ''; }}
      />
    </div>
  );
}
