import { useEffect, useRef } from 'react'
import { createWorker } from 'tesseract.js'
import { extractIcDataFromText } from '../utils/icOcrUtils'

/**
 * Headless Tesseract runner for Malaysian IC images.
 * Renders progress via onProgress(0–100).
 */
export default function OCRProcessor({ imageSource, active = true, onProgress, onComplete, onError }) {
  const runIdRef = useRef(0)

  useEffect(() => {
    if (!imageSource || !active) return undefined

    const runId = runIdRef.current + 1
    runIdRef.current = runId
    let cancelled = false
    let worker

    async function runOcr() {
      try {
        onProgress?.(0)
        worker = await createWorker('eng', 1, {
          logger: (message) => {
            if (cancelled || runIdRef.current !== runId) return
            if (message.status === 'recognizing text') {
              onProgress?.(Math.min(99, Math.round((message.progress || 0) * 100)))
            }
          },
        })
        if (cancelled || runIdRef.current !== runId) return

        onProgress?.(10)
        const { data } = await worker.recognize(imageSource)
        if (cancelled || runIdRef.current !== runId) return

        onProgress?.(100)
        const extracted = extractIcDataFromText(data.text || '')
        onComplete?.(extracted)
      } catch (error) {
        if (!cancelled && runIdRef.current === runId) {
          onError?.(error instanceof Error ? error : new Error('OCR failed'))
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
  }, [imageSource, active, onProgress, onComplete, onError])

  return null
}
