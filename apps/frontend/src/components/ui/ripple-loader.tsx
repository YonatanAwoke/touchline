import { cn } from "@/lib/utils";

interface RippleLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

const RippleLoader = ({ size = "md", className, label }: RippleLoaderProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className={cn("ripple-loader", sizeMap[size])} aria-hidden="true" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
};

export { RippleLoader };
