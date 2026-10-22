import { MONTHS } from './uiUtils'

const MUNICIPALITY_SIZES = {
    'ANGAT': 0.9, 'BALAGTAS': 1.0, 'BALIUAG': 1.5, 'BOCAUE': 1.3, 'BULACAN': 0.8, 'BUSTOS': 0.7,
    'CALUMPIT': 1.1, 'DOÑA REMEDIOS TRINIDAD': 0.35, 'GUIGUINTO': 1.0, 'HAGONOY': 1.3,
    'MALOLOS CITY': 2.1, 'MARILAO': 1.6, 'MEYCAUAYAN CITY': 1.9, 'NORZAGARAY': 1.1, 'OBANDO': 0.6,
    'PANDI': 0.9, 'PAOMBONG': 0.55, 'PLARIDEL': 1.2, 'PULILAN': 1.0, 'SAN ILDEFONSO': 0.9,
    'SAN JOSE DEL MONTE CITY': 2.8, 'SAN MIGUEL': 1.2, 'SAN RAFAEL': 0.85, 'SANTA MARIA': 1.8,
}

const TYPE_WEIGHTS = {
    'Hospital Bill': 34, 'Medicines': 28, 'Laboratory Tests': 14, 'Dialysis': 9,
    'Diagnostic Imaging': 8, 'Chemotherapy': 5, 'Surgical Procedure': 4, 'Assistive Devices': 3,
}

// Slightly higher demand in the rainy season (dengue, leptospirosis) and in January.
const SEASONALITY = [1.08, 0.94, 0.92, 0.95, 0.98, 1.04, 1.14, 1.18, 1.12, 1.0, 0.96, 1.02]

export const municipalities = Object.keys(MUNICIPALITY_SIZES).map((name, i) => ({
    municipality_id: i + 1,
    municipality_name: name,
}))

export const assistanceTypes = Object.keys(TYPE_WEIGHTS).map((name, i) => ({
    type_id: i + 1,
    type_name: name,
}))

const START_YEAR = 2023
export const LATEST = { year: 2026, month: 9 }

function seededNoise(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453
    return x - Math.floor(x)
}

const rows = []
{
    let monthIndex = 0
    for (let year = START_YEAR; year <= LATEST.year; year++) {
        const lastMonth = year === LATEST.year ? LATEST.month : 12
        for (let month = 1; month <= lastMonth; month++) {
            const growth = Math.pow(1.011, monthIndex)
            municipalities.forEach(m => {
                assistanceTypes.forEach(t => {
                    const seed = year * 10000 + month * 500 + m.municipality_id * 20 + t.type_id
                    const noise = 0.8 + seededNoise(seed) * 0.4
                    const value = MUNICIPALITY_SIZES[m.municipality_name] * TYPE_WEIGHTS[t.type_name]
                        * 0.55 * SEASONALITY[month - 1] * growth * noise
                    rows.push({
                        year, month,
                        municipality_id: m.municipality_id, municipality_name: m.municipality_name,
                        type_id: t.type_id, type_name: t.type_name,
                        request_count: Math.max(0, Math.round(value)),
                    })
                })
            })
            monthIndex++
        }
    }
}

const isAll = v => v == null || v === '' || v === 'ALL'
const matches = (value, filter) => isAll(filter) || String(value) === String(filter)

function filterRows({ year, month, municipalityId, municipalityName, typeId, typeName } = {}) {
    return rows.filter(r =>
        matches(r.year, year) && matches(r.month, month)
        && matches(r.municipality_id, municipalityId) && matches(r.municipality_name, municipalityName)
        && matches(r.type_id, typeId) && matches(r.type_name, typeName),
    )
}

const sum = list => list.reduce((s, r) => s + r.request_count, 0)

function groupSum(list, key) {
    const totals = {}
    list.forEach(r => { totals[r[key]] = (totals[r[key]] ?? 0) + r.request_count })
    return totals
}

const topEntry = totals => Object.entries(totals).sort((a, b) => b[1] - a[1])[0]
const pct = (current, previous) => (previous ? Number((((current - previous) / previous) * 100).toFixed(1)) : null)

function kpi(q) {
    const base = { municipalityId: q.get('municipality'), typeId: q.get('type') }
    const year = q.get('year')
    const month = q.get('month')
    const current = filterRows({ ...base, year, month: isAll(year) ? 'ALL' : month })

    let growth = null
    if (!isAll(year)) {
        const prevYear = Number(year) - 1
        let previous
        if (!isAll(month)) {
            previous = filterRows({ ...base, year: prevYear, month })
        } else {
            const monthsInView = new Set(current.map(r => r.month))
            previous = filterRows({ ...base, year: prevYear }).filter(r => monthsInView.has(r.month))
        }
        growth = pct(sum(current), sum(previous))
    }

    const [topType, topTypeTotal] = topEntry(groupSum(current, 'type_name')) ?? []
    const [topMuni, topMuniTotal] = topEntry(groupSum(current, 'municipality_name')) ?? []
    return {
        total_requests: sum(current),
        growth_percent: growth,
        top_type: topType ? { type_name: topType, total: topTypeTotal } : null,
        top_municipality: topMuni ? { municipality_name: topMuni, total: topMuniTotal } : null,
    }
}

function trend(q) {
    const year = q.get('year')
    const typeName = q.get('type')
    if (isAll(year)) {
        const totals = groupSum(filterRows({ typeName }), 'year')
        return Object.entries(totals).map(([y, total]) => ({ year: Number(y), total }))
    }
    const totals = groupSum(filterRows({ year, typeName }), 'month')
    return Object.entries(totals).map(([m, total]) => ({ month: MONTHS[Number(m) - 1].label, total }))
}

function distribution(q) {
    const year = q.get('year')
    const totals = groupSum(filterRows({ year, month: isAll(year) ? 'ALL' : q.get('month') }), 'type_name')
    return Object.entries(totals).map(([name, value]) => ({ name, value }))
}

function barchart(q) {
    const year = q.get('year')
    const totals = groupSum(filterRows({ year, month: isAll(year) ? 'ALL' : q.get('month') }), 'municipality_name')
    return Object.entries(totals).map(([municipality_name, total]) => ({ municipality_name, total }))
}

function comparison(q) {
    const m1 = q.get('municipality_1')
    const m2 = q.get('municipality_2')
    const year = q.get('year')
    const scope = { year, month: isAll(year) ? 'ALL' : q.get('month'), typeName: q.get('type') }
    const a = groupSum(filterRows({ ...scope, municipalityName: m1 }), 'type_name')
    const b = groupSum(filterRows({ ...scope, municipalityName: m2 }), 'type_name')
    return assistanceTypes
        .filter(t => matches(t.type_name, q.get('type')))
        .map(t => ({ type_name: t.type_name, [m1]: a[t.type_name] ?? 0, [m2]: b[t.type_name] ?? 0 }))
}

function drillDown(q) {
    const year = q.get('year')
    const totals = groupSum(
        filterRows({ municipalityName: q.get('municipality'), year, month: isAll(year) ? 'ALL' : q.get('month') }),
        'type_name',
    )
    return Object.entries(totals).map(([type_name, total]) => ({ type_name, total }))
}

function availableMonths() {
    return MONTHS.filter(m => m.value <= LATEST.month).map(m => ({ year: LATEST.year, month: m.value })).reverse()
}

function rankings(q) {
    const month = Number(q.get('month')) || LATEST.month
    const topN = Number(q.get('topN')) || 5
    const selected = q.get('selectedMunicipalityRanking')
    const current = groupSum(filterRows({ year: LATEST.year, month }), 'municipality_name')
    const previous = groupSum(filterRows({ year: LATEST.year - 1, month }), 'municipality_name')
    const ranked = Object.entries(current)
        .sort((a, b) => b[1] - a[1])
        .map(([municipality_name, cur]) => ({
            municipality_name,
            current: cur,
            previous: previous[municipality_name] ?? 0,
            growth_rate: pct(cur, previous[municipality_name]) ?? 0,
        }))
    if (!isAll(selected)) return ranked.filter(r => r.municipality_name === selected)
    return ranked.slice(0, topN)
}

function forecast(q) {
    const scope = { municipalityName: q.get('municipality'), typeName: q.get('type') }
    const monthly = {}
    filterRows(scope).forEach(r => {
        const key = r.year * 100 + r.month
        monthly[key] = (monthly[key] ?? 0) + r.request_count
    })
    const timeline = Object.entries(monthly)
        .sort((a, b) => a[0] - b[0])
        .map(([key, total]) => {
            const year = Math.floor(key / 100)
            const month = MONTHS[(key % 100) - 1].label
            return { year, month, label: `${month} ${year}`, total }
        })

    const recent = timeline.slice(-13)
    const rates = recent.slice(1).map((r, i) => (r.total - recent[i].total) / (recent[i].total || 1))
    const avgRate = rates.reduce((s, v) => s + v, 0) / (rates.length || 1)
    const trendRate = Math.min(Math.max(avgRate, -0.05), 0.05)

    const last = timeline[timeline.length - 1]
    const forecastRows = []
    let value = last?.total ?? 0
    for (let step = 1; step <= 3; step++) {
        const monthNumber = ((LATEST.month - 1 + step) % 12) + 1
        const year = LATEST.year + Math.floor((LATEST.month - 1 + step) / 12)
        value = value * (1 + trendRate) * (SEASONALITY[monthNumber - 1] / SEASONALITY[(monthNumber + 10) % 12])
        const spread = 0.06 + step * 0.03
        const month = MONTHS[monthNumber - 1].label
        forecastRows.push({
            year, month, label: `${month} ${year}`,
            future_prediction: Math.round(value),
            lower: Math.round(value * (1 - spread)),
            upper: Math.round(value * (1 + spread)),
        })
    }

    return { timeline, forecast: forecastRows, average_growth_rate: Number((avgRate * 100).toFixed(2)) }
}

function dataset(q) {
    const from = Number(q.get('year_from')) || START_YEAR
    const to = Number(q.get('year_to')) || LATEST.year
    const month = q.get('month')
    return rows
        .filter(r => r.year >= from && r.year <= to && matches(r.month, month))
        .map(({ year, month: m, municipality_name, type_name, request_count }) => ({
            year, month: m, municipality_name, type_name, request_count,
        }))
}

function datasetCsv(q) {
    const lines = ['Year,Month,Municipality,Assistance Type,Requests']
    dataset(q).forEach(r => {
        lines.push([r.year, MONTHS[r.month - 1].label, `"${r.municipality_name}"`, `"${r.type_name}"`, r.request_count].join(','))
    })
    return new Blob([lines.join('\n')], { type: 'text/csv' })
}

const fmt = n => Number(n ?? 0).toLocaleString()

function dashboardNarrative(body) {
    const k = body?.kpi
    if (!k) return 'There is not enough data in the current view to summarize.'
    const growth = k.growth_percent == null
        ? ''
        : ` That is ${k.growth_percent >= 0 ? 'an increase' : 'a decrease'} of ${Math.abs(k.growth_percent)}% against the previous period.`
    return `The selected view records ${fmt(k.total_requests)} medical assistance requests.${growth} `
        + `${k.top_type?.type_name ?? 'Hospital Bill'} remains the most requested type of assistance (${fmt(k.top_type?.total)} requests), `
        + `and ${k.top_municipality?.municipality_name ?? 'San Jose del Monte City'} has the highest volume with ${fmt(k.top_municipality?.total)} requests. `
        + 'Demand rises during the rainy months (July to September), so the office should plan for more staff and budget for hospital bill and medicine assistance in that period.'
}

function analyticsNarrative(body) {
    const top = body?.rankings?.[0]
    const drill = body?.drilldown_data?.[0]
    return `${top ? `${top.municipality_name} leads the rankings with ${fmt(top.current)} requests (${top.growth_rate >= 0 ? '+' : ''}${top.growth_rate}% year over year). ` : ''}`
        + `${drill ? `In the breakdown, ${drill.type_name} makes up the largest share of requests. ` : ''}`
        + 'Large municipalities like San Jose del Monte, Malolos and Meycauayan consistently drive most of the volume, while smaller ones such as Doña Remedios Trinidad and Paombong stay low and stable.'
}

function forecastNarrative(body) {
    const f = body?.forecastData?.forecast ?? []
    if (!f.length) return 'There is not enough history to produce a forecast for this selection.'
    const rate = body.forecastData.average_growth_rate
    return `Demand is projected at ${fmt(f[0].future_prediction)} requests in ${f[0].label}, `
        + `moving to ${fmt(f[f.length - 1].future_prediction)} by ${f[f.length - 1].label}. `
        + `Average month-over-month growth is ${rate >= 0 ? '+' : ''}${rate}%. `
        + 'The confidence range widens further out, so treat the third month as indicative and revisit it once new monthly reports are uploaded.'
}

const delay = (ms = 350) => new Promise(resolve => setTimeout(resolve, ms))

const GET_ROUTES = {
    '/api/municipalities': () => municipalities,
    '/api/assistance_types': () => assistanceTypes,
    '/api/dashboard/kpi': kpi,
    '/api/dashboard/trend': trend,
    '/api/dashboard/distribution': distribution,
    '/api/dashboard/barchart': barchart,
    '/api/analytics/comparison': comparison,
    '/api/analytics/drill_down': drillDown,
    '/api/analytics/available_months': availableMonths,
    '/api/analytics/latest_month': () => LATEST,
    '/api/analytics/n_rankings': rankings,
    '/api/forecast/predict': forecast,
    '/api/export/dataset': dataset,
    '/api/notifications': () => [],
}

const POST_ROUTES = {
    '/api/dashboard/narrative': dashboardNarrative,
    '/api/analytics/narrative': analyticsNarrative,
    '/api/forecast/narrative': forecastNarrative,
}

const split = path => {
    const [pathname, query = ''] = path.split('?')
    return [pathname, new URLSearchParams(query)]
}

export async function mockGet(path) {
    const [pathname, query] = split(path)
    const handler = GET_ROUTES[pathname]
    if (!handler) throw new Error(`No mock for GET ${pathname}`)
    await delay()
    return handler(query)
}

export async function mockPost(path, body) {
    const [pathname] = split(path)
    const handler = POST_ROUTES[pathname]
    if (!handler) throw new Error(`No mock for POST ${pathname}`)
    await delay(900)
    return { narrative: handler(body) }
}

export async function mockBlob(path) {
    const [pathname, query] = split(path)
    if (pathname !== '/api/export/dataset/excel') throw new Error(`No mock for blob ${pathname}`)
    await delay(600)
    return datasetCsv(query)
}
