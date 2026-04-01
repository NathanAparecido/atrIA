/**
 * CorpAI — Página de Login
 * Campo de usuário + senha com UI "shadcn" estendida com BorderBeam.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WarpBackground } from '../components/magicui/WarpBackground';
import { Backlight } from '../components/magicui/Backlight';
import { TextAnimate } from '../components/magicui/TextAnimate';
import { Particles } from '../components/magicui/Particles';
import { Card, CardContent, CardTitle, CardDescription } from '../components/ui/card';
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
    <WarpBackground className="transition-theme flex items-center justify-center p-4 relative">
      <Particles
        className="absolute inset-0 z-0 pointer-events-none"
        quantity={150}
        ease={80}
        color="#8b5cf6"
        refresh
      />

      {/* Theme Toggle no Topo */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center z-10 w-full max-w-md px-4">
        <div className="mb-8 font-['Orbitron'] text-6xl font-black flex tracking-tighter">
          <TextAnimate animation="blurInUp" by="character" once delayOffset={0} className="text-[var(--color-text)]">
            atr
          </TextAnimate>
          <TextAnimate animation="blurInUp" by="character" once delayOffset={0.3} className="text-[#8b5cf6] drop-shadow-[0_0_25px_rgba(139,92,246,0.8)]">
            IA
          </TextAnimate>
        </div>

        <Backlight className="w-full">
          <Card className="relative w-full border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-2xl shadow-purple-500/10">
            <BorderBeam duration={6} />
            
            <CardContent className="flex flex-col gap-6 p-8">
              <div className="flex flex-col space-y-2">
                <CardTitle className="text-3xl tracking-tight">login</CardTitle>
                <CardDescription>
                  enter your credentials to access your account.
                </CardDescription>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid w-full items-center gap-5">
                  {erro && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-xs text-red-400 animate-fade-in font-bold">
                      {erro}
                    </div>
                  )}

                  <div className="flex flex-col space-y-2">
                    <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                      email
                    </label>
                    <input
                      id="email"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="name@company.com"
                      required
                      autoFocus
                      className="flex h-12 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 px-4 py-2 text-sm text-[var(--color-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]/50"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                      password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="flex h-12 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 px-4 py-2 text-sm text-[var(--color-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]/50"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 flex items-center justify-center rounded-lg bg-[var(--color-primary)] text-sm font-black text-white transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'sign in'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    className="w-full h-12 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    don't have an account? register here
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Backlight>
      </div>
    </WarpBackground>
  );
}
