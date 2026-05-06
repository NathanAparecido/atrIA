/**
 * liminai — Página de Perfil
 * Avatar (foto custom OU FallbackAvatar generativo), upload/remoção de foto,
 * dados read-only do usuário.
 */

import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import FallbackAvatar from '../components/magicui/FallbackAvatar';
import { useAuth } from '../contexts/AuthContext';
import { getProfilePic, setProfilePic, clearProfilePic } from '../lib/profilePic';

const setorLabel = {
  noc: 'NOC', suporte_n2: 'Suporte N2', suporte_n3: 'Suporte N3',
  financeiro: 'Financeiro', diretoria: 'Diretoria', vendas: 'Vendas',
  marketing: 'Marketing', vendas_dc: 'Vendas DC', infra: 'Infraestrutura',
  suporte_rua: 'Suporte Rua',
};

const MAX_PFP_BYTES = 1.5 * 1024 * 1024; // ~1.5 MB após base64 fica ~2 MB

export default function Profile() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [pfp, setPfp] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    if (!user?.username) return;
    setPfp(getProfilePic(user.username));
  }, [user?.username]);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um arquivo de imagem.' });
      return;
    }
    if (file.size > MAX_PFP_BYTES) {
      setMensagem({ tipo: 'erro', texto: 'Imagem muito grande (limite ~1.5 MB).' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setProfilePic(user.username, dataUrl);
      setPfp(dataUrl);
      setMensagem({ tipo: 'sucesso', texto: 'Foto de perfil atualizada.' });
    };
    reader.onerror = () => setMensagem({ tipo: 'erro', texto: 'Falha ao ler o arquivo.' });
    reader.readAsDataURL(file);
  }

  function handleRemover() {
    clearProfilePic(user.username);
    setPfp(null);
    setMensagem({ tipo: 'sucesso', texto: 'Foto removida.' });
  }

  const setorDisplay = user?.setor === 'global' ? '—' : (setorLabel[user?.setor] || user?.setor || '—');
  const displayName = user?.nome_completo || user?.username || 'usuário';

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-2xl mx-auto space-y-6">

          <div>
            <h2 className="text-2xl font-bold">Perfil</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Sua identidade no liminai.
            </p>
          </div>

          {mensagem && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {mensagem.texto}
            </div>
          )}

          {/* Avatar + ações */}
          <div
            className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="relative">
              <div
                className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ border: '2px solid rgba(0,184,168,0.35)', background: 'var(--color-surface-hover)' }}
              >
                {pfp ? (
                  <img src={pfp} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <FallbackAvatar name={displayName} size={128} animated />
                )}
              </div>
            </div>

            <div className="flex-1 w-full">
              <p className="text-lg font-semibold">{displayName}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                @{user?.username}
              </p>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
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
                  {pfp ? 'Trocar foto' : 'Enviar foto'}
                </button>
                {pfp && (
                  <button
                    type="button"
                    onClick={handleRemover}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Remover
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                JPG/PNG até ~1.5 MB. Sem foto, usamos um avatar gerado a partir do seu nome.
              </p>
            </div>
          </div>

          {/* Dados */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: 'rgba(0,184,168,0.7)' }} />
              <h3 className="text-sm font-semibold">Dados da conta</h3>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Field label="Usuário" value={user?.username} />
              <Field label="Nome completo" value={user?.nome_completo || '—'} />
              <Field label="Setor" value={setorDisplay} />
              <Field label="Função" value={user?.role || '—'} />
              {user?.email && <Field label="E-mail" value={user.email} />}
            </dl>

            <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
              Edição de nome, setor e função é feita pelo admin.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </dt>
      <dd className="text-sm mt-1" style={{ color: 'var(--color-text)' }}>{value}</dd>
    </div>
  );
}
