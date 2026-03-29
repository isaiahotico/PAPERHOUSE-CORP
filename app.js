
const firebaseConfig = {
    apiKey: "AIzaSyBwpa8mA83JAv2A2Dj0rh5VHwodyv5N3dg",
    authDomain: "freegcash-ads.firebaseapp.com",
    databaseURL: "https://freegcash-ads-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "freegcash-ads",
    storageBucket: "freegcash-ads.firebasestorage.app",
    messagingSenderId: "608086825364",
    appId: "1:608086825364:web:3a8e628d231b52c6171781",
    measurementId: "G-Z64B87ELGP"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const AD_URL = "https://www.profitablecpmratenetwork.com/s9nwgzk4jg?key=00d151ad9c127df9375b11d601a7dbe0", "https://omg10.com/4/10589174";
const REF_BASE = "https://isaiahotico.github.io/PAPERHOUSE-CORP/";

const THEMES = [
    '#0f172a', '#1e1b4b', '#2e1065', '#4c1d95', '#701a75', 
    '#831843', '#881337', '#7c2d12', '#78350f', '#365314', 
    '#064e3b', '#134e4a', '#164e63', '#0c4a6e', '#1e3a8a', 
    '#312e81', '#3730a3', '#4338ca', '#581c87', '#171717', '#6F8FAF', '#6495ED', '#50C878', '#00FF00'
];

let uid = localStorage.getItem('phc_v4_uid');
let user = {};
let isTaskActive = false;

// Initialize
function init() {
    if (!uid) {
        uid = 'PH' + Math.floor(100000 + Math.random() * 900000);
        localStorage.setItem('phc_v4_uid', uid);
        
        const refParent = new URLSearchParams(window.location.search).get('ref');
        
        db.ref('users/' + uid).set({
            uid: uid,
            balance: 0,
            refBy: refParent || null,
            refCount: 0,
            refEarnings: 0,
            created: Date.now()
        }).then(() => {
            if (refParent) {
                // Reliable referral incrementing only on first creation
                db.ref('users/' + refParent + '/refCount').transaction(c => (c || 0) + 1);
            }
        });
    }

    db.ref('users/' + uid).on('value', snap => {
        user = snap.val() || {};
        updateUI();
    });

    initChat();
    initThemes();
    loadLocalTheme();
}

function updateUI() {
    const bal = (user.balance || 0).toFixed(3);
    document.getElementById('mainBal').innerText = '₱' + bal;
    document.getElementById('topBal').innerText = '₱' + bal;
    document.getElementById('refCount').innerText = user.refCount || 0;
    document.getElementById('refEarn').innerText = '₱' + (user.refEarnings || 0).toFixed(2);
    document.getElementById('refLink').value = REF_BASE + '?ref=' + uid;

    if (user.withdraws) {
        let html = '';
        Object.values(user.withdraws).reverse().forEach(w => {
            const statusColor = w.status === 'approved' ? 'text-green-500' : 'text-yellow-500';
            html += `<div class="bg-white/5 p-3 rounded-xl flex justify-between items-center text-[10px]">
                <div><p class="font-bold">₱${w.amount} via ${w.method}</p><p="opacity-40">${w.date}</p></div>
                <div class="${statusColor} font-black uppercase">${w.status}</div>
            </div>`;
        });
        document.getElementById('wHistoryList').innerHTML = html;
    }
}

// Timer Task
function startAdTask() {
    if (isTaskActive) return;
    isTaskActive = true;
    let sec = 20;
    document.getElementById('timerOverlay').classList.remove('hidden');
    window.open(AD_URL, '_blank');

    const timer = setInterval(() => {
        // Anti-Cheat
        if (!document.hidden && sec > 1 && sec < 19) {
            clearInterval(timer);
            isTaskActive = false;
            document.getElementById('timerOverlay').classList.add('hidden');
            alert("TASK FAILED! You must stay on the ad page for 20 seconds TRY CHROME BROWSER.");
            return;
        }

        sec--;
        document.getElementById('timerText').innerText = sec;
        if (sec <= 0) {
            clearInterval(timer);
            completeTask();
        }
    }, 1000);
}

function completeTask() {
    isTaskActive = false;
    document.getElementById('timerOverlay').classList.add('hidden');
    document.getElementById('successAlarm').play();

    db.ref('users/' + uid).transaction(u => {
        if (u) u.balance = (u.balance || 0) + 0.0102;
        return u;
    });

    // Pay Referrer (20%)
    if (user.refBy) {
        db.ref('users/' + user.refBy).transaction(r => {
            if (r) {
                r.balance = (r.balance || 0) + 0.002;
                r.refEarnings = (r.refEarnings || 0) + 0.002;
            }
            return r;
        });
    }
    alert("Reward ₱0.0105 added!");
}

// Chat
function initChat() {
    db.ref('chat').limitToLast(15).on('value', snap => {
        let html = '';
        snap.forEach(c => {
            const m = c.val();
            const isMe = m.uid === uid;
            html += `<div class="${isMe ? 'text-right' : 'text-left'}">
                <p class="text-[8px] opacity-30 mb-1">${m.uid}</p>
                <span class="inline-block p-3 rounded-2xl text-[11px] ${isMe ? 'bg-blue-600' : 'bg-white/10'}">${m.text}</span>
            </div>`;
        });
        const box = document.getElementById('chatBox');
        box.innerHTML = html;
        box.scrollTop = box.scrollHeight;
    });
}

function sendMsg() {
    const text = document.getElementById('chatInput').value;
    if (!text) return;
    db.ref('chat').push({ uid, text, time: Date.now() });
    document.getElementById('chatInput').value = '';
}

// Withdrawals
function updateConvert() {
    const php = document.getElementById('wAmount').value || 0;
    document.getElementById('usdtVal').innerText = `≈ ${(php * 0.017).toFixed(4)} USDT`;
}

function submitWithdraw() {
    const method = document.getElementById('wMethod').value;
    const account = document.getElementById('wAccount').value;
    const amount = parseFloat(document.getElementById('wAmount').value);

    if (!account || amount < 1.00) return alert("Invalid data");
    if (amount > user.balance) return alert("Insufficient balance");

    const key = db.ref('withdrawals').push().key;
    const data = { id: key, uid, method, account, amount, status: 'pending', date: new Date().toLocaleString() };
    
    db.ref('users/' + uid + '/balance').transaction(b => b - amount);
    db.ref('withdrawals/' + key).set(data);
    db.ref('users/' + uid + '/withdraws/' + key).set(data);
    
    alert("Request Sent!");
    switchTab('dash');
}

// Admin
function adminLogin() {
    if (prompt("Password:") === "Propetas12") { switchTab('admin'); loadAdmin(); }
}

function loadAdmin() {
    db.ref('withdrawals').orderByChild('status').equalTo('pending').on('value', snap => {
        let html = '';
        snap.forEach(c => {
            const d = c.val();
            html += `<div class="bg-slate-100 p-4 rounded-2xl text-[10px] text-slate-800 border-2 border-red-200">
                <p><b>User:</b> ${d.uid}</p>
                <p><b>Account:</b> ${d.method} (${d.account})</p>
                <p><b>Amount:</b> ₱${d.amount}</p>
                <button onclick="approvePay('${d.id}', '${d.uid}')" class="mt-3 w-full bg-red-600 text-white py-2 rounded-xl font-bold">APPROVE PAYOUT</button>
            </div>`;
        });
        document.getElementById('adminList').innerHTML = html || 'No tasks.';
    });
}

function approvePay(key, targetUid) {
    db.ref('withdrawals/' + key).update({ status: 'approved' });
    db.ref('users/' + targetUid + '/withdraws/' + key).update({ status: 'approved' });
    alert("Payout marked as Approved!");
}

// Themes Logic
function initThemes() {
    const menu = document.getElementById('themeMenu');
    THEMES.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'theme-dot';
        dot.style.backgroundColor = color;
        dot.onclick = () => setTheme(color);
        menu.appendChild(dot);
    });
}

function setTheme(color) {
    document.body.style.backgroundColor = color;
    localStorage.setItem('phc_theme', color);
    document.getElementById('themeMenu').classList.add('hidden');
}

function loadLocalTheme() {
    const saved = localStorage.getItem('phc_theme');
    if (saved) document.body.style.backgroundColor = saved;
}

function toggleThemeMenu() { document.getElementById('themeMenu').classList.toggle('hidden'); }

// Navigation Logic
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.add('text-white/50'));
    
    document.getElementById(id + '-view').classList.add('active');
    const navBtn = document.getElementById('nav-' + id);
    if(navBtn) navBtn.classList.remove('text-white/50');
}

function copyRef() {
    const link = document.getElementById('refLink');
    link.select();
    navigator.clipboard.writeText(link.value);
    alert("Link Copied!");
}

init();
