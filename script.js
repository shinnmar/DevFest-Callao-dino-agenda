const EVENT_DATE = "2026-10-24";
const LIMA_ZONE = "America/Lima";
const STORAGE_KEY = "gdg-callao-dino-quest-2026-charlas-v2";

const sessions = [
  {
    start: "09:00",
    end: "10:20",
    title: "Inicio del DevFest Callao 2026",
    speaker: "Equipo organizador",
    category: "Apertura",
  },
  {
    start: "10:20",
    end: "11:00",
    title:
      "Más allá de los interceptores: las fronteras de confianza de Angular HTTP",
    speaker: "Jaime Burgos",
    category: "Web",
  },
  {
    start: "11:00",
    end: "11:40",
    title:
      "From Chatbot to Mentor: Building a Local Socratic Tutor with Gemma 4",
    speaker: "Lesly Zerna",
    category: "IA",
  },
  {
    start: "11:40",
    end: "12:40",
    title:
      "Fine-Tuning Gemma for Fact Retrieval: A MeMo-Based Approach to Next-Gen RAG",
    speaker: "Pedro Lara",
    category: "IA",
  },
  {
    start: "12:40",
    end: "13:20",
    title:
      "Más Allá del Prompt: Harness Engineering para Angular en la Era de los Agentes",
    speaker: "Ricardo Chavarría",
    category: "Web",
  },
  {
    start: "13:30",
    end: "14:45",
    title: "Almuerzo (60 min)",
    speaker: "Receso general",
    category: "Receso",
  },
  {
    start: "14:45",
    end: "15:15",
    title: "¿Y si tu interfaz fuera un juego? CSS y JavaScript en acción",
    speaker: "Shirley Ramos Martínez",
    category: "Web UI & diseño",
  },

  {
    start: "15:15",
    end: "15:55",
    title: "Potencia tu proceso de creación de diseños con Canva IA",
    speaker: "Candy Risco & Dul Ramírez",
    category: "Diseño",
  },
  {
    start: "15:55",
    end: "16:35",
    title: "Ingeniería de Flutter en la era de la IA",
    speaker: "Lesly Samaritano",
    category: "Mobile",
  },
  {
    start: "16:35",
    end: "17:15",
    title: "Cómo construir Agentes Inteligentes con Google Cloud",
    speaker: "Nicolás Lecaros",
    category: "Cloud",
  },
  {
    start: "17:15",
    end: "17:55",
    title:
      "Deterministic Artifact Driven Architecture: cómo crear código en workflows agénticos",
    speaker: "Henry Medina",
    category: "Arquitectura",
  },
];

const $ = (id) => document.getElementById(id);
const runner = $("runner");
const scene = $("scene");
const modeManual = $("manualMode");
const modeAuto = $("autoMode");
const previousBtn = $("previousBtn");
const nextBtn = $("nextBtn");
const finishBtn = $("finishBtn");
const resetBtn = $("resetBtn");
const agendaList = $("agendaList");

let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
} catch {
  /* storage no disponible */
}
let mode = saved.mode === "manual" ? "manual" : "auto"; // por defecto, seguimiento por hora
let manualIndex = Number.isInteger(saved.index)
  ? Math.max(-1, Math.min(sessions.length - 1, saved.index))
  : -1;
let manualComplete = saved.complete === true;
let shownIndex = -1;
let shownComplete = false;
let walkTimer = null;
let jumpTimer = null;
let lastPointerAt = 0;
let singleTapTimer = null;
let announce = "Seguimiento listo.";

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode, index: manualIndex, complete: manualComplete }),
    );
  } catch {
    /* modo privado */
  }
}

function getLimaNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    clock: `${map.hour}:${map.minute}`,
    time: Number(map.hour) * 60 + Number(map.minute),
    second: map.second,
  };
}
function minutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function isSessionInProgress(session, lima) {
  return (
    lima.date === EVENT_DATE &&
    lima.time >= minutes(session.start) &&
    lima.time < minutes(session.end)
  );
}
function getAutomaticPosition(lima) {
  if (lima.date < EVENT_DATE) return { index: -1, complete: false };
  if (lima.date > EVENT_DATE || lima.time >= minutes(sessions.at(-1).end))
    return { index: sessions.length - 1, complete: true };
  // Mantener el último checkpoint durante un intervalo sin sesión (p. ej., 13:00–13:10).
  const index = sessions.findLastIndex((s) => lima.time >= minutes(s.start));
  return { index, complete: false }; // -1 antes de 09:20
}
function currentPosition(lima) {
  return mode === "auto"
    ? getAutomaticPosition(lima)
    : { index: manualIndex, complete: manualComplete };
}
function formatSpan(s) {
  return `${s.start} – ${s.end}`;
}
function getPositionPercent(index, complete) {
  if (complete) return 86.5; // Se acerca al letrero DEVFEST
  if (index < 0) return 4.5;
  return 4.5 + ((index + 1) / sessions.length) * 78;
}

// checkpoints decorativos
const checkpointData = [
  { x: 14, label: "WEB", at: 0 },
  { x: 29, label: "IA", at: 2 },
  { x: 44, label: "UI", at: 3 },
  { x: 62, label: "DISEÑO", at: 6 },
  { x: 76, label: "CLOUD", at: 8 },
];
function createCheckpoints() {
  const host = $("sceneMarkers");
  host.replaceChildren();
  checkpointData.forEach(({ x, label, at }) => {
    const mark = document.createElement("div");
    mark.className = "checkpoint";
    mark.style.setProperty("--marker-x", `${x}%`);
    mark.dataset.at = String(at);
    mark.innerHTML =
      '<span></span><i class="checkpoint-flag"></i><i class="checkpoint-pole"></i>';
    mark.querySelector("span").textContent = label;
    host.append(mark);
  });
}

function renderAgenda(index, complete) {
  // Construir cada elemento con textContent (nunca insertar los títulos en HTML arbitrario).
  agendaList.replaceChildren();
  sessions.forEach((s, i) => {
    const item = document.createElement("article");
    item.className = `agenda-item${i < index || complete ? " completed" : ""}${i === index && !complete ? " active" : ""}`;
    if (i === index && complete) item.classList.remove("active");
    const number = document.createElement("span");
    number.className = "step";
    number.textContent = String(i + 1).padStart(2, "0");
    const info = document.createElement("div");
    info.className = "info";
    const time = document.createElement("span");
    time.className = "time";
    time.textContent = formatSpan(s);
    const heading = document.createElement("h3");
    heading.textContent = s.title;
    const speaker = document.createElement("p");
    speaker.textContent = `${s.speaker} · ${s.category}`;
    const status = document.createElement("span");
    status.className = "activity-status";
    status.textContent =
      complete || i < index
        ? "✓ FINALIZADA"
        : i === index
          ? mode === "auto"
            ? "◷ SEGÚN HORARIO"
            : "● EN CURSO"
          : "○ PENDIENTE";
    info.append(time, heading, speaker, status);
    const button = document.createElement("button");
    button.className = "agenda-action";
    button.type = "button";
    button.textContent =
      i === index && !complete && mode === "manual" ? "En curso" : "▶ Iniciar";
    button.setAttribute("aria-label", `Confirmar inicio: ${s.title}`);
    button.disabled = i === index && !complete && mode === "manual";
    button.addEventListener("click", () => {
      mode = "manual";
      manualIndex = i;
      manualComplete = false;
      announce = `Inicio confirmado manualmente: ${s.title}.`;
      saveState();
      render(true);
    });
    item.append(number, info, button);
    agendaList.append(item);
  });
}

function render(isAction = false) {
  const lima = getLimaNow();
  const { index, complete } = currentPosition(lima);
  const positionChanged = index !== shownIndex || complete !== shownComplete;
  shownIndex = index;
  shownComplete = complete;
  const step = complete ? sessions.length : Math.max(0, index + 1);
  const percent = Math.round((step / sessions.length) * 100);

  $("peruClock").textContent = `LIMA · ${lima.clock}`;
  $("scoreStage").innerHTML = `${step} <small>/ ${sessions.length}</small>`;
  $("scorePercent").textContent = `${percent}%`;
  $("progressText").textContent = `${step} / ${sessions.length} etapas`;
  $("progressFill").style.width = `${percent}%`;
  $("progressTrack").setAttribute("aria-valuenow", String(step));
  $("progressTrack").setAttribute("aria-valuemax", String(sessions.length));
  runner.style.setProperty(
    "--runner-x",
    `${getPositionPercent(index, complete)}%`,
  );
  if (positionChanged && index >= 0) {
    runner.classList.add("walking");
    clearTimeout(walkTimer);
    walkTimer = setTimeout(() => runner.classList.remove("walking"), 1200);
  }
  $("victory").hidden = !complete;
  document
    .querySelectorAll(".checkpoint")
    .forEach((el) =>
      el.classList.toggle("passed", complete || index >= Number(el.dataset.at)),
    );

  if (complete) {
    $("activeStatus").textContent = "★ RECORRIDO COMPLETADO";
    $("activeTitle").textContent = "¡Gracias por ser parte del DevFest!";
    $("activeSpeaker").textContent =
      "Terminó la última charla. ¡Nos vemos en el próximo evento!";
    $("activeTime").textContent = "17:20 · FIN";
    $("activeCategory").textContent = "META";
    $("nextTitle").textContent = "¡Misión completada!";
    $("nextTime").textContent = "DevFest Callao 2026";
  } else if (index === -1) {
    $("activeStatus").textContent = "○ POR COMENZAR";
    $("activeTitle").textContent = "¡Bienvenidos al DevFest!";
    $("activeSpeaker").textContent =
      mode === "auto"
        ? "La primera charla está programada para las 09:20."
        : "Confirma el inicio de la primera charla desde el centro de control.";
    $("activeTime").textContent = "09:20 – 10:20";
    $("activeCategory").textContent = "WEB";
    $("nextTitle").textContent = sessions[0].title;
    $("nextTime").textContent = formatSpan(sessions[0]);
  } else {
    const current = sessions[index];
    const next = sessions[index + 1];
    $("activeStatus").textContent =
      mode === "auto" ? "◷ ACTIVA SEGÚN HORARIO" : "● EN CURSO · CONFIRMADA";
    $("activeTitle").textContent = current.title;
    $("activeSpeaker").textContent = current.speaker;
    $("activeTime").textContent = formatSpan(current);
    $("activeCategory").textContent = current.category.toUpperCase();
    $("nextTitle").textContent = next ? next.title : "Meta DevFest";
    $("nextTime").textContent = next ? formatSpan(next) : "17:20 · FINAL";
  }

  modeManual.classList.toggle("selected", mode === "manual");
  modeAuto.classList.toggle("selected", mode === "auto");
  modeManual.setAttribute("aria-pressed", String(mode === "manual"));
  modeAuto.setAttribute("aria-pressed", String(mode === "auto"));
  $("modeChip").textContent =
    mode === "auto" ? "◷ HORARIO AUTOMÁTICO" : "● CONTROL MANUAL";
  $("modeHelp").textContent =
    mode === "auto"
      ? "Modo automático: usa la hora de Lima y la agenda prevista. No sabe si una charla comenzó realmente."
      : "Modo manual: confirma cada inicio. Así el dino no avanza si una charla se retrasa.";
  previousBtn.disabled = mode === "auto" || (!complete && manualIndex < 0);
  nextBtn.disabled = mode === "auto" || complete;
  finishBtn.disabled =
    mode === "auto" || complete || index < sessions.length - 1;
  nextBtn.textContent =
    index >= sessions.length - 1
      ? "★ Llegar a la meta"
      : "▶ Iniciar siguiente etapa";
  $("syncInfo").textContent =
    mode === "auto"
      ? `Hora de Lima: ${lima.clock} (${lima.date}). Se muestra la sesión prevista; para confirmar el inicio real cambia a Manual.`
      : announce;
  if (isAction || positionChanged) renderAgenda(index, complete);
}

function setManualMode() {
  // Al cambiar desde automático, partimos de la etapa programada actual; se puede corregir con Anterior.
  if (mode === "auto") {
    const schedule = getAutomaticPosition(getLimaNow());
    manualIndex = schedule.index;
    manualComplete = schedule.complete;
  }
  mode = "manual";
  announce =
    "Control manual activo. Verifica la etapa y confirma cada inicio con «Iniciar siguiente etapa».";
  saveState();
  render(true);
}
function setAutoMode() {
  mode = "auto";
  announce = "Seguimiento por horario programado";
  saveState();
  render(true);
}
modeManual.addEventListener("click", setManualMode);
modeAuto.addEventListener("click", setAutoMode);
previousBtn.addEventListener("click", () => {
  if (mode !== "manual") return;
  if (manualComplete) {
    manualComplete = false;
  } else manualIndex = Math.max(-1, manualIndex - 1);
  announce =
    manualIndex < 0
      ? "Volvimos al inicio del recorrido."
      : `Volvimos a: ${sessions[manualIndex].title}.`;
  saveState();
  render(true);
});
nextBtn.addEventListener("click", () => {
  if (mode !== "manual" || manualComplete) return;
  if (manualIndex >= sessions.length - 1) {
    manualComplete = true;
    announce = "¡Final del evento confirmado!";
  } else {
    manualIndex += 1;
    announce = `Inicio confirmado: ${sessions[manualIndex].title}.`;
  }
  saveState();
  render(true);
});
finishBtn.addEventListener("click", () => {
  if (mode !== "manual" || manualIndex < sessions.length - 1) return;
  manualIndex = sessions.length - 1;
  manualComplete = true;
  announce = "¡Se confirmó el cierre del evento!";
  saveState();
  render(true);
});
resetBtn.addEventListener("click", () => {
  runner.classList.add("returning");

  mode = "manual";
  manualIndex = -1;
  manualComplete = false;

  announce = "Demo reiniciada.";
  saveState();
  render(true);

  setTimeout(() => {
    runner.classList.remove("returning");
  }, 4200);
});

// Interacción única en móviles y computadores: Pointer Events funcionan con touch + mouse.
function jumpDino(superJump = false) {
  clearTimeout(jumpTimer);
  runner.classList.remove("jumping", "super-jumping");
  void runner.offsetWidth; // Reinicia @keyframes para permitir saltos repetidos.
  runner.classList.add(superJump ? "super-jumping" : "jumping");
  jumpTimer = setTimeout(
    () => runner.classList.remove("jumping", "super-jumping"),
    superJump ? 920 : 680,
  );
}
scene.addEventListener("pointerup", (event) => {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  const now = performance.now();
  if (now - lastPointerAt <= 310) {
    clearTimeout(singleTapTimer);
    lastPointerAt = 0;
    jumpDino(true);
  } else {
    lastPointerAt = now;
    clearTimeout(singleTapTimer);
    singleTapTimer = setTimeout(() => jumpDino(false), 315);
  }
});
scene.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (!event.repeat) jumpDino(false);
  }
});
scene.addEventListener("dblclick", (event) => event.preventDefault());

createCheckpoints();
$("agendaTotal").textContent = `${sessions.length} ETAPAS`;
$("scoreStage").innerHTML = `0 <small>/ ${sessions.length}</small>`;
render(true);
setInterval(() => render(), 10000);
