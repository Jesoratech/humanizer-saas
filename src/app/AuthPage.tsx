import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { APP_CONFIG } from '../shared/schemas';
import { PenLine, Eye, EyeOff, Loader2 } from 'lucide-react';
import './AuthPage.css';

const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = signInSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'signin';
  const isSignUp = mode === 'signup';

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="auth-logo">
            <PenLine size={18} strokeWidth={2.5} />
          </div>
          <h1 className="auth-title">
            {isSignUp ? 'Create your account' : `Sign in to ${APP_CONFIG.name}`}
          </h1>
          <p className="auth-subtitle">
            {isSignUp
              ? 'Start improving your writing for free.'
              : 'Welcome back. Pick up where you left off.'}
          </p>
        </div>

        {isSignUp ? <SignUpForm /> : <SignInForm />}

        <div className="auth-switch">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <Link to="/auth/signin">Sign in</Link>
            </span>
          ) : (
            <span>
              Don&apos;t have an account?{' '}
              <Link to="/auth/signup">Create one</Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInForm) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      await signIn(data.email, data.password);
      navigate('/editor');
    } catch (err) {
      setServerError((err as Error).message || 'Sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
      <div className="form-group">
        <label htmlFor="signin-email" className="label">Email</label>
        <input
          id="signin-email"
          type="email"
          className="input"
          placeholder="you@example.com"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <span className="error-text">{errors.email.message}</span>}
      </div>

      <div className="form-group">
        <div className="form-group-header">
          <label htmlFor="signin-password" className="label">Password</label>
          <Link to="/auth/forgot" className="auth-forgot">Forgot?</Link>
        </div>
        <div className="password-input-wrap">
          <input
            id="signin-password"
            type={showPassword ? 'text' : 'password'}
            className="input"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register('password')}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <span className="error-text">{errors.password.message}</span>}
      </div>

      {serverError && (
        <div className="auth-error" role="alert">{serverError}</div>
      )}

      <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 size={18} className="spinning" /> : null}
        Sign in
      </button>
    </form>
  );
}

function SignUpForm() {
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpForm) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      await signUp(data.email, data.password);
      setSuccess(true);
    } catch (err) {
      setServerError((err as Error).message || 'Sign-up failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="auth-success">
        <h3>Check your email</h3>
        <p>
          We sent a verification link to your email. Click it to activate your
          account, then <Link to="/auth/signin">sign in</Link>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
      <div className="form-group">
        <label htmlFor="signup-email" className="label">Email</label>
        <input
          id="signup-email"
          type="email"
          className="input"
          placeholder="you@example.com"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <span className="error-text">{errors.email.message}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="signup-password" className="label">Password</label>
        <div className="password-input-wrap">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            className="input"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            {...register('password')}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <span className="error-text">{errors.password.message}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="signup-confirm" className="label">Confirm password</label>
        <input
          id="signup-confirm"
          type="password"
          className="input"
          placeholder="••••••••"
          autoComplete="new-password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <span className="error-text">{errors.confirmPassword.message}</span>
        )}
      </div>

      {serverError && (
        <div className="auth-error" role="alert">{serverError}</div>
      )}

      <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 size={18} className="spinning" /> : null}
        Create account
      </button>

      <p className="auth-terms">
        By creating an account, you agree to our{' '}
        <Link to="/terms">Terms of Service</Link> and{' '}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </form>
  );
}

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-subtitle">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="auth-success">
            <h3>Check your email</h3>
            <p>
              If an account exists for {email}, you'll receive a password reset
              link. <Link to="/auth/signin">Back to sign in</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="forgot-email" className="label">Email</label>
              <input
                id="forgot-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={loading || !email.trim()}
            >
              {loading ? <Loader2 size={18} className="spinning" /> : null}
              Send reset link
            </button>
            <Link to="/auth/signin" className="auth-back-link">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
