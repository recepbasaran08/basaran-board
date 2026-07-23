import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const MAX_TOTAL_BYTES = 30 * 1024 * 1024
const MAX_PDF_PAGES = 40
const MAX_IMAGES = 10

export class MaterialFileError extends Error {}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new MaterialFileError('Görsel okunamadı.'))
    img.src = dataUrl
  })
}

async function processPdf(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const totalPages = pdf.numPages
  const pageCount = Math.min(totalPages, MAX_PDF_PAGES)
  const pages = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    // Yüksekçe bir ölçek: öğretmen materyali 3-4 kat yakınlaştırdığında netlik korunsun diye.
    const viewport = page.getViewport({ scale: 3 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvas, viewport }).promise
    pages.push({
      dataUrl: canvas.toDataURL('image/png'),
      width: viewport.width,
      height: viewport.height,
    })
  }

  return { pages, truncated: totalPages > MAX_PDF_PAGES, totalPages }
}

async function processImages(files) {
  const limited = files.slice(0, MAX_IMAGES)
  const pages = []
  for (const file of limited) {
    const dataUrl = await readFileAsDataUrl(file)
    const { width, height } = await loadImageDimensions(dataUrl)
    pages.push({ dataUrl, width, height })
  }
  return { pages, truncated: files.length > MAX_IMAGES, totalFiles: files.length }
}

export async function processMaterialFiles(fileList) {
  const files = Array.from(fileList)
  if (files.length === 0) return null

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new MaterialFileError('Toplam dosya boyutu 30 MB sınırını aşıyor. Daha küçük dosyalarla tekrar dene.')
  }

  const pdfFiles = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
  const imageFiles = files.filter((f) => f.type.startsWith('image/'))

  if (pdfFiles.length > 0) {
    if (pdfFiles.length > 1) {
      throw new MaterialFileError('Aynı anda sadece bir PDF yükleyebilirsin.')
    }
    const { pages, truncated, totalPages } = await processPdf(pdfFiles[0])
    return {
      pages,
      label: pdfFiles[0].name,
      warning: truncated ? `PDF ${totalPages} sayfa içeriyor, ilk ${MAX_PDF_PAGES} sayfa yüklendi.` : null,
    }
  }

  if (imageFiles.length > 0) {
    const { pages, truncated, totalFiles } = await processImages(imageFiles)
    return {
      pages,
      label: imageFiles.length === 1 ? imageFiles[0].name : `${pages.length} görsel`,
      warning: truncated ? `${totalFiles} görsel seçildi, ilk ${MAX_IMAGES} tanesi yüklendi.` : null,
    }
  }

  throw new MaterialFileError('Desteklenmeyen dosya türü. Lütfen PDF veya görsel (PNG/JPG) seç.')
}
