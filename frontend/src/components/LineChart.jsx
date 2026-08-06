import React from 'react';

/**
 * Lightweight SVG line chart component (no external dependencies).
 * Renders a responsive line chart with optional area fill and axis labels.
 */
const LineChart = ({ data, width = 600, height = 200, color = '#3498db', label = '' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>Nessun dato disponibile per il grafico</p>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + (1 - (d.value - min) / range) * chartH;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
    .join(' ');

  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`
      : '';

  const gridLines = 4;

  return (
    <div className="line-chart">
      {label && <div className="chart-label">{label}</div>}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${label || 'Grafico'}: valori da ${min.toFixed(1)} a ${max.toFixed(1)}`}
      >
        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padding.top + (i / gridLines) * chartH;
          const val = max - (i / gridLines) * range;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e9ecef"
                strokeWidth="1"
              />
              <text
                x={padding.left}
                y={y - 4}
                fontSize="10"
                fill="#999"
                textAnchor="start"
              >
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={color} opacity="0.15" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}

        {/* X-axis labels */}
        {points.length > 0 && (
          <text
            x={padding.left + chartW / 2}
            y={height - 5}
            fontSize="10"
            fill="#999"
            textAnchor="middle"
          >
            {new Date(points[0].timestamp).toLocaleDateString()} —{' '}
            {new Date(points[points.length - 1].timestamp).toLocaleDateString()}
          </text>
        )}
      </svg>
    </div>
  );
};

export default LineChart;