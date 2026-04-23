/**
 * liminai — ChatInput
 * Layout exato do componente de referência + cores iridescentes via inline styles.
 * Mesma abordagem do Login.jsx (sem injeção de CSS — inline styles diretos).
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

// ── Paleta iridescente (mesma do Login) ─────────────────────────────────────
const IRIS = {
  // fundo do container — blobs sobre var(--color-surface)
  containerBg: [
    'radial-gradient(ellipse 190% 65% at 8%  92%, rgba(144,24,112,0.14) 0%, transparent 50%)',
    'radial-gradient(ellipse 110% 190% at 92% 8%,  rgba(0,120,104,0.14) 0%, transparent 50%)',
    'radial-gradient(ellipse 130% 110% at 40% 45%, rgba(58,20,136,0.17) 0%, transparent 55%)',
  ].join(', '),
  containerBorder:      'rgba(0,184,168,0.20)',
  containerBorderFocus: 'rgba(0,184,168,0.42)',

  // strip de arquivos
  stripBg: [
    'radial-gradient(ellipse 200% 100% at 0% 100%, rgba(144,24,112,0.09) 0%, transparent 55%)',
    'radial-gradient(ellipse 150% 200% at 100% 0%, rgba(0,120,104,0.09) 0%, transparent 55%)',
  ].join(', '),

  // cards de arquivo/paste
  cardBg: [
    'radial-gradient(ellipse 180% 80%  at 0%   100%, rgba(144,24,112,0.11) 0%, transparent 55%)',
    'radial-gradient(ellipse 130% 180% at 100% 0%,   rgba(0,120,104,0.11) 0%, transparent 55%)',
  ].join(', '),
  cardBorder: 'rgba(0,184,168,0.15)',

  // botão enviar
  sendBg: [
    'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
    'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
    'radial-gradient(ellipse 155% 135% at 44%  42%,  #5828c8 0%, transparent 52%)',
    'radial-gradient(ellipse 115% 105% at 76%  78%,  #8830d8 0%, transparent 44%)',
    'radial-gradient(ellipse 95%  62%  at 60%  8%,   #009090 0%, transparent 42%)',
    '#180848',
  ].join(', '),
  sendBorder:      'rgba(0,184,168,0.28)',
  sendBorderHover: 'rgba(0,184,168,0.55)',
  sendGlow:        '0 0 18px rgba(0,184,168,0.45), 0 0 6px rgba(192,32,160,0.30)',

  // drag overlay
  dragBg:     'rgba(58,20,136,0.10)',
  dragBorder: '2px dashed rgba(0,184,168,0.45)',
};

// ── Constantes ──────────────────────────────────────────────────────────────
const MAX_FILES        = 10;
const MAX_FILE_SIZE    = 50 * 1024 * 1024;
const PASTE_THRESHOLD  = 200;
const RATE_LIMIT_MAX    = 5;
const RATE_LIMIT_WINDOW = 60_000;

// ── Helpers ─────────────────────────────────────────────────────────────────
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

// ── Estilos compartilhados dos cartões ──────────────────────────────────────
const cardStyle = {
  backgroundImage: IRIS.cardBg,
  backgroundColor: 'var(--color-surface-hover)',
  border: `1px solid ${IRIS.cardBorder}`,
};

const cardOverlayStyle = {
  background: 'linear-gradient(to bottom, transparent 30%, var(--color-surface-hover))',
};

const badgeStyle = {
  backgroundColor: 'var(--color-surface)',
  border: `1px solid ${IRIS.cardBorder}`,
  color: 'var(--color-text)',
  fontSize: '0.65rem',
  padding: '2px 8px',
  borderRadius: '6px',
};

// ── Cartão: arquivo textual ─────────────────────────────────────────────────
function TextualFilePreviewCard({ file, onRemove }) {
  const preview       = file.textContent?.slice(0, 150) || '';
  const needsTruncate = (file.textContent?.length || 0) > 150;
  const ext           = getFileExtension(file.file.name);

  return (
    <div className="relative rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden" style={cardStyle}>
      <div className="text-[8px] whitespace-pre-wrap break-words max-h-24 overflow-y-auto"
        style={{ color: 'var(--color-text-muted)' }}>
        {file.textContent
          ? <>{preview}{needsTruncate ? '...' : ''}</>
          : <div className="flex items-center justify-center h-full">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'rgba(0,184,168,0.7)' }} />
            </div>
        }
      </div>

      <div className="group absolute inset-0 flex items-end justify-start p-2 overflow-hidden" style={cardOverlayStyle}>
        <span style={badgeStyle}>{ext}</span>

        {file.uploadStatus === 'uploading' && (
          <div className="absolute top-2 left-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'rgba(0,184,168,0.8)' }} />
          </div>
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
      style={cardStyle}
    >
      {isImage && file.preview ? (
        <img src={file.preview} alt={file.file.name} className="w-full h-full object-cover rounded-lg" />
      ) : (
        <div className="flex-1 min-w-0 overflow-hidden h-full">
          <div className="absolute inset-0 flex items-end justify-start p-2" style={cardOverlayStyle}>
            <span style={badgeStyle}>{getFileTypeLabel(file.type)}</span>
          </div>
          {file.uploadStatus === 'uploading' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin absolute top-2 left-2" style={{ color: 'rgba(0,184,168,0.8)' }} />
          )}
          {file.uploadStatus === 'error' && (
            <AlertCircle className="h-3.5 w-3.5 text-red-400 absolute top-2 left-2" />
          )}
          <p className="text-xs font-medium truncate max-w-[90%] mt-1" title={file.file.name}
            style={{ color: 'var(--color-text)' }}>
            {file.file.name}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {formatFileSize(file.file.size)}
          </p>
        </div>
      )}

      <Button size="icon" variant="outline"
        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(file.id)}>
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
    <div className="relative rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden" style={cardStyle}>
      <div className="text-[8px] whitespace-pre-wrap break-words max-h-24 overflow-y-auto"
        style={{ color: 'var(--color-text-muted)' }}>
        {needsTruncate ? preview + '...' : content.content}
      </div>

      <div className="group absolute inset-0 flex items-end justify-start p-2 overflow-hidden" style={cardOverlayStyle}>
        <span style={badgeStyle}>colado</span>

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
  const [focused,       setFocused]       = useState(false);

  const textareaRef    = useRef(null);
  const fileInputRef   = useRef(null);
  const sentTimestamps = useRef([]);
  const cooldownTimer  = useRef(null);

  // ── countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (cooldownSec <= 0) return;
    cooldownTimer.current = setTimeout(() => setCooldownSec((s) => s - 1), 1000);
    return () => clearTimeout(cooldownTimer.current);
  }, [cooldownSec]);

  // ── rate limit ─────────────────────────────────────────────────────────
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

  // ── auto-resize textarea ───────────────────────────────────────────────
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

        {/* overlay de drag */}
        {isDragging && (
          <div
            className="absolute inset-0 z-50 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none"
            style={{ background: IRIS.dragBg, border: IRIS.dragBorder }}
          >
            <ImageIcon className="h-6 w-6 opacity-70" style={{ color: 'rgba(0,184,168,0.9)' }} />
            <p className="text-sm" style={{ color: 'rgba(0,184,168,0.9)' }}>solte os arquivos aqui</p>
          </div>
        )}

        {/* container principal */}
        <div
          className="rounded-2xl shadow-xl flex flex-col transition-all duration-200"
          style={{
            backgroundImage: IRIS.containerBg,
            backgroundColor: 'var(--color-surface)',
            border: `1px solid ${focused ? IRIS.containerBorderFocus : IRIS.containerBorder}`,
            minHeight: '150px',
          }}
        >
          {/* textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 w-full px-4 pt-4 pb-2 resize-none focus:outline-none bg-transparent text-sm sm:text-base"
            style={{
              color:       'var(--color-text)',
              caretColor:  'rgba(0,184,168,0.9)',
              minHeight:   '100px',
              maxHeight:   '120px',
            }}
          />

          {/* barra de ações */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              {/* botão anexar */}
              <button
                type="button"
                className="h-9 w-9 flex items-center justify-center rounded-md transition-colors"
                style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || files.length >= maxFiles}
                title={files.length >= maxFiles ? `máximo de ${maxFiles} arquivos` : 'anexar arquivo'}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgba(88,40,200,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Plus className="h-5 w-5" />
              </button>
              {/* botão opções */}
              <button
                type="button"
                className="h-9 w-9 flex items-center justify-center rounded-md transition-colors"
                style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                disabled={disabled}
                title="opções"
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(88,40,200,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isThrottled && (
                <span className="text-xs tabular-nums" style={{ color: 'rgba(0,184,168,0.75)' }}>
                  aguarde {cooldownSec}s
                </span>
              )}
              {/* botão enviar */}
              <button
                type="button"
                className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg text-white"
                style={{
                  backgroundImage: canSend ? IRIS.sendBg : 'none',
                  backgroundColor: canSend ? '#180848' : 'var(--color-surface-hover)',
                  border: `1px solid ${canSend ? IRIS.sendBorder : 'var(--color-border)'}`,
                  opacity: canSend ? 1 : 0.30,
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  transition: 'box-shadow 0.25s ease, border-color 0.25s ease, opacity 0.2s',
                  color: canSend ? '#fff' : 'var(--color-text-muted)',
                }}
                onClick={handleSend}
                disabled={!canSend}
                title={isThrottled ? `limite atingido — aguarde ${cooldownSec}s` : 'enviar mensagem'}
                onMouseEnter={e => {
                  if (!canSend) return;
                  e.currentTarget.style.boxShadow = IRIS.sendGlow;
                  e.currentTarget.style.borderColor = IRIS.sendBorderHover;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = canSend ? IRIS.sendBorder : 'var(--color-border)';
                }}
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* strip de prévia */}
          {(files.length > 0 || pastedContent.length > 0) && (
            <div
              className="overflow-x-auto p-3 rounded-b-2xl"
              style={{
                backgroundImage: IRIS.stripBg,
                backgroundColor: 'var(--color-bg)',
                borderTop: `1px solid ${IRIS.cardBorder}`,
              }}
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

        <p className="text-center text-xs mt-2" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>
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
