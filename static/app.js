// EcoPulse Enterprise Multi-Domain Engine with Full Customization & Dual Theme (Dark/Light)

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // ================= 1. SETTINGS STATE & LOCALSTORAGE =================
  const DEFAULT_SETTINGS = {
    themeMode: 'dark',          // 'dark' | 'light' | 'auto'
    accentTheme: 'emerald',      // 'emerald' | 'cyan' | 'amber' | 'purple' | 'monochrome'
    density: 'comfortable',      // 'comfortable' | 'compact'
    tempUnit: 'C',               // 'C' | 'F'
    pressureUnit: 'hPa',         // 'hPa' | 'mmHg' | 'psi'
    massUnit: 'kg',              // 'kg' | 'lbs'
    powerScale: 'W',             // 'W' | 'kW'
    audioMaster: true,
    chimePreset: 'triad',        // 'triad' | 'bell' | 'ping' | 'click'
    audioVolume: 60,             // 10 to 100
    streamRate: 1.5,
    threshTempMax: 32.0,
    threshAqiCrit: 150,
    threshCo2Warn: 1000,
    threshBinCrit: 90
  };

  let userSettings = Object.assign({}, DEFAULT_SETTINGS);
  try {
    const saved = localStorage.getItem('ecopulse_settings');
    if (saved) {
      userSettings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(saved));
    }
  } catch (e) {
    console.warn("Could not load settings from storage:", e);
  }

  function saveSettings() {
    try {
      localStorage.setItem('ecopulse_settings', JSON.stringify(userSettings));
    } catch (e) {
      console.warn("Could not save settings:", e);
    }
  }

  // ================= 2. AUDIO SYNTHESIZER ENGINE =================
  let audioCtx = null;
  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function getVolumeGain() {
    return (userSettings.audioVolume / 100) * 0.12;
  }

  function playAlertBeep(frequency = 880, type = 'sine') {
    if (!userSettings.audioMaster) return;
    try {
      initAudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(getVolumeGain(), audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  function playChime(preset = userSettings.chimePreset) {
    if (!userSettings.audioMaster) return;
    try {
      initAudioContext();
      const vol = getVolumeGain();

      if (preset === 'bell') {
        // Gentle Piano Bell
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain.gain.setValueAtTime(vol * 1.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.25);
      } else if (preset === 'ping') {
        // Digital Radar Ping
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1480, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol * 0.9, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      } else if (preset === 'click') {
        // Tactile Mechanical Relay
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(240, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol * 0.7, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.06);
      } else {
        // Default: Modern Harmonic Triad (C5, E5, G5, C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.11);
          gain.gain.setValueAtTime(vol, audioCtx.currentTime + idx * 0.11);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + idx * 0.11 + 0.55);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + idx * 0.11);
          osc.stop(audioCtx.currentTime + idx * 0.11 + 0.6);
        });
      }
    } catch (e) {
      console.warn("Chime error:", e);
    }
  }

  // ================= 3. THEME & APPEARANCE CONTROLLER =================
  function applyThemeMode(mode) {
    userSettings.themeMode = mode;
    saveSettings();

    const isDark = (mode === 'dark') || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Update active state on Theme buttons
    const darkBtn = document.getElementById('themeDarkBtn');
    const lightBtn = document.getElementById('themeLightBtn');
    const autoBtn = document.getElementById('themeAutoBtn');

    [darkBtn, lightBtn, autoBtn].forEach(b => {
      if (b) b.classList.replace('border-emerald-500', 'border-transparent');
    });

    if (mode === 'dark' && darkBtn) darkBtn.classList.replace('border-transparent', 'border-emerald-500');
    if (mode === 'light' && lightBtn) lightBtn.classList.replace('border-transparent', 'border-emerald-500');
    if (mode === 'auto' && autoBtn) autoBtn.classList.replace('border-transparent', 'border-emerald-500');

    // Update chart theme colors
    updateChartThemeColors(isDark);
  }

  function applyAccentPalette(accent) {
    userSettings.accentTheme = accent;
    saveSettings();

    document.body.classList.remove('theme-emerald', 'theme-cyan', 'theme-amber', 'theme-purple', 'theme-monochrome');
    document.body.classList.add(`theme-${accent}`);

    document.querySelectorAll('.accent-btn').forEach(b => {
      if (b.getAttribute('data-accent') === accent) {
        b.classList.replace('border-transparent', 'border-emerald-500');
      } else {
        b.classList.replace('border-emerald-500', 'border-transparent');
      }
    });
  }

  function applyDensityMode(density) {
    userSettings.density = density;
    saveSettings();

    if (density === 'compact') {
      document.body.classList.add('density-compact');
      document.getElementById('densityCompactBtn')?.classList.replace('border-transparent', 'border-emerald-500');
      document.getElementById('densityComfortableBtn')?.classList.replace('border-emerald-500', 'border-transparent');
    } else {
      document.body.classList.remove('density-compact');
      document.getElementById('densityComfortableBtn')?.classList.replace('border-transparent', 'border-emerald-500');
      document.getElementById('densityCompactBtn')?.classList.replace('border-emerald-500', 'border-transparent');
    }
  }

  // ================= 4. TELEMETRY UNIT CONVERTERS =================
  function formatTemperature(celsius) {
    if (celsius === null || isNaN(celsius)) return '--';
    if (userSettings.tempUnit === 'F') {
      return ((celsius * 9) / 5 + 32).toFixed(1);
    }
    return celsius.toFixed(1);
  }

  function formatPressure(hPa) {
    if (hPa === null || isNaN(hPa)) return '--';
    if (userSettings.pressureUnit === 'mmHg') {
      return (hPa * 0.750062).toFixed(1);
    } else if (userSettings.pressureUnit === 'psi') {
      return (hPa * 0.0145038).toFixed(2);
    }
    return hPa.toFixed(1);
  }

  function formatMass(kg) {
    if (kg === null || isNaN(kg)) return '--';
    if (userSettings.massUnit === 'lbs') {
      return (kg * 2.20462).toFixed(1);
    }
    return kg.toFixed(1);
  }

  function formatPower(watts) {
    if (watts === null || isNaN(watts)) return '--';
    if (userSettings.powerScale === 'kW') {
      return (watts / 1000).toFixed(2);
    }
    return Math.round(watts);
  }

  // ================= 5. CHART.JS CONFIGURATION =================
  function getChartThemeOptions(isDark) {
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.06)';
    const tickColor = isDark ? '#94a3b8' : '#64748b';
    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipText,
          bodyColor: tooltipText,
          borderColor: tooltipBorder,
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true,
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
          bodyFont: { family: 'JetBrains Mono', size: 11 }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, maxTicksLimit: 6, font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { family: 'JetBrains Mono', size: 10 } }
        }
      }
    };
  }

  const isDarkInit = (userSettings.themeMode === 'dark') || (userSettings.themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const commonOptions = getChartThemeOptions(isDarkInit);

  // Chart 1: Temperature & Humidity
  const tempHumidityCtx = document.getElementById('tempHumidityChart').getContext('2d');
  const tempHumidityChart = new Chart(tempHumidityCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temperature',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          fill: true,
          tension: 0.35,
          yAxisID: 'yTemp',
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'Humidity (%)',
          data: [],
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.04)',
          fill: true,
          tension: 0.35,
          yAxisID: 'yHumidity',
          borderWidth: 2,
          pointRadius: 2
        }
      ]
    },
    options: {
      ...commonOptions,
      scales: {
        x: commonOptions.scales.x,
        yTemp: {
          type: 'linear',
          position: 'left',
          grid: commonOptions.scales.y.grid,
          ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono', size: 10 } }
        },
        yHumidity: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#06b6d4', font: { family: 'JetBrains Mono', size: 10 } },
          min: 10,
          max: 100
        }
      }
    }
  });

  // Chart 2: AQI, PM2.5 and CO2
  const airQualityCtx = document.getElementById('airQualityChart').getContext('2d');
  const airQualityChart = new Chart(airQualityCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'AQI',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          tension: 0.35,
          yAxisID: 'yAqi',
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'PM2.5 (µg/m³)',
          data: [],
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.04)',
          tension: 0.35,
          yAxisID: 'yAqi',
          borderWidth: 1.5,
          pointRadius: 2
        },
        {
          label: 'CO₂ (ppm)',
          data: [],
          borderColor: '#8b5cf6',
          tension: 0.35,
          yAxisID: 'yCo2',
          borderWidth: 2,
          pointRadius: 1,
          borderDash: [4, 4]
        }
      ]
    },
    options: {
      ...commonOptions,
      scales: {
        x: commonOptions.scales.x,
        yAqi: {
          type: 'linear',
          position: 'left',
          grid: commonOptions.scales.y.grid,
          ticks: { color: '#10b981', font: { family: 'JetBrains Mono', size: 10 } },
          min: 0
        },
        yCo2: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#8b5cf6', font: { family: 'JetBrains Mono', size: 10 } },
          min: 300
        }
      }
    }
  });

  // Chart 3: Solar Generation vs Demand
  const energyCtx = document.getElementById('energyStreamChart').getContext('2d');
  const energyChart = new Chart(energyCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Solar Output',
          data: [],
          borderColor: '#eab308',
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'Facility Load',
          data: [],
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.04)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2
        }
      ]
    },
    options: commonOptions
  });

  function updateChartThemeColors(isDark) {
    const opts = getChartThemeOptions(isDark);
    [tempHumidityChart, airQualityChart, energyChart].forEach(c => {
      c.options.plugins.tooltip.backgroundColor = opts.plugins.tooltip.backgroundColor;
      c.options.plugins.tooltip.titleColor = opts.plugins.tooltip.titleColor;
      c.options.plugins.tooltip.bodyColor = opts.plugins.tooltip.bodyColor;
      c.options.plugins.tooltip.borderColor = opts.plugins.tooltip.borderColor;
      c.options.scales.x.grid.color = opts.scales.x.grid.color;
      c.options.scales.x.ticks.color = opts.scales.x.ticks.color;
      c.update('none');
    });
  }

  // ================= 6. AUTHENTICATION & BOOT SEQUENCE =================
  const loginScreen = document.getElementById('loginScreen');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const appContainer = document.getElementById('appContainer');
  const loginForm = document.getElementById('loginForm');
  const quickFillBtn = document.getElementById('quickFillBtn');
  const quickFillTechBtn = document.getElementById('quickFillTechBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const welcomeUserName = document.getElementById('welcomeUserName');
  const welcomeUserRole = document.getElementById('welcomeUserRole');
  const welcomeProgressBar = document.getElementById('welcomeProgressBar');
  const welcomeProgressPct = document.getElementById('welcomeProgressPct');

  const diagStep1 = document.getElementById('diagStep1');
  const diagStep2 = document.getElementById('diagStep2');
  const diagStep3 = document.getElementById('diagStep3');
  const diagStep4 = document.getElementById('diagStep4');

  const navUserName = document.getElementById('navUserName');
  const navUserRole = document.getElementById('navUserRole');
  const userAvatarPill = document.getElementById('userAvatarPill');
  const ecoScoreRadial = document.getElementById('ecoScoreRadial');
  const ecoScoreVal = document.getElementById('ecoScoreVal');

  // Fast autofill
  quickFillBtn?.addEventListener('click', () => {
    document.getElementById('loginName').value = "Abhas Gabhane";
    document.getElementById('loginEmail').value = "abhas.gabhane@ecopulse.io";
    document.getElementById('loginRole').value = "Chief Sustainability Officer";
    playAlertBeep(720);
  });

  quickFillTechBtn?.addEventListener('click', () => {
    document.getElementById('loginName').value = "Dr. Sarah Chen";
    document.getElementById('loginEmail').value = "s.chen@ecopulse.io";
    document.getElementById('loginRole').value = "Facility Microgrid Operator";
    playAlertBeep(840);
  });

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('loginName').value.trim() || "Operator";
    const role = document.getElementById('loginRole').value;
    const parts = name.split(' ');
    const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();

    welcomeUserName.textContent = name;
    welcomeUserRole.textContent = role;
    navUserName.textContent = name;
    navUserRole.textContent = role;
    userAvatarPill.textContent = initials;

    // Transition
    loginScreen.classList.add('opacity-0');
    setTimeout(() => {
      loginScreen.classList.add('hidden');
      welcomeScreen.classList.remove('hidden');
      welcomeScreen.classList.remove('opacity-0');
      if (window.lucide) window.lucide.createIcons();
      playChime(userSettings.chimePreset);
      runWelcomeDiagnostics();
    }, 400);
  });

  // Instant Demo Mode & Direct Route Access
  function unlockDashboardDirectly() {
    loginScreen?.classList.add('hidden');
    welcomeScreen?.classList.add('hidden');
    appContainer?.classList.remove('opacity-0', 'pointer-events-none');
    appContainer?.classList.add('opacity-100');
    connectWebSocket();
    detectInitialRoute();
    setTimeout(() => {
      tempHumidityChart?.resize();
      airQualityChart?.resize();
      energyChart?.resize();
      if (window.lucide) window.lucide.createIcons();
    }, 100);
  }

  // Handle Demo button click
  document.getElementById('directDemoBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.setItem('ecopulse_skip_login', 'true');
    unlockDashboardDirectly();
  });

  // Check URL parameters and direct paths on boot
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
    unlockDashboardDirectly();
  }

  function setDiagnosticStatus(stepEl, label, isSuccess = false) {
    const pill = stepEl.querySelector('.status-pill');
    stepEl.classList.remove('opacity-40');
    stepEl.classList.add('opacity-100');
    if (isSuccess) {
      stepEl.classList.add('border-emerald-500/40', 'bg-emerald-500/10');
      pill.textContent = label;
      pill.className = "status-pill text-[10px] text-emerald-500 font-mono font-bold";
    } else {
      pill.textContent = label;
      pill.className = "status-pill text-[10px] text-cyan-500 font-mono font-bold animate-pulse";
    }
  }

  function runWelcomeDiagnostics() {
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 4;
      if (progress > 100) progress = 100;
      welcomeProgressBar.style.width = `${progress}%`;
      welcomeProgressPct.textContent = `${progress}%`;
      if (progress >= 100) clearInterval(progressInterval);
    }, 70);

    setTimeout(() => setDiagnosticStatus(diagStep1, "CALIBRATING..."), 250);
    setTimeout(() => {
      setDiagnosticStatus(diagStep1, "ONLINE", true);
      setDiagnosticStatus(diagStep2, "SYNCING...");
    }, 750);
    setTimeout(() => {
      setDiagnosticStatus(diagStep2, "SYNCED", true);
      setDiagnosticStatus(diagStep3, "SYNCHRONIZING...");
    }, 1300);
    setTimeout(() => {
      setDiagnosticStatus(diagStep3, "ACTIVE", true);
      setDiagnosticStatus(diagStep4, "CALCULATING...");
    }, 1800);
    setTimeout(() => setDiagnosticStatus(diagStep4, "READY", true), 2250);

    setTimeout(() => {
      welcomeScreen.classList.add('opacity-0');
      setTimeout(() => {
        welcomeScreen.classList.add('hidden');
        appContainer.classList.remove('opacity-0', 'pointer-events-none');
        appContainer.classList.add('opacity-100');

        if (!socket || socket.readyState !== WebSocket.OPEN) {
          connectWebSocket();
        }
        detectInitialRoute();
        tempHumidityChart.resize();
        airQualityChart.resize();
        energyChart.resize();
        if (window.lucide) window.lucide.createIcons();
      }, 600);
    }, 2650);
  }

  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('ecopulse_skip_login');
    appContainer.classList.remove('opacity-100');
    appContainer.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      [diagStep1, diagStep2, diagStep3, diagStep4].forEach(s => {
        s.classList.remove('opacity-100', 'border-emerald-500/40', 'bg-emerald-500/10');
        s.classList.add('opacity-40');
      });
      welcomeProgressBar.style.width = "0%";
      welcomeProgressPct.textContent = "0%";
      loginScreen.classList.remove('hidden');
      setTimeout(() => loginScreen.classList.remove('opacity-0'), 50);
    }, 500);
  });

  // ================= 7. DOMAIN TABS NAVIGATION & ROUTING =================
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContentEnv = document.getElementById('tabContentEnv');
  const tabContentWaste = document.getElementById('tabContentWaste');
  const tabContentEnergy = document.getElementById('tabContentEnergy');

  function switchDomainTab(target, pushHistory = true) {
    tabBtns.forEach(b => {
      b.className = "tab-btn px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 subpanel-card text-themed-secondary hover:text-themed-primary transition-all";
    });

    const activeBtn = Array.from(tabBtns).find(b => b.getAttribute('data-tab') === target);
    if (activeBtn) {
      activeBtn.className = "tab-btn px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 bg-emerald-500 text-slate-950 transition-all shadow-sm";
    }

    tabContentEnv?.classList.add('hidden');
    tabContentWaste?.classList.add('hidden');
    tabContentEnergy?.classList.add('hidden');

    let route = '/environmental';
    if (target === 'env') {
      tabContentEnv?.classList.remove('hidden');
      route = '/environmental';
      setTimeout(() => {
        tempHumidityChart?.resize();
        airQualityChart?.resize();
      }, 50);
    } else if (target === 'waste') {
      tabContentWaste?.classList.remove('hidden');
      route = '/waste';
    } else if (target === 'energy') {
      tabContentEnergy?.classList.remove('hidden');
      route = '/renewable';
      setTimeout(() => {
        energyChart?.resize();
      }, 50);
    }

    if (pushHistory && window.location.pathname !== route) {
      try {
        history.pushState({ tab: target }, '', route);
      } catch (e) {}
    }
    if (window.lucide) window.lucide.createIcons();
  }

  function detectInitialRoute() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('waste')) {
      switchDomainTab('waste', false);
    } else if (p.includes('renewable') || p.includes('energy')) {
      switchDomainTab('energy', false);
    } else {
      switchDomainTab('env', false);
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-tab');
      switchDomainTab(target, true);
    });
  });

  window.addEventListener('popstate', () => {
    detectInitialRoute();
  });

  // Unit toggle button in temperature card
  document.getElementById('unitToggleBtn')?.addEventListener('click', () => {
    userSettings.tempUnit = (userSettings.tempUnit === 'C') ? 'F' : 'C';
    document.getElementById('settingsTempUnit').value = userSettings.tempUnit;
    saveSettings();
    if (envHistory.length > 0) updateEnvMetrics(envHistory[envHistory.length - 1]);
  });

  // ================= 8. REAL-TIME TELEMETRY DATA HANDLERS =================
  let envHistory = [];
  let energyHistory = [];
  let minTemp = null;
  let maxTemp = null;

  function updateEnvMetrics(data) {
    document.getElementById('tempValue').textContent = formatTemperature(data.temperature);
    document.getElementById('tempUnit').textContent = `°${userSettings.tempUnit}`;
    if (minTemp === null || data.temperature < minTemp) minTemp = data.temperature;
    if (maxTemp === null || data.temperature > maxTemp) maxTemp = data.temperature;
    document.getElementById('tempMin').textContent = `${formatTemperature(minTemp)}°${userSettings.tempUnit}`;
    document.getElementById('tempMax').textContent = `${formatTemperature(maxTemp)}°${userSettings.tempUnit}`;

    const tempPill = document.getElementById('tempStatusPill');
    if (data.temperature > userSettings.threshTempMax) {
      tempPill.className = "text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-500 border border-rose-500/25";
      tempPill.textContent = "High Heat";
    } else if (data.temperature < 18) {
      tempPill.className = "text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/25";
      tempPill.textContent = "Cool";
    } else {
      tempPill.className = "text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25";
      tempPill.textContent = "Optimal";
    }

    document.getElementById('humidityValue').textContent = data.humidity;
    document.getElementById('humidityBar').style.width = `${Math.min(100, Math.max(5, data.humidity))}%`;
    const humPill = document.getElementById('humidityStatusPill');
    humPill.textContent = data.humidity > 70 ? "Humid" : (data.humidity < 30 ? "Dry" : "Comfortable");
    const dewPointC = data.temperature - ((100 - data.humidity) / 5);
    document.getElementById('dewPoint').textContent = `${formatTemperature(dewPointC)}°${userSettings.tempUnit}`;

    document.getElementById('aqiValue').textContent = data.aqi;
    document.getElementById('pm25Value').textContent = data.pm25;
    document.getElementById('pm10Value').textContent = data.pm10;
    const aqiPill = document.getElementById('aqiStatusPill');
    const aqiDesc = document.getElementById('aqiDesc');
    if (data.aqi <= 50) {
      aqiPill.className = "text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25";
      aqiPill.textContent = "Good";
      aqiDesc.textContent = "Clean Air";
    } else if (data.aqi <= userSettings.threshAqiCrit) {
      aqiPill.className = "text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/25";
      aqiPill.textContent = "Moderate";
      aqiDesc.textContent = "Acceptable";
    } else {
      aqiPill.className = "text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-500 border border-rose-500/25 animate-pulse";
      aqiPill.textContent = "Hazardous";
      aqiDesc.textContent = "Health Warning";
    }

    document.getElementById('co2Value').textContent = data.co2;
    document.getElementById('co2Bar').style.width = `${Math.min(100, Math.round((data.co2 / 2000) * 100))}%`;
    const co2Pill = document.getElementById('co2StatusPill');
    co2Pill.textContent = data.co2 > userSettings.threshCo2Warn ? (data.co2 > 1600 ? "Dangerous" : "Stuffy") : "Normal";

    document.getElementById('pressureValue').textContent = formatPressure(data.pressure);
    document.getElementById('noiseValue').textContent = data.noise;
    document.getElementById('lightValue').textContent = data.light;

    const timeStr = new Date(data.timestamp).toLocaleTimeString();
    document.getElementById('lastUpdated').textContent = `Sync: ${timeStr}`;
  }

  function updateWasteMetrics(bins) {
    const grid = document.getElementById('wasteBinsGrid');
    let hasAlert = false;
    let criticalBin = null;

    grid.innerHTML = bins.map(b => {
      const isCritical = b.fill_level >= userSettings.threshBinCrit;
      const isWarning = b.fill_level >= 75 && !isCritical;
      if (isCritical || isWarning) hasAlert = true;
      if (isCritical && !criticalBin) criticalBin = b;

      let barColor = "bg-gradient-to-t from-emerald-600 to-teal-400";
      let borderGlow = "border-[var(--border-card)]";
      let statusBadge = "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";

      if (isCritical) {
        barColor = "bg-gradient-to-t from-rose-600 to-red-400 animate-pulse";
        borderGlow = "border-rose-500/50 shadow-xl";
        statusBadge = "bg-rose-500/20 text-rose-500 border-rose-500/30";
      } else if (isWarning) {
        barColor = "bg-gradient-to-t from-amber-600 to-yellow-400";
        borderGlow = "border-amber-500/40";
        statusBadge = "bg-amber-500/20 text-amber-500 border-amber-500/30";
      }

      const iconType = b.bin_type === 'Organic' ? 'apple' : (b.bin_type === 'Recyclables' ? 'recycle' : (b.bin_type === 'E-Waste' ? 'battery' : 'trash-2'));

      return `
        <div class="glass-panel rounded-2xl p-4 shadow-lg relative overflow-hidden transition-all group ${borderGlow}">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-themed-primary flex items-center space-x-1.5">
              <i data-lucide="${iconType}" class="w-4 h-4 text-emerald-500"></i>
              <span>${b.name}</span>
            </span>
            <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusBadge}">
              ${b.status}
            </span>
          </div>

          <div class="flex items-center space-x-4 mb-3.5">
            <div class="w-8 h-28 gauge-tube rounded-xl p-1 flex flex-col justify-end relative overflow-hidden">
              <div class="w-full ${barColor} rounded-lg transition-all duration-700" style="height: ${Math.min(100, b.fill_level)}%"></div>
            </div>

            <div class="flex-1 space-y-1.5">
              <div>
                <div class="text-[10px] text-themed-muted font-bold">Capacity Fill</div>
                <div class="text-2xl font-black font-mono text-themed-primary">${b.fill_level}%</div>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[11px] pt-1.5 border-t border-[var(--border-card)]">
                <div><span class="text-themed-muted">Mass:</span> <span class="font-mono text-themed-primary font-bold">${formatMass(b.weight_kg)} ${userSettings.massUnit}</span></div>
                <div><span class="text-themed-muted">Odor:</span> <span class="font-mono ${b.odor_methane_ppm > 20 ? 'text-rose-500 font-bold' : 'text-themed-primary font-bold'}">${b.odor_methane_ppm} ppm</span></div>
              </div>
              <div class="text-[10px] text-themed-muted flex items-center space-x-1">
                <i data-lucide="map-pin" class="w-3 h-3 text-themed-muted"></i>
                <span class="truncate">${b.location}</span>
              </div>
            </div>
          </div>

          <button data-bin-id="${b.id}" class="empty-bin-btn w-full py-2 rounded-xl text-xs font-bold subpanel-card text-themed-primary hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center justify-center space-x-1">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>Mark Empty / Collected</span>
          </button>
        </div>
      `;
    }).join('');

    const wasteAlertPill = document.getElementById('wasteAlertPill');
    if (hasAlert) {
      wasteAlertPill.classList.remove('hidden');
    } else {
      wasteAlertPill.classList.add('hidden');
    }

    const routeBadge = document.getElementById('routeStatusBadge');
    const routeRec = document.getElementById('routeRecommendation');
    if (criticalBin) {
      routeBadge.textContent = "Critical Overflow Imminent";
      routeBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold animate-pulse";
      routeRec.innerHTML = `Priority Dispatch: Automated route scheduled for <span class="text-rose-500 font-extrabold">${criticalBin.name} (${criticalBin.location})</span> immediately!`;
    } else if (hasAlert) {
      routeBadge.textContent = "Route Active (Bins Near Full)";
      routeBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold";
      routeRec.innerHTML = "Optimized Route: Collection run scheduled within 1 hour.";
    } else {
      routeBadge.textContent = "All Bins Nominal";
      routeBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold";
      routeRec.innerHTML = "All containers below threshold. Next municipal collection cycle in 3 hours.";
    }

    document.querySelectorAll('.empty-bin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const binId = btn.getAttribute('data-bin-id');
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'empty_bin', id: binId }));
        } else {
          fetch('/api/waste/empty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: binId })
          });
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function updateEnergyMetrics(energy) {
    document.getElementById('solarWattsVal').textContent = formatPower(energy.solar_watts);
    document.getElementById('dailyKwhVal').textContent = energy.daily_kwh;
    document.getElementById('panelEffVal').textContent = `${energy.solar_efficiency}%`;

    document.getElementById('batterySocVal').textContent = energy.battery_soc;
    document.getElementById('batteryBar').style.width = `${energy.battery_soc}%`;
    document.getElementById('batteryVoltVal').textContent = `${energy.battery_voltage}V`;
    document.getElementById('batteryStatusPill').textContent = energy.battery_status;

    document.getElementById('facilityLoadVal').textContent = formatPower(energy.facility_load_watts);
    document.getElementById('cleanRatioPill').textContent = `${energy.renewable_ratio}% Green`;
    document.getElementById('gridPowerVal').textContent = energy.grid_power_watts > 0 ? `+${formatPower(energy.grid_power_watts)}` : formatPower(energy.grid_power_watts);

    document.getElementById('co2SavedVal').textContent = energy.co2_saved_kg;
    document.getElementById('treesEquivVal').textContent = energy.trees_equivalent;

    // Power Flow Nodes
    document.getElementById('flowSolarWatts').textContent = `${formatPower(energy.solar_watts)} ${userSettings.powerScale}`;
    document.getElementById('flowBatterySoc').textContent = `${energy.battery_soc}%`;
    document.getElementById('flowBatteryState').textContent = energy.battery_status;
    document.getElementById('flowFacilityLoad').textContent = `${formatPower(energy.facility_load_watts)} ${userSettings.powerScale}`;
    document.getElementById('flowGridStatus').textContent = energy.grid_power_watts < 0 ? `Exporting ${formatPower(Math.abs(energy.grid_power_watts))}${userSettings.powerScale}` : `Importing ${formatPower(energy.grid_power_watts)}${userSettings.powerScale}`;
  }

  function appendCharts(envData, energyData) {
    const timeLabel = new Date(envData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const maxPoints = 30;

    // Chart 1
    tempHumidityChart.data.labels.push(timeLabel);
    tempHumidityChart.data.datasets[0].data.push(userSettings.tempUnit === 'F' ? (envData.temperature * 9 / 5 + 32) : envData.temperature);
    tempHumidityChart.data.datasets[1].data.push(envData.humidity);
    if (tempHumidityChart.data.labels.length > maxPoints) {
      tempHumidityChart.data.labels.shift();
      tempHumidityChart.data.datasets[0].data.shift();
      tempHumidityChart.data.datasets[1].data.shift();
    }
    tempHumidityChart.update('none');

    // Chart 2
    airQualityChart.data.labels.push(timeLabel);
    airQualityChart.data.datasets[0].data.push(envData.aqi);
    airQualityChart.data.datasets[1].data.push(envData.pm25);
    airQualityChart.data.datasets[2].data.push(envData.co2);
    if (airQualityChart.data.labels.length > maxPoints) {
      airQualityChart.data.labels.shift();
      airQualityChart.data.datasets[0].data.shift();
      airQualityChart.data.datasets[1].data.shift();
      airQualityChart.data.datasets[2].data.shift();
    }
    airQualityChart.update('none');

    // Chart 3
    if (energyData) {
      energyChart.data.labels.push(timeLabel);
      energyChart.data.datasets[0].data.push(userSettings.powerScale === 'kW' ? energyData.solar_watts / 1000 : energyData.solar_watts);
      energyChart.data.datasets[1].data.push(userSettings.powerScale === 'kW' ? energyData.facility_load_watts / 1000 : energyData.facility_load_watts);
      if (energyChart.data.labels.length > maxPoints) {
        energyChart.data.labels.shift();
        energyChart.data.datasets[0].data.shift();
        energyChart.data.datasets[1].data.shift();
      }
      energyChart.update('none');
    }
  }

  function handleAnomalyBanner(anomaly) {
    const banner = document.getElementById('anomalyBanner');
    const title = document.getElementById('anomalyTitle');
    const desc = document.getElementById('anomalyDesc');

    if (anomaly) {
      banner.classList.remove('hidden');
      if (anomaly === 'smoke') {
        title.textContent = "Smoke / Particulate Hazard Alert";
        desc.textContent = "High PM2.5 particulates detected. Immediate air scrubber activation needed.";
      } else if (anomaly === 'heatwave') {
        title.textContent = "Severe Thermal Excursion";
        desc.textContent = "Facility temperature spiked. Inspect HVAC cooling loops.";
      } else if (anomaly === 'co2_spike') {
        title.textContent = "CO₂ Asphyxiation Warning";
        desc.textContent = "Carbon dioxide concentration exceeds safe human occupancy threshold.";
      } else if (anomaly === 'bin_overflow') {
        title.textContent = "Smart Waste Overflow Hazard";
        desc.textContent = "Bin #2 in Central Plaza has exceeded capacity threshold!";
      } else if (anomaly === 'methane_leak') {
        title.textContent = "Organic Decomposition Odor Hazard";
        desc.textContent = "Elevated Methane (CH₄) gas detected in Cafeteria Organic Bin.";
      } else if (anomaly === 'solar_cloud') {
        title.textContent = "Heavy Cloud Cover Solar Dip";
        desc.textContent = "Solar PV output reduced by 80%. Battery storage discharging to compensate.";
      } else if (anomaly === 'grid_blackout') {
        title.textContent = "Public Utility Grid Blackout!";
        desc.textContent = "Microgrid automatically islanded. Running on 100% clean solar + battery backup.";
      } else {
        title.textContent = `Anomaly In Progress: ${anomaly}`;
        desc.textContent = "Multi-domain stress test currently active.";
      }
      playAlertBeep(620, 'sawtooth');
    } else {
      banner.classList.add('hidden');
    }
  }

  function updateAlertsList(alerts) {
    const container = document.getElementById('alertsContainer');
    const badge = document.getElementById('alertCountBadge');
    badge.textContent = `${alerts.length} alerts`;

    if (!alerts || alerts.length === 0) {
      container.innerHTML = '<div class="text-xs text-themed-muted py-3 text-center italic">No active threshold violations recorded. System running nominal.</div>';
      return;
    }

    container.innerHTML = alerts.map(a => {
      const isCritical = a.severity === 'critical';
      const borderCol = isCritical ? 'border-rose-500/40 bg-rose-500/10 text-rose-500' : 'border-amber-500/40 bg-amber-500/10 text-amber-500';
      return `
        <div class="flex items-center justify-between p-3 rounded-2xl border ${borderCol} text-xs">
          <div class="flex items-center space-x-2.5">
            <span class="font-mono font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-lg ${isCritical ? 'bg-rose-500/25 text-rose-500' : 'bg-amber-500/25 text-amber-500'}">
              ${a.severity}
            </span>
            <span class="font-bold text-themed-primary">[${a.sensor}]</span>
            <span class="text-themed-secondary font-medium">${a.message}</span>
          </div>
          <span class="text-themed-muted font-mono text-[11px]">${a.time}</span>
        </div>
      `;
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  }

  // ================= 9. WEBSOCKET REAL-TIME CONNECTION & BROWSER SIMULATOR FALLBACK =================
  let socket = null;
  let simulationFallbackTimer = null;
  let isUsingFallback = false;

  function startBrowserSimulationFallback() {
    if (simulationFallbackTimer) return;
    isUsingFallback = true;
    console.log("[EcoPulse] Activating autonomous browser-side simulation engine...");

    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-emerald-500 pulse-beacon relative";
    if (statusText) {
      statusText.textContent = "Autonomous Simulation Stream";
      statusText.className = "text-emerald-500 font-semibold";
    }

    // Seed initial history if empty
    if (envHistory.length === 0) {
      const now = Date.now();
      for (let i = 25; i >= 0; i--) {
        const t = new Date(now - i * 3000);
        const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const initEnv = {
          timestamp: timeStr,
          temperature: +(24.0 + Math.sin(i * 0.3) * 1.5).toFixed(1),
          humidity: +(52.0 + Math.cos(i * 0.25) * 4.0).toFixed(1),
          aqi: Math.round(35 + Math.sin(i * 0.4) * 6),
          pm25: +(7.8 + Math.sin(i * 0.3) * 1.8).toFixed(1),
          pm10: +(13.5 + Math.cos(i * 0.3) * 2.2).toFixed(1),
          co2: Math.round(560 + Math.sin(i * 0.2) * 40),
          pressure: +(1013.2 + Math.cos(i * 0.1) * 0.4).toFixed(1),
          noise: +(41.5 + Math.sin(i * 0.4) * 3.0).toFixed(1),
          light: Math.round(480 + Math.cos(i * 0.4) * 25),
          source: 'Browser-Engine'
        };
        const initEng = {
          solar_watts: Math.round(4750 + Math.sin(i * 0.3) * 250),
          solar_peak_watts: 6000,
          daily_kwh: 34.5,
          battery_soc: 88.0,
          battery_voltage: 51.6,
          grid_power_watts: 1200,
          facility_load_watts: 3580
        };
        envHistory.push(initEnv);
        energyHistory.push(initEng);
        appendCharts(initEnv, initEng);
      }
      if (envHistory.length > 0) updateEnvMetrics(envHistory[envHistory.length - 1]);
      if (energyHistory.length > 0) updateEnergyMetrics(energyHistory[energyHistory.length - 1]);
    }

    let tick = 0;
    simulationFallbackTimer = setInterval(() => {
      tick++;
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const envData = {
        timestamp: timeStr,
        temperature: +(24.2 + (Math.sin(tick * 0.3) * 0.8) + (Math.random() * 0.2 - 0.1)).toFixed(1),
        humidity: +(54.0 + (Math.cos(tick * 0.2) * 1.5) + (Math.random() * 0.4 - 0.2)).toFixed(1),
        aqi: Math.round(38 + Math.sin(tick * 0.15) * 4),
        pm25: +(8.4 + Math.sin(tick * 0.2) * 1.2).toFixed(1),
        pm10: +(14.2 + Math.cos(tick * 0.2) * 1.5).toFixed(1),
        co2: Math.round(580 + Math.sin(tick * 0.25) * 25),
        pressure: +(1013.2 + Math.cos(tick * 0.1) * 0.4).toFixed(1),
        noise: +(42.5 + Math.sin(tick * 0.4) * 3.5).toFixed(1),
        light: Math.round(480 + Math.cos(tick * 0.3) * 25),
        source: 'Browser-Engine'
      };

      const energyData = {
        solar_watts: Math.round(4850 + Math.sin(tick * 0.3) * 180),
        solar_peak_watts: 6000,
        daily_kwh: +(34.8 + tick * 0.001).toFixed(2),
        battery_soc: +(88.0 + Math.sin(tick * 0.1) * 0.5).toFixed(1),
        battery_voltage: 51.8,
        grid_power_watts: 1240,
        facility_load_watts: 3610
      };

      const wasteData = [
        { id: 'BIN-01', name: 'Organic Waste', bin_type: 'Organic', location: 'Cafeteria A', fill_level: 48, weight_kg: 24.0, odor_methane_ppm: 8.2, status: 'Normal' },
        { id: 'BIN-02', name: 'Plastics & Metal', bin_type: 'Recyclables', location: 'Hallway 2F', fill_level: 88, weight_kg: 44.0, odor_methane_ppm: 14.5, status: 'Warning' },
        { id: 'BIN-03', name: 'General Waste', bin_type: 'General', location: 'Main Lobby', fill_level: 62, weight_kg: 31.0, odor_methane_ppm: 11.0, status: 'Normal' },
        { id: 'BIN-04', name: 'Electronic Waste', bin_type: 'E-Waste', location: 'IT Lab', fill_level: 22, weight_kg: 11.0, odor_methane_ppm: 3.1, status: 'Normal' }
      ];

      envHistory.push(envData);
      if (envHistory.length > 300) envHistory.shift();
      energyHistory.push(energyData);
      if (energyHistory.length > 300) energyHistory.shift();

      updateEnvMetrics(envData);
      updateEnergyMetrics(energyData);
      updateWasteMetrics(wasteData);
      appendCharts(envData, energyData);

      const ecoScore = 94;
      if (ecoScoreVal) ecoScoreVal.textContent = ecoScore;
      if (ecoScoreRadial) ecoScoreRadial.setAttribute('stroke-dasharray', `${ecoScore}, 100`);

      const lastUpdated = document.getElementById('lastUpdated');
      if (lastUpdated) lastUpdated.textContent = timeStr;
    }, 2000);
  }

  function connectWebSocket() {
    // If running statically (e.g. on Vercel, Netlify, GitHub Pages, or ship.place), start simulation fallback immediately
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      startBrowserSimulationFallback();
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      socket = new WebSocket(wsUrl);
    } catch (e) {
      startBrowserSimulationFallback();
      return;
    }

    const wsTimeout = setTimeout(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        startBrowserSimulationFallback();
      }
    }, 2500);

    socket.onopen = () => {
      clearTimeout(wsTimeout);
      if (simulationFallbackTimer) {
        clearInterval(simulationFallbackTimer);
        simulationFallbackTimer = null;
        isUsingFallback = false;
      }
      document.getElementById('statusDot').className = "w-2 h-2 rounded-full bg-emerald-500 pulse-beacon relative";
      document.getElementById('statusText').textContent = "WebSocket Live";
      document.getElementById('statusText').className = "text-emerald-500 font-semibold";
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'init') {
        envHistory = msg.environmental_history || [];
        energyHistory = msg.energy_history || [];

        for (let i = 0; i < envHistory.length; i++) {
          appendCharts(envHistory[i], energyHistory[i]);
        }

        if (envHistory.length > 0) updateEnvMetrics(envHistory[envHistory.length - 1]);
        if (energyHistory.length > 0) updateEnergyMetrics(energyHistory[energyHistory.length - 1]);
        if (msg.waste) updateWasteMetrics(msg.waste);
        if (msg.eco_score !== undefined) {
          ecoScoreVal.textContent = msg.eco_score;
          if (ecoScoreRadial) {
            ecoScoreRadial.setAttribute('stroke-dasharray', `${msg.eco_score}, 100`);
          }
        }
        if (msg.preset) document.getElementById('presetSelect').value = msg.preset;

        handleAnomalyBanner(msg.anomaly);
        updateAlertsList(msg.alerts || []);
      } else if (msg.type === 'telemetry') {
        envHistory.push(msg.environmental);
        if (envHistory.length > 300) envHistory.shift();

        energyHistory.push(msg.energy);
        if (energyHistory.length > 300) energyHistory.shift();

        updateEnvMetrics(msg.environmental);
        updateEnergyMetrics(msg.energy);
        updateWasteMetrics(msg.waste);
        appendCharts(msg.environmental, msg.energy);

        if (msg.eco_score !== undefined) {
          ecoScoreVal.textContent = msg.eco_score;
          if (ecoScoreRadial) {
            ecoScoreRadial.setAttribute('stroke-dasharray', `${msg.eco_score}, 100`);
          }
        }
        handleAnomalyBanner(msg.anomaly);
        updateAlertsList(msg.alerts || []);
      }
    };

    socket.onclose = () => {
      if (!isUsingFallback) {
        startBrowserSimulationFallback();
      }
    };

    socket.onerror = (err) => {
      console.warn("WebSocket error, falling back to browser simulator:", err);
      startBrowserSimulationFallback();
    };
  }

  // ================= 10. SETTINGS MODAL INTERACTION =================
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const closeSettingsOkBtn = document.getElementById('closeSettingsOkBtn');

  openSettingsBtn?.addEventListener('click', () => {
    // Populate form with current settings
    document.getElementById('settingsTempUnit').value = userSettings.tempUnit;
    document.getElementById('settingsPressureUnit').value = userSettings.pressureUnit;
    document.getElementById('settingsMassUnit').value = userSettings.massUnit;
    document.getElementById('settingsPowerScale').value = userSettings.powerScale;
    document.getElementById('settingsAudioMaster').checked = userSettings.audioMaster;
    document.getElementById('settingsChimePreset').value = userSettings.chimePreset;
    document.getElementById('settingsVolumeSlider').value = userSettings.audioVolume;
    document.getElementById('volumePctDisplay').textContent = `${userSettings.audioVolume}%`;
    document.getElementById('threshTempMax').value = userSettings.threshTempMax;
    document.getElementById('threshAqiCrit').value = userSettings.threshAqiCrit;
    document.getElementById('threshCo2Warn').value = userSettings.threshCo2Warn;
    document.getElementById('threshBinCrit').value = userSettings.threshBinCrit;

    settingsModal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  });

  [closeSettingsBtn, closeSettingsOkBtn].forEach(b => {
    b?.addEventListener('click', () => settingsModal.classList.add('hidden'));
  });

  // Settings Tabs Switcher
  const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
  const settingsPanels = {
    appearance: document.getElementById('settingsTabAppearance'),
    units: document.getElementById('settingsTabUnits'),
    audio: document.getElementById('settingsTabAudio'),
    thresholds: document.getElementById('settingsTabThresholds')
  };

  settingsTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-settings-tab');
      settingsTabBtns.forEach(b => {
        b.className = "settings-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold subpanel-card text-themed-muted hover:text-themed-primary flex items-center space-x-1.5";
      });
      btn.className = "settings-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 flex items-center space-x-1.5 shadow-sm";

      Object.keys(settingsPanels).forEach(k => {
        if (settingsPanels[k]) {
          settingsPanels[k].classList.toggle('hidden', k !== tab);
        }
      });
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Theme choices
  document.getElementById('themeDarkBtn')?.addEventListener('click', () => applyThemeMode('dark'));
  document.getElementById('themeLightBtn')?.addEventListener('click', () => applyThemeMode('light'));
  document.getElementById('themeAutoBtn')?.addEventListener('click', () => applyThemeMode('auto'));

  // Accent choices
  document.querySelectorAll('.accent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const accent = btn.getAttribute('data-accent');
      applyAccentPalette(accent);
    });
  });

  // Density choices
  document.getElementById('densityComfortableBtn')?.addEventListener('click', () => applyDensityMode('comfortable'));
  document.getElementById('densityCompactBtn')?.addEventListener('click', () => applyDensityMode('compact'));

  // Units inputs
  document.getElementById('settingsTempUnit')?.addEventListener('change', (e) => {
    userSettings.tempUnit = e.target.value;
    saveSettings();
    if (envHistory.length > 0) updateEnvMetrics(envHistory[envHistory.length - 1]);
  });
  document.getElementById('settingsPressureUnit')?.addEventListener('change', (e) => {
    userSettings.pressureUnit = e.target.value;
    saveSettings();
    if (envHistory.length > 0) updateEnvMetrics(envHistory[envHistory.length - 1]);
  });
  document.getElementById('settingsMassUnit')?.addEventListener('change', (e) => {
    userSettings.massUnit = e.target.value;
    saveSettings();
  });
  document.getElementById('settingsPowerScale')?.addEventListener('change', (e) => {
    userSettings.powerScale = e.target.value;
    saveSettings();
    if (energyHistory.length > 0) updateEnergyMetrics(energyHistory[energyHistory.length - 1]);
  });

  // Audio settings
  document.getElementById('settingsAudioMaster')?.addEventListener('change', (e) => {
    userSettings.audioMaster = e.target.checked;
    saveSettings();
    const soundIcon = document.getElementById('soundIcon');
    if (soundIcon) {
      soundIcon.setAttribute('data-lucide', userSettings.audioMaster ? 'volume-2' : 'volume-x');
      soundIcon.className = userSettings.audioMaster ? 'w-4 h-4 text-emerald-500' : 'w-4 h-4 text-slate-400';
      if (window.lucide) window.lucide.createIcons();
    }
  });

  document.getElementById('settingsChimePreset')?.addEventListener('change', (e) => {
    userSettings.chimePreset = e.target.value;
    saveSettings();
    playChime(userSettings.chimePreset);
  });

  document.getElementById('settingsVolumeSlider')?.addEventListener('input', (e) => {
    userSettings.audioVolume = parseInt(e.target.value);
    document.getElementById('volumePctDisplay').textContent = `${userSettings.audioVolume}%`;
    saveSettings();
  });

  document.getElementById('testAudioChimeBtn')?.addEventListener('click', () => {
    playChime(userSettings.chimePreset);
  });

  // Threshold saving & backend sync
  document.getElementById('saveThresholdsBtn')?.addEventListener('click', async () => {
    userSettings.threshTempMax = parseFloat(document.getElementById('threshTempMax').value) || 32.0;
    userSettings.threshAqiCrit = parseInt(document.getElementById('threshAqiCrit').value) || 150;
    userSettings.threshCo2Warn = parseInt(document.getElementById('threshCo2Warn').value) || 1000;
    userSettings.threshBinCrit = parseFloat(document.getElementById('threshBinCrit').value) || 90;
    saveSettings();

    try {
      const resp = await fetch('/api/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_max: userSettings.threshTempMax,
          aqi_critical: userSettings.threshAqiCrit,
          co2_warning: userSettings.threshCo2Warn,
          bin_critical_pct: userSettings.threshBinCrit
        })
      });
      if (resp.ok) {
        const toast = document.getElementById('threshSavedToast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
        playAlertBeep(980);
      }
    } catch (e) {
      console.warn("Could not sync thresholds to server:", e);
    }
  });

  // Reset to factory defaults
  document.getElementById('resetDefaultsBtn')?.addEventListener('click', () => {
    userSettings = Object.assign({}, DEFAULT_SETTINGS);
    saveSettings();
    applyThemeMode(userSettings.themeMode);
    applyAccentPalette(userSettings.accentTheme);
    applyDensityMode(userSettings.density);
    settingsModal.classList.add('hidden');
    playAlertBeep(440);
  });

  // Sound Quick Toggle Icon in Nav
  document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
    userSettings.audioMaster = !userSettings.audioMaster;
    saveSettings();
    const soundIcon = document.getElementById('soundIcon');
    if (soundIcon) {
      soundIcon.setAttribute('data-lucide', userSettings.audioMaster ? 'volume-2' : 'volume-x');
      soundIcon.className = userSettings.audioMaster ? 'w-4 h-4 text-emerald-500' : 'w-4 h-4 text-slate-400';
      if (window.lucide) window.lucide.createIcons();
    }
    if (userSettings.audioMaster) playChime('click');
  });

  // ================= 11. OTHER MODALS (SIMULATOR & HARDWARE) =================
  const simulatorModal = document.getElementById('simulatorModal');
  document.getElementById('openSimulatorBtn')?.addEventListener('click', () => simulatorModal.classList.remove('hidden'));
  document.getElementById('closeSimulatorBtn')?.addEventListener('click', () => simulatorModal.classList.add('hidden'));

  const hardwareModal = document.getElementById('hardwareModal');
  document.getElementById('openHardwareBtn')?.addEventListener('click', () => hardwareModal.classList.remove('hidden'));
  document.getElementById('closeHardwareBtn')?.addEventListener('click', () => hardwareModal.classList.add('hidden'));
  document.getElementById('closeHardwareOkBtn')?.addEventListener('click', () => hardwareModal.classList.add('hidden'));

  // Preset selector
  document.getElementById('presetSelect')?.addEventListener('change', (e) => {
    const newPreset = e.target.value;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'set_preset', preset: newPreset }));
    }
  });

  // Anomaly trigger buttons
  document.querySelectorAll('.anomaly-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const anomaly = btn.getAttribute('data-anomaly');
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'trigger_anomaly', type: anomaly, duration: 30 }));
      }
      simulatorModal.classList.add('hidden');
    });
  });

  document.getElementById('dismissAnomalyBtn')?.addEventListener('click', () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'trigger_anomaly', type: 'reset' }));
    }
  });

  document.getElementById('dispatchTruckBtn')?.addEventListener('click', () => {
    ['BIN-01', 'BIN-02', 'BIN-03', 'BIN-04'].forEach(id => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'empty_bin', id }));
      }
    });
    playChime('bell');
  });

  let isPaused = false;
  document.getElementById('togglePauseBtn')?.addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pauseBtnText').textContent = isPaused ? 'Resume Stream' : 'Pause Stream';
    document.getElementById('pauseIcon').setAttribute('data-lucide', isPaused ? 'play' : 'pause');
    if (window.lucide) window.lucide.createIcons();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'toggle_pause' }));
    }
  });

  document.getElementById('intervalSelect')?.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    userSettings.streamRate = val;
    saveSettings();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'set_interval', interval: val }));
    }
  });

  document.getElementById('clearAlertsBtn')?.addEventListener('click', () => {
    updateAlertsList([]);
  });

  // ================= 12. INITIALIZE SAVED PREFERENCES =================
  applyThemeMode(userSettings.themeMode);
  applyAccentPalette(userSettings.accentTheme);
  applyDensityMode(userSettings.density);

});
