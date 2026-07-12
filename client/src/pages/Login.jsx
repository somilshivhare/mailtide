import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, Layers, Sparkles, BarChart3, Zap, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#090D16]">
      {/* ── Left Side: Hero Section ── */}
      <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-900 bg-radial-gradient">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-accent to-indigo-400 text-white shadow-lg shadow-accent/20">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">Mailtide</span>
        </div>

        {/* Hero Copy & Feature Cards */}
        <div className="my-auto max-w-lg space-y-8 z-10 py-12 lg:py-0">
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Email Marketing for <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-indigo-300 to-white">Modern Teams</span>
            </h1>
            <p className="text-sm lg:text-base text-slate-400 leading-relaxed">
              Create AI-powered campaigns, automate email delivery, and track engagement with real-time analytics.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-md rounded-2xl p-4 hover:bg-white/[0.05] transition-all duration-200 group">
              <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent mb-3 group-hover:scale-110 transition-transform duration-200">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">AI Campaign Generation</h3>
              <p className="text-xs text-slate-400 leading-normal">Generate engaging copy and campaign ideas instantly with Gemini AI.</p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-md rounded-2xl p-4 hover:bg-white/[0.05] transition-all duration-200 group">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform duration-200">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Real-Time Analytics</h3>
              <p className="text-xs text-slate-400 leading-normal">Track delivery rates, opens, clicks, bounces, and complaints atomically.</p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-md rounded-2xl p-4 hover:bg-white/[0.05] transition-all duration-200 group">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform duration-200">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Queue-based Processing</h3>
              <p className="text-xs text-slate-400 leading-normal">Scale email dispatching cleanly via BullMQ and Redis backends.</p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-md rounded-2xl p-4 hover:bg-white/[0.05] transition-all duration-200 group">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform duration-200">
                <Mail className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Reliable Email Delivery</h3>
              <p className="text-xs text-slate-400 leading-normal">Ensure inbox-perfect campaign routing powered by official Resend APIs.</p>
            </div>
          </div>
        </div>

        {/* Dashboard Mockup (Subtle floating animation) */}
        <div className="relative mt-4 opacity-40 lg:opacity-70 z-0 select-none animate-float">
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-12px) rotate(0.5deg); }
            }
            .animate-float {
              animation: float 6s ease-in-out infinite;
            }
          `}</style>
          <div className="bg-slate-900/60 border border-white/10 backdrop-blur-sm rounded-2xl p-4 shadow-2xl max-w-sm ml-auto">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500/60" />
                <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
                <div className="h-2 w-2 rounded-full bg-green-500/60" />
                <span className="text-[9px] text-slate-500 ml-2 font-mono">mailtide.me/analytics</span>
              </div>
            </div>
            {/* Inside Content */}
            <div className="space-y-3">
              <div className="h-2.5 w-2/3 rounded bg-white/10" />
              <div className="h-2 w-full rounded bg-white/5" />
              <div className="h-2 w-5/6 rounded bg-white/5" />
              {/* Mini Chart Mock */}
              <div className="h-20 rounded-lg bg-gradient-to-t from-accent/5 to-accent/20 border border-accent/15 flex items-end justify-between p-2 pt-5">
                <div className="w-[10%] h-[30%] bg-accent/40 rounded-t-sm" />
                <div className="w-[10%] h-[50%] bg-accent/50 rounded-t-sm" />
                <div className="w-[10%] h-[40%] bg-accent/40 rounded-t-sm" />
                <div className="w-[10%] h-[75%] bg-accent/70 rounded-t-sm" />
                <div className="w-[10%] h-[60%] bg-accent/60 rounded-t-sm" />
                <div className="w-[10%] h-[90%] bg-accent/80 rounded-t-sm" />
                <div className="w-[10%] h-[100%] bg-accent rounded-t-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Side: Authentication Card ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 lg:bg-slate-900/10 px-6 py-12 lg:py-16">
        <div className="w-full max-w-[420px] bg-slate-900/50 border border-slate-800 lg:bg-white lg:border-gray-100 shadow-2xl rounded-2xl p-6 sm:p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white lg:text-gray-900 tracking-tight">Welcome Back 👋</h2>
            <p className="text-xs sm:text-sm text-slate-400 lg:text-gray-500 mt-1.5">Sign in to manage your campaigns</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:text-gray-500">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 lg:text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9 h-10 bg-slate-950/40 border-slate-850 text-white focus:border-accent focus:ring-accent/15 lg:bg-white lg:border-gray-200 lg:text-gray-900"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 font-medium mt-1">{errors.email.message}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:text-gray-500">Password</label>
                <Link
                  to="/forgot-password"
                  onClick={(e) => { e.preventDefault(); toast.info('Password recovery is not implemented yet.'); }}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 lg:text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-10 h-10 bg-slate-950/40 border-slate-850 text-white focus:border-accent focus:ring-accent/15 lg:bg-white lg:border-gray-200 lg:text-gray-900"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 lg:text-gray-400 lg:hover:text-gray-600 focus:outline-none"
                  tabIndex="-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 font-medium mt-1">{errors.password.message}</p>}
            </div>

            {/* Remember Me */}
            <div className="flex items-center py-0.5">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-accent border-slate-800 bg-slate-950/40 rounded focus:ring-accent/20 focus:ring-offset-0 lg:border-gray-300 lg:bg-white"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs font-medium text-slate-400 lg:text-gray-500 select-none cursor-pointer">
                Remember Me
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 mt-2 font-semibold shadow-lg shadow-accent/10 bg-accent hover:bg-accent-hover text-white rounded-xl transition-all duration-150 gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-800 lg:border-gray-150" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-[#090D16] lg:bg-white px-3 text-slate-500 lg:text-gray-400">Or</span>
            </div>
          </div>

          {/* Google OAuth Option (UI only) */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 gap-2.5 font-medium border-slate-800 text-slate-300 hover:bg-slate-800/40 hover:text-white lg:border-gray-250 lg:text-gray-700 lg:hover:bg-gray-55 lg:hover:text-gray-900 rounded-xl transition-all duration-150"
            onClick={() => toast.info('Google OAuth integration is coming soon!')}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.99 1 12 1 7.23 1 3.19 3.73 1.24 7.74l3.83 2.97C6.01 7.42 8.78 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.01 3.67-8.64z" />
              <path fill="#FBBC05" d="M5.07 10.71c-.26-.77-.41-1.6-.41-2.46s.15-1.69.41-2.46L1.24 2.82C.45 4.45 0 6.27 0 8.25s.45 3.8 1.24 5.43l3.83-2.97z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.22 0-5.99-2.38-6.96-5.67l-3.83 2.97C3.19 20.27 7.23 23 12 23z" />
            </svg>
            Continue with Google
          </Button>

          {/* Create Account Link */}
          <p className="mt-6 text-center text-xs text-slate-400 lg:text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:underline font-semibold">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
