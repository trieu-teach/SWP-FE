/** Đọc file ảnh → data URL (nén nhẹ) để lưu được và hiện ở mọi trang liên quan. */
export function fileToStorableDataUrl(file, maxWidth = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Không đọc được ảnh'))
      img.onload = () => {
        let w = img.naturalWidth || img.width
        let h = img.naturalHeight || img.height
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w)
          w = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), w, h })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
