/**
 * liminai — Página de Documentos
 * Home: seletor de setor (admin) + área de upload + 3 skew cards.
 * Subviews por card: gerência de acessos, PDFs existentes (lista),
 * tutorial. Acesso: gerente e admin.
 */

import { useEffect, useState } from 'react';
import AppSidebar from '../components/AppSidebar';
import DocumentUpload from '../components/DocumentUpload';
import SkewCard from '../components/magicui/SkewCard';
import {
  uploadDocumento, listarDocumentos, deletarDocumento,
  listarSetores, uploadImage, listImages, deleteImage, fetchImageBlob,
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
  const { user, isAdmin } = useAuth();
  const [view, setView] = useState('home'); // 'home' | 'pdfs' | 'redigir' | 'tutorial' | 'imagens'

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
    <div className="h-screen flex overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto min-w-0 p-6" style={{ background: 'var(--color-bg)' }}>
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
                  title="Escrever arquivos"
                  description="Preencha o esqueleto do padrão (front-matter, seções e perguntas), escolha o setor e baixe um .md pronto pra subir."
                  action="abrir"
                  gradientFrom="#c020a8"
                  gradientTo="#5828c8"
                  onClick={() => setView('redigir')}
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
                  description="Como escrever documentos que o atrIA recupera bem: front-matter, seções, aliases e checklist."
                  action="ler"
                  gradientFrom="#5828c8"
                  gradientTo="#c020a8"
                  onClick={() => setView('tutorial')}
                />
                <SkewCard
                  title="Imagens"
                  description="Suba diagramas, telas e fotos com uma descrição — a IA passa a anexá-las nas respostas quando o assunto surgir."
                  action="abrir"
                  gradientFrom="#00b8a8"
                  gradientTo="#c020a8"
                  onClick={() => setView('imagens')}
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
          {view === 'redigir' && (
            <RedigirArquivo
              setoresDisponiveis={setoresDisponiveis}
              isAdmin={isAdmin}
              user={user}
              setorAtivo={setorAtivo}
            />
          )}
          {view === 'tutorial' && <Tutorial />}
          {view === 'imagens' && <ImagensManager onMensagem={setMensagem} />}

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
// Subview: Escrever arquivos — formulário campo a campo → monta o .md no padrão
// ─────────────────────────────────────────────────────────────
const SECOES = [
  { id: 'visao-geral',    titulo: 'Visão geral',         dica: 'O que é e quando usar — a primeira frase resume o documento.' },
  { id: 'pre-requisitos', titulo: 'Pré-requisitos',      dica: 'O que precisa estar pronto antes de começar.' },
  { id: 'passos',         titulo: 'Passo a passo',       dica: 'O que clicar e onde, com o nome exato de botões/menus.' },
  { id: 'resultado',      titulo: 'Resultado esperado',  dica: 'O que o usuário deve ver quando deu certo.' },
  { id: 'perguntas',      titulo: 'Perguntas que este documento responde', dica: 'Perguntas reais, na linguagem do usuário (uma por linha).' },
  { id: 'observacoes',    titulo: 'Observações',         dica: 'Exceções, avisos e detalhes que não cabem acima.' },
];

const FM_INICIAL = {
  titulo: '', aliases: '', setor: '', sistema: '', tipo: '', criticidade: '',
  responsavel: '', revisado_em: '', valido_ate: '', versao: '1', fonte: '',
};

function montarMd(fm, secoes) {
  const q = (v) => `"${(v || '').trim()}"`;
  const aliases = (fm.aliases || '').split(',').map(s => s.trim()).filter(Boolean);
  const front = [
    '---',
    `titulo: ${q(fm.titulo)}`,
    `aliases: [${aliases.join(', ')}]`,
    `setor: ${fm.setor || '""'}`,
    `sistema: ${q(fm.sistema)}`,
    `tipo: ${fm.tipo || '""'}`,
    `criticidade: ${fm.criticidade || '""'}`,
    `responsavel: ${q(fm.responsavel)}`,
    `revisado_em: ${fm.revisado_em || 'AAAA-MM-DD'}`,
    `valido_ate: ${fm.valido_ate || 'AAAA-MM-DD'}`,
    `versao: ${fm.versao || 1}`,
    `fonte: ${q(fm.fonte)}`,
    '---',
  ].join('\n');
  const corpo = SECOES
    .map(s => `## ${s.titulo} {#${s.id}}\n\n${(secoes[s.id] || '').trim()}`)
    .join('\n\n');
  return `${front}\n\n${corpo}\n`;
}

function nomeArquivoDoMd(md) {
  const m = md.match(/^\s*titulo:\s*["']?(.+?)["']?\s*$/m);
  const base = (m ? m[1] : 'documento')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (base || 'documento') + '.md';
}

// ── Thumbnail de imagem (busca autenticada → objectURL, revoga no unmount) ──
function ImagemCard({ imagem, onDelete }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let ativo = true;
    let criado = null;
    fetchImageBlob(imagem.id)
      .then((u) => { if (ativo) { criado = u; setUrl(u); } else { URL.revokeObjectURL(u); } })
      .catch(() => {});
    return () => { ativo = false; if (criado) URL.revokeObjectURL(criado); };
  }, [imagem.id]);

  return (
    <div className="rounded-xl overflow-hidden border flex flex-col" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="aspect-video flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        {url
          ? <img src={url} alt={imagem.descricao} className="w-full h-full object-cover" />
          : <div className="w-full h-full animate-pulse" style={{ background: 'var(--color-surface-hover)' }} />}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{imagem.nome_arquivo}</p>
        <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{imagem.descricao}</p>
        <button
          onClick={() => onDelete(imagem)}
          className="mt-auto self-start text-xs px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

// ── Aba "Imagens": upload com descrição obrigatória + listagem do setor ──
function ImagensManager({ onMensagem }) {
  const [imagens, setImagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [arquivo, setArquivo] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      setImagens(await listImages());
    } catch (e) {
      onMensagem?.({ tipo: 'erro', texto: e.message || 'Erro ao listar imagens.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!arquivo) return;
    if (descricao.trim().length < 10) {
      onMensagem?.({ tipo: 'erro', texto: 'A descrição é obrigatória (mín. 10 caracteres).' });
      return;
    }
    setEnviando(true);
    try {
      await uploadImage(arquivo, descricao.trim());
      onMensagem?.({ tipo: 'sucesso', texto: 'Imagem indexada com sucesso.' });
      setArquivo(null);
      setDescricao('');
      await carregar();
    } catch (e) {
      onMensagem?.({ tipo: 'erro', texto: e.message || 'Erro ao subir a imagem.' });
    } finally {
      setEnviando(false);
    }
  }

  async function handleDelete(imagem) {
    if (!window.confirm(`Remover a imagem "${imagem.nome_arquivo}"?`)) return;
    try {
      await deleteImage(imagem.id);
      await carregar();
    } catch (e) {
      onMensagem?.({ tipo: 'erro', texto: e.message || 'Erro ao remover a imagem.' });
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <form onSubmit={handleUpload} className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div>
          <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Imagem</label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
            className="block w-full mt-1 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Descrição (obrigatória)</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            placeholder="descreva o que a imagem mostra — é assim que a IA encontra a imagem"
            className="block w-full mt-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={FIELD}
          />
        </div>
        <button
          type="submit"
          disabled={enviando || !arquivo}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{
            backgroundImage: 'radial-gradient(ellipse 210% 80% at 0% 100%, #c020a8 0%, transparent 48%), radial-gradient(ellipse 160% 210% at 100% 0%, #00b8a8 0%, transparent 48%), radial-gradient(ellipse 130% 120% at 50% 50%, #5828c8 0%, transparent 52%)',
            backgroundColor: '#180848',
            border: '1px solid rgba(0,184,168,0.28)',
          }}
        >
          {enviando ? 'Enviando…' : 'Subir imagem'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Carregando…</p>
      ) : imagens.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          Nenhuma imagem ainda. Suba diagramas/telas com descrição para a IA poder anexá-las.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {imagens.map((img) => (
            <ImagemCard key={img.id} imagem={img} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function RedigirArquivo({ setoresDisponiveis, isAdmin, user, setorAtivo }) {
  // Setor inicial: admin parte da base ativa; não-admin trava no próprio setor.
  const setorInicial = isAdmin ? (setorAtivo || '') : (user?.setor || '');
  const [fm, setFm] = useState({ ...FM_INICIAL, setor: setorInicial });
  const [secoes, setSecoes] = useState(() =>
    Object.fromEntries(SECOES.map(s => [s.id, ''])));
  const [copiado, setCopiado] = useState(false);

  // Fase 1.5 — imagens anexadas a este documento em redação.
  const [imagens, setImagens] = useState([]);
  const [imgFile, setImgFile] = useState(null);
  const [imgDesc, setImgDesc] = useState('');
  const [imgSecao, setImgSecao] = useState(SECOES[0].id); // default segue a última seção editada
  const [imgEnviando, setImgEnviando] = useState(false);
  const [imgErro, setImgErro] = useState('');

  const setF = (k, v) => setFm(p => ({ ...p, [k]: v }));
  const setS = (id, v) => { setSecoes(p => ({ ...p, [id]: v })); setImgSecao(id); };

  // Sobe a imagem AGORA (existe no setor antes do .md) e insere a referência
  // ![descrição](arquivo) na seção escolhida — a posição define o vínculo por chunk.
  async function anexarImagem(e) {
    e.preventDefault();
    setImgErro('');
    if (!imgFile) { setImgErro('Escolha uma imagem.'); return; }
    if (imgDesc.trim().length < 10) { setImgErro('A descrição é obrigatória (mín. 10 caracteres).'); return; }
    setImgEnviando(true);
    try {
      const img = await uploadImage(imgFile, imgDesc.trim());
      const ref = `![${imgDesc.trim()}](${img.nome_arquivo})`;
      // Inserção só acontece APÓS o upload dar certo (critério: upload falho → sem ref).
      setSecoes(prev => {
        const atual = prev[imgSecao] || '';
        return { ...prev, [imgSecao]: atual ? `${atual}\n\n${ref}` : ref };
      });
      setImagens(prev => [...prev, { ...img, secaoId: imgSecao }]);
      setImgFile(null);
      setImgDesc('');
    } catch (err) {
      setImgErro(err.message || 'Erro ao subir a imagem.');
    } finally {
      setImgEnviando(false);
    }
  }

  // Remove a imagem (DELETE) e tira a referência do texto de todas as seções.
  async function removerImagem(img) {
    try { await deleteImage(img.id); } catch { /* segue removendo a ref do texto */ }
    setSecoes(prev => {
      const out = { ...prev };
      for (const k of Object.keys(out)) {
        out[k] = (out[k] || '')
          .split('\n')
          .filter(l => !l.includes(`](${img.nome_arquivo})`))
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
      return out;
    });
    setImagens(prev => prev.filter(i => i.id !== img.id));
  }

  // Opções do seletor de setor (admin escolhe; não-admin fica no seu).
  const setores = isAdmin
    ? (setoresDisponiveis.length
        ? setoresDisponiveis.map(s => s.nome)
        : (user?.setor ? [user.setor] : []))
    : (user?.setor ? [user.setor] : []);

  const md = montarMd(fm, secoes);

  function limpar() {
    setFm({ ...FM_INICIAL, setor: setorInicial });
    setSecoes(Object.fromEntries(SECOES.map(s => [s.id, ''])));
  }

  function baixar() {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivoDoMd(md);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function copiar() {
    navigator.clipboard.writeText(md).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    }).catch(() => {});
  }

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="rounded-xl p-5"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-4 rounded-full" style={{ background: TEAL }} />
          <h3 className="text-sm font-semibold">Escrever arquivo no padrão</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Preencha campo a campo — cada balão já diz o que vai nele. O liminai monta o <Hl> .md</Hl> no
          padrão da base por baixo. Quando terminar, baixe e suba o arquivo na área de upload. Em
          dúvida sobre algum campo, veja o <Hl>Tutorial</Hl>.
        </p>
      </div>

      {/* Identificação — front-matter */}
      <div className="rounded-xl p-5 space-y-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <SubTitulo>Identificação</SubTitulo>
        <div className="grid sm:grid-cols-2 gap-4">
          <Campo full label="Título" dica="Nome específico e descritivo da tarefa.">
            <Txt value={fm.titulo} onChange={e => setF('titulo', e.target.value)}
              placeholder="Ex: Como reiniciar o servidor de impressão no Windows" />
          </Campo>
          <Campo full label="Aliases" dica="Outras formas de chamar o assunto — separe por vírgula.">
            <Txt value={fm.aliases} onChange={e => setF('aliases', e.target.value)}
              placeholder="reiniciar spooler, fila de impressão presa, impressora sumiu" />
          </Campo>

          <Campo label="Setor" dica="Área dona — define onde a busca procura.">
            <Sel value={fm.setor} onChange={e => setF('setor', e.target.value)} disabled={!isAdmin}>
              {!fm.setor && <option value="">selecione o setor</option>}
              {setores.map(nome => (
                <option key={nome} value={nome}>{setorLabel[nome] || nome}</option>
              ))}
            </Sel>
          </Campo>
          <Campo label="Sistema" dica="Sistema/produto a que se refere.">
            <Txt value={fm.sistema} onChange={e => setF('sistema', e.target.value)}
              placeholder="hubsoft" />
          </Campo>

          <Campo label="Tipo" dica="Natureza do documento.">
            <Sel value={fm.tipo} onChange={e => setF('tipo', e.target.value)}>
              <option value="">selecione</option>
              <option value="procedimento">procedimento</option>
              <option value="escalacao">escalação</option>
              <option value="faq">faq</option>
              <option value="politica">política</option>
              <option value="referencia">referência</option>
            </Sel>
          </Campo>
          <Campo label="Criticidade" dica="Quão sensível é o conteúdo.">
            <Sel value={fm.criticidade} onChange={e => setF('criticidade', e.target.value)}>
              <option value="">selecione</option>
              <option value="baixa">baixa</option>
              <option value="media">média</option>
              <option value="alta">alta</option>
              <option value="critica">crítica</option>
            </Sel>
          </Campo>

          <Campo label="Responsável" dica="Dono que mantém o conteúdo correto.">
            <Txt value={fm.responsavel} onChange={e => setF('responsavel', e.target.value)}
              placeholder="email@empresa.com" />
          </Campo>
          <Campo label="Versão" dica="Incrementa a cada revisão.">
            <Txt type="number" min="1" value={fm.versao}
              onChange={e => setF('versao', e.target.value)} />
          </Campo>

          <Campo label="Revisado em" dica="Data da última revisão.">
            <Txt type="date" value={fm.revisado_em}
              onChange={e => setF('revisado_em', e.target.value)} />
          </Campo>
          <Campo label="Válido até" dica="Prazo da próxima revisão.">
            <Txt type="date" value={fm.valido_ate}
              onChange={e => setF('valido_ate', e.target.value)} />
          </Campo>

          <Campo full label="Fonte" dica="Origem do conteúdo, quando houver.">
            <Txt value={fm.fonte} onChange={e => setF('fonte', e.target.value)}
              placeholder="wiki, sistema, pessoa" />
          </Campo>
        </div>
      </div>

      {/* Conteúdo — seções */}
      <div className="rounded-xl p-5 space-y-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <SubTitulo>Conteúdo</SubTitulo>
        {SECOES.map(s => (
          <Campo key={s.id} full label={s.titulo} dica={s.dica}>
            <Area value={secoes[s.id]} onChange={e => setS(s.id, e.target.value)} />
          </Campo>
        ))}
      </div>

      {/* Imagens do documento */}
      <div className="rounded-xl p-5 space-y-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <SubTitulo>Imagens</SubTitulo>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Anexe diagramas, telas ou fotos com uma descrição. A imagem é enviada na hora e a
          referência <Hl>![descrição](arquivo)</Hl> entra na seção escolhida — a IA passa a
          anexá-la quando <strong>aquele trecho</strong> for recuperado (vínculo por seção, não pelo
          documento inteiro).
        </p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          A imagem vai para a sua base ({setorLabel[user?.setor] || user?.setor}).
          {isAdmin && ' Como admin, sua base é a global — o vínculo automático com o .md fecha quando o documento também é da global.'}
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <Campo full label="Imagem">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
              onChange={e => setImgFile(e.target.files?.[0] || null)}
              className="block w-full text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            />
          </Campo>
          <Campo full label="Descrição (obrigatória)"
            dica="o que a imagem mostra? é assim que a IA encontra e decide compartilhar">
            <Area value={imgDesc} onChange={e => setImgDesc(e.target.value)} />
          </Campo>
          <Campo label="Inserir em qual seção?">
            <Sel value={imgSecao} onChange={e => setImgSecao(e.target.value)}>
              {SECOES.map(s => <option key={s.id} value={s.id}>{s.titulo}</option>)}
            </Sel>
          </Campo>
        </div>

        {imgErro && <p className="text-xs text-red-400">{imgErro}</p>}

        <button onClick={anexarImagem} disabled={imgEnviando || !imgFile}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundImage: IRIS_TILE.backgroundImage,
            backgroundColor: '#180848',
            border: '1px solid rgba(0,184,168,0.28)',
          }}>
          {imgEnviando ? 'Enviando…' : 'Anexar imagem'}
        </button>

        {imagens.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {imagens.map(img => (
              <EditorImagemThumb
                key={img.id}
                img={img}
                onRemove={removerImagem}
                secaoTitulo={SECOES.find(s => s.id === img.secaoId)?.titulo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={baixar}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{
            backgroundImage: IRIS_TILE.backgroundImage,
            backgroundColor: '#180848',
            border: '1px solid rgba(0,184,168,0.28)',
          }}>
          baixar .md
        </button>
        <button onClick={copiar}
          className="text-xs px-2.5 py-1.5 rounded-md transition-colors"
          style={{ border: '1px solid rgba(0,184,168,0.30)', color: TEAL }}>
          {copiado ? 'copiado ✓' : 'copiar markdown'}
        </button>
        <button onClick={limpar}
          className="text-xs px-2.5 py-1.5 rounded-md transition-colors"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
          limpar
        </button>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          depois é só subir o arquivo na área de upload.
        </span>
      </div>
    </div>
  );
}

// Thumbnail de imagem anexada no editor (fetch autenticado → objectURL).
function EditorImagemThumb({ img, onRemove, secaoTitulo }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let ativo = true;
    let criado = null;
    fetchImageBlob(img.id)
      .then((u) => { if (ativo) { criado = u; setUrl(u); } else { URL.revokeObjectURL(u); } })
      .catch(() => {});
    return () => { ativo = false; if (criado) URL.revokeObjectURL(criado); };
  }, [img.id]);

  return (
    <div className="rounded-lg overflow-hidden border flex flex-col" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
      <div className="aspect-video flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
        {url
          ? <img src={url} alt={img.descricao} className="w-full h-full object-cover" />
          : <div className="w-full h-full animate-pulse" style={{ background: 'var(--color-surface-hover)' }} />}
      </div>
      <div className="p-2">
        <p className="text-[11px] truncate" style={{ color: 'var(--color-text)' }}>{img.nome_arquivo}</p>
        {secaoTitulo && <p className="text-[10px] truncate" style={{ color: TEAL }}>↳ {secaoTitulo}</p>}
        <button onClick={() => onRemove(img)} className="mt-1 text-[11px] text-red-400 hover:underline">
          remover
        </button>
      </div>
    </div>
  );
}

// Rótulo + dica + balão (campo de preenchimento)
function Campo({ label, dica, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
        {label}
      </label>
      {dica && (
        <p className="text-[11px] mt-0.5 mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{dica}</p>
      )}
      {children}
    </div>
  );
}

function SubTitulo({ children }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 rounded-full" style={{ background: TEAL }} />
      <h4 className="text-sm font-semibold">{children}</h4>
    </div>
  );
}

const focarBalao = (e) => { e.target.style.borderColor = 'rgba(0,184,168,0.45)'; };
const desfocarBalao = (e) => { e.target.style.borderColor = 'var(--color-border)'; };

function Txt(props) {
  return (
    <input {...props}
      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
      style={FIELD} onFocus={focarBalao} onBlur={desfocarBalao} />
  );
}

function Sel({ disabled, children, ...props }) {
  return (
    <select {...props} disabled={disabled}
      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
      style={{ ...FIELD, opacity: disabled ? 0.7 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onFocus={focarBalao} onBlur={desfocarBalao}>
      {children}
    </select>
  );
}

function Area(props) {
  return (
    <textarea {...props} rows={4}
      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors resize-y"
      style={FIELD} onFocus={focarBalao} onBlur={desfocarBalao} />
  );
}

// ─────────────────────────────────────────────────────────────
const TEAL = 'rgba(0,184,168,0.9)';

// Tile iridescente do número — mesmo tratamento do avatar da IA no chat
const IRIS_TILE = {
  backgroundImage: [
    'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
    'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
    'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
  ].join(', '),
  backgroundColor: '#180848',
  border: '1px solid rgba(0,184,168,0.25)',
};

const FRONT_MATTER = [
  ['titulo',      'Nome específico e descritivo da tarefa',          'Texto específico — nunca genérico'],
  ['aliases',     'Outras formas de chamar o assunto',               'Termos que o usuário usaria na pergunta'],
  ['setor',       'Área dona — define onde a busca procura',         'noc, comercial, financeiro… ou global'],
  ['sistema',     'Sistema/produto a que se refere',                 'Texto (ex.: hubsoft)'],
  ['tipo',        'Natureza do documento',                           'procedimento · escalacao · faq · politica · referencia'],
  ['criticidade', 'Quão sensível é o conteúdo',                      'baixa · media · alta · critica'],
  ['responsavel', 'Dono que mantém o conteúdo correto',              'e-mail ou usuário'],
  ['revisado_em', 'Data da última revisão',                          'ISO AAAA-MM-DD'],
  ['valido_ate',  'Prazo da próxima revisão',                        'ISO AAAA-MM-DD'],
  ['versao',      'Controle de versão',                              'inteiro, incrementa a cada revisão'],
  ['fonte',       'Origem do conteúdo (quando houver)',              'Texto (ex.: wiki, sistema, pessoa)'],
];

const ESQUELETO = `---
titulo: ""
aliases: []
setor: ""
sistema: ""
tipo: ""            # procedimento | escalacao | faq | politica | referencia
criticidade: ""     # baixa | media | alta | critica
responsavel: ""
revisado_em: AAAA-MM-DD
valido_ate: AAAA-MM-DD
versao: 1
fonte: ""
---

## Visão geral {#visao-geral}

## Pré-requisitos {#pre-requisitos}

## Passo a passo {#passos}

## Resultado esperado {#resultado}

## Perguntas que este documento responde {#perguntas}

## Observações {#observacoes}`;

const GUIA = [
  {
    titulo: 'Um documento, um assunto',
    resumo: 'Um tema por arquivo, autocontido.',
    corpo: (
      <>
        <p>Cada documento trata de <Hl>um</Hl> assunto que faz sentido sozinho: um procedimento,
        uma política, uma dúvida. Se você está escrevendo “e também…” sobre outro tema, isso é
        outro documento.</p>
        <p>Manuais inteiros (dezenas de tarefas num arquivo) são o erro mais comum — quebre-os em
        vários documentos pequenos. Tamanho não é qualidade; foco é.</p>
      </>
    ),
  },
  {
    titulo: 'Anatomia: front-matter + corpo',
    resumo: 'Metadados YAML no topo + seções em Markdown.',
    corpo: (
      <>
        <p>Todo documento tem duas partes, nesta ordem:</p>
        <ol className="list-decimal pl-4 space-y-1">
          <li><Hl>Front-matter</Hl> — metadados no topo, entre linhas <Code>---</Code>, em YAML.</li>
          <li><Hl>Corpo</Hl> — seções em Markdown, cada uma começando com um título <Code>##</Code>.</li>
        </ol>
        <p>O front-matter alimenta a busca e a governança; o corpo é o que o usuário lê. Os dois são obrigatórios.</p>
      </>
    ),
  },
  {
    titulo: 'Front-matter campo a campo',
    resumo: 'Preencha todos os metadados com valores válidos.',
    corpo: (
      <>
        <FrontMatterTabela />
        <p className="pt-1">O <Code>responsavel</Code> é <Hl>dono, não autor</Hl>: quem garante que o
        documento continua certo, não necessariamente quem escreveu.</p>
      </>
    ),
  },
  {
    titulo: 'Seções que se leem sozinhas',
    resumo: 'Cada seção faz sentido isolada na busca.',
    corpo: (
      <ul className="list-disc pl-4 space-y-1">
        <li>Um título descritivo por seção (<Code>## Pré-requisitos</Code>, <Code>## Passo a passo</Code>).</li>
        <li>A primeira frase resume o que a seção resolve — ela é a âncora da busca.</li>
        <li>Termo por extenso na primeira menção, sigla entre parênteses depois.</li>
        <li>Nunca escreva “como dito acima” — quem lê pode ver só aquele trecho.</li>
      </ul>
    ),
  },
  {
    titulo: 'Passos executáveis',
    resumo: 'Diga o que clicar e onde — sem depender de imagem.',
    corpo: (
      <ol className="list-decimal pl-4 space-y-1">
        <li>Diga <Hl>o que clicar e onde</Hl>, com o nome exato do botão/menu (“clique em <strong>Avançar</strong>”).</li>
        <li>Não dependa de imagem — descreva a ação por completo. Imagem só ilustra.</li>
        <li>Corte enchimento (“garantindo que todas as etapas sejam cumpridas” não informa nada).</li>
        <li>Separe obrigatório de opcional com clareza.</li>
      </ol>
    ),
  },
  {
    titulo: 'Aliases e perguntas-semente',
    resumo: 'O ajuste de maior retorno na recuperação.',
    corpo: (
      <>
        <p>Aproxima o jeito de o usuário perguntar do jeito de o documento falar. Faça os dois:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>No front-matter, liste <Code>aliases</Code> — sinônimos e nomes informais.</li>
          <li>No corpo, inclua a seção <Hl>“Perguntas que este documento responde”</Hl> com perguntas reais.</li>
        </ul>
        <p>Essas perguntas são embedadas junto com o conteúdo — escreva como o usuário falaria, não em “documentês”.</p>
      </>
    ),
  },
  {
    titulo: 'IDs de seção estáveis',
    resumo: 'Cite uma seção sem a referência quebrar.',
    corpo: (
      <p>Dê um identificador a cada título: <Code>## Título {'{#id}'}</Code>. Isso permite citar e
      linkar uma seção específica sem quebrar quando o texto for editado. Use ids curtos e sem
      acento (<Code>{'{#passos}'}</Code>, <Code>{'{#campos}'}</Code>).</p>
    ),
  },
  {
    titulo: 'Resultado esperado',
    resumo: 'Feche com o que o usuário deve ver ao dar certo.',
    corpo: (
      <p>Sempre que fizer sentido, encerre com uma seção <Hl>Resultado esperado</Hl>: o que o usuário
      deve ver quando deu certo. Isso deixa o assistente confirmar sucesso, não só listar passos.</p>
    ),
  },
  {
    titulo: 'Prosa é documento, número é dado',
    resumo: 'Não cole planilhas dentro do documento.',
    corpo: (
      <p>Tabelas pequenas de referência (ex.: quais campos são obrigatórios) ajudam. Mas dados
      numéricos que mudam — valores, limites, SLAs, contagens — <Hl>não</Hl> entram no documento:
      vivem na fonte estruturada e são consultados à parte. Se você colou uma planilha, pare —
      aquilo é dado, não documento.</p>
    ),
  },
  {
    titulo: 'Erros que invalidam o documento',
    resumo: 'O que joga o documento fora.',
    corpo: (
      <ul className="list-disc pl-4 space-y-1">
        <li>Sem front-matter, ou com campos em branco.</li>
        <li>Vários assuntos no mesmo arquivo (monólito).</li>
        <li>Passo que só faz sentido com print.</li>
        <li>Conteúdo errado ou incompleto (confira contra a fonte oficial).</li>
        <li>Tratar como absoluto algo que é configurável.</li>
        <li>FAQ enfiada num procedimento — vira um documento <Code>tipo: faq</Code>.</li>
        <li>Versão chumbada no texto (“disponível na versão X”) sem virar metadado.</li>
      </ul>
    ),
  },
  {
    titulo: 'Ciclo de vida',
    resumo: 'Dono, prazo e versão única.',
    corpo: (
      <ul className="list-disc pl-4 space-y-1">
        <li>Todo documento tem <Hl>dono</Hl> (<Code>responsavel</Code>) e <Hl>prazo</Hl> (<Code>valido_ate</Code>).</li>
        <li>Ao revisar, atualize <Code>revisado_em</Code> e incremente <Code>versao</Code>.</li>
        <li>Versão antiga é <Hl>substituída, não acumulada</Hl> — nunca duas versões do mesmo assunto na base.</li>
      </ul>
    ),
  },
  {
    titulo: 'Checklist antes de publicar',
    resumo: '8 perguntas antes de subir o documento.',
    corpo: (
      <ol className="list-decimal pl-4 space-y-1">
        <li>Front-matter completo e com valores válidos?</li>
        <li>Um único assunto, autocontido?</li>
        <li>Cada seção faz sentido lida sozinha?</li>
        <li>Passos executáveis, sem imagem, sem enchimento?</li>
        <li>Conteúdo conferido contra a fonte oficial?</li>
        <li><Code>aliases</Code> e “Perguntas que este documento responde” na linguagem do usuário?</li>
        <li>Títulos com <Code>{'{#id}'}</Code> estável?</li>
        <li>Nenhum dado numérico que deveria estar na fonte estruturada?</li>
      </ol>
    ),
  },
  {
    titulo: 'Esqueleto para copiar',
    resumo: 'Comece um documento novo a partir deste template.',
    corpo: <Esqueleto />,
  },
];

function Tutorial() {
  const [aberta, setAberta] = useState(0);

  return (
    <div className="space-y-4">
      {/* Lead — por que isso importa */}
      <div className="rounded-xl p-5"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-4 rounded-full" style={{ background: TEAL }} />
          <h3 className="text-sm font-semibold">Como escrever documentos para o atrIA</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Num assistente de busca, a qualidade da resposta é decidida pela <Hl>estrutura do
          documento</Hl>, não pelo algoritmo. Um documento bem escrito é recuperado e respondido
          com precisão; um bagunçado vira resposta vaga. Seguir este padrão é o que faz o
          assistente funcionar.
        </p>
      </div>

      {/* Acordeão do guia */}
      <div className="space-y-2">
        {GUIA.map((sec, i) => (
          <AccordionItem
            key={sec.titulo}
            n={i + 1}
            titulo={sec.titulo}
            resumo={sec.resumo}
            aberta={aberta === i}
            onToggle={() => setAberta(aberta === i ? -1 : i)}
          >
            {sec.corpo}
          </AccordionItem>
        ))}
      </div>
    </div>
  );
}

function AccordionItem({ n, titulo, resumo, aberta, onToggle, children }) {
  return (
    <div className="rounded-xl overflow-hidden transition-colors"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${aberta ? 'rgba(0,184,168,0.30)' : 'var(--color-border)'}`,
      }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white shadow-md"
          style={IRIS_TILE}>
          {n}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold leading-tight">{titulo}</h4>
          {!aberta && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{resumo}</p>
          )}
        </div>
        <svg className="w-4 h-4 shrink-0 transition-transform"
          style={{ color: TEAL, transform: aberta ? 'rotate(180deg)' : 'none' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {aberta && (
        <div className="px-4 pb-4 pl-[60px] text-sm space-y-2 animate-fade-in"
          style={{ color: 'var(--color-text-muted)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Hl({ children }) {
  return <span style={{ color: TEAL, fontWeight: 600 }}>{children}</span>;
}

function Code({ children }) {
  return (
    <code className="px-1 py-0.5 rounded text-[0.85em] font-mono"
      style={{ background: 'var(--color-bg)', color: TEAL }}>
      {children}
    </code>
  );
}

function FrontMatterTabela() {
  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: 'var(--color-bg)' }}>
            <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--color-text)' }}>Campo</th>
            <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--color-text)' }}>O que é</th>
            <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--color-text)' }}>Valores</th>
          </tr>
        </thead>
        <tbody>
          {FRONT_MATTER.map(([campo, oque, val]) => (
            <tr key={campo} style={{ borderTop: '1px solid var(--color-border)' }}>
              <td className="px-3 py-2 align-top whitespace-nowrap"><Code>{campo}</Code></td>
              <td className="px-3 py-2 align-top">{oque}</td>
              <td className="px-3 py-2 align-top">{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Esqueleto() {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(ESQUELETO).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    }).catch(() => {});
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button onClick={copiar}
          className="text-xs px-2.5 py-1 rounded-md transition-colors"
          style={{ border: '1px solid rgba(0,184,168,0.30)', color: TEAL }}>
          {copiado ? 'copiado ✓' : 'copiar esqueleto'}
        </button>
      </div>
      <pre className="text-[11px] leading-relaxed overflow-x-auto rounded-lg p-3 font-mono"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
        {ESQUELETO}
      </pre>
    </div>
  );
}
