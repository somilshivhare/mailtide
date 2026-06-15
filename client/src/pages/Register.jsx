import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { User, Mail, Lock, Loader2 } from 'lucide-react';
import { authAPI } from '../services/api.js';
import { Button, Input } from '../components/ui/custom.jsx';

import { getErrorMessage } from '../lib/utils.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.register(data.name, data.email, data.password);
      toast.success('Registration successful! Please sign in.');
      navigate('/login');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Registration failed. Try a different email.');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-premium">
        <div className="flex flex-col space-y-2 text-center mb-8">
          <span className="text-3xl">🌊</span>
          <h2 className="text-2xl font-bold tracking-tight text-text">Create your account</h2>
          <p className="text-sm text-muted">Start growing your audience with Mailtide</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                <User className="h-4 w-4" />
              </span>
              <Input
                type="text"
                placeholder="Alex Mercer"
                className="pl-10"
                {...register('name')}
              />
            </div>
            {errors.name && <p className="mt-1.5 text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                <Mail className="h-4 w-4" />
              </span>
              <Input
                type="email"
                placeholder="alex@example.com"
                className="pl-10"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                className="pl-10"
                {...register('password')}
              />
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full mt-6" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover font-medium underline underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
