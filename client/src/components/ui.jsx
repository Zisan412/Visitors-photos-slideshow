import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

export const Button = forwardRef(function Button(
  { as: Component = 'button', variant = 'primary', className = '', children, ...props },
  ref,
) {
  return (
    <Component ref={ref} className={`button button--${variant} ${className}`} {...props}>
      {children}
    </Component>
  );
});

export function Field({ label, id, hint, ...props }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <input className="field__input" id={id} {...props} />
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Brand({ light = false }) {
  return (
    <Link className={`brand${light ? ' brand--light' : ''}`} to="/dashboard" aria-label="Frame home">
      <span className="brand__mark" aria-hidden="true"><span /></span>
      <span>frame<span className="brand__dot">.</span></span>
    </Link>
  );
}

export function PhotoImage({ photo, className = '', ...props }) {
  return <img className={className} src={photo.src || photo.imageUrl} alt={photo.name} loading="lazy" {...props} />;
}
