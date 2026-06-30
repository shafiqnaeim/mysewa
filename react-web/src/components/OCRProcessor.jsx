import { useEffect, useRef } from 'react'
import { createWorker } from 'tesseract.js'
import { extractIcDataFromText } from '../utils/icOcrUtils'

function mapTesseractProgress(message) {
  const status = message?.status || ''
  const progress = message?.progress ?? 0
  if (status === 'loading tesseract core') return 10
  if (status === 'initializing tesseract') return 20
  if (status === 'loading language traineddata') return 35
  if (status === 'initialized api') return 45
  if (status === 'recognizing text') return Math.min(99, 50 + Math.round(progress * 50))
  return null
}

/**
 * Headless Tesseract runner for Malaysian IC images.
 * Renders progress via onProgress(0–100).
 */
export default function OCRProcessor({ imageSource, active = true, onProgress, onComplete, onError }) {
  const runIdRef = useRef(0)
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)

  onProgressRef.current = onProgress
  onCompleteRef.current = onComplete
  onErrorRef.current = onError

  useEffect(() => {
    if (!imageSource || !active) return undefined

    const runId = runIdRef.current + 1
    runIdRef.current = runId
    let cancelled = false
    let worker

    async function runOcr() {
      try {
        onProgressRef.current?.(5)
        worker = await createWorker('eng', 1, {
          logger: (message) => {
            if (cancelled || runIdRef.current !== runId) return
            const mapped = mapTesseractProgress(message)
            if (mapped != null) onProgressRef.current?.(mapped)
          },
        })
        if (cancelled || runIdRef.current !== runId) return

        onProgressRef.current?.(50)
        const { data } = await worker.recognize(imageSource)
        if (cancelled || runIdRef.current !== runId) return

        onProgressRef.current?.(100)
        const extracted = extractIcDataFromText(data.text || '')
        onCompleteRef.current?.(extracted)
      } catch (error) {
        if (!cancelled && runIdRef.current === runId) {
          onErrorRef.current?.(error instanceof Error ? error : new Error('OCR failed'))
        }
      } finally {
        try {
          await worker?.terminate()
        } catch {
          /* ignore */
        }
      }
    }

    void runOcr()

    return () => {
      cancelled = true
      runIdRef.current += 1
      void worker?.terminate()
    }
  }, [imageSource, active])

  return null
}
