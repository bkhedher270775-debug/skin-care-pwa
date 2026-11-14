// =================================================================
// APP.JS - Skin Care (Rear Fuse Inspection) - Complet & Conforme
// =================================================================

// Base de données par défaut (extensible par l'administrateur)
const DB_PARTS = [
    { name: "Top skin", pn: "C01391101-105", type: "skin" },
    { name: "Upper R/h skin", pn: "C01391401-103", type: "skin" },
    { name: "Upper l/h skin", pn: "C01391201-103", type: "skin" },
    { name: "Lower r/h skin", pn: "C01392401-101", type: "skin" },
    { name: "Lower l/h skin", pn: "C01392201-101", type: "skin" },
    { name: "Lower skin", pn: "C01392101-103", type: "skin" },
    { name: "Cargo service panel", pn: "C01392118-101", type: "panel" },
    { name: "Water service panel", pn: "C01392415-101", type: "panel" },
    { name: "Waste service panel", pn: "C01392116-101", type: "panel" }
];

const DB_ANOMALIES = [
    "depression", "bump", "Tool mark", "flashness", "scratch", "Paint", "sealing aérodynamique", "over step"
];

// État de l'inspection en cours pour l'avion
let currentInspection = {
    serial: "AC 55101",
    anomalies: []
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Skin Care initialisée.");
    loadCustomDatabase();
    initApp();
});

function initApp() {
    renderMainInterface();
}

function renderMainInterface() {
    const container = document.getElementById('inspection-container');
    if (!container) return;

    // Construction des options de Cadres (FR62-72 et FR74-79, sans FR73)
    let frameOptions = '<option value="">Sélectionner le cadre...</option>';
    for (let i = 62; i <= 79; i++) {
        if (i === 73) continue; // FR73 n'existe pas
        frameOptions += `<option value="FR${i}">FR ${i}</option>`;
    }

    // Construction des options de Stringers (1 à 36 avec L et R)
    let stringerOptions = '<option value="">Sélectionner le stringer...</option>';
    for (let j = 1; j <= 36; j++) {
        stringerOptions += `<option value="STRG ${j}L">STRG ${j}L (Left)</option>`;
        stringerOptions += `<option value="STRG ${j}R">STRG ${j}R (Right)</option>`;
    }

    // Chargement des Part Numbers (avec ajouts personnalisés éventuels)
    let customParts = JSON.parse(localStorage.getItem('custom_parts') || '[]');
    let allParts = [...DB_PARTS, ...customParts];
    let partOptions = '<option value="">Sélectionner la skin ou le panneau...</option>';
    allParts.forEach(p => {
        partOptions += `<option value="${p.pn}" data-type="${p.type}">${p.name} (PN: ${p.pn})</option>`;
    });

    // Chargement des types d'anomalies (avec ajouts personnalisés)
    let customAnom = JSON.parse(localStorage.getItem('custom_anomalies') || '[]');
    let allAnomalies = [...DB_ANOMALIES, ...customAnom];
    let anomOptions = '<option value="">Sélectionner le type d\'anomalie...</option>';
    allAnomalies.forEach(a => {
        anomOptions += `<option value="${a}">${a}</option>`;
    });

    container.innerHTML = `
        <div class="card">
            <h2>Identification de l'Avion</h2>
            <div class="form-group">
                <label for="ac-serial">Numéro de Série Avion (ex: AC 55xxx)</label>
                <input type="text" id="ac-serial" value="${currentInspection.serial}" placeholder="AC 55xxx">
            </div>
        </div>

        <div class="card" style="margin-top: 1rem;">
            <h2>Enregistrement d'une Anomalie</h2>
            
            <div class="form-group">
                <label for="part-select">Skin ou Panneau de service (Part Number)</label>
                <select id="part-select" onchange="checkPartType()">
                    ${partOptions}
                </select>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="frame-select">Cadre (Frame)</label>
                    <select id="frame-select" onchange="validateStringerRules()">
                        ${frameOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="stringer-select">Stringer (L / R)</label>
                    <select id="stringer-select">
                        ${stringerOptions}
                    </select>
                    <small id="stringer-warning" style="color: var(--accent-red); display: none; margin-top: 0.25rem;">
                        Règle aéro : Les stringers 24 et 33 (L ou R) sont interdits à partir de FR74.
                    </small>
                </div>
            </div>

            <div class="form-group">
                <label for="anomaly-type">Type d'Anomalie</label>
                <select id="anomaly-type" onchange="renderDimensionFields()">
                    ${anomOptions}
                </select>
                <small id="overstep-warning" style="color: var(--accent-red); display: none; margin-top: 0.25rem;">
                    Règle : L'anomalie "over step" est strictement réservée aux panneaux de service.
                </small>
            </div>

            <!-- Dimensions dynamiques en pouces (inch) -->
            <div id="dimensions-container" class="form-group" style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 6px;">
                <p style="font-size:0.85rem; color:var(--text-muted);">Sélectionnez un type d'anomalie pour saisir les dimensions en pouces (inch).</p>
            </div>

            <!-- Double Capture Photo -->
            <div class="form-row" style="margin-top: 1rem;">
                <div class="form-group">
                    <label for="photo-zoomout">1. Photo Zone / Vue d'ensemble (Zoom Out)</label>
                    <input type="file" id="photo-zoomout" accept="image/*" capture="environment" onchange="previewImage(this, 'preview-out')">
                    <div id="preview-out" style="margin-top: 0.5rem;"></div>
                </div>
                <div class="form-group">
                    <label for="photo-zoomin">2. Photo Anomalie / Rapprochée (Zoom In)</label>
                    <input type="file" id="photo-zoomin" accept="image/*" capture="environment" onchange="previewImage(this, 'preview-in')">
                    <div id="preview-in" style="margin-top: 0.5rem;"></div>
                </div>
            </div>

            <button type="button" onclick="addAnomalyToInspection()" style="background-color: var(--accent-blue); margin-top: 1rem;">
                + Ajouter cette anomalie au rapport de l'avion
            </button>
        </div>

        <div class="card" style="margin-top: 1.5rem;">
            <h2>Rapport Global de l'Avion (<span id="anom-count">0</span> anomalie(s) enregistrée(s))</h2>
            <div id="anomalies-list" style="margin-bottom: 1rem;">
                <p style="color: var(--text-muted); font-size: 0.9rem;">Aucune anomalie ajoutée pour l'instant.</p>
            </div>

            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button type="button" class="success" onclick="generateAndSendReport()" style="flex: 1;">Envoyer le Rapport par E-mail</button>
                <button type="button" onclick="downloadPDFReport()" style="flex: 1; background-color: #475569;">Imprimer / Télécharger le PDF</button>
            </div>
        </div>

        <div class="card" style="margin-top: 1.5rem; border-style: dashed;">
            <h2>Panneau Admin / Chef d'équipe (Extensions)</h2>
            <div class="form-row">
                <div class="form-group">
                    <input type="text" id="new-part-name" placeholder="Nom de la nouvelle pièce / skin">
                    <input type="text" id="new-part-pn" placeholder="Part Number (PN)" style="margin-top:5px;">
                    <select id="new-part-type" style="margin-top:5px;">
                        <option value="skin">Skin</option>
                        <option value="panel">Service Panel</option>
                    </select>
                    <button type="button" onclick="addNewCustomPart()" style="margin-top:5px; background:#0284c7;">Ajouter Pièce</button>
                </div>
                <div class="form-group">
                    <input type="text" id="new-anom-name" placeholder="Nouveau type d'anomalie">
                    <button type="button" onclick="addNewCustomAnomaly()" style="margin-top:5px; background:#0284c7;">Ajouter Type d'Anomalie</button>
                </div>
            </div>
        </div>
    `;
    updateAnomaliesDisplay();
}

// Validation des règles Stringers (FR74+ interdit 24 et 33)
function validateStringerRules() {
    const frameSelect = document.getElementById('frame-select');
    const stringerSelect = document.getElementById('stringer-select');
    const warning = document.getElementById('stringer-warning');
    if (!frameSelect || !stringerSelect) return;

    const frameVal = frameSelect.value;
    if (!frameVal) return;
    const frameNum = parseInt(frameVal.replace('FR', ''), 10);

    const options = stringerSelect.options;
    for (let i = 0; i < options.length; i++) {
        const val = options[i].value;
        if (!val) continue;
        // Vérifie si le stringer contient 24 ou 33 (ex: STRG 24L, STRG 33R)
        const is24Or33 = val.includes(' 24') || val.includes(' 33');

        if (frameNum >= 74 && is24Or33) {
            options[i].disabled = true;
            options[i].style.color = '#64748B';
        } else {
            options[i].disabled = false;
            options[i].style.color = '#F8FAFC';
        }
    }

    if (frameNum >= 74 && (stringerSelect.value.includes(' 24') || stringerSelect.value.includes(' 33'))) {
        stringerSelect.value = "";
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
}

// Vérification de la règle "over step" (uniquement sur service panel)
function checkPartType() {
    const partSelect = document.getElementById('part-select');
    const anomSelect = document.getElementById('anomaly-type');
    const warning = document.getElementById('overstep-warning');
    if (!partSelect || !anomSelect) return;

    const selectedOpt = partSelect.options[partSelect.selectedIndex];
    const partType = selectedOpt.getAttribute('data-type');

    if (anomSelect.value === 'over step' && partType !== 'panel') {
        warning.style.display = 'block';
        anomSelect.value = "";
        renderDimensionFields();
    } else {
        warning.style.display = 'none';
    }
}

// Affichage dynamique des champs de dimensions selon l'anomalie (en inch)
function renderDimensionFields() {
    const anomType = document.getElementById('anomaly-type').value;
    const container = document.getElementById('dimensions-container');
    const partSelect = document.getElementById('part-select');
    const warning = document.getElementById('overstep-warning');

    if (anomType === 'over step') {
        const selectedOpt = partSelect.options[partSelect.selectedIndex];
        if (selectedOpt && selectedOpt.getAttribute('data-type') !== 'panel') {
            warning.style.display = 'block';
            document.getElementById('anomaly-type').value = "";
            container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">Sélectionnez un type d'anomalie.</p>`;
            return;
        } else {
            warning.style.display = 'none';
        }
    } else {
        warning.style.display = 'none';
    }

    if (!anomType) {
        container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">Sélectionnez un type d'anomalie pour saisir les dimensions en pouces (inch).</p>`;
        return;
    }

    if (anomType === 'flashness') {
        container.innerHTML = `
            <label>Dimensions - Flashness (Unité : inch)</label>
            <div class="form-group" style="margin-top:5px;">
                <label>Depth (+0 / -0) :</label>
                <input type="text" id="dim-depth" placeholder="Ex: +0.005 ou -0.002 (inch)">
            </div>
        `;
    } else if (anomType === 'scratch') {
        container.innerHTML = `
            <label>Dimensions & Contrôle - Scratch (Unité : inch)</label>
            <div class="form-row" style="margin-top:5px;">
                <input type="text" id="dim-length" placeholder="Longueur (inch)">
                <input type="text" id="dim-width" placeholder="Largeur (inch)">
                <input type="text" id="dim-depth" placeholder="Profondeur (inch)">
            </div>
            <div class="form-group" style="margin-top:10px;">
                <label>Test Clad Validé :</label>
                <select id="clad-test">
                    <option value="Positif (+)">Positif (+)</option>
                    <option value="Négatif (-)">Négatif (-)</option>
                </select>
            </div>
        `;
    } else {
        container.innerHTML = `
            <label>Dimensions - ${anomType} (Unité : inch)</label>
            <div class="form-row" style="margin-top:5px;">
                <input type="text" id="dim-length" placeholder="Longueur (inch)">
                <input type="text" id="dim-width" placeholder="Largeur (inch)">
                <input type="text" id="dim-depth" placeholder="Profondeur (inch)">
            </div>
        `;
    }
}

// Aperçu des images
function previewImage(input, previewId) {
    const previewContainer = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewContainer.innerHTML = `<img src="${e.target.result}" style="max-width:100%; height:120px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color);">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Ajouter l'anomalie à la liste de l'avion en cours
function addAnomalyToInspection() {
    const serialInput = document.getElementById('ac-serial');
    const partSelect = document.getElementById('part-select');
    const frameSelect = document.getElementById('frame-select');
    const stringerSelect = document.getElementById('stringer-select');
    const anomTypeSelect = document.getElementById('anomaly-type');

    if (!serialInput.value || !partSelect.value || !frameSelect.value || !stringerSelect.value || !anomTypeSelect.value) {
        alert("Veuillez remplir tous les champs obligatoires (Serial, Part Number, Cadre, Stringer et Type d'anomalie).");
        return;
    }

    currentInspection.serial = serialInput.value;

    const imgOut = document.querySelector('#preview-out img');
    const imgIn = document.querySelector('#preview-in img');

    let dims = {};
    if (anomTypeSelect.value === 'flashness') {
        dims.depth = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '';
    } else if (anomTypeSelect.value === 'scratch') {
        dims.length = document.getElementById('dim-length') ? document.getElementById('dim-length').value : '';
        dims.width = document.getElementById('dim-width') ? document.getElementById('dim-width').value : '';
        dims.depth = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '';
        dims.clad = document.getElementById('clad-test') ? document.getElementById('clad-test').value : '';
    } else {
        dims.length = document.getElementById('dim-length') ? document.getElementById('dim-length').value : '';
        dims.width = document.getElementById('dim-width') ? document.getElementById('dim-width').value : '';
        dims.depth = document.getElementById('dim-depth') ? document.getElementById('dim-depth').value : '';
    }

    const anomalyItem = {
        part: partSelect.options[partSelect.selectedIndex].text,
        frame: frameSelect.value,
        stringer: stringerSelect.value,
        type: anomTypeSelect.value,
        dimensions: dims,
        photoZoomOut: imgOut ? imgOut.src : null,
        photoZoomIn: imgIn ? imgIn.src : null
    };

    currentInspection.anomalies.push(anomalyItem);
    alert("Anomalie ajoutée avec succès au rapport de l'avion !");
    updateAnomaliesDisplay();
    
    // Réinitialisation partielle du formulaire d'anomalie
    anomTypeSelect.value = "";
    document.getElementById('dimensions-containerinnerHTML') = '';
    document.getElementById('preview-out').innerHTML = '';
    document.getElementById('preview-in').innerHTML = '';
    document.getElementById('photo-zoomout').value = '';
    document.getElementById('photo-zoomin').value = '';
    renderDimensionFields();
}

// Mise à jour de l'affichage des anomalies enregistrées
function updateAnomaliesDisplay() {
    const listContainer = document.getElementById('anomalies-list');
    const countSpan = document.getElementById('anom-count');
    if (!listContainer) return;

    countSpan.textContent = currentInspection.anomalies.length;

    if (currentInspection.anomalies.length === 0) {
        listContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Aucune anomalie ajoutée pour l'instant.</p>`;
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
    currentInspection.anomalies.forEach((item, index) => {
        html += `
            <div style="background: #050B14; border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <strong style="color: var(--accent-blue);">#${index + 1} - Type: ${item.type.toUpperCase()}</strong><br>
                    <span style="font-size:0.85rem; color:var(--text-muted);">Pièce: ${item.part} | Cadre: ${item.frame} | ${item.stringer}</span>
                </div>
                <button type="button" onclick="removeAnomaly(${index})" style="background: var(--accent-red); padding: 4px 10px; font-size: 0.8rem; width: auto;">Supprimer</button>
            </div>
        `;
    });
    html += '</div>';
    listContainer.innerHTML = html;
}

function removeAnomaly(index) {
    currentInspection.anomalies.splice(index, 1);
    updateAnomaliesDisplay();
}

// Génération du HTML complet du rapport global de l'avion
function buildGlobalReportHTML() {
    let anomaliesHTML = '';
    if (currentInspection.anomalies.length === 0) {
        anomaliesHTML = '<p>Aucune anomalie enregistrée pour cet avion.</p>';
    } else {
        currentInspection.anomalies.forEach((anom, idx) => {
            let dimText = '';
            if (anom.type === 'flashness') {
                dimText = `Depth: ${anom.dimensions.depth || 'N/A'} inch`;
            } else if (anom.type === 'scratch') {
                dimText = `L: ${anom.dimensions.length || 'N/A'} in | W: ${anom.dimensions.width || 'N/A'} in | D: ${anom.dimensions.depth || 'N/A'} in | Clad Test: ${anom.dimensions.clad || 'N/A'}`;
            } else {
                dimText = `L: ${anom.dimensions.length || 'N/A'} in | W: ${anom.dimensions.width || 'N/A'} in | D: ${anom.dimensions.depth || 'N/A'} in`;
            }

            anomaliesHTML += `
                <div style="margin-bottom: 25px; border-bottom: 1px solid #cbd5e1; padding-bottom: 15px;">
                    <h3 style="color: #0F2744; margin-bottom: 5px;">Anomalie #${idx + 1} : ${anom.type.toUpperCase()}</h3>
                    <p><strong>Pièce / PN :</strong> ${anom.part}</p>
                    <p><strong>Localisation :</strong> ${anom.frame} - ${anom.stringer}</p>
                    <p><strong>Dimensions :</strong> ${dimText}</p>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        ${anom.photoZoomOut ? `<div><p style="font-size:12px; margin:2px;">Vue d'ensemble (Zoom Out)</p><img src="${anom.photoZoomOut}" style="max-width:200px; height:auto; border:1px solid #ccc; border-radius:4px;"></div>` : ''}
                        ${anom.photoZoomIn ? `<div><p style="font-size:12px; margin:2px;">Vue rapprochée (Zoom In)</p><img src="${anom.photoZoomIn}" style="max-width:200px; height:auto; border:1px solid #ccc; border-radius:4px;"></div>` : ''}
                    </div>
                </div>
            `;
        });
    }

    return `
        <div id="pdf-report" style="padding: 25px; background: #ffffff; color: #000000; font-family: Arial, sans-serif;">
            <h1 style="color: #0F2744; border-bottom: 3px solid #0F2744; padding-bottom: 8px;">Rapport d'Inspection - Skin Care</h1>
            <p><strong>Référence :</strong> Rear Fuse PN: C013900001-001</p>
            <p><strong>Numéro de Série Avion (SN) :</strong> ${currentInspection.serial}</p>
            <p><strong>Date du rapport :</strong> ${new Date().toLocaleString()}</p>
            <hr style="margin: 20px 0;">
            <h2 style="color: #1e293b;">Liste des Anomalies Détectées (${currentInspection.anomalies.length})</h2>
            ${anomaliesHTML}
        </div>
    `;
}

// Téléchargement / Impression du PDF
function downloadPDFReport() {
    if (currentInspection.anomalies.length === 0) {
        alert("Veuillez ajouter au moins une anomalie avant de générer le rapport.");
        return;
    }

    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = buildGlobalReportHTML();
    document.body.appendChild(reportContainer);

    const options = {
        margin: 10,
        filename: `Rapport_Inspection_${currentInspection.serial.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(reportContainer).set(options).save().then(() => {
        document.body.removeChild(reportContainer);
    }).catch(err => {
        console.error("Erreur PDF :", err);
        if (document.body.contains(reportContainer)) document.body.removeChild(reportContainer);
    });
}

// Envoi par e-mail (Web Share API ou Fallback mailto)
async function generateAndSendReport() {
    if (currentInspection.anomalies.length === 0) {
        alert("Veuillez ajouter au moins une anomalie avant d'envoyer le rapport.");
        return;
    }

    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = buildGlobalReportHTML();
    document.body.appendChild(reportContainer);

    const options = {
        margin: 10,
        filename: `Rapport_Inspection_${currentInspection.serial.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        const pdfBlob = await html2pdf().from(reportContainer).set(options).outputPdf('blob');
        document.body.removeChild(reportContainer);

        const fileName = `Rapport_Inspection_${currentInspection.serial.replace(/\s+/g, '_')}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Rapport d\'Inspection - Skin Care',
                text: `Rapport d'inspection aéronautique (Rear Fuse PN: C013900001-001) pour l'avion ${currentInspection.serial}.`,
                files: [file]
            });
        } else {
            html2pdf().from(reportContainer).set(options).save();
            const subject = encodeURIComponent(`Rapport d'Inspection - Skin Care (${currentInspection.serial})`);
            const body = encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint le rapport d'inspection global pour l'appareil ${currentInspection.serial}.\n\n(Le fichier PDF a été téléchargé sur votre appareil, veuillez le joindre à cet e-mail pour le transmettre au chef d'équipe production et qualité).`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
    } catch (err) {
        console.error("Erreur partage :", err);
        if (document.body.contains(reportContainer)) document.body.removeChild(reportContainer);
        alert("Impossible d'envoyer le rapport automatiquement.");
    }
}

// Extensions Admin / Chef d'équipe (Stockage localStorage)
function loadCustomDatabase() {
    // Initialisation si besoin
}

function addNewCustomPart() {
    const name = document.getElementById('new-part-name').value.trim();
    const pn = document.getElementById('new-part-pn').value.trim();
    const type = document.getElementById('new-part-type').value;

    if (!name || !pn) {
        alert("Veuillez remplir le nom et le Part Number (PN) de la pièce.");
        return;
    }

    let customParts = JSON.parse(localStorage.getItem('custom_parts') || '[]');
    customParts.push({ name, pn, type });
    localStorage.setItem('custom_parts', JSON.stringify(customParts));
    alert("Nouvelle pièce / skin ajoutée à la base de données !");
    initApp();
}

function addNewCustomAnomaly() {
    const anomName = document.getElementById('new-anom-name').value.trim();
    if (!anomName) {
        alert("Veuillez saisir le nom du type d'anomalie.");
        return;
    }

    let customAnom = JSON.parse(localStorage.getItem('custom_anomalies') || '[]');
    customAnom.push(anomName);
    localStorage.setItem('custom_anomalies', JSON.stringify(customAnom));
    alert("Nouveau type d'anomalie ajouté à la base de données !");
    initApp();
}