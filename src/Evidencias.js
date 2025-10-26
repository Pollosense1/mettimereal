import React from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import './Evidencias.css';
import { jsPDF } from 'jspdf';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// ---------- PDF helpers ----------

const MM = { margin: 14, pageH: 297, pageW: 210 };
const contentW = MM.pageW - MM.margin * 2;

// New: theme and header/footer utilities
const COLORS = {
  primary: '#0A5FFF',
  accent: '#EEF3FF',
  text: '#111827',
  subtle: '#6B7280',
  line: '#E5E7EB',
};
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}
let LOGO_DATA_URL = null;
async function loadLogoDataURL() {
  try {
    const res = await fetch('METTIME LOGO.png', { cache: 'force-cache' });
    const blob = await res.blob();
    // Reuse existing encoder to ensure JPEG and reasonable size
    return await fileToJpegDataURL(blob, 600, 0.85);
  } catch {
    return null;
  }
}
function addReportCover(doc, yRef, title) {
  // Top band
  const [pr, pg, pb] = hexToRgb(COLORS.primary);
  doc.setFillColor(pr, pg, pb);
  const bandH = 18;
  doc.rect(0, 0, MM.pageW, bandH, 'F');

  // Logo
  const logoW = 20;
  if (LOGO_DATA_URL) {
    doc.addImage(LOGO_DATA_URL, 'JPEG', MM.margin, 3, logoW, bandH - 6, undefined, 'FAST');
  }

  // Company text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('MET-TIME, S.A DE C.V.', MM.margin + logoW + 4, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'Organismo de inspección acreditado por EMA • Acreditación UIBI-004 • 2024/08/26',
    MM.margin + logoW + 4,
    14.5
  );

  // Title chip
  yRef.y = bandH + MM.margin;
  const [ar, ag, ab] = hexToRgb(COLORS.accent);
  const [tr, tg, tb] = hexToRgb(COLORS.text);
  const [lr, lg, lb] = hexToRgb(COLORS.line);

  doc.setFillColor(ar, ag, ab);
  doc.roundedRect(MM.margin, yRef.y, contentW, 12, 2, 2, 'F');
  doc.setTextColor(pr, pg, pb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, MM.margin + 4, yRef.y + 8);

  yRef.y += 16;
  doc.setDrawColor(lr, lg, lb);
  doc.line(MM.margin, yRef.y, MM.pageW - MM.margin, yRef.y);
  yRef.y += 6;
  doc.setTextColor(tr, tg, tb);
}
function addMiniHeader(doc, yRef) {
  // Small top band for subsequent pages
  const [pr, pg, pb] = hexToRgb(COLORS.primary);
  const [lr, lg, lb] = hexToRgb(COLORS.line);
  const bandH = 10;

  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, MM.pageW, bandH, 'F');

  if (LOGO_DATA_URL) {
    doc.addImage(LOGO_DATA_URL, 'JPEG', MM.margin, 2, 12, 6, undefined, 'FAST');
  }

  doc.setDrawColor(lr, lg, lb);
  doc.line(MM.margin, bandH + 2, MM.pageW - MM.margin, bandH + 2);
  yRef.y = Math.max(yRef.y, bandH + 6 + MM.margin / 2);
}
function addPageNumbers(doc) {
  const [sr, sg, sb] = hexToRgb(COLORS.subtle);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(sr, sg, sb);
    doc.text(`Página ${i} de ${pageCount}`, MM.pageW - MM.margin, MM.pageH - 6, { align: 'right' });
  }
}

async function fileToJpegDataURL(file, maxW = 1400, quality = 0.65) {
  // Only accept real File/Blob objects; ignore metadata like {name, size, type}
  if (!(file instanceof Blob)) return null;

  // Decode directly from the Blob/File (no arrayBuffer call)
  let bmp;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    // Fallback for older browsers: draw via <img> + objectURL
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    URL.revokeObjectURL(url);

    const ratio = Math.min(1, maxW / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * ratio));
    canvas.height = Math.max(1, Math.round(img.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  // Resize and encode to JPEG
  const ratio = Math.min(1, maxW / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * ratio));
  canvas.height = Math.max(1, Math.round(bmp.height * ratio));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function addHeader(doc, title, yRef) {
  // Styled section header
  const [ar, ag, ab] = hexToRgb(COLORS.accent);
  const [pr, pg, pb] = hexToRgb(COLORS.primary);
  const [lr, lg, lb] = hexToRgb(COLORS.line);
  const [tr, tg, tb] = hexToRgb(COLORS.text);

  ensureSpace(doc, 16, yRef);
  doc.setFillColor(ar, ag, ab);
  doc.roundedRect(MM.margin, yRef.y, contentW, 9, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(pr, pg, pb);
  doc.text(title, MM.margin + 3.5, yRef.y + 6.5);

  yRef.y += 13;
  doc.setDrawColor(lr, lg, lb);
  doc.line(MM.margin, yRef.y, MM.pageW - MM.margin, yRef.y);
  yRef.y += 4;

  doc.setTextColor(tr, tg, tb);
}

function addKV(doc, label, value, yRef) {
  const [sr, sg, sb] = hexToRgb(COLORS.subtle);
  const [tr, tg, tb] = hexToRgb(COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(sr, sg, sb);
  doc.text(label, MM.margin, yRef.y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(tr, tg, tb);
  const lines = doc.splitTextToSize(String(value ?? ''), contentW - 40);
  doc.text(lines, MM.margin + 40, yRef.y);
  yRef.y += Math.max(7, lines.length * 5.5);
}

// New: draw a one-row table with the three options and selected mark
function drawReqOptionsTable(doc, description, selected, yRef) {
  const [ar, ag, ab] = hexToRgb(COLORS.accent);
  const [pr, pg, pb] = hexToRgb(COLORS.primary);
  const [lr, lg, lb] = hexToRgb(COLORS.line);
  const [tr, tg, tb] = hexToRgb(COLORS.text);
  const [sr, sg, sb] = hexToRgb(COLORS.subtle);

  const wOpt = 28;
  const wDesc = Math.max(40, contentW - wOpt * 3);
  const pad = 3;
  const headerH = 8;

  // Measure description height
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const descLines = doc.splitTextToSize(String(description || ''), wDesc - pad * 2);
  const lineH = 5.2;
  const bodyH = Math.max(14, descLines.length * lineH + pad * 2);
  const totalH = headerH + bodyH;

  ensureSpace(doc, totalH, yRef);

  // Header background
  let x = MM.margin;
  doc.setFillColor(ar, ag, ab);
  doc.setDrawColor(lr, lg, lb);
  // Desc header cell
  doc.rect(x, yRef.y, wDesc, headerH, 'F');
  // Option header cells
  for (let i = 0; i < 3; i++) {
    doc.rect(x + wDesc + i * wOpt, yRef.y, wOpt, headerH, 'F');
  }

  // Header texts
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(pr, pg, pb);
  doc.text('Requisito', x + pad, yRef.y + headerH - 3.2);
  const headers = ['CUMPLE', 'NO CUMPLE', 'NO APLICA'];
  for (let i = 0; i < 3; i++) {
    const cx = x + wDesc + i * wOpt + wOpt / 2;
    doc.text(headers[i], cx, yRef.y + headerH - 3.2, { align: 'center' });
  }

  // Body row outlines
  const bodyY = yRef.y + headerH;
  // Description body cell
  doc.setTextColor(tr, tg, tb);
  doc.setDrawColor(lr, lg, lb);
  doc.rect(x, bodyY, wDesc, bodyH);
  doc.text(descLines, x + pad, bodyY + pad + 4);

  // Option body cells + checkbox
  const valToIdx = (v) => (v === 'CUMPLE' ? 0 : v === 'NO_CUMPLE' ? 1 : v === 'NO_APLICA' ? 2 : -1);
  const selIndex = valToIdx(selected);
  for (let i = 0; i < 3; i++) {
    const cellX = x + wDesc + i * wOpt;
    doc.rect(cellX, bodyY, wOpt, bodyH);

    // Draw checkbox centered
    const box = 7;
    const bx = cellX + (wOpt - box) / 2;
    const by = bodyY + (bodyH - box) / 2;

    if (i === selIndex) {
      doc.setFillColor(pr, pg, pb);
      doc.rect(bx, by, box, box, 'F');
      // White check
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('✔', bx + box / 2, by + box - 1.5, { align: 'center' });
      doc.setTextColor(tr, tg, tb);
    } else {
      doc.setDrawColor(lr, lg, lb);
      doc.rect(bx, by, box, box);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(sr, sg, sb);
      doc.text('—', bx + box / 2, by + box - 2, { align: 'center' });
      doc.setTextColor(tr, tg, tb);
    }
  }

  yRef.y = bodyY + bodyH + 6;
}

function ensureSpace(doc, heightNeeded, yRef) {
  if (yRef.y + heightNeeded > MM.pageH - MM.margin) {
    doc.addPage();
    yRef.y = MM.margin;
    addMiniHeader(doc, yRef);
  }
}

async function addImagesGrid(doc, files, yRef, opts = {}) {
  const list = Array.isArray(files) ? files : [];
  const dataUrls = (
    await Promise.all(list.map((f) => fileToJpegDataURL(f).catch(() => null)))
  ).filter(Boolean);
  if (!dataUrls.length) return;

  const { bottomGap = 30, rowGap = 8, maxImageHeight = 60 } = opts;

  const cols = 3;
  const gap = 3;
  const cellW = (contentW - gap * (cols - 1)) / cols;

  const loadImg = (src) =>
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });

  let row = [];

  async function flushRow() {
    if (!row.length) return;
    const rowH = Math.max(...row.map((r) => r.h));
    ensureSpace(doc, rowH + rowGap + 2, yRef);

    row.forEach((r, i) => {
      const x = MM.margin + i * (cellW + gap);
      const y = yRef.y + (rowH - r.h) / 2; // vertical centering within the row
      doc.addImage(r.src, 'JPEG', x, y, r.w, r.h, undefined, 'FAST');
    });

    yRef.y += rowH + rowGap;
    row = [];
  }

  for (const src of dataUrls) {
    const img = await loadImg(src);
    const ratio = img.width / img.height;
    const w = cellW;
    const h = Math.min(maxImageHeight, w / ratio);

    row.push({ src, w, h });
    if (row.length === cols) {
      await flushRow();
    }
  }

  // Draw any remaining images in the last row
  if (row.length) {
    await flushRow();
  }

  // Extra bottom spacing after the evidencias block
  ensureSpace(doc, bottomGap, yRef);
  yRef.y += bottomGap;
}



async function buildPdf(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const yRef = { y: MM.margin };

  // Load logo once and draw report cover
  if (!LOGO_DATA_URL) {
    LOGO_DATA_URL = await loadLogoDataURL();
  }
  addReportCover(doc, yRef, 'DICTAMEN DE INSPECCIÓN');

  // Datos generales
  addHeader(doc, 'Datos del dictamen', yRef);
  addKV(doc, 'Expediente:', data.expediente, yRef);
  addKV(doc, 'Fecha:', data.fecha, yRef);
  addKV(doc, 'Hora inicio:', `${data.horaInicio.hh}:${data.horaInicio.mm} ${data.horaInicio.ampm}`, yRef);
  addKV(doc, 'Hora término:', `${data.horaTermino.hh}:${data.horaTermino.mm} ${data.horaTermino.ampm}`, yRef);
  addKV(doc, 'Propietario:', `${data.propietario?.nombres || ''} ${data.propietario?.apellidos || ''}`, yRef);
  addKV(doc, 'Domicilio:', `${data.domicilio?.calle || ''}, ${data.domicilio?.colonia || ''}, ${data.domicilio?.municipio || ''}, ${data.domicilio?.estado || ''}, CP ${data.domicilio?.cp || ''}`, yRef);
  addKV(doc, 'Giro:', data.giro, yRef);
  addKV(doc, 'RFC:', data.rfc, yRef);
  addKV(doc, 'Tipo inspección:', data.tipoInspeccion, yRef);

  // Página 2 - Canales
  addHeader(doc, 'P2: Canales y evidencias', yRef);
  for (let i = 0; i < (data.canales || []).length; i++) {
    ensureSpace(doc, 12, yRef);
    doc.setFont('helvetica', 'bold');
    doc.text(`Requisito ${i + 1}`, MM.margin, yRef.y);
    yRef.y += 4;

    // Table with options
    drawReqOptionsTable(doc, p2Blocks[i]?.desc || '', data.canales[i]?.status, yRef);

    addKV(doc, 'Observación:', data.canales[i]?.observacion || '', yRef);
    doc.setFont('helvetica', 'bold'); doc.text('Evidencias:', MM.margin, yRef.y); yRef.y += 4;
    await addImagesGrid(doc, data.canales[i]?.evidencias, yRef);
  }

  // Página 3 - Portal (condicional) y otros
  addHeader(doc, 'P3: Información y portal', yRef);
  addKV(doc, '¿Tiene portal?', data.portal?.hasPortal || '', yRef);
  if (data.portal?.hasPortal === 'SI') {
    // Portal evaluation as a one-row table
    drawReqOptionsTable(doc, portalP3Desc, data.portal?.evaluacion?.status, yRef);
    addKV(doc, 'Observación:', data.portal?.evaluacion?.observacion || '', yRef);
    doc.setFont('helvetica', 'bold'); doc.text('Evidencias:', MM.margin, yRef.y); yRef.y += 4;
    await addImagesGrid(doc, data.portal?.evaluacion?.evidencias, yRef);

    for (let i = 0; i < (data.otros || []).length; i++) {
      ensureSpace(doc, 10, yRef);
      doc.setFont('helvetica', 'bold'); doc.text(`Requisito ${i + 1}`, MM.margin, yRef.y); yRef.y += 4;

      drawReqOptionsTable(doc, p3Blocks[i]?.desc || '', data.otros[i]?.status, yRef);
      addKV(doc, 'Observación:', data.otros[i]?.observacion || '', yRef);
      doc.setFont('helvetica', 'bold'); doc.text('Evidencias:', MM.margin, yRef.y); yRef.y += 4;
      await addImagesGrid(doc, data.otros[i]?.evidencias, yRef);
    }
  }

  // Página 4 - Oficina (condicional)
  addHeader(doc, 'P4: Oficina física', yRef);
  addKV(doc, '¿Tiene oficina física?', data.oficina?.hasOffice || '', yRef);
  if (data.oficina?.hasOffice === 'SI') {
    drawReqOptionsTable(
      doc,
      'La información prevista en este numeral debe estar a la vista o indicarse que la misma está disponible y ser de fácil acceso para el consumidor.',
      data.oficina?.general?.status,
      yRef
    );
    addKV(doc, 'Observación:', data.oficina?.general?.observacion || '', yRef);
    doc.setFont('helvetica', 'bold'); doc.text('Evidencias:', MM.margin, yRef.y); yRef.y += 4;
    await addImagesGrid(doc, data.oficina?.general?.evidencias, yRef);

    for (let i = 0; i < (data.p4 || []).length; i++) {
      ensureSpace(doc, 10, yRef);
      doc.setFont('helvetica', 'bold'); doc.text(`Requisito ${i + 1}`, MM.margin, yRef.y); yRef.y += 4;

      drawReqOptionsTable(doc, p4Blocks[i]?.desc || '', data.p4[i]?.status, yRef);
      addKV(doc, 'Observación:', data.p4[i]?.observacion || '', yRef);
      doc.setFont('helvetica', 'bold'); doc.text('Evidencias:', MM.margin, yRef.y); yRef.y += 4;
      await addImagesGrid(doc, data.p4[i]?.evidencias, yRef);
    }
  }

  // Página 5 - Anticipo
  addHeader(doc, 'P5: Anticipo', yRef);
  for (let i = 0; i < (data.p5 || []).length; i++) {
    ensureSpace(doc, 10, yRef);
    doc.setFont('helvetica', 'bold');
    doc.text(`Requisito ${i + 1}`, MM.margin, yRef.y);
    yRef.y += 4;

    // Show the three-option table (always visible even without evidencias)
    drawReqOptionsTable(doc, p5Blocks[i]?.desc || '', data.p5[i]?.status, yRef);

    // Observación
    addKV(doc, 'Observación:', data.p5[i]?.observacion || '', yRef);

    // Evidencias (optional)
    doc.setFont('helvetica', 'bold');
    doc.text('Evidencias:', MM.margin, yRef.y);
    yRef.y += 4;
    await addImagesGrid(doc, data.p5[i]?.evidencias, yRef);

    if (i < (data.p5.length - 1)) {
      ensureSpace(doc, 6, yRef);
      yRef.y += 2; // small gap between items
    }
  }

  // NEW: final label at the end of the document
  ensureSpace(doc, 12, yRef);
  const [sr, sg, sb] = hexToRgb(COLORS.subtle);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(sr, sg, sb);
  doc.text('*Documento electrónico con validez oficial', MM.pageW / 2, yRef.y + 6, { align: 'center' });
  yRef.y += 12;

  // Add footer page numbers last
  addPageNumbers(doc);
  return doc;
}
// ---------- end PDF helpers ----------

const p2Blocks = [
  {
    title: 'Canales de atención de quejas y solicitudes',
    desc:
      'El proveedor demostrará que cuenta con canales y mecanismos de atención al consumidor, gratuitos y accesibles a través de cualquiera de los siguientes medios: ' +
      'Teléfonos, correo electrónico, formularios en sitios web o cualquier medio de contacto digital, debiendo manifestar que los mismos están habilitados por lo menos en días y horas hábiles.',
  },
  {
    title: 'Canales de atención de quejas y solicitudes',
    desc:
      'El proveedor enseñará su formato o medio, en forma digital o física para recibir quejas, solicitudes o sugerencias por parte de los consumidores, ' +
      'en cualquiera de los puntos de venta o atención a clientes, domicilio de la casa matriz del proveedor o de sus sucursales.',
  },
  {
    title: 'Canales de atención de quejas y solicitudes',
    desc: 'El proveedor manifestará el medio digital o físico por el cual señaló un domicilio para oír y recibir notificaciones de los consumidores.',
  },
];

const p3Blocks = [
  {
    // 1
    desc: 'El Aviso de Privacidad',
    dropLabel: 'Evidencia de la información del portal en internet',
  },
  {
    // 2
    desc: 'Formas y planes de pago de los inmuebles',
    dropLabel: 'Evidencia de los canales de atención de quejas y solicitudes',
  },
  {
    // 3
    desc:
      'En caso de que el inmueble esté financiado por el proveedor, éste debe informar sobre el porcentaje de la tasa de interés, el costo anual total, el monto de las comisiones, así como los seguros adheridos al financiamiento y sus coberturas que existieren',
    dropLabel: 'Evidencia de los canales de atención de quejas y solicitudes',
  },
  {
    // 4
    desc: 'Modelo de contrato de adhesión registrado ante la PROFECO',
    dropLabel: 'Evidencia de los canales de atención de quejas y solicitudes',
  },
  {
    // 5
    desc:
      'Leyenda que indique que en las operaciones de crédito el precio total se determinará en función de los montos variables de conceptos de crédito y gastos notariales que deben ser consultados con los promotores, conforme al apartado 5.6.7 de la NOM-247-SE-2024',
    dropLabel: 'Evidencia de los canales de atención de quejas y solicitudes',
  },
  {
    // 6
    desc:
      'Dirección física y electrónica en la que se podrá presentar una queja o reclamación, y horarios de atención',
    dropLabel: 'Evidencia de los canales de atención de quejas y solicitudes',
  },
];

// --- Page 4 items in the same order as your pasted images ---
const p4DropLabel = 'Evidencia de la información en oficina de atención física';
const p4Blocks = [
  // 1) Financiamiento
  {
    desc:
      'En caso de que el inmueble esté financiado por el proveedor, éste debe informar sobre el porcentaje de la tasa de interés, el costo anual total, el monto de las comisiones, así como los seguros adheridos al financiamiento y sus coberturas que existieren',
    dropLabel: p4DropLabel,
  },
  // 2) Modelo de contrato
  {
    desc: 'Modelo de contrato de adhesión registrado ante la PROFECO',
    dropLabel: p4DropLabel,
  },
  // 3) Formas y planes
  {
    desc: 'Formas y planes de pago de los inmuebles',
    dropLabel: p4DropLabel,
  },
  // 4) Dirección para quejas
  {
    desc:
      'Dirección física y electrónica en la que se podrá presentar una queja o reclamación, y horarios de atención',
    dropLabel: p4DropLabel,
  },
  // 5) Precios totales y características
  {
    desc:
      'Precios totales en operaciones de contado y las características de los diferentes tipos de inmueble que comercializa a través de un vínculo',
    dropLabel: p4DropLabel,
  },
  // 6) Leyenda de operaciones de crédito (versión extendida de la imagen)
  {
    desc:
      'Leyenda que indique que en las operaciones de crédito el precio total se determinará en función de los montos variables de conceptos de crédito y notariales que deben ser consultados con los promotores, conforme al apartado 5.6.7 de la NOM-247-SE-2024 que indica: El proveedor es responsable de indicar las opciones de pago que acepta del consumidor, asimismo deberá señalarle si acepta o no créditos y en su caso, de qué instituciones, la presente obligación es por cada unidad privativa que pretenda comercializar.',
    dropLabel: p4DropLabel,
  },
];

const portalP3Desc =
  'En caso de que se cuente con portal de Internet por parte del proveedor, se revisa que incluya: ' +
  'Precios totales en operaciones de contado y características de los tipos de inmueble que comercializa a través de un vínculo.';

// removed unused: stepP4Fields

// --- Page 5 items (placeholder texts; replace after you share images) ---
const p5Blocks = [
  {
    // 1
    desc:
      'El proveedor debe demostrar a la Unidad de Inspección que ha otorgado comprobante, en formato libre digital o impreso, por los anticipos recibidos',
  },
  {
    // 2
    desc:
      'Debe demostrar evidencia documental donde se haga constar que informo al consumidor de las condiciones a las que está sujeto dicho anticipo, así como las políticas para su aplicación, devolución o reembolso conforme a lo previsto por la NOM-247-SE-2021 en su inciso 4.4',
    dropLabel: 'El proveedor debe entregar un comprobante al consumidor por el anticipo que le sea entregado. Es importante que el proveedor informe al consumidor previo a la entrega del anticipo, respecto a:',
    dropLabel2: '(i) que éste se abonará al pago del bien inmueble,',
    dropLabel3: '(ii) obligaciones y derechos generados para el proveedor y el consumidor derivadas del anticipo,',
    dropLabel4: '(iii) mecanismos, términos y condiciones para reclamar la devolución del anticipo, incluyendo el plazo y las posibles penalizaciones si se realiza fuera del plazo establecido.',
    dropLabel5: 'La devolución del anticipo debe ser por el mismo medio en el que se realizó el pago, y en el mismo número y monto de las exhibiciones mediante las cuales el consumidor efectuó el pago del anticipo, o bien, pudiendo realizarse en forma distinta siempre que el proveedor lo ofrezca y el consumidor lo acepte, al momento de la devolución, y debe señalar el plazo en el que se realizará el mismo.',
    dropLabel6: 'La devolución del anticipo será sin penalización alguna siempre y cuando se solicite en el plazo convenido entre el proveedor y el consumidor. En los demás casos, la devolución del anticipo estará sujeta a las penalizaciones que haya establecido el proveedor.',
  },
  {
    // 3
    desc:
      'En el caso que el consumidor haya decidido no continuar con la compra del inmueble, el proveedor debe demostrar a la Unidad de Inspección que el trámite de la devolución del anticipo es realizado conforme a lo dispuesto en el segundo párrafo de 4.4 de la NOM-247-SE-2021',
    dropLabel:
      'La devolución del anticipo debe ser por el mismo medio en el que se realizó el pago, y en el mismo número y monto de las exhibiciones mediante las cuales el consumidor efectuó el pago del anticipo, o bien, pudiendo realizarse en forma distinta siempre que el proveedor lo ofrezca y el consumidor lo acepte, al momento de la devolución, y debe señalar el plazo en el que se realizará el mismo.',
    dropLabel2:
      'La devolución del anticipo será sin penalización alguna siempre y cuando se solicite en el plazo convenido entre el proveedor y el consumidor. En los demás casos, la devolución del anticipo estará sujeta a las penalizaciones que haya establecido el proveedor.',
  },
  {
    // 4
    desc:
      'Se demuestra si el consumidor decidió, continuar con la compra del inmueble con copia de la comunicación escrita de su aceptación, virtual o impresa, según sea el caso.',
  },
  {
    // 5
    desc:
      'En el caso que el proyecto ejecutivo del inmueble por el cual se realizó el anticipo necesite modificarse durante la obra, el proveedor debe demostrar mediante la copia de la comunicación física o electrónica que contenga la fecha de dicha notificación, que avisó al consumidor sobre las modificaciones realizadas, de acuerdo a lo establecido en el cuarto párrafo de 4.4:',
    dropLabel:
      'En el caso que el proyecto ejecutivo del inmueble por el cual se realizó el anticipo necesite modificarse durante la obra, el proveedor debe notificar al consumidor sobre las modificaciones realizadas, debiendo este último autorizar de forma expresa por escrito, continuar con la compra del inmueble o devolución del enganche y en su caso, el pago de una indemnización, daño o perjuicio, penalización o posible bonificación que el consumidor pudiera reclamar de conformidad con lo previsto por los artículos 7 y 92 fracción II de la LFPC en lo correspondiente a dicho proyecto ejecutivo.',
  },
];

// ---------- validation (zod) ----------
const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

const timeSchema = z.object({
  hh: z.string().min(1, 'HH requerido').refine((v) => /^\d{1,2}$/.test(v) && +v >= 1 && +v <= 12, 'HH debe ser 1-12'),
  mm: z.string().min(1, 'MM requerido').refine((v) => /^\d{1,2}$/.test(v) && +v >= 0 && +v <= 59, 'MM debe ser 00-59'),
  ampm: z.enum(['AM', 'PM'], { required_error: 'Selecciona AM/PM' }),
});

const addressSchema = z.object({
  calle: z.string().min(1, 'Requerido'),
  colonia: z.string().min(1, 'Requerido'),
  municipio: z.string().min(1, 'Requerido'),
  estado: z.string().min(1, 'Requerido'),
  cp: z.string().min(1, 'Requerido'),
});

// Strict for always-required sections (p2, p5)
const requisitoSchemaRequired = z.object({
  status: z.enum(['CUMPLE', 'NO_CUMPLE', 'NO_APLICA'], { required_error: 'Selecciona una opción' }),
  observacion: z.string().optional(),
  evidencias: z.array(z.any()).optional(),
});

// Relaxed for conditional sections (portal, otros, oficina, p4)
const requisitoSchemaOptional = z.object({
  status: z.enum(['CUMPLE', 'NO_CUMPLE', 'NO_APLICA']).optional(),
  observacion: z.string().optional(),
  evidencias: z.array(z.any()).optional(),
});

const portalSchema = z.object({
  hasPortal: z.enum(['SI', 'NO'], { required_error: 'Selecciona SI o NO' }),
  evaluacion: requisitoSchemaOptional.optional(),
});

const officeSchema = z.object({
  hasOffice: z.enum(['SI', 'NO'], { required_error: 'Selecciona SI o NO' }),
  general: requisitoSchemaOptional.optional(),
});

const fullSchema = z
  .object({
    expediente: z.string().min(1, 'Requerido').refine((v) => v.startsWith('MT-IC-'), 'Debe iniciar con "MT-IC-"'),
    fecha: z.string().min(1, 'Requerido'),
    horaInicio: timeSchema,
    horaTermino: timeSchema,
    propietario: z.object({
      nombres: z.string().min(1, 'Requerido'),
      apellidos: z.string().min(1, 'Requerido'),
    }),
    domicilio: addressSchema,
    giro: z.string().min(1, 'Requerido'),
    rfc: z.string().min(1, 'Requerido').regex(rfcRegex, 'RFC inválido'),
    tipoInspeccion: z.string().min(1, 'Requerido'),

    // Always required sections
    canales: z.array(requisitoSchemaRequired).length(p2Blocks.length),
    p5: z.array(requisitoSchemaRequired).length(p5Blocks.length),

    // Conditional sections (may exist but with empty status)
    portal: portalSchema,
    otros: z.array(requisitoSchemaOptional).length(p3Blocks.length).optional(),
    oficina: officeSchema,
    p4: z.array(requisitoSchemaOptional).length(p4Blocks.length).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.portal?.hasPortal === 'SI') {
      if (!data.portal?.evaluacion?.status) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecciona una opción', path: ['portal', 'evaluacion', 'status'] });
      }
      (data.otros || []).forEach((r, i) => {
        if (!r?.status) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecciona una opción', path: ['otros', i, 'status'] });
        }
      });
    }
    if (data.oficina?.hasOffice === 'SI') {
      if (!data.oficina?.general?.status) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecciona una opción', path: ['oficina', 'general', 'status'] });
      }
      (data.p4 || []).forEach((r, i) => {
        if (!r?.status) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecciona una opción', path: ['p4', i, 'status'] });
        }
      });
    }
  });

// Fields tracked for step completion
const stepP5Fields = p5Blocks.map((_, i) => `p5.${i}.status`);

const steps = [
  { id: 'p1', label: 'P1: Datos del dictamen', fields: [
    'expediente','fecha','horaInicio.hh','horaInicio.mm','horaInicio.ampm',
    'propietario.nombres','propietario.apellidos','domicilio.calle','domicilio.colonia',
    'domicilio.municipio','domicilio.estado','domicilio.cp','giro','rfc','tipoInspeccion',
  ] },
  { id: 'p2', label: 'P2: Canales y evidencias', fields: ['canales.0.status', 'canales.1.status', 'canales.2.status'] },
  { id: 'p3', label: 'P3: Información y portal', fields: ['portal.hasPortal'] },
  { id: 'p4', label: 'P4: Oficina física', fields: ['oficina.hasOffice'] },
  { id: 'p5', label: 'P5: Anticipo', fields: stepP5Fields },
  // NEW: Page 6 validation
  { id: 'p6', label: 'P6: Hora de término', fields: ['horaTermino.hh','horaTermino.mm','horaTermino.ampm'] },
];

const STORAGE_KEY = 'evidencias.draft.v1';

export default function Evidencias() {
  const methods = useForm({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      expediente: 'MT-IC-',
      fecha: '',
      horaInicio: { hh: '', mm: '', ampm: 'AM' },
      horaTermino: { hh: '', mm: '', ampm: 'AM' },
      propietario: { nombres: '', apellidos: '' },
      domicilio: { calle: '', colonia: '', municipio: '', estado: '', cp: '' },
      giro: '',
      rfc: '',
      tipoInspeccion: '',

      canales: p2Blocks.map(() => ({ status: undefined, observacion: '', evidencias: [] })),

      otros: p3Blocks.map(() => ({ status: undefined, observacion: '', evidencias: [] })),
      portal: { hasPortal: undefined, evaluacion: { status: undefined, observacion: '', evidencias: [] } },

      oficina: { hasOffice: undefined, general: { status: undefined, observacion: '', evidencias: [] } },
      p4: p4Blocks.map(() => ({ status: undefined, observacion: '', evidencias: [] })),

      p5: p5Blocks.map(() => ({ status: undefined, observacion: '', evidencias: [] })),
    },
    mode: 'onBlur',
  });

  const { handleSubmit, trigger, reset, getValues, watch } = methods;
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    reset(undefined, { keepDefaultValues: true });
  }, [reset]);

  const values = watch();
  React.useEffect(() => {
    const t = setTimeout(() => {
      const v = getValues();
      const meta = (arr) =>
        Array.isArray(arr)
          ? arr.map((f) => (f && typeof f === 'object' && 'name' in f ? { name: f.name, size: f.size, type: f.type } : f))
          : [];
      const safe = {
        ...v,
        canales: (v.canales || []).map((b) => ({ ...b, evidencias: meta(b.evidencias) })),
        otros: (v.otros || []).map((b) => ({ ...b, evidencias: meta(b.evidencias) })),
        portal: v.portal
          ? {
              ...v.portal,
              evaluacion: v.portal.evaluacion ? { ...v.portal.evaluacion, evidencias: meta(v.portal.evaluacion.evidencias) } : undefined,
            }
          : v.portal,
        oficina: v.oficina
          ? {
              ...v.oficina,
              general: v.oficina.general ? { ...v.oficina.general, evidencias: meta(v.oficina.general.evidencias) } : undefined,
            }
          : v.oficina,
        p4: (v.p4 || []).map((b) => ({ ...b, evidencias: meta(b.evidencias) })),
        // Página 5
        p5: (v.p5 || []).map((b) => ({ ...b, evidencias: meta(b.evidencias) })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    }, 400);
    return () => clearTimeout(t);
  }, [values, getValues]);

  const resolveFieldsForStep = () => {
    const step = steps[stepIndex];
    if (step.id === 'p3') {
      const hasPortal = watch('portal.hasPortal');
      const base = ['portal.hasPortal'];
      if (hasPortal === 'SI') {
        base.push('portal.evaluacion.status', ...p3Blocks.map((_, i) => `otros.${i}.status`));
      }
      return base;
    }
    if (step.id === 'p4') {
      const hasOffice = watch('oficina.hasOffice');
      const base = ['oficina.hasOffice'];
      if (hasOffice === 'SI') {
        base.push('oficina.general.status', ...p4Blocks.map((_, i) => `p4.${i}.status`));
      }
      return base;
    }
    return step.fields;
  };

  // FIX: clean onSubmit and close function correctly
  const onSubmit = async (data) => {
    if (stepIndex < steps.length - 1) {
      const ok = await trigger(resolveFieldsForStep(), { shouldFocus: true });
      if (ok) setStepIndex((i) => i + 1);
      return;
    }

    // Build filename: "Evidencias <NOMBRE DEL PROPIETARIO>.pdf"
    const ownerNameRaw = `${data.propietario?.nombres || ''} ${data.propietario?.apellidos || ''}`.trim();
    const baseName = ownerNameRaw || data.expediente || 'METTIME';
    const safeBase = baseName.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    const fileName = `Evidencias ${safeBase}.pdf`;

    try {
      const doc = await buildPdf(data);
      doc.save(fileName);
    } catch (err) {
      console.error('PDF save failed, opening in new tab instead:', err);
      try {
        const doc = await buildPdf(data);
        const url = doc.output('bloburl');
        window.open(url, '_blank');
      } catch (err2) {
        console.error('PDF open failed:', err2);
        alert('No se pudo generar el PDF. Revisa la consola del navegador.');
      }
    }
  };

  // Keep only this next(); delete any duplicate below
  const next = async () => {
    const ok = await trigger(resolveFieldsForStep(), { shouldFocus: true });
    if (ok) setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const pageTag = steps[stepIndex]?.id?.toUpperCase();

  return (
    <FormProvider {...methods}>
      <div className="ev-page">
        {/* ...existing code... */}
        <form className="ev-form" onSubmit={handleSubmit(onSubmit, (e) => console.warn('Errores de validación:', e))} noValidate>
          {stepIndex === 0 && <StepP1 />}
          {stepIndex === 1 && <StepP2 />}
          {stepIndex === 2 && <StepP3 />}
          {stepIndex === 3 && <StepP4 />}
          {stepIndex === 4 && <StepP5 />}   {/* Page 5 */}
          {stepIndex === 5 && <StepP6 />}   {/* Page 6 */}

          <div className="ev-actions">
            <button type="button" className="ev-btnGhost" onClick={back} disabled={stepIndex === 0}>
              Atrás
            </button>
            {stepIndex < steps.length - 1 && (
              <button type="button" className="ev-btnPrimary" onClick={next}>
                Guardar y continuar
              </button>
            )}
            {stepIndex === steps.length - 1 && (
              <button type="submit" className="ev-btnPrimary">
                Generar PDF
              </button>
            )}
          </div>

          {/* NEW: final label shown at the end of the form */}
          <div className="ev-finalNote" aria-hidden="true" style={{ marginTop: 12, textAlign: 'center', fontStyle: 'italic', color: '#6B7280' }}>
            *Documento electrónico con validez oficial
          </div>
        </form>
      </div>
    </FormProvider>
  );
}

function FieldError({ name }) {
  const {
    formState: { errors },
  } = useFormContext();
  const err = name.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), errors);
  if (!err) return null;
  return <div className="ev-error">{err.message}</div>;
}

// New: shared textarea component used across pages
function Textarea({ name, placeholder, rows = 5 }) {
  const { register } = useFormContext();
  return (
    <textarea
      className="ev-input ev-textarea"
      rows={rows}
      placeholder={placeholder}
      {...register(name)}
    />
  );
}

// Render Page-5 drop labels with <br> between them (only used in StepP5)
function renderP5DropLabels(block) {
  const labels = Object.keys(block)
    .filter((k) => k.startsWith('dropLabel'))
    .sort((a, b) => {
      const na = parseInt(a.replace('dropLabel', '') || '1', 10);
      const nb = parseInt(b.replace('dropLabel', '') || '1', 10);
      return na - nb;
    })
    .map((k) => block[k])
    .filter(Boolean);

  if (!labels.length) return 'Evidencia (solo imágenes)';

  return (
    <>
      {labels.map((t, i) => (
        <React.Fragment key={i}>
          {t}
          {i < labels.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

// ---------- Página 1 ----------
function StepP1() {
  const { register } = useFormContext();
  return (
    <>
      <section className="ev-field">
        <label className="ev-label">EXPEDIENTE <span className="ev-req">*</span></label>
        <div className="ev-inputWrap">
          <input className="ev-input" {...register('expediente')} placeholder="MT-IC-" />
        </div>
        <div className="ev-help">MT-IC-______</div>
        <FieldError name="expediente" />
      </section>

      <section className="ev-grid2">
        <div className="ev-field">
          <label className="ev-label">Fecha <span className="ev-req">*</span></label>
          <div className="ev-inputWrap">
            <input className="ev-input" type="date" {...register('fecha')} />
          </div>
          <div className="ev-help">DD-MM-AAAA</div>
          <FieldError name="fecha" />
        </div>

        <div className="ev-field">
          <label className="ev-label">Hora de inicio <span className="ev-req">*</span></label>
          <div className="ev-timeRow">
            <input className="ev-input ev-time" placeholder="HH" {...register('horaInicio.hh')} />
            <span>:</span>
            <input className="ev-input ev-time" placeholder="MM" {...register('horaInicio.mm')} />
            <select className="ev-select ev-time" {...register('horaInicio.ampm')}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div className="ev-help">Hora Minutos</div>
          <FieldError name="horaInicio.hh" />
          <FieldError name="horaInicio.mm" />
        </div>
      </section>

      <hr className="divisor" />

      <h3 className="ev-secTitle">INFORMACIÓN DEL CLIENTE</h3>

      <section className="ev-field">
        <label className="ev-label">NOMBRE DEL PROPIETARIO <span className="ev-req">*</span></label>
        <div className="ev-grid2">
          <div className="ev-field">
            <div className="ev-inputWrap">
              <input className="ev-input" {...register('propietario.nombres')} placeholder="Nombre(s)" />
            </div>
            <div className="ev-help">Nombre(s)</div>
            <FieldError name="propietario.nombres" />
          </div>
          <div className="ev-field">
            <div className="ev-inputWrap">
              <input className="ev-input" {...register('propietario.apellidos')} placeholder="Apellido(s)" />
            </div>
            <div className="ev-help">Apellido(s)</div>
            <FieldError name="propietario.apellidos" />
          </div>
        </div>
      </section>

      <section className="ev-field">
        <label className="ev-label">DOMICILIO <span className="ev-req">*</span></label>
        <div className="ev-inputWrap">
          <input className="ev-input" {...register('domicilio.calle')} placeholder="Calle" />
        </div>
        <FieldError name="domicilio.calle" />
      </section>

      <section className="ev-field">
        <div className="ev-inputWrap">
          <input className="ev-input" {...register('domicilio.colonia')} placeholder="Colonia" />
        </div>
        <FieldError name="domicilio.colonia" />
      </section>

      <section className="ev-grid2">
        <div className="ev-field">
          <div className="ev-inputWrap">
            <input className="ev-input" {...register('domicilio.municipio')} placeholder="Delegación Municipio" />
          </div>
          <FieldError name="domicilio.municipio" />
        </div>
        <div className="ev-field">
          <div className="ev-inputWrap">
            <input className="ev-input" {...register('domicilio.estado')} placeholder="Estado" />
          </div>
          <FieldError name="domicilio.estado" />
        </div>
      </section>

      <section className="ev-field">
        <div className="ev-inputWrap">
          <input className="ev-input" {...register('domicilio.cp')} placeholder="Código Postal" />
        </div>
        <FieldError name="domicilio.cp" />
      </section>

      <section className="ev-grid2">
        <div className="ev-field">
          <div className="ev-inputWrap">
            <input className="ev-input" {...register('giro')} placeholder="Giro" />
          </div>
          <FieldError name="giro" />
        </div>
        <div className="ev-field">
          <div className="ev-inputWrap">
            <input className="ev-input" {...register('rfc')} placeholder="R.F.C." />
          </div>
          <FieldError name="rfc" />
        </div>
      </section>

      <section className="ev-field">
        <label className="ev-label">Tipo de inspección <span className="ev-req">*</span></label>
        <select className="ev-select" {...register('tipoInspeccion')}>
          <option value="">Please Select</option>
          <option value="Inicial">Inicial</option>
          <option value="Seguimiento">Seguimiento</option>
          <option value="Extraordinaria">Extraordinaria</option>
        </select>
        <FieldError name="tipoInspeccion" />
      </section>
    </>
  );
}

// ---------- Página 2 ----------
function StepP2() {
  return (
    <>
      {p2Blocks.map((b, idx) => (
        <section key={idx}>
          <h3 className="ev-secTitle">{b.title}</h3>

          <div className="ev-field">
            <label className="ev-label">Requisitos a evaluar <span className="ev-req">*</span></label>
            <ReqTable index={idx} description={b.desc} />
            <FieldError name={`canales.${idx}.status`} />
          </div>

          <div className="ev-field">
            <label className="ev-label">Observación</label>
            <div className="ev-inputWrap">
              <Textarea name={`canales.${idx}.observacion`} placeholder="Escribe la observación..." />
            </div>
          </div>

          <div className="ev-field">
            <label className="ev-label">Evidencia de los canales de atención de quejas y solicitudes</label>
            <DropzoneField name={`canales.${idx}.evidencias`} />
          </div>

          {idx < p2Blocks.length - 1 && <hr className="divisor" />}
        </section>
      ))}
    </>
  );
}

function ReqTable({ index, description, parent = 'canales', exact = false }) {
  const { register } = useFormContext();
  const name = exact ? parent : (parent.includes('.') ? parent : `${parent}.${index}`);
  return (
    <table className="ev-table">
      <thead>
        <tr>
          <th className="ev-reqDesc"> </th>
          <th className="ev-col-narrow ev-center">CUMPLE</th>
          <th className="ev-col-narrow ev-center">NO CUMPLE</th>
          <th className="ev-col-narrow ev-center">NO APLICA</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="ev-reqDesc">{description}</td>
          <td className="ev-center">
            <input className="ev-check" type="radio" value="CUMPLE" {...register(`${name}.status`)} />
          </td>
          <td className="ev-center">
            <input className="ev-check" type="radio" value="NO_CUMPLE" {...register(`${name}.status`)} />
          </td>
          <td className="ev-center">
            <input className="ev-check" type="radio" value="NO_APLICA" {...register(`${name}.status`)} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function DropzoneField({ name }) {
  const { setValue, watch } = useFormContext();
  const files = watch(name) || [];
  const [drag, setDrag] = React.useState(false);
  const [err, setErr] = React.useState('');

  const isImageFile = (f) => {
    if (!f) return false;
    if (f.type && f.type.startsWith('image/')) return true;
    const ext = (f.name || '').toLowerCase().slice((f.name || '').lastIndexOf('.'));
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
  };

  const onFiles = (fileList) => {
    const list = Array.from(fileList || []);
    const valid = list.filter(isImageFile);
    const rejected = list.length - valid.length;

    const current = Array.isArray(files) ? files : [];
    setValue(name, [...current, ...valid], { shouldDirty: true });
    setErr(rejected > 0 ? `Se rechazaron ${rejected} archivo(s) no imagen.` : '');
  };

  const onChange = (e) => onFiles(e.target.files);
  const onDragOver = (e) => {
    e.preventDefault();
    setDrag(true);
  };
  const onDragLeave = () => setDrag(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    onFiles(e.dataTransfer.files);
  };

  const removeAt = (i) => {
    const next = [...files];
    next.splice(i, 1);
    setValue(name, next, { shouldDirty: true });
  };

  // Show names even if restored from draft metadata
  const toLabel = (f) => (f && typeof f === 'object' && 'name' in f ? f.name : String(f));

  return (
    <>
      <div
        className={`ev-drop--modern ${drag ? 'is-drag' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
      >
        <div className="ev-dropContent">
          <div className="ev-dropIcon">☁️⬆️</div>
          <div className="ev-dropTitle">Browse Files</div>
          <div className="ev-dropSubtitle">Arrastra y suelta imágenes aquí</div>
          <div className="ev-dropBtn">
            <label className="ev-btnPrimary" style={{ display: 'inline-block' }}>
              Seleccionar
              <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={onChange} />
            </label>
          </div>
          <div className="ev-dropHint">Solo imágenes: PNG, JPG, JPEG, GIF, WEBP, SVG</div>
        </div>
      </div>

      {err && <div className="ev-error" style={{ marginTop: 6 }}>{err}</div>}

      {Array.isArray(files) && files.length > 0 && (
        <ul className="ev-previews" style={{ marginTop: 8 }}>
          {files.map((f, i) => (
            <li key={`${toLabel(f)}-${i}`} className="ev-thumb">
              <span className="ev-thumbName">{toLabel(f)}</span>
              <button type="button" className="ev-thumbRemove" onClick={() => removeAt(i)}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}


function StepP3() {
  const { register, watch } = useFormContext();
  const hasPortal = watch('portal.hasPortal');

  return (
    <>
      <h3 className="ev-secTitle">Información en portal en internet</h3>

      <section className="ev-field">
        <label className="ev-label">
          ¿Cuenta con portal de internet? <span className="ev-req">*</span>
        </label>
        <div className="ev-timeRow" role="radiogroup" aria-label="Cuenta con portal de internet">
          <label><input type="radio" value="SI" {...register('portal.hasPortal')} /> SI</label>
          <label><input type="radio" value="NO" {...register('portal.hasPortal')} /> NO</label>
        </div>
        <FieldError name="portal.hasPortal" />
      </section>

      {hasPortal === 'SI' && (
        <>
          <div className="ev-field">
            <label className="ev-label">
              Requisitos a evaluar <span className="ev-req">*</span>
            </label>
            <ReqTable index={0} description={portalP3Desc} parent="portal.evaluacion" exact />
            <FieldError name="portal.evaluacion.status" />
          </div>

          <div className="ev-field">
            <label className="ev-label">Observación</label>
            <div className="ev-inputWrap">
              <Textarea
                name="portal.evaluacion.observacion"
                placeholder="Escribe la observación..."
              />
            </div>
          </div>

          <div className="ev-field">
            <label className="ev-label">Evidencia de los canales de atención de quejas y solicitudes</label>
            <DropzoneField name="portal.evaluacion.evidencias" />
          </div>

          <hr className="divisor" />

          {p3Blocks.map((b, idx) => (
            <section key={idx}>
              <div className="ev-field">
                <label className="ev-label">
                  Requisitos a evaluar <span className="ev-req">*</span>
                </label>
                <ReqTable index={idx} description={b.desc} parent="otros" />
                <FieldError name={`otros.${idx}.status`} />
              </div>

              <div className="ev-field">
                <label className="ev-label">Observación</label>
                <div className="ev-inputWrap">
                  <Textarea
                    name={`otros.${idx}.observacion`}
                    placeholder="Escribe la observación..."
                  />
                </div>
              </div>

              <div className="ev-field">
                <label className="ev-label">
                  {b.dropLabel || 'Evidencia de los canales de atención de quejas y solicitudes'}
                </label>
                <DropzoneField name={`otros.${idx}.evidencias`} />
              </div>

              {idx < p3Blocks.length - 1 && <hr className="divisor" />}
            </section>
          ))}
        </>
      )}
    </>
  );
}

function StepP4() {
  const { register, watch } = useFormContext();
  const hasOffice = watch('oficina.hasOffice');

  return (
    <>
      <h3 className="ev-secTitle">Información en oficina de atención física</h3>

      <section className="ev-field">
        <label className="ev-label">
          ¿Cuenta con oficina de atención física? <span className="ev-req">*</span>
        </label>
        <div className="ev-timeRow" role="radiogroup" aria-label="Cuenta con oficina de atención física">
          <label><input type="radio" value="SI" {...register('oficina.hasOffice')} /> SI</label>
          <label><input type="radio" value="NO" {...register('oficina.hasOffice')} /> NO</label>
        </div>
        <FieldError name="oficina.hasOffice" />
      </section>

      {hasOffice === 'SI' && (
        <>
          <div className="ev-field">
            <label className="ev-label">
              Requisitos a evaluar <span className="ev-req">*</span>
            </label>
            <ReqTable
              index={0}
              description="La información prevista en este numeral debe estar a la vista o indicarse que la misma está disponible y ser de fácil acceso para el consumidor."
              parent="oficina.general"
              exact
            />
            <FieldError name="oficina.general.status" />
          </div>

          <div className="ev-field">
            <label className="ev-label">Observación</label>
            <div className="ev-inputWrap">
              <Textarea name="oficina.general.observacion" placeholder="Escribe la observación..." />
            </div>
          </div>

          <div className="ev-field">
            <label className="ev-label">Evidencia de la información en oficina de atención física</label>
            <DropzoneField name="oficina.general.evidencias" />
          </div>

          <hr className="divisor" />

          {p4Blocks.map((b, idx) => (
            <section key={idx}>
              <div className="ev-field">
                <label className="ev-label">Requisitos a evaluar <span className="ev-req">*</span></label>
                <ReqTable index={idx} description={b.desc} parent="p4" />
                <FieldError name={`p4.${idx}.status`} />
              </div>

              <div className="ev-field">
                <label className="ev-label">Observación</label>
                <div className="ev-inputWrap">
                  <Textarea name={`p4.${idx}.observacion`} placeholder="Escribe la observación..." />
                </div>
              </div>

              <div className="ev-field">
                <label className="ev-label">Evidencia de la información en oficina de atención física</label>
                <DropzoneField name={`p4.${idx}.evidencias`} />
              </div>

              {idx < p4Blocks.length - 1 && <hr className="divisor" />}
            </section>
          ))}
        </>
      )}
    </>
  );
}

function StepP5() {
  return (
    <>
      <h3 className="ev-secTitle">Anticipo</h3>

      {p5Blocks.map((b, idx) => (
        <section key={idx}>
          <div className="ev-field">
            <label className="ev-label">Requisitos a evaluar <span className="ev-req">*</span></label>
            <ReqTable index={idx} description={b.desc} parent="p5" />
            <FieldError name={`p5.${idx}.status`} />
          </div>

          <div className="ev-field">
            {/* Multi-line guidance shown BEFORE Observación (with <br/> between lines) */}
            {(b.dropLabel || b.dropLabel2 || b.dropLabel3 || b.dropLabel4 || b.dropLabel5 || b.dropLabel6) && (
              <label className="ev-label">{renderP5DropLabels(b)}</label>
            )}
            <label className="ev-label">Observación</label>
            <div className="ev-inputWrap">
              <Textarea name={`p5.${idx}.observacion`} placeholder="Escribe la observación..." />
            </div>
          </div>

          <div className="ev-field">
            <label className="ev-label">Evidencia de los anticipos</label>
            <DropzoneField name={`p5.${idx}.evidencias`} />
          </div>

          {idx < p5Blocks.length - 1 && <hr className="divisor" />}
        </section>
      ))}
    </>
  );
}

function StepP6() {
  const { register } = useFormContext();
  return (
    <>
      <section className="ev-field">
        <label className="ev-label">Hora de termino <span className="ev-req">*</span></label>
        <div className="ev-timeRow">
          <input className="ev-input ev-time" placeholder="HH" {...register('horaTermino.hh')} />
          <span>:</span>
          <input className="ev-input ev-time" placeholder="MM" {...register('horaTermino.mm')} />
          <select className="ev-select ev-time" {...register('horaTermino.ampm')}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
        <div className="ev-help">Hora Minutos</div>
        <FieldError name="horaTermino.hh" />
        <FieldError name="horaTermino.mm" />
      </section>
    </>
  );
}