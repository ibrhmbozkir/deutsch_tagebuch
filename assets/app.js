// assets/app.js
// Deutsch-Tagebuch + lokale KI-Korrektur mit WebLLM (keine API-Keys, kein Server)

import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const STORAGE_KEY = "deutsch_tagebuch_entries_v2";

const newEntryBtn = document.getElementById("new-entry-btn");
const editorSection = document.getElementById("entry-editor");
const entryForm = document.querySelector("[data-entry-form]");
const titleInput = document.querySelector("[data-title-input]");
const notesInput = document.querySelector("[data-notes-input]");
const korrInput = document.querySelector("[data-korrektur-input]");
const imageInput = document.querySelector("[data-image-input]");
const cancelBtn = document.querySelector("[data-cancel-btn]");
const saveBtn = document.querySelector("[data-save-btn]");
const entriesList = document.querySelector("[data-entries-list]");
const korrBtn = document.querySelector("[data-korrektur-btn]");
const korrStatus = document.querySelector("[data-korrektur-status]");
const modelStatus = document.querySelector("[data-model-status]");

let entries = [];
let editingId = null;
let currentImageDataUrl = null;

// ----------------------
// Lokale Datenspeicherung
// ----------------------

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Fehler beim Lesen aus localStorage:", e);
    entries = [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ----------------------
// WebLLM – Lokales Modell
// ----------------------

let engine = null;
let engineState = "idle"; // idle | loading | ready | error

function setModelStatus(text) {
  if (modelStatus) modelStatus.textContent = text;
}

function setKorrStatus(text) {
  if (korrStatus) korrStatus.textContent = text;
}

async function ensureEngine() {
  if (engineState === "ready" && engine) return engine;
  if (engineState === "loading") {
    // schon am Laden, einfach warten bis der Nutzer nochmal korrigiert
    return null;
  }

  engineState = "loading";
  setModelStatus("Modell wird geladen … (erstes Mal kann etwas dauern)");

  const initProgressCallback = (report) => {
    if (!report) return;
    const p = Math.round((report.progress || 0) * 100);
    setModelStatus(`Modell wird geladen … ${p}%`);
  };

  try {
    // Kleines, relativ schnelles Modell
    const selectedModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC";
    engine = await webllm.CreateMLCEngine(selectedModel, { initProgressCallback });
    engineState = "ready";
    setModelStatus("KI bereit (läuft lokal im Browser)");
    return engine;
  } catch (err) {
    console.error("Fehler beim Laden von WebLLM:", err);
    engineState = "error";
    setModelStatus("Fehler beim Laden der KI (WebLLM)");
    return null;
  }
}

let korrTimeout = null;

async function runCorrection() {
  const text = notesInput.value.trim();
  if (!text) {
    setKorrStatus("");
    korrInput.value = "";
    return;
  }
  if (engineState === "error") return;

  setKorrStatus("KI denkt …");
  const eng = await ensureEngine();
  if (!eng) {
    setKorrStatus("KI konnte nicht geladen werden.");
    return;
  }

  try {
    const messages = [
      {
        role: "system",
        content:
          "Du bist ein strenger Deutschlehrer. Korrigiere Grammatik, Rechtschreibung und Zeichensetzung des folgenden Textes. " +
          "Gib NUR die korrigierte Version zurück, ohne Erklärungen und ohne Zusatzkommentare.",
      },
      { role: "user", content: text },
    ];

    const result = await eng.chat.completions.create({
      messages,
      temperature: 0,
    });

    const corrected = result.choices?.[0]?.message?.content?.trim();
    if (corrected) {
      korrInput.value = corrected;
      setKorrStatus("Korrigiert ✔ (lokale KI)");
    } else {
      setKorrStatus("Keine Antwort von der KI erhalten.");
    }
  } catch (err) {
    console.error("Fehler bei der lokalen KI-Korrektur:", err);
    setKorrStatus("Fehler bei der KI-Korrektur.");
  }
}

// ----------------------
// Bild-Handling
// ----------------------

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) {
    currentImageDataUrl = null;
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    currentImageDataUrl = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ----------------------
// UI-Logik für Einträge
// ----------------------

function openEditor(entry = null) {
  editorSection.setAttribute("aria-hidden", "false");
  editorSection.classList.add("entry-editor--open");

  if (entry) {
    editingId = entry.id;
    titleInput.value = entry.title || "";
    notesInput.value = entry.notes || "";
    korrInput.value = entry.correction || "";
    currentImageDataUrl = entry.image || null;
  } else {
    editingId = null;
    titleInput.value = "";
    notesInput.value = "";
    korrInput.value = "";
    currentImageDataUrl = null;
    imageInput.value = "";
  }
  setKorrStatus("");
}

function closeEditor() {
  editorSection.setAttribute("aria-hidden", "true");
  editorSection.classList.remove("entry-editor--open");
  editingId = null;
  entryForm.reset();
  korrInput.value = "";
  currentImageDataUrl = null;
  setKorrStatus("");
}

function formatDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function renderEntries() {
  entriesList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "Noch keine Einträge. Klicke oben auf „Neuer Eintrag“, um zu starten.";
    entriesList.appendChild(empty);
    return;
  }

  entries
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .forEach((entry) => {
      const card = document.createElement("article");
      card.className = "entry-card";

      const imageHtml = entry.image
        ? `<div class="entry-card-image">
             <img src="${entry.image}" alt="Bild zum Eintrag" />
             <div class="entry-chip entry-chip--bottom-left">Eintrag</div>
           </div>`
        : "";

      card.innerHTML = `
        <div class="entry-card-main">
          ${imageHtml}
          <div class="entry-card-content">
            <div class="entry-card-meta">
              <span class="entry-card-date">📅 ${formatDate(entry.createdAt)}</span>
              <span class="entry-card-source">· Eigene Notizen</span>
            </div>
            <h2 class="entry-card-title">${entry.title || "Ohne Titel"}</h2>
            <p class="entry-card-text">${entry.notes || ""}</p>
            ${
              entry.correction
                ? `<p class="entry-card-correction">
                     <span class="entry-card-correction-label">Korrigierte Version:</span>
                     ${entry.correction}
                   </p>`
                : ""
            }
            <div class="entry-card-footer">
              <span class="entry-tag">Deutsch-Lernen</span>
              <div class="entry-card-actions">
                <button class="btn-chip btn-chip--dark" data-edit="${entry.id}">Bearbeiten</button>
                <button class="btn-chip btn-chip--danger" data-delete="${entry.id}">Löschen</button>
              </div>
            </div>
          </div>
        </div>
      `;
      entriesList.appendChild(card);
    });
}

// ----------------------
// Event-Listener
// ----------------------

newEntryBtn.addEventListener("click", () => openEditor());
cancelBtn.addEventListener("click", () => closeEditor());

entryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = titleInput.value.trim() || "Ohne Titel";
  const notes = notesInput.value.trim();
  const correction = korrInput.value.trim();

  if (!notes) {
    notesInput.focus();
    return;
  }

  const nowIso = new Date().toISOString();

  if (editingId) {
    const idx = entries.findIndex((e) => e.id === editingId);
    if (idx !== -1) {
      entries[idx] = {
        ...entries[idx],
        title,
        notes,
        correction,
        image: currentImageDataUrl ?? entries[idx].image ?? null,
        updatedAt: nowIso,
      };
    }
  } else {
    entries.push({
      id: crypto.randomUUID(),
      title,
      notes,
      correction,
      image: currentImageDataUrl ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  saveEntries();
  renderEntries();
  closeEditor();
});

// Eintrag bearbeiten / löschen
entriesList.addEventListener("click", (e) => {
  const editId = e.target.getAttribute("data-edit");
  const deleteId = e.target.getAttribute("data-delete");

  if (editId) {
    const entry = entries.find((x) => x.id === editId);
    if (entry) openEditor(entry);
  }

  if (deleteId) {
    if (confirm("Möchtest du diesen Eintrag wirklich löschen?")) {
      entries = entries.filter((x) => x.id !== deleteId);
      saveEntries();
      renderEntries();
    }
  }
});

// KI-Korrektur per Button
korrBtn.addEventListener("click", () => {
  if (korrTimeout) clearTimeout(korrTimeout);
  runCorrection();
});

// KI-Korrektur beim Tippen (leicht verzögert)
notesInput.addEventListener("input", () => {
  setKorrStatus("");
  korrInput.value = "";

  if (korrTimeout) clearTimeout(korrTimeout);
  // nur korrigieren, wenn man kurz aufgehört hat zu tippen
  korrTimeout = setTimeout(() => {
    if (notesInput.value.trim().length > 0) {
      runCorrection();
    }
  }, 1500);
});

// ----------------------
// Start
// ----------------------

loadEntries();
renderEntries();
setModelStatus("Lokales Modell wird bei Bedarf automatisch geladen.");
