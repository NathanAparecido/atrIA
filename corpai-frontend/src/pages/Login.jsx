/**
 * Liminai — Página de Login
 * Campo de usuário + senha com GlowCard iridescente metálico.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { WarpBackground } from '../components/magicui/WarpBackground';
import { TextAnimate } from '../components/magicui/TextAnimate';
import { Particles } from '../components/magicui/Particles';
import { GlowCard } from '../components/magicui/GlowCard';
import { Card, CardContent, CardTitle, CardDescription } from '../components/ui/card';
import ThemeToggle from '../components/ThemeToggle';

/* Dark iridescent metallic "ai" — static, sharp metallic, neon only on outline */
const IRIS_STYLES = `
  .iris-text {
    background: linear-gradient(
      135deg,
      #0c0632 0%,
      #4a1898 20%,
      #007870 38%,
      #008c7c 52%,
      #a01880 68%,
      #5820a0 84%,
      #0c0632 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow:
      0 0 4px rgba(0, 136, 124, 0.30),
      0 0 10px rgba(160, 24, 128, 0.15);
  }
  /* Iridescent focus ring on inputs */
  .iris-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(60, 100, 210, 0.40), 0 0 0 1px rgba(105, 60, 210, 0.25);
    border-color: rgba(60, 100, 210, 0.50) !important;
  }
`;

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
      navigate('/chat');
    } catch (err) {
      setErro(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: IRIS_STYLES }} />
      <WarpBackground className="transition-theme flex items-center justify-center p-4 relative">

        {/* Iridescent particles — softer than pure blue */}
        <Particles
          className="absolute inset-0 z-0 pointer-events-none"
          quantity={150}
          ease={80}
          colors={["#e040a8", "#7030c0", "#00c8b8", "#c040d0", "#3060d0", "#30c880"]}
          refresh
        />

        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <div className="flex flex-col items-center z-10 w-full max-w-md px-4">

          {/* Logo */}
          <div className="mb-8 font-['Orbitron'] text-6xl font-black flex tracking-tighter">
            <TextAnimate animation="blurInUp" by="character" once delayOffset={0} className="text-[var(--color-text)]">
              limin
            </TextAnimate>
            <motion.span
              className="iris-text font-['Orbitron'] font-black text-6xl tracking-tighter"
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.45 }}
            >
              ai
            </motion.span>
          </div>

          {/* GlowCard wraps the login card */}
          <GlowCard customSize className="w-full">
            <Card className="w-full border-0 bg-transparent shadow-none">
              <CardContent className="flex flex-col gap-6 p-8">
                <div className="flex flex-col space-y-2">
                  <CardTitle className="text-3xl tracking-tight">login</CardTitle>
                  <CardDescription>
                    insira suas credenciais para acessar sua conta.
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
                        usuário
                      </label>
                      <input
                        id="email"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="seu.usuario"
                        required
                        autoFocus
                        className="iris-input flex h-12 w-full rounded-lg border border-[var(--color-border)] bg-white/95 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 transition-all"
                      />
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                        senha
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="iris-input flex h-12 w-full rounded-lg border border-[var(--color-border)] bg-white/95 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 flex items-center justify-center rounded-lg text-sm font-black text-white transition-all disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #150540 0%, #5520b8 28%, #008880 52%, #b01898 76%, #2a0888 100%)',
                        boxShadow: '0 0 0 0 rgba(0,136,128,0)',
                        transition: 'box-shadow 0.3s ease, opacity 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(0,136,128,0.40)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,136,128,0)'}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'entrar'
                      )}
                    </button>

                    <button
                      type="button"
                      className="w-full h-12 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    >
                      não tem uma conta? cadastre-se aqui
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </GlowCard>

        </div>
      </WarpBackground>
    </>
  );
}
