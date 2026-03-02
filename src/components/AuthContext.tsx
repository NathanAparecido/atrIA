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
    await authSignIn(email, password);
  };

  const signUp = async (signUpData: SignUpData) => {
    await authSignUp(signUpData);
    await supabase.auth.signOut(); // força confirmação de email
    setUser(null);
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
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
