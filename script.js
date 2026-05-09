/**
 * FLAPPY BIRD - OPTIMIZED & BALANCED EDITION
 * Graphics Toggle + Difficulty Rework
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiStart = document.getElementById('start-screen');
const uiGameOver = document.getElementById('game-over-screen');
const scoreHud = document.getElementById('score-hud');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const modeDisplayEl = document.getElementById('mode-display');
const newRecordMsg = document.getElementById('new-record-msg');
const restartBtn = document.getElementById('restart-btn');
const btnEasy = document.getElementById('btn-easy');
const btnNightmare = document.getElementById('btn-nightmare');
const btnGraphics = document.getElementById('btn-graphics'); // Nuevo
const skinBtns = document.querySelectorAll('.skin-btn');

// Variables de Estado
let frames = 0;
let score = 0;
let currentMode = 'easy'; 
let gameState = 'START'; 
let currentSkin = 'bird';
let currentPipeSkin = 'classic';
let graphicsQuality = 'high'; // 'high' o 'low'

// Física
let gameSpeedBase = 0;
let pipeGapBase = 0;
let birdGravity = 0;
let birdJump = 0;

const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;

function resize() {
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
}
window.addEventListener('resize', resize);
resize();

// --- Lógica de Selectores ---
skinBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (type === 'player') {
            document.querySelectorAll(`[data-type="player"]`).forEach(b => b.classList.remove('active'));
            currentSkin = btn.getAttribute('data-skin');
        } else if (type === 'pipe') {
            document.querySelectorAll(`[data-type="pipe"]`).forEach(b => b.classList.remove('active'));
            currentPipeSkin = btn.getAttribute('data-skin');
        }
        btn.classList.add('active');
    });
});

// Botón Gráficos
btnGraphics.addEventListener('click', () => {
    graphicsQuality = (graphicsQuality === 'high') ? 'low' : 'high';
    btnGraphics.innerText = `⚙️ GRÁFICOS: ${graphicsQuality === 'high' ? 'ALTO' : 'BAJO'}`;
    // Cambiar color del botón para feedback visual
    btnGraphics.style.backgroundColor = graphicsQuality === 'high' ? '#34495e' : '#7f8c8d';
});

// --- Audio ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'score') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    }
}

// --- Objetos ---

const background = {
    x: 0,
    draw: function() {
        // Si calidad baja, color plano. Si alta, degradado.
        if (graphicsQuality === 'low') {
            ctx.fillStyle = currentMode === 'nightmare' ? '#2c3e50' : '#4fc3f7';
        } else {
            let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, currentMode === 'nightmare' ? '#2c3e50' : '#4fc3f7');
            grad.addColorStop(1, currentMode === 'nightmare' ? '#000' : '#0288d1');
            ctx.fillStyle = grad;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Nubes (Simplificadas en Low)
        ctx.fillStyle = currentMode === 'nightmare' ? '#7f8c8d' : '#fff';
        const cloudPositions = [50, 150, 260];
        cloudPositions.forEach((pos, index) => {
            let x = (pos - this.x * (currentMode === 'nightmare' ? 0.8 : 0.5)) % (canvas.width + 100);
            if (x < -60) x += canvas.width + 100;
            
            if(graphicsQuality === 'high') {
                let grad = ctx.createRadialGradient(x+25, 310, 5, x+25, 310, 40);
                grad.addColorStop(0, 'rgba(255,255,255,0.9)');
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = grad;
            }
            
            ctx.beginPath();
            ctx.arc(x, 300 - index*40, 30, 0, Math.PI * 2);
            ctx.arc(x + 25, 310 - index*40, 40, 0, Math.PI * 2);
            ctx.arc(x + 50, 300 - index*40, 30, 0, Math.PI * 2);
            ctx.fill();
        });
    },
    update: function() {
        if (gameState === 'PLAYING' || gameState === 'START') {
            this.x += currentMode === 'nightmare' ? 0.8 : 0.5;
        }
    }
};

const ground = {
    y: 400, 
    x: 0,
    draw: function() {
        let groundColor = currentMode === 'nightmare' ? '#424242' : '#8d6e63';
        let grassColor = currentMode === 'nightmare' ? '#212121' : '#66bb6a';
        
        ctx.fillStyle = groundColor;
        ctx.fillRect(0, this.y, canvas.width, canvas.height - this.y);
        ctx.fillStyle = grassColor;
        ctx.fillRect(0, this.y, canvas.width, 15);
        
        // Detalles de suelo solo en calidad Alta
        if (graphicsQuality === 'high') {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = '#3e2723';
            ctx.lineWidth = 2;
            for (let i = this.x % 20; i < canvas.width; i += 20) {
                ctx.moveTo(i, this.y + 20);
                ctx.lineTo(i - 10, canvas.height);
            }
            ctx.stroke();
            ctx.restore();
        }
    },
    update: function() {
        if (gameState === 'PLAYING') {
            let currentSpeed = gameSpeedBase + (score * (currentMode === 'nightmare' ? 0.1 : 0.05));
            this.x = (this.x + currentSpeed) % 20;
        }
    }
};

const pipes = {
    items: [],
    w: 52,
    dx: 0, 
    gap: 0, 
    lastGapY: 200,

    draw: function() {
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            let topY = p.y;
            let bottomY = p.y + this.gap;
            this.drawOnePipe(p.x, 0, this.w, topY, true);
            this.drawOnePipe(p.x, bottomY, this.w, ground.y - bottomY, false);
        }
    },

    drawOnePipe: function(x, y, w, h, isTop) {
        if (h <= 0) return;
        
        ctx.save();
        
        if (currentPipeSkin === 'classic') {
            if (graphicsQuality === 'low') {
                ctx.fillStyle = '#2e7d32'; // Plano
            } else {
                let grad = ctx.createLinearGradient(x, 0, x + w, 0);
                grad.addColorStop(0, '#2e7d32');
                grad.addColorStop(0.5, '#4caf50');
                grad.addColorStop(1, '#1b5e20');
                ctx.fillStyle = grad;
            }
            ctx.fillRect(x, y, w, h);
            
            ctx.lineWidth = 2; ctx.strokeStyle = '#1b5e20'; ctx.strokeRect(x, y, w, h);

            let capH = 24; let capY = isTop ? y + h - capH : y;
            let capW = w + 4; let capX = x - 2;
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(capX, capY, capW, capH);
            ctx.strokeRect(capX, capY, capW, capH);
            
            if (graphicsQuality === 'high') {
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(x + 4, y, 4, h);
            }
            
        } else if (currentPipeSkin === 'industrial') {
            if (graphicsQuality === 'low') {
                ctx.fillStyle = '#546e7a'; // Plano
            } else {
                let grad = ctx.createLinearGradient(x, 0, x + w, 0);
                grad.addColorStop(0, '#546e7a');
                grad.addColorStop(0.5, '#90a4ae');
                grad.addColorStop(1, '#37474f');
                ctx.fillStyle = grad;
            }
            ctx.fillRect(x, y, w, h);
            ctx.lineWidth = 2; ctx.strokeStyle = '#263238'; ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = '#f1c40f';
            for(let py=y; py<y+h; py+=50) {
                ctx.fillRect(x, py, w, 10);
            }
            
            ctx.fillStyle = '#cfd8dc';
            ctx.beginPath(); ctx.arc(x+6, y+10, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(x+w-6, y+10, 2, 0, Math.PI*2); ctx.fill();

            let capH = 24; let capY = isTop ? y + h - capH : y;
            let capW = w + 6; let capX = x - 3;
            ctx.fillStyle = '#78909c';
            ctx.fillRect(capX, capY, capW, capH);
            ctx.strokeRect(capX, capY, capW, capH);

        } else if (currentPipeSkin === 'neon') {
            // En baja calidad neon es caro, simplificamos
            if(graphicsQuality === 'low') {
                ctx.fillStyle = '#000';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = '#00f3ff';
                ctx.fillRect(x+5, y, 4, h);
            } else {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f3ff';
                ctx.fillStyle = '#000';
                ctx.fillRect(x, y, w, h);
                ctx.lineWidth = 2; ctx.strokeStyle = '#00f3ff'; ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = '#00f3ff';
                ctx.fillRect(x+5, y, 4, h);
            }

            let capH = 24; let capY = isTop ? y + h - capH : y;
            let capW = w + 4; let capX = x - 2;
            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(capX, capY, capW, capH);
            if(graphicsQuality === 'high') {
                ctx.shadowBlur = 15;
                ctx.strokeRect(capX, capY, capW, capH);
            } else {
                ctx.strokeRect(capX, capY, capW, capH);
            }
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    },

    update: function() {
        if (gameState !== 'PLAYING') return;

        if (currentMode === 'easy') {
            this.dx = 2; 
            this.gap = 150; 
            
            if (frames % 120 === 0) {
                let y = Math.floor(Math.random() * (ground.y - this.gap - 150)) + 50;
                this.items.push({ x: canvas.width, y: y, passed: false });
                this.lastGapY = y;
            }
        } else {
            // --- CAMBIOS DE DIFICULTAD (REBALANCEO) ---
            // 1. Hueco más generoso y se reduce más lento
            let dynamicGap = Math.max(90, 110 - (score * 1)); 
            this.gap = dynamicGap;
            
            // 2. Velocidad con techo (no infinita)
            this.dx = 2 + Math.min(score * 0.08, 4); 
            
            let spawnRate = Math.max(90, 120 - (score * 2));

            if (frames % Math.floor(spawnRate) === 0) {
                let y;
                if (score < 5) {
                    y = Math.floor(Math.random() * (ground.y - this.gap - 150)) + 50;
                } else {
                    const chance = Math.random();
                    if (chance < 0.4) y = Math.floor(Math.random() * (ground.y - this.gap - 150)) + 50;
                    else if (chance < 0.7) {
                        // 3. Salto vertical menos agresivo (80px en vez de 120px)
                        y = this.lastGapY - 80; 
                        if (y < 20) y = 20;
                    } else {
                        y = this.lastGapY + 80;
                        let maxY = ground.y - this.gap - 20;
                        if (y > maxY) y = maxY;
                    }
                }
                this.items.push({ x: canvas.width, y: y, passed: false });
                this.lastGapY = y;
            }
        }

        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x -= this.dx;

            // AABB Collision
            let birdLeft = bird.x - bird.radius + 4; 
            let birdRight = bird.x + bird.radius - 4;
            let birdTop = bird.y - bird.radius + 4;
            let birdBottom = bird.y + bird.radius - 4;

            let pipeTopHeight = p.y;
            let pipeBottomY = p.y + this.gap;

            if (birdRight > p.x && birdLeft < p.x + this.w) {
                if (birdTop < pipeTopHeight || birdBottom > pipeBottomY) {
                   gameOver();
                }
            }

            if (p.x + this.w < bird.x && !p.passed) {
                score++;
                p.passed = true;
                scoreHud.innerText = score;
                playSound('score');
            }

            if (p.x + this.w < 0) {
                this.items.shift();
                i--;
            }
        }
    },
    reset: function() {
        this.items = [];
        this.lastGapY = 200;
        this.gap = pipeGapBase;
        this.dx = gameSpeedBase;
    }
};

const bird = {
    x: 50,
    y: 150,
    radius: 13,
    speed: 0,
    gravity: 0, 
    jump: 0,    
    rotation: 0,

    draw: function() {
        ctx.save();
        ctx.translate(this.x, this.y);
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.speed * 0.1)));
        ctx.rotate(this.rotation);

        // 1. PAJARO CLÁSICO
        if (currentSkin === 'bird') {
            if (graphicsQuality === 'high') {
                let bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, this.radius);
                bodyGrad.addColorStop(0, '#fff176');
                bodyGrad.addColorStop(1, '#fbc02d');
                ctx.fillStyle = bodyGrad;
            } else {
                ctx.fillStyle = '#fbc02d';
            }
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
            ctx.lineWidth = 1.5; ctx.strokeStyle = '#f57f17'; ctx.stroke();

            // Ojo
            ctx.fillStyle = '#fff'; 
            ctx.beginPath(); ctx.ellipse(6, -6, 5, 6, 0, 0, Math.PI*2); ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#000'; 
            ctx.beginPath(); ctx.arc(8, -5, 2, 0, Math.PI*2); ctx.fill();
            
            if (graphicsQuality === 'high') {
                let beakGrad = ctx.createLinearGradient(8, 0, 20, 6);
                beakGrad.addColorStop(0, '#ff9800'); beakGrad.addColorStop(1, '#e65100');
                ctx.fillStyle = beakGrad;
            } else {
                ctx.fillStyle = '#e65100';
            }
            ctx.beginPath(); 
            ctx.moveTo(8, 2); ctx.lineTo(18, 6); ctx.lineTo(8, 10); 
            ctx.fill(); ctx.stroke();
            
            if (graphicsQuality === 'high') {
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath(); ctx.ellipse(-4, 4, 8, 5, 0.2, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillStyle = '#fdd835';
                ctx.beginPath(); ctx.ellipse(-4, 4, 8, 5, 0.2, 0, Math.PI*2); ctx.fill();
            }
        }

        // 2. ALIEN
        else if (currentSkin === 'alien') {
            if (graphicsQuality === 'high') {
                let bodyGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, this.radius);
                bodyGrad.addColorStop(0, '#69f0ae'); bodyGrad.addColorStop(1, '#00c853');
                ctx.fillStyle = bodyGrad;
            } else {
                ctx.fillStyle = '#00c853';
            }
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#1b5e20'; ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(4, -3, 4.5, 6, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-4, -3, 4.5, 6, 0, 0, Math.PI*2); ctx.fill();

            if(graphicsQuality === 'high') {
                ctx.fillStyle = '#fff'; 
                ctx.beginPath(); ctx.arc(2, -5, 1.5, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(-6, -5, 1.5, 0, Math.PI*2); ctx.fill();
            }

            ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, -18); ctx.stroke();
            ctx.fillStyle = '#ff1744'; 
            ctx.beginPath(); ctx.arc(0, -19, 2.5, 0, Math.PI*2); ctx.fill();
        }

        // 3. PATO
        else if (currentSkin === 'duck') {
            if (graphicsQuality === 'high') {
                let bodyGrad = ctx.createRadialGradient(-2, 0, 2, 0, 0, this.radius);
                bodyGrad.addColorStop(0, '#ffcc80'); bodyGrad.addColorStop(1, '#ef6c00');
                ctx.fillStyle = bodyGrad;
            } else {
                ctx.fillStyle = '#ef6c00';
            }
            ctx.beginPath(); ctx.ellipse(0, 2, this.radius, this.radius-2, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#e65100'; ctx.stroke();

            ctx.fillStyle = '#ff9800';
            ctx.fillRect(6, -2, 10, 6); ctx.strokeRect(6, -2, 10, 6);
            ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(10, 4); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4, -5, 3, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -5, 1, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(-2, -8, 8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        }

        // 4. CERDO
        else if (currentSkin === 'pig') {
            if (graphicsQuality === 'high') {
                let bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius);
                bodyGrad.addColorStop(0, '#f8bbd0'); bodyGrad.addColorStop(1, '#ec407a');
                ctx.fillStyle = bodyGrad;
            } else {
                ctx.fillStyle = '#ec407a';
            }
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#880e4f'; ctx.stroke();

            if (graphicsQuality === 'high') {
                let snoutGrad = ctx.createRadialGradient(6, 2, 1, 6, 2, 5);
                snoutGrad.addColorStop(0, '#f48fb1'); snoutGrad.addColorStop(1, '#d81b60');
                ctx.fillStyle = snoutGrad;
            } else {
                ctx.fillStyle = '#d81b60';
            }
            ctx.beginPath(); ctx.ellipse(6, 2, 5, 4, 0, 0, Math.PI*2); ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#880e4f';
            ctx.beginPath(); ctx.ellipse(4, 2, 1.2, 2, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(8, 2, 1.2, 2, 0, 0, Math.PI*2); ctx.fill();

            ctx.fillStyle = '#f8bbd0';
            ctx.beginPath(); ctx.ellipse(-8, -8, 5, 3, -0.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(8, -8, 5, 3, 0.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        }

        // 5. ORNITORRINCO
        else if (currentSkin === 'platypus') {
            if (graphicsQuality === 'high') {
                let bodyGrad = ctx.createRadialGradient(-2, 0, 2, 0, 0, this.radius);
                bodyGrad.addColorStop(0, '#a1887f'); bodyGrad.addColorStop(1, '#5d4037');
                ctx.fillStyle = bodyGrad;
            } else {
                ctx.fillStyle = '#5d4037';
            }
            ctx.beginPath(); ctx.ellipse(0, 2, this.radius, this.radius-2, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#3e2723'; ctx.stroke();

            ctx.fillStyle = '#ffca28';
            ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(16, 2); ctx.lineTo(6, 6); ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(2, -4, 3, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(3, -4, 1.5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#8d6e63';
            ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-20, -5); ctx.lineTo(-20, 5); ctx.fill();
            ctx.stroke();
        }

        // 6. UNICORNIO
        else if (currentSkin === 'unicorn') {
            if (graphicsQuality === 'high') {
                let bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius);
                bodyGrad.addColorStop(0, '#fff'); bodyGrad.addColorStop(1, '#cfd8dc');
                ctx.fillStyle = bodyGrad;
            } else {
                ctx.fillStyle = '#fff';
            }
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#b0bec5'; ctx.stroke();

            if (graphicsQuality === 'high') {
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#e91e63'; ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(-8, -4); ctx.stroke();
                ctx.strokeStyle = '#9c27b0'; ctx.beginPath(); ctx.moveTo(-2, -11); ctx.lineTo(-2, -4); ctx.stroke();
                ctx.strokeStyle = '#2196f3'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(4, -4); ctx.stroke();
                ctx.strokeStyle = '#4caf50'; ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(8, -4); ctx.stroke();
                ctx.lineWidth = 1;
            }

            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(6, -22); ctx.lineTo(10, -12); ctx.fill();
            ctx.stroke();
            if(graphicsQuality === 'high') {
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, -18, 2, 0, Math.PI*2); ctx.fill();
            }
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(6, -5, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(1, -11); ctx.stroke();
        }

        // 7. BERENJENA
        else if (currentSkin === 'eggplant') {
            if (graphicsQuality === 'high') {
                let bodyGrad = ctx.createRadialGradient(-3, 0, 2, 0, 4, 14);
                bodyGrad.addColorStop(0, '#7b1fa2'); bodyGrad.addColorStop(1, '#4a148c');
                ctx.fillStyle = bodyGrad;
            } else {
                ctx.fillStyle = '#4a148c';
            }
            ctx.beginPath(); ctx.ellipse(0, 4, 10, 14, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#38006b'; ctx.stroke();

            if (graphicsQuality === 'high') {
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.ellipse(-3, -2, 3, 8, -0.2, 0, Math.PI*2); ctx.fill();

                let stemGrad = ctx.createLinearGradient(-3, -14, 3, -10);
                stemGrad.addColorStop(0, '#66bb6a'); stemGrad.addColorStop(1, '#2e7d32');
                ctx.fillStyle = stemGrad;
            } else {
                ctx.fillStyle = '#2e7d32';
            }
            ctx.fillRect(-3, -14, 6, 6);
            ctx.strokeRect(-3, -14, 6, 6);
            ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(8, -18, 10, -10); ctx.quadraticCurveTo(4, -10, 0, -10); ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    },

    update: function() {
        if (gameState === 'START') {
            this.y = 150 + Math.cos(frames * 0.1) * 5;
            this.speed = 0;
            this.rotation = 0;
        } else if (gameState === 'PLAYING') {
            this.speed += this.gravity;
            this.y += this.speed;

            if (this.y + this.radius >= ground.y) {
                this.y = ground.y - this.radius;
                gameOver();
            }
            if (this.y - this.radius <= 0) {
                this.y = this.radius;
                this.speed = 0;
            }
        } else if (gameState === 'GAMEOVER') {
            if (this.y + this.radius < ground.y) {
                this.speed += this.gravity * 2;
                this.y += this.speed;
                this.rotation = Math.PI / 2;
            } else {
                this.y = ground.y - this.radius;
                this.speed = 0;
            }
        }
    },

    flap: function() {
        this.speed = -this.jump;
        playSound('jump');
    }
};

// --- Funciones de Control ---

function setMode(mode) {
    currentMode = mode;
    if (mode === 'easy') {
        gameSpeedBase = 2;
        pipeGapBase = 150;
        birdGravity = 0.25;
        birdJump = 4.6;
    } else {
        gameSpeedBase = 3;
        pipeGapBase = 100;
        birdGravity = 0.35;
        birdJump = 5.5;
    }
    pipes.dx = gameSpeedBase;
    pipes.gap = pipeGapBase;
    bird.gravity = birdGravity;
    bird.jump = birdJump;
}

function startGame(mode) {
    initAudio();
    setMode(mode);
    gameState = 'PLAYING';
    uiStart.classList.add('hidden');
    uiGameOver.classList.add('hidden');
    scoreHud.classList.remove('hidden');
    bird.flap();
}

function gameOver() {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';
    playSound('hit');

    setTimeout(() => {
        scoreHud.classList.add('hidden');
        finalScoreEl.innerText = score;
        modeDisplayEl.innerText = currentMode.toUpperCase();
        
        let storageKey = currentMode === 'easy' ? 'flappyEasyHighScore' : 'flappyNightmareHighScore';
        let highScore = localStorage.getItem(storageKey) || 0;
        let isNewRecord = false;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem(storageKey, highScore);
            isNewRecord = true;
        }
        bestScoreEl.innerText = highScore;

        if (isNewRecord) newRecordMsg.classList.remove('hidden');
        else newRecordMsg.classList.add('hidden');

        uiGameOver.classList.remove('hidden');
        gameState = 'GAMEOVER_STOPPED';
    }, 500);
}

function resetGame() {
    bird.y = 150;
    bird.speed = 0;
    bird.rotation = 0;
    pipes.reset();
    score = 0;
    scoreHud.innerText = score;
    frames = 0;
    gameState = 'START';
    
    uiGameOver.classList.add('hidden');
    uiStart.classList.remove('hidden');
    
    gameState = 'START';
    loop();
}

// --- Eventos ---

btnEasy.addEventListener('click', () => startGame('easy'));
btnNightmare.addEventListener('click', () => startGame('nightmare'));

function handleInput(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (e.type === 'keydown') e.preventDefault();
    if (gameState === 'PLAYING') {
        bird.flap();
    }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('touchstart', (e) => {
    if (gameState === 'PLAYING' && e.target.tagName !== 'BUTTON') {
        bird.flap();
        e.preventDefault(); 
    }
}, {passive: false});
window.addEventListener('mousedown', (e) => {
    if (gameState === 'PLAYING' && e.target.tagName !== 'BUTTON') {
        bird.flap();
    }
});

restartBtn.addEventListener('click', resetGame);

// Loop
function loop() {
    update();
    draw();
    frames++;
    if (gameState !== 'GAMEOVER_STOPPED') {
        requestAnimationFrame(loop);
    }
}

function update() {
    background.update();
    pipes.update();
    ground.update();
    bird.update();
}

function draw() {
    background.draw();
    pipes.draw();
    ground.draw();
    bird.draw();
}

loop();