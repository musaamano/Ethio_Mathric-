/**
 * useInView.js
 * Detects when an element enters the viewport.
 * Used for scroll-triggered animations across the site.
 *
 * Usage:
 *   const [ref, inView] = useInView(0.2);
 *   <div ref={ref} className={inView ? 'animate-fade-up' : 'opacity-0'} />
 */
import { useEffect, useRef, useState } from 'react';

function useInView(threshold = 0.1, once = true) {
  const ref    = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // If once=true, stop observing after first trigger
          if (once && ref.current) observer.unobserve(ref.current);
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold }
    );

    const el = ref.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [threshold, once]);

  return [ref, inView];
}

export default useInView;
