// DOM Elements
const profileContainer = document.getElementById("profile-container");
const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const logoutBtn = document.getElementById("logout");

// Login Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const credentials = btoa(`${username}:${password}`);
        const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
            method: 'POST',
            headers: { Authorization: `Basic ${credentials}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Invalid credentials');
        }
        
        const jwt = (await response.text()).replace(/^"|"$/g, '');
        localStorage.setItem('jwt', jwt);
        await loadProfile();
        loginForm.style.display = 'none';
        profileContainer.style.display = 'block';
        window.location.reload();
    } catch (error) {
        errorMessage.textContent = error.message;
        console.error('Login error:', error);
    }
});

// Profile Loader
async function loadProfile() {
    const jwt = localStorage.getItem('jwt')?.replace(/^"|"$/g, '');
    if (!jwt) {
        showLogin();
        return;
    }

    try {
        const response = await fetchData(jwt);
        console.log('API Response:', response);
        
        if (!response.data) {
            throw new Error('No data received from API');
        }

        const user = response.data.user[0] || {};
        const transactions = response.data.transaction || [];
        const progress = response.data.progress || [];
        const audits = response.data.audit || [];

        updateProfileInfo(user, transactions, progress, audits);
        drawCharts(transactions, progress);
        
    } catch (error) {
        errorMessage.textContent = error.message;
        console.error('Profile load error:', error);
        localStorage.removeItem('jwt');
        showLogin();
    }
}

// Data Fetcher
async function fetchData(jwt) {
    const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: `{
                user {
                    id
                    login
                    email
                    firstName
                    lastName
                    campus
                    createdAt
                }
                transaction {
                    amount
                    type
                    createdAt
                }
                progress {
                    grade
                    createdAt
                    objectId
                }
                audit {
                    createdAt
                    grade
                }
            }`
        })
    });

    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0].message);
    return data;
}

// Logout Handler
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('jwt');
    showLogin();
});

// Show Login Form
function showLogin() {
    loginForm.style.display = 'block';
    profileContainer.style.display = 'none';
    errorMessage.textContent = '';
}

// Initialize
function init() {
    if (localStorage.getItem('jwt')) {
        loginForm.style.display = 'none';
        profileContainer.style.display = 'block';
        loadProfile();
    } else {
        showLogin();
    }
}

// Start the application
init();