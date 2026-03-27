
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

const AD_URL = "https://www.profitablecpmratenetwork.com/i2rx8svvds?key=ec449a85ea63cb0b7adf4cd90009cbca";
const REF_BASE = "https://isaiahotico.github.io/PAPERHOUSE-CORP/";
const PHP_TO_USDT = 0.0178; 

let uid = localStorage.getItem('phc_uid');
let user = {};
let isTaskActive = false;

// Initialize User
function init() {
    if (!uid) {
        uid = 'PH' + Math.floor(Math.random() * 89999 + 10000);
        localStorage.setItem('phc_uid', uid);
        const ref = new URLSearchParams(window.location.search).get('ref');
        db.ref('users/' + uid).set({ uid, balance: 0, total: 0, refBy: ref || null, refCount: 0, refEarnings: 0, joined: Date.now() });
        if (ref) db.ref('users/' + ref + '/refCount').transaction(c => (c || 0) + 1);
    }
    db.ref('users/' + uid).on('value', snap => { user = snap.val() || {}; updateUI(); });
    initChat();
}

function updateUI() {
    const bal = (user.balance || 0).toFixed(3);
    document.getElementById('mainBal').innerText = '₱' + bal;
    document.getElementById('topBal').innerText = '₱' + bal;
    document.getElementById('refCount').innerText = user.refCount || 0;
    document.getElementById('refEarn').innerText = '₱' + (user.refEarnings || 0).toFixed(3);
    document.getElementById('refLink').value = REF_BASE + '?ref=' + uid;
    
    // Earning Logs
    if (user.logs) {
        let html = '';
        Object.values(user.logs).reverse().slice(0, 20).forEach(l => {
            html += `<div class="bg-slate-800/50 p-2 rounded flex justify-between border-l-2 border-blue-500">
                <span>Ad Reward Task</span><span class="text-blue-400">+₱${l.amount}</span>
            </div>`;
        });
        document.getElementById('earningLogs').innerHTML = html;
    }

    // Withdraw History
    if (user.withdraws) {
        let hHtml = '';
        Object.values(user.withdraws).reverse().forEach(w => {
            const statusColor = w.status === 'approved' ? 'text-green-500' : 'text-yellow-500';
            hHtml += `<div class="bg-slate-800 p-3 rounded flex justify-between border-b border-slate-700">
                <div><p class="font-bold">₱${w.amount} (${w.method})</p><p class="text-[9px] text-slate-500">${w.date}</p></div>
                <div class="${statusColor} font-black uppercase">${w.status}</div>
            </div>`;
        });
        document.getElementById('wHistoryList').innerHTML = hHtml;
    }
}

// Timer & Task
function handleAdClick() {
    if (isTaskActive) return;
    isTaskActive = true;
    let sec = 20;
    document.getElementById('timerOverlay').classList.remove('hidden');
    window.open(AD_URL, '_blank');

    const timer = setInterval(() => {
        if (!document.hidden && sec > 1 && sec < 19) {
            clearInterval(timer);
            isTaskActive = false;
            document.getElementById('timerOverlay').classList.add('hidden');
            alert("TASK FAILED! Stay for 20 seconds.");
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
    const ts = Date.now();
    db.ref('users/' + uid).transaction(u => {
        if (u) {
            u.balance = (u.balance || 0) + 0.01;
            u.total = (u.total || 0) + 0.01;
            if (!u.logs) u.logs = {};
            u.logs[ts] = { amount: 0.01, time: ts };
        }
        return u;
    });
    if (user.refBy) {
        db.ref('users/' + user.refBy).transaction(r => {
            if (r) { r.balance = (r.balance || 0) + 0.002; r.refEarnings = (r.refEarnings || 0) + 0.002; }
            return r;
        });
    }
    alert("Congrats! ₱0.01 added to balance.");
}

// Withdrawal
function convertCurrency() {
    const php = document.getElementById('wAmount').value || 0;
    document.getElementById('usdtConvert').innerText = `≈ ${(php * PHP_TO_USDT).toFixed(4)} USDT`;
}

function handleWithdraw() {
    const method = document.getElementById('wMethod').value;
    const account = document.getElementById('wAccount').value;
    const amount = parseFloat(document.getElementById('wAmount').value);
    if (!account || isNaN(amount) || amount < 0.01) return alert("Invalid inputs.");
    if (amount > user.balance) return alert("Insufficient balance.");

    const key = db.ref('withdrawals').push().key;
    const data = { id: key, uid, method, account, amount, status: 'pending', date: new Date().toLocaleString() };
    
    db.ref('users/' + uid + '/balance').transaction(b => b - amount);
    db.ref('withdrawals/' + key).set(data);
    db.ref('users/' + uid + '/withdraws/' + key).set(data);
    alert("Withdrawal submitted!");
    switchTab('dash');
}

// Global Chat
function initChat() {
    db.ref('chat').limitToLast(20).on('value', snap => {
        let html = '';
        snap.forEach(c => {
            const m = c.val();
            const isMe = m.uid === uid;
            html += `<div class="${isMe ? 'text-right' : 'text-left'}">
                <p class="text-[9px] text-slate-500">${m.uid}</p>
                <span class="inline-block px-3 py-1 rounded-2xl text-xs ${isMe ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}">${m.text}</span>
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

// Admin
function adminLogin() {
    if (prompt("Password:") === "Propetas12") { switchTab('admin'); loadAdmin(); }
}

function loadAdmin() {
    db.ref('withdrawals').orderByChild('status').equalTo('pending').on('value', snap => {
        let html = '';
        snap.forEach(c => {
            const d = c.val();
            html += `<div class="bg-slate-100 p-3 rounded-xl border border-blue-200 text-[11px]">
                <p><b>User:</b> ${d.uid}</p><p><b>Account:</b> ${d.method} - ${d.account}</p><p><b>Amount:</b> ₱${d.amount}</p>
                <button onclick="approvePay('${d.id}', '${d.uid}')" class="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg font-bold">APPROVE</button>
            </div>`;
        });
        document.getElementById('adminList').innerHTML = html || 'No pending.';
    });
}

function approvePay(key, targetUid) {
    db.ref('withdrawals/' + key).update({ status: 'approved' });
    db.ref('users/' + targetUid + '/withdraws/' + key).update({ status: 'approved' });
    alert("Approved!");
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id + '-view').classList.add('active');
}

function copyRef() {
    const link = document.getElementById('refLink');
    link.select();
    navigator.clipboard.writeText(link.value);
    alert("Referral link copied!");
}

setInterval(() => { document.getElementById('footerTime').innerText = new Date().toLocaleString(); }, 1000);
init();
