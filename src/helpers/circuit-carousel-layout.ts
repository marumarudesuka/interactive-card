export interface CircuitCarouselAlignmentInput {
  previousVisibleCount:number;
  nextVisibleCount:number;
  previousUsesCarousel:boolean;
  nextUsesCarousel:boolean;
  settledIndex:number;
  itemCount:number;
  nextTrackStep:number;
}

export interface CircuitCarouselAlignment {
  settledIndex:number;
  scrollLeft:number;
  reset:boolean;
}

export function getCircuitStaticColumnCount(
  visibleCount:1 | 2 | 4
):number {
  return visibleCount;
}

export function planCircuitCarouselAlignment(
  input:CircuitCarouselAlignmentInput
):CircuitCarouselAlignment {
  const reset = input.previousVisibleCount !== input.nextVisibleCount ||
    input.previousUsesCarousel !== input.nextUsesCarousel;
  if (reset || !input.nextUsesCarousel) {
    return { settledIndex:0, scrollLeft:0, reset:true };
  }

  const maxIndex = Math.max(0,input.itemCount - input.nextVisibleCount);
  const settledIndex = Math.max(0,Math.min(maxIndex,input.settledIndex));
  return {
    settledIndex,
    scrollLeft:settledIndex * Math.max(0,input.nextTrackStep),
    reset:false,
  };
}
