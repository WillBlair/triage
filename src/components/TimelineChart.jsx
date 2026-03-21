import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'

function ProjectionLoading({ regimenLabel }) {
  const bars = [32, 48, 41, 56, 50, 64, 58, 72]

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            8-week projection
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">Building timeline…</h3>
          {regimenLabel ? (
            <p className="mt-1 text-sm text-slate-600">{regimenLabel}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          Generating
        </span>
      </div>
      <div
        className="flex h-[280px] items-end justify-between gap-1.5 rounded-2xl border border-slate-100 bg-linear-to-b from-slate-50 to-white px-4 pb-8 pt-6 sm:gap-2 sm:px-8"
        aria-hidden
      >
        {bars.map((pct, index) => (
          <div
            key={index}
            className="flex h-full min-h-0 max-w-[44px] flex-1 items-end justify-center"
          >
            <div
              className="w-full max-w-[36px] rounded-t-md bg-teal-200/70 animate-pulse"
              style={{
                height: `${pct}%`,
                animationDelay: `${index * 100}ms`,
              }}
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Fitting the curve to your selected regimen…
      </p>
    </div>
  )
}

function TimelineChart({ simulation, isRunning = false, regimenLabel = '' }) {
  const svgRef = useRef(null)
  const chartData = useMemo(() => simulation?.weeks || [], [simulation])

  const maxValue = useMemo(() => {
    if (!chartData.length || !simulation?.targetRange) {
      return 180
    }

    return Math.max(
      ...chartData.map((point) => point.value),
      simulation.targetRange.high + 10,
    )
  }, [chartData, simulation])

  useEffect(() => {
    if (!svgRef.current || !chartData.length || !simulation?.targetRange) {
      return
    }

    const width = 520
    const height = 260
    const margin = { top: 18, right: 24, bottom: 34, left: 44 }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const x = d3
      .scalePoint()
      .domain(chartData.map((point) => point.label))
      .range([margin.left, width - margin.right])

    const y = d3
      .scaleLinear()
      .domain([simulation.targetRange.low - 15, maxValue])
      .nice()
      .range([height - margin.bottom, margin.top])

    svg
      .append('rect')
      .attr('x', margin.left)
      .attr('y', y(simulation.targetRange.high))
      .attr('width', width - margin.left - margin.right)
      .attr('height', y(simulation.targetRange.low) - y(simulation.targetRange.high))
      .attr('fill', '#dcfce7')
      .attr('rx', 16)

    const line = d3
      .line()
      .x((point) => x(point.label))
      .y((point) => y(point.value))
      .curve(d3.curveMonotoneX)

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call((axis) => axis.select('.domain').remove())
      .call((axis) =>
        axis
          .selectAll('text')
          .attr('fill', '#64748b')
          .attr('font-size', 12),
      )

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call((axis) => axis.select('.domain').remove())
      .call((axis) =>
        axis
          .selectAll('text')
          .attr('fill', '#64748b')
          .attr('font-size', 12),
      )

    const path = svg
      .append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', '#0d9488')
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', line)

    const totalLength = path.node()?.getTotalLength() || 0

    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1400)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0)

    svg
      .append('g')
      .selectAll('circle')
      .data(chartData)
      .join('circle')
      .attr('cx', (point) => x(point.label))
      .attr('cy', (point) => y(point.value))
      .attr('r', 0)
      .attr('fill', '#0f172a')
      .transition()
      .delay((_, index) => 220 * index)
      .duration(350)
      .attr('r', 5)
  }, [chartData, maxValue, simulation])

  if (isRunning && !simulation) {
    return <ProjectionLoading regimenLabel={regimenLabel} />
  }

  if (!simulation) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center gap-2 rounded-[1.75rem] border border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
        <p className="font-medium text-slate-700">No projection yet</p>
        <p>Run the simulation to plot the eight-week course; risks and pearls fill in underneath.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            8-week projection
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">
            {simulation.projectedMetric}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Target {simulation.targetRange.low}-{simulation.targetRange.high}
        </span>
      </div>
      <svg ref={svgRef} className="h-[340px] w-full" />
    </div>
  )
}

export default TimelineChart
