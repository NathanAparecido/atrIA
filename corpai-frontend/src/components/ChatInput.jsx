/**
 * CorpAI — ChatInput
 * Campo de entrada de texto do chat com botão de envio.
 */

import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex gap-3 items-end max-w-4xl mx-auto rounded-2xl px-4 py-3 transition-theme"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent resize-none text-sm focus:outline-none placeholder-dark-500"
          style={{ color: 'var(--color-text)', maxHeight: '200px' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className={`flex-shrink-0 p-2 rounded-xl transition-all ${
            text.trim() && !disabled
              ? 'bg-corpai-600 hover:bg-corpai-700 text-white'
              : 'bg-dark-700 text-dark-500 cursor-not-allowed'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </div>
      <p className="text-center text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
        CorpAI pode cometer erros. Sempre verifique informações críticas.
      </p>
    </form>
  );
}
