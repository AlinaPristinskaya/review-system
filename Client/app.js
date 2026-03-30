const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const API_BASE_URL = window.location.port === "3000"
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : "";

let rows = [];
let sourceColumns = [];
const saveTimers = new Map();
const sourceLabels = {
  SPA: "SPA",
  REVIEW1: "Review1",
  REVIEW2: "Review2",
  REVIEW3: "Review3",
  REVIEW4: "Review4",
  REVIEW5: "Review5",
  REVIEW6: "Review6",
  REVIEW7: "Review7"
};

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildRows(categories) {
  return categories.flatMap((group) => {
    const categoryRow = {
      type: "category",
      id: group.id,
      label: group.name
    };

    const subcategoryRows = group.subcategories.map((subcategory) => ({
      type: "subcategory",
      id: subcategory.id,
      label: subcategory.name,
      values: sourceColumns.reduce((accumulator, sourceCode) => {
        const sourceValue = subcategory.values?.[sourceCode];
        accumulator[sourceCode] = Number(sourceValue?.value ?? 0);
        return accumulator;
      }, {})
    }));

    return [categoryRow, ...subcategoryRows];
  });
}

function buildTableHead() {
  tableHead.innerHTML = `
    <tr>
      <th>Category / Subcategory</th>
      ${sourceColumns.map((sourceCode) => `<th>${escapeHtml(sourceLabels[sourceCode] || sourceCode)}</th>`).join("")}
    </tr>
  `;
}

function renderTable() {
  tableBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    if (row.type === "category") {
      tr.className = "category-row";
      tr.innerHTML = `
        <td class="category-cell row-label">${escapeHtml(row.label)}</td>
        ${sourceColumns.map(() => '<td class="category-placeholder">-</td>').join("")}
      `;
    } else {
      tr.innerHTML = `
        <td class="subcategory-cell row-label">
          <p class="subcategory-text">${escapeHtml(row.label)}</p>
        </td>
        ${sourceColumns.map((sourceCode) => `
          <td>
            <input
              type="number"
              step="0.01"
              value="${row.values[sourceCode] ?? 0}"
              data-source-code="${sourceCode}"
              data-subcategory-id="${row.id}"
            >
          </td>
        `).join("")}
      `;
    }

    tableBody.appendChild(tr);
  });
}

async function persistCell(subcategoryId, sourceCode, value) {
  if (!subcategoryId || !sourceCode) {
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/api/progress/subcategories/${encodeURIComponent(subcategoryId)}/sources/${sourceCode}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        value,
        factor: 1
      })
    });
  } catch (error) {
    console.error("Failed to persist cell", error);
  }
}

tableBody.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const subcategoryId = target.dataset.subcategoryId;
  const sourceCode = target.dataset.sourceCode;
  const value = Number(target.value);

  if (!subcategoryId || !sourceCode || !Number.isFinite(value)) {
    return;
  }

  const row = rows.find((item) => item.id === subcategoryId);

  if (!row || row.type !== "subcategory") {
    return;
  }

  row.values[sourceCode] = value;

  const timerKey = `${subcategoryId}:${sourceCode}`;
  clearTimeout(saveTimers.get(timerKey));
  saveTimers.set(timerKey, setTimeout(() => {
    persistCell(subcategoryId, sourceCode, value);
  }, 300));
});

async function initializeTable() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/progress`);
    const payload = await response.json();
    sourceColumns = payload.sourceColumns || [];
    rows = buildRows(payload.categories || []);
    buildTableHead();
    renderTable();
  } catch (error) {
    tableHead.innerHTML = `
      <tr>
        <th>Category / Subcategory</th>
      </tr>
    `;
    tableBody.innerHTML = `
      <tr>
        <td>Unable to load category data.</td>
      </tr>
    `;
    console.error(error);
  }
}

initializeTable();
