document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Skin Care - Rear Fuse Inspection initialisée.");
    initApp();
});

function initApp() {
    renderInspectionInterface();
    setupPhotoListener();
}

function renderInspectionInterface() {
    const container = document.getElementById('inspection-container');
    if (!container) return;

    container.innerHTML = `
        <div class="card">
            <h2>Paramètres d'Inspection</h2>
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
                        <option value="FR62-FR72">FR62 à FR72</option>
                        <option value="FR74-FR79 (FR73 exclu)">FR74 à FR79 (FR73 exclu)</option>
                    </select>
                </div>
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

function prepareReportHTML(serial, zone, frame, photoDataUrl) {
    return `
        <div id="pdf-report" style="padding: 20px; background: #ffffff; color: #000000; font-family: Arial, sans-serif;">
            <h2 style="color: #0F2744; border-bottom: 2px solid #0F2744; padding-bottom: 5px;">Rapport d'Inspection - Skin Care</h2>
            <p><strong>Référence :</strong> Rear Fuse PN: C013900001-001</p>
            <p><strong>Numéro de Série (SN) :</strong> ${serial}</p>
            <p><strong>Zone / Peau :</strong> ${zone}</p>
            <p><strong>Cadre (Frame) :</strong> ${frame}</p>
            <hr style="margin: 15px 0;">
            <h3>Preuve Visuelle / Anomalie :</h3>
            ${photoDataUrl ? `<div style="margin-top: 10px;"><img src="${photoDataUrl}" style="max-width: 100%; height: auto; max-height: 300px; border: 1px solid #ccc; border-radius: 4px;" alt="Photo anomalie"></div>` : '<p>Aucune photo jointe.</p>'}
        </div>
    `;
}

function downloadPDFReport() {
    const serial = document.getElementById('ac-serial') ? document.getElementById('ac-serial').value : 'SN-Inconnu';
    const zone = document.getElementById('zone-select') ? document.getElementById('zone-select').value : 'Zone non spécifiée';
    const frame = document.getElementById('frame-select') ? document.getElementById('frame-select').value : 'Cadre non spécifié';
    
    const previewImg = document.querySelector('#photo-preview-container img');
    const photoDataUrl = previewImg ? previewImg.src : null;

    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = prepareReportHTML(serial, zone, frame, photoDataUrl);
    document.body.appendChild(reportContainer);

    const options = {
        margin: 10,
        filename: `Rapport_Inspection_${serial}.pdf`,
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
    const serial = document.getElementById('ac-serial') ? document.getElementById('ac-serial').value : 'SN-Inconnu';
    const zone = document.getElementById('zone-select') ? document.getElementById('zone-select').value : 'Zone non spécifiée';
    const frame = document.getElementById('frame-select') ? document.getElementById('frame-select').value : 'Cadre non spécifié';
    
    const previewImg = document.querySelector('#photo-preview-container img');
    const photoDataUrl = previewImg ? previewImg.src : null;

    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = prepareReportHTML(serial, zone, frame, photoDataUrl);
    document.body.appendChild(reportContainer);

    const options = {
        margin: 10,
        filename: `Rapport_Inspection_${serial}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        const pdfBlob = await html2pdf().from(reportContainer).set(options).outputPdf('blob');
        document.body.removeChild(reportContainer);

        const fileName = `Rapport_Inspection_${serial}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Rapport d\'Inspection - Skin Care',
                text: `Rapport d'inspection aéronautique (Rear Fuse PN: C013900001-001) - ${serial}.`,
                files: [file]
            });
        } else {
            html2pdf().from(reportContainer).set(options).save();
            const subject = encodeURIComponent(`Rapport d'Inspection - Skin Care (${serial})`);
            const body = encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint le rapport d'inspection pour l'appareil SN ${serial}.\n\n(Le fichier PDF a été téléchargé sur votre appareil).`);
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
