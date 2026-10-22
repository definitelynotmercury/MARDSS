export const MONTHS = [
    { label: 'Jan', value: 1 }, { label: 'Feb', value: 2 }, { label: 'Mar', value: 3 },
    { label: 'Apr', value: 4 }, { label: 'May', value: 5 }, { label: 'Jun', value: 6 },
    { label: 'Jul', value: 7 }, { label: 'Aug', value: 8 }, { label: 'Sep', value: 9 },
    { label: 'Oct', value: 10 }, { label: 'Nov', value: 11 }, { label: 'Dec', value: 12 },
]

export const monthLabel = (value) => MONTHS.find(m => m.value === Number(value))?.label

export const getYears = (start = 2023) => {
    const years = []
    for (let y = start; y <= new Date().getFullYear(); y++) years.push(y)
    return years
}

export const formatNumber = (value) =>
    value == null || Number.isNaN(Number(value)) ? '—' : Number(value).toLocaleString()

export const CHART = {
    navy: '#0B2E52',
    blue: '#1967B8',
    amber: '#E8B324',
    grid: '#E5E7EB',
    axis: '#6B7280',
    muted: '#CBD5E1',
}

export const axisProps = {
    tick: { fontSize: 12, fill: CHART.axis },
    axisLine: { stroke: CHART.grid },
    tickLine: false,
}

export const tooltipProps = {
    cursor: { fill: 'rgba(11, 46, 82, 0.05)' },
    contentStyle: {
        borderRadius: 8,
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
        fontSize: 12,
    },
    labelStyle: { fontWeight: 600, color: '#1F2937', marginBottom: 4 },
    formatter: (value) => formatNumber(value),
}
