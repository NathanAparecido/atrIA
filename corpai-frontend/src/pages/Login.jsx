/**
 * CorpAI — Página de Login
 * Campo de usuário + senha com UI "shadcn" estendida com BorderBeam.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ParticleCanvas from '../components/ParticleCanvas';
import ThemeToggle from '../components/ThemeToggle';

// ─── BorderBeam Componente ──────────────────────────────── 
function BorderBeam({ duration = 8 }) {
  return (
    <div 
      className="absolute inset-0 pointer-events-none rounded-xl"
      style={{
        padding: '1.5px', // Espessura da borda brilhante
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        zIndex: 20
      }}
    >
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250%] h-[250%] animate-[spin_8s_linear_infinite]"
        style={{
          background: 'conic-gradient(from 0deg, transparent 75%, var(--color-primary) 100%)',
          animationDuration: `${duration}s`
        }}
      />
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setErro(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 transition-theme relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Background Particles */}
      <ParticleCanvas />

      {/* Theme Toggle no Topo */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Shadcn UI Card Equivalent with BorderBeam */}
      <div 
        className="relative w-[380px] rounded-xl shadow-2xl backdrop-blur-xl z-10 transition-theme"
        style={{ 
          backgroundColor: 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-border) 50%, transparent)'
        }}
      >
        <BorderBeam duration={8} />

        <div className="relative z-10 p-6 flex flex-col gap-6">
          
          <div className="flex flex-col space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
              Login
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              
              {erro && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 animate-fade-in">
                  {erro}
                </div>
              )}

              <div className="flex flex-col space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none" style={{ color: 'var(--color-text)' }}>
                  Email
                </label>
                <input
                  id="email"
                  type="text" // Mantém como text pois a auth original aceitava username
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoFocus
                  className="flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-theme focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    '--tw-ring-color': 'var(--color-primary)'
                  }}
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="password" className="text-sm font-medium leading-none" style={{ color: 'var(--color-text)' }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-theme focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    '--tw-ring-color': 'var(--color-primary)'
                  }}
                />
              </div>

            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border hover:bg-opacity-10 h-10 px-4 py-2"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Register
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium text-white transition-colors h-10 px-4 py-2 shadow-sm ${
                  loading ? 'opacity-70 cursor-wait' : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
