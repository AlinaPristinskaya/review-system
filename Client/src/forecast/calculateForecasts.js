function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function getReviewNumber(sourceCode) {
  // Из строки вида REVIEW3 вытаскиваем число 3.
  const match = /^REVIEW(\d+)$/.exec(sourceCode);
  return match ? Number(match[1]) : null;
}

function getEffortWeight(weightMap, from, to) {
  // Вес перехода храним по ключу "from:to", например "4:5".
  return Number(weightMap.get(`${from}:${to}`) ?? 0);
}

function getStartingScore(values, reviewNumber, previousForecasts) {
  if (reviewNumber === 1) {
    // Для первого прогноза стартуем от SPA.
    return Number(values.SPA ?? 0);
  }

  const previousReviewCode = `REVIEW${reviewNumber - 1}`;
  const previousActual = Number(values[previousReviewCode]);
  const previousForecast = Number(previousForecasts[`FORECAST${reviewNumber - 1}`] ?? values.SPA ?? 0);

  if (Number.isFinite(previousActual)) {
    // Прогноз не должен уменьшаться.
    // Поэтому если фактическое review ниже предыдущего прогноза,
    // всё равно стартуем с предыдущего прогноза.
    return Math.max(previousActual, previousForecast);
  }

  // Если фактического review нет, продолжаем от прошлого прогноза.
  return previousForecast;
}

function calculateSingleForecast(startScore, availableShare, weightMap) {
  // nextScore — текущая прогнозная оценка, которую будем повышать шаг за шагом.
  let nextScore = Number(startScore);

  // remainingShare — сколько "ресурса" ещё осталось на этом review.
  // Здесь это доля времени категории, которую можно потратить на рост оценки.
  let remainingShare = Number(availableShare);

  while (nextScore < 8) {
    // Смотрим, сколько стоит переход на следующий балл.
    // Например, из 4 в 5.
    const stepWeight = getEffortWeight(weightMap, nextScore, nextScore + 1);

    // Если переход не описан в таблице весов
    // или оставшегося ресурса недостаточно,
    // дальше расти уже не можем.
    if (!stepWeight || remainingShare + 0.0001 < stepWeight) {
      break;
    }

    // Если ресурса хватает, "покупаем" следующий балл:
    // вычитаем стоимость перехода из оставшегося ресурса...
    remainingShare = roundToTwo(remainingShare - stepWeight);

    // ...и увеличиваем прогнозную оценку на 1.
    nextScore += 1;
  }

  return {
    // Итоговый прогноз на это review.
    forecast: nextScore,

    // Неиспользованный остаток переносим в следующее review.
    carryover: roundToTwo(Math.max(0, remainingShare))
  };
}

export function buildDisplayColumns(sourceColumns) {
  const columns = [];

  for (const sourceCode of sourceColumns) {
    if (sourceCode === "SPA") {
      // SPA показываем как есть.
      columns.push("SPA");
      continue;
    }

    const reviewNumber = getReviewNumber(sourceCode);
    if (reviewNumber) {
      // Перед каждым ReviewN вставляем ForecastN.
      columns.push(`FORECAST${reviewNumber}`);
      columns.push(sourceCode);
      continue;
    }

    columns.push(sourceCode);
  }

  return columns;
}

export function calculateForecastValues({
  values,
  categoryReviewPercents,
  effortWeights
}) {
  const forecasts = {};

  // Превращаем массив весов в Map для быстрого доступа по ключу "from:to".
  const weightMap = new Map(
    (effortWeights || []).map((row) => [`${row.from}:${row.to}`, Number(row.effortWeight)])
  );

  // Остаток неиспользованной доли времени переносится на следующее review.
  let carryover = 0;

  for (let reviewNumber = 1; reviewNumber <= 7; reviewNumber += 1) {
    // Определяем, с какой оценки стартуем на этом review.
    const startScore = getStartingScore(values, reviewNumber, forecasts);

    const reviewKey = `Review${reviewNumber}`;

    // Доступный ресурс на review берём как долю времени внутри самой подкатегории.
    // Если у категории Review3 = 20%, это значит:
    // для любой подкатегории к этому моменту доступно 20% её собственного бюджета.
    const reviewShare = roundToTwo(Number(categoryReviewPercents?.[reviewKey] ?? 0));
    const availableShare = roundToTwo(carryover + reviewShare);

    // Считаем прогноз для конкретного review.
    const result = calculateSingleForecast(startScore, availableShare, weightMap);

    // Сохраняем прогноз как FORECAST1, FORECAST2 и так далее.
    forecasts[`FORECAST${reviewNumber}`] = result.forecast;

    // Остаток переносим дальше по цепочке review.
    carryover = result.carryover;
  }

  return forecasts;
}
