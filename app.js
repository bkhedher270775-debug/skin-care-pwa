// =========================================================================
// APP.JS - Skin Care (Rear Fuse Inspection PN: C013900001-001) - VERSION V8
// Optimisé Téléphone (Pièce jointe auto via Partage Natif) & PC
// =========================================================================

const DEFAULT_PARTS = [
    { name: "Top skin", pn: "C01391101-105", category: "skin" },
    { name: "upper R/h skin", pn: "C01391401-103", category: "skin" },
    { name: "upper l/h skin", pn: "C01391201-103", category: "skin" },
    { name: "Lower r/h skin", pn: "C01392401-101", category: "skin" },
    { name: "Lower l/h skin", pn: "CO1392201-101", category: "skin" },
    { name: "lower skin", pn: "C01392101-103", category: "skin" },
    { name: "cargo service panel", pn: "C01392118-101", category: "panel" },
    { name: "water service panel", pn: "C01392415-101", category: "panel" },
    { name: "waste service panel", pn: "C01392116-101", category: "panel" }
];

const DEFAULT_ANOMALIES = [
    "depression", "bump", "Tool mark", "flashness", "scratch", "Paint", "sealing aérodynamique", "over step"
];

const DEFAULT_EMAILS = [
    "chef.production@aerospace-inspection.com",
    "chef.qualite@aerospace-inspection.com"
];

let currentAircraftReport = {
    aircraftSN: "AC 55101",
    operatorName: "",
    anomalies: []
};

let tempZoomOutPhoto = null;
let tempZoomInPhotos = [];
let editingAnomalyIndex = -1;

// Variables pour la caméra intégrée en direct
let activeVideoStream = null;
let currentCameraTarget = null;

// Variables pour le fichier PDF prêt à être attaché
let preparedPdfFile = null;
let preparedPdfBlob = null;
let preparedRecipient = "";

document.addEventListener('DOMContentLoaded', () => {
    loadSavedDraft();
    renderApp();
});

function saveDraft() {
    localStorage.setItem('skincare_current_draft', JSON.stringify(currentAircraftReport));
}

function loadSavedDraft() {
    const saved = localStorage.getItem('skincare_current_draft');
    if (saved) {
        try { currentAircraftReport = JSON.parse(saved); } catch (e) { console.error(e); }
    }
}

function getPartsList() {
    return [...DEFAULT_PARTS, ...JSON.parse(localStorage.getItem('skincare_custom_parts') || '[]')];
}

function getAnomaliesList() {
    return [...DEFAULT_ANOMALIES, ...JSON.parse(localStorage.getItem('skincare_custom_anomalies') || '[]')];
}

function getEmailsList() {
    return [...DEFAULT_EMAILS, ...JSON.parse(localStorage.getItem('skincare_custom_emails') || '[]')];
}

function getFramesList() {
    let frames = [];
    for (let i = 62; i <= 79; i++) {
        if (i !== 73) frames.push(`FR${i}`);
    }
    return [...frames, ...JSON.parse(localStorage.getItem('skincare_custom_frames') || '[]')];
}

function getStringersList() {
    let stringers = [];
    for (let j = 1; j <= 36; j++) {
        stringers.push({ code: `STRG ${j}L`, num: j });
        stringers.push({ code: `STRG ${j}R`, num: j });
    }
    return [...stringers, ...JSON.parse(localStorage.getItem('skincare_custom_stringers') || '[]')];
}

function renderApp() {
    const container = document.getElementById('inspection-container');
    if (!container) return;

    const partOptions = '<option value="">-- Sélectionner la Skin ou le Panneau --</option>' +
        getPartsList().map(p => `<option value="${p.pn}" data-name="${p.name}" data-cat="${p.category}">${p.name} — PN: ${p.pn}</option>`).join('');

    const frameOptions = '<option value="">-- Sélectionner Frame (FR) --</option>' +
        getFramesList().map(f => `<option value="${f}">${f}</option>`).join('');

    const stringerOptions = '<option value="">-- Sélectionner Stringer (STRG L/R) --</option>' +
        getStringersList().map(s => `<option value="${s.code}" data-num="${s.num}">${s.code}</option>`).join('');

    const anomalyOptions = '<option value="">-- Sélectionner le type d\'anomalie --</option>' +
        getAnomaliesList().map(a => `<option value="${a}">${a}</option>`).join('');

    const emailOptions = '<option value="">-- Choisir l\'adresse e-mail destinataire --</option>' +
        getEmailsList().map(e => `<option value="${e}">${e}</option>`).join('');

    const isEditing = editingAnomalyIndex !== -1;

    container.innerHTML = `
        <section class="card">
            <h2>
                <span>1. Identification Avion (Rapport Unique par SN)</span>
                <button type="button" class="secondary small-btn" onclick="resetAircraftReport()">Nouvel Avion</button>
            </h2>
            <div class="form-row">
                <div class="form-group">
                    <label for="ac-serial">Numéro de Série Avion (ex: AC 55xxx)</label>
                    <input type="text" id="ac-serial" value="${currentAircraftReport.aircraftSN}" placeholder="Ex: AC 55101" onchange="updateAircraftHeader()">
                </div>
                <div class="form-group">
                    <label for="operator-name">Opérateur Production / Matricule</label>
                    <input type="text" id="operator-name" value="${currentAircraftReport.operatorName}" placeholder="Nom ou matricule" onchange="updateAircraftHeader()">
                </div>
            </div>
        </section>

        <section class="card" id="anomaly-form-section" style="${isEditing ? 'border: 2px solid #F59E0B;' : ''}">
            <h2>
                <span>${isEditing ? `2. Modification de l'Anomalie #${editingAnomalyIndex + 1}` : '2. Détection & Saisie d\'une Anomalie'}</span>
                ${isEditing ? `<span style="font-size: 0.8rem; color: #F59E0B;">Mode édition actif</span>` : ''}
            </h2>
            <div class="form-group">
                <label for="part-select">Pièce : Skin ou Service Panel (Part Number)</label>
                <select id="part-select" onchange="handlePartOrAnomalyChange()">${partOptions}</select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="frame-select">Zone — Frame (FR62 à FR72, FR74 à FR79, sans FR73)</label>
                    <select id="frame-select" onchange="enforceStringerRules()">${frameOptions}</select>
                </div>
                <div class="form-group">
                    <label for="stringer-select">Zone — Stringer (STRG 1L/R à 36L/R)</label>
                    <select id="stringer-select">${stringerOptions}</select>
                    <div id="stringer-rule-warning" class="warning-banner">
                        À partir de FR74, STRG 24 et STRG 33 (Left et Right) n'existent pas.
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="anomaly-select">Type d'Anomalie</label>
                <select id="anomaly-select" onchange="handlePartOrAnomalyChange()">${anomalyOptions}</select>
                <div id="overstep-rule-warning" class="warning-banner">
                    Refusé : L'anomalie "over step" s'applique uniquement aux panneaux de service.
                </div>
            </div>

            <div id="dimensions-wrapper" class="dimensions-box">
                <p style="font-size: 0.85rem; color: var(--text-muted);">Sélectionnez un type d'anomalie pour afficher les dimensions (Unité : <strong>inch</strong>).</p>
            </div>

            <div class="form-group">
                <label for="anomaly-comment">Commentaire / Note de l'opérateur (Optionnel)</label>
                <textarea id="anomaly-comment" rows="2" placeholder="Ajouter une note ou précision sur cette anomalie (état de surface, contexte, etc.)..."></textarea>
            </div>

            <!-- CAPTURE PHOTO PAR CAMÉRA DU TÉLÉPHONE (ZOOM OUT & ZOOM IN) -->
            <div class="form-row">
                <div class="dimensions-box" style="margin-bottom:0;">
                    <label style="display:block; margin-bottom:0.5rem; color:#60A5FA;">1. Photo Zone (Zoom Out)</label>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                        <button type="button" class="small-btn" style="flex:1; background:#0284C7;" onclick="document.getElementById('cam-zoom-out').click()">
                            📷 Appareil Photo
                        </button>
                        <button type="button" class="small-btn" style="flex:1; background:#0D9488;" onclick="openLiveCamera('out')">
                            🎥 Caméra Directe
                        </button>
                        <button type="button" class="secondary small-btn" onclick="document.getElementById('file-zoom-out').click()">
                            📁 Fichier
                        </button>
                    </div>
                    <input type="file" id="cam-zoom-out" accept="image/*" capture="environment" style="display:none;" onchange="handleZoomOutUpload(this)">
                    <input type="file" id="file-zoom-out" accept="image/*" style="display:none;" onchange="handleZoomOutUpload(this)">
                    <div id="preview-zoom-out" class="photo-preview-grid"></div>
                </div>

                <div class="dimensions-box" style="margin-bottom:0;">
                    <label style="display:block; margin-bottom:0.5rem; color:#60A5FA;">2. Photo(s) Anomalie (Zoom In)</label>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                        <button type="button" class="small-btn" style="flex:1; background:#0284C7;" onclick="document.getElementById('cam-zoom-in').click()">
                            📷 + Photo Caméra
                        </button>
                        <button type="button" class="small-btn" style="flex:1; background:#0D9488;" onclick="openLiveCamera('in')">
                            🎥 Caméra Directe
                        </button>
                        <button type="button" class="secondary small-btn" onclick="document.getElementById('file-zoom-in').click()">
                            📁 Fichiers
                        </button>
                    </div>
                    <input type="file" id="cam-zoom-in" accept="image/*" capture="environment" style="display:none;" onchange="handleZoomInUpload(this)">
                    <input type="file" id="file-zoom-in" accept="image/*" multiple style="display:none;" onchange="handleZoomInUpload(this)">
                    <div id="preview-zoom-in" class="photo-preview-grid"></div>
                </div>
            </div>

            <!-- VISEUR CAMÉRA EN DIRECT -->
            <div id="live-camera-modal" style="display:none; background:#050B14; border:2px solid #3B82F6; border-radius:8px; padding:1rem; margin-top:1rem; text-align:center;">
                <h3 id="live-camera-title" style="color:#60A5FA; margin-bottom:0.5rem;">Caméra en direct</h3>
                <div style="position:relative; width:100%; max-width:480px; margin:0 auto; overflow:hidden; border-radius:6px; background:#000;">
                    <video id="live-video" autoplay playsinline style="width:100%; display:block; transform-origin:center center;"></video>
                </div>
                <div style="max-width:480px; margin:0.75rem auto 0 auto; display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:0.8rem;">Zoom :</span>
                    <input type="range" id="camera-zoom-slider" min="1" max="3" step="0.1" value="1" oninput="applyVideoZoom(this.value)">
                    <span id="zoom-val-label" style="font-size:0.8rem; min-width:35px;">1.0x</span>
                </div>
                <div style="display:flex; gap:0.75rem; justify-content:center; margin-top:0.75rem;">
                    <button type="button" class="success small-btn" onclick="takeLiveSnapshot()" style="padding:0.6rem 1.5rem; font-size:0.95rem;">
                        📸 Capturer la Photo
                    </button>
                    <button type="button" class="danger small-btn" onclick="closeLiveCamera()">
                        Fermer Caméra
                    </button>
                </div>
            </div>

            <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" id="submit-anomaly-btn" onclick="addAnomalyToAircraft()" style="${isEditing ? 'background-color: #F59E0B; color: #000;' : ''}">
                    ${isEditing ? `Enregistrer les modifications de l'anomalie #${editingAnomalyIndex + 1}` : `+ Ajouter cette anomalie au rapport de l'avion ${currentAircraftReport.aircraftSN}`}
                </button>
                ${isEditing ? `<button type="button" class="secondary" onclick="cancelEditAnomaly()" style="width: auto; white-space: nowrap;">Annuler</button>` : ''}
            </div>
        </section>

        <section class="card">
            <h2>
                <span>3. Rapport Global de l'Avion (${currentAircraftReport.aircraftSN})</span>
                <span style="font-size: 0.85rem; color: #34D399;">${currentAircraftReport.anomalies.length} anomalie(s)</span>
            </h2>
            <div id="aircraft-anomalies-list"></div>
            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1rem 0;">
            <div class="form-group">
                <label for="recipient-email">Adresse E-mail du Destinataire (Chef d'équipe Production / Qualité)</label>
                <select id="recipient-email">${emailOptions}</select>
                <div class="email-inline-add">
                    <input type="email" id="new-email-input" placeholder="Ajouter une nouvelle adresse e-mail...">
                    <button type="button" class="secondary small-btn" onclick="addNewEmail()">+ Ajouter E-mail</button>
                </div>
            </div>
            <div class="form-row" style="margin-top: 1rem;">
                <button type="button" class="success" onclick="sendReportByEmail()">
                    📧 Préparer & Envoyer par E-mail (avec PDF joint)
                </button>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" onclick="downloadReportPDF()">Télécharger PDF</button>
                    <button type="button" class="secondary" onclick="printReportDirectly()">Imprimer</button>
                </div>
            </div>
        </section>

        <section class="card card-admin">
            <h2>4. Espace Chef d'Équipe Production / Qualité — Ajout Base de Données</h2>
            <div class="form-row-3">
                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>Ajouter Pièce / Skin</h3>
                    <div class="form-group">
                        <input type="text" id="admin-part-name" placeholder="Nom pièce / skin">
                        <input type="text" id="admin-part-pn" placeholder="Part Number (PN)">
                        <select id="admin-part-cat">
                            <option value="skin">Skin</option>
                            <option value="panel">Service Panel</option>
                        </select>
                        <button type="button" class="small-btn" onclick="adminAddPart()" style="width:100%;">Ajouter Pièce</button>
                    </div>
                </div>
                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>Ajouter Type d'Anomalie</h3>
                    <div class="form-group">
                        <input type="text" id="admin-anomaly-name" placeholder="Nom de l'anomalie">
                        <button type="button" class="small-btn" onclick="adminAddAnomaly()" style="width:100%; margin-top: 0.5rem;">Ajouter Anomalie</button>
                    </div>
                </div>
                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>Ajouter une Zone</h3>
                    <div class="form-group">
                        <input type="text" id="admin-zone-frame" placeholder="Frame (ex: FR80)">
                        <button type="button" class="small-btn" onclick="adminAddFrame()" style="width:100%;">+ Frame</button>
                        <input type="text" id="admin-zone-strg" placeholder="Stringer (ex: STRG 37L)" style="margin-top:0.4rem;">
                        <button type="button" class="small-btn" onclick="adminAddStringer()" style="width:100%;">+ Stringer</button>
                    </div>
                </div>
            </div>
        </section>
    `;
    renderAnomaliesList();
    renderPhotoPreviews();
}

// =========================================================================
// FONCTIONS CAMÉRA DIRECTE INTÉGRÉE
// =========================================================================

async function openLiveCamera(target) {
    currentCameraTarget = target;
    const modal = document.getElementById('live-camera-modal');
    const video = document.getElementById('live-video');
    const title = document.getElementById('live-camera-title');
    const slider = document.getElementById('camera-zoom-slider');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (target === 'out') document.getElementById('cam-zoom-out').click();
        else document.getElementById('cam-zoom-in').click();
        return;
    }

    try {
        if (activeVideoStream) {
            activeVideoStream.getTracks().forEach(t => t.stop());
        }
        activeVideoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
            audio: false
        });
        video.srcObject = activeVideoStream;
        modal.style.display = 'block';

        const defaultZoom = target === 'in' ? 1.8 : 1.0;
        slider.value = defaultZoom;
        applyVideoZoom(defaultZoom);

        title.textContent = target === 'out'
            ? "Caméra Directe — Photo Zone (Zoom Out)"
            : "Caméra Directe — Photo Rapprochée de l'Anomalie (Zoom In)";
        modal.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        if (target === 'out') document.getElementById('cam-zoom-out').click();
        else document.getElementById('cam-zoom-in').click();
    }
}

function applyVideoZoom(zoomVal) {
    const video = document.getElementById('live-video');
    const label = document.getElementById('zoom-val-label');
    if (video) video.style.transform = `scale(${zoomVal})`;
    if (label) label.textContent = `${parseFloat(zoomVal).toFixed(1)}x`;
}

function takeLiveSnapshot() {
    const video = document.getElementById('live-video');
    const slider = document.getElementById('camera-zoom-slider');
    if (!video || !activeVideoStream) return;

    const zoom = parseFloat(slider ? slider.value : 1);
    const canvas = document.createElement('canvas');
    const vw = video.videoWidth || 800;
    const vh = video.videoHeight || 600;

    canvas.width = 800;
    canvas.height = Math.round((vh / vw) * 800);
    const ctx = canvas.getContext('2d');

    const cropW = vw / zoom;
    const cropH = vh / zoom;
    const startX = (vw - cropW) / 2;
    const startY = (vh - cropH) / 2;

    ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    if (currentCameraTarget === 'out') {
        tempZoomOutPhoto = dataUrl;
        closeLiveCamera();
    } else {
        tempZoomInPhotos.push(dataUrl);
    }
    renderPhotoPreviews();
}

function closeLiveCamera() {
    if (activeVideoStream) {
        activeVideoStream.getTracks().forEach(t => t.stop());
        activeVideoStream = null;
    }
    const modal = document.getElementById('live-camera-modal');
    if (modal) modal.style.display = 'none';
}

// =========================================================================
// LOGIQUE MÉTIER AÉRONAUTIQUE & FORMULAIRE
// =========================================================================

function updateAircraftHeader() {
    const snInput = document.getElementById('ac-serial');
    const opInput = document.getElementById('operator-name');
    if (snInput) currentAircraftReport.aircraftSN = snInput.value.trim() || "AC 55xxx";
    if (opInput) currentAircraftReport.operatorName = opInput.value.trim();
    saveDraft();
    renderApp();
}

function resetAircraftReport() {
    const newSN = prompt("Entrez le numéro de série du nouvel avion (ex: AC 55102) :", "AC 55");
    if (newSN === null) return;
    closeLiveCamera();
    editingAnomalyIndex = -1;
    tempZoomOutPhoto = null;
    tempZoomInPhotos = [];
    currentAircraftReport = { aircraftSN: newSN.trim() || "AC 55xxx", operatorName: currentAircraftReport.operatorName, anomalies: [] };
    saveDraft();
    renderApp();
}

function enforceStringerRules() {
    const frameSelect = document.getElementById('frame-select');
    const stringerSelect = document.getElementById('stringer-select');
    const warning = document.getElementById('stringer-rule-warning');
    if (!frameSelect || !stringerSelect) return;

    const frameNum = parseInt(frameSelect.value.replace(/[^0-9]/g, ''), 10);
    const isAftOf74 = !isNaN(frameNum) && frameNum >= 74;

    for (let i = 0; i < stringerSelect.options.length; i++) {
        const opt = stringerSelect.options[i];
        const num = parseInt(opt.getAttribute('data-num'), 10);
        if (isAftOf74 && (num === 24 || num === 33)) {
            opt.disabled = true;
            opt.textContent = `${opt.value} (Inexistant >= FR74)`;
            if (stringerSelect.value === opt.value) stringerSelect.value = "";
        } else if (opt.value) {
            opt.disabled = false;
            opt.textContent = opt.value;
        }
    }
    warning.style.display = isAftOf74 ? 'block' : 'none';
}

function handlePartOrAnomalyChange() {
    const partSelect = document.getElementById('part-select');
    const anomalySelect = document.getElementById('anomaly-select');
    const overstepWarning = document.getElementById('overstep-rule-warning');
    const dimWrapper = document.getElementById('dimensions-wrapper');
    if (!partSelect || !anomalySelect || !dimWrapper) return;

    const selectedPartOpt = partSelect.options[partSelect.selectedIndex];
    const partCategory = selectedPartOpt ? selectedPartOpt.getAttribute('data-cat') : null;
    const anomalyType = anomalySelect.value;

    if (anomalyType.toLowerCase() === 'over step' && partCategory !== 'panel') {
        overstepWarning.style.display = 'block';
        anomalySelect.value = "";
        dimWrapper.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Veuillez choisir un panneau de service pour "over step".</p>`;
        return;
    }
    overstepWarning.style.display = 'none';

    if (!anomalyType) {
        dimWrapper.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Sélectionnez un type d'anomalie (Unité : <strong>inch</strong>).</p>`;
        return;
    }

    if (anomalyType.toLowerCase() === 'flashness') {
        dimWrapper.innerHTML = `
            <h3>Dimensions — Flashness (inch)</h3>
            <div class="form-row">
                <div class="form-group" style="margin-bottom:0;">
                    <label for="flash-sign">Orientation (+ zéro / - zéro)</label>
                    <select id="flash-sign">
                        <option value="+0">+ zéro</option>
                        <option value="-0">- zéro</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-depth">Valeur Depth (inch)</label>
                    <input type="number" step="0.0001" id="dim-depth" placeholder="Ex: 0.005">
                </div>
            </div>
        `;
    } else if (anomalyType.toLowerCase() === 'scratch') {
        dimWrapper.innerHTML = `
            <h3>Dimensions & Contrôle — Scratch (inch)</h3>
            <div class="form-row-3">
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-length">Length (inch)</label>
                    <input type="number" step="0.001" id="dim-length" placeholder="Ex: 1.500">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-width">Width (inch)</label>
                    <input type="number" step="0.001" id="dim-width" placeholder="Ex: 0.050">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-depth">Depth (inch)</label>
                    <input type="number" step="0.0001" id="dim-depth" placeholder="Ex: 0.002">
                </div>
            </div>
            <div class="form-group" style="margin-top:0.75rem; margin-bottom:0;">
                <label for="clad-test">Test Clad :</label>
                <select id="clad-test">
                    <option value="Non spécifié">-- Sélectionner résultat Test Clad --</option>
                    <option value="Positif (+)">Positif (+)</option>
                    <option value="Négatif (-)">Négatif (-)</option>
                </select>
            </div>
        `;
    } else {
        dimWrapper.innerHTML = `
            <h3>Dimensions — ${anomalyType} (inch)</h3>
            <div class="form-row-3">
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-length">Length (inch)</label>
                    <input type="number" step="0.001" id="dim-length" placeholder="Ex: 1.500">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-width">Width (inch)</label>
                    <input type="number" step="0.001" id="dim-width" placeholder="Ex: 0.250">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-depth">Depth (inch)</label>
                    <input type="number" step="0.0001" id="dim-depth" placeholder="Ex: 0.005">
                </div>
            </div>
        `;
    }
}

function compressAndReadImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDim = 800;
            let width = img.width;
            let height = img.height;
            if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
            else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function renderPhotoPreviews() {
    const previewOut = document.getElementById('preview-zoom-out');
    const previewIn = document.getElementById('preview-zoom-in');
    if (previewOut) {
        previewOut.innerHTML = tempZoomOutPhoto
            ? `<div style="position:relative;display:inline-block;">
                 <img src="${tempZoomOutPhoto}" class="photo-thumb" alt="Zoom Out">
                 <button type="button" onclick="removeZoomOutPhoto()" style="position:absolute;top:2px;right:2px;background:#EF4444;color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;padding:0;line-height:22px;">×</button>
               </div>`
            : '';
    }
    if (previewIn) {
        previewIn.innerHTML = tempZoomInPhotos.map((src, idx) => `
            <div style="position:relative;display:inline-block;">
                <img src="${src}" class="photo-thumb" alt="Zoom In">
                <button type="button" onclick="removeZoomInPhoto(${idx})" style="position:absolute;top:2px;right:2px;background:#EF4444;color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;padding:0;line-height:22px;">×</button>
            </div>
        `).join('');
    }
}

function removeZoomOutPhoto() {
    tempZoomOutPhoto = null;
    renderPhotoPreviews();
}

function removeZoomInPhoto(idx) {
    tempZoomInPhotos.splice(idx, 1);
    renderPhotoPreviews();
}

function handleZoomOutUpload(input) {
    if (input.files && input.files[0]) {
        compressAndReadImage(input.files[0], (dataUrl) => {
            tempZoomOutPhoto = dataUrl;
            renderPhotoPreviews();
            input.value = '';
        });
    }
}

function handleZoomInUpload(input) {
    if (input.files && input.files.length > 0) {
        Array.from(input.files).forEach(file => {
            compressAndReadImage(file, (dataUrl) => {
                tempZoomInPhotos.push(dataUrl);
                renderPhotoPreviews();
            });
        });
        input.value = '';
    }
}

function addAnomalyToAircraft() {
    closeLiveCamera();
    const snInput = document.getElementById('ac-serial');
    const opInput = document.getElementById('operator-name');
    const partSelect = document.getElementById('part-select');
    const frameSelect = document.getElementById('frame-select');
    const stringerSelect = document.getElementById('stringer-select');
    const anomalySelect = document.getElementById('anomaly-select');
    const commentInput = document.getElementById('anomaly-comment');

    if (snInput) currentAircraftReport.aircraftSN = snInput.value.trim() || "AC 55xxx";
    if (opInput) currentAircraftReport.operatorName = opInput.value.trim();

    if (!partSelect.value || !frameSelect.value || !stringerSelect.value || !anomalySelect.value) {
        alert("Veuillez sélectionner le Part Number, le Frame, le Stringer et le Type d'anomalie.");
        return;
    }

    const partOpt = partSelect.options[partSelect.selectedIndex];
    const anomalyType = anomalySelect.value;
    const operatorComment = commentInput ? commentInput.value.trim() : "";
    let dimensionsFormatted = "";
    let rawDims = {};

    if (anomalyType.toLowerCase() === 'flashness') {
        const sign = document.getElementById('flash-sign') ? document.getElementById('flash-sign').value : '+0';
        const depth = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '0';
        rawDims = { sign, depth };
        dimensionsFormatted = `Depth : ${sign} / ${depth || '0'} inch`;
    } else if (anomalyType.toLowerCase() === 'scratch') {
        const l = document.getElementById('dim-length') ? document.getElementById('dim-length').value : '0';
        const w = document.getElementById('dim-width') ? document.getElementById('dim-width').value : '0';
        const d = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '0';
        const clad = document.getElementById('clad-test') ? document.getElementById('clad-test').value : 'Non spécifié';
        rawDims = { length: l, width: w, depth: d, clad };
        dimensionsFormatted = `Length: ${l || '0'} in | Width: ${w || '0'} in | Depth: ${d || '0'} in | Test Clad: ${clad}`;
    } else {
        const l = document.getElementById('dim-length') ? document.getElementById('dim-length').value : '0';
        const w = document.getElementById('dim-width') ? document.getElementById('dim-width').value : '0';
        const d = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '0';
        rawDims = { length: l, width: w, depth: d };
        dimensionsFormatted = `Length: ${l || '0'} in | Width: ${w || '0'} in | Depth: ${d || '0'} in`;
    }

    const anomalyData = {
        partName: partOpt.getAttribute('data-name'),
        partPN: partSelect.value,
        frame: frameSelect.value,
        stringer: stringerSelect.value,
        type: anomalyType,
        dimensions: dimensionsFormatted,
        rawDims: rawDims,
        comment: operatorComment,
        zoomOutPhoto: tempZoomOutPhoto,
        zoomInPhotos: [...tempZoomInPhotos]
    };

    if (editingAnomalyIndex !== -1) {
        currentAircraftReport.anomalies[editingAnomalyIndex] = anomalyData;
        editingAnomalyIndex = -1;
    } else {
        currentAircraftReport.anomalies.push(anomalyData);
    }

    saveDraft();
    tempZoomOutPhoto = null;
    tempZoomInPhotos = [];
    renderApp();
}

function editAnomalyFromAircraft(index) {
    const anom = currentAircraftReport.anomalies[index];
    if (!anom) return;

    closeLiveCamera();
    editingAnomalyIndex = index;
    tempZoomOutPhoto = anom.zoomOutPhoto || null;
    tempZoomInPhotos = anom.zoomInPhotos ? [...anom.zoomInPhotos] : [];

    renderApp();

    const partSelect = document.getElementById('part-select');
    const frameSelect = document.getElementById('frame-select');
    const stringerSelect = document.getElementById('stringer-select');
    const anomalySelect = document.getElementById('anomaly-select');
    const commentInput = document.getElementById('anomaly-comment');

    if (partSelect) partSelect.value = anom.partPN;
    if (frameSelect) {
        frameSelect.value = anom.frame;
        enforceStringerRules();
    }
    if (stringerSelect) stringerSelect.value = anom.stringer;
    if (anomalySelect) {
        anomalySelect.value = anom.type;
        handlePartOrAnomalyChange();
    }
    if (commentInput) commentInput.value = anom.comment || "";

    if (anom.rawDims) {
        if (anom.type.toLowerCase() === 'flashness') {
            if (document.getElementById('flash-sign')) document.getElementById('flash-sign').value = anom.rawDims.sign || '+0';
            if (document.getElementById('dim-depth')) document.getElementById('dim-depth').value = anom.rawDims.depth || '';
        } else {
            if (document.getElementById('dim-length')) document.getElementById('dim-length').value = anom.rawDims.length || '';
            if (document.getElementById('dim-width')) document.getElementById('dim-width').value = anom.rawDims.width || '';
            if (document.getElementById('dim-depth')) document.getElementById('dim-depth').value = anom.rawDims.depth || '';
            if (anom.type.toLowerCase() === 'scratch' && document.getElementById('clad-test')) {
                document.getElementById('clad-test').value = anom.rawDims.clad || 'Non spécifié';
            }
        }
    }

    renderPhotoPreviews();
    const formSection = document.getElementById('anomaly-form-section');
    if (formSection) formSection.scrollIntoView({ behavior: 'smooth' });
}

function cancelEditAnomaly() {
    closeLiveCamera();
    editingAnomalyIndex = -1;
    tempZoomOutPhoto = null;
    tempZoomInPhotos = [];
    renderApp();
}

function removeAnomalyFromAircraft(index) {
    if (editingAnomalyIndex === index) {
        editingAnomalyIndex = -1;
        tempZoomOutPhoto = null;
        tempZoomInPhotos = [];
    } else if (editingAnomalyIndex > index) {
        editingAnomalyIndex--;
    }
    currentAircraftReport.anomalies.splice(index, 1);
    saveDraft();
    renderApp();
}

function renderAnomaliesList() {
    const listDiv = document.getElementById('aircraft-anomalies-list');
    if (!listDiv) return;
    if (currentAircraftReport.anomalies.length === 0) {
        listDiv.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Aucune anomalie enregistrée pour l'avion ${currentAircraftReport.aircraftSN}.</p>`;
        return;
    }
    listDiv.innerHTML = currentAircraftReport.anomalies.map((anom, idx) => `
        <div class="anomaly-item" style="${editingAnomalyIndex === idx ? 'border-color: #F59E0B;' : ''}">
            <div>
                <strong style="color: #60A5FA;">#${idx + 1} — ${anom.type.toUpperCase()}</strong>
                <div style="font-size: 0.85rem; margin-top: 0.2rem;">
                    <strong>Pièce :</strong> ${anom.partName} (PN: ${anom.partPN}) | <strong>Zone :</strong> ${anom.frame} / ${anom.stringer}<br>
                    <strong>Dimensions :</strong> ${anom.dimensions}
                    ${anom.comment ? `<br><strong>Commentaire :</strong> <em>${anom.comment}</em>` : ''}
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="secondary small-btn" onclick="editAnomalyFromAircraft(${idx})" style="background-color: #F59E0B; color: #000;">Modifier</button>
                <button type="button" class="danger small-btn" onclick="removeAnomalyFromAircraft(${idx})">Retirer</button>
            </div>
        </div>
    `).join('');
}

function addNewEmail() {
    const input = document.getElementById('new-email-input');
    if (!input || !input.value.trim()) return;
    const email = input.value.trim();
    let customEmails = JSON.parse(localStorage.getItem('skincare_custom_emails') || '[]');
    if (!customEmails.includes(email)) {
        customEmails.push(email);
        localStorage.setItem('skincare_custom_emails', JSON.stringify(customEmails));
    }
    renderApp();
    document.getElementById('recipient-email').value = email;
}

function adminAddPart() {
    const name = document.getElementById('admin-part-name').value.trim();
    const pn = document.getElementById('admin-part-pn').value.trim();
    const category = document.getElementById('admin-part-cat').value;
    if (!name || !pn) return;
    let custom = JSON.parse(localStorage.getItem('skincare_custom_parts') || '[]');
    custom.push({ name, pn, category });
    localStorage.setItem('skincare_custom_parts', JSON.stringify(custom));
    renderApp();
}

function adminAddAnomaly() {
    const name = document.getElementById('admin-anomaly-name').value.trim();
    if (!name) return;
    let custom = JSON.parse(localStorage.getItem('skincare_custom_anomalies') || '[]');
    custom.push(name);
    localStorage.setItem('skincare_custom_anomalies', JSON.stringify(custom));
    renderApp();
}

function adminAddFrame() {
    const frame = document.getElementById('admin-zone-frame').value.trim().toUpperCase();
    if (!frame) return;
    let custom = JSON.parse(localStorage.getItem('skincare_custom_frames') || '[]');
    custom.push(frame);
    localStorage.setItem('skincare_custom_frames', JSON.stringify(custom));
    renderApp();
}

function adminAddStringer() {
    const strg = document.getElementById('admin-zone-strg').value.trim().toUpperCase();
    if (!strg) return;
    let custom = JSON.parse(localStorage.getItem('skincare_custom_stringers') || '[]');
    const numMatch = strg.match(/\d+/);
    custom.push({ code: strg, num: numMatch ? parseInt(numMatch[0], 10) : 99 });
    localStorage.setItem('skincare_custom_stringers', JSON.stringify(custom));
    renderApp();
}

// =========================================================================
// GÉNÉRATION PDF & ENVOI E-MAIL (OPTIMISÉ TÉLÉPHONE + PC)
// =========================================================================

function generateReportHTML(recipientEmail) {
    const rows = currentAircraftReport.anomalies.map((anom, i) => {
        const zoomInImgs = anom.zoomInPhotos.map(src => `<img src="${src}" style="width:160px;height:120px;object-fit:cover;border:1px solid #94a3b8;margin-right:6px;">`).join('');
        return `
            <div style="border:1px solid #cbd5e1;padding:10px;margin-bottom:12px;page-break-inside:avoid;background:#f8fafc;color:#0f172a;">
                <h3 style="color:#0F2744;margin:0 0 5px 0;">Anomalie #${i + 1} — ${anom.type.toUpperCase()}</h3>
                <p style="margin:2px 0;font-size:12px;color:#0f172a;"><strong>Pièce :</strong> ${anom.partName} (PN: ${anom.partPN}) | <strong>Zone :</strong> ${anom.frame} - ${anom.stringer}</p>
                <p style="margin:2px 0;font-size:12px;color:#0f172a;"><strong>Dimensions :</strong> ${anom.dimensions}</p>
                ${anom.comment ? `<p style="margin:4px 0;padding:6px;background:#e2e8f0;border-left:3px solid #0F2744;font-size:12px;color:#0f172a;"><strong>Commentaire Opérateur :</strong> ${anom.comment}</p>` : ''}
                <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:10px;">
                    ${anom.zoomOutPhoto ? `<div><div style="font-size:10px;font-weight:bold;color:#0f172a;">Zoom Out :</div><img src="${anom.zoomOutPhoto}" style="width:160px;height:120px;object-fit:cover;border:1px solid #94a3b8;"></div>` : ''}
                    ${anom.zoomInPhotos.length > 0 ? `<div><div style="font-size:10px;font-weight:bold;color:#0f172a;">Zoom In :</div><div style="display:flex;flex-wrap:wrap;">${zoomInImgs}</div></div>` : ''}
                </div>
            </div>`;
    }).join('');

    return `
        <div id="pdf-content-inner" style="width:750px;padding:20px;background:#ffffff;color:#0f172a;font-family:Arial,sans-serif;">
            <h1 style="color:#0F2744;font-size:18px;border-bottom:2px solid #0F2744;padding-bottom:6px;margin-top:0;">RAPPORT D'INSPECTION — SKIN CARE (Rear Fuse PN: C013900001-001)</h1>
            <p style="font-size:12px;margin:8px 0;color:#0f172a;"><strong>Avion SN :</strong> ${currentAircraftReport.aircraftSN} | <strong>Opérateur :</strong> ${currentAircraftReport.operatorName || 'N/A'} | <strong>Destinataire :</strong> ${recipientEmail || 'Production & Qualité'} | <strong>Date :</strong> ${new Date().toLocaleDateString()}</p>
            ${rows}
        </div>`;
}

function createVisibleReportOverlay(recipient) {
    window.scrollTo(0, 0);
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = '#ffffff';
    overlay.style.zIndex = '999999';
    overlay.style.overflow = 'auto';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = generateReportHTML(recipient);
    document.body.appendChild(overlay);
    return overlay;
}

function downloadReportPDF() {
    if (currentAircraftReport.anomalies.length === 0) return alert("Ajoutez au moins une anomalie.");
    const recipient = document.getElementById('recipient-email') ? document.getElementById('recipient-email').value : '';
    
    const overlay = createVisibleReportOverlay(recipient);
    const targetElement = overlay.querySelector('#pdf-content-inner');
    const fileName = `Rapport_SkinCare_${currentAircraftReport.aircraftSN.replace(/\s+/g, '_')}.pdf`;

    const opt = {
        margin: 8,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    setTimeout(() => {
        html2pdf().set(opt).from(targetElement).save().then(() => {
            document.body.removeChild(overlay);
        }).catch(err => {
            console.error(err);
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        });
    }, 300);
}

function printReportDirectly() {
    if (currentAircraftReport.anomalies.length === 0) return alert("Ajoutez au moins une anomalie.");
    const recipient = document.getElementById('recipient-email') ? document.getElementById('recipient-email').value : '';
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return alert("Autorisez les pop-ups pour imprimer.");
    w.document.write(`<html><head><title>Rapport ${currentAircraftReport.aircraftSN}</title></head><body onload="window.print();">${generateReportHTML(recipient)}</body></html>`);
    w.document.close();
}

// Étape 1 : Génération du PDF puis ouverture du bouton d'attachement direct
async function sendReportByEmail() {
    if (currentAircraftReport.anomalies.length === 0) return alert("Ajoutez au moins une anomalie.");
    const recipient = document.getElementById('recipient-email') ? document.getElementById('recipient-email').value : '';
    if (!recipient) return alert("Sélectionnez ou ajoutez une adresse e-mail destinataire.");

    preparedRecipient = recipient;
    const overlay = createVisibleReportOverlay(recipient);
    const targetElement = overlay.querySelector('#pdf-content-inner');
    const fileName = `Rapport_SkinCare_${currentAircraftReport.aircraftSN.replace(/\s+/g, '_')}.pdf`;
    
    const opt = {
        margin: 8,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    setTimeout(async () => {
        try {
            preparedPdfBlob = await html2pdf().set(opt).from(targetElement).outputPdf('blob');
            document.body.removeChild(overlay);
            preparedPdfFile = new File([preparedPdfBlob], fileName, { type: 'application/pdf' });

            showReadyToSendModal(fileName, recipient);
        } catch (e) {
            console.error(e);
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
            alert("Erreur lors de la préparation du PDF.");
        }
    }, 250);
}

function showReadyToSendModal(fileName, recipient) {
    let modal = document.getElementById('send-confirm-modal');
    if (modal) modal.remove();

    // Copie automatique de l'adresse e-mail pour le téléphone
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(recipient).catch(() => {});
    }

    modal = document.createElement('div');
    modal.id = 'send-confirm-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(9,17,30,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
        <div style="background:#0F2744;border:2px solid #10B981;border-radius:10px;padding:1.5rem;max-width:460px;width:100%;text-align:center;color:#F8FAFC;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <h3 style="color:#34D399;margin-bottom:0.5rem;font-size:1.15rem;">✅ Rapport PDF Prêt à Envoyer !</h3>
            <p style="font-size:0.88rem;color:#94A3B8;margin-bottom:1rem;">
                Fichier : <strong style="color:#fff;">${fileName}</strong><br>
                Destinataire copié : <strong style="color:#60A5FA;">${recipient}</strong>
            </p>
            <button type="button" onclick="triggerInstantShare()" style="background:#10B981;color:#fff;padding:0.9rem;border-radius:8px;font-weight:bold;width:100%;margin-bottom:0.6rem;cursor:pointer;border:none;font-size:0.98rem;">
                📱 Téléphone : Joindre le PDF & Ouvrir Mail
            </button>
            <button type="button" onclick="triggerPcFallback()" style="background:#3B82F6;color:#fff;padding:0.75rem;border-radius:8px;font-weight:bold;width:100%;margin-bottom:0.6rem;cursor:pointer;border:none;font-size:0.9rem;">
                💻 Sur PC : Télécharger PDF + Ouvrir Mail
            </button>
            <button type="button" onclick="document.getElementById('send-confirm-modal').remove()" style="background:#475569;color:#fff;padding:0.6rem;border-radius:8px;width:100%;cursor:pointer;border:none;">
                Fermer
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Action Mobile : Partage Web natif immédiat (attache le PDF automatiquement dans Gmail/Outlook mobile)
async function triggerInstantShare() {
    const modal = document.getElementById('send-confirm-modal');
    if (modal) modal.remove();
    if (!preparedPdfFile) return;

    if (navigator.canShare && navigator.canShare({ files: [preparedPdfFile] })) {
        try {
            await navigator.share({
                files: [preparedPdfFile],
                title: `Rapport Skin Care - ${currentAircraftReport.aircraftSN}`,
                text: `À envoyer à : ${preparedRecipient}\nRapport d'inspection aéronautique Rear Fuse (${currentAircraftReport.anomalies.length} anomalie(s)) pour l'avion ${currentAircraftReport.aircraftSN}.`
            });
            return;
        } catch (err) {
            console.warn("Partage annulé ou repli PC :", err);
        }
    }
    // Si appelé depuis un PC qui ne supporte pas le partage de fichier, basculer sur le mode PC
    triggerPcFallback();
}

// Action PC : Copie du rapport visuel dans le presse-papiers + Téléchargement PDF + Ouverture client Mail
async function triggerPcFallback() {
    const modal = document.getElementById('send-confirm-modal');
    if (modal) modal.remove();
    if (!preparedPdfBlob || !preparedPdfFile) return;

    try {
        const htmlContent = generateReportHTML(preparedRecipient);
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([`Rapport Skin Care - ${currentAircraftReport.aircraftSN}`], { type: 'text/plain' });
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]);
    } catch (e) {
        console.log("Presse-papiers HTML non supporté", e);
    }

    const url = URL.createObjectURL(preparedPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = preparedPdfFile.name;
    a.click();
    URL.revokeObjectURL(url);

    const subject = encodeURIComponent(`Rapport Inspection Skin Care - Avion ${currentAircraftReport.aircraftSN}`);
    const body = encodeURIComponent(
        `Bonjour,\n\nVeuillez trouver le rapport d'inspection pour l'avion ${currentAircraftReport.aircraftSN} (${currentAircraftReport.anomalies.length} anomalie(s)).\n\n👉 SUR PC : Faites "Ctrl + V" (Coller) ici pour insérer le rapport, ou joignez le fichier "${preparedPdfFile.name}" qui vient d'être téléchargé.`
    );
    window.location.href = `mailto:${preparedRecipient}?subject=${subject}&body=${body}`;
}
// FIN DU FICHIER APP.JS V8