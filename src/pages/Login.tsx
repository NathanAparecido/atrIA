import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { useTheme } from '../components/ThemeContext';
import { Department } from '../types';
import { LogIn, Moon, Sun } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md transition-colors">
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 flex justify-center">
            <div className="bg-primary dark:bg-blue-600 p-3 rounded-full transition-colors">
              <LogIn className="w-8 h-8 text-white" />
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-primary-600" />}
          </button>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2 transition-colors">
          {isForgotPassword ? 'Recuperar Senha' : isSignUp ? 'Criar Conta' : 'Bem-vindo'}
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8 transition-colors">
          {isForgotPassword ? 'Digite seu email para receber o link de recuperação' : isSignUp ? 'Cadastre-se para começar' : 'Entre para continuar'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 dark:focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Primeiro Nome *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 dark:focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                placeholder="João"
              />
            </div>
          )}

          {isSignUp && (
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Telefone *
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={10}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 dark:focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                placeholder="(11) 98765-4321"
              />
            </div>
          )}

          {isSignUp && (
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Departamento *
              </label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 dark:focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              >
                <option value="comercial">Comercial</option>
                <option value="diretoria">Diretoria</option>
                <option value="financeiro">Financeiro</option>
                <option value="gerencia">Gerência</option>
                <option value="infra">Infraestrutura</option>
                <option value="n2">N2 - Suporte Nível 2</option>
                <option value="n3">N3 - Suporte Nível 3</option>
                <option value="noc">NOC - Centro de Operações</option>
                <option value="tecnico_campo">Técnico de Campo</option>
              </select>
            </div>
          )}

          {!isForgotPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Senha {isSignUp && '*'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                minLength={8}
                className={`w-full px-4 py-3 border ${passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 dark:focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                placeholder="••••••••"
              />

              {isSignUp && password && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Força da senha:</span>
                    <span className={`text-xs font-semibold ${getPasswordStrength(password).color === 'bg-red-500' ? 'text-red-600 dark:text-red-400' : getPasswordStrength(password).color === 'bg-orange-500' ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                      {getPasswordStrength(password).level === 'weak' ? 'Fraca' : getPasswordStrength(password).level === 'medium' ? 'Média' : 'Forte'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getPasswordStrength(password).color}`}
                      style={{ width: `${getPasswordStrength(password).percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {isSignUp && passwordError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
              )}
              {isSignUp && !passwordError && password && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">✓ Senha forte</p>
              )}
              {isSignUp && !password && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Aguarde...' : isForgotPassword ? 'Enviar Link' : isSignUp ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          {!isForgotPassword && (
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary-600 hover:text-primary-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors block w-full"
            >
              {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem uma conta? Cadastre-se'}
            </button>
          )}
          <button
            onClick={() => {
              setIsForgotPassword(!isForgotPassword);
              setIsSignUp(false);
            }}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium transition-colors block w-full"
          >
            {isForgotPassword ? 'Voltar ao login' : 'Esqueceu a senha?'}
          </button>
        </div>
      </div>
    </div>
  );
}
