/**
 * liminai — Página de Documentos
 * Home: seletor de setor (admin) + área de upload + 3 skew cards.
 * Subviews por card: gerência de acessos, PDFs existentes (lista),
 * tutorial. Acesso: lider_setor e admin.
 */

import { useEffect, useState } from 'react';
import Header from '../components/Header';
import DocumentUpload from '../components/DocumentUpload';
import SkewCard from '../components/magicui/SkewCard';
import {
  uploadDocumento, listarDocumentos, deletarDocumento,
  listarUsuarios, listarSetores,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const FIELD = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
};

const setorLabel = {
  noc: 'NOC', suporte_n2: 'Suporte N2', suporte_n3: 'Suporte N3',
  financeiro: 'Financeiro', diretoria: 'Diretoria', vendas: 'Vendas',
  marketing: 'Marketing', vendas_dc: 'Vendas DC', infra: 'Infraestrutura',
  suporte_rua: 'Suporte Rua', global: 'Global (admin)',
};

export default function Documents() {
  const { user, isAdmin, isLiderSetor } = useAuth();
  const [view, setView] = useState('home'); // 'home' | 'pdfs' | 'acessos' | 'tutorial'

  // Setor "ativo" — admin pode trocar; outros ficam fixos no setor do JWT
  const [setorAtivo, setSetorAtivo] = useState(user?.setor || '');
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);

  // Estado do upload (vive no home)
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [metadados, setMetadados] = useState({ titulo: '', descricao: '', tags: '' });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mensagem, setMensagem] = useState(null);

  // Documentos (compartilhado entre home e Card 2)
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Carrega lista de setores apenas pra admin
  useEffect(() => {
    if (!isAdmin) return;
    listarSetores().then(setSetoresDisponiveis).catch(() => {});
  }, [isAdmin]);

  // Recarrega documentos sempre que muda o setor ativo
  useEffect(() => {
    setLoadingDocs(true);
    // só admin manda setor (backend pode ignorar p/ não-admin)
    listarDocumentos(isAdmin ? setorAtivo : undefined)
      .then(setDocumentos)
      .catch(err => console.error('listar:', err))
      .finally(() => setLoadingDocs(false));
  }, [setorAtivo, isAdmin]);

  function handleSelecionar(file) {
    setArquivoSelecionado(file);
    const nomeSemExtensao = file.name.replace(/\.[^/.]+$/, '');
    setMetadados({ titulo: nomeSemExtensao, descricao: '', tags: '' });
    setMensagem(null);
  }

  function handleClearArquivo() {
    setArquivoSelecionado(null);
    setMetadados({ titulo: '', descricao: '', tags: '' });
  }

  async function handleSubmitUpload(e) {
    e.preventDefault();
    setUploading(true);
    setProgress(0);
    setMensagem(null);
    const meta = {
      titulo: metadados.titulo.trim() || arquivoSelecionado.name,
      descricao: metadados.descricao.trim(),
      tags: metadados.tags.trim(),
    };
    try {
      const result = await uploadDocumento(
        arquivoSelecionado, meta, setProgress,
        isAdmin ? setorAtivo : undefined,
      );
      setMensagem({
        tipo: 'sucesso',
        texto: `"${result.titulo || result.nome_arquivo}" indexado em ${setorLabel[setorAtivo] || setorAtivo} (${result.total_chunks} chunks).`,
      });
      handleClearArquivo();
      const docs = await listarDocumentos(isAdmin ? setorAtivo : undefined);
      setDocumentos(docs);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao processar o documento.' });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDeletar(documentId, nomeArquivo) {
    if (!window.confirm(`Tem certeza que deseja remover "${nomeArquivo}"?`)) return;
    try {
      await deletarDocumento(documentId);
      setMensagem({ tipo: 'sucesso', texto: `"${nomeArquivo}" removido com sucesso.` });
      const docs = await listarDocumentos(isAdmin ? setorAtivo : undefined);
      setDocumentos(docs);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao remover documento.' });
    }
  }

  const setorAtivoLabel = setorLabel[setorAtivo] || setorAtivo || '—';

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Cabeçalho */}
          <div className="flex items-start gap-3 flex-wrap">
            {view !== 'home' && (
              <button
                onClick={() => setView('home')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mt-1"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                ← voltar
              </button>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Documentos</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Base de conhecimento{isAdmin ? '' : ' do setor '}
                {!isAdmin && (
                  <span className="font-medium" style={{ color: 'rgba(0,184,168,0.9)' }}>
                    {setorLabel[user?.setor] || user?.setor}
                  </span>
                )}
              </p>
            </div>

            {/* Seletor de setor (apenas admin) */}
            {isAdmin && (
              <div className="flex flex-col gap-1 min-w-[220px]">
                <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                  Base ativa
                </label>
                <select
                  value={setorAtivo}
                  onChange={(e) => setSetorAtivo(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                  style={FIELD}
                >
                  {setoresDisponiveis.length === 0 ? (
                    <option value={user?.setor || ''}>{setorLabel[user?.setor] || user?.setor || 'global'}</option>
                  ) : setoresDisponiveis.map(s => (
                    <option key={s.nome} value={s.nome}>{setorLabel[s.nome] || s.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Mensagem global */}
          {mensagem && (
            <div className={`rounded-xl px-4 py-3 text-sm animate-fade-in ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {mensagem.texto}
            </div>
          )}

          {/* ── Home view ── */}
          {view === 'home' && (
            <>
              {/* Área de upload (de volta no topo) */}
              <DocumentUpload
                onFileSelect={handleSelecionar}
                selectedFile={arquivoSelecionado}
                onClearFile={handleClearArquivo}
                uploading={uploading}
                progress={progress}
              />

              {arquivoSelecionado && !uploading && (
                <form onSubmit={handleSubmitUpload}
                  className="rounded-xl p-5 space-y-4 animate-fade-in"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-4 rounded-full" style={{ background: 'rgba(0,184,168,0.7)' }} />
                    <h3 className="text-sm font-semibold">Informações do documento</h3>
                    {isAdmin && (
                      <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        indexar em <span style={{ color: 'rgba(0,184,168,0.9)' }}>{setorAtivoLabel}</span>
                      </span>
                    )}
                  </div>
                  <FormField label="Título" required>
                    <input type="text" required value={metadados.titulo}
                      onChange={e => setMetadados(m => ({ ...m, titulo: e.target.value }))}
                      placeholder="Ex: Procedimento de Escalação NOC"
                      className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                      style={FIELD}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,184,168,0.45)'}
                      onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                  </FormField>
                  <FormField label="Descrição">
                    <textarea value={metadados.descricao}
                      onChange={e => setMetadados(m => ({ ...m, descricao: e.target.value }))}
                      placeholder="Descreva o que este documento contém..."
                      rows={3}
                      className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors resize-none"
                      style={FIELD}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,184,168,0.45)'}
                      onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                  </FormField>
                  <FormField label="Tags">
                    <input type="text" value={metadados.tags}
                      onChange={e => setMetadados(m => ({ ...m, tags: e.target.value }))}
                      placeholder="escalação, noc, procedimento"
                      className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                      style={FIELD}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,184,168,0.45)'}
                      onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                  </FormField>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleClearArquivo}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      Cancelar
                    </button>
                    <button type="submit"
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{
                        backgroundImage: [
                          'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
                          'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
                          'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
                        ].join(', '),
                        backgroundColor: '#180848',
                        border: '1px solid rgba(0,184,168,0.28)',
                      }}>
                      Indexar documento
                    </button>
                  </div>
                </form>
              )}

              {/* 3 cards */}
              <div className="flex flex-wrap justify-center pt-4">
                <SkewCard
                  title="Gerência de acessos"
                  description={`Veja quem do setor ${setorAtivoLabel} pode consultar os documentos indexados.`}
                  action="abrir"
                  gradientFrom="#e040a8"
                  gradientTo="#c020a8"
                  onClick={() => setView('acessos')}
                />
                <SkewCard
                  title="PDFs já existentes"
                  description="Lista, edição de metadados e remoção dos documentos da base ativa."
                  action="abrir"
                  gradientFrom="#00b8a8"
                  gradientTo="#5828c8"
                  onClick={() => setView('pdfs')}
                />
                <SkewCard
                  title="Tutorial"
                  description="Como indexar PDFs, escrever boas descrições e usar tags pra orientar o modelo."
                  action="ler"
                  gradientFrom="#5828c8"
                  gradientTo="#3a1488"
                  onClick={() => setView('tutorial')}
                />
              </div>
            </>
          )}

          {/* ── Subviews ── */}
          {view === 'pdfs' && (
            <PdfsExistentes
              documentos={documentos}
              loading={loadingDocs}
              onDelete={handleDeletar}
            />
          )}
          {view === 'acessos' && (
            <GerenciaAcessos
              isPrivileged={isAdmin || isLiderSetor}
              setor={setorAtivo}
            />
          )}
          {view === 'tutorial' && <Tutorial />}

        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function FormField({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label} {required && <span style={{ color: 'rgba(0,184,168,0.8)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subview: PDFs existentes (apenas listagem + remoção/edit)
// ─────────────────────────────────────────────────────────────
function PdfsExistentes({ documentos, loading, onDelete }) {
  const [editando, setEditando] = useState(null);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'rgba(0,184,168,0.5)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (documentos.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Nenhum documento nesta base ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documentos.map((doc) => (
        <DocItem key={doc.document_id} doc={doc}
          onEdit={() => setEditando(doc)}
          onDelete={() => onDelete(doc.document_id, doc.titulo || doc.nome_arquivo)}
        />
      ))}
      {editando && <EditMetadataModal doc={editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

function DocItem({ doc, onEdit, onDelete }) {
  return (
    <div className="px-4 py-3 rounded-xl transition-colors group"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: 'var(--color-surface-hover)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{ color: 'rgba(0,184,168,0.8)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{doc.titulo || doc.nome_arquivo}</p>
            {doc.titulo && doc.titulo !== doc.nome_arquivo && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{doc.nome_arquivo}</p>
            )}
            {doc.descricao && (
              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{doc.descricao}</p>
            )}
            {doc.tags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {doc.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: 'rgba(0,184,168,0.1)', color: 'rgba(0,184,168,0.8)' }}>{tag}</span>
                ))}
              </div>
            )}
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{doc.total_chunks} chunks indexados</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'rgba(0,184,168,0.8)' }} title="editar metadados">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
            style={{ color: 'rgba(248,113,113,0.7)' }} title="remover">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function EditMetadataModal({ doc, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-xl p-6 space-y-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-lg font-bold">Editar metadados</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          A edição direta de metadados ainda não tem endpoint no backend. Por enquanto,
          remova o documento e re-indexe com o título, descrição e tags atualizados.
        </p>
        <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <p><span style={{ color: 'var(--color-text-muted)' }}>Título:</span> {doc.titulo || '—'}</p>
          <p><span style={{ color: 'var(--color-text-muted)' }}>Arquivo:</span> {doc.nome_arquivo}</p>
          {doc.descricao && <p><span style={{ color: 'var(--color-text-muted)' }}>Descrição:</span> {doc.descricao}</p>}
          {doc.tags && <p><span style={{ color: 'var(--color-text-muted)' }}>Tags:</span> {doc.tags}</p>}
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function GerenciaAcessos({ isPrivileged, setor }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!isPrivileged) { setLoading(false); return; }
    setLoading(true);
    listarUsuarios()
      .then((all) => setUsuarios(all.filter(u => u.setor === setor)))
      .catch(err => setErro(err.message || 'Falha ao listar usuários do setor.'))
      .finally(() => setLoading(false));
  }, [isPrivileged, setor]);

  if (!isPrivileged) {
    return (
      <div className="rounded-xl p-6 text-sm"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
        Você não tem permissão para gerenciar acessos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm">
          Usuários com setor <span className="font-semibold" style={{ color: 'rgba(0,184,168,0.9)' }}>
            {setorLabel[setor] || setor}
          </span> têm acesso de consulta a esta base.
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Para mudar o setor de um usuário, vá em <span className="font-medium">admin → usuários</span>.
        </p>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Carregando…</p>}
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {!loading && !erro && (
        <div className="space-y-2">
          {usuarios.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nenhum usuário neste setor.</p>
          ) : usuarios.map(u => (
            <div key={u.id} className="px-4 py-3 rounded-xl flex items-center justify-between"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-medium">{u.nome_completo || u.username}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>@{u.username} · {u.role}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full"
                style={{ background: 'rgba(0,184,168,0.10)', color: 'rgba(0,184,168,0.85)' }}>
                acesso ativo
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function Tutorial() {
  return (
    <div className="rounded-xl p-6 space-y-5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <Step n={1} title="Indexar um PDF">
        Na tela inicial de Documentos, arraste o arquivo (ou clique em selecionar). O PDF é
        chunked, embeddado e armazenado na base do setor ativo.
      </Step>
      <Step n={2} title="Escrever um bom título">
        O título aparece nas citações de fonte. Use algo descritivo, ex.
        <em> “Procedimento de Escalação NOC — turno noturno”</em>.
      </Step>
      <Step n={3} title="Descrição é contexto semântico">
        Descreva quando este documento deve ser consultado. Isso melhora o roteamento do RAG —
        o modelo escolhe esta fonte nas perguntas certas.
      </Step>
      <Step n={4} title="Tags = filtros">
        Vírgula-separadas. Ex. <em>escalação, noc, plantão</em>. Servem pra filtragem futura.
      </Step>
      <Step n={5} title="Editar/remover">
        No card <em>PDFs já existentes</em>, hover na linha do documento mostra os botões de
        editar e remover.
      </Step>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
            'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
            'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
          ].join(', '),
          backgroundColor: '#180848',
          border: '1px solid rgba(0,184,168,0.28)',
        }}>
        {n}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold mb-1">{title}</h4>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{children}</p>
      </div>
    </div>
  );
}
