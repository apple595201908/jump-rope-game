(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const CROSS_ANGLE = Math.PI * 1.5;
  const JUMP_DURATION = 620;
  const JUMP_HEIGHT = 126;
  const IDEAL_LEAD = JUMP_DURATION / 2;
  const CLEARANCE = 43;
  const STORAGE_BEST = "peipei-rope-best-v1";
  const STORAGE_SOUND = "peipei-rope-sound-v1";
  const TIMINGS = ["GOD!!", "PERFECT!!", "GREAT!", "NICE!", "GOOD", "KUTAR", "POOR"];

  const game = document.querySelector("#game");
  const canvas = document.querySelector("#gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const hud = document.querySelector("#hud");
  const scoreEl = document.querySelector("#score");
  const playBestEl = document.querySelector("#playBest");
  const startBestEl = document.querySelector("#startBest");
  const startScreen = document.querySelector("#startScreen");
  const resultScreen = document.querySelector("#resultScreen");
  const startButton = document.querySelector("#startButton");
  const retryButton = document.querySelector("#retryButton");
  const soundButton = document.querySelector("#soundButton");
  const soundIcon = document.querySelector("#soundIcon");
  const soundText = document.querySelector("#soundText");
  const timingEl = document.querySelector("#timing");
  const readyEl = document.querySelector("#ready");
  const impactEl = document.querySelector("#impact");
  const resultScoreEl = document.querySelector("#resultScore");
  const resultBestEl = document.querySelector("#resultBest");
  const newRecordEl = document.querySelector("#newRecord");
  const statsEl = document.querySelector("#stats");
  const commentEl = document.querySelector("#comment");
  const tapHint = document.querySelector("#tapHint");
  const liveRegion = document.querySelector("#liveRegion");

  const character = new Image();
  character.src = "./assets/character.png";

  let W = 390;
  let H = 844;
  let dpr = 1;
  let state = "START";
  let score = 0;
  let best = readNumber(STORAGE_BEST, 0);
  let soundOn = readString(STORAGE_SOUND, "1") !== "0";
  let stats = makeStats();
  let ropePhase = Math.PI * 0.56;
  let ropeSpeed = TAU * 0.67;
  let ropeTargetSpeed = ropeSpeed;
  let lastFrame = performance.now();
  let lastJumpAt = -Infinity;
  let failStart = 0;
  let failMode = 0;
  let attempt = 0;
  let isNewRecord = false;
  let timers = [];
  let timingTimer = 0;

  function readNumber(key, fallback) {
    try {
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function readString(key, fallback) {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function persist(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Private browsing can reject storage; the game still remains playable.
    }
  }

  function makeStats() {
    return Object.fromEntries(TIMINGS.map((name) => [name, 0]));
  }

  class GameAudio {
    constructor() {
      this.context = null;
    }

    unlock() {
      if (!soundOn) return;
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.context = new AudioContext();
      }
      if (this.context.state === "suspended") this.context.resume();
    }

    tone(frequency, duration = 0.08, type = "square", volume = 0.05, endFrequency = frequency) {
      if (!soundOn) return;
      this.unlock();
      if (!this.context) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    }

    jump() {
      this.tone(430, 0.09, "square", 0.045, 700);
    }

    success(name) {
      if (name === "GOD!!" || name === "PERFECT!!" || name === "KUTAR") {
        this.tone(780, 0.12, "square", 0.045, 1200);
        window.setTimeout(() => this.tone(1180, 0.08, "sine", 0.04, 1500), 55);
      } else {
        this.tone(720, 0.07, "square", 0.035, 900);
      }
    }

    whoosh() {
      if (!soundOn) return;
      this.unlock();
      if (!this.context) return;
      const length = Math.floor(this.context.sampleRate * 0.065);
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = 1300;
      gain.gain.value = 0.055;
      source.connect(filter).connect(gain).connect(this.context.destination);
      source.start();
    }

    fail() {
      this.tone(180, 0.23, "sawtooth", 0.07, 55);
      window.setTimeout(() => this.tone(90, 0.16, "square", 0.055, 45), 70);
    }
  }

  const audio = new GameAudio();

  function updateSoundUI() {
    soundIcon.textContent = soundOn ? "♪" : "×";
    soundText.textContent = soundOn ? "聲音 開" : "聲音 關";
    soundButton.setAttribute("aria-pressed", String(soundOn));
    soundButton.setAttribute("aria-label", soundOn ? "關閉遊戲音效" : "開啟遊戲音效");
  }

  function resize() {
    const rect = game.getBoundingClientRect();
    W = Math.max(280, rect.width);
    H = Math.max(480, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2.25);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
  }

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  }

  function later(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function showReady(text) {
    readyEl.textContent = text;
    readyEl.classList.remove("show");
    void readyEl.offsetWidth;
    readyEl.classList.add("show");
  }

  function hideReady() {
    readyEl.classList.remove("show");
    readyEl.textContent = "";
  }

  function startRun() {
    clearTimers();
    audio.unlock();
    attempt += 1;
    state = "READY";
    score = 0;
    stats = makeStats();
    isNewRecord = false;
    ropePhase = Math.PI * 0.62;
    ropeSpeed = TAU * 0.67;
    ropeTargetSpeed = ropeSpeed;
    lastJumpAt = -Infinity;
    failStart = 0;
    updateScore();
    startScreen.hidden = true;
    resultScreen.hidden = true;
    tapHint.hidden = true;
    hud.classList.add("is-visible");
    hud.setAttribute("aria-hidden", "false");
    timingEl.className = "timing";
    showReady("READY");
    later(() => showReady("GO!"), 420);
    later(() => {
      hideReady();
      state = "PLAYING";
      tapHint.hidden = false;
      liveRegion.textContent = "遊戲開始，點一下畫面跳躍。";
    }, 760);
  }

  function updateScore() {
    scoreEl.textContent = String(score);
    playBestEl.textContent = String(best);
    startBestEl.textContent = String(best);
  }

  function jump(now) {
    if (state !== "PLAYING") return;
    const elapsed = now - lastJumpAt;
    if (elapsed < JUMP_DURATION * 0.88) return;
    lastJumpAt = now;
    audio.jump();
  }

  function jumpLift(atTime) {
    const elapsed = atTime - lastJumpAt;
    if (elapsed < 0 || elapsed > JUMP_DURATION) return 0;
    const t = elapsed / JUMP_DURATION;
    return 4 * JUMP_HEIGHT * t * (1 - t);
  }

  function judgement(lead, lift) {
    const error = Math.abs(lead - IDEAL_LEAD);
    if (lift >= CLEARANCE && lift < CLEARANCE + 7 && error > 160) return "KUTAR";
    if (error <= 25) return "GOD!!";
    if (error <= 50) return "PERFECT!!";
    if (error <= 85) return "GREAT!";
    if (error <= 120) return "NICE!";
    if (error <= 160) return "GOOD";
    return "POOR";
  }

  function showTiming(name) {
    window.clearTimeout(timingTimer);
    timingEl.textContent = name;
    timingEl.className = `timing ${name.replace(/!/g, "").toLowerCase()}`;
    void timingEl.offsetWidth;
    timingEl.classList.add("show");
    timingTimer = window.setTimeout(() => timingEl.classList.remove("show"), 540);
    liveRegion.textContent = `${name}，目前 ${score} 下。`;
  }

  function rotationsPerSecond(count) {
    if (count <= 10) return 0.67 + count * 0.009;
    if (count <= 25) return 0.76 + (count - 10) * 0.0093;
    if (count <= 50) return 0.9 + (count - 25) * 0.006;
    if (count <= 80) return 1.05 + (count - 50) * 0.0057;
    if (count <= 120) return 1.22 + (count - 80) * 0.004;
    return Math.min(1.64, 1.38 + (count - 120) * 0.0022);
  }

  function onRopeCross(eventTime) {
    if (state !== "PLAYING") return;
    audio.whoosh();
    const lift = jumpLift(eventTime);
    if (lift + 0.001 < CLEARANCE) {
      fail();
      return;
    }
    const lead = eventTime - lastJumpAt;
    const name = judgement(lead, lift);
    score += 1;
    stats[name] += 1;
    updateScore();
    showTiming(name);
    audio.success(name);
    const variation = score >= 28 ? 1 + Math.sin(score * 1.71) * 0.025 : 1;
    ropeTargetSpeed = TAU * rotationsPerSecond(score) * variation;
  }

  function fail() {
    if (state !== "PLAYING") return;
    state = "FAIL";
    failStart = performance.now();
    failMode = (score + attempt * 3) % 6;
    tapHint.hidden = true;
    hud.classList.remove("is-visible");
    timingEl.classList.remove("show");
    impactEl.textContent = ["啪！", "咚！", "碰！"][failMode % 3];
    impactEl.classList.remove("show");
    void impactEl.offsetWidth;
    impactEl.classList.add("show");
    game.classList.remove("shake");
    void game.offsetWidth;
    game.classList.add("shake");
    audio.fail();
    if (navigator.vibrate) navigator.vibrate(45);
    if (score > best) {
      best = score;
      isNewRecord = true;
      persist(STORAGE_BEST, best);
    }
    later(showResult, 820);
  }

  const comments = {
    tiny: [
      "你是不是還沒開始？",
      "這局有開始嗎？",
      "繩子才剛熱身。",
      "我看到了，你真的有按。",
      "你的反應速度正在載入中。",
      "再晚一點就可以明天再跳了。"
    ],
    normal: [
      "至少你真的有跳。",
      "你居然輸給一條繩子。",
      "你的腳剛剛在想什麼？",
      "繩子甚至沒有很努力。",
      "這不是失誤，這是表演。",
      "再來一次，這次假裝會跳。"
    ],
    solid: [
      "有點東西，但不多。",
      "剛剛差點以為你會破紀錄。",
      "繩子開始注意到你了。",
      "差一點，其實差很多。",
      "佩佩：我想下班。",
      "你跳的不是繩，是尊嚴。"
    ],
    high: [
      "好啦，這次真的有點強。",
      "繩子剛剛有緊張一下。",
      "繩子都快跟不上你了。",
      "你的鞋子都比你想逃。",
      "繩子表示：就這？",
      "差一點就有那麼一點厲害了。"
    ],
    legend: [
      "你是不是偷偷練過？",
      "繩子要求換人。",
      "這已經不是普通人類的跳繩。",
      "請問你平常都在躲什麼？",
      "你把這條繩子的尊嚴跳沒了。",
      "這條繩子已經記住你了。"
    ]
  };

  function chooseComment() {
    const group = score <= 5 ? comments.tiny : score <= 20 ? comments.normal : score <= 50 ? comments.solid : score <= 100 ? comments.high : comments.legend;
    const line = group[(score * 7 + attempt * 3) % group.length];
    return isNewRecord ? `你真的破了，這次不是意外。\n${line}` : line;
  }

  function showResult() {
    if (state !== "FAIL") return;
    state = "RESULT";
    game.classList.remove("shake");
    resultScoreEl.textContent = String(score);
    resultBestEl.textContent = String(best);
    newRecordEl.hidden = !isNewRecord;
    commentEl.innerText = chooseComment();
    statsEl.innerHTML = TIMINGS.map((name) => `<div class="stat"><span>${name}</span><strong>${stats[name]}</strong></div>`).join("");
    resultScreen.hidden = false;
    playBestEl.textContent = String(best);
    startBestEl.textContent = String(best);
    liveRegion.textContent = `遊戲結束，本局 ${score} 下，最佳 ${best} 下。`;
    retryButton.focus({ preventScroll: true });
  }

  function showStart() {
    state = "START";
    startScreen.hidden = false;
    resultScreen.hidden = true;
    hud.classList.remove("is-visible");
    updateScore();
  }

  function drawBackground() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#8bd7ee");
    sky.addColorStop(0.72, "#c9eff7");
    sky.addColorStop(0.721, "#efca70");
    sky.addColorStop(1, "#d7a849");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#ffffff";
    for (let y = 36; y < H * 0.68; y += 34) {
      const shift = (Math.floor(y / 34) % 2) * 17;
      for (let x = 14 + shift; x < W; x += 34) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    const groundY = H * 0.795;
    ctx.strokeStyle = "#8a5d2b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 8);
    ctx.lineTo(W, groundY + 8);
    ctx.stroke();

    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#60411f";
    ctx.lineWidth = 2;
    for (let x = -W; x < W * 2; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + H * 0.38, groundY + 9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function geometry() {
    const groundY = H * 0.795;
    const anchorY = H * 0.54;
    return {
      groundY,
      anchorY,
      leftX: Math.max(38, W * 0.13),
      rightX: Math.min(W - 38, W * 0.87),
      radius: groundY - anchorY + 2
    };
  }

  function normalizedAngle() {
    return ((ropePhase % TAU) + TAU) % TAU;
  }

  function drawRope(g, front) {
    const angle = normalizedAngle();
    const isFront = Math.cos(angle) < 0;
    if (front !== isFront) return;
    const centerY = g.anchorY - g.radius * Math.sin(angle);
    const controlY = centerY * 2 - g.anchorY;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(g.leftX, g.anchorY);
    ctx.quadraticCurveTo(W / 2, controlY, g.rightX, g.anchorY);
    ctx.strokeStyle = front ? "#572e29" : "rgba(87,46,41,0.58)";
    ctx.lineWidth = front ? 9 : 7;
    ctx.stroke();
    ctx.setLineDash([11, 8]);
    ctx.lineDashOffset = -ropePhase * 25;
    ctx.strokeStyle = front ? "#fff2b9" : "rgba(255,242,185,0.68)";
    ctx.lineWidth = front ? 4.2 : 3.3;
    ctx.stroke();
    ctx.restore();
  }

  function drawMotor(x, y, flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -1 : 1, 1);
    const bob = state === "PLAYING" ? Math.sin(ropePhase) * 4 : 0;
    ctx.translate(0, bob);
    ctx.fillStyle = "rgba(36,54,66,0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 108, 38, 10, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f9d54a";
    ctx.strokeStyle = "#243642";
    ctx.lineWidth = 4;
    roundRect(-29, -12, 58, 100, 17);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff8dc";
    ctx.beginPath();
    ctx.arc(-10, 18, 7, 0, TAU);
    ctx.arc(10, 18, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#243642";
    ctx.beginPath();
    ctx.arc(-9, 19, 3, 0, TAU);
    ctx.arc(11, 19, 3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#a73430";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 42, 10, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.fillStyle = "#243642";
    roundRect(-22, 86, 16, 26, 5);
    ctx.fill();
    roundRect(6, 86, 16, 26, 5);
    ctx.fill();
    ctx.strokeStyle = "#243642";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(24, 10);
    ctx.lineTo(40, -4);
    ctx.stroke();
    ctx.fillStyle = "#a73430";
    ctx.beginPath();
    ctx.arc(42, -6, 7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, width, height, radius) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawCharacter(g, now) {
    const lift = jumpLift(now);
    const baseHeight = Math.min(H * 0.49, W * 1.15);
    const imageAspect = character.naturalWidth && character.naturalHeight ? character.naturalWidth / character.naturalHeight : 2 / 3;
    const height = baseHeight;
    const width = height * imageAspect;
    let x = W / 2;
    let feetY = g.groundY + 6 - lift;
    let rotation = 0;
    let scaleX = 1;
    let scaleY = 1;
    let alpha = 1;

    const stress = Math.min(1, score / 120);
    if (state === "PLAYING" && score >= 20) {
      rotation += Math.sin(now * (0.012 + stress * 0.01)) * (0.01 + stress * 0.025);
      x += Math.sin(now * 0.017) * Math.min(7, score / 18);
    }

    if (state === "FAIL") {
      const p = Math.min(1, (now - failStart) / 720);
      const ease = 1 - Math.pow(1 - p, 3);
      if (failMode === 0) {
        rotation = ease * 1.35;
        x += ease * 48;
        feetY += ease * 42;
      } else if (failMode === 1) {
        rotation = -ease * 1.15;
        x -= ease * 46;
        feetY += ease * 34;
      } else if (failMode === 2) {
        rotation = ease * TAU * 1.3;
        x += ease * W * 0.46;
        feetY -= Math.sin(p * Math.PI) * 75;
      } else if (failMode === 3) {
        scaleY = 1 - ease * 0.34;
        scaleX = 1 + ease * 0.12;
        feetY += ease * 7;
      } else if (failMode === 4) {
        rotation = Math.sin(p * 28) * (1 - p) * 0.22;
        scaleX = scaleY = 1 + ease * 1.45;
        feetY += ease * 165;
      } else {
        rotation = -ease * 0.9;
        x -= ease * W * 0.75;
        feetY -= Math.sin(p * Math.PI) * 52;
        alpha = 1 - Math.max(0, p - 0.75) * 4;
      }
    }

    ctx.save();
    ctx.fillStyle = "rgba(36,54,66,0.17)";
    ctx.beginPath();
    ctx.ellipse(x, g.groundY + 11, Math.max(27, width * 0.22) * Math.max(0.38, 1 - lift / 205), 8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, feetY);
    ctx.rotate(rotation);
    ctx.scale(scaleX, scaleY);
    ctx.globalAlpha = Math.max(0, alpha);

    if (character.complete && character.naturalWidth) {
      ctx.drawImage(character, -width / 2, -height, width, height);
    } else {
      ctx.fillStyle = "#a73430";
      roundRect(-55, -220, 110, 215, 32);
      ctx.fill();
    }
    ctx.restore();

    if (state === "PLAYING" && score >= 10) drawSweat(x, feetY - height * 0.76, now, score);
    if (state === "PLAYING" && score >= 90) drawPanic(now);
  }

  function drawSweat(x, y, now, count) {
    const drops = count >= 50 ? 4 : count >= 30 ? 3 : 2;
    ctx.save();
    ctx.fillStyle = "#45bfe4";
    ctx.strokeStyle = "#243642";
    ctx.lineWidth = 2;
    for (let i = 0; i < drops; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const px = x + side * (52 + (i % 3) * 10);
      const py = y + ((now * 0.045 + i * 23) % 58);
      ctx.beginPath();
      ctx.moveTo(px, py - 8);
      ctx.quadraticCurveTo(px + 8, py + 3, px, py + 7);
      ctx.quadraticCurveTo(px - 8, py + 3, px, py - 8);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPanic(now) {
    const alpha = 0.35 + Math.sin(now * 0.02) * 0.15;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#a73430";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i += 1) {
      const angle = -2.8 + i * 1.85;
      const x1 = W / 2 + Math.cos(angle) * 94;
      const y1 = H * 0.37 + Math.sin(angle) * 70;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + Math.cos(angle) * 19, y1 + Math.sin(angle) * 19);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFrame(now) {
    drawBackground();
    if (state === "START") return;
    const g = geometry();
    drawRope(g, false);
    drawMotor(g.leftX - 39, g.anchorY + 5, false);
    drawMotor(g.rightX + 39, g.anchorY + 5, true);
    drawCharacter(g, now);
    drawRope(g, true);
  }

  function update(now, dt) {
    if (state !== "PLAYING") return;
    ropeSpeed += (ropeTargetSpeed - ropeSpeed) * Math.min(1, dt * 2.8);
    const previous = ropePhase;
    const next = previous + ropeSpeed * dt;
    const previousCross = Math.floor((previous - CROSS_ANGLE) / TAU);
    const nextCross = Math.floor((next - CROSS_ANGLE) / TAU);
    if (nextCross > previousCross) {
      const target = CROSS_ANGLE + nextCross * TAU;
      const fraction = Math.max(0, Math.min(1, (target - previous) / Math.max(0.00001, next - previous)));
      const eventTime = now - (1 - fraction) * dt * 1000;
      onRopeCross(eventTime);
    }
    ropePhase = next;
  }

  function loop(now) {
    const dt = Math.min(0.04, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    update(now, dt);
    drawFrame(now);
    requestAnimationFrame(loop);
  }

  function handlePointer(event) {
    if (event.target.closest("button")) return;
    event.preventDefault();
    audio.unlock();
    jump(performance.now());
  }

  game.addEventListener("pointerdown", handlePointer, { passive: false });
  game.addEventListener("contextmenu", (event) => event.preventDefault());
  game.addEventListener("dragstart", (event) => event.preventDefault());

  startButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startRun();
  });

  startButton.addEventListener("click", (event) => {
    if (event.detail === 0) startRun();
  });

  retryButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startRun();
  });

  retryButton.addEventListener("click", (event) => {
    if (event.detail === 0) startRun();
  });

  soundButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    soundOn = !soundOn;
    persist(STORAGE_SOUND, soundOn ? "1" : "0");
    updateSoundUI();
    if (soundOn) {
      audio.unlock();
      audio.tone(660, 0.07, "square", 0.035, 900);
    }
  });

  soundButton.addEventListener("click", (event) => {
    if (event.detail !== 0) return;
    soundOn = !soundOn;
    persist(STORAGE_SOUND, soundOn ? "1" : "0");
    updateSoundUI();
    if (soundOn) {
      audio.unlock();
      audio.tone(660, 0.07, "square", 0.035, 900);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    if (document.activeElement?.tagName === "BUTTON") return;
    event.preventDefault();
    if (state === "PLAYING") jump(performance.now());
  });

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    lastFrame = performance.now();
  });

  resize();
  updateSoundUI();
  showStart();
  requestAnimationFrame((now) => {
    lastFrame = now;
    requestAnimationFrame(loop);
  });
})();
