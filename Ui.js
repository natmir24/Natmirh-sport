// Event Listeners Setup
function setupEventListeners() {
    // Auth buttons
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const form = tab.dataset.form;
            showAuthForm(form);
        });
    });
    
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('registerBtn').addEventListener('click', handleRegister);
    
    // Header buttons
    document.querySelector('.register-btn').addEventListener('click', () => showAuth('register'));
    document.querySelector('.login-btn').addEventListener('click', () => showAuth('login'));
    document.querySelector('.deposit-btn').addEventListener('click', showDepositModal);
    document.querySelector('.logout-btn').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showGameSection(section);
        });
    });
    
    // Game cards
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            const section = card.dataset.section;
            showGameSection(section);
        });
    });
    
    // Deposit modal
    document.querySelectorAll('.deposit-amount').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseInt(btn.dataset.amount);
            setDepositAmount(amount);
        });
    });
    
    document.querySelector('.confirm-deposit').addEventListener('click', processDeposit);
    document.querySelector('.cancel-deposit').addEventListener('click', hideDepositModal);
    
    // NEO CRASH game
    document.getElementById('panel1Bet').addEventListener('click', () => {
        if (casino) casino.placeNeoCrashBet(1);
    });
    
    document.getElementById('panel2Bet').addEventListener('click', () => {
        if (casino) casino.placeNeoCrashBet(2);
    });
    
    document.getElementById('panel1Cashout').addEventListener('click', () => {
        if (casino) casino.cashOutNeoCrash(1);
    });
    
    document.getElementById('panel2Cashout').addEventListener('click', () => {
        if (casino) casino.cashOutNeoCrash(2);
    });
    
    // Quick buttons for panels
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseInt(btn.dataset.amount);
            const panel = btn.dataset.panel;
            document.getElementById(`panel${panel}Br`).textContent = `Br${amount}`;
        });
    });
    
    // Quick bet buttons
    document.querySelectorAll('.quick-bet-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseInt(btn.dataset.amount);
            const inputId = btn.closest('.bet-control-container').querySelector('.bet-input').id;
            document.getElementById(inputId).value = amount;
            
            btn.parentNode.querySelectorAll('.quick-bet-btn').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
        });
    });
    
    // Keno game
    document.getElementById('quickPickBtn').addEventListener('click', () => {
        if (casino) casino.quickPickKeno();
    });
    
    document.getElementById('clearSelectionBtn').addEventListener('click', () => {
        if (casino) {
            casino.keno.selectedNumbers = [];
            casino.updateKenoUI();
        }
    });
    
    document.getElementById('addSlipBtn').addEventListener('click', () => {
        if (casino) casino.addKenoSlip();
    });
    
    document.getElementById('clearAllSlipsBtn').addEventListener('click', () => {
        if (casino) casino.clearAllSlips();
    });
    
    document.getElementById('placeAllBetsBtn').addEventListener('click', () => {
        if (casino) casino.placeAllKenoBets();
    });
    
    // Slot machine
    document.getElementById('spinSlotBtn').addEventListener('click', () => {
        if (casino) casino.spinSlotMachine();
    });
    
    document.getElementById('autoSpinBtn').addEventListener('click', () => {
        if (casino) {
            casino.showNotification('Auto spin feature coming soon!', 'info');
        }
    });
    
    // Modal close on outside click
    document.getElementById('authModal').addEventListener('click', (e) => {
        if (e.target.id === 'authModal') {
            hideAuth();
        }
    });
    
    document.getElementById('depositModal').addEventListener('click', (e) => {
        if (e.target.id === 'depositModal') {
            hideDepositModal();
        }
    });
}

// Auth Functions
function showAuth(form = 'login') {
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.classList.add('active');
    showAuthForm(form);
}

function hideAuth() {
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.classList.remove('active');
}

function showAuthForm(form) {
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (form === 'login') {
        document.querySelector('.auth-tab[data-form="login"]').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelector('.auth-tab[data-form="register"]').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('Please enter username and password', 'error');
        return;
    }
    
    if (!casino) return;
    
    const result = casino.login(username, password);
    if (result.success) {
        hideAuth();
        showNotification('Login successful! Welcome to Natmir Casino!', 'success');
        showGameSection('lobby');
        
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    } else {
        showNotification(result.error, 'error');
    }
}

function handleRegister() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const balance = document.getElementById('registerBalance').value;
    
    if (!username || !password) {
        showNotification('Please enter username and password', 'error');
        return;
    }
    
    if (!casino) return;
    
    const result = casino.register(username, password, balance);
    if (result.success) {
        hideAuth();
        showNotification('Registration successful! Please login with your new account.', 'success');
        showGameSection('lobby');
        
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerBalance').value = '1000';
        
        showAuthForm('login');
    } else {
        showNotification(result.error, 'error');
    }
}

function handleLogout() {
    if (!casino) return;
    casino.logout();
    showNotification('Logged out successfully', 'info');
    showGameSection('lobby');
}

// Deposit Functions
function showDepositModal() {
    if (!casino || !casino.currentPlayer) {
        showNotification('Please login to deposit funds', 'warning');
        return;
    }
    
    const depositModal = document.getElementById('depositModal');
    if (depositModal) depositModal.classList.add('active');
}

function hideDepositModal() {
    const depositModal = document.getElementById('depositModal');
    if (depositModal) depositModal.classList.remove('active');
}

function setDepositAmount(amount) {
    document.getElementById('customDepositAmount').value = amount;
    
    document.querySelectorAll('.deposit-amount').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.amount) === amount) {
            btn.classList.add('active');
        }
    });
}

function processDeposit() {
    if (!casino) return;
    
    const customAmount = document.getElementById('customDepositAmount');
    const amount = parseInt(customAmount.value) || 0;
    
    if (amount <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
    }
    
    if (amount > 100000) {
        showNotification('Maximum deposit is 100,000 ETH', 'warning');
        return;
    }
    
    const result = casino.deposit(amount);
    if (result.success) {
        hideDepositModal();
        customAmount.value = '';
        
        document.querySelectorAll('.deposit-amount').forEach(btn => {
            btn.classList.remove('active');
        });
    } else {
        showNotification(result.error, 'error');
    }
}

function showNotification(message, type = 'info') {
    if (casino) {
        casino.showNotification(message, type);
    } else {
        alert(message);
    }
}
