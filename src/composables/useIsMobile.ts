import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useIsMobile(maxWidth = 768) {
  const isMobile = ref(false);
  let mq: MediaQueryList | null = null;

  function update(e: MediaQueryList | MediaQueryListEvent) {
    isMobile.value = e.matches;
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    update(mq);
    mq.addEventListener('change', update);
  });

  onBeforeUnmount(() => {
    mq?.removeEventListener('change', update);
    mq = null;
  });

  return { isMobile };
}
