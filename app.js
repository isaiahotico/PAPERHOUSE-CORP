
// Firebase Config
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

// Constants
const AD_URL = "https://www.profitablecpmratenetwork.com/i2rx8svvds?key=ec449a85ea63cb0b7adf4cd90009cbca";
const REF_BASE = "https://isaiahotico.github.io/PAPERHOUSE-CORP/";
const REWARD = 0.01;
const COMMISSION = 0.20;

// Variables
let userId = localStorage.getItem('paperhouse_uid');
let userData = {};
let timerInterval = null;
let seconds = 20;
let isAdOpen = false;

// Initialize User
function init() {
    if (!userId) {
        userId = 'USER' + Math.floor(100000 + Math.random() * 900000);
        localStorage.setItem('paperhouse_uid', userId);
        
        const params = new URLSearchParams(window.location.search);
        const refBy = params.get('ref');

        db.ref('users/' + userId).set({
            id: userId,
            balance: 0,
            total: 0,
            refBy: refBy || null,
            refCount: 0,
            refEarned: 0,
            created: Date.now()
        });

        if (refBy) {
            db.ref('users/' + refBy + '/refCount').transaction(c => (c || 0) + 1);
        }
    }

    db.ref('users/' + userId).on('value', snap => {
        userData = snap.val() || {};
        renderUI();
    });
}

function renderUI() {
    const bal = (userData.balance || 0).toFixed(3);
    document.getElementById('mainBalance').innerText = '₱' + bal;
    document.getElementById('topBalance').innerText = '₱' + bal;
    document.getElementById('refCount').innerText = userData.refCount || 0;
    document.getElementById('refEarnings').innerText = '₱' + (userData.refEarned || 0).toFixed(3);
    document.getElementById('refLink').value = REF_BASE + '?ref=' + userId;
    
    // History
    const hDiv = document.getElementById('historyList');
    if (userData.history) {
        let hHtml = '';
        Object.values(userData.history).reverse().forEach(h => {
            hHtml += `<div class="bg-slate-900 p-3 rounded-lg flex justify-between">
                <span>₱${h.amount} via ${h.method}</span>
                <span class="${h.status === 'approved' ? 'text-green-400' : 'text-yellow-400'} uppercase font-bold">${h.status}</span>
            </div>`;
        });
        hDiv.innerHTML = hHtml;
    }
}

// Ad Task Logic
function startAdTask() {
    if (isAdOpen) return;
    
    isAdOpen = true;
    seconds = 20;
    document.getElementById('adOverlay').classList.remove('hidden');
    document.getElementById('timerText').innerText = seconds;
    
    window.open(AD_URL, '_blank');

    timerInterval = setInterval(() => {
        // Anti-Cheat: User must not return to this tab too early
        if (!document.hidden && seconds > 1 && seconds < 19) {
            clearInterval(timerInterval);
            isAdOpen = false;
            document.getElementById('adOverlay').classList.add('hidden');
            alert("TASK FAILED! You must stay on the ad page for 20 seconds.");
            return;
        }

        seconds--;
        document.getElementById('timerText').innerText = seconds;
        
        // Update circular progress
        const offset = 251.2 - (251.2 * (20 - seconds) / 20);
        document.getElementById('timerCircle').style.strokeDashoffset = offset;

        if (seconds <= 0) {
            finishTask();
        }
    }, 1000);
}

function finishTask() {
    clearInterval(timerInterval);
    isAdOpen = false;
    document.getElementById('adOverlay').classList.add('hidden');
    document.getElementById('alarmSound').play();

    // Update Balance
    db.ref('users/' + userId).transaction(u => {
        if (u) {
            u.balance = (u.balance || 0) + REWARD;
            u.total = (u.total || 0) + REWARD;
        }
        return u;
    });

    // Commission
    if (userData.refBy) {
        const bonus = REWARD * COMMISSION;
        db.ref('users/' + userData.refBy).transaction(r => {
            if (r) {
                r.balance = (r.balance || 0) + bonus;
                r.refEarned = (r.refEarned || 0) + bonus;
            }
            return r;
        });
    }

    alert(`CONGRATS!\nYou earned ₱${REWARD}\nTotal: ₱${(userData.balance + REWARD).toFixed(3)}`);
}

// Withdrawal
function requestWithdrawal() {
    const method = document.getElementById('payMethod').value;
    const account = document.getElementById('payAccount').value;
    const amount = parseFloat(document.getElementById('payAmount').value);

    if (!account || isNaN(amount) || amount < 0.01) return alert("Invalid details");
    if (amount > userData.balance) return alert("Insufficient balance");

    const req = {
        uid: userId,
        method: method,
        account: account,
        amount: amount,
        status: 'pending',
        time: new Date().toLocaleString()
    };

    db.ref('users/' + userId + '/balance').transaction(b => b - amount);
    db.ref('withdrawals').push(req);
    db.ref('users/' + userId + '/history').push(req);

    alert("Request Sent Successfully!");
    switchTab('dashboard');
}

// Admin Panel
function promptAdmin() {
    const p = prompt("Admin Password:");
    if (p === "Propetas12") {
        switchTab('admin');
        loadAdmin();
    }
}

function loadAdmin() {
    const div = document.getElementById('adminPending');
    db.ref('withdrawals').orderByChild('status').equalTo('pending').on('value', snap => {
        let html = '';
        snap.forEach(child => {
            const d = child.val();
            html += `<div class="bg-slate-100 p-4 rounded-xl border border-slate-200 text-xs text-slate-800">
                <p><b>User:</b> ${d.uid}</p>
                <p><b>Method:</b> ${d.method} (${d.account})</p>
                <p><b>Amount:</b> ₱${d.amount}</p>
                <button onclick="approvePay('${child.key}')" class="mt-2 w-full bg-green-600 text-white py-2 rounded-lg font-bold uppercase">Approve & Mark Paid</button>
            </div>`;
        });
        div.innerHTML = html || 'No pending requests.';
    });
}

function approvePay(key) {
    db.ref('withdrawals/' + key).update({ status: 'approved' });
    alert("Approved!");
}

// Utils
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function copyRef() {
    const el = document.getElementById('refLink');
    el.select();
    navigator.clipboard.writeText(el.value);
    alert("Referral Link Copied!");
}

setInterval(() => {
    document.getElementById('footerTime').innerText = new Date().toLocaleString();
}, 1000);

init();
