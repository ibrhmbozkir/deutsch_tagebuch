// assets/app.js
// Eski güzel tasarım + localStorage + WebLLM (tamamen ücretsiz, local KI)

import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const STORAGE_KEY = "de_tagebuch_entries_v1";

const openPanelBtn = document.getElementById("btn-open-panel");
const panel = document.getElementById("new-entry-panel");
const cancelBtn = document.getElementById("btn-cancel");
const saveBtn = document.getElementById("btn-save");
const titleInput = document.getElementById("title-input");
const textInput = document.getElementById("text-input");
const correctionInput = document.getElementById("correction-input");
const imageInput = document.getElementById("image-input");
const entriesContainer = document.getElementById("entries");
const emptyHint = document.getElementById("empty-hint");
const panelModeLabel = document.getElementById("panel-mode-label");

let entries = [];
let editingEntryId = null;

// Korrektur alanını kullanıcı değiştiremesin (yalnızca KI yazar)
correctionInput.readOnly = true;

// ----------------------
// localStorage
// ----------------------
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Fehler beim Laden:", e);
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ----------------------
// Panel
// ----------------------
function setPanelMode(mode) {
  if (!panelModeLabel) return;
  panelModeLabel.textContent =
    mode === "edit" ? "Eintrag bearbeiten" : "Neuer Eintrag";
}

function openPanel(mode = "new", entry = null) {
  panel.style.display = "flex";

  if (mode === "edit" && entry) {
    editingEntryId = entry.id;
    titleInput.value = entry.title || "";
    textInput.value = entry.text || "";
    correctionInput.value = entry.correction || "";
    imageInput.value = "";
    setPanelMode("edit");
  } else {
    editingEntryId = null;
    titleInput.value = "";
    textInput.value = "";
    correctionInput.value = "";
    imageInput.value = "";
    setPanelMode("new");
  }

  titleInput.focus();
}

function closePanel() {
  panel.style.display = "none";
  editingEntryId = null;
  titleInput.value = "";
  textInput.value = "";
  correctionInput.value = "";
  imageInput.value = "";
  setPanelMode("new");
}

openPanelBtn.addEventListener("click", () => openPanel("new"));
cancelBtn.addEventListener("click", closePanel);

// ----------------------
// Yardımcı fonksiyonlar
// ----------------------
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderFormattedText(text) {
  let safe = escapeHtml(text);
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
  safe = safe.replace(/\n/g, "<br>");
  return safe;
}

function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ----------------------
// WebLLM – lokal KI
// ----------------------
let engine = null;
let engineState = "idle"; // idle | loading | ready | error
let lastRequestedText = "";
let correctionTimer = null;

function setKorrekturPlaceholder(text) {
  correctionInput.placeholder = text;
}

async function ensureEngine() {
  if (engineState === "ready" && engine) return engine;
  if (engineState === "loading") {
    setKorrekturPlaceholder("KI wird geladen …");
    return null;
  }

  engineState = "loading";
  setKorrekturPlaceholder("Modell wird geladen … (erstes Mal dauert etwas)");

  const initProgressCallback = (report) => {
    if (!report) return;
    const p = Math.round((report.progress || 0) * 100);
    setKorrekturPlaceholder(`Modell wird geladen … ${p}%`);
  };

  try {
    // Küçük ve hızlı model:
    const modelName = "Phi-3-mini-4k-instruct-q4f16_1-MLC";
    engine = await webllm.CreateMLCEngine(modelName, { initProgressCallback });
    engineState = "ready";
    setKorrekturPlaceholder(
      "Korrigierte Version – wird automatisch von der KI gefüllt."
    );
    return engine;
  } catch (err) {
    console.error("Fehler beim Laden des Modells:", err);
    engineState = "error";
    setKorrekturPlaceholder(
      "Fehler beim Laden der KI. (WebGPU-Unterstützung nötig)"
    );
    return null;
  }
}

async function requestCorrectionForCurrentText() {
  const text = textInput.value.trim();
  if (!text) {
    correctionInput.value = "";
    setKorrekturPlaceholder(
      "Korrigierte Version – wird automatisch von der KI gefüllt."
    );
    return;
  }

  if (engineState === "error") return;

  lastRequestedText = text;
  setKorrekturPlaceholder("KI denkt …");

  const eng = await ensureEngine();
  if (!eng) return;

  try {
    const messages = [
      {
        role: "system",
        content:
          "Du bist ein strenger Deutschlehrer. Korrigiere Grammatik, Rechtschreibung " +
          "und Zeichensetzung des folgenden Textes. Gib NUR die korrigierte Version " +
          "zurück, ohne Erklärungen.",
      },
      { role: "user", content: text },
    ];

    const result = await eng.chat.completions.create({
      messages,
      temperature: 0,
    });

    const corrected = result.choices?.[0]?.message?.content?.trim?.() || "";

    // Kullanıcı bu arada metni değiştirdiyse, eski cevabı yazma
    if (textInput.value.trim() === lastRequestedText) {
      correctionInput.value = corrected;
      setKorrekturPlaceholder("Korrigierte Version – lokale KI ✔");
    }
  } catch (err) {
    console.error("Fehler bei der KI-Korrektur:", err);
    setKorrekturPlaceholder("Fehler bei der KI-Korrektur.");
  }
}

// Yazarken 1 s bekleyip otomatik düzelt
textInput.addEventListener("input", () => {
  const current = textInput.value.trim();
  if (!current) {
    if (correctionTimer) clearTimeout(correctionTimer);
    correctionInput.value = "";
    setKorrekturPlaceholder(
      "Korrigierte Version – wird automatisch von der KI gefüllt."
    );
    return;
  }

  if (correctionTimer) clearTimeout(correctionTimer);
  setKorrekturPlaceholder("Korrektur wird vorbereitet …");

  correctionTimer = setTimeout(() => {
    requestCorrectionForCurrentText();
  }, 1000);
});

// ----------------------
// Entries render
// ----------------------
function renderEntries() {
  entriesContainer.innerHTML = "";

  if (!entries.length) {
    const hint = document.createElement("div");
    hint.className = "no-entries-hint";
    hint.innerHTML =
      'Noch keine Einträge. Klicke oben auf <strong>„Neuer Eintrag“</strong> und starte dein persönliches Deutsch-Tagebuch.';
    entriesContainer.appendChild(hint);
    return;
  }

  entries
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((entry) => {
      const article = document.createElement("article");
      article.className = "entry-card";
      article.dataset.id = entry.id;

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "entry-image";

      if (entry.imageData) {
        const img = document.createElement("img");
        img.src = entry.imageData;
        img.alt = entry.title || "Bild";
        imageWrapper.appendChild(img);
      } else {
        imageWrapper.textContent =
          "Kein Bild ausgewählt – du kannst beim nächsten Eintrag eins hinzufügen.";
      }

      const chip = document.createElement("div");
      chip.className = "entry-chip";
      const dot = document.createElement("span");
      dot.className = "dot";
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode("Eintrag"));
      imageWrapper.appendChild(chip);

      const content = document.createElement("div");
      content.className = "entry-content";

      const meta = document.createElement("div");
      meta.className = "entry-meta";
      meta.innerHTML = `<span>📆 ${formatDate(
        entry.createdAt
      )}</span><span class="separator">•</span><span>Eigene Notizen</span>`;

      const titleEl = document.createElement("div");
      titleEl.className = "entry-title";
      titleEl.textContent = entry.title || "Ohne Titel";

      const textEl = document.createElement("div");
      textEl.className = "entry-text";

      if (entry.correction && entry.correction.trim() !== "") {
        const correctedSafe = escapeHtml(entry.correction).replace(
          /\n/g,
          "<br>"
        );
        textEl.innerHTML = `<span class="sentence-with-hint" data-correction="${correctedSafe}">${renderFormattedText(
          entry.text || ""
        )}</span>`;
      } else {
        textEl.innerHTML = renderFormattedText(entry.text || "");
      }

      const tags = document.createElement("div");
      tags.className = "entry-tags";
      const tag = document.createElement("span");
      tag.className = "entry-tag-pill";
      tag.textContent = "Deutsch-Lernen";
      tags.appendChild(tag);

      content.appendChild(meta);
      content.appendChild(titleEl);
      content.appendChild(textEl);
      content.appendChild(tags);

      const actions = document.createElement("div");
      actions.className = "entry-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn-chip";
      editBtn.textContent = "Bearbeiten";
      editBtn.addEventListener("click", () => startEdit(entry.id));

      const delBtn = document.createElement("button");
      delBtn.className = "btn-chip btn-chip--danger";
      delBtn.textContent = "Löschen";
      delBtn.addEventListener("click", () => deleteEntry(entry.id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      article.appendChild(imageWrapper);
      article.appendChild(content);
      article.appendChild(actions);

      entriesContainer.appendChild(article);
    });
}

// ----------------------
// CRUD
// ----------------------
function addEntry({ title, text, correction, imageData }) {
  const now = Date.now();

  const entry = {
    id: now.toString(),
    title: title || "",
    text: text || "",
    correction: correction || "",
    imageData: imageData || null,
    createdAt: now,
  };

  entries.push(entry);
  saveEntries();
  renderEntries();
}

function updateEntry(id, { title, text, correction, imageData, keepImage }) {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return;

  const existing = entries[idx];

  entries[idx] = {
    ...existing,
    title: title ?? existing.title,
    text: text ?? existing.text,
    correction:
      typeof correction === "string" ? correction : existing.correction || "",
    imageData: keepImage
      ? existing.imageData
      : imageData !== undefined
      ? imageData
      : existing.imageData,
  };

  saveEntries();
  renderEntries();
}

function deleteEntry(id) {
  if (!confirm("Diesen Eintrag wirklich löschen?")) return;
  entries = entries.filter((e) => e.id !== id);
  saveEntries();
  renderEntries();
}

function startEdit(id) {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;
  openPanel("edit", entry);
}

// ----------------------
// Speichern-Button
// ----------------------
saveBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const text = textInput.value.trim();
  const correction = correctionInput.value.trim();

  if (!title && !text) {
    alert("Bitte gib mindestens einen Titel oder Text ein.");
    return;
  }

  const isEdit = Boolean(editingEntryId);
  const file = imageInput.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      if (isEdit) {
        updateEntry(editingEntryId, {
          title,
          text,
          correction,
          imageData,
        });
      } else {
        addEntry({ title, text, correction, imageData });
      }
      closePanel();
    };
    reader.readAsDataURL(file);
  } else {
    if (isEdit) {
      updateEntry(editingEntryId, {
        title,
        text,
        correction,
        keepImage: true,
      });
    } else {
      addEntry({ title, text, correction, imageData: null });
    }
    closePanel();
  }
});

// ----------------------
// Initial
// ----------------------
entries = loadEntries();
renderEntries();
setKorrekturPlaceholder(
  "Korrigierte Version – wird automatisch von der KI gefüllt."
);
