import { useId } from "react";

/** Official PAN artwork. A luminance key removes only its #f7f7f7 backing. */
export default function PanMark({ className = "", label = "Partido Acción Nacional" }: { className?: string; label?: string }) {
  const id = `pan-ink-${useId().replaceAll(":", "")}`;
  return <svg className={`pan-mark ${className}`} viewBox="0 0 400 400" role="img" aria-label={label}>
    <defs><filter id={id} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.145098 0 0 0 0 0.215686 0 0 0 0 0.458824 -1.214286 0 0 0 1.176190" /><feComposite operator="in" in2="SourceAlpha" /></filter></defs>
    <image href="/images/real/pan-logo-negative.png" width="400" height="400" filter={`url(#${id})`} />
  </svg>;
}
