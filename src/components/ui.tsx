import type { PropsWithChildren, ReactNode } from 'react'
import { AlertTriangle, CircleCheckBig, Info, LoaderCircle, XCircle } from 'lucide-react'
import clsx from 'clsx'

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fill = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fill?: boolean
}) {
  return (
    <button
      className={clsx('button', `button--${variant}`, `button--${size}`, fill && 'button--fill', className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: PropsWithChildren<{
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  className?: string
}>) {
  return <span className={clsx('badge', `badge--${tone}`, className)}>{children}</span>
}

export function Card({
  children,
  title,
  subtitle,
  actions,
  className,
}: PropsWithChildren<{
  title?: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}>) {
  return (
    <section className={clsx('card', className)}>
      {(title || subtitle || actions) && (
        <header className="card__header">
          <div>
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__description">{description}</p>
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  label: string
  value: number | string
  helper: string
  tone?: 'neutral' | 'info' | 'success' | 'warning'
}) {
  return (
    <article className={clsx('metric-card', `metric-card--${tone}`)}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
      <span className="metric-card__helper">{helper}</span>
    </article>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Info size={18} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function FormField({
  label,
  hint,
  error,
  children,
}: PropsWithChildren<{ label: string; hint?: string; error?: string }>) {
  return (
    <label className="form-field">
      <span className="form-field__label">{label}</span>
      {children}
      {(hint || error) && <span className={clsx('form-field__hint', error && 'form-field__hint--error')}>{error || hint}</span>}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input" {...props} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input input--textarea" {...props} />
}

export function InlineMessage({
  kind,
  message,
}: {
  kind: 'success' | 'warning' | 'error' | 'info' | 'loading'
  message: string
}) {
  const icon =
    kind === 'success' ? (
      <CircleCheckBig size={16} />
    ) : kind === 'warning' ? (
      <AlertTriangle size={16} />
    ) : kind === 'error' ? (
      <XCircle size={16} />
    ) : kind === 'loading' ? (
      <LoaderCircle size={16} className="spin" />
    ) : (
      <Info size={16} />
    )

  return (
    <div className={clsx('inline-message', `inline-message--${kind}`)}>
      {icon}
      <span>{message}</span>
    </div>
  )
}

export function KeyValue({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="key-value">
      <span className="key-value__label">{label}</span>
      <span className="key-value__value">{value}</span>
    </div>
  )
}

export function ProgressBar({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="progress-bar">
      <div className="progress-bar__meta">
        <span>{label}</span>
        <strong>%{value}</strong>
      </div>
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}
