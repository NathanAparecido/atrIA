/**
 * CorpAI — Aba "Uso" do Painel Admin.
 * Visão de gestão (somente leitura): consumo de tokens por setor e por usuário,
 * com filtro de período. Lê /api/usage/* (endpoints admin já existentes).
 *
 * Componente isolado de propósito: o Admin.jsx só o renderiza quando a aba
 * "Uso" está ativa; toda a busca e estado vivem aqui.
 */

import { useState, useEffect, useCallback } from 'react';
import { usoResumo, usoPorSetor, usoPorUsuario } from '../lib/api';

const SETOR_LABEL = {
  noc: 'NOC', suporte_n2: 'Suporte N2', suporte_n3: 'Suporte N3',
  financeiro: 'Financeiro', diretoria: 'Diretoria', vendas: 'Vendas',
  marketing: 'Marketing', vendas_dc: 'Vendas DC', infra: 'Infraestrutura',
  suporte_rua: 'Suporte Rua', global: 'Global',
};

const GRADIENTE = {
  backgroundImage: [
    'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
    'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
    'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
  ].join(', '),
  backgroundColor: '#180848',
};

function fmt(n) {
  return (n ?? 0).toLocaleString('pt-BR');
}

function isoHoje() {
  return new Date().toISOString().slice(0, 10);
}

function isoPrimeiroDiaDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function Card({ titulo, valor }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{titulo}</p>
      <p className="text-2xl font-bold mt-1">{valor}</p>
    </div>
  );
}

function ThLeft({ children }) {
  return <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>{children}</th>;
}

function ThRight({ children }) {
  return <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>{children}</th>;
}

export default function UsoTab() {
  const [desde, setDesde] = useState(isoPrimeiroDiaDoMes());
  const [ate, setAte] = useState(isoHoje());
  const [resumo, setResumo] = useState(null);
  const [porSetor, setPorSetor] = useState([]);
  const [porUsuario, setPorUsuario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [r, s, u] = await Promise.all([
        usoResumo(desde, ate),
        usoPorSetor(desde, ate),
        usoPorUsuario(desde, ate),
      ]);
      setResumo(r);
      setPorSetor(s);
      setPorUsuario(u);
    } catch (e) {
      setErro(e.message || 'Erro ao carregar dados de uso.');
    } finally {
      setLoading(false);
    }
  }, [desde, ate]);

  useEffect(() => { carregar(); }, [carregar]);

  const inputStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  };

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>De</label>
          <input type="date" value={desde} max={ate} onChange={(e) => setDesde(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Até</label>
          <input type="date" value={ate} min={desde} max={isoHoje()} onChange={(e) => setAte(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg" style={inputStyle} />
        </div>
        <button onClick={carregar}
          className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
          style={{ ...GRADIENTE, border: '1px solid rgba(0,184,168,0.28)' }}>
          Atualizar
        </button>
        <p className="text-xs ml-auto self-center" style={{ color: 'var(--color-text-muted)' }}>
          Tokens do modelo local — métrica de uso, não de custo.
        </p>
      </div>

      {erro && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(220,40,80,0.12)', color: '#ff6b8a' }}>
          {erro} — confira se o backend de medição (usage_events) já foi aplicado.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'rgba(0,184,168,0.5)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          {/* Resumo do período */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card titulo="Requisições" valor={fmt(resumo?.requisicoes)} />
            <Card titulo="Tokens de entrada" valor={fmt(resumo?.prompt_tokens)} />
            <Card titulo="Tokens de saída" valor={fmt(resumo?.completion_tokens)} />
            <Card titulo="Total de tokens" valor={fmt(resumo?.total_tokens)} />
          </div>

          {/* Por setor */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Por setor</h3>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    <ThLeft>Setor</ThLeft>
                    <ThRight>Usuários</ThRight>
                    <ThRight>Requisições</ThRight>
                    <ThRight>Entrada</ThRight>
                    <ThRight>Saída</ThRight>
                    <ThRight>Total</ThRight>
                  </tr>
                </thead>
                <tbody>
                  {porSetor.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center" style={{ color: 'var(--color-text-muted)' }}>Sem dados no período.</td></tr>
                  ) : porSetor.map((s) => (
                    <tr key={s.setor} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3">{SETOR_LABEL[s.setor] || s.setor}</td>
                      <td className="px-4 py-3 text-right">{fmt(s.usuarios)}</td>
                      <td className="px-4 py-3 text-right">{fmt(s.requisicoes)}</td>
                      <td className="px-4 py-3 text-right">{fmt(s.prompt_tokens)}</td>
                      <td className="px-4 py-3 text-right">{fmt(s.completion_tokens)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(s.total_tokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Por usuário */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Por usuário</h3>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    <ThLeft>Usuário</ThLeft>
                    <ThLeft>Setor</ThLeft>
                    <ThRight>Requisições</ThRight>
                    <ThRight>Entrada</ThRight>
                    <ThRight>Saída</ThRight>
                    <ThRight>Total</ThRight>
                  </tr>
                </thead>
                <tbody>
                  {porUsuario.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center" style={{ color: 'var(--color-text-muted)' }}>Sem dados no período.</td></tr>
                  ) : porUsuario.map((u) => (
                    <tr key={u.user_id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3">{u.username}</td>
                      <td className="px-4 py-3">{SETOR_LABEL[u.setor] || u.setor}</td>
                      <td className="px-4 py-3 text-right">{fmt(u.requisicoes)}</td>
                      <td className="px-4 py-3 text-right">{fmt(u.prompt_tokens)}</td>
                      <td className="px-4 py-3 text-right">{fmt(u.completion_tokens)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(u.total_tokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
