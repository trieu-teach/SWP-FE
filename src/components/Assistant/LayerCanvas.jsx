import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function LayerCanvas({ layers, width = 800, height = 1100, className }) {
  const canvasRef = useRef(null)
  const [imgCache, setImgCache] = useState({})

  const sorted = useMemo(() => [...layers].sort((a, b) => a.index - b.index), [layers])

  useEffect(() => {
    const urls = sorted.map(l => l.imageUrl).filter(Boolean)
    const newOnes = urls.filter(u => !imgCache[u])
    if (newOnes.length === 0) return
    let cancelled = false
    Promise.allSettled(newOnes.map(loadImage)).then(results => {
      if (cancelled) return
      setImgCache(cur => {
        const next = { ...cur }
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') next[newOnes[i]] = r.value
        })
        return next
      })
    })
    return () => { cancelled = true }
  }, [sorted, imgCache])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const drawList = sorted.filter(l => l.visible)
    let cancelled = false

    async function draw() {
      for (const layer of drawList) {
        const img = imgCache[layer.imageUrl]
        if (!img) continue
        const op = (layer.opacity ?? 100) / 100
        ctx.save()
        ctx.globalAlpha = op
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        ctx.restore()
      }
    }

    draw()
    return () => { cancelled = true }
  }, [sorted, imgCache])

  return (
    <div className={cn('relative overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm', className)}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block max-h-full max-w-full"
        style={{ aspectRatio: `${width} / ${height}` }}
      />
      {sorted.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Chua co layer nao — upload de bat dau.
        </div>
      )}
    </div>
  )
}
