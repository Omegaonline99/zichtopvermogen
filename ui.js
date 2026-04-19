const LEGACY_STORAGE_KEY = "zv_assets_v1";
const USERS_KEY = "zv_users_v1";
const ACTIVE_USER_KEY = "zv_active_user_v1";
const ASSETS_BY_USER_KEY = "zv_assets_by_user_v1";

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

const uiState = {
  filterClass: "all",
  sortBy: "recent",
};

const formatEuro = (value) =>
  `€ ${Number(value || 0).toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const formatPercentage = (value) => `${value.toFixed(1).replace(".", ",")}%`;
const normalizeAssetClass = (value) => (value || "").trim().toLowerCase();

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

const readJSON = (key, fallback) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const saveJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getUsers = () => {
  const users = readJSON(USERS_KEY, []);
  return Array.isArray(users) ? users : [];
};

const saveUsers = (users) => saveJSON(USERS_KEY, users);
const getActiveUser = () => localStorage.getItem(ACTIVE_USER_KEY) || "";
const setActiveUser = (name) => localStorage.setItem(ACTIVE_USER_KEY, name);

const getAssetsByUser = () => {
  const assetsByUser = readJSON(ASSETS_BY_USER_KEY, {});
  return assetsByUser && typeof assetsByUser === "object" ? assetsByUser : {};
};

const saveAssetsByUser = (assetsByUser) => saveJSON(ASSETS_BY_USER_KEY, assetsByUser);

const getAssetsForUser = (userName) => {
  if (!userName) return [];
  const assetsByUser = getAssetsByUser();
  const list = assetsByUser[userName];
  return Array.isArray(list) ? list : [];
};

const saveAssetsForUser = (userName, assets) => {
  if (!userName) return;
  const assetsByUser = getAssetsByUser();
  assetsByUser[userName] = assets;
  saveAssetsByUser(assetsByUser);
};

const migrateLegacyAssets = () => {
  const hasNewData = Object.keys(getAssetsByUser()).length > 0;
  if (hasNewData) return;

  const legacyAssets = readJSON(LEGACY_STORAGE_KEY, []);
  if (!Array.isArray(legacyAssets) || !legacyAssets.length) return;

  const defaultUser = "Demo gebruiker";
  const users = getUsers();
  if (!users.includes(defaultUser)) {
    users.push(defaultUser);
    saveUsers(users);
  }

  saveAssetsForUser(defaultUser, legacyAssets);
  if (!getActiveUser()) setActiveUser(defaultUser);
};

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

  classSections.forEach((section) => {
    section.classList.toggle("active", section.dataset.class === assetClassSelect.value);
  });
};

const validateAssetForm = ({ name, assetClass, value }) => {
  if (!name) return "Naam bezit is verplicht.";
  if (!assetClass) return "Asset class is verplicht.";
  if (!Number.isFinite(value) || value <= 0) return "Waarde moet een geldig positief getal zijn.";
  return "";
};

const parseNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const calculatePnL = (asset) => {
  const current = parseNumber(asset.value);
  const purchase = parseNumber(asset.purchaseValue);
  if (current === null || purchase === null || purchase <= 0) {
    return { available: false, euro: null, percent: null };
  }

  const euro = current - purchase;
  const percent = (euro / purchase) * 100;
  return { available: true, euro, percent };
};

const formatPnL = (pnl) => {
  if (!pnl.available) return { text: "Niet beschikbaar", className: "pnl-neutral" };
  const sign = pnl.euro > 0 ? "+" : "";
  const text = `${sign}${formatEuro(pnl.euro)} (${sign}${formatPercentage(pnl.percent)})`;
  const className = pnl.euro > 0 ? "pnl-positive" : pnl.euro < 0 ? "pnl-negative" : "pnl-neutral";
  return { text, className };
};


const refreshUserUI = () => {
  const users = getUsers();
  const activeUser = getActiveUser();
  const userSelect = document.getElementById("user-select");
  const activeUserName = document.getElementById("active-user-name");
  const startScreen = document.getElementById("user-start-screen");
  const portfolioContent = document.getElementById("portfolio-content") || document.getElementById("asset-form-section");

  if (userSelect) {
    userSelect.innerHTML = "";
    users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user;
      option.textContent = user;
      option.selected = user === activeUser;
      userSelect.appendChild(option);
    });
  }

  if (activeUserName) activeUserName.textContent = activeUser || "Geen actieve gebruiker";
  if (startScreen) startScreen.style.display = activeUser ? "none" : "block";
  if (portfolioContent) portfolioContent.style.display = activeUser ? "block" : "none";
};

const setupUserControls = () => {
  const switchButton = document.getElementById("switch-user-button");
  const createButton = document.getElementById("create-user-button");
  const userSelect = document.getElementById("user-select");
  const newUserInput = document.getElementById("new-user-name");
  const message = document.getElementById("user-message");

  if (!switchButton || !createButton || !userSelect || !newUserInput) return;

  switchButton.addEventListener("click", () => {
    const selectedUser = userSelect.value;
    if (!selectedUser) return showMessage(message, "Kies eerst een gebruiker om te wisselen.", "error");

    setActiveUser(selectedUser);
    showMessage(message, `Actieve gebruiker gewijzigd naar ${selectedUser}.`, "success");
    refreshUserUI();
    renderDashboard();
  });

  createButton.addEventListener("click", () => {
    const newUserName = String(newUserInput.value || "").trim();
    if (!newUserName) return showMessage(message, "Voer een gebruikersnaam in.", "error");

    const users = getUsers();
    if (!users.includes(newUserName)) {
      users.push(newUserName);
      saveUsers(users);
      saveAssetsForUser(newUserName, []);
    }

    setActiveUser(newUserName);
    newUserInput.value = "";
    showMessage(message, `Gebruiker ${newUserName} is actief.`, "success");
    refreshUserUI();
    renderDashboard();
  });
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

    const activeUser = getActiveUser();
    if (!activeUser) return showMessage(formMessage, "Kies eerst een actieve gebruiker.", "error");

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const assetClass = normalizeAssetClass(formData.get("asset_class"));
    const value = Number(formData.get("value") || 0);

    const validationError = validateAssetForm({ name, assetClass, value });
    if (validationError) return showMessage(formMessage, validationError, "error");

    const asset = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      name,
      assetClass,
      value,
      purchaseValue: Number(formData.get("purchase_value") || 0) || null,
      acquiredAt: String(formData.get("acquired_at") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      details: {
        stock_ticker: String(formData.get("stock_ticker") || ""),
        stock_sector: String(formData.get("stock_sector") || ""),
        stock_region: String(formData.get("stock_region") || ""),
        bond_coupon: String(formData.get("bond_coupon") || ""),
        bond_maturity: String(formData.get("bond_maturity") || ""),
        commodity_type: String(formData.get("commodity_type") || ""),
        commodity_exposure: String(formData.get("commodity_exposure") || ""),
        realestate_location: String(formData.get("realestate_location") || ""),
        realestate_value: String(formData.get("realestate_value") || ""),
        realestate_rent: String(formData.get("realestate_rent") || ""),
        crypto_token: String(formData.get("crypto_token") || ""),
        crypto_network: String(formData.get("crypto_network") || ""),
        crypto_storage: String(formData.get("crypto_storage") || ""),
      },
    };

    const assets = getAssetsForUser(activeUser);
    assets.push(asset);
    saveAssetsForUser(activeUser, assets);

    form.reset();
    toggleClassFields();
    showMessage(formMessage, `Asset opgeslagen voor ${activeUser}.`, "success");
  });
};

const getProcessedAssets = (assets) => {
  let result = [...assets];

  if (uiState.filterClass !== "all") {
    result = result.filter((asset) => normalizeAssetClass(asset.assetClass) === uiState.filterClass);
  }

  if (uiState.sortBy === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name, "nl"));
  } else if (uiState.sortBy === "value_desc") {
    result.sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
  } else if (uiState.sortBy === "value_asc") {
    result.sort((a, b) => Number(a.value || 0) - Number(b.value || 0));
  } else {
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return result;
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
    card.innerHTML = `<h4>${mapAssetClassLabel(assetClass)}</h4><div class="amount">${formatEuro(value)}</div><div class="percentage">${formatPercentage(percentage)} van totaal</div>`;
    container.appendChild(card);
  });
};

const renderInsights = (userAssets, classTotals, totalVermogen) => {
  const allPositions = [...DEMO_POSITIONS, ...userAssets];
  const largestElement = document.getElementById("largest-position");
  const smallestElement = document.getElementById("smallest-position");
  const mostCommonElement = document.getElementById("most-common-class");
  const indicator = document.getElementById("diversification-indicator");
  const note = document.getElementById("diversification-note");
  if (!largestElement || !smallestElement || !mostCommonElement || !indicator || !note) return;

  if (!allPositions.length) {
    largestElement.textContent = smallestElement.textContent = mostCommonElement.textContent = "-";
    return;
  }

  const sortedByValue = [...allPositions].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
  largestElement.textContent = `${sortedByValue[0].name} (${formatEuro(sortedByValue[0].value)})`;
  smallestElement.textContent = `${sortedByValue[sortedByValue.length - 1].name} (${formatEuro(sortedByValue[sortedByValue.length - 1].value)})`;

  const classCounts = allPositions.reduce((acc, item) => {
    const key = normalizeAssetClass(item.assetClass);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const mostCommonEntry = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0];
  mostCommonElement.textContent = mostCommonEntry ? `${mapAssetClassLabel(mostCommonEntry[0])} (${mostCommonEntry[1]} posities)` : "-";

  const biggestShare = Math.max(...Object.values(classTotals).map((value) => (totalVermogen > 0 ? (value / totalVermogen) * 100 : 0)), 0);
  let label = "Goed gespreid";
  let type = "good";
  let text = "Geen enkele asset class domineert sterk; de verdeling is relatief gebalanceerd.";
  if (biggestShare > 60) {
    label = "Sterk geconcentreerd";
    type = "high";
    text = "Een groot deel van het vermogen zit in één class. Spreidingsrisico is verhoogd.";
  } else if (biggestShare > 40) {
    label = "Redelijk geconcentreerd";
    type = "medium";
    text = "Eén class weegt duidelijk zwaarder. Extra spreiding kan het risico verlagen.";
  }

  indicator.textContent = label;
  indicator.classList.remove("good", "medium", "high", "neutral");
  indicator.classList.add(type);
  note.textContent = text;
};

const openEditPanel = (asset) => {
  const panel = document.getElementById("edit-panel");
  const idInput = document.getElementById("edit-asset-id");
  const nameInput = document.getElementById("edit-name");
  const classInput = document.getElementById("edit-class");
  const valueInput = document.getElementById("edit-value");
  const purchaseValueInput = document.getElementById("edit-purchase-value");
  const acquiredAtInput = document.getElementById("edit-acquired-at");
  const notesInput = document.getElementById("edit-notes");
  if (!panel || !idInput || !nameInput || !classInput || !valueInput || !purchaseValueInput || !acquiredAtInput || !notesInput) return;

  idInput.value = String(asset.id);
  nameInput.value = asset.name || "";
  classInput.value = normalizeAssetClass(asset.assetClass);
  valueInput.value = Number(asset.value || 0);
  purchaseValueInput.value = asset.purchaseValue ?? "";
  acquiredAtInput.value = asset.acquiredAt || "";
  notesInput.value = asset.notes || "";
  panel.style.display = "block";
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

const closeEditPanel = () => {
  const panel = document.getElementById("edit-panel");
  const form = document.getElementById("edit-asset-form");
  if (form) form.reset();
  if (panel) panel.style.display = "none";
};

const renderUserAssetsTable = (assets) => {
  const tableBody = document.getElementById("user-assets-body");
  const emptyState = document.getElementById("assets-empty-state");
  if (!tableBody || !emptyState) return;

  tableBody.innerHTML = "";
  const processedAssets = getProcessedAssets(assets);

  if (!processedAssets.length) {
    emptyState.style.display = "block";
    emptyState.textContent = assets.length
      ? "Geen assets gevonden voor deze filter."
      : "Je hebt nog geen assets toegevoegd. Voeg je eerste asset toe via het formulier.";
    return;
  }

  emptyState.style.display = "none";

  processedAssets.forEach((asset) => {
    const row = document.createElement("tr");
    row.className = "clickable-row";
    row.setAttribute("data-view-id", String(asset.id));
    const date = new Date(asset.createdAt);
    const formattedDate = Number.isNaN(date.getTime()) ? "Onbekend" : date.toLocaleDateString("nl-NL");
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${asset.name}</td>
      <td>${mapAssetClassLabel(normalizeAssetClass(asset.assetClass))}</td>
      <td>${formatEuro(asset.value)}</td>
      <td class="${formatPnL(calculatePnL(asset)).className}">${formatPnL(calculatePnL(asset)).text}</td>
      <td>
        <button class="button secondary small" data-edit-id="${asset.id}">Bewerken</button>
        <button class="button danger small" data-delete-id="${asset.id}">Verwijderen</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
};


const detailFieldConfig = [
  ["Ticker", "stock_ticker"],
  ["Sector", "stock_sector"],
  ["Regio", "stock_region"],
  ["Coupon", "bond_coupon"],
  ["Looptijd", "bond_maturity"],
  ["Type commodity", "commodity_type"],
  ["Exposure-vorm", "commodity_exposure"],
  ["Locatie vastgoed", "realestate_location"],
  ["Geschatte vastgoedwaarde", "realestate_value"],
  ["Huurinkomsten", "realestate_rent"],
  ["Token", "crypto_token"],
  ["Netwerk", "crypto_network"],
  ["Opslaglocatie", "crypto_storage"],
];

const openDetailPanel = (asset) => {
  const panel = document.getElementById("asset-detail-panel");
  if (!panel) return;

  const pnl = calculatePnL(asset);
  const pnlFormatted = formatPnL(pnl);

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
    return el;
  };

  setText("detail-name", asset.name || "Asset detail");
  setText("detail-class", mapAssetClassLabel(normalizeAssetClass(asset.assetClass)));
  setText("detail-value", formatEuro(asset.value));
  setText("detail-purchase-value", asset.purchaseValue ? formatEuro(asset.purchaseValue) : "Niet beschikbaar");
  setText("detail-purchase-date", asset.acquiredAt || "Niet beschikbaar");

  const pnlEurEl = setText("detail-pnl-eur", pnl.available ? formatEuro(pnl.euro) : "Niet beschikbaar");
  const pnlPctEl = setText("detail-pnl-pct", pnl.available ? formatPercentage(pnl.percent) : "Niet beschikbaar");
  [pnlEurEl, pnlPctEl].forEach((el) => {
    if (!el) return;
    el.classList.remove("pnl-positive", "pnl-negative", "pnl-neutral");
    el.classList.add(pnlFormatted.className);
  });

  setText("detail-notes", asset.notes || "Niet beschikbaar");

  const extraContainer = document.getElementById("detail-extra-fields");
  if (extraContainer) {
    extraContainer.innerHTML = "";
    detailFieldConfig.forEach(([label, key]) => {
      const value = asset.details?.[key];
      if (!value) return;
      const item = document.createElement("div");
      item.innerHTML = `<span class="detail-label">${label}</span><strong>${value}</strong>`;
      extraContainer.appendChild(item);
    });
  }

  panel.style.display = "block";
};

const closeDetailPanel = () => {
  const panel = document.getElementById("asset-detail-panel");
  if (panel) panel.style.display = "none";
};

const updateAsset = (assetId, payload) => {
  const activeUser = getActiveUser();
  if (!activeUser) return;
  const assets = getAssetsForUser(activeUser);
  const updated = assets.map((asset) => (String(asset.id) === String(assetId) ? { ...asset, ...payload } : asset));
  saveAssetsForUser(activeUser, updated);
};

const handleDeleteAsset = (assetId) => {
  const activeUser = getActiveUser();
  if (!activeUser) return;

  const assets = getAssetsForUser(activeUser);
  saveAssetsForUser(activeUser, assets.filter((asset) => String(asset.id) !== String(assetId)));
  closeEditPanel();
  closeDetailPanel();
  renderDashboard();
  showMessage(document.getElementById("dashboard-message"), "Asset verwijderd uit portfolio van actieve gebruiker.", "success");
};

const attachDashboardEvents = () => {
  const tableBody = document.getElementById("user-assets-body");
  const filterSelect = document.getElementById("asset-filter-class");
  const sortSelect = document.getElementById("asset-sort");
  const editForm = document.getElementById("edit-asset-form");
  const cancelEditButton = document.getElementById("cancel-edit-button");
  const closeDetailButton = document.getElementById("close-detail-button");

  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      uiState.filterClass = filterSelect.value;
      renderDashboard();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      uiState.sortBy = sortSelect.value;
      renderDashboard();
    });
  }

  if (tableBody) {
    tableBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const deleteId = target.getAttribute("data-delete-id");
      if (deleteId) return handleDeleteAsset(deleteId);

      const editId = target.getAttribute("data-edit-id");
      if (editId) {
        const activeUser = getActiveUser();
        const asset = getAssetsForUser(activeUser).find((item) => String(item.id) === String(editId));
        if (asset) return openEditPanel(asset);
      }

      const row = target.closest("tr");
      const viewId = row?.getAttribute("data-view-id");
      if (viewId) {
        const activeUser = getActiveUser();
        const asset = getAssetsForUser(activeUser).find((item) => String(item.id) === String(viewId));
        if (asset) openDetailPanel(asset);
      }
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const id = document.getElementById("edit-asset-id")?.value;
      const name = String(document.getElementById("edit-name")?.value || "").trim();
      const assetClass = normalizeAssetClass(document.getElementById("edit-class")?.value || "");
      const value = Number(document.getElementById("edit-value")?.value || 0);
      const purchaseValue = Number(document.getElementById("edit-purchase-value")?.value || 0) || null;
      const acquiredAt = String(document.getElementById("edit-acquired-at")?.value || "").trim();
      const notes = String(document.getElementById("edit-notes")?.value || "").trim();

      const error = validateAssetForm({ name, assetClass, value });
      if (error) return showMessage(document.getElementById("dashboard-message"), error, "error");

      updateAsset(id, { name, assetClass, value, purchaseValue, acquiredAt, notes });
      closeEditPanel();
      renderDashboard();
      showMessage(document.getElementById("dashboard-message"), "Asset bijgewerkt.", "success");
    });
  }

  if (cancelEditButton) cancelEditButton.addEventListener("click", closeEditPanel);
  if (closeDetailButton) closeDetailButton.addEventListener("click", closeDetailPanel);
};

const renderDashboard = () => {
  const dashboardPage = document.getElementById("dashboard-page");
  if (!dashboardPage) return;

  const activeUser = getActiveUser();
  const assets = getAssetsForUser(activeUser);

  if (!activeUser) {
    refreshUserUI();
    return;
  }

  const classTotals = { ...DEMO_CLASS_TOTALS };
  assets.forEach((asset) => {
    const key = normalizeAssetClass(asset.assetClass);
    if (Object.prototype.hasOwnProperty.call(classTotals, key)) {
      classTotals[key] += Number(asset.value) || 0;
    }
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

const init = () => {
  migrateLegacyAssets();
  refreshUserUI();
  setupUserControls();
  handleAssetForm();
  attachDashboardEvents();
  renderDashboard();
};

init();
