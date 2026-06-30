import { handleCoverImgError } from '@/pages/User/Tantou/TantouEditor.helpers.js'

export function CoverThumb({ url, sizeClass = 'size-16 sm:size-20' }) {
  return (
    <div className={`flex ${sizeClass} shrink-0 overflow-hidden rounded-lg bg-muted`}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" onError={handleCoverImgError} />
      ) : null}
      <div className={`flex size-full items-center justify-center text-2xl ${url ? 'hidden' : ''}`}>
        📄
      </div>
    </div>
  )
}