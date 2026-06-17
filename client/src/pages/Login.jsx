import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, Layers } from 'lucide-react';
import { authAPI } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { Button, Input } from '../components/ui/custom.jsx';
import { getErrorMessage } from '../lib/utils.js';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await authAPI.login(data.email, data.password);
      login(response.token, response.user);
      toast.success(`Welcome back, ${response.user.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 bg-text">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Mailtide</span>
        </div>
        <div>
          <blockquote className="space-y-2">
            <p className="text-lg text-white leading-relaxed">
              "Mailtide transformed how we reach our audience — clean interface, powerful delivery, real analytics."
            </p>
            <footer className="text-sm text-white/60">— Product team at Mailtide</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-text">Mailtide</span>
          </div>

          <div className="mb-7">
            <h2 className="text-xl font-semibold text-text">Sign in</h2>
            <p className="text-sm text-muted mt-1">Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <Input type="email" placeholder="you@example.com" className="pl-9" {...register('email')} />
              </div>
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <Input type="password" placeholder="••••••••" className="pl-9" {...register('password')} />
              </div>
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full mt-2 gap-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:text-accent-hover font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
