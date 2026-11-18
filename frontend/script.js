const API_URL = "https://mplads-ai-monitor-api.onrender.com";

// Load dashboard statistics
async function loadDashboard() {

    try {

        const response = await fetch(`${API_URL}/dashboard/stats`);

        if (!response.ok) {
            throw new Error("Failed to fetch dashboard data");
        }

        const data = await response.json();

        document.getElementById("totalProjects").textContent =
            data.total_projects;

        document.getElementById("totalBudget").textContent =
            "₹" + data.total_allocated_budget.toLocaleString("en-IN");

        document.getElementById("totalExpenditure").textContent =
            "₹" + data.total_expenditure.toLocaleString("en-IN");

        document.getElementById("averageProgress").textContent =
            data.average_progress + "%";

    }

    catch (error) {

        console.error("Dashboard Error:", error);

        document.getElementById("totalProjects").textContent = "Error";
        document.getElementById("totalBudget").textContent = "Error";
        document.getElementById("totalExpenditure").textContent = "Error";
        document.getElementById("averageProgress").textContent = "Error";

    }
}



// Load all projects into the dashboard table


let allProjects = [];
let allRiskData = [];

async function loadProjects() {
    try {
        const [projectsResponse, riskResponse] = await Promise.all([
            fetch(`${API_URL}/projects`),
            fetch(`${API_URL}/risk-analysis`)
        ]);

        if (!projectsResponse.ok || !riskResponse.ok) {
            throw new Error("Failed to fetch project data");
        }

        allProjects = await projectsResponse.json();

        const riskData = await riskResponse.json();
        allRiskData = riskData.risk_analysis;

        displayFilteredProjects();

    } catch (error) {
        console.error("Projects Error:", error);

        document.getElementById("projectsTable").innerHTML =
            `<tr><td colspan="10">Unable to load project data</td></tr>`;
    }
}

// Display projects according to selected filters

function displayFilteredProjects() {
    const searchText = document
        .getElementById("projectSearch").value.toLowerCase();


    const selectedStatus =
        document.getElementById("statusFilter").value;

    const filteredProjects = allProjects.filter(project => {

        const matchesSearch =
            project.project_id.toLowerCase().includes(searchText) ||
            project.project_name.toLowerCase().includes(searchText) ||
            project.district.toLowerCase().includes(searchText);

        const matchesStatus =
            selectedStatus === "all" ||
            project.status.toLowerCase() === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    const table = document.getElementById("projectsTable");
    table.innerHTML = "";

    if (filteredProjects.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7">No matching projects found.</td>
            </tr>
        `;
        return;
    }

    filteredProjects.forEach(project => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${project.project_id}</td>
            <td>${project.project_name}</td>
            <td>${project.district}</td>
            <td>₹${Number(project.allocated_budget).toLocaleString("en-IN")}</td>
            <td>₹${Number(project.expenditure).toLocaleString("en-IN")}</td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill"
                             style="width: ${project.progress}%"></div>
                    </div>
                    <span>${project.progress}%</span>
                </div>
            </td>
            <td>
                <span class="status ${project.status.toLowerCase()}">
                    ${project.status}
                </span>
            </td>
            <td>
                ${sessionStorage.getItem("user_role") === "admin" ? `

    <button class="edit-project-btn"
        onclick="editProject('${project.project_id}')">
        Edit
    </button>

    <button class="delete-project-btn"
        onclick="deleteProject('${project.project_id}')">
        Delete
    </button>

` : ""}
            </td>
        `;

        table.appendChild(row);
    });
}

// Load dashboard and projects
loadDashboard();
loadProjects();

// Search and filter event listeners

document.getElementById("projectSearch").addEventListener("input", function () {
    displayFilteredProjects();
});

document.getElementById("statusFilter").addEventListener("change", function () {
    displayFilteredProjects();
});

// Load district-wise statistics
async function loadDistrictCharts() {

    try {

        const response = await fetch(`${API_URL}/dashboard/district-stats`);

        if (!response.ok) {
            throw new Error("Failed to fetch district statistics");
        }

        const districts = await response.json();

        const districtLabels = districts.map(item => item.district);
        const projectCounts = districts.map(item => item.total_projects);
        const budgets = districts.map(item => item.total_budget);

        // Projects by district chart
        new Chart(document.getElementById("districtChart"), {
            type: "bar",
            data: {
                labels: districtLabels,
                datasets: [{
                    label: "Number of Projects",
                    data: projectCounts,
                    backgroundColor: "#7655d8"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        // Budget by district chart
        new Chart(document.getElementById("budgetChart"), {
            type: "bar",
            data: {
                labels: districtLabels,
                datasets: [{
                    label: "Allocated Budget (₹)",
                    data: budgets,
                    backgroundColor: "#39a98a"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

    }

    catch (error) {

        console.error("District Chart Error:", error);

    }
}

// Load district charts
loadDistrictCharts();


// Load anomaly statistics
async function loadAnomalies() {

    try {

        const response = await fetch(`${API_URL}/anomalies`);

        if (!response.ok) {
            throw new Error("Failed to fetch anomaly data");
        }

        const data = await response.json();

        let budgetCount = 0;
        let delayCount = 0;
        let progressCount = 0;

        data.anomaly_details.forEach(project => {

            project.anomalies.forEach(anomaly => {

                if (anomaly.type === "Budget Overrun") {
                    budgetCount++;
                }

                if (anomaly.type === "Project Delay") {
                    delayCount++;
                }

                if (anomaly.type === "Progress Mismatch") {
                    progressCount++;
                }

            });

        });

        document.getElementById("anomalyTotal").textContent =
            data.projects_with_anomalies;

        document.getElementById("budgetAnomalies").textContent =
            budgetCount;

        document.getElementById("delayAnomalies").textContent =
            delayCount;

        document.getElementById("progressAnomalies").textContent =
            progressCount;
        // Display project-wise anomaly details
const anomalyBody = document.getElementById("anomalyDetailsBody");

anomalyBody.innerHTML = "";

if (data.anomaly_details.length === 0) {

    anomalyBody.innerHTML = `
        <tr>
            <td colspan="6">No anomalies detected.</td>
        </tr>
    `;

} else {

    data.anomaly_details.forEach(project => {

        const anomalyTypes = project.anomalies
            .map(anomaly => anomaly.type)
            .join(", ");

        const anomalyMessages = project.anomalies
            .map(anomaly => anomaly.message)
            .join(" | ");

        const row = document.createElement("tr");

        [
            project.project_id,
            project.project_name,
            project.district,
            project.anomaly_count,
            anomalyTypes,
            anomalyMessages
        ].forEach(value => {

            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);

        });

        anomalyBody.appendChild(row);

    });

}

    }

    catch (error) {

        console.error("Anomaly Error:", error);

        document.getElementById("anomalyTotal").textContent = "Error";
        document.getElementById("budgetAnomalies").textContent = "Error";
        document.getElementById("delayAnomalies").textContent = "Error";
        document.getElementById("progressAnomalies").textContent = "Error";

    }
}

// Load anomaly data
loadAnomalies();



// Load project risk analysis
async function loadRiskAnalysis() {
    try {
        const response = await fetch(`${API_URL}/risk-analysis`);

        if (!response.ok) {
            throw new Error("Failed to fetch risk analysis");
        }

        const data = await response.json();
        const table = document.getElementById("riskTable");

        table.innerHTML = "";

        data.risk_analysis.forEach(project => {
            const row = document.createElement("tr");

            const reasons = project.risk_reasons.length > 0
                ? project.risk_reasons.join(", ")
                : "No risk factors detected";

            row.innerHTML = `
                <td>${project.project_id}</td>
                <td>${project.project_name}</td>
                <td>${project.district}</td>
                <td><strong>${project.risk_score}/100</strong></td>
                <td>
                    <span class="risk-badge ${project.risk_level.toLowerCase()}">
                        ${project.risk_level}
                    </span>
                </td>
                <td>${reasons}</td>
            `;

            table.appendChild(row);
        });

    } catch (error) {
        console.error("Risk Analysis Error:", error);

        document.getElementById("riskTable").innerHTML =
            `<tr><td colspan="6">Unable to load risk analysis</td></tr>`;
    }
}

// Call the function
// loadRiskAnalysis();
// Risk Analysis is loaded separately


// Load projects requiring attention

// Load projects requiring attention
async function loadRiskAlerts() {
    try {
        const response = await fetch(`${API_URL}/risk-alerts`);

        if (!response.ok) {
            throw new Error("Failed to fetch risk alerts");
        }

        const data = await response.json();
        const table = document.getElementById("alertsTable");

        table.innerHTML = "";

        if (data.alerts.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="5">No projects currently require attention.</td>
                </tr>
            `;
            return;
        }

        data.alerts.forEach(alert => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${alert.project_id}</td>
                <td>${alert.project_name}</td>
                <td>${alert.district}</td>
                <td><strong>${alert.risk_score}/100</strong></td>
                <td>
                    <span class="risk-badge ${alert.risk_level.toLowerCase()}">
                        ${alert.risk_level}
                    </span>
                </td>
            `;

            table.appendChild(row);
        });

    } catch (error) {
        console.error("Risk Alerts Error:", error);

        document.getElementById("alertsTable").innerHTML =
            `<tr><td colspan="5">Unable to load risk alerts</td></tr>`;
    }
}


// Load complete Risk Analysis data

async function loadRiskAnalysis() {

    try {

        const response = await fetch(`${API_URL}/risk-analysis`);

        if (!response.ok) {
            throw new Error("Failed to fetch risk analysis");
        }

        const data = await response.json();

        const table = document.getElementById("riskAnalysisTable");

        table.innerHTML = "";

        data.risk_analysis.forEach(item => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${item.project_id}</td>
                <td>${item.project_name}</td>
                <td>${item.district}</td>
                <td>${item.risk_score}</td>
                <td>
                    <span class="risk-badge ${item.risk_level.toLowerCase()}">
                        ${item.risk_level}
                    </span>
                </td>
                <td>${item.risk_reasons.join(", ") || "No risk indicators"}</td>
            `;

            table.appendChild(row);

        });

    } catch (error) {

        console.error("Risk Analysis Error:", error);

        document.getElementById("riskAnalysisTable").innerHTML =
            `<tr><td colspan="6">Unable to load risk analysis.</td></tr>`;

    }

}

// Call the function
loadRiskAlerts();


// Load evidence summary and uploaded photographs
async function loadEvidence() {
    try {
        const [evidenceResponse, missingResponse] = await Promise.all([
            fetch(`${API_URL}/all-evidence`),
            fetch(`${API_URL}/projects-without-evidence`)
        ]);

        if (!evidenceResponse.ok || !missingResponse.ok) {
            throw new Error("Failed to fetch evidence data");
        }

        const evidenceData = await evidenceResponse.json();
        const missingData = await missingResponse.json();

        document.getElementById("totalEvidence").textContent =
            evidenceData.total_evidence;

        document.getElementById("missingEvidence").textContent =
            missingData.total_projects_without_evidence;

        const table = document.getElementById("evidenceTable");
        table.innerHTML = "";

        if (evidenceData.evidence.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="5">No evidence uploaded yet.</td>
                </tr>
            `;
            return;
        }

        evidenceData.evidence.forEach(item => {
            const row = document.createElement("tr");

            const imageUrl =
                `${API_URL}/uploads/${encodeURIComponent(item.filename)}`;

            row.innerHTML = `
                <td>${item.project_id}</td>
                <td>${item.filename}</td>
                <td>${item.upload_date}</td>
                <td>
                    <span class="evidence-status">
                        ${item.verification_status}
                    </span>

                    ${
    item.verification_status !== "Verified" &&
    ["admin", "reviewer"].includes(sessionStorage.getItem("user_role"))
    ? `<button class="verify-btn"
        onclick="verifyEvidence(${item.evidence_id})">
        Verify
    </button>`
    : ""
}
                </td>
                <td>
                    <a href="${imageUrl}" target="_blank" rel="noopener noreferrer">
                        View Photo
                    </a>
                </td>
            `;

            table.appendChild(row);
        });

    } catch (error) {
        console.error("Evidence Error:", error);

        document.getElementById("totalEvidence").textContent = "Error";
        document.getElementById("missingEvidence").textContent = "Error";

        document.getElementById("evidenceTable").innerHTML =
            `<tr><td colspan="5">Unable to load evidence</td></tr>`;
    }
}

// Load evidence when dashboard opens
loadEvidence();



// Load projects into the evidence upload dropdown
async function loadEvidenceProjects() {
    try {
        const response = await fetch(`${API_URL}/projects`);

        if (!response.ok) {
            throw new Error("Failed to load projects");
        }

        const projects = await response.json();
        const dropdown = document.getElementById("evidenceProject");

        projects.forEach(project => {
            const option = document.createElement("option");

            // Use the database ID because the upload API expects it
            option.value = project.id;
            option.textContent =
                `${project.project_id} - ${project.project_name}`;

            dropdown.appendChild(option);
        });

    } catch (error) {
        console.error("Project Dropdown Error:", error);
    }
}

// Load project options when dashboard opens
loadEvidenceProjects();
loadRiskAnalysis();

// Upload project evidence
document.getElementById("uploadEvidenceBtn").addEventListener("click", async function () {

    const projectId = document.getElementById("evidenceProject").value;
    const fileInput = document.getElementById("evidenceFile");
    const message = document.getElementById("uploadMessage");

    if (!projectId) {
        message.textContent = "Please select a project.";
        return;
    }

    if (!fileInput.files.length) {
        message.textContent = "Please choose a photograph.";
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        message.textContent = "Uploading photograph...";

        const token = sessionStorage.getItem("access_token");

const response = await fetch(
    `${API_URL}/upload-evidence/${projectId}`,
    {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData
    }
);

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Upload failed");
        }

        message.textContent = "Evidence uploaded successfully!";

        // Clear the form
        fileInput.value = "";
        document.getElementById("evidenceProject").value = "";

        // Refresh evidence table and summary
        await loadEvidence();

    } catch (error) {
        console.error("Upload Error:", error);
        message.textContent = error.message;
    }
});



// Verify uploaded evidence
async function verifyEvidence(evidenceId) {
    try {
        const token = sessionStorage.getItem("access_token");

const response = await fetch(
    `${API_URL}/verify-evidence/${evidenceId}`,
    {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    }
);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Verification failed");
        }

        alert("Evidence verified successfully!");

        // Refresh the evidence table
        await loadEvidence();

    } catch (error) {
        console.error("Verification Error:", error);
        alert(error.message);
    }
}


// Clear all project filters
document.getElementById("clearFilters").addEventListener("click", function () {
    document.getElementById("projectSearch").value = "";
    document.getElementById("statusFilter").value = "all";

    displayFilteredProjects();
});

// SIDEBAR PAGE NAVIGATION

const navigationButtons = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

const pageTitles = {
    dashboard: "Dashboard Overview",
    projects: "Project Management",
    anomalies: "Anomaly Detection",
    risk: "Risk Analysis",
    alerts: "Risk Alerts",
    evidence: "Photo & Evidence Verification"
};

// Navigation with saved last visited page

const savedPage = localStorage.getItem("activePage");

function showPage(pageName) {

    pages.forEach(page => {
        page.classList.remove("active");
    });

    const targetPage = document.getElementById("page-" + pageName);

    if (targetPage) {
        targetPage.classList.add("active");
    }

    navigationButtons.forEach(nav => {
        nav.classList.remove("active");
    });

    const activeButton = document.querySelector(
        `.nav-item[data-page="${pageName}"]`
    );

    if (activeButton) {
        activeButton.classList.add("active");
    }

    document.getElementById("pageTitle").textContent =
        pageTitles[pageName];

    localStorage.setItem("activePage", pageName);
}

navigationButtons.forEach(button => {
    button.addEventListener("click", function () {
        showPage(this.dataset.page);
    });
});

// Restore the last visited page after refresh
showPage(
    savedPage && document.getElementById("page-" + savedPage)
        ? savedPage
        : "dashboard"
);
// Open Add Project Form
document.getElementById("addProjectBtn").addEventListener("click", function () {
    document.getElementById("addProjectForm").hidden = false;
});

// Close Add Project Form
document.getElementById("cancelProjectBtn").addEventListener("click", function () {
    document.getElementById("addProjectForm").hidden = true;
});


// Save New Project
document.getElementById("newProjectForm").addEventListener("submit", async function (event) {

    event.preventDefault();

    const projectData = {
        project_id: document.getElementById("newProjectId").value.trim(),
        project_name: document.getElementById("newProjectName").value.trim(),
        district: document.getElementById("newDistrict").value.trim(),
        allocated_budget: Number(document.getElementById("newBudget").value),
        expenditure: Number(document.getElementById("newExpenditure").value),
        start_date: document.getElementById("newStartDate").value,
        deadline: document.getElementById("newDeadline").value,
        progress: Number(document.getElementById("newProgress").value),
        status: document.getElementById("newStatus").value
    };

    // Validate project dates
if (projectData.deadline < projectData.start_date) {
    alert("Deadline cannot be earlier than the start date.");
    return;
}

// Validate budget and expenditure
if (projectData.allocated_budget < 0 || projectData.expenditure < 0) {
    alert("Budget and expenditure cannot be negative.");
    return;
}
// Validate progress
if (projectData.progress < 0 || projectData.progress > 100) {
    alert("Progress must be between 0 and 100.");
    return;
}
    try {
        const response = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionStorage.getItem("access_token")}`
    },
    body: JSON.stringify(projectData)
});
        const result = await response.json();

        if (!response.ok) {
    const errorMessage = Array.isArray(result.detail)
        ? result.detail.map(error => error.msg).join("\n")
        : result.detail || "Unable to save project";

    throw new Error(errorMessage);
}

        alert("Project added successfully!");

        // Reset and close form
        this.reset();
        document.getElementById("addProjectForm").hidden = true;

        // Refresh project information
        loadProjects();
        loadDashboard();
        loadAnomalies();
        loadRiskAnalysis();
        loadRiskAlerts();

    } catch (error) {
        alert("Error: " + error.message);
        console.error("Add Project Error:", error);
    }
});


// Open Edit Project Form
async function editProject(projectId) {

    try {
        const response = await fetch(
            `${API_URL}/projects/${projectId}`
        );

        if (!response.ok) {
            throw new Error("Unable to fetch project details");
        }

        const project = await response.json();

        // Fill the form with existing project details
        document.getElementById("editProjectId").value = project.project_id;
        document.getElementById("editProjectIdDisplay").value = project.project_id;
        document.getElementById("editProjectName").value = project.project_name;
        document.getElementById("editDistrict").value = project.district;
        document.getElementById("editBudget").value = project.allocated_budget;
        document.getElementById("editExpenditure").value = project.expenditure;
        document.getElementById("editStartDate").value = project.start_date;
        document.getElementById("editDeadline").value = project.deadline;
        document.getElementById("editProgress").value = project.progress;
        document.getElementById("editStatus").value = project.status;

        // Show edit form
        document.getElementById("addProjectForm").hidden = true;
        document.getElementById("editProjectForm").hidden = false;

        document.getElementById("editProjectForm").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        alert(error.message);
        console.error("Edit Project Error:", error);
    }
}

// Update Project
document.getElementById("updateProjectForm").addEventListener("submit", async function (event) {

    event.preventDefault();

    const projectId = document.getElementById("editProjectId").value;

    const updatedData = {
        project_name: document.getElementById("editProjectName").value.trim(),
        district: document.getElementById("editDistrict").value.trim(),
        allocated_budget: Number(document.getElementById("editBudget").value),
        expenditure: Number(document.getElementById("editExpenditure").value),
        start_date: document.getElementById("editStartDate").value,
        deadline: document.getElementById("editDeadline").value,
        progress: Number(document.getElementById("editProgress").value),
        status: document.getElementById("editStatus").value
    };

    if (updatedData.deadline < updatedData.start_date) {
    alert("Deadline cannot be earlier than the start date.");
    return;
}

// Validate budget and expenditure
if (updatedData.allocated_budget < 0 || updatedData.expenditure < 0) {
    alert("Budget and expenditure cannot be negative.");
    return;
}
// Validate progress
if (updatedData.progress < 0 || updatedData.progress > 100) {
    alert("Progress must be between 0 and 100.");
    return;
}

    try {
        const response = await fetch(
            `${API_URL}/projects/${projectId}`,
            {
                method: "PUT",
                headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${sessionStorage.getItem("access_token")}`
},
                body: JSON.stringify(updatedData)
            }
        );

        const result = await response.json();

        if (!response.ok) {
    const errorMessage = Array.isArray(result.detail)
        ? result.detail.map(error => error.msg).join("\n")
        : result.detail || "Unable to update project";

    throw new Error(errorMessage);
}

        alert("Project updated successfully!");

        document.getElementById("updateProjectForm").reset();
        document.getElementById("editProjectForm").hidden = true;

        loadProjects();
        loadDashboard();
        loadAnomalies();
        loadRiskAnalysis();
        loadRiskAlerts();

    } catch (error) {
        alert("Error: " + error.message);
        console.error("Update Project Error:", error);
    }
});

// Cancel Edit
document.getElementById("cancelEditBtn").addEventListener("click", function () {
    document.getElementById("updateProjectForm").reset();
    document.getElementById("editProjectForm").hidden = true;
});

async function deleteProject(projectId) {

    const confirmDelete = confirm(
        `Are you sure you want to delete project ${projectId}?`
    );

    if (!confirmDelete) {
        return;
    }

    try {
    const response = await fetch(
    `${API_URL}/projects/${projectId}`,
    {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("access_token")}`
        }
    }
);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Unable to delete project");
        }

        alert("Project deleted successfully!");

        loadProjects();
        loadDashboard();
        loadAnomalies();
        loadRiskAnalysis();
        loadRiskAlerts();
        loadDistrictCharts();

    } catch (error) {
        alert("Error: " + error.message);
        console.error("Delete Project Error:", error);
    }
}

// Handle User Login
document.getElementById("loginForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");

    try {

        const response = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.detail || "Login failed";
            return;
        }

        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("user_role", data.role);
        sessionStorage.setItem("username", username);

        message.textContent = "Login successful!";
        // Update account controls after login

document.getElementById("loginButton").style.display = "none";

document.getElementById("logoutButton").style.display = "block";

document.getElementById("userStatus").textContent =
    username + " (" + data.role + ")";
    applyRolePermissions(data.role);
    loadProjects();
loadEvidence();

        document.getElementById("loginSection").style.display = "none";
        showPage("dashboard");
    } catch (error) {

        message.textContent = "Unable to connect to the server.";

        console.error(error);

    }

});

// Open Login Page
document.getElementById("loginButton").addEventListener("click", function() {

    document.getElementById("loginSection").style.display = "flex";

});

// Handle User Logout
document.getElementById("logoutButton").addEventListener("click", function() {

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user_role");
    sessionStorage.removeItem("username");

    document.getElementById("loginButton").style.display = "block";
    document.getElementById("logoutButton").style.display = "none";

    document.getElementById("userStatus").textContent = "Public Viewer";
    applyRolePermissions("public");
    
    loadProjects();
loadDashboard();
loadAnomalies();
loadRiskAnalysis();
loadRiskAlerts();
loadEvidence();

    alert("You have been logged out successfully.");

});

// Restore Login Session When Page Loads

const savedToken = sessionStorage.getItem("access_token");
const savedRole = sessionStorage.getItem("user_role");
const savedUsername = sessionStorage.getItem("username");

if (savedToken && savedRole && savedUsername) {

    document.getElementById("loginButton").style.display = "none";

    document.getElementById("logoutButton").style.display = "block";

    document.getElementById("userStatus").textContent =
        savedUsername + " (" + savedRole + ")";
        applyRolePermissions(savedRole);

} else {

    document.getElementById("loginButton").style.display = "block";

    document.getElementById("logoutButton").style.display = "none";

    document.getElementById("userStatus").textContent = "Public Viewer";
    applyRolePermissions("public");

}
// Load public dashboard data when the page opens
loadProjects();
loadDashboard();
loadAnomalies();
loadRiskAnalysis();
loadRiskAlerts();
loadEvidence();
// Control visibility according to user role
// Control visibility according to user role
function applyRolePermissions(role) {

    // Admin-only elements
    const adminElements = document.querySelectorAll(
        '[data-role="admin"]'
    );

    adminElements.forEach(element => {
        element.style.display =
            role === "admin" ? "" : "none";
    });


    // Admin and Reviewer elements
    const staffElements = document.querySelectorAll(
        '[data-role="staff"]'
    );

    staffElements.forEach(element => {
        element.style.display =
            ["admin", "reviewer"].includes(role) ? "" : "none";
    });

}