import {
  Code2,
  CreditCard,
  Layers,
  LifeBuoy,
  Network,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import type {ServiceIconName} from '@/src/data/services';

interface ServiceIconProps {
  name: ServiceIconName;
  className?: string;
}

export function ServiceIcon({name, className = 'w-5 h-5'}: ServiceIconProps) {
  switch (name) {
    case 'Code2':
      return <Code2 className={className} />;
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Store':
      return <Store className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Network':
      return <Network className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'CreditCard':
      return <CreditCard className={className} />;
    case 'LifeBuoy':
      return <LifeBuoy className={className} />;
    case 'Layers':
      return <Layers className={className} />;
  }
}
