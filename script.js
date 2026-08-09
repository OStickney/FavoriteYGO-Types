"use strict";

const STORAGE_KEY = "favorite-ygo-types:v1";
const API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

const MONSTER_TYPES = [
  { name: "Aqua", apiRace: "Aqua", accent: "#65b9d7" },
  { name: "Beast", apiRace: "Beast", accent: "#c99a66" },
  { name: "Beast-Warrior", apiRace: "Beast-Warrior", accent: "#c86f4b" },
  { name: "Cyberse", apiRace: "Cyberse", accent: "#5e8fd5" },
  { name: "Dinosaur", apiRace: "Dinosaur", accent: "#83a754" },
  { name: "Divine-Beast", apiRace: "Divine-Beast", accent: "#d2ae42" },
  { name: "Dragon", apiRace: "Dragon", accent: "#a267cf" },
  { name: "Fairy", apiRace: "Fairy", accent: "#edc5e8" },
  { name: "Fiend", apiRace: "Fiend", accent: "#9a6cac" },
  { name: "Fish", apiRace: "Fish", accent: "#4aa9c7" },
  { name: "Illusion", apiRace: "Illusion", accent: "#8d7dc3" },
  { name: "Insect", apiRace: "Insect", accent: "#78a44c" },
  { name: "Machine", apiRace: "Machine", accent: "#8e9aa2" },
  { name: "Plant", apiRace: "Plant", accent: "#5ea65e" },
  { name: "Psychic", apiRace: "Psychic", accent: "#d875a2" },
  { name: "Pyro", apiRace: "Pyro", accent: "#e87145" },
  { name: "Reptile", apiRace: "Reptile", accent: "#72a37c" },
  { name: "Rock", apiRace: "Rock", accent: "#b09a7a" },
  { name: "Sea Serpent", apiRace: "Sea Serpent", accent: "#438fc6" },
  { name: "Spellcaster", apiRace: "Spellcaster", accent: "#7366c6" },
  { name: "Thunder", apiRace: "Thunder", accent: "#e5c848" },
  { name: "Warrior", apiRace: "Warrior", accent: "#c7755f" },
  { name: "Winged Beast", apiRace: "Winged Beast", accent: "#72a7b4" },
  { name: "Wyrm", apiRace: "Wyrm", accent: "#6e9eb0" },
  { name: "Zombie", apiRace: "Zombie", accent: "#7e8298" },
];

const state = {
  selections: loadSelections(),
  activeType: null,
  cards: [],
  query: "",
  visibleCount: 60,
  cache: new Map(),
  exportImageCache: new Map(),
  lastFocused: null,
};

const elements = {
  typeGrid: document.querySelector("#typeGrid"),
  downloadButton: document.querySelector("#downloadButton"),
  clearAllButton: document.querySelector("#clearAllButton"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  pickerHeading: document.querySelector("#pickerHeading"),
  pickerColor: document.querySelector("#pickerColor"),
  closeButton: document.querySelector("#closeButton"),
  searchInput: document.querySelector("#searchInput"),
  clearSearchButton: document.querySelector("#clearSearchButton"),
  pickerResults: document.querySelector("#pickerResults"),
  cardBackTemplate: document.querySelector("#cardBackTemplate"),
};

function loadSelections() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

function saveSelections() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.selections));
  elements.clearAllButton.disabled =
    Object.keys(state.selections).length === 0;
}

function cardImage(card, fullSize = false) {
  return fullSize ? card.imageFull || card.imageSmall : card.imageSmall || card.imageFull;
}

function normalizeCard(card) {
  const image = card.card_images?.[0] || {};
  return {
    id: card.id,
    name: card.name,
    type: card.type,
    race: card.race,
    imageSmall: image.image_url_small || image.image_url || "",
    imageFull: image.image_url || image.image_url_small || "",
  };
}

function createCardBack() {
  return elements.cardBackTemplate.content.firstElementChild.cloneNode(true);
}

function renderTypeGrid() {
  elements.typeGrid.replaceChildren();

  MONSTER_TYPES.forEach((type) => {
    const selected = state.selections[type.name];
    const slot = document.createElement("article");
    slot.className = "type-slot";

    const label = document.createElement("div");
    label.className = "type-label";
    label.style.setProperty("--type-accent", type.accent);
    label.textContent = type.name;

    const choice = document.createElement("button");
    choice.className = "card-choice";
    choice.type = "button";
    choice.dataset.typeName = type.name;
    choice.title = selected?.name || `Choose a ${type.name} card`;
    choice.setAttribute(
      "aria-label",
      selected
        ? `Change ${type.name} choice, currently ${selected.name}`
        : `Choose a favorite ${type.name} card`,
    );

    if (selected) {
      void preloadExportImage(selected);
      const image = document.createElement("img");
      image.src = cardImage(selected);
      image.alt = selected.name;
      image.loading = "lazy";
      choice.append(image);
    } else {
      choice.append(createCardBack());
    }

    const hint = document.createElement("span");
    hint.className = "card-choice__hint";
    hint.textContent = selected ? "Change" : "Choose";
    choice.append(hint);

    slot.append(label, choice);

    if (selected) {
      const remove = document.createElement("button");
      remove.className = "remove-choice";
      remove.type = "button";
      remove.dataset.removeType = type.name;
      remove.textContent = "×";
      remove.title = "Clear choice";
      remove.setAttribute("aria-label", `Clear ${type.name} choice`);
      slot.append(remove);
    }

    elements.typeGrid.append(slot);
  });

  saveSelections();
}

async function fetchCards(type) {
  const cached = state.cache.get(type.apiRace);
  if (cached) return cached;

  const response = await fetch(
    `${API_URL}?race=${encodeURIComponent(type.apiRace)}`,
  );
  if (!response.ok) throw new Error("Card database request failed");
  const result = await response.json();
  if (!Array.isArray(result.data)) {
    throw new Error(result.error || "No cards found");
  }

  const cards = result.data
    .filter((card) => card.type.toLowerCase().includes("monster"))
    .map(normalizeCard)
    .sort((a, b) => a.name.localeCompare(b.name));
  state.cache.set(type.apiRace, cards);
  return cards;
}

function statusMessage(text, kind = "") {
  const status = document.createElement("div");
  status.className = `status-message ${kind}`.trim();
  status.textContent = text;
  elements.pickerResults.replaceChildren(status);
  return status;
}

async function openPicker(typeName) {
  const type = MONSTER_TYPES.find((candidate) => candidate.name === typeName);
  if (!type) return;

  state.activeType = type;
  state.query = "";
  state.visibleCount = 60;
  state.lastFocused = document.activeElement;
  elements.pickerHeading.textContent = `Choose a ${type.name} card`;
  elements.pickerColor.style.backgroundColor = type.accent;
  elements.searchInput.value = "";
  elements.searchInput.placeholder = `Search ${type.name} cards…`;
  elements.searchInput.setAttribute("aria-label", `Search ${type.name} cards`);
  elements.clearSearchButton.disabled = true;
  elements.modalBackdrop.hidden = false;
  document.body.classList.add("modal-open");
  elements.searchInput.focus();

  const loading = statusMessage(`Loading ${type.name} cards…`);
  const spinner = document.createElement("span");
  spinner.className = "loader";
  loading.prepend(spinner);

  try {
    state.cards = await fetchCards(type);
    renderResults();
  } catch {
    const error = statusMessage(
      "The card database could not be reached. Check your connection and try again.",
      "status-message--error",
    );
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => openPicker(type.name));
    error.append(retry);
  }
}

function closePicker() {
  state.activeType = null;
  elements.modalBackdrop.hidden = true;
  document.body.classList.remove("modal-open");
  if (state.lastFocused instanceof HTMLElement) state.lastFocused.focus();
}

function filteredCards() {
  const normalized = state.query.trim().toLocaleLowerCase();
  if (!normalized) return state.cards;
  return state.cards.filter((card) =>
    card.name.toLocaleLowerCase().includes(normalized),
  );
}

function renderResults() {
  const cards = filteredCards();
  elements.pickerResults.replaceChildren();

  if (cards.length === 0) {
    statusMessage(`No cards match “${state.query}.”`);
    return;
  }

  const count = document.createElement("p");
  count.className = "result-count";
  count.textContent = `${cards.length.toLocaleString()} cards`;

  const grid = document.createElement("div");
  grid.className = "card-results-grid";

  cards.slice(0, state.visibleCount).forEach((card) => {
    const button = document.createElement("button");
    button.className = "result-card";
    button.type = "button";
    button.dataset.cardId = String(card.id);
    button.title = `Choose ${card.name}`;

    const image = document.createElement("img");
    image.src = cardImage(card);
    image.alt = "";
    image.loading = "lazy";

    const name = document.createElement("span");
    name.textContent = card.name;
    button.append(image, name);
    grid.append(button);
  });

  elements.pickerResults.append(count, grid);

  if (state.visibleCount < cards.length) {
    const loadMore = document.createElement("button");
    loadMore.className = "load-more";
    loadMore.type = "button";
    loadMore.textContent = "Load more cards";
    loadMore.addEventListener("click", () => {
      state.visibleCount += 60;
      renderResults();
    });
    elements.pickerResults.append(loadMore);
  }
}

function chooseCard(cardId) {
  if (!state.activeType) return;
  const selected = state.cards.find((card) => card.id === cardId);
  if (!selected) return;
  state.selections[state.activeType.name] = selected;
  renderTypeGrid();
  closePicker();
}

async function canvasImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("Image request failed");
    const objectUrl = URL.createObjectURL(await response.blob());
    const loaded = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);
    return loaded;
  } catch {
    return null;
  }
}

function preloadExportImage(card) {
  const sourceUrl = cardImage(card, true);
  if (!sourceUrl) return Promise.resolve(null);

  let url = sourceUrl;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.hostname === "images.ygoprodeck.com") {
      const sourcePath = `${parsed.hostname}${parsed.pathname}${parsed.search}`;
      url = `https://wsrv.nl/?url=${encodeURIComponent(sourcePath)}&output=jpg`;
    }
  } catch {
    url = sourceUrl;
  }

  if (!url) return Promise.resolve(null);
  if (!state.exportImageCache.has(url)) {
    state.exportImageCache.set(url, canvasImage(url));
  }
  return state.exportImageCache.get(url);
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Image export failed"));
    }, "image/png");
  });
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = objectUrl;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function savePosterImage(canvas) {
  const filename = "favorite-yugioh-types.png";
  let blob;

  try {
    blob = await canvasBlob(canvas);
  } catch {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
    return;
  }

  const file = new File([blob], filename, { type: "image/png" });
  const isTouchDevice = navigator.maxTouchPoints > 0;
  let canShareFile = false;

  try {
    canShareFile =
      isTouchDevice &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] });
  } catch {
    canShareFile = false;
  }

  if (canShareFile) {
    elements.downloadButton.textContent = "Choose Save Image…";
    try {
      await navigator.share({
        files: [file],
        title: "Favorite Yu-Gi-Oh! Types",
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  downloadBlob(blob, filename);
}

function setFittedCanvasFont(
  context,
  text,
  maxWidth,
  maxSize,
  minSize,
  weight,
  family,
) {
  let size = maxSize;
  while (size > minSize) {
    context.font = `${weight} ${size}px ${family}`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  context.font = `${weight} ${size}px ${family}`;
}

async function downloadPoster() {
  const originalText = elements.downloadButton.textContent;
  elements.downloadButton.disabled = true;
  elements.downloadButton.textContent = "Preparing Image…";

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1500;
    canvas.height = 2180;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#f9f6ed";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#24211d";
    context.lineWidth = 5;
    context.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

    const [logoImage, cardBackImage, loadedImages] = await Promise.all([
      canvasImage("tcg-logo.png"),
      canvasImage("card-back.png"),
      Promise.all(
        MONSTER_TYPES.map((type) => {
          const selected = state.selections[type.name];
          return selected ? preloadExportImage(selected) : null;
        }),
      ),
    ]);

    const failedTypes = MONSTER_TYPES.filter(
      (type, index) => state.selections[type.name] && !loadedImages[index],
    );
    if (failedTypes.length > 0) {
      throw new Error(
        `Could not load selected artwork for ${failedTypes
          .map((type) => type.name)
          .join(", ")}`,
      );
    }

    context.textAlign = "left";
    context.fillStyle = "#17130f";
    context.textBaseline = "middle";
    const heading = "WHAT’S YOUR FAVORITE";
    const ending = "TYPE?";
    const logoWidth = 300;
    const logoHeight = logoWidth * (166 / 500);
    setFittedCanvasFont(
      context,
      `${heading} ${ending}`,
      880,
      56,
      44,
      "700",
      "Georgia, serif",
    );
    const headingWidth = context.measureText(heading).width;
    const endingWidth = context.measureText(ending).width;
    const headingGap = 18;
    const headingX =
      (canvas.width -
        (headingWidth + logoWidth + endingWidth + headingGap * 2)) /
      2;
    context.fillText(heading, headingX, 120);
    if (logoImage) {
      context.drawImage(
        logoImage,
        headingX + headingWidth + headingGap,
        120 - logoHeight / 2,
        logoWidth,
        logoHeight,
      );
    }
    context.fillText(
      ending,
      headingX + headingWidth + logoWidth + headingGap * 2,
      120,
    );

    const startX = 80;
    const startY = 220;
    const slotWidth = 252;
    const labelHeight = 32;
    const labelGap = 8;
    const imageWidth = slotWidth - 36;
    const imageHeight = Math.round(imageWidth * (366 / 251));
    const slotHeight = labelHeight + labelGap + imageHeight;
    const gapX = 20;
    const gapY = 15;

    context.textAlign = "center";

    MONSTER_TYPES.forEach((type, index) => {
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = startX + column * (slotWidth + gapX);
      const y = startY + row * (slotHeight + gapY);

      context.fillStyle = type.accent;
      context.fillRect(x, y, slotWidth, labelHeight);
      context.strokeStyle = "#38322c";
      context.lineWidth = 2;
      context.strokeRect(x, y, slotWidth, labelHeight);
      context.fillStyle = "#17130f";
      const label = type.name.toUpperCase();
      setFittedCanvasFont(
        context,
        label,
        slotWidth - 14,
        22,
        14,
        "800",
        "Georgia, serif",
      );
      context.textBaseline = "middle";
      context.fillText(label, x + slotWidth / 2, y + labelHeight / 2 + 1);

      const imageX = x + 18;
      const imageY = y + labelHeight + labelGap;
      const loaded = loadedImages[index];

      context.fillStyle = "#2d1510";
      context.fillRect(imageX, imageY, imageWidth, imageHeight);
      if (loaded) {
        context.drawImage(loaded, imageX, imageY, imageWidth, imageHeight);
      } else if (cardBackImage) {
        context.drawImage(
          cardBackImage,
          imageX,
          imageY,
          imageWidth,
          imageHeight,
        );
      } else {
        context.fillStyle = "#2d1510";
        context.fillRect(imageX, imageY, imageWidth, imageHeight);
      }
      context.strokeStyle = "#3a312a";
      context.lineWidth = 3;
      context.strokeRect(imageX, imageY, imageWidth, imageHeight);
    });

    context.textBaseline = "alphabetic";
    context.textAlign = "center";
    context.fillStyle = "#5d554d";
    context.font = "500 24px Arial, sans-serif";
    context.fillText("Favorite Yu-Gi-Oh! Types", 750, 2135);

    await savePosterImage(canvas);
  } catch (error) {
    console.error(error);
    window.alert(
      "The selected card artwork could not be loaded for the image. Please check your connection and try again.",
    );
  } finally {
    elements.downloadButton.disabled = false;
    elements.downloadButton.textContent = originalText;
  }
}

elements.typeGrid.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-type-name]");
  if (choice) openPicker(choice.dataset.typeName);

  const remove = event.target.closest("[data-remove-type]");
  if (remove) {
    delete state.selections[remove.dataset.removeType];
    renderTypeGrid();
  }
});

elements.pickerResults.addEventListener("click", (event) => {
  const result = event.target.closest("[data-card-id]");
  if (result) chooseCard(Number(result.dataset.cardId));
});

elements.searchInput.addEventListener("input", () => {
  state.query = elements.searchInput.value;
  state.visibleCount = 60;
  elements.clearSearchButton.disabled = !state.query;
  renderResults();
});

elements.clearSearchButton.addEventListener("click", () => {
  state.query = "";
  state.visibleCount = 60;
  elements.searchInput.value = "";
  elements.clearSearchButton.disabled = true;
  elements.searchInput.focus();
  renderResults();
});

elements.closeButton.addEventListener("click", closePicker);
elements.modalBackdrop.addEventListener("mousedown", (event) => {
  if (event.target === elements.modalBackdrop) closePicker();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.activeType) closePicker();
});

elements.clearAllButton.addEventListener("click", () => {
  state.selections = {};
  renderTypeGrid();
});

elements.downloadButton.addEventListener("click", downloadPoster);

renderTypeGrid();
