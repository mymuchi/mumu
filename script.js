"use strict";

const storyStages = [
  {
    eyebrow: "Muchi",
    title: "You came into my life gently and changed the whole meaning of it.",
    body: "Since knowing you, even ordinary days have felt softer, warmer and more alive.",
    imageKey: "opening",
    actionLabel: "Keep going..."
  },
  {
    eyebrow: "A little closer",
    title: "In your voice, I found a peace I did not know I needed.",
    body: "There is a softness in you that opened something in me and showed me how deeply I could care about you.",
    imageKey: "closer",
    actionLabel: "Still with me?"
  },
  {
    eyebrow: "What became clear",
    title: "The more I knew you, the more I felt that you were Allah's mercy to me.",
    body: "Our goals, our values and the way we hoped to live matched so naturally that I could no longer see it as coincidence, but as taqdir.",
    imageKey: "future",
    actionLabel: "One more thing!"
  }
];

const proposalStage = {
  eyebrow: "What became certain",
  title: "Muchinam, will you marry me?",
  body: "With you, my heart found peace, certainty and a future it could finally see. I want my life with you.",
  imageKey: "proposal"
};

const noStages = [
  {
    eyebrow: "Then let me ask again",
    note: "Maybe that answer needs one gentler question.",
    body: "So let me ask you again, a little more softly.",
    primaryLabel: "Yes, because it is you",
    secondaryLabel: "Ask again"
  },
  {
    eyebrow: "A gentler try",
    note: "I had a feeling your heart might need another sweet little moment.",
    body: "Good thing I came prepared.",
    primaryLabel: "Yes, maybe",
    secondaryLabel: "One more try"
  },
  {
    eyebrow: "There you are",
    note: "That no felt a little shy. I think your yes was just taking its time.",
    body: "And now it has found its way back.",
    primaryLabel: "Yes",
    secondaryLabel: "Yes and yes",
    secondaryAccepts: true
  }
];

const celebrationStage = {
  eyebrow: "Alhamdulillah!",
  title: "You just made my heart whole.",
  body: "By Allah's mercy, you have made this the happiest Yes my heart could ever hold. I want to spend my life loving you with care, sincerity and gratitude.",
  note: "You gave my heart its answer. Now let us begin the life we were meant to share.",
  imageKey: "celebration"
};

const mediaMap = {
  opening: "./assets/images/page-01-opening.jpg",
  closer: "./assets/images/page-02-evening.jpg",
  future: "./assets/images/page-03-future.jpg",
  proposal: "./assets/images/page-04-proposal.jpg",
  celebration: "./assets/images/page-05-celebration.jpg"
};

const state = {
  stageIndex: 0,
  noStage: 0,
  celebrating: false
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(pointer: coarse)");
const compactViewport = window.matchMedia("(max-width: 47.99rem)");
const failedImages = new Set();

const pageShell = document.querySelector(".page-shell");
const storyCard = document.getElementById("story-card");
const progressDots = document.getElementById("progress-dots");
const topbarMark = document.getElementById("topbar-mark");
const storyVisual = document.getElementById("story-visual");
const storyImage = document.getElementById("story-image");
const storyEyebrow = document.getElementById("story-eyebrow");
const storyTitle = document.getElementById("story-title");
const storyBody = document.getElementById("story-body");
const storyNote = document.getElementById("story-note");
const storyScript = document.getElementById("story-script");
const storyActions = document.getElementById("story-actions");
const tapHint = document.getElementById("tap-hint");
const celebrationLayer = document.getElementById("celebration-layer");
const introGate = document.getElementById("intro-gate");
const introPush = document.getElementById("intro-push");
const introCodeInput = document.getElementById("intro-code");
const backdrops = Array.from(document.querySelectorAll(".backdrop"));
const backdropImages = Array.from(document.querySelectorAll(".backdrop__image"));
const audio = document.getElementById("our-song");
const soundToggle = document.getElementById("sound-toggle");
const audioTracks = {
  story: audio?.dataset.storySrc || audio?.getAttribute("src") || "",
  celebration: audio?.dataset.celebrationSrc || audio?.dataset.storySrc || audio?.getAttribute("src") || ""
};
const audioState = {
  activeTrack: "story",
  autoplayAttempted: false,
  autoplayBlocked: false,
  muted: false,
  userActivated: false,
  pendingReadyRetry: false,
  startAttemptInFlight: false,
  pausedForVisibility: false
};
const gateState = {
  active: Boolean(introGate && introPush),
  unlocking: false
};
const INTRO_GATE_CODE = "01032026";

function forEachAudioGestureTarget(callback) {
  [window, document, pageShell, storyCard, storyActions, topbarMark, soundToggle, introPush].forEach((target) => {
    if (target && typeof target.addEventListener === "function") {
      callback(target);
    }
  });
}

function removeGestureAutoplay() {
  forEachAudioGestureTarget((target) => {
    target.removeEventListener("pointerdown", resumeAudioOnFirstGesture, true);
    target.removeEventListener("touchstart", resumeAudioOnFirstGesture, true);
    target.removeEventListener("click", resumeAudioOnFirstGesture, true);
    target.removeEventListener("keydown", resumeAudioOnFirstGesture, true);
  });
}

async function playCurrentAudio(options = {}) {
  if (!audio) {
    return false;
  }

  const { restart = false } = options;

  audio.loop = true;
  audio.muted = audioState.muted;

  if (restart) {
    try {
      audio.currentTime = 0;
    } catch (_error) {}
  }

  try {
    await audio.play();
    audioState.autoplayBlocked = false;
    removeGestureAutoplay();
    return true;
  } catch (_error) {
    audioState.autoplayBlocked = true;
    return false;
  }
}

function setAudioTrack(trackKey) {
  if (!audio) {
    return false;
  }

  const source = audioTracks[trackKey];

  if (!source) {
    return false;
  }

  const hasChanged = audio.dataset.track !== trackKey || audio.getAttribute("src") !== source;

  audio.loop = true;
  audio.muted = audioState.muted;
  audioState.activeTrack = trackKey;

  if (hasChanged) {
    audio.pause();
    audio.dataset.track = trackKey;
    audio.src = source;
    audio.load();
  }

  return hasChanged;
}

async function activateAudioTrack(trackKey, options = {}) {
  const { restart = false } = options;
  const hasChanged = setAudioTrack(trackKey);

  return playCurrentAudio({ restart: restart && !hasChanged });
}

function scheduleAudioReadyRetry() {
  if (!audio || audioState.pendingReadyRetry) {
    return;
  }

  audioState.pendingReadyRetry = true;

  const retryPlayback = async () => {
    if (!audio) {
      return;
    }

    audio.removeEventListener("loadeddata", retryPlayback);
    audio.removeEventListener("canplay", retryPlayback);
    audio.removeEventListener("canplaythrough", retryPlayback);
    audioState.pendingReadyRetry = false;

    if (!audioState.userActivated || !audio.paused) {
      return;
    }

    await activateAudioTrack(audioState.activeTrack);
  };

  audio.addEventListener("loadeddata", retryPlayback);
  audio.addEventListener("canplay", retryPlayback);
  audio.addEventListener("canplaythrough", retryPlayback);
}

async function resumeAudioOnFirstGesture(options = {}) {
  const { force = false } = options;
  if (!audio) {
    return;
  }

  if (gateState.active && !force) {
    return;
  }

  audioState.userActivated = true;

  if (!audio.paused) {
    return;
  }

  if (audioState.startAttemptInFlight) {
    return;
  }

  audioState.autoplayAttempted = true;
  audioState.startAttemptInFlight = true;

  try {
    const shouldSwitchTrack = audio.dataset.track !== audioState.activeTrack;
    const hasStarted = shouldSwitchTrack
      ? await activateAudioTrack(audioState.activeTrack)
      : await playCurrentAudio();

    if (!hasStarted && audio.paused) {
      scheduleAudioReadyRetry();
    }
  } finally {
    audioState.startAttemptInFlight = false;
  }
}

function updateSoundToggleUi() {
  if (!soundToggle || !audio) {
    return;
  }

  const isMuted = audio.muted;
  soundToggle.dataset.muted = String(isMuted);
  soundToggle.setAttribute("aria-pressed", String(isMuted));
  soundToggle.setAttribute("aria-label", isMuted ? "Turn sound on" : "Turn sound off");
}

async function toggleSoundMuted() {
  if (!audio) {
    return;
  }

  audioState.muted = !audioState.muted;
  audio.muted = audioState.muted;
  updateSoundToggleUi();

  if (!audioState.muted && audio.paused) {
    await resumeAudioOnFirstGesture();
  }
}

async function syncAudioWithVisibility() {
  if (!audio) {
    return;
  }

  if (document.hidden) {
    if (!audio.paused) {
      audioState.pausedForVisibility = true;
      audio.pause();
    }
    return;
  }

  if (!audioState.pausedForVisibility) {
    return;
  }

  audioState.pausedForVisibility = false;

  if (!audioState.muted && !gateState.active) {
    await playCurrentAudio();
  }
}

function completeExperienceEntry() {
  gateState.active = false;
  gateState.unlocking = false;

  if (introCodeInput) {
    introCodeInput.disabled = false;
  }

  if (introPush) {
    introPush.disabled = false;
    introPush.removeAttribute("aria-busy");
  }

  if (introGate) {
    introGate.setAttribute("aria-hidden", "true");
  }

  pageShell?.classList.remove("is-gated", "is-unlocking");
  storyCard?.focus({ preventScroll: true });
}

function normalizeIntroCode(value) {
  return value.replace(/\D+/g, "").slice(0, 8);
}

async function handleIntroGateSubmit() {
  if (!gateState.active || gateState.unlocking) {
    return;
  }

  const enteredCode = normalizeIntroCode(introCodeInput?.value || "");

  if (enteredCode !== INTRO_GATE_CODE) {
    if (introCodeInput) {
      introCodeInput.value = "";
      introCodeInput.focus({ preventScroll: true });
    }
    return;
  }

  await enterExperience();
}

async function enterExperience() {
  if (!gateState.active || gateState.unlocking) {
    return;
  }

  gateState.unlocking = true;

  if (introCodeInput) {
    introCodeInput.disabled = true;
  }

  if (introPush) {
    introPush.disabled = true;
    introPush.setAttribute("aria-busy", "true");
  }

  await resumeAudioOnFirstGesture({ force: true });

  if (reduceMotion.matches) {
    completeExperienceEntry();
    return;
  }

  pageShell?.classList.add("is-unlocking");
  window.setTimeout(completeExperienceEntry, 620);
}

function getCelebrationProfile() {
  const useLiteProfile = coarsePointer.matches || compactViewport.matches;

  return {
    useLiteProfile,
    count: useLiteProfile ? 16 : 30,
    size: useLiteProfile ? 28 : 35,
    depthSpread: useLiteProfile ? 220 : 400,
    driftBase: useLiteProfile ? 24 : 42,
    driftRange: useLiteProfile ? 18 : 34,
    rotateZMax: useLiteProfile ? 110 : 180,
    rotateXMax: useLiteProfile ? 0 : 360,
    rotateYMax: useLiteProfile ? 0 : 360,
    rotateLiteMax: useLiteProfile ? 120 : 0
  };
}

function createProgressDots() {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 4; index += 1) {
    const dot = document.createElement("span");
    if (index === 0) {
      dot.classList.add("is-active");
    }
    fragment.appendChild(dot);
  }

  progressDots.appendChild(fragment);
}

function updateProgress() {
  const dots = progressDots.querySelectorAll("span");
  const activeIndex = state.celebrating ? 3 : Math.min(state.stageIndex, 3);

  dots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activeIndex);
  });
}

function setBackdrop(imageKey) {
  backdrops.forEach((backdrop) => {
    backdrop.classList.toggle("is-active", backdrop.dataset.backdrop === imageKey);
  });
}

function updateStoryImage(imageKey) {
  const source = mediaMap[imageKey];

  storyVisual.dataset.image = imageKey;

  if (!source || failedImages.has(source)) {
    storyVisual.classList.add("is-fallback");
    storyImage.removeAttribute("src");
    return;
  }

  storyVisual.classList.remove("is-fallback");

  if (storyImage.getAttribute("src") !== source) {
    storyImage.src = source;
  }
}

function buildButton(label, variant, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `story-button story-button--${variant}`;
  button.textContent = label;
  button.dataset.action = action;
  return button;
}

function renderActions() {
  storyActions.innerHTML = "";
  storyActions.hidden = false;

  if (state.celebrating) {
    storyActions.hidden = true;
    return;
  }

  if (state.stageIndex < storyStages.length) {
    storyActions.appendChild(buildButton(storyStages[state.stageIndex].actionLabel, "primary", "next"));
    return;
  }

  const row = document.createElement("div");
  row.className = "button-row";

  if (state.noStage === 0) {
    row.appendChild(buildButton("Yes", "primary", "accept"));
    row.appendChild(buildButton("No", "secondary", "soft-no"));
  } else {
    const activeNoStage = noStages[state.noStage - 1];
    row.appendChild(buildButton(activeNoStage.primaryLabel, "primary", "accept"));
    row.appendChild(buildButton(activeNoStage.secondaryLabel, "secondary", "soft-no"));
  }

  storyActions.appendChild(row);
}

function canGoBackOnePage() {
  if (state.celebrating) {
    return true;
  }

  if (state.stageIndex >= storyStages.length && state.noStage > 0) {
    return true;
  }

  return state.stageIndex > 0;
}

function updateStoryVisualState() {
  const canGoBack = canGoBackOnePage();

  if (storyVisual) {
    storyVisual.disabled = true;
    storyVisual.setAttribute("aria-label", "Story image");
  }

  if (topbarMark) {
    topbarMark.disabled = !canGoBack;
    topbarMark.setAttribute(
      "aria-label",
      canGoBack ? "Go to the previous page" : "For My Person"
    );
  }
}

function renderStory() {
  const activeStory = storyStages[state.stageIndex];

  storyCard.dataset.mode = "story";
  storyCard.dataset.noStage = "0";
  storyEyebrow.textContent = activeStory.eyebrow;
  storyTitle.textContent = activeStory.title;
  storyBody.textContent = activeStory.body;
  storyNote.hidden = true;
  storyScript.hidden = true;
  storyNote.textContent = "";
  storyScript.textContent = "";
  tapHint.classList.add("is-hidden");
  tapHint.textContent = "";

  updateStoryImage(activeStory.imageKey);
  setBackdrop(activeStory.imageKey);
  renderActions();
}

function renderProposal() {
  const activeNoStage = state.noStage > 0 ? noStages[state.noStage - 1] : null;

  storyCard.dataset.mode = "proposal";
  storyCard.dataset.noStage = String(state.noStage);
  storyEyebrow.textContent = activeNoStage ? activeNoStage.eyebrow : proposalStage.eyebrow;
  storyTitle.textContent = proposalStage.title;
  storyBody.textContent = activeNoStage ? activeNoStage.body : proposalStage.body;
  storyNote.hidden = !activeNoStage;
  storyNote.textContent = activeNoStage ? activeNoStage.note : "";
  storyScript.hidden = true;
  storyScript.textContent = "";
  tapHint.classList.toggle("is-hidden", state.noStage > 0);
  tapHint.textContent = state.noStage > 0 ? "" : "Take your time.";

  updateStoryImage(proposalStage.imageKey);
  setBackdrop(proposalStage.imageKey);
  renderActions();
}

function renderCelebration() {
  storyCard.dataset.mode = "celebration";
  storyCard.dataset.noStage = String(state.noStage);
  storyEyebrow.textContent = celebrationStage.eyebrow;
  storyTitle.textContent = celebrationStage.title;
  storyBody.textContent = celebrationStage.body;
  storyNote.hidden = true;
  storyNote.textContent = "";
  storyScript.hidden = false;
  storyScript.textContent = celebrationStage.note;
  tapHint.classList.add("is-hidden");
  tapHint.textContent = "";

  updateStoryImage(celebrationStage.imageKey);
  setBackdrop(celebrationStage.imageKey);
  renderActions();
}

function render() {
  updateProgress();

  if (state.celebrating) {
    renderCelebration();
    updateStoryVisualState();
    return;
  }

  if (state.stageIndex < storyStages.length) {
    renderStory();
    updateStoryVisualState();
    return;
  }

  renderProposal();
  updateStoryVisualState();
}

function moveToNextStage() {
  if (!state.celebrating && state.stageIndex < storyStages.length) {
    state.stageIndex += 1;
    render();
  }
}

function createCelebrationParticles(count = null) {
  celebrationLayer.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const profile = getCelebrationProfile();
  const particleCount = count ?? profile.count;
  const size = profile.size;
  const edgePadding = Math.max(24, Math.round(width * 0.04));
  const safeWidth = Math.max(size, width - edgePadding * 2 - size);

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    const drift = document.createElement("span");
    const shape = document.createElement("span");
    const depth = -(profile.depthSpread / 2) + Math.random() * profile.depthSpread;
    const fallDuration = 6 + Math.random() * 9;
    const swayDuration = profile.useLiteProfile ? 5 + Math.random() * 3 : 4 + Math.random() * 4;
    const spinDuration = profile.useLiteProfile ? 3.2 + Math.random() * 3.4 : 2 + Math.random() * 6;
    const originX = edgePadding + Math.random() * safeWidth;
    const preferredDrift =
      (Math.random() < 0.5 ? -1 : 1) *
      (profile.driftBase + Math.random() * profile.driftRange);
    const maxLeftDrift = -(originX - edgePadding);
    const maxRightDrift = width - edgePadding - size - originX;
    const driftX = Math.max(maxLeftDrift, Math.min(maxRightDrift, preferredDrift));

    particle.className = profile.useLiteProfile ? "petal petal--lite" : "petal";
    drift.className = "petal__drift";
    shape.className = "petal__shape";

    particle.style.setProperty("--size", `${size}px`);
    particle.style.setProperty("--origin-x", `${originX.toFixed(1)}px`);
    particle.style.setProperty("--origin-y", `${(-200 + Math.random() * 50).toFixed(1)}px`);
    particle.style.setProperty("--origin-z", `${depth.toFixed(0)}px`);
    particle.style.setProperty("--viewport-height", `${height}px`);
    particle.style.setProperty("--fall-duration", `${fallDuration.toFixed(2)}s`);
    particle.style.setProperty("--fall-delay", "-15s");
    particle.style.setProperty("--drift-x", `${driftX.toFixed(1)}px`);
    particle.style.setProperty("--petal-layer", depth > 100 ? "4" : depth > -40 ? "3" : "2");
    particle.style.setProperty("--sway-duration", `${swayDuration.toFixed(2)}s`);
    particle.style.setProperty("--spin-duration", `${spinDuration.toFixed(2)}s`);
    particle.style.setProperty("--spin-delay", "-5s");
    particle.style.setProperty("--rotate-z-end", `${(Math.random() * profile.rotateZMax).toFixed(0)}deg`);
    particle.style.setProperty("--rotate-x-end", `${(Math.random() * profile.rotateXMax).toFixed(0)}deg`);
    particle.style.setProperty("--rotate-y-end", `${(Math.random() * profile.rotateYMax).toFixed(0)}deg`);
    particle.style.setProperty("--rotate-lite-end", `${(Math.random() * profile.rotateLiteMax).toFixed(0)}deg`);

    drift.appendChild(shape);
    particle.appendChild(drift);
    fragment.appendChild(particle);
  }

  celebrationLayer.appendChild(fragment);
}

function beginCelebration() {
  state.celebrating = true;
  pageShell.classList.add("is-celebrating");
  render();
  void activateAudioTrack("celebration", { restart: true });

  if (!reduceMotion.matches) {
    createCelebrationParticles();
  }
}

function handleSoftNo() {
  if (state.celebrating) {
    return;
  }

  if (state.noStage === 0) {
    state.noStage = 1;
    render();
    return;
  }

  const activeNoStage = noStages[state.noStage - 1];

  if (activeNoStage.secondaryAccepts) {
    beginCelebration();
    return;
  }

  state.noStage = Math.min(state.noStage + 1, noStages.length);
  render();
}

function resetExperience() {
  state.stageIndex = 0;
  state.noStage = 0;
  state.celebrating = false;
  pageShell.classList.remove("is-celebrating");
  celebrationLayer.innerHTML = "";
  render();
  void activateAudioTrack("story", { restart: true });
}

function goBackOnePage() {
  if (gateState.active) {
    return;
  }

  if (!canGoBackOnePage()) {
    return;
  }

  if (state.celebrating) {
    state.celebrating = false;
    pageShell.classList.remove("is-celebrating");
    celebrationLayer.innerHTML = "";
    render();
    void activateAudioTrack("story");
    return;
  }

  if (state.stageIndex >= storyStages.length) {
    if (state.noStage > 0) {
      state.noStage -= 1;
    } else {
      state.stageIndex = storyStages.length - 1;
    }

    render();
    return;
  }

  state.stageIndex = Math.max(0, state.stageIndex - 1);
  render();
}

function handleAction(action) {
  if (gateState.active) {
    return;
  }

  void resumeAudioOnFirstGesture();

  switch (action) {
    case "next":
      moveToNextStage();
      break;
    case "accept":
      beginCelebration();
      break;
    case "soft-no":
      handleSoftNo();
      break;
    default:
      break;
  }
}

function handleCardAdvance(event) {
  if (gateState.active || state.celebrating || state.stageIndex >= storyStages.length) {
    return;
  }

  if (event.target.closest("button")) {
    return;
  }

  void resumeAudioOnFirstGesture();
  moveToNextStage();
}

function handleImageError(target) {
  if (!(target instanceof HTMLImageElement)) {
    return;
  }

  const source = target.getAttribute("src");

  if (source) {
    failedImages.add(source);
  }

  const wrapper = target.closest(".story-visual, .backdrop");

  if (wrapper) {
    wrapper.classList.add("is-fallback");
  }
}

function setupImageFallbacks() {
  backdropImages.forEach((image) => {
    image.addEventListener("error", () => handleImageError(image));
  });

  storyImage.addEventListener("error", () => handleImageError(storyImage));
}

function setupAudio() {
  if (!audio) {
    return;
  }

  audioState.muted = false;
  audioState.userActivated = false;
  audioState.pendingReadyRetry = false;
  audioState.startAttemptInFlight = false;
  audioState.pausedForVisibility = false;
  audio.volume = 0.55;
  audio.muted = false;
  audio.loop = true;
  setAudioTrack("story");
  updateSoundToggleUi();

  const attachGestureAutoplay = () => {
    forEachAudioGestureTarget((target) => {
      target.addEventListener("pointerdown", resumeAudioOnFirstGesture, { passive: true, capture: true });
      target.addEventListener("touchstart", resumeAudioOnFirstGesture, { passive: true, capture: true });
      target.addEventListener("click", resumeAudioOnFirstGesture, { passive: true, capture: true });
      target.addEventListener("keydown", resumeAudioOnFirstGesture, true);
    });
  };

  const attemptAutoplay = async () => {
    if (audioState.autoplayAttempted) {
      return;
    }

    audioState.autoplayAttempted = true;
    await activateAudioTrack("story");
  };

  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    void playCurrentAudio();
  });
  audio.addEventListener("volumechange", updateSoundToggleUi);
  document.addEventListener("visibilitychange", () => {
    void syncAudioWithVisibility();
  });
  window.addEventListener("pagehide", () => {
    if (!audio.paused) {
      audioState.pausedForVisibility = true;
      audio.pause();
    }
  });
  attachGestureAutoplay();

  if (!gateState.active) {
    const onReady = () => {
      void attemptAutoplay();
    };

    audio.addEventListener("loadedmetadata", onReady, { once: true });
    audio.addEventListener("canplay", onReady, { once: true });

    if (audio.readyState >= 1) {
      void attemptAutoplay();
    }
  }
}

function setupEvents() {
  storyActions.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    handleAction(target.dataset.action);
  });

  storyCard.addEventListener("click", handleCardAdvance);
  if (topbarMark) {
    topbarMark.addEventListener("click", goBackOnePage);
  }

  if (soundToggle) {
    soundToggle.addEventListener("click", (event) => {
      event.preventDefault();
      void toggleSoundMuted();
    });
  }

  if (introCodeInput) {
    introCodeInput.addEventListener("input", () => {
      const normalized = normalizeIntroCode(introCodeInput.value);

      if (introCodeInput.value !== normalized) {
        introCodeInput.value = normalized;
      }
    });

    introCodeInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      void handleIntroGateSubmit();
    });
  }

  if (introPush) {
    introPush.addEventListener("click", (event) => {
      event.preventDefault();
      void handleIntroGateSubmit();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    if (
      gateState.active ||
      document.activeElement instanceof HTMLButtonElement ||
      document.activeElement instanceof HTMLInputElement
    ) {
      return;
    }

    if (!state.celebrating && state.stageIndex < storyStages.length) {
      event.preventDefault();
      moveToNextStage();
    }
  });

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) {
      celebrationLayer.innerHTML = "";
    } else if (state.celebrating && celebrationLayer.childElementCount === 0) {
      createCelebrationParticles();
    }
  });
}

function init() {
  createProgressDots();
  setupImageFallbacks();
  setupAudio();
  setupEvents();
  render();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      pageShell?.classList.add("is-ready");
      if (gateState.active) {
        introCodeInput?.focus({ preventScroll: true });
      }
    });
  });
}

init();
