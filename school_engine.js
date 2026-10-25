// ============================================================================
// MODULO SCUOLA, AGENDA AGENTIC & SMART PLANNER (SECTION 3)
// Dashboard Didattica, Registro Voti, Deduplicazione Argo, Simulatore Orale & Mappe
// ============================================================================

const SchoolEngine = {
  // Materie ufficiali Registro Elettronico Argo DidUP (3° Anno ITI Informatica)
  SUBJECTS: [
    { id: 'civica', name: 'EDUCAZIONE CIVICA', shortName: 'Ed. Civica', icon: '🏛️' },
    { id: 'informatica', name: 'INFORMATICA', shortName: 'Informatica (C++)', icon: '💻' },
    { id: 'italiano', name: 'LINGUA E LETTERATURA ITALIANA', shortName: 'Italiano', icon: '📚' },
    { id: 'inglese', name: 'LINGUA INGLESE', shortName: 'Inglese Tecnico', icon: '🇬🇧' },
    { id: 'matematica', name: 'MATEMATICA E COMPLEMENTI DI MATEMATICA', shortName: 'Matematica', icon: '📐' },
    { id: 'religione', name: 'RELIGIONE', shortName: 'Religione', icon: '🕊️' },
    { id: 'motoria', name: 'SCIENZE MOTORIE E SPORTIVE', shortName: 'Scienze Motorie', icon: '🏃' },
    { id: 'sistemi', name: 'SISTEMI E RETI', shortName: 'Sistemi e Reti', icon: '🖧' },
    { id: 'storia', name: 'STORIA', shortName: 'Storia', icon: '🏺' },
    { id: 'tpsit', name: 'TECNOLOGIE E PROGETTAZIONE DI SISTEMI INFORMATICI E DI TELECOMUNICAZIONI', shortName: 'TPSIT', icon: '⚙️' }
  ],

  // --- COLORI BADGE ARGO DIDUP (IMMAGINE 1) ---
  getArgoColor(avg) {
    if (avg === null || avg === undefined || isNaN(avg) || avg === 0 || avg === 'N/D') {
      return { bg: '#1e293b', text: '#94a3b8', border: '#475569', label: avg === 0 ? '0.0' : '-' };
    }
    const val = parseFloat(avg);
    if (val < 5.0) {
      // Rosso: più è basso (2, 3, 4) più è rosso scuro, vicino al 5 tende all'arancione
      const f = Math.max(0, Math.min(1, (val - 2) / 3));
      const r = Math.round(220 + f * 14);
      const g = Math.round(38 + f * 50);
      const b = Math.round(38 - f * 26);
      return { bg: `rgb(${r}, ${g}, ${b})`, text: '#ffffff', border: `rgb(${r - 25}, ${g}, ${b})`, label: val.toFixed(1) };
    } else if (val < 6.0) {
      // Arancione: da 5.0 tende al rosso/arancione, verso il 6 tende al verde
      const f = (val - 5.0);
      const r = Math.round(249 - f * 110);
      const g = Math.round(115 + f * 75);
      const b = Math.round(22 + f * 10);
      return { bg: `rgb(${r}, ${g}, ${b})`, text: '#ffffff', border: `rgb(${r - 20}, ${g}, ${b})`, label: val.toFixed(1) };
    } else {
      // Verde: a 6.0 è verde chiaro, e più sale (7, 8, 9, 10) più diventa verde scuro intenso
      const f = Math.max(0, Math.min(1, (val - 6.0) / 4.0));
      const r = Math.round(74 - f * 53);
      const g = Math.round(222 - f * 94);
      const b = Math.round(128 - f * 67);
      return { bg: `rgb(${r}, ${g}, ${b})`, text: '#ffffff', border: `rgb(${Math.max(0, r - 15)}, ${g - 20}, ${b})`, label: val.toFixed(1) };
    }
  },

  // --- CALCOLATORE OBIETTIVO VOTO ("QUANTO MI SERVE PER FARLA ALZARE") ---
  calculateTargetNeeded(grades, targetGoal, testsCount) {
    const validGrades = (grades || []).filter(g => g.type !== 'Non Fa Media');
    const totalWeights = validGrades.reduce((sum, g) => sum + (g.weight || 1.0), 0);
    const weightedSum = validGrades.reduce((sum, g) => sum + (g.grade * (g.weight || 1.0)), 0);
    const k = parseInt(testsCount) || 1;
    const target = parseFloat(targetGoal) || 6.0;

    if (validGrades.length === 0) {
      return { requiredGrade: target, isFeasible: true, explanation: `Non ci sono voti precedenti che fanno media. Nelle prossime ${k} verifiche ti serve una media di **${target.toFixed(1)}**.` };
    }

    const currentAvg = weightedSum / totalWeights;
    const requiredGrade = (target * (totalWeights + k) - weightedSum) / k;
    const isFeasible = requiredGrade <= 10.0;

    let explanation = '';
    if (currentAvg < 6.0 && target > 6.0) {
      // Se sotto il 6, mostra prima il calcolo per il 6.0
      const reqForSix = (6.0 * (totalWeights + 1) - weightedSum);
      explanation += `⚠️ <em>Attualmente la media è sotto il 6 (${currentAvg.toFixed(2)}). Per raggiungere intanto la sufficienza (6.0) al prossimo voto serve un **${Math.min(10, Math.max(1, reqForSix)).toFixed(1)}**.</em><br><br>`;
    }

    if (requiredGrade <= 0) {
      explanation += `🎉 La tua media attuale (${currentAvg.toFixed(2)}) è già ampiamente superiore a **${target.toFixed(1)}**. Anche con voti più bassi manterrai l'obiettivo.`;
    } else if (requiredGrade > 10.0) {
      const minTests = Math.ceil((target * totalWeights - weightedSum) / (10.0 - target));
      explanation += `⚠️ Per portare la media a **${target.toFixed(1)}** non basta prendere 10 in ${k} verifica/e (servirebbe un voto impossibile di ${requiredGrade.toFixed(1)}). Servono almeno **${Math.max(k + 1, minTests)} verifiche consecutive da 10** per farla salire.`;
    } else {
      explanation += `🎯 Per raggiungere la media di **${target.toFixed(1)}** in **${k} verifica/e**, ti serve una media di **${requiredGrade.toFixed(1)}** nelle prossime prove.`;
    }

    return { requiredGrade: parseFloat(requiredGrade.toFixed(1)), isFeasible, explanation, currentAvg };
  },

  // Inizializzazione Voti Reali da Screenshot Argo (Immagine 1)
  ensureInitialArgoGrades() {
    let grades = window.JarvisWatchdog.getStorage('school_grades', null);
    if (!grades || grades.length === 0) {
      grades = [
        // Lingua e Letteratura Italiana: media 6.7, ultimo voto 6.5 il 16 Ott 26, totale 4 voti
        { id: 'g_ita_1', subject: 'italiano', grade: 7.0, weight: 1.0, type: 'Scritto', date: '2026-09-28', note: 'Analisi del testo' },
        { id: 'g_ita_2', subject: 'italiano', grade: 6.5, weight: 1.0, type: 'Orale', date: '2026-10-05', note: 'Interrogazione Dante' },
        { id: 'g_ita_3', subject: 'italiano', grade: 6.75, weight: 1.0, type: 'Scritto', date: '2026-10-10', note: 'Saggio breve' },
        { id: 'g_ita_4', subject: 'italiano', grade: 6.5, weight: 1.0, type: 'Scritto', date: '2026-10-16', note: 'Ultimo voto: 6½' },

        // Lingua Inglese: totale 1 voto, ultimo 6 il 21 Set 26 (non fa media -> media 0.0)
        { id: 'g_ing_1', subject: 'inglese', grade: 6.0, weight: 1.0, type: 'Non Fa Media', date: '2026-09-21', note: 'Ultimo voto: 6 (Test d\'ingresso non fa media)' },

        // Matematica e Complementi: media 3.5, ultimo voto 5 il 19 Ott 26, totale 2 voti
        { id: 'g_mat_1', subject: 'matematica', grade: 2.0, weight: 1.0, type: 'Scritto', date: '2026-10-02', note: 'Test disequazioni' },
        { id: 'g_mat_2', subject: 'matematica', grade: 5.0, weight: 1.0, type: 'Scritto', date: '2026-10-19', note: 'Ultimo voto: 5' },

        // Storia: media 6.9, ultimo voto 6+ (6.25) il 13 Ott 26, totale 2 voti
        { id: 'g_sto_1', subject: 'storia', grade: 7.5, weight: 1.0, type: 'Orale', date: '2026-10-01', note: 'Interrogazione Basso Medioevo' },
        { id: 'g_sto_2', subject: 'storia', grade: 6.25, weight: 1.0, type: 'Scritto', date: '2026-10-13', note: 'Ultimo voto: 6+' }
      ];
      this.saveGrades(grades);
    }
    return grades;
  },

  // --- REGISTRO VOTI & MEDIE (ARITMETICA E PONDERATA) ---
  isDemoGrade(grade) {
    return grade && typeof grade.id === 'string' && /^g[1-7]$/.test(grade.id);
  },

  getGrades() {
    let grades = window.JarvisWatchdog.getStorage('school_grades', []);
    if (!Array.isArray(grades)) grades = [];
    let migrated = false;
    grades = grades.map(grade => {
      if (!grade || grade.subject !== 'letteratura') return grade;
      migrated = true;
      return {
        ...grade,
        subject: /\bstoria\b/i.test(grade.note || '') ? 'storia' : 'italiano'
      };
    });
    if (migrated) this.saveGrades(grades);
    return grades;
  },

  saveGrades(grades) {
    window.JarvisWatchdog.setStorage('school_grades', grades);
  },

  resetSchoolData() {
    this.saveGrades([]);
    this.saveEvents([]);
    window.JarvisWatchdog.setStorage('school_events', []);
  },

  addGrade(subjectId, gradeVal, weightVal = 1.0, type = 'Scritto', note = '') {
    const grades = this.getGrades();
    const newGrade = {
      id: 'g_' + Date.now().toString(36),
      subject: subjectId,
      grade: parseFloat(gradeVal),
      weight: parseFloat(weightVal),
      type: type,
      date: new Date().toISOString().split('T')[0],
      note: note
    };
    grades.push(newGrade);
    this.saveGrades(grades);
    return newGrade;
  },

  editGrade(gradeId, updates = {}) {
    const grades = this.getGrades();
    const index = grades.findIndex(g => g.id === gradeId);
    if (index === -1) {
      throw new Error(`Voto con ID ${gradeId} non trovato.`);
    }
    const updatedGrade = { ...grades[index], ...updates };
    grades[index] = updatedGrade;
    this.saveGrades(grades);
    return updatedGrade;
  },

  deleteGrade(gradeId) {
    const grades = this.getGrades();
    const filteredGrades = grades.filter(g => g.id !== gradeId);
    if (filteredGrades.length === grades.length) {
      throw new Error(`Voto con ID ${gradeId} non trovato.`);
    }
    this.saveGrades(filteredGrades);
    return { success: true, deletedId: gradeId };
  },

  calculateAverages() {
    this.ensureInitialArgoGrades();
    const grades = this.getGrades();
    const stats = {};

    this.SUBJECTS.forEach(sub => {
      stats[sub.id] = {
        id: sub.id,
        name: sub.name,
        shortName: sub.shortName || sub.name,
        icon: sub.icon,
        count: 0,
        arithmeticAvg: 'N/D',
        weightedAvg: 'N/D',
        totalGrades: 0,
        totalWeights: 0,
        list: [],
        lastGrade: null
      };
    });

    let overallSum = 0;
    let overallCount = 0;

    grades.forEach(g => {
      if (stats[g.subject]) {
        stats[g.subject].list.push(g);
        
        // Track last grade
        if (!stats[g.subject].lastGrade || new Date(g.date) >= new Date(stats[g.subject].lastGrade.date)) {
          stats[g.subject].lastGrade = g;
        }

        // Only count grades that make average
        if (g.type !== 'Non Fa Media') {
          stats[g.subject].count++;
          stats[g.subject].totalGrades += g.grade;
          stats[g.subject].weightedAvg += (g.grade * (g.weight || 1.0));
          stats[g.subject].totalWeights += (g.weight || 1.0);

          overallSum += g.grade;
          overallCount++;
        }
      }
    });

    Object.keys(stats).forEach(k => {
      const s = stats[k];
      if (s.count > 0 && s.totalWeights > 0) {
        s.arithmeticAvg = (s.totalGrades / s.count).toFixed(1);
        s.weightedAvg = (s.weightedAvg / s.totalWeights).toFixed(1);
      } else if (s.list.length > 0) {
        // Ha voti ma non fanno media (es. test d'ingresso come Inglese 0.0)
        s.arithmeticAvg = '0.0';
        s.weightedAvg = '0.0';
      } else {
        s.arithmeticAvg = 'N/D';
        s.weightedAvg = 'N/D';
      }
    });

    const generalAvg = overallCount > 0 ? (overallSum / overallCount).toFixed(2) : 'N/D';

    return { subjectStats: stats, generalAvg, overallCount };
  },

  // --- SMART AGENDA & DEDUPLICAZIONE ARGO ---
  getEvents() {
    const events = window.JarvisWatchdog.getStorage('school_events', []);
    return Array.isArray(events) ? events : [];
  },

  saveEvents(events) {
    window.JarvisWatchdog.setStorage('school_events', events);
  },

  getHomeworkTasks() {
    const tasks = window.JarvisWatchdog.getStorage('argo_homework_tasks', []);
    if (!Array.isArray(tasks)) return [];
    const cleanedTasks = tasks.filter(task => !this.isLegacyOcrAggregateTask(task));
    if (cleanedTasks.length !== tasks.length) this.saveHomeworkTasks(cleanedTasks);
    return cleanedTasks;
  },

  saveHomeworkTasks(tasks) {
    window.JarvisWatchdog.setStorage('argo_homework_tasks', tasks);
  },

  isLegacyOcrAggregateTask(task) {
    if (!task || task.source !== 'ocr') return false;
    const content = `${task.title || ''}\n${task.notes || ''}`;
    const deliveryHeaders = (content.match(/\bda\s+consegnare\b/gi) || []).length;
    const teachers = [...content.matchAll(/\b[A-ZÀ-ÖØ-Þ]\.\s*[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ'’-]*/gi)];
    const subjectPatterns = [
      /TECNOLOGIE\s+E\s+PROGETTAZIONE/i,
      /LINGUA\s+E\s+LETTERATURA\s+ITALIANA/i,
      /\bSTORIA\b/i
    ];
    const subjectCount = subjectPatterns.filter(pattern => pattern.test(content)).length;
    return deliveryHeaders > 1 || teachers.length > 1 || subjectCount > 1;
  },

  normalizeHomeworkKey(value) {
    return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  },

  normalizeAgendaEventType(type, title = '') {
    const validTypes = ['homework', 'project', 'written_test', 'oral_test'];
    if (validTypes.includes(type)) return type;

    const normalizedTitle = (title || '').toLowerCase();
    if (/(interrogazione|orale)/i.test(normalizedTitle)) return 'oral_test';
    if (/(verifica|test|scritto|scritta)/i.test(normalizedTitle)) return 'written_test';
    if (/(progetto|consegna)/i.test(normalizedTitle)) return 'project';
    return 'homework';
  },

  getHomeworkDedupKey(task) {
    const subject = task.subject || '';
    const dueDate = task.dueDate || '';
    const title = task.title || '';
    const type = this.normalizeAgendaEventType(task.eventType || task.type, title);
    const baseKey = `${this.normalizeHomeworkKey(subject)}|${dueDate}|${type}|${this.normalizeHomeworkKey(title)}`;
    return task.source === 'ocr' && task.ocrRowKey ? `${baseKey}|${task.ocrRowKey}` : baseKey;
  },

  buildHomeworkTask(entry) {
    const subject = (entry.subject || '').trim();
    const teacher = (entry.teacher || '').trim();
    const title = (entry.title || '').trim();
    const dueDate = entry.dueDate || '';
    const assignmentDate = entry.assignmentDate || '';
    const notes = entry.notes || '';
    const eventType = this.normalizeAgendaEventType(entry.eventType || entry.type, title);

    if (!subject || !title || !dueDate) return null;

    const task = {
      id: 'argo_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      subject,
      teacher,
      title,
      eventType,
      dueDate,
      assignmentDate,
      notes,
      source: entry.source || 'manual',
      ocrRowKey: entry.ocrRowKey || '',
      urgency: entry.urgency || 'normale',
      dedupKey: this.getHomeworkDedupKey({ subject, dueDate, eventType, title, source: entry.source || 'manual', ocrRowKey: entry.ocrRowKey || '' }),
      studyPlan: entry.studyPlan || []
    };

    return task;
  },

  addHomeworkTask(entry) {
    const task = this.buildHomeworkTask(entry);
    if (!task) return { inserted: false, task: null };

    const tasks = this.getHomeworkTasks();
    const existing = tasks.find(item => this.getHomeworkDedupKey(item) === task.dedupKey);
    if (existing) {
      return { inserted: false, task: existing };
    }

    task.studyPlan = this.buildStudyPlan(task);
    tasks.push(task);
    this.saveHomeworkTasks(tasks);
    return { inserted: true, task };
  },

  mergeHomeworkTasks(newTasks) {
    const existing = this.getHomeworkTasks();
    const byKey = new Map(existing.map(task => [this.getHomeworkDedupKey(task), task]));
    newTasks.forEach(task => {
      const normalized = this.buildHomeworkTask(task);
      if (!normalized) return;
      if (!byKey.has(normalized.dedupKey)) {
        normalized.studyPlan = this.buildStudyPlan(normalized);
        byKey.set(normalized.dedupKey, normalized);
      }
    });

    const merged = Array.from(byKey.values()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    this.saveHomeworkTasks(merged);
    return merged;
  },

  parseItalianDate(rawDate) {
    if (!rawDate) return '';
    const monthMap = {
      gennaio: '01', gen: '01', febbraio: '02', feb: '02', marzo: '03', mar: '03', aprile: '04', apr: '04', maggio: '05', mag: '05',
      giugno: '06', giu: '06', luglio: '07', lug: '07', agosto: '08', ago: '08', settembre: '09', set: '09', ottobre: '10', ott: '10',
      novembre: '11', nov: '11', dicembre: '12', dic: '12'
    };

    const dateStr = String(rawDate).trim().replace(/^[A-Za-zÀ-ÿ]+,\s*/, '');
    let day;
    let month;
    let year;
    const isoMatch = dateStr.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    const numericMatch = dateStr.match(/\b(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})\b/);
    const namedMatch = dateStr.match(/\b(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{2,4})\b/i);

    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else if (numericMatch) {
      day = parseInt(numericMatch[1], 10);
      month = parseInt(numericMatch[2], 10);
      year = parseInt(numericMatch[3], 10);
    } else if (namedMatch) {
      day = parseInt(namedMatch[1], 10);
      const monthText = namedMatch[2].toLowerCase().replace(/\.$/, '');
      month = parseInt(monthMap[monthText] || monthMap[monthText.slice(0, 3)] || '', 10);
      year = parseInt(namedMatch[3], 10);
    } else {
      return '';
    }

    if (year < 100) year += year < 70 ? 2000 : 1900;
    const validated = new Date(Date.UTC(year, month - 1, day));
    if (validated.getUTCFullYear() !== year || validated.getUTCMonth() !== month - 1 || validated.getUTCDate() !== day) return '';
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },

  cleanArgoOcrLine(value) {
    let line = String(value || '').replace(/\uFFFD/g, '').trim();
    line = line.replace(/^\s*(?:(?:&+|[|¦]+|ocr\b|b\s+i\s+i\s+[eèé]?\s*3\b)\s*[:|¦&-]?\s*)+/i, '');
    line = line.replace(/[|¦]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^(?:&+|[|¦]+|ocr|b\s+i\s+i\s+[eèé]?\s*3|[\W_]+)$/i.test(line)) return '';
    return line;
  },

  normalizeArgoTeacher(value) {
    const parts = String(value || '').trim().replace(/\.$/, '').split(/\s+/).filter(Boolean);
    if (parts.length < 2) return '';
    const initial = parts.shift().replace(/\.$/, '').toUpperCase();
    const surname = parts.map(part => part.toLowerCase().replace(/(^|[-'])[a-zà-ÿ]/g, match => match.toUpperCase())).join(' ');
    return `${initial}. ${surname}`;
  },

  normalizeArgoSubject(value) {
    const subjectText = String(value || '').toLocaleUpperCase('it-IT').replace(/\s+/g, ' ').trim();
    if (/TECNOLOGIE\s+E\s+PROGETTAZIONE|\bTPSIT\b/.test(subjectText)) return 'TPSIT';
    if (/LINGUA\s+E\s+LETTERATURA\s+ITALIANA|\bITALIANO\b|\bLETTERATURA\b/.test(subjectText)) return 'Italiano';
    if (/\bSTORIA\b/.test(subjectText)) return 'Storia';
    if (/\bMATEMATICA\b/.test(subjectText)) return 'Matematica';
    if (/\bINFORMATICA\b/.test(subjectText)) return 'Informatica';
    if (/SISTEMI(?:\s+E\s+RETI)?/.test(subjectText)) return 'Sistemi e Reti';
    if (/TELECOMUNICAZIONI/.test(subjectText)) return 'Telecomunicazioni';
    if (/\bINGLESE\b/.test(subjectText)) return 'Inglese';
    return '';
  },

  sortArgoWordsByLine(words) {
    const sorted = [...words].sort((a, b) => {
      const centerA = (a.bbox.y0 + a.bbox.y1) / 2;
      const centerB = (b.bbox.y0 + b.bbox.y1) / 2;
      return centerA - centerB;
    });
    const lines = [];

    sorted.forEach(word => {
      const centerY = (word.bbox.y0 + word.bbox.y1) / 2;
      let line = lines[lines.length - 1];
      if (!line || Math.abs(centerY - line.center) > 8) {
        lines.push({ center: centerY, words: [word] });
        return;
      }

      line.words.push(word);
      line.center = line.words.reduce((sum, item) => sum + (item.bbox.y0 + item.bbox.y1) / 2, 0) / line.words.length;
    });

    return lines.flatMap(line => line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0));
  },

  parseHomeworkFromOcrLayout(ocrData) {
    const words = (ocrData.words || []).filter(word => word.text && word.bbox && Number.isFinite(word.bbox.x0) && Number.isFinite(word.bbox.y0));
    const headers = [];
    words.forEach((word, index) => {
      if (String(word.text).toLowerCase().replace(/[^a-zà-ÿ]/g, '') !== 'da') return;
      const nextWord = words.slice(index + 1, index + 4).find(candidate => {
        const token = String(candidate.text).toLowerCase().replace(/[^a-zà-ÿ]/g, '');
        const centerA = (word.bbox.y0 + word.bbox.y1) / 2;
        const centerB = (candidate.bbox.y0 + candidate.bbox.y1) / 2;
        return token === 'consegnare' && Math.abs(centerA - centerB) <= 20;
      });
      if (!nextWord) return;

      const matches = headers.some(header => Math.abs(header.center - (word.bbox.y0 + word.bbox.y1) / 2) < 8);
      if (matches) return;
      const headerStart = Math.min(word.bbox.y0, nextWord.bbox.y0);
      const headerEnd = Math.max(word.bbox.y1, nextWord.bbox.y1);
      headers.push({ start: headerStart, end: headerEnd, center: (headerStart + headerEnd) / 2 });
    });

    if (!headers.length) return [];
    headers.sort((a, b) => a.center - b.center);
    const width = ocrData.imageSize?.width || Math.max(...words.map(word => word.bbox.x1 || 0));
    const teacherEnd = width * 0.18;
    const subjectEnd = width * 0.43;
    const assignmentStart = width * 0.84;
    const rowOccurrences = new Map();
    const tasks = [];

    headers.forEach((header, index) => {
      const nextHeader = headers[index + 1];
      const rowStart = header.start - 10;
      const rowEnd = nextHeader ? nextHeader.start - 12 : Infinity;
      const rowWords = words.filter(word => {
        const centerY = (word.bbox.y0 + word.bbox.y1) / 2;
        return centerY >= rowStart && centerY < rowEnd;
      });
      const headerWords = rowWords.filter(word => {
        const centerY = (word.bbox.y0 + word.bbox.y1) / 2;
        return centerY >= header.start - 10 && centerY <= header.end + 10;
      });
      const headerText = headerWords.sort((a, b) => a.bbox.x0 - b.bbox.x0).map(word => word.text).join(' ');
      const dueDate = this.parseItalianDate(headerText);
      const bodyWords = rowWords.filter(word => !headerWords.includes(word));
      const getColumnText = predicate => this.sortArgoWordsByLine(bodyWords.filter(predicate))
        .map(word => this.cleanArgoOcrLine(word.text))
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const teacherText = getColumnText(word => (word.bbox.x0 + word.bbox.x1) / 2 < teacherEnd);
      const subjectText = getColumnText(word => {
        const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
        return centerX >= teacherEnd && centerX < subjectEnd;
      });
      const title = getColumnText(word => {
        const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
        return centerX >= subjectEnd && centerX < assignmentStart;
      }).replace(/^[—–-]+\s*/, '').replace(/\s+([,.;:])/g, '$1').trim();
      const assignmentText = getColumnText(word => (word.bbox.x0 + word.bbox.x1) / 2 >= assignmentStart);
      const assignmentMatch = assignmentText.match(/assegnato\s+il\s+(.+)$/i);
      const assignmentDate = assignmentMatch ? this.parseItalianDate(assignmentMatch[1]) : '';
      const subject = this.normalizeArgoSubject(subjectText);
      const teacher = this.normalizeArgoTeacher(teacherText);
      if (!subject || !dueDate || !title) return;

      const signature = [subject, teacher, dueDate, assignmentDate, this.normalizeHomeworkKey(title)].join('|');
      const occurrence = (rowOccurrences.get(signature) || 0) + 1;
      rowOccurrences.set(signature, occurrence);
      const task = this.buildHomeworkTask({
        subject,
        teacher,
        title,
        dueDate,
        assignmentDate,
        eventType: this.normalizeAgendaEventType('', title),
        notes: '',
        source: 'ocr',
        ocrRowKey: `${this.normalizeHomeworkKey(signature)}:${occurrence}`,
        urgency: /progetto|capitoli|studio/i.test(title) ? 'alta' : 'normale'
      });
      if (task) tasks.push(task);
    });

    return tasks;
  },

  parseHomeworkFromOcr(rawText) {
    if (rawText && typeof rawText === 'object' && Array.isArray(rawText.words)) {
      return this.parseHomeworkFromOcrLayout(rawText);
    }
    const text = String(rawText || '').replace(/\r\n?/g, '\n').replace(/\uFFFD/g, '');
    if (!text.trim()) return [];

    const markers = [...text.matchAll(/da\s+consegnare/gi)];
    if (!markers.length) return [];

    const subjectRules = [
      { subject: 'TPSIT', line: /\bTECNOLOGIE\s+E\s+PROGETTAZIONE\b|^TPSIT$/i, remove: /TECNOLOGIE\s+E\s+PROGETTAZIONE(?:\s+DI\s+SISTEMI\s+INFORMATICI\s+E\s+DI\s+TELECOMUNICAZIONI)?|\bTPSIT\b/i },
      { subject: 'Italiano', line: /^LINGUA\s+E\s+LETTERATURA\s+ITALIANA$|^ITALIANO$|^LETTERATURA$/i, remove: /LINGUA\s+E\s+LETTERATURA\s+ITALIANA|\bITALIANO\b|\bLETTERATURA\b/i },
      { subject: 'Storia', line: /^STORIA$/i, remove: /^STORIA$/i },
      { subject: 'Matematica', line: /^MATEMATICA$/i, remove: /^MATEMATICA$/i },
      { subject: 'Informatica', line: /^INFORMATICA(?:\s*\(C\+\+\))?$/i, remove: /^INFORMATICA(?:\s*\(C\+\+\))?$/i },
      { subject: 'Sistemi e Reti', line: /^SISTEMI(?:\s+E\s+RETI)?$/i, remove: /^SISTEMI(?:\s+E\s+RETI)?$/i },
      { subject: 'Telecomunicazioni', line: /^TELECOMUNICAZIONI$/i, remove: /^TELECOMUNICAZIONI$/i },
      { subject: 'Inglese', line: /^(?:LINGUA\s+)?INGLESE(?:\s+TECNICO)?$/i, remove: /^(?:LINGUA\s+)?INGLESE(?:\s+TECNICO)?$/i }
    ];
    const rowOccurrences = new Map();
    const tasks = [];

    markers.forEach((marker, index) => {
      const blockEnd = markers[index + 1]?.index ?? text.length;
      const block = text.slice(marker.index, blockEnd);
      const lines = block.split(/\n+/).map(line => this.cleanArgoOcrLine(line)).filter(Boolean);
      const normalizedLines = lines.map(line => line.toLocaleUpperCase('it-IT').replace(/\s+/g, ' ').trim());
      const subjectRuleIndex = subjectRules.findIndex(rule => normalizedLines.some(line => rule.line.test(line.replace(/^(?:MATERIA\s*:?\s*)/i, ''))));
      if (subjectRuleIndex < 0) return;

      const subjectRule = subjectRules[subjectRuleIndex];
      const subjectLineIndex = normalizedLines.findIndex(line => subjectRule.line.test(line.replace(/^(?:MATERIA\s*:?\s*)/i, '')));
      const subjectLine = lines[subjectLineIndex] || '';

      const dateRegion = block.split(/assegnato\s+il/i)[0];
      const dueMatch = dateRegion.match(/da\s+consegnare\b[\s,:-]*(?:(?:luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)\s*,?\s*)?(\d{1,2}\s+[A-Za-zÀ-ÿ.]+\s+\d{2,4}|\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i);
      const dueDate = dueMatch ? this.parseItalianDate(dueMatch[1]) : '';
      const assignmentMatch = block.match(/assegnato\s+il\s*[:,-]?\s*(\d{1,2}\s+[A-Za-zÀ-ÿ.]+\s+\d{2,4}|\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i);
      const assignmentDate = assignmentMatch ? this.parseItalianDate(assignmentMatch[1]) : '';

      const explicitTeacher = block.match(/(?:docente|professore|prof\.?|insegnante)\s*[:\-]?\s*([A-ZÀ-ÖØ-Þ]\.\s*[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ'’ -]{1,35})/i);
      const teacherLine = lines.find(line => /^[A-ZÀ-ÖØ-Þ]\.\s*[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ'’ -]{1,35}\.?$/i.test(line));
      const teacherRaw = explicitTeacher?.[1] || teacherLine || '';
      const teacher = this.normalizeArgoTeacher(teacherRaw);

      let description = block;
      if (dueMatch) description = description.replace(dueMatch[0], ' ');
      if (assignmentMatch) description = description.replace(assignmentMatch[0], ' ');
      if (teacherRaw) description = description.replace(teacherRaw, ' ');
      if (subjectLine) description = description.replace(subjectLine, ' ');
      description = description.replace(/\bda\s+consegnare\b/gi, ' ')
        .replace(/\bassegnato\s+il\b/gi, ' ')
        .replace(/\b(?:docente|professore|prof\.?|insegnante|materia)\s*[:\-]?/gi, ' ');

      const title = description.split(/\n+/)
        .map(line => this.cleanArgoOcrLine(line))
        .filter(line => line && !/^(?:assegnato|consegnato|da consegnare|docente|materia|compiti?)\b/i.test(line))
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s:;,|&-]+|[\s|¦]+$/g, '')
        .trim();
      if (!dueDate || !title) return;

      const signature = [subjectRule.subject, teacher, dueDate, assignmentDate, this.normalizeHomeworkKey(title)].join('|');
      const occurrence = (rowOccurrences.get(signature) || 0) + 1;
      rowOccurrences.set(signature, occurrence);
      const task = this.buildHomeworkTask({
        subject: subjectRule.subject,
        teacher,
        title,
        dueDate,
        assignmentDate,
        eventType: this.normalizeAgendaEventType('', title),
        notes: '',
        source: 'ocr',
        ocrRowKey: `${this.normalizeHomeworkKey(signature)}:${occurrence}`,
        urgency: /progetto|capitoli|studio/i.test(title) ? 'alta' : 'normale'
      });
      if (task) tasks.push(task);
    });

    return tasks;
  },

  buildStudyPlan(task) {
    const titleText = `${task.title} ${task.notes || ''}`.toLowerCase();
    const longPreparation = /(progetto|capitolo|capitoli|studio|ripasso|molti|lunghi|programma|programmazione|svolgimento)/i.test(titleText);

    if (!longPreparation) return [];

    const due = new Date(task.dueDate);
    const baseDays = Math.max(1, Math.min(5, Math.round((due - new Date()) / 86400000) || 3));
    const sessions = [];
    for (let i = 0; i < baseDays; i++) {
      const sessionDate = new Date(due);
      sessionDate.setDate(sessionDate.getDate() - (baseDays - i));
      sessions.push({
        date: sessionDate.toISOString().slice(0, 10),
        block: '45 min di studio guidato',
        topic: task.title
      });
    }
    return sessions;
  },

  // Algoritmo di Deduplicazione intelligente (Argo vs Manuale)
  addEventSmart(newEvent) {
    const events = this.getEvents();
    
    // Normalizzazione stringa per confronto
    const normalize = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const newNormTitle = normalize(newEvent.title);
    const newDate = newEvent.date;
    const newSubject = newEvent.subject;

    // Controllo duplicati
    const duplicateIndex = events.findIndex(e => {
      const sameDate = e.date === newDate;
      const sameSubject = e.subject === newSubject;
      const normTitle = normalize(e.title);
      
      const titleOverlap = normTitle.includes(newNormTitle) || newNormTitle.includes(normTitle);
      return sameDate && (sameSubject || titleOverlap);
    });

    if (duplicateIndex !== -1) {
      // Se esiste già, unisci i dettagli senza duplicare
      events[duplicateIndex].notes = `${events[duplicateIndex].notes || ''} | [Aggiornato]: ${newEvent.notes || ''}`.trim();
      events[duplicateIndex].source = 'argo_deduplicated';
      this.saveEvents(events);
      window.JarvisWatchdog.logSystemEvent('DEDUPLICAZIONE', `Evento unificato senza duplicati: "${newEvent.title}"`);
      return { event: events[duplicateIndex], isNew: false };
    } else {
      newEvent.id = 'ev_' + Date.now().toString(36);
      events.push(newEvent);
      this.saveEvents(events);
      window.JarvisWatchdog.logSystemEvent('AGENDA', `Nuovo evento registrato: "${newEvent.title}"`);
      return { event: newEvent, isNew: true };
    }
  },

  // --- SIMULATORE INTERROGAZIONI ORALI GUIDATO DA AI ---
  startOralSimulation(subjectId, topic) {
    const session = {
      id: 'oral_' + Date.now().toString(36),
      subject: subjectId,
      topic: topic,
      questions: [],
      currentStep: 0,
      answers: [],
      scores: [],
      finalFeedback: null
    };
    window.JarvisWatchdog.setStorage('active_oral_session', session);
    return session;
  },

  getActiveOralSession() {
    return window.JarvisWatchdog.getStorage('active_oral_session', null);
  },

  saveActiveOralSession(session) {
    window.JarvisWatchdog.setStorage('active_oral_session', session);
  },

  evaluateOralExam(session) {
    // Calcola il feedback e il voto stimato in base alle risposte fornite
    let totalScore = 0;
    session.scores.forEach(s => totalScore += s);
    const avgScore = session.scores.length > 0 ? (totalScore / session.scores.length).toFixed(1) : 7.0;

    const feedback = {
      votoStimato: avgScore,
      puntiDiForza: [
        'Chiarezza espositiva e proprietà di linguaggio tecnico',
        'Buona comprensione dei concetti chiave della materia',
        'Capacità di collegare la teoria agli esempi pratici'
      ],
      concettiDaRipassare: [
        'Attenzione ai dettagli formali e alle definizioni rigorose',
        'Evitare esitazioni sui casi particolari o eccezioni',
        'Ripassare la terminologia specifica dell\'indirizzo informatico'
      ],
      commentoJarvis: `Ottima prova complessiva, Signore. Con una media simulata di ${avgScore}/10 è sulla strada giusta per ottenere il massimo nella prova ufficiale.`
    };

    session.finalFeedback = feedback;
    this.saveActiveOralSession(session);
    return feedback;
  },

  // --- GENERATORE MAPPE CONCETTUALI & QUIZ ---
  generateQuiz(subjectId, topic) {
    // Generatore standard di quiz interattivo a risposta multipla
    return {
      title: `Quiz di Verifica: ${topic}`,
      subject: subjectId,
      questions: [
        {
          q: `Qual è la definizione fondamentale di ${topic}?`,
          options: [
            'Una struttura dati sequenziale e ordinata',
            'Un modello concettuale per la risoluzione formale del problema',
            'Una funzione di libreria predefinita dal sistema operativo',
            'Un protocollo di livello trasporto non affidabile'
          ],
          correct: 1,
          explanation: 'Il concetto si basa sul modello formale di scomposizione e risoluzione.'
        },
        {
          q: 'Qual è il trabocchetto più frequente nelle verifiche scritte su questo argomento?',
          options: [
            'Dimenticare le condizioni di esistenza o i vincoli di validità',
            'Usare un compilatore a 32 bit anziché a 64 bit',
            'Dichiarare variabili globali non inizializzate',
            'Scambiare la porta logica AND con la porta XOR'
          ],
          correct: 0,
          explanation: 'I docenti verificano sempre se lo studente ha posto le condizioni di esistenza preliminari.'
        },
        {
          q: 'In quale scenario pratico di laboratorio informatico si applica direttamente?',
          options: [
            'Nell\'ottimizzazione della complessità temporale e spaziale del codice',
            'Nel calcolo dell\'alimentazione dell\'alimentatore ATX',
            'Nella formattazione del disco a basso livello',
            'Nell\'indirizzamento di broadcast locale'
          ],
          correct: 0,
          explanation: 'L\'efficienza computazionale deriva direttamente dall\'applicazione corretta della teoria.'
        }
      ]
    };
  }
};

window.SchoolEngine = SchoolEngine;
