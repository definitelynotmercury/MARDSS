import { useState, useEffect } from 'react'
import Layout from './Layout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3, Search, Trophy } from 'lucide-react'
import { getToken } from './auth'
import { apiGet, apiPost } from './api'
import { MONTHS, monthLabel, getYears, formatNumber, CHART, axisProps, tooltipProps } from './uiUtils'
import {
    PageHeader, Card, CardHeader, FilterSelect, TrendBadge, ChartState, EmptyState, NarrativePanel,
} from './ui'

function useApi(path, fallback) {
    const [data, setData] = useState(fallback)
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        let cancelled = false
        setLoading(true)
        apiGet(path)
            .then(res => { if (!cancelled) setData(res) })
            .catch(() => { if (!cancelled) setData(fallback) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path])
    return [data, loading]
}

const rankBadgeClass = (index) =>
    index === 0 ? 'bg-brand-amber text-brand-navy'
        : index === 1 ? 'bg-brand-navy text-white'
        : index === 2 ? 'bg-brand-blue text-white'
        : 'bg-gray-100 text-gray-600'

function Analytics() {
    const years = getYears()
    const currentYear = new Date().getFullYear()

    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])

    useEffect(() => {
        if (!getToken()) {
            window.location.href = '/login'
            return
        }
        Promise.all([apiGet('/api/municipalities'), apiGet('/api/assistance_types')])
            .then(([muni, typeList]) => {
                setMunicipalities(muni)
                setTypes(typeList)
            })
            .catch(err => console.error(err))
    }, [])

    // Comparison
    const [municipality1, setMunicipality1] = useState('ANGAT')
    const [municipality2, setMunicipality2] = useState('BALAGTAS')
    const [selectedType, setSelectedType] = useState('ALL')
    const [selectedYear, setSelectedYear] = useState('ALL')
    const [comparisonMonth, setComparisonMonth] = useState('ALL')

    const [comparisonData, comparisonLoading] = useApi(
        `/api/analytics/comparison?municipality_1=${encodeURIComponent(municipality1)}&municipality_2=${encodeURIComponent(municipality2)}&type=${encodeURIComponent(selectedType)}&year=${selectedYear}&month=${comparisonMonth}`,
        []
    )
    const comparisonTotals = (Array.isArray(comparisonData) ? comparisonData : []).reduce(
        (acc, row) => ({ a: acc.a + Number(row[municipality1] || 0), b: acc.b + Number(row[municipality2] || 0) }),
        { a: 0, b: 0 }
    )

    // Drill-down
    const [drill_down_municipality, setDrillDownMunicipality] = useState('ANGAT')
    const [drill_down_year, setDrillDownYear] = useState('ALL')
    const [drill_down_month, setDrillDownMonth] = useState('ALL')

    const [drilldownRaw, drilldownLoading] = useApi(
        `/api/analytics/drill_down?municipality=${encodeURIComponent(drill_down_municipality)}&year=${drill_down_year}&month=${drill_down_month}`,
        []
    )
    const drilldown_data = [...(Array.isArray(drilldownRaw) ? drilldownRaw : [])].sort((a, b) => Number(b.total) - Number(a.total))
    const drilldownTotal = drilldown_data.reduce((sum, d) => sum + Number(d.total), 0) || 1

    // Rankings
    const [topN, setTopN] = useState(5)
    const [selectedMunicipalityRanking, setSelectedMunicipalityRanking] = useState('ALL')
    const [rankingMonth, setRankingMonth] = useState('ALL')
    const [availableMonths] = useApi('/api/analytics/available_months', [])

    useEffect(() => {
        apiGet('/api/analytics/latest_month')
            .then(data => setRankingMonth(data.month))
            .catch(err => console.error(err))
    }, [])

    const [rankingsRaw, rankingsLoading] = useApi(
        `/api/analytics/n_rankings?topN=${topN}&selectedMunicipalityRanking=${encodeURIComponent(selectedMunicipalityRanking)}&month=${rankingMonth}`,
        []
    )
    const rankings = Array.isArray(rankingsRaw) ? rankingsRaw : []
    const rankingMax = Math.max(...rankings.map(r => r.current || 0), 1)
    const rankingMonthLabel = monthLabel(rankingMonth)

    // Narrative
    const [narrative, setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)
    const [narrativeError, setNarrativeError] = useState('')

    const generateNarrative = async () => {
        setNarrativeLoading(true)
        setNarrative('')
        setNarrativeError('')
        try {
            const data = await apiPost('/api/analytics/narrative', {
                comparisonData, selectedYear, comparisonMonth, drilldown_data, drill_down_year, drill_down_month, rankings,
            })
            setNarrative(data.narrative)
        } catch {
            setNarrativeError('Unable to generate a narrative right now. Please try again.')
        } finally {
            setNarrativeLoading(false)
        }
    }

    return (
        <Layout>
            <PageHeader title="Analytics" description="Compare municipalities, drill into assistance types, and track rankings." />

            <Card className="mb-6">
                <CardHeader
                    icon={BarChart3}
                    title="Municipality comparison"
                    description="Side-by-side request volume per assistance type"
                >
                    <FilterSelect id="cmp-a" label="First" value={municipality1} onChange={e => setMunicipality1(e.target.value)}>
                        {municipalities.filter(m => m.municipality_name !== municipality2).map(m => (
                            <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                        ))}
                    </FilterSelect>
                    <FilterSelect id="cmp-b" label="Second" value={municipality2} onChange={e => setMunicipality2(e.target.value)}>
                        {municipalities.filter(m => m.municipality_name !== municipality1).map(m => (
                            <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                        ))}
                    </FilterSelect>
                    <FilterSelect id="cmp-type" label="Assistance type" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                        <option value="ALL">All types</option>
                        {types.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                    </FilterSelect>
                    <FilterSelect id="cmp-year" label="Year" value={selectedYear} onChange={e => {
                        setSelectedYear(e.target.value)
                        if (e.target.value === 'ALL') setComparisonMonth('ALL')
                    }}>
                        <option value="ALL">All years</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </FilterSelect>
                    {selectedYear !== 'ALL' && (
                        <FilterSelect id="cmp-month" label="Month" value={comparisonMonth} onChange={e => setComparisonMonth(e.target.value)}>
                            <option value="ALL">All months</option>
                            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </FilterSelect>
                    )}
                </CardHeader>

                <div className="mb-5 grid grid-cols-2 gap-3 md:max-w-md">
                    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
                        <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            <span className="h-2.5 w-2.5 rounded-sm bg-brand-navy" aria-hidden="true" />
                            {municipality1}
                        </span>
                        <span className="text-lg font-bold tabular-nums text-gray-900">{formatNumber(comparisonTotals.a)}</span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
                        <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            <span className="h-2.5 w-2.5 rounded-sm bg-brand-amber" aria-hidden="true" />
                            {municipality2}
                        </span>
                        <span className="text-lg font-bold tabular-nums text-gray-900">{formatNumber(comparisonTotals.b)}</span>
                    </div>
                </div>

                <ChartState loading={comparisonLoading} empty={!comparisonData?.length} height={420}>
                    <ResponsiveContainer width="100%" height={420}>
                        <BarChart data={comparisonData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barGap={4}>
                            <CartesianGrid stroke={CHART.grid} vertical={false} />
                            <XAxis dataKey="type_name" angle={-35} textAnchor="end" interval={0} height={110} {...axisProps} tick={{ fontSize: 11, fill: CHART.axis }} />
                            <YAxis width={52} tickFormatter={formatNumber} {...axisProps} axisLine={false} />
                            <Tooltip {...tooltipProps} />
                            <Legend verticalAlign="top" align="right" height={32} iconType="square" wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey={municipality1} fill={CHART.navy} radius={[4, 4, 0, 0]} maxBarSize={36} label={{ position: 'top', fontSize: 10, fill: '#4B5563', formatter: formatNumber }} />
                            <Bar dataKey={municipality2} fill={CHART.amber} radius={[4, 4, 0, 0]} maxBarSize={36} label={{ position: 'top', fontSize: 10, fill: '#4B5563', formatter: formatNumber }} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartState>
            </Card>

            <div className="mb-6 grid grid-cols-1 gap-6 2xl:grid-cols-2">
                <Card>
                    <CardHeader icon={Search} title="Municipality breakdown" description="Share of requests by assistance type">
                        <FilterSelect id="dd-muni" label="Municipality" value={drill_down_municipality} onChange={e => setDrillDownMunicipality(e.target.value)}>
                            {municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                        </FilterSelect>
                        <FilterSelect id="dd-year" label="Year" value={drill_down_year} onChange={e => {
                            setDrillDownYear(e.target.value)
                            if (e.target.value === 'ALL') setDrillDownMonth('ALL')
                        }}>
                            <option value="ALL">All years</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </FilterSelect>
                        {drill_down_year !== 'ALL' && (
                            <FilterSelect id="dd-month" label="Month" value={drill_down_month} onChange={e => setDrillDownMonth(e.target.value)}>
                                <option value="ALL">All months</option>
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </FilterSelect>
                        )}
                    </CardHeader>

                    {drilldownLoading ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />)}
                        </div>
                    ) : drilldown_data.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <>
                            <p className="mb-3 text-sm text-gray-500">
                                <span className="font-semibold tabular-nums text-gray-900">{formatNumber(drilldownTotal)}</span> total requests in {drill_down_municipality}
                            </p>
                            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {drilldown_data.map((item, i) => {
                                    const share = (Number(item.total) / drilldownTotal) * 100
                                    return (
                                        <li key={item.type_name} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className="truncate text-sm font-medium text-gray-700" title={item.type_name}>{item.type_name}</span>
                                                <span className="text-sm font-semibold tabular-nums text-gray-900">{formatNumber(item.total)}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-gray-100">
                                                <div
                                                    className={`h-1.5 rounded-full ${i === 0 ? 'bg-brand-amber' : 'bg-brand-navy'}`}
                                                    style={{ width: `${share}%` }}
                                                />
                                            </div>
                                            <span className="text-xs tabular-nums text-gray-500">{share.toFixed(1)}% of total</span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </>
                    )}
                </Card>

                <Card>
                    <CardHeader icon={Trophy} title="Municipality rankings" description={`Year-over-year comparison for ${rankingMonthLabel ?? 'the selected month'}`}>
                        <FilterSelect id="rk-top" label="Show" value={topN} onChange={e => setTopN(Number(e.target.value))}>
                            {[5, 10, 15, 20, 24].map(n => <option key={n} value={n}>Top {n}</option>)}
                        </FilterSelect>
                        <FilterSelect id="rk-muni" label="Municipality" value={selectedMunicipalityRanking} onChange={e => setSelectedMunicipalityRanking(e.target.value)}>
                            <option value="ALL">All municipalities</option>
                            {municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                        </FilterSelect>
                        <FilterSelect id="rk-month" label="Month" value={rankingMonth} onChange={e => setRankingMonth(Number(e.target.value))}>
                            {availableMonths.map(m => (
                                <option key={`${m.year}-${m.month}`} value={m.month}>{monthLabel(m.month)} {m.year}</option>
                            ))}
                        </FilterSelect>
                    </CardHeader>

                    {rankingsLoading ? (
                        <div className="flex flex-col gap-2">
                            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded bg-gray-100" />)}
                        </div>
                    ) : rankings.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                        <th scope="col" className="pb-3 pr-3">Rank</th>
                                        <th scope="col" className="pb-3 pr-3">Municipality</th>
                                        <th scope="col" className="pb-3 pr-3 text-right">{rankingMonthLabel} {currentYear - 1}</th>
                                        <th scope="col" className="pb-3 pr-3 text-right">{rankingMonthLabel} {currentYear}</th>
                                        <th scope="col" className="hidden pb-3 pr-3 md:table-cell">Volume</th>
                                        <th scope="col" className="pb-3 text-right">Growth</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankings.map((item, index) => (
                                        <tr key={item.municipality_name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                            <td className="py-3 pr-3">
                                                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${rankBadgeClass(index)}`}>
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-3 font-medium text-gray-800">{item.municipality_name}</td>
                                            <td className="py-3 pr-3 text-right tabular-nums text-gray-500">{formatNumber(item.previous)}</td>
                                            <td className="py-3 pr-3 text-right font-semibold tabular-nums text-gray-900">{formatNumber(item.current)}</td>
                                            <td className="hidden w-32 py-3 pr-3 md:table-cell">
                                                <div className="h-1.5 rounded-full bg-gray-100">
                                                    <div className="h-1.5 rounded-full bg-brand-blue" style={{ width: `${((item.current || 0) / rankingMax) * 100}%` }} />
                                                </div>
                                            </td>
                                            <td className="py-3 text-right">
                                                <TrendBadge value={item.growth_rate} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            <NarrativePanel
                narrative={narrative}
                loading={narrativeLoading}
                error={narrativeError}
                onGenerate={generateNarrative}
                scope="the comparison, breakdown, and rankings above"
            />
        </Layout>
    )
}

export default Analytics
