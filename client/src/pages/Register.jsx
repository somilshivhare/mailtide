import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { User, Mail, Lock, Loader2, Layers, Sparkles, BarChart3, Zap, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      {/* ── Left Side: Showcase Section ── */}
      <div className="w-full lg:w-[55%] xl:w-[58%] flex flex-col justify-center p-8 lg:p-12 relative overflow-hidden bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-indigo-200/20 blur-[100px] pointer-events-none" />
        
        {/* Dotted Grid Background */}
        <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: 'radial-gradient(#6366F1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

        {/* Floating Animation Styles */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(0.3deg); }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
        `}</style>

        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-xl mx-auto space-y-10 z-10 py-12 lg:py-0">
          
          {/* Dashboard Preview Window */}
          <div className="w-full bg-white/90 border border-slate-200/60 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden animate-float">
            {/* Mock Window Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-400/80" />
                <div className="h-2 w-2 rounded-full bg-amber-400/80" />
                <div className="h-2 w-2 rounded-full bg-emerald-400/80" />
                <span className="text-[10px] text-slate-400 font-medium ml-2 font-mono select-none">mailtide.me/dashboard</span>
              </div>
            </div>
            
            {/* Mock Dashboard Layout */}
            <div className="p-5 flex gap-4">
              {/* Mock Sidebar */}
              <div className="w-[18%] space-y-3.5 border-r border-slate-100 pr-3.5 select-none">
                <div className="h-2.5 w-full rounded bg-accent/20" />
                <div className="h-2 w-5/6 rounded bg-slate-100" />
                <div className="h-2 w-2/3 rounded bg-slate-100" />
                <div className="h-2 w-4/5 rounded bg-slate-100" />
              </div>
              
              {/* Mock Main Section */}
              <div className="flex-1 space-y-4 select-none">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-2.5">
                    <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider block">Total Sent</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">12,480</span>
                  </div>
                  <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-2.5">
                    <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider block">Open Rate</span>
                    <span className="text-xs font-bold text-emerald-600 mt-0.5 block">32.4%</span>
                  </div>
                  <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-2.5">
                    <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider block">Click Rate</span>
                    <span className="text-xs font-bold text-indigo-600 mt-0.5 block">4.8%</span>
                  </div>
                </div>
                
                {/* Curve Graph */}
                <div className="h-28 bg-gradient-to-t from-slate-50/30 to-indigo-50/20 border border-indigo-50/60 rounded-xl p-3 relative overflow-hidden">
                  <div className="absolute top-2 left-3">
                    <span className="text-[8px] text-slate-400 font-semibold block">Campaign Analytics</span>
                  </div>
                  {/* SVG Mock Curve */}
                  <svg className="w-full h-full pt-4" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,30 Q15,10 30,15 T60,5 T90,20 T100,10 L100,30 L0,30 Z" fill="url(#chartGrad)" />
                    <path d="M0,30 Q15,10 30,15 T60,5 T90,20 T100,10" fill="none" stroke="#6366F1" strokeWidth="1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Copy Text */}
          <div className="text-center space-y-3 max-w-md">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              AI-Powered <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-indigo-600">Email Marketing</span>
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Create campaigns, automate email delivery, and track engagement with real-time analytics.
            </p>
          </div>

          {/* Tech Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 select-none">
            <span className="bg-white border border-slate-200/60 text-slate-500 text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">Gemini AI</span>
            <span className="bg-white border border-slate-200/60 text-slate-500 text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">BullMQ</span>
            <span className="bg-white border border-slate-200/60 text-slate-500 text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">Resend</span>
            <span className="bg-white border border-slate-200/60 text-slate-500 text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">Analytics</span>
            <span className="bg-white border border-slate-200/60 text-slate-500 text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">Redis</span>
          </div>
        </div>
      </div>

      {/* ── Right Side: Authentication Panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:py-16">
        <div className="w-full max-w-[380px] mx-auto space-y-7">
          
          {/* Brand Logo */}
          <div className="flex items-center justify-center gap-2.5 select-none">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-accent to-indigo-400 text-white shadow-md shadow-accent/15">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">Mailtide</span>
          </div>

          {/* Title / Subtitle */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
            <p className="text-sm text-slate-500 mt-1.5">Start growing your audience with Mailtide</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Alex Mercer"
                  className="pl-9 h-10 border-slate-200 text-slate-900 focus:border-accent focus:ring-accent/10"
                  {...register('name')}
                />
              </div>
              {errors.name && <p className="text-xs text-red-500 font-medium mt-1">{errors.name.message}</p>}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="alex@example.com"
                  className="pl-9 h-10 border-slate-200 text-slate-900 focus:border-accent focus:ring-accent/10"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 font-medium mt-1">{errors.email.message}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className="pl-9 pr-10 h-10 border-slate-200 text-slate-900 focus:border-accent focus:ring-accent/10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 focus:outline-none"
                  tabIndex="-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 font-medium mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 mt-6 font-semibold shadow-md shadow-accent/10 bg-accent hover:bg-accent-hover text-white rounded-xl transition-all duration-150 gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-white px-3 text-slate-400">Or</span>
            </div>
          </div>

          {/* Google OAuth Option (UI only) */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 gap-2.5 font-medium border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all duration-150"
            onClick={() => {
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
              window.location.href = `${API_BASE_URL}/api/auth/google`;
            }}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.99 1 12 1 7.23 1 3.19 3.73 1.24 7.74l3.83 2.97C6.01 7.42 8.78 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.01 3.67-8.64z" />
              <path fill="#FBBC05" d="M5.07 10.71c-.26-.77-.41-1.6-.41-2.46s.15-1.69.41-2.46L1.24 2.82C.45 4.45 0 6.27 0 8.25s.45 3.8 1.24 5.43l3.83-2.97z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.22 0-5.99-2.38-6.96-5.67l-3.83 2.97C3.19 20.27 7.23 23 12 23z" />
            </svg>
            Continue with Google
          </Button>

          {/* Sign In Link */}
          <p className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
