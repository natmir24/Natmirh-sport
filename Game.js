// Casino Management System
class CasinoSystem {
    constructor() {
        this.currentPlayer = null;
        this.players = new Map();
        this.casinoHistory = [];
        this.currentSessionId = null;
        
        // NEO CRASH Game State
        this.crash = {
            isActive: false,
            isBettingPeriod: true,
            currentMultiplier: 1.00,
            crashPoint: 0,
            roundNumber: 1,
            countdown: 10,
            bets: new Map(),
            roundPlayers: new Set(),
            historyMultipliers: [2.03, 1.31, 1.46, 1.87, 7.55],
            gameInterval: null,
            countdownInterval: null,
            panelBets: {
                1: { active: false, amount: 7, cashedOut: false },
                2: { active: false, amount: 15, cashedOut: false }
            }
        };
        
        // Keno Game State
        this.keno = {
            selectedNumbers: [],
            slips: [],
            drawnNumbers: [],
            isDrawing: false,
            currentDraw: 0,
            countdown: 50,
            roundPlayers: new Set(),
            drawHistory: []
        };
        
        // Slot Machine State
        this.slots = {
            isSpinning: false,
            reels: [[], [], [], []],
            symbols: ['🍒', '🍋', '🍊', '🍉', '⭐', '7️⃣', '🔔', '💎'],
            paylines: [
                [0,0,0,0], // Horizontal top
                [1,1,1,1], // Horizontal middle
                [2,2,2,2], // Horizontal bottom
                [0,1,2,1], // V pattern
                [2,1,0,1]  // Inverse V
            ],
            currentBet: 100,
            lastWin: 0,
            totalBet: 0
        };
        
        // Statistics
        this.stats = {
            onlinePlayers: Math.floor(Math.random() * 500) + 1000,
            totalWagered: 0,
            biggestWin: 0,
            totalGames: 0,
            totalPayouts: 0
        };
        
        this.init();
    }
    
    init() {
        this.loadData();
        this.initKenoGrid();
        this.initSlotMachine();
        this.initNeoCrash();
        this.startIntervals();
        this.updateUI();
        this.checkAutoLogin();
    }
    
    loadData() {
        const saved = localStorage.getItem('natmirCasinoV2');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.players = new Map(Object.entries(data.players || {}));
                this.casinoHistory = data.casinoHistory || [];
                this.stats = data.stats || this.stats;
            } catch (e) {
                console.error('Error loading data:', e);
            }
        }
    }
    
    saveData() {
        try {
            const saveData = {
                players: Object.fromEntries(this.players),
                casinoHistory: this.casinoHistory,
                stats: this.stats
            };
            localStorage.setItem('natmirCasinoV2', JSON.stringify(saveData));
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }
    
    checkAutoLogin() {
        const savedSession = localStorage.getItem('casinoSessionV2');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                const player = this.players.get(session.username);
                if (player && player.password === session.password) {
                    this.login(player.username, player.password);
                }
            } catch (e) {
                console.error('Error loading session:', e);
            }
        }
    }
    
    // Authentication Functions
    register(username, password, initialBalance) {
        if (this.players.has(username)) {
            return { success: false, error: 'Username already exists' };
        }
        
        if (!username || username.length < 3) {
            return { success: false, error: 'Username must be at least 3 characters' };
        }
        
        if (!password || password.length < 4) {
            return { success: false, error: 'Password must be at least 4 characters' };
        }
        
        const initialBalanceNum = parseInt(initialBalance) || 1000;
        
        const player = {
            id: Date.now().toString(),
            username: username,
            password: password,
            balance: initialBalanceNum,
            gamesPlayed: 0,
            totalBets: 0,
            totalWins: 0,
            totalProfit: 0,
            winRate: 0,
            history: [],
            createdAt: new Date(),
            lastLogin: new Date(),
            tier: 'Bronze'
        };
        
        this.players.set(username, player);
        this.saveData();
        
        return { success: true, player };
    }
    
    login(username, password) {
        const player = this.players.get(username);
        if (!player) {
            return { success: false, error: 'User not found' };
        }
        
        if (player.password !== password) {
            return { success: false, error: 'Invalid password' };
        }
        
        player.lastLogin = new Date();
        this.currentPlayer = player;
        
        localStorage.setItem('casinoSessionV2', JSON.stringify({
            username: player.username,
            password: player.password
        }));
        
        this.saveData();
        this.updateUI();
        
        return { success: true, player };
    }
    
    logout() {
        localStorage.removeItem('casinoSessionV2');
        this.currentPlayer = null;
        this.updateUI();
        return { success: true };
    }
    
    deposit(amount) {
        if (!this.currentPlayer) {
            return { success: false, error: 'Please login first' };
        }
        
        const depositAmount = parseInt(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            return { success: false, error: 'Amount must be positive' };
        }
        
        this.currentPlayer.balance += depositAmount;
        this.addGameRecord('deposit', depositAmount, 'deposit', depositAmount);
        this.updateUI();
        this.showNotification(`Deposited ${depositAmount} ETH successfully!`, 'success');
        
        return { success: true, newBalance: this.currentPlayer.balance };
    }
    
    // Game Record Management
    addGameRecord(game, betAmount, result, winnings, multiplier = 1) {
        if (!this.currentPlayer) return;
        
        const record = {
            id: Date.now(),
            game: game,
            betAmount: betAmount,
            result: result,
            winnings: winnings,
            multiplier: multiplier,
            timestamp: new Date(),
            profit: winnings - betAmount
        };
        
        this.currentPlayer.history.unshift(record);
        this.casinoHistory.unshift({
            ...record,
            player: this.currentPlayer.username,
            playerId: this.currentPlayer.id
        });
        
        if (game !== 'deposit') {
            this.currentPlayer.gamesPlayed++;
            this.currentPlayer.totalBets += betAmount;
            if (winnings > 0) {
                this.currentPlayer.totalWins++;
                this.currentPlayer.totalProfit += (winnings - betAmount);
            } else {
                this.currentPlayer.totalProfit -= betAmount;
            }
        }
        
        if (game !== 'deposit') {
            this.stats.totalGames++;
            this.stats.totalWagered += betAmount;
            this.stats.totalPayouts += winnings;
            if (winnings > this.stats.biggestWin) {
                this.stats.biggestWin = winnings;
            }
        }
        
        this.currentPlayer.winRate = this.currentPlayer.gamesPlayed > 0 
            ? Math.round((this.currentPlayer.totalWins / this.currentPlayer.gamesPlayed) * 100)
            : 0;
        
        this.saveData();
        this.updateUI();
        this.updateHistoryDisplay();
        
        return record;
    }
    
    // NEO CRASH Functions
    initNeoCrash() {
        this.updateDrawnNumbers();
        this.startCrashCountdown();
    }
    
    startCrashCountdown() {
        clearInterval(this.crash.countdownInterval);
        
        this.crash.countdownInterval = setInterval(() => {
            if (this.crash.countdown > 0 && this.crash.isBettingPeriod) {
                this.crash.countdown--;
                this.updateNeoCrashUI();
                
                if (this.crash.countdown === 0 && this.crash.isBettingPeriod) {
                    this.startNeoCrashRound();
                }
            }
        }, 1000);
    }
    
    startNeoCrashRound() {
        this.crash.isBettingPeriod = false;
        this.crash.isActive = true;
        this.crash.currentMultiplier = 1.00;
        this.crash.roundNumber++;
        
        // Generate crash point
        const random = Math.random();
        if (random < 0.6) {
            this.crash.crashPoint = 1.00 + Math.random() * 1.5;
        } else if (random < 0.85) {
            this.crash.crashPoint = 2.50 + Math.random() * 3;
        } else if (random < 0.95) {
            this.crash.crashPoint = 5.50 + Math.random() * 10;
        } else {
            this.crash.crashPoint = 15.50 + Math.random() * 85;
        }
        
        this.crash.crashPoint = Math.round(this.crash.crashPoint * 100) / 100;
        
        // Start game
        this.crash.gameInterval = setInterval(() => {
            if (this.crash.isActive) {
                // Increase multiplier
                this.crash.currentMultiplier += 0.01 + (Math.random() * 0.02);
                this.crash.currentMultiplier = Math.round(this.crash.currentMultiplier * 100) / 100;
                
                // Update airplane position
                const airplane = document.getElementById('airplane');
                if (airplane) {
                    const progress = (this.crash.currentMultiplier - 1) * 5;
                    const leftPosition = Math.min(progress, 95);
                    airplane.style.left = `calc(${leftPosition}% - 50px)`;
                    
                    // Rotate airplane based on speed
                    const rotation = Math.sin(Date.now() / 200) * 5;
                    airplane.style.transform = `rotate(${45 + rotation}deg)`;
                }
                
                // Update UI
                this.updateNeoCrashUI();
                
                // Check for crash
                if (this.crash.currentMultiplier >= this.crash.crashPoint) {
                    this.endNeoCrashRound();
                }
            }
        }, 100);
        
        this.showNotification('NEO CRASH round started! Multiplier increasing...', 'info');
    }
    
    endNeoCrashRound() {
        clearInterval(this.crash.gameInterval);
        this.crash.isActive = false;
        
        // Add to history
        this.crash.historyMultipliers.unshift(this.crash.currentMultiplier);
        if (this.crash.historyMultipliers.length > 5) {
            this.crash.historyMultipliers.pop();
        }
        this.updateDrawnNumbers();
        
        // Process uncashed bets
        Object.keys(this.crash.panelBets).forEach(panel => {
            const bet = this.crash.panelBets[panel];
            if (bet.active && !bet.cashedOut) {
                const player = this.currentPlayer;
                if (player) {
                    this.addGameRecord('crash', bet.amount, 'loss', 0, this.crash.currentMultiplier);
                }
                bet.active = false;
            }
        });
        
        // Reset for next round
        setTimeout(() => {
            this.crash.isBettingPeriod = true;
            this.crash.countdown = 10;
            this.crash.panelBets = {
                1: { active: false, amount: 7, cashedOut: false },
                2: { active: false, amount: 15, cashedOut: false }
            };
            this.updateNeoCrashUI();
            
            // Reset panel status
            document.getElementById('panel1Status').textContent = 'READY';
            document.getElementById('panel2Status').textContent = 'READY';
            
            // Reset airplane
            const airplane = document.getElementById('airplane');
            if (airplane) {
                airplane.style.left = '-100px';
            }
            
            this.showNotification('New NEO CRASH round starting!', 'info');
        }, 5000);
        
        this.showNotification(`CRASH at ${this.crash.currentMultiplier.toFixed(2)}x!`, 'info');
    }
    
    placeNeoCrashBet(panel) {
        if (!this.currentPlayer) {
            this.showNotification('Please login to place bets', 'warning');
            return false;
        }
        
        if (!this.crash.isBettingPeriod) {
            this.showNotification('Betting period has ended!', 'warning');
            return false;
        }
        
        const betAmount = parseInt(document.getElementById('neoBetAmount').value) || 100;
        const currentBet = this.crash.panelBets[panel];
        
        if (currentBet.active) {
            this.showNotification(`Panel ${panel} already has an active bet`, 'warning');
            return false;
        }
        
        if (betAmount > this.currentPlayer.balance) {
            this.showNotification('Insufficient balance!', 'error');
            return false;
        }
        
        // Deduct balance
        this.currentPlayer.balance -= betAmount;
        
        // Set bet
        this.crash.panelBets[panel] = {
            active: true,
            amount: betAmount,
            cashedOut: false,
            cashoutMultiplier: 0,
            winnings: 0
        };
        
        // Update panel
        document.getElementById(`panel${panel}Br`).textContent = `Br${betAmount}`;
        document.getElementById(`panel${panel}Status`).textContent = 'ACTIVE';
        
        this.updateUI();
        this.updateNeoCrashUI();
        this.showNotification(`Bet placed: ${betAmount} ETH (Panel ${panel})`, 'success');
        return true;
    }
    
    cashOutNeoCrash(panel) {
        if (!this.currentPlayer) {
            this.showNotification('Please login to cash out', 'warning');
            return false;
        }
        
        if (!this.crash.isActive) {
            this.showNotification('No active game to cash out', 'warning');
            return false;
        }
        
        const bet = this.crash.panelBets[panel];
        if (!bet || !bet.active) {
            this.showNotification(`No active bet in Panel ${panel}`, 'warning');
            return false;
        }
        
        if (bet.cashedOut) {
            this.showNotification('Bet already cashed out', 'warning');
            return false;
        }
        
        // Calculate winnings
        const houseEdge = 0.01;
        const rawWinnings = bet.amount * this.crash.currentMultiplier;
        const winnings = Math.floor(rawWinnings * (1 - houseEdge) * 100) / 100;
        
        // Mark as cashed out
        bet.cashedOut = true;
        bet.cashoutMultiplier = this.crash.currentMultiplier;
        bet.winnings = winnings;
        
        // Add winnings to balance
        this.currentPlayer.balance += winnings;
        
        // Update panel status
        document.getElementById(`panel${panel}Status`).textContent = 'CASHED OUT';
        
        // Record game
        this.addGameRecord('crash', bet.amount, 'win', winnings, this.crash.currentMultiplier);
        
        this.showNotification(`Cashed out at ${this.crash.currentMultiplier.toFixed(2)}x! Won ${winnings} ETH`, 'success');
        this.updateUI();
        this.updateNeoCrashUI();
        return true;
    }
    
    updateDrawnNumbers() {
        const drawnGrid = document.getElementById('drawnNumbersGrid');
        if (!drawnGrid) return;
        
        drawnGrid.innerHTML = '';
        
        this.crash.historyMultipliers.forEach((multiplier) => {
            const numberDiv = document.createElement('div');
            numberDiv.className = 'drawn-number';
            numberDiv.textContent = multiplier.toFixed(2);
            drawnGrid.appendChild(numberDiv);
        });
    }
    
    updateNeoCrashUI() {
        // Update countdown
        document.getElementById('crashCountdown').textContent = this.crash.countdown;
        document.getElementById('crashNextRound').textContent = this.crash.countdown + 's';
        
        const progress = ((10 - this.crash.countdown) / 10) * 100;
        document.getElementById('crashProgress').style.width = progress + '%';
        
        // Update multiplier
        const multiplier = this.crash.currentMultiplier.toFixed(2);
        document.getElementById('neoMultiplier').textContent = multiplier + 'x';
        document.getElementById('neoBrLabel').textContent = `Br${multiplier} =`;
        
        // Update buttons
        const canBet = this.crash.isBettingPeriod;
        document.getElementById('panel1Bet').disabled = !canBet;
        document.getElementById('panel2Bet').disabled = !canBet;
        
        const canCashout1 = this.crash.isActive && this.crash.panelBets[1].active && !this.crash.panelBets[1].cashedOut;
        const canCashout2 = this.crash.isActive && this.crash.panelBets[2].active && !this.crash.panelBets[2].cashedOut;
        document.getElementById('panel1Cashout').disabled = !canCashout1;
        document.getElementById('panel2Cashout').disabled = !canCashout2;
        
        // Update bet info
        let totalBet = 0;
        if (this.crash.panelBets[1].active) totalBet += this.crash.panelBets[1].amount;
        if (this.crash.panelBets[2].active) totalBet += this.crash.panelBets[2].amount;
        
        const potentialWin = totalBet * this.crash.currentMultiplier;
        document.getElementById('currentNeoBet').textContent = totalBet;
        document.getElementById('neoPotentialWin').textContent = potentialWin.toFixed(2);
        document.getElementById('neoBetStatus').textContent = this.crash.isActive ? 'ACTIVE' : 'WAITING';
        document.getElementById('neoRoundNumber').textContent = this.crash.roundNumber;
        document.getElementById('currentRoundNumber').textContent = this.crash.roundNumber;
        
        // Update players
        document.getElementById('crashPlayers').textContent = this.crash.roundPlayers.size;
        document.getElementById('kenoPlayers').textContent = this.keno.roundPlayers.size;
        document.getElementById('slotsPlayers').textContent = Math.floor(Math.random() * 100);
    }
    
    // Keno Functions
    initKenoGrid() {
        const kenoGrid = document.getElementById('kenoGrid');
        if (!kenoGrid) return;
        
        kenoGrid.innerHTML = '';
        
        // Create 80 numbers (8 rows x 10 columns)
        for (let i = 1; i <= 80; i++) {
            const numberDiv = document.createElement('div');
            numberDiv.className = 'keno-number';
            numberDiv.textContent = i;
            numberDiv.dataset.number = i;
            numberDiv.onclick = () => this.selectKenoNumber(i);
            kenoGrid.appendChild(numberDiv);
        }
        
        this.updateKenoUI();
    }
    
    selectKenoNumber(number) {
        if (!this.currentPlayer) {
            this.showNotification('Please login to select numbers', 'warning');
            return;
        }
        
        if (this.keno.isDrawing) {
            this.showNotification('Cannot select numbers during draw', 'warning');
            return;
        }
        
        const index = this.keno.selectedNumbers.indexOf(number);
        
        if (index === -1) {
            if (this.keno.selectedNumbers.length >= 6) {
                this.showNotification('Maximum 6 numbers per slip', 'warning');
                return;
            }
            this.keno.selectedNumbers.push(number);
        } else {
            this.keno.selectedNumbers.splice(index, 1);
        }
        
        this.updateKenoUI();
    }
    
    quickPickKeno() {
        if (!this.currentPlayer) {
            this.showNotification('Please login to play Keno', 'warning');
            return;
        }
        
        if (this.keno.isDrawing) {
            this.showNotification('Cannot select numbers during draw', 'warning');
            return;
        }
        
        // Clear current selection
        this.keno.selectedNumbers = [];
        
        // Pick random number of numbers (1-6)
        const numCount = Math.floor(Math.random() * 6) + 1;
        
        while (this.keno.selectedNumbers.length < numCount) {
            const num = Math.floor(Math.random() * 80) + 1;
            if (!this.keno.selectedNumbers.includes(num)) {
                this.keno.selectedNumbers.push(num);
            }
        }
        
        this.updateKenoUI();
        this.showNotification(`${numCount} random numbers selected`, 'success');
    }
    
    addKenoSlip() {
        if (!this.currentPlayer) {
            this.showNotification('Please login to create slips', 'warning');
            return;
        }
        
        if (this.keno.selectedNumbers.length === 0) {
            this.showNotification('Select at least 1 number', 'warning');
            return;
        }
        
        if (this.keno.selectedNumbers.length > 6) {
            this.showNotification('Maximum 6 numbers per slip', 'warning');
            return;
        }
        
        if (this.keno.slips.length >= 10) {
            this.showNotification('Maximum 10 slips per round', 'warning');
            return;
        }
        
        const slip = {
            id: Date.now(),
            numbers: [...this.keno.selectedNumbers].sort((a, b) => a - b),
            betAmount: parseInt(document.getElementById('kenoBetAmount').value) || 100,
            matches: 0,
            winnings: 0,
            played: false
        };
        
        this.keno.slips.push(slip);
        this.keno.selectedNumbers = [];
        
        this.updateKenoUI();
        this.showNotification(`Slip ${this.keno.slips.length} added (${slip.numbers.length} numbers)`, 'success');
    }
    
    placeAllKenoBets() {
        if (!this.currentPlayer) {
            this.showNotification('Please login to place bets', 'warning');
            return;
        }
        
        if (this.keno.slips.length === 0) {
            this.showNotification('No slips to play', 'warning');
            return;
        }
        
        const totalBet = this.keno.slips.reduce((sum, slip) => sum + slip.betAmount, 0);
        
        if (totalBet > this.currentPlayer.balance) {
            this.showNotification('Insufficient balance', 'error');
            return;
        }
        
        // Deduct balance
        this.currentPlayer.balance -= totalBet;
        this.keno.roundPlayers.add(this.currentPlayer.username);
        
        // Mark slips as played
        this.keno.slips.forEach(slip => {
            slip.played = true;
        });
        
        this.updateUI();
        this.updateKenoUI();
        this.showNotification(`${this.keno.slips.length} slips placed for ${totalBet} ETH`, 'success');
    }
    
    startIntervals() {
        // Update online players
        setInterval(() => {
            this.stats.onlinePlayers = Math.floor(Math.random() * 500) + 1000;
            this.updateUI();
        }, 10000);
        
        // Start Keno countdown
        setInterval(() => {
            if (this.keno.countdown > 0 && !this.keno.isDrawing) {
                this.keno.countdown--;
                this.updateKenoUI();
                
                if (this.keno.countdown === 0 && !this.keno.isDrawing) {
                    this.startKenoDraw();
                }
            }
        }, 1000);
    }
    
    startKenoDraw() {
        if (this.keno.slips.filter(slip => slip.played).length === 0) {
            this.showNotification('No active slips for this draw', 'info');
            this.keno.countdown = 50;
            return;
        }
        
        this.keno.isDrawing = true;
        this.keno.currentDraw++;
        this.keno.drawnNumbers = [];
        
        // Generate 20 unique random numbers
        while (this.keno.drawnNumbers.length < 20) {
            const num = Math.floor(Math.random() * 80) + 1;
            if (!this.keno.drawnNumbers.includes(num)) {
                this.keno.drawnNumbers.push(num);
            }
        }
        
        // Clear drawn numbers display
        const drawnGrid = document.getElementById('kenoDrawnNumbersGrid');
        drawnGrid.innerHTML = '';
        
        // Draw numbers one by one
        this.drawKenoNumbersOneByOne();
    }
    
    drawKenoNumbersOneByOne(index = 0) {
        if (index >= this.keno.drawnNumbers.length) {
            this.finishKenoDraw();
            return;
        }
        
        const number = this.keno.drawnNumbers[index];
        
        // Add to displayed numbers
        const drawnGrid = document.getElementById('kenoDrawnNumbersGrid');
        const numberDiv = document.createElement('div');
        numberDiv.className = 'drawn-number';
        numberDiv.textContent = number;
        numberDiv.style.animationDelay = `${index * 0.1}s`;
        drawnGrid.appendChild(numberDiv);
        
        // Highlight on grid
        const gridNumber = document.querySelector(`.keno-number[data-number="${number}"]`);
        if (gridNumber) {
            gridNumber.classList.add('drawn');
        }
        
        // Draw next number after delay
        setTimeout(() => {
            this.drawKenoNumbersOneByOne(index + 1);
        }, 500);
    }
    
    finishKenoDraw() {
        this.keno.isDrawing = false;
        
        // Calculate winnings
        this.calculateKenoWinnings();
        
        // Reset for next round
        setTimeout(() => {
            this.keno.slips = this.keno.slips.filter(slip => slip.winnings === 0);
            this.keno.selectedNumbers = [];
            this.keno.countdown = 50;
            this.keno.drawnNumbers = [];
            this.keno.roundPlayers.clear();
            
            // Clear drawn highlights
            document.querySelectorAll('.keno-number.drawn').forEach(el => {
                el.classList.remove('drawn');
            });
            
            this.updateKenoUI();
        }, 10000);
    }
    
    calculateKenoWinnings() {
        let totalWinnings = 0;
        let totalBet = 0;
        
        // Payout table
        const payoutTables = {
            6: [0, 0, 2, 10, 100, 1000, 10000],
            5: [0, 0, 2, 10, 100, 1000],
            4: [0, 0, 2, 10, 100],
            3: [0, 0, 2, 10],
            2: [0, 0, 2],
            1: [0, 1]
        };
        
        this.keno.slips.forEach(slip => {
            if (slip.played) {
                totalBet += slip.betAmount;
                const matches = slip.numbers.filter(num => this.keno.drawnNumbers.includes(num)).length;
                slip.matches = matches;
                
                const numCount = slip.numbers.length;
                const payoutTable = payoutTables[numCount] || payoutTables[6];
                
                let multiplier = 0;
                if (matches >= 0 && matches < payoutTable.length) {
                    multiplier = payoutTable[matches];
                }
                
                slip.winnings = slip.betAmount * multiplier;
                totalWinnings += slip.winnings;
                
                // Record game
                if (this.currentPlayer) {
                    this.addGameRecord('keno', slip.betAmount, 
                        slip.winnings > 0 ? 'win' : 'loss', 
                        slip.winnings, 
                        multiplier);
                }
            }
        });
        
        if (totalWinnings > 0) {
            if (this.currentPlayer) {
                this.currentPlayer.balance += totalWinnings;
            }
            this.showNotification(`Keno draw complete! Total winnings: ${totalWinnings} ETH`, 'success');
        } else {
            this.showNotification('Keno draw complete - No wins this round', 'info');
        }
        
        this.updateUI();
    }
    
    updateKenoUI() {
        // Update countdown
        document.getElementById('kenoCountdown').textContent = this.keno.countdown;
        document.getElementById('kenoNextDraw').textContent = this.keno.countdown + 's';
        document.getElementById('kenoDrawCountdown').textContent = this.keno.countdown;
        
        const progress = ((50 - this.keno.countdown) / 50) * 100;
        document.getElementById('kenoProgress').style.width = progress + '%';
        
        // Update selected count
        document.getElementById('selectedCount').textContent = this.keno.selectedNumbers.length;
        
        // Update slips count
        document.getElementById('slipsCount').textContent = this.keno.slips.length;
        
        // Update total bet
        const totalBet = this.keno.slips.reduce((sum, slip) => sum + slip.betAmount, 0);
        document.getElementById('totalSlipsBet').textContent = totalBet;
        
        // Update number grid
        const numberElements = document.querySelectorAll('.keno-number');
        numberElements.forEach((div, index) => {
            const number = index + 1;
            div.classList.remove('selected');
            
            if (this.keno.selectedNumbers.includes(number)) {
                div.classList.add('selected');
            }
        });
        
        // Update draw number
        document.getElementById('currentDrawNumber').textContent = this.keno.currentDraw;
    }
    
    clearAllSlips() {
        this.keno.slips = this.keno.slips.filter(slip => slip.played);
        this.updateKenoUI();
        this.showNotification('Unplayed slips cleared', 'info');
    }
    
    // Slot Machine Functions
    initSlotMachine() {
        const slotReels = document.getElementById('slotReels');
        if (!slotReels) return;
        
        slotReels.innerHTML = '';
        
        // Create 4 reels with 5 symbols each
        for (let reel = 0; reel < 4; reel++) {
            const reelDiv = document.createElement('div');
            reelDiv.className = 'slot-reel';
            reelDiv.id = `slotReel${reel}`;
            
            // Generate random symbols for this reel
            this.slots.reels[reel] = [];
            for (let row = 0; row < 5; row++) {
                const symbol = this.slots.symbols[Math.floor(Math.random() * this.slots.symbols.length)];
                this.slots.reels[reel].push(symbol);
                
                const symbolDiv = document.createElement('div');
                symbolDiv.className = 'slot-symbol';
                symbolDiv.textContent = symbol;
                symbolDiv.dataset.reel = reel;
                symbolDiv.dataset.row = row;
                reelDiv.appendChild(symbolDiv);
            }
            
            slotReels.appendChild(reelDiv);
        }
    }
    
    spinSlotMachine() {
        if (!this.currentPlayer) {
            this.showNotification('Please login to play slots', 'warning');
            return;
        }
        
        if (this.slots.isSpinning) {
            this.showNotification('Slot machine is already spinning', 'warning');
            return;
        }
        
        const betAmount = parseInt(document.getElementById('slotBetAmount').value) || 100;
        
        if (betAmount > this.currentPlayer.balance) {
            this.showNotification('Insufficient balance!', 'error');
            return;
        }
        
        // Deduct balance
        this.currentPlayer.balance -= betAmount;
        this.slots.totalBet += betAmount;
        this.slots.currentBet = betAmount;
        this.slots.isSpinning = true;
        
        // Start spinning animation
        this.animateSlotSpin();
        
        this.updateUI();
        this.showNotification(`Slot machine spinning with bet ${betAmount} ETH`, 'info');
    }
    
    animateSlotSpin() {
        const reels = document.querySelectorAll('.slot-reel');
        let reelsStopped = 0;
        
        reels.forEach((reel, reelIndex) => {
            // Animate this reel
            let spins = 0;
            const maxSpins = 10 + reelIndex * 2;
            const spinInterval = setInterval(() => {
                // Move symbols
                const symbols = reel.querySelectorAll('.slot-symbol');
                symbols.forEach((symbol, index) => {
                    const currentSymbol = symbol.textContent;
                    const symbolIndex = this.slots.symbols.indexOf(currentSymbol);
                    const nextIndex = (symbolIndex + 1) % this.slots.symbols.length;
                    symbol.textContent = this.slots.symbols[nextIndex];
                });
                
                spins++;
                
                // Stop this reel
                if (spins > maxSpins) {
                    clearInterval(spinInterval);
                    reelsStopped++;
                    
                    // Generate final symbols for this reel
                    this.slots.reels[reelIndex] = [];
                    const symbols = reel.querySelectorAll('.slot-symbol');
                    symbols.forEach((symbol, index) => {
                        const randomSymbol = this.slots.symbols[Math.floor(Math.random() * this.slots.symbols.length)];
                        this.slots.reels[reelIndex][index] = randomSymbol;
                        
                        // Update display with delay
                        setTimeout(() => {
                            symbol.textContent = randomSymbol;
                        }, 100 * index);
                    });
                    
                    // Check if all reels have stopped
                    if (reelsStopped === 4) {
                        setTimeout(() => {
                            this.slots.isSpinning = false;
                            this.checkSlotWin();
                        }, 500);
                    }
                }
            }, 100 + reelIndex * 50);
        });
    }
    
    checkSlotWin() {
        let totalWin = 0;
        const winningSymbols = new Set();
        
        // Check each payline
        this.slots.paylines.forEach((payline, lineIndex) => {
            const symbols = [];
            for (let reel = 0; reel < 4; reel++) {
                const row = payline[reel];
                symbols.push(this.slots.reels[reel][row]);
            }
            
            // Check for winning combinations
            if (symbols[0] === symbols[1] && symbols[1] === symbols[2] && symbols[2] === symbols[3]) {
                // 4 of a kind
                const winAmount = this.slots.currentBet * 20;
                totalWin += winAmount;
                winningSymbols.add(symbols[0]);
                
                // Highlight winning symbols
                for (let reel = 0; reel < 4; reel++) {
                    const row = payline[reel];
                    const symbol = document.querySelector(`.slot-symbol[data-reel="${reel}"][data-row="${row}"]`);
                    if (symbol) {
                        symbol.classList.add('winning');
                        setTimeout(() => {
                            symbol.classList.remove('winning');
                        }, 2000);
                    }
                }
            } else if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
                // 3 of a kind
                const winAmount = this.slots.currentBet * 5;
                totalWin += winAmount;
                winningSymbols.add(symbols[0]);
            }
        });
        
        if (totalWin > 0) {
            // Add winnings to balance
            this.currentPlayer.balance += totalWin;
            this.slots.lastWin = totalWin;
            
            // Record game
            this.addGameRecord('slots', this.slots.currentBet, 'win', totalWin, totalWin / this.slots.currentBet);
            
            this.showNotification(`Slot machine win! ${totalWin} ETH!`, 'success');
        } else {
            // Record loss
            this.addGameRecord('slots', this.slots.currentBet, 'loss', 0, 0);
            this.showNotification('No win this spin. Try again!', 'info');
        }
        
        // Update UI
        document.getElementById('lastSlotWin').textContent = this.slots.lastWin;
        document.getElementById('totalSlotBet').textContent = this.slots.totalBet;
        this.updateUI();
    }
    
    // UI Update Functions
    updateUI() {
        if (this.currentPlayer) {
            document.getElementById('guestControls').style.display = 'none';
            document.getElementById('loggedInControls').style.display = 'flex';
            document.getElementById('userBalance').textContent = this.currentPlayer.balance.toLocaleString();
            document.getElementById('loggedInUsername').textContent = this.currentPlayer.username;
            
            document.getElementById('profileName').textContent = this.currentPlayer.username;
            document.getElementById('profileGames').textContent = this.currentPlayer.gamesPlayed;
            document.getElementById('profileBets').textContent = this.currentPlayer.totalBets;
            document.getElementById('profileWinRate').textContent = this.currentPlayer.winRate + '%';
            document.getElementById('profileProfit').textContent = this.currentPlayer.totalProfit.toLocaleString();
            document.getElementById('profileTier').innerHTML = `<i class="fas fa-gem"></i> ${this.currentPlayer.tier}`;
        } else {
            document.getElementById('guestControls').style.display = 'flex';
            document.getElementById('loggedInControls').style.display = 'none';
            
            document.getElementById('profileName').textContent = 'Guest';
            document.getElementById('profileGames').textContent = '0';
            document.getElementById('profileBets').textContent = '0';
            document.getElementById('profileWinRate').textContent = '0%';
            document.getElementById('profileProfit').textContent = '0';
            document.getElementById('profileTier').innerHTML = '<i class="fas fa-gem"></i> Guest';
        }
        
        document.getElementById('onlinePlayers').textContent = this.stats.onlinePlayers.toLocaleString();
    }
    
    updateHistoryDisplay() {
        document.getElementById('totalGamesPlayed').textContent = this.stats.totalGames.toLocaleString();
        document.getElementById('totalBets').textContent = this.stats.totalWagered.toLocaleString();
        document.getElementById('totalPayouts').textContent = this.stats.totalPayouts.toLocaleString();
        document.getElementById('averageBet').textContent = this.stats.totalGames > 0 ? 
            Math.floor(this.stats.totalWagered / this.stats.totalGames).toLocaleString() : '0';
        
        const container = document.getElementById('recentGamesList');
        container.innerHTML = '';
        
        const recentGames = this.casinoHistory.slice(0, 10);
        
        if (recentGames.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #aaa;">
                    <i class="fas fa-gamepad" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                    No recent games
                </div>
            `;
            return;
        }
        
        recentGames.forEach(record => {
            const gameCard = document.createElement('div');
            gameCard.style.cssText = `
                background: rgba(0,0,0,0.3);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 10px;
                border-left: 4px solid ${record.result === 'win' || record.result === 'deposit' ? '#00ff88' : '#ff3366'};
            `;
            
            gameCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <div style="color: #00ff88; font-weight: bold;">${record.player || 'Guest'}</div>
                    <span style="background: ${record.result === 'win' || record.result === 'deposit' ? '#00cc66' : '#ff3366'}; 
                          padding: 3px 10px; border-radius: 10px; font-size: 11px;">
                        ${record.result.toUpperCase()}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; color: #ccc; font-size: 13px;">
                    <div>${record.game}</div>
                    <div>${record.winnings > 0 ? '+' + record.winnings : '-' + record.betAmount} ETH</div>
                </div>
                <div style="color: #aaa; font-size: 11px; margin-top: 5px;">
                    ${new Date(record.timestamp).toLocaleTimeString()}
                </div>
            `;
            
            container.appendChild(gameCard);
        });
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        let icon = 'ℹ️';
        let borderColor = '#00ccff';
        
        switch(type) {
            case 'success':
                icon = '✅';
                borderColor = '#00ff88';
                break;
            case 'error':
                icon = '❌';
                borderColor = '#ff3366';
                break;
            case 'warning':
                icon = '⚠️';
                borderColor = '#ffcc00';
                break;
        }
        
        notification.style.borderLeftColor = borderColor;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 24px;">${icon}</div>
                <div style="flex: 1; font-size: 14px;">${message}</div>
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode === container) {
                    container.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Global casino instance
let casino = null;

// Initialize on load
window.addEventListener('load', () => {
    casino = new CasinoSystem();
    setupEventListeners();
    showGameSection('lobby');
    
    // Lobby countdown
    let lobbyCountdown = 50;
    setInterval(() => {
        lobbyCountdown = lobbyCountdown > 0 ? lobbyCountdown - 1 : 50;
        document.getElementById('lobbyCountdown').textContent = lobbyCountdown;
        document.getElementById('lobbyProgress').style.width = ((50 - lobbyCountdown) / 50 * 100) + '%';
    }, 1000);
});

// UI Functions
function showGameSection(section) {
    document.querySelectorAll('.game-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    if (section === 'history' && casino) {
        casino.updateHistoryDisplay();
    }
}
