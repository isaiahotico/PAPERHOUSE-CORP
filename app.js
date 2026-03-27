
// Import Firebase SDKs dynamically
async function importFirebase() {
    try {
        await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        // Firebase is loaded, proceed with initialization
        initializeAppAndLogic();
    } catch (e) {
        console.error("Failed to load Firebase SDKs:", e);
        alert("Error loading essential services. Please refresh the page.");
    }
}

function initializeAppAndLogic() {
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
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // --- DOM Elements ---
    const loginView = document.getElementById("login-view");
    const appView = document.getElementById("app-view");
    const usernameInput = document.getElementById("username-input");
    const loginButton = document.getElementById("login-button");
    const userDisplay = document.getElementById("user-display");
    const balanceDisplay = document.getElementById("balance-display");
    const totalRefsDisplay = document.getElementById("total-refs");
    const refEarningsDisplay = document.getElementById("ref-earnings");
    const refLinkInput = document.getElementById("ref-link");
    const startBtn = document.getElementById("start-btn");
    const timerCard = document.getElementById("timer-card");
    const secondsDisplay = document.getElementById("seconds");
    const congratsPopup = document.getElementById("congrats-popup");
    const popupTotalDisplay = document.getElementById("popup-total");
    const withdrawAmountInput = document.getElementById("withdraw-amount");
    const withdrawInfoInput = document.getElementById("withdraw-info");
    const historyList = document.getElementById("history-list");
    const adminView = document.getElementById("admin-view");
    const adminRequestsContainer = document.getElementById("admin-requests");
    const footerDate = document.getElementById("footer-date");

    // --- State Variables ---
    let currentUser = localStorage.getItem("active_user");
    let timerInterval = null;
    let timeLeft = 20;
    let isTaskActive = false;
    const REWARD_AMOUNT = 0.01;
    const REFERRAL_BONUS_PERCENT = 0.20; // 20%
    const REFERRAL_LINK_BASE = "https://isaiahotico.github.io/PAPERHOUSE-CORP/?ref=";
    const ADMIN_PASSWORD = "Propetas12";
    const AD_LINKS = [
        "https://www.profitablecpmratenetwork.com/i2rx8svvds?key=ec449a85ea63cb0b7adf4cd90009cbca",
        "https://www.profitablecpmratenetwork.com/z8etugym?key=d322b43c7bce6f0736e5dde4ba48d0f0",
        "https://www.profitablecpmratenetwork.com/s9nwgzk4jg?key=00d151ad9c127df9375b11d601a7dbe0",
        "https://www.profitablecpmratenetwork.com/irbmadqf?key=6d52d07e72bf4a4718ea062e38c38525"
    ];

    // --- Utility Functions ---
    function showView(viewToShow, viewToHide) {
        viewToHide.classList.add("hidden");
        viewToShow.classList.remove("hidden");
    }

    function formatCurrency(amount) {
        return `₱${amount.toFixed(4)}`;
    }

    // --- AUTHENTICATION & USER MANAGEMENT ---
    loginButton.addEventListener("click", async () => {
        const username = usernameInput.value.trim().toLowerCase();
        if (!username) return alert("Please enter a username.");

        const userRef = firebase.database().ref('users/' + username);
        const snapshot = await userRef.once('value');

        let isNewUser = !snapshot.exists();

        if (isNewUser) {
            // Check for referral param in URL
            const urlParams = new URLSearchParams(window.location.search);
            const inviter = urlParams.get('ref');

            await userRef.set({
                username: username,
                balance: 0,
                referrals: 0,
                refEarnings: 0,
                referredBy: inviter || null,
                joinedAt: new Date().toLocaleString()
            });

            // Increment referral count for the inviter if exists and different
            if (inviter && inviter !== username) {
                const inviterRef = firebase.database().ref('users/' + inviter);
                const inviterSnapshot = await inviterRef.once('value');
                if (inviterSnapshot.exists()) {
                    await inviterRef.update({
                        referrals: (inviterSnapshot.val().referrals || 0) + 1
                    });
                }
            }
        }

        localStorage.setItem("active_user", username);
        currentUser = username;
        location.reload(); // Reload to show the app view
    });

    document.getElementById("logout-button").addEventListener("click", () => {
        localStorage.removeItem("active_user");
        currentUser = null;
        location.reload();
    });

    // --- CORE APP LOGIC ---
    function initializeApp() {
        if (currentUser) {
            showView(appView, loginView);
            userDisplay.textContent = `@${currentUser}`;
            refLinkInput.value = `${REFERRAL_LINK_BASE}${currentUser}`;
            listenToUserData();
            loadWithdrawalHistory();
        } else {
            showView(loginView, appView);
        }
    }

    function listenToUserData() {
        const userRef = firebase.database().ref('users/' + currentUser);
        userRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                balanceDisplay.textContent = formatCurrency(data.balance || 0);
                totalRefsDisplay.textContent = data.referrals || 0;
                refEarningsDisplay.textContent = formatCurrency(data.refEarnings || 0);
            }
        });
    }

    startBtn.addEventListener("click", () => {
        if (isTaskActive) return;

        const randomAd = AD_LINKS[Math.floor(Math.random() * AD_LINKS.length)];
        window.open(randomAd, '_blank');

        isTaskActive = true;
        timeLeft = 20;
        timerCard.classList.remove("hidden");
        startBtn.disabled = true;

        timerInterval = setInterval(() => {
            timeLeft--;
            secondsDisplay.textContent = `${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                completeTask();
            }
        }, 1000);

        // Add visibility listener
        document.addEventListener("visibilitychange", handleVisibility);
    });

    const handleVisibility = () => {
        if (document.visibilityState === 'visible' && timeLeft > 0 && isTaskActive) {
            alert("Task Failed! Please stay on the ad for 20 seconds.");
            resetTimer();
        }
    };

    async function completeTask() {
        const userRef = firebase.database().ref('users/' + currentUser);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        const newBalance = (userData.balance || 0) + REWARD_AMOUNT;
        await userRef.update({ balance: newBalance });

        // Award referral bonus to the inviter
        if (userData.referredBy) {
            const inviterRef = firebase.database().ref('users/' + userData.referredBy);
            const inviterSnapshot = await inviterRef.once('value');
            if (inviterSnapshot.exists()) {
                const bonus = REWARD_AMOUNT * REFERRAL_BONUS_PERCENT;
                await inviterRef.update({
                    balance: (inviterSnapshot.val().balance || 0) + bonus,
                    refEarnings: (inviterSnapshot.val().refEarnings || 0) + bonus
                });
            }
        }

        popupTotalDisplay.textContent = formatCurrency(newBalance);
        congratsPopup.classList.remove("hidden");
        resetTimer();
    }

    function resetTimer() {
        clearInterval(timerInterval);
        isTaskActive = false;
        timerCard.classList.add("hidden");
        startBtn.disabled = false;
        secondsDisplay.textContent = "20s";
        document.removeEventListener("visibilitychange", handleVisibility);
    }

    document.getElementById("close-popup-button").addEventListener("click", () => {
        congratsPopup.classList.add("hidden");
    });

    // --- WITHDRAWAL ---
    document.getElementById("withdraw-button").addEventListener("click", async () => {
        const amount = parseFloat(withdrawAmountInput.value);
        const info = withdrawInfoInput.value.trim();
        const userRef = firebase.database().ref('users/' + currentUser);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (isNaN(amount) || amount < 1 || amount > (userData.balance || 0)) {
            return alert("Invalid amount. Minimum ₱1 and must not exceed your balance.");
        }
        if (!info) {
            return alert("Please provide GCash number or email.");
        }

        const withdrawalRef = firebase.database().ref('withdrawals').push();
        await withdrawalRef.set({
            username: currentUser,
            amount: amount,
            info: info,
            status: "Pending",
            date: new Date().toLocaleString()
        });

        await userRef.update({ balance: (userData.balance || 0) - amount });
        alert("Withdrawal request submitted successfully!");
        withdrawAmountInput.value = "";
        withdrawInfoInput.value = "";
    });

    function loadWithdrawalHistory() {
        const withdrawalsRef = firebase.database().ref('withdrawals');
        withdrawalsRef.on('value', (snapshot) => {
            historyList.innerHTML = "";
            snapshot.forEach(child => {
                const data = child.val();
                if (data.username === currentUser) {
                    historyList.innerHTML += `
                        <div class="flex justify-between p-2 bg-gray-50 rounded border-l-4 ${data.status === 'Paid' ? 'border-green-500' : 'border-blue-500'}">
                            <span>₱${data.amount} - ${data.status}</span>
                            <span class="text-gray-400">${data.date}</span>
                        </div>
                    `;
                }
            });
        });
    }

    // --- ADMIN ---
    document.getElementById("admin-button").addEventListener("click", () => {
        const password = prompt("Enter Admin Password:");
        if (password === ADMIN_PASSWORD) {
            showView(adminView, loginView); // Hide login initially
            showView(adminView, appView); // Hide app view
            loadAdminRequests();
        } else {
            alert("Incorrect Password.");
        }
    });

    document.getElementById("close-admin-button").addEventListener("click", () => {
        showView(appView, adminView); // Go back to app view
    });

    function loadAdminRequests() {
        const withdrawalsRef = firebase.database().ref('withdrawals');
        withdrawalsRef.on('value', (snapshot) => {
            adminRequestsContainer.innerHTML = "";
            snapshot.forEach(child => {
                const data = child.val();
                if (data.status === "Pending") {
                    adminRequestsContainer.innerHTML += `
                        <div class="p-4 bg-gray-100 rounded-xl shadow">
                            <p>User: <b class="text-blue-600">${data.username}</b></p>
                            <p>Pay to: <code class="text-xs">${data.info}</code></p>
                            <p>Amount: <b>₱${data.amount}</b></p>
                            <button onclick="approveAdminRequest('${child.key}')" class="mt-2 bg-blue-600 text-white px-4 py-1 rounded font-bold text-sm">APPROVE</button>
                        </div>
                    `;
                }
            });
        });
    }

    // Make approveAdminRequest globally accessible for the onclick attribute
    window.approveAdminRequest = async (key) => {
        await firebase.database().ref(`withdrawals/${key}`).update({ status: "Paid" });
        alert("Request marked as Paid.");
    };

    // --- COPY REFERRAL LINK ---
    document.getElementById("copy-ref-button").addEventListener("click", () => {
        navigator.clipboard.writeText(refLinkInput.value);
        alert("Referral link copied!");
    });

    // --- FOOTER CLOCK ---
    setInterval(() => {
        footerDate.textContent = new Date().toLocaleString();
    }, 1000);

    // --- INITIALIZE ---
    initializeApp();
}

// Call the function to load Firebase and start the app
importFirebase();

