'use client';

import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { formatCoins } from '@/lib/mediaUtils';

interface CoinDisplayProps {
  balance?: number;
  size?: 'sm' | 'md' | 'lg';
  isLow?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'text-xs gap-1',
  md: 'text-sm gap-1.5',
  lg: 'text-base gap-2',
};

const iconSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
};

export function CoinDisplay({
  balance = 0,
  size = 'md',
  isLow = false,
  className,
  onClick,
}: CoinDisplayProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      title={`${balance.toLocaleString()} Face Tokens`}
      className={clsx(
        'inline-flex items-center font-bold rounded-xl transition-all duration-200 px-2 py-1',
        sizeClasses[size],
        isLow
          ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20 animate-pulse'
          : 'text-amber-400 bg-amber-400/10 border border-amber-400/20 hover:border-amber-400/40',
        onClick && 'cursor-pointer hover:bg-amber-400/20 hover:shadow-[0_0_15px_rgba(251,191,36,0.2)]',
        !onClick && 'cursor-default',
        className
      )}
    >
      <span className={iconSizes[size]}>🪙</span>
      <span className="font-extrabold">{formatCoins(balance)}</span>
      <span className="text-[10px] text-amber-300/80 font-semibold tracking-wide uppercase">Tokens</span>
      {isLow && (
        <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 ml-0.5" />
      )}
    </button>
  );
}

export default CoinDisplay;
