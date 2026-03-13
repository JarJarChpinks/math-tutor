let currentProblem = {}, stats = { wrong: 0, wrongExamples: [] };
let errorCount = 0, solvedInSession = 0, startTime = 0, hasCurrentError = false;
let isKraken = false, isGameActive = false, problemPool = [];

const sound = (f, t, d) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = t; o.frequency.value = f;
    o.connect(g); g.connect(ctx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + d);
    o.stop(ctx.currentTime + d);
};

window.onload = () => {
    document.getElementById('studentName').value = localStorage.getItem('student_name') || 'Гость';
    document.getElementById('display-name').innerText = localStorage.getItem('student_name') || 'Гость';
    document.getElementById('difficultyLevel').value = localStorage.getItem('math_diff') || 'medium';
    document.getElementById('errorMax').value = localStorage.getItem('math_err_max') || 5;
    document.getElementById('answer-input').onkeydown = e => e.key === 'Enter' && checkAnswer();
    updateParentDisplay();
};

function openParentPanel() { document.getElementById('parent-panel').style.display = 'flex'; }
function closeParentPanel() {
    localStorage.setItem('student_name', document.getElementById('studentName').value || 'Гость');
    localStorage.setItem('math_diff', document.getElementById('difficultyLevel').value);
    localStorage.setItem('math_err_max', document.getElementById('errorMax').value);
    location.reload();
}

function generateRawProblem(topic) {
    let a, b, ans, symbol = "+", hint, r = (min, max) => Math.floor(Math.random()*(max-min+1))+min;
    const diff = localStorage.getItem('math_diff') || 'medium';
    
    switch(topic) {
        case 'multiplicationTable': 
            a = diff === 'easy' ? r(2,5) : r(2,9); 
            b = diff === 'hard' ? r(6,12) : r(2,9);
            ans=a*b; symbol="×"; hint="Таблица умножения"; break;
        case 'add2': 
            let range = diff === 'easy' ? 40 : (diff === 'hard' ? 150 : 99);
            a=r(10, range); b=r(10, range); ans=a+b; hint="Складывай десятки, потом единицы"; break;
        case 'add3': 
            a=r(100, 999); b=r(100, 999); ans=a+b; hint="Считай по разрядам"; break;
        case 'div2': 
            b=r(2, diff === 'hard' ? 15 : 9); ans=r(2, 10); a=b*ans; symbol="÷"; hint=`Сколько раз ${b} в ${a}?`; break;
        case 'mult2': 
            a=r(11, diff === 'hard' ? 30 : 19); b=r(2, 9); ans=a*b; symbol="×"; hint="Разложи на десятки и единицы"; break;
    }
    return { q: `${a} ${symbol} ${b}`, ans, hint, topic };
}

function prepareTest(topic) {
    const limit = topic === 'kraken' ? 5 : parseInt(document.getElementById('countLimit').value) || 10;
    problemPool = [];
    const used = new Set();
    const krakenTopics = ['multiplicationTable', 'add2', 'add3', 'div2', 'mult2'];
    let attempts = 0;

    while (problemPool.length < limit && attempts < 500) {
        attempts++;
        let t = topic === 'kraken' ? krakenTopics[problemPool.length] : topic;
        let p = generateRawProblem(t);
        if (!used.has(p.q)) { used.add(p.q); problemPool.push(p); }
    }
    startTest(topic);
}

function startTest(topic) {
    isGameActive = true; isKraken = (topic === 'kraken');
    errorCount = 0; solvedInSession = 0; startTime = Date.now();
    stats = { wrong: 0, wrongExamples: [] };
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    nextQuestion();
}

function nextQuestion() {
    currentProblem = problemPool[solvedInSession];
    hasCurrentError = false;
    document.getElementById('error-hint').style.display = 'none';
    document.getElementById('question').innerText = currentProblem.q;
    document.getElementById('cur-idx').innerText = solvedInSession + 1;
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input').focus();
    updateProgress();
}

function checkAnswer() {
    const input = document.getElementById('answer-input');
    const val = parseInt(input.value);
    const errMax = parseInt(localStorage.getItem('math_err_max')) || 5;

    if (val === currentProblem.ans) {
        sound(523, 'sine', 0.2);
        if (hasCurrentError) stats.wrong++;
        solvedInSession++;
        if (solvedInSession >= problemPool.length) finish(); else nextQuestion();
    } else {
        sound(150, 'sawtooth', 0.3);
        errorCount++;
        if (!hasCurrentError) { 
            stats.wrongExamples.push(`${currentProblem.q} = ${currentProblem.ans}`); 
            hasCurrentError = true; 
        }
        input.classList.add('error-shake');
        setTimeout(() => input.classList.remove('error-shake'), 300);
        
        document.getElementById('error-hint').innerText = "Подсказка: " + currentProblem.hint;
        document.getElementById('error-hint').style.display = 'block';
        
        if (errorCount >= errMax) {
            alert("Лимит ошибок исчерпан!");
            abortTest();
        }
    }
}

function finish() {
    isGameActive = false;
    sound(523, 'sine', 0.2); setTimeout(()=>sound(659, 'sine', 0.4), 150);
    const time = Math.floor((Date.now()-startTime)/1000);
    saveToLog(isKraken ? 'КРАКЕН' : currentProblem.topic, stats.wrong, time, false);
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('stats-screen').style.display = 'block';
    document.getElementById('session-result').innerText = `Ошибок: ${stats.wrong} | Время: ${time}с`;
    document.getElementById('wrong-answers-list').innerHTML = stats.wrongExamples.map(ex => `<li>${ex}</li>`).join('');
}

function abortTest() {
    alert("Ну ты и пёс!");
    if (isGameActive) saveToLog(isKraken ? 'КРАКЕН' : currentProblem.topic, stats.wrong, 0, true);
    location.reload();
}

function saveToLog(topic, errors, time, aborted) {
    let h = JSON.parse(localStorage.getItem('math_v_final')) || { logs: [], aborted: 0, stars: 0 };
    if (aborted) h.aborted++;
    else if (errors === 0) h.stars += (isKraken ? 2 : 1);
    
    const now = new Date();
    h.logs.unshift({
        name: localStorage.getItem('student_name') || 'Гость',
        topic: aborted ? topic + " ❌" : topic,
        errors: `${errors}/${problemPool.length}`,
        time: time + "с",
        date: now.toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'}) + " " + now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
    });
    localStorage.setItem('math_v_final', JSON.stringify(h));
}

function updateProgress() { 
    document.getElementById('progress-bar').style.width = (solvedInSession / problemPool.length * 100) + "%"; 
}

function updateParentDisplay() {
    let h = JSON.parse(localStorage.getItem('math_v_final')) || { logs: [], aborted: 0, stars: 0 };
    document.getElementById('star-count').innerText = h.stars;
    document.getElementById('aborted-total').innerText = h.aborted;
    document.getElementById('history-body').innerHTML = h.logs.slice(0, 20).map(l => 
        `<tr><td>${l.name}</td><td>${l.topic}</td><td>${l.errors}</td><td>${l.time}</td><td>${l.date}</td></tr>`
    ).join('');
}
