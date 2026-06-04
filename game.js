const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const winnerBox = document.getElementById("winner");

const p1Health = document.getElementById("p1Health");
const p2Health = document.getElementById("p2Health");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

const keys = {
  left: false,
  right: false,
  jump: false,
  punch: false,
  special: false
};

let gameOver = false;
let shake = 0;
let particles = [];
let ghostTrainX = -1200;
let ghostTrainTimer = 0;

const gravity = 0.78;
const groundY = 420;

const player = {
  name: "Super Duck",
  x: 170,
  y: groundY,
  w: 76,
  h: 104,
  vx: 0,
  vy: 0,
  speed: 5.6,
  facing: 1,
  health: 100,
  attackTimer: 0,
  specialTimer: 0,
  cooldown: 0,
  hitFlash: 0,
  body: "#38bdf8",
  cape: "#1d4ed8"
};

const enemy = {
  name: "Bat Duck",
  x: 720,
  y: groundY,
  w: 76,
  h: 104,
  vx: 0,
  vy: 0,
  speed: 3.4,
  facing: -1,
  health: 100,
  attackTimer: 0,
  specialTimer: 0,
  cooldown: 0,
  aiTimer: 0,
  hitFlash: 0,
  body: "#111827",
  cape: "#6d28d9"
};

startBtn.addEventListener("click", () => {
  startScreen.classList.add("hide");
  gameScreen.classList.remove("hide");
  restartGame();
});

resetBtn.addEventListener("click", restartGame);

document.addEventListener("contextmenu", e => e.preventDefault());

document.addEventListener("keydown", e => {
  if (e.key === "a" || e.key === "A") keys.left = true;
  if (e.key === "d" || e.key === "D") keys.right = true;
  if (e.key === "w" || e.key === "W" || e.key === " ") keys.jump = true;

  if (e.key === "f" || e.key === "F") doAttack(player, enemy, false);
  if (e.key === "g" || e.key === "G") doAttack(player, enemy, true);
});

document.addEventListener("keyup", e => {
  if (e.key === "a" || e.key === "A") keys.left = false;
  if (e.key === "d" || e.key === "D") keys.right = false;
  if (e.key === "w" || e.key === "W" || e.key === " ") keys.jump = false;
});

document.querySelectorAll(".control-btn").forEach(button => {
  const action = button.dataset.key;

  const press = e => {
    e.preventDefault();
    button.classList.add("active");

    if (action === "punch") {
      doAttack(player, enemy, false);
      return;
    }

    if (action === "special") {
      doAttack(player, enemy, true);
      return;
    }

    keys[action] = true;
  };

  const release = e => {
    e.preventDefault();
    button.classList.remove("active");
    keys[action] = false;
  };

  button.addEventListener("touchstart", press, { passive: false });
  button.addEventListener("touchend", release, { passive: false });
  button.addEventListener("touchcancel", release, { passive: false });

  button.addEventListener("mousedown", press);
  button.addEventListener("mouseup", release);
  button.addEventListener("mouseleave", release);
});

function restartGame() {
  player.x = 170;
  player.y = groundY;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.health = 100;
  player.attackTimer = 0;
  player.specialTimer = 0;
  player.cooldown = 0;

  enemy.x = 720;
  enemy.y = groundY;
  enemy.vx = 0;
  enemy.vy = 0;
  enemy.facing = -1;
  enemy.health = 100;
  enemy.attackTimer = 0;
  enemy.specialTimer = 0;
  enemy.cooldown = 0;
  enemy.aiTimer = 0;

  particles = [];
  gameOver = false;
  winnerBox.classList.add("hide");
  winnerBox.textContent = "";

  updateHealthBars();
}

function updatePlayer() {
  player.vx = 0;

  if (keys.left) {
    player.vx = -player.speed;
    player.facing = -1;
  }

  if (keys.right) {
    player.vx = player.speed;
    player.facing = 1;
  }

  if (keys.jump && player.y >= groundY) {
    player.vy = -15.4;
  }

  moveFighter(player);
}

function updateEnemyAI() {
  const distance = Math.abs(center(enemy) - center(player));

  enemy.aiTimer--;

  if (center(enemy) < center(player)) {
    enemy.facing = 1;
  } else {
    enemy.facing = -1;
  }

  enemy.vx = 0;

  if (distance > 125) {
    enemy.vx = enemy.facing * enemy.speed;
  } else if (distance < 70) {
    enemy.vx = -enemy.facing * 2.1;
  }

  if (enemy.aiTimer <= 0 && distance < 125) {
    const useSpecial = Math.random() > 0.68;
    doAttack(enemy, player, useSpecial);
    enemy.aiTimer = useSpecial ? 95 : 58;
  }

  if (Math.random() < 0.006 && enemy.y >= groundY) {
    enemy.vy = -13.5;
  }

  moveFighter(enemy);
}

function moveFighter(f) {
  f.vy += gravity;

  f.x += f.vx;
  f.y += f.vy;

  if (f.y > groundY) {
    f.y = groundY;
    f.vy = 0;
  }

  f.x = Math.max(18, Math.min(canvas.width - f.w - 18, f.x));

  if (f.cooldown > 0) f.cooldown--;
  if (f.attackTimer > 0) f.attackTimer--;
  if (f.specialTimer > 0) f.specialTimer--;
  if (f.hitFlash > 0) f.hitFlash--;
}

function doAttack(attacker, defender, special) {
  if (gameOver) return;
  if (attacker.cooldown > 0) return;

  attacker.attackTimer = special ? 28 : 16;
  attacker.specialTimer = special ? 28 : 0;
  attacker.cooldown = special ? 62 : 24;

  /*
    This is the important upgrade:
    the duck now lunges forward when punching
    and dash-slams when using special.
  */
  attacker.vx += attacker.facing * (special ? 15 : 8);
  attacker.x += attacker.facing * (special ? 24 : 12);

  const hitRange = special ? 138 : 92;
  const damage = special ? 18 : 9;

  const attackPointX = center(attacker) + attacker.facing * (special ? 92 : 66);
  const attackPointY = attacker.y + 46;

  const defenderX = center(defender);
  const defenderY = defender.y + 48;

  const distance = Math.hypot(attackPointX - defenderX, attackPointY - defenderY);

  if (distance < hitRange) {
    defender.health = Math.max(0, defender.health - damage);

    defender.vx = attacker.facing * (special ? 13 : 8);
    defender.vy = special ? -9 : -5;
    defender.hitFlash = 10;

    shake = special ? 16 : 8;

    createImpact(
      defenderX,
      defenderY,
      special ? "SPECIAL QUACK!" : "QUACK!"
    );

    if (defender.health <= 0) {
      endGame(`${attacker.name.toUpperCase()} WINS!\nQUACKTORY!`);
    }
  } else {
    createImpact(
      attackPointX,
      attackPointY,
      special ? "WHOOSH!" : "MISS!"
    );
  }
}

function center(f) {
  return f.x + f.w / 2;
}

function endGame(text) {
  gameOver = true;
  winnerBox.textContent = text;
  winnerBox.classList.remove("hide");
}

function updateHealthBars() {
  p1Health.style.width = player.health + "%";
  p2Health.style.width = enemy.health + "%";

  p1Health.style.background =
    player.health < 35
      ? "linear-gradient(90deg, #ef4444, #f97316)"
      : "linear-gradient(90deg, #22c55e, #facc15)";

  p2Health.style.background =
    enemy.health < 35
      ? "linear-gradient(90deg, #ef4444, #f97316)"
      : "linear-gradient(90deg, #22c55e, #facc15)";
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

function drawDuck(f) {
  ctx.save();
  ctx.translate(f.x, f.y);

  if (f.hitFlash > 0) {
    ctx.globalAlpha = 0.55;
  }

  const bob = Math.sin(Date.now() / 120) * 2;

  ctx.fillStyle = f.cape;
  ctx.beginPath();
  ctx.moveTo(25, 12 + bob);
  ctx.lineTo(f.facing === 1 ? -22 : 98, 106);
  ctx.lineTo(56, 78);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = f.body;
  ctx.beginPath();
  ctx.ellipse(38, 58 + bob, 36, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(38, 7 + bob, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  if (f.facing === 1) {
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
  ctx.arc(27 + f.facing * 2, 0 + bob, 4, 0, Math.PI * 2);
  ctx.arc(49 + f.facing * 2, 0 + bob, 4, 0, Math.PI * 2);
  ctx.fill();

  if (f.name === "Super Duck") {
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(15, 21 + bob, 46, 13);
  }

  if (f.name === "Bat Duck") {
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.arc(38, 38 + bob, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(30, 35 + bob, 5, 0, Math.PI * 2);
    ctx.arc(46, 35 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(9, 101, 27, 11);
  ctx.fillRect(43, 101, 27, 11);

  if (f.attackTimer > 0) {
    const fistX = 38 + f.facing * (f.specialTimer > 0 ? 96 : 68);
    const fistY = 45;

    ctx.fillStyle = f.specialTimer > 0 ? "#38bdf8" : "#f97316";
    ctx.beginPath();
    ctx.arc(fistX, fistY, f.specialTimer > 0 ? 30 : 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "900 16px Arial";
    ctx.fillText(f.specialTimer > 0 ? "BOOM!" : "POW!", fistX - 25, fistY - 26);
  }

  ctx.restore();
}

function createImpact(x, y, text) {
  particles.push({
    type: "text",
    x,
    y,
    text,
    life: 34
  });

  for (let i = 0; i < 12; i++) {
    particles.push({
      type: "spark",
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.8) * 8,
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

function gameLoop() {
  if (!gameOver) {
    updatePlayer();
    updateEnemyAI();
  }

  updateHealthBars();

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
  drawDuck(enemy);
  drawParticles();

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

restartGame();
gameLoop();
