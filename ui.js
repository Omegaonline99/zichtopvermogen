const STORAGE_KEY = "zv_assets_v1";
const DEMO_CLASS_TOTALS = {
  aandelen: 52000,
  bonds: 8000,
  "commodity’s": 6000,
  vastgoed: 40000,
  crypto: 18500,
};
const DEMO_ASSET_COUNT = 12;

const formatEuro = (value) =>
  `€ ${Number(value || 0).toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const formatPercentage = (value) => `${value.toFixed(1).replace(".", ",")}%`;

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

const handleAssetForm = () => {
  const form = document.getElementById("asset-form");
  const assetClassSelect = document.getElementById("asset-class");
  const successNotice = document.getElementById("success-notice");

  if (!form || !assetClassSelect) return;

  assetClassSelect.addEventListener("change", toggleClassFields);
  toggleClassFields();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const assetClass = normalizeAssetClass(formData.get("asset_class"));
    const value = Number(formData.get("value") || 0);

    if (!name || !assetClass || Number.isNaN(value) || value <= 0) {
      if (successNotice) {
        successNotice.style.display = "block";
        successNotice.textContent = "Vul minimaal naam, asset class en een geldige waarde in.";
      }
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

    if (successNotice) {
      successNotice.style.display = "block";
      successNotice.textContent = "Asset toegevoegd en lokaal opgeslagen. Bekijk het dashboard voor de update.";
    }
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

  const countElement = document.getElementById("asset-count");
  if (countElement) countElement.textContent = String(DEMO_ASSET_COUNT + assets.length);

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

  const tableBody = document.getElementById("recent-assets-body");
  if (!tableBody) return;

  if (!assets.length) return;

  const sortedAssets = [...assets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  sortedAssets.forEach((asset) => {
    const row = document.createElement("tr");
    const date = new Date(asset.createdAt);
    const formattedDate = Number.isNaN(date.getTime())
      ? "Onbekend"
      : date.toLocaleDateString("nl-NL");

    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${asset.name}</td>
      <td>${mapAssetClassLabel(normalizeAssetClass(asset.assetClass))}</td>
      <td>${formatEuro(asset.value)}</td>
      <td><span class="status-chip">Nieuw</span></td>
    `;
    tableBody.prepend(row);
  });
};

handleAssetForm();
renderDashboard();
