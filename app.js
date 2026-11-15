/**
 * ============================================================================
 * APPLICATION : Skin Care — PreFAL-Rear (Rear Fuse PN: C013900001-001)
 * VERSION     : V15 (Copyright PreFAL-Rear + Bandeau Photo + PDF HD 680x512px)
 * AUTEUR      : Haithem B.K
 * COPYRIGHT   : Copyright © 2026. Haithem B.K — Licence d'utilisation interne
 *               accordée exclusivement au PreFAL-Rear.
 *               Internal use license granted exclusively to PreFAL-Rear.
 * ============================================================================
 */

// MOT DE PASSE PAR DÉFAUT POUR ACCÉDER À L'APPLICATION
const DEFAULT_APP_PASSWORD = "AERO2026";

const COPYRIGHT_FR = "Copyright © 2026. Haithem B.K — Licence d'utilisation interne accordée exclusivement au PreFAL-Rear.";
const COPYRIGHT_EN = "Copyright © 2026. Haithem B.K — Internal use license granted exclusively to PreFAL-Rear. All rights reserved.";

const DEFAULT_PARTS = [
    { name: "Top skin", pn: "C01391101-105", category: "skin" },
    { name: "Upper R/H skin", pn: "C01391401-103", category: "skin" },
    { name: "Upper L/H skin", pn: "C01391201-103", category: "skin" },
    { name: "Lower R/H skin", pn: "C01392401-101", category: "skin" },
    { name: "Lower L/H skin", pn: "CO1392201-101", category: "skin" },
    { name: "Lower skin", pn: "C01392101-103", category: "skin" },
    { name: "Cargo service panel", pn: "C01392118-101", category: "panel" },
    { name: "Water service panel", pn: "C01392415-101", category: "panel" },
    { name: "Waste service panel", pn: "C01392116-101", category: "panel" }
];

const DEFAULT_ANOMALIES = [
    "Depression", "Bump", "Tool mark", "Flashness", "Scratch", "Paint", "Sealing aérodynamique", "Over Step"
];

const DEFAULT_EMAILS = [
    "chef.production@aerospace-inspection.com",
    "chef.qualite@aerospace-inspection.com"
];

let currentAircraftReport = {
    aircraftSN: "AC 55XXX",
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
    checkAuthenticationAndRender();
});

// =========================================================================
// SYSTÈME DE PROTECTION PAR MOT DE PASSE
// =========================================================================

function getAppPassword() {
    return localStorage.getItem('skincare_app_password') || DEFAULT_APP_PASSWORD;
}

function isUserAuthenticated() {
    return sessionStorage.getItem('skincare_auth_unlocked') === 'true';
}

function checkAuthenticationAndRender() {
    if (isUserAuthenticated()) {
        renderApp();
    } else {
        renderLoginScreen();
    }
}

function renderLoginScreen() {
    const container = document.getElementById('inspection-container');
    if (!container) return;

    container.innerHTML = `
        <section class="card" style="max-width: 460px; margin: 2rem auto; text-align: center; border: 2px solid #3B82F6; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
            <h2 style="justify-content: center; border-bottom: none; margin-bottom: 0.25rem; font-size: 1.25rem;">
                Accès Sécurisé — Skin Care (PreFAL-Rear)
            </h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                Veuillez saisir le mot de passe atelier pour accéder aux données et au formulaire d'inspection Rear Fuse.
            </p>
            <div class="form-group" style="text-align: left;">
                <label for="login-password-input">Mot de passe d'accès</label>
                <input type="password" id="login-password-input" placeholder="Entrez le mot de passe..." onkeydown="if(event.key==='Enter') verifyLoginPassword()">
                <div id="login-error-msg" class="warning-banner" style="text-align: center;">
                    Mot de passe incorrect. Accès refusé.
                </div>
            </div>
            <button type="button" class="success" onclick="verifyLoginPassword()" style="margin-top: 0.5rem;">
                🔓 Déverrouiller l'application
            </button>
            <div style="margin-top: 1.25rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); font-size: 0.72rem; color: #94A3B8; line-height: 1.45;">
                <strong style="color:#E2E8F0;">${COPYRIGHT_FR}</strong><br>
                ${COPYRIGHT_EN}
            </div>
        </section>
    `;

    setTimeout(() => {
        const input = document.getElementById('login-password-input');
        if (input) input.focus();
    }, 100);
}

function verifyLoginPassword() {
    const input = document.getElementById('login-password-input');
    const errorMsg = document.getElementById('login-error-msg');
    if (!input) return;

    if (input.value === getAppPassword()) {
        sessionStorage.setItem('skincare_auth_unlocked', 'true');
        renderApp();
    } else {
        if (errorMsg) errorMsg.style.display = 'block';
        input.value = '';
        input.focus();
    }
}

function lockApplication() {
    closeLiveCamera();
    sessionStorage.removeItem('skincare_auth_unlocked');
    renderLoginScreen();
}

function adminChangePassword() {
    const newPassInput = document.getElementById('admin-new-password');
    if (!newPassInput || !newPassInput.value.trim()) {
        return alert("Veuillez saisir un nouveau mot de passe valide.");
    }
    const newPass = newPassInput.value.trim();
    if (!confirm(`Confirmer le changement du mot de passe d'accès par : "${newPass}" ?`)) return;

    localStorage.setItem('skincare_app_password', newPass);
    newPassInput.value = '';
    alert("Le mot de passe a été mis à jour sur cet appareil.");
}

// =========================================================================
// TÉLÉCHARGEMENT, RENOMMAGE AUTO & BANDEAU TECHNIQUE INCRUSTÉ (V15)
// Format Bandeau : AC 55xxx | Anomalie #1 : Type | Zone : FR - STRG | Vue
// Format Fichier : NumAvion_Anomalie_X_Type_FR_STRG_Vue.jpg
// =========================================================================

function sanitizeFileNamePart(text) {
    if (!text) return "NA";
    return text.toString()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
}

function buildPhotoFileName(acSN, anomNum, anomType, frame, stringer, viewLabel) {
    const pSN = sanitizeFileNamePart(acSN || currentAircraftReport.aircraftSN || "AC");
    const pNum = `Anomalie_${anomNum}`;
    const pType = sanitizeFileNamePart(anomType || "Type");
    const pFr = sanitizeFileNamePart(frame || "FR");
    const pStrg = sanitizeFileNamePart(stringer || "STRG");
    const pView = sanitizeFileNamePart(viewLabel || "Photo");
    return `${pSN}_${pNum}_${pType}_${pFr}_${pStrg}_${pView}.jpg`;
}

function buildBannerText(acSN, anomNum, anomType, frame, stringer, viewDisplay) {
    const snClean = (acSN || currentAircraftReport.aircraftSN || "AC 55XXX").trim();
    const typeClean = (anomType || "Anomalie").trim();
    const frClean = (frame || "FR--").trim();
    const strgClean = (stringer || "STRG--").trim();
    return `${snClean} | Anomalie #${anomNum} : ${typeClean} | Zone : ${frClean} - ${strgClean} | ${viewDisplay}`;
}

function triggerImageDownloadWithBanner(dataUrl, fileName, bannerText) {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);

        const bannerHeight = Math.max(38, Math.round(canvas.height * 0.055));
        const bannerY = canvas.height - bannerHeight;

        ctx.fillStyle = 'rgba(11, 29, 54, 0.88)';
        ctx.fillRect(0, bannerY, canvas.width, bannerHeight);

        ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
        ctx.fillRect(0, bannerY, canvas.width, Math.max(1, Math.round(canvas.height * 0.002)));

        let fontSize = Math.max(14, Math.round(bannerHeight * 0.44));
        ctx.font = `600 ${fontSize}px Arial, Helvetica, sans-serif`;
        const maxTextWidth = canvas.width - 32;

        while (ctx.measureText(bannerText).width > maxTextWidth && fontSize > 10) {
            fontSize -= 1;
            ctx.font = `600 ${fontSize}px Arial, Helvetica, sans-serif`;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bannerText, canvas.width / 2, bannerY + (bannerHeight / 2));

        const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const a = document.createElement('a');
        a.href = stampedDataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    img.src = dataUrl;
}

function downloadCurrentFormPhoto(type, zoomInIndex = 0) {
    const sn = document.getElementById('ac-serial') ? document.getElementById('ac-serial').value.trim() : currentAircraftReport.aircraftSN;
    const anomNum = editingAnomalyIndex !== -1 ? (editingAnomalyIndex + 1) : (currentAircraftReport.anomalies.length + 1);
    const anomType = document.getElementById('anomaly-select') ? (document.getElementById('anomaly-select').value || 'Anomalie') : 'Anomalie';
    const frame = document.getElementById('frame-select') ? (document.getElementById('frame-select').value || 'FR') : 'FR';
    const stringer = document.getElementById('stringer-select') ? (document.getElementById('stringer-select').value || 'STRG') : 'STRG';

    if (type === 'out' && tempZoomOutPhoto) {
        const fileName = buildPhotoFileName(sn, anomNum, anomType, frame, stringer, 'ZoomOut');
        const bannerText = buildBannerText(sn, anomNum, anomType, frame, stringer, 'Zoom Out');
        triggerImageDownloadWithBanner(tempZoomOutPhoto, fileName, bannerText);
    } else if (type === 'in' && tempZoomInPhotos[zoomInIndex]) {
        const fileName = buildPhotoFileName(sn, anomNum, anomType, frame, stringer, `ZoomIn_${zoomInIndex + 1}`);
        const bannerText = buildBannerText(sn, anomNum, anomType, frame, stringer, `Zoom In #${zoomInIndex + 1}`);
        triggerImageDownloadWithBanner(tempZoomInPhotos[zoomInIndex], fileName, bannerText);
    }
}

function downloadSavedAnomalyPhoto(anomIndex, type, zoomInIndex = 0) {
    const anom = currentAircraftReport.anomalies[anomIndex];
    if (!anom) return;
    const sn = currentAircraftReport.aircraftSN;
    const anomNum = anomIndex + 1;

    if (type === 'out' && anom.zoomOutPhoto) {
        const fileName = buildPhotoFileName(sn, anomNum, anom.type, anom.frame, anom.stringer, 'ZoomOut');
        const bannerText = buildBannerText(sn, anomNum, anom.type, anom.frame, anom.stringer, 'Zoom Out');
        triggerImageDownloadWithBanner(anom.zoomOutPhoto, fileName, bannerText);
    } else if (type === 'in' && anom.zoomInPhotos && anom.zoomInPhotos[zoomInIndex]) {
        const fileName = buildPhotoFileName(sn, anomNum, anom.type, anom.frame, anom.stringer, `ZoomIn_${zoomInIndex + 1}`);
        const bannerText = buildBannerText(sn, anomNum, anom.type, anom.frame, anom.stringer, `Zoom In #${zoomInIndex + 1}`);
        triggerImageDownloadWithBanner(anom.zoomInPhotos[zoomInIndex], fileName, bannerText);
    }
}

function downloadAllPhotosForAnomaly(anomIndex) {
    const anom = currentAircraftReport.anomalies[anomIndex];
    if (!anom) return;
    let delay = 0;
    if (anom.zoomOutPhoto) {
        setTimeout(() => downloadSavedAnomalyPhoto(anomIndex, 'out'), delay);
        delay += 350;
    }
    if (anom.zoomInPhotos && anom.zoomInPhotos.length > 0) {
        anom.zoomInPhotos.forEach((_, idx) => {
            setTimeout(() => downloadSavedAnomalyPhoto(anomIndex, 'in', idx), delay);
            delay += 350;
        });
    }
}

// =========================================================================
// FONCTIONS SYSTÈME & BASE DE DONNÉES
// =========================================================================

async function forceMobileUpdate() {
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
            await reg.unregister();
        }
    }
    if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
            await caches.delete(key);
        }
    }
    window.location.href = window.location.pathname + '?v=' + Date.now();
}

function saveDraft() {
    try {
        localStorage.setItem('skincare_current_draft', JSON.stringify(currentAircraftReport));
    } catch (e) {
        console.warn("Quota localStorage atteint (photos HD volumineuses). Conservation en mémoire vive.", e);
    }
}

function loadSavedDraft() {
    const saved = localStorage.getItem('skincare_current_draft');
    if (saved) {
        try { currentAircraftReport = JSON.parse(saved); } catch (e) { console.error(e); }
    }
}

function getCustomParts() {
    return JSON.parse(localStorage.getItem('skincare_custom_parts') || '[]');
}

function getCustomAnomalies() {
    return JSON.parse(localStorage.getItem('skincare_custom_anomalies') || '[]');
}

function getCustomEmails() {
    return JSON.parse(localStorage.getItem('skincare_custom_emails') || '[]');
}

function getCustomFrames() {
    return JSON.parse(localStorage.getItem('skincare_custom_frames') || '[]');
}

function getCustomStringers() {
    return JSON.parse(localStorage.getItem('skincare_custom_stringers') || '[]');
}

function getPartsList() {
    return [...DEFAULT_PARTS, ...getCustomParts()];
}

function getAnomaliesList() {
    return [...DEFAULT_ANOMALIES, ...getCustomAnomalies()];
}

function getEmailsList() {
    return [...DEFAULT_EMAILS, ...getCustomEmails()];
}

function getFramesList() {
    let frames = [];
    for (let i = 62; i <= 79; i++) {
        if (i !== 73) frames.push(`FR${i}`);
    }
    return [...frames, ...getCustomFrames()];
}

function getStringersList() {
    let stringers = [];
    for (let j = 1; j <= 36; j++) {
        stringers.push({ code: `STRG ${j}L`, num: j });
        stringers.push({ code: `STRG ${j}R`, num: j });
    }
    return [...stringers, ...getCustomStringers()];
}

function renderApp() {
    if (!isUserAuthenticated()) {
        renderLoginScreen();
        return;
    }

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

    const customPartsHTML = getCustomParts().map((p, idx) => `
        <span style="display:inline-flex;align-items:center;gap:4px;background:#1E3A8A;padding:3px 8px;border-radius:4px;font-size:0.78rem;margin:2px;">
            ${p.name} (${p.pn})
            <button type="button" onclick="adminDeletePart(${idx})" style="background:#EF4444;color:#fff;border:none;border-radius:3px;width:18px;height:18px;font-size:11px;padding:0;line-height:18px;cursor:pointer;" title="Supprimer">×</button>
        </span>
    `).join('');

    const customAnomaliesHTML = getCustomAnomalies().map((a, idx) => `
        <span style="display:inline-flex;align-items:center;gap:4px;background:#1E3A8A;padding:3px 8px;border-radius:4px;font-size:0.78rem;margin:2px;">
            ${a}
            <button type="button" onclick="adminDeleteAnomaly(${idx})" style="background:#EF4444;color:#fff;border:none;border-radius:3px;width:18px;height:18px;font-size:11px;padding:0;line-height:18px;cursor:pointer;" title="Supprimer">×</button>
        </span>
    `).join('');

    const customFramesHTML = getCustomFrames().map((f, idx) => `
        <span style="display:inline-flex;align-items:center;gap:4px;background:#1E3A8A;padding:3px 8px;border-radius:4px;font-size:0.78rem;margin:2px;">
            ${f}
            <button type="button" onclick="adminDeleteFrame(${idx})" style="background:#EF4444;color:#fff;border:none;border-radius:3px;width:18px;height:18px;font-size:11px;padding:0;line-height:18px;cursor:pointer;" title="Supprimer">×</button>
        </span>
    `).join('');

    const customStringersHTML = getCustomStringers().map((s, idx) => `
        <span style="display:inline-flex;align-items:center;gap:4px;background:#1E3A8A;padding:3px 8px;border-radius:4px;font-size:0.78rem;margin:2px;">
            ${s.code}
            <button type="button" onclick="adminDeleteStringer(${idx})" style="background:#EF4444;color:#fff;border:none;border-radius:3px;width:18px;height:18px;font-size:11px;padding:0;line-height:18px;cursor:pointer;" title="Supprimer">×</button>
        </span>
    `).join('');

    const isEditing = editingAnomalyIndex !== -1;

    container.innerHTML = `
        <section class="card">
            <h2>
                <span>1. Identification Avion (Rapport Unique par AC)</span>
                <div style="display: flex; gap: 0.4rem;">
                    <button type="button" class="secondary small-btn" onclick="resetAircraftReport()">Nouvel Avion</button>
                    <button type="button" class="danger small-btn" onclick="lockApplication()" title="Verrouiller l'application">🔒 Verrouiller</button>
                </div>
            </h2>
            <div class="form-row">
                <div class="form-group">
                    <label for="ac-serial">Numéro Avion (ex: AC 55xxx)</label>
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

            <!-- CAPTURE PHOTO HD PAR CAMÉRA DU TÉLÉPHONE (ZOOM OUT & ZOOM IN) -->
            <div class="form-row">
                <div class="dimensions-box" style="margin-bottom:0;">
                    <label style="display:block; margin-bottom:0.5rem; color:#60A5FA;">1. Photo Zone HD (Zoom Out)</label>
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
                    <label style="display:block; margin-bottom:0.5rem; color:#60A5FA;">2. Photo(s) Anomalie HD (Zoom In)</label>
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
                <h3 id="live-camera-title" style="color:#60A5FA; margin-bottom:0.5rem;">Caméra HD en direct</h3>
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
                        📸 Capturer la Photo HD
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
                <label for="recipient-email">Adresse E-mail du Destinataire (Chef d'équipe Production / Qualité / Ingénierie)</label>
                <div style="display: flex; gap: 0.5rem;">
                    <select id="recipient-email" style="flex: 1;">${emailOptions}</select>
                    <button type="button" class="danger small-btn" onclick="deleteSelectedEmail()" title="Supprimer l'adresse e-mail sélectionnée">
                        🗑️ Supprimer E-mail
                    </button>
                </div>
                <div class="email-inline-add">
                    <input type="email" id="new-email-input" placeholder="Ajouter une nouvelle adresse e-mail...">
                    <button type="button" class="secondary small-btn" onclick="addNewEmail()">+ Ajouter E-mail</button>
                </div>
            </div>
            <div class="form-row" style="margin-top: 1rem;">
                <button type="button" class="success" onclick="sendReportByEmail()">
                    📧 Préparer & Envoyer par E-mail (avec PDF HD joint)
                </button>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" onclick="downloadReportPDF()">Télécharger PDF HD</button>
                    <button type="button" class="secondary" onclick="printReportDirectly()">Imprimer</button>
                </div>
            </div>
        </section>

        <section class="card card-admin">
            <h2>4. Espace Chef d'Équipe Production / Qualité — Base de Données & Sécurité</h2>
            <div class="form-row-3">
                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>Pièce / Skin</h3>
                    <div class="form-group">
                        <input type="text" id="admin-part-name" placeholder="Nom pièce / skin">
                        <input type="text" id="admin-part-pn" placeholder="Part Number (PN)">
                        <select id="admin-part-cat">
                            <option value="skin">Skin</option>
                            <option value="panel">Service Panel</option>
                        </select>
                        <button type="button" class="small-btn" onclick="adminAddPart()" style="width:100%;">+ Ajouter Pièce</button>
                    </div>
                    ${customPartsHTML ? `<div style="margin-top:0.5rem;border-top:1px solid var(--border-color);padding-top:0.4rem;"><small style="color:var(--text-muted);display:block;margin-bottom:3px;">Pièces ajoutées :</small>${customPartsHTML}</div>` : ''}
                </div>

                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>Type d'Anomalie</h3>
                    <div class="form-group">
                        <input type="text" id="admin-anomaly-name" placeholder="Nom de l'anomalie">
                        <button type="button" class="small-btn" onclick="adminAddAnomaly()" style="width:100%; margin-top: 0.5rem;">+ Ajouter Anomalie</button>
                    </div>
                    ${customAnomaliesHTML ? `<div style="margin-top:0.5rem;border-top:1px solid var(--border-color);padding-top:0.4rem;"><small style="color:var(--text-muted);display:block;margin-bottom:3px;">Anomalies ajoutées :</small>${customAnomaliesHTML}</div>` : ''}
                </div>

                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>Zone (Frame / Stringer)</h3>
                    <div class="form-group">
                        <input type="text" id="admin-zone-frame" placeholder="Frame (ex: FR80)">
                        <button type="button" class="small-btn" onclick="adminAddFrame()" style="width:100%;">+ Ajouter Frame</button>
                        <input type="text" id="admin-zone-strg" placeholder="Stringer (ex: STRG 37L)" style="margin-top:0.4rem;">
                        <button type="button" class="small-btn" onclick="adminAddStringer()" style="width:100%;">+ Ajouter Stringer</button>
                    </div>
                    ${(customFramesHTML || customStringersHTML) ? `<div style="margin-top:0.5rem;border-top:1px solid var(--border-color);padding-top:0.4rem;"><small style="color:var(--text-muted);display:block;margin-bottom:3px;">Zones ajoutées :</small>${customFramesHTML}${customStringersHTML}</div>` : ''}
                </div>
            </div>

            <!-- GESTION DU MOT DE PASSE & QR CODE ATELIER -->
            <div class="form-row" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); align-items: center;">
                <div class="dimensions-box" style="margin-bottom:0;">
                    <h3>🔑 Modifier le Mot de Passe d'Accès</h3>
                    <div style="display:flex; gap:0.5rem; margin-top:0.4rem;">
                        <input type="text" id="admin-new-password" placeholder="Nouveau mot de passe (défaut: AERO2026)">
                        <button type="button" class="secondary small-btn" onclick="adminChangePassword()">Enregistrer</button>
                    </div>
                </div>

                <div class="dimensions-box" style="margin-bottom:0; display:flex; justify-content:space-between; align-items:center; gap:0.75rem; flex-wrap:wrap;">
                    <div>
                        <strong style="color: #60A5FA; font-size: 0.92rem;">QR Code Atelier PreFAL-Rear (V15)</strong>
                        <p style="font-size: 0.78rem; color: var(--text-muted);">Demande le mot de passe au scan.</p>
                    </div>
                    <button type="button" class="small-btn" style="background-color: #8B5CF6;" onclick="showWorkshopQRCode()">
                        📱 Afficher / Imprimer QR Code
                    </button>
                </div>
            </div>
        </section>
    `;
    renderAnomaliesList();
    renderPhotoPreviews();
}

// =========================================================================
// FONCTIONS CAMÉRA DIRECTE INTÉGRÉE (RÉSOLUTION HD 1600px)
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
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
            audio: false
        });
        video.srcObject = activeVideoStream;
        modal.style.display = 'block';

        const defaultZoom = target === 'in' ? 1.8 : 1.0;
        slider.value = defaultZoom;
        applyVideoZoom(defaultZoom);

        title.textContent = target === 'out'
            ? "Caméra Directe HD — Photo Zone (Zoom Out)"
            : "Caméra Directe HD — Photo Rapprochée de l'Anomalie (Zoom In)";
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
    const vw = video.videoWidth || 1600;
    const vh = video.videoHeight || 1200;

    canvas.width = 1600;
    canvas.height = Math.round((vh / vw) * 1600);
    const ctx = canvas.getContext('2d');

    const cropW = vw / zoom;
    const cropH = vh / zoom;
    const startX = (vw - cropW) / 2;
    const startY = (vh - cropH) / 2;

    ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

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
    if (snInput) currentAircraftReport.aircraftSN = snInput.value.trim() || "AC 55XXX";
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
    currentAircraftReport = { aircraftSN: newSN.trim() || "AC 55XXX", operatorName: currentAircraftReport.operatorName, anomalies: [] };
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
                    <label for="flash-sign">Orientation (+ 0 / - 0)</label>
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
                    <option value="Positif">Positif</option>
                    <option value="Négatif">Négatif</option>
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
            const maxDim = 1600;
            let width = img.width;
            let height = img.height;
            if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
            else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.92));
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
                 <button type="button" onclick="downloadCurrentFormPhoto('out')" title="Télécharger la photo avec bandeau et nom auto" style="position:absolute;bottom:2px;left:2px;background:#10B981;color:#fff;border:none;border-radius:4px;width:24px;height:22px;font-size:12px;padding:0;line-height:22px;cursor:pointer;">💾</button>
                 <button type="button" onclick="removeZoomOutPhoto()" title="Supprimer" style="position:absolute;top:2px;right:2px;background:#EF4444;color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;padding:0;line-height:22px;cursor:pointer;">×</button>
               </div>`
            : '';
    }
    if (previewIn) {
        previewIn.innerHTML = tempZoomInPhotos.map((src, idx) => `
            <div style="position:relative;display:inline-block;">
                <img src="${src}" class="photo-thumb" alt="Zoom In">
                <button type="button" onclick="downloadCurrentFormPhoto('in', ${idx})" title="Télécharger la photo avec bandeau et nom auto" style="position:absolute;bottom:2px;left:2px;background:#10B981;color:#fff;border:none;border-radius:4px;width:24px;height:22px;font-size:12px;padding:0;line-height:22px;cursor:pointer;">💾</button>
                <button type="button" onclick="removeZoomInPhoto(${idx})" title="Supprimer" style="position:absolute;top:2px;right:2px;background:#EF4444;color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;padding:0;line-height:22px;cursor:pointer;">×</button>
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

    if (snInput) currentAircraftReport.aircraftSN = snInput.value.trim() || "AC 55XXX";
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
    listDiv.innerHTML = currentAircraftReport.anomalies.map((anom, idx) => {
        const hasOut = !!anom.zoomOutPhoto;
        const inCount = anom.zoomInPhotos ? anom.zoomInPhotos.length : 0;

        let photoDownloadButtons = '';
        if (hasOut) {
            photoDownloadButtons += `<button type="button" class="small-btn" style="background:#0D9488;padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="downloadSavedAnomalyPhoto(${idx}, 'out')">💾 Zoom Out</button>`;
        }
        if (inCount > 0) {
            anom.zoomInPhotos.forEach((_, zIdx) => {
                photoDownloadButtons += `<button type="button" class="small-btn" style="background:#0284C7;padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="downloadSavedAnomalyPhoto(${idx}, 'in', ${zIdx})">💾 Zoom In #${zIdx + 1}</button>`;
            });
        }
        if ((hasOut ? 1 : 0) + inCount > 1) {
            photoDownloadButtons += `<button type="button" class="small-btn" style="background:#10B981;padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="downloadAllPhotosForAnomaly(${idx})">📥 Toutes les photos</button>`;
        }

        const sampleBanner = buildBannerText(currentAircraftReport.aircraftSN, idx + 1, anom.type, anom.frame, anom.stringer, 'Zoom...');

        return `
        <div class="anomaly-item" style="${editingAnomalyIndex === idx ? 'border-color: #F59E0B;' : ''}">
            <div style="flex:1;">
                <strong style="color: #60A5FA;">#${idx + 1} — ${anom.type.toUpperCase()}</strong>
                <div style="font-size: 0.85rem; margin-top: 0.2rem;">
                    <strong>Pièce :</strong> ${anom.partName} (PN: ${anom.partPN}) | <strong>Zone :</strong> ${anom.frame} / ${anom.stringer}<br>
                    <strong>Dimensions :</strong> ${anom.dimensions}
                    ${anom.comment ? `<br><strong>Commentaire :</strong> <em>${anom.comment}</em>` : ''}
                </div>
                ${photoDownloadButtons ? `
                    <div style="margin-top:0.45rem;display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;">
                        <span style="font-size:0.75rem;color:#94A3B8;" title="Bandeau : ${sampleBanner}">Télécharger avec bandeau :</span>
                        ${photoDownloadButtons}
                    </div>
                ` : ''}
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button type="button" class="secondary small-btn" onclick="editAnomalyFromAircraft(${idx})" style="background-color: #F59E0B; color: #000;">Modifier</button>
                <button type="button" class="danger small-btn" onclick="removeAnomalyFromAircraft(${idx})">Retirer</button>
            </div>
        </div>
        `;
    }).join('');
}

// =========================================================================
// AJOUT & SUPPRESSION : EMAILS, PIÈCES, ANOMALIES, FRAMES & STRINGERS
// =========================================================================

function addNewEmail() {
    const input = document.getElementById('new-email-input');
    if (!input || !input.value.trim()) return;
    const email = input.value.trim();
    let customEmails = getCustomEmails();
    if (!customEmails.includes(email) && !DEFAULT_EMAILS.includes(email)) {
        customEmails.push(email);
        localStorage.setItem('skincare_custom_emails', JSON.stringify(customEmails));
    }
    renderApp();
    document.getElementById('recipient-email').value = email;
}

function deleteSelectedEmail() {
    const select = document.getElementById('recipient-email');
    if (!select || !select.value) {
        return alert("Veuillez d'abord sélectionner une adresse e-mail dans la liste pour la supprimer.");
    }
    const targetEmail = select.value;
    if (DEFAULT_EMAILS.includes(targetEmail)) {
        return alert("Cette adresse fait partie des adresses par défaut du système. Seules les adresses ajoutées manuellement peuvent être supprimées.");
    }
    if (!confirm(`Voulez-vous vraiment supprimer l'adresse "${targetEmail}" ?`)) return;

    let customEmails = getCustomEmails().filter(e => e !== targetEmail);
    localStorage.setItem('skincare_custom_emails', JSON.stringify(customEmails));
    renderApp();
}

function adminAddPart() {
    const name = document.getElementById('admin-part-name').value.trim();
    const pn = document.getElementById('admin-part-pn').value.trim();
    const category = document.getElementById('admin-part-cat').value;
    if (!name || !pn) return alert("Veuillez renseigner le nom et le Part Number.");
    let custom = getCustomParts();
    custom.push({ name, pn, category });
    localStorage.setItem('skincare_custom_parts', JSON.stringify(custom));
    renderApp();
}

function adminDeletePart(index) {
    let custom = getCustomParts();
    if (!custom[index]) return;
    if (!confirm(`Supprimer la pièce "${custom[index].name} (${custom[index].pn})" ?`)) return;
    custom.splice(index, 1);
    localStorage.setItem('skincare_custom_parts', JSON.stringify(custom));
    renderApp();
}

function adminAddAnomaly() {
    const name = document.getElementById('admin-anomaly-name').value.trim();
    if (!name) return alert("Veuillez saisir le nom de l'anomalie.");
    let custom = getCustomAnomalies();
    custom.push(name);
    localStorage.setItem('skincare_custom_anomalies', JSON.stringify(custom));
    renderApp();
}

function adminDeleteAnomaly(index) {
    let custom = getCustomAnomalies();
    if (!custom[index]) return;
    if (!confirm(`Supprimer le type d'anomalie "${custom[index]}" ?`)) return;
    custom.splice(index, 1);
    localStorage.setItem('skincare_custom_anomalies', JSON.stringify(custom));
    renderApp();
}

function adminAddFrame() {
    const frame = document.getElementById('admin-zone-frame').value.trim().toUpperCase();
    if (!frame) return alert("Veuillez saisir un code Frame (ex: FR80).");
    let custom = getCustomFrames();
    custom.push(frame);
    localStorage.setItem('skincare_custom_frames', JSON.stringify(custom));
    renderApp();
}

function adminDeleteFrame(index) {
    let custom = getCustomFrames();
    if (!custom[index]) return;
    if (!confirm(`Supprimer le Frame "${custom[index]}" ?`)) return;
    custom.splice(index, 1);
    localStorage.setItem('skincare_custom_frames', JSON.stringify(custom));
    renderApp();
}

function adminAddStringer() {
    const strg = document.getElementById('admin-zone-strg').value.trim().toUpperCase();
    if (!strg) return alert("Veuillez saisir un code Stringer (ex: STRG 37L).");
    let custom = getCustomStringers();
    const numMatch = strg.match(/\d+/);
    custom.push({ code: strg, num: numMatch ? parseInt(numMatch[0], 10) : 99 });
    localStorage.setItem('skincare_custom_stringers', JSON.stringify(custom));
    renderApp();
}

function adminDeleteStringer(index) {
    let custom = getCustomStringers();
    if (!custom[index]) return;
    if (!confirm(`Supprimer le Stringer "${custom[index].code}" ?`)) return;
    custom.splice(index, 1);
    localStorage.setItem('skincare_custom_stringers', JSON.stringify(custom));
    renderApp();
}

// =========================================================================
// GÉNÉRATION PDF GRAND FORMAT INGÉNIERIE (PHOTOS 680x512 + COPYRIGHT PreFAL-Rear)
// =========================================================================

function generateReportHTML(recipientEmail) {
    const rows = currentAircraftReport.anomalies.map((anom, i) => {
        const anomNum = i + 1;

        const zoomInImgs = anom.zoomInPhotos.map((src, idx) => {
            const bannerIn = buildBannerText(currentAircraftReport.aircraftSN, anomNum, anom.type, anom.frame, anom.stringer, `Zoom In #${idx + 1}`);
            return `
            <div style="margin-bottom:14px;page-break-inside:avoid;">
                <div style="font-size:12px;font-weight:bold;color:#0f172a;margin-bottom:4px;">Photo Anomalie (Zoom In #${idx + 1}) — 680 × 512 px :</div>
                <div style="position:relative;width:680px;height:512px;background:#000;border:1px solid #64748b;border-radius:4px;overflow:hidden;">
                    <img src="${src}" style="width:680px;height:512px;object-fit:contain;display:block;">
                    <div style="position:absolute;bottom:0;left:0;width:100%;background:rgba(11,29,54,0.9);border-top:1px solid #3B82F6;color:#ffffff;font-size:13px;font-weight:bold;text-align:center;padding:7px 8px;box-sizing:border-box;font-family:Arial,sans-serif;letter-spacing:0.2px;">
                        ${bannerIn}
                    </div>
                </div>
            </div>`;
        }).join('');

        const bannerOut = buildBannerText(currentAircraftReport.aircraftSN, anomNum, anom.type, anom.frame, anom.stringer, 'Zoom Out');

        return `
            <div style="border:1px solid #94a3b8;border-radius:6px;padding:14px;margin-bottom:20px;background:#f8fafc;color:#0f172a;">
                <h3 style="color:#0F2744;margin:0 0 8px 0;font-size:16px;border-bottom:2px solid #cbd5e1;padding-bottom:4px;">
                    Anomalie #${anomNum} — ${anom.type.toUpperCase()}
                </h3>
                <p style="margin:4px 0;font-size:13.5px;color:#0f172a;"><strong>Pièce :</strong> ${anom.partName} (PN: ${anom.partPN}) &nbsp;|&nbsp; <strong>Zone :</strong> ${anom.frame} - ${anom.stringer}</p>
                <p style="margin:4px 0;font-size:13.5px;color:#0f172a;"><strong>Dimensions :</strong> ${anom.dimensions}</p>
                ${anom.comment ? `<p style="margin:8px 0;padding:8px;background:#e2e8f0;border-left:4px solid #0F2744;font-size:13px;color:#0f172a;"><strong>Commentaire Opérateur :</strong> ${anom.comment}</p>` : ''}
                <div style="margin-top:12px;display:flex;flex-direction:column;align-items:center;">
                    ${anom.zoomOutPhoto ? `
                        <div style="margin-bottom:14px;page-break-inside:avoid;">
                            <div style="font-size:12px;font-weight:bold;color:#0f172a;margin-bottom:4px;">Photo Zone (Zoom Out) — 680 × 512 px :</div>
                            <div style="position:relative;width:680px;height:512px;background:#000;border:1px solid #64748b;border-radius:4px;overflow:hidden;">
                                <img src="${anom.zoomOutPhoto}" style="width:680px;height:512px;object-fit:contain;display:block;">
                                <div style="position:absolute;bottom:0;left:0;width:100%;background:rgba(11,29,54,0.9);border-top:1px solid #3B82F6;color:#ffffff;font-size:13px;font-weight:bold;text-align:center;padding:7px 8px;box-sizing:border-box;font-family:Arial,sans-serif;letter-spacing:0.2px;">
                                    ${bannerOut}
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    ${zoomInImgs}
                </div>
            </div>`;
    }).join('');

    return `
        <div id="pdf-content-inner" style="width:740px;padding:15px;background:#ffffff;color:#0f172a;font-family:Arial,sans-serif;">
            <h1 style="color:#0F2744;font-size:18px;border-bottom:2px solid #0F2744;padding-bottom:6px;margin-top:0;">RAPPORT D'INSPECTION — SKIN CARE (PreFAL-Rear PN: C013900001-001)</h1>
            <p style="font-size:12.5px;margin:8px 0 14px 0;color:#0f172a;">
                <strong>Avion SN :</strong> ${currentAircraftReport.aircraftSN} &nbsp;|&nbsp;
                <strong>Opérateur :</strong> ${currentAircraftReport.operatorName || 'N/A'} &nbsp;|&nbsp;
                <strong>Destinataire :</strong> ${recipientEmail || 'Production, Qualité & Ingénierie'} &nbsp;|&nbsp;
                <strong>Date :</strong> ${new Date().toLocaleDateString()}
            </p>
            ${rows}
            <!-- PIED DE PAGE OFFICIEL BILINGUE PreFAL-Rear -->
            <div style="margin-top:20px;padding:10px 12px;border-top:2px solid #0F2744;background:#f1f5f9;color:#334155;font-size:10px;text-align:center;line-height:1.45;page-break-inside:avoid;">
                <strong>${COPYRIGHT_FR}</strong><br>
                <strong>${COPYRIGHT_EN}</strong><br>
                Document technique confidentiel (Rear Fuse PN: C013900001-001). Toute reproduction ou diffusion non autorisée est interdite / Confidential technical document. Unauthorized reproduction is prohibited.
            </div>
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
        margin: 6,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2.5, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    setTimeout(() => {
        html2pdf().set(opt).from(targetElement).save().then(() => {
            document.body.removeChild(overlay);
        }).catch(err => {
            console.error(err);
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        });
    }, 350);
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

    preparedRecipient = recipient;
    const overlay = createVisibleReportOverlay(recipient);
    const targetElement = overlay.querySelector('#pdf-content-inner');
    const fileName = `Rapport_SkinCare_${currentAircraftReport.aircraftSN.replace(/\s+/g, '_')}.pdf`;
    
    const opt = {
        margin: 6,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2.5, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
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
    }, 350);
}

function showReadyToSendModal(fileName, recipient) {
    let modal = document.getElementById('send-confirm-modal');
    if (modal) modal.remove();

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(recipient).catch(() => {});
    }

    modal = document.createElement('div');
    modal.id = 'send-confirm-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(9,17,30,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
        <div style="background:#0F2744;border:2px solid #10B981;border-radius:10px;padding:1.5rem;max-width:460px;width:100%;text-align:center;color:#F8FAFC;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <h3 style="color:#34D399;margin-bottom:0.5rem;font-size:1.15rem;">✅ Rapport PDF PreFAL-Rear Prêt !</h3>
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

async function triggerInstantShare() {
    const modal = document.getElementById('send-confirm-modal');
    if (modal) modal.remove();
    if (!preparedPdfFile) return;

    if (navigator.canShare && navigator.canShare({ files: [preparedPdfFile] })) {
        try {
            await navigator.share({
                files: [preparedPdfFile],
                title: `Rapport Skin Care PreFAL-Rear - ${currentAircraftReport.aircraftSN}`,
                text: `À envoyer à : ${preparedRecipient}\nRapport d'inspection Skin Care PreFAL-Rear (${currentAircraftReport.anomalies.length} anomalie(s)) pour l'avion ${currentAircraftReport.aircraftSN}.\n${COPYRIGHT_FR}\n${COPYRIGHT_EN}`
            });
            return;
        } catch (err) {
            console.warn("Partage annulé ou repli PC :", err);
        }
    }
    triggerPcFallback();
}

async function triggerPcFallback() {
    const modal = document.getElementById('send-confirm-modal');
    if (modal) modal.remove();
    if (!preparedPdfBlob || !preparedPdfFile) return;

    try {
        const htmlContent = generateReportHTML(preparedRecipient);
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([`Rapport Skin Care PreFAL-Rear - ${currentAircraftReport.aircraftSN}`], { type: 'text/plain' });
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

    const subject = encodeURIComponent(`Rapport Inspection Skin Care (PreFAL-Rear) - Avion ${currentAircraftReport.aircraftSN}`);
    const body = encodeURIComponent(
        `Bonjour,\n\nVeuillez trouver le rapport d'inspection PreFAL-Rear pour l'avion ${currentAircraftReport.aircraftSN} (${currentAircraftReport.anomalies.length} anomalie(s)).\n\n👉 SUR PC : Faites "Ctrl + V" (Coller) ici pour insérer le rapport, ou joignez le fichier "${preparedPdfFile.name}" qui vient d'être téléchargé.\n\n---\n${COPYRIGHT_FR}\n${COPYRIGHT_EN}`
    );
    window.location.href = `mailto:${preparedRecipient}?subject=${subject}&body=${body}`;
}

// =========================================================================
// GÉNÉRATEUR DE QR CODE & AFFICHE D'ATELIER (V15 PreFAL-Rear)
// =========================================================================

function showWorkshopQRCode() {
    const appUrl = "https://bkhedher270775-debug.github.io/skin-care-pwa/?v=15";
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(appUrl)}`;

    let modal = document.getElementById('qr-code-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'qr-code-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(9,17,30,0.92);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
        <div style="background:#0F2744;border:2px solid #3B82F6;border-radius:12px;padding:1.5rem;max-width:440px;width:100%;text-align:center;color:#F8FAFC;box-shadow:0 10px 30px rgba(0,0,0,0.6);">
            <div style="font-size:0.75rem;color:#60A5FA;font-weight:bold;letter-spacing:0.5px;margin-bottom:0.25rem;">PreFAL-Rear — PN: C013900001-001 (V15)</div>
            <h3 style="color:#ffffff;margin-bottom:0.5rem;font-size:1.2rem;">Accès Mobile — Skin Care V15</h3>
            <p style="font-size:0.85rem;color:#94A3B8;margin-bottom:1rem;">
                Scannez ce QR Code avec le téléphone (Accès protégé par mot de passe) :
            </p>
            <div style="background:#ffffff;padding:12px;border-radius:8px;display:inline-block;margin-bottom:1rem;">
                <img src="${qrApiUrl}" alt="QR Code Skin Care V15" style="width:220px;height:220px;display:block;">
            </div>
            <p style="font-size:0.75rem;color:#CBD5E1;margin-bottom:1rem;word-break:break-all;">
                ${appUrl}
            </p>
            <div style="display:flex;gap:0.5rem;">
                <button type="button" onclick="printWorkshopPoster('${qrApiUrl}', '${appUrl}')" style="background:#10B981;color:#fff;padding:0.7rem;border-radius:8px;font-weight:bold;flex:1;border:none;cursor:pointer;">
                    🖨️ Imprimer Affiche Atelier
                </button>
                <button type="button" onclick="document.getElementById('qr-code-modal').remove()" style="background:#475569;color:#fff;padding:0.7rem;border-radius:8px;width:auto;border:none;cursor:pointer;">
                    Fermer
                </button>
            </div>
            <div style="margin-top:0.85rem;font-size:0.68rem;color:#94A3B8;line-height:1.4;">
                ${COPYRIGHT_FR}<br>${COPYRIGHT_EN}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function printWorkshopPoster(qrApiUrl, appUrl) {
    const w = window.open('', '_blank', 'width=800,height=700');
    if (!w) return alert("Autorisez les fenêtres pop-ups pour imprimer l'affiche.");
    w.document.write(`
        <html>
        <head><title>Affiche Atelier - Skin Care V15 (PreFAL-Rear)</title></head>
        <body onload="setTimeout(() => window.print(), 400);" style="font-family:Arial,sans-serif;text-align:center;padding:40px;color:#0F2744;">
            <div style="border:4px solid #0F2744;border-radius:16px;padding:40px;max-width:600px;margin:0 auto;">
                <div style="background:#0F2744;color:#ffffff;padding:8px 16px;border-radius:20px;display:inline-block;font-weight:bold;font-size:14px;">
                    PreFAL-Rear — REAR FUSE PN: C013900001-001 (V15)
                </div>
                <h1 style="font-size:32px;margin:20px 0 10px 0;">APPLICATION SKIN CARE</h1>
                <h2 style="font-size:18px;color:#475569;margin-top:0;">Inspection & Déclaration des Anomalies de Surface</h2>
                <div style="margin:30px 0;">
                    <img src="${qrApiUrl}" style="width:280px;height:280px;border:2px solid #cbd5e1;padding:10px;border-radius:12px;">
                </div>
                <p style="font-size:16px;line-height:1.6;color:#1e293b;text-align:left;background:#f1f5f9;padding:20px;border-radius:8px;">
                    <strong>📱 Instructions Opérateur Production :</strong><br>
                    1. Scannez ce QR Code avec l'appareil photo du téléphone.<br>
                    2. Entrez le <strong>mot de passe atelier</strong> pour déverrouiller l'application.<br>
                    3. Sélectionnez le SN avion, la pièce, la zone (FR/STRG), prenez les photos (Zoom Out / Zoom In) et envoyez le rapport PDF.
                </p>
                <p style="font-size:12px;color:#64748b;margin-top:16px;">Lien direct : ${appUrl}</p>
                <div style="margin-top:20px;padding-top:12px;border-top:1px solid #cbd5e1;font-size:10.5px;color:#475569;line-height:1.45;">
                    <strong>${COPYRIGHT_FR}</strong><br>
                    ${COPYRIGHT_EN}
                </div>
            </div>
        </body>
        </html>
    `);
    w.document.close();
}
// FIN DU FICHIER APP.JS V15