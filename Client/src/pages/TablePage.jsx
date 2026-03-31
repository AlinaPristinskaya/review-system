import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProgress, sourceLabels, updateProgressCell } from "../api/progressApi";
import { fetchCategoryReviewHours } from "../api/categoryReviewHoursApi";
import { fetchEffortWeights } from "../api/effortWeightsApi";
import { buildDisplayColumns, calculateForecastValues } from "../forecast/calculateForecasts";

const NAME_COLUMN_WIDTH = 280;
const FORECAST_COLUMN_WIDTH = 76;
const VALUE_COLUMN_WIDTH = 92;

function buildRows(categories, sourceColumns, categoryReviewHoursRows, effortWeights) {
  const categoryReviewHoursMap = new Map(
    (categoryReviewHoursRows || []).map((row) => [Number(row.id), row])
  );

  return categories.flatMap((group) => {
    const categoryRow = {
      type: "category",
      id: group.id,
      label: group.name
    };

    const subcategoryRows = group.subcategories.map((subcategory) => ({
      type: "subcategory",
      id: subcategory.id,
      categoryId: group.id,
      label: subcategory.name,
      values: sourceColumns.reduce((accumulator, sourceCode) => {
        const sourceValue = subcategory.values?.[sourceCode];
        accumulator[sourceCode] = Number(sourceValue?.value ?? 0);
        return accumulator;
      }, {}),
      forecasts: calculateForecastValues({
        values: sourceColumns.reduce((accumulator, sourceCode) => {
          const sourceValue = subcategory.values?.[sourceCode];
          accumulator[sourceCode] = Number(sourceValue?.value ?? 0);
          return accumulator;
        }, {}),
        categoryReviewPercents: categoryReviewHoursMap.get(Number(group.id))?.reviewPercents,
        effortWeights
      })
    }));

    return [categoryRow, ...subcategoryRows];
  });
}

function getReviewStatusClass(columnCode, forecasts, value) {
  const reviewMatch = /^REVIEW(\d+)$/.exec(columnCode);
  if (!reviewMatch) {
    return "";
  }

  const forecastValue = Number(forecasts?.[`FORECAST${reviewMatch[1]}`]);
  const currentValue = Number(value);

  if (!Number.isFinite(forecastValue) || !Number.isFinite(currentValue)) {
    return "";
  }

  if (currentValue > forecastValue) {
    return "is-above-forecast";
  }

  if (currentValue === forecastValue) {
    return "is-on-forecast";
  }

  return "is-below-forecast";
}

export function TablePage() {
  const [rows, setRows] = useState([]);
  const [sourceColumns, setSourceColumns] = useState([]);
  const [displayColumns, setDisplayColumns] = useState([]);
  const [categoryReviewHoursRows, setCategoryReviewHoursRows] = useState([]);
  const [effortWeightsRows, setEffortWeightsRows] = useState([]);
  const [error, setError] = useState("");
  const saveTimers = useRef(new Map());
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const syncingScrollRef = useRef(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchProgress(),
      fetchCategoryReviewHours(),
      fetchEffortWeights()
    ])
      .then(([progressPayload, reviewHoursPayload, effortWeightsPayload]) => {
        if (!active) {
          return;
        }

        const nextSourceColumns = progressPayload.sourceColumns || [];
        setSourceColumns(nextSourceColumns);
        setDisplayColumns(buildDisplayColumns(nextSourceColumns));
        setCategoryReviewHoursRows(reviewHoursPayload.rows || []);
        setEffortWeightsRows(effortWeightsPayload.rows || []);
        setRows(buildRows(
          progressPayload.categories || [],
          nextSourceColumns,
          reviewHoursPayload.rows || [],
          effortWeightsPayload.rows || []
        ));
      })
      .catch(() => {
        if (active) {
          setError("Unable to load review table.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const syncScroll = (source, target) => {
    if (!source.current || !target.current || syncingScrollRef.current) {
      return;
    }

    syncingScrollRef.current = true;
    target.current.scrollLeft = source.current.scrollLeft;
    requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  };

  const scheduleSave = (subcategoryId, sourceCode, value) => {
    const timerKey = `${subcategoryId}:${sourceCode}`;
    clearTimeout(saveTimers.current.get(timerKey));
    saveTimers.current.set(timerKey, setTimeout(async () => {
      try {
        await updateProgressCell(subcategoryId, sourceCode, value);
      } catch (_error) {
        setError("Unable to save review data.");
      }
    }, 300));
  };

  const handleCellChange = (subcategoryId, sourceCode, value) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    setRows((current) => current.map((row) => {
      if (row.id !== subcategoryId || row.type !== "subcategory") {
        return row;
      }

      const nextValues = {
        ...row.values,
        [sourceCode]: numericValue
      };
      const categoryReviewHours = categoryReviewHoursRows.find(
        (categoryRow) => Number(categoryRow.id) === Number(row.categoryId)
      );

      return {
        ...row,
        values: nextValues,
        forecasts: calculateForecastValues({
          values: nextValues,
          categoryReviewPercents: categoryReviewHours?.reviewPercents,
          effortWeights: effortWeightsRows
        })
      };
    }));

    scheduleSave(subcategoryId, sourceCode, numericValue);
  };

  const renderColGroup = () => (
    <colgroup>
      <col style={{ width: `${NAME_COLUMN_WIDTH}px` }} />
      {displayColumns.map((columnCode) => (
        <col
          key={`col-${columnCode}`}
          style={{
            width: `${columnCode.startsWith("FORECAST") ? FORECAST_COLUMN_WIDTH : VALUE_COLUMN_WIDTH}px`
          }}
        />
      ))}
    </colgroup>
  );

  const renderHeaderCells = () => (
    <tr>
      <th className="table-name-column">Category / Subcategory</th>
      {displayColumns.map((columnCode) => (
        <th key={columnCode}>
          {columnCode.startsWith("FORECAST")
            ? `Forecast${columnCode.replace("FORECAST", "")}`
            : (sourceLabels[columnCode] || columnCode)}
        </th>
      ))}
    </tr>
  );

  return (
    <>
      <section className="hero hero-table">
        <div>
          <p className="eyebrow">Progress Matrix</p>
          <h1>Review Table</h1>
          <p className="subtitle">
            Edit values by subcategory. Category rows stay read-only.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" to="/">Back Home</Link>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-sticky-stack">
          <div className="card-header">
            <div>
              <p className="section-label">Component</p>
              <h2>Progress Matrix</h2>
            </div>
          </div>

          {error ? <p className="inline-error">{error}</p> : null}

          <div
            ref={headerScrollRef}
            className="table-head-wrap"
            onScroll={() => syncScroll(headerScrollRef, bodyScrollRef)}
          >
            <table className="calc-table calc-table-head">
              {renderColGroup()}
              <thead>{renderHeaderCells()}</thead>
            </table>
          </div>
        </div>

        <div
          ref={bodyScrollRef}
          className="table-body-wrap"
          onScroll={() => syncScroll(bodyScrollRef, headerScrollRef)}
        >
          <table className="calc-table calc-table-body">
            {renderColGroup()}
            <tbody>
              {rows.map((row) => {
                if (row.type === "category") {
                  return (
                    <tr className="category-row" key={row.id}>
                      <td className="category-cell table-name-column">{row.label}</td>
                      {displayColumns.map((columnCode) => (
                        <td className="category-placeholder" key={`${row.id}-${columnCode}`}>-</td>
                      ))}
                    </tr>
                  );
                }

                return (
                  <tr key={row.id}>
                    <td className="subcategory-cell table-name-column">
                      <p className="subcategory-text">{row.label}</p>
                    </td>
                    {displayColumns.map((columnCode) => {
                      if (columnCode.startsWith("FORECAST")) {
                        return (
                          <td key={`${row.id}-${columnCode}`} className="forecast-cell">
                            {row.forecasts?.[columnCode] ?? "-"}
                          </td>
                        );
                      }

                      return (
                        <td key={`${row.id}-${columnCode}`}>
                          <input
                            className={getReviewStatusClass(
                              columnCode,
                              row.forecasts,
                              row.values[columnCode]
                            )}
                            type="number"
                            step="1"
                            value={row.values[columnCode] ?? 0}
                            onChange={(event) => handleCellChange(row.id, columnCode, event.target.value)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
