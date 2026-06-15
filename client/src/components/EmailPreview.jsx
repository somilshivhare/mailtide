import React, { useState } from 'react';
import { Monitor, Smartphone, X } from 'lucide-react';
import { Button } from './ui/custom.jsx';

export default function EmailPreview({ isOpen, onClose, subject = '', body = '' }) {
  const [viewportMode, setViewportMode] = useState('desktop'); // 'desktop' | 'mobile'

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 flex flex-col bg-surface border border-border rounded-xl shadow-premium w-full max-w-5xl h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-white/[0.01]">
          <div>
            <h3 className="text-base font-semibold text-text">Campaign Preview</h3>
            <p className="text-xs text-muted">See how your email appears on different screens</p>
          </div>

          {/* Viewport Toggles */}
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 border border-border/50">
            <button
              onClick={() => setViewportMode('desktop')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                viewportMode === 'desktop'
                  ? 'bg-accent text-white shadow-glow'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                viewportMode === 'mobile'
                  ? 'bg-accent text-white shadow-glow'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-text transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Email Headers Simulated Box */}
        <div className="px-6 py-3 border-b border-border bg-white/[0.02] text-xs space-y-1">
          <div className="flex">
            <span className="text-muted w-14 font-medium">From:</span>
            <span className="text-text/90 font-medium">MailFlow &lt;onboarding@resend.dev&gt;</span>
          </div>
          <div className="flex">
            <span className="text-muted w-14 font-medium">Subject:</span>
            <span className="text-text font-semibold">{subject || '(No Subject)'}</span>
          </div>
        </div>

        {/* Viewport Content */}
        {viewportMode === 'desktop' ? (
          <div className="flex-1 w-full bg-white relative">
            <iframe
              srcDoc={body || '<p style="color: #666; font-family: sans-serif; padding: 20px;">No email content written yet.</p>'}
              className="w-full h-full border-0"
              title="Email Desktop Preview"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <div className="flex-1 flex justify-center items-center bg-zinc-950/40 p-6 overflow-y-auto">
            {/* Smartphone Shell Mockup */}
            <div className="relative w-[375px] h-[667px] border-[12px] border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl bg-white flex flex-col ring-1 ring-white/10">
              {/* Speaker & Sensor Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-zinc-800 rounded-b-2xl z-20 flex items-center justify-center">
                {/* Speaker line */}
                <div className="w-12 h-1 bg-zinc-900 rounded-full" />
              </div>
              
              {/* Screen Content */}
              <div className="flex-1 w-full h-full pt-6 relative">
                <iframe
                  srcDoc={body || '<p style="color: #666; font-family: sans-serif; padding: 20px;">No email content written yet.</p>'}
                  className="w-full h-full border-0"
                  title="Email Mobile Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
