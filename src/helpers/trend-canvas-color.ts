export type ComputedColorResolver = (color:string) => string;
export type CanvasColorSampler = (color:string) => string | undefined;

const UNRESOLVED_COLOR = /(?:var|color-mix)\s*\(/i;

export function isUnresolvedCanvasColor(color:string):boolean {
  return UNRESOLVED_COLOR.test(color);
}

export function normalizeTrendCanvasColor(
  color:string,
  resolveComputedColor:ComputedColorResolver,
  sampleCanvasColor:CanvasColorSampler,
  fallback = "rgba(68, 77, 158, 1)"
):string {
  const computed = resolveComputedColor(color).trim();
  if (computed && !isUnresolvedCanvasColor(computed)) {
    const sampled = sampleCanvasColor(computed)?.trim();
    if (sampled && !isUnresolvedCanvasColor(sampled)) return sampled;
  }

  const sampledFallback = sampleCanvasColor(fallback)?.trim();
  return sampledFallback && !isUnresolvedCanvasColor(sampledFallback)
    ? sampledFallback
    : fallback;
}

export function canvasColorWithAlpha(color:string, alpha:number):string {
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));
  const rgba = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(color);
  if (rgba) {
    return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${normalizedAlpha})`;
  }
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (hex) {
    return `rgba(${parseInt(hex[1],16)}, ${parseInt(hex[2],16)}, ${parseInt(hex[3],16)}, ${normalizedAlpha})`;
  }
  return color;
}

export function createTrendAreaFill(
  context:CanvasRenderingContext2D,
  top:number,
  bottom:number,
  color:string
):CanvasGradient | string | undefined {
  try {
    const gradient = context.createLinearGradient(0,top,0,bottom);
    gradient.addColorStop(0,canvasColorWithAlpha(color,0.35));
    gradient.addColorStop(1,canvasColorWithAlpha(color,0));
    return gradient;
  } catch {
    // A malformed browser/theme color must only affect this Area fill. The
    // caller can still draw its stroke and every later Series.
    try {
      return canvasColorWithAlpha(color,0.18);
    } catch {
      return undefined;
    }
  }
}
