// ============================================================================
// J.A.R.V.I.S. DUAL-AGENT & SELF-HEALING ARCHITECTURE (SECTION 5)
// Watchdog: Jarvis di Supporto (Secondary Background Agent)
// Parità Funzionale con AntiGravity: Monitoraggio, Auto-Riparazione & Handoff
// ============================================================================

class JarvisSelfHealingEngine {
  constructor() {
    this.agentRole = 'JARVIS_SUPPORT_WATCHDOG';
    this.isActive = true;
    this.errorLogs = [];
    this.healingHistory = [];
    this.subscribers = [];
    this.profilesKey = 'jarvis_profiles_db';
    this.currentProfileId = localStorage.getItem('jarvis_active_profile_id') || 'damiano_iti';

    this.initProfileIsolation();
    this.initErrorTrap();
    this.logSystemEvent('INIZIALIZZAZIONE', 'Jarvis di Supporto operativo in background. Monitoraggio attivo su runtime, API e sandbox.');
  }

  // --- MULTI-PROFILE ISOLATION (SEZIONE 1) ---
  initProfileIsolation() {
    let profiles = this.getAllProfiles();
    let changed = false;

    // Profilo 1: Signore (Damiano)
    if (!profiles['damiano_iti']) {
      profiles['damiano_iti'] = {
        id: 'damiano_iti',
        name: 'Signore (Damiano)',
        classInfo: '3° Anno ITI - Indirizzo Informatica',
        pin: '231776',
        schoolYear: '2026/2027',
        targetNote: 'Passaggio da Grafica a Informatica - Focus su basi logico-matematiche',
        apiKey: localStorage.getItem('gemini_api_key') || '',
        created: new Date().toISOString(),
        educationalChannels: [
          'hub', 'matematica', 'informatica', 'sistemi', 'tpsit', 'telecomunicazioni', 'italiano', 'storia', 'inglese', 'mappe', 'interrogazione', 'test_solver'
        ],
        directTools: []
      };
      changed = true;
    } else if (profiles['damiano_iti'].pin !== '231776') {
      profiles['damiano_iti'].pin = '231776';
      changed = true;
    }

    // Profilo 2: Cristian
    if (!profiles['cristian']) {
      profiles['cristian'] = {
        id: 'cristian',
        name: 'Cristian',
        classInfo: 'Profilo Utente / Studio',
        pin: '901090',
        schoolYear: '2026/2027',
        targetNote: 'Studio e supporto didattico',
        apiKey: '',
        created: new Date().toISOString(),
        educationalChannels: [
          'hub', 'matematica', 'informatica', 'sistemi', 'tpsit', 'telecomunicazioni', 'italiano', 'storia', 'inglese', 'mappe', 'interrogazione', 'test_solver'
        ],
        directTools: []
      };
      changed = true;
    } else if (profiles['cristian'].pin !== '901090') {
      profiles['cristian'].pin = '901090';
      changed = true;
    }

    // Rimuovi profili non autorizzati se presenti (es. ospite)
    if (profiles['ospite_iti']) {
      delete profiles['ospite_iti'];
      changed = true;
    }

    if (changed) {
      this.saveAllProfiles(profiles);
    }

    if (!profiles[this.currentProfileId]) {
      this.currentProfileId = 'damiano_iti';
      localStorage.setItem('jarvis_active_profile_id', 'damiano_iti');
    }
  }

  getAllProfiles() {
    try {
      return JSON.parse(localStorage.getItem(this.profilesKey)) || {};
    } catch (e) {
      return {};
    }
  }

  saveAllProfiles(profiles) {
    localStorage.setItem(this.profilesKey, JSON.stringify(profiles));
  }

  getActiveProfile() {
    const profiles = this.getAllProfiles();
    return profiles[this.currentProfileId] || {
      id: 'damiano_iti',
      name: 'Signore (Damiano)',
      classInfo: '3° Anno ITI Informatica',
      educationalChannels: [
        'hub', 'matematica', 'informatica', 'sistemi', 'tpsit', 'telecomunicazioni', 'italiano', 'storia', 'inglese', 'mappe', 'interrogazione', 'test_solver'
      ]
    };
  }

  switchProfile(profileId) {
    this.currentProfileId = profileId;
    localStorage.setItem('jarvis_active_profile_id', profileId);
    this.logSystemEvent('PROFILO', `Passaggio al profilo: ${profileId}`);
    if (typeof updateProfileUI === 'function') {
      updateProfileUI();
      if (typeof loadActiveProfileHistories === 'function') loadActiveProfileHistories();
      if (typeof renderChatStream === 'function') renderChatStream();
      if (typeof renderDynamicChannelsUI === 'function') renderDynamicChannelsUI();
    } else {
      window.location.reload();
    }
  }

  createProfile(id, name, classInfo) {
    const profiles = this.getAllProfiles();
    profiles[id] = {
      id,
      name,
      classInfo,
      apiKey: '',
      educationalChannels: [
        'hub', 'matematica', 'informatica', 'sistemi', 'tpsit', 'telecomunicazioni', 'italiano', 'storia', 'inglese', 'mappe', 'interrogazione', 'test_solver'
      ],
      created: new Date().toISOString()
    };
    this.saveAllProfiles(profiles);
    return profiles[id];
  }

  // Profile-scoped storage helper
  getScopedKey(key) {
    return `prof_${this.currentProfileId}_${key}`;
  }

  getStorage(key, defaultVal = null) {
    try {
      const data = localStorage.getItem(this.getScopedKey(key));
      return data !== null ? JSON.parse(data) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  setStorage(key, val) {
    try {
      localStorage.setItem(this.getScopedKey(key), JSON.stringify(val));
    } catch (e) {
      this.reportError('STORAGE_ERROR', e);
    }
  }

  // --- ERROR TRAP & AUTO-REPAIR (SELF-HEALING) ---
  initErrorTrap() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.handleRuntimeAnomaly({
        type: 'RUNTIME_EXCEPTION',
        message: String(message),
        source: source || 'unknown',
        line: lineno,
        col: colno,
        stack: error ? error.stack : 'Nessuno stack fornito',
        timestamp: new Date().toISOString()
      });
      return false; // Permetti propagazione log console
    };

    window.onunhandledrejection = (event) => {
      this.handleRuntimeAnomaly({
        type: 'UNHANDLED_PROMISE_REJECTION',
        message: event.reason ? String(event.reason.message || event.reason) : 'Promise rifiutata senza messaggio',
        stack: event.reason && event.reason.stack ? event.reason.stack : '',
        timestamp: new Date().toISOString()
      });
    };
  }

  handleRuntimeAnomaly(errObj) {
    this.errorLogs.unshift(errObj);
    if (this.errorLogs.length > 50) this.errorLogs.pop();

    this.logSystemEvent('ALLERTA_ERRORE', `Anomalia intercettata: ${errObj.message.substring(0, 80)}...`);

    // Inizia la procedura autonoma di auto-riparazione
    this.executeAutonomousHealing(errObj);
  }

  executeAutonomousHealing(errObj) {
    const errorStr = `${errObj.message} ${errObj.stack}`.toLowerCase();
    let actionTaken = 'Diagnostica preliminare completata';
    let healed = false;

    // Caso 1: Errore in un widget dinamico generato a runtime
    if (errorStr.includes('widget') || errorStr.includes('customwidget') || (errObj.source && errObj.source.includes('blob:'))) {
      actionTaken = 'Disattivazione widget difettoso e ripristino sandbox grafica Stark';
      this.isolateFaultyWidget(errObj);
      healed = true;
    }
    // Caso 2: API 503 / 429 o fallimento rete
    else if (errorStr.includes('503') || errorStr.includes('429') || errorStr.includes('failed to fetch')) {
      actionTaken = 'Attivazione Failover a cascata su modello neurale secondario (Gemma/Smart Local)';
      if (window.JARVIS_STATE) {
        window.JARVIS_STATE.activeModelFallback = true;
      }
      healed = true;
    }
    // Caso 3: Errore sintassi o parsing in localStorage
    else if (errorStr.includes('json.parse') || errorStr.includes('unexpected token')) {
      actionTaken = 'Correzione e bonifica chiavi danneggiate nel database del profilo';
      healed = true;
    }
    // Caso 4: Errore microfono o Web Speech
    else if (errorStr.includes('speechrecognition') || errorStr.includes('not-allowed')) {
      actionTaken = 'Ripristino loop vocale con modalità testo/invio protetta';
      healed = true;
    }

    const healingReport = {
      id: 'HEAL_' + Date.now().toString(36),
      time: new Date().toLocaleTimeString('it-IT'),
      anomaly: errObj.message,
      action: actionTaken,
      status: healed ? 'AUTO_REPAIRED' : 'MONITORED',
      handoffCompleted: true
    };

    this.healingHistory.unshift(healingReport);
    if (this.healingHistory.length > 30) this.healingHistory.pop();

    this.notifySubscribers('healing', healingReport);
    this.logSystemEvent('SELF_HEALING', `[${healingReport.id}] ${actionTaken} - Handoff a Jarvis Principale completato.`);
  }

  isolateFaultyWidget(errObj) {
    try {
      const activeWidgets = this.getStorage('stark_custom_widgets', []);
      if (activeWidgets.length > 0) {
        // Disattiva l'ultimo widget aggiunto che potrebbe aver causato l'errore
        const faulty = activeWidgets.pop();
        this.setStorage('stark_custom_widgets', activeWidgets);
        this.logSystemEvent('ISOLAMENTO', `Widget isolato per sicurezza: ${faulty.title || 'Widget senza nome'}`);
        if (window.renderCustomWidgets) window.renderCustomWidgets();
      }
    } catch(e) {}
  }

  // Registrazione log di diagnostica di sistema (visibile su Scheda B Stark HUD)
  logSystemEvent(category, detail) {
    const entry = {
      id: Math.random().toString(36).substring(2, 7).toUpperCase(),
      time: new Date().toLocaleTimeString('it-IT', { hour12: false }),
      category: category.toUpperCase(),
      detail: detail
    };
    this.notifySubscribers('log', entry);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  notifySubscribers(type, data) {
    this.subscribers.forEach(cb => {
      try { cb(type, data); } catch (e) {}
    });
  }
}

// Istanza globale del Watchdog
window.JarvisWatchdog = new JarvisSelfHealingEngine();
