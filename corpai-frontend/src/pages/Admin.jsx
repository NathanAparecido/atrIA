/**
 * CorpAI — Painel Admin
 * Gestão de usuários, setores e status do sistema.
 * Acesso: apenas admin.
 */

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import {
  listarUsuarios, criarUsuario, editarUsuario, deletarUsuario,
  listarSetores, healthCheck,
} from '../lib/api';

const SETORES = [
  'noc', 'suporte_n2', 'suporte_n3', 'financeiro', 'diretoria',
  'vendas', 'marketing', 'vendas_dc', 'infra', 'suporte_rua', 'global',
];

// 'global' é um namespace compartilhado invisível — todos os usuários já têm acesso
// automaticamente. Não deve aparecer no formulário de criação/edição de usuários.
const SETORES_FORM = SETORES.filter((s) => s !== 'global');

const ROLES = ['colaborador', 'lider_setor', 'admin'];

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const TABS = isAdmin ? ['Usuários', 'Setores', 'Sistema'] : ['Usuários'];
  const [tabAtiva, setTabAtiva] = useState('Usuários');
  const [usuarios, setUsuarios] = useState([]);
  const [setores, setSetores] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal de criar/editar usuário
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', nome_completo: '', setor: 'noc', role: 'colaborador' });
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [usrs, strs, hl] = await Promise.all([
        listarUsuarios(),
        listarSetores(),
        healthCheck().catch(() => null),
      ]);
      setUsuarios(usrs);
      setSetores(strs);
      setHealth(hl);
    } catch (err) {
      console.error('Erro ao carregar dados admin:', err);
    } finally {
      setLoading(false);
    }
  }

  function abrirModalCriar() {
    setEditando(null);
    setForm({
      username: '', password: '', nome_completo: '',
      setor: isAdmin ? 'noc' : user.setor,
      role: 'colaborador',
    });
    setErro('');
    setModalAberto(true);
  }

  function abrirModalEditar(user) {
    setEditando(user);
    setForm({ username: user.username, password: '', nome_completo: user.nome_completo, setor: user.setor, role: user.role });
    setErro('');
    setModalAberto(true);
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    setErro('');

    try {
      if (editando) {
        const data = { nome_completo: form.nome_completo, setor: form.setor, role: form.role };
        if (form.password) data.password = form.password;
        await editarUsuario(editando.id, data);
      } else {
        if (!form.password) { setErro('Senha é obrigatória.'); return; }
        await criarUsuario(form);
      }
      setModalAberto(false);
      await carregarDados();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleDeletar(user) {
    if (!window.confirm(`Tem certeza que deseja remover "${user.username}"?`)) return;
    try {
      await deletarUsuario(user.id);
      await carregarDados();
    } catch (err) {
      alert(err.message);
    }
  }

  const setorLabel = {
    noc: 'NOC', suporte_n2: 'Suporte N2', suporte_n3: 'Suporte N3',
    financeiro: 'Financeiro', diretoria: 'Diretoria', vendas: 'Vendas',
    marketing: 'Marketing', vendas_dc: 'Vendas DC', infra: 'Infraestrutura',
    suporte_rua: 'Suporte Rua', global: 'Global',
  };

  const baseDomain = window.location.hostname;
  const externalLinks = [
    { nome: 'Grafana', url: `https://grafana.${baseDomain}`, cor: 'bg-orange-500' },
    { nome: 'Zabbix', url: `https://zabbix.${baseDomain}`, cor: 'bg-red-500' },
    { nome: 'Paperless-NGX', url: `https://paperless.${baseDomain}`, cor: 'bg-green-500' },
    { nome: 'Dify', url: `https://dify.${baseDomain}`, cor: 'bg-blue-500' },
  ];

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Título */}
          <h2 className="text-2xl font-bold">
            {isAdmin ? 'Painel de Administração' : `Gestão do Setor — ${setorLabel[user?.setor] || user?.setor}`}
          </h2>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface)' }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setTabAtiva(tab)}
                className="px-4 py-2 text-sm rounded-lg font-medium transition-all"
                style={tabAtiva === tab ? {
                  backgroundImage: [
                    'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
                    'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
                    'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
                  ].join(', '),
                  backgroundColor: '#180848',
                  color: '#ffffff',
                } : { color: 'var(--color-text-muted)' }}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'rgba(0,184,168,0.5)', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <>
              {/* ═══ ABA: USUÁRIOS ═══ */}
              {tabAtiva === 'Usuários' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {usuarios.length} usuário(s) cadastrado(s)
                    </p>
                    <button onClick={abrirModalCriar} className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                      style={{
                        backgroundImage: [
                          'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
                          'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
                          'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
                        ].join(', '),
                        backgroundColor: '#180848',
                        border: '1px solid rgba(0,184,168,0.28)',
                      }}>
                      + Novo Usuário
                    </button>
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'var(--color-surface)' }}>
                          <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Usuário</th>
                          <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Nome</th>
                          <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Setor</th>
                          <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Papel</th>
                          <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                          <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.map(u => (
                          <tr key={u.id} className="border-t transition-colors" style={{ borderColor: 'var(--color-border)' }}>
                            <td className="px-4 py-3 font-medium">{u.username}</td>
                            <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{u.nome_completo}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ background: 'rgba(0,184,168,0.12)', color: 'rgba(0,184,168,0.9)' }}>
                                {setorLabel[u.setor] || u.setor}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                                u.role === 'lider_setor' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-dark-600/50 text-dark-300'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center gap-1.5 text-xs ${u.ativo ? 'text-green-400' : 'text-red-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${u.ativo ? 'bg-green-400' : 'bg-red-400'}`} />
                                {u.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => abrirModalEditar(u)} className="px-3 py-1 text-xs rounded-md transition-colors hover:bg-white/5" style={{ color: 'rgba(0,184,168,0.9)' }}>
                                Editar
                              </button>
                              <button onClick={() => handleDeletar(u)} className="px-3 py-1 text-xs rounded-md hover:bg-red-500/10 text-red-400 transition-colors ml-1">
                                Excluir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ═══ ABA: SETORES ═══ */}
              {tabAtiva === 'Setores' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {setores.map(s => (
                    <div key={s.nome} className="rounded-xl p-4 transition-colors"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'rgba(0,184,168,0.9)' }}>{setorLabel[s.nome] || s.nome}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        namespace: <code className="text-xs">{s.nome}</code>
                      </p>
                      <p className="text-2xl font-bold mt-3">{s.total_usuarios}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>usuários</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ═══ ABA: SISTEMA ═══ */}
              {tabAtiva === 'Sistema' && (
                <div className="space-y-6">
                  {/* Status dos serviços */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Status dos Serviços</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {health?.servicos?.map(s => (
                        <div key={s.nome} className="rounded-xl p-4 flex items-center gap-3"
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                          <div className={`w-3 h-3 rounded-full ${s.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                          <div>
                            <p className="text-sm font-medium">{s.nome}</p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.detalhes}</p>
                          </div>
                        </div>
                      )) || (
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          Não foi possível obter o status dos serviços.
                        </p>
                      )}
                    </div>
                    {health && (
                      <p className={`text-sm mt-3 font-medium ${health.status === 'saudavel' ? 'text-green-400' : 'text-yellow-400'}`}>
                        Status geral: {health.status === 'saudavel' ? '✅ Saudável' : '⚠️ Degradado'}
                      </p>
                    )}
                  </div>

                  {/* Links rápidos */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Links Rápidos</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {externalLinks.map(link => (
                        <a
                          key={link.nome}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl p-4 text-center transition-all hover:scale-105"
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                        >
                          <div className={`w-10 h-10 mx-auto rounded-lg ${link.cor} flex items-center justify-center mb-2`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium">{link.nome}</p>
                        </a>
                      ))}
                    </div>
                  </div>

                  <button onClick={carregarDados} className="px-4 py-2 text-white text-sm rounded-lg transition-opacity hover:opacity-90"
                    style={{
                      backgroundImage: [
                        'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
                        'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
                        'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
                      ].join(', '),
                      backgroundColor: '#180848',
                      border: '1px solid rgba(0,184,168,0.28)',
                    }}>
                    Atualizar Status
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ═══ MODAL CRIAR/EDITAR USUÁRIO ═══ */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl animate-slide-up"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-lg font-semibold">
              {editando ? 'Editar Usuário' : 'Novo Usuário'}
            </h3>

            {erro && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-3">
              {!editando && (
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Usuário</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                </div>
              )}
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Nome Completo</label>
                <input type="text" value={form.nome_completo} onChange={e => setForm({ ...form, nome_completo: e.target.value })} required
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Senha {editando ? '(deixe vazio para manter)' : ''}
                </label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  required={!editando}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Setor</label>
                  <select value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                    {(isAdmin ? SETORES_FORM : [user.setor]).map(s => <option key={s} value={s}>{setorLabel[s] || s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Papel</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                    {(isAdmin ? ROLES : ['colaborador']).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
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
                  {editando ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
