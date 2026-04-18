const STORAGE_KEY = "zv_assets_v1";
const DEMO_CLASS_TOTALS = {
  aandelen: 52000,
  bonds: 8000,
  "commodity’s": 6000,
  vastgoed: 40000,
  crypto: 18500,
};
const DEMO_ASSET_COUNT = 12;
const DEMO_POSITIONS = [
  { name: "VWRL ETF", assetClass: "aandelen", value: 12500 },
  { name: "Appartement Rotterdam", assetClass: "vastgoed", value: 40000 },
  { name: "Bitcoin", assetClass: "crypto", value: 9200 },
  { name: "NL Staatsobligatie 2031", assetClass: "bonds", value: 6800 },
  { name: "Goud ETC", assetClass: "commodity’s", value: 2250 },
];

const formatEuro = (value) =>
  `€ ${Number(value || 0).toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const formatPercentage = (value) => `${value.toFixed(1).replace(".", ",")}%`;

const showMessage = (element, text, type) => {
  if (!element) return;
  element.textContent = text;
  element.classList.remove("success", "error");
  if (type) element.classList.add(type);
  element.style.display = "block";
};

const clearMessage = (element) => {
  if (!element) return;
  element.textContent = "";
  element.classList.remove("success", "error");
  element.style.display = "none";
};

const getAssetsFromStorage = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveAssetsToStorage = (assets) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
};

const normalizeAssetClass = (value) => (value || "").trim().toLowerCase();

const mapAssetClassLabel = (assetClass) => {
  if (assetClass === "aandelen") return "Aandelen";
  if (assetClass === "bonds") return "Bonds";
  if (assetClass === "commodity’s") return "Commodity’s";
  if (assetClass === "vastgoed") return "Vastgoed";
  if (assetClass === "crypto") return "Crypto";
  return "Onbekend";
};

const toggleClassFields = () => {
  const assetClassSelect = document.getElementById("asset-class");
  const classSections = document.querySelectorAll(".class-fields");

  if (!assetClassSelect || !classSections.length) return;

  const selectedClass = assetClassSelect.value;
  classSections.forEach((section) => {
    const isActive = section.dataset.class === selectedClass;
    section.classList.toggle("active", isActive);
  });
};

const validateAssetForm = ({ name, assetClass, value }) => {
  if (!name) return "Naam bezit is verplicht.";
  if (!assetClass) return "Asset class is verplicht.";
  if (!Number.isFinite(value) || value <= 0) return "Waarde moet een geldig positief getal zijn.";
  return "";
};

const handleAssetForm = () => {
  const form = document.getElementById("asset-form");
  const assetClassSelect = document.getElementById("asset-class");
  const formMessage = document.getElementById("form-message");

  if (!form || !assetClassSelect) return;

  assetClassSelect.addEventListener("change", toggleClassFields);
  toggleClassFields();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearMessage(formMessage);

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const assetClass = normalizeAssetClass(formData.get("asset_class"));
    const value = Number(formData.get("value") || 0);

    const validationError = validateAssetForm({ name, assetClass, value });
    if (validationError) {
      showMessage(formMessage, validationError, "error");
      return;
    }

    const asset = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      name,
      assetClass,
      value,
      notes: String(formData.get("notes") || "").trim(),
      details: {
        stock_ticker: formData.get("stock_ticker") || "",
        stock_sector: formData.get("stock_sector") || "",
        stock_region: formData.get("stock_region") || "",
        bond_coupon: formData.get("bond_coupon") || "",
        bond_maturity: formData.get("bond_maturity") || "",
        commodity_type: formData.get("commodity_type") || "",
        commodity_exposure: formData.get("commodity_exposure") || "",
        realestate_location: formData.get("realestate_location") || "",
        realestate_value: formData.get("realestate_value") || "",
        realestate_rent: formData.get("realestate_rent") || "",
        crypto_token: formData.get("crypto_token") || "",
        crypto_network: formData.get("crypto_network") || "",
        crypto_storage: formData.get("crypto_storage") || "",
      },
    };

    const assets = getAssetsFromStorage();
    assets.push(asset);
    saveAssetsToStorage(assets);

    form.reset();
    toggleClassFields();
    showMessage(formMessage, "Asset succesvol toegevoegd en lokaal opgeslagen.", "success");
  });
};

const renderAllocation = (classTotals, totalVermogen) => {
  const selectors = {
    aandelen: ["pct-aandelen", "bar-aandelen", "val-aandelen"],
    vastgoed: ["pct-vastgoed", "bar-vastgoed", "val-vastgoed"],
    crypto: ["pct-crypto", "bar-crypto", "val-crypto"],
    bonds: ["pct-bonds", "bar-bonds", "val-bonds"],
    "commodity’s": ["pct-commodity", "bar-commodity", "val-commodity"],
  };

  Object.entries(selectors).forEach(([assetClass, [pctId, barId, valId]]) => {
    const value = classTotals[assetClass] || 0;
    const percentage = totalVermogen > 0 ? (value / totalVermogen) * 100 : 0;

    const pctElement = document.getElementById(pctId);
    const barElement = document.getElementById(barId);
    const valElement = document.getElementById(valId);

    if (pctElement) pctElement.textContent = formatPercentage(percentage);
    if (barElement) barElement.style.width = `${percentage}%`;
    if (valElement) valElement.textContent = formatEuro(value);
  });
};


const renderClassSummaryCards = (classTotals, totalVermogen) => {
  const container = document.getElementById("class-summary-grid");
  if (!container) return;

  container.innerHTML = "";

  Object.entries(classTotals).forEach(([assetClass, value]) => {
    const percentage = totalVermogen > 0 ? (value / totalVermogen) * 100 : 0;
    const card = document.createElement("article");
    card.className = "class-summary-card";
    card.innerHTML = `
      <h4>${mapAssetClassLabel(assetClass)}</h4>
      <div class="amount">${formatEuro(value)}</div>
      <div class="percentage">${formatPercentage(percentage)} van totaal</div>
    `;
    container.appendChild(card);
  });
};

const getDiversificationInfo = (classTotals, totalVermogen) => {
  const percentages = Object.values(classTotals)
    .map((value) => (totalVermogen > 0 ? (value / totalVermogen) * 100 : 0))
    .sort((a, b) => b - a);

  const biggestShare = percentages[0] || 0;

  if (biggestShare <= 40) {
    return {
      label: "Goed gespreid",
      type: "good",
      note: "Geen enkele asset class domineert sterk; de verdeling is relatief gebalanceerd.",
    };
  }

  if (biggestShare <= 60) {
    return {
      label: "Redelijk geconcentreerd",
      type: "medium",
      note: "Eén class weegt duidelijk zwaarder. Extra spreiding kan het risico verlagen.",
    };
  }

  return {
    label: "Sterk geconcentreerd",
    type: "high",
    note: "Een groot deel van het vermogen zit in één class. Spreidingsrisico is verhoogd.",
  };
};

const renderInsights = (assets, classTotals, totalVermogen) => {
  const allPositions = [...DEMO_POSITIONS, ...assets];
  const largestElement = document.getElementById("largest-position");
  const smallestElement = document.getElementById("smallest-position");
  const mostCommonElement = document.getElementById("most-common-class");

  if (!largestElement || !smallestElement || !mostCommonElement) return;

  if (!allPositions.length) {
    largestElement.textContent = "-";
    smallestElement.textContent = "-";
    mostCommonElement.textContent = "-";
    return;
  }

  const sortedByValue = [...allPositions].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
  const largest = sortedByValue[0];
  const smallest = sortedByValue[sortedByValue.length - 1];

  largestElement.textContent = `${largest.name} (${formatEuro(largest.value)})`;
  smallestElement.textContent = `${smallest.name} (${formatEuro(smallest.value)})`;

  const classCounts = allPositions.reduce((acc, item) => {
    const key = normalizeAssetClass(item.assetClass);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const mostCommonEntry = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0];
  mostCommonElement.textContent = mostCommonEntry
    ? `${mapAssetClassLabel(mostCommonEntry[0])} (${mostCommonEntry[1]} posities)`
    : "-";

  const indicator = document.getElementById("diversification-indicator");
  const note = document.getElementById("diversification-note");
  if (!indicator || !note) return;

  const diversification = getDiversificationInfo(classTotals, totalVermogen);
  indicator.textContent = diversification.label;
  indicator.classList.remove("good", "medium", "high", "neutral");
  indicator.classList.add(diversification.type);
  note.textContent = diversification.note;
};

const renderUserAssetsTable = (assets) => {
  const tableBody = document.getElementById("user-assets-body");
  const emptyState = document.getElementById("assets-empty-state");
  if (!tableBody || !emptyState) return;

  tableBody.innerHTML = "";

  if (!assets.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  const sortedAssets = [...assets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  sortedAssets.forEach((asset) => {
    const row = document.createElement("tr");
    const date = new Date(asset.createdAt);
    const formattedDate = Number.isNaN(date.getTime()) ? "Onbekend" : date.toLocaleDateString("nl-NL");

    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${asset.name}</td>
      <td>${mapAssetClassLabel(normalizeAssetClass(asset.assetClass))}</td>
      <td>${formatEuro(asset.value)}</td>
      <td><button class="button danger small" data-delete-id="${asset.id}">Verwijderen</button></td>
    `;

    tableBody.appendChild(row);
  });
};

const handleDeleteAsset = (assetId) => {
  const assets = getAssetsFromStorage();
  const updatedAssets = assets.filter((asset) => String(asset.id) !== String(assetId));
  saveAssetsToStorage(updatedAssets);
  renderDashboard();

  const dashboardMessage = document.getElementById("dashboard-message");
  showMessage(dashboardMessage, "Asset verwijderd uit lokale opslag.", "success");
};

const attachDashboardEvents = () => {
  const tableBody = document.getElementById("user-assets-body");
  if (!tableBody) return;

  tableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const deleteId = target.getAttribute("data-delete-id");
    if (!deleteId) return;
    handleDeleteAsset(deleteId);
  });
};

const renderDashboard = () => {
  const dashboardPage = document.getElementById("dashboard-page");
  if (!dashboardPage) return;

  const assets = getAssetsFromStorage();
  const classTotals = { ...DEMO_CLASS_TOTALS };

  assets.forEach((asset) => {
    const normalizedClass = normalizeAssetClass(asset.assetClass);
    if (!Object.prototype.hasOwnProperty.call(classTotals, normalizedClass)) return;
    classTotals[normalizedClass] += Number(asset.value) || 0;
  });

  const totalVermogen = Object.values(classTotals).reduce((sum, current) => sum + current, 0);
  const totalElement = document.getElementById("total-vermogen");
  if (totalElement) totalElement.textContent = formatEuro(totalVermogen);

  const totalCountElement = document.getElementById("asset-count");
  if (totalCountElement) totalCountElement.textContent = String(DEMO_ASSET_COUNT + assets.length);

  const userCountElement = document.getElementById("user-asset-count");
  if (userCountElement) userCountElement.textContent = String(assets.length);

  renderAllocation(classTotals, totalVermogen);
  renderClassSummaryCards(classTotals, totalVermogen);
  renderInsights(assets, classTotals, totalVermogen);
  renderUserAssetsTable(assets);
};

handleAssetForm();
renderDashboard();
attachDashboardEvents();
