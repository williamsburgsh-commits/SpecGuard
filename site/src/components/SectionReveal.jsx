import { useReveal } from '../hooks/useReveal';

export function SectionReveal({ id, className = '', children }) {
  const ref = useReveal();
  return (
    <section ref={ref} id={id} className={`section reveal ${className}`.trim()}>
      {children}
    </section>
  );
}
