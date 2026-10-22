import { useState, useEffect } from 'react'
import Layout from './Layout'
import { getToken } from './auth'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, LabelList
} from 'recharts'
import { TrendingUp, BarChart2, MapPin, Layers, Activity } from 'lucide-react'
import { apiGet, apiPost } from './api'
import { MONTHS, getYears, formatNumber, CHART, axisProps, tooltipProps } from './uiUtils'
import {
    PageHeader, Card, CardHeader, FilterSelect, KpiCard, TrendBadge, ChartState, NarrativePanel,
} from './ui'

function YearMonthFilters({ idPrefix, year, month, onYearChange, onMonthChange }) {
    return (
        <>
            <FilterSelect id={`${idPrefix}-year`} label="Year" value={year} onChange={e => onYearChange(e.target.value)}>
                <option value="ALL">All years</option>
                {getYears().map(y => <option key={y} value={y}>{y}</option>)}
            </FilterSelect>
            {year !== 'ALL' && (
                <FilterSelect id={`${idPrefix}-month`} label="Month" value={month} onChange={e => onMonthChange(e.target.value)}>
                    <option value="ALL">All months</option>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </FilterSelect>
            )}
        </>
    )
}

function Dashboard() {
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])

    const [selectedYear, setSelectedYear] = useState('ALL')
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')
    const [selectedType, setSelectedType] = useState('ALL')
    const [selectedMonth, setSelectedMonth] = useState('ALL')

    const [kpi, setKpi] = useState(null)
    const [kpiLoading, setKpiLoading] = useState(true)

    const [trendData, setTrendData] = useState([])
    const [trendLoading, setTrendLoading] = useState(true)
    const [barData, setBarData] = useState([])
    const [barLoading, setBarLoading] = useState(true)
    const [distributionData, setDistributionData] = useState([])
    const [distributionLoading, setDistributionLoading] = useState(true)

    const [selectedLineType, setSelectedLineType] = useState('ALL')
    const [selectedYearForLine, setSelectedYearForLine] = useState('ALL')

    const [selectedDistributionYear, setSelectedDistributionYear] = useState('ALL')
    const [selectedDistributionMonth, setSelectedDistributionMonth] = useState('ALL')

    const [selectedBarYear, setSelectedBarYear] = useState('ALL')
    const [selectedBarMonth, setSelectedBarMonth] = useState('ALL')

    const [narrative, setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)
    const [narrativeError, setNarrativeError] = useState('')

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
        setTrendLoading(true)
        apiGet(`/api/dashboard/trend?year=${selectedYearForLine}&type=${encodeURIComponent(selectedLineType)}`)
            .then(data => { if (!cancelled) setTrendData(Array.isArray(data) ? data : []) })
            .catch(() => { if (!cancelled) setTrendData([]) })
            .finally(() => { if (!cancelled) setTrendLoading(false) })
        return () => { cancelled = true }
    }, [selectedYearForLine, selectedLineType])

    useEffect(() => {
        let cancelled = false
        setDistributionLoading(true)
        apiGet(`/api/dashboard/distribution?year=${selectedDistributionYear}&month=${selectedDistributionMonth}`)
            .then(data => { if (!cancelled) setDistributionData(Array.isArray(data) ? data : []) })
            .catch(() => { if (!cancelled) setDistributionData([]) })
            .finally(() => { if (!cancelled) setDistributionLoading(false) })
        return () => { cancelled = true }
    }, [selectedDistributionYear, selectedDistributionMonth])

    useEffect(() => {
        let cancelled = false
        setBarLoading(true)
        apiGet(`/api/dashboard/barchart?year=${selectedBarYear}&month=${selectedBarMonth}`)
            .then(data => { if (!cancelled) setBarData(Array.isArray(data) ? data : []) })
            .catch(() => { if (!cancelled) setBarData([]) })
            .finally(() => { if (!cancelled) setBarLoading(false) })
        return () => { cancelled = true }
    }, [selectedBarYear, selectedBarMonth])

    useEffect(() => {
        let cancelled = false
        setKpiLoading(true)
        apiGet(`/api/dashboard/kpi?year=${selectedYear}&municipality=${selectedMunicipality}&type=${selectedType}&month=${selectedMonth}`)
            .then(data => { if (!cancelled) setKpi(data) })
            .catch(() => { if (!cancelled) setKpi(null) })
            .finally(() => { if (!cancelled) setKpiLoading(false) })
        return () => { cancelled = true }
    }, [selectedYear, selectedMunicipality, selectedType, selectedMonth])

    const generateNarrative = async () => {
        setNarrativeLoading(true)
        setNarrative('')
        setNarrativeError('')
        try {
            const data = await apiPost('/api/dashboard/narrative', {
                kpi,
                trend: trendData,
                distributionData,
                barData,
                filters: {
                    year: selectedYear, municipality: selectedMunicipality, type: selectedType,
                    month: selectedMonth,
                    lineType: selectedLineType, lineYear: selectedYearForLine,
                    distributionYear: selectedDistributionYear, distributionMonth: selectedDistributionMonth,
                    barYear: selectedBarYear, barMonth: selectedBarMonth,
                }
            })
            setNarrative(data.narrative)
        } catch {
            setNarrativeError('Unable to generate a narrative right now. Please try again.')
        } finally {
            setNarrativeLoading(false)
        }
    }

    const handleYearChange = (value) => {
        setSelectedYear(value)
        if (value === 'ALL') setSelectedMonth('ALL')
    }

    const sortedDistribution = [...distributionData].sort((a, b) => Number(b.value) - Number(a.value))
    const sortedBars = [...barData].sort((a, b) => Number(b.total) - Number(a.total))
    const trendXKey = trendData[0]?.month ? 'month' : 'year'
    const trendTotal = trendData.reduce((sum, d) => sum + Number(d.total || 0), 0)
    const peakTrend = trendData.reduce((max, d) => (Number(d.total) > Number(max?.total ?? -1) ? d : max), null)

    return (
        <Layout>
            <PageHeader title="Dashboard" description="Medical assistance request overview across the province.">
                <FilterSelect id="kpi-year" label="Year" value={selectedYear} onChange={e => handleYearChange(e.target.value)}>
                    <option value="ALL">All years</option>
                    {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                </FilterSelect>
                {selectedYear !== 'ALL' && (
                    <FilterSelect id="kpi-month" label="Month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                        <option value="ALL">All months</option>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </FilterSelect>
                )}
                <FilterSelect id="kpi-muni" label="Municipality" value={selectedMunicipality} onChange={e => setSelectedMunicipality(e.target.value)}>
                    <option value="ALL">All municipalities</option>
                    {municipalities.map(m => <option value={m.municipality_id} key={m.municipality_id}>{m.municipality_name}</option>)}
                </FilterSelect>
                <FilterSelect id="kpi-type" label="Assistance type" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                    <option value="ALL">All types</option>
                    {types.map(t => <option value={t.type_id} key={t.type_id}>{t.type_name}</option>)}
                </FilterSelect>
            </PageHeader>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <KpiCard
                    accent
                    icon={Activity}
                    label="Total requests"
                    loading={kpiLoading}
                    value={formatNumber(kpi?.total_requests)}
                    badge={kpi?.growth_percent != null && kpi?.growth_percent !== '' ? <TrendBadge value={kpi.growth_percent} /> : null}
                    hint={kpi?.growth_percent != null && kpi?.growth_percent !== '' ? 'vs. previous period' : null}
                />
                <KpiCard
                    icon={Layers}
                    label="Highest volume type"
                    loading={kpiLoading}
                    value={kpi?.top_type?.type_name ?? 'N/A'}
                    hint={kpi?.top_type?.total ? `${formatNumber(kpi.top_type.total)} requests` : null}
                />
                <KpiCard
                    icon={MapPin}
                    label="Highest volume municipality"
                    loading={kpiLoading}
                    value={kpi?.top_municipality?.municipality_name ?? 'N/A'}
                    hint={kpi?.top_municipality?.total ? `${formatNumber(kpi.top_municipality.total)} requests` : null}
                />
            </div>

            <Card className="mb-6">
                <CardHeader
                    icon={TrendingUp}
                    title={`${selectedYearForLine === 'ALL' ? 'Yearly' : 'Monthly'} request trend`}
                    description={
                        trendData.length && peakTrend
                            ? `${formatNumber(trendTotal)} requests in view · peak of ${formatNumber(peakTrend.total)} in ${peakTrend[trendXKey]}`
                            : 'Request volume over time'
                    }
                >
                    <FilterSelect id="trend-type" label="Assistance type" value={selectedLineType} onChange={e => setSelectedLineType(e.target.value)}>
                        <option value="ALL">All types</option>
                        {types.map(t => <option value={t.type_name} key={t.type_id}>{t.type_name}</option>)}
                    </FilterSelect>
                    <FilterSelect id="trend-year" label="Year" value={selectedYearForLine} onChange={e => setSelectedYearForLine(e.target.value)}>
                        <option value="ALL">All years</option>
                        {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                    </FilterSelect>
                </CardHeader>
                <ChartState loading={trendLoading} empty={!trendData.length} height={380}>
                    <ResponsiveContainer width="100%" height={380}>
                        <AreaChart data={trendData} margin={{ top: 24, right: 24, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={CHART.blue} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke={CHART.grid} vertical={false} />
                            <XAxis dataKey={trendXKey} padding={{ left: 20, right: 20 }} {...axisProps} />
                            <YAxis domain={[0, dataMax => Math.ceil(dataMax * 1.15)]} tickFormatter={formatNumber} width={56} {...axisProps} axisLine={false} />
                            <Tooltip {...tooltipProps} cursor={{ stroke: CHART.muted }} />
                            <Area
                                type="monotone"
                                dataKey="total"
                                name={selectedLineType !== 'ALL' ? selectedLineType : 'Total requests'}
                                stroke={CHART.blue}
                                strokeWidth={2.5}
                                fill="url(#trendFill)"
                                dot={{ r: 3, fill: '#fff', stroke: CHART.blue, strokeWidth: 2 }}
                                activeDot={{ r: 5 }}
                                label={{ position: 'top', offset: 10, fill: '#4B5563', fontSize: 11, formatter: formatNumber }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartState>
            </Card>

            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader icon={BarChart2} title="Distribution by assistance type" description="Request volume per type, highest first">
                        <YearMonthFilters
                            idPrefix="dist"
                            year={selectedDistributionYear}
                            month={selectedDistributionMonth}
                            onYearChange={v => { setSelectedDistributionYear(v); if (v === 'ALL') setSelectedDistributionMonth('ALL') }}
                            onMonthChange={setSelectedDistributionMonth}
                        />
                    </CardHeader>
                    <ChartState loading={distributionLoading} empty={!sortedDistribution.length} height={360}>
                        <ResponsiveContainer width="100%" height={Math.max(320, sortedDistribution.length * 36)}>
                            <BarChart data={sortedDistribution} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                                <XAxis type="number" tickFormatter={formatNumber} {...axisProps} />
                                <YAxis dataKey="name" type="category" width={150} {...axisProps} axisLine={false} />
                                <Tooltip {...tooltipProps} />
                                <Bar dataKey="value" name="Requests" radius={[0, 4, 4, 0]} barSize={20}>
                                    {sortedDistribution.map((_, i) => (
                                        <Cell key={i} fill={i === 0 ? CHART.amber : CHART.navy} />
                                    ))}
                                    <LabelList dataKey="value" position="right" formatter={formatNumber} style={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartState>
                </Card>

                <Card>
                    <CardHeader icon={MapPin} title="Requests by municipality / city" description="Ranked by total request volume">
                        <YearMonthFilters
                            idPrefix="bar"
                            year={selectedBarYear}
                            month={selectedBarMonth}
                            onYearChange={v => { setSelectedBarYear(v); if (v === 'ALL') setSelectedBarMonth('ALL') }}
                            onMonthChange={setSelectedBarMonth}
                        />
                    </CardHeader>
                    <ChartState loading={barLoading} empty={!sortedBars.length} height={360}>
                        <ResponsiveContainer width="100%" height={Math.max(360, sortedBars.length * 28)}>
                            <BarChart data={sortedBars} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                                <XAxis type="number" tickFormatter={formatNumber} {...axisProps} />
                                <YAxis dataKey="municipality_name" type="category" width={150} interval={0} {...axisProps} axisLine={false} />
                                <Tooltip {...tooltipProps} />
                                <Bar dataKey="total" name="Requests" radius={[0, 4, 4, 0]} barSize={16}>
                                    {sortedBars.map((_, i) => (
                                        <Cell key={i} fill={i < 3 ? CHART.blue : CHART.navy} />
                                    ))}
                                    <LabelList dataKey="total" position="right" formatter={formatNumber} style={{ fill: '#374151', fontSize: 11, fontWeight: 600 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartState>
                </Card>
            </div>

            <NarrativePanel
                narrative={narrative}
                loading={narrativeLoading}
                error={narrativeError}
                onGenerate={generateNarrative}
                scope="the dashboard metrics and charts above"
            />
        </Layout>
    )
}

export default Dashboard
