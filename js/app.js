// Main App Module
const App = {
    async init() {
        this.cacheDOM();
        this.bindEvents();
        this.checkAuth();
        await Storage.autoCleanup(); // Cleanup old sessions
        await this.renderAll();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    },

    cacheDOM() {
        // Navigation
        this.navItems = document.querySelectorAll('.nav-item');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.themeToggle = document.getElementById('theme-toggle');

        // Modals
        this.modalEmployee = document.getElementById('modal-employee');
        this.modalCheckIn = document.getElementById('modal-check-in');
        this.closeModalBtns = document.querySelectorAll('.close-modal');

        // Forms
        this.employeeForm = document.getElementById('employee-form');
        this.checkInForm = document.getElementById('check-in-form');

        // Lists/Tables
        this.employeeListBody = document.getElementById('employee-list-body');
        this.logsListBody = document.getElementById('logs-list-body');
        this.recentActivityList = document.getElementById('recent-activity-list');

        // Stats
        this.statTotal = document.getElementById('stat-total-employees');
        this.statPresent = document.getElementById('stat-present-today');
        this.statAbsent = document.getElementById('stat-absent-today');
        this.statPayroll = document.getElementById('stat-total-payroll');

        // Date/Time
        this.dateEl = document.getElementById('current-date');
        this.timeEl = document.getElementById('current-time');

        // Buttons
        this.btnAddEmployee = document.getElementById('btn-add-employee');
        this.btnQuickCheck = document.getElementById('btn-check-in-out');
        this.btnCheckIn = document.getElementById('btn-check-in');
        this.btnCheckOut = document.getElementById('btn-check-out');

        // Check-in fields
        this.checkInSelect = document.getElementById('check-in-employee');
        this.statusPreview = document.getElementById('current-status-preview');

        // Progress elements
        this.progressContainer = document.getElementById('shift-progress-container');
        this.progressBar = document.getElementById('shift-progress-bar');
        this.progressText = document.getElementById('shift-progress-text');
        this.progressDuration = document.getElementById('shift-duration-spent');

        // Login elements
        this.modalLogin = document.getElementById('modal-login');
        this.modalEditLog = document.getElementById('modal-edit-log');
        this.modalDept = document.getElementById('modal-dept');
        this.adminLoginBtn = document.getElementById('admin-login-btn');
        this.adminLogoutBtn = document.getElementById('admin-logout-btn');
        this.pinInput = document.getElementById('admin-pin');
        this.loginSubmitBtn = document.getElementById('btn-submit-login');
        this.loginError = document.getElementById('login-error');

        // Department elements
        this.btnAddDept = document.getElementById('btn-add-dept');
        this.deptForm = document.getElementById('dept-form');
        this.deptListBody = document.getElementById('dept-list-body');
    },

    bindEvents() {
        // Tab switching
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Admin Auth
        this.adminLoginBtn.addEventListener('click', () => this.showModal('login'));
        this.adminLogoutBtn.addEventListener('click', () => this.handleLogout());
        this.loginSubmitBtn.addEventListener('click', () => this.handleLogin());
        this.pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Departments
        this.btnAddDept.addEventListener('click', () => this.showModal('department'));
        this.deptForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDeptSubmit();
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Modals
        this.btnAddEmployee.addEventListener('click', () => this.showModal('employee'));
        this.btnQuickCheck.addEventListener('click', () => this.showModal('check-in'));
        this.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.hideModals());
        });

        // Employee Form Submit
        this.employeeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmployeeSubmit();
        });

        // Check-in logic
        this.checkInSelect.addEventListener('change', () => this.updateCheckInStatus());
        this.btnCheckIn.addEventListener('click', () => this.handleCheckIn());
        this.btnCheckOut.addEventListener('click', () => this.handleCheckOut());

        // Edit Log Form Submit
        document.getElementById('edit-log-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditLogSubmit();
        });
    },

    switchTab(tabId) {
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabId);
        });
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    },

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
        const icon = document.getElementById('theme-icon');
        const text = document.getElementById('theme-text');

        if (document.body.classList.contains('light-mode')) {
            icon.setAttribute('data-lucide', 'sun');
            text.innerText = 'Light Mode';
        } else {
            icon.setAttribute('data-lucide', 'moon');
            text.innerText = 'Dark Mode';
        }
        lucide.createIcons();
    },

    async showModal(type, data = null) {
        if (type === 'employee') {
            await this.populateDeptSelect();
            this.modalEmployee.classList.add('active');
            if (data) {
                document.getElementById('modal-title').innerText = 'Edit Employee';
                document.getElementById('edit-id').value = data.id;
                document.getElementById('emp-name').value = data.name;
                document.getElementById('emp-dept').value = data.dept;
                document.getElementById('emp-phone').value = data.phone;
                document.getElementById('emp-id').value = data.empCode;
                document.getElementById('emp-salary').value = data.salary || 0;
            } else {
                document.getElementById('modal-title').innerText = 'Add New Employee';
                this.employeeForm.reset();
                document.getElementById('edit-id').value = '';
            }
        } else if (type === 'check-in') {
            await this.populateEmployeeSelect();
            this.modalCheckIn.classList.add('active');
            await this.updateCheckInStatus();
        } else if (type === 'login') {
            this.modalLogin.classList.add('active');
            this.loginError.style.display = 'none';
            this.pinInput.value = '';
            this.pinInput.focus();
        } else if (type === 'edit-log') {
            this.modalEditLog.classList.add('active');
            if (data) {
                document.getElementById('edit-log-id').value = data.id;
                document.getElementById('edit-log-emp-name').value = data.empName;
                document.getElementById('edit-log-date').value = data.date;
                document.getElementById('edit-log-checkin').value = data.checkIn;
                document.getElementById('edit-log-checkout').value = data.checkOut || '';
                document.getElementById('edit-log-status').value = data.status;
            }
        } else if (type === 'department') {
            this.modalDept.classList.add('active');
            this.deptForm.reset();
        }
    },

    hideModals() {
        this.modalEmployee.classList.remove('active');
        this.modalCheckIn.classList.remove('active');
        this.modalLogin.classList.remove('active');
        this.modalEditLog.classList.remove('active');
        this.modalDept.classList.remove('active');
    },

    checkAuth() {
        const isAdmin = sessionStorage.getItem('chronos_is_admin') === 'true';
        if (isAdmin) {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
            this.switchTab('dashboard'); // Default tab for everyone
        }
    },

    async handleLogin() {
        const pin = this.pinInput.value;
        if (pin === '123456') {
            sessionStorage.setItem('chronos_is_admin', 'true');
            this.hideModals();
            this.checkAuth();
            await this.renderAll();
        } else {
            this.loginError.style.display = 'block';
            this.pinInput.value = '';
            this.pinInput.focus();
        }
    },

    async handleLogout() {
        sessionStorage.removeItem('chronos_is_admin');
        this.checkAuth();
        await this.renderAll();
    },

    async populateEmployeeSelect() {
        const employees = await Storage.getEmployees();
        this.checkInSelect.innerHTML = employees.map(emp =>
            `<option value="${emp.id}">${emp.name}</option>`
        ).join('');
    },

    async populateDeptSelect() {
        const depts = await Storage.getDepartments();
        const select = document.getElementById('emp-dept');
        select.innerHTML = depts.map(d =>
            `<option value="${d.name}">${d.name}</option>`
        ).join('');
    },

    async updateCheckInStatus() {
        const empId = this.checkInSelect.value;
        if (!empId) {
            this.progressContainer.style.display = 'none';
            return;
        }

        const attendance = await Storage.getAttendance();
        const today = new Date().toISOString().split('T')[0];
        const record = attendance.find(a => a.employeeId === empId && a.date === today);

        if (!record) {
            this.statusPreview.innerText = 'Status: Not Checked In Today';
            this.btnCheckIn.style.display = 'block';
            this.btnCheckIn.disabled = false;
            this.btnCheckOut.style.display = 'none';
            this.progressContainer.style.display = 'none';
        } else if (!record.checkOut) {
            this.statusPreview.innerText = `Status: Checked In at ${record.checkIn}`;
            this.btnCheckIn.style.display = 'none';
            this.btnCheckOut.style.display = 'block';
            this.btnCheckOut.disabled = false;
            this.updateProgressBar(record.checkIn);
        } else {
            this.statusPreview.innerText = `Status: Completed (${record.checkIn} - ${record.checkOut})`;
            this.btnCheckIn.style.display = 'none';
            this.btnCheckOut.style.display = 'none';
            this.progressContainer.style.display = 'none';
        }
    },

    updateProgressBar(checkInTime) {
        this.progressContainer.style.display = 'block';

        const now = new Date();
        const [h, m, s] = checkInTime.split(':');
        const start = new Date();
        start.setHours(h, m, s);

        const diffMs = now - start;
        const diffHrs = diffMs / (1000 * 60 * 60);
        const targetHrs = 8; // Assuming 8h shift

        const percent = Math.min(Math.round((diffHrs / targetHrs) * 100), 100);

        this.progressBar.style.width = percent + '%';
        this.progressText.innerText = percent + '%';

        const displayHrs = Math.floor(diffHrs);
        const displayMins = Math.floor((diffHrs % 1) * 60);
        this.progressDuration.innerText = `${displayHrs}h ${displayMins}m out of ${targetHrs}h`;
    },

    async handleEmployeeSubmit() {
        const id = document.getElementById('edit-id').value;
        const employee = {
            name: document.getElementById('emp-name').value,
            dept: document.getElementById('emp-dept').value,
            phone: document.getElementById('emp-phone').value,
            empCode: document.getElementById('emp-id').value,
            salary: parseFloat(document.getElementById('emp-salary').value) || 0
        };

        if (id) {
            employee.id = id;
            await Storage.updateEmployee(employee);
        } else {
            await Storage.addEmployee(employee);
        }

        this.hideModals();
        await this.renderAll();
    },

    async handleCheckIn() {
        const empId = this.checkInSelect.value;
        const result = await Storage.checkIn(empId);
        if (result.success) {
            this.showNotification('Check-in Successful! Have a great shift.', 'success');
            await this.updateCheckInStatus();
            await this.renderAll();
        } else {
            this.showNotification(result.message, 'error');
        }
    },

    async handleCheckOut() {
        const empId = this.checkInSelect.value;
        const result = await Storage.checkOut(empId);
        if (result.success) {
            this.showNotification('Check-out Successful! See you tomorrow.', 'success');
            await this.updateCheckInStatus();
            await this.renderAll();
        } else {
            this.showNotification(result.message, 'error');
        }
    },

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        lucide.createIcons();

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    updateDateTime() {
        const now = new Date();
        this.dateEl.innerText = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        this.timeEl.innerText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    },

    async renderAll() {
        // Run these in parallel for speed
        await Promise.all([
            this.renderStats(),
            this.renderEmployeeList(),
            this.renderLogs(),
            this.renderRecentActivity(),
            this.renderWhosIn(),
            this.renderDeptList(),
            this.renderPayroll()
        ]);
    },

    async renderPayroll() {
        const employees = await Storage.getEmployees();
        const attendance = await Storage.getAttendance();
        const payrollBody = document.getElementById('payroll-list-body');
        if (!payrollBody) return;

        payrollBody.innerHTML = employees.map(emp => {
            const daysPresent = attendance.filter(a => a.employeeId === emp.id && a.status !== 'Absent').length;
            const totalEarnings = (daysPresent * (emp.salary || 0)).toFixed(2);

            return `
                <tr>
                    <td>${emp.name}</td>
                    <td>₹${emp.salary || 0}</td>
                    <td>${daysPresent}</td>
                    <td><strong>₹${totalEarnings}</strong></td>
                </tr>
            `;
        }).join('');
    },

    async renderDeptList() {
        const depts = await Storage.getDepartments();
        this.deptListBody.innerHTML = depts.map(d => `
            <tr>
                <td>${d.name}</td>
                <td>${d.manager || 'Not Assigned'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="App.deleteDept('${d.id}')">
                        <i data-lucide="trash-2" style="width: 14px;"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    },

    async renderWhosIn() {
        const activeEmps = await Storage.getActiveEmployees();
        const container = document.getElementById('whos-in-container');
        if (!container) return;

        if (activeEmps.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No one is currently clocked in.</p>';
            return;
        }

        container.innerHTML = activeEmps.map(emp => `
            <div class="whos-in-card">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}">
                <div class="whos-in-info">
                    <h4>${emp.name}</h4>
                    <span>${emp.dept}</span>
                </div>
            </div>
        `).join('');
    },

    async renderStats() {
        const stats = await Storage.getTodayStats();
        this.statTotal.innerText = stats.total;
        this.statPresent.innerText = stats.present;
        this.statAbsent.innerText = stats.absent;

        // Calculate Total Payroll for the stat card
        const employees = await Storage.getEmployees();
        const attendance = await Storage.getAttendance();
        let totalVal = 0;
        employees.forEach(emp => {
            const days = attendance.filter(a => a.employeeId === emp.id && a.status !== 'Absent').length;
            totalVal += (days * (emp.salary || 0));
        });
        this.statPayroll.innerText = `₹${totalVal.toLocaleString('en-IN')}`;
    },

    async renderEmployeeList() {
        const employees = await Storage.getEmployees();
        this.employeeListBody.innerHTML = employees.map(emp => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}" style="width: 30px; height: 30px; border-radius: 50%;">
                        <span>${emp.name}</span>
                    </div>
                </td>
                <td>${emp.dept}</td>
                <td>${emp.phone}</td>
                <td><span class="status-badge present">Active</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="App.editEmployee('${emp.id}')">
                        <i data-lucide="edit-2" style="width: 14px;"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="App.deleteEmployee('${emp.id}')">
                        <i data-lucide="trash-2" style="width: 14px;"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    },

    async renderLogs() {
        const attendance = await Storage.getAttendance();
        const employees = await Storage.getEmployees();

        this.logsListBody.innerHTML = attendance.map(a => {
            const emp = employees.find(e => e.id === a.employeeId);
            return `
                <tr>
                    <td>${emp ? emp.name : 'Unknown'}</td>
                    <td>${a.date}</td>
                    <td>${a.checkIn}</td>
                    <td>${a.checkOut || '--:--'}</td>
                    <td>${this.calculateDuration(a.checkIn, a.checkOut)}</td>
                    <td><span class="status-badge ${a.status.toLowerCase()}">${a.status}</span></td>
                    <td class="admin-only">
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-secondary btn-sm" onclick="App.editLog('${a.id}')">
                                <i data-lucide="edit-2" style="width: 14px;"></i>
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="App.deleteLog('${a.id}')">
                                <i data-lucide="trash-2" style="width: 14px;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).reverse().join('');
        lucide.createIcons();
    },

    calculateDuration(start, end) {
        if (!start || !end) return '--';
        const s = start.split(':');
        const e = end.split(':');
        const startDate = new Date(0, 0, 0, s[0], s[1], s[2]);
        const endDate = new Date(0, 0, 0, e[0], e[1], e[2]);
        let diff = endDate.getTime() - startDate.getTime();
        if (diff < 0) diff += 24 * 60 * 60 * 1000;

        const hours = Math.floor(diff / 1000 / 60 / 60);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        return `${hours}h ${minutes}m`;
    },

    async renderRecentActivity() {
        const allAttendance = await Storage.getAttendance();
        const attendance = allAttendance.slice(-5).reverse();
        const employees = await Storage.getEmployees();

        this.recentActivityList.innerHTML = attendance.map(a => {
            const emp = employees.find(e => e.id === a.employeeId);
            const isCheckOut = !!a.checkOut;
            return `
                <li class="activity-item">
                    <div class="activity-dot ${isCheckOut ? 'red' : 'green'}"></div>
                    <div class="activity-details">
                        <p>${emp ? emp.name : 'User'} ${isCheckOut ? 'Checked Out' : 'Checked In'}</p>
                        <span>${isCheckOut ? a.checkOut : a.checkIn} - Today</span>
                    </div>
                </li>
            `;
        }).join('');
    },

    async editEmployee(id) {
        const employees = await Storage.getEmployees();
        const emp = employees.find(e => e.id === id);
        if (emp) this.showModal('employee', emp);
    },

    async deleteEmployee(id) {
        if (confirm('Are you sure you want to delete this employee?')) {
            await Storage.deleteEmployee(id);
            await this.renderAll();
        }
    },

    async editLog(id) {
        const logs = await Storage.getAttendance();
        const employees = await Storage.getEmployees();
        const log = logs.find(l => l.id === id);
        if (log) {
            const emp = employees.find(e => e.id === log.employeeId);
            this.showModal('edit-log', {
                ...log,
                empName: emp ? emp.name : 'Unknown'
            });
        }
    },

    async deleteLog(id) {
        if (confirm('Are you sure you want to delete this attendance log?')) {
            await Storage.deleteAttendanceRecord(id);
            await this.renderAll();
        }
    },

    async handleEditLogSubmit() {
        const id = document.getElementById('edit-log-id').value;
        const logs = await Storage.getAttendance();
        const log = logs.find(l => l.id === id);

        if (log) {
            log.date = document.getElementById('edit-log-date').value;
            log.checkIn = document.getElementById('edit-log-checkin').value;
            log.checkOut = document.getElementById('edit-log-checkout').value || null;
            log.status = document.getElementById('edit-log-status').value;

            await Storage.updateAttendanceRecord(log);
            this.hideModals();
            await this.renderAll();
        }
    },

    async handleDeptSubmit() {
        const dept = {
            name: document.getElementById('dept-name').value,
            manager: document.getElementById('dept-manager').value
        };
        await Storage.addDepartment(dept);
        this.hideModals();
        await this.renderAll();
    },

    async deleteDept(id) {
        if (confirm('Are you sure you want to delete this department?')) {
            await Storage.deleteDepartment(id);
            await this.renderAll();
        }
    },

    async exportCSV() {
        const attendance = await Storage.getAttendance();
        const employees = await Storage.getEmployees();
        if (attendance.length === 0) {
            alert('No data to export.');
            return;
        }
        const headers = ['Employee Name', 'Date', 'Check In', 'Check Out', 'Status'];
        const csvRows = [headers.join(',')];

        attendance.forEach(a => {
            const emp = employees.find(e => e.id === a.employeeId);
            csvRows.push([emp ? emp.name : 'Unknown', a.date, a.checkIn, a.checkOut || '', a.status].join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    },

    printReport() {
        window.print();
    }
};

// Add event listeners for reports
document.addEventListener('click', (e) => {
    if (e.target.closest('.report-card')) {
        const btn = e.target.closest('.report-card').querySelector('button');
        if (btn.innerText.includes('CSV')) {
            App.exportCSV();
        } else if (btn.innerText.includes('PDF')) {
            App.printReport();
        }
    }
});

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App; // Expose to global scope for onclick handlers
