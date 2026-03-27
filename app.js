
// Ad Links
const adLinks = [
    "https://www.profitablecpmratenetwork.com/i2rx8svvds?key=ec449a85ea63cb0b7adf4cd90009cbca",
    "https://www.profitablecpmratenetwork.com/z8etugym?key=d322b43c7bce6f0736e5dde4ba48d0f0",
    "https://www.profitablecpmratenetwork.com/s9nwgzk4jg?key=00d151ad9c127df9375b11d601a7dbe0",
    "https://www.profitablecpmratenetwork.com/irbmadqf?key=6d52d07e72bf4a4718ea062e38c38525"
];

let currentUser = null;
let timeLeft = 20;
let timerInterval = null;
let isTaskActive = false;

// --- DOM Elements ---
const authModal = document.getElementById('auth-modal');
const mainContent = document.getElementById('main-content');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authErrorDisplay = document.getElementById('auth-error');
const ringSound = document.getElementById('ring-sound');

// --- Real-time Footer Clock ---
setInterval(() => {
    document.getElementById('current-time').innerText = new Date().toLocaleString();
}, 1000);

// --- Firebase Authentication Handling ---
window.onAuthStateChanged(window.auth, (user) => {
    if (user) {
        currentUser = user;
        hideAuthModal();
        showMainContent();
        
        const urlParams = new URLSearchParams(window.location.search);
        const refBy = urlParams.get('ref');
        setupUser(user.uid, refBy);
        loadWithdrawals(user.uid);
    } else {
        currentUser = null;
        showAuthModal();
        hideMainContent();
    }
});

function showAuthModal() {
    authModal.classList.remove('hidden');
    authErrorDisplay.classList.add('hidden'); // Clear error on show
}

function hideAuthModal() {
    authModal.classList.add('hidden');
}

function showMainContent() {
    mainContent.classList.remove('hidden');
}

function hideMainContent() {
    mainContent.classList.add('hidden');
}

function displayAuthError(message) {
    authErrorDisplay.innerText = message;
    authErrorDisplay.classList.remove('hidden');
}

// Global function to handle login/signup from HTML
window.handleAuth = async (isLogin) => {
    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) {
        return displayAuthError("Please enter email and password.");
    }

    authErrorDisplay.classList.add('hidden'); // Hide previous errors

    try {
        if (isLogin) {
            await window.signInWithEmailAndPassword(window.auth, email, password);
            // onAuthStateChanged will handle UI update
        } else {
            await window.createUserWithEmailAndPassword(window.auth, email, password);
            // onAuthStateChanged will handle UI update
        }
    } catch (error) {
        console.error("Auth Error:", error);
        displayAuthError(error.message);
    }
};

// Global function to handle logout from HTML
window.handleLogout = async () => {
    try {
        await window.signOut(window.auth);
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Failed to logout: " + error.message);
    }
};

// --- User Data Setup ---
function setupUser(uid, refBy) {
    const userRef = window.ref(window.db, 'users/' + uid);
    window.onValue(userRef, (snapshot) => {
        if (!snapshot.exists()) {
            window.set(userRef, {
                balance: 0, referrals: 0, refEarn: 0,
                invitedBy: refBy || null, joinedAt: Date.now(),
                email: currentUser.email // Save user's email
            });
            if (refBy) {
                // Use runTransaction for safe increment
                const inviterRef = window.ref(window.db, 'users/' + refBy + '/referrals');
                window.runTransaction(inviterRef, (currentValue) => (currentValue || 0) + 1);
            }
        }
        const data = snapshot.val();
        document.getElementById('user-balance').innerText = (data.balance || 0).toFixed(2);
        document.getElementById('ref-count').innerText = data.referrals || 0;
        document.getElementById('ref-earn').innerText = (data.refEarn || 0).toFixed(3);
        document.getElementById('ref-link').value = `https://isaiahotico.github.io/PAPERHOUSE-CORP/?ref=${uid}`;
    });
}

// --- Task & Timer Logic ---
window.startTask = () => {
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
            clearInterval(timerInterval);
            isTaskActive = false;
            window.onfocus = null; // Disable anti-cheat now that timer is done
            ringSound.play().catch(e => console.warn("Sound blocked by browser:", e)); // Play ring sound
            creditRewardAndResetUI(); // Auto-credit and reset
        }
    }, 1000);

    // Anti-Cheat: If user focuses back on tab while timer is running
    window.onfocus = () => {
        if (isTaskActive && timeLeft > 0) {
            clearInterval(timerInterval);
            alert("Your task failed! Please stay on the ad page for the full 20 seconds. Thank you.");
            resetUI();
        }
    };
};

function creditRewardAndResetUI() {
    const reward = 0.01;
    const userRef = window.ref(window.db, 'users/' + currentUser.uid);

    window.runTransaction(userRef, (currentData) => {
        if (currentData) {
            currentData.balance = (currentData.balance || 0) + reward;

            // Handle Referral Bonus (20% of 0.01 = 0.002)
            if (currentData.invitedBy) {
                const inviterUid = currentData.invitedBy;
                const inviterRef = window.ref(window.db, 'users/' + inviterUid);
                window.runTransaction(inviterRef, (inviterData) => {
                    if (inviterData) {
                        inviterData.balance = (inviterData.balance || 0) + 0.002;
                        inviterData.refEarn = (inviterData.refEarn || 0) + 0.002;
                    }
                    return inviterData;
                });
            }
        }
        return currentData;
    }).then(() => {
        // Fetch updated balance for the alert message
        window.onValue(userRef, (snapshot) => {
            const updatedBalance = (snapshot.val().balance || 0).toFixed(3);
            alert(`Congrats! ₱${reward.toFixed(2)} rewarded.\nYour Total Balance: ₱${updatedBalance}`);
            resetUI();
        }, { onlyOnce: true });
    }).catch(error => {
        console.error("Transaction failed: ", error);
        alert("Failed to credit reward. Please try again.");
        resetUI();
    });
}


function resetUI() {
    isTaskActive = false;
    timeLeft = 20;
    document.getElementById('ready-state').classList.remove('hidden');
    document.getElementById('timer-state').classList.add('hidden');
    document.getElementById('timer-bar').style.width = '100%';
    document.getElementById('timer-text').innerText = '20s';
}

// --- Withdrawal Functions ---
window.requestWithdrawal = () => {
    const method = document.getElementById('withdraw-method').value;
    const amount = parseFloat(document.getElementById('withdraw-amount').value);

    if (!method || isNaN(amount) || amount < 1) {
        return alert("Minimum withdrawal is ₱1.00 and method cannot be empty.");
    }

    const userBalanceRef = window.ref(window.db, 'users/' + currentUser.uid + '/balance');
    window.runTransaction(userBalanceRef, (currentBalance) => {
        if (currentBalance === null) return; // User doesn't exist or balance is null
        if (currentBalance < amount) {
            alert("Insufficient balance.");
            return; // Abort transaction
        }
        return currentBalance - amount;
    }).then(result => {
        if (!result.committed) { // Transaction aborted
            return;
        }
        const withdrawData = {
            uid: currentUser.uid,
            email: currentUser.email, // Include email for admin
            method: method,
            amount: amount,
            status: 'pending',
            date: Date.now()
        };
        const newWithdrawalRef = window.push(window.ref(window.db, 'withdrawals'));
        window.set(newWithdrawalRef, withdrawData).then(() => {
            alert("Withdrawal request submitted for approval.");
            document.getElementById('withdraw-method').value = '';
            document.getElementById('withdraw-amount').value = '';
        }).catch(error => {
            console.error("Failed to add withdrawal request:", error);
            alert("Failed to submit withdrawal request.");
        });
    }).catch(error => {
        console.error("Withdrawal transaction failed:", error);
        alert("An error occurred during withdrawal. Please try again.");
    });
};

function loadWithdrawals(uid) {
    const withdrawalsRef = window.query(window.ref(window.db, 'withdrawals'), window.orderByChild('uid'), window.equalTo(uid));
    window.onValue(withdrawalsRef, (snapshot) => {
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        if (!snapshot.exists()) {
            list.innerHTML = '<p class="text-gray-400 text-center text-xs">No transactions yet.</p>';
            return;
        }
        snapshot.forEach(child => {
            const w = child.val();
            const statusColor = w.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600';
            list.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                    <div>
                        <p class="font-bold text-xs">₱${w.amount.toFixed(2)}</p>
                        <p class="text-[9px] text-gray-400">${new Date(w.date).toLocaleDateString()}</p>
                    </div>
                    <span class="text-[9px] font-bold px-2 py-1 rounded uppercase ${statusColor}">${w.status}</span>
                </div>
            `;
        });
    });
}

// --- Admin Functions ---
window.openAdmin = () => { document.getElementById('admin-modal').classList.remove('hidden'); };
window.closeAdmin = () => { document.getElementById('admin-modal').classList.add('hidden'); };

window.checkAdmin = () => {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "Propetas12") {
        document.getElementById('admin-auth').classList.add('hidden');
        document.getElementById('admin-content').classList.remove('hidden');
        loadAdminWithdrawals();
    } else { alert("Unauthorized"); }
};

function loadAdminWithdrawals() {
    const pendingWithdrawalsRef = window.query(window.ref(window.db, 'withdrawals'), window.orderByChild('status'), window.equalTo('pending'));
    window.onValue(pendingWithdrawalsRef, (snapshot) => {
        const list = document.getElementById('pending-list');
        list.innerHTML = '';
        if (!snapshot.exists()) {
            list.innerHTML = '<p class="text-gray-400 text-center text-xs">No pending withdrawals.</p>';
        }
        snapshot.forEach(child => {
            const w = child.val();
            list.innerHTML += `
                <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <p class="text-xs font-mono"><strong>User Email:</strong> ${w.email || 'N/A'}</p>
                    <p class="text-xs font-mono"><strong>User ID:</strong> ${w.uid}</p>
                    <p class="font-bold"><strong>Target:</strong> ${w.method}</p>
                    <p class="text-green-600 font-black"><strong>Amount:</strong> ₱${w.amount.toFixed(2)}</p>
                    <p class="text-[9px] text-gray-500">Requested on: ${new Date(w.date).toLocaleString()}</p>
                    <button onclick="approveWithdraw('${child.key}')" class="w-full bg-green-500 text-white py-2 rounded-xl mt-3 font-bold">APPROVE PAYMENT</button>
                </div>
            `;
        });
    });
}

window.approveWithdraw = (key) => {
    const withdrawalItemRef = window.ref(window.db, 'withdrawals/' + key);
    window.update(withdrawalItemRef, { status: 'completed' })
        .then(() => alert('Withdrawal approved!'))
        .catch(error => console.error("Error approving withdrawal:", error));
};

// --- Referral Link Copy Function ---
window.copyRef = () => {
    const copyText = document.getElementById("ref-link");
    copyText.select();
    document.execCommand("copy");
    alert("Referral link copied!");
};

