// ==========================
// NAVIGATION & MODALS
// ==========================
function navigate(viewId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
    
    const target = document.getElementById('view-' + viewId);
    if(target) target.classList.remove('hidden');
    
    const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.innerText.toLowerCase().includes(viewId.replace('view-','')));
    if(btn) btn.classList.add('active');

    // Video is stopped by default. Only works after hitting Activate.
}

function toggleAuth(forceShow = true) {
    const modal = document.getElementById('auth-modal');
    if(forceShow) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();
    toggleAuth(false);
    
    const authBtn = document.getElementById('auth-btn');
    authBtn.classList.remove('btn-primary');
    authBtn.classList.add('btn-secondary');
    authBtn.innerHTML = '<i class="ph-bold ph-user-circle text-xl mr-2"></i> System Admin';
    
    navigate('dashboard');
}

// ==========================
// 8 FEATURES LOGIC
// ==========================

let thermalActive = false;
function toggleThermal() {
    thermalActive = !thermalActive;
    const vid = document.getElementById('live-cctv-feed');
    if(thermalActive) {
        vid.classList.add('thermal-fx');
    } else {
        vid.classList.remove('thermal-fx');
    }
}

let isLocked = true;
function toggleSmartLock() {
    isLocked = !isLocked;
    const btn = document.getElementById('lock-btn');
    const txt = document.getElementById('lock-status-txt');
    const circle = document.getElementById('lock-circle');
    const icon = document.getElementById('lock-icon');
    const bgIcon = document.getElementById('lock-bg-icon');
    
    if(isLocked) {
        btn.innerText = 'UNLOCK MAIN GATE';
        txt.innerText = 'EXTERNAL DOORS LOCKED.';
        circle.classList.replace('bg-green-100', 'bg-blue-100');
        circle.classList.replace('text-green-600', 'text-blue-600');
        icon.classList.replace('ph-lock-key-open', 'ph-lock-key');
        bgIcon.classList.replace('ph-lock-key-open', 'ph-lock-key');
        alert("System Notice: Perimeter Locks Engaged.");
    } else {
        btn.innerText = 'LOCK MAIN GATE';
        txt.innerText = 'MAIN GATE IS OPEN.';
        circle.classList.replace('bg-blue-100', 'bg-green-100');
        circle.classList.replace('text-blue-600', 'text-green-600');
        icon.classList.replace('ph-lock-key', 'ph-lock-key-open');
        bgIcon.classList.replace('ph-lock-key', 'ph-lock-key-open');
        alert("Warning: Main Gate has been Unlocked.");
    }
}


// ==========================
// TIMED INTRUSION SYSTEMS
// ==========================
let simulatedCount = 0;
let logsInitialized = false;
let systemActive = false;

function startSurveillanceSequence() {
    if(systemActive) return;
    systemActive = true;

    // Audio Pre-authorization (Synthetic)
    if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.audioCtx.state === 'suspended') {
        window.audioCtx.resume();
    }

    // 1. Hide offline placeholder
    document.getElementById('offline-screen').classList.add('opacity-0');
    setTimeout(() => { document.getElementById('offline-screen').classList.add('hidden'); }, 500);

    // 2. Play Video silently
    const video = document.getElementById('live-cctv-feed');
    // Jump forward slightly to ensure we capture the intruder
    video.currentTime = 2; 
    video.play().catch(e => console.log('Autoplay restriction:', e));
    
    // Update button & status text
    const simBtn = document.getElementById('sim-btn');
    simBtn.innerHTML = `<span class="relative z-10 flex items-center text-green-300 drop-shadow"><i class="ph-fill ph-spinner animate-spin text-xl mr-2"></i> Analyzing Stream...</span>`;
    document.getElementById('feed-status-text').innerText = 'AI Overwatch Active';
    document.getElementById('feed-status-text').classList.add('text-green-600');
    document.getElementById('feed-status-sub').innerText = 'Scanning for unverified subjects...';

    // 3. Set Timeout to simulate "When the man passes by"
    setTimeout(() => {
        triggerMassiveAlert(video);
    }, 4500);
}

function triggerMassiveAlert(video) {
    const canvas = document.getElementById('hidden-canvas');
    let capturedURI = '';

    // Take snapshot precisely when event triggers
    if(video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        // If thermal is active, apply thermal filter to canvas context as well
        if(thermalActive) { ctx.filter = 'sepia(1) hue-rotate(-200deg) contrast(1.5) saturate(3)'; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedURI = canvas.toDataURL('image/jpeg');
        // Do not overwrite innerHTML so we keep the intruder graphic
        // document.getElementById('captured-snapshot-display').innerHTML = `<img src="${capturedURI}" class="w-full h-full object-cover">`;
    }

    const now = new Date();
    document.getElementById('overlay-datetime').innerText = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

    // Play Alert Sounds loudly
    playSyntheticAlarm();

    // Display the huge alarm UI over everything
    document.getElementById('intrusion-overlay').classList.remove('hidden');
    
    simulatedCount++;
    document.getElementById('dash-threat-count').innerText = simulatedCount;
    window.mostRecentSnapshot = 'assets/intruder.png';

    // Reset button
    const simBtn = document.getElementById('sim-btn');
    simBtn.innerHTML = `<span class="relative z-10 flex items-center text-white"><i class="ph-fill ph-power text-xl mr-2"></i> Reactivate AI Scanning</span>`;
    systemActive = false; // allow to retrigger
}

function dismissMassiveThreat() {
    document.getElementById('intrusion-overlay').classList.add('hidden');
    stopSyntheticAlarm();

    // Add log to table
    embedThreatLog(window.mostRecentSnapshot);
}

function embedThreatLog(imgData) {
    const tableBody = document.getElementById('logs-table-body');
    if(!logsInitialized) {
        document.getElementById('empty-logs-row').classList.add('hidden');
        logsInitialized = true;
    }

    const now = new Date();
    const dt = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

    const classBadge = Math.random() > 0.5 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800';

    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="py-4 px-6">${imgData ? `<img src="${imgData}" class="w-24 h-16 object-cover rounded shadow-sm border border-gray-200">` : `<div class="w-24 h-16 bg-gray-200 rounded"></div>`}</td>
        <td class="py-4 px-6 text-gray-900 font-bold">Unrecognized Movement</td>
        <td class="py-4 px-6 text-gray-500 font-mono text-sm">${dt}</td>
        <td class="py-4 px-6"><span class="${classBadge} text-xs font-bold px-3 py-1 rounded border border-gray-200 shadow-sm">EXTERIOR SENSOR 04</span></td>
    `;
    tableBody.insertBefore(row, tableBody.firstChild);
}

window.onload = () => { navigate('home'); }

let alarmInterval = null;

function playSyntheticAlarm() {
    if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.audioCtx.state === 'suspended') {
        window.audioCtx.resume();
    }
    
    clearInterval(alarmInterval);
    
    // Original "teet teet" alarm sequence
    alarmInterval = setInterval(() => {
        const osc = window.audioCtx.createOscillator();
        const gain = window.audioCtx.createGain();
        osc.type = 'square';
        
        osc.frequency.setValueAtTime(800, window.audioCtx.currentTime);
        osc.frequency.setValueAtTime(1000, window.audioCtx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.5, window.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, window.audioCtx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(window.audioCtx.destination);
        
        osc.start();
        osc.stop(window.audioCtx.currentTime + 0.4);
    }, 500);
}

function stopSyntheticAlarm() {
    clearInterval(alarmInterval);
}

function handleImageUpload(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(previewId);
            img.src = e.target.result;
            img.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
}
