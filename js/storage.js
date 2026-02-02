// Firebase Configuration
// YOU MUST REPLACE THESE WITH YOUR OWN FIREBASE PROJECT SETTINGS
const firebaseConfig = {
    apiKey: "AIzaSyCETf6T3Ark-3OVpF74_VTm4uJk28R56S8",
    authDomain: "chronos-attendance-903c9.firebaseapp.com",
    projectId: "chronos-attendance-903c9",
    storageBucket: "chronos-attendance-903c9.firebasestorage.app",
    messagingSenderId: "622619731052",
    appId: "1:622619731052:web:d91d7afd15e0ef7ff6a449",
    measurementId: "G-S0258JWE3L"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const Storage = {
    // Helper to sync data to/from Firebase
    // We will use a mixed approach: Realtime DB for cloud, and the App will use callbacks to update UI

    async getEmployees() {
        const snapshot = await db.ref('employees').once('value');
        const data = snapshot.val();
        if (!data) {
            // Initial data if cloud is empty
            const initial = [
                { id: 'EMP-1', name: 'Alex Thompson', dept: 'IT', phone: '+1 555-0101', empCode: 'IT-001', salary: 1500 },
                { id: 'EMP-2', name: 'Sarah Miller', dept: 'HR', phone: '+1 555-0102', empCode: 'HR-023', salary: 1200 },
                { id: 'EMP-3', name: 'David Chen', dept: 'Sales', phone: '+1 555-0103', empCode: 'SL-005', salary: 1000 }
            ];
            await db.ref('employees').set(initial);
            return initial;
        }
        return Object.values(data);
    },

    async saveEmployees(employees) {
        await db.ref('employees').set(employees);
    },

    async getDepartments() {
        const snapshot = await db.ref('departments').once('value');
        const data = snapshot.val();
        if (!data) {
            const initial = [
                { id: 'DEPT-1', name: 'IT', manager: 'Alex Thompson' },
                { id: 'DEPT-2', name: 'HR', manager: 'Sarah Miller' },
                { id: 'DEPT-3', name: 'Sales', manager: 'David Chen' }
            ];
            await db.ref('departments').set(initial);
            return initial;
        }
        return Object.values(data);
    },

    async saveDepartments(depts) {
        await db.ref('departments').set(depts);
    },

    async getAttendance() {
        const snapshot = await db.ref('attendance').once('value');
        const data = snapshot.val();
        return data ? Object.values(data) : [];
    },

    async saveAttendance(attendance) {
        await db.ref('attendance').set(attendance);
    },

    async addEmployee(employee) {
        employee.id = 'EMP-' + Date.now();
        await db.ref('employees/' + employee.id).set(employee);
        return employee;
    },

    async updateEmployee(updatedEmployee) {
        await db.ref('employees/' + updatedEmployee.id).set(updatedEmployee);
    },

    async deleteEmployee(id) {
        await db.ref('employees/' + id).remove();
        // Attendance logs for this employee would usually stay for records, 
        // but we can clean up if desired.
    },

    async addDepartment(dept) {
        dept.id = 'DEPT-' + Date.now();
        await db.ref('departments/' + dept.id).set(dept);
        return dept;
    },

    async deleteDepartment(id) {
        await db.ref('departments/' + id).remove();
    },

    async checkIn(employeeId) {
        const today = new Date().toISOString().split('T')[0];
        const attendance = await this.getAttendance();

        const existingRecord = attendance.find(a => a.employeeId === employeeId && a.date === today);
        if (existingRecord) {
            return { success: false, message: 'Already checked in today' };
        }

        const id = 'ATT-' + Date.now();
        const newRecord = {
            id,
            employeeId,
            date: today,
            checkIn: new Date().toLocaleTimeString('en-US', { hour12: false }),
            checkOut: null,
            status: 'Present'
        };

        await db.ref('attendance/' + id).set(newRecord);
        return { success: true, record: newRecord };
    },

    async checkOut(employeeId) {
        const today = new Date().toISOString().split('T')[0];
        const attendance = await this.getAttendance();

        const record = attendance.find(a => a.employeeId === employeeId && a.date === today);
        if (!record) return { success: false, message: 'Not checked in today' };
        if (record.checkOut) return { success: false, message: 'Already checked out today' };

        record.checkOut = new Date().toLocaleTimeString('en-US', { hour12: false });
        await db.ref('attendance/' + record.id).set(record);
        return { success: true, record };
    },

    async getTodayStats() {
        const employees = await this.getEmployees();
        const attendance = await this.getAttendance();
        const today = new Date().toISOString().split('T')[0];

        const presentToday = attendance.filter(a => a.date === today).length;
        const totalEmployees = employees.length;

        return {
            total: totalEmployees,
            present: presentToday,
            absent: totalEmployees - presentToday,
            late: attendance.filter(a => a.date === today && a.checkIn > '09:00:00').length
        };
    },

    async getActiveEmployees() {
        const attendance = await this.getAttendance();
        const employees = await this.getEmployees();
        const today = new Date().toISOString().split('T')[0];
        const activeIds = attendance
            .filter(a => a.date === today && !a.checkOut)
            .map(a => a.employeeId);

        return employees.filter(e => activeIds.includes(e.id));
    },

    async autoCleanup() {
        const attendance = await this.getAttendance();
        const today = new Date().toISOString().split('T')[0];
        let changed = false;

        attendance.forEach(async (a) => {
            if (a.date < today && !a.checkOut) {
                a.checkOut = '18:00:00';
                a.status = 'Auto-CO';
                await db.ref('attendance/' + a.id).set(a);
                changed = true;
            }
        });
        return changed;
    },

    async updateAttendanceRecord(record) {
        await db.ref('attendance/' + record.id).set(record);
    },

    async deleteAttendanceRecord(id) {
        await db.ref('attendance/' + id).remove();
    }
};

// Live listener to refresh app when data changes anywhere
db.ref().on('value', () => {
    if (window.App && typeof window.App.renderAll === 'function') {
        window.App.renderAll();
    }
});
