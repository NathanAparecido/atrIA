/**
 * CorpAI — Sidebar do Chat
 * Lista de conversas anteriores + botão de nova conversa.
 */

import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({
  conversas,
  conversaAtual,
  onSelectConversa,
  onNovaConversa,
  onDeletarConversa,
}) {
  const { user } = useAuth();

  const setorLabel = {
    noc: 'NOC', suporte_n2: 'Suporte N2', suporte_n3: 'Suporte N3',
    financeiro: 'Financeiro', diretoria: 'Diretoria', vendas: 'Vendas',
    marketing: 'Marketing', vendas_dc: 'Vendas DC', infra: 'Infraestrutura',
    suporte_rua: 'Suporte Rua', global: 'Global',
  };

  return (
    <aside className="w-72 h-full flex flex-col border-r transition-theme"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      
      {/* Setor do usuário */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          Setor
        </p>
        <p className="text-sm font-semibold text-corpai-400 mt-1">
          {setorLabel[user?.setor] || user?.setor}
        </p>
      </div>

      {/* Botão Nova Conversa */}
      <div className="p-3">
        <button
          onClick={onNovaConversa}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-corpai-600 hover:bg-corpai-700 text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Conversa
        </button>
      </div>

      {/* Lista de Conversas */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {conversas.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: 'var(--color-text-muted)' }}>
            Nenhuma conversa ainda.
          </p>
        ) : (
          <div className="space-y-1">
            {conversas.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  conversaAtual === conv.id
                    ? 'bg-corpai-600/20 text-corpai-400'
                    : 'hover:bg-white/5'
                }`}
                style={conversaAtual !== conv.id ? { color: 'var(--color-text)' } : undefined}
                onClick={() => onSelectConversa(conv.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm truncate flex-1">{conv.titulo}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeletarConversa(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-all"
                  title="Excluir conversa"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
