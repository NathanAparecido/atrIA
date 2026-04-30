/**
 * liminai — Página de Documentos
 * Upload com metadados, listagem e deleção de documentos por setor.
 * Acesso: lider_setor e admin.
 */

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import DocumentUpload from '../components/DocumentUpload';
import { uploadDocumento, listarDocumentos, deletarDocumento } from '../lib/api';
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
  suporte_rua: 'Suporte Rua', global: 'Global',
};

export default function Documents() {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mensagem, setMensagem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Arquivo aguardando metadados antes do upload
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [metadados, setMetadados] = useState({ titulo: '', descricao: '', tags: '' });

  useEffect(() => {
    carregarDocumentos();
  }, []);

  async function carregarDocumentos() {
    try {
      const docs = await listarDocumentos();
      setDocumentos(docs);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelecionarArquivo(file) {
    setArquivoSelecionado(file);
    // Pré-preenche o título com o nome do arquivo sem extensão
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
      const result = await uploadDocumento(arquivoSelecionado, meta, setProgress);
      setMensagem({
        tipo: 'sucesso',
        texto: `"${result.titulo || result.nome_arquivo}" indexado com sucesso (${result.total_chunks} chunks).`,
      });
      setArquivoSelecionado(null);
      setMetadados({ titulo: '', descricao: '', tags: '' });
      await carregarDocumentos();
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
      await carregarDocumentos();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao remover documento.' });
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Título */}
          <div>
            <h2 className="text-2xl font-bold">Documentos</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Base de conhecimento do setor{' '}
              <span className="font-medium" style={{ color: 'rgba(0,184,168,0.9)' }}>
                {setorLabel[user?.setor] || user?.setor}
              </span>
            </p>
          </div>

          {/* Mensagem de feedback */}
          {mensagem && (
            <div className={`rounded-xl px-4 py-3 text-sm animate-fade-in ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {mensagem.texto}
            </div>
          )}

          {/* ── Seleção de arquivo ── */}
          <DocumentUpload
            onFileSelect={handleSelecionarArquivo}
            selectedFile={arquivoSelecionado}
            onClearFile={handleClearArquivo}
            uploading={uploading}
            progress={progress}
          />

          {/* ── Formulário de metadados (aparece após selecionar arquivo) ── */}
          {arquivoSelecionado && !uploading && (
            <form
              onSubmit={handleSubmitUpload}
              className="rounded-xl p-5 space-y-4 animate-fade-in"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 rounded-full" style={{ background: 'rgba(0,184,168,0.7)' }} />
                <h3 className="text-sm font-semibold">Informações do documento</h3>
                <p className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                  Ajudam o modelo a identificar e citar este documento
                </p>
              </div>

              {/* Título */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Título <span style={{ color: 'rgba(0,184,168,0.8)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={metadados.titulo}
                  onChange={e => setMetadados(m => ({ ...m, titulo: e.target.value }))}
                  required
                  placeholder="Ex: Procedimento de Escalação NOC"
                  className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                  style={FIELD}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,184,168,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Nome exibido nas citações de fonte nas respostas do modelo.
                </p>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Descrição
                </label>
                <textarea
                  value={metadados.descricao}
                  onChange={e => setMetadados(m => ({ ...m, descricao: e.target.value }))}
                  placeholder="Descreva o que este documento contém e quando deve ser consultado..."
                  rows={3}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors resize-none"
                  style={FIELD}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,184,168,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Contexto semântico — ajuda o modelo a escolher este documento nas perguntas certas.
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Tags
                </label>
                <input
                  type="text"
                  value={metadados.tags}
                  onChange={e => setMetadados(m => ({ ...m, tags: e.target.value }))}
                  placeholder="escalação, noc, procedimento, incidente"
                  className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                  style={FIELD}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,184,168,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Palavras-chave separadas por vírgula para filtragem e roteamento.
                </p>
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClearArquivo}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{
                    backgroundImage: [
                      'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
                      'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
                      'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
                    ].join(', '),
                    backgroundColor: '#180848',
                    border: '1px solid rgba(0,184,168,0.28)',
                  }}
                >
                  Indexar documento
                </button>
              </div>
            </form>
          )}

          {/* ── Lista de documentos indexados ── */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Documentos Indexados</h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'rgba(0,184,168,0.5)', borderTopColor: 'transparent' }} />
              </div>
            ) : documentos.length === 0 ? (
              <div className="text-center py-12 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Nenhum documento indexado neste setor.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentos.map((doc) => (
                  <div
                    key={doc.document_id}
                    className="px-4 py-3 rounded-xl transition-colors group"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                          style={{ background: 'var(--color-surface-hover)' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{ color: 'rgba(0,184,168,0.8)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          {/* Título principal */}
                          <p className="text-sm font-medium">{doc.titulo || doc.nome_arquivo}</p>

                          {/* Nome do arquivo (se diferente do título) */}
                          {doc.titulo && doc.titulo !== doc.nome_arquivo && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                              {doc.nome_arquivo}
                            </p>
                          )}

                          {/* Descrição */}
                          {doc.descricao && (
                            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                              {doc.descricao}
                            </p>
                          )}

                          {/* Tags */}
                          {doc.tags && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doc.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full text-xs"
                                  style={{ background: 'rgba(0,184,168,0.1)', color: 'rgba(0,184,168,0.8)' }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                            {doc.total_chunks} chunks indexados
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeletar(doc.document_id, doc.titulo || doc.nome_arquivo)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 transition-all flex-shrink-0"
                        style={{ color: 'rgba(248,113,113,0.7)' }}
                        title="Remover documento"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
