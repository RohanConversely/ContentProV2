import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#9db8ff] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#ff5c73] text-white hover:bg-[#ff6f83]',
        secondary: 'border-transparent bg-white/10 text-white hover:bg-white/15',
        destructive: 'border-transparent bg-red-500 text-white hover:bg-red-500/80',
        outline: 'text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
