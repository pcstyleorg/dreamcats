import { useLayoutEffect, useState, useCallback, RefObject } from 'react';

export interface UseScaleToFitOptions {
  /** Maximum scale factor (default: 1) */
  maxScale?: number;
  /** Minimum scale factor to prevent content from becoming too small (default: 0.65) */
  minScale?: number;
  /** Padding in pixels to leave around the scaled content (default: 0) */
  padding?: number;
  /** Whether to enable the scaling (default: true) */
  enabled?: boolean;
}

export interface ScaleToFitResult {
  /** Current scale factor applied to the content */
  scale: number;
  /** Whether the content is currently scaled down (scale < 1) */
  isScaled: boolean;
  /** Trigger a manual recalculation */
  recalculate: () => void;
}

/**
 * Hook to scale content to fit within its parent container.
 * Uses transform: scale() which is more performant than CSS zoom
 * and doesn't affect layout of surrounding elements.
 *
 * @param containerRef - Ref to the container that defines the available space
 * @param contentRef - Ref to the content that should be scaled to fit
 * @param options - Configuration options
 */
export function useScaleToFit(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  options: UseScaleToFitOptions = {}
): ScaleToFitResult {
  const {
    maxScale = 1,
    minScale = 0.65,
    padding = 0,
    enabled = true,
  } = options;

  const [scale, setScale] = useState(1);

  const calculateScale = useCallback(() => {
    if (!enabled || !containerRef.current || !contentRef.current) {
      setScale(1);
      return;
    }

    const container = containerRef.current;
    const content = contentRef.current;

    // Get available space from container
    const availableWidth = container.clientWidth - padding * 2;
    const availableHeight = container.clientHeight - padding * 2;

    // Temporarily reset transform to measure natural size
    const originalTransform = content.style.transform;
    content.style.transform = 'none';

    // Force reflow to get accurate measurements
    void content.offsetHeight;

    // Get natural content size
    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;

    // Restore transform
    content.style.transform = originalTransform;

    // Calculate required scale
    let newScale = 1;

    if (contentWidth > 0 && contentHeight > 0) {
      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;
      newScale = Math.min(scaleX, scaleY, maxScale);
      newScale = Math.max(newScale, minScale);
      // Round to 2 decimal places to avoid sub-pixel jitter
      newScale = Math.round(newScale * 100) / 100;
    }

    setScale(newScale);
  }, [containerRef, contentRef, maxScale, minScale, padding, enabled]);

  useLayoutEffect(() => {
    if (!enabled) {
      setScale(1);
      return;
    }

    // Use RAF for smooth updates
    let rafId: number;
    const debouncedCalculate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateScale);
    };

    // Initial calculation
    debouncedCalculate();

    // Watch for container size changes
    const resizeObserver = new ResizeObserver(debouncedCalculate);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Watch for window resize (catches browser zoom changes)
    window.addEventListener('resize', debouncedCalculate);

    // Watch for visual viewport changes (mobile keyboard, pinch zoom)
    window.visualViewport?.addEventListener('resize', debouncedCalculate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedCalculate);
      window.visualViewport?.removeEventListener('resize', debouncedCalculate);
    };
  }, [calculateScale, enabled, containerRef]);

  return {
    scale,
    isScaled: scale < 1,
    recalculate: calculateScale,
  };
}
