/**
 * CorpAI — Página de Chat
 * Interface principal estilo ChatGPT com sidebar, histórico e SSE streaming.
 */

import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import { enviarMensagem, listarConversas, obterConversa, deletarConversa } from '../lib/api';

export default function Chat() {
  const [conversas, setConversas] = useState([]);
  const [conversaAtual, setConversaAtual] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [gerando, setGerando] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const messagesEndRef = useRef(null);

  // Carregar lista de conversas ao montar
  useEffect(() => {
    carregarConversas();
  }, []);

  // Scroll automático ao receber novas mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function carregarConversas() {
    try {
      const lista = await listarConversas();
      setConversas(lista);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    }
  }

  async function selecionarConversa(id) {
    setConversaAtual(id);
    try {
      const msgs = await obterConversa(id);
      setMensagens(msgs.map(m => ({ role: m.role, content: m.content })));
    } catch (err) {
      console.error('Erro ao carregar conversa:', err);
    }
  }

  function novaConversa() {
    setConversaAtual(null);
    setMensagens([]);
  }

  async function handleDeletarConversa(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta conversa?')) return;
    try {
      await deletarConversa(id);
      if (conversaAtual === id) {
        setConversaAtual(null);
        setMensagens([]);
      }
      await carregarConversas();
    } catch (err) {
      console.error('Erro ao deletar conversa:', err);
    }
  }

  async function handleSend(texto) {
    // Adicionar mensagem do usuário
    const novaMensagem = { role: 'user', content: texto };
    setMensagens(prev => [...prev, novaMensagem]);
    setGerando(true);

    // Adicionar placeholder da IA
    setMensagens(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    let convId = conversaAtual;

    try {
      convId = await enviarMensagem(
        texto,
        conversaAtual,
        // onChunk — atualizar a última mensagem
        (chunk) => {
          setMensagens(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
            }
            return updated;
          });
        },
        // onDone
        (finalConvId) => {
          setMensagens(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, streaming: false };
            }
            return updated;
          });
          setGerando(false);
          setConversaAtual(finalConvId);
          carregarConversas();
        }
      );

      if (convId && !conversaAtual) {
        setConversaAtual(convId);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setMensagens(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
            streaming: false,
          };
        }
        return updated;
      });
      setGerando(false);
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarAberta && (
          <Sidebar
            conversas={conversas}
            conversaAtual={conversaAtual}
            onSelectConversa={selecionarConversa}
            onNovaConversa={novaConversa}
            onDeletarConversa={handleDeletarConversa}
          />
        )}

        {/* Área principal do chat */}
        <main className="flex-1 flex flex-col" style={{ background: 'var(--color-bg)' }}>
          {/* Toggle sidebar (mobile) */}
          <button
            onClick={() => setSidebarAberta(prev => !prev)}
            className="md:hidden absolute top-16 left-2 z-10 p-2 rounded-lg"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto">
            {mensagens.length === 0 ? (
              // Tela de boas-vindas
              <div className="h-full flex flex-col items-center justify-center p-8 gap-3">
                {/* Logo iridescente — mesmo estilo do Login */}
                <div className="mb-2 font-['Orbitron'] text-5xl font-black flex tracking-tighter select-none">
                  <span style={{ color: 'var(--color-text)' }}>limin</span>
                  <span style={{
                    background: [
                      'radial-gradient(ellipse 190% 65% at 8% 92%,  #c020a8 0%, transparent 48%)',
                      'radial-gradient(ellipse 110% 190% at 92% 8%,  #00b8a8 0%, transparent 48%)',
                      'radial-gradient(ellipse 130% 110% at 38% 42%, #5828c8 0%, transparent 52%)',
                      'radial-gradient(ellipse 85%  75%  at 78% 72%, #5828c8 0%, transparent 44%)',
                      'radial-gradient(ellipse 70%  50%  at 55% 15%, #00b8a8 0%, transparent 40%)',
                      '#180848',
                    ].join(', '),
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>ai</span>
                </div>

                <p className="text-center max-w-sm text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  pergunte sobre documentos, processos e informações do seu setor.
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                  {[
                    'quais são os procedimentos do meu setor?',
                    'resumir as últimas atualizações',
                    'como funciona o processo de escalação?',
                    'quais documentos estão disponíveis?',
                  ].map((sugestao, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sugestao)}
                      className="text-left px-4 py-3 rounded-xl text-sm transition-all"
                      style={{
                        border: '1px solid rgba(0,184,168,0.15)',
                        color: 'var(--color-text-muted)',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(0,184,168,0.35)';
                        e.currentTarget.style.color = 'var(--color-text)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(0,184,168,0.15)';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }}
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto py-6 px-4 space-y-4">
                {mensagens.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={msg.streaming}
                  />
                ))}

                {/* Indicador de digitando */}
                {gerando && mensagens[mensagens.length - 1]?.content === '' && (
                  <div className="flex gap-3 items-center">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                      style={{
                        backgroundImage: [
                          'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
                          'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
                          'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
                          '#180848',
                        ].join(', '),
                        border: '1px solid rgba(0,184,168,0.25)',
                      }}
                    >
                      <span className="text-white font-black text-xs" style={{ fontFamily: 'Orbitron, sans-serif' }}>L</span>
                    </div>
                    <div className="typing-indicator px-4 py-3 rounded-2xl rounded-bl-md"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={gerando} />
        </main>
      </div>
    </div>
  );
}
