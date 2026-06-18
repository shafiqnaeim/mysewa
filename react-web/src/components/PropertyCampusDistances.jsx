import { parseCampusDistancesField } from '../utils/propertyLocation'

export default function PropertyCampusDistances({ campusDistances, nearestCampus, loading }) {
  const rows = parseCampusDistancesField(campusDistances)

  return (
    <div className="property-form-campus-distances property-form-field--full">
      <p className="property-form-campus-distances-title">Road distance to campuses</p>
      {loading ? (
        <p className="property-form-campus-distances-loading">Calculating road distances…</p>
      ) : null}
      {!rows.length && !loading ? (
        <p className="property-form-campus-distances-loading">Distances appear after you pin the property.</p>
      ) : null}
      {rows.length ? (
        <ul className="property-form-campus-distances-grid">
          {rows.map((row) => {
            const isNearest = nearestCampus === row.code
            return (
              <li
                key={row.code}
                className={`property-form-campus-distances-item${isNearest ? ' property-form-campus-distances-item--nearest' : ''}`}
              >
                <span className="property-form-campus-distances-code">{row.code}</span>
                <span className="property-form-campus-distances-name">{row.name}</span>
                <span className="property-form-campus-distances-km">
                  {row.distanceLabel || '—'}
                  {isNearest ? <span className="property-form-campus-distances-badge">Nearest</span> : null}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
