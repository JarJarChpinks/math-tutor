let currentProblem = {}, stats = { correct: 0, wrong: 0, wrongExamples: [] };
let errorCount = 0, solvedInSession = 0, startTime = 0, hasCurrentError = false;
let isKraken = false, isGameActive = false, problemPool = [];

window.onload = () => {
    const savedName = localStorage.getItem('student_name') || 'Гость';
    document.getElementById('studentName').value = savedName;
    document.getElementById('display-name').innerText = savedName;
    
    // Обработка клавиши Enter
    document.getElementById('answer-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
    
    updateParentDisplay();
};

function openParentPanel() { document.getElementById('parent-panel').style.display = 'flex'; }
function closeParentPanel() {
    const name = document.getElementById('studentName').value || 'Гость';
    localStorage.setItem('student_name', name);
    document.getElementById('display-name').innerText = name;
    document.getElementById('parent-panel').style.display = 'none';
}

function prepareTest(topic) {
    const limitInput = parseInt(document.getElementById('countLimit').value);
    const limit = topic === 'kraken' ? 5 : (limitInput || 10);
    problemPool = [];
    const used = new Set();
    const krakenTopics = ['multiplicationTable', 'add2', 'add3', 'div2', 'mult2'];

    while (problemPool.length < limit) {
        let t = topic === 'kraken' ? krakenTopics[problemPool.length] : topic;
        let p = generateRawProblem(t);
        if (!used.has(p.q)) { used.add(p.q); problemPool.push(p); }
    }
    startTest(topic);
}

function generateRawProblem(topic) {
    let a, b, ans, symbol = "+", hint, r = (min, max) => Math.floor(Math.random()*(max-min+1))+min;
    switch(topic) {
        case 'multiplicationTable': a=r(2,9); b=r(2,9); ans=a*b; symbol="×"; hint="Таблица умножения"; break;
        case 'add2': a=r(10,99); b=r(10,99); ans=a+b; hint="Сложи десятки и единицы"; break;
        case 'add3': a=r(100,999); b=r(100,999); ans=a+b; hint="Складывай по разрядам"; break;
        case 'div2': b=r(2,9); ans=r(2,10); a=b*ans; symbol="÷"; hint=`Сколько раз ${b} в ${a}?`; break;
        case 'mult2': a=r(11,19); b=r(2,9); ans=a*b; symbol="×"; hint=`${b}*10 + ${b}*${a-10}`; break;
    }
    return { q: `${a} ${symbol} ${b}`, ans, hint, topic };
}

function startTest(topic) {
    isGameActive = true; isKraken = (topic === 'kraken');
    errorCount = 0; solvedInSession = 0; startTime = Date.now();
    stats = { correct: 0, wrong: 0, wrongExamples: [] };
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
    const input = document.getElementById('answer-input');
    input.value = ''; input.focus();
    updateProgress();
}

function checkAnswer() {
    const input = document.getElementById('answer-input');
    const val = parseInt(input.value);
    if (isNaN(val)) return;

    if (val === currentProblem.ans) {
        if (hasCurrentError) stats.wrong++; else stats.correct++;
        solvedInSession++;
        if (solvedInSession >= problemPool.length) finish(); else nextQuestion();
    } else {
        errorCount++;
        if (!hasCurrentError) { 
            stats.wrongExamples.push(`${currentProblem.q} = ${currentProblem.ans}`); 
            hasCurrentError = true; 
        }
        input.classList.add('error-shake');
        setTimeout(() => input.classList.remove('error-shake'), 300);
        
        if (errorCount >= 5) {
            document.getElementById('error-hint').innerText = "Подсказка: " + currentProblem.hint;
            document.getElementById('error-hint').style.display = 'block';
            if (document.getElementById('resetOnError').checked) {
                setTimeout(() => abortTest(), 1000);
            }
        }
    }
}

function finish() {
    isGameActive = false;
    const time = Math.floor((Date.now()-startTime)/1000);
    saveToLog(isKraken ? 'КРАКЕН' : currentProblem.topic, stats.wrong, time, false);
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('stats-screen').style.display = 'block';
    
    const name = localStorage.getItem('student_name') || 'Гость';
    document.getElementById('session-result').innerHTML = `
        <p>Ученик: <b>${name}</b></p>
        <p>Время: <b>${time}с</b> | Ошибок: <b>${stats.wrong}</b> из <b>${problemPool.length}</b></p>`;
    document.getElementById('wrong-answers-list').innerHTML = stats.wrongExamples.map(ex => `<li>${ex}</li>`).join('');
    updateParentDisplay();
}

function abortTest() {
    if (isGameActive) saveToLog(isKraken ? 'КРАКЕН' : currentProblem.topic, stats.wrong, Math.floor((Date.now()-startTime)/1000), true);
    location.reload();
}

function saveToLog(topic, errors, time, aborted) {
    let h = JSON.parse(localStorage.getItem('math_v_final')) || { logs: [], aborted: 0, stars: 0 };
    if (aborted) h.aborted++; else if (errors === 0) h.stars++;
    
    h.logs.unshift({
        name: localStorage.getItem('student_name') || 'Гость',
        topic: aborted ? topic + " ❌" : topic,
        errors: errors,
        total: problemPool.length,
        time: time + "с",
        date: new Date().toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})
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
    document.getElementById('history-body').innerHTML = h.logs.slice(0, 50).map(l => 
        `<tr>
            <td>${l.name}</td>
            <td>${l.topic}</td>
            <td>${l.errors}/${l.total || 0}</td>
            <td>${l.time}</td>
            <td>${l.date || ''}</td>
        </tr>`
    ).join('');
}
