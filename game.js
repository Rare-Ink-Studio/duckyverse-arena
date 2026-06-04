const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const howScreen = document.getElementById('howScreen');
const gameScreen = document.getElementById('gameScreen');
const winnerBox = document.getElementById('winner');
const keys = {};
const gravity = 0.72;
const groundY = 420;
let gameOver = false;
let shake = 0;
let ghosts = [];
let particles = [];
let trainTimer = 0;
let trainX = -1100;

const p1 = makeFighter('Super Duck', 170, '#38bdf8', '#1d4ed8', 1);
const p2 = makeFighter('Bat Duck', 720, '#111827', '#6b21a8', -1);

function makeFighter(name, x, body, cape, facing){return {name,x,y:groundY,w:72,h:104,vx:0,vy:0,speed:5.2,health:100,body,cape,facing,onGround:true,attacking:0,special:0,cooldown:0,hitFlash:0,wins:0}}
function show(el){el.classList.remove('hide')} function hide(el){el.classList.add('hide')}
document.getElementById('startBtn').onclick=()=>{hide(startScreen);show(gameScreen);restartGame()};
document.getElementById('howBtn').onclick=()=>{hide(startScreen);show(howScreen)};
document.getElementById('backBtn').onclick=()=>{hide(howScreen);show(startScreen)};
document.getElementById('resetBtn').onclick=restartGame;

document.addEventListener('keydown', e=>{keys[e.key]=true; if(e.key==='f')attack(p1,p2,false); if(e.key==='/')attack(p2,p1,false); if(e.key==='g')attack(p1,p2,true); if(e.key==='.')attack(p2,p1,true)});
document.addEventListener('keyup', e=>keys[e.key]=false);
document.querySelectorAll('[data-key]').forEach(btn=>{const k=btn.dataset.key; btn.addEventListener('touchstart',e=>{e.preventDefault();keys[k]=true;if(['f','g','/','.'].includes(k)){attack(k==='/'||k==='.'?p2:p1,k==='/'||k==='.'?p1:p2,k==='g'||k==='.')}},{passive:false}); btn.addEventListener('touchend',e=>{e.preventDefault();keys[k]=false},{passive:false}); btn.addEventListener('mousedown',()=>{keys[k]=true}); btn.addEventListener('mouseup',()=>{keys[k]=false});});

function restartGame(){Object.assign(p1, makeFighter('Super Duck',170,'#38bdf8','#1d4ed8',1)); Object.assign(p2, makeFighter('Bat Duck',720,'#111827','#6b21a8',-1)); gameOver=false; winnerBox.textContent=''; hide(winnerBox); particles=[]; ghosts=[]; trainX=-1100; trainTimer=0; updateBars()}
function control(p,left,right,jump){p.vx=0;if(keys[left]){p.vx=-p.speed;p.facing=-1} if(keys[right]){p.vx=p.speed;p.facing=1} if(keys[jump]&&p.onGround){p.vy=-15.5;p.onGround=false} p.vy+=gravity;p.x+=p.vx;p.y+=p.vy;if(p.y>=groundY){p.y=groundY;p.vy=0;p.onGround=true} p.x=Math.max(20,Math.min(canvas.width-p.w-20,p.x)); if(p.cooldown>0)p.cooldown--; if(p.attacking>0)p.attacking--; if(p.special>0)p.special--; if(p.hitFlash>0)p.hitFlash--}
function attack(a,d,special){if(gameOver||a.attacking>0||a.cooldown>0)return; a.attacking=special?28:16; a.special=special?28:0; a.cooldown=special?58:22; const ax=a.x+a.w/2+a.facing*(special?92:64), ay=a.y+38; const dx=d.x+d.w/2, dy=d.y+45; const dist=Math.hypot(ax-dx, ay-dy); if(dist<(special?112:78)){const dmg=special?18:9; d.health=Math.max(0,d.health-dmg); d.vx=a.facing*(special?12:7); d.vy=special?-8:-4; d.hitFlash=10; shake=special?16:8; burst(dx,dy,special?'SPECIAL QUACK!':'QUACK!'); if(d.health<=0)end(`${a.name.toUpperCase()} WINS!\nQUACKTORY!`)}}
function end(text){gameOver=true;winnerBox.textContent=text;show(winnerBox)}
function burst(x,y,word){particles.push({x,y,word,t:42}); for(let i=0;i<10;i++)particles.push({x,y,vx:(Math.random()-.5)*8,vy:(Math.random()-.8)*8,t:30})}
function updateBars(){document.getElementById('p1Bar').style.width=p1.health+'%';document.getElementById('p2Bar').style.width=p2.health+'%'}
function drawArena(){const g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,'#08122d');g.addColorStop(.58,'#161625');g.addColorStop(1,'#0b0b12');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);ctx.fillStyle='#e0f2fe';ctx.beginPath();ctx.arc(790,82,38,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.8)';for(let i=0;i<60;i++){ctx.fillRect((i*73)%960,(i*47)%260,2,2)} ctx.fillStyle='#030712';for(let i=0;i<960;i+=55){ctx.fillRect(i,310+(i%3)*16,40,150)} ctx.fillStyle='#1f2937';ctx.fillRect(0,392,960,72);ctx.fillStyle='#64748b';ctx.fillRect(0,420,960,12);ctx.fillStyle='#334155';for(let i=0;i<960;i+=80){ctx.fillRect(i,448,58,9)} ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(92,155,10,235);ctx.beginPath();ctx.arc(97,150,28,Math.PI,0);ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=7;ctx.stroke();ctx.fillStyle='rgba(250,204,21,.25)';ctx.beginPath();ctx.moveTo(78,170);ctx.lineTo(126,170);ctx.lineTo(188,392);ctx.lineTo(28,392);ctx.fill();drawTrain();ctx.fillStyle='#f8fafc';ctx.font='900 28px Arial';ctx.textAlign='center';ctx.fillText('PHANTOM TRAIN STATION',480,44);ctx.textAlign='left'}
function drawTrain(){trainTimer++; if(trainTimer>550){trainX+=18;if(trainX>1200){trainX=-1100;trainTimer=0}} if(trainTimer>550){ctx.fillStyle='rgba(15,23,42,.82)';ctx.fillRect(trainX,230,840,100);ctx.fillStyle='rgba(56,189,248,.35)';for(let i=0;i<9;i++)ctx.fillRect(trainX+45+i*86,250,52,38);ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(trainX+830,250,80,40)}}
function drawDuck(p){ctx.save();ctx.translate(p.x,p.y);if(p.hitFlash)ctx.globalAlpha=.55;ctx.fillStyle=p.cape;ctx.beginPath();ctx.moveTo(22,8);ctx.lineTo(p.facing===1?-18:90,105);ctx.lineTo(55,78);ctx.fill();ctx.fillStyle=p.body;ctx.beginPath();ctx.ellipse(36,58,35,47,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(36,6,33,0,Math.PI*2);ctx.fill();ctx.fillStyle='#facc15';ctx.beginPath(); if(p.facing===1){ctx.ellipse(68,8,22,10,0,0,Math.PI*2)}else{ctx.ellipse(4,8,22,10,0,0,Math.PI*2)}ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(25,-2,9,0,Math.PI*2);ctx.arc(47,-2,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#020617';ctx.beginPath();ctx.arc(25+p.facing*2,-2,4,0,Math.PI*2);ctx.arc(47+p.facing*2,-2,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f59e0b';ctx.fillRect(8,101,26,11);ctx.fillRect(43,101,26,11);ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.strokeRect(8,101,26,11);ctx.strokeRect(43,101,26,11);if(p.name==='Bat Duck'){ctx.fillStyle='#020617';ctx.beginPath();ctx.arc(36,38,19,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(28,35,5,0,Math.PI*2);ctx.arc(44,35,5,0,Math.PI*2);ctx.fill()} else {ctx.fillStyle='#1e3a8a';ctx.fillRect(14,18,44,13)} if(p.attacking>0){ctx.fillStyle=p.special?'#f97316':'#fde047';ctx.beginPath();ctx.arc(36+p.facing*(p.special?95:65),44,p.special?28:18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 16px Arial';ctx.fillText(p.special?'BOOM!':'POW!',36+p.facing*(p.special?68:48),18)}ctx.restore()}
function drawParticles(){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.t--;if(p.word){ctx.fillStyle='#fff';ctx.font='900 26px Arial';ctx.fillText(p.word,p.x-70,p.y-p.t)}else{p.x+=p.vx;p.y+=p.vy;p.vy+=.3;ctx.fillStyle='#facc15';ctx.fillRect(p.x,p.y,6,6)}if(p.t<=0)particles.splice(i,1)}}
function loop(){if(!gameOver){control(p1,'a','d','w');control(p2,'ArrowLeft','ArrowRight','ArrowUp')} updateBars();ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.82;if(shake<.5)shake=0} drawArena();drawDuck(p1);drawDuck(p2);drawParticles();ctx.restore();requestAnimationFrame(loop)}
loop();
