
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

// Initialize
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// App Constants
const AD_URL = "https://www.profitablecpmratenetwork.com/i2rx8svvds?key=ec449a85ea63cb0b7adf4cd90009cbca";
const REF_BASE_URL = "https://isaiahotico.github.io/PAPERHOUSE-CORP/";
const TASK_REWARD = 0.01;
const REF_BONUS_PERCENT = 0.20; // 20%

// State
let userId = localStorage.getItem('phc_uid');
let userData = {};
let timerInterval = null;
let secondsRemaining = 20;
let isTaskActive = false;

// 1. Setup User & Referrals
function initUser() {
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref');

    if (!userId) {
        userId = 'U' + Math.floor(Math.random() * 1000000);
        localStorage.setItem('phc_uid', userId);
        
        db.ref('users/' + userId).set({
            id: userId,
            balance: 0,
            totalEarnings: 0,
            referralsCount: 0,
            refEarnings: 0,
            referredBy: referrerId || null,
            joined: Date.now()
        });

        if (referrerId) {
            db.ref('users/' + referrerId + '/referralsCount').transaction(c => (c || 0) + 1);
        }
    }

    // Sync Data
    db.ref('users/' + userId).on('value', snap => {
        userData = snap.val() || {};
        updateUI();
    });
}

// 2. UI Updates
function updateUI() {
    const bal = parseFloat(userData.balance || 0).toFixed(3);
    document.getElementById('mainBalance').innerText = `₱${bal}`;
    document.getElementById('balanceHeader').innerText = `₱${bal}`;
    document.getElementById('statRefs').innerText = userData.referralsCount || 0;
    document.getElementById('statRefEarnings').innerText = `₱${parseFloat(userData.refEarnings || 0).toFixed(3)}`;
    document.getElementById('refUrl').value = `${REF_BASE_URL}?ref=${userId}`;
    loadHistory();
}

// 3. Ad Task Logic
function handleAdClick() {
    if (isTaskActive) return;
    
    isTaskActive = true;
    secondsRemaining = 20;
    
    // UI Change
    document.getElementById('adTaskOverlay').classList.remove('hidden');
    document.getElementById('timerText').innerText = secondsRemaining;
    document.getElementById('timerBar').style.width = '100%';

    // Open Ad Link
    window.open(AD_URL, '_blank');

    // Start Timer
    timerInterval = setInterval(() => {
        // Anti-Cheat: If user comes back to this tab while timer > 0
        if (!document.hidden && secondsRemaining > 0 && secondsRemaining < 19) {
            // Check if they came back too soon (allowing 1s buffer)
            if (secondsRemaining > 1) {
                failTask();
                return;
            }
        }

        secondsRemaining--;
        document.getElementById('timerText').innerText = secondsRemaining;
        document.getElementById('timerBar').style.width = (secondsRemaining / 20 * 100) + '%';

        if (secondsRemaining <= 0) {
            completeTask();
        }
    }, 1000);
}

function failTask() {
    clearInterval(timerInterval);
    isTaskActive = false;
    document.getElementById('adTaskOverlay').classList.add('hidden');
    alert("Task Failed! Please stay on the ad page for the full 20 seconds.");
}

function completeTask() {
    clearInterval(timerInterval);
    isTaskActive = false;
    document.getElementById('adTaskOverlay').classList.add('hidden');

    // Reward User
    db.ref('users/' + userId).transaction(u => {
        if (u) {
            u.balance = (u.balance || 0) + TASK_REWARD;
            u.totalEarnings = (u.totalEarnings || 0) + TASK_REWARD;
        }
        return u;
    });

    // Reward Referrer
    if (userData.referredBy) {
        const bonus = TASK_REWARD * REF_BONUS_PERCENT;
        db.ref('users/' + userData.referredBy).transaction(r => {
            if (r) {
                r.balance = (r.balance || 0) + bonus;
                r.refEarnings = (r.refEarnings || 0) + bonus;
            }
            return r;
        });
    }

    alert(`Congrats! Reward Added: ₱${TASK_REWARD}\nTotal: ₱${(userData.balance + TASK_REWARD).toFixed(3)}`);
}

// 4. Withdrawal Logic
function submitWithdrawal() {
    const num = document.getElementById('drawNumber').value;
    const amt = parseFloat(document.getElementById('drawAmount').value);

    if (!num || isNaN(amt) || amt <= 0) return alert("Enter valid details");
    if (amt > userData.balance) return alert("Insufficient balance");

    const req = {
        uid: userId,
        amount: amt,
        method: num,
        status: 'pending',
        timestamp: Date.now(),
        dateStr: new Date().toLocaleString()
    };

    // Deduct and Push
    db.ref('users/' + userId + '/balance').transaction(b => b - amt);
    db.ref('withdrawals').push(req);
    db.ref('users/' + userId + '/history').push(req);

    alert("Withdrawal submitted! Please wait for admin approval.");
    switchTab('dashboard');
}

function loadHistory() {
    const cont = document.getElementById('historyContainer');
    if (!userData.history) return;
    
    let html = '';
    Object.values(userData.history).reverse().forEach(h => {
        html += `
            <div class="flex justify-between items-center border-b pb-2">
                <div>
                    <p class="font-bold text-sm">₱${h.amount}</p>
                    <p class="text-[10px] text-slate-400">${h.dateStr}</p>
                </div>
                <span class="text-[10px] font-bold uppercase px-2 py-1 rounded ${h.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}">${h.status}</span>
            </div>
        `;
    });
    cont.innerHTML = html;
}

// 5. Admin Panel
function promptAdmin() {
    const pass = prompt("Enter Admin Password:");
    if (pass === "Propetas12") {
        switchTab('admin');
        loadAdmin();
    } else {
        alert("Access Denied");
    }
}

function loadAdmin() {
    const cont = document.getElementById('adminContainer');
    db.ref('withdrawals').orderByChild('status').equalTo('pending').on('value', snap => {
        let html = '';
        snap.forEach(child => {
            const d = child.val();
            html += `
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <p><strong>User:</strong> ${d.uid}</p>
                    <p><strong>Method:</strong> ${d.method}</p>
                    <p><strong>Amount:</strong> ₱${d.amount}</p>
                    <button onclick="approveDraw('${child.key}', '${d.uid}')" class="mt-2 bg-green-600 text-white px-3 py-1 rounded-lg font-bold">Approve</button>
                </div>
            `;
        });
        cont.innerHTML = html || '<p class="text-center text-slate-400">No pending requests</p>';
    });
}

function approveDraw(key, uid) {
    db.ref('withdrawals/' + key).update({ status: 'approved' });
    // Note: In a production app, you would also update the status in users/uid/history
    alert("Approved!");
}

// Utils
function switchTab(tab) {
    document.querySelectorAll('[id^="view-"]').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + tab).classList.remove('hidden');
}

function copyRef() {
    const copyText = document.getElementById("refUrl");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);
    alert("Link Copied!");
}

setInterval(() => {
    document.getElementById('footerTime').innerText = new Date().toLocaleString();
}, 1000);

// Run
initUser();
