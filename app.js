// =========================================================================
// APP.JS - Skin Care (Rear Fuse Inspection PN: C013900001-001)
// Conforme à 100% au cahier des charges Production & Qualité
// =========================================================================

// 1. Base de données officielle (6 Skins + 3 Service Panels)
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

// 2. Types d'anomalies officiels
const DEFAULT_ANOMALIES = [
    "depression",
    "bump",
    "Tool mark",
    "flashness",
    "scratch",
    "Paint",
    "sealing aérodynamique",
    "over step"
];

// 3. Adresses e-mail par défaut (Chef d'équipe Production & Qualité)
const DEFAULT_EMAILS = [
    "chef.production@aerospace-inspection.com",
    "chef.qualite@aerospace-inspection.com"
];

// État courant : Un seul rapport par numéro de série d'avion (AC 55xxx)
let currentAircraftReport = {
    aircraftSN: "AC 55101",
    operatorName: "",
    anomalies: []
};

// Stockage temporaire des photos de l'anomalie en cours de saisie
let tempZoomOutPhoto = null;
let tempZoomInPhotos = [];

document.addEventListener('DOMContentLoaded', () => {
    loadSavedDraft();
    renderApp();
});

// Chargement et sauvegarde automatique du rapport en cours
function saveDraft() {
    localStorage.setItem('skincare_current_draft', JSON.stringify(currentAircraftReport));
}

function loadSavedDraft() {
    const saved = localStorage.getItem('skincare_current_draft');
    if (saved) {
        try {
            currentAircraftReport = JSON.parse(saved);
        } catch (e) {
            console.error(e);
        }
    }
}

// Récupération des listes combinées (Base officielle + Ajouts Chef d'équipe)
function getPartsList() {
    const custom = JSON.parse(localStorage.getItem('skincare_custom_parts') || '[]');
    return [...DEFAULT_PARTS, ...custom];
}

function getAnomaliesList() {
    const custom = JSON.parse(localStorage.getItem('skincare_custom_anomalies') || '[]');
    return [...DEFAULT_ANOMALIES, ...custom];
}

function getEmailsList() {
    const custom = JSON.parse(localStorage.getItem('skincare_custom_emails') || '[]');
    return [...DEFAULT_EMAILS, ...custom];
}

function getFramesList() {
    let frames = [];
    // FR62 jusqu'à FR72 puis FR74 jusqu'à FR79 (FR73 n'existe pas)
    for (let i = 62; i <= 79; i++) {
        if (i === 73) continue;
        frames.push(`FR${i}`);
    }
    const customFrames = JSON.parse(localStorage.getItem('skincare_custom_frames') || '[]');
    return [...frames, ...customFrames];
}

function getStringersList() {
    let stringers = [];
    // STRG 1 à STRG 36 divisés en Left (L) et Right (R)
    for (let j = 1; j <= 36; j++) {
        stringers.push({ code: `STRG ${j}L`, num: j, side: 'L' });
        stringers.push({ code: `STRG ${j}R`, num: j, side: 'R' });
    }
    const customStrg = JSON.parse(localStorage.getItem('skincare_custom_stringers') || '[]');
    return [...stringers, ...customStrg];
}

// Rendu principal de l'interface
function renderApp() {
    const container = document.getElementById('inspection-container');
    if (!container) return;

    const parts = getPartsList();
    const frames = getFramesList();
    const stringers = getStringersList();
    const anomalies = getAnomaliesList();
    const emails = getEmailsList();

    let partOptions = '<option value="">-- Sélectionner la Skin ou le Panneau --</option>';
    parts.forEach(p => {
        partOptions += `<option value="${p.pn}" data-name="${p.name}" data-cat="${p.category}">${p.name} — PN: ${p.pn}</option>`;
    });

    let frameOptions = '<option value="">-- Sélectionner Frame (FR) --</option>';
    frames.forEach(f => {
        frameOptions += `<option value="${f}">${f}</option>`;
    });

    let stringerOptions = '<option value="">-- Sélectionner Stringer (STRG L/R) --</option>';
    stringers.forEach(s => {
        stringerOptions += `<option value="${s.code}" data-num="${s.num}">${s.code}</option>`;
    });

    let anomalyOptions = '<option value="">-- Sélectionner le type d\'anomalie --</option>';
    anomalies.forEach(a => {
        anomalyOptions += `<option value="${a}">${a}</option>`;
    });

    let emailOptions = '<option value="">-- Choisir l\'adresse e-mail destinataire --</option>';
    emails.forEach(e => {
        emailOptions += `<option value="${e}">${e}</option>`;
    });

    container.innerHTML = `
        <!-- 1. IDENTIFICATION AVION -->
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
                    <input type="text" id="operator-name" value="${currentAircraftReport.operatorName}" placeholder="Nom ou matricule opérateur" onchange="updateAircraftHeader()">
                </div>
            </div>
        </section>

        <!-- 2. SAISIE D'UNE ANOMALIE -->
        <section class="card">
            <h2>2. Détection & Saisie d'une Anomalie</h2>

            <div class="form-group">
                <label for="part-select">Pièce : Skin ou Service Panel (Part Number)</label>
                <select id="part-select" onchange="handlePartOrAnomalyChange()">
                    ${partOptions}
                </select>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="frame-select">Zone — Frame (FR62 à FR72, FR74 à FR79)</label>
                    <select id="frame-select" onchange="enforceStringerRules()">
                        ${frameOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="stringer-select">Zone — Stringer (STRG 1L/R à 36L/R)</label>
                    <select id="stringer-select">
                        ${stringerOptions}
                    </select>
                    <div id="stringer-rule-warning" class="warning-banner">
                        À partir de FR74, les stringers STRG 24 et STRG 33 (Left et Right) n'existent pas et sont désactivés.
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label for="anomaly-select">Type d'Anomalie</label>
                <select id="anomaly-select" onchange="handlePartOrAnomalyChange()">
                    ${anomalyOptions}
                </select>
                <div id="overstep-rule-warning" class="warning-banner">
                    Refusé : L'anomalie "over step" s'applique uniquement aux panneaux de service (Cargo, Water, Waste service panel).
                </div>
            </div>

            <!-- Zone dynamique des dimensions en pouces (inch) -->
            <div id="dimensions-wrapper" class="dimensions-box">
                <p style="font-size: 0.85rem; color: var(--text-muted);">
                    Sélectionnez un type d'anomalie pour afficher les champs de dimensions (Unité : <strong>inch</strong>).
                </p>
            </div>

            <!-- Prise de photos : Zoom Out (Zone) et Zoom In (Anomalie) -->
            <div class="form-row">
                <div class="form-group">
                    <label for="photo-zoom-out">Photo 1 : Vue de la Zone (Zoom Out)</label>
                    <input type="file" id="photo-zoom-out" accept="image/*" capture="environment" onchange="handleZoomOutUpload(this)">
                    <div id="preview-zoom-out" class="photo-preview-grid"></div>
                </div>
                <div class="form-group">
                    <label for="photo-zoom-in">Photo(s) 2 : Vue sur l'Anomalie (Zoom In - Plusieurs possibles)</label>
                    <input type="file" id="photo-zoom-in" accept="image/*" capture="environment" multiple onchange="handleZoomInUpload(this)">
                    <div id="preview-zoom-in" class="photo-preview-grid"></div>
                </div>
            </div>

            <button type="button" onclick="addAnomalyToAircraft()" style="margin-top: 0.5rem;">
                + Ajouter cette anomalie au rapport de l'avion ${currentAircraftReport.aircraftSN}
            </button>
        </section>

        <!-- 3. RAPPORT DE L'AVION & ENVOI EMAIL / IMPRESSION -->
        <section class="card">
            <h2>
                <span>3. Rapport Global de l'Avion (${currentAircraftReport.aircraftSN})</span>
                <span style="font-size: 0.85rem; color: #34D399;">${currentAircraftReport.anomalies.length} anomalie(s)</span>
            </h2>

            <div id="aircraft-anomalies-list"></div>

            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1rem 0;">

            <div class="form-group">
                <label for="recipient-email">Adresse E-mail du Destinataire (Chef d'équipe Production / Qualité)</label>
                <select id="recipient-email">
                    ${emailOptions}
                </select>
                <div class="email-inline-add">
                    <input type="email" id="new-email-input" placeholder="L'adresse n'existe pas ? Ajouter un nouvel e-mail ici...">
                    <button type="button" class="secondary small-btn" onclick="addNewEmail()">+ Ajouter E-mail</button>
                </div>
            </div>

            <div class="form-row" style="margin-top: 1rem;">
                <button type="button" class="success" onclick="sendReportByEmail()">
                    Envoyer le Rapport avec Photos par E-mail
                </button>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" onclick="downloadReportPDF()">Télécharger PDF</button>
                    <button type="button" class="secondary" onclick="printReportDirectly()">Imprimer le Rapport</button>
                </div>
            </div>
        </section>

        <!-- 4. ESPACE CHEF D'ÉQUIPE PRODUCTION OU QUALITÉ (AJOUTS BDD) -->
        <section class="card card-admin">
            <h2>4. Espace Chef d'Équipe Production / Qualité — Ajout Base de Données</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
                Permet d'ajouter une pièce/skin (Nom + Part Number), un type d'anomalie ou une zone absente de la liste d'origine.
            </p>

            <div class="form-row-3">
                <!-- Ajouter une pièce / skin -->
                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>Ajouter Pièce / Skin</h3>
                    <div class="form-group">
                        <input type="text" id="admin-part-name" placeholder="Nom (ex: Aft Fairing)">
                        <input type="text" id="admin-part-pn" placeholder="Part Number (PN)">
                        <select id="admin-part-cat">
                            <option value="skin">Catégorie : Skin</option>
                            <option value="panel">Catégorie : Service Panel</option>
                        </select>
                        <button type="button" class="small-btn" onclick="adminAddPart()" style="width:100%;">Ajouter Pièce</button>
                    </div>
                </div>

                <!-- Ajouter un type d'anomalie -->
                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>Ajouter Type d'Anomalie</h3>
                    <div class="form-group">
                        <input type="text" id="admin-anomaly-name" placeholder="Ex: Delamination">
                        <button type="button" class="small-btn" onclick="adminAddAnomaly()" style="width:100%; margin-top: 0.5rem;">Ajouter Anomalie</button>
                    </div>
                </div>

                <!-- Ajouter une zone (Frame ou Stringer) -->
                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>Ajouter une Zone</h3>
                    <div class="form-group">
                        <input type="text" id="admin-zone-frame" placeholder="Nouveau Frame (ex: FR80)">
                        <button type="button" class="small-btn" onclick="adminAddFrame()" style="width:100%;">+ Ajouter Frame</button>
                        <input type="text" id="admin-zone-strg" placeholder="Nouveau Stringer (ex: STRG 37L)" style="margin-top:0.4rem;">
                        <button type="button" class="small-btn" onclick="adminAddStringer()" style="width:100%;">+ Ajouter Stringer</button>
                    </div>
                </div>
            </div>
        </section>
    `;

    renderAnomaliesList();
}

// Mise à jour de l'en-tête Avion
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
    currentAircraftReport = {
        aircraftSN: newSN.trim() || "AC 55xxx",
        operatorName: currentAircraftReport.operatorName,
        anomalies: []
    };
    saveDraft();
    renderApp();
}

// RÈGLE : À partir de FR74, STRG 24 et STRG 33 (Left ou Right) n'existent pas
function enforceStringerRules() {
    const frameSelect = document.getElementById('frame-select');
    const stringerSelect = document.getElementById('stringer-select');
    const warning = document.getElementById('stringer-rule-warning');
    if (!frameSelect || !stringerSelect) return;

    const frameVal = frameSelect.value;
    const frameNum = parseInt(frameVal.replace(/[^0-9]/g, ''), 10);
    const isAftOf74 = !isNaN(frameNum) && frameNum >= 74;

    let resetTriggered = false;
    for (let i = 0; i < stringerSelect.options.length; i++) {
        const opt = stringerSelect.options[i];
        const num = parseInt(opt.getAttribute('data-num'), 10);

        if (isAftOf74 && (num === 24 || num === 33)) {
            opt.disabled = true;
            opt.textContent = `${opt.value} (Inexistant sur >= FR74)`;
            if (stringerSelect.value === opt.value) {
                stringerSelect.value = "";
                resetTriggered = true;
            }
        } else if (opt.value) {
            opt.disabled = false;
            opt.textContent = opt.value;
        }
    }

    warning.style.display = (isAftOf74 || resetTriggered) ? 'block' : 'none';
}

// RÈGLE : Over step uniquement sur les panneaux de service + Champs de dimensions en inch
function handlePartOrAnomalyChange() {
    const partSelect = document.getElementById('part-select');
    const anomalySelect = document.getElementById('anomaly-select');
    const overstepWarning = document.getElementById('overstep-rule-warning');
    const dimWrapper = document.getElementById('dimensions-wrapper');

    if (!partSelect || !anomalySelect || !dimWrapper) return;

    const selectedPartOpt = partSelect.options[partSelect.selectedIndex];
    const partCategory = selectedPartOpt ? selectedPartOpt.getAttribute('data-cat') : null;
    const anomalyType = anomalySelect.value;

    // Vérification stricte pour "over step"
    if (anomalyType.toLowerCase() === 'over step' && partCategory !== 'panel') {
        overstepWarning.style.display = 'block';
        anomalySelect.value = "";
        dimWrapper.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Veuillez choisir un panneau de service pour sélectionner "over step", ou choisissez un autre type d'anomalie.</p>`;
        return;
    } else {
        overstepWarning.style.display = 'none';
    }

    if (!anomalyType) {
        dimWrapper.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Sélectionnez un type d'anomalie pour afficher les champs de dimensions (Unité : <strong>inch</strong>).</p>`;
        return;
    }

    // RÈGLE : Dans le cas de flashness, il y a seulement la valeur depth (+ zéro ou - zéro) qui s'affiche
    if (anomalyType.toLowerCase() === 'flashness') {
        dimWrapper.innerHTML = `
            <h3>Dimensions — Flashness (Unité : inch)</h3>
            <div class="form-row">
                <div class="form-group" style="margin-bottom:0;">
                    <label for="flash-sign">Orientation (+ zéro / - zéro)</label>
                    <select id="flash-sign">
                        <option value="+0">+ zéro (Au-dessus / Positif)</option>
                        <option value="-0">- zéro (En-dessous / Négatif)</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-depth">Valeur Depth ( en inch )</label>
                    <input type="number" step="0.0001" id="dim-depth" placeholder="Ex: 0.005 (inch)">
                </div>
            </div>
        `;
    } else if (anomalyType.toLowerCase() === 'scratch') {
        dimWrapper.innerHTML = `
            <h3>Dimensions — Scratch (Unité : inch)</h3>
            <div class="form-row-3">
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-length">Longueur / Length (inch)</label>
                    <input type="number" step="0.001" id="dim-length" placeholder="Ex: 1.250 in">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-width">Largeur / Width (inch)</label>
                    <input type="number" step="0.001" id="dim-width" placeholder="Ex: 0.050 in">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-depth">Profondeur / Depth (inch)</label>
                    <input type="number" step="0.0001" id="dim-depth" placeholder="Ex: 0.002 in">
                </div>
            </div>
            <div class="form-group" style="margin-top: 0.75rem; margin-bottom:0;">
                <label for="dim-notes">Observation complémentaire / Test Clad (optionnel)</label>
                <input type="text" id="dim-notes" placeholder="Précisions sur la rayure...">
            </div>
        `;
    } else {
        dimWrapper.innerHTML = `
            <h3>Dimensions — ${anomalyType} (Unité : inch)</h3>
            <div class="form-row-3">
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-length">Longueur / Length (inch)</label>
                    <input type="number" step="0.001" id="dim-length" placeholder="Ex: 2.000 in">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-width">Largeur / Width (inch)</label>
                    <input type="number" step="0.001" id="dim-width" placeholder="Ex: 1.000 in">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="dim-depth">Profondeur ou Hauteur / Depth (inch)</label>
                    <input type="number" step="0.0001" id="dim-depth" placeholder="Ex: 0.015 in">
                </div>
            </div>
        `;
    }
}

// Gestion des photos (Compression automatique pour un PDF fluide et rapide)
function compressAndReadImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDim = 900;
            let width = img.width;
            let height = img.height;

            if (width > height && width > maxDim) {
                height *= maxDim / width;
                width = maxDim;
            } else if (height > maxDim) {
                width *= maxDim / height;
                height = maxDim;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
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

// Ajout d'une anomalie au rapport de l'avion
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
        alert("Veuillez sélectionner le Part Number (Skin/Panel), le Frame, le Stringer et le Type d'anomalie.");
        return;
    }

    const partOpt = partSelect.options[partSelect.selectedIndex];
    const partName = partOpt.getAttribute('data-name');
    const partPN = partSelect.value;
    const anomalyType = anomalySelect.value;

    // Récupération des dimensions en inch
    let dimensionsFormatted = "";
    if (anomalyType.toLowerCase() === 'flashness') {
        const sign = document.getElementById('flash-sign') ? document.getElementById('flash-sign').value : '+0';
        const depth = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '0';
        if (!depth) {
            alert("Veuillez saisir la valeur Depth (en inch) pour le flashness.");
            return;
        }
        dimensionsFormatted = `Depth : ${sign} / ${depth} inch`;
    } else {
        const l = document.getElementById('dim-length') ? document.getElementById('dim-length').value : '';
        const w = document.getElementById('dim-width') ? document.getElementById('dim-width').value : '';
        const d = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '';
        const notes = document.getElementById('dim-notes') ? document.getElementById('dim-notes').value : '';
        dimensionsFormatted = `Length: ${l || '0'} in | Width: ${w || '0'} in | Depth: ${d || '0'} in${notes ? ' (' + notes + ')' : ''}`;
    }

    const newAnomaly = {
        id: Date.now(),
        partName: partName,
        partPN: partPN,
        frame: frameSelect.value,
        stringer: stringerSelect.value,
        type: anomalyType,
        dimensions: dimensionsFormatted,
        zoomOutPhoto: tempZoomOutPhoto,
        zoomInPhotos: [...tempZoomInPhotos],
        timestamp: new Date().toLocaleString()
    };

    currentAircraftReport.anomalies.push(newAnomaly);
    saveDraft();

    // Réinitialisation des champs d'anomalie pour pouvoir en saisir une autre sur le même avion
    tempZoomOutPhoto = null;
    tempZoomInPhotos = [];
    renderApp();
    alert(`Anomalie "${anomalyType}" ajoutée au rapport de l'avion ${currentAircraftReport.aircraftSN}.`);
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
                <strong style="color: #60A5FA; font-size: 1rem;">#${idx + 1} — ${anom.type.toUpperCase()}</strong>
                <div style="font-size: 0.88rem; margin-top: 0.2rem;">
                    <strong>Pièce :</strong> ${anom.partName} (PN: ${anom.partPN})<br>
                    <strong>Zone :</strong> ${anom.frame} / ${anom.stringer}<br>
                    <strong>Dimensions :</strong> ${anom.dimensions}<br>
                    <strong>Photos jointes :</strong> ${anom.zoomOutPhoto ? '1 Zoom Out' : '0 Zoom Out'} + ${anom.zoomInPhotos.length} Zoom In
                </div>
            </div>
            <button type="button" class="danger small-btn" onclick="removeAnomalyFromAircraft(${idx})">Retirer</button>
        </div>
    `).join('');
}

// Ajout d'une nouvelle adresse e-mail si elle n'existe pas
function addNewEmail() {
    const input = document.getElementById('new-email-input');
    if (!input || !input.value.trim()) {
        alert("Veuillez saisir une adresse e-mail valide.");
        return;
    }
    const email = input.value.trim();
    let customEmails = JSON.parse(localStorage.getItem('skincare_custom_emails') || '[]');
    if (!customEmails.includes(email) && !DEFAULT_EMAILS.includes(email)) {
        customEmails.push(email);
        localStorage.setItem('skincare_custom_emails', JSON.stringify(customEmails));
    }
    renderApp();
    document.getElementById('recipient-email').value = email;
}

// Fonctions d'ajout Administrateur / Chef d'équipe Production & Qualité
function adminAddPart() {
    const name = document.getElementById('admin-part-name').value.trim();
    const pn = document.getElementById('admin-part-pn').value.trim();
    const category = document.getElementById('admin-part-cat').value;
    if (!name || !pn) {
        alert("Veuillez renseigner le nom et le Part Number de la pièce.");
        return;
    }
    let custom = JSON.parse(localStorage.getItem('skincare_custom_parts') || '[]');
    custom.push({ name, pn, category });
    localStorage.setItem('skincare_custom_parts', JSON.stringify(custom));
    renderApp();
    alert(`Pièce "${name} (${pn})" ajoutée à la base de données.`);
}

function adminAddAnomaly() {
    const name = document.getElementById('admin-anomaly-name').value.trim();
    if (!name) {
        alert("Veuillez saisir le nom du type d'anomalie.");
        return;
    }
    let custom = JSON.parse(localStorage.getItem('skincare_custom_anomalies') || '[]');
    custom.push(name);
    localStorage.setItem('skincare_custom_anomalies', JSON.stringify(custom));
    renderApp();
    alert(`Type d'anomalie "${name}" ajouté à la base de données.`);
}

function adminAddFrame() {
    const frame = document.getElementById('admin-zone-frame').value.trim().toUpperCase();
    if (!frame) return;
    let custom = JSON.parse(localStorage.getItem('skincare_custom_frames') || '[]');
    custom.push(frame);
    localStorage.setItem('skincare_custom_frames', JSON.stringify(custom));
    renderApp();
    alert(`Frame "${frame}" ajouté à la base de données.`);
}

function adminAddStringer() {
    const strg = document.getElementById('admin-zone-strg').value.trim().toUpperCase();
    if (!strg) return;
    let custom = JSON.parse(localStorage.getItem('skincare_custom_stringers') || '[]');
    const numMatch = strg.match(/\d+/);
    custom.push({ code: strg, num: numMatch ? parseInt(numMatch[0], 10) : 99, side: '' });
    localStorage.setItem('skincare_custom_stringers', JSON.stringify(custom));
    renderApp();
    alert(`Stringer "${strg}" ajouté à la base de données.`);
}

// Construction du HTML officiel du rapport par avion
function generateReportHTML(recipientEmail) {
    const anomaliesRows = currentAircraftReport.anomalies.map((anom, i) => {
        const zoomInImgs = anom.zoomInPhotos.map(src =>
            `<img src="${src}" style="width: 170px; height: 130px; object-fit: cover; border: 1px solid #94a3b8; border-radius: 4px; margin-right: 6px;">`
        ).join('');

        return `
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 15px; page-break-inside: avoid; background: #f8fafc;">
                <h3 style="color: #0F2744; margin: 0 0 6px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                    Anomalie #${i + 1} — ${anom.type.toUpperCase()}
                </h3>
                <p style="margin: 3px 0; font-size: 13px;"><strong>Skin / Panneau :</strong> ${anom.partName} — <strong>PN :</strong> ${anom.partPN}</p>
                <p style="margin: 3px 0; font-size: 13px;"><strong>Zone :</strong> Frame ${anom.frame} | Stringer ${anom.stringer}</p>
                <p style="margin: 3px 0; font-size: 13px;"><strong>Dimensions (inch) :</strong> ${anom.dimensions}</p>
                <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 12px;">
                    ${anom.zoomOutPhoto ? `
                        <div>
                            <div style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Photo Zone (Zoom Out) :</div>
                            <img src="${anom.zoomOutPhoto}" style="width: 170px; height: 130px; object-fit: cover; border: 1px solid #94a3b8; border-radius: 4px;">
                        </div>
                    ` : ''}
                    ${anom.zoomInPhotos.length > 0 ? `
                        <div>
                            <div style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Photo(s) Anomalie (Zoom In) :</div>
                            <div style="display: flex; flex-wrap: wrap;">${zoomInImgs}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="padding: 20px; background: #ffffff; color: #0f172a; font-family: Arial, sans-serif;">
            <div style="border-bottom: 3px solid #0F2744; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="color: #0F2744; font-size: 20px; margin: 0;">RAPPORT D'INSPECTION AÉRONAUTIQUE — SKIN CARE</h1>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #475569;">Ensemble : Rear Fuse PN: C013900001-001 | Unité de mesure : INCH</p>
                </div>
                <div style="text-align: right; font-size: 13px;">
                    <strong>Avion SN : ${currentAircraftReport.aircraftSN}</strong><br>
                    <span>Date : ${new Date().toLocaleDateString()}</span>
                </div>
            </div>

            <div style="background: #e2e8f0; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 13px;">
                <strong>Numéro de Série Avion :</strong> ${currentAircraftReport.aircraftSN} &nbsp;|&nbsp;
                <strong>Opérateur Production :</strong> ${currentAircraftReport.operatorName || 'Non spécifié'} &nbsp;|&nbsp;
                <strong>Destinataire :</strong> ${recipientEmail || 'Chef d\'équipe Production & Qualité'} &nbsp;|&nbsp;
                <strong>Nombre total d'anomalies :</strong> ${currentAircraftReport.anomalies.length}
            </div>

            ${anomaliesRows}
        </div>
    `;
}

// Télécharger le rapport PDF unique de l'avion
function downloadReportPDF() {
    if (currentAircraftReport.anomalies.length === 0) {
        alert("Veuillez ajouter au moins une anomalie avant de générer le rapport PDF.");
        return;
    }
    const emailSelect = document.getElementById('recipient-email');
    const recipient = emailSelect ? emailSelect.value : '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateReportHTML(recipient);
    document.body.appendChild(tempDiv);

    const fileName = `Rapport_SkinCare_${currentAircraftReport.aircraftSN.replace(/\s+/g, '_')}.pdf`;
    const opt = {
        margin: 8,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(tempDiv).set(opt).save().then(() => {
        document.body.removeChild(tempDiv);
    });
}

// Impression directe du rapport
function printReportDirectly() {
    if (currentAircraftReport.anomalies.length === 0) {
        alert("Veuillez ajouter au moins une anomalie avant d'imprimer le rapport.");
        return;
    }
    const emailSelect = document.getElementById('recipient-email');
    const recipient = emailSelect ? emailSelect.value : '';
    const htmlContent = generateReportHTML(recipient);

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        alert("Veuillez autoriser les fenêtres pop-up pour imprimer le rapport.");
        return;
    }
    printWindow.document.write(`
        <html>
        <head><title>Impression Rapport - ${currentAircraftReport.aircraftSN}</title></head>
        <body onload="window.print();">${htmlContent}</body>
        </html>
    `);
    printWindow.document.close();
}

// Envoi du rapport avec photos à l'adresse e-mail sélectionnée
async function sendReportByEmail() {
    if (currentAircraftReport.anomalies.length === 0) {
        alert("Veuillez ajouter au moins une anomalie au rapport de l'avion avant l'envoi.");
        return;
    }

    const emailSelect = document.getElementById('recipient-email');
    const recipient = emailSelect ? emailSelect.value : '';
    if (!recipient) {
        alert("Veuillez sélectionner une adresse e-mail destinataire (ou en ajouter une nouvelle).");
        return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateReportHTML(recipient);
    document.body.appendChild(tempDiv);

    const cleanSN = currentAircraftReport.aircraftSN.replace(/\s+/g, '_');
    const fileName = `Rapport_SkinCare_${cleanSN}.pdf`;

    const opt = {
        margin: 8,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        const pdfBlob = await html2pdf().from(tempDiv).set(opt).outputPdf('blob');
        document.body.removeChild(tempDiv);

        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // Sur smartphone : ouverture du partage natif avec le PDF joint
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
                title: `Rapport Skin Care - ${currentAircraftReport.aircraftSN}`,
                text: `Destinataire : ${recipient}\nRapport d'inspection Rear Fuse (${currentAircraftReport.anomalies.length} anomalie(s)) pour l'avion ${currentAircraftReport.aircraftSN}.`,
                files: [pdfFile]
            });
        } else {
            // Sur PC ou navigateur sans Web Share : téléchargement du PDF + ouverture de l'e-mail à l'adresse sélectionnée
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            const subject = encodeURIComponent(`Rapport Inspection Skin Care - Avion ${currentAircraftReport.aircraftSN}`);
            const body = encodeURIComponent(
                `Bonjour,\n\nVeuillez trouver ci-joint le rapport d'inspection pour l'avion ${currentAircraftReport.aircraftSN} (${currentAircraftReport.anomalies.length} anomalie(s) recensée(s)).\n\nNote : Le rapport PDF complet avec photos ("${fileName}") vient d'être téléchargé sur votre appareil, merci de le glisser en pièce jointe de cet e-mail.`
            );
            window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
        }
    } catch (e) {
        console.error("Erreur lors de l'envoi :", e);
        if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
    }
}
