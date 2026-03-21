// --- CONFIGURAÇÃO DE ESTADO ---
let score = parseInt(localStorage.getItem('ss_iq')) || 0;
let xp = parseInt(localStorage.getItem('ss_xp')) || 0;
let streak = parseInt(localStorage.getItem('ss_streak')) || 0;
let lastVisit = localStorage.getItem('ss_last_visit');
let likedCards = JSON.parse(localStorage.getItem('ss_liked')) || [];
let questionBuffer = [];
let currentCardData = null;
let isFetching = false;

const stack = document.getElementById('card-stack');
const sndFlip = document.getElementById('snd-flip');
const sndLevel = document.getElementById('snd-level');

// 1. MOTOR DE INTELIGÊNCIA (API + TRADUÇÃO)
async function fetchQuestions() {
    if (isFetching) return;
    isFetching = true;
    if (questionBuffer.length === 0) showLoader();

    try {
        const res = await fetch('https://opentdb.com/api.php?amount=5&difficulty=medium&type=multiple');
        const data = await res.json();
        
        const translated = await Promise.all(data.results.map(async (item) => {
            const q = await translate(item.question);
            const a = await translate(item.correct_answer);
            return { q, a, id: Math.random() };
        }));

        questionBuffer = [...questionBuffer, ...translated];
        if (stack.querySelector('.loader-container')) spawnCard();
    } catch (e) { console.error("Erro API"); }
    isFetching = false;
}

async function translate(text) {
    const decoded = new DOMParser().parseFromString(text, 'text/html').body.textContent;
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(decoded)}&langpair=en|pt`);
        const data = await res.json();
        return data.responseData.translatedText;
    } catch { return decoded; }
}

// 2. LÓGICA DO JOGO & STREAK
function checkStreak() {
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastVisit === today) { /* Já abriu hoje */ }
    else if (lastVisit === yesterdayStr) { streak++; showToast("SÉRIE MANTIDA! 🔥"); }
    else { streak = 1; showToast("SÉRIE INICIADA! 🔥"); }

    lastVisit = today;
    localStorage.setItem('ss_streak', streak);
    localStorage.setItem('ss_last_visit', lastVisit);
    document.getElementById('streak-num').innerText = streak;
}

function spawnCard() {
    if (questionBuffer.length === 0) { fetchQuestions(); return; }
    if (questionBuffer.length < 2) fetchQuestions();

    currentCardData = questionBuffer.shift();
    stack.innerHTML = "";

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-content">${currentCardData.q}</div>`;
    
    let flipped = false;
    card.addEventListener('click', () => {
        if (!flipped) {
            sndFlip.play().catch(()=>{});
            card.classList.add('flipped');
            card.innerHTML = `<div class="card-content"><span style="color:var(--accent);font-size:0.8rem;display:block;margin-bottom:10px;">SABEDORIA:</span>${currentCardData.a}</div>`;
            score += 15; xp += 40;
            checkLevelUp();
            updateUI();
            flipped = true;
        } else {
            card.classList.add('exit');
            setTimeout(() => { card.remove(); spawnCard(); }, 400);
        }
    });
    stack.appendChild(card);
    updateLikeUI();
}

function checkLevelUp() {
    const newLvl = Math.floor(xp / 100) + 1;
    const oldLvl = parseInt(document.getElementById('lvl-num').innerText);
    if (newLvl > oldLvl) {
        sndLevel.play().catch(()=>{});
        showToast("NÍVEL UP! CÉREBRO EVOLUÍDO! 🧠⚡");
        const badge = document.getElementById('lvl-badge');
        badge.classList.add('level-up-anim');
        setTimeout(() => badge.classList.remove('level-up-anim'), 800);
    }
}

// 3. UI & PARTILHA
function updateUI() {
    document.getElementById('score').innerText = score;
    document.getElementById('lvl-num').innerText = Math.floor(xp / 100) + 1;
    document.getElementById('progress-bar').style.width = (xp % 100) + "%";
    localStorage.setItem('ss_iq', score);
    localStorage.setItem('ss_xp', xp);
}

function showToast(msg) {
    const t = document.createElement('div'); t.id = 'toast'; t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function showLoader() {
    stack.innerHTML = `<div class="loader-container"><div class="spinner"></div><div style="color:var(--accent);font-weight:900;text-align:center">TRADUZINDO QI...</div></div>`;
}

// PARTILHA SOCIAL
function shareSocial(p) {
    const msg = `🧠 Sabias que: "${currentCardData.q}"? Aprendi no SmartScroll!`;
    const url = window.location.href;
    let link = "";
    if(p==='x') link = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
    if(p==='fb') link = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    if(p==='rd') link = `https://www.reddit.com/submit?title=SmartScroll&text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
    score += 50; updateUI(); showToast("+50 IQ POR PARTILHAR! 🧠");
}

// PARTILHA NATIVA (DO DISPOSITIVO)
document.getElementById('share-native').onclick = async () => {
    const text = `🧠 *SMARTSCROLL IQ*\n\n"${currentCardData.q}"\n\nResposta: ${currentCardData.a}\n\nEleva o teu nível aqui: ${window.location.href}`;
    if (navigator.share) {
        try { await navigator.share({ title: 'SmartScroll IQ', text: text }); score += 100; updateUI(); } catch(e){}
    } else {
        navigator.clipboard.writeText(text); showToast("Copiado para WhatsApp/Stories! 🚀");
    }
};

// FAVORITOS
document.getElementById('like-btn').onclick = () => {
    const idx = likedCards.findIndex(c => c.q === currentCardData.q);
    if (idx === -1) likedCards.push(currentCardData);
    else likedCards.splice(idx, 1);
    localStorage.setItem('ss_liked', JSON.stringify(likedCards));
    updateLikeUI();
};

function updateLikeUI() {
    const isLiked = likedCards.some(c => c.q === currentCardData.q);
    document.getElementById('like-btn').style.background = isLiked ? "#ff4d4d" : "#1e293b";
}

document.getElementById('menu-btn').onclick = () => {
    document.getElementById('menu-modal').style.display = "block";
    const list = document.getElementById('favorites-list');
    list.innerHTML = likedCards.length ? likedCards.map(c => `<div class="result-item"><b>Q:</b> ${c.q}<br><b>A:</b> ${c.a}</div>`).join("") : "Vazio.";
};

document.querySelector('.close-btn').onclick = () => document.getElementById('menu-modal').style.display = "none";

// START
checkStreak();
updateUI();
spawnCard();
