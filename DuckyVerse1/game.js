const SUPABASE_URL = "https://mtlkzpukuwmbjmevcmam.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bz9r-y7GSpOom92JEBYvKg_i5jf1Ex4";
const SUPABASE_REST_BASE = `${SUPABASE_URL}/rest/v1`;
const SUPABASE_FUNCTION_BASE = `${SUPABASE_URL}/functions/v1`;

const walletScreen = document.getElementById("walletScreen");
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");

const connectWalletBtn = document.getElementById("connectWalletBtn");
const createWalletBtn = document.getElementById("createWalletBtn");
const skipWalletBtn = document.getElementById("skipWalletBtn");
const changeWalletBtn = document.getElementById("changeWalletBtn");
const walletStatus = document.getElementById("walletStatus");
const xamanPanel = document.getElementById("xamanPanel");
const xamanQr = document.getElementById("xamanQr");
const xamanOpen = document.getElementById("xamanOpen");
const mockConnectBtn = document.getElementById("mockConnectBtn");
const cancelWalletBtn = document.getElementById("cancelWalletBtn");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const playerAccess = document.getElementById("playerAccess");
const walletBadge = document.getElementById("walletBadge");
const actionText = document.getElementById("actionText");

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const p1Health = document.getElementById("p1Health");
const p2Health = document.getElementById("p2Health");
const winner = document.getElementById("winner");

const keys = {};
const gravity = 0.75;
const floorY = 430;

let walletProfile = loadWalletProfile();
let activeXamanPoll = null;
let playerMode = "guest";
let gameOver = false;
let particles = [];
let shake = 0;
let cpuAttackTimer = 0;

const arenaImage = new Image();
arenaImage.src = "assets/duckyverse-arena.png";

const heroImage = new Image();
heroImage.src = "assets/hero-duck.png";

const villainImage = new Image();
villainImage.src = "assets/villanous-duck.png";

const player = makeDuck({
  name: "Hero Duck",
  x: 190,
  y: floorY,
  facing: 1,
  image: heroImage,
  isCpu: false
});

const cpu = makeDuck({
  name: "Villanous Duck",
  x: 720,
  y: floorY,
  facing: -1,
  image: villainImage,
  isCpu: true
});

function makeDuck(options) {
  return {
    name: options.name,
    x: options.x,
    y: options.y,
    facing: options.facing,
    image: options.image,
    isCpu: options.isCpu,
    vx: 0,
    vy: 0,
    speed: 5.2,
    health: 100,
    attackCooldown: 0,
    attackFrame: 0,
    specialFrame: 0,
    hitFrame: 0,
    onGround: true,
    walkTick: 0
  };
}

function showOnly(screen) {
  walletScreen.classList.add("hide");
  startScreen.classList.add("hide");
  gameScreen.classList.add("hide");
  screen.classList.remove("hide");
}

function loadWalletProfile() {
  try {
    const stored = localStorage.getItem("duckyverseWalletProfile");
    const oldStored = localStorage.getItem("duckVerseWalletProfile");

    if (stored) {
      return JSON.parse(stored);
    }

    if (oldStored) {
      return JSON.parse(oldStored);
    }

    return null;
  } catch (error) {
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
    if (window.crypto && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      sessionId = "session_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    }

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

function updateWalletUI() {
  if (!walletProfile || walletProfile.mode === "guest") {
    playerMode = "guest";
    playerAccess.textContent = "Guest Mode";
    walletBadge.textContent = "1 PLAYER VS CPU · GUEST";
    return;
  }

  playerMode = "wallet";
  playerAccess.textContent = `Wallet Connected · ${shortWallet(walletProfile.wallet)}`;
  walletBadge.textContent = `1 PLAYER VS CPU · WALLET ${shortWallet(walletProfile.wallet)}`;
}

function shortWallet(wallet) {
  if (!wallet) {
    return "Connected";
  }

  if (wallet.length <= 12) {
    return wallet;
  }

  return wallet.slice(0, 6) + "..." + wallet.slice(-6);
}

function stopXamanPolling() {
  if (activeXamanPoll) {
    clearInterval(activeXamanPoll);
    activeXamanPoll = null;
  }
}

function showWalletScreen() {
  stopXamanPolling();
  showOnly(walletScreen);
}

function showStartScreen() {
  stopXamanPolling();
  updateWalletUI();
  showOnly(startScreen);
}

async function connectXamanWallet() {
  stopXamanPolling();

  xamanPanel.classList.remove("hide");
  walletStatus.textContent = "Creating Xaman sign-in request...";

  xamanQr.classList.add("hide");
  xamanQr.removeAttribute("src");

  xamanOpen.classList.add("hide");
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

    walletStatus.textContent = "Xaman request created. Scan the QR code or tap Open Xaman, then approve the sign-in.";

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
    walletStatus.textContent = "Xaman connection error: " + (error.message || "Unknown error.");
    console.warn("Xaman connection error:", error);
  }
}

function pollXamanStatus(uuid) {
  let tries = 0;

  stopXamanPolling();

  activeXamanPoll = setInterval(async function () {
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
          uuid: uuid
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
            uuid: uuid
          }
        );
      }
    } catch (error) {
      console.warn("Xaman status check error:", error);

      if (tries > 3) {
        stopXamanPolling();
        walletStatus.textContent = "Could not check Xaman status. Please try connecting again.";
      }
    }
  }, 2000);
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

async function backupWalletConnect() {
  stopXamanPolling();

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
}

connectWalletBtn.addEventListener("click", connectXamanWallet);
createWalletBtn.addEventListener("click", createWallet);
skipWalletBtn.addEventListener("click", skipWallet);
changeWalletBtn.addEventListener("click", showWalletScreen);
cancelWalletBtn.addEventListener("click", function () {
  xamanPanel.classList.add("hide");
  walletStatus.textContent = "Wallet connection cancelled. You can connect, create, or skip.";
  stopXamanPolling();
});
mockConnectBtn.addEventListener("click", backupWalletConnect);

startBtn.addEventListener("click", function () {
  showOnly(gameScreen);
  resetFight();
});

resetBtn.addEventListener("click", resetFight);

document.addEventListener("contextmenu", function (event) {
  event.preventDefault();
});

document.addEventListener("keydown", function (event) {
  keys[event.key.toLowerCase()] = true;

  if (event.key.toLowerCase() === "f") {
    punch(player, cpu);
  }

  if (event.key.toLowerCase() === "g") {
    special(player, cpu);
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

document.querySelectorAll("[data-hold]").forEach(function (button) {
  const action = button.getAttribute("data-hold");

  button.addEventListener(
    "touchstart",
    function (event) {
      event.preventDefault();
      keys[action] = true;
      button.classList.add("active");
    },
    { passive: false }
  );

  button.addEventListener(
    "touchend",
    function (event) {
      event.preventDefault();
      keys[action] = false;
      button.classList.remove("active");
    },
    { passive: false }
  );

  button.addEventListener(
    "touchcancel",
    function (event) {
      event.preventDefault();
      keys[action] = false;
      button.classList.remove("active");
    },
    { passive: false }
  );

  button.addEventListener("mousedown", function () {
    keys[action] = true;
    button.classList.add("active");
  });

  button.addEventListener("mouseup", function () {
    keys[action] = false;
    button.classList.remove("active");
  });

  button.addEventListener("mouseleave", function () {
    keys[action] = false;
    button.classList.remove("active");
  });
});

document.querySelectorAll("[data-tap]").forEach(function (button) {
  const action = button.getAttribute("data-tap");

  button.addEventListener(
    "touchstart",
    function (event) {
      event.preventDefault();
      button.classList.add("active");
      tapAction(action);
    },
    { passive: false }
  );

  button.addEventListener(
    "touchend",
    function (event) {
      event.preventDefault();
      button.classList.remove("active");
    },
    { passive: false }
  );

  button.addEventListener(
    "touchcancel",
    function (event) {
      event.preventDefault();
      button.classList.remove("active");
    },
    { passive: false }
  );

  button.addEventListener("mousedown", function () {
    button.classList.add("active");
    tapAction(action);
  });

  button.addEventListener("mouseup", function () {
    button.classList.remove("active");
  });

  button.addEventListener("mouseleave", function () {
    button.classList.remove("active");
  });
});

function tapAction(action) {
  if (action === "jump") {
    jump(player);
  }

  if (action === "punch") {
    punch(player, cpu);
  }

  if (action === "special") {
    special(player, cpu);
  }
}

function resetFight() {
  player.x = 190;
  player.y = floorY;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.health = 100;
  player.attackCooldown = 0;
  player.attackFrame = 0;
  player.specialFrame = 0;
  player.hitFrame = 0;
  player.onGround = true;

  cpu.x = 720;
  cpu.y = floorY;
  cpu.vx = 0;
  cpu.vy = 0;
  cpu.facing = -1;
  cpu.health = 100;
  cpu.attackCooldown = 0;
  cpu.attackFrame = 0;
  cpu.specialFrame = 0;
  cpu.hitFrame = 0;
  cpu.onGround = true;

  particles = [];
  shake = 0;
  cpuAttackTimer = 0;
  gameOver = false;

  winner.classList.add("hide");
  winner.textContent = "";

  actionText.textContent = "Ready. Move close, then tap PUNCH.";
  updateHealth();
}

function updateHealth() {
  p1Health.style.width = player.health + "%";
  p2Health.style.width = cpu.health + "%";

  if (player.health > 55) {
    p1Health.style.background = "linear-gradient(90deg, #22c55e, #facc15)";
  } else if (player.health > 25) {
    p1Health.style.background = "linear-gradient(90deg, #f97316, #facc15)";
  } else {
    p1Health.style.background = "linear-gradient(90deg, #ef4444, #f97316)";
  }

  if (cpu.health > 55) {
    p2Health.style.background = "linear-gradient(90deg, #22c55e, #facc15)";
  } else if (cpu.health > 25) {
    p2Health.style.background = "linear-gradient(90deg, #f97316, #facc15)";
  } else {
    p2Health.style.background = "linear-gradient(90deg, #ef4444, #f97316)";
  }
}

function controlPlayer() {
  player.vx = 0;

  if (keys.a || keys.left) {
    player.vx = -player.speed;
    player.facing = -1;
  }

  if (keys.d || keys.right) {
    player.vx = player.speed;
    player.facing = 1;
  }

  if (keys.w) {
    jump(player);
  }
}

function jump(duck) {
  if (!duck.onGround || gameOver) {
    return;
  }

  duck.vy = -15.8;
  duck.onGround = false;

  if (duck === player) {
    actionText.textContent = "Jump!";
  }
}

function updateDuck(duck) {
  duck.vy += gravity;
  duck.x += duck.vx;
  duck.y += duck.vy;

  if (duck.x < 70) {
    duck.x = 70;
  }

  if (duck.x > canvas.width - 70) {
    duck.x = canvas.width - 70;
  }

  if (duck.y >= floorY) {
    duck.y = floorY;
    duck.vy = 0;
    duck.onGround = true;
  }

  if (duck.vx !== 0) {
    duck.walkTick += 0.22;
  } else {
    duck.walkTick *= 0.84;
  }

  if (duck.attackCooldown > 0) {
    duck.attackCooldown--;
  }

  if (duck.attackFrame > 0) {
    duck.attackFrame--;
  }

  if (duck.specialFrame > 0) {
    duck.specialFrame--;
  }

  if (duck.hitFrame > 0) {
    duck.hitFrame--;
  }
}

function cpuBrain() {
  if (gameOver) {
    return;
  }

  const distance = Math.abs(player.x - cpu.x);
  cpu.facing = player.x < cpu.x ? -1 : 1;

  cpuAttackTimer++;

  if (distance > 155) {
    cpu.vx = cpu.facing * cpu.speed * 0.68;
  } else {
    cpu.vx = 0;

    if (cpuAttackTimer > 42) {
      if (Math.random() < 0.72) {
        punch(cpu, player);
      } else {
        special(cpu, player);
      }

      cpuAttackTimer = 0;
    }
  }

  if (distance < 90 && Math.random() < 0.012 && cpu.onGround) {
    jump(cpu);
  }
}

function punch(attacker, defender) {
  if (gameOver) {
    return;
  }

  if (attacker.attackCooldown > 0) {
    if (attacker === player) {
      actionText.textContent = "PUNCH is recharging.";
    }

    return;
  }

  attacker.attackCooldown = 24;
  attacker.attackFrame = 14;

  const reach = 88;
  const damage = 8;
  const hitX = attacker.x + attacker.facing * reach;
  const hitY = attacker.y - 92;

  if (Math.abs(hitX - defender.x) < 96 && Math.abs(hitY - (defender.y - 92)) < 120) {
    damageDuck(defender, damage, attacker.facing, "POW!");
    attacker.vx += attacker.facing * 2.4;
  } else {
    makeText(hitX, hitY, "MISS");

    if (attacker === player) {
      actionText.textContent = "Missed! Move closer.";
    }
  }
}

function special(attacker, defender) {
  if (gameOver) {
    return;
  }

  if (attacker.attackCooldown > 0) {
    if (attacker === player) {
      actionText.textContent = "SPECIAL is recharging.";
    }

    return;
  }

  attacker.attackCooldown = 58;
  attacker.specialFrame = 24;
  attacker.attackFrame = 24;
  attacker.vx = attacker.facing * 9;

  const reach = 130;
  const damage = 17;
  const hitX = attacker.x + attacker.facing * reach;
  const hitY = attacker.y - 92;

  if (Math.abs(hitX - defender.x) < 128 && Math.abs(hitY - (defender.y - 92)) < 130) {
    damageDuck(defender, damage, attacker.facing, "SPECIAL!");
  } else {
    makeText(hitX, hitY, "WHOOSH");

    if (attacker === player) {
      actionText.textContent = "Special missed!";
    }
  }
}

function damageDuck(duck, damage, direction, label) {
  duck.health = Math.max(0, duck.health - damage);
  duck.hitFrame = 12;
  duck.vx = direction * 7;
  duck.vy = -5;

  shake = damage > 10 ? 14 : 8;

  makeText(duck.x, duck.y - 155, label);
  makeBurst(duck.x, duck.y - 105);

  if (duck === cpu) {
    actionText.textContent = "Hit! Villanous Duck took damage.";
  } else {
    actionText.textContent = "You got hit! Fight back.";
  }

  updateHealth();

  if (duck.health <= 0) {
    endFight(duck === cpu ? "HERO DUCK WINS!\nQUACKTORY!" : "VILLANOUS DUCK WINS!\nTRY AGAIN!");
  }
}

function endFight(text) {
  gameOver = true;
  winner.textContent = text;
  winner.classList.remove("hide");
  actionText.textContent = "Fight over. Tap Restart to play again.";
}

function makeText(x, y, text) {
  particles.push({
    type: "text",
    x: x,
    y: y,
    text: text,
    life: 42
  });
}

function makeBurst(x, y) {
  for (let i = 0; i < 18; i++) {
    particles.push({
      type: "spark",
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.8) * 10,
      size: 4 + Math.random() * 7,
      life: 24 + Math.random() * 18
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life--;

    if (p.type === "spark") {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
    }

    if (p.type === "text") {
      p.y -= 0.9;
    }

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawArena() {
  if (arenaImage.complete) {
    ctx.drawImage(arenaImage, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(2, 6, 23, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#1d4ed8");
    sky.addColorStop(0.45, "#312e81");
    sky.addColorStop(1, "#020617");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.fillStyle = "rgba(2, 6, 23, 0.14)";
  ctx.fillRect(0, 396, canvas.width, 144);

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "900 34px Arial";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 7;
  ctx.fillStyle = "#facc15";
  ctx.strokeText("DUCKYVERSE", canvas.width / 2, 54);
  ctx.fillText("DUCKYVERSE", canvas.width / 2, 54);

  ctx.font = "900 18px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.strokeText("CASTLE ARENA", canvas.width / 2, 82);
  ctx.fillText("CASTLE ARENA", canvas.width / 2, 82);
  ctx.restore();
}

function drawDuck(duck) {
  const width = duck.isCpu ? 178 : 174;
  const height = duck.isCpu ? 196 : 202;

  const bob = Math.sin(duck.walkTick) * 3;

  ctx.save();

  ctx.translate(duck.x, duck.y + bob);

  if (duck.hitFrame > 0) {
    ctx.globalAlpha = 0.62;
  }

  ctx.fillStyle = "rgba(0,0,0,0.36)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 66, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(duck.facing, 1);

  if (duck.image.complete) {
    ctx.drawImage(
      duck.image,
      -width / 2,
      -height,
      width,
      height
    );
  } else {
    drawFallbackDuck(duck);
  }

  if (duck.attackFrame > 0) {
    drawAttackEffect(duck);
  }

  ctx.restore();
}

function drawFallbackDuck(duck) {
  ctx.fillStyle = duck.isCpu ? "#7c3aed" : "#38bdf8";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.ellipse(0, -75, 45, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.ellipse(42, -115, 30, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawAttackEffect(duck) {
  const isSpecial = duck.specialFrame > 0;
  const size = isSpecial ? 42 : 27;

  const g = ctx.createRadialGradient(72, -110, 4, 72, -110, size);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.45, isSpecial ? "#a855f7" : "#fde047");
  g.addColorStop(1, isSpecial ? "#581c87" : "#f97316");

  ctx.fillStyle = g;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.arc(72, -110, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "900 15px Arial";
  ctx.textAlign = "center";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;
  ctx.strokeText(isSpecial ? "BOOM!" : "POW!", 72, -105);
  ctx.fillText(isSpecial ? "BOOM!" : "POW!", 72, -105);
  ctx.textAlign = "left";
}

function drawParticles() {
  particles.forEach(function (p) {
    if (p.type === "text") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "900 25px Arial";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 5;
      ctx.fillStyle = "#fff";
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    } else {
      ctx.fillStyle = "#facc15";
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  });
}

function gameLoop() {
  if (!gameScreen.classList.contains("hide") && !gameOver) {
    controlPlayer();
    cpuBrain();
    updateDuck(player);
    updateDuck(cpu);
    updateParticles();
  }

  ctx.save();

  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.82;

    if (shake < 0.5) {
      shake = 0;
    }
  }

  drawArena();
  drawDuck(player);
  drawDuck(cpu);
  drawParticles();

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

showOnly(walletScreen);
updateWalletUI();
resetFight();
gameLoop();
