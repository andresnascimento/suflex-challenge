import "./style.css";
import javascriptLogo from "./assets/javascript.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import { setupCounter } from "./counter.js";
const ITEMS = [
  {
    id: "i1",
    name: "Tomate italiano",
    brand: "Hortifruti Sul",
    qty: "1 caixa (6kg)",
    validity: "24/05",
    temp: "Peso conferido: 5,8kg",
    lot: "Lote 88422",
  },
  {
    id: "i2",
    name: "Alface americana",
    brand: "Hortifruti Sul",
    qty: "1 caixa (4kg)",
    validity: "23/05",
    temp: "Peso conferido: 4,1kg",
    lot: "Lote 88421",
  },
  {
    id: "i3",
    name: "Iogurte natural",
    brand: "Danone",
    qty: "3 caixas (12un cada)",
    validity: "26/05",
    temp: "Temperatura no recebimento: 8°C",
    lot: "Lote 77419",
  },
  {
    id: "i4",
    name: "Queijo mussarela",
    brand: "Tirolez",
    qty: "1 peça (3kg)",
    validity: "25/05",
    temp: "Embalagem: íntegra",
    lot: "Lote 77302",
  },
  {
    id: "i5",
    name: "Peito de frango",
    brand: "Sadia",
    qty: "1 embalagem (5kg)",
    validity: "22/05",
    temp: "Temperatura no recebimento: 6°C",
    lot: "Lote 91103",
  },
  {
    id: "i6",
    name: "Filé mignon",
    brand: "Friboi",
    qty: "1 embalagem (4kg)",
    validity: "24/05",
    temp: "Temperatura no recebimento: 9°C",
    lot: "Lote 91118",
  },
  {
    id: "i7",
    name: "Cenoura",
    brand: "Hortifruti Sul",
    qty: "1 caixa (8kg)",
    validity: "28/05",
    temp: "Peso conferido: 8,0kg",
    lot: "Lote 88433",
  },
  {
    id: "i8",
    name: "Arroz parboilizado",
    brand: "Tio João",
    qty: "1 fardo (30kg)",
    validity: "12/2026",
    temp: "Embalagem: íntegra",
    lot: "Lote 55012",
  },
  {
    id: "i9",
    name: "Salmão fresco",
    brand: "Costa Pesca",
    qty: "1 caixa (4kg)",
    validity: "21/05",
    temp: "Temperatura: 3°C",
    lot: "Lote 99201",
  },
  {
    id: "i10",
    name: "Azeite extra virgem",
    brand: "Andorinha",
    qty: "2 caixas (12un cada)",
    validity: "08/2026",
    temp: "Embalagem: íntegra",
    lot: "Lote 44510",
  },
  {
    id: "i11",
    name: "Pão francês",
    brand: "Padaria do Bairro",
    qty: "2 sacos",
    validity: "21/05",
    temp: "Quantidade: 80un",
    lot: "Lote 22019",
  },
  {
    id: "i12",
    name: "Manteiga sem sal",
    brand: "Aviação",
    qty: "6 unidades (200g)",
    validity: "15/06",
    temp: "Temperatura: 6°C",
    lot: "Lote 77501",
  },
];

const ACTIONS = {
  APROVAR: "aprovar",
  REJEITAR: "rejeitar",
  REVER: "rever",
  SKIP: "skip",
};

const ACTION_LABELS = {
  [ACTIONS.APROVAR]: "aprovado",
  [ACTIONS.REJEITAR]: "rejeitado",
  [ACTIONS.REVER]: "marcado para rever",
  [ACTIONS.SKIP]: "pulado",
};

const GROUP_LABELS = {
  [ACTIONS.APROVAR]: "Aprovados",
  [ACTIONS.REJEITAR]: "Rejeitados",
  [ACTIONS.REVER]: "Para rever",
  [ACTIONS.SKIP]: "Pulados",
};

const GROUP_ORDER = [
  ACTIONS.APROVAR,
  ACTIONS.REJEITAR,
  ACTIONS.REVER,
  ACTIONS.SKIP,
];

const CARD_ANIMATION_DURATION = 280;
const TOAST_DURATION_SECONDS = 8;

const escapeHtml = (value) => {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value).replace(/[&<>"']/g, (char) => entities[char]);
};

class DecisionStore {
  constructor() {
    this.decisions = new Map();
  }

  record(itemId, action) {
    const previous = this.decisions.get(itemId) ?? null;
    this.decisions.set(itemId, { action, timestamp: Date.now() });
    return previous;
  }

  restore(itemId, previousDecision) {
    if (previousDecision) {
      this.decisions.set(itemId, previousDecision);
    } else {
      this.decisions.delete(itemId);
    }
  }

  get(itemId) {
    return this.decisions.get(itemId) ?? null;
  }

  get size() {
    return this.decisions.size;
  }

  getDecidedWithItems(items) {
    return items
      .filter((item) => this.decisions.has(item.id))
      .map((item) => ({ item, decision: this.decisions.get(item.id) }));
  }

  groupByAction(items) {
    const groups = Object.fromEntries(
      GROUP_ORDER.map((action) => [action, []]),
    );
    this.getDecidedWithItems(items).forEach(({ item, decision }) => {
      if (groups[decision.action]) {
        groups[decision.action].push({ item, decision });
      }
    });
    return groups;
  }
}

class ToastController {
  constructor({ toastEl, strongEl, timerEl, undoBtn }) {
    this.toastEl = toastEl;
    this.strongEl = strongEl;
    this.timerEl = timerEl;
    this.undoBtn = undoBtn;
    this.hideTimeoutId = null;
    this.countdownIntervalId = null;
    this.onUndoCallback = null;

    this.undoBtn.addEventListener("click", () => {
      if (this.onUndoCallback) {
        this.onUndoCallback();
      }
    });
  }

  show({ item, action, onUndo }) {
    this.clear();
    this.onUndoCallback = onUndo;

    this.strongEl.textContent = `${item.name} — ${ACTION_LABELS[action]}`;

    let remaining = TOAST_DURATION_SECONDS;
    this.timerEl.textContent = `desfaz em ${remaining}s`;
    this.toastEl.classList.add("toast--visible");

    this.countdownIntervalId = window.setInterval(() => {
      remaining -= 1;
      this.timerEl.textContent = `desfaz em ${remaining}s`;
    }, 1000);

    this.hideTimeoutId = window.setTimeout(
      () => this.clear(),
      TOAST_DURATION_SECONDS * 1000,
    );
  }

  clear() {
    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
    if (this.countdownIntervalId !== null) {
      window.clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.toastEl.classList.remove("toast--visible");
    this.onUndoCallback = null;
  }
}

class DrawerController {
  constructor({ drawerEl, backdropEl, closeBtn, bodyEl, onActionChange }) {
    this.drawerEl = drawerEl;
    this.backdropEl = backdropEl;
    this.bodyEl = bodyEl;
    this.onActionChange = onActionChange;
    this.isOpen = false;

    closeBtn.addEventListener("click", () => this.close());
    this.backdropEl.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen) {
        this.close();
      }
    });
  }

  open(groupedDecisions) {
    this.isOpen = true;
    this.render(groupedDecisions);
    this.drawerEl.classList.add("drawer--visible");
    this.drawerEl.setAttribute("aria-hidden", "false");
    this.backdropEl.classList.add("drawer-backdrop--visible");
  }

  close() {
    this.isOpen = false;
    this.drawerEl.classList.remove("drawer--visible");
    this.drawerEl.setAttribute("aria-hidden", "true");
    this.backdropEl.classList.remove("drawer-backdrop--visible");
  }

  refresh(groupedDecisions) {
    if (this.isOpen) {
      this.render(groupedDecisions);
    }
  }

  render(groupedDecisions) {
    const totalDecided = Object.values(groupedDecisions).reduce(
      (sum, list) => sum + list.length,
      0,
    );

    if (totalDecided === 0) {
      this.bodyEl.innerHTML = `
        <div class="drawer__empty">
          Nenhum item decidido ainda.<br>
          Aprove, rejeite ou marque para rever para ver a lista aqui.
        </div>
      `;
      return;
    }

    const groupsHtml = GROUP_ORDER.filter(
      (action) => groupedDecisions[action].length > 0,
    )
      .map((action) => this.renderGroup(action, groupedDecisions[action]))
      .join("");

    this.bodyEl.innerHTML = groupsHtml;

    this.bodyEl.querySelectorAll(".mini-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const itemId = button.dataset.item;
        const newAction = button.dataset.action;
        this.onActionChange(itemId, newAction);
      });
    });
  }

  renderGroup(action, entries) {
    const groupTitle = GROUP_LABELS[action];
    const itemsHtml = entries
      .map(({ item, decision }) => this.renderDecidedItem(item, decision))
      .join("");

    return `
      <section class="group">
        <h3 class="group__title">${groupTitle} · ${entries.length}</h3>
        ${itemsHtml}
      </section>
    `;
  }

  renderDecidedItem(item, decision) {
    const buttons = [ACTIONS.APROVAR, ACTIONS.REJEITAR, ACTIONS.REVER]
      .map((action) => {
        const label = {
          [ACTIONS.APROVAR]: "Aprovar",
          [ACTIONS.REJEITAR]: "Rejeitar",
          [ACTIONS.REVER]: "Rever",
        }[action];
        const activeClass =
          decision.action === action ? " mini-btn--active" : "";
        return `<button class="mini-btn${activeClass}" data-item="${item.id}" data-action="${action}">${label}</button>`;
      })
      .join("");

    return `
      <div class="decided-item">
        <span class="decided-item__name">${escapeHtml(item.name)}</span>
        <div class="decided-item__actions">${buttons}</div>
      </div>
    `;
  }
}

class CardRenderer {
  constructor(arenaEl) {
    this.arenaEl = arenaEl;
  }

  renderItem(item, { onSkip, onRever }) {
    const cardEl = document.createElement("article");
    cardEl.className = "card";
    cardEl.innerHTML = this.buildItemHtml(item);
    this.arenaEl.replaceChildren(cardEl);

    cardEl.querySelector("[data-skip]")?.addEventListener("click", onSkip);
    cardEl.querySelector("[data-rever]")?.addEventListener("click", onRever);

    return cardEl;
  }

  renderEmpty(totalItems) {
    this.arenaEl.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Conferência concluída</p>
        <p class="empty-state__sub">Os ${totalItems} itens foram decididos.</p>
      </div>
    `;
  }

  getCurrentCard() {
    return this.arenaEl.querySelector(".card");
  }

  buildItemHtml(item) {
    const brandFirstWord = item.brand.split(" ")[0];

    return `
      <div class="card__photo-row">
        <div class="card__photo">
          <div class="card__photo-inner">
            <div class="card__photo-label">${escapeHtml(brandFirstWord)}</div>
            <div class="card__photo-line"></div>
            <div class="card__photo-line"></div>
            <div class="card__photo-stripe"></div>
          </div>
        </div>
        <button class="card__skip" data-skip>Pular</button>
      </div>
      <h2 class="card__name">${escapeHtml(item.name)}</h2>
      <div class="card__meta">
        <strong>Marca:</strong> ${escapeHtml(item.brand)}<br>
        <strong>Quantidade:</strong> ${escapeHtml(item.qty)}<br>
        <strong>Validade:</strong> ${escapeHtml(item.validity)}
      </div>
      <div class="card__meta card__meta--soft">
        ${escapeHtml(item.temp)}<br>
        ${escapeHtml(item.lot)}
      </div>
      <div class="card__rever">
        <button class="card__rever-btn" data-rever>Rever item</button>
      </div>
    `;
  }
}

class App {
  constructor() {
    this.items = ITEMS;
    this.currentIndex = 2;
    this.store = new DecisionStore();

    this.cardRenderer = new CardRenderer(document.getElementById("card-arena"));

    this.toast = new ToastController({
      toastEl: document.getElementById("toast"),
      strongEl: document.getElementById("toast-strong"),
      timerEl: document.getElementById("toast-timer"),
      undoBtn: document.getElementById("toast-undo"),
    });

    this.drawer = new DrawerController({
      drawerEl: document.getElementById("drawer"),
      backdropEl: document.getElementById("drawer-backdrop"),
      closeBtn: document.getElementById("drawer-close"),
      bodyEl: document.getElementById("drawer-body"),
      onActionChange: (itemId, newAction) =>
        this.changeDecision(itemId, newAction),
    });

    this.progressFill = document.getElementById("progress-fill");
    this.progressBar = document.getElementById("progress-bar");
    this.counterText = document.getElementById("counter-text");

    this.seedInitialDecisions();
    this.attachGlobalListeners();
    this.render();
  }

  seedInitialDecisions() {
    this.store.record("i1", ACTIONS.APROVAR);
    this.store.record("i2", ACTIONS.APROVAR);
  }

  attachGlobalListeners() {
    document
      .getElementById("btn-approve")
      .addEventListener("click", () => this.handleDecision(ACTIONS.APROVAR));
    document
      .getElementById("btn-reject")
      .addEventListener("click", () => this.handleDecision(ACTIONS.REJEITAR));
    document
      .getElementById("counter")
      .addEventListener("click", () => this.openDrawer());
  }

  handleDecision(action) {
    const item = this.items[this.currentIndex];
    if (!item) {
      return;
    }

    const cardEl = this.cardRenderer.getCurrentCard();
    if (!cardEl) {
      return;
    }

    const snapshot = {
      index: this.currentIndex,
      itemId: item.id,
      previousDecision: this.store.get(item.id),
    };

    this.applyExitAnimation(cardEl, action);
    this.store.record(item.id, action);

    window.setTimeout(
      () => this.advanceAfterDecision(snapshot, action),
      CARD_ANIMATION_DURATION,
    );
  }

  applyExitAnimation(cardEl, action) {
    const animationClass = {
      [ACTIONS.APROVAR]: "card--leaving-right",
      [ACTIONS.REJEITAR]: "card--leaving-left",
      [ACTIONS.REVER]: "card--leaving-up",
      [ACTIONS.SKIP]: "card--leaving-up",
    }[action];

    if (animationClass) {
      cardEl.classList.add(animationClass);
    }
  }

  advanceAfterDecision(snapshot, action) {
    const nextIndex = this.findNextUndecidedIndex(
      this.currentIndex + 1,
      snapshot.index,
    );
    this.currentIndex = nextIndex === -1 ? this.items.length : nextIndex;
    this.render();

    if (action !== ACTIONS.SKIP) {
      const item = this.items.find((i) => i.id === snapshot.itemId);
      this.toast.show({
        item,
        action,
        onUndo: () => this.undo(snapshot),
      });
    }
  }

  findNextUndecidedIndex(startFrom, excludeIndex) {
    for (let i = startFrom; i < this.items.length; i += 1) {
      if (i !== excludeIndex && !this.store.get(this.items[i].id)) {
        return i;
      }
    }
    for (let i = 0; i < startFrom; i += 1) {
      if (i !== excludeIndex && !this.store.get(this.items[i].id)) {
        return i;
      }
    }
    return -1;
  }

  undo(snapshot) {
    this.store.restore(snapshot.itemId, snapshot.previousDecision);
    this.currentIndex = snapshot.index;
    this.toast.clear();
    this.render();
    this.drawer.refresh(this.store.groupByAction(this.items));
  }

  changeDecision(itemId, newAction) {
    this.store.record(itemId, newAction);
    this.updateProgress();
    this.drawer.refresh(this.store.groupByAction(this.items));
  }

  openDrawer() {
    this.drawer.open(this.store.groupByAction(this.items));
  }

  render() {
    const item = this.items[this.currentIndex];

    if (!item) {
      this.cardRenderer.renderEmpty(this.items.length);
    } else {
      this.cardRenderer.renderItem(item, {
        onSkip: () => this.handleDecision(ACTIONS.SKIP),
        onRever: () => this.handleDecision(ACTIONS.REVER),
      });
    }

    this.updateProgress();
  }

  updateProgress() {
    const decidedCount = this.store.size;
    const totalCount = this.items.length;
    const percentage = (decidedCount / totalCount) * 100;

    this.progressFill.style.width = `${percentage}%`;
    this.progressBar.setAttribute(
      "aria-valuenow",
      String(Math.round(percentage)),
    );
    this.counterText.textContent = `${decidedCount} de ${totalCount} itens`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
