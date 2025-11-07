import React from 'react';

interface WellDataPoint {
  depth: number;
  rockComposition: string;
  DT: number;
  GR: number;
}

interface WellDataChartProps {
  data: WellDataPoint[];
}

export function WellDataChart({ data }: WellDataChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No data to display
      </div>
    );
  }

  // Sort data by depth (ascending)
  const sortedData = [...data].sort((a, b) => a.depth - b.depth);

  // Get depth range
  const minDepth = Math.min(...sortedData.map(d => d.depth));
  const maxDepth = Math.max(...sortedData.map(d => d.depth));
  const depthRange = maxDepth - minDepth;

  // Get value ranges for DT and GR
  const minDT = Math.min(...sortedData.map(d => d.DT));
  const maxDT = Math.max(...sortedData.map(d => d.DT));
  const minGR = Math.min(...sortedData.map(d => d.GR));
  const maxGR = Math.max(...sortedData.map(d => d.GR));

  // Get unique rock compositions for color mapping
  const rockTypes = Array.from(new Set(sortedData.map(d => d.rockComposition)));
  const colorMap: Record<string, string> = {};
  const colors = [
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', 
    '#ef4444', '#14b8a6', '#f97316', '#a855f7', '#06b6d4'
  ];
  rockTypes.forEach((rock, i) => {
    colorMap[rock] = colors[i % colors.length];
  });

  const chartHeight = 600;
  const chartWidth = 900;
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const plotWidth = chartWidth - padding.left - padding.right;

  // Column widths
  const columnWidth = plotWidth / 3;

  // Scale functions
  const scaleDepth = (depth: number) => {
    return padding.top + ((depth - minDepth) / depthRange) * plotHeight;
  };

  const scaleDT = (value: number) => {
    return padding.left + columnWidth * 0.1 + ((value - minDT) / (maxDT - minDT)) * (columnWidth * 0.8);
  };

  const scaleGR = (value: number) => {
    return padding.left + columnWidth * 2.1 + ((value - minGR) / (maxGR - minGR)) * (columnWidth * 0.8);
  };

  // Create grid lines for depth
  const depthTicks = 10;
  const depthTickInterval = depthRange / depthTicks;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={chartWidth} height={chartHeight} className="bg-white">
        {/* Title */}
        <text
          x={chartWidth / 2}
          y={25}
          textAnchor="middle"
          className="text-slate-900"
        >
          Well Drilling Data Visualization
        </text>

        {/* Depth grid lines and labels */}
        {Array.from({ length: depthTicks + 1 }).map((_, i) => {
          const depth = minDepth + i * depthTickInterval;
          const y = scaleDepth(depth);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-slate-600"
              >
                {Math.round(depth)}
              </text>
            </g>
          );
        })}

        {/* Y-axis label (Depth) */}
        <text
          x={20}
          y={chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, 20, ${chartHeight / 2})`}
          className="text-slate-900"
        >
          Depth (ft)
        </text>

        {/* Column dividers */}
        <line
          x1={padding.left + columnWidth}
          y1={padding.top}
          x2={padding.left + columnWidth}
          y2={chartHeight - padding.bottom}
          stroke="#94a3b8"
          strokeWidth="2"
        />
        <line
          x1={padding.left + columnWidth * 2}
          y1={padding.top}
          x2={padding.left + columnWidth * 2}
          y2={chartHeight - padding.bottom}
          stroke="#94a3b8"
          strokeWidth="2"
        />

        {/* Column headers */}
        <text
          x={padding.left + columnWidth / 2}
          y={chartHeight - padding.bottom + 25}
          textAnchor="middle"
          className="text-slate-900"
        >
          Rock Composition
        </text>
        <text
          x={padding.left + columnWidth * 1.5}
          y={chartHeight - padding.bottom + 25}
          textAnchor="middle"
          className="text-slate-900"
        >
          DT
        </text>
        <text
          x={padding.left + columnWidth * 2.5}
          y={chartHeight - padding.bottom + 25}
          textAnchor="middle"
          className="text-slate-900"
        >
          GR
        </text>

        {/* DT axis labels */}
        <text
          x={padding.left + columnWidth * 1.1}
          y={chartHeight - padding.bottom + 45}
          className="text-slate-600"
        >
          {minDT.toFixed(0)}
        </text>
        <text
          x={padding.left + columnWidth * 1.9}
          y={chartHeight - padding.bottom + 45}
          textAnchor="end"
          className="text-slate-600"
        >
          {maxDT.toFixed(0)}
        </text>

        {/* GR axis labels */}
        <text
          x={padding.left + columnWidth * 2.1}
          y={chartHeight - padding.bottom + 45}
          className="text-slate-600"
        >
          {minGR.toFixed(0)}
        </text>
        <text
          x={padding.left + columnWidth * 2.9}
          y={chartHeight - padding.bottom + 45}
          textAnchor="end"
          className="text-slate-600"
        >
          {maxGR.toFixed(0)}
        </text>

        {/* Rock Composition bars */}
        {sortedData.map((point, i) => {
          const nextPoint = sortedData[i + 1];
          const y1 = scaleDepth(point.depth);
          const y2 = nextPoint ? scaleDepth(nextPoint.depth) : chartHeight - padding.bottom;
          const barHeight = y2 - y1;
          
          return (
            <g key={`rock-${i}`}>
              <rect
                x={padding.left + columnWidth * 0.1}
                y={y1}
                width={columnWidth * 0.8}
                height={barHeight}
                fill={colorMap[point.rockComposition] || '#64748b'}
                opacity="0.7"
              />
              {barHeight > 20 && (
                <text
                  x={padding.left + columnWidth / 2}
                  y={y1 + barHeight / 2}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="text-white text-xs"
                >
                  {point.rockComposition}
                </text>
              )}
            </g>
          );
        })}

        {/* DT line chart */}
        <polyline
          points={sortedData.map(point => 
            `${scaleDT(point.DT)},${scaleDepth(point.depth)}`
          ).join(' ')}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        {sortedData.map((point, i) => (
          <circle
            key={`dt-${i}`}
            cx={scaleDT(point.DT)}
            cy={scaleDepth(point.depth)}
            r="3"
            fill="#3b82f6"
          />
        ))}

        {/* GR line chart */}
        <polyline
          points={sortedData.map(point => 
            `${scaleGR(point.GR)},${scaleDepth(point.depth)}`
          ).join(' ')}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
        />
        {sortedData.map((point, i) => (
          <circle
            key={`gr-${i}`}
            cx={scaleGR(point.GR)}
            cy={scaleDepth(point.depth)}
            r="3"
            fill="#ef4444"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <div className="text-slate-700">
          Rock Types:
        </div>
        {rockTypes.map(rock => (
          <div key={rock} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colorMap[rock] }}
            />
            <span className="text-slate-700">{rock}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
