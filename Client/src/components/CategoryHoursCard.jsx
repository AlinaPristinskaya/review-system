import React, { useEffect, useState } from "react";
import { fetchCategoryHours, updateCategoryHours } from "../api/categoryHoursApi";

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

export function CategoryHoursCard() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;

    fetchCategoryHours()
      .then((payload) => {
        if (active) {
          setRows(payload.rows || []);
        }
      })
      .catch(() => {
        if (active) {
          setError("Unable to load category hours.");
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
        allocatedHours: nextValue
      };
    }));
  };

  const hasInvalidRow = rows.some((row) => {
    const value = Number(row.allocatedHours);
    return !Number.isInteger(value) || value <= 0;
  });

  const totalHours = roundToTwo(rows.reduce((sum, row) => sum + (Number(row.allocatedHours) || 0), 0));

  const handleSave = async () => {
    if (hasInvalidRow) {
      setError("Hours must be positive whole numbers.");
      return;
    }

    try {
      await updateCategoryHours(rows.map((row) => ({
        id: row.id,
        allocatedHours: Number(row.allocatedHours)
      })));
      setStatus("Changes saved.");
      setError("");
    } catch (saveError) {
      setStatus("");
      setError(saveError.message || "Unable to save category hours.");
    }
  };

  return (
    <article className="card feature-card">
      <p className="section-label">Main</p>
      <h2>Category Hours</h2>
      <p className="card-copy">
        View and update the planned hours for each category. Only positive whole numbers are allowed.
      </p>

      {error ? <p className="inline-error">{error}</p> : null}
      {status ? <p className="inline-success">{status}</p> : null}

      <div className="weights-toolbar">
        <div className="weights-total is-valid">
          Total Hours: {Math.round(totalHours)}
        </div>
        <div className="weights-total is-valid">
          Categories: {rows.length}
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={handleSave}
          disabled={hasInvalidRow}
        >
          Save Hours
        </button>
      </div>

      <div className="table-wrap">
        <table className="mini-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>
                  <input
                    className="weight-input"
                    type="number"
                    step="1"
                    min="1"
                    value={row.allocatedHours}
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
