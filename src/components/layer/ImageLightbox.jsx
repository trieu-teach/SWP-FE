import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ImageLightbox({ src, alt, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!src) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="absolute -top-10 left-0 right-0 text-center text-sm font-medium text-white/80">
            {title}
          </div>
        )}
        <img
          src={src}
          alt={alt ?? ''}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          className="absolute -right-3 -top-3 size-8 rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={onClose}
          title="Đóng (Esc)"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
