import Layout from './Layout'
import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import {
    AreaChart, Area, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell, LabelList,
} from 'recharts'
import {
    TrendingUp, BarChart2, Search, Trophy, BarChart3, LayoutGrid, MapPin,
    FileSpreadsheet, Images, Loader2, Download, Database, Check,
} from 'lucide-react'
import { apiGet, apiBlob, downloadBlob } from './api'
import { MONTHS, monthLabel, getYears, formatNumber, CHART, axisProps, tooltipProps } from './uiUtils'
import {
    PageHeader, Card, CardHeader, FilterSelect, SegmentedTabs, EmptyState, TrendBadge,
} from './ui'

const SECTIONS = [
    { key: 'dashboardKpi', label: 'Dashboard summary', icon: LayoutGrid },
    { key: 'yoyTrends', label: 'Request trend', icon: TrendingUp },
    { key: 'distributionByAssistance', label: 'Distribution by assistance type', icon: BarChart2 },
    { key: 'distributionByMunicipality', label: 'Requests by municipality', icon: MapPin },
    { key: 'comparisonChart', label: 'Municipality comparison', icon: BarChart3 },
    { key: 'municipalityDrilldown', label: 'Municipality breakdown', icon: Search },
    { key: 'topNRanking', label: 'Top N rankings', icon: Trophy },
    { key: 'forecast', label: 'Demand forecast', icon: TrendingUp },
]

const sectionLabels = Object.fromEntries(SECTIONS.map(s => [s.key, s.label]))

const PREVIEW_ANIMATION = { isAnimationActive: false }

function YearMonth({ idPrefix, year, month, onYear, onMonth }) {
    return (
        <>
            <FilterSelect id={`${idPrefix}-year`} label="Year" value={year} onChange={e => {
                onYear(e.target.value)
                if (e.target.value === 'ALL') onMonth('ALL')
            }}>
                <option value="ALL">All years</option>
                {getYears().map(y => <option key={y} value={y}>{y}</option>)}
            </FilterSelect>
            {year !== 'ALL' && (
                <FilterSelect id={`${idPrefix}-month`} label="Month" value={month} onChange={e => onMonth(e.target.value)}>
                    <option value="ALL">All months</option>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </FilterSelect>
            )}
        </>
    )
}

function PreviewFrame({ innerRef, title, subtitle, children }) {
    return (
        <div ref={innerRef} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
                <div className="flex flex-col gap-0.5">
                    <p className="text-base font-semibold text-gray-800">{title}</p>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
                <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-brand-navy">
                    MAR<span className="text-amber-600">DSS</span>
                </p>
            </div>
            {children}
        </div>
    )
}

function Export() {
    const years = getYears()
    const currentYear = new Date().getFullYear()

    const [activeTab, setActiveTab] = useState('dataset')

    // Dataset export filters
    const [selectedYearFrom, setSelectedYearFrom] = useState(2023)
    const [selectedYearTo, setSelectedYearTo] = useState(2023)
    const [selectedDatasetMonth, setSelectedDatasetMonth] = useState('ALL')
    const [excelExporting, setExcelExporting] = useState(false)
    const [chartsExporting, setChartsExporting] = useState(false)
    const [exportError, setExportError] = useState('')

    const [sections, setSections] = useState(Object.fromEntries(SECTIONS.map(s => [s.key, false])))

    const chartRefs = {
        dashboardKpi: useRef(null),
        yoyTrends: useRef(null),
        distributionByAssistance: useRef(null),
        distributionByMunicipality: useRef(null),
        comparisonChart: useRef(null),
        municipalityDrilldown: useRef(null),
        topNRanking: useRef(null),
        forecast: useRef(null),
    }

    // Dashboard KPI
    const [selectedDashboardYear, setSelectedDashboardYear] = useState('ALL')
    const [selectedDashboardType, setSelectedDashboardType] = useState('ALL')
    const [selectedDashboardMunicipality, setSelectedDashboardMunicipality] = useState('ALL')
    const [selectedMonth, setSelectedMonth] = useState('ALL')

    // Trend
    const [selectedYoYType, setSelectedYoYType] = useState('ALL')
    const [selectedYearForLine, setSelectedYearForLine] = useState('ALL')
    const [yoyTrendData, setYoyTrendData] = useState([])

    // Distribution by assistance type
    const [selectedDistributionYear, setSelectedDistributionYear] = useState('ALL')
    const [selectedDistributionMonth, setSelectedDistributionMonth] = useState('ALL')
    const [distributionData, setDistributionData] = useState([])

    // Distribution by municipality
    const [selectedBarChartYear, setSelectedBarChartYear] = useState('ALL')
    const [selectedBarMonth, setSelectedBarMonth] = useState('ALL')
    const [barChartData, setBarChartData] = useState([])

    // Comparison
    const [compMunicipality1, setCompMunicipality1] = useState('BULAKAN')
    const [compMunicipality2, setCompMunicipality2] = useState('CALUMPIT')
    const [compType, setCompType] = useState('ALL')
    const [compYear, setCompYear] = useState('ALL')
    const [comparisonMonth, setComparisonMonth] = useState('ALL')
    const [comparisonData, setComparisonData] = useState([])

    // Drilldown
    const [drilldownMunicipality, setDrilldownMunicipality] = useState('BULAKAN')
    const [drilldownYear, setDrilldownYear] = useState('ALL')
    const [drill_down_month, setDrillDownMonth] = useState('ALL')
    const [drilldownData, setDrilldownData] = useState([])

    // Rankings
    const [topN, setTopN] = useState(5)
    const [selectedMunicipalityRanking, setSelectedMunicipalityRanking] = useState('ALL')
    const [rankingMonth, setRankingMonth] = useState('ALL')
    const [availableMonths, setAvailableMonths] = useState([])
    const [rankingsData, setRankingsData] = useState([])

    // Forecast
    const [forecastMunicipality, setForecastMunicipality] = useState('ALL')
    const [forecastType, setForecastType] = useState('ALL')
    const [forecastData, setForecastData] = useState({ timeline: [], forecast: [], average_growth_rate: 0 })

    // Shared
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])
    const [kpiPreview, setKpiPreview] = useState(null)
    const [previewData, setPreviewData] = useState([])
    const [previewLoading, setPreviewLoading] = useState(false)

    const selectedCount = Object.values(sections).filter(Boolean).length
    const anyChartSelected = selectedCount > 0

    const load = (enabled, path, setter, fallback = []) => {
        if (!enabled) return undefined
        let cancelled = false
        apiGet(path)
            .then(data => { if (!cancelled) setter(data) })
            .catch(() => { if (!cancelled) setter(fallback) })
        return () => { cancelled = true }
    }

    useEffect(() => {
        Promise.all([
            apiGet('/api/municipalities'),
            apiGet('/api/assistance_types'),
            apiGet('/api/analytics/available_months'),
            apiGet('/api/analytics/latest_month'),
        ])
            .then(([muni, typeList, available, latest]) => {
                setMunicipalities(muni)
                setTypes(typeList)
                setAvailableMonths(available)
                setRankingMonth(latest.month)
            })
            .catch(err => console.error(err))
    }, [])

    useEffect(() => load(
        sections.dashboardKpi,
        `/api/dashboard/kpi?year=${selectedDashboardYear}&municipality=${encodeURIComponent(selectedDashboardMunicipality)}&type=${encodeURIComponent(selectedDashboardType)}&month=${selectedMonth}`,
        setKpiPreview, null,
    ), [sections.dashboardKpi, selectedDashboardYear, selectedDashboardMunicipality, selectedDashboardType, selectedMonth])

    useEffect(() => load(
        sections.yoyTrends,
        `/api/dashboard/trend?year=${selectedYearForLine}&type=${encodeURIComponent(selectedYoYType)}`,
        setYoyTrendData,
    ), [sections.yoyTrends, selectedYearForLine, selectedYoYType])

    useEffect(() => load(
        sections.distributionByAssistance,
        `/api/dashboard/distribution?year=${selectedDistributionYear}&month=${selectedDistributionMonth}`,
        setDistributionData,
    ), [sections.distributionByAssistance, selectedDistributionYear, selectedDistributionMonth])

    useEffect(() => load(
        sections.distributionByMunicipality,
        `/api/dashboard/barchart?year=${selectedBarChartYear}&month=${selectedBarMonth}`,
        setBarChartData,
    ), [sections.distributionByMunicipality, selectedBarChartYear, selectedBarMonth])

    useEffect(() => load(
        sections.comparisonChart,
        `/api/analytics/comparison?municipality_1=${encodeURIComponent(compMunicipality1)}&municipality_2=${encodeURIComponent(compMunicipality2)}&type=${encodeURIComponent(compType)}&year=${compYear}&month=${comparisonMonth}`,
        setComparisonData,
    ), [sections.comparisonChart, compMunicipality1, compMunicipality2, compType, compYear, comparisonMonth])

    useEffect(() => load(
        sections.municipalityDrilldown,
        `/api/analytics/drill_down?municipality=${encodeURIComponent(drilldownMunicipality)}&year=${drilldownYear}&month=${drill_down_month}`,
        setDrilldownData,
    ), [sections.municipalityDrilldown, drilldownMunicipality, drilldownYear, drill_down_month])

    useEffect(() => load(
        sections.topNRanking,
        `/api/analytics/n_rankings?topN=${topN}&selectedMunicipalityRanking=${encodeURIComponent(selectedMunicipalityRanking)}&month=${rankingMonth}`,
        setRankingsData,
    ), [sections.topNRanking, topN, selectedMunicipalityRanking, rankingMonth])

    useEffect(() => load(
        sections.forecast,
        `/api/forecast/predict?municipality=${encodeURIComponent(forecastMunicipality)}&type=${encodeURIComponent(forecastType)}`,
        data => setForecastData({ timeline: data?.timeline ?? [], forecast: data?.forecast ?? [], average_growth_rate: data?.average_growth_rate ?? 0 }),
        { timeline: [], forecast: [], average_growth_rate: 0 },
    ), [sections.forecast, forecastMunicipality, forecastType])

    useEffect(() => {
        let cancelled = false
        setPreviewLoading(true)
        const params = new URLSearchParams({ year_from: selectedYearFrom, year_to: selectedYearTo, month: selectedDatasetMonth })
        apiGet(`/api/export/dataset?${params}`)
            .then(data => { if (!cancelled) setPreviewData(Array.isArray(data) ? data : []) })
            .catch(() => { if (!cancelled) setPreviewData([]) })
            .finally(() => { if (!cancelled) setPreviewLoading(false) })
        return () => { cancelled = true }
    }, [selectedYearFrom, selectedYearTo, selectedDatasetMonth])

    const buildMonthlyGrids = (data) => {
        const grouped = {}
        data.forEach(row => {
            const key = `${row.year}-${row.month}`
            if (!grouped[key]) grouped[key] = { year: row.year, month: row.month, lookup: {} }
            grouped[key].lookup[`${row.municipality_name}|${row.type_name}`] = row.request_count
        })
        return Object.values(grouped)
            .sort((a, b) => a.year - b.year || a.month - b.month)
            .map(({ year, month, lookup }) => {
                const rows = municipalities.map(m => {
                    const cells = types.map(t => lookup[`${m.municipality_name}|${t.type_name}`] ?? 0)
                    return { municipality: m.municipality_name, cells, total: cells.reduce((s, v) => s + v, 0) }
                })
                const columnTotals = types.map((_, idx) => rows.reduce((s, r) => s + r.cells[idx], 0))
                return { year, month, rows, columnTotals, grandTotal: columnTotals.reduce((s, v) => s + v, 0) }
            })
    }

    const monthlyGrids = buildMonthlyGrids(previewData)
    const datasetGrandTotal = monthlyGrids.reduce((s, g) => s + g.grandTotal, 0)
    const yearRangeInvalid = Number(selectedYearFrom) > Number(selectedYearTo)

    const forecastChartData = [
        ...forecastData.timeline.map((row, i) => ({
            label: row.label,
            total: row.total,
            future_prediction: i === forecastData.timeline.length - 1 ? row.total : null,
            band: i === forecastData.timeline.length - 1 ? [row.total, row.total] : null,
        })),
        ...forecastData.forecast.map(row => ({
            label: row.label,
            future_prediction: row.future_prediction,
            lower: row.lower,
            upper: row.upper,
            band: [row.lower, row.upper],
        })),
    ]

    const sortedDistribution = [...distributionData].sort((a, b) => Number(b.value) - Number(a.value))
    const sortedBars = [...barChartData].sort((a, b) => Number(b.total) - Number(a.total))
    const drilldownSorted = [...drilldownData].sort((a, b) => Number(b.total) - Number(a.total))
    const drilldownTotal = drilldownSorted.reduce((s, d) => s + Number(d.total), 0) || 1
    const rankingMax = Math.max(...rankingsData.map(r => r.current || 0), 1)

    const handleChartImageExport = async () => {
        setChartsExporting(true)
        setExportError('')
        try {
            const zip = new JSZip()
            const folder = zip.folder('MARDSS_Charts')
            for (const [key, ref] of Object.entries(chartRefs)) {
                if (!sections[key] || !ref.current) continue
                const canvas = await html2canvas(ref.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
                folder.file(`${sectionLabels[key]}.png`, blob)
            }
            downloadBlob(await zip.generateAsync({ type: 'blob' }), 'MARDSS_Charts.zip')
        } catch {
            setExportError('Chart export failed. Please try again.')
        } finally {
            setChartsExporting(false)
        }
    }

    const handleExcelExport = async () => {
        setExcelExporting(true)
        setExportError('')
        try {
            const params = new URLSearchParams({ year_from: selectedYearFrom, year_to: selectedYearTo, month: selectedDatasetMonth })
            downloadBlob(await apiBlob(`/api/export/dataset/excel?${params}`), 'MARDSS_Dataset.xlsx')
        } catch {
            setExportError('Excel export failed. Please try again.')
        } finally {
            setExcelExporting(false)
        }
    }

    const toggleSection = (key) => setSections(prev => ({ ...prev, [key]: !prev[key] }))
    const setAllSections = (value) => setSections(Object.fromEntries(SECTIONS.map(s => [s.key, value])))

    const muniOptions = municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)
    const typeOptions = types.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)

    const sectionFilters = {
        dashboardKpi: (
            <>
                <YearMonth idPrefix="x-kpi" year={selectedDashboardYear} month={selectedMonth} onYear={setSelectedDashboardYear} onMonth={setSelectedMonth} />
                <FilterSelect id="x-kpi-muni" label="Municipality" value={selectedDashboardMunicipality} onChange={e => setSelectedDashboardMunicipality(e.target.value)}>
                    <option value="ALL">All municipalities</option>{muniOptions}
                </FilterSelect>
                <FilterSelect id="x-kpi-type" label="Assistance type" value={selectedDashboardType} onChange={e => setSelectedDashboardType(e.target.value)}>
                    <option value="ALL">All types</option>{typeOptions}
                </FilterSelect>
            </>
        ),
        yoyTrends: (
            <>
                <FilterSelect id="x-trend-type" label="Assistance type" value={selectedYoYType} onChange={e => setSelectedYoYType(e.target.value)}>
                    <option value="ALL">All types</option>{typeOptions}
                </FilterSelect>
                <FilterSelect id="x-trend-year" label="Year" value={selectedYearForLine} onChange={e => setSelectedYearForLine(e.target.value)}>
                    <option value="ALL">All years</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </FilterSelect>
            </>
        ),
        distributionByAssistance: (
            <YearMonth idPrefix="x-dist" year={selectedDistributionYear} month={selectedDistributionMonth} onYear={setSelectedDistributionYear} onMonth={setSelectedDistributionMonth} />
        ),
        distributionByMunicipality: (
            <YearMonth idPrefix="x-bar" year={selectedBarChartYear} month={selectedBarMonth} onYear={setSelectedBarChartYear} onMonth={setSelectedBarMonth} />
        ),
        comparisonChart: (
            <>
                <FilterSelect id="x-cmp-a" label="First" value={compMunicipality1} onChange={e => setCompMunicipality1(e.target.value)}>
                    {municipalities.filter(m => m.municipality_name !== compMunicipality2).map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                </FilterSelect>
                <FilterSelect id="x-cmp-b" label="Second" value={compMunicipality2} onChange={e => setCompMunicipality2(e.target.value)}>
                    {municipalities.filter(m => m.municipality_name !== compMunicipality1).map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                </FilterSelect>
                <FilterSelect id="x-cmp-type" label="Assistance type" value={compType} onChange={e => setCompType(e.target.value)}>
                    <option value="ALL">All types</option>{typeOptions}
                </FilterSelect>
                <YearMonth idPrefix="x-cmp" year={compYear} month={comparisonMonth} onYear={setCompYear} onMonth={setComparisonMonth} />
            </>
        ),
        municipalityDrilldown: (
            <>
                <FilterSelect id="x-dd-muni" label="Municipality" value={drilldownMunicipality} onChange={e => setDrilldownMunicipality(e.target.value)}>
                    {muniOptions}
                </FilterSelect>
                <YearMonth idPrefix="x-dd" year={drilldownYear} month={drill_down_month} onYear={setDrilldownYear} onMonth={setDrillDownMonth} />
            </>
        ),
        topNRanking: (
            <>
                <FilterSelect id="x-rk-top" label="Show" value={topN} onChange={e => setTopN(Number(e.target.value))}>
                    {[5, 10, 15, 20, 24].map(n => <option key={n} value={n}>Top {n}</option>)}
                </FilterSelect>
                <FilterSelect id="x-rk-muni" label="Municipality" value={selectedMunicipalityRanking} onChange={e => setSelectedMunicipalityRanking(e.target.value)}>
                    <option value="ALL">All municipalities</option>{muniOptions}
                </FilterSelect>
                <FilterSelect id="x-rk-month" label="Month" value={rankingMonth} onChange={e => setRankingMonth(Number(e.target.value))}>
                    {availableMonths.map(m => <option key={`${m.year}-${m.month}`} value={m.month}>{monthLabel(m.month)} {m.year}</option>)}
                </FilterSelect>
            </>
        ),
        forecast: (
            <>
                <FilterSelect id="x-fc-muni" label="Municipality" value={forecastMunicipality} onChange={e => setForecastMunicipality(e.target.value)}>
                    <option value="ALL">All municipalities</option>{muniOptions}
                </FilterSelect>
                <FilterSelect id="x-fc-type" label="Assistance type" value={forecastType} onChange={e => setForecastType(e.target.value)}>
                    <option value="ALL">All types</option>{typeOptions}
                </FilterSelect>
            </>
        ),
    }

    const periodLabel = (year, month) =>
        `${year !== 'ALL' ? year : 'All years'}${month !== 'ALL' ? ` · ${monthLabel(month)}` : ''}`

    const renderPreviews = () => (
        <div className="flex flex-col gap-5">
            {sections.dashboardKpi && (
                <PreviewFrame
                    innerRef={chartRefs.dashboardKpi}
                    title="Dashboard summary"
                    subtitle={[
                        periodLabel(selectedDashboardYear, selectedMonth),
                        selectedDashboardMunicipality !== 'ALL' && selectedDashboardMunicipality,
                        selectedDashboardType !== 'ALL' && selectedDashboardType,
                    ].filter(Boolean).join(' · ')}
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="flex flex-col gap-2 rounded-lg bg-brand-navy p-4 text-white">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Total requests</p>
                            <p className="text-2xl font-bold tabular-nums">{formatNumber(kpiPreview?.total_requests)}</p>
                            {kpiPreview?.growth_percent != null && kpiPreview?.growth_percent !== '' && <div><TrendBadge value={kpiPreview.growth_percent} /></div>}
                        </div>
                        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Highest volume type</p>
                            <p className="text-lg font-bold text-gray-900">{kpiPreview?.top_type?.type_name ?? 'N/A'}</p>
                            <p className="text-sm text-gray-500">{kpiPreview?.top_type?.total ? `${formatNumber(kpiPreview.top_type.total)} requests` : ''}</p>
                        </div>
                        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Highest volume municipality</p>
                            <p className="text-lg font-bold text-gray-900">{kpiPreview?.top_municipality?.municipality_name ?? 'N/A'}</p>
                            <p className="text-sm text-gray-500">{kpiPreview?.top_municipality?.total ? `${formatNumber(kpiPreview.top_municipality.total)} requests` : ''}</p>
                        </div>
                    </div>
                </PreviewFrame>
            )}

            {sections.yoyTrends && (
                <PreviewFrame
                    innerRef={chartRefs.yoyTrends}
                    title={`${selectedYearForLine === 'ALL' ? 'Yearly' : 'Monthly'} request trend`}
                    subtitle={`${selectedYoYType !== 'ALL' ? selectedYoYType : 'All types'} · ${selectedYearForLine !== 'ALL' ? selectedYearForLine : 'All years'}`}
                >
                    {yoyTrendData.length ? (
                        <ResponsiveContainer width="100%" height={340}>
                            <AreaChart data={yoyTrendData} margin={{ top: 24, right: 24, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="exportTrendFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.25} />
                                        <stop offset="100%" stopColor={CHART.blue} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke={CHART.grid} vertical={false} />
                                <XAxis dataKey={yoyTrendData[0]?.month ? 'month' : 'year'} padding={{ left: 20, right: 20 }} {...axisProps} />
                                <YAxis domain={[0, dataMax => Math.ceil(dataMax * 1.15)]} tickFormatter={formatNumber} width={56} {...axisProps} axisLine={false} />
                                <Tooltip {...tooltipProps} />
                                <Area {...PREVIEW_ANIMATION} type="monotone" dataKey="total" name="Requests" stroke={CHART.blue} strokeWidth={2.5} fill="url(#exportTrendFill)"
                                    dot={{ r: 3, fill: '#fff', stroke: CHART.blue, strokeWidth: 2 }}
                                    label={{ position: 'top', offset: 10, fill: '#4B5563', fontSize: 11, formatter: formatNumber }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <EmptyState />}
                </PreviewFrame>
            )}

            {sections.distributionByAssistance && (
                <PreviewFrame innerRef={chartRefs.distributionByAssistance} title="Distribution by assistance type" subtitle={periodLabel(selectedDistributionYear, selectedDistributionMonth)}>
                    {sortedDistribution.length ? (
                        <ResponsiveContainer width="100%" height={Math.max(300, sortedDistribution.length * 34)}>
                            <BarChart data={sortedDistribution} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                                <XAxis type="number" tickFormatter={formatNumber} {...axisProps} />
                                <YAxis dataKey="name" type="category" width={150} {...axisProps} axisLine={false} />
                                <Bar {...PREVIEW_ANIMATION} dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                                    {sortedDistribution.map((_, i) => <Cell key={i} fill={i === 0 ? CHART.amber : CHART.navy} />)}
                                    <LabelList dataKey="value" position="right" formatter={formatNumber} style={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyState />}
                </PreviewFrame>
            )}

            {sections.distributionByMunicipality && (
                <PreviewFrame innerRef={chartRefs.distributionByMunicipality} title="Requests by municipality / city" subtitle={periodLabel(selectedBarChartYear, selectedBarMonth)}>
                    {sortedBars.length ? (
                        <ResponsiveContainer width="100%" height={Math.max(360, sortedBars.length * 26)}>
                            <BarChart data={sortedBars} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                                <XAxis type="number" tickFormatter={formatNumber} {...axisProps} />
                                <YAxis dataKey="municipality_name" type="category" width={150} interval={0} {...axisProps} axisLine={false} />
                                <Bar {...PREVIEW_ANIMATION} dataKey="total" radius={[0, 4, 4, 0]} barSize={14}>
                                    {sortedBars.map((_, i) => <Cell key={i} fill={i < 3 ? CHART.blue : CHART.navy} />)}
                                    <LabelList dataKey="total" position="right" formatter={formatNumber} style={{ fill: '#374151', fontSize: 11, fontWeight: 600 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyState />}
                </PreviewFrame>
            )}

            {sections.comparisonChart && (
                <PreviewFrame
                    innerRef={chartRefs.comparisonChart}
                    title="Municipality comparison"
                    subtitle={`${compMunicipality1} vs ${compMunicipality2}${compType !== 'ALL' ? ` · ${compType}` : ''} · ${periodLabel(compYear, comparisonMonth)}`}
                >
                    {comparisonData.length ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={comparisonData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barGap={4}>
                                <CartesianGrid stroke={CHART.grid} vertical={false} />
                                <XAxis dataKey="type_name" angle={-35} textAnchor="end" interval={0} height={110} {...axisProps} tick={{ fontSize: 11, fill: CHART.axis }} />
                                <YAxis width={52} tickFormatter={formatNumber} {...axisProps} axisLine={false} />
                                <Legend verticalAlign="top" align="right" height={32} iconType="square" wrapperStyle={{ fontSize: 12 }} />
                                <Bar {...PREVIEW_ANIMATION} dataKey={compMunicipality1} fill={CHART.navy} radius={[4, 4, 0, 0]} maxBarSize={36} label={{ position: 'top', fontSize: 10, fill: '#4B5563', formatter: formatNumber }} />
                                <Bar {...PREVIEW_ANIMATION} dataKey={compMunicipality2} fill={CHART.amber} radius={[4, 4, 0, 0]} maxBarSize={36} label={{ position: 'top', fontSize: 10, fill: '#4B5563', formatter: formatNumber }} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyState />}
                </PreviewFrame>
            )}

            {sections.municipalityDrilldown && (
                <PreviewFrame innerRef={chartRefs.municipalityDrilldown} title="Municipality breakdown" subtitle={`${drilldownMunicipality} · ${periodLabel(drilldownYear, drill_down_month)}`}>
                    {drilldownSorted.length ? (
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {drilldownSorted.map((item, i) => {
                                const share = (Number(item.total) / drilldownTotal) * 100
                                return (
                                    <li key={item.type_name} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="truncate text-sm font-medium text-gray-700">{item.type_name}</span>
                                            <span className="text-sm font-semibold tabular-nums text-gray-900">{formatNumber(item.total)}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-gray-100">
                                            <div className={`h-1.5 rounded-full ${i === 0 ? 'bg-brand-amber' : 'bg-brand-navy'}`} style={{ width: `${share}%` }} />
                                        </div>
                                        <span className="text-xs tabular-nums text-gray-500">{share.toFixed(1)}% of total</span>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : <EmptyState />}
                </PreviewFrame>
            )}

            {sections.topNRanking && (
                <PreviewFrame
                    innerRef={chartRefs.topNRanking}
                    title="Municipality rankings"
                    subtitle={`Top ${topN} · ${monthLabel(rankingMonth) ?? ''} ${currentYear - 1} vs ${currentYear}${selectedMunicipalityRanking !== 'ALL' ? ` · ${selectedMunicipalityRanking}` : ''}`}
                >
                    {rankingsData.length ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    <th scope="col" className="pb-3 pr-3">Rank</th>
                                    <th scope="col" className="pb-3 pr-3">Municipality</th>
                                    <th scope="col" className="pb-3 pr-3 text-right">{monthLabel(rankingMonth)} {currentYear - 1}</th>
                                    <th scope="col" className="pb-3 pr-3 text-right">{monthLabel(rankingMonth)} {currentYear}</th>
                                    <th scope="col" className="pb-3 pr-3">Volume</th>
                                    <th scope="col" className="pb-3 text-right">Growth</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankingsData.map((item, index) => (
                                    <tr key={item.municipality_name} className="border-b border-gray-100 last:border-0">
                                        <td className="py-2.5 pr-3">
                                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-brand-amber text-brand-navy' : index === 1 ? 'bg-brand-navy text-white' : index === 2 ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-3 font-medium text-gray-800">{item.municipality_name}</td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-gray-500">{formatNumber(item.previous)}</td>
                                        <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-gray-900">{formatNumber(item.current)}</td>
                                        <td className="w-28 py-2.5 pr-3">
                                            <div className="h-1.5 rounded-full bg-gray-100">
                                                <div className="h-1.5 rounded-full bg-brand-blue" style={{ width: `${((item.current || 0) / rankingMax) * 100}%` }} />
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-right"><TrendBadge value={item.growth_rate} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <EmptyState />}
                </PreviewFrame>
            )}

            {sections.forecast && (
                <PreviewFrame
                    innerRef={chartRefs.forecast}
                    title="Demand forecast"
                    subtitle={`${forecastMunicipality !== 'ALL' ? forecastMunicipality : 'All municipalities'} · ${forecastType !== 'ALL' ? forecastType : 'All types'}`}
                >
                    {forecastChartData.length ? (
                        <ResponsiveContainer width="100%" height={360}>
                            <ComposedChart data={forecastChartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke={CHART.grid} vertical={false} />
                                <XAxis dataKey="label" minTickGap={24} {...axisProps} />
                                <YAxis tickFormatter={formatNumber} width={56} {...axisProps} axisLine={false} />
                                <Legend verticalAlign="top" align="right" height={32} iconType="plainline" wrapperStyle={{ fontSize: 12 }}
                                    formatter={key => ({ total: 'Historical', future_prediction: 'Projected', band: 'Confidence range' })[key] ?? key} />
                                <Area {...PREVIEW_ANIMATION} dataKey="band" name="band" stroke="none" fill={CHART.amber} fillOpacity={0.18} />
                                <Line {...PREVIEW_ANIMATION} dataKey="total" name="total" stroke={CHART.navy} strokeWidth={2.5} dot={false} />
                                <Line {...PREVIEW_ANIMATION} dataKey="future_prediction" name="future_prediction" stroke={CHART.amber} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3, fill: CHART.amber }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : <EmptyState />}
                </PreviewFrame>
            )}
        </div>
    )

    return (
        <Layout>
            <PageHeader title="Export" description="Download the raw dataset or produce report-ready chart images.">
                <SegmentedTabs
                    label="Export type"
                    active={activeTab}
                    onChange={setActiveTab}
                    tabs={[
                        { value: 'dataset', label: 'Dataset', icon: Database },
                        { value: 'charts', label: 'Charts', icon: Images },
                    ]}
                />
            </PageHeader>

            {exportError && (
                <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{exportError}</p>
            )}

            {activeTab === 'dataset' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
                    <Card className="h-fit lg:sticky lg:top-0">
                        <CardHeader icon={FileSpreadsheet} title="Dataset export" description="Monthly requests per municipality and assistance type." />
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <FilterSelect id="ds-from" label="From year" value={selectedYearFrom} onChange={e => setSelectedYearFrom(e.target.value)} className="min-w-0">
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </FilterSelect>
                                <FilterSelect id="ds-to" label="To year" value={selectedYearTo} onChange={e => setSelectedYearTo(e.target.value)} className="min-w-0">
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </FilterSelect>
                            </div>
                            {yearRangeInvalid && <p className="text-xs text-red-600">{'"From" year must be on or before "To" year.'}</p>}
                            <FilterSelect id="ds-month" label="Month" value={selectedDatasetMonth} onChange={e => setSelectedDatasetMonth(e.target.value)}>
                                <option value="ALL">All months</option>
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </FilterSelect>

                            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                                <div className="flex flex-col gap-0.5">
                                    <dt className="text-xs text-gray-500">Months included</dt>
                                    <dd className="font-semibold tabular-nums text-gray-900">{previewLoading ? '…' : monthlyGrids.length}</dd>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <dt className="text-xs text-gray-500">Total requests</dt>
                                    <dd className="font-semibold tabular-nums text-gray-900">{previewLoading ? '…' : formatNumber(datasetGrandTotal)}</dd>
                                </div>
                            </dl>

                            <button
                                type="button"
                                onClick={handleExcelExport}
                                disabled={excelExporting || yearRangeInvalid || (!previewLoading && monthlyGrids.length === 0)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {excelExporting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                                {excelExporting ? 'Preparing file…' : 'Download Excel (.xlsx)'}
                            </button>
                        </div>
                    </Card>

                    <Card className="min-w-0">
                        <div className="mb-5 flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-5 text-center">
                            <p className="text-lg font-bold tracking-tight text-brand-navy">MARDSS REPORT</p>
                            <p className="text-sm text-gray-600">Medical Assistance Request Decision Support System</p>
                            <p className="text-sm text-gray-600">Province of Bulacan · PSWDO</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                                {selectedYearFrom} – {selectedYearTo} · {selectedDatasetMonth === 'ALL' ? 'All months' : monthLabel(selectedDatasetMonth)}
                            </p>
                        </div>

                        {previewLoading ? (
                            <div className="flex flex-col gap-2">
                                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-7 animate-pulse rounded bg-gray-100" />)}
                            </div>
                        ) : monthlyGrids.length === 0 ? (
                            <EmptyState message="No data found for the selected period." />
                        ) : (
                            <div className="flex max-h-[36rem] flex-col gap-8 overflow-auto">
                                {monthlyGrids.map(grid => (
                                    <div key={`${grid.year}-${grid.month}`} className="flex flex-col gap-2">
                                        <div className="sticky left-0 flex items-baseline justify-between gap-4">
                                            <p className="font-semibold text-gray-800">{monthLabel(grid.month)} {grid.year}</p>
                                            <p className="text-xs tabular-nums text-gray-500">{formatNumber(grid.grandTotal)} requests</p>
                                        </div>
                                        <table className="border-separate border-spacing-0 text-xs">
                                            <thead>
                                                <tr>
                                                    <th scope="col" className="sticky left-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600">Municipality</th>
                                                    {types.map(t => (
                                                        <th scope="col" key={t.type_id} className="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-right font-semibold text-gray-600">{t.type_name}</th>
                                                    ))}
                                                    <th scope="col" className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-right font-bold text-gray-800">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {grid.rows.map(row => (
                                                    <tr key={row.municipality} className="group">
                                                        <td className="sticky left-0 whitespace-nowrap border-b border-gray-100 bg-white px-3 py-1.5 font-medium text-gray-700 group-hover:bg-gray-50">{row.municipality}</td>
                                                        {row.cells.map((val, idx) => (
                                                            <td key={idx} className={`border-b border-gray-100 px-3 py-1.5 text-right tabular-nums group-hover:bg-gray-50 ${val === 0 ? 'text-gray-300' : 'text-gray-700'}`}>{formatNumber(val)}</td>
                                                        ))}
                                                        <td className="border-b border-gray-100 px-3 py-1.5 text-right font-semibold tabular-nums text-gray-900 group-hover:bg-gray-50">{formatNumber(row.total)}</td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td className="sticky left-0 bg-brand-navy px-3 py-2 font-bold text-white">Total</td>
                                                    {grid.columnTotals.map((val, idx) => (
                                                        <td key={idx} className="bg-brand-navy px-3 py-2 text-right font-semibold tabular-nums text-white">{formatNumber(val)}</td>
                                                    ))}
                                                    <td className="bg-brand-navy px-3 py-2 text-right font-bold tabular-nums text-brand-amber">{formatNumber(grid.grandTotal)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {activeTab === 'charts' && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
                    <Card className="h-fit xl:sticky xl:top-0">
                        <CardHeader icon={Images} title="Charts to include" description="Each selected chart is exported as a PNG in a ZIP file.">
                            <button
                                type="button"
                                onClick={() => setAllSections(selectedCount !== SECTIONS.length)}
                                className="text-sm font-medium text-brand-blue hover:underline"
                            >
                                {selectedCount === SECTIONS.length ? 'Clear all' : 'Select all'}
                            </button>
                        </CardHeader>

                        <ul className="flex flex-col gap-2">
                            {SECTIONS.map(({ key, label, icon }) => {
                                const Icon = icon
                                const checked = sections[key]
                                return (
                                    <li key={key} className={`rounded-lg border transition ${checked ? 'border-brand-blue/40 bg-blue-50/40' : 'border-gray-200'}`}>
                                        <label htmlFor={`sec-${key}`} className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                                            <input id={`sec-${key}`} type="checkbox" checked={checked} onChange={() => toggleSection(key)} className="sr-only" />
                                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-brand-blue bg-brand-blue text-white' : 'border-gray-300 bg-white'}`} aria-hidden="true">
                                                {checked && <Check size={14} />}
                                            </span>
                                            <Icon size={16} className={checked ? 'text-brand-navy' : 'text-gray-400'} aria-hidden="true" />
                                            <span className={`text-sm ${checked ? 'font-medium text-gray-900' : 'text-gray-600'}`}>{label}</span>
                                        </label>
                                        {checked && (
                                            <div className="grid grid-cols-2 gap-2 border-t border-brand-blue/15 px-3 pb-3 pt-2.5 [&>div]:min-w-0">
                                                {sectionFilters[key]}
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>

                        <button
                            type="button"
                            onClick={handleChartImageExport}
                            disabled={!anyChartSelected || chartsExporting}
                            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {chartsExporting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                            {chartsExporting ? 'Rendering images…' : anyChartSelected ? `Export ${selectedCount} chart${selectedCount > 1 ? 's' : ''} (.zip)` : 'Select a chart to export'}
                        </button>
                    </Card>

                    <div className="min-w-0">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700">Live preview</p>
                            <p className="text-xs text-gray-500">Images are captured exactly as shown below</p>
                        </div>
                        {anyChartSelected ? renderPreviews() : (
                            <EmptyState height={420} message="Select one or more charts on the left to preview them here." />
                        )}
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default Export
