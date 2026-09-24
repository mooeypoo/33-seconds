import { onUnmounted, ref, type Ref } from 'vue';

/**
 * Wide enough for the CIC shell: two consoles beside the lane (ADR-0002 Phase 2). Narrower windows,
 * phones and tablets, keep the strips above and below the lane. Changes live with the window.
 */
export const CIC_MIN_WIDTH_PX = 1100;

export function useCicLayout(): Ref<boolean> {
  const query = window.matchMedia(`(min-width: ${String(CIC_MIN_WIDTH_PX)}px)`);
  const cic = ref(query.matches);
  const onChange = (event: MediaQueryListEvent): void => {
    cic.value = event.matches;
  };
  query.addEventListener('change', onChange);
  onUnmounted(() => {
    query.removeEventListener('change', onChange);
  });
  return cic;
}
