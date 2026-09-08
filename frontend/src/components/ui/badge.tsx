import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono tracking-tight",
  {
    variants: {
      variant: {
        default:
          "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700/80",
        secondary:
          "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800/80",
        destructive:
          "border-rose-800/60 bg-rose-950/60 text-rose-300 hover:bg-rose-900/60",
        success:
          "border-emerald-700/60 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60",
        warning:
          "border-amber-700/60 bg-amber-950/60 text-amber-300 hover:bg-amber-900/60",
        info:
          "border-sky-700/60 bg-sky-950/60 text-sky-300 hover:bg-sky-900/60",
        outline: "border-slate-700 text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
