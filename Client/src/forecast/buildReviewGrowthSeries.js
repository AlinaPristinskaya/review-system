function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function getEffortWeightMap(effortWeights) {
  return new Map(
    (effortWeights || []).map((row) => [`${row.from}:${row.to}`, Number(row.effortWeight)])
  );
}

export function buildReviewGrowthSeries({
  categoryHours,
  reviewHours,
  reviewColumns,
  effortWeights,
  startScore: rawStartScore = 0
}) {
  const startScore = Math.max(0, Math.min(6, Number(rawStartScore) || 0));
  const weightMap = getEffortWeightMap(effortWeights);
  const scorePoints = [{ label: "Start", score: startScore, percent: 0 }];
  let cumulativeScorePercent = 0;

  for (let score = startScore; score < 8; score += 1) {
    const stepWeight = Number(weightMap.get(`${score}:${score + 1}`) ?? 0);
    cumulativeScorePercent = roundToTwo(cumulativeScorePercent + (stepWeight * 100));

    scorePoints.push({
      label: `Score ${score + 1}`,
      score: score + 1,
      percent: cumulativeScorePercent
    });
  }

  // Вертикали review — это накопленный процент времени по категории.
  const reviewMarkers = [];
  let cumulativeReviewPercent = 0;

  for (const column of reviewColumns) {
    const reviewPercent = categoryHours
      ? roundToTwo((Number(reviewHours?.[column] ?? 0) / Number(categoryHours)) * 100)
      : 0;

    cumulativeReviewPercent = roundToTwo(cumulativeReviewPercent + reviewPercent);

    reviewMarkers.push({
      label: column,
      percent: cumulativeReviewPercent
    });
  }

  return {
    scorePoints,
    reviewMarkers
  };
}
