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
              <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-corpai-500 to-corpai-700 flex items-center justify-center mb-6 shadow-lg shadow-corpai-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  Olá! Eu sou o Corp<span className="text-corpai-400">AI</span>
                </h2>
                <p className="text-center max-w-md" style={{ color: 'var(--color-text-muted)' }}>
                  Sou seu assistente de IA interno. Posso responder perguntas baseadas na documentação do seu setor.
                </p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  {[
                    'Quais são os procedimentos do meu setor?',
                    'Resumir as últimas atualizações',
                    'Como funciona o processo de escalação?',
                    'Quais documentos estão disponíveis?',
                  ].map((sugestao, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sugestao)}
                      className="text-left px-4 py-3 rounded-xl text-sm transition-colors hover:bg-corpai-500/10"
                      style={{
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
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
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-corpai-500 to-corpai-700 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                      </svg>
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
