import { useRef, useState } from 'react'
import { MAINTENANCE_CATEGORIES } from '../services/maintenanceReportService'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export default function ReportForm({
  propertyId,
  propertyName,
  submitting = false,
  onSubmit,
}) {
  const fileRef = useRef(null)
  const [category, setCategory] = useState('plumbing')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoName, setPhotoName] = useState('')

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) {
      setPhoto(null)
      setPhotoName('')
      return
    }
    if (!file.type.startsWith('image/')) {
      e.target.value = ''
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      e.target.value = ''
      return
    }
    setPhoto(file)
    setPhotoName(file.name)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!propertyId || description.trim().length < 10) return
    onSubmit?.({
      propertyId,
      category,
      description: description.trim(),
      photo,
    })
  }

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#2D3748]">
        <span aria-hidden="true">🔧 </span>
        Submit Maintenance Report
      </h2>
      {propertyName ? (
        <p className="mt-1 text-sm text-[#718096]">Property: {propertyName}</p>
      ) : null}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm" htmlFor="report-category">
          <span className="mb-1.5 block font-semibold text-[#4A5568]">Category</span>
          <select
            id="report-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20"
          >
            {MAINTENANCE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm" htmlFor="report-description">
          <span className="mb-1.5 block font-semibold text-[#4A5568]">Description</span>
          <textarea
            id="report-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            maxLength={4000}
            placeholder="Describe the issue in detail (at least 10 characters)…"
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20"
          />
        </label>

        <div>
          <p className="text-sm font-semibold text-[#4A5568]">Photo (optional)</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            className="sr-only"
            disabled={submitting}
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={submitting}
            className="mt-2 rounded-lg border border-[#6C2BD9] bg-white px-4 py-2 text-sm font-semibold text-[#6C2BD9] hover:bg-[#F3F0FF] disabled:opacity-50"
          >
            Choose Photo
          </button>
          {photoName ? <p className="mt-2 text-xs text-[#718096]">{photoName}</p> : null}
        </div>

        <button
          type="submit"
          disabled={submitting || description.trim().length < 10}
          className="rounded-xl bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#5B21B6] disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </form>
    </section>
  )
}
