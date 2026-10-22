import Layout from './Layout'
import { useState, useEffect } from 'react'
import { ResponsiveContainer, ComposedChart, Line, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts'
import { TrendingUp, Table2, CalendarRange, Gauge } from 'lucide-react'
import { apiGet, apiPost } from './api'
import { formatNumber, CHART, axisProps } from './uiUtils'
import {
    PageHeader, Card, CardHeader, FilterSelect, KpiCard, TrendBadge, ChartState, NarrativePanel,
} from './ui'

const SERIES_LABELS = {
    total: 'Historical',
    future_prediction: 'Projected',
    band: 'Confidence range',
}

function ForecastTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const row = payload[0].payload
    const isProjected = row.total == null
    return (
        <div className="flex min-w-[10rem] flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-md">
            <p className="font-semibold text-gray-800">{label}</p>
            {isProjected ? (
                <>
                    <p className="flex justify-between gap-4"><span className="text-gray-500">Projected</span><span className="font-semibold tabular-nums">{formatNumber(row.future_prediction)}</span></p>
                    <p className="flex justify-between gap-4"><span className="text-gray-500">Range</span><span className="tabular-nums">{formatNumber(row.lower)} – {formatNumber(row.upper)}</span></p>
                </>
            ) : (
                <p className="flex justify-between gap-4"><span className="text-gray-500">Actual</span><span className="font-semibold tabular-nums">{formatNumber(row.total)}</span></p>
            )}
        </div>
    )
}

function Forecast() {
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')
    const [selectedType, setSelectedType] = useState('ALL')

    const [forecastData, setForecastData] = useState({ timeline: [], forecast: [], average_growth_rate: 0 })
    const [loading, setLoading] = useState(true)

    const [narrative, setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)
    const [narrativeError, setNarrativeError] = useState('')

    const [showHistory, setShowHistory] = useState(false)

    useEffect(() => {
        Promise.all([apiGet('/api/municipalities'), apiGet('/api/assistance_types')])
            .then(([muni, typeList]) => {
                setMunicipalities(muni)
                setTypes(typeList)
            })
            .catch(err => console.error(err))
    }, [])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        apiGet(`/api/forecast/predict?municipality=${encodeURIComponent(selectedMunicipality)}&type=${encodeURIComponent(selectedType)}`)
            .then(data => {
                if (cancelled) return
                setForecastData({
                    timeline: data?.timeline ?? [],
                    forecast: data?.forecast ?? [],
                    average_growth_rate: Number(data?.average_growth_rate ?? 0),
                })
            })
            .catch(() => { if (!cancelled) setForecastData({ timeline: [], forecast: [], average_growth_rate: 0 }) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [selectedMunicipality, selectedType])

    const generateNarrative = async () => {
        setNarrativeLoading(true)
        setNarrative('')
        setNarrativeError('')
        try {
            const data = await apiPost('/api/forecast/narrative', { forecastData, selectedMunicipality, selectedType })
            setNarrative(data.narrative)
        } catch {
            setNarrativeError('Unable to generate a narrative right now. Please try again.')
        } finally {
            setNarrativeLoading(false)
        }
    }

    const { timeline, forecast, average_growth_rate } = forecastData
    const lastActual = timeline[timeline.length - 1]
    const chartData = [
        ...timeline.map((row, i) => ({
            label: row.label,
            total: row.total,
            future_prediction: i === timeline.length - 1 ? row.total : null,
            band: i === timeline.length - 1 ? [row.total, row.total] : null,
        })),
        ...forecast.map(row => ({
            label: row.label,
            future_prediction: row.future_prediction,
            lower: row.lower,
            upper: row.upper,
            band: [row.lower, row.upper],
        })),
    ]

    const historyRows = showHistory ? timeline : timeline.slice(-6)
    const scopeLabel = [
        selectedMunicipality === 'ALL' ? 'All municipalities' : selectedMunicipality,
        selectedType === 'ALL' ? 'all assistance types' : selectedType,
    ].join(' · ')

    return (
        <Layout>
            <PageHeader title="Forecasting" description={`Projected medical assistance demand for ${scopeLabel}.`}>
                <FilterSelect id="fc-type" label="Assistance type" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                    <option value="ALL">All types</option>
                    {types.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                </FilterSelect>
                <FilterSelect id="fc-muni" label="Municipality / city" value={selectedMunicipality} onChange={e => setSelectedMunicipality(e.target.value)}>
                    <option value="ALL">All municipalities</option>
                    {municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                </FilterSelect>
            </PageHeader>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2].map(i => {
                    const f = forecast[i]
                    return (
                        <KpiCard
                            key={i}
                            accent={i === 0}
                            icon={CalendarRange}
                            loading={loading}
                            label={f ? `${f.month} ${f.year} projection` : `Month ${i + 1} projection`}
                            value={formatNumber(f?.future_prediction)}
                            hint={f ? `Range ${formatNumber(f.lower)} – ${formatNumber(f.upper)}` : null}
                        />
                    )
                })}
                <KpiCard
                    icon={Gauge}
                    loading={loading}
                    label="Avg. monthly growth"
                    value={`${average_growth_rate >= 0 ? '+' : ''}${average_growth_rate.toFixed(2)}%`}
                    badge={<TrendBadge value={Number(average_growth_rate.toFixed(2))} />}
                    hint="month-over-month"
                />
            </div>

            <Card className="mb-6">
                <CardHeader
                    icon={TrendingUp}
                    title="Demand forecast"
                    description={lastActual ? `Actuals through ${lastActual.label}, followed by projected demand with a confidence range` : 'Actuals followed by projected demand with a confidence range'}
                />
                <ChartState loading={loading} empty={!chartData.length} height={420}>
                    <ResponsiveContainer width="100%" height={420}>
                        <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke={CHART.grid} vertical={false} />
                            <XAxis dataKey="label" minTickGap={24} {...axisProps} />
                            <YAxis tickFormatter={formatNumber} width={56} {...axisProps} axisLine={false} />
                            <Tooltip content={<ForecastTooltip />} cursor={{ stroke: CHART.muted }} />
                            <Legend verticalAlign="top" align="right" height={32} iconType="plainline" wrapperStyle={{ fontSize: 12 }} formatter={key => SERIES_LABELS[key] ?? key} />
                            {lastActual && <ReferenceLine x={lastActual.label} stroke={CHART.muted} strokeDasharray="4 4" label={{ value: 'Forecast →', position: 'insideTopRight', fill: CHART.axis, fontSize: 11 }} />}
                            <Area dataKey="band" name="band" stroke="none" fill={CHART.amber} fillOpacity={0.18} isAnimationActive={false} activeDot={false} />
                            <Line dataKey="total" name="total" stroke={CHART.navy} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                            <Line dataKey="future_prediction" name="future_prediction" stroke={CHART.amber} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3, fill: CHART.amber }} activeDot={{ r: 5 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartState>
            </Card>

            <Card className="mb-6">
                <CardHeader icon={Table2} title="Forecast data" description="Monthly actuals and projections with confidence bounds">
                    {timeline.length > 6 && (
                        <button
                            type="button"
                            onClick={() => setShowHistory(v => !v)}
                            className="h-9 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            {showHistory ? 'Show recent only' : `Show all ${timeline.length} historical months`}
                        </button>
                    )}
                </CardHeader>
                <div className="max-h-[28rem] overflow-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50">
                            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                <th scope="col" className="px-4 py-2.5">Period</th>
                                <th scope="col" className="px-4 py-2.5 text-right">Requests</th>
                                <th scope="col" className="px-4 py-2.5 text-right">Lower bound</th>
                                <th scope="col" className="px-4 py-2.5 text-right">Upper bound</th>
                                <th scope="col" className="px-4 py-2.5">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyRows.map((item, i) => (
                                <tr key={`h-${item.year}-${item.month}-${i}`} className="border-t border-gray-100">
                                    <td className="px-4 py-2.5 font-medium text-gray-700">{item.month} {item.year}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(item.total)}</td>
                                    <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                                    <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                                    <td className="px-4 py-2.5">
                                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Actual</span>
                                    </td>
                                </tr>
                            ))}
                            {forecast.map((item, i) => (
                                <tr key={`f-${item.year}-${item.month}-${i}`} className="border-t border-amber-100 bg-amber-50/50">
                                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.month} {item.year}</td>
                                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">{formatNumber(item.future_prediction)}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatNumber(item.lower)}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatNumber(item.upper)}</td>
                                    <td className="px-4 py-2.5">
                                        <span className="rounded-full bg-brand-amber/25 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Projected</span>
                                    </td>
                                </tr>
                            ))}
                            {!loading && !historyRows.length && !forecast.length && (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No forecast data for the selected filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <NarrativePanel
                narrative={narrative}
                loading={narrativeLoading}
                error={narrativeError}
                onGenerate={generateNarrative}
                scope="the forecast for the selected filters"
            />
        </Layout>
    )
}

export default Forecast
