(() => {
  'use strict';

  const STORAGE_KEY = 'sentinel-face-profile-v1';
  const TOTP_STORAGE_KEY = 'sentinel-authenticator-v1';
  const LINKS_STORAGE_KEY = 'sentinel-protected-links-v1';
  const MATCH_THRESHOLD = 0.56;
  const MODEL_BASE = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models/';
  const SAMPLE_COUNT = 3;

  const elements = {
    header: document.querySelector('[data-header]'),
    navToggle: document.querySelector('.nav-toggle'),
    nav: document.querySelector('.site-nav'),
    status: document.querySelector('[data-status]'),
    statusTitle: document.querySelector('[data-status-title]'),
    statusCopy: document.querySelector('[data-status-copy]'),
    statusProgress: document.querySelector('[data-status-progress]'),
    cameraStage: document.querySelector('[data-camera-stage]'),
    cameraPlaceholder: document.querySelector('[data-camera-placeholder]'),
    modelBadge: document.querySelector('[data-model-badge]'),
    video: document.querySelector('[data-video]'),
    overlay: document.querySelector('[data-overlay]'),
    profileForm: document.querySelector('[data-profile-form]'),
    name: document.querySelector('#profile-name'),
    email: document.querySelector('#profile-email'),
    consent: document.querySelector('[data-consent]'),
    startCamera: document.querySelector('[data-start-camera]'),
    stopCamera: document.querySelector('[data-stop-camera]'),
    enrol: document.querySelector('[data-enrol]'),
    verify: document.querySelector('[data-verify]'),
    profileCard: document.querySelector('[data-profile-card]'),
    profileName: document.querySelector('[data-profile-name]'),
    profileDate: document.querySelector('[data-profile-date]'),
    profileInitials: document.querySelector('[data-profile-initials]'),
    clearProfile: document.querySelector('[data-clear-profile]'),
    result: document.querySelector('[data-result]'),
    resultIcon: document.querySelector('[data-result-icon]'),
    resultTitle: document.querySelector('[data-result-title]'),
    resultCopy: document.querySelector('[data-result-copy]'),
    resultScore: document.querySelector('[data-result-score]'),
    scoreRing: document.querySelector('[data-score-ring]'),
    toast: document.querySelector('[data-toast]'),
    steps: [...document.querySelectorAll('[data-step]')],
    authEmpty: document.querySelector('[data-auth-empty]'),
    authActive: document.querySelector('[data-auth-active]'),
    authForm: document.querySelector('[data-auth-form]'),
    authAccount: document.querySelector('#auth-account'),
    authSecret: document.querySelector('#auth-secret'),
    authLabel: document.querySelector('[data-auth-label]'),
    authCode: document.querySelector('[data-auth-code]'),
    authSeconds: document.querySelector('[data-auth-seconds]'),
    authTimerBar: document.querySelector('[data-auth-timer-bar]'),
    authKey: document.querySelector('[data-auth-key]'),
    authCopyCode: document.querySelector('[data-auth-copy-code]'),
    authCopyKey: document.querySelector('[data-auth-copy-key]'),
    authReset: document.querySelector('[data-auth-reset]'),
    protectForm: document.querySelector('[data-protect-form]'),
    protectUrl: document.querySelector('#protect-url'),
    protectLabel: document.querySelector('#protect-label'),
    protectFace: document.querySelector('[data-protect-face]'),
    protectCode: document.querySelector('[data-protect-code]'),
    protectHint: document.querySelector('[data-protect-hint]'),
    protectOutput: document.querySelector('[data-protect-output]'),
    protectOutputLabel: document.querySelector('[data-protect-output-label]'),
    protectLink: document.querySelector('[data-protect-link]'),
    protectOpen: document.querySelector('[data-protect-open]'),
    protectTarget: document.querySelector('[data-protect-target]'),
    protectRequirements: document.querySelector('[data-protect-requirements]'),
    protectCopyLink: document.querySelector('[data-copy-protect-link]'),
    protectCards: document.querySelector('[data-protect-cards]'),
    protectEmpty: document.querySelector('[data-protect-empty]'),
    protectCount: document.querySelector('[data-protect-count]'),
    unlockOverlay: document.querySelector('[data-unlock-overlay]'),
    unlockTitle: document.querySelector('[data-unlock-title]'),
    unlockDesc: document.querySelector('[data-unlock-desc]'),
    unlockMeta: document.querySelector('[data-unlock-meta]'),
    unlockDomain: document.querySelector('[data-unlock-domain]'),
    unlockRequirements: document.querySelector('[data-unlock-requirements]'),
    unlockFace: document.querySelector('[data-unlock-face]'),
    unlockFaceStatus: document.querySelector('[data-unlock-face-status]'),
    unlockFaceCheck: document.querySelector('[data-unlock-face-check]'),
    unlockStartCamera: document.querySelector('[data-unlock-start-camera]'),
    unlockCode: document.querySelector('[data-unlock-code]'),
    unlockCodeInput: document.querySelector('[data-unlock-code-input]'),
    unlockCodeStatus: document.querySelector('[data-unlock-code-status]'),
    unlockCodeCheck: document.querySelector('[data-unlock-code-check]'),
    unlockVerifyCode: document.querySelector('[data-unlock-verify-code]'),
    unlockSuccess: document.querySelector('[data-unlock-success]'),
    unlockTarget: document.querySelector('[data-unlock-target]'),
    unlockOpen: document.querySelector('[data-unlock-open]'),
    unlockContinue: document.querySelector('[data-unlock-continue]'),
    unlockClose: document.querySelector('[data-unlock-close]'),
    unlockError: document.querySelector('[data-unlock-error]'),
    unlockNotFound: document.querySelector('[data-unlock-notfound]'),
  };

  const state = {
    stream: null,
    human: null,
    modelsReady: false,
    busy: false,
    profile: null,
    authenticator: null,
    totpCounter: null,
    totpTimer: null,
    toastTimer: null,
    protectedLinks: [],
    currentUnlock: null,
    unlockFaceVerified: false,
    unlockCodeVerified: false,
    unlockBusy: false,
  };

  const icons = {
    success: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5"/></svg>',
    fail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>',
  };

  function setStatus(title, copy, tone = 'idle', progress = '') {
    elements.status.dataset.tone = tone;
    elements.statusTitle.textContent = title;
    elements.statusCopy.textContent = copy;
    elements.statusProgress.textContent = progress;
  }

  function setStep(activeStep) {
    elements.steps.forEach((step) => {
      const number = Number(step.dataset.step);
      step.classList.toggle('active', number === activeStep);
      step.classList.toggle('complete', number < activeStep);
    });
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 4200);
  }

  function setBusy(isBusy) {
    state.busy = isBusy;
    elements.cameraStage.classList.toggle('processing', isBusy);
    elements.startCamera.disabled = isBusy;
    elements.enrol.disabled = isBusy || !state.modelsReady || !state.stream;
    elements.verify.disabled = isBusy || !state.modelsReady || !state.stream || !state.profile;
  }

  function initials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  }

  function readProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.name || !Array.isArray(parsed.embeddings) || parsed.embeddings.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function renderProfile() {
    state.profile = readProfile();
    elements.profileCard.hidden = !state.profile;

    if (state.profile) {
      elements.profileName.textContent = state.profile.name;
      elements.profileInitials.textContent = initials(state.profile.name);
      elements.profileDate.textContent = `Saved ${new Intl.DateTimeFormat(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
      }).format(new Date(state.profile.enrolledAt))}`;
      elements.name.value = state.profile.name;
      elements.email.value = state.profile.email || '';
      setStep(state.stream ? 3 : 1);
    } else {
      setStep(state.stream ? 2 : 1);
    }

    elements.verify.disabled = state.busy || !state.modelsReady || !state.stream || !state.profile;
    if (elements.protectHint) updateProtectHint();
  }

  async function loadModels() {
    if (state.modelsReady) return;
    if (!window.Human?.Human) {
      throw new Error('The browser AI library could not be downloaded. Check your internet connection and refresh.');
    }

    setStatus('Loading face model', 'The first load can take a moment; the model is cached afterwards.', 'loading', 'Downloading');

    state.human = new window.Human.Human({
      backend: 'webgl',
      modelBasePath: MODEL_BASE,
      cacheModels: true,
      debug: false,
      warmup: 'face',
      filter: {
        enabled: true,
        flip: false,
        autoBrightness: true,
        equalization: false,
      },
      face: {
        enabled: true,
        detector: {
          rotation: true,
          maxDetected: 2,
          minConfidence: 0.55,
          return: false,
        },
        mesh: { enabled: true },
        description: { enabled: true },
        iris: { enabled: false },
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      gesture: { enabled: false },
      segmentation: { enabled: false },
    });

    await state.human.load();
    setStatus('Preparing face model', 'Warming up the browser AI engine.', 'loading', 'Initialising');
    await state.human.warmup();
    state.modelsReady = true;
    elements.modelBadge.hidden = false;
  }

  async function startCamera() {
    if (state.busy) return;
    if (state.stream) {
      await stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Camera unavailable', 'Use a current browser on localhost or HTTPS.', 'error');
      showToast('This browser does not expose camera access here.');
      return;
    }

    setBusy(true);
    hideResult();
    setStatus('Requesting camera', 'Approve the browser permission prompt to continue.', 'loading', 'Permission');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      state.stream = stream;
      elements.video.srcObject = stream;
      await elements.video.play();
      elements.cameraPlaceholder.hidden = true;
      elements.cameraStage.classList.add('live');
      elements.startCamera.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg> Stop camera';
      elements.stopCamera.hidden = false;
      resizeOverlay();

      await loadModels();
      setStatus('Camera and model ready', 'Centre one face in the guide, then enrol or verify.', 'ready', 'Local only');
      setStep(state.profile ? 3 : 2);
      showToast('Camera ready. Frames remain on this device.');
    } catch (error) {
      await stopCamera(false);
      const permissionDenied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
      setStatus(
        permissionDenied ? 'Camera permission denied' : 'Could not start the verifier',
        permissionDenied ? 'Allow camera access in your browser settings and try again.' : friendlyError(error),
        'error',
      );
      showToast(permissionDenied ? 'Camera access is required for the verifier.' : friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function stopCamera(updateStatus = true) {
    state.stream?.getTracks().forEach((track) => track.stop());
    state.stream = null;
    elements.video.srcObject = null;
    elements.cameraPlaceholder.hidden = false;
    elements.cameraStage.classList.remove('live', 'processing');
    elements.startCamera.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 10 4.5-2.5v9L15 14M4 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/></svg> Start camera';
    elements.stopCamera.hidden = true;
    clearOverlay();
    setStep(1);
    if (updateStatus) setStatus('Camera stopped', 'Start it again whenever you are ready.', 'idle');
    setBusy(false);
  }

  function resizeOverlay() {
    const width = elements.video.videoWidth || 960;
    const height = elements.video.videoHeight || 720;
    elements.overlay.width = width;
    elements.overlay.height = height;
  }

  function clearOverlay() {
    const context = elements.overlay.getContext('2d');
    context.clearRect(0, 0, elements.overlay.width, elements.overlay.height);
  }

  function drawDetection(face, tone = 'ready') {
    resizeOverlay();
    clearOverlay();
    const context = elements.overlay.getContext('2d');
    const box = face.box;
    if (!box || box.length < 4) return;

    const [x, y, width, height] = box;
    const colour = tone === 'fail' ? '#ef6b72' : '#58e0bd';
    const corner = Math.min(width, height) * 0.18;
    context.strokeStyle = colour;
    context.lineWidth = Math.max(3, elements.overlay.width / 320);
    context.shadowColor = colour;
    context.shadowBlur = 11;
    context.beginPath();
    context.moveTo(x, y + corner); context.lineTo(x, y); context.lineTo(x + corner, y);
    context.moveTo(x + width - corner, y); context.lineTo(x + width, y); context.lineTo(x + width, y + corner);
    context.moveTo(x + width, y + height - corner); context.lineTo(x + width, y + height); context.lineTo(x + width - corner, y + height);
    context.moveTo(x + corner, y + height); context.lineTo(x, y + height); context.lineTo(x, y + height - corner);
    context.stroke();
  }

  async function captureEmbedding() {
    if (!state.stream || !state.modelsReady) throw new Error('Start the camera and wait for the model first.');
    if (elements.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) throw new Error('The camera is not ready yet.');

    const result = await state.human.detect(elements.video);
    if (!result.face?.length) {
      clearOverlay();
      throw new Error('No face found. Move into the guide and improve the lighting.');
    }
    if (result.face.length > 1) {
      clearOverlay();
      throw new Error('More than one face was found. Keep only one person in frame.');
    }

    const face = result.face[0];
    drawDetection(face);
    const embedding = Array.from(face.embedding || []);
    if (embedding.length < 64) throw new Error('A clear face descriptor could not be created. Look directly at the camera.');

    const frameWidth = elements.video.videoWidth || 960;
    if (face.box?.[2] < frameWidth * 0.18) {
      throw new Error('Move a little closer so your face fills more of the guide.');
    }
    return embedding;
  }

  async function collectSamples(count, label) {
    const samples = [];
    for (let index = 0; index < count; index += 1) {
      setStatus(label, `Hold still while sample ${index + 1} of ${count} is captured.`, 'loading', `${index + 1} / ${count}`);
      samples.push(await captureEmbedding());
      if (index < count - 1) await wait(360);
    }
    return samples;
  }

  async function enrolProfile() {
    if (state.busy) return;
    const name = elements.name.value.trim();
    const email = elements.email.value.trim();

    if (!name) {
      elements.name.focus();
      showToast('Add a display name before enrolling.');
      return;
    }
    if (!elements.consent.checked) {
      elements.consent.focus();
      showToast('Consent is required before a local descriptor can be stored.');
      return;
    }

    setBusy(true);
    hideResult();
    try {
      const embeddings = await collectSamples(SAMPLE_COUNT, 'Enrolling face');
      const profile = {
        version: 1,
        id: self.crypto?.randomUUID?.() || String(Date.now()),
        name,
        email,
        enrolledAt: new Date().toISOString(),
        embeddings,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      renderProfile();
      setStatus('Profile enrolled', `${name}'s descriptors are stored in this browser only.`, 'success', '3 samples');
      showResult(true, 'Enrolment complete', 'Take a fresh scan to test face verification.', 1);
      setStep(3);
      showToast('Local profile saved. No camera image was stored.');
    } catch (error) {
      setStatus('Enrolment paused', friendlyError(error), 'error');
      showToast(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifyProfile() {
    if (state.busy || !state.profile) return;
    setBusy(true);
    hideResult();

    try {
      setStatus('Verifying face', 'Hold still while a fresh descriptor is captured.', 'loading', 'Comparing');
      const probe = await captureEmbedding();
      const similarities = state.profile.embeddings.map((stored) => state.human.match.similarity(probe, stored));
      const best = Math.max(...similarities);
      const average = similarities.reduce((sum, score) => sum + score, 0) / similarities.length;
      const score = Math.max(0, Math.min(1, (best * 0.7) + (average * 0.3)));
      const matched = score >= MATCH_THRESHOLD;

      setStatus(
        matched ? 'Identity verified' : 'Face did not match',
        matched ? `Welcome back, ${state.profile.name}.` : 'Try again with similar lighting and camera position.',
        matched ? 'success' : 'error',
        `${Math.round(score * 100)}% similarity`,
      );
      showResult(
        matched,
        matched ? `Welcome, ${state.profile.name}` : 'Verification unsuccessful',
        matched ? 'The fresh descriptor matched this device\'s enrolled profile.' : 'The similarity score was below the demo threshold.',
        score,
      );
      showToast(matched ? 'Verification successful.' : 'No match. You can reposition and try again.');
    } catch (error) {
      setStatus('Verification paused', friendlyError(error), 'error');
      showToast(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  function showResult(success, title, copy, score) {
    const safeScore = Math.max(0, Math.min(1, score));
    elements.result.hidden = false;
    elements.result.classList.toggle('fail', !success);
    elements.resultIcon.innerHTML = success ? icons.success : icons.fail;
    elements.resultTitle.textContent = title;
    elements.resultCopy.textContent = copy;
    elements.resultScore.textContent = `${Math.round(safeScore * 100)}%`;
    elements.scoreRing.style.setProperty('--score', `${safeScore * 360}deg`);
  }

  function hideResult() {
    elements.result.hidden = true;
  }

  function clearProfile() {
    if (!state.profile) return;
    const confirmed = window.confirm(`Delete ${state.profile.name}'s face descriptors from this browser?`);
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    elements.name.value = '';
    elements.email.value = '';
    elements.consent.checked = false;
    state.profile = null;
    hideResult();
    renderProfile();
    setStatus(
      state.stream ? 'Local profile deleted' : 'Ready to begin',
      state.stream ? 'You can enrol a new profile now.' : 'Start your camera to enrol a new profile.',
      state.stream ? 'ready' : 'idle',
    );
    showToast('The local face descriptors were deleted.');
  }

  // ── Link vault ──────────────────────────────────────────────────────────
  function readLinks() {
    try {
      const raw = localStorage.getItem(LINKS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => item?.id && item?.targetUrl && typeof item.targetUrl === 'string');
    } catch {
      return [];
    }
  }

  function saveLinks(links) {
    state.protectedLinks = links;
    try {
      localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
    } catch {}
    renderProtectList();
  }

  function generateLinkId() {
    try {
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      return Array.from(bytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8);
    } catch {
      return Math.random().toString(36).slice(2, 10);
    }
  }

  function normaliseUrl(value) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.toString();
    } catch {
      try {
        const url = new URL(`https://${trimmed}`);
        if (url.hostname.includes('.')) return url.toString();
      } catch {}
      return null;
    }
  }

  function buildProtectedHref(id) {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('unlock', id);
    return url.toString();
  }

  function getUnlockIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('unlock');
    if (q) return q.trim();
    const hash = window.location.hash || '';
    const m = hash.match(/unlock[/=-]([A-Za-z0-9_-]{4,32})/);
    if (m) return m[1];
    if (hash.startsWith('#unlock')) {
      const raw = hash.replace(/^#unlock\/?/, '').trim();
      if (raw) return raw;
    }
    return null;
  }

  function updateProtectHint() {
    if (!elements.protectHint) return;
    const needsFace = elements.protectFace?.checked;
    const needsCode = elements.protectCode?.checked;
    let msg = '';
    if (needsFace && !state.profile) msg = 'Enrol a face first (in the verifier below) to use face protection.';
    else if (needsCode && !state.authenticator) msg = 'Set up your authenticator below to use code protection.';
    else if (!needsFace && !needsCode) msg = 'Select at least one protection method: face or code.';
    if (msg) {
      elements.protectHint.textContent = msg;
      elements.protectHint.hidden = false;
      elements.protectHint.dataset.tone = 'warn';
    } else {
      elements.protectHint.hidden = true;
    }
  }

  function renderProtectList() {
    if (!elements.protectCards) return;
    const links = state.protectedLinks;
    elements.protectCount.textContent = `${links.length} ${links.length === 1 ? 'link' : 'links'}`;
    elements.protectEmpty.hidden = links.length !== 0;
    elements.protectCards.innerHTML = '';
    if (links.length === 0) return;
    const sorted = [...links].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    for (const item of sorted) {
      const card = document.createElement('div');
      card.className = 'protect-card';
      const badges = [];
      if (item.requiresFace) badges.push('<span class="protect-badge face">Face</span>');
      if (item.requiresCode) badges.push('<span class="protect-badge code">Code</span>');
      const label = item.label ? `<strong>${escapeHtml(item.label)}</strong>` : '<strong>Untitled link</strong>';
      const domain = (() => { try { return new URL(item.targetUrl).hostname; } catch { return item.targetUrl; } })();
      card.innerHTML = `
        <div class="protect-card-top">
          <span class="protect-card-label">${label}<small>${escapeHtml(domain)}</small></span>
          <span class="protect-card-badges">${badges.join('')}</span>
        </div>
        <div class="protect-card-url" title="${escapeHtml(item.targetUrl)}">${escapeHtml(item.targetUrl)}</div>
        <div class="protect-card-actions">
          <button type="button" class="button button-ghost protect-card-copy" data-id="${item.id}">Copy link</button>
          <a class="button button-primary" href="${buildProtectedHref(item.id)}" target="_blank" rel="noopener">Open</a>
          <button type="button" class="icon-button protect-card-delete" data-id="${item.id}" aria-label="Delete">✕</button>
        </div>
      `;
      elements.protectCards.appendChild(card);
    }
    elements.protectCards.querySelectorAll('.protect-card-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        copyText(buildProtectedHref(id), 'Protected link copied.');
      });
    });
    elements.protectCards.querySelectorAll('.protect-card-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!window.confirm('Delete this protected link from this browser? The target URL will be removed.')) return;
        saveLinks(state.protectedLinks.filter((l) => l.id !== id));
        if (getUnlockIdFromUrl() === id) hideUnlock(true);
        showToast('Protected link deleted.');
      });
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function showProtectOutput(item) {
    if (!elements.protectOutput) return;
    elements.protectOutput.hidden = false;
    elements.protectOutputLabel.textContent = item.label ? `· ${item.label}` : '';
    const href = buildProtectedHref(item.id);
    elements.protectLink.textContent = href;
    elements.protectOpen.href = href;
    try { elements.protectTarget.textContent = new URL(item.targetUrl).hostname; } catch { elements.protectTarget.textContent = item.targetUrl; }
    const reqs = [];
    if (item.requiresFace) reqs.push('face match');
    if (item.requiresCode) reqs.push('6-digit code');
    elements.protectRequirements.textContent = reqs.join(' + ') || 'no protection';
    elements.protectOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function handleProtectSubmit(event) {
    event.preventDefault();
    const rawUrl = elements.protectUrl.value;
    const label = elements.protectLabel.value.trim();
    const requiresFace = Boolean(elements.protectFace.checked);
    const requiresCode = Boolean(elements.protectCode.checked);
    const targetUrl = normaliseUrl(rawUrl);

    if (!targetUrl) {
      showToast('Enter a valid https:// URL to protect.');
      elements.protectUrl.focus();
      return;
    }
    if (!requiresFace && !requiresCode) {
      showToast('Select at least one protection method.');
      updateProtectHint();
      return;
    }
    // Refresh profile/auth state
    state.profile = readProfile();
    state.authenticator = readAuthenticator();
    if (requiresFace && !state.profile) {
      showToast('Enrol a face first before using face protection.');
      document.querySelector('#demo')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (requiresCode && !state.authenticator) {
      showToast('Set up your authenticator first before using code protection.');
      document.querySelector('#authenticator')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    let id;
    let attempts = 0;
    do {
      id = generateLinkId();
      attempts += 1;
    } while (state.protectedLinks.some((l) => l.id === id) && attempts < 10);

    const item = {
      id,
      targetUrl,
      label,
      requiresFace,
      requiresCode,
      createdAt: new Date().toISOString(),
    };
    saveLinks([...state.protectedLinks, item]);
    showProtectOutput(item);
    elements.protectUrl.value = '';
    // keep label for convenience? clear it
    // elements.protectLabel.value = '';
    updateProtectHint();
    showToast('Protected link generated — copy and share it.');
  }

  function hideUnlock(clearUrl = false) {
    if (!elements.unlockOverlay) return;
    elements.unlockOverlay.hidden = true;
    document.body.classList.remove('unlock-open');
    state.currentUnlock = null;
    state.unlockFaceVerified = false;
    state.unlockCodeVerified = false;
    state.unlockBusy = false;
    if (clearUrl) {
      const url = new URL(window.location.href);
      url.searchParams.delete('unlock');
      if (url.hash.startsWith('#unlock')) url.hash = '';
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }

  function showUnlock(id) {
    const item = state.protectedLinks.find((l) => l.id === id);
    const isNotFound = !item;
    elements.unlockOverlay.hidden = false;
    document.body.classList.add('unlock-open');
    elements.unlockNotFound.hidden = !isNotFound;
    elements.unlockError.hidden = true;
    elements.unlockSuccess.hidden = true;
    elements.unlockFace.hidden = true;
    elements.unlockCode.hidden = true;
    elements.unlockMeta.hidden = true;
    elements.unlockFaceCheck.hidden = true;
    elements.unlockCodeCheck.hidden = true;
    elements.unlockRequirements.innerHTML = '';
    state.currentUnlock = item || null;
    state.unlockFaceVerified = false;
    state.unlockCodeVerified = false;

    if (isNotFound) {
      elements.unlockTitle.textContent = 'Link not found';
      elements.unlockDesc.textContent = 'This protected link does not exist on this device.';
      elements.unlockRequirements.innerHTML = '<span class="unlock-req-badge warn">Stored locally — not on this browser</span>';
      return;
    }

    let domain = '';
    try { domain = new URL(item.targetUrl).hostname; } catch {}
    elements.unlockTitle.textContent = item.label ? `Unlock: ${item.label}` : 'Unlock protected link';
    elements.unlockDesc.textContent = `This link is protected. Verify ${[item.requiresFace ? 'face' : null, item.requiresCode ? 'code' : null].filter(Boolean).join(' and ')} to open the destination.`;
    elements.unlockMeta.hidden = false;
    elements.unlockDomain.textContent = domain;

    const badges = [];
    if (item.requiresFace) badges.push('<span class="unlock-req-badge face">Face required</span>');
    if (item.requiresCode) badges.push('<span class="unlock-req-badge code">Code required</span>');
    elements.unlockRequirements.innerHTML = badges.join('');

    if (item.requiresFace) {
      elements.unlockFace.hidden = false;
      elements.unlockFaceStatus.textContent = state.profile ? 'Tap to start camera and verify' : 'No face enrolled on this device — cannot unlock with face.';
      elements.unlockStartCamera.disabled = !state.profile;
    }
    if (item.requiresCode) {
      elements.unlockCode.hidden = false;
      elements.unlockCodeStatus.textContent = state.authenticator ? 'Enter the current 6-digit code from your authenticator above.' : 'No authenticator set up on this device — cannot unlock with code.';
      elements.unlockVerifyCode.disabled = !state.authenticator;
      elements.unlockCodeInput.value = '';
      elements.unlockCodeInput.disabled = !state.authenticator;
    }
    if (!item.requiresFace && !item.requiresCode) {
      // No protection — immediate success
      handleUnlockSuccess();
    }
    elements.unlockOverlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function checkUnlockFromUrl() {
    const id = getUnlockIdFromUrl();
    if (id) {
      // Ensure links are loaded
      state.protectedLinks = readLinks();
      renderProtectList();
      showUnlock(id);
    } else {
      hideUnlock(false);
    }
  }

  async function verifyUnlockCode() {
    if (state.unlockBusy || !state.currentUnlock) return;
    const item = state.currentUnlock;
    if (!item.requiresCode) return;
    const raw = elements.unlockCodeInput.value.replace(/\s/g, '').trim();
    if (!/^\d{6}$/.test(raw)) {
      elements.unlockCodeStatus.textContent = 'Enter a 6-digit code.';
      elements.unlockCodeStatus.dataset.tone = 'error';
      showToast('Enter a 6-digit code.');
      return;
    }
    if (!state.authenticator) {
      elements.unlockCodeStatus.textContent = 'No authenticator on this device.';
      return;
    }
    state.unlockBusy = true;
    elements.unlockVerifyCode.disabled = true;
    elements.unlockCodeStatus.textContent = 'Verifying code…';
    try {
      const epoch = Math.floor(Date.now() / 1000);
      const counters = [Math.floor(epoch / 30) - 1, Math.floor(epoch / 30), Math.floor(epoch / 30) + 1];
      let ok = false;
      for (const c of counters) {
        const expected = await window.SentinelTotp.generate(state.authenticator.secret, c);
        if (expected === raw) { ok = true; break; }
      }
      if (!ok) throw new Error('Code did not match. Try again with the current code.');
      state.unlockCodeVerified = true;
      elements.unlockCodeCheck.hidden = false;
      elements.unlockCodeStatus.textContent = 'Code verified ✓';
      elements.unlockCodeStatus.dataset.tone = 'success';
      elements.unlockCodeInput.disabled = true;
      elements.unlockVerifyCode.disabled = true;
      showToast('Code verified.');
      maybeCompleteUnlock();
    } catch (error) {
      elements.unlockCodeStatus.textContent = friendlyError(error);
      elements.unlockCodeStatus.dataset.tone = 'error';
      showToast(friendlyError(error));
    } finally {
      state.unlockBusy = false;
      if (!state.unlockCodeVerified) elements.unlockVerifyCode.disabled = false;
    }
  }

  async function verifyUnlockFace() {
    if (state.unlockBusy || !state.currentUnlock) return;
    const item = state.currentUnlock;
    if (!item.requiresFace) return;
    if (!state.profile) {
      elements.unlockFaceStatus.textContent = 'No face enrolled on this device.';
      showToast('Enrol a face first.');
      return;
    }
    if (!state.stream || !state.modelsReady) {
      try {
        await startCamera();
      } catch {}
      if (!state.stream || !state.modelsReady) {
        elements.unlockFaceStatus.textContent = 'Start the camera first (in the verifier).';
        showToast('Start camera in the verifier above, then try again.');
        return;
      }
    }
    state.unlockBusy = true;
    elements.unlockStartCamera.disabled = true;
    elements.unlockFaceStatus.textContent = 'Hold still — verifying face…';
    try {
      const probe = await captureEmbedding();
      const sims = state.profile.embeddings.map((s) => state.human.match.similarity(probe, s));
      const best = Math.max(...sims);
      const avg = sims.reduce((a, b) => a + b, 0) / sims.length;
      const score = Math.max(0, Math.min(1, best * 0.7 + avg * 0.3));
      const matched = score >= MATCH_THRESHOLD;
      if (!matched) throw new Error(`Face did not match (${Math.round(score * 100)}%). Try again with similar lighting.`);
      state.unlockFaceVerified = true;
      elements.unlockFaceCheck.hidden = false;
      elements.unlockFaceStatus.textContent = `Face verified ✓ (${Math.round(score * 100)}%)`;
      elements.unlockFaceStatus.dataset.tone = 'success';
      showToast('Face verified.');
      maybeCompleteUnlock();
    } catch (error) {
      elements.unlockFaceStatus.textContent = friendlyError(error);
      elements.unlockFaceStatus.dataset.tone = 'error';
      showToast(friendlyError(error));
    } finally {
      state.unlockBusy = false;
      if (!state.unlockFaceVerified) elements.unlockStartCamera.disabled = false;
    }
  }

  function maybeCompleteUnlock() {
    const item = state.currentUnlock;
    if (!item) return;
    const needFace = item.requiresFace;
    const needCode = item.requiresCode;
    const faceOk = !needFace || state.unlockFaceVerified;
    const codeOk = !needCode || state.unlockCodeVerified;
    if (faceOk && codeOk) handleUnlockSuccess();
  }

  function handleUnlockSuccess() {
    const item = state.currentUnlock;
    if (!item) return;
    elements.unlockSuccess.hidden = false;
    elements.unlockTarget.textContent = item.targetUrl;
    elements.unlockOpen.href = item.targetUrl;
    elements.unlockError.hidden = true;
    // Auto-open after 1.2s? Do not auto-navigate parent, just show button. Optionally redirect same tab after delay.
    // For demo, we keep on page and let user click.
  }

  function initialiseProtect() {
    state.protectedLinks = readLinks();
    renderProtectList();
    updateProtectHint();
    if (elements.protectFace) elements.protectFace.addEventListener('change', updateProtectHint);
    if (elements.protectCode) elements.protectCode.addEventListener('change', updateProtectHint);
    if (elements.protectForm) elements.protectForm.addEventListener('submit', handleProtectSubmit);
    if (elements.protectCopyLink) elements.protectCopyLink.addEventListener('click', () => {
      const href = elements.protectLink.textContent.trim();
      if (href) copyText(href, 'Protected link copied.');
    });
    if (elements.unlockClose) elements.unlockClose.addEventListener('click', () => hideUnlock(true));
    if (elements.unlockContinue) elements.unlockContinue.addEventListener('click', () => hideUnlock(true));
    if (elements.unlockVerifyCode) elements.unlockVerifyCode.addEventListener('click', verifyUnlockCode);
    if (elements.unlockCodeInput) elements.unlockCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyUnlockCode(); });
    if (elements.unlockStartCamera) elements.unlockStartCamera.addEventListener('click', verifyUnlockFace);
    if (elements.unlockOverlay) elements.unlockOverlay.addEventListener('click', (e) => {
      if (e.target === elements.unlockOverlay) hideUnlock(true);
    });
    // Re-render when storage changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === LINKS_STORAGE_KEY) {
        state.protectedLinks = readLinks();
        renderProtectList();
        const id = getUnlockIdFromUrl();
        if (id && !state.protectedLinks.find((l) => l.id === id)) showUnlock(id);
      }
      if (e.key === STORAGE_KEY || e.key === TOTP_STORAGE_KEY) {
        state.profile = readProfile();
        state.authenticator = readAuthenticator();
        updateProtectHint();
        renderProtectList();
      }
    });
    window.addEventListener('popstate', checkUnlockFromUrl);
    window.addEventListener('hashchange', checkUnlockFromUrl);
    checkUnlockFromUrl();
  }

  function readAuthenticator() {
    try {
      const raw = localStorage.getItem(TOTP_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.label || !parsed?.secret) return null;
      window.SentinelTotp.decode(parsed.secret);
      return parsed;
    } catch {
      localStorage.removeItem(TOTP_STORAGE_KEY);
      return null;
    }
  }

  async function updateAuthenticator(force = false) {
    if (!state.authenticator) return;
    const epochSeconds = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epochSeconds / 30);
    const secondsRemaining = 30 - (epochSeconds % 30);
    elements.authSeconds.textContent = String(secondsRemaining);
    elements.authTimerBar.style.width = `${(secondsRemaining / 30) * 100}%`;

    if (!force && counter === state.totpCounter) return;
    state.totpCounter = counter;
    try {
      const code = await window.SentinelTotp.generate(state.authenticator.secret, counter);
      if (!state.authenticator || counter !== state.totpCounter) return;
      elements.authCode.textContent = `${code.slice(0, 3)} ${code.slice(3)}`;
    } catch (error) {
      elements.authCode.textContent = '--- ---';
      showToast(friendlyError(error));
    }
  }

  function renderAuthenticator() {
    state.authenticator = readAuthenticator();
    state.totpCounter = null;
    elements.authEmpty.hidden = Boolean(state.authenticator);
    elements.authActive.hidden = !state.authenticator;

    if (state.authenticator) {
      elements.authLabel.textContent = state.authenticator.label;
      elements.authKey.textContent = state.authenticator.secret.match(/.{1,4}/g)?.join(' ') || state.authenticator.secret;
      updateAuthenticator(true);
    } else {
      elements.authCode.textContent = '--- ---';
      elements.authSeconds.textContent = '30';
      elements.authTimerBar.style.width = '100%';
      if (!elements.authAccount.value) {
        elements.authAccount.value = state.profile?.email || state.profile?.name || '';
      }
    }
    if (elements.protectHint) updateProtectHint();
  }

  function setupAuthenticator(event) {
    event.preventDefault();
    if (!crypto?.getRandomValues || !crypto?.subtle) {
      showToast('This browser cannot create a secure authenticator key.');
      return;
    }

    const label = elements.authAccount.value.trim();
    if (!label) {
      elements.authAccount.focus();
      showToast('Add an account label before setting up the authenticator.');
      return;
    }

    try {
      const providedSecret = window.SentinelTotp.normalise(elements.authSecret.value);
      const secret = providedSecret || window.SentinelTotp.createSecret();
      const secretBytes = window.SentinelTotp.decode(secret);
      if (secretBytes.length < 10) throw new Error('Use a setup key that is at least 16 Base32 characters long.');

      localStorage.setItem(TOTP_STORAGE_KEY, JSON.stringify({
        version: 1,
        label,
        secret,
        createdAt: new Date().toISOString(),
      }));
      elements.authSecret.value = '';
      renderAuthenticator();
      showToast('Authenticator set up. A new code will appear every 30 seconds.');
    } catch (error) {
      showToast(friendlyError(error));
    }
  }

  function resetAuthenticator() {
    if (!state.authenticator) return;
    if (!window.confirm(`Remove the authenticator for ${state.authenticator.label} from this browser?`)) return;
    localStorage.removeItem(TOTP_STORAGE_KEY);
    state.authenticator = null;
    state.totpCounter = null;
    renderAuthenticator();
    showToast('The local authenticator key was removed.');
  }

  async function copyText(value, successMessage) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage);
    } catch {
      const input = document.createElement('textarea');
      input.value = value;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      showToast(successMessage);
    }
  }

  function initialiseAuthenticator() {
    renderAuthenticator();
    elements.authForm.addEventListener('submit', setupAuthenticator);
    elements.authReset.addEventListener('click', resetAuthenticator);
    elements.authCopyCode.addEventListener('click', () => {
      if (!state.authenticator) return;
      copyText(elements.authCode.textContent.replace(/\s/g, ''), 'Authenticator code copied.');
    });
    elements.authCopyKey.addEventListener('click', () => {
      if (!state.authenticator) return;
      copyText(state.authenticator.secret, 'Setup key copied.');
    });
    state.totpTimer = window.setInterval(updateAuthenticator, 250);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateAuthenticator(true);
    });
    window.addEventListener('storage', (event) => {
      if (event.key === TOTP_STORAGE_KEY) renderAuthenticator();
    });
  }

  function friendlyError(error) {
    if (typeof error === 'string') return error;
    return error?.message || 'Something unexpected happened. Please try again.';
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function initialiseNavigation() {
    const updateHeader = () => elements.header.classList.toggle('scrolled', window.scrollY > 18);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

    elements.navToggle.addEventListener('click', () => {
      const open = elements.navToggle.getAttribute('aria-expanded') !== 'true';
      elements.navToggle.setAttribute('aria-expanded', String(open));
      elements.nav.classList.toggle('open', open);
      document.body.classList.toggle('nav-open', open);
    });

    elements.nav.addEventListener('click', (event) => {
      if (!event.target.closest('a')) return;
      elements.navToggle.setAttribute('aria-expanded', 'false');
      elements.nav.classList.remove('open');
      document.body.classList.remove('nav-open');
    });
  }

  function initialise() {
    initialiseNavigation();
    renderProfile();
    initialiseAuthenticator();
    initialiseProtect();
    elements.startCamera.addEventListener('click', startCamera);
    elements.stopCamera.addEventListener('click', () => stopCamera());
    elements.enrol.addEventListener('click', enrolProfile);
    elements.verify.addEventListener('click', verifyProfile);
    elements.clearProfile.addEventListener('click', clearProfile);
    elements.video.addEventListener('loadedmetadata', resizeOverlay);
    window.addEventListener('resize', resizeOverlay, { passive: true });
    window.addEventListener('pagehide', () => state.stream?.getTracks().forEach((track) => track.stop()));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.unlockOverlay && !elements.unlockOverlay.hidden) hideUnlock(true);
    });
  }

  initialise();
})();
