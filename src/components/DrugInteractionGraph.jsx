import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const SEVERITY_COLOR = {
  none:     '#10b981',
  mild:     '#84cc16',
  moderate: '#f59e0b',
  high:     '#ef4444',
}

const SEVERITY_LABEL = {
  none:     'No interaction',
  mild:     'Mild',
  moderate: 'Moderate',
  high:     'High',
}

export default function DrugInteractionGraph({ interactions = [], currentMeds = [], newDrug = '' }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = 520
    const height = 340

    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const nodeNames = Array.from(new Set([...currentMeds, newDrug].filter(Boolean)))
    const nodes = nodeNames.map((name) => ({ id: name, isNew: name === newDrug }))

    const nodeIds = new Set(nodeNames)
    const links = interactions
      .filter((ix) => nodeIds.has(ix.source) && nodeIds.has(ix.target))
      .map((ix) => ({
        source: ix.source,
        target: ix.target,
        severity: ix.severity || 'none',
        note: ix.note || '',
      }))

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(110))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(42))

    const tooltip = d3
      .select('body')
      .append('div')
      .attr('id', 'dig-tooltip')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('background', '#0f172a')
      .style('color', '#f1f5f9')
      .style('padding', '8px 12px')
      .style('border-radius', '10px')
      .style('font-size', '12px')
      .style('line-height', '1.5')
      .style('max-width', '220px')
      .style('box-shadow', '0 8px 24px rgba(0,0,0,0.25)')
      .style('opacity', '0')
      .style('transition', 'opacity 0.15s')
      .style('z-index', '9999')

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => SEVERITY_COLOR[d.severity] || SEVERITY_COLOR.none)
      .attr('stroke-width', (d) => (d.severity === 'high' ? 3 : 2))
      .attr('stroke-opacity', 0.75)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        tooltip
          .style('opacity', '1')
          .style('left', `${event.clientX + 14}px`)
          .style('top', `${event.clientY - 10}px`)
          .html(
            `<strong style="color:${SEVERITY_COLOR[d.severity]}">${SEVERITY_LABEL[d.severity]}</strong><br/>` +
            `${d.source.id ?? d.source} → ${d.target.id ?? d.target}` +
            (d.note ? `<br/><span style="color:#94a3b8">${d.note}</span>` : ''),
          )
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'))

    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'grab')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null; d.fy = null
          }),
      )

    node.append('circle')
      .attr('r', (d) => (d.isNew ? 28 : 22))
      .attr('fill', (d) => (d.isNew ? '#0d9488' : '#f8fafc'))
      .attr('stroke', (d) => (d.isNew ? '#0f766e' : '#cbd5e1'))
      .attr('stroke-width', (d) => (d.isNew ? 2.5 : 1.5))
      .on('mousemove', (event, d) => {
        const related = links.filter(
          (l) => (l.source.id ?? l.source) === d.id || (l.target.id ?? l.target) === d.id,
        )
        const lines = related.length
          ? related.map((l) =>
              `<span style="color:${SEVERITY_COLOR[l.severity]}">${SEVERITY_LABEL[l.severity]}</span>: ` +
              `${l.source.id ?? l.source} ↔ ${l.target.id ?? l.target}`,
            ).join('<br/>')
          : '<span style="color:#94a3b8">No interactions listed</span>'
        tooltip
          .style('opacity', '1')
          .style('left', `${event.clientX + 14}px`)
          .style('top', `${event.clientY - 10}px`)
          .html(
            `<strong style="color:${d.isNew ? '#2dd4bf' : '#f1f5f9'}">${d.id}</strong>` +
            (d.isNew ? ' <span style="color:#5eead4">(new)</span>' : '') +
            `<br/>${lines}`,
          )
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'))

    node.append('text')
      .text((d) => {
        const w = d.id.split(/\s+/)[0]
        return w.length > 10 ? w.slice(0, 9) + '…' : w
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', (d) => (d.isNew ? '#fff' : '#1e293b'))
      .attr('font-size', 11)
      .attr('font-weight', (d) => (d.isNew ? '700' : '500'))
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
      d3.select('#dig-tooltip').remove()
    }
  }, [interactions, currentMeds, newDrug])

  if (!currentMeds.length && !newDrug) return null

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Drug interaction map
          </p>
          <p className="mt-0.5 text-sm text-slate-600">Hover edges or nodes · drag to rearrange</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(SEVERITY_LABEL).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_COLOR[key] }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl bg-slate-50/60 ring-1 ring-slate-100">
        <svg ref={svgRef} className="h-[min(340px,44vh)] min-h-[260px] w-full" />
      </div>
    </div>
  )
}
