// Load data from LocalStorage or initialize empty structures
let activeShifts = JSON.parse(localStorage.getItem('bb_active_shifts')) || {};
let attendanceLogs = JSON.parse(localStorage.getItem('bb_attendance_logs')) || [];

function saveState() {
    localStorage.setItem('bb_active_shifts', JSON.stringify(activeShifts));
    localStorage.setItem('bb_attendance_logs', JSON.stringify(attendanceLogs));
}

function handleTimeAction(event) {
    event.preventDefault();
    const nameInput = document.getElementById('employeeName');
    const actionType = document.getElementById('actionType').value;
    const name = nameInput.value.trim();
    const now = new Date();

    if (actionType === 'IN') {
        if (activeShifts[name]) {
            alert(`${name} is already clocked in!`);
            return;
        }
        activeShifts[name] = {
            timeIn: now.toISOString(),
            displayIn: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
    } else {
        if (!activeShifts[name]) {
            alert(`${name} does not have an active Time In record!`);
            return;
        }
        const shift = activeShifts[name];
        const timeInDate = new Date(shift.timeIn);
        const diffMs = now - timeInDate;
        const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

        // Push to completed logs
        attendanceLogs.unshift({
            name: name,
            timeIn: new Date(shift.timeIn).toLocaleString(),
            timeOut: now.toLocaleString(),
            totalHours: parseFloat(totalHours)
        });

        delete activeShifts[name];
    }

    nameInput.value = '';
    saveState();
    renderUI();
}

// Function to delete a specific historical log entry
function deleteLog(index) {
    if (confirm("Are you sure you want to delete this attendance record?")) {
        attendanceLogs.splice(index, 1);
        saveState();
        renderUI();
    }
}

// Real-time ticker update every second
setInterval(() => {
    renderActiveShifts();
}, 1000);

function renderActiveShifts() {
    const container = document.getElementById('activeShiftsList');
    const searchQuery = document.getElementById('searchActiveInput') ? document.getElementById('searchActiveInput').value.toLowerCase() : '';
    
    // Filter active shift keys based on search input
    const names = Object.keys(activeShifts).filter(name => name.toLowerCase().includes(searchQuery));

    if (Object.keys(activeShifts).length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-sm italic">No active employees.</p>';
        return;
    }

    if (names.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-sm italic">No matching active employees.</p>';
        return;
    }

    container.innerHTML = names.map(name => {
        const shift = activeShifts[name];
        const diffMs = new Date() - new Date(shift.timeIn);
        
        // Calculate live hours, minutes, seconds
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        
        const timerStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        return `
            <div class="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                <div>
                    <p class="font-semibold text-white">${name}</p>
                    <p class="text-xs text-slate-400">In: ${shift.displayIn}</p>
                </div>
                <div class="text-right">
                    <span class="text-emerald-400 font-mono font-bold text-sm">${timerStr}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderLogsTable() {
    const tbody = document.getElementById('logsTableBody');
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    // Filter logs based on search input
    const filteredLogs = attendanceLogs.map((log, originalIndex) => ({ ...log, originalIndex }))
        .filter(log => log.name.toLowerCase().includes(searchQuery));

    if (filteredLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500 italic">No matching attendance records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredLogs.map(log => `
        <tr class="hover:bg-slate-800/40">
            <td class="py-3 px-2 font-medium text-white">${log.name}</td>
            <td class="py-3 px-2 text-slate-300">${log.timeIn}</td>
            <td class="py-3 px-2 text-slate-300">${log.timeOut}</td>
            <td class="py-3 px-2 text-right font-mono text-emerald-400 font-semibold">${log.totalHours} hrs</td>
            <td class="py-3 px-2 text-center">
                <button onclick="deleteLog(${log.originalIndex})" class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-lg text-xs font-medium transition-all">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function renderUI() {
    renderActiveShifts();
    renderLogsTable();
}

function exportToExcel() {
    if (attendanceLogs.length === 0) {
        alert("No logs available to export.");
        return;
    }

    const worksheetData = attendanceLogs.map(log => ({
        "Employee Name": log.name,
        "Time In": log.timeIn,
        "Time Out": log.timeOut,
        "Total Hours": log.totalHours
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, `Time_Tracker_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Initial render on load
renderUI();