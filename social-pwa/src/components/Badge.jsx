import { Shield, Star, Award, Zap } from 'lucide-react';

const BadgeIcon = ({ type, className }) => {
  switch (type) {
    case 'admin':
      return <Shield className={className} />;
    case 'pro':
      return <Star className={className} />;
    case 'top_contributor':
      return <Award className={className} />;
    case 'early_adopter':
      return <Zap className={className} />;
    default:
      return null;
  }
};

const BadgeLabel = ({ type }) => {
  switch (type) {
    case 'admin':
      return 'Admin';
    case 'pro':
      return 'Pro';
    case 'top_contributor':
      return 'Top';
    case 'early_adopter':
      return 'Early Adopter';
    default:
      return type;
  }
};

export default function Badge({ type }) {
  const isSpecial = type === 'admin' || type === 'pro';

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
        ${type === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800' : ''}
        ${type === 'pro' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : ''}
        ${!isSpecial ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700' : ''}
      `}
      title={BadgeLabel({type})}
    >
      <BadgeIcon type={type} className="w-3 h-3" />
      <span><BadgeLabel type={type} /></span>
    </div>
  );
}
