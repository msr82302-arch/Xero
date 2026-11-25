import {Check, Circle} from 'lucide-react';

export interface PasswordStrengthResult {
  hasMinLength: boolean;
  hasLetter: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  score: number;
  label: 'Weak' | 'Fair' | 'Strong';
  tone: 'red' | 'amber' | 'green';
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const checks = [hasMinLength, hasLetter, hasDigit, hasSpecial].filter(Boolean).length;
  const isValid = hasMinLength && hasLetter && hasDigit && hasSpecial;

  let label: 'Weak' | 'Fair' | 'Strong' = 'Weak';
  let tone: 'red' | 'amber' | 'green' = 'red';

  if (isValid) {
    label = 'Strong';
    tone = 'green';
  } else if (checks >= 2 && password.length >= 4) {
    label = 'Fair';
    tone = 'amber';
  }

  return {
    hasMinLength,
    hasLetter,
    hasDigit,
    hasSpecial,
    isValid,
    score: checks,
    label,
    tone,
  };
}

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({password}: PasswordStrengthMeterProps) {
  const res = evaluatePasswordStrength(password);
  const activeSegments = password.length === 0 ? 0 : res.score;

  const barColor =
    res.tone === 'green'
      ? 'bg-emerald-500'
      : res.tone === 'amber'
        ? 'bg-amber-500'
        : 'bg-red-500';

  const labelColor =
    password.length === 0
      ? 'text-slate-400'
      : res.tone === 'green'
        ? 'text-emerald-700'
        : res.tone === 'amber'
          ? 'text-amber-700'
          : 'text-red-600';

  const rules = [
    {ok: res.hasMinLength, text: '8+ characters'},
    {ok: res.hasLetter, text: 'Letter (A-Z)'},
    {ok: res.hasDigit, text: 'Number (0-9)'},
    {ok: res.hasSpecial, text: 'Special (!@#$)'},
  ];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="grid flex-1 grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-colors ${
                idx <= activeSegments ? barColor : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>
          {password.length === 0 ? 'Unset' : res.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {rules.map((rule) => (
          <div
            key={rule.text}
            className={`inline-flex items-center gap-1 text-[10px] font-medium ${
              rule.ok ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            {rule.ok ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="w-2.5 h-2.5 text-slate-300 shrink-0" />
            )}
            <span>{rule.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
