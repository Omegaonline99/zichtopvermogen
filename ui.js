const { createClient } = window.supabase || {};
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";

const supabase = createClient && SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const uiState = { filterClass: "all", sortBy: "recent", assets: [] };

const formatEuro = (value) =>
  `€ ${Number(value || 0).toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatPercentage = (value) => `${Number(value || 0).toFixed(1).replace(".", ",")}%`;
const normalizeAssetClass = (value) => (value || "").trim().toLowerCase();

const mapAssetClassLabel = (assetClass) => {
  const map = {
    aandelen: "Aandelen",
    bonds: "Bonds",
    "commodity’s": "Commodity’s",
    vastgoed: "Vastgoed",
    crypto: "Crypto",
  };
  return map[assetClass] || "Onbekend";
};

const showMessage = (id, text, type = "success") => {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = text;
  element.classList.remove("success", "error");
  element.classList.add(type);
  element.style.display = "block";
};

const clearMessage = (id) => {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = "";
  element.classList.remove("success", "error");
  element.style.display = "none";
};

const parseNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const calculatePnL = (asset) => {
  const current = parseNumber(asset.current_value);
  const purchase = parseNumber(asset.purchase_value);
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

const validateAsset = (name, assetClass, value) => {
  if (!name) return "Naam bezit is verplicht.";
  if (!assetClass) return "Asset class is verplicht.";
  if (!Number.isFinite(value) || value <= 0) return "Huidige waarde moet een geldig positief getal zijn.";
  return "";
};

const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user || null;
};

const updateAuthUI = async () => {
  const user = await getCurrentUser();
  const emailEl = document.getElementById("active-user-email");
  const startScreen = document.getElementById("auth-start-screen");
  const content = document.getElementById("portfolio-content") || document.getElementById("asset-form-section");

  if (emailEl) emailEl.textContent = user?.email || "Niet ingelogd";
  if (startScreen) startScreen.style.display = user ? "none" : "block";
  if (content) content.style.display = user ? "block" : "none";
};

const authAction = async (mode) => {
  console.log("[auth] click:", mode);
  clearMessage("auth-message");
  if (!supabase) return showMessage("auth-message", "Supabase configuratie ontbreekt in config.js.", "error");

  const email = String(document.getElementById("auth-email")?.value || "").trim();
  const password = String(document.getElementById("auth-password")?.value || "").trim();
  if (!email || !password) return showMessage("auth-message", "Vul e-mail en wachtwoord in.", "error");

  const fn = mode === "register" ? supabase.auth.signUp : supabase.auth.signInWithPassword;
  const { data, error } = await fn({ email, password });
  console.log("[auth] response:", { data, error });
  if (error) return showMessage("auth-message", error.message, "error");

  showMessage("auth-message", mode === "register" ? "Registratie gelukt. Controleer eventueel je e-mail." : "Inloggen gelukt.", "success");
  await updateAuthUI();
  await loadAssets();
  renderDashboard();

  if (mode === "login" && !window.location.pathname.endsWith("dashboard.html")) {
    window.location.href = "dashboard.html";
  }
};

const logout = async () => {
  if (!supabase) return;
  console.log("[auth] logout click");
  const { error } = await supabase.auth.signOut();
  console.log("[auth] logout response:", { error });
  uiState.assets = [];
  await updateAuthUI();
  renderDashboard();
};

const loadAssets = async () => {
  const user = await getCurrentUser();
  if (!supabase || !user) {
    uiState.assets = [];
    return;
  }

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    showMessage("dashboard-message", error.message, "error");
    uiState.assets = [];
    return;
  }

  uiState.assets = data || [];
};

const getProcessedAssets = () => {
  let assets = [...uiState.assets];

  if (uiState.filterClass !== "all") {
    assets = assets.filter((asset) => normalizeAssetClass(asset.asset_class) === uiState.filterClass);
  }

  if (uiState.sortBy === "name") assets.sort((a, b) => a.name.localeCompare(b.name, "nl"));
  else if (uiState.sortBy === "value_desc") assets.sort((a, b) => Number(b.current_value || 0) - Number(a.current_value || 0));
  else if (uiState.sortBy === "value_asc") assets.sort((a, b) => Number(a.current_value || 0) - Number(b.current_value || 0));
  else assets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return assets;
};

const renderVisualAllocation = (classTotals, totalVermogen) => {
  const container = document.getElementById("allocation-visual-list");
  const largestAssetEl = document.getElementById("largest-asset-summary");
  const largestCategoryEl = document.getElementById("largest-category-summary");
  const concentrationEl = document.getElementById("largest-category-concentration");
  if (!container || !largestAssetEl || !largestCategoryEl || !concentrationEl) return;

  container.innerHTML = "";
  const entries = Object.entries(classTotals).map(([key, value]) => ({
    key,
    value,
    percentage: totalVermogen > 0 ? (value / totalVermogen) * 100 : 0,
  })).sort((a, b) => b.value - a.value);

  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "visual-row";
    row.innerHTML = `<div class="visual-head"><span>${mapAssetClassLabel(entry.key)}</span><span>${formatPercentage(entry.percentage)} · ${formatEuro(entry.value)}</span></div><div class="visual-bar"><span style="width:${entry.percentage}%"></span></div>`;
    container.appendChild(row);
  });

  const largestAsset = [...uiState.assets].sort((a, b) => Number(b.current_value || 0) - Number(a.current_value || 0))[0];
  largestAssetEl.textContent = largestAsset ? `${largestAsset.name} (${formatEuro(largestAsset.current_value)})` : "Niet beschikbaar";

  const largestCategory = entries[0];
  largestCategoryEl.textContent = largestCategory ? mapAssetClassLabel(largestCategory.key) : "Niet beschikbaar";
  concentrationEl.textContent = largestCategory ? formatPercentage(largestCategory.percentage) : "Niet beschikbaar";
};

const renderUserAssetsTable = () => {
  const tbody = document.getElementById("user-assets-body");
  const empty = document.getElementById("assets-empty-state");
  if (!tbody || !empty) return;

  tbody.innerHTML = "";
  const assets = getProcessedAssets();

  if (!assets.length) {
    empty.style.display = "block";
    empty.textContent = uiState.assets.length ? "Geen assets voor deze filter." : "Nog geen assets gevonden. Voeg je eerste asset toe.";
    return;
  }
  empty.style.display = "none";

  assets.forEach((asset) => {
    const pnl = formatPnL(calculatePnL(asset));
    const row = document.createElement("tr");
    row.className = "clickable-row";
    row.setAttribute("data-view-id", asset.id);
    row.innerHTML = `
      <td>${new Date(asset.created_at).toLocaleDateString("nl-NL")}</td>
      <td>${asset.name}</td>
      <td>${mapAssetClassLabel(normalizeAssetClass(asset.asset_class))}</td>
      <td>${formatEuro(asset.current_value)}</td>
      <td class="${pnl.className}">${pnl.text}</td>
      <td>
        <button class="button secondary small" data-edit-id="${asset.id}">Bewerken</button>
        <button class="button danger small" data-delete-id="${asset.id}">Verwijderen</button>
      </td>`;
    tbody.appendChild(row);
  });
};

const openDetailPanel = (asset) => {
  const panel = document.getElementById("asset-detail-panel");
  if (!panel) return;
  const pnl = formatPnL(calculatePnL(asset));

  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; return el; };
  setText("detail-name", asset.name || "Asset detail");
  setText("detail-class", mapAssetClassLabel(normalizeAssetClass(asset.asset_class)));
  setText("detail-value", formatEuro(asset.current_value));
  setText("detail-purchase-value", asset.purchase_value ? formatEuro(asset.purchase_value) : "Niet beschikbaar");
  setText("detail-purchase-date", asset.purchase_date || "Niet beschikbaar");
  setText("detail-notes", asset.notes || "Niet beschikbaar");

  const pnlEurEl = setText("detail-pnl-eur", pnl.text.split(" (")[0] || "Niet beschikbaar");
  const pnlPctEl = setText("detail-pnl-pct", pnl.text.includes("(") ? pnl.text.split("(")[1].replace(")", "") : "Niet beschikbaar");
  [pnlEurEl, pnlPctEl].forEach((el) => {
    if (!el) return;
    el.classList.remove("pnl-positive", "pnl-negative", "pnl-neutral");
    el.classList.add(pnl.className);
  });

  const extra = document.getElementById("detail-extra-fields");
  if (extra) {
    extra.innerHTML = "";
    const details = asset.details || {};
    Object.entries(details).forEach(([key, value]) => {
      if (!value) return;
      const item = document.createElement("div");
      item.innerHTML = `<span class="detail-label">${key.replaceAll("_", " ")}</span><strong>${value}</strong>`;
      extra.appendChild(item);
    });
  }

  panel.style.display = "block";
};

const closeDetailPanel = () => {
  const panel = document.getElementById("asset-detail-panel");
  if (panel) panel.style.display = "none";
};

const openEditPanel = (asset) => {
  const panel = document.getElementById("edit-panel");
  if (!panel) return;
  document.getElementById("edit-asset-id").value = asset.id;
  document.getElementById("edit-name").value = asset.name || "";
  document.getElementById("edit-class").value = normalizeAssetClass(asset.asset_class);
  document.getElementById("edit-value").value = Number(asset.current_value || 0);
  document.getElementById("edit-purchase-value").value = asset.purchase_value || "";
  document.getElementById("edit-acquired-at").value = asset.purchase_date || "";
  document.getElementById("edit-notes").value = asset.notes || "";
  panel.style.display = "block";
};

const closeEditPanel = () => {
  const panel = document.getElementById("edit-panel");
  if (panel) panel.style.display = "none";
};

const renderDashboard = () => {
  if (!document.getElementById("dashboard-page")) return;

  const totals = {
    aandelen: 0,
    bonds: 0,
    "commodity’s": 0,
    vastgoed: 0,
    crypto: 0,
  };

  uiState.assets.forEach((asset) => {
    const key = normalizeAssetClass(asset.asset_class);
    if (Object.prototype.hasOwnProperty.call(totals, key)) totals[key] += Number(asset.current_value || 0);
  });

  const totalVermogen = Object.values(totals).reduce((a, b) => a + b, 0);
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

  set("total-vermogen", formatEuro(totalVermogen));
  set("asset-count", String(uiState.assets.length));
  set("user-asset-count", String(uiState.assets.length));

  const mapping = { aandelen: ["pct-aandelen", "bar-aandelen", "val-aandelen"], vastgoed: ["pct-vastgoed", "bar-vastgoed", "val-vastgoed"], crypto: ["pct-crypto", "bar-crypto", "val-crypto"], bonds: ["pct-bonds", "bar-bonds", "val-bonds"], "commodity’s": ["pct-commodity", "bar-commodity", "val-commodity"] };
  Object.entries(mapping).forEach(([key, [pct, bar, val]]) => {
    const percentage = totalVermogen > 0 ? (totals[key] / totalVermogen) * 100 : 0;
    set(pct, formatPercentage(percentage));
    const barEl = document.getElementById(bar);
    if (barEl) barEl.style.width = `${percentage}%`;
    set(val, formatEuro(totals[key]));
  });

  renderVisualAllocation(totals, totalVermogen);
  renderUserAssetsTable();
};

const saveAsset = async (assetData) => {
  const user = await getCurrentUser();
  if (!user) return showMessage("form-message", "Log eerst in.", "error");

  const { error } = await supabase.from("assets").insert({ ...assetData, user_id: user.id });
  if (error) return showMessage("form-message", error.message, "error");

  showMessage("form-message", "Asset opgeslagen.", "success");
  await loadAssets();
  renderDashboard();
};

const updateAsset = async (id, payload) => {
  const user = await getCurrentUser();
  if (!user) return;
  const { error } = await supabase.from("assets").update(payload).eq("id", id).eq("user_id", user.id);
  if (error) return showMessage("dashboard-message", error.message, "error");
  await loadAssets();
  renderDashboard();
};

const deleteAsset = async (id) => {
  const user = await getCurrentUser();
  if (!user) return;
  const { error } = await supabase.from("assets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return showMessage("dashboard-message", error.message, "error");
  await loadAssets();
  renderDashboard();
};

const setupForm = () => {
  const form = document.getElementById("asset-form");
  if (!form) return;

  document.getElementById("asset-class")?.addEventListener("change", () => {
    document.querySelectorAll(".class-fields").forEach((section) => {
      section.classList.toggle("active", section.dataset.class === document.getElementById("asset-class").value);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const assetClass = normalizeAssetClass(formData.get("asset_class"));
    const currentValue = Number(formData.get("value") || 0);
    const error = validateAsset(name, assetClass, currentValue);
    if (error) return showMessage("form-message", error, "error");

    await saveAsset({
      name,
      asset_class: assetClass,
      current_value: currentValue,
      purchase_value: Number(formData.get("purchase_value") || 0) || null,
      purchase_date: String(formData.get("acquired_at") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      details: Object.fromEntries(formData.entries()),
    });

    form.reset();
  });
};

const setupDashboardEvents = () => {
  const filter = document.getElementById("asset-filter-class");
  const sort = document.getElementById("asset-sort");
  const body = document.getElementById("user-assets-body");

  filter?.addEventListener("change", () => { uiState.filterClass = filter.value; renderUserAssetsTable(); });
  sort?.addEventListener("change", () => { uiState.sortBy = sort.value; renderUserAssetsTable(); });

  body?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const deleteId = target.getAttribute("data-delete-id");
    if (deleteId) return deleteAsset(deleteId);

    const editId = target.getAttribute("data-edit-id");
    if (editId) {
      const asset = uiState.assets.find((a) => String(a.id) === String(editId));
      if (asset) openEditPanel(asset);
      return;
    }

    const viewId = target.closest("tr")?.getAttribute("data-view-id");
    if (viewId) {
      const asset = uiState.assets.find((a) => String(a.id) === String(viewId));
      if (asset) openDetailPanel(asset);
    }
  });

  document.getElementById("close-detail-button")?.addEventListener("click", closeDetailPanel);
  document.getElementById("cancel-edit-button")?.addEventListener("click", closeEditPanel);

  document.getElementById("edit-asset-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = document.getElementById("edit-asset-id")?.value;
    const name = String(document.getElementById("edit-name")?.value || "").trim();
    const assetClass = normalizeAssetClass(document.getElementById("edit-class")?.value || "");
    const currentValue = Number(document.getElementById("edit-value")?.value || 0);
    const error = validateAsset(name, assetClass, currentValue);
    if (error) return showMessage("dashboard-message", error, "error");

    await updateAsset(id, {
      name,
      asset_class: assetClass,
      current_value: currentValue,
      purchase_value: Number(document.getElementById("edit-purchase-value")?.value || 0) || null,
      purchase_date: String(document.getElementById("edit-acquired-at")?.value || "").trim() || null,
      notes: String(document.getElementById("edit-notes")?.value || "").trim() || null,
    });

    closeEditPanel();
    showMessage("dashboard-message", "Asset bijgewerkt.", "success");
  });
};

const setupAuthControls = () => {
  const authForm = document.getElementById("auth-form");
  const logoutButton = document.getElementById("logout-button");

  authForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const action = event.submitter?.getAttribute("data-auth-action");
    if (action === "login") authAction("login");
    if (action === "register") authAction("register");
  });

  logoutButton?.addEventListener("click", async () => {
    await logout();
    if (!window.location.pathname.endsWith("index.html")) {
      window.location.href = "index.html";
    }
  });
};

const init = async () => {
  await updateAuthUI();

  const user = await getCurrentUser();
  if (window.location.pathname.endsWith("dashboard.html") && !user) {
    window.location.href = "index.html";
    return;
  }
  setupAuthControls();
  setupForm();
  setupDashboardEvents();
  await loadAssets();
  renderDashboard();

  supabase?.auth.onAuthStateChange(async () => {
    await updateAuthUI();
    await loadAssets();
    renderDashboard();
  });
};

init();
