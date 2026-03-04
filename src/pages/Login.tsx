import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { useTheme } from '../components/ThemeContext';
import { Department } from '../types';
import { Moon, Sun, ArrowRight, ShieldCheck } from 'lucide-react';
import { ParticleBackground } from '../components/ParticleBackground';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<Department>('comercial');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { user, signIn, signUp, resetPassword } = useAuth();
  const { showToast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/chat', { replace: true });
    }
  }, [user, navigate]);

  const validatePassword = (pass: string): string => {
    if (pass.length < 8) {
      return 'A senha deve ter no mínimo 8 caracteres';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'A senha deve conter pelo menos uma letra maiúscula';
    }
    if (!/[a-z]/.test(pass)) {
      return 'A senha deve conter pelo menos uma letra minúscula';
    }
    if (!/[0-9]/.test(pass)) {
      return 'A senha deve conter pelo menos um número';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) {
      return 'A senha deve conter pelo menos um caractere especial (!@#$%^&*...)';
    }
    return '';
  };

  const getPasswordStrength = (pass: string): { level: 'weak' | 'medium' | 'strong', color: string, percentage: number } => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (pass.length >= 12) strength++;
    if (pass.length >= 16) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) strength++;

    if (strength <= 3) {
      return { level: 'weak', color: 'bg-red-500', percentage: 33 };
    } else if (strength <= 5) {
      return { level: 'medium', color: 'bg-orange-500', percentage: 66 };
    } else {
      return { level: 'strong', color: 'bg-green-500', percentage: 100 };
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (isSignUp && value) {
      const error = validatePassword(value);
      setPasswordError(error);
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp) {
      const passError = validatePassword(password);
      if (passError) {
        showToast(passError, 'error');
        setPasswordError(passError);
        return;
      }

      if (!phone.trim()) {
        showToast('O telefone é obrigatório', 'error');
        return;
      }
    }

    setLoading(true);

    try {
      if (isForgotPassword) {
        await resetPassword(email);
        showToast('Email de recuperação enviado! Verifique sua caixa de entrada.', 'success');
        setIsForgotPassword(false);
      } else if (isSignUp) {
        await signUp({ email, password, firstName, phone, department });
        showToast('Conta criada! Confirme seu email para ativar.', 'success');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        showToast('Login realizado com sucesso!', 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Falha na autenticação', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#020617]">
      {/* Particle Background Layer */}
      <ParticleBackground />

      {/* Hero Section (Left - Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950/80 via-transparent to-primary-900/40"></div>

        <div className="relative z-10 max-w-lg text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600/10 border border-primary-600/20 mb-8 animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-accent-blue" />
            <span className="text-xs font-bold text-accent-blue uppercase tracking-widest">Enterprise AI Security</span>
          </div>

          <h1 className="text-6xl font-black text-white mb-6 font-orbitron leading-tight tracking-tighter">
            Elevando a <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-blue-400">Inteligência</span>
          </h1>

          <p className="text-xl text-gray-400 font-inter mb-12 leading-relaxed">
            Bem-vindo ao <span className="text-white font-bold italic">atrIA</span>. A plataforma definitiva para orquestração de redes e inteligência coletiva.
          </p>

          <div className="grid grid-cols-2 gap-6 text-left">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white mb-1">99.9%</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Uptime</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white mb-1">AES-256</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Encrypted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Section (Right) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10 transition-colors">
        <div className="w-full max-w-md">
          {/* Logo 'a' Minimalist */}
          <div className="flex justify-center mb-12 lg:hidden">
            <div className="w-16 h-16 rounded-full bg-primary-900 border border-white/20 flex items-center justify-center relative overflow-hidden shadow-inner animate-pulse-blue">
              <span className="text-3xl font-black text-white font-orbitron tracking-tighter">a</span>
            </div>
          </div>

          {/* Glass Form Card */}
          <div className="glass-card p-10 border border-white/10 dark:bg-primary-950/40 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
              >
                {isDark ? <Sun className="w-5 h-5 text-yellow-500 animate-spin-slow" /> : <Moon className="w-5 h-5 text-accent-blue" />}
              </button>
            </div>

            <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-2 font-orbitron tracking-tighter">
              {isForgotPassword ? 'atrIA Rescue' : isSignUp ? 'atrIA Discovery' : 'atrIA Identity'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-10 font-inter font-medium">
              {isForgotPassword ? 'Protocolo de recuperação' : isSignUp ? 'Crie sua identidade neural' : 'Acessar Gateway Central'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                  System Identifier (E-mail)
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all font-medium"
                  placeholder="name@netwise.com.br"
                />
              </div>

              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    required
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                  >
                    <option value="comercial">Comercial</option>
                    <option value="diretoria">Diretoria</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="gerencia">Gerência</option>
                    <option value="infra">Infraestrutura</option>
                    <option value="n2">Suporte N2</option>
                    <option value="n3">Suporte N3</option>
                    <option value="noc">NOC</option>
                    <option value="tecnico_campo">Campo</option>
                  </select>
                </div>
              )}

              {!isForgotPassword && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label htmlFor="password" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Cyber-Key (Password)
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-[10px] font-bold text-accent-blue hover:text-blue-400 uppercase tracking-widest"
                      >
                        Lost Key?
                      </button>
                    )}
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                    className={`w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border ${passwordError ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-accent-blue outline-none transition-all`}
                    placeholder="••••••••"
                  />
                  {isSignUp && password && (
                    <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getPasswordStrength(password).color}`}
                        style={{ width: `${getPasswordStrength(password).percentage}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary-900 hover:bg-black dark:bg-accent-blue dark:hover:bg-blue-600 text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-accent-blue/20 flex items-center justify-center gap-3 group disabled:opacity-50"
              >
                {loading ? 'Processando atrIA...' : (
                  <>
                    <span className="uppercase tracking-[0.2em]">{isForgotPassword ? 'Resetar Protocolo' : isSignUp ? 'Finalizar Descoberta' : 'Inicializar atrIA'}</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setIsForgotPassword(false);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
              >
                {isSignUp ? 'Back to System Login' : 'Register new Identity'}
              </button>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-gray-500 dark:text-gray-600 font-bold uppercase tracking-widest">
            © 2026 Netwise Inc. | atrIA Neural Gateway
          </div>
        </div>
      </div>
    </div>
  );
}
