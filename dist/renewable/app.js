/**
 * EcoPulse - Modern, Minimal & Resilient Telemetry Engine
 * Features:
 *  - Environmental, Smart Waste, Renewable Microgrid & Water Quality
 *  - Smooth count-up number animations
 *  - Animated SVG circular gauges
 *  - User Authentication & Registration (Local + Backend sync)
 *  - Consolidated Tools & Controls Slide-over Drawer
 *  - Expandable "More Details" sections
 *  - Autonomous Browser-Side Simulation Fallback
 *  - Multi-Route History API (/environmental, /waste, /renewable)
 */

(function () {
  'use strict';

  // ================= 1. USER SETTINGS & STATE =================
  const defaultSettings = {
    theme: 'dark',
    tempUnit: 'C',
    pressureUnit: 'hPa',
    massUnit: 'kg',
    audioEnabled: true,
    chimePreset: 'triad',
    audioVolume: 65,
    streamRate: 2.0,
    thresholds: {
      tempMax: 32.0,
      aqiCritical: 150,
      co2Warning: 1000,
      binOverflow: 85,
      phMin: 6.5,
      phMax: 8.5,
      turbidityMax: 5.0,
      leakThresholdLph: 850.0
    }
  };

  let userSettings = Object.assign({}, defaultSettings);
  try {
    const saved = localStorage.getItem('ecopulse_modern_settings');
    if (saved) userSettings = Object.assign({}, defaultSettings, JSON.parse(saved));
  } catch (e) {
    console.warn("Could not parse saved settings:", e);
  }

  function saveSettings() {
    try {
      localStorage.setItem('ecopulse_modern_settings', JSON.stringify(userSettings));
    } catch (e) {
      console.warn("Could not save settings:", e);
    }
  }

  // Registered Users Storage
  let registeredUsers = {
    'admin': { password: 'admin', fullname: 'Abhas Gabhane', role: 'Chief Sustainability Officer' }
  };
  try {
    const savedUsers = localStorage.getItem('ecopulse_registered_users');
    if (savedUsers) registeredUsers = Object.assign({}, registeredUsers, JSON.parse(savedUsers));
  } catch (e) {}

  function saveUsers() {
    try {
      localStorage.setItem('ecopulse_registered_users', JSON.stringify(registeredUsers));
    } catch (e) {}
  }

  // ================= 2. SMOOTH NUMBER ANIMATION HELPER =================
  const activeAnimations = {};
  function animateNumber(elementId, targetValue, decimals = 1, duration = 600) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startVal = parseFloat(el.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const endVal = parseFloat(targetValue);
    if (isNaN(endVal)) {
      el.textContent = targetValue;
      return;
    }
    if (startVal === endVal) return;

    const startTime = performance.now();
    if (activeAnimations[elementId]) cancelAnimationFrame(activeAnimations[elementId]);

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;

      el.textContent = current.toFixed(decimals);

      if (progress < 1) {
        activeAnimations[elementId] = requestAnimationFrame(step);
      } else {
        el.textContent = endVal.toFixed(decimals);
        delete activeAnimations[elementId];
      }
    }

    activeAnimations[elementId] = requestAnimationFrame(step);
  }

  // ================= 3. ANIMATED SVG GAUGES =================
  function updateCircularGauge(gaugeId, percent, maxScale = 100) {
    const gauge = document.getElementById(gaugeId);
    if (!gauge) return;
    const clampedPct = Math.max(0, Math.min(percent, maxScale));
    const normalized = (clampedPct / maxScale) * 100;
    const offset = Math.max(0, 100 - normalized);
    gauge.style.strokeDashoffset = offset.toFixed(1);
  }

  // ================= 4. AUDIO SYNTHESIZER (Web Audio API) =================
  let audioCtx = null;
  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playChime(type = 'triad') {
    if (!userSettings.audioEnabled) return;
    try {
      initAudioContext();
      const now = audioCtx.currentTime;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      gain.connect(audioCtx.destination);

      if (type === 'bell') {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.8);
      } else if (type === 'ping') {
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Harmonic Triad
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          osc.connect(gain);
          osc.start(now + idx * 0.08);
          osc.stop(now + 0.9);
        });
      }
    } catch (e) {
      console.warn("Audio chime prevented:", e);
    }
  }

  // ================= 5. THEME MODE MANAGER =================
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark');
      userSettings.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      userSettings.theme = 'light';
    }
    saveSettings();
    updateThemeButtons();
    updateChartColors();
  }

  function updateThemeButtons() {
    const isDark = document.documentElement.classList.contains('dark');
    const darkBtn = document.getElementById('setThemeDarkBtn');
    const lightBtn = document.getElementById('setThemeLightBtn');
    if (darkBtn && lightBtn) {
      if (isDark) {
        darkBtn.className = "py-2.5 rounded-xl subpanel-card border border-emerald-500/50 text-emerald-500 font-bold flex items-center justify-center space-x-2";
        lightBtn.className = "py-2.5 rounded-xl subpanel-card text-themed-secondary hover:text-themed-primary flex items-center justify-center space-x-2";
      } else {
        lightBtn.className = "py-2.5 rounded-xl subpanel-card border border-emerald-500/50 text-emerald-600 font-bold flex items-center justify-center space-x-2";
        darkBtn.className = "py-2.5 rounded-xl subpanel-card text-themed-secondary hover:text-themed-primary flex items-center justify-center space-x-2";
      }
    }
  }

  // ================= 6. CHART.JS STREAMS =================
  let tempHumidityChart = null;
  let airQualityChart = null;
  let energyChart = null;

  function initCharts() {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // 1. Temp / Humidity Chart
    const ctx1 = document.getElementById('tempHumidityChart')?.getContext('2d');
    if (ctx1) {
      tempHumidityChart = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Temp (°C)',
              data: [],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2,
              tension: 0.35,
              fill: true,
              pointRadius: 0
            },
            {
              label: 'Humidity (%)',
              data: [],
              borderColor: '#14b8a6',
              borderWidth: 1.8,
              borderDash: [4, 4],
              tension: 0.35,
              fill: false,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } }
          }
        }
      });
    }

    // 2. Air Pollution Chart
    const ctx2 = document.getElementById('airQualityChart')?.getContext('2d');
    if (ctx2) {
      airQualityChart = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'AQI',
              data: [],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderWidth: 2,
              tension: 0.35,
              fill: true,
              pointRadius: 0
            },
            {
              label: 'PM2.5 (µg/m³)',
              data: [],
              borderColor: '#06b6d4',
              borderWidth: 1.8,
              tension: 0.35,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } }
          }
        }
      });
    }

    // 3. Energy Chart
    const ctx3 = document.getElementById('energyChart')?.getContext('2d');
    if (ctx3) {
      energyChart = new Chart(ctx3, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Solar PV (W)',
              data: [],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2,
              tension: 0.35,
              fill: true,
              pointRadius: 0
            },
            {
              label: 'Facility Load (W)',
              data: [],
              borderColor: '#64748b',
              borderWidth: 1.8,
              tension: 0.35,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } }
          }
        }
      });
    }
  }

  function updateChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    [tempHumidityChart, airQualityChart, energyChart].forEach(chart => {
      if (chart) {
        if (chart.options.scales.x) chart.options.scales.x.ticks.color = textColor;
        if (chart.options.scales.y) {
          chart.options.scales.y.grid.color = gridColor;
          chart.options.scales.y.ticks.color = textColor;
        }
        chart.update('none');
      }
    });
  }

  function appendChartData(timeStr, env, energy) {
    if (tempHumidityChart) {
      tempHumidityChart.data.labels.push(timeStr);
      tempHumidityChart.data.datasets[0].data.push(env.temperature);
      tempHumidityChart.data.datasets[1].data.push(env.humidity);
      if (tempHumidityChart.data.labels.length > 25) {
        tempHumidityChart.data.labels.shift();
        tempHumidityChart.data.datasets[0].data.shift();
        tempHumidityChart.data.datasets[1].data.shift();
      }
      tempHumidityChart.update('none');
    }

    if (airQualityChart) {
      airQualityChart.data.labels.push(timeStr);
      airQualityChart.data.datasets[0].data.push(env.aqi);
      airQualityChart.data.datasets[1].data.push(env.pm25);
      if (airQualityChart.data.labels.length > 25) {
        airQualityChart.data.labels.shift();
        airQualityChart.data.datasets[0].data.shift();
        airQualityChart.data.datasets[1].data.shift();
      }
      airQualityChart.update('none');
    }

    if (energyChart && energy) {
      energyChart.data.labels.push(timeStr);
      energyChart.data.datasets[0].data.push(energy.solar_watts);
      energyChart.data.datasets[1].data.push(energy.facility_load_watts);
      if (energyChart.data.labels.length > 25) {
        energyChart.data.labels.shift();
        energyChart.data.datasets[0].data.shift();
        energyChart.data.datasets[1].data.shift();
      }
      energyChart.update('none');
    }
  }

  // ================= 7. ROUTING & SECTION DISPLAY =================
  const tabContentEnv = document.getElementById('tabContentEnv');
  const tabContentWaste = document.getElementById('tabContentWaste');
  const tabContentEnergy = document.getElementById('tabContentEnergy');
  const allNavBtns = document.querySelectorAll('.tab-btn');

  function switchDomain(domainKey, pushHistory = true) {
    tabContentEnv?.classList.add('hidden');
    tabContentWaste?.classList.add('hidden');
    tabContentEnergy?.classList.add('hidden');

    allNavBtns.forEach(btn => {
      btn.className = "tab-btn px-4 py-1.5 rounded-lg text-themed-secondary hover:text-themed-primary transition-all flex items-center space-x-1.5";
    });

    const activeBtns = document.querySelectorAll(`[data-tab="${domainKey}"]`);
    activeBtns.forEach(b => {
      b.className = "tab-btn px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold transition-all flex items-center space-x-1.5 shadow-sm";
    });

    let targetPath = '/environmental';
    if (domainKey === 'waste') {
      tabContentWaste?.classList.remove('hidden');
      targetPath = '/waste';
    } else if (domainKey === 'energy') {
      tabContentEnergy?.classList.remove('hidden');
      targetPath = '/renewable';
      setTimeout(() => energyChart?.resize(), 50);
    } else {
      tabContentEnv?.classList.remove('hidden');
      targetPath = '/environmental';
      setTimeout(() => {
        tempHumidityChart?.resize();
        airQualityChart?.resize();
      }, 50);
    }

    if (pushHistory && window.location.pathname !== targetPath) {
      try { history.pushState({ domain: domainKey }, '', targetPath); } catch (e) {}
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function detectRouteOnLoad() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('waste')) {
      switchDomain('waste', false);
    } else if (p.includes('renewable') || p.includes('energy')) {
      switchDomain('energy', false);
    } else {
      switchDomain('env', false);
    }
  }

  allNavBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-tab');
      switchDomain(target, true);
    });
  });

  window.addEventListener('popstate', detectRouteOnLoad);

  // ================= 8. AUTHENTICATION & REGISTRATION =================
  const loginScreen = document.getElementById('loginScreen');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const appContainer = document.getElementById('appContainer');

  const authTabLogin = document.getElementById('authTabLogin');
  const authTabRegister = document.getElementById('authTabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  authTabLogin?.addEventListener('click', () => {
    authTabLogin.className = "flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 transition-all shadow-sm";
    authTabRegister.className = "flex-1 py-1.5 rounded-lg text-themed-secondary hover:text-themed-primary transition-all";
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  authTabRegister?.addEventListener('click', () => {
    authTabRegister.className = "flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 transition-all shadow-sm";
    authTabLogin.className = "flex-1 py-1.5 rounded-lg text-themed-secondary hover:text-themed-primary transition-all";
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  function unlockDashboard(user) {
    if (user) {
      const initials = user.fullname ? user.fullname.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : user.username.substring(0, 2).toUpperCase();
      const avatarEl = document.getElementById('userAvatarPill');
      if (avatarEl) avatarEl.textContent = initials;
    }

    loginScreen?.classList.add('hidden');
    welcomeScreen?.classList.add('hidden');
    appContainer?.classList.remove('opacity-0', 'pointer-events-none');
    appContainer?.classList.add('opacity-100');

    detectRouteOnLoad();
    startWebSocketOrSimulation();

    setTimeout(() => {
      tempHumidityChart?.resize();
      airQualityChart?.resize();
      energyChart?.resize();
      if (window.lucide) window.lucide.createIcons();
    }, 100);
  }

  // Explore Live Demo Button
  document.getElementById('directDemoBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.setItem('ecopulse_skip_login', 'true');
    unlockDashboard({ username: 'guest', fullname: 'Guest Operator', role: 'Telemetry Observer' });
  });

  // Login Form Submission
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginName').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginErrorMsg');

    // Attempt backend login first
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (resp.ok) {
        const data = await resp.json();
        localStorage.setItem('ecopulse_skip_login', 'true');
        unlockDashboard(data.user);
        return;
      }
    } catch (err) {}

    // Local authentication fallback
    const localUser = registeredUsers[username];
    if (localUser && localUser.password === password) {
      localStorage.setItem('ecopulse_skip_login', 'true');
      unlockDashboard({ username, fullname: localUser.fullname, role: localUser.role });
    } else if (username === 'admin' && password === 'admin') {
      localStorage.setItem('ecopulse_skip_login', 'true');
      unlockDashboard({ username: 'admin', fullname: 'Abhas Gabhane', role: 'Chief Sustainability Officer' });
    } else {
      if (errorEl) {
        errorEl.textContent = "Invalid username or password. Use demo or click 'Create Account'.";
        errorEl.classList.remove('hidden');
      }
    }
  });

  // Register Form Submission
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullname = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const role = document.getElementById('regRole').value;
    const password = document.getElementById('regPassword').value;
    const errorEl = document.getElementById('regErrorMsg');
    const successEl = document.getElementById('regSuccessMsg');

    if (errorEl) errorEl.classList.add('hidden');
    if (successEl) successEl.classList.add('hidden');

    if (username.length < 3) {
      if (errorEl) {
        errorEl.textContent = "Username must be at least 3 characters.";
        errorEl.classList.remove('hidden');
      }
      return;
    }

    // Try backend registration
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullname, role })
      });
      if (resp.ok) {
        const data = await resp.json();
        registeredUsers[username] = { password, fullname, role };
        saveUsers();
        if (successEl) {
          successEl.textContent = "Account created! Launching console...";
          successEl.classList.remove('hidden');
        }
        setTimeout(() => {
          localStorage.setItem('ecopulse_skip_login', 'true');
          unlockDashboard(data.user);
        }, 600);
        return;
      } else {
        const errJson = await resp.json();
        if (errJson.detail && errorEl) {
          errorEl.textContent = errJson.detail;
          errorEl.classList.remove('hidden');
          return;
        }
      }
    } catch (err) {}

    // Local registration
    if (registeredUsers[username]) {
      if (errorEl) {
        errorEl.textContent = "Username already exists. Please sign in or use another username.";
        errorEl.classList.remove('hidden');
      }
      return;
    }

    registeredUsers[username] = { password, fullname, role };
    saveUsers();
    if (successEl) {
      successEl.textContent = "Account created successfully! Launching...";
      successEl.classList.remove('hidden');
    }
    setTimeout(() => {
      localStorage.setItem('ecopulse_skip_login', 'true');
      unlockDashboard({ username, fullname, role });
    }, 500);
  });

  // Sign out
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('ecopulse_skip_login');
    appContainer.classList.add('opacity-0', 'pointer-events-none');
    loginScreen.classList.remove('hidden');
  });

  // Check URL parameters for direct entrance
  const initialParams = new URLSearchParams(window.location.search);
  const initialPath = window.location.pathname.toLowerCase();
  const shouldSkipLogin = initialParams.get('demo') === 'true' || 
                          initialParams.get('mode') === 'demo' ||
                          initialPath.includes('environmental') ||
                          initialPath.includes('waste') ||
                          initialPath.includes('renewable') ||
                          initialPath.includes('energy') ||
                          localStorage.getItem('ecopulse_skip_login') === 'true';

  if (shouldSkipLogin) {
    unlockDashboard({ username: 'operator', fullname: 'Active Operator', role: 'Environmental Specialist' });
  }

  // ================= 9. CONSOLIDATED TOOLS DRAWER =================
  const toolsDrawer = document.getElementById('toolsDrawer');
  const openToolsBtn = document.getElementById('openToolsDrawerBtn');
  const closeToolsBtn = document.getElementById('closeToolsDrawerBtn');
  const drawerBackdrop = document.getElementById('toolsDrawerBackdrop');

  function openDrawer() {
    toolsDrawer?.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }
  function closeDrawer() {
    toolsDrawer?.classList.add('hidden');
  }

  openToolsBtn?.addEventListener('click', openDrawer);
  closeToolsBtn?.addEventListener('click', closeDrawer);
  drawerBackdrop?.addEventListener('click', closeDrawer);

  const drawerTabBtns = document.querySelectorAll('.drawer-tab-btn');
  const drawerPanels = {
    settings: document.getElementById('drawerTabSettings'),
    simulator: document.getElementById('drawerTabSimulator'),
    hardware: document.getElementById('drawerTabHardware')
  };

  drawerTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-drawer-tab');
      drawerTabBtns.forEach(b => {
        b.className = "drawer-tab-btn py-2 rounded-xl subpanel-card text-themed-secondary hover:text-themed-primary flex items-center justify-center space-x-1";
      });
      btn.className = "drawer-tab-btn py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center space-x-1 shadow-sm";

      Object.keys(drawerPanels).forEach(k => {
        if (drawerPanels[k]) {
          drawerPanels[k].classList.toggle('hidden', k !== tab);
        }
      });
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Drawer Settings Handlers
  document.getElementById('setThemeDarkBtn')?.addEventListener('click', () => applyTheme(true));
  document.getElementById('setThemeLightBtn')?.addEventListener('click', () => applyTheme(false));

  document.getElementById('settingsTempUnit')?.addEventListener('change', (e) => {
    userSettings.tempUnit = e.target.value;
    const badge = document.getElementById('currentTempUnitBadge');
    if (badge) badge.textContent = userSettings.tempUnit;
    saveSettings();
  });

  document.getElementById('settingsPressureUnit')?.addEventListener('change', (e) => {
    userSettings.pressureUnit = e.target.value;
    saveSettings();
  });

  document.getElementById('settingsAudioEnabled')?.addEventListener('change', (e) => {
    userSettings.audioEnabled = e.target.checked;
    saveSettings();
  });

  document.getElementById('settingsChimePreset')?.addEventListener('change', (e) => {
    userSettings.chimePreset = e.target.value;
    saveSettings();
  });

  document.getElementById('testAudioBtn')?.addEventListener('click', () => {
    playChime(userSettings.chimePreset);
  });

  document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
    userSettings.audioEnabled = !userSettings.audioEnabled;
    const icon = document.getElementById('soundIcon');
    if (icon) {
      icon.setAttribute('data-lucide', userSettings.audioEnabled ? 'volume-2' : 'volume-x');
      icon.className = userSettings.audioEnabled ? 'w-4 h-4 text-emerald-500' : 'w-4 h-4 text-themed-muted';
      if (window.lucide) window.lucide.createIcons();
    }
    const check = document.getElementById('settingsAudioEnabled');
    if (check) check.checked = userSettings.audioEnabled;
    saveSettings();
  });

  // Quick unit toggle in environmental card header
  document.getElementById('unitToggleBtn')?.addEventListener('click', () => {
    userSettings.tempUnit = userSettings.tempUnit === 'C' ? 'F' : 'C';
    const select = document.getElementById('settingsTempUnit');
    if (select) select.value = userSettings.tempUnit;
    const badge = document.getElementById('currentTempUnitBadge');
    if (badge) badge.textContent = userSettings.tempUnit;
    const unitLabel = document.getElementById('tempUnit');
    if (unitLabel) unitLabel.textContent = `°${userSettings.tempUnit}`;
    saveSettings();
  });

  // ================= 10. EXPANDABLE "MORE DETAILS" TOGGLES =================
  function setupAccordion(toggleBtnId, contentId, chevronId, onExpandCallback) {
    const btn = document.getElementById(toggleBtnId);
    const content = document.getElementById(contentId);
    const chevron = document.getElementById(chevronId);
    if (!btn || !content) return;

    btn.addEventListener('click', () => {
      const isHidden = content.classList.contains('hidden');
      if (isHidden) {
        content.classList.remove('hidden');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        if (onExpandCallback) onExpandCallback();
      } else {
        content.classList.add('hidden');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
      }
    });
  }

  setupAccordion('toggleEnvDetailsBtn', 'envDetailsContent', 'envDetailsChevron', () => {
    setTimeout(() => {
      tempHumidityChart?.resize();
      airQualityChart?.resize();
    }, 50);
  });

  setupAccordion('toggleWasteDetailsBtn', 'wasteDetailsContent', 'wasteDetailsChevron');
  setupAccordion('toggleEnergyDetailsBtn', 'energyDetailsContent', 'energyDetailsChevron', () => {
    setTimeout(() => energyChart?.resize(), 50);
  });

  // ================= 11. TELEMETRY RENDERERS & WATER QUALITY =================
  let minTemp = null;
  let maxTemp = null;

  function renderEnvironmental(env) {
    if (!env) return;

    // 1. Temperature
    let displayTemp = env.temperature;
    let minT = minTemp !== null ? Math.min(minTemp, env.temperature) : env.temperature;
    let maxT = maxTemp !== null ? Math.max(maxTemp, env.temperature) : env.temperature;
    minTemp = minT; maxTemp = maxT;

    if (userSettings.tempUnit === 'F') {
      displayTemp = (env.temperature * 9 / 5) + 32;
      minT = (minT * 9 / 5) + 32;
      maxT = (maxT * 9 / 5) + 32;
    }

    animateNumber('tempValue', displayTemp, 1);
    const minEl = document.getElementById('tempMin');
    const maxEl = document.getElementById('tempMax');
    if (minEl) minEl.textContent = minT.toFixed(1);
    if (maxEl) maxEl.textContent = maxT.toFixed(1);

    // 2. Humidity
    animateNumber('humidityValue', env.humidity, 1);
    const dewPoint = env.temperature - ((100 - env.humidity) / 5);
    const dewEl = document.getElementById('dewPoint');
    if (dewEl) dewEl.textContent = `${dewPoint.toFixed(1)}°C`;

    // 3. AQI & Circular Gauge
    animateNumber('aqiValue', env.aqi, 0);
    updateCircularGauge('aqiCircleGauge', env.aqi, 200);

    const aqiPill = document.getElementById('aqiStatusPill');
    if (aqiPill) {
      if (env.aqi <= 50) {
        aqiPill.textContent = "Good • Clean Air";
        aqiPill.className = "inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      } else if (env.aqi <= 100) {
        aqiPill.textContent = "Moderate Quality";
        aqiPill.className = "inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20";
      } else {
        aqiPill.textContent = "Unhealthy Alert";
        aqiPill.className = "inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20";
      }
    }

    // 4. CO2
    animateNumber('co2Value', env.co2, 0);
    const co2Bar = document.getElementById('co2Bar');
    if (co2Bar) {
      const pct = Math.min(100, Math.max(15, (env.co2 / 1600) * 100));
      co2Bar.style.width = `${pct}%`;
      co2Bar.className = env.co2 > 1000 ? "bg-rose-500 h-full transition-all duration-500" : "bg-emerald-500 h-full transition-all duration-500";
    }

    // Secondary Sensors
    animateNumber('pm25Value', env.pm25, 1);
    animateNumber('pm10Value', env.pm10, 1);
    animateNumber('pressureValue', env.pressure, 1);
    animateNumber('noiseValue', env.noise, 1);
  }

  function renderWater(water) {
    if (!water) return;

    // 5. Water pH
    animateNumber('waterPhValue', water.ph, 2);
    // Purity Gauge: 100% when pH is 7.4 and turbidity is low
    const purityScore = Math.max(0, 100 - (Math.abs(water.ph - 7.3) * 20 + water.turbidity_ntu * 8));
    updateCircularGauge('waterCircleGauge', purityScore, 100);

    const waterPill = document.getElementById('waterStatusPill');
    if (waterPill) {
      waterPill.textContent = water.status || "Pristine Quality";
      if (water.status === 'Contaminated') {
        waterPill.className = "inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20";
      } else if (water.status === 'Caution') {
        waterPill.className = "inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20";
      } else {
        waterPill.className = "inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20";
      }
    }

    // 6. Water Flow & Leak Watch
    animateNumber('waterFlowValue', water.water_usage_lph, 0);
    const leakPill = document.getElementById('leakStatusPill');
    if (leakPill) {
      if (water.leak_detected) {
        leakPill.textContent = "Leak Surge Alert!";
        leakPill.className = "text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30 pulse-critical";
      } else {
        leakPill.textContent = "No Leak Detected";
        leakPill.className = "text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      }
    }

    // Extended Water Sensors
    animateNumber('waterTurbidityValue', water.turbidity_ntu, 1);
    animateNumber('waterDoValue', water.dissolved_oxygen_mg_l, 1);
  }

  function renderWaste(wasteBins) {
    if (!wasteBins || !wasteBins.length) return;

    let totalFill = 0;
    let maxFillBin = wasteBins[0];
    let maxMethane = 0;

    wasteBins.forEach(b => {
      totalFill += b.fill_level;
      if (b.fill_level > maxFillBin.fill_level) maxFillBin = b;
      if (b.odor_methane_ppm > maxMethane) maxMethane = b.odor_methane_ppm;
    });

    const avgFill = totalFill / wasteBins.length;
    animateNumber('fleetAvgFill', avgFill, 1);
    updateCircularGauge('wasteCircleGauge', avgFill, 100);

    const priorityId = document.getElementById('priorityBinId');
    const priorityLoc = document.getElementById('priorityBinLoc');
    const priorityStatus = document.getElementById('priorityBinStatus');
    if (priorityId) priorityId.textContent = `${maxFillBin.id} (${maxFillBin.name.split(' ')[0]})`;
    if (priorityLoc) priorityLoc.textContent = `${maxFillBin.location} • ${maxFillBin.fill_level}% Capacity`;
    if (priorityStatus) {
      if (maxFillBin.fill_level >= 85) {
        priorityStatus.textContent = "Critical Overflow";
        priorityStatus.className = "text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 pulse-critical";
      } else {
        priorityStatus.textContent = "Normal Schedule";
        priorityStatus.className = "text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      }
    }

    animateNumber('maxMethaneVal', maxMethane, 1);

    // Render individual containers
    const grid = document.getElementById('wasteBinsGrid');
    if (grid) {
      grid.innerHTML = wasteBins.map(b => {
        const isCritical = b.fill_level >= 85;
        const barColor = isCritical ? 'bg-rose-500' : (b.fill_level >= 70 ? 'bg-amber-500' : 'bg-emerald-500');
        return `
          <div class="subpanel-card p-4 rounded-xl space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-bold text-themed-primary text-xs">${b.name}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-black/20 ${isCritical ? 'text-rose-500 font-bold' : 'text-themed-muted'}">${b.id}</span>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-themed-muted">Fill Capacity</span>
                <span class="font-bold font-mono text-themed-primary">${b.fill_level}%</span>
              </div>
              <div class="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                <div class="${barColor} h-full transition-all duration-500" style="width: ${b.fill_level}%"></div>
              </div>
            </div>
            <div class="flex justify-between text-[11px] text-themed-muted pt-1">
              <span>Weight: <strong class="text-themed-primary font-mono">${b.weight_kg} kg</strong></span>
              <span>Odor: <strong class="text-themed-primary font-mono">${b.odor_methane_ppm} ppm</strong></span>
            </div>
            <button data-bin-empty="${b.id}" class="empty-bin-btn w-full py-1.5 rounded-lg subpanel-card hover:bg-emerald-500 hover:text-slate-950 text-xs font-bold transition-all flex items-center justify-center space-x-1">
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
              <span>Empty / Collect</span>
            </button>
          </div>
        `;
      }).join('');

      document.querySelectorAll('.empty-bin-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-bin-empty');
          emptyBinHandler(id);
        });
      });
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function renderEnergy(energy) {
    if (!energy) return;

    animateNumber('solarWatts', energy.solar_watts, 0);
    animateNumber('dailyKwh', energy.daily_kwh, 1);
    animateNumber('batterySoc', energy.battery_soc, 0);
    updateCircularGauge('batteryCircleGauge', energy.battery_soc, 100);

    const battVolt = document.getElementById('batteryVolt');
    if (battVolt) battVolt.textContent = `${energy.battery_voltage} V • ${energy.battery_status}`;

    animateNumber('facilityLoad', energy.facility_load_watts, 0);

    const gridEl = document.getElementById('gridPower');
    const gridDir = document.getElementById('gridDirection');
    if (gridEl) {
      gridEl.textContent = `${energy.grid_power_watts > 0 ? '+' : ''}${Math.round(energy.grid_power_watts)} W`;
      gridEl.className = energy.grid_power_watts < 0 ? "text-3xl font-extrabold font-mono text-emerald-500" : "text-3xl font-extrabold font-mono text-slate-400";
    }
    if (gridDir) {
      gridDir.textContent = energy.grid_power_watts < 0 ? "Surplus Exported to Grid" : (energy.grid_power_watts === 0 ? "100% Islanded Zero Draw" : "Drawing from Grid");
    }

    animateNumber('renewableRatio', energy.renewable_ratio, 0);
    animateNumber('co2Saved', energy.co2_saved_kg, 1);

    // Matrix Diagram nodes
    const mSolar = document.getElementById('matrixSolar');
    const mBatt = document.getElementById('matrixBattery');
    const mLoad = document.getElementById('matrixLoad');
    const mGrid = document.getElementById('matrixGrid');
    if (mSolar) mSolar.textContent = `${(energy.solar_watts / 1000).toFixed(2)} kW`;
    if (mBatt) mBatt.textContent = `${Math.round(energy.battery_soc)}% (${energy.battery_status})`;
    if (mLoad) mLoad.textContent = `${(energy.facility_load_watts / 1000).toFixed(2)} kW`;
    if (mGrid) mGrid.textContent = `${(energy.grid_power_watts / 1000).toFixed(2)} kW`;
  }

  // ================= 12. WEBSOCKET CONNECTION & AUTONOMOUS SIMULATOR =================
  let socket = null;
  let fallbackTimer = null;
  let isSimActive = false;

  function emptyBinHandler(binId) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'empty_bin', id: binId }));
    } else {
      // Local simulation empty
      const bin = defaultWasteBins.find(b => b.id === binId);
      if (bin) {
        bin.fill_level = Math.round(Math.random() * 8 + 3);
        bin.weight_kg = 2.4;
        renderWaste(defaultWasteBins);
      }
    }
  }

  const defaultWasteBins = [
    { id: 'BIN-01', name: 'Cafeteria Compost', fill_level: 68.5, weight_kg: 28.4, odor_methane_ppm: 14.2, location: 'Dining 1F' },
    { id: 'BIN-02', name: 'Main Quad Recycler', fill_level: 86.0, weight_kg: 15.8, odor_methane_ppm: 2.1, location: 'Central Plaza' },
    { id: 'BIN-03', name: 'Office Landfill', fill_level: 44.2, weight_kg: 12.1, odor_methane_ppm: 4.8, location: 'Tower B, 3F' },
    { id: 'BIN-04', name: 'Tech Lab E-Waste', fill_level: 22.0, weight_kg: 9.3, odor_methane_ppm: 0.8, location: 'Engineering' }
  ];

  let simTickCount = 0;
  let currentAnomaly = null;

  function startAutonomousSimulation() {
    if (fallbackTimer) return;
    isSimActive = true;
    console.log("[EcoPulse] Running in resilient autonomous simulation mode.");

    const statusText = document.getElementById('statusText');
    if (statusText) statusText.textContent = "SIMULATED";

    fallbackTimer = setInterval(() => {
      simTickCount++;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Environmental simulation
      let temp = 24.2 + Math.sin(simTickCount * 0.15) * 1.2 + (Math.random() * 0.4 - 0.2);
      let hum = 54.0 + Math.cos(simTickCount * 0.12) * 3.5 + (Math.random() * 0.6 - 0.3);
      let aqi = Math.round(38 + Math.sin(simTickCount * 0.1) * 6);
      let co2 = Math.round(580 + Math.sin(simTickCount * 0.18) * 35);
      let pm25 = 8.4 + Math.sin(simTickCount * 0.1) * 1.5;

      // Water simulation
      let ph = 7.3 + Math.sin(simTickCount * 0.08) * 0.2;
      let turbidity = Math.max(0.4, 1.4 + Math.cos(simTickCount * 0.1) * 0.3);
      let tds = 185.0 + Math.sin(simTickCount * 0.05) * 12.0;
      let disO2 = Math.max(2.5, 7.6 - Math.sin(simTickCount * 0.06) * 0.3);
      let flow = Math.max(0, 380 + Math.sin(simTickCount * 0.15) * 45);
      let leak = false;

      // Energy simulation
      let solar = Math.round(4850 + Math.sin(simTickCount * 0.12) * 280);
      let soc = Math.min(100, Math.max(10, 88.0 + Math.sin(simTickCount * 0.04) * 2.0));
      let load = 3610 + Math.cos(simTickCount * 0.1) * 80;

      // Handle Anomaly overrides
      if (currentAnomaly === 'heatwave') { temp += 11.5; hum -= 12.0; }
      else if (currentAnomaly === 'smoke') { aqi += 140; pm25 += 85.0; co2 += 420; }
      else if (currentAnomaly === 'co2_spike') { co2 += 950; }
      else if (currentAnomaly === 'water_contamination') { ph -= 2.1; turbidity += 18.0; tds += 540.0; disO2 -= 4.2; }
      else if (currentAnomaly === 'water_leak') { flow += 960.0; leak = true; }
      else if (currentAnomaly === 'bin_overflow') { defaultWasteBins[1].fill_level = 98.5; }
      else if (currentAnomaly === 'solar_cloud') { solar = Math.round(solar * 0.2); }

      const envObj = {
        temperature: +temp.toFixed(1),
        humidity: +hum.toFixed(1),
        aqi: aqi,
        co2: co2,
        pm25: +pm25.toFixed(1),
        pm10: +(pm25 * 1.6).toFixed(1),
        pressure: 1013.2,
        noise: 42.5
      };

      const waterObj = {
        ph: +ph.toFixed(2),
        turbidity_ntu: +turbidity.toFixed(1),
        tds_ppm: +tds.toFixed(1),
        dissolved_oxygen_mg_l: +disO2.toFixed(1),
        water_usage_lph: +flow.toFixed(0),
        leak_detected: leak,
        status: leak ? 'Leak Alert' : (turbidity > 5.0 || ph < 6.5 ? 'Contaminated' : 'Pristine Quality')
      };

      const energyObj = {
        solar_watts: solar,
        daily_kwh: +(34.8 + simTickCount * 0.002).toFixed(1),
        battery_soc: +soc.toFixed(1),
        battery_voltage: +(48.0 + (soc / 100) * 4.2).toFixed(1),
        battery_status: solar > load ? 'Charging' : 'Discharging',
        facility_load_watts: load,
        grid_power_watts: load - solar,
        renewable_ratio: solar >= load ? 100 : Math.round((solar / load) * 100),
        co2_saved_kg: +(24.6 + simTickCount * 0.001).toFixed(1)
      };

      renderEnvironmental(envObj);
      renderWater(waterObj);
      renderWaste(defaultWasteBins);
      renderEnergy(energyObj);
      appendChartData(timeStr, envObj, energyObj);

      const lastUp = document.getElementById('lastUpdated');
      if (lastUp) lastUp.textContent = timeStr;
    }, userSettings.streamRate * 1000);
  }

  function startWebSocketOrSimulation() {
    // If not local host, use autonomous simulation immediately for pure static hosting
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      startAutonomousSimulation();
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;

    try {
      socket = new WebSocket(wsUrl);
    } catch (e) {
      startAutonomousSimulation();
      return;
    }

    const timeout = setTimeout(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        startAutonomousSimulation();
      }
    }, 2000);

    socket.onopen = () => {
      clearTimeout(timeout);
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
      const st = document.getElementById('statusText');
      if (st) st.textContent = "LIVE";
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (msg.environmental) renderEnvironmental(msg.environmental);
        if (msg.water) renderWater(msg.water);
        if (msg.waste) renderWaste(msg.waste);
        if (msg.energy) renderEnergy(msg.energy);

        if (msg.environmental && msg.energy) {
          appendChartData(timeStr, msg.environmental, msg.energy);
        }

        const lastUp = document.getElementById('lastUpdated');
        if (lastUp) lastUp.textContent = timeStr;

        // Alerts / Anomaly Banner
        if (msg.anomaly) {
          showAnomalyBanner(msg.anomaly);
        } else {
          hideAnomalyBanner();
        }
      } catch (err) {}
    };

    socket.onerror = () => {
      startAutonomousSimulation();
    };

    socket.onclose = () => {
      startAutonomousSimulation();
    };
  }

  function showAnomalyBanner(anomalyName) {
    const banner = document.getElementById('anomalyBanner');
    const title = document.getElementById('anomalyTitle');
    const desc = document.getElementById('anomalyDesc');
    if (banner && title && desc) {
      banner.classList.remove('hidden');
      title.textContent = `Active Anomaly: ${anomalyName.toUpperCase()}`;
      desc.textContent = "Multi-domain stress test injected into telemetry stream.";
    }
  }

  function hideAnomalyBanner() {
    const banner = document.getElementById('anomalyBanner');
    if (banner) banner.classList.add('hidden');
  }

  // Anomaly Buttons in Simulator Drawer
  document.querySelectorAll('.anomaly-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const anomaly = btn.getAttribute('data-anomaly');
      currentAnomaly = anomaly;
      showAnomalyBanner(anomaly);
      playChime('ping');

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'trigger_anomaly', type: anomaly, duration: 40 }));
      }
    });
  });

  document.getElementById('dismissAnomalyBtn')?.addEventListener('click', () => {
    currentAnomaly = null;
    hideAnomalyBanner();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'trigger_anomaly', type: 'reset' }));
    }
  });

  document.getElementById('resetSimBtn')?.addEventListener('click', () => {
    currentAnomaly = null;
    hideAnomalyBanner();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'trigger_anomaly', type: 'reset' }));
    }
  });

  let isPaused = false;
  document.getElementById('pauseSimBtn')?.addEventListener('click', () => {
    isPaused = !isPaused;
    const txt = document.getElementById('pauseBtnText');
    const icon = document.getElementById('pauseIcon');
    if (txt) txt.textContent = isPaused ? "Resume Stream" : "Pause Stream";
    if (icon) icon.setAttribute('data-lucide', isPaused ? "play" : "pause");
    if (window.lucide) window.lucide.createIcons();

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'toggle_pause' }));
    } else {
      if (isPaused && fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
      } else if (!isPaused) {
        startAutonomousSimulation();
      }
    }
  });

  document.getElementById('presetSelect')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'set_preset', preset: val }));
    }
  });

  // ================= 13. BOOTSTRAP INITIALIZATION =================
  window.addEventListener('DOMContentLoaded', () => {
    applyTheme(userSettings.theme === 'dark');
    initCharts();
    if (window.lucide) window.lucide.createIcons();
  });

})();
