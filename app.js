
// Firebase Configuration
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Adsterra Links
const adLinks = [
    "https://www.profitablecpmratenetwork.com/i2rx8svvds?key=ec449a85ea63cb0b7adf4cd90009cbca",
    "https://www.profitablecpmratenetwork.com/z8etugym?key=d322b43c7bce6f0736e5dde4ba48d0f0",
    "https://www.profitablecpmratenetwork.com/s9nwgzk4jg?key=00d151ad9c127df9375b11d601a7dbe0",
    "https://www.profitablecpmratenetwork.com/irbmadqf?key=6d52d07e72bf4a4718ea062e38c38525"
];

let currentUser = null;
let timerInterval = null;
let timeLeft = 20;
let isTaskActive = false;

// Time and Date Footer
setInterval(() => {
    const now = new Date();
    document.getElementById('current-time').innerText = now.toLocaleString();
}, 1000);

// Auth & User Setup
auth.signInAnonymously().catch(e => console.error(e));

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        const urlParams = new URLSearchParams(window.location.search);
        const refBy = urlParams.get('ref');
        
        setupUser(user.uid, refBy);
        loadWithdrawals(user.uid);
    }
});

function setupUser(uid, refBy) {
    const userRef = db.ref('users/' + uid);
    userRef.once('value', snapshot => {
        if (!snapshot.exists()) {
            userRef.set({
                balance: 0,
                referrals: 0,
                refEarn: 0,
                invitedBy: refBy || null,
                joinedAt: Date.now()
            });
            if (refBy) {
                db.ref('users/' + refBy + '/referrals').transaction(c => (c || 0) + 1);
            }
        }
        
        // Listen for updates
        userRef.on('value', snap => {
            const data = snap.val();
            document.getElementById('user-balance').innerText = (data.balance || 0).toFixed(2);
            document.getElementById('ref-count').innerText = data.referrals || 0;
            document.getElementById('ref-earn').innerText = (data.refEarn || 0).toFixed(3);
            document.getElementById('ref-link').value = `https://isaiahotico.github.io/PAPERHOUSE-CORP/?ref=${uid}`;
        });
    });
}

// Task Logic
function startTask() {
    if (isTaskActive) return;
    
    isTaskActive = true;
    timeLeft = 20;
    
    const randomAd = adLinks[Math.floor(Math.random() * adLinks.length)];
    window.open(randomAd, '_blank');

    document.getElementById('ready-state').classList.add('hidden');
    document.getElementById('timer-state').classList.remove('hidden');

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-text').innerText = timeLeft + 's';
        document.getElementById('timer-bar').style.width = (timeLeft / 20 * 100) + '%';

        if (timeLeft <= 0) {
            finishTask();
        }
    }, 1000);

    // Anti-cheat: Check if user returns to tab early
    window.onfocus = function() {
        if (isTaskActive && timeLeft > 0) {
            clearInterval(timerInterval);
            alert("Task failed! Please stay on the ad page for the full 20 seconds.");
            resetTaskUI();
        }
    };
}

function finishTask() {
    clearInterval(timerInterval);
    isTaskActive = false;
    window.onfocus = null;
    
    const reward = 0.01;
    const userRef = db.ref('users/' + currentUser.uid);

    userRef.once('value', snap => {
        const userData = snap.val();
        const newBalance = (userData.balance || 0) + reward;
        
        userRef.update({ balance: newBalance });

        // Handle Referral Bonus (20% of 0.01 = 0.002)
        if (userData.invitedBy) {
            const refRef = db.ref('users/' + userData.invitedBy);
            refRef.once('value', rSnap => {
                if (rSnap.exists()) {
                    refRef.update({
                        balance: (rSnap.val().balance || 0) + 0.002,
                        refEarn: (rSnap.val().refEarn || 0) + 0.002
                    });
                }
            });
        }

        alert(`Congrats! Reward: ₱${reward} added.\nTotal Balance: ₱${newBalance.toFixed(2)}`);
        resetTaskUI();
    });
}

function resetTaskUI() {
    isTaskActive = false;
    timeLeft = 20;
    document.getElementById('ready-state').classList.remove('hidden');
    document.getElementById('timer-state').classList.add('hidden');
    document.getElementById('timer-bar').style.width = '100%';
    document.getElementById('timer-text').innerText = '20s';
}

// Withdrawal Logic
function requestWithdrawal() {
    const method = document.getElementById('withdraw-method').value;
    const amount = parseFloat(document.getElementById('withdraw-amount').value);

    if (!method || amount < 1) {
        return alert("Minimum withdrawal is ₱1.00");
    }

    db.ref('users/' + currentUser.uid + '/balance').once('value', snap => {
        const balance = snap.val() || 0;
        if (balance < amount) return alert("Insufficient balance");

        const withdrawData = {
            uid: currentUser.uid,
            method: method,
            amount: amount,
            status: 'pending',
            date: Date.now()
        };

        const newKey = db.ref('withdrawals').push().key;
        const updates = {};
        updates['/withdrawals/' + newKey] = withdrawData;
        updates['/users/' + currentUser.uid + '/balance'] = balance - amount;

        db.ref().update(updates).then(() => {
            alert("Withdrawal request sent!");
            document.getElementById('withdraw-method').value = '';
            document.getElementById('withdraw-amount').value = '';
        });
    });
}

function loadWithdrawals(uid) {
    db.ref('withdrawals').orderByChild('uid').equalTo(uid).on('value', snap => {
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        if (!snap.exists()) {
            list.innerHTML = '<p class="text-gray-400 text-center">No transactions yet.</p>';
            return;
        }
        snap.forEach(child => {
            const w = child.val();
            const color = w.status === 'pending' ? 'text-orange-500' : 'text-green-500';
            list.innerHTML += `
                <div class="flex justify-between border-b py-1">
                    <span>₱${w.amount.toFixed(2)} (${w.method})</span>
                    <span class="font-bold ${color}">${w.status.toUpperCase()}</span>
                </div>
            `;
        });
    });
}

// Admin Logic
function openAdmin() {
    document.getElementById('admin-modal').classList.remove('hidden');
}

function closeAdmin() {
    document.getElementById('admin-modal').classList.add('hidden');
}

function checkAdmin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "Propetas12") {
        document.getElementById('admin-auth').classList.add('hidden');
        document.getElementById('admin-content').classList.remove('hidden');
        loadAdminWithdrawals();
    } else {
        alert("Wrong Password");
    }
}

function loadAdminWithdrawals() {
    db.ref('withdrawals').orderByChild('status').equalTo('pending').on('value', snap => {
        const list = document.getElementById('pending-list');
        list.innerHTML = '';
        snap.forEach(child => {
            const w = child.val();
            list.innerHTML += `
                <div class="bg-gray-100 p-3 rounded-lg text-xs">
                    <p><strong>UID:</strong> ${w.uid}</p>
                    <p><strong>Target:</strong> ${w.method}</p>
                    <p><strong>Amount:</strong> ₱${w.amount}</p>
                    <button onclick="approveWithdraw('${child.key}')" class="bg-green-500 text-white px-3 py-1 rounded mt-2">Approve</button>
                </div>
            `;
        });
    });
}

function approveWithdraw(key) {
    db.ref('withdrawals/' + key).update({ status: 'completed' });
}

function copyRef() {
    const copyText = document.getElementById("ref-link");
    copyText.select();
    document.execCommand("copy");
    alert("Referral link copied!");
}
