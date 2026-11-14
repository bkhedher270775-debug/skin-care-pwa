document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Skin Care - Rear Fuse Inspection initialisée avec Historique.");
    initApp();
});

function initApp() {
    renderInspectionInterface();
    setupPhotoListener();
    setupAeroRulesListeners();
    renderHistoryList();
}

function renderInspectionInterface() {
    const container = document.getElementById('inspection-container');
    if (!container) return;

    let frameOptions = '<option value="">Sélectionner le cadre...</option>';
    for (let i = 62; i <= 79; i++) {
        if (i === 73) continue; // Exclusion de FR73
        frameOptions += `<option value="FR${i}">FR ${i}</option>`;
    }

    let stringerOptions = '<option value="">Sélectionner le stringer...</option>';
    for (let j = 1; j <= 36; j++) {
        stringerOptions += `<option value="STRG ${j}">Stringer ${j}</option>`;
    }

    container.innerHTML = `
        <div class="card">
            <h2>Paramètres d'Inspection & Règles Aéronautiques</h2>
            <div class="form-group">
                <label for="ac-serial">Numéro de Série (Aircraft SN)</label>
                <input type="text" id="ac-serial" placeholder="Ex: SN 55xxx" value="SN 55101">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="zone-select">Zone / Peau (Skin)</label>
                    <select id="zone-select">
                        <option value="Top skin (C01391101-105)">Top skin (C01391101-105)</option>
                        <option value="Upper R/H (C01391401-103)">Upper R/H (C01391401-103)</option>
                        <option value="Upper L/H (C01391201-103)">Upper L/H (C01391201-103)</option>
                        <option value="Lower R/H (C01392401-101)">Lower R/H (C01392401-101)</option>
                        <option value="Lower L/H (C01392201-101)">Lower L/H (C01392201-101)</option>
                        <option value="Lower skin (C01392101-103)">Lower skin (C01392101-103)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="frame-select">Cadre (Frame)</label>
                    <select id="frame-select">
                        ${frameOptions}
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="stringer-select">Stringer</label>
                <select id="stringer-select">
                    ${stringerOptions}
                </select>
                <small id="stringer-warning" style="color: var(--accent-red); display: none; margin-top: 0.25rem;">
                    Avertissement : Les stringers 24 et 33 sont interdits/exclus pour les cadres FR74 et supérieurs.
                </small>
            </div>

            <div class="form-group">
                <label for="anomaly-photo">Preuve Visuelle / Photo de l'anomalie</label>
                <input type="file" id="anomaly-photo" accept="image/*" capture="environment">
            </div>
            <div id="photo-preview-container" style="margin-top: 0.5rem;"></div>

            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem;">
                <button type="button" onclick="saveInspectionToHistory()" style="background-color: #8B5CF6;">Enregistrer dans l'Historique Local</button>
                <button type="button" onclick="downloadPDFReport()">Télécharger le Rapport PDF Actuel</button>
                <button type="button" class="success" onclick="sendPDFByEmail()">Envoyer le rapport par e-mail</button>
            </div>
        </div>

        <div class="card" style="margin-top: 1.5rem;">
            <h2>Historique des Inspections Locales</h2>
            <div id="history-list-container">
                <p style="color: var(--text-muted); font-size: 0.9rem;">Aucune inspection enregistrée pour le moment.</p>
            </div>
        </div>
    `;
}

function setupAeroRulesListeners() {
    setTimeout(() => {
        const frameSelect = document.getElementById('frame-select');
        const stringerSelect = document.getElementById('stringer-select');
        const warningText = document.getElementById('stringer-warning');

        if (!frameSelect || !stringerSelect) return;

        frameSelect.addEventListener('change', () => {
            const selectedFrameVal = frameSelect.value;
            if (!selectedFrameVal) return;

            const frameNum = parseInt(selectedFrameVal.replace('FR', ''), 10);
            const options = stringerSelect.options;

            for (let i = 0; i < options.length; i++) {
                const optVal = options[i].value;
                if (!optVal) continue;
                const strgNum = parseInt(optVal.replace('Stringer ', ''), 10);

                if (frameNum >= 74 && (strgNum === 24 || strgNum === 33)) {
                    options[i].disabled = true;
                    options[i].style.color = '#64748B';
                } else {
                    options[i].disabled = false;
                    options[i].style.color = '#F8FAFC';
                }
            }

            const currentStrgVal = stringerSelect.value;
            if (currentStrgVal && frameNum >= 74) {
                const currentStrgNum = parseInt(currentStrgVal.replace('Stringer ', ''), 10);
                if (currentStrgNum === 24 || currentStrgNum === 33) {
                    stringerSelect.value = "";
                    warningText.style.display = 'block';
                } else {
                    warningText.style.display = 'none';
                }
            } else {
                warningText.style.display = 'none';
            }
        });
    }, 100);
}

function setupPhotoListener() {
    setTimeout(() => {
        const photoInput = document.getElementById('anomaly-photo');
        const previewContainer = document.getElementById('photo-preview-container');

        if (!photoInput) return;

        photoInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewContainer.innerHTML = `
                        <div style="position: relative;">
                            <img src="${e.target.result}" alt="Aperçu anomalie" style="max-width: 100%; height: auto; max-height: 200px; border-radius: 8px; border: 1px solid var(--border-color);">
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Fichier : ${file.name}</p>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }, 100);
}

function prepareReportHTML(serial, zone, frame, stringer, photoDataUrl, dateStr) {
    return `
        <div id="pdf-report" style="padding: 20px; background: #ffffff; color: #000000; font-family: Arial, sans-serif;">
            <h2 style="color: #0F2744; border-bottom: 2px solid #0F2744; padding-bottom: 5px;">Rapport d'Inspection - Skin Care</h2>
            <p><strong>Date :</strong> ${dateStr || new Date().toLocaleString()}</p>
            <p><strong>Référence :</strong> Rear Fuse PN: C013900001-001</p>
            <p><strong>Numéro de Série (SN) :</strong> ${serial}</p>
            <p><strong>Zone / Peau :</strong> ${zone}</p>
            <p><strong>Cadre (Frame) :</strong> ${frame}</p>
            <p><strong>Stringer :</strong> ${stringer}</p>
            <hr style="margin: 15px 0;">
            <h3>Preuve Visuelle / Anomalie :</h3>
            ${photoDataUrl ? `<div style="margin-top: 10px;"><img src="${photoDataUrl}" style="max-width: 100%; height: auto; max-height: 300px; border: 1px solid #ccc; border-radius: 4px;" alt="Photo anomalie"></div>` : '<p>Aucune photo jointe.</p>'}
        </div>
    `;
}

function getInspectionData() {
    const serial = document.getElementById('ac-serial') ? document.getElementById('ac-serial').value : 'SN-Inconnu';
    const zone = document.getElementById('zone-select') ? document.getElementById('zone-select').value : 'Zone non spécifiée';
    const frame = document.getElementById('frame-select') ? document.getElementById('frame-select').value : 'Cadre non spécifié';
    const stringer = document.getElementById('stringer-select') ? document.getElementById('stringer-select').value : 'Stringer non spécifié';
    const previewImg = document.querySelector('#photo-preview-container img');
    const photoDataUrl = previewImg ? previewImg.src : null;
    const dateStr = new Date().toLocaleString();
    return { serial, zone, frame, stringer, photoDataUrl, dateStr };
}

// --- GESTION DU LOCALSTORAGE (HISTORIQUE) ---

function saveInspectionToHistory() {
    const data = getInspectionData();
    let history = JSON.parse(localStorage.getItem('skin_care_history') || '[]');
    
    // Ajouter la nouvelle inspection au début de la liste
    history.unshift(data);

    // Sauvegarder
    localStorage.setItem('skin_care_history', JSON.stringify(history));
    alert("Inspection enregistrée avec succès dans l'historique local !");
    renderHistoryList();
}

function renderHistoryList() {
    setTimeout(() => {
        const container = document.getElementById('history-list-container');
        if (!container) return;

        let history = JSON.parse(localStorage.getItem('skin_care_history') || '[]');

        if (history.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Aucune inspection enregistrée pour le moment.</p>`;
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
        history.forEach((item, index) => {
            html += `
                <div style="background-color: #050B14; border: 1px solid var(--border-color); padding: 0.75rem; border-radius: var(--radius); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <strong style="color: var(--accent-blue);">SN: ${item.serial}</strong> | ${item.frame} - ${item.stringer}
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${item.zone} — ${item.dateStr}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" onclick="downloadPDFFromHistory(${index})" style="padding: 0.4rem 0.75rem; font-size: 0.85rem; width: auto;">PDF</button>
                        <button type="button" onclick="deleteHistoryItem(${index})" style="padding: 0.4rem 0.75rem; font-size: 0.85rem; background-color: var(--accent-red); width: auto;">Supprimer</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }, 100);
}

function downloadPDFFromHistory(index) {
    let history = JSON.parse(localStorage.getItem('skin_care_history') || '[]');
    const item = history[index];
    if (!item) return;

    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = prepareReportHTML(item.serial, item.zone, item.frame, item.stringer, item.photoDataUrl, item.dateStr);
    document.body.appendChild(reportContainer);

    const options = {
        margin: 10,
        filename: `Rapport_Inspection_${item.serial}_${item.frame}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(reportContainer).set(options).save().then(() => {
        document.body.removeChild(reportContainer);
    }).catch(err => {
        console.error("Erreur PDF historique :", err);
        if (document.body.contains(reportContainer)) {
            document.body.removeChild(reportContainer);
        }
    });
}

function deleteHistoryItem(index) {
    if (!confirm("Voulez-vous vraiment supprimer cette inspection de l'historique ?")) return;
    let history = JSON.parse(localStorage.getItem('skin_care_history') || '[]');
    history.splice(index, 1);
    localStorage.setItem('skin_care_history', JSON.stringify(history));
    renderHistoryList();
}

// --- EXPORT PDF ACTUEL ---

function downloadPDFReport() {
    const data = getInspectionData();
    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = prepareReportHTML(data.serial, data.zone, data.frame, data.stringer, data.photoDataUrl, data.dateStr);
    document.body.appendChild(reportContainer);

    const options = {
        margin: 10,
        filename: `Rapport_Inspection_${data.serial}_${data.frame}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(reportContainer).set(options).save().then(() => {
        document.body.removeChild(reportContainer);
    }).catch(err => {
        console.error("Erreur PDF :", err);
        if (document.body.contains(reportContainer)) {
            document.body.removeChild(reportContainer);
        }
    });
}

async function sendPDFByEmail() {
    const data = getInspectionData();
    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = prepareReportHTML(data.serial, data.zone, data.frame, data.stringer, data.photoDataUrl, data.dateStr);
    document.body.appendChild(reportContainer);

    const options = {
        margin: 10,
        filename: `Rapport_Inspection_${data.serial}_${data.frame}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        const pdfBlob = await html2pdf().from(reportContainer).set(options).outputPdf('blob');
        document.body.removeChild(reportContainer);

        const fileName = `Rapport_Inspection_${data.serial}_${data.frame}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Rapport d\'Inspection - Skin Care',
                text: `Rapport d'inspection (Rear Fuse PN: C013900001-001) - SN: ${data.serial}, Cadre: ${data.frame}, ${data.stringer}.`,
                files: [file]
            });
        } else {
            html2pdf().from(reportContainer).set(options).save();
            const subject = encodeURIComponent(`Rapport d'Inspection - Skin Care (${data.serial})`);
            const body = encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint le rapport d'inspection pour l'appareil SN ${data.serial} (${data.frame} / ${data.stringer}).\n\n(Le fichier PDF a été téléchargé sur votre appareil).`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
    } catch (err) {
        console.error("Erreur partage :", err);
        if (document.body.contains(reportContainer)) {
            document.body.removeChild(reportContainer);
        }
        alert("Impossible d'envoyer le rapport automatiquement.");
    }
}
