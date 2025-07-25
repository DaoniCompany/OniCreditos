// Usuarios predefinidos
const users = {
    admin: {
        password: "admin123",
        role: "admin",
        balance: 1000,
        history: [
            { date: "2023-05-01", description: "Inicialización de cuenta", amount: 1000 }
        ]
    },
    usuario: {
        password: "user123",
        role: "user",
        balance: 500,
        history: [
            { date: "2023-05-01", description: "Inicialización de cuenta", amount: 500 },
            { date: "2023-05-10", description: "Compra de producto A", amount: -50 }
        ]
    }
};

let currentUser = null;

// Elementos del DOM
const userSelect = document.getElementById('user-select');
const transferAmount = document.getElementById('transfer-amount');
const transferCreditsBtn = document.getElementById('transfer-credits');
const loginContainer = document.getElementById('login-container');
const walletContainer = document.getElementById('wallet-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const balanceAmount = document.getElementById('balance-amount');
const historyList = document.getElementById('history-list');
const adminSection = document.getElementById('admin-section');
const addCreditsBtn = document.getElementById('add-credits');
const removeCreditsBtn = document.getElementById('remove-credits');
const creditAmount = document.getElementById('credit-amount');
const addTransactionBtn = document.getElementById('add-transaction');
const transactionDescription = document.getElementById('transaction-description');

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
addCreditsBtn.addEventListener('click', () => handleCreditChange('add'));
removeCreditsBtn.addEventListener('click', () => handleCreditChange('remove'));
addTransactionBtn.addEventListener('click', handleAddTransaction);
transferCreditsBtn.addEventListener('click', handleTransfer);

// Funciones
function handleLogin(e) {
    e.preventDefault(); // Esta línea evita que el formulario se envíe
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (users[username] && users[username].password === password) {
        currentUser = {
            username,
            ...users[username]
        };
        
        loginContainer.style.display = 'none';
        walletContainer.style.display = 'block';
        
        if (currentUser.role === 'admin') {
            adminSection.style.display = 'block';
        } else {
            adminSection.style.display = 'none';
        }
        
        updateUI();
    } else {
        // Cambia el alert por esta línea para mejor feedback
        showMessage('Usuario o contraseña incorrectos');
        document.getElementById('password').value = '';
    }
}

function showMessage(message, isError = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `login-message ${isError ? 'error' : 'success'}`;
    messageDiv.textContent = message;
    
    const oldMessage = document.querySelector('.login-message');
    if (oldMessage) oldMessage.remove();
    
    loginForm.prepend(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 500);
    }, 3000);
}

function handleLogout() {
    currentUser = null;
    walletContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    loginForm.reset();
}

function updateUI() {
    balanceAmount.textContent = currentUser.balance;
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    
    currentUser.history.forEach(transaction => {
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        
        const transactionInfo = document.createElement('div');
        transactionInfo.innerHTML = `
            <div>${transaction.description}</div>
            <div class="transaction-date">${transaction.date}</div>
        `;
        
        const transactionAmount = document.createElement('div');
        transactionAmount.className = 'transaction-amount';
        transactionAmount.textContent = `${transaction.amount > 0 ? '+' : ''}${transaction.amount} créditos`;
        transactionAmount.style.color = transaction.amount > 0 ? 'green' : 'red';
        
        transactionItem.appendChild(transactionInfo);
        transactionItem.appendChild(transactionAmount);
        historyList.appendChild(transactionItem);
    });
}

function handleCreditChange(action) {
    const amount = parseInt(creditAmount.value);
    
    if (isNaN(amount)) {
        alert('Por favor ingresa una cantidad válida');
        return;
    }
    
    if (amount <= 0) {
        alert('La cantidad debe ser mayor que cero');
        return;
    }
    
    if (action === 'remove' && amount > currentUser.balance) {
        alert('No tienes suficientes créditos');
        return;
    }
    
    const change = action === 'add' ? amount : -amount;
    currentUser.balance += change;
    
    const today = new Date().toISOString().split('T')[0];
    currentUser.history.push({
        date: today,
        description: action === 'add' ? 'Créditos agregados' : 'Créditos retirados',
        amount: change
    });
    
    creditAmount.value = '';
    updateUI();
}

function handleAddTransaction() {
    const description = transactionDescription.value.trim();
    
    if (!description) {
        alert('Por favor ingresa una descripción');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    currentUser.history.push({
        date: today,
        description,
        amount: 0
    });
    
    transactionDescription.value = '';
    updateUI();
}

function handleTransfer() {
    const selectedUser = userSelect.value;
    const amount = parseInt(transferAmount.value);
    const today = new Date().toISOString().split('T')[0];

    if (!selectedUser) {
        showMessage('Por favor selecciona un usuario', true);
        return;
    }

    if (isNaN(amount) {
        showMessage('Por favor ingresa una cantidad válida', true);
        return;
    }

    if (amount <= 0) {
        showMessage('La cantidad debe ser mayor que cero', true);
        return;
    }

    // Actualizar el balance del usuario seleccionado
    users[selectedUser].balance += amount;
    users[selectedUser].history.push({
        date: today,
        description: `Créditos añadidos por admin (${currentUser.username})`,
        amount: amount
    });

    // Registrar la transacción en el admin también
    currentUser.history.push({
        date: today,
        description: `Créditos transferidos a ${selectedUser}`,
        amount: -amount
    });

    showMessage(`¡Se añadieron ${amount} créditos a ${selectedUser}!`, false);
    
    // Limpiar los campos
    transferAmount.value = '';
    userSelect.value = '';

    // Si el usuario actual es el que recibió créditos, actualizar UI
    if (currentUser.username === selectedUser) {
        currentUser.balance = users[selectedUser].balance;
        updateUI();
    }
}
