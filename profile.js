// DOM Elements
const userXP = document.getElementById("user-xp");
const auditRatio = document.getElementById("audit-ratio");
const successRate = document.getElementById("success-rate");
const studentName = document.getElementById("student-name");
const userId = document.getElementById("user-id");
const userCampus = document.getElementById("user-campus");
const joinDate = document.getElementById("join-date");

// Update Profile Info
function updateProfileInfo(user, transactions = [], progress = [], audits = []) {
    // Personal Info
    studentName.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.login;
    userId.textContent = user.id || 'N/A';
    userCampus.textContent = user.campus || 'N/A';
    joinDate.textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';

    // Calculate XP in KB
    const xpTransactions = transactions.filter(t => t.type === 'xp');
    const totalXP = xpTransactions.length > 0 ? 
        xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / 1024 : 0;
    userXP.textContent = `${totalXP.toFixed(2)} KB`;
    
    // Calculate Audit Ratio
    const reviewsGiven = transactions
        .filter(t => t.type === 'up')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const reviewsReceived = transactions
        .filter(t => t.type === 'down')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalReviews = (reviewsGiven + reviewsReceived) / 100;
    
    const auditsGiven = xpTransactions.length;
    const auditsReceived = audits.length;
    const totalAudits = auditsGiven + auditsReceived;
    
    auditRatio.textContent = totalReviews > 0 ? 
        (reviewsGiven / reviewsReceived).toFixed(2) : 
        totalAudits > 0 ? '∞' : '0.00';
    
    // Calculate Success Rate
    const passed = progress.filter(p => p.grade >= 1).length;
    const totalProgress = progress.length || 1;
    successRate.textContent = `${((passed / totalProgress) * 100).toFixed(1)}%`;
}

// Chart Drawing Functions
function drawCharts(transactions = [], progress = []) {
    drawXPChart(transactions);
    
    const reviewsGiven = transactions.filter(t => t.type === 'up')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    const reviewsReceived = transactions.filter(t => t.type === 'down')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    drawProjectChart(reviewsGiven, reviewsReceived);
}

function drawXPChart(transactions = []) {
    const svg = document.getElementById('xp-chart');
    svg.innerHTML = '';
    
    const xpTransactions = transactions
        .filter(t => t.type === 'xp')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    let cumulativeXP = 0;
    const xpData = xpTransactions.map(t => {
        cumulativeXP += (t.amount || 0) / 1024;
        return cumulativeXP;
    });

    if (xpData.length === 0) {
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#666">No XP data available</text>';
        return;
    }

    const width = svg.clientWidth;
    const height = 250;
    const maxXp = Math.max(...xpData, 1);
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };

    const svgNS = "http://www.w3.org/2000/svg";
    const chartGroup = document.createElementNS(svgNS, "g");
    chartGroup.setAttribute("transform", `translate(${padding.left},${padding.top})`);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

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

    for (let i = 0; i <= 5; i++) {
        const value = (maxXp / 5) * i;
        const y = chartHeight - (value / maxXp) * chartHeight;
        
        const tick = document.createElementNS(svgNS, "path");
        tick.setAttribute("d", `M-5 ${y} H0`);
        tick.setAttribute("stroke", "#666");
        tick.setAttribute("stroke-width", "1");
        chartGroup.appendChild(tick);
        
        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", -10);
        label.setAttribute("y", y + 4);
        label.setAttribute("text-anchor", "end");
        label.setAttribute("fill", "#666");
        label.textContent = value.toFixed(1);
        chartGroup.appendChild(label);
    }

    const yTitle = document.createElementNS(svgNS, "text");
    yTitle.setAttribute("x", -150);
    yTitle.setAttribute("y", chartHeight / 9);
    yTitle.setAttribute("transform", "rotate(-90)");
    yTitle.setAttribute("fill", "#666");
    yTitle.textContent = "Cumulative XP (KB)";
    chartGroup.appendChild(yTitle);

    svg.appendChild(chartGroup);
}

function drawProjectChart(reviewsGiven = 0, reviewsReceived = 0) {
    const svg = document.getElementById('project-chart');
    svg.innerHTML = '';
    
    const givenKB = (reviewsGiven || 0) / 100;
    const receivedKB = (reviewsReceived || 0) / 100;

    if (givenKB === 0 && receivedKB === 0) {
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#666">No audit data available</text>';
        return;
    }

    const width = svg.clientWidth - 80;
    const height = 250;
    const maxCount = Math.max(givenKB, receivedKB, 1);
    const padding = 40;
    const barWidth = 60;
    const gap = 40;

    const svgNS = "http://www.w3.org/2000/svg";
    const chartGroup = document.createElementNS(svgNS, "g");
    chartGroup.setAttribute("transform", `translate(${padding},20)`);

    const givenBar = document.createElementNS(svgNS, "rect");
    givenBar.setAttribute("x", width/2 - barWidth - gap/2);
    givenBar.setAttribute("y", height - (givenKB / maxCount) * height);
    givenBar.setAttribute("width", barWidth);
    givenBar.setAttribute("height", (givenKB / maxCount) * height);
    givenBar.setAttribute("fill", "#4CAF50");
    givenBar.setAttribute("rx", "4");
    chartGroup.appendChild(givenBar);

    const receivedBar = document.createElementNS(svgNS, "rect");
    receivedBar.setAttribute("x", width/2 + gap/2);
    receivedBar.setAttribute("y", height - (receivedKB / maxCount) * height);
    receivedBar.setAttribute("width", barWidth);
    receivedBar.setAttribute("height", (receivedKB / maxCount) * height);
    receivedBar.setAttribute("fill", "#2196F3");
    receivedBar.setAttribute("rx", "4");
    chartGroup.appendChild(receivedBar);

    const givenValue = document.createElementNS(svgNS, "text");
    givenValue.setAttribute("x", width/2 - barWidth/2 - gap/2);
    givenValue.setAttribute("y", height - (givenKB / maxCount) * height - 10);
    givenValue.setAttribute("text-anchor", "middle");
    givenValue.setAttribute("fill", "#4CAF50");
    givenValue.setAttribute("font-weight", "bold");
    givenValue.textContent = `${givenKB.toFixed(2)} KB`;
    chartGroup.appendChild(givenValue);

    const receivedValue = document.createElementNS(svgNS, "text");
    receivedValue.setAttribute("x", width/2 + barWidth/2 + gap/2);
    receivedValue.setAttribute("y", height - (receivedKB / maxCount) * height - 10);
    receivedValue.setAttribute("text-anchor", "middle");
    receivedValue.setAttribute("fill", "#2196F3");
    receivedValue.setAttribute("font-weight", "bold");
    receivedValue.textContent = `${receivedKB.toFixed(2)} KB`;
    chartGroup.appendChild(receivedValue);

    const givenLabel = document.createElementNS(svgNS, "text");
    givenLabel.setAttribute("x", width/2 - barWidth/2 - gap/2);
    givenLabel.setAttribute("y", height + 30);
    givenLabel.setAttribute("text-anchor", "middle");
    givenLabel.setAttribute("fill", "#666");
    givenLabel.textContent = "Audits Given";
    chartGroup.appendChild(givenLabel);

    const receivedLabel = document.createElementNS(svgNS, "text");
    receivedLabel.setAttribute("x", width/2 + barWidth/2 + gap/2);
    receivedLabel.setAttribute("y", height + 30);
    receivedLabel.setAttribute("text-anchor", "middle");
    receivedLabel.setAttribute("fill", "#666");
    receivedLabel.textContent = "XP Received";
    chartGroup.appendChild(receivedLabel);

    const axis = document.createElementNS(svgNS, "path");
    axis.setAttribute("d", `M0 ${height} H${width}`);
    axis.setAttribute("stroke", "#666");
    axis.setAttribute("stroke-width", "1");
    chartGroup.appendChild(axis);

    svg.appendChild(chartGroup);
}