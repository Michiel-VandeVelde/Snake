(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.querySelector('#score');
  const bestEl = document.querySelector('#best');
  const levelEl = document.querySelector('#level');
  const overlay = document.querySelector('#overlay');
  const overlayTitle = document.querySelector('#overlayTitle');
  const overlayText = document.querySelector('#overlayText');
  const startButton = document.querySelector('#startButton');
  const soundButton = document.querySelector('#soundButton');
  const difficultySelect = document.querySelector('#difficulty');

  const cells = 20;
  const cell = canvas.width / cells;
  const vectors = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
  const keyMap = { ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right' };
  const baseSpeeds = { relaxed:175, classic:140, turbo:105 };
  let snake, direction, queuedDirection, food, bonusFood, bonusTicks, apples, score;
  let running=false, paused=false, timer, audioOn=true, touchStart, currentDifficulty='classic';
  let best = Number(localStorage.getItem('neonSnakeBest')) || 0;
  bestEl.textContent = String(best).padStart(3,'0');

  function reset() {
    snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    direction = vectors.right;
    queuedDirection = direction;
    score = 0;
    apples = 0;
    bonusFood = null;
    bonusTicks = 0;
    placeFood();
    updateStats();
    draw();
  }

  function randomOpenCell(excluded=[]) {
    const open=[];
    for(let y=0;y<cells;y++) for(let x=0;x<cells;x++) {
      const occupied=snake.some(p=>p.x===x&&p.y===y)||excluded.some(p=>p&&p.x===x&&p.y===y);
      if(!occupied) open.push({x,y});
    }
    return open[Math.floor(Math.random()*open.length)];
  }

  function placeFood() { food = randomOpenCell([bonusFood]); }

  function placeBonusFood() {
    bonusFood = randomOpenCell([food]);
    bonusTicks = 45;
    beep(760,.09);
  }

  function updateStats() {
    scoreEl.textContent = String(score).padStart(3,'0');
    levelEl.textContent = String(Math.floor(score/50)+1).padStart(2,'0');
    bestEl.textContent = String(best).padStart(3,'0');
  }

  function speed() {
    return Math.max(55,baseSpeeds[currentDifficulty]-Math.floor(score/50)*12);
  }

  function start() {
    clearTimeout(timer);
    currentDifficulty=difficultySelect.value;
    reset();
    running=true; paused=false;
    difficultySelect.disabled=true;
    overlay.classList.add('hidden');
    schedule();
  }

  function schedule() { clearTimeout(timer); if(running&&!paused) timer=setTimeout(step,speed()); }

  function step() {
    direction=queuedDirection;
    const head={x:snake[0].x+direction.x,y:snake[0].y+direction.y};
    const hitWall=head.x<0||head.x>=cells||head.y<0||head.y>=cells;
    const eatingFood=head.x===food.x&&head.y===food.y;
    const eatingBonus=bonusFood&&head.x===bonusFood.x&&head.y===bonusFood.y;
    const eating=eatingFood||eatingBonus;
    const body=eating?snake:snake.slice(0,-1);
    if(hitWall||body.some(p=>p.x===head.x&&p.y===head.y)) return endGame();
    snake.unshift(head);
    if(eatingFood){
      score+=10;
      apples+=1;
      beep(560,.07);
      placeFood();
      if(apples%5===0) placeBonusFood();
    } else if(eatingBonus) {
      score+=30;
      bonusFood=null;
      bonusTicks=0;
      beep(920,.12);
    } else {
      snake.pop();
    }
    if(bonusFood&&!eatingBonus&&--bonusTicks<=0) bonusFood=null;
    if(score>best){best=score;localStorage.setItem('neonSnakeBest',best);}
    updateStats();
    draw(); schedule();
  }

  function endGame() {
    running=false; clearTimeout(timer); difficultySelect.disabled=false; beep(120,.2);
    overlayTitle.textContent='Game over';
    overlayText.textContent=`You scored ${score}. Your best is ${best}.`;
    startButton.textContent='Play again';
    overlay.classList.remove('hidden');
  }

  function setDirection(name) {
    const next=vectors[name]; if(!next) return;
    if(next.x!==-direction.x||next.y!==-direction.y) queuedDirection=next;
  }

  function togglePause() {
    if(!running) return;
    paused=!paused;
    if(paused){ clearTimeout(timer); overlayTitle.textContent='Paused'; overlayText.textContent='Press Space or tap Resume when you are ready.'; startButton.textContent='Resume'; overlay.classList.remove('hidden'); }
    else { overlay.classList.add('hidden'); schedule(); }
  }

  function draw() {
    ctx.fillStyle='#07110e'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#10231c'; ctx.lineWidth=1;
    for(let i=1;i<cells;i++){ctx.beginPath();ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,canvas.height);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*cell);ctx.lineTo(canvas.width,i*cell);ctx.stroke();}
    if(food){
      const x=food.x*cell+cell/2,y=food.y*cell+cell/2;
      ctx.shadowColor='#ff557d';ctx.shadowBlur=16;ctx.fillStyle='#ff557d';ctx.beginPath();ctx.arc(x,y,cell*.31,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#8cff6a';ctx.fillRect(x+1,y-cell*.42,2,6);
    }
    if(bonusFood){
      const x=bonusFood.x*cell+cell/2,y=bonusFood.y*cell+cell/2;
      const pulse=1+Math.sin(Date.now()/100)*.1;
      ctx.shadowColor='#ffd84a';ctx.shadowBlur=20;ctx.fillStyle='#ffd84a';ctx.beginPath();ctx.arc(x,y,cell*.34*pulse,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#7a4d00';ctx.font='bold 12px ui-monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('★',x,y+1);
    }
    snake.forEach((p,i)=>{
      const pad=i===0?1.5:2.5;
      ctx.fillStyle=i===0?'#c7ff55':`hsl(${137-i*.7} 75% ${Math.max(38,59-i*.7)}%)`;
      ctx.shadowColor=i===0?'#b8ff3d':'transparent';ctx.shadowBlur=i===0?13:0;
      roundedRect(p.x*cell+pad,p.y*cell+pad,cell-pad*2,cell-pad*2,5);ctx.fill();
      if(i===0) drawEyes(p);
    });
    ctx.shadowBlur=0;
  }

  function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function drawEyes(head){
    const bx=head.x*cell,by=head.y*cell; let points;
    if(direction.x){const ex=direction.x>0?14:6;points=[[ex,6],[ex,14]];}else{const ey=direction.y>0?14:6;points=[[6,ey],[14,ey]];}
    ctx.fillStyle='#07110e';points.forEach(([x,y])=>{ctx.beginPath();ctx.arc(bx+x,by+y,1.8,0,Math.PI*2);ctx.fill();});
  }

  function beep(freq,duration){
    if(!audioOn) return;
    try { const ac=new (window.AudioContext||window.webkitAudioContext)(); const osc=ac.createOscillator(); const gain=ac.createGain(); osc.frequency.value=freq; gain.gain.setValueAtTime(.05,ac.currentTime); gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration); osc.connect(gain).connect(ac.destination);osc.start();osc.stop(ac.currentTime+duration); } catch (_) {}
  }

  document.addEventListener('keydown',e=>{
    if(keyMap[e.key]){e.preventDefault();setDirection(keyMap[e.key]);}
    if(e.code==='Space'){e.preventDefault();togglePause();}
    if(e.key==='r'||e.key==='R') start();
  });
  document.querySelectorAll('[data-direction]').forEach(button=>button.addEventListener('pointerdown',()=>setDirection(button.dataset.direction)));
  canvas.addEventListener('pointerdown',e=>{touchStart={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;if(Math.max(Math.abs(dx),Math.abs(dy))>18)setDirection(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));touchStart=null;});
  startButton.addEventListener('click',()=>paused?togglePause():start());
  soundButton.addEventListener('click',()=>{audioOn=!audioOn;soundButton.textContent=audioOn?'♪':'×';soundButton.setAttribute('aria-label',audioOn?'Mute sound':'Enable sound');soundButton.setAttribute('aria-pressed',String(!audioOn));});
  reset();
})();
