import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../client/supabase';
import type { UserProfile, UsageData } from '../shared/schemas';
import { getUserProfile, subscribeToPlan } from '../client/api';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  usage: UsageData | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  isAdmin: boolean;
  isPremium: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  upgradePlan: (planId: 'premium_monthly' | 'premium_yearly') => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'humanly_session_v2';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    usage: null,
    loading: true,
    error: null,
  });

  const fetchProfileAndUsage = useCallback(async () => {
    try {
      const data = await getUserProfile();
      setState((s) => {
        const nextProfile = data.profile;
        if (s.user) {
          // Store minimal non-sensitive info only
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              id: nextProfile.id,
              email: nextProfile.email,
              role: nextProfile.role,
              tier: nextProfile.tier,
            })
          );
        }
        return {
          ...s,
          profile: nextProfile,
          usage: data.usage,
        };
      });
    } catch {
      // Offline or network error
    }
  }, []);

  useEffect(() => {
    // Check initial Supabase session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setState((s) => ({
            ...s,
            session,
            user: session.user,
            loading: false,
          }));
          fetchProfileAndUsage();
        } else {
          // If no supabase session, keep local storage user if existed or set loading false
          setState((s) => ({ ...s, loading: false }));
          if (localStorage.getItem(STORAGE_KEY)) {
            fetchProfileAndUsage();
          }
        }
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false }));
      });

    // Listen for Supabase auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState((s) => ({
          ...s,
          session,
          user: session.user,
          loading: false,
        }));
        fetchProfileAndUsage();
      } else {
        // Signed out
        localStorage.removeItem(STORAGE_KEY);
        setState({
          user: null,
          session: null,
          profile: null,
          usage: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndUsage]);

  const signUp = useCallback(
    async (email: string, password: string) => {
      setState((s) => ({ ...s, error: null, loading: true }));
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setState((s) => ({ ...s, error: error.message, loading: false }));
          throw error;
        }
        if (data.user) {
          setState((s) => ({ ...s, user: data.user, loading: false }));
          fetchProfileAndUsage();
          toast.success('Account created! Welcome to Humanly.');
        } else {
          setState((s) => ({ ...s, loading: false }));
          toast.success('Check your email to confirm your account.');
        }
      } catch (err) {
        const msg = (err as Error).message || 'Sign-up failed';
        setState((s) => ({ ...s, error: msg, loading: false }));
        throw err;
      }
    },
    [fetchProfileAndUsage]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setState((s) => ({ ...s, error: null, loading: true }));
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setState((s) => ({ ...s, error: error.message, loading: false }));
          throw error;
        }

        if (data.user) {
          setState((s) => ({ ...s, user: data.user, session: data.session, loading: false }));
          fetchProfileAndUsage();
        }
      } catch (err) {
        const msg = (err as Error).message || 'Sign-in failed';
        setState((s) => ({ ...s, error: msg, loading: false }));
        throw err;
      }
    },
    [fetchProfileAndUsage]
  );

  const signOut = useCallback(async () => {
    setState((s) => ({ ...s, error: null }));
    localStorage.removeItem(STORAGE_KEY);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setState({
      user: null,
      session: null,
      profile: null,
      usage: null,
      loading: false,
      error: null,
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setState((s) => ({ ...s, error: null }));
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (error) {
      setState((s) => ({ ...s, error: error.message }));
      throw error;
    }
  }, []);

  // Remove loginAsAdmin and loginAsDemoUser — these were insecure bypass functions

  const upgradePlan = useCallback(
    async (planId: 'premium_monthly' | 'premium_yearly'): Promise<boolean> => {
      try {
        const res = await subscribeToPlan(planId);
        if (res.success && res.profile) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res.profile));
          setState((s) => ({
            ...s,
            profile: res.profile,
            usage: s.usage
              ? {
                  ...s.usage,
                  dailyLimit: 999999,
                  requestsRemaining: 999999,
                  maxWordsPerRequest: 3000,
                }
              : null,
          }));
          return true;
        }
        return false;
      } catch (err) {
        toast.error((err as Error).message || 'Failed to update subscription');
        return false;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  // Derive admin status from authenticated Supabase user email
  const isAdmin =
    state.profile?.role === 'admin' ||
    state.user?.email === 'rajan102805@gmail.com';

  const isPremium =
    state.profile?.tier === 'premium_monthly' ||
    state.profile?.tier === 'premium_yearly' ||
    state.profile?.tier === 'lifetime' ||
    isAdmin;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAdmin,
        isPremium,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshProfile: fetchProfileAndUsage,
        upgradePlan,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
