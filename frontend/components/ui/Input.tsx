'use client'

import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'

/* ─── Input ─── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  icon?: ReactNode
}

export function Input({ label, error, helper, icon, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</span>}
        <input
          className={`
            w-full bg-bg-3 border rounded px-4 py-2.5 text-sm text-text
            placeholder:text-text-muted transition-all duration-150
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
            ${error ? 'border-danger' : 'border-border-light'}
            ${icon ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
      {helper && !error && <span className="text-xs text-text-muted">{helper}</span>}
    </div>
  )
}

/* ─── Textarea ─── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <textarea
        className={`
          w-full bg-bg-3 border rounded px-4 py-2.5 text-sm text-text
          placeholder:text-text-muted transition-all duration-150 resize-none
          focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
          ${error ? 'border-danger' : 'border-border-light'}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

/* ─── Select ─── */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <select
        className={`
          w-full bg-bg-3 border border-border-light rounded px-4 py-2.5 text-sm text-text
          transition-all duration-150 cursor-pointer
          focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
          ${className}
        `}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
