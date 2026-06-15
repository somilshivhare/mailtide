import React, { useState } from 'react';
import { Sparkles, Loader2, ThumbsUp } from 'lucide-react';
import { aiAPI } from '../services/api.js';
import { Button, Badge } from './ui/custom.jsx';

export default function SubjectOptimizer({ subject, onSelectSuggestion }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleOptimize = async () => {
    if (!subject || !subject.trim()) {
      setError('Please type a subject line first.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await aiAPI.optimizeSubject(subject);
      setResult(data);
    } catch (err) {
      setError('Failed to optimize subject line. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreVariant = (score) => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  return (
    <div className="rounded-md border border-border bg-white/[0.01] p-4 mt-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted">Optimize your subject lines for higher open rates using Claude AI.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOptimize}
          disabled={loading || !subject?.trim()}
          className="gap-2 border-accent/30 text-accent hover:bg-accent/10"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Optimize Subject
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3 border-t border-border/50 pt-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Subject Score:</span>
            <Badge variant={getScoreVariant(result.score)}>{result.score} / 100</Badge>
          </div>
          
          <p className="text-xs text-text leading-relaxed">{result.reason}</p>

          <div className="space-y-1.5 pt-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <ThumbsUp className="h-3 w-3 text-accent" />
              <span>Recommended Alternatives (click to use):</span>
            </div>
            <div className="flex flex-col gap-2 mt-1">
              {result.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="w-full text-left rounded-md border border-border bg-surface px-3 py-2 text-xs text-text hover:border-accent hover:bg-accent/5 transition-all duration-150"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
