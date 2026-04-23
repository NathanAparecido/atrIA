/**
 * liminai — ChatMessage
 * Renderiza uma mensagem do chat com Markdown para respostas da IA.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Avatar iridescente da IA — inicial "L"
const AI_AVATAR_BG = [
  'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
  'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
  'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
  '#180848',
].join(', ');

// Bolha de mensagem do usuário — iridescente sólido
const USER_BUBBLE_BG = [
  'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
  'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
  'radial-gradient(ellipse 155% 135% at 44%  42%,  #5828c8 0%, transparent 52%)',
  'radial-gradient(ellipse 115% 105% at 76%  78%,  #8830d8 0%, transparent 44%)',
  '#180848',
].join(', ');

export default function ChatMessage({ role, content, isStreaming }) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar IA */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 shadow-md"
          style={{
            backgroundImage: AI_AVATAR_BG,
            border: '1px solid rgba(0,184,168,0.25)',
          }}
        >
          <span
            className="text-white font-black text-xs"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            L
          </span>
        </div>
      )}

      {/* Conteúdo da mensagem */}
      <div
        className="max-w-[75%] rounded-2xl px-4 py-3"
        style={isUser ? {
          backgroundImage: USER_BUBBLE_BG,
          backgroundColor: '#180848',
          border: '1px solid rgba(0,184,168,0.22)',
          color: '#ffffff',
          borderRadius: '16px 16px 4px 16px',
        } : {
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '4px 16px 16px 16px',
        }}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="markdown-body text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span
                className="inline-block w-2 h-4 animate-pulse ml-0.5 rounded-sm"
                style={{ backgroundColor: 'rgba(0,184,168,0.8)' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Avatar Usuário */}
      {isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
          style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}
