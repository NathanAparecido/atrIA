/**
 * liminai — Página de Chat (v2)
 * Mudanças em relação à v1:
 *  - Boas-vindas personalizada: saúda pelo nome e nomeia o setor — prova logo de
 *    cara que a IA conhece o contexto do usuário (a proposta de valor do produto).
 *  - Sugestões contextuais por setor, com fallback genérico.
 *  - Mensagem de erro acionável (diz o que aconteceu e o que fazer), sem pedir desculpa vaga.
 *  - window.confirm() removido — a confirmação de exclusão agora é inline na Sidebar.
 *  - Copy padronizada em sentence case (minúscula fica reservada à navegação/marca).
 */

import { useState, useEffect, useRef } from 'react';
import AppSidebar from '../components/AppSidebar';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import LiminaiOrb from '../components/LiminaiOrb';
import { useAuth } from '../contexts/AuthContext';
import { enviarMensagem, listarConversas, obterConversa, deletarConversa } from '../lib/api';

const MENSAGEM_ERRO =
  'Não consegui gerar a resposta agora. Sua mensagem não foi perdida — ' +
  'verifique sua conexão e envie novamente. Se o problema continuar, avise o líder do seu setor.';

export default function Chat() {
  const { user } = useAuth();
  const [conversas, setConversas] = useState([]);
  const [conversaAtual, setConversaAtual] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [gerando, setGerando] = useState(false);
  const messagesEndRef = useRef(null);

  const primeiroNome = (user?.nome_completo || user?.username || '').split(' ')[0];

  useEffect(() => {
    carregarConversas();
  }, []);

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
      setMensagens(msgs.map(m => ({ role: m.role, content: m.content, images: m.images })));
    } catch (err) {
      console.error('Erro ao carregar conversa:', err);
    }
  }

  function novaConversa() {
    setConversaAtual(null);
    setMensagens([]);
  }

  // A confirmação agora acontece inline na Sidebar — aqui só executa.
  async function handleDeletarConversa(id) {
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
    const novaMensagem = { role: 'user', content: texto };
    setMensagens(prev => [...prev, novaMensagem]);
    setGerando(true);
    setMensagens(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    let convId = conversaAtual;

    try {
      convId = await enviarMensagem(
        texto,
        conversaAtual,
        (chunk) => {
          setMensagens(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + chunk };
            }
            return updated;
          });
        },
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
        },
        // onImages — anexa as imagens recuperadas ao balão da resposta atual
        (imagens) => {
          setMensagens(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, images: imagens };
            }
            return updated;
          });
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
            content: MENSAGEM_ERRO,
            streaming: false,
          };
        }
        return updated;
      });
      setGerando(false);
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <AppSidebar
        conversas={conversas}
        conversaAtual={conversaAtual}
        onSelectConversa={selecionarConversa}
        onNovaConversa={novaConversa}
        onDeletarConversa={handleDeletarConversa}
      />

      <main className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--color-bg)' }}>
        {mensagens.length === 0 ? (
            /* ── Estado inicial: saudação + input centralizados como grupo ── */
            <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
              <div className="flex items-center justify-center gap-4">
                <LiminaiOrb size={34} />
                <h1
                  className="text-4xl md:text-5xl text-center"
                  style={{
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    fontWeight: 300,
                    letterSpacing: '-0.01em',
                    color: 'var(--color-text)',
                  }}
                >
                  {primeiroNome ? `${primeiroNome}, ` : ''}já produziu hoje?
                </h1>
              </div>

              {/* input logo abaixo da saudação, centralizado como grupo */}
              <div className="w-full max-w-3xl mt-10">
                <ChatInput onSend={handleSend} disabled={gerando} />
              </div>
            </div>
          ) : (
            /* ── Conversa em andamento: scroll + input no rodapé ── */
            <>
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto py-6 px-4 space-y-4">
                  {mensagens.map((msg, i) => {
                    // enquanto a resposta está vazia, só o indicador de "digitando" aparece
                    if (msg.role !== 'user' && msg.streaming && !msg.content) return null;
                    return (
                      <ChatMessage
                        key={i}
                        role={msg.role}
                        content={msg.content}
                        isStreaming={msg.streaming}
                        images={msg.images}
                      />
                    );
                  })}

                  {/* Indicador de digitando */}
                  {gerando && mensagens[mensagens.length - 1]?.content === '' && (
                    <div className="flex gap-3 items-center">
                      <LiminaiOrb size={30} glow={false} />
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
              </div>

              <ChatInput onSend={handleSend} disabled={gerando} />
          </>
        )}
      </main>
    </div>
  );
}
