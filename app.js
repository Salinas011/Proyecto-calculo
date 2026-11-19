/* ==========================================================================
   Proyecto Cálculo Integral — Av. Carrera 68 (Compensar)
   Cálculos analíticos, simulación Canvas y tablas de datos SDM
   ========================================================================== */

(function () {
  'use strict';

  // Parámetros del ajuste cuadrático q(t) = a2*t^2 + a1*t + a0 (SDM Nodo 22699)
  const MODEL = {
    a2: -857.1428571428571,
    a1: 2014.4,
    a0: 2603.592857142857,
    tStartMeasure: 0.0,
    tEndMeasure: 1.5,
    baseClockMin: 6 * 60 + 15 // t = 0.00 h equivale a 6:15 a.m.
  };

  // Registros oficiales SDM Estudio N.° 325, Nodo 22699 (AC 68 x KR 65, 2022-03-02, 6:15 a 7:45 a.m.)
  const EMPIRICAL_DATA = [
    { min: 0, h: 0.00, livianos: 394, buses: 31, camiones: 16, motos: 231, conteo: 672, flujo: 2603.59, cap: 2800.0 },
    { min: 15, h: 0.25, livianos: 494, buses: 27, camiones: 21, motos: 335, conteo: 877, flujo: 3053.60, cap: 2800.0 },
    { min: 30, h: 0.50, livianos: 514, buses: 27, camiones: 17, motos: 338, conteo: 896, flujo: 3396.48, cap: 2800.0 },
    { min: 45, h: 0.75, livianos: 444, buses: 31, camiones: 19, motos: 372, conteo: 866, flujo: 3632.22, cap: 2800.0 },
    { min: 60, h: 1.00, livianos: 484, buses: 36, camiones: 33, motos: 397, conteo: 950, flujo: 3760.85, cap: 2800.0 },
    { min: 75, h: 1.25, livianos: 460, buses: 28, camiones: 41, motos: 424, conteo: 953, flujo: 3782.35, cap: 2800.0 },
    { min: 90, h: 1.50, livianos: 447, buses: 26, camiones: 37, motos: 442, conteo: 952, flujo: 3696.72, cap: 2800.0 }
  ];

  // Resultados exactos exportados en tabla_errores_riemann.csv
  const RIEMANN_OFFICIAL = [
    {
      metodo: 'Segundo Teorema Fundamental (Analítico Exacto)',
      formula: 'V = Q(b) - Q(a)',
      volumen: 5207.30,
      absErr: 0.00,
      relErr: '0.000%',
      nota: 'Referencia exacta',
      highlight: false
    },
    {
      metodo: 'Suma de Riemann Izquierda (S_L)',
      formula: 'sum(q(t_i) * dt)',
      volumen: 5057.27,
      absErr: 150.03,
      relErr: '2.881%',
      nota: 'Subestima el tramo ascendente',
      highlight: false
    },
    {
      metodo: 'Suma de Riemann Derecha (S_R)',
      formula: 'sum(q(t_{i+1}) * dt)',
      volumen: 5330.56,
      absErr: 123.25,
      relErr: '2.367%',
      nota: 'Sobreestima el tramo ascendente',
      highlight: false
    },
    {
      metodo: 'Regla del Punto Medio (S_M)',
      formula: 'sum(q(m_i) * dt)',
      volumen: 5214.00,
      absErr: 6.70,
      relErr: '0.129%',
      nota: 'Menor error numérico (O(Δt²))',
      highlight: true
    }
  ];

  const CODE_SNIPPETS = {
    python: `# Nucleo analitico Python (streamlit_app.py — NumPy, SymPy, Matplotlib)
import numpy as np
import sympy as sp

t = np.array([0.00, 0.25, 0.50, 0.75, 1.00, 1.25, 1.50])
q = np.array([2603.59, 3053.60, 3396.48, 3632.22, 3760.85, 3782.35, 3696.72])

# 1. Ajuste polinomial cuadratico q(t) = a2*t^2 + a1*t + a0
coefs = np.polyfit(t, q, 2)
q_poly = np.poly1d(coefs)
Q_int = np.polyint(q_poly)

# 2. Segundo Teorema Fundamental del Calculo: V = Q(1.5) - Q(0)
V_exacto = np.polyval(Q_int, 1.5) - np.polyval(Q_int, 0.0)  # 5207.30 veh

# 3. Sumas de Riemann con n = 6 subintervalos (dt = 0.25 h)
n = 6
dt = 1.5 / n
t_edges = np.linspace(0.0, 1.5, n + 1)
S_L = np.sum(q_poly(t_edges[:-1]) * dt)
S_R = np.sum(q_poly(t_edges[1:]) * dt)
S_M = np.sum(q_poly((t_edges[:-1] + t_edges[1:]) / 2) * dt)

# 4. Capacidad de obra (2 carriles) y cola maxima D/D/1
C_obra = 2800.0
raices = np.sort(np.roots(q_poly - C_obra))  # 0.1019 h y 2.2482 h
Q_cola_poly = np.polyint(q_poly - C_obra)
Q_max = np.polyval(Q_cola_poly, raices[1]) - np.polyval(Q_cola_poly, raices[0])`,

    matlab: `% Nucleo analitico MATLAB (TraficoIntegralOnline.m)
t = [0.00, 0.25, 0.50, 0.75, 1.00, 1.25, 1.50];
q = [2603.59, 3053.60, 3396.48, 3632.22, 3760.85, 3782.35, 3696.72];

% 1. Ajuste polinomial y antiderivada
p = polyfit(t, q, 2);
P = polyint(p);

% 2. Segundo Teorema Fundamental del Calculo en [0, 1.5] h
V_exacto = polyval(P, 1.5) - polyval(P, 0.0);

% 3. Sumas de Riemann (Izquierda y Punto Medio)
n = 6;
dt = 1.5 / n;
ti = linspace(0, 1.5 - dt, n);
mi = ti + dt / 2;
S_L = sum(polyval(p, ti)) * dt;
S_M = sum(polyval(p, mi)) * dt;

% 4. Analisis de Represamiento frente a C_obra = 2800 veh/h
C_obra = 2800;
r = sort(roots(p - [0, 0, C_obra]));
P_neto = polyint(p - [0, 0, C_obra]);
Q_max = polyval(P_neto, r(2)) - polyval(P_neto, r(1));`
  };

  // --------------------------------------------------------------------------
  // Funciones matemáticas
  // --------------------------------------------------------------------------
  function evalQ(t) {
    return MODEL.a2 * t * t + MODEL.a1 * t + MODEL.a0;
  }

  function evalQAntideriv(t) {
    return (MODEL.a2 / 3) * Math.pow(t, 3) + (MODEL.a1 / 2) * (t * t) + MODEL.a0 * t;
  }

  function formatClock(tHours) {
    if (!Number.isFinite(tHours)) return '—';
    const totalMinutes = Math.floor(MODEL.baseClockMin + tHours * 60);
    const h24 = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    const suffix = h24 >= 12 ? 'p.m.' : 'a.m.';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(mins).padStart(2, '0')} ${suffix}`;
  }

  function formatNum(value, decimals = 2) {
    return value.toLocaleString('es-CO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function computeRiemann(method, n) {
    const a = MODEL.tStartMeasure;
    const b = MODEL.tEndMeasure;
    const dt = (b - a) / n;
    const exactV = evalQAntideriv(b) - evalQAntideriv(a);

    if (method === 'none') {
      return { exactV, approxV: exactV, absErr: 0, relErr: 0, rects: [], dt };
    }

    let sum = 0;
    const rects = [];
    for (let i = 0; i < n; i++) {
      const x0 = a + i * dt;
      const x1 = x0 + dt;
      let sampleT = x0;
      if (method === 'right') sampleT = x1;
      if (method === 'midpoint') sampleT = (x0 + x1) / 2;
      const h = evalQ(sampleT);
      sum += h * dt;
      rects.push({ x0, x1, h, sampleT });
    }

    const absErr = Math.abs(exactV - sum);
    const relErr = (absErr / exactV) * 100;
    return { exactV, approxV: sum, absErr, relErr, rects, dt };
  }

  function netAntideriv(t, cObra) {
    return (MODEL.a2 / 3) * Math.pow(t, 3) + (MODEL.a1 / 2) * (t * t) + (MODEL.a0 - cObra) * t;
  }

  function queueDoubleAntideriv(t, tIni, cObra) {
    const n0 = netAntideriv(tIni, cObra);
    return (
      (MODEL.a2 / 12) * Math.pow(t, 4) +
      (MODEL.a1 / 6) * Math.pow(t, 3) +
      ((MODEL.a0 - cObra) / 2) * (t * t) -
      n0 * t
    );
  }

  function computeQueueMetrics(cObra) {
    const { a2, a1, a0 } = MODEL;
    const tPico = -a1 / (2 * a2);
    const qMaxRate = evalQ(tPico);

    if (cObra >= qMaxRate) {
      return {
        saturated: false,
        tPico,
        qMaxRate,
        tIni: null,
        tStar: null,
        tFin: null,
        qMax: 0,
        ttd: 0,
        dProm: 0,
        dMax: 0
      };
    }

    const disc = a1 * a1 - 4 * a2 * (a0 - cObra);
    const sqrtDisc = Math.sqrt(disc);
    const r1 = (-a1 + sqrtDisc) / (2 * a2);
    const r2 = (-a1 - sqrtDisc) / (2 * a2);

    const tIni = Math.max(0, r1);
    const tStar = Math.max(0, r2);
    const qMax = netAntideriv(tStar, cObra) - netAntideriv(tIni, cObra);

    const A = a2 / 3;
    const B = (a2 / 3) * tIni + a1 / 2;
    const D = (a2 / 3) * (tIni * tIni) + (a1 / 2) * tIni + (a0 - cObra);
    const discFin = Math.max(0, B * B - 4 * A * D);
    const tFin = (-B - Math.sqrt(discFin)) / (2 * A);

    const ttd = queueDoubleAntideriv(tFin, tIni, cObra) - queueDoubleAntideriv(tIni, tIni, cObra);
    const vExact = evalQAntideriv(MODEL.tEndMeasure) - evalQAntideriv(MODEL.tStartMeasure);
    const dProm = (ttd / vExact) * 60;
    const dMax = (qMax / cObra) * 60;

    return {
      saturated: true,
      tPico,
      qMaxRate,
      tIni,
      tStar,
      tFin,
      qMax,
      ttd,
      dProm,
      dMax
    };
  }

  function evalQueueAt(t, queueInfo, cObra) {
    if (!queueInfo.saturated || t < queueInfo.tIni || t > queueInfo.tFin) {
      return 0;
    }
    return Math.max(0, netAntideriv(t, cObra) - netAntideriv(queueInfo.tIni, cObra));
  }

  // --------------------------------------------------------------------------
  // Gráfica Canvas Interactiva
  // --------------------------------------------------------------------------
  const simState = {
    mode: 'combined',
    method: 'midpoint',
    n: 6,
    cObra: 2800,
    hoverT: null
  };

  const canvas = document.getElementById('simCanvas');
  const tooltip = document.getElementById('simTooltip');

  function getAxisBounds() {
    const tMax = simState.mode === 'riemann' ? 1.65 : 3.55;
    const yMin = 0;
    const yMax = Math.max(4400, simState.cObra + 480);
    return { tMin: 0, tMax, yMin, yMax };
  }

  function drawPillBadge(ctx, text, anchorX, yTop, opts = {}) {
    const {
      align = 'left',
      color = '#111827',
      bg = 'rgba(255, 255, 255, 0.94)',
      border = '#cbd5e1',
      font = 'bold 10.5px "IBM Plex Mono", monospace',
      padX = 6,
      height = 19,
      minX = 0,
      maxX = 9999
    } = opts;

    ctx.save();
    ctx.font = font;
    const textW = ctx.measureText(text).width;
    const boxW = textW + padX * 2;

    let boxX = anchorX;
    if (align === 'center') boxX = anchorX - boxW / 2;
    else if (align === 'right') boxX = anchorX - boxW;

    boxX = Math.max(minX, Math.min(maxX - boxW, boxX));

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(boxX, yTop, boxW, height, 4);
    } else {
      ctx.rect(boxX, yTop, boxW, height);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + padX, yTop + height / 2 + 0.5);
    ctx.restore();

    return { left: boxX, right: boxX + boxW, top: yTop, bottom: yTop + height };
  }

  function renderSimulator() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(320, rect.width);
    const cssHeight = Math.max(280, rect.height);

    if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const pad = { top: 34, right: 28, bottom: 50, left: 66 };
    const plotW = cssWidth - pad.left - pad.right;
    const plotH = cssHeight - pad.top - pad.bottom;
    const bounds = getAxisBounds();

    const toX = (t) => pad.left + ((t - bounds.tMin) / (bounds.tMax - bounds.tMin)) * plotW;
    const toY = (q) => pad.top + plotH - ((q - bounds.yMin) / (bounds.yMax - bounds.yMin)) * plotH;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Rejilla horizontal
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#4b5563';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let yVal = 0; yVal <= bounds.yMax; yVal += 500) {
      const py = toY(yVal);
      ctx.beginPath();
      ctx.moveTo(pad.left, py);
      ctx.lineTo(cssWidth - pad.right, py);
      ctx.stroke();
      ctx.fillText(yVal.toLocaleString('es-CO'), pad.left - 8, py);
    }

    // Rejilla vertical
    const tStep = simState.mode === 'riemann' ? 0.25 : 0.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let tVal = 0; tVal <= bounds.tMax + 0.001; tVal += tStep) {
      const px = toX(tVal);
      ctx.strokeStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(px, pad.top);
      ctx.lineTo(px, cssHeight - pad.bottom);
      ctx.stroke();

      ctx.fillStyle = '#374151';
      ctx.fillText(`${tVal.toFixed(2)}h`, px, cssHeight - pad.bottom + 8);
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillText(formatClock(tVal).replace(' a.m.', ''), px, cssHeight - pad.bottom + 23);
      ctx.font = '11px "IBM Plex Mono", monospace';
    }

    const riemann = computeRiemann(simState.method, simState.n);
    const queueInfo = computeQueueMetrics(simState.cObra);

    // Rectángulos de Riemann: en modo combinado rellenamos verde limpio debajo de C_obra
    // y conservamos el borde verde completo hasta q(t) para evitar mezcla marrón con el rojo.
    if (simState.mode !== 'queue' && simState.method !== 'none') {
      const palette = {
        left: { fill: 'rgba(29, 78, 216, 0.14)', stroke: 'rgba(29, 78, 216, 0.72)' },
        right: { fill: 'rgba(180, 83, 9, 0.14)', stroke: 'rgba(180, 83, 9, 0.75)' },
        midpoint: { fill: 'rgba(21, 128, 61, 0.14)', stroke: 'rgba(21, 128, 61, 0.75)' }
      }[simState.method];

      riemann.rects.forEach((r) => {
        const xLeft = toX(r.x0);
        const xRight = toX(r.x1);
        const hPos = Math.max(0, r.h);
        const yTop = toY(hPos);
        const yBot = toY(0);
        const fillCap = simState.mode === 'combined' ? Math.min(hPos, simState.cObra) : hPos;
        const yFillTop = toY(fillCap);

        ctx.fillStyle = palette.fill;
        ctx.fillRect(xLeft, yFillTop, xRight - xLeft, yBot - yFillTop);

        ctx.strokeStyle = palette.stroke;
        ctx.lineWidth = simState.n >= 24 ? 0.95 : 1.25;
        ctx.strokeRect(xLeft, yTop, xRight - xLeft, yBot - yTop);
      });
    }

    // Área sombreada de represamiento en rojo coral limpio
    if (simState.mode !== 'riemann' && queueInfo.saturated) {
      const samples = 120;
      const tA = queueInfo.tIni;
      const tB = queueInfo.tStar;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(toX(tA), toY(simState.cObra));
      for (let i = 0; i <= samples; i++) {
        const t = tA + ((tB - tA) * i) / samples;
        ctx.lineTo(toX(t), toY(evalQ(t)));
      }
      ctx.lineTo(toX(tB), toY(simState.cObra));
      ctx.closePath();
      ctx.fillStyle = 'rgba(220, 38, 38, 0.22)';
      ctx.fill();
      ctx.restore();
    }

    // Curva continua q(t)
    const drawCurve = (tFrom, tTo, dashed) => {
      ctx.save();
      ctx.beginPath();
      if (dashed) ctx.setLineDash([6, 4]);
      const steps = 100;
      for (let i = 0; i <= steps; i++) {
        const t = tFrom + ((tTo - tFrom) * i) / steps;
        const yVal = evalQ(t);
        if (yVal < 0) break;
        const px = toX(t);
        const py = toY(yVal);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#1d3557';
      ctx.lineWidth = dashed ? 2 : 2.8;
      ctx.stroke();
      ctx.restore();
    };

    drawCurve(0, Math.min(1.5, bounds.tMax), false);
    if (bounds.tMax > 1.5) {
      drawCurve(1.5, bounds.tMax, true);
    }

    // Línea horizontal C_obra
    let pyCap = null;
    if (simState.mode !== 'riemann') {
      pyCap = toY(simState.cObra);
      ctx.save();
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad.left, pyCap);
      ctx.lineTo(cssWidth - pad.right, pyCap);
      ctx.stroke();
      ctx.restore();
    }

    // Puntos observados
    EMPIRICAL_DATA.forEach((pt) => {
      if (pt.h > bounds.tMax) return;
      const px = toX(pt.h);
      const py = toY(pt.flujo);
      ctx.beginPath();
      ctx.arc(px, py, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = '#b45309';
      ctx.fill();
      ctx.strokeStyle = '#1d3557';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    });

    // Ejes principales
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, cssHeight - pad.bottom);
    ctx.lineTo(cssWidth - pad.right, cssHeight - pad.bottom);
    ctx.stroke();

    // Etiquetas flotantes dibujadas al final con fondo blanco para evitar cruces
    if (plotW > 420) {
      const pxPico = toX(queueInfo.tPico);
      const pyPico = toY(queueInfo.qMaxRate);
      ctx.beginPath();
      ctx.arc(pxPico, pyPico, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = '#1d3557';
      ctx.fill();
      drawPillBadge(ctx, `Pico: ${Math.round(queueInfo.qMaxRate).toLocaleString('es-CO')} veh/h`, pxPico, Math.max(4, pyPico - 26), {
        align: 'center',
        color: '#1d3557',
        border: '#bfdbfe',
        bg: 'rgba(239, 246, 255, 0.95)',
        minX: pad.left + 6,
        maxX: cssWidth - pad.right - 6
      });
    }

    if (simState.mode !== 'riemann' && pyCap !== null) {
      let starBox = null;

      if (queueInfo.saturated) {
        if (queueInfo.tIni <= bounds.tMax) {
          const pxIni = toX(queueInfo.tIni);
          ctx.beginPath();
          ctx.arc(pxIni, pyCap, 4.8, 0, Math.PI * 2);
          ctx.fillStyle = '#b91c1c';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          drawPillBadge(ctx, `t_ini ${queueInfo.tIni.toFixed(2)}h`, Math.max(pad.left + 8, pxIni - 4), pyCap + 10, {
            align: 'left',
            color: '#991b1b',
            border: '#fecaca',
            minX: pad.left + 8,
            maxX: cssWidth - pad.right - 6
          });
        }

        if (queueInfo.tStar <= bounds.tMax) {
          const pxStar = toX(queueInfo.tStar);
          ctx.beginPath();
          ctx.arc(pxStar, pyCap, 4.8, 0, Math.PI * 2);
          ctx.fillStyle = '#7f1d1d';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          starBox = drawPillBadge(ctx, `t* ${queueInfo.tStar.toFixed(2)}h`, pxStar + 8, Math.max(pad.top + 4, pyCap - 27), {
            align: 'left',
            color: '#7f1d1d',
            border: '#fecaca',
            minX: pad.left + 8,
            maxX: cssWidth - pad.right - 6
          });
        }
      }

      // Etiqueta C_obra ubicada en el extremo derecho vacío; si t* se acerca, baja debajo de la línea
      const capText = `C_obra = ${simState.cObra} veh/h`;
      ctx.save();
      ctx.font = 'bold 10.5px "IBM Plex Mono", monospace';
      const capEstLeft = cssWidth - pad.right - 8 - (ctx.measureText(capText).width + 12);
      ctx.restore();
      const capY = starBox && starBox.right > capEstLeft - 10 ? pyCap + 10 : Math.max(pad.top + 4, pyCap - 27);

      drawPillBadge(ctx, capText, cssWidth - pad.right - 8, capY, {
        align: 'right',
        color: '#991b1b',
        border: '#fecaca',
        minX: pad.left + 8,
        maxX: cssWidth - pad.right - 6
      });
    }

    ctx.save();
    ctx.translate(15, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#374151';
    ctx.font = '600 11.5px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tasa de flujo q(t) [veh/h]', 0, 0);
    ctx.restore();

    // Línea guía al pasar el cursor
    if (simState.hoverT !== null && simState.hoverT >= 0 && simState.hoverT <= bounds.tMax) {
      const hx = toX(simState.hoverT);
      const hq = Math.max(0, evalQ(simState.hoverT));
      const hy = toY(hq);

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, pad.top);
      ctx.lineTo(hx, cssHeight - pad.bottom);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#1d3557';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    updateSimulatorKPIs(riemann, queueInfo);
  }

  function updateSimulatorKPIs(riemann, queueInfo) {
    const elMethodVal = document.getElementById('simRiemannVal');
    const elMethodSub = document.getElementById('simRiemannSub');
    const elErrVal = document.getElementById('simErrorVal');
    const elQmax = document.getElementById('simQmaxVal');
    const elTimes = document.getElementById('simWindowVal');
    const elTtd = document.getElementById('simTtdVal');
    const elDelay = document.getElementById('simDelayVal');
    const elBanner = document.getElementById('simStatusBanner');

    if (!elMethodVal) return;

    const methodLabels = {
      none: 'Exacto',
      left: `Izq. (n=${simState.n})`,
      right: `Der. (n=${simState.n})`,
      midpoint: `P. Medio (n=${simState.n})`
    };

    elMethodVal.textContent = `${formatNum(riemann.approxV, 2)} veh`;
    elMethodSub.textContent = `Aproximación ${methodLabels[simState.method]}`;
    elErrVal.textContent = `${riemann.relErr.toFixed(3)} % (Δ ${formatNum(riemann.absErr, 2)})`;

    if (!queueInfo.saturated) {
      elQmax.textContent = '0.00 veh';
      elTimes.textContent = 'Sin saturación';
      elTtd.textContent = '0.00 veh·h';
      elDelay.textContent = '0.00 min/veh';
      elBanner.className = 'status-note status-note--ok';
      elBanner.textContent = `Con C_obra = ${simState.cObra} veh/h no hay represamiento porque supera el pico q_máx (${Math.round(queueInfo.qMaxRate)} veh/h).`;
      return;
    }

    elQmax.textContent = `${formatNum(queueInfo.qMax, 2)} veh (en ${formatClock(queueInfo.tStar)})`;
    elTimes.textContent = `${formatClock(queueInfo.tIni)} – ${formatClock(queueInfo.tFin)}`;
    elTtd.textContent = `${formatNum(queueInfo.ttd, 2)} veh·h`;
    elDelay.textContent = `prom ${queueInfo.dProm.toFixed(2)} / máx ${queueInfo.dMax.toFixed(2)} min`;

    if (queueInfo.qMax >= 1000) {
      elBanner.className = 'status-note status-note--danger';
      elBanner.textContent = `Saturación severa: la cola alcanza ${formatNum(queueInfo.qMax, 0)} vehículos y tarda hasta las ${formatClock(queueInfo.tFin)} en despejarse.`;
    } else {
      elBanner.className = 'status-note status-note--warn';
      elBanner.textContent = `Congestión moderada: la cola máxima se reduce a ${formatNum(queueInfo.qMax, 0)} vehículos y se disipa a las ${formatClock(queueInfo.tFin)}.`;
    }
  }

  function bindSimulatorControls() {
    if (!canvas) return;

    document.querySelectorAll('[data-sim-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        simState.mode = btn.dataset.simMode;
        document.querySelectorAll('[data-sim-mode]').forEach((b) => b.classList.toggle('is-active', b === btn));
        renderSimulator();
      });
    });

    document.querySelectorAll('[data-riemann-method]').forEach((btn) => {
      btn.addEventListener('click', () => {
        simState.method = btn.dataset.riemannMethod;
        document.querySelectorAll('[data-riemann-method]').forEach((b) => b.classList.toggle('is-active', b === btn));
        renderSimulator();
      });
    });

    const nRange = document.getElementById('riemannNRange');
    const nDisplay = document.getElementById('riemannNDisplay');
    const nSteps = [6, 12, 24, 48];
    if (nRange) {
      nRange.addEventListener('input', () => {
        const idx = Number(nRange.value);
        simState.n = nSteps[idx] || 6;
        if (nDisplay) nDisplay.textContent = `n = ${simState.n}`;
        renderSimulator();
      });
    }

    const cRange = document.getElementById('capRange');
    const cDisplay = document.getElementById('capDisplay');
    const setCap = (val) => {
      simState.cObra = Number(val);
      if (cRange) cRange.value = String(val);
      if (cDisplay) cDisplay.textContent = `${simState.cObra} veh/h`;
      renderSimulator();
    };

    if (cRange) {
      cRange.addEventListener('input', () => setCap(cRange.value));
    }
    document.querySelectorAll('[data-cap-preset]').forEach((chip) => {
      chip.addEventListener('click', () => setCap(chip.dataset.capPreset));
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const padLeft = 66;
      const padRight = 28;
      const padTop = 34;
      const padBottom = 50;
      const plotW = rect.width - padLeft - padRight;
      const plotH = rect.height - padTop - padBottom;
      const relX = e.clientX - rect.left - padLeft;
      const bounds = getAxisBounds();

      if (relX < 0 || relX > plotW) {
        simState.hoverT = null;
        if (tooltip) tooltip.style.display = 'none';
        renderSimulator();
        return;
      }

      const t = bounds.tMin + (relX / plotW) * (bounds.tMax - bounds.tMin);
      simState.hoverT = t;
      const q = Math.max(0, evalQ(t));
      const queueInfo = computeQueueMetrics(simState.cObra);
      const qCola = evalQueueAt(t, queueInfo, simState.cObra);

      if (tooltip) {
        tooltip.style.display = 'block';
        tooltip.innerHTML =
          `t = ${t.toFixed(2)} h (${formatClock(t)})<br>` +
          `q(t) = ${formatNum(q, 1)} veh/h<br>` +
          `Cola Q(t) = ${formatNum(qCola, 1)} veh`;

        const boxOffsetX = canvas.offsetLeft;
        const boxOffsetY = canvas.offsetTop;
        const cursorX = boxOffsetX + padLeft + relX;
        const pointY = boxOffsetY + padTop + plotH - ((q - bounds.yMin) / (bounds.yMax - bounds.yMin)) * plotH;
        const tipW = tooltip.offsetWidth || 185;
        const tipH = tooltip.offsetHeight || 58;

        const placeRight = relX < plotW * 0.52;
        const leftOffset = placeRight
          ? Math.min(boxOffsetX + rect.width - tipW - 8, cursorX + 16)
          : Math.max(boxOffsetX + padLeft + 6, cursorX - tipW - 16);

        const placeBelow = pointY - tipH - 18 < boxOffsetY + padTop;
        const topOffset = placeBelow
          ? Math.min(boxOffsetY + rect.height - tipH - 20, pointY + 18)
          : Math.max(boxOffsetY + 8, pointY - tipH - 18);

        tooltip.style.left = `${leftOffset}px`;
        tooltip.style.top = `${topOffset}px`;
      }
      renderSimulator();
    });

    canvas.addEventListener('mouseleave', () => {
      simState.hoverT = null;
      if (tooltip) tooltip.style.display = 'none';
      renderSimulator();
    });

    window.addEventListener('resize', renderSimulator);
  }

  // --------------------------------------------------------------------------
  // Tablas de datos
  // --------------------------------------------------------------------------
  function populateTables() {
    const empBody = document.getElementById('empiricalTableBody');
    if (empBody) {
      empBody.innerHTML = EMPIRICAL_DATA.map((row) => `
        <tr>
          <td class="num">${row.min} min</td>
          <td class="num">${row.h.toFixed(2)} h (${formatClock(row.h)})</td>
          <td class="num">${row.livianos}</td>
          <td class="num">${row.buses}</td>
          <td class="num">${row.camiones}</td>
          <td class="num">${row.motos}</td>
          <td class="num"><strong>${row.conteo}</strong></td>
          <td class="num">${formatNum(row.flujo, 2)}</td>
          <td class="num">${formatNum(row.cap, 1)}</td>
        </tr>
      `).join('');
    }

    const riemannBody = document.getElementById('riemannTableBody');
    if (riemannBody) {
      riemannBody.innerHTML = RIEMANN_OFFICIAL.map((r) => `
        <tr class="${r.highlight ? 'row-best' : ''}">
          <td>${r.metodo}</td>
          <td><code>${r.formula}</code></td>
          <td class="num">${formatNum(r.volumen, 2)} veh</td>
          <td class="num">${formatNum(r.absErr, 2)} veh</td>
          <td class="num">${r.relErr}</td>
          <td>${r.nota}</td>
        </tr>
      `).join('');
    }
  }

  // --------------------------------------------------------------------------
  // Pestañas de código, copia, modal de imagen y menú móvil
  // --------------------------------------------------------------------------
  function initUIInteractions() {
    const codePre = document.getElementById('codeDisplay');
    const codeFilename = document.getElementById('codeFilename');
    let activeLang = 'python';

    const setCodeLang = (lang) => {
      activeLang = lang;
      if (codePre) codePre.textContent = CODE_SNIPPETS[lang];
      if (codeFilename) {
        codeFilename.textContent = lang === 'python' ? 'streamlit_app.py (extracto)' : 'TraficoIntegralOnline.m (extracto)';
      }
      document.querySelectorAll('[data-code-lang]').forEach((t) => {
        t.classList.toggle('is-active', t.dataset.codeLang === lang);
      });
    };

    if (codePre) setCodeLang('python');

    document.querySelectorAll('[data-code-lang]').forEach((tab) => {
      tab.addEventListener('click', () => setCodeLang(tab.dataset.codeLang));
    });

    const copyBtn = document.getElementById('copyCodeBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const text = CODE_SNIPPETS[activeLang] || '';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
          copyBtn.textContent = 'Copiado';
          setTimeout(() => {
            copyBtn.textContent = 'Copiar';
          }, 1600);
        } catch (err) {
          copyBtn.textContent = 'No se pudo copiar';
        }
      });
    }

    const modal = document.getElementById('imageModal');
    const openModalBtn = document.getElementById('openFigureModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (modal && openModalBtn) {
      openModalBtn.addEventListener('click', () => modal.classList.add('is-open'));
      if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => modal.classList.remove('is-open'));
      }
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('is-open');
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.classList.remove('is-open');
      });
    }

    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    if (navbar && navToggle) {
      navToggle.addEventListener('click', () => {
        navbar.classList.toggle('is-mobile-open');
      });
      navbar.querySelectorAll('.nav-list a').forEach((link) => {
        link.addEventListener('click', () => navbar.classList.remove('is-mobile-open'));
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    populateTables();
    bindSimulatorControls();
    initUIInteractions();
    renderSimulator();
  });
})();
