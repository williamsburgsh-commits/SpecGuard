import { Button } from '@heroui/react';

export function ExternalButton({
  href,
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  return (
    <Button
      variant={variant}
      className={className}
      render={(buttonProps) => (
        <a {...buttonProps} href={href} target="_blank" rel="noopener noreferrer" />
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function HashButton({ href, children, variant = 'ghost', className = '', ...props }) {
  return (
    <Button
      variant={variant}
      className={className}
      render={(buttonProps) => <a {...buttonProps} href={href} />}
      {...props}
    >
      {children}
    </Button>
  );
}
