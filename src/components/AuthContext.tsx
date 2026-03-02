import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { User, AuthState, SignUpData } from '../types';
import {
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  resetPassword as authResetPassword,
} from '../lib/auth';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const IS_SELF_HOSTED = import.meta.env.VITE_SELF_HOSTED === 'true';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (signUpData: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapAuthUser(user: any): User {
  return {
    id: user.id,
    email: user.email,
    ...user.user_metadata,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (IS_SELF_HOSTED) {
      const token = localStorage.getItem('atria_token');
      if (token) {
        api.getMe()
          .then((userData) => {
            if (mounted) {
              setUser(userData);
              setLoading(false);
            }
          })
          .catch(() => {
            if (mounted) {
              localStorage.removeItem('atria_token');
              setUser(null);
              setLoading(false);
            }
          });
      } else {
        setLoading(false);
      }
      return () => { mounted = false; };
    }

    // Supabase Mode
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;

      if (data.user) {
        setUser(mapAuthUser(data.user));
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }

      setUser(mapAuthUser(session.user));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (IS_SELF_HOSTED) {
      const response = await api.signIn({ email, password });
      localStorage.setItem('atria_token', response.token);
      setUser(response.user);
      return;
    }
    await authSignIn(email, password);
  };

  const signUp = async (signUpData: SignUpData) => {
    if (IS_SELF_HOSTED) {
      await api.signUp(signUpData);
      // Local API signs up but doesn't auto-login usually, or we can handle it
      return;
    }
    await authSignUp(signUpData);
    await supabase.auth.signOut(); // força confirmação de email
    setUser(null);
  };

  const signOut = async () => {
    if (IS_SELF_HOSTED) {
      localStorage.removeItem('atria_token');
      setUser(null);
      return;
    }
    await authSignOut();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    if (IS_SELF_HOSTED) {
      // API currently doesn't have reset password refined, but we can add the route
      console.warn('Reset password not implemented for Self-Hosted yet');
      return;
    }
    await authResetPassword(email);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
