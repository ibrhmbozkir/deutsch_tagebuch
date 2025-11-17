const STORAGE_KEY = "de_tagebuch_entries_v1";

const openPanelBtn = document.getElementById("btn-open-panel");
const panel = document.getElementById("new-entry-panel");
const cancelBtn = document.getElementById("btn-cancel");
const saveBtn = document.getElementById("btn-save");
const titleInput = document.getElementById("title-input");
const textInput = document.getElementById("text-input");
const imageInput = document.getElementById("image-input");
const entriesContainer = document.getElementById("entries");
const emptyHint = document.getElementById("empty-hint");

let entries = [];

// ---------- Helper: Storage ----------

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

// ---------- Panel ----------

function openPanel() {
  panel.style.display = "flex";
  titleInput.focus();
}

function closePanel() {
  panel.style.display = "none";
  titleInput.value = "";
  textInput.value = "";
  imageInput.value = "";
}

openPanelBtn.addEventListener("click", openPanel);
cancelBtn.addEventListener("click", closePanel);

// ---------- Formatierung: **fett**, *kursiv*, Zeilenumbrüche ----------

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderFormattedText(text) {
  let safe = escapeHtml(text);

  // **fett**
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // *kursiv*
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Zeilenumbrüche -> <br>
  safe = safe.replace(/\n/g, "<br>");

  return safe;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------- Karten erzeugen ----------

function renderEntries() {
  // Inhalt leeren
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

      // Bild
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

      // Inhalt
      const content = document.createElement("div");
      content.className = "entry-content";

      const meta = document.createElement("div");
      meta.className = "entry-meta";
      meta.innerHTML = `<span>📆 ${formatDate(entry.createdAt)}</span><span class="separator">•</span><span>Eigene Notizen</span>`;

      const titleEl = document.createElement("div");
      titleEl.className = "entry-title";
      titleEl.textContent = entry.title || "Ohne Titel";

      const textEl = document.createElement("div");
      textEl.className = "entry-text";
      textEl.innerHTML = renderFormattedText(entry.text || "");

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

      // Löschen-Button
      const delBtn = document.createElement("button");
      delBtn.className = "entry-delete";
      delBtn.textContent = "Löschen";
      delBtn.addEventListener("click", () => deleteEntry(entry.id));

      article.appendChild(imageWrapper);
      article.appendChild(content);
      article.appendChild(delBtn);

      entriesContainer.appendChild(article);
    });
}

function addEntry({ title, text, imageData }) {
  const now = Date.now();

  const entry = {
    id: now.toString(),
    title: title || "",
    text: text || "",
    imageData: imageData || null,
    createdAt: now,
  };

  entries.push(entry);
  saveEntries();
  renderEntries();
}

function deleteEntry(id) {
  if (!confirm("Diesen Eintrag wirklich löschen?")) return;
  entries = entries.filter((e) => e.id !== id);
  saveEntries();
  renderEntries();
}

// ---------- Speichern-Button ----------

saveBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const text = textInput.value.trim();

  if (!title && !text) {
    alert("Bitte gib mindestens einen Titel oder Text ein.");
    return;
  }

  const file = imageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      addEntry({ title, text, imageData: e.target.result });
      closePanel();
    };
    reader.readAsDataURL(file);
  } else {
    addEntry({ title, text, imageData: null });
    closePanel();
  }
});

// ---------- Initial ----------

entries = loadEntries();
renderEntries();
