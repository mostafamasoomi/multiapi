'use client'

import { ReactNode, useEffect, useState } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setVisible(false), 200)
      document.body.style.overflow = ''
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`
          relative w-full ${sizes[size]} bg-bg-2 border border-border rounded-lg
          shadow-lg transform transition-all duration-200
          ${open ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-text">{title}</h3>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text transition-colors p-1 rounded hover:bg-panel-hover"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Toast ─── */
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  visible: boolean
  onClose: () => void
}

const typeStyles = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-accent/30 bg-accent/10 text-accent',
}

export function Toast({ message, type = 'info', visible, onClose }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 4000)
      return () => clearTimeout(timer)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className={`
      fixed bottom-6 left-1/2 -translate-x-1/2 z-50
      px-5 py-3 rounded border backdrop-blur-xl
      shadow-lg text-sm font-medium
      animate-[slideUp_0.3s_ease-out]
      ${typeStyles[type]}
    `}>
      {message}
    </div>
  )
}

/* ─── ConfirmDialog ─── */
interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmText = 'تأیید', variant = 'primary', loading
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-text-secondary mb-6">{description}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-text-secondary hover:text-text rounded border border-border hover:bg-panel-hover transition-all"
        >
          انصراف
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`
            px-4 py-2 text-sm font-medium rounded transition-all
            disabled:opacity-50
            ${variant === 'danger'
              ? 'bg-danger text-white hover:bg-danger/90'
              : 'bg-accent-gradient text-white hover:opacity-90'
            }
          `}
        >
          {loading ? 'در حال انجام...' : confirmText}
        </button>
      </div>
    </Modal>
  )
}
