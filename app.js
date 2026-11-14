document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Skin Care - Rear Fuse Inspection initialisée avec règles aéronautiques.");
    initApp();
});

function initApp() {
    renderInspectionInterface();
    setupPhotoListener();
    setupAeroRulesListeners();
}

function renderInspectionInterface() {
    const container = document.getElementById('inspection-container');
    if (!container) return;

    // Génération dynamique des options de cadres (FR62-FR72 et FR74-FR79, FR73 exclu)
    let frameOptions = '<option value="">Sélectionner le cadre...</option>';
    for (let i = 62; i <= 79; i++) {
        if (i === 73) continue; // Règle stricte : Exclusion de FR73
        frameOptions += `<option value="FR${i}">FR ${i}</option>`;
    }

    // Génération dynamique des options de stringers (1 à 36)
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

            <button type="button" onclick="downloadPDFReport()" style="margin-top: 1rem;">Télécharger le Rapport PDF</button>
            <button type="button" class="success" onclick="sendPDFByEmail()">Envoyer le rapport par e-mail</button>
        </div>
    `;
}

/**
 * Logique de contrôle dynamique des règles (FR74+ et Stringers 24/33)
 */
function setupAeroRulesListeners() {
    setTimeout(() => {
        const frameSelect = document.getElementById('frame-select');
        const stringerSelect = document.getElementById('stringer-select');
        const warningText = document.getElementById('stringer-warning');

        if (!frameSelect || !stringerSelect) return;

        frameSelect.addEventListener('change', () => {
            const selectedFrameVal = frameSelect.value; // Ex: "FR74"
            if (!selectedFrameVal) return;

            const frameNum = parseInt(selectedFrameVal.replace('FR', ''), 10);
            const options = stringerSelect.options;

            // Règle : Si Frame >= 74, STRG 24 et STRG 33 sont exclus
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

            // Si le stringer actuellement sélectionné devient invalide, on le réinitialise
            const currentStrgVal = stringerSelect.value;
            if (currentStrgVal && frameNum >= 74) {
                const currentStrgNum = parseInt(currentStrgVal.replace('Stringer ', ''), 10);
                if (currentStrgNum === 24 || currentStrgNum === 33) {
                    stringerSelect.value = "";
                    warningText.style.display = 'block';
                    alert(`Attention : Le ${currentStrgVal} n'est pas autorisé pour le cadre ${selectedFrameVal}. Sélection réinitialisée.`);
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

function prepareReportHTML(serial, zone, frame, stringer, photoDataUrl) {
    return `
        <div id="pdf-report" style="padding: 20px; background: #ffffff; color: #000000; font-family: Arial, sans-serif;">
            <h2 style="color: #0F2744; border-bottom: 2px solid #0F2744; padding-bottom: 5px;">Rapport d'Inspection - Skin Care</h2>
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
    return { serial, zone, frame, stringer, photoDataUrl };
}

function downloadPDFReport() {
    const data = getInspectionData();
    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = prepareReportHTML(data.serial, data.zone, data.frame, data.stringer, data.photoDataUrl);
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
    reportContainer.innerHTML = prepareReportHTML(data.serial, data.zone, data.frame, data.stringer, data.photoDataUrl);
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
