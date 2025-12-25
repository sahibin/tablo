
// Oyun Durumu
const state = {
    score: 0,
    timer: 30,
    interval: null,
    gameActive: false,
    currentQuestion: {},
    balloonInterval: null,
    starCount: 0,
    totalStars: 10
};

// Ses Efektleri (Basit osilatörler)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'correct') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'wrong') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'pop') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
    }
}

// Konfeti Efekti
function triggerConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

// Navigasyon
function selectGame(gameType) {
    document.querySelector('.screen.active').classList.remove('active');
    document.getElementById(`game-${gameType}`).classList.add('active');

    if (gameType === 'quick') startQuickGame();
    if (gameType === 'balloon') startBalloonGame();
    if (gameType === 'star') startStarGame();
}

function showMainMenu() {
    clearInterval(state.interval);
    clearInterval(state.balloonInterval);

    // Balonları temizle
    const container = document.getElementById('balloon-container');
    if (container) container.innerHTML = '';

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('main-menu').classList.add('active');
    document.getElementById('result-screen').style.display = 'none';
    state.gameActive = false;
}

// Oyun Sonu
function gameOver(message) {
    state.gameActive = false;
    clearInterval(state.interval);
    clearInterval(state.balloonInterval);

    const modal = document.getElementById('result-screen');
    const text = document.getElementById('result-text');

    text.innerHTML = `${message}<br>Skorun: ${state.score}`;
    modal.style.display = 'flex';
    triggerConfetti();
}

// Soru Üretici
function generateQuestion() {
    const num1 = Math.floor(Math.random() * 9) + 2; // 2-10 arası
    const num2 = Math.floor(Math.random() * 9) + 2;
    return { num1, num2, answer: num1 * num2 };
}

// --- HIZLI CEVAP OYUNU ---
function startQuickGame() {
    state.score = 0;
    state.timer = 60; // 60 saniye
    state.gameActive = true;

    updateQuickUI();
    nextQuickQuestion();

    state.interval = setInterval(() => {
        state.timer--;
        updateQuickUI();
        if (state.timer <= 0) {
            gameOver("Süre Doldu!");
        }
    }, 1000);
}

function updateQuickUI() {
    document.getElementById('quick-score').textContent = state.score;
    document.getElementById('quick-timer').textContent = state.timer;
}

function nextQuickQuestion() {
    if (!state.gameActive) return;

    const q = generateQuestion();
    state.currentQuestion = q;

    document.getElementById('quick-question').textContent = `${q.num1} x ${q.num2} = ?`;

    // Seçenekleri oluştur
    const answers = [q.answer];
    while (answers.length < 4) {
        const wrong = (Math.floor(Math.random() * 9) + 2) * (Math.floor(Math.random() * 9) + 2);
        if (!answers.includes(wrong)) answers.push(wrong);
    }

    // Karıştır
    answers.sort(() => Math.random() - 0.5);

    const grid = document.getElementById('quick-options');
    grid.innerHTML = '';

    answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = ans;
        btn.onclick = () => checkQuickAnswer(ans, btn);
        grid.appendChild(btn);
    });
}

function checkQuickAnswer(answer, btn) {
    if (!state.gameActive) return;

    if (answer === state.currentQuestion.answer) {
        playSound('correct');
        btn.classList.add('correct');
        state.score += 10;
        setTimeout(() => nextQuickQuestion(), 500);
    } else {
        playSound('wrong');
        btn.classList.add('wrong');
        setTimeout(() => {
            btn.classList.remove('wrong');
        }, 500);
    }
    updateQuickUI();
}

// --- BALON PATLATMA OYUNU ---
function startBalloonGame() {
    state.score = 0;
    state.gameActive = true;
    document.getElementById('balloon-score').textContent = 0;
    document.getElementById('balloon-container').innerHTML = '';

    nextBalloonTarget(); // İlk soruyu belirle

    // Balon üretmeye başla
    let spawnRate = 1200;
    state.balloonInterval = setInterval(() => {
        if (state.gameActive) spawnBalloon();
    }, spawnRate);
}

function nextBalloonTarget() {
    const q = generateQuestion();
    state.currentQuestion = q;
    document.getElementById('balloon-question').textContent = `${q.num1} x ${q.num2}`;
}

function spawnBalloon() {
    const container = document.getElementById('balloon-container');
    const balloonWidth = 80;
    const balloonHeight = 100;
    const gap = 10;

    // Güvenli pozisyon bulma (10 deneme)
    let left = 0;
    let isValidPosition = false;
    const existingBalloons = Array.from(document.querySelectorAll('.balloon'));

    for (let i = 0; i < 10; i++) {
        left = Math.random() * (container.clientWidth - balloonWidth);
        let collision = false;

        for (const other of existingBalloons) {
            const otherLeft = parseFloat(other.style.left);
            const otherBottom = parseFloat(other.style.bottom); // Mevcut balonun bottom değeri

            // Yeni balon -100px'den başlıyor
            // Dikey mesafe kontrolü: Eğer üstteki balon yeterince uzaklaşmamışsa (-100 + yükseklik + boşluk)
            // otherBottom < 10 (kabaca) ise dikey çakışma riski var
            if (otherBottom < (balloonHeight + gap - 100)) { // -100 bizim başlangıç noktamız
                // Yatay çakışma kontrolü
                if (Math.abs(left - otherLeft) < (balloonWidth + gap)) {
                    collision = true;
                    break;
                }
            }
        }

        if (!collision) {
            isValidPosition = true;
            break;
        }
    }

    // Eğer uygun yer bulunamazsa bu seferlik pas geç
    if (!isValidPosition) return;

    const balloon = document.createElement('div');
    balloon.className = 'balloon';

    // %40 şansla doğru cevap, %60 rastgele
    const isCorrect = Math.random() < 0.4;
    const number = isCorrect ? state.currentQuestion.answer : (Math.floor(Math.random() * 80) + 4);

    balloon.textContent = number;
    balloon.style.left = left + 'px';
    balloon.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 70%)`;

    // Başlangıç bottom değerini stile de ekle (collision check için string olarak)
    let bottom = -100;
    balloon.style.bottom = bottom + 'px';

    balloon.onclick = () => {
        if (number === state.currentQuestion.answer) {
            playSound('pop');
            state.score += 10;
            document.getElementById('balloon-score').textContent = state.score;

            // Patlama efekti
            balloon.style.transform = 'scale(1.5)';
            balloon.style.opacity = '0';

            // Tüm balonları temizle (Yeni soru için)
            const allBalloons = document.querySelectorAll('.balloon');
            allBalloons.forEach(b => {
                b.style.transition = 'all 0.2s';
                b.style.transform = 'scale(0)';
                b.style.opacity = '0';
            });

            setTimeout(() => {
                document.getElementById('balloon-container').innerHTML = '';
                nextBalloonTarget();
            }, 300);

            // 100 puana ulaşınca bitir
            if (state.score >= 100) gameOver("Harika Balon Avcısı!");
        } else {
            playSound('wrong');
            balloon.style.background = '#555'; // Yanlış geri bildirim
        }
    };

    container.appendChild(balloon);

    // Balonu yukarı hareket ettir
    const moveInterval = setInterval(() => {
        if (!state.gameActive) {
            clearInterval(moveInterval);
            return;
        }
        bottom += 1;
        balloon.style.bottom = bottom + 'px';

        if (bottom > container.clientHeight) {
            balloon.remove();
            clearInterval(moveInterval);
        }
    }, 25); // Hız artırıldı (30ms -> 25ms, %20 artış)
}

// --- YILDIZ TOPLAMA OYUNU ---
function startStarGame() {
    state.starCount = 0;
    state.totalStars = 10;
    state.gameActive = true;

    updateStarUI();
    nextStarQuestion();
}

function updateStarUI() {
    document.getElementById('star-count').textContent = state.starCount;
    document.getElementById('star-message').textContent = "";
    document.getElementById('star-input').value = "";
    document.getElementById('star-input').focus();
}

function nextStarQuestion() {
    const q = generateQuestion();
    state.currentQuestion = q;
    document.getElementById('star-question').textContent = `${q.num1} x ${q.num2}`;
}

function checkStarAnswer() {
    const input = document.getElementById('star-input');
    const val = parseInt(input.value);

    if (val === state.currentQuestion.answer) {
        playSound('correct');
        state.starCount++;

        // Yıldız Pop-up Animasyonu
        const popup = document.getElementById('happy-star-popup');
        popup.classList.add('show');
        setTimeout(() => popup.classList.remove('show'), 1000);

        if (state.starCount >= state.totalStars) {
            state.score = 100; // Tam puan
            gameOver("Tüm Yıldızları Topladın!");
        } else {
            setTimeout(() => {
                updateStarUI();
                nextStarQuestion();
            }, 800);
        }
    } else {
        playSound('wrong');
        document.getElementById('star-message').innerHTML = "<span style='color:red'>Tekrar dene Mira!</span>";
        input.value = "";
        input.focus();
    }
}

// Enter tuşu desteği
document.getElementById('star-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') checkStarAnswer();
});
