import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PROPERTY_COLORS = ['#DC2626', '#2563EB', '#F59E0B', '#6B7280']

function formatNumber(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  return v.toLocaleString('en-MY')
}

function StatCard({ label, value, trend, trendClass, borderClass }) {
  return (
    <article className={`rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-6 shadow-sm ${borderClass}`}>
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#1A1A2E]">{value}</p>
      <p className={`mt-2 text-xs font-medium ${trendClass}`}>{trend}</p>
    </article>
  )
}

function UserGrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-[#1A1A2E]">{label}</p>
      <p className="text-[#DC2626]">{formatNumber(payload[0].value)} users</p>
    </div>
  )
}

function PropertyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-[#1A1A2E]">{row.name}</p>
      <p className="text-[#6B7280]">{row.value}%</p>
    </div>
  )
}

export default function AdminDashboard({
  greetingName = 'Admin',
  greeting = 'Good morning',
  headerStats = {},
  statCards = [],
  userGrowthData = [],
  propertyDistribution = [],
  recentActivity = [],
  pendingVerifications = [],
  verificationActionId = null,
  onVerifyUser,
  onRejectUser,
}) {
  const {
    users = 0,
    properties = 0,
    bookings = 0,
    pendingVerifications: pendingCount = 0,
  } = headerStats

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#DC2626] to-[#991B1B] px-6 py-8 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">
          <span aria-hidden="true">⚙️ </span>
          {greeting}, {greetingName}
        </h1>
        <p className="mt-2 text-sm text-red-200">Here&apos;s what&apos;s happening across the platform</p>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-red-100">
          <span>
            <span aria-hidden="true">● </span>
            {formatNumber(users)} users
          </span>
          <span>
            <span aria-hidden="true">● </span>
            {formatNumber(properties)} properties
          </span>
          <span>
            <span aria-hidden="true">● </span>
            {formatNumber(bookings)} bookings
          </span>
          <span>
            <span aria-hidden="true">● </span>
            {formatNumber(pendingCount)} pending verifications
          </span>
        </p>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Stat cards */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <StatCard key={card.key} {...card} />
          ))}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1A1A2E]">
              <span aria-hidden="true">📈 </span>
              User Growth
            </h2>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<UserGrowthTooltip />} cursor={{ fill: '#FEF2F2' }} />
                  <Bar dataKey="users" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {userGrowthData.map((entry, i) => (
                      <Cell
                        key={entry.month}
                        fill={i === userGrowthData.length - 1 ? '#DC2626' : '#FCA5A5'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1A1A2E]">
              <span aria-hidden="true">🏠 </span>
              Property Distribution
            </h2>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={propertyDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {propertyDistribution.map((entry, i) => (
                      <Cell key={entry.name} fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PropertyTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-[#6B7280]">
              {propertyDistribution.map((item, i) => (
                <li key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: PROPERTY_COLORS[i % PROPERTY_COLORS.length] }}
                    aria-hidden="true"
                  />
                  {item.name} {item.value}%
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* Recent activity */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A2E]">
            <span aria-hidden="true">📋 </span>
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B7280]">No recent activity yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#E2E8F0]">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-4 first:pt-2 last:pb-0">
                  <span className="text-lg" aria-hidden="true">
                    {item.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1A1A2E]">{item.text}</p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">{item.timeAgo}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pending verifications */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A2E]">
            <span aria-hidden="true">⏳ </span>
            Pending Verifications ({pendingVerifications.length})
          </h2>
          {pendingVerifications.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B7280]">No pending identity verifications.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Submitted</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingVerifications.map((row) => (
                    <tr key={row.id} className="border-b border-[#E2E8F0] last:border-0">
                      <td className="px-3 py-3 font-medium text-[#1A1A2E]">{row.name}</td>
                      <td className="px-3 py-3 capitalize text-[#4B5563]">{row.type}</td>
                      <td className="px-3 py-3 text-[#6B7280]">{row.submittedAgo}</td>
                      <td className="px-3 py-3">
                        <span className="text-[#F59E0B]">
                          <span aria-hidden="true">⏳ </span>
                          Pending
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={verificationActionId === row.id}
                            onClick={() => onVerifyUser(row.id)}
                            className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            disabled={verificationActionId === row.id}
                            onClick={() => onRejectUser(row.id)}
                            className="rounded-lg border border-[#DC2626] bg-white px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
