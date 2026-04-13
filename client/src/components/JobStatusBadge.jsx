import { Loader2, CheckCircle2, XCircle, Clock, Ban } from 'lucide-react';

const statusConfig = {
  pending: { 
    bg: 'rgba(217, 119, 6, 0.2)', 
    text: 'var(--warning-400)', 
    label: 'Pending',
    icon: Clock,
    dot: false
  },
  running: { 
    bg: 'rgba(99, 102, 241, 0.2)', 
    text: 'var(--primary-400)', 
    label: 'Running',
    icon: Loader2,
    spin: true,
    dot: true
  },
  completed: { 
    bg: 'rgba(5, 150, 105, 0.2)', 
    text: 'var(--success-400)', 
    label: 'Completed',
    icon: CheckCircle2,
    dot: false
  },
  failed: { 
    bg: 'rgba(220, 38, 38, 0.2)', 
    text: 'var(--error-400)', 
    label: 'Failed',
    icon: XCircle,
    dot: false
  },
  cancelled: { 
    bg: 'rgba(100, 116, 139, 0.2)', 
    text: 'var(--text-300)', 
    label: 'Cancelled',
    icon: Ban,
    dot: false
  },
};

export default function JobStatusBadge({ status, showLabel = true }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: config.bg, color: config.text }}
    >
      <Icon className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />
      {showLabel && config.label}
    </span>
  );
}
