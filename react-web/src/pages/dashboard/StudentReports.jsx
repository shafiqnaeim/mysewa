function reportStatusDisplay(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s === 'resolved') {
    return { emoji: '✅', label: 'Resolved', className: 'text-[#10B981]' }
  }
  return { emoji: '⏳', label: 'Pending', className: 'text-[#F59E0B]' }
}

function reportImageUrl(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return s.startsWith('/') ? s : `/${s}`
}

function ReportCard({ report, resolveSavingId, onResolve }) {
  const status = reportStatusDisplay(report.status)
  const canResolve = String(report.status || '').toLowerCase() === 'received'

  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#6B7280]">
            {report.createdAt ? new Date(report.createdAt).toLocaleString() : '—'}
          </p>
          <p className="mt-2 text-base font-semibold text-[#1A1A2E]">{report.message}</p>
          {report.imageUrl ? (
            <a
              href={reportImageUrl(report.imageUrl)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block"
            >
              <img
                src={reportImageUrl(report.imageUrl)}
                alt=""
                className="max-h-36 rounded-lg border border-[#E2E8F0] object-cover"
              />
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <p className={`text-sm font-semibold ${status.className}`}>
            <span aria-hidden="true">{status.emoji} </span>
            {status.label}
          </p>
          {canResolve ? (
            <button
              type="button"
              disabled={resolveSavingId === report.id}
              onClick={() => onResolve(report.id)}
              className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669] disabled:opacity-60"
            >
              {resolveSavingId === report.id ? 'Saving…' : 'Resolve'}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default function StudentReports({
  hasTenancy,
  propertyName,
  reports,
  reportsLoading,
  reportText,
  reportImageName,
  reportSubmitting,
  resolveSavingId,
  reportFileInputRef,
  onReportTextChange,
  onChooseFile,
  onFileChange,
  onSubmitReport,
  onResolveReport,
  onBrowseListings,
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">📝 </span>
            Reports
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Report maintenance or tenancy issues to your landlord
          </p>
        </header>

        {!hasTenancy ? (
          <section className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[#4B5563]">
              You need an accepted rental before you can submit reports.
            </p>
            <button
              type="button"
              onClick={onBrowseListings}
              className="mt-4 rounded-lg bg-[#6C2BD9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
            >
              Browse Properties
            </button>
          </section>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                <span aria-hidden="true">📋 </span>
                Your Reports
              </h2>
              {propertyName ? (
                <p className="mt-1 text-xs text-[#6B7280]">Property: {propertyName}</p>
              ) : null}
              <div className="mt-4 space-y-4">
                {reportsLoading ? (
                  <p className="text-sm text-[#6B7280]">Loading your reports…</p>
                ) : reports.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#E2E8F0] bg-white p-6 text-center text-sm text-[#6B7280]">
                    No reports submitted yet.
                  </p>
                ) : (
                  reports.map((rep) => (
                    <ReportCard
                      key={rep.id}
                      report={rep}
                      resolveSavingId={resolveSavingId}
                      onResolve={onResolveReport}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                <span aria-hidden="true">✍️ </span>
                Submit a Report
              </h2>
              <form className="mt-6 space-y-5" onSubmit={onSubmitReport}>
                <label className="block text-sm" htmlFor="student-report-msg">
                  <span className="mb-1.5 block font-medium text-[#4B5563]">Issue Description</span>
                  <textarea
                    id="student-report-msg"
                    rows={4}
                    placeholder="e.g. Aircon not cooling, leak under sink..."
                    value={reportText}
                    onChange={(e) => onReportTextChange(e.target.value)}
                    disabled={reportSubmitting}
                    maxLength={4000}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 disabled:bg-[#F9FAFB]"
                  />
                </label>

                <div>
                  <p className="text-sm font-medium text-[#4B5563]">Photo Upload</p>
                  <input
                    ref={reportFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    className="sr-only"
                    aria-hidden="true"
                    tabIndex={-1}
                    disabled={reportSubmitting}
                    onChange={onFileChange}
                  />
                  <button
                    type="button"
                    onClick={onChooseFile}
                    disabled={reportSubmitting}
                    className="mt-2 w-full rounded-lg border border-[#6C2BD9] bg-white px-4 py-2.5 text-sm font-semibold text-[#6C2BD9] hover:bg-[#F3F0FF] disabled:opacity-50 sm:w-auto"
                  >
                    Choose File
                  </button>
                  {reportImageName ? (
                    <p className="mt-2 truncate text-xs text-[#4B5563]" title={reportImageName}>
                      {reportImageName}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#9CA3AF]">JPG or PNG, max 8 MB</p>
                </div>

                <button
                  type="submit"
                  disabled={reportSubmitting || reportText.trim().length < 10}
                  className="w-full rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {reportSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </form>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
