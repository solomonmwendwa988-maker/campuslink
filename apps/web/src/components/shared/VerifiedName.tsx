import { Check } from 'lucide-react';

type VerifiedNameProps = { name: string; verified?: boolean; className?: string; badgeSize?: number };

export function VerifiedName({ name, verified = false, className = '', badgeSize = 14 }: VerifiedNameProps) {
  const size = Math.max(12, Math.min(16, badgeSize));
  return <span className={`campuslink-name-with-badge ${className}`.trim()}><span className="campuslink-name-text">{name}</span>{verified && <span className="campuslink-verified-badge" role="img" aria-label="Verified student" title="CampusLink verified" style={{ width: size, height: size }}><Check size={size * 0.68} strokeWidth={3.1}/></span>}</span>;
}
