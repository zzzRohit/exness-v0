interface FigmaIconProps {
  name: string;
  screen?: "signup" | "signin";
  className?: string;
}

export function FigmaIcon({
  name,
  screen = "signup",
  className,
}: FigmaIconProps) {
  return (
    <img
      className={className}
      src={`/figma/${screen}-${name}.svg`}
      alt=""
      aria-hidden="true"
    />
  );
}
