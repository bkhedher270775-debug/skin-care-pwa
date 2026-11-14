// =========================================================================
// APP.JS - Skin Care (Rear Fuse Inspection PN: C013900001-001)
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

        <section class="card">
            <h2>2. Détection & Saisie d'une Anomalie</h2>
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
            <div class="form-row">
                <div class="form-group">
                    <label for="photo-zoom-out">Photo 1 : Vue de la Zone (Zoom Out)</label>
                    <input type="file" id="photo-zoom-out" accept="image/*" capture="environment" onchange="handleZoomOutUpload(this)">
                    <div id="preview-zoom-out" class="photo-preview-grid"></div>
                </div>
                <div class="form-group">
                    <label for="photo-zoom-in">Photo(s) 2 : Vue sur l'Anomalie (Zoom In)</label>
                    <input type="file" id="photo-zoom-in" accept="image/*" capture="environment" multiple onchange="handleZoomInUpload(this)">
                    <div id="preview-zoom-in" class="photo-preview-grid"></div>
                </div>
            </div>
            <button type="button" onclick="addAnomalyToAircraft()" style="margin-top: 0.5rem;">
                + Ajouter cette anomalie au rapport de l'avion ${currentAircraftReport.aircraftSN}
            </button>
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
                <button type="button" class="success" onclick="sendReportByEmail()">Envoyer le Rapport par E-mail</button>
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
}

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
            const maxDim = 900;
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

function handleZoomOutUpload(input) {
    const preview = document.getElementById('preview-zoom-out');
    if (input.files && input.files[0]) {
        compressAndReadImage(input.files[0], (dataUrl) => {
            tempZoomOutPhoto = dataUrl;
            preview.innerHTML = `<img src="${dataUrl}" class="photo-thumb" alt="Zoom Out">`;
        });
    }
}

function handleZoomInUpload(input) {
    const preview = document.getElementById('preview-zoom-in');
    if (input.files && input.files.length > 0) {
        Array.from(input.files).forEach(file => {
            compressAndReadImage(file, (dataUrl) => {
                tempZoomInPhotos.push(dataUrl);
                preview.innerHTML = tempZoomInPhotos.map(src => `<img src="${src}" class="photo-thumb" alt="Zoom In">`).join('');
            });
        });
    }
}

function addAnomalyToAircraft() {
    const snInput = document.getElementById('ac-serial');
    const opInput = document.getElementById('operator-name');
    const partSelect = document.getElementById('part-select');
    const frameSelect = document.getElementById('frame-select');
    const stringerSelect = document.getElementById('stringer-select');
    const anomalySelect = document.getElementById('anomaly-select');

    if (snInput) currentAircraftReport.aircraftSN = snInput.value.trim() || "AC 55xxx";
    if (opInput) currentAircraftReport.operatorName = opInput.value.trim();

    if (!partSelect.value || !frameSelect.value || !stringerSelect.value || !anomalySelect.value) {
        alert("Veuillez sélectionner le Part Number, le Frame, le Stringer et le Type d'anomalie.");
        return;
    }

    const partOpt = partSelect.options[partSelect.selectedIndex];
    const anomalyType = anomalySelect.value;
    let dimensionsFormatted = "";

    if (anomalyType.toLowerCase() === 'flashness') {
        const sign = document.getElementById('flash-sign') ? document.getElementById('flash-sign').value : '+0';
        const depth = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '0';
        dimensionsFormatted = `Depth : ${sign} / ${depth || '0'} inch`;
    } else {
        const l = document.getElementById('dim-length') ? document.getElementById('dim-length').value : '0';
        const w = document.getElementById('dim-width') ? document.getElementById('dim-width').value : '0';
        const d = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '0';
        dimensionsFormatted = `Length: ${l || '0'} in | Width: ${w || '0'} in | Depth: ${d || '0'} in`;
    }

    currentAircraftReport.anomalies.push({
        partName: partOpt.getAttribute('data-name'),
        partPN: partSelect.value,
        frame: frameSelect.value,
        stringer: stringerSelect.value,
        type: anomalyType,
        dimensions: dimensionsFormatted,
        zoomOutPhoto: tempZoomOutPhoto,
        zoomInPhotos: [...tempZoomInPhotos]
    });

    saveDraft();
    tempZoomOutPhoto = null;
    tempZoomInPhotos = [];
    renderApp();
}

function removeAnomalyFromAircraft(index) {
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
        <div class="anomaly-item">
            <div>
                <strong style="color: #60A5FA;">#${idx + 1} — ${anom.type.toUpperCase()}</strong>
                <div style="font-size: 0.85rem; margin-top: 0.2rem;">
                    <strong>Pièce :</strong> ${anom.partName} (PN: ${anom.partPN}) | <strong>Zone :</strong> ${anom.frame} / ${anom.stringer}<br>
                    <strong>Dimensions :</strong> ${anom.dimensions}
                </div>
            </div>
            <button type="button" class="danger small-btn" onclick="removeAnomalyFromAircraft(${idx})">Retirer</button>
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

function generateReportHTML(recipientEmail) {
    const rows = currentAircraftReport.anomalies.map((anom, i) => {
        const zoomInImgs = anom.zoomInPhotos.map(src => `<img src="${src}" style="width:160px;height:120px;object-fit:cover;border:1px solid #94a3b8;margin-right:6px;">`).join('');
        return `
            <div style="border:1px solid #cbd5e1;padding:10px;margin-bottom:12px;page-break-inside:avoid;background:#f8fafc;">
                <h3 style="color:#0F2744;margin:0 0 5px 0;">Anomalie #${i + 1} — ${anom.type.toUpperCase()}</h3>
                <p style="margin:2px 0;font-size:12px;"><strong>Pièce :</strong> ${anom.partName} (PN: ${anom.partPN}) | <strong>Zone :</strong> ${anom.frame} - ${anom.stringer}</p>
                <p style="margin:2px 0;font-size:12px;"><strong>Dimensions :</strong> ${anom.dimensions}</p>
                <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:10px;">
                    ${anom.zoomOutPhoto ? `<div><div style="font-size:10px;font-weight:bold;">Zoom Out :</div><img src="${anom.zoomOutPhoto}" style="width:160px;height:120px;object-fit:cover;border:1px solid #94a3b8;"></div>` : ''}
                    ${anom.zoomInPhotos.length > 0 ? `<div><div style="font-size:10px;font-weight:bold;">Zoom In :</div><div style="display:flex;flex-wrap:wrap;">${zoomInImgs}</div></div>` : ''}
                </div>
            </div>`;
    }).join('');

    return `
        <div style="padding:20px;background:#fff;color:#0f172a;font-family:Arial,sans-serif;">
            <h1 style="color:#0F2744;font-size:18px;border-bottom:2px solid #0F2744;padding-bottom:6px;">RAPPORT D'INSPECTION — SKIN CARE (Rear Fuse PN: C013900001-001)</h1>
            <p style="font-size:12px;margin:8px 0;"><strong>Avion SN :</strong> ${currentAircraftReport.aircraftSN} | <strong>Opérateur :</strong> ${currentAircraftReport.operatorName || 'N/A'} | <strong>Destinataire :</strong> ${recipientEmail || 'Production & Qualité'} | <strong>Date :</strong> ${new Date().toLocaleDateString()}</p>
            ${rows}
        </div>`;
}

function downloadReportPDF() {
    if (currentAircraftReport.anomalies.length === 0) return alert("Ajoutez au moins une anomalie.");
    const recipient = document.getElementById('recipient-email') ? document.getElementById('recipient-email').value : '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateReportHTML(recipient);
    document.body.appendChild(tempDiv);
    const fileName = `Rapport_SkinCare_${currentAircraftReport.aircraftSN.replace(/\s+/g, '_')}.pdf`;
    html2pdf().from(tempDiv).set({ margin: 8, filename: fileName, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).save().then(() => document.body.removeChild(tempDiv));
}

function printReportDirectly() {
    if (currentAircraftReport.anomalies.length === 0) return alert("Ajoutez au moins une anomalie.");
    const recipient = document.getElementById('recipient-email') ? document.getElementById('recipient-email').value : '';
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return alert("Autorisez les pop-ups pour imprimer.");
    w.document.write(`<html><head><title>Rapport ${currentAircraftReport.aircraftSN}</title></head><body onload="window.print();">${generateReportHTML(recipient)}</body></html>`);
    w.document.close();
}

async function sendReportByEmail() {
    if (currentAircraftReport.anomalies.length === 0) return alert("Ajoutez au moins une anomalie.");
    const recipient = document.getElementById('recipient-email') ? document.getElementById('recipient-email').value : '';
    if (!recipient) return alert("Sélectionnez ou ajoutez une adresse e-mail destinataire.");

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateReportHTML(recipient);
    document.body.appendChild(tempDiv);
    const fileName = `Rapport_SkinCare_${currentAircraftReport.aircraftSN.replace(/\s+/g, '_')}.pdf`;
    const opt = { margin: 8, filename: fileName, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };

    try {
        const pdfBlob = await html2pdf().from(tempDiv).set(opt).outputPdf('blob');
        document.body.removeChild(tempDiv);
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({ title: `Rapport ${currentAircraftReport.aircraftSN}`, text: `Destinataire: ${recipient}`, files: [pdfFile] });
        } else {
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url; a.download = fileName; a.click();
            URL.revokeObjectURL(url);
            window.location.href = `mailto:${recipient}?subject=${encodeURIComponent('Rapport Skin Care - ' + currentAircraftReport.aircraftSN)}&body=${encodeURIComponent('Bonjour,\n\nVeuillez trouver le rapport PDF téléchargé à joindre pour l\'avion ' + currentAircraftReport.aircraftSN + '.')}`;
        }
    } catch (e) {
        console.error(e);
        if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
    }
}
// FIN DU FICHIER APP.JS