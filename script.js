// Referencias a Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Datos iniciales
let currentUser = null;

// Elementos del DOM
const loginContainer = document.getElementById('login-container');
const walletContainer = document.getElementById('wallet-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const balanceAmount = document.getElementById('balance-amount');
const historyList = document.getElementById('history-list');
const adminSection = document.getElementById('admin-section');
const userSelect = document.getElementById('user-select');
const transferAmount = document.getElementById('transfer-amount');
const transferDescription = document.getElementById('transfer-description');
const transferCreditsBtn = document.getElementById('transfer-credits');

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
transferCreditsBtn.addEventListener('click', handleTransfer);

// Manejo de autenticación
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('username').value + '@billetera.com';
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return db.collection('users').doc(userCredential.user.uid).get();
        })
        .then((doc) => {
            if (doc.exists) {
                currentUser = {
                    uid: doc.id,
                    ...doc.data()
                };
                
                loginContainer.style.display = 'none';
                walletContainer.style.display = 'block';
                
                if (currentUser.role === 'admin') {
                    adminSection.style.display = 'block';
                    loadUsersForTransfer();
                } else {
                    adminSection.style.display = 'none';
                }
                
                updateUI();
            } else {
                showMessage('Usuario no encontrado', true);
                auth.signOut();
            }
        })
        .catch((error) => {
            showMessage(error.message, true);
        });
}

function handleLogout() {
    auth.signOut().then(() => {
        currentUser = null;
        walletContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        loginForm.reset();
    });
}

// Funciones de transferencia
async function loadUsersForTransfer() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'user')
            .get();
            
        userSelect.innerHTML = '<option value="">Seleccionar usuario</option>';
        snapshot.forEach(doc => {
            if (doc.id !== currentUser.uid) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().username;
                userSelect.appendChild(option);
            }
        });
    } catch (error) {
        showMessage('Error cargando usuarios: ' + error.message, true);
    }
}

async function handleTransfer() {
    const userId = userSelect.value;
    const amount = parseInt(transferAmount.value);
    const description = transferDescription.value.trim();
    const today = new Date().toISOString().split('T')[0];

    if (!userId) {
        showMessage('Por favor selecciona un usuario', true);
        return;
    }

    if (isNaN(amount)) {
        showMessage('Por favor ingresa una cantidad válida', true);
        return;
    }

    if (amount <= 0) {
        showMessage('La cantidad debe ser mayor que cero', true);
        return;
    }

    if (!description) {
        showMessage('Por favor ingresa una descripción', true);
        return;
    }

    try {
        // Actualizar usuario receptor
        const userRef = db.collection('users').doc(userId);
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw "Usuario no existe";
            
            const newBalance = userDoc.data().balance + amount;
            transaction.update(userRef, {
                balance: newBalance,
                history: firebase.firestore.FieldValue.arrayUnion({
                    date: today,
                    description: `${description} (Transferido por admin)`,
                    amount: amount
                })
            });
        });

        // Actualizar admin
        await db.collection('users').doc(currentUser.uid).update({
            history: firebase.firestore.FieldValue.arrayUnion({
                date: today,
                description: `Transferencia a ${userSelect.options[userSelect.selectedIndex].text}: ${description}`,
                amount: -amount
            })
        });

        showMessage(`¡Se transfirieron ${amount} créditos!`, false);
        
        // Limpiar campos
        transferAmount.value = '';
        transferDescription.value = '';
        userSelect.value = '';
        
        // Actualizar UI
        updateUI();
    } catch (error) {
        showMessage('Error en transferencia: ' + error, true);
    }
}

// Actualización de UI
async function updateUI() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentUser.balance = userData.balance;
            currentUser.history = userData.history || [];
            
            balanceAmount.textContent = userData.balance;
            renderHistory();
            
            if (currentUser.role === 'admin') {
                loadUsersForTransfer();
            }
        }
    } catch (error) {
        showMessage('Error actualizando datos: ' + error.message, true);
    }
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

// Función para mostrar mensajes
function showMessage(message, isError) {
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

// Inicialización de usuarios (solo ejecutar una vez para crear usuarios iniciales)
async function initializeUsers() {
    const users = {
        admin: {
            username: "admin",
            password: "admin123",
            role: "admin",
            balance: 1000,
            history: [{
                date: new Date().toISOString().split('T')[0],
                description: "Inicialización de cuenta",
                amount: 1000
            }]
        },
        usuario: {
            username: "usuario",
            password: "user123",
            role: "user",
            balance: 500,
            history: [{
                date: new Date().toISOString().split('T')[0],
                description: "Inicialización de cuenta",
                amount: 500
            }]
        }
    };

    try {
        for (const [username, userData] of Object.entries(users)) {
            const email = username + '@billetera.com';
            const { user } = await auth.createUserWithEmailAndPassword(email, userData.password);
            await db.collection('users').doc(user.uid).set({
                username: userData.username,
                role: userData.role,
                balance: userData.balance,
                history: userData.history
            });
        }
        console.log('Usuarios inicializados correctamente');
    } catch (error) {
        console.error('Error inicializando usuarios:', error);
    }
}

// Descomenta la siguiente línea solo la primera vez para crear usuarios
// initializeUsers();

// Escuchar cambios de autenticación
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    currentUser = {
                        uid: doc.id,
                        ...doc.data()
                    };
                    
                    loginContainer.style.display = 'none';
                    walletContainer.style.display = 'block';
                    
                    if (currentUser.role === 'admin') {
                        adminSection.style.display = 'block';
                        loadUsersForTransfer();
                    } else {
                        adminSection.style.display = 'none';
                    }
                    
                    updateUI();
                }
            });
    } else {
        currentUser = null;
        walletContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    }
});
