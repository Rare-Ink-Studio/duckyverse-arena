const SUPABASE_URL = "https://mtlkzpukuwmbjmevcmam.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bz9r-y7GSpOom92JEBYvKg_i5jf1Ex4";

const SUPABASE_REST_BASE = `${SUPABASE_URL}/rest/v1`;
const SUPABASE_FUNCTION_BASE = `${SUPABASE_URL}/functions/v1`;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const walletScreen = document.getElementById("walletScreen");
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const winnerBox = document.getElementById("winner");
const actionText = document.getElementById("actionText");

const walletStatus = document.getElementById("walletStatus");
const xamanPanel = document.getElementById("xamanPanel");
const xamanQr = document.getElementById("xamanQr");
const xamanOpen = document.getElementById("xamanOpen");
const playerAccess = document.getElementById("playerAccess");
const walletBadge = document.getElementById("walletBadge");

const p1Health = document.getElementById("p1Health");
const p2Health = document.getElementById("p2Health");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

const connectWalletBtn = document.getElementById("connectWalletBtn");
const createWalletBtn = document.getElementById("createWalletBtn");
const skipWalletBtn = document.getElementById("skipWalletBtn");
const changeWalletBtn = document.getElementById("changeWalletBtn");
const cancelWalletBtn = document.getElementById("cancelWalletBtn");
const mockConnectBtn = document.getElementById("mockConnectBtn");

const SPRITES = {
  player: "assets/characters/superhero_duck.png",
  cpu: "assets/characters/pirate_duck.png",
  fairy: "assets/characters/fairy_duck_mother.png"
};

const spriteImages = {
  player: loadSprite(SPRITES.player),
  cpu: loadSprite(SPRITES.cpu),
  fairy: loadSprite(SPRITES.fairy)
};

function loadSprite(src) {
  const img = new Image();
  img.src = src;
  img.loaded = false;

  img.onload = () => {
    img.loaded = true;
  };

  img.onerror = () => {
    console.warn("Could not load sprite:", src);
  };

  return img;
}

const input = {
  left: false,
  right: false
};

let walletProfile = loadWalletProfile();
let gameOver = false;
let shake = 0;
let particles = [];
let ghostTrainX = -1200;
let ghostTrainTimer = 0;
let activeXamanPoll = null;

const gravity = 0.78;
const groundY = 420;

const player = {
  name: "Super Duck",
  label: "YOU",
  x: 170,
  y: groundY,
  w: 92,
  h: 130,
  vx: 0,
  vy: 0,
  speed: 5.7,
  facing: 1,
  health: 100,
  punchCooldown: 0,
  specialCooldown: 0,
  attackTimer: 0,
  specialTimer: 0,
  hitFlash: 0,
  actionState: "idle",
  spriteKey: "player",
  spriteScale: 1.08,
  body: "#38bdf8",
  cape: "#1d4ed8"
};

const cpu = {
  name: "Pirate Duck",
  label: "CPU",
  x: 720,
  y: groundY,
  w: 98,
  h: 135,
  vx: 0,
  vy: 0,
  speed: 3.2,
  facing: -1,
  health: 100,
  punchCooldown: 0,
  specialCooldown: 0,
  attackTimer: 0,
  specialTimer: 0,
  hitFlash: 0,
  aiCooldown: 70,
  actionState: "idle",
  spriteKey: "cpu",
  spriteScale: 1.12,
  body: "#0f172a",
  cape: "#7c2d12"
};

connectWalletBtn.addEventListener("click", connectXamanWallet);
createWalletBtn.addEventListener("click", createWallet);
skipWalletBtn.addEventListener("click", skipWallet);
changeWalletBtn.addEventListener("click", showWalletScreen);

cancelWalletBtn.addEventListener("click", () => {
  xamanPanel.classList.add("hide");
  walletStatus.textContent = "Wallet connection cancelled. You can connect, create, or skip.";
  stopXamanPolling();
});

mockConnectBtn.addEventListener("click", async () => {
  walletProfile = {
    mode: "connected",
    wallet: "rDuckyverseBackupWallet123456789",
    access: "wallet",
    connectedAt: new Date().toISOString()
  };

  saveWalletProfile(walletProfile);
  await saveDuckVersePlayer(walletProfile);
  await saveDuckVerseWalletEvent("backup_wallet_connected", walletProfile);

  walletStatus.textContent = "Wallet connected with backup test flow.";
  showStartScreen();
});

startBtn.addEventListener("click", () => {
  startScreen.classList.add("hide");
  gameScreen.classList.remove("hide");
  restartGame();
});

resetBtn.addEventListener("click", restartGame);

document.addEventListener("contextmenu", e => e.preventDefault());

document.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();

  if (key === "a") input.left = true;
  if (key === "d") input.right = true;
  if (key === "w" || e.key === " ") jump(player);

  if (key === "f") punch(player, cpu);
  if (key === "g") special(player, cpu);
});

document.addEventListener("keyup", e => {
  const key = e.key.toLowerCase();

  if (key === "a") input.left = false;
  if (key === "d") input.right = false;
});

document.querySelectorAll("[data-hold]").forEach(button => {
  const action = button.dataset.hold;

  const press = e => {
    e.preventDefault();
    input[action] = true;
    button.classList.add("active");
  };

  const release = e => {
    e.preventDefault();
    input[action] = false;
    button.classList.remove("active");
  };

  button.addEventListener("touchstart", press, { passive: false });
  button.addEventListener("touchend", release, { passive: false });
  button.addEventListener("touchcancel", release, { passive: false });

  button.addEventListener("mousedown", press);
  button.addEventListener("mouseup", release);
  button.addEventListener("mouseleave", release);
});

document.querySelectorAll("[data-tap]").forEach(button => {
  const action = button.dataset.tap;

  const press = e => {
    e.preventDefault();
    button.classList.add("active");

    if (action === "jump") jump(player);
    if (action === "punch") punch(player, cpu);
    if (action === "special") special(player, cpu);
  };

  const release = e => {
    e.preventDefault();
    button.classList.remove("active");
  };

  button.addEventListener("touchstart", press, { passive: false });
  button.addEventListener("touchend", release, { passive: false });
  button.addEventListener("touchcancel", release, { passive: false });

  button.addEventListener("mousedown", press);
  button.addEventListener("mouseup", release);
  button.addEventListener("mouseleave", release);
});

function loadWalletProfile() {
  try {
    const stored = localStorage.getItem("duckyverseWalletProfile");
    const oldStored = localStorage.getItem("duckVerseWalletProfile");

    if (stored) return JSON.parse(stored);
    if (oldStored) return JSON.parse(oldStored);

    return null;
  } catch {
    return null;
  }
}

function saveWalletProfile(profile) {
  localStorage.setItem("duckyverseWalletProfile", JSON.stringify(profile));
  localStorage.setItem("duckVerseWalletProfile", JSON.stringify(profile));
}

function getDuckVerseSessionId() {
  let sessionId = localStorage.getItem("duckyverseSessionId");

  if (!sessionId) {
    sessionId = localStorage.getItem("duckVerseSessionId");
  }

  if (!sessionId) {
    sessionId = crypto.randomUUID
      ? crypto.randomUUID()
      : "session_" + Date.now() + "_" + Math.random().toString(16).slice(2);

    localStorage.setItem("duckyverseSessionId", sessionId);
    localStorage.setItem("duckVerseSessionId", sessionId);
  }

  return sessionId;
}

async function saveDuckVersePlayer(profile) {
  try {
    const response = await fetch(`${SUPABASE_REST_BASE}/duckverse_players`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        session_id: getDuckVerseSessionId(),
        wallet_address: profile.wallet || null,
        wallet_type: profile.wallet ? "xaman" : null,
        access_level: profile.access || "guest",
        nft_enabled: false,
        last_seen_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.warn("Supabase player save failed:", await response.text());
    }
  } catch (error) {
    console.warn("Supabase player save failed:", error);
  }
}

async function saveDuckVerseWalletEvent(eventType, profile, extraData = {}) {
  try {
    const response = await fetch(`${SUPABASE_REST_BASE}/duckverse_wallet_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        wallet_address: profile.wallet || null,
        event_type: eventType,
        event_data: {
          app: "duckyverse-arena",
          brand: "DUCKYVERSE",
          access: profile.access || "guest",
          mode: profile.mode || "guest",
          session_id: getDuckVerseSessionId(),
          ...extraData
        }
      })
    });

    if (!response.ok) {
      console.warn("Supabase wallet event save failed:", await response.text());
    }
  } catch (error) {
    console.warn("Supabase wallet event save failed:", error);
  }
}

function showWalletScreen() {
  stopXamanPolling();
  gameScreen.classList.add("hide");
  startScreen.classList.add("hide");
  walletScreen.classList.remove("hide");
}

function showStartScreen() {
  stopXamanPolling();
  walletScreen.classList.add("hide");
  gameScreen.classList.add("hide");
  startScreen.classList.remove("hide");
  updateWalletUI();
}

function updateWalletUI() {
  if (!walletProfile || walletProfile.mode === "guest") {
    playerAccess.textContent = "Guest Mode · NFT features locked later";
    walletBadge.textContent = "1 PLAYER VS CPU · GUEST";
    return;
  }

  playerAccess.textContent = `Wallet Connected · ${shortWallet(walletProfile.wallet)}`;
  walletBadge.textContent = `1 PLAYER VS CPU · WALLET ${shortWallet(walletProfile.wallet)}`;
}

function shortWallet(wallet) {
  if (!wallet) return "Connected";
  if (wallet.length <= 12) return wallet;
  return wallet.slice(0, 6) + "..." + wallet.slice(-6);
}

async function connectXamanWallet() {
  stopXamanPolling();

  xamanPanel.classList.remove("hide");
  walletStatus.textContent = "Creating Xaman sign-in request...";

  xamanQr.classList.add("hide");
  xamanOpen.classList.add("hide");
  xamanQr.removeAttribute("src");
  xamanOpen.removeAttribute("href");

  try {
    const response = await fetch(`${SUPABASE_FUNCTION_BASE}/xaman-signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        app: "duckyverse-arena",
        brand: "DUCKYVERSE",
        session_id: getDuckVerseSessionId()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not create Xaman sign-in request.");
    }

    if (!data.uuid) {
      throw new Error("Xaman did not return a sign-in UUID.");
    }

    if (data.qr_png) {
      xamanQr.src = data.qr_png;
      xamanQr.classList.remove("hide");
    }

    if (data.deep_link) {
      xamanOpen.href = data.deep_link;
      xamanOpen.classList.remove("hide");
    }

    walletStatus.textContent =
      "Xaman request created. Scan the QR code or tap Open Xaman, then approve the sign-in.";

    await saveDuckVerseWalletEvent(
      "xaman_signin_started",
      {
        mode: "pending",
        wallet: null,
        access: "pending"
      },
      {
        uuid: data.uuid
      }
    );

    pollXamanStatus(data.uuid);
  } catch (error) {
    walletStatus.textContent =
      "Xaman connection error: " + (error.message || "Unknown error.");

    console.warn("Xaman connection error:", error);
  }
}

function pollXamanStatus(uuid) {
  let tries = 0;

  stopXamanPolling();

  activeXamanPoll = setInterval(async () => {
    tries++;

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTION_BASE}/xaman-status?uuid=${encodeURIComponent(uuid)}`,
        {
          method: "GET",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not check Xaman status.");
      }

      if (data.signed && data.account) {
        stopXamanPolling();

        walletProfile = {
          mode: "connected",
          wallet: data.account,
          access: "wallet",
          connectedAt: new Date().toISOString(),
          xamanUuid: uuid
        };

        saveWalletProfile(walletProfile);
        await saveDuckVersePlayer(walletProfile);
        await saveDuckVerseWalletEvent("xaman_wallet_connected", walletProfile, {
          uuid
        });

        walletStatus.textContent = `Wallet connected: ${shortWallet(data.account)}`;
        showStartScreen();
        return;
      }

      if (data.cancelled || data.expired || tries > 90) {
        stopXamanPolling();

        const eventType = data.cancelled
          ? "xaman_signin_cancelled"
          : data.expired
            ? "xaman_signin_expired"
            : "xaman_signin_timeout";

        walletStatus.textContent = data.cancelled
          ? "Xaman sign-in was cancelled."
          : data.expired
            ? "Xaman sign-in expired. Tap Connect Xaman Wallet again."
            : "Xaman sign-in timed out. Tap Connect Xaman Wallet again.";

        await saveDuckVerseWalletEvent(
          eventType,
          {
            mode: eventType,
            wallet: null,
            access: "guest"
          },
          {
            uuid
          }
        );
      }
    } catch (error) {
      console.warn("Xaman status check error:", error);

      if (tries > 3) {
        stopXamanPolling();
        walletStatus.textContent =
          "Could not check Xaman status. Please try connecting again.";
      }
    }
  }, 2000);
}

function stopXamanPolling() {
  if (activeXamanPoll) {
    clearInterval(activeXamanPoll);
    activeXamanPoll = null;
  }
}

function createWallet() {
  walletStatus.textContent = "Opening Xaman wallet setup...";
  window.open("https://xaman.app", "_blank", "noopener");
}

async function skipWallet() {
  stopXamanPolling();

  walletProfile = {
    mode: "guest",
    wallet: null,
    access: "guest",
    connectedAt: new Date().toISOString()
  };

  saveWalletProfile(walletProfile);
  await saveDuckVersePlayer(walletProfile);
  await saveDuckVerseWalletEvent("guest_skipped_wallet", walletProfile);

  showStartScreen();
}

function restartGame() {
  Object.assign(player, {
    x: 170,
    y: groundY,
    vx: 0,
    vy: 0,
    facing: 1,
    health: 100,
    punchCooldown: 0,
    specialCooldown: 0,
    attackTimer: 0,
    specialTimer: 0,
    hitFlash: 0,
    actionState: "idle"
  });

  Object.assign(cpu, {
    x: 720,
    y: groundY,
    vx: 0,
    vy: 0,
    facing: -1,
    health: 100,
    punchCooldown: 0,
    specialCooldown: 0,
    attackTimer: 0,
    specialTimer: 0,
    hitFlash: 0,
    aiCooldown: 70,
    actionState: "idle"
  });

  input.left = false;
  input.right = false;

  particles = [];
  gameOver = false;
  shake = 0;

  winnerBox.classList.add("hide");
  winnerBox.textContent = "";

  setAction("Fight started. Move close, then tap PUNCH.");
  updateHealthBars();
}

function setAction(text) {
  actionText.textContent = text;
}

function jump(fighter) {
  if (gameOver) return;

  if (fighter.y >= groundY) {
    fighter.vy = -15.5;
    fighter.actionState = "jump";
    createText(center(fighter), fighter.y - 95, "JUMP!");

    if (fighter === player) {
      setAction("JUMP: Super Duck hops over danger.");
    }
  }
}

function punch(attacker, defender) {
  if (gameOver) return;

  if (attacker.punchCooldown > 0) {
    if (attacker === player) setAction("PUNCH is recharging.");
    return;
  }

  attacker.punchCooldown = 28;
  attacker.attackTimer = 18;
  attacker.specialTimer = 0;
  attacker.actionState = "punch";

  attacker.vx += attacker.facing * 7.5;
  attacker.x += attacker.facing * 14;

  const hit = attemptHit(attacker, defender, {
    range: 106,
    reach: 76,
    damage: 9,
    knockback: 8,
    lift: -5,
    hitText: "POW!",
    missText: "MISS!"
  });

  if (attacker === player) {
    setAction(
      hit
        ? "PUNCH: Super Duck lunged forward and hit Pirate Duck."
        : "PUNCH: Super Duck lunged forward but missed."
    );
  }
}

function special(attacker, defender) {
  if (gameOver) return;

  if (attacker.specialCooldown > 0) {
    if (attacker === player) setAction("SPECIAL is recharging.");
    return;
  }

  attacker.specialCooldown = 90;
  attacker.punchCooldown = 34;
  attacker.attackTimer = 34;
  attacker.specialTimer = 34;
  attacker.actionState = "special";

  attacker.vx += attacker.facing * 15;
  attacker.x += attacker.facing * 30;

  const hit = attemptHit(attacker, defender, {
    range: 154,
    reach: 112,
    damage: 18,
    knockback: 14,
    lift: -9,
    hitText: "SPECIAL QUACK!",
    missText: "WHOOSH!"
  });

  if (attacker === player) {
    setAction(
      hit
        ? "SPECIAL: Super Duck dash-blasted Pirate Duck backward."
        : "SPECIAL: Super Duck dash-blasted forward but missed."
    );
  }
}

function attemptHit(attacker, defender, config) {
  const attackX = center(attacker) + attacker.facing * config.reach;
  const attackY = attacker.y - 60;

  const defendX = center(defender);
  const defendY = defender.y - 60;

  const distance = Math.hypot(attackX - defendX, attackY - defendY);

  if (distance < config.range) {
    defender.health = Math.max(0, defender.health - config.damage);
    defender.vx = attacker.facing * config.knockback;
    defender.vy = config.lift;
    defender.hitFlash = 12;
    defender.actionState = "hit";

    shake = config.damage >= 18 ? 16 : 8;

    createImpact(defendX, defendY, config.hitText);

    if (defender.health <= 0) {
      endGame(`${attacker.name.toUpperCase()} WINS!\nQUACKTORY!`);
    }

    return true;
  }

  createText(attackX, attackY, config.missText);
  return false;
}

function updatePlayer() {
  player.vx *= 0.72;

  if (input.left) {
    player.vx = -player.speed;
    player.facing = -1;
    player.actionState = "walk";
  }

  if (input.right) {
    player.vx = player.speed;
    player.facing = 1;
    player.actionState = "walk";
  }

  if (!input.left && !input.right && player.y >= groundY && player.attackTimer <= 0) {
    player.actionState = "idle";
  }

  moveFighter(player);
}

function updateCpu() {
  const distance = Math.abs(center(cpu) - center(player));

  cpu.aiCooldown--;

  if (center(cpu) < center(player)) {
    cpu.facing = 1;
  } else {
    cpu.facing = -1;
  }

  cpu.vx *= 0.72;

  if (distance > 155) {
    cpu.vx = cpu.facing * cpu.speed;
    cpu.actionState = "walk";
  } else if (distance < 74) {
    cpu.vx = -cpu.facing * 2.2;
    cpu.actionState = "backstep";
  } else if (cpu.attackTimer <= 0 && cpu.y >= groundY) {
    cpu.actionState = "guard";
  }

  if (cpu.aiCooldown <= 0 && distance < 160) {
    if (Math.random() > 0.74 && cpu.specialCooldown <= 0) {
      special(cpu, player);
      setAction("CPU SPECIAL: Pirate Duck charged forward.");
      cpu.aiCooldown = 112;
    } else {
      punch(cpu, player);
      setAction("CPU PUNCH: Pirate Duck struck back.");
      cpu.aiCooldown = 64;
    }
  }

  if (Math.random() < 0.004 && cpu.y >= groundY && distance < 180) {
    jump(cpu);
  }

  moveFighter(cpu);
}

function moveFighter(fighter) {
  fighter.vy += gravity;

  fighter.x += fighter.vx;
  fighter.y += fighter.vy;

  if (fighter.y > groundY) {
    fighter.y = groundY;
    fighter.vy = 0;
  }

  fighter.x = Math.max(28, Math.min(canvas.width - fighter.w - 28, fighter.x));

  if (fighter.punchCooldown > 0) fighter.punchCooldown--;
  if (fighter.specialCooldown > 0) fighter.specialCooldown--;
  if (fighter.attackTimer > 0) fighter.attackTimer--;
  if (fighter.specialTimer > 0) fighter.specialTimer--;
  if (fighter.hitFlash > 0) fighter.hitFlash--;
}

function center(fighter) {
  return fighter.x + fighter.w / 2;
}

function updateHealthBars() {
  p1Health.style.width = player.health + "%";
  p2Health.style.width = cpu.health + "%";

  p1Health.style.background =
    player.health < 35
      ? "linear-gradient(90deg, #ef4444, #f97316)"
      : "linear-gradient(90deg, #22c55e, #facc15)";

  p2Health.style.background =
    cpu.health < 35
      ? "linear-gradient(90deg, #ef4444, #f97316)"
      : "linear-gradient(90deg, #22c55e, #facc15)";
}

function endGame(text) {
  gameOver = true;
  winnerBox.textContent = text;
  winnerBox.classList.remove("hide");
  setAction(text.replace("\n", " "));
}

function drawArena() {
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#071133");
  bg.addColorStop(0.55, "#15152a");
  bg.addColorStop(1, "#070711");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.arc(790, 78, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < 52; i++) {
    const x = (i * 91) % canvas.width;
    const y = (i * 47) % 250;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = "#020617";
  for (let i = 0; i < canvas.width; i += 58) {
    ctx.fillRect(i, 306 + (i % 4) * 8, 42, 150);
  }

  drawGhostTrain();

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, 392, canvas.width, 80);

  ctx.fillStyle = "#64748b";
  ctx.fillRect(0, 420, canvas.width, 12);

  ctx.fillStyle = "#334155";
  for (let i = 0; i < canvas.width; i += 82) {
    ctx.fillRect(i, 450, 60, 9);
  }

  ctx.fillStyle = "rgba(250, 204, 21, 0.22)";
  ctx.beginPath();
  ctx.moveTo(88, 166);
  ctx.lineTo(126, 166);
  ctx.lineTo(190, 392);
  ctx.lineTo(24, 392);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(108, 392);
  ctx.lineTo(108, 155);
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText("PHANTOM TRAIN STATION", 480, 44);
  ctx.textAlign = "left";
}

function drawGhostTrain() {
  ghostTrainTimer++;

  if (ghostTrainTimer > 520) {
    ghostTrainX += 18;
  }

  if (ghostTrainX > canvas.width + 300) {
    ghostTrainX = -1200;
    ghostTrainTimer = 0;
  }

  if (ghostTrainTimer > 520) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.fillRect(ghostTrainX, 232, 880, 96);

    ctx.fillStyle = "rgba(56, 189, 248, 0.36)";
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(ghostTrainX + 48 + i * 88, 252, 54, 36);
    }

    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(ghostTrainX + 830, 252, 90, 38);
  }
}

function drawDuck(fighter) {
  const img = spriteImages[fighter.spriteKey];

  if (img && img.loaded) {
    drawSpriteDuck(fighter, img);
    return;
  }

  drawFallbackDuck(fighter);
}

function drawSpriteDuck(fighter, img) {
  ctx.save();

  const jumpOffset = fighter.y - groundY;

  const bob =
    fighter.y >= groundY && fighter.actionState !== "hit"
      ? Math.sin(Date.now() / 120) * 2
      : 0;

  const attackLean =
    fighter.actionState === "punch" || fighter.actionState === "special"
      ? fighter.facing * 0.08
      : 0;

  let drawH = 176 * fighter.spriteScale;
  let drawW = drawH * (img.naturalWidth / img.naturalHeight);

  if (fighter.spriteKey === "cpu") {
    drawH = 188 * fighter.spriteScale;
    drawW = drawH * (img.naturalWidth / img.naturalHeight);
  }

  const footY = groundY + 118 + jumpOffset + bob;
  const drawX = fighter.x + fighter.w / 2 - drawW / 2;
  const drawY = footY - drawH;

  ctx.translate(fighter.x + fighter.w / 2, footY - drawH / 2);
  ctx.rotate(attackLean);

  if (fighter.facing === -1) {
    ctx.scale(-1, 1);
  }

  if (fighter.hitFlash > 0) {
    ctx.globalAlpha = 0.55;
  }

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

  if (fighter.attackTimer > 0) {
    const fistX = fighter.facing === -1 ? -drawW * 0.38 : drawW * 0.38;
    const fistY = -drawH * 0.24;

    ctx.fillStyle = fighter.specialTimer > 0 ? "#38bdf8" : "#f97316";
    ctx.beginPath();
    ctx.arc(fistX, fistY, fighter.specialTimer > 0 ? 24 : 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "900 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(fighter.specialTimer > 0 ? "BOOM!" : "POW!", fistX, fistY - 24);
    ctx.textAlign = "left";
  }

  if (fighter.actionState === "guard") {
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -drawH * 0.35, 50, 0.2, Math.PI * 1.8);
    ctx.stroke();
  }

  ctx.restore();

  fighter.h = drawH;
  fighter.w = Math.min(120, drawW * 0.72);
}

function drawFallbackDuck(fighter) {
  ctx.save();

  ctx.translate(fighter.x, fighter.y);

  const bob = Math.sin(Date.now() / 120) * 2;

  if (fighter.hitFlash > 0) {
    ctx.globalAlpha = 0.55;
  }

  ctx.fillStyle = fighter.cape;
  ctx.beginPath();
  ctx.moveTo(25, 12 + bob);
  ctx.lineTo(fighter.facing === 1 ? -22 : 98, 106);
  ctx.lineTo(56, 78);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = fighter.body;
  ctx.beginPath();
  ctx.ellipse(38, 58 + bob, 36, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(38, 7 + bob, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#facc15";
  ctx.beginPath();

  if (fighter.facing === 1) {
    ctx.ellipse(72, 10 + bob, 24, 11, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(4, 10 + bob, 24, 11, 0, 0, Math.PI * 2);
  }

  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(27, 0 + bob, 9, 0, Math.PI * 2);
  ctx.arc(49, 0 + bob, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#020617";
  ctx.beginPath();
  ctx.arc(27 + fighter.facing * 2, 0 + bob, 4, 0, Math.PI * 2);
  ctx.arc(49 + fighter.facing * 2, 0 + bob, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(9, 101, 27, 11);
  ctx.fillRect(43, 101, 27, 11);

  ctx.restore();
}

function createText(x, y, text) {
  particles.push({
    type: "text",
    x,
    y,
    text,
    life: 34
  });
}

function createImpact(x, y, text) {
  createText(x, y, text);

  for (let i = 0; i < 14; i++) {
    particles.push({
      type: "spark",
      x,
      y,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.8) * 9,
      life: 28
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life--;

    if (p.type === "text") {
      ctx.fillStyle = "white";
      ctx.font = "900 24px Arial";
      ctx.fillText(p.text, p.x - 74, p.y - (34 - p.life));
    } else {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;

      ctx.fillStyle = "#facc15";
      ctx.fillRect(p.x, p.y, 6, 6);
    }

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateCooldownButtons() {
  const punchButton = document.querySelector('[data-tap="punch"]');
  const specialButton = document.querySelector('[data-tap="special"]');

  if (!punchButton || !specialButton) return;

  if (player.punchCooldown > 0) {
    punchButton.classList.add("locked");
  } else {
    punchButton.classList.remove("locked");
  }

  if (player.specialCooldown > 0) {
    specialButton.classList.add("locked");
  } else {
    specialButton.classList.remove("locked");
  }
}

function gameLoop() {
  if (!gameOver) {
    updatePlayer();
    updateCpu();
  }

  updateHealthBars();
  updateCooldownButtons();

  ctx.save();

  if (shake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake
    );

    shake *= 0.82;

    if (shake < 0.5) shake = 0;
  }

  drawArena();
  drawDuck(player);
  drawDuck(cpu);
  drawParticles();

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

updateWalletUI();
restartGame();
gameLoop();
