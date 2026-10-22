import { forwardRef } from 'react'
import { Sparkles, Loader2, Inbox, ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export function PageHeader({ title, description, children }) {
    return (
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-brand-navy text-balance">{title}</h1>
                {description && <p className="text-sm text-gray-500 text-pretty">{description}</p>}
            </div>
            {children && <div className="flex flex-wrap items-end gap-3">{children}</div>}
        </header>
    )
}

export const Card = forwardRef(function Card({ className = '', children, ...props }, ref) {
    return (
        <section ref={ref} className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`} {...props}>
            {children}
        </section>
    )
})

export function CardHeader({ icon: Icon, title, description, children }) {
    return (
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
                {Icon && (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy">
                        <Icon size={18} aria-hidden="true" />
                    </span>
                )}
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-base font-semibold text-gray-800">{title}</h2>
                    {description && <p className="text-sm text-gray-500 leading-relaxed">{description}</p>}
                </div>
            </div>
            {children && <div className="flex flex-wrap items-end gap-2">{children}</div>}
        </div>
    )
}

export function FilterSelect({ label, value, onChange, children, className = '', id }) {
    const selectId = id || `filter-${label?.toLowerCase().replace(/\W+/g, '-')}`
    return (
        <div className={`flex min-w-[9rem] flex-col gap-1 ${className}`}>
            {label && (
                <label htmlFor={selectId} className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    id={selectId}
                    value={value}
                    onChange={onChange}
                    className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-sm text-gray-700 shadow-sm transition hover:border-gray-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                    {children}
                </select>
                <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
        </div>
    )
}

export function TrendBadge({ value, suffix = '%' }) {
    if (value == null || value === '' || Number.isNaN(Number(value))) return null
    const num = Number(value)
    const positive = num >= 0
    const Icon = positive ? ArrowUpRight : ArrowDownRight
    return (
        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <Icon size={12} aria-hidden="true" />
            {positive ? '+' : ''}{num}{suffix}
        </span>
    )
}

export function KpiCard({ label, value, hint, badge, loading, accent = false, icon: Icon }) {
    return (
        <div className={`flex flex-col gap-3 rounded-xl border p-5 shadow-sm ${accent ? 'border-brand-navy bg-brand-navy text-white' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between gap-2">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${accent ? 'text-white/70' : 'text-gray-500'}`}>{label}</p>
                {Icon && <Icon size={16} aria-hidden="true" className={accent ? 'text-brand-amber' : 'text-gray-400'} />}
            </div>
            {loading ? (
                <div className={`h-8 w-2/3 animate-pulse rounded ${accent ? 'bg-white/15' : 'bg-gray-100'}`} />
            ) : (
                <p className={`truncate text-2xl font-bold tabular-nums ${accent ? 'text-white' : 'text-gray-900'}`} title={typeof value === 'string' ? value : undefined}>
                    {value}
                </p>
            )}
            {(hint || badge) && (
                <div className="flex flex-wrap items-center gap-2">
                    {badge}
                    {hint && <p className={`text-sm ${accent ? 'text-white/70' : 'text-gray-500'}`}>{hint}</p>}
                </div>
            )}
        </div>
    )
}

export function EmptyState({ message = 'No data for the selected filters.', height = 240 }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/60 text-center" style={{ minHeight: height }}>
            <Inbox size={22} className="text-gray-300" aria-hidden="true" />
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    )
}

export function ChartSkeleton({ height = 320 }) {
    return <div className="w-full animate-pulse rounded-lg bg-gray-100" style={{ height }} aria-label="Loading chart" role="status" />
}

export function ChartState({ loading, empty, height, emptyMessage, children }) {
    if (loading) return <ChartSkeleton height={height} />
    if (empty) return <EmptyState height={height} message={emptyMessage} />
    return children
}

export function NarrativePanel({ narrative, loading, error, onGenerate, scope = 'the current view' }) {
    return (
        <Card className="border-brand-amber/40 bg-gradient-to-b from-amber-50/60 to-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-amber/20 text-amber-700">
                        <Sparkles size={18} aria-hidden="true" />
                    </span>
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-base font-semibold text-gray-800">AI Narrative Summary</h2>
                        <p className="text-sm text-gray-500">Plain-language interpretation of {scope}.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={loading}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-navy/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                    {loading ? 'Generating…' : narrative ? 'Regenerate' : 'Generate narrative'}
                </button>
            </div>

            <div className="mt-4" aria-live="polite">
                {loading && (
                    <div className="flex flex-col gap-2" role="status" aria-label="Generating narrative">
                        <div className="h-3 w-full animate-pulse rounded bg-amber-100" />
                        <div className="h-3 w-11/12 animate-pulse rounded bg-amber-100" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-amber-100" />
                    </div>
                )}
                {!loading && error && <p className="text-sm text-red-600">{error}</p>}
                {!loading && !error && narrative && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 text-pretty">{narrative}</p>
                )}
                {!loading && !error && !narrative && (
                    <p className="text-sm text-gray-500">
                        Generate a summary based on the data and filters currently shown on this page.
                    </p>
                )}
            </div>
        </Card>
    )
}

export function SegmentedTabs({ tabs, active, onChange, label }) {
    return (
        <div role="tablist" aria-label={label} className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
            {tabs.map(tab => (
                <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.value}
                    onClick={() => onChange(tab.value)}
                    className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition ${
                        active === tab.value ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    {tab.icon && <tab.icon size={16} aria-hidden="true" />}
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
