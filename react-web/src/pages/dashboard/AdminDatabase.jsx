const inputClass =
  'mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#1A1A2E] outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'

function SortIndicator({ active, direction }) {
  if (!active) return <span className="text-[#D1D5DB]">↕</span>
  return <span className="text-[#DC2626]">{direction === 'asc' ? '↑' : '↓'}</span>
}

function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (total === 0) {
    return <p className="text-sm text-[#6B7280]">Showing 0 rows</p>
  }

  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)

  const pages = []
  const maxVisible = 5
  let startPage = Math.max(0, page - 2)
  let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1)
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(0, endPage - maxVisible + 1)
  for (let i = startPage; i <= endPage; i += 1) pages.push(i)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#6B7280]">
        Showing {start}-{end} of {total.toLocaleString('en-MY')} rows
      </p>
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            Previous
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                p === page
                  ? 'bg-[#DC2626] text-white'
                  : 'border border-[#E2E8F0] bg-white text-[#4B5563] hover:bg-[#FAFAFA]'
              }`}
            >
              {p + 1}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}

function RecordModal({ mode, title, fields, form, saving, onChange, onSubmit, onClose }) {
  if (!mode) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="border-b border-[#E2E8F0] px-6 py-4">
          <h2 className="text-lg font-bold text-[#1A1A2E]">{title}</h2>
        </div>
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          {fields.map((field) => (
            <label key={field.key} className="block text-sm font-medium text-[#4B5563]">
              {field.label}
              {field.type === 'select' ? (
                <select
                  className={inputClass}
                  value={form[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  required={field.required}
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.key])}
                    onChange={(e) => onChange(field.key, e.target.checked)}
                  />
                  <span className="text-sm text-[#6B7280]">{field.hint || 'Enabled'}</span>
                </div>
              ) : field.type === 'textarea' ? (
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  required={field.required}
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  className={inputClass}
                  value={form[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  required={field.required}
                  inputMode={field.inputMode}
                />
              )}
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
            >
              {saving ? 'Saving…' : mode === 'add' ? 'Create record' : 'Save changes'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminDatabase({
  tabs,
  activeTab,
  columns,
  rows,
  loading,
  search,
  sortKey,
  sortDir,
  page,
  totalPages,
  filteredTotal,
  pageSize,
  totalElements,
  cappedNote,
  canAdd,
  modalMode,
  modalTitle,
  modalFields,
  modalForm,
  saving,
  onTabChange,
  onSearchChange,
  onSort,
  onPageChange,
  onAdd,
  onEdit,
  onDelete,
  onExportCsv,
  onExportJson,
  onModalChange,
  onModalSubmit,
  onModalClose,
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">📊 </span>
            Database
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">Browse and manage database tables safely</p>
        </header>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Database tables">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-[#DC2626] text-white'
                    : 'border border-[#E2E8F0] bg-white text-[#4B5563] hover:bg-[#FEF2F2]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search within table…"
            className="w-full max-w-md rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
          />
          <div className="flex flex-wrap gap-2">
            {canAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
              >
                Add New Record
              </button>
            ) : null}
            <button
              type="button"
              disabled={loading || filteredTotal === 0}
              onClick={onExportCsv}
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              Export as CSV
            </button>
            <button
              type="button"
              disabled={loading || filteredTotal === 0}
              onClick={onExportJson}
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              Export as JSON
            </button>
          </div>
        </div>

        {cappedNote ? <p className="text-xs text-[#9CA3AF]">{cappedNote}</p> : null}

        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">Loading rows…</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">No rows match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className="px-4 py-3">
                        {col.sortable ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-[#DC2626]"
                            onClick={() => onSort(col.key)}
                          >
                            {col.label}
                            <SortIndicator active={sortKey === col.key} direction={sortDir} />
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      {columns.map((col) => (
                        <td key={col.key} className="max-w-xs truncate px-4 py-3 text-[#4B5563]">
                          {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {row._canEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
                            >
                              Edit
                            </button>
                          ) : null}
                          {row._canDelete ? (
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              className="rounded-lg bg-[#DC2626] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#B91C1C]"
                            >
                              Delete
                            </button>
                          ) : null}
                          {!row._canEdit && !row._canDelete ? (
                            <span className="text-xs text-[#9CA3AF]">Read-only</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={filteredTotal}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />

        {totalElements > filteredTotal && !search ? (
          <p className="text-xs text-[#9CA3AF]">
            Table total: {totalElements.toLocaleString('en-MY')} rows in database.
          </p>
        ) : null}
      </div>

      <RecordModal
        mode={modalMode}
        title={modalTitle}
        fields={modalFields}
        form={modalForm}
        saving={saving}
        onChange={onModalChange}
        onSubmit={onModalSubmit}
        onClose={onModalClose}
      />
    </div>
  )
}
