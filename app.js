
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

// Start Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Constants
const AD_LINK = "https://www.profitablecpmratenetwork.com/i2rx8svvds?key=ec449a85ea63cb0b7adf4cd90009cbca";
const REF_BASE = "https://isaiahotico.github.io/PAPERHOUSE-CORP/";
const REWARD_AMT = 0.01;
const REF_PERCENT = 0.20;

// App State
let uid = localStorage.getItem('phc_uid');
let user = {};
let timerCount = 20;
let timerId = null;
let isTaskRunning = false;

// 1. Initialize
function initApp() {
    if (!uid) {
        uid = 'ID' + Math.floor(Math.random() * 899999 + 100000);
        localStorage.setItem('phc_uid', uid);
        
        const refUrl = new URLSearchParams(window.location.search).get('ref');
        
        db.ref('users/' + uid).set({
            uid: uid,
            balance: 0,
            total: 0,
            refBy: refUrl || null,
            refCount: 0,
            refEarnings: 0,
            joined: Date.now()
        });

        if (refUrl) {
            db.ref('users/' + refUrl + '/refCount').transaction(c => (c || 0) + 1);
        }
    }

    db.ref('users/' + uid).on('value', snap => {
        user = snap.val() || {};
        updateUI();
    });
}

function updateUI() {
    const bal = (user.balance || 0).toFixed(3);
    document.getElementById('mainBal').innerText = '₱' + bal;
    document.getElementById('topBal').innerText = '₱' + bal;
    document.getElementById('refCount').innerText = user.refCount || 0;
    document.getElementById('refEarn').innerText = '₱' + (user.refEarnings || 0).toFixed(3);
    document.getElementById('refLink').value = REF_BASE + '?ref=' + uid;
    
    // Load Earning Logs
    const logDiv = document.getElementById('earningLogs');
    if (user.logs) {
        let html = '';
        Object.values(user.logs).reverse().forEach(l => {
            html += `<div class="bg-slate-800 p-2 rounded flex justify-between border-l-2 border-green-500">
                <span><i class="fa fa-ad mr-2 text-blue-400"></i>Ad Reward</span>
                <span class="text-green-400 font-bold">+₱${l.amount}</span>
            </div>`;
        });
        logDiv.innerHTML = html;
    }
}

// 2. Task Logic
function handleAdClick() {
    if (isTaskRunning) return;
    
    isTaskRunning = true;
    timerCount = 20;
    document.getElementById('timerOverlay').classList.remove('hidden');
    document.getElementById('timerText').innerText = timerCount;
    
    window.open(AD_LINK, '_blank');

    timerId = setInterval(() => {
        // Anti-Cheat: Stop if user returns early
        if (!document.hidden && timerCount > 1 && timerCount < 19) {
            clearInterval(timerId);
            isTaskRunning = false;
            document.getElementById('timerOverlay').classList.add('hidden');
            alert("TASK FAILED! You didn't stay on the ad page for 20 seconds.");
            return;
        }

        timerCount--;
        document.getElementById('timerText').innerText = timerCount;
        
        // Progress Ring
        const offset = 377 - (377 * (20 - timerCount) / 20);
        document.getElementById('timerRing').style.strokeDashoffset = offset;

        if (timerCount <= 0) {
            autoReward();
        }
    }, 1000);
}

function autoReward() {
    clearInterval(timerId);
    isTaskRunning = false;
    document.getElementById('timerOverlay').classList.add('hidden');
    document.getElementById('successAlarm').play();

    // 1. Credit User
    const timestamp = Date.now();
    db.ref('users/' + uid).transaction(u => {
        if (u) {
            u.balance = (u.balance || 0) + REWARD_AMT;
            u.total = (u.total || 0) + REWARD_AMT;
            if (!u.logs) u.logs = {};
            u.logs[timestamp] = { amount: REWARD_AMT, time: timestamp };
        }
        return u;
    });

    // 2. Credit Referrer
    if (user.refBy) {
        const bonus = REWARD_AMT * REF_PERCENT;
        db.ref('users/' + user.refBy).transaction(r => {
            if (r) {
                r.balance = (r.balance || 0) + bonus;
                r.refEarnings = (r.refEarnings || 0) + bonus;
            }
            return r;
        });
    }

    document.getElementById('rewardPopup').classList.remove('hidden');
}

// 3. Withdrawals
function handleWithdraw() {
    const method = document.getElementById('wMethod').value;
    const account = document.getElementById('wAccount').value;
    const amount = parseFloat(document.getElementById('wAmount').value);

    if (!account || isNaN(amount) || amount < 0.01) return alert("Check your details.");
    if (amount > user.balance) return alert("Insufficient Balance.");

    const request = {
        uid: uid,
        method: method,
        account: account,
        amount: amount,
        status: 'pending',
        date: new Date().toLocaleString()
    };

    db.ref('users/' + uid + '/balance').transaction(b => b - amount);
    db.ref('withdrawals').push(request);
    
    alert("Payout request submitted!");
    switchTab('dash');
}

// 4. Admin
function adminLogin() {
    const p = prompt("Admin Password:");
    if (p === "Propetas12") {
        switchTab('admin');
        loadAdmin();
    }
}

function loadAdmin() {
    const list = document.getElementById('adminList');
    db.ref('withdrawals').orderByChild('status').equalTo('pending').on('value', snap => {
        let html = '';
        snap.forEach(child => {
            const d = child.val();
            html += `<div class="bg-slate-100 p-4 rounded-xl text-xs text-slate-800">
                <p><b>User:</b> ${d.uid}</p>
                <p><b>Payout:</b> ${d.method} - ${d.account}</p>
                <p><b>Amount:</b> ₱${d.amount}</p>
                <button onclick="approvePayout('${child.key}')" class="mt-2 w-full bg-green-600 text-white py-2 rounded-lg">APPROVE</button>
            </div>`;
        });
        list.innerHTML = html || 'No pending requests.';
    });
}

function approvePayout(key) {
    db.ref('withdrawals/' + key).update({ status: 'approved' });
    alert("Approved!");
}

// Helpers
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id + '-view').classList.add('active');
}

function closePopup() { document.getElementById('rewardPopup').classList.add('hidden'); }

function copyRef() {
    const el = document.getElementById('refLink');
    el.select();
    navigator.clipboard.writeText(el.value);
    alert("Referral link copied!");
}

setInterval(() => {
    document.getElementById('footerTime').innerText = new Date().toLocaleString();
}, 1000);

initApp();
