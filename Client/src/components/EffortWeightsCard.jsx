import React, { useEffect, useState } from "react";
import { fetchEffortWeights, updateEffortWeights } from "../api/effortWeightsApi";

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

export function EffortWeightsCard() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;

    fetchEffortWeights()
      .then((payload) => {
        if (active) {
          setRows(payload.rows || []);
        }
      })
      .catch(() => {
        if (active) {
          setError("Unable to load transition complexity.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (index, nextValue) => {
    setStatus("");
    setError("");
    setRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) {
        return row;
      }

      return {
        ...row,
        effortWeight: nextValue
      };
    }));
  };

  const total = roundToTwo(rows.reduce((sum, row) => sum + (Number(row.effortWeight) || 0), 0));
  const hasNegativeValues = rows.some((row) => Number(row.effortWeight) < 0);
  const isValidTotal = Math.abs(total - 1) < 0.0001;
  const canSave = isValidTotal && !hasNegativeValues;

  const handleSave = async () => {
    if (hasNegativeValues) {
      setError("Negative values are not allowed.");
      return;
    }

    if (!isValidTotal) {
      setError("The total EffortWeight must be equal to 1.");
      return;
    }

    try {
      await updateEffortWeights(rows.map((row) => ({
        from: row.from,
        to: row.to,
        effortWeight: Number(row.effortWeight)
      })));
      setStatus("Changes saved.");
      setError("");
    } catch (saveError) {
      setStatus("");
      setError(saveError.message || "Unable to save transition complexity.");
    }
  };

  return (
    <article className="card feature-card">
      <p className="section-label">Main</p>
      <h2>Transition Complexity</h2>
      <p className="card-copy">
        Change the effort weight ratio for moving from one rating to the next.
      </p>

      {error ? <p className="inline-error">{error}</p> : null}
      {status ? <p className="inline-success">{status}</p> : null}

      <div className="weights-toolbar">
        <div className={`weights-total ${isValidTotal ? "is-valid" : "is-invalid"}`}>
          Total: {total.toFixed(2)}
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={handleSave}
          disabled={!canSave}
        >
          Save Weights
        </button>
      </div>

      <div className="table-wrap">
        <table className="mini-table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>EffortWeight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.from}-${row.to}`}>
                <td>{row.from}</td>
                <td>{row.to}</td>
                <td>
                  <input
                    className="weight-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.effortWeight}
                    onChange={(event) => handleChange(index, event.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
