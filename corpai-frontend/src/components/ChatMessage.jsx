/**
 * liminai — ChatMessage (v2)
 * Mudanças em relação à v1:
 *  - Botão "Copiar resposta" no hover das mensagens da IA (caso de uso nº 1 em chat corporativo).
 *  - Avatar do usuário removido: a bolha iridescente alinhada à direita já identifica
 *    o autor — o avatar só roubava largura útil do texto.
 *  - Bolha da IA um pouco mais larga (85%) — respostas com tabelas/código precisam de espaço.
 *  - Cursor de streaming mais discreto (barra fina piscando, não bloco pulsando).
 */

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchImageBlob } from '../lib/api';
import LiminaiOrb from './LiminaiOrb';

// Thumbnail de imagem da base — as imagens NÃO são públicas, então buscamos o
// blob com o Bearer e usamos um objectURL (revogado no unmount).
function ImageThumb({ image, onOpen }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let ativo = true;
    let criado = null;
    fetchImageBlob(image.image_id)
      .then((u) => { if (ativo) { criado = u; setUrl(u); } else { URL.revokeObjectURL(u); } })
      .catch(() => {});
    return () => { ativo = false; if (criado) URL.revokeObjectURL(criado); };
  }, [image.image_id]);

  if (!url) {
    return <div className="w-24 h-24 rounded-lg animate-pulse" style={{ background: 'var(--color-surface-hover)' }} />;
  }
  return (
    <button type="button" onClick={() => onOpen(url, image)} className="block shrink-0" title={image.descricao}>
      <img
        src={url}
        alt={image.descricao || image.nome_arquivo}
        className="w-24 h-24 object-cover rounded-lg border transition-transform hover:scale-[1.03]"
        style={{ borderColor: 'var(--color-border)' }}
      />
    </button>
  );
}

const USER_BUBBLE_BG = [
  'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
  'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
  'radial-gradient(ellipse 155% 135% at 44%  42%,  #5828c8 0%, transparent 52%)',
  'radial-gradient(ellipse 115% 105% at 76%  78%,  #8830d8 0%, transparent 44%)',
  '#180848',
].join(', ');

export default function ChatMessage({ role, content, isStreaming, images }) {
  const isUser = role === 'user';
  const [copiado, setCopiado] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { url, image } | null

  async function copiarResposta() {
    try {
      await navigator.clipboard.writeText(content);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard indisponível (http sem TLS, permissões) — falha silenciosa */
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div
          className="max-w-[75%] px-4 py-3"
          style={{
            backgroundImage: USER_BUBBLE_BG,
            backgroundColor: '#180848',
            border: '1px solid rgba(0,184,168,0.22)',
            color: '#ffffff',
            borderRadius: '16px 16px 4px 16px',
          }}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 justify-start animate-fade-in">
      {/* Avatar IA */}
      <LiminaiOrb size={30} glow={false} className="mt-0.5" />

      <div className="max-w-[85%] flex flex-col items-start gap-1">
        <div
          className="px-4 py-3 w-full"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px 16px 16px 16px',
          }}
        >
          <div className="markdown-body text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {isStreaming && (
              <span
                className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom animate-pulse rounded-full"
                style={{ backgroundColor: 'rgba(0,184,168,0.9)' }}
              />
            )}
          </div>
        </div>

        {/* Imagens recuperadas da base — abaixo do texto, acima das ações */}
        {Array.isArray(images) && images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {images.map((img) => (
              <ImageThumb key={img.image_id} image={img} onOpen={(url, image) => setLightbox({ url, image })} />
            ))}
          </div>
        )}

        {/* Lightbox simples (overlay) */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 cursor-zoom-out"
            style={{ background: 'rgba(2,6,23,0.85)' }}
            onClick={() => setLightbox(null)}
          >
            <img
              src={lightbox.url}
              alt={lightbox.image.descricao || lightbox.image.nome_arquivo}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.image.descricao && (
              <p className="mt-4 max-w-xl text-center text-sm text-white/80">
                {lightbox.image.descricao}
              </p>
            )}
          </div>
        )}

        {/* Ações — aparecem no hover, somem durante streaming */}
        {!isStreaming && content && (
          <button
            onClick={copiarResposta}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: copiado ? 'rgba(0,184,168,0.95)' : 'var(--color-text-muted)' }}
            title="Copiar resposta"
          >
            {copiado ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copiado
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar resposta
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
