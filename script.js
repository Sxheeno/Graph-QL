// DOM Elements
const profileContainer = document.getElementById("profile-container");
const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const userXP = document.getElementById("user-xp");
const auditRatio = document.getElementById("audit-ratio");
const successRate = document.getElementById("success-rate");
const logoutBtn = document.getElementById("logout");
const studentName = document.getElementById("student-name");
const userId = document.getElementById("user-id");
const userCampus = document.getElementById("user-campus");
const joinDate = document.getElementById("join-date");

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
        console.log('API Response:', response); // Debug log
        
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

// Update Profile Info
function updateProfileInfo(user, transactions = [], progress = [], audits = []) {
    // Personal Info (unchanged)
    studentName.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.login;
    userId.textContent = user.id || 'N/A';
    userCampus.textContent = user.campus || 'N/A';
    joinDate.textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';

    // Calculate XP in KB - only sum transactions with type 'xp'
    const xpTransactions = transactions.filter(t => t.type === 'xp');
    const totalXP = xpTransactions.length > 0 ? 
        xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / 1024 : 0;
    userXP.textContent = `${totalXP.toFixed(2)} KB`;
    
    // Calculate Audit Ratio - CORRECTED VERSION
    // Sum all 'up' amounts (reviews given)
    const reviewsGiven = transactions
        .filter(t => t.type === 'up')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Sum all 'down' amounts (reviews received)
    const reviewsReceived = transactions
        .filter(t => t.type === 'down')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalReviews = (reviewsGiven + reviewsReceived) / 100; // Assuming amount is percentage (10% per review)
    
    // Count audits - sum XP transactions (audits given) and audit table entries
    const auditsGiven = xpTransactions.length;
    const auditsReceived = audits.length;
    const totalAudits = auditsGiven + auditsReceived;
    
    auditRatio.textContent = totalReviews > 0 ? 
        (reviewsGiven / reviewsReceived).toFixed(2) : 
        totalAudits > 0 ? '∞' : '0.00';
    
    // Calculate Success Rate (unchanged)
    const passed = progress.filter(p => p.grade >= 1).length;
    const totalProgress = progress.length || 1;
    successRate.textContent = `${((passed / totalProgress) * 100).toFixed(1)}%`;
}

// Chart Drawing Functions
function drawCharts(transactions = [], progress = []) {
    drawXPChart(transactions);
    drawProjectChart(progress);
}

function drawXPChart(transactions = []) {
    const svg = document.getElementById('xp-chart');
    svg.innerHTML = '';
    
    // Filter and process only XP transactions, sorted by date
    const xpTransactions = transactions
        .filter(t => t.type === 'xp')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Calculate cumulative XP in KB
    let cumulativeXP = 0;
    const xpData = xpTransactions.map(t => {
        cumulativeXP += (t.amount || 0) / 1024;
        return cumulativeXP;
    });

    if (xpData.length === 0) {
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#666">No XP data available</text>';
        return;
    }

    // Chart dimensions
    const width = svg.clientWidth;
    const height = 250;
    const maxXp = Math.max(...xpData, 1);
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };

    // Create SVG elements
    const svgNS = "http://www.w3.org/2000/svg";
    const chartGroup = document.createElementNS(svgNS, "g");
    chartGroup.setAttribute("transform", `translate(${padding.left},${padding.top})`);

    // Calculate chart dimensions
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Draw smooth area chart
    const area = document.createElementNS(svgNS, "path");
    let areaPath = `M0 ${chartHeight}`;
    
    xpData.forEach((xp, i) => {
        const x = (i * chartWidth) / (xpData.length - 1);
        const y = chartHeight - (xp / maxXp) * chartHeight;
        areaPath += ` L${x} ${y}`;
    });
    
    areaPath += ` L${chartWidth} ${chartHeight} Z`;
    area.setAttribute("d", areaPath);
    area.setAttribute("fill", "rgba(33, 150, 243, 0.2)");
    area.setAttribute("stroke", "none");
    chartGroup.appendChild(area);

    // Draw smooth line
    const line = document.createElementNS(svgNS, "path");
    let linePath = `M0 ${chartHeight}`;
    
    xpData.forEach((xp, i) => {
        const x = (i * chartWidth) / (xpData.length - 1);
        const y = chartHeight - (xp / maxXp) * chartHeight;
        linePath += ` L${x} ${y}`;
    });
    
    line.setAttribute("d", linePath);
    line.setAttribute("stroke", "#2196F3");
    line.setAttribute("fill", "none");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linejoin", "round");
    chartGroup.appendChild(line);

    // Draw axis
    const xAxis = document.createElementNS(svgNS, "path");
    xAxis.setAttribute("d", `M0 ${chartHeight} H${chartWidth}`);
    xAxis.setAttribute("stroke", "#666");
    xAxis.setAttribute("stroke-width", "1");
    chartGroup.appendChild(xAxis);

    const yAxis = document.createElementNS(svgNS, "path");
    yAxis.setAttribute("d", `M0 0 V${chartHeight}`);
    yAxis.setAttribute("stroke", "#666");
    yAxis.setAttribute("stroke-width", "1");
    chartGroup.appendChild(yAxis);

    // Add Y-axis labels
    for (let i = 0; i <= 5; i++) {
        const value = (maxXp / 5) * i;
        const y = chartHeight - (value / maxXp) * chartHeight;
        
        // Tick mark
        const tick = document.createElementNS(svgNS, "path");
        tick.setAttribute("d", `M-5 ${y} H0`);
        tick.setAttribute("stroke", "#666");
        tick.setAttribute("stroke-width", "1");
        chartGroup.appendChild(tick);
        
        // Label
        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", -10);
        label.setAttribute("y", y + 4);
        label.setAttribute("text-anchor", "end");
        label.setAttribute("fill", "#666");
        label.textContent = value.toFixed(1);
        chartGroup.appendChild(label);
    }

    // Add Y-axis title
    const yTitle = document.createElementNS(svgNS, "text");
    yTitle.setAttribute("x", -150);
    yTitle.setAttribute("y", chartHeight / 9);
    yTitle.setAttribute("transform", "rotate(-90)");
    yTitle.setAttribute("fill", "#666");
    yTitle.textContent = "Cumulative XP (KB)";
    chartGroup.appendChild(yTitle);

    svg.appendChild(chartGroup);
}

function drawProjectChart(progress = []) {
    const svg = document.getElementById('project-chart');
    svg.innerHTML = '';
    
    if (progress.length === 0) {
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#666">No project data available</text>';
        return;
    }
    

    const outcomes = progress.reduce((acc, p) => {
        acc[p.grade >= 1 ? 'passed' : 'failed']++;
        return acc;
    }, { passed: 0, failed: 0 });

    const width = svg.clientWidth - 80;
    const height = 250;
    const maxCount = Math.max(outcomes.passed, outcomes.failed, 1);
    const padding = 40;
    const barWidth = 60;
    const gap = 40;

    const svgNS = "http://www.w3.org/2000/svg";
    const chartGroup = document.createElementNS(svgNS, "g");
    chartGroup.setAttribute("transform", `translate(${padding},20)`);

    // Draw bars
    const passedBar = document.createElementNS(svgNS, "rect");
    passedBar.setAttribute("x", width/2 - barWidth - gap/2);
    passedBar.setAttribute("y", height - (outcomes.passed / maxCount) * height);
    passedBar.setAttribute("width", barWidth);
    passedBar.setAttribute("height", (outcomes.passed / maxCount) * height);
    passedBar.setAttribute("fill", "#4CAF50");
    passedBar.setAttribute("rx", "4"); // Rounded corners
    passedBar.setAttribute("ry", "4");
    chartGroup.appendChild(passedBar);

    const failedBar = document.createElementNS(svgNS, "rect");
    failedBar.setAttribute("x", width/2 + gap/2);
    failedBar.setAttribute("y", height - (outcomes.failed / maxCount) * height);
    failedBar.setAttribute("width", barWidth);
    failedBar.setAttribute("height", (outcomes.failed / maxCount) * height);
    failedBar.setAttribute("fill", "#F44336");
    failedBar.setAttribute("rx", "4");
    failedBar.setAttribute("ry", "4");
    chartGroup.appendChild(failedBar);

    // Add value labels
    const passedValue = document.createElementNS(svgNS, "text");
    passedValue.setAttribute("x", width/2 - barWidth/2 - gap/2);
    passedValue.setAttribute("y", height - (outcomes.passed / maxCount) * height - 10);
    passedValue.setAttribute("text-anchor", "middle");
    passedValue.setAttribute("fill", "#4CAF50");
    passedValue.setAttribute("font-weight", "bold");
    passedValue.textContent = outcomes.passed;
    chartGroup.appendChild(passedValue);

    const failedValue = document.createElementNS(svgNS, "text");
    failedValue.setAttribute("x", width/2 + barWidth/2 + gap/2);
    failedValue.setAttribute("y", height - (outcomes.failed / maxCount) * height - 10);
    failedValue.setAttribute("text-anchor", "middle");
    failedValue.setAttribute("fill", "#F44336");
    failedValue.setAttribute("font-weight", "bold");
    failedValue.textContent = outcomes.failed;
    chartGroup.appendChild(failedValue);

    // Add category labels
    const passedLabel = document.createElementNS(svgNS, "text");
    passedLabel.setAttribute("x", width/2 - barWidth/2 - gap/2);
    passedLabel.setAttribute("y", height + 30);
    passedLabel.setAttribute("text-anchor", "middle");
    passedLabel.setAttribute("fill", "#666");
    passedLabel.textContent = "Passed";
    chartGroup.appendChild(passedLabel);

    const failedLabel = document.createElementNS(svgNS, "text");
    failedLabel.setAttribute("x", width/2 + barWidth/2 + gap/2);
    failedLabel.setAttribute("y", height + 30);
    failedLabel.setAttribute("text-anchor", "middle");
    failedLabel.setAttribute("fill", "#666");
    failedLabel.textContent = "Failed";
    chartGroup.appendChild(failedLabel);

    // Draw axis
    const axis = document.createElementNS(svgNS, "path");
    axis.setAttribute("d", `M0 ${height} H${width}`);
    axis.setAttribute("stroke", "#666");
    axis.setAttribute("stroke-width", "1");
    chartGroup.appendChild(axis);

    svg.appendChild(chartGroup);
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