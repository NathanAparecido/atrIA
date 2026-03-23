/**
 * CorpAI — Página de Documentos
 * Upload drag & drop, listagem e deleção de documentos por setor.
 * Acesso: lider_setor e admin.
 */

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import DocumentUpload from '../components/DocumentUpload';
import { uploadDocumento, listarDocumentos, deletarDocumento } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function Documents() {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mensagem, setMensagem] = useState(null); // { tipo: 'sucesso' | 'erro', texto: '...' }
  const [loading, setLoading] = useState(true);

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

  async function handleUpload(file) {
    setUploading(true);
    setProgress(0);
    setMensagem(null);

    try {
      const result = await uploadDocumento(file, setProgress);
      setMensagem({
        tipo: 'sucesso',
        texto: `"${result.nome_arquivo}" indexado com sucesso (${result.total_chunks} chunks).`,
      });
      await carregarDocumentos();
    } catch (err) {
      setMensagem({
        tipo: 'erro',
        texto: err.message || 'Erro ao processar o documento.',
      });
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

  const setorLabel = {
    noc: 'NOC', suporte_n2: 'Suporte N2', suporte_n3: 'Suporte N3',
    financeiro: 'Financeiro', diretoria: 'Diretoria', vendas: 'Vendas',
    marketing: 'Marketing', vendas_dc: 'Vendas DC', infra: 'Infraestrutura',
    suporte_rua: 'Suporte Rua', global: 'Global',
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Título */}
          <div>
            <h2 className="text-2xl font-bold">Documentos</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Gerencie os documentos da base de conhecimento do setor{' '}
              <span className="text-corpai-400 font-medium">{setorLabel[user?.setor] || user?.setor}</span>
            </p>
          </div>

          {/* Mensagem de feedback */}
          {mensagem && (
            <div
              className={`rounded-xl px-4 py-3 text-sm animate-fade-in ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              {mensagem.texto}
            </div>
          )}

          {/* Upload */}
          <DocumentUpload
            onUpload={handleUpload}
            uploading={uploading}
            progress={progress}
          />

          {/* Lista de documentos */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Documentos Indexados</h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-corpai-500 border-t-transparent rounded-full animate-spin" />
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
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors group"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--color-surface-hover)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-corpai-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.nome_arquivo}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {doc.total_chunks} chunks indexados
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletar(doc.document_id, doc.nome_arquivo)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-all"
                      title="Remover documento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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
