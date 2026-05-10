import logoSrc from "@/assets/techvinex-logo.png";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

/**
 * Official Techvinex (TX) brand mark. Use anywhere a logo is needed.
 */
const BrandLogo = ({ className, size = 32, alt = "Techvinex" }: BrandLogoProps) => (
  <img
    src={logoSrc}
    alt={alt}
    width={size}
    height={size}
    className={cn("object-contain select-none", className)}
    draggable={false}
  />
);

export default BrandLogo;
