import React, { useId, useMemo, useState } from "react";
import { buildReviewGrowthSeries } from "../forecast/buildReviewGrowthSeries";

function getScorePolylinePoints(points, width, baselineY, topPadding, leftPadding, rightPadding) {
  const maxScore = 8;
  const innerWidth = width - leftPadding - rightPadding;
  const innerHeight = baselineY - topPadding;

  return points.map((point) => {
    const x = leftPadding + ((Math.min(point.percent, 100) / 100) * innerWidth);
    const y = topPadding + innerHeight - ((point.score / maxScore) * innerHeight);
    return { ...point, x, y };
  });
}

function getReviewShortLabel(label) {
  if (label === "Start") {
    return "Start";
  }

  const match = /^Review(\d+)$/.exec(label);
  return match ? `R${match[1]}` : label;
}

function applyLabelLanes(reviewMarkers) {
  const minDistance = 42;

  return reviewMarkers.map((marker, index) => {
    if (index === 0) {
      return {
        ...marker,
        lane: 0
      };
    }

    const previousMarker = reviewMarkers[index - 1];
    const lane = Math.abs(marker.x - previousMarker.x) < minDistance
      ? ((index % 2) === 0 ? 0 : 1)
      : 0;

    return {
      ...marker,
      lane
    };
  });
}

export function ReviewGrowthChartCard({ row, reviewColumns, effortWeights }) {
  const [startScoreOverride, setStartScoreOverride] = useState("0");
  const radioGroupName = useId();
  const width = 520;
  const height = 300;
  const leftPadding = 34;
  const rightPadding = 20;
  const topPadding = 24;
  const baselineY = height - 56;

  const { scorePoints, reviewMarkers } = useMemo(() => {
    const model = buildReviewGrowthSeries({
      categoryHours: row.categoryHours,
      reviewHours: row.reviewHours,
      reviewColumns,
      effortWeights,
      startScore: Number(startScoreOverride)
    });

    return {
      scorePoints: getScorePolylinePoints(model.scorePoints, width, baselineY, topPadding, leftPadding, rightPadding),
      reviewMarkers: applyLabelLanes(model.reviewMarkers.map((marker) => ({
        ...marker,
        x: leftPadding + ((Math.min(marker.percent, 100) / 100) * (width - leftPadding - rightPadding))
      })))
    };
  }, [effortWeights, reviewColumns, row.categoryHours, row.reviewHours, startScoreOverride]);

  const polyline = scorePoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <article className="card chart-card">
      <p className="section-label">Growth</p>
      <h2>{row.name}</h2>
      <p className="card-copy">
        Score points are placed on the shared 0-100% time axis using effort weights. Review markers only show when each review happens on that same axis.
      </p>

      <div className="chart-start-score">
        <span className="chart-start-score-label">Start score</span>
        <div className="chart-start-score-options">
          {[0, 1, 2, 3, 4, 5, 6].map((score) => (
            <label className="chart-start-score-option" key={`${row.id}-${score}`}>
              <input
                type="radio"
                name={radioGroupName}
                checked={Number(startScoreOverride) === score}
                onChange={() => setStartScoreOverride(String(score))}
              />
              <span>{score}</span>
            </label>
          ))}
        </div>
      </div>

      <svg className="growth-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Growth chart for ${row.name}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((score) => {
          const innerHeight = baselineY - topPadding;
          const y = topPadding + innerHeight - ((score / 8) * innerHeight);
          return (
            <g key={score}>
              <line x1={leftPadding} y1={y} x2={width - rightPadding} y2={y} className="chart-grid-line" />
              <text x={8} y={y + 4} className="chart-axis-label">{score}</text>
            </g>
          );
        })}

        <line x1={leftPadding} y1={topPadding - 10} x2={leftPadding} y2={baselineY + 10} className="chart-axis-line" />
        <line x1={leftPadding} y1={baselineY} x2={width - rightPadding} y2={baselineY} className="chart-axis-line" />

        {reviewMarkers.map((marker) => (
          <g key={`guide-${marker.label}`}>
            <line
              x1={marker.x}
              y1={baselineY}
              x2={marker.x}
              y2={topPadding - 4}
              className="chart-review-guide"
            />
            <text
              x={marker.x}
              y={baselineY + 18 + (marker.lane * 16)}
              textAnchor="middle"
              className="chart-percent-label"
            >
              {marker.percent.toFixed(2)}%
            </text>
            <text
              x={marker.x}
              y={baselineY + 38 + (marker.lane * 16)}
              textAnchor="middle"
              className="chart-review-label"
            >
              {getReviewShortLabel(marker.label)}
            </text>
          </g>
        ))}

        <polyline fill="none" points={polyline} className="chart-line" />

        {scorePoints.map((point, index) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" className="chart-point" />
            {index === scorePoints.length - 1 ? (
              <text x={point.x} y={point.y - 12} textAnchor="middle" className="chart-point-label">
                {point.score}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </article>
  );
}
