/**
 * CorpAI — Painel Admin
 * Gestão de usuários, setores e status do sistema.
 * Acesso: apenas admin.
 *
 * Papéis do sistema: 'colaborador', 'gerente', 'admin'.
 * (O antigo 'lider_setor' foi renomeado para 'gerente' em todo o projeto.)
 */

import { useState, useEffect, Fragment } from 'react';
import AppSidebar from '../components/AppSidebar';
import UsoTab from '../components/UsoTab';
import { useAuth } from '../contexts/AuthContext';
import {
  listarUsuarios, criarUsuario, editarUsuario, deletarUsuario,
  listarSetores, healthCheck, obterPrompts, salvarPrompt,
} from '../lib/api';

const SETORES = [
  'noc', 'suporte_n2', 'suporte_n3', 'financeiro', 'diretoria',
  'vendas', 'marketing', 'vendas_dc', 'infra', 'suporte_rua', 'global',
];

// 'global' é um namespace compartilhado invisível — todos os usuários já têm acesso
// automaticamente. Não deve aparecer no formulário de criação/edição de usuários.
const SETORES_FORM = SETORES.filter((s) => s !== 'global');

const ROLES = ['colaborador', 'gerente', 'admin'];

// Cores das tags de papel — mesmas cores de marca do card "Permissões por papel"
// da landing (HowItWorksMocks/LandingSections):
//   colaborador → TEAL    #00b8a8
//   gerente     → PURPLE  #5828c8
//   admin       → MAGENTA #c020a8
const ROLE_COLOR = {
  colaborador: '#00b8a8',
  gerente: '#5828c8',
  admin: '#c020a8',
};

function roleBadgeStyle(role) {
  const hex = ROLE_COLOR[role] || ROLE_COLOR.colaborador;
  return {
    background: `color-mix(in srgb, ${hex} 18%, transparent)`,
    color: `color-mix(in srgb, ${hex} 60%, white)`,
    border: `1px solid color-mix(in srgb, ${hex} 35%, transparent)`,
  };
}

export default function Admin() {
  const { isAdmin, isGerente, user } = useAuth();
  const TABS = isAdmin
    ? ['Usuários', 'Setores', 'Sistema', 'Prompt', 'Uso']
    : isGerente ? ['Usuários', 'Uso'] : ['Usuários'];
  const [tabAtiva, setTabAtiva] = useState('Usuários');
  const [usuarios, setUsuarios] = useState([]);
  const [setores, setSetores] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Aba Prompt
  const [promptsData, setPromptsData] = useState(null);   // { builtin_default, default_setor, itens }
  const [escopoSel, setEscopoSel] = useState('__default__');
  const [promptTexto, setPromptTexto] = useState('');
  const [salvandoPrompt, setSalvandoPrompt] = useState(false);
  const [promptMsg, setPromptMsg] = useState('');

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
      const [usrs, strs, hl, prompts] = await Promise.all([
        listarUsuarios(),
        listarSetores(),
        healthCheck().catch(() => null),
        isAdmin ? obterPrompts().catch(() => null) : Promise.resolve(null),
      ]);
      setUsuarios(usrs);
      setSetores(strs);
      setHealth(hl);
      if (prompts) {
        setPromptsData(prompts);
        const item = prompts.itens.find((i) => i.setor === escopoSel);
        setPromptTexto(item ? item.conteudo : '');
      }
    } catch (err) {
      console.error('Erro ao carregar dados admin:', err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Aba Prompt: helpers ───────────────────────────────
  function itemDoEscopo(setor) {
    return promptsData?.itens.find((i) => i.setor === setor) || null;
  }

  function selecionarEscopo(setor) {
    setEscopoSel(setor);
    setPromptMsg('');
    const item = itemDoEscopo(setor);
    setPromptTexto(item ? item.conteudo : '');
  }

  async function handleSalvarPrompt() {
    setSalvandoPrompt(true);
    setPromptMsg('');
    try {
      await salvarPrompt(escopoSel, promptTexto);
      const prompts = await obterPrompts();
      setPromptsData(prompts);
      const item = prompts.itens.find((i) => i.setor === escopoSel);
      setPromptTexto(item ? item.conteudo : '');
      setPromptMsg(promptTexto.trim() ? '✅ Prompt salvo. Vale na próxima mensagem.' : '✅ Revertido ao padrão.');
    } catch (err) {
      setPromptMsg('❌ ' + err.message);
    } finally {
      setSalvandoPrompt(false);
    }
  }

  function carregarEmbutido() {
    if (promptsData) setPromptTexto(promptsData.builtin_default);
    setPromptMsg('Texto embutido carregado — clique em Salvar para aplicá-lo.');
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

  // Agrupa os usuários por setor, respeitando a ordem de SETORES e incluindo
  // qualquer setor extra que apareça nos dados. Só usado na visão de admin.
  const usuariosPorSetor = [...new Set([...SETORES, ...usuarios.map((u) => u.setor)])]
    .map((setor) => [setor, usuarios.filter((u) => u.setor === setor)])
    .filter(([, lista]) => lista.length > 0);

  const baseDomain = window.location.hostname;
  const externalLinks = [
    { nome: 'Grafana', url: `https://grafana.${baseDomain}`, cor: 'bg-orange-500' },
    { nome: 'Zabbix', url: `https://zabbix.${baseDomain}`, cor: 'bg-red-500' },
    { nome: 'Paperless-NGX', url: `https://paperless.${baseDomain}`, cor: 'bg-green-500' },
    { nome: 'Dify', url: `https://dify.${baseDomain}`, cor: 'bg-blue-500' },
  ];

  // Renderiza uma linha de usuário. A coluna "Setor" foi removida da tabela:
  //   • Admin → o setor aparece como cabeçalho de grupo (ver tbody).
  //   • Gerente → vê só o próprio setor, então a informação é redundante.
  function linhaUsuario(u) {
    return (
      <tr key={u.id} className="transition-colors">
        <td className="px-4 py-3 font-medium">{u.username}</td>
        <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{u.nome_completo}</td>
        <td className="px-4 py-3">
          <span className="px-2 py-1 rounded-md text-xs font-medium" style={roleBadgeStyle(u.role)}>
            {u.role}
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
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto min-w-0 p-6" style={{ background: 'var(--color-bg)' }}>
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

                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Usuário</th>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Nome</th>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Papel</th>
                        <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isAdmin
                        // Admin: agrupado por setor, com cabeçalho de grupo. Sem coluna "Setor".
                        ? usuariosPorSetor.map(([setor, lista]) => (
                            <Fragment key={setor}>
                              <tr>
                                <td colSpan={4} className="px-4 pt-5 pb-2 text-xs font-semibold uppercase tracking-wide"
                                  style={{ color: 'rgba(0,184,168,0.9)' }}>
                                  {setorLabel[setor] || setor}
                                </td>
                              </tr>
                              {lista.map(linhaUsuario)}
                            </Fragment>
                          ))
                        // Gerente: lista simples do próprio setor, sem agrupamento e sem coluna "Setor".
                        : usuarios.map(linhaUsuario)}
                    </tbody>
                  </table>
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
                      <p className={`text-sm mt-3 font-medium ${health.status === 'saudavel' ? 'text-green-400' : 'text-orange-400'}`}>
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

              {/* ═══ ABA: PROMPT ═══ */}
              {tabAtiva === 'Prompt' && isAdmin && (
                <div className="space-y-4 max-w-4xl">
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Edite o prompt de sistema do assistente. O <strong>Padrão</strong> vale para todos os setores;
                    um setor pode ter um <strong>override</strong> que o substitui. Mudanças valem já na próxima mensagem (sem reiniciar).
                  </p>

                  {/* Seletor de escopo */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Escopo</label>
                    <select
                      value={escopoSel}
                      onChange={(e) => selecionarEscopo(e.target.value)}
                      className="px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <option value="__default__">Padrão (todos os setores)</option>
                      {SETORES.map((s) => (
                        <option key={s} value={s}>{(setorLabel[s] || s)}{itemDoEscopo(s)?.definido ? ' • override' : ''}</option>
                      ))}
                    </select>
                    {(() => {
                      const item = itemDoEscopo(escopoSel);
                      const ehDefault = escopoSel === '__default__';
                      const definido = item?.definido;
                      const texto = ehDefault
                        ? (definido ? 'Padrão personalizado (salvo).' : 'Usando o padrão embutido no código.')
                        : (definido ? 'Override ativo para este setor.' : 'Sem override — herda o Padrão.');
                      return <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{texto}{item?.atualizado_por ? ` Por ${item.atualizado_por}.` : ''}</span>;
                    })()}
                  </div>

                  {/* Editor */}
                  <textarea
                    value={promptTexto}
                    onChange={(e) => { setPromptTexto(e.target.value); setPromptMsg(''); }}
                    rows={18}
                    spellCheck={false}
                    placeholder={escopoSel === '__default__'
                      ? (promptsData?.builtin_default || '')
                      : 'Vazio = herda o Padrão. Escreva aqui para criar um override só deste setor.'}
                    className="w-full px-3 py-3 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />

                  {promptMsg && (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{promptMsg}</p>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    <button onClick={carregarEmbutido}
                      className="px-4 py-2 text-sm rounded-lg font-medium transition-colors"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                      Carregar texto embutido
                    </button>
                    <button onClick={handleSalvarPrompt} disabled={salvandoPrompt}
                      className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{
                        backgroundImage: [
                          'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
                          'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
                          'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
                        ].join(', '),
                        backgroundColor: '#180848',
                        border: '1px solid rgba(0,184,168,0.28)',
                      }}>
                      {salvandoPrompt ? 'Salvando…' : 'Salvar'}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Dica: salvar com o campo vazio remove o prompt deste escopo — o Padrão volta ao texto embutido e um setor volta a herdar o Padrão.
                  </p>
                </div>
              )}

              {/* ═══ ABA: USO ═══ */}
              {tabAtiva === 'Uso' && (isAdmin || isGerente) && <UsoTab />}
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
