import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCategoryReviewHours, updateCategoryReviewHours } from "../api/categoryReviewHoursApi";
import { fetchEffortWeights } from "../api/effortWeightsApi";
import { ReviewGrowthChartCard } from "../components/ReviewGrowthChartCard";

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function formatHours(value) {
  return `${roundToTwo(Number(value) || 0).toFixed(2)}h`;
}

function formatPercent(value, total) {
  if (!total) {
    return "0.00%";
  }

  return `${roundToTwo((Number(value) / Number(total)) * 100).toFixed(2)}%`;
}

function getRowTotal(reviewHours, reviewColumns) {
  return roundToTwo(reviewColumns.reduce((sum, column) => sum + (Number(reviewHours[column]) || 0), 0));
}

function formatEditableValue(value) {
  return roundToTwo(Number(value) || 0).toFixed(2);
}

function toCents(value) {
  return Math.round((Number(value) || 0) * 100);
}

function fromCents(value) {
  return roundToTwo(value / 100);
}

function buildRows(rows, reviewColumns) {
  return (rows || []).map((row) => ({
    ...row,
    reviewHours: reviewColumns.reduce((accumulator, column) => {
      accumulator[column] = roundToTwo(Number(row.reviewHours?.[column] ?? 0));
      return accumulator;
    }, {}),
    lockedReviews: reviewColumns.reduce((accumulator, column) => {
      accumulator[column] = Boolean(row.lockedReviews?.[column] ?? false);
      return accumulator;
    }, {})
  }));
}

function redistributeRow(row, reviewColumns, editedColumn, nextValue) {
  const totalCents = toCents(row.categoryHours);
  const currentValues = reviewColumns.reduce((accumulator, column) => {
    accumulator[column] = toCents(row.reviewHours?.[column] ?? 0);
    return accumulator;
  }, {});

  const lockedReviews = row.lockedReviews || {};
  const lockedOtherColumns = reviewColumns.filter((column) => column !== editedColumn && lockedReviews[column]);
  const adjustableColumns = reviewColumns.filter((column) => column !== editedColumn && !lockedReviews[column]);
  const lockedOtherTotal = lockedOtherColumns.reduce((sum, column) => sum + currentValues[column], 0);
  const maxEditableCents = Math.max(0, totalCents - lockedOtherTotal);

  let editedCents = Math.min(Math.max(0, toCents(nextValue)), maxEditableCents);

  if (adjustableColumns.length === 0) {
    editedCents = maxEditableCents;
  }

  const nextReviewHours = {};
  for (const column of reviewColumns) {
    nextReviewHours[column] = currentValues[column];
  }

  nextReviewHours[editedColumn] = editedCents;

  const fixedTotal = lockedOtherTotal + editedCents;
  let remainingCents = Math.max(0, totalCents - fixedTotal);

  if (adjustableColumns.length > 0) {
    const baseShare = Math.floor(remainingCents / adjustableColumns.length);
    let extraCents = remainingCents - (baseShare * adjustableColumns.length);

    for (const column of adjustableColumns) {
      nextReviewHours[column] = baseShare + (extraCents > 0 ? 1 : 0);
      extraCents = Math.max(0, extraCents - 1);
    }
  }

  return {
    ...row,
    reviewHours: reviewColumns.reduce((accumulator, column) => {
      accumulator[column] = fromCents(nextReviewHours[column]);
      return accumulator;
    }, {})
  };
}

export function ReviewPlanPage() {
  const [rows, setRows] = useState([]);
  const [reviewColumns, setReviewColumns] = useState([]);
  const [effortWeights, setEffortWeights] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchCategoryReviewHours(),
      fetchEffortWeights()
    ])
      .then(([payload, effortWeightsPayload]) => {
        if (!active) {
          return;
        }

        setRows(buildRows(payload.rows || [], payload.reviewColumns || []));
        setReviewColumns(payload.reviewColumns || []);
        setEffortWeights(effortWeightsPayload.rows || []);
      })
      .catch(() => {
        if (active) {
          setError("Unable to load review hour plan.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (categoryId, column, nextValue) => {
    setError("");
    setStatus("");

    setRows((current) => current.map((row) => {
      if (row.id !== categoryId) {
        return row;
      }

      const parsedValue = Number(nextValue);
      const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0;
      return redistributeRow(row, reviewColumns, column, safeValue);
    }));
  };

  const handleLockToggle = (categoryId, column) => {
    setError("");
    setStatus("");

    setRows((current) => current.map((row) => {
      if (row.id !== categoryId) {
        return row;
      }

      return {
        ...row,
        lockedReviews: {
          ...row.lockedReviews,
          [column]: !row.lockedReviews?.[column]
        }
      };
    }));
  };

  const invalidCategoryIds = useMemo(() => {
    const invalidIds = new Set();

    for (const row of rows) {
      const values = reviewColumns.map((column) => Number(row.reviewHours?.[column] ?? 0));
      const hasInvalidValue = values.some((value) => !Number.isFinite(value) || value < 0);
      const total = roundToTwo(values.reduce((sum, value) => sum + value, 0));

      if (hasInvalidValue || Math.abs(total - Number(row.categoryHours)) > 0.01) {
        invalidIds.add(row.id);
      }
    }

    return invalidIds;
  }, [rows, reviewColumns]);

  const reviewTotals = useMemo(() => {
    return reviewColumns.reduce((accumulator, column) => {
      accumulator[column] = rows.reduce((sum, row) => {
        return sum + (Number(row.reviewHours?.[column]) || 0);
      }, 0);
      accumulator[column] = roundToTwo(accumulator[column]);
      return accumulator;
    }, {});
  }, [rows, reviewColumns]);

  const totalCategoryHours = useMemo(() => {
    return rows.reduce((sum, row) => sum + (Number(row.categoryHours) || 0), 0);
  }, [rows]);

  const handleSave = async () => {
    if (invalidCategoryIds.size > 0) {
      setError("Each category must have non-negative hours, and the row total must match Category Hours.");
      return;
    }

    try {
      await updateCategoryReviewHours(rows.map((row) => ({
        id: row.id,
        categoryHours: Number(row.categoryHours),
        reviewHours: reviewColumns.reduce((accumulator, column) => {
          accumulator[column] = Number(row.reviewHours?.[column] ?? 0);
          return accumulator;
        }, {}),
        lockedReviews: reviewColumns.reduce((accumulator, column) => {
          accumulator[column] = Boolean(row.lockedReviews?.[column] ?? false);
          return accumulator;
        }, {})
      })));
      setStatus("Changes saved.");
      setError("");
    } catch (saveError) {
      setStatus("");
      setError(saveError.message || "Unable to save review hour plan.");
    }
  };

  return (
    <>
      <section className="hero hero-table">
        <div>
          <p className="eyebrow">Review Planning</p>
          <h1>Category Review Hours</h1>
          <p className="subtitle">
            Set how each category&apos;s hours are distributed across Review1 to Review7. Zero is allowed, and each row total must match Category Hours. Locked reviews keep their value during redistribution.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" to="/">Back Home</Link>
        </div>
      </section>

      <section className="card">
        {error ? <p className="inline-error">{error}</p> : null}
        {status ? <p className="inline-success">{status}</p> : null}

        <div className="weights-toolbar">
          <div className={`weights-total ${invalidCategoryIds.size === 0 ? "is-valid" : "is-invalid"}`}>
            Valid Rows: {rows.length - invalidCategoryIds.size}/{rows.length}
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={handleSave}
            disabled={invalidCategoryIds.size > 0}
          >
            Save Plan
          </button>
        </div>

        <div className="table-wrap">
          <table className="calc-table">
            <thead>
              <tr>
                <th className="plan-category-column">Category</th>
                <th>Category Hours</th>
                {reviewColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>Row Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowTotal = getRowTotal(row.reviewHours || {}, reviewColumns);
                const isInvalid = invalidCategoryIds.has(row.id);

                return (
                  <tr className={isInvalid ? "invalid-row" : ""} key={row.id}>
                    <td className="plan-category-column">{row.name}</td>
                    <td>
                      <div className="metric-cell">
                        <strong>{formatHours(row.categoryHours)}</strong>
                        <span>{formatPercent(row.categoryHours, row.categoryHours)}</span>
                      </div>
                    </td>
                    {reviewColumns.map((column) => (
                      <td key={`${row.id}-${column}`}>
                        <div className="review-hour-cell">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formatEditableValue(row.reviewHours?.[column] ?? 0)}
                            onChange={(event) => handleChange(row.id, column, event.target.value)}
                          />
                          <span className="cell-note">
                            {formatHours(row.reviewHours?.[column] ?? 0)} • {formatPercent(row.reviewHours?.[column] ?? 0, row.categoryHours)}
                          </span>
                          <label className="lock-toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(row.lockedReviews?.[column])}
                              onChange={() => handleLockToggle(row.id, column)}
                            />
                            <span>Lock</span>
                          </label>
                        </div>
                      </td>
                    ))}
                    <td>
                      <div className="metric-cell">
                        <strong>{formatHours(rowTotal)}</strong>
                        <span>{formatPercent(rowTotal, row.categoryHours)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td className="plan-category-column">Total</td>
                <td>
                  <div className="metric-cell">
                    <strong>{formatHours(totalCategoryHours)}</strong>
                    <span>100.00%</span>
                  </div>
                </td>
                {reviewColumns.map((column) => (
                  <td key={`total-${column}`}>
                    <div className="metric-cell">
                      <strong>{formatHours(reviewTotals[column] ?? 0)}</strong>
                      <span>{formatPercent(reviewTotals[column] ?? 0, totalCategoryHours)}</span>
                    </div>
                  </td>
                ))}
                <td>
                  <div className="metric-cell">
                    <strong>{formatHours(reviewColumns.reduce((sum, column) => sum + (reviewTotals[column] ?? 0), 0))}</strong>
                    <span>100.00%</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="chart-grid">
        {rows.map((row) => (
          <ReviewGrowthChartCard
            key={row.id}
            row={row}
            reviewColumns={reviewColumns}
            effortWeights={effortWeights}
          />
        ))}
      </section>
    </>
  );
}
