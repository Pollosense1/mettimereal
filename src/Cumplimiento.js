import React, { useRef, useState } from 'react';
import './Cumplimiento.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Single reusable SignatureCanvas
function SignatureCanvas({ width = 400, height = 140, strokeStyle = '#222', lineWidth = 2, sigId }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setDrawing(true);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        data-signature="true"
        data-signature-id={sigId || undefined}
        style={{
          border: '2px solid #222',
          borderRadius: '8px',
          background: '#fff',
          display: 'block',
          margin: '0 auto'
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      <button
        type="button"
        onClick={clearCanvas}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          padding: '4px 12px',
          fontSize: '12px',
          border: '1px solid #222',
          background: '#fff',
          color: '#222',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Limpiar
      </button>
    </div>
  );
}

export default function Cumplimiento() {
  const smallInputStyle = { width: '220px', padding: '4px 8px', fontSize: '12px', height: '28px', marginLeft: 0 };
  const rowStyle = { display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '0px', marginBottom: '10px' };
  const mainRef = useRef(null);
  const layoutRef = useRef(null); // NEW

  const generatePDF = async () => {
    const layout = layoutRef.current;
    const main = mainRef.current;
    if (!layout || !main) return;

    const makeClone = (mode) => {
      const cloneLayout = layout.cloneNode(true);
      const cloneMain = cloneLayout.querySelector('.cumplimiento-content');
      const hrClone = cloneMain?.querySelector('hr.Division_pagina');

      if (hrClone && cloneMain) {
        if (mode === 'before') {
          // Keep everything before HR; remove HR and everything after it inside MAIN ONLY
          let n = hrClone.nextSibling;
          while (n) {
            const next = n.nextSibling;
            n.parentNode.removeChild(n);
            n = next;
          }
          hrClone.parentNode.removeChild(hrClone);

          // Stretch the first page to the bottom: flex container + push last block down
          try {
            cloneMain.style.display = 'flex';
            cloneMain.style.flexDirection = 'column';
            cloneMain.style.minHeight = '100%';
            const last = cloneMain.lastElementChild;
            if (last) last.style.marginTop = 'auto';
          } catch (_) {
            // no-op
          }
        } else {
          // Keep content after HR
          const parent = hrClone.parentNode;
          while (parent.firstChild && parent.firstChild !== hrClone) {
            parent.removeChild(parent.firstChild);
          }
          parent.removeChild(hrClone);

          // Flex layout for page 2
          try {
            cloneMain.style.display = 'flex';
            cloneMain.style.flexDirection = 'column';
            cloneMain.style.minHeight = '100%';
            cloneMain.style.height = '100%';
            cloneMain.style.overflow = 'hidden';

            // Remove all <br> that can push content unnecessarily
            cloneMain.querySelectorAll('br').forEach((br) => br.remove());

            // Remove final HR so the bottom note is the last element
            const finHr = cloneMain.querySelector('hr.Final_pagina');
            if (finHr) finHr.remove();

            // Push the bottom note wrapper to the bottom of page 2
            const bottomNote = cloneMain.querySelector('#pdf-bottom-note');
            const bottomWrapper = bottomNote ? bottomNote.parentElement : null;
            if (bottomWrapper) {
              // Ensure it's the last flex child and acts as the pusher
              cloneMain.appendChild(bottomWrapper);
              bottomWrapper.style.marginTop = 'auto';
              bottomWrapper.style.width = '100%';
            }
          } catch (_) {}
        }
      } else if (mode === 'after' && cloneMain) {
        cloneMain.innerHTML = '';
      }

      // Replace form controls inside MAIN with plain text spans
      try {
        const origInputs = main.querySelectorAll('input, textarea, select');
        const cloneInputs = cloneMain?.querySelectorAll('input, textarea, select') || [];
        cloneInputs.forEach((el, i) => {
          const orig = origInputs[i];
          const origById = el.id ? main.querySelector(`#${el.id}`) : null;

          if (!orig && !origById) return;
          const cs = window.getComputedStyle(origById || orig);
          const span = document.createElement('span');

          // text content
          let text = '';
          if (el.tagName === 'SELECT') {
            const sel = el;
            text = sel.options[sel.selectedIndex]?.text || sel.value || '';
          } else if (el.tagName === 'TEXTAREA') {
            text = el.value || el.placeholder || '';
          } else {
            text = el.value || el.placeholder || '';
          }

          span.textContent = text;
          span.style.display = 'block';
          span.style.whiteSpace = 'pre-wrap';
          span.style.fontSize = cs.fontSize;
          span.style.fontFamily = cs.fontFamily;
          span.style.fontWeight = cs.fontWeight;
          span.style.lineHeight = cs.lineHeight;
          span.style.color = cs.color;

          // mark for sizing later (after clone is attached for accurate measurements)
          span.setAttribute('data-pdf-input', 'true');
          if (el.id) span.setAttribute('data-input-id', el.id);

          const isCompany = el.id === 'prestador' || el.id === 'direccion';
          const labelEl = el.id ? cloneMain.querySelector(`label[for="${el.id}"]`) : null;
          const hasLabel = !!labelEl;

          // Make only inputs next to labels render larger in the PDF (match label size)
          if (hasLabel && !isCompany) {
            const lcs = labelEl ? window.getComputedStyle(labelEl) : null;
            const labelFont = lcs?.fontSize || '26px';
            const labelWeight = lcs?.fontWeight || '600';
            span.style.fontSize = labelFont;
            span.style.fontWeight = labelWeight;
            span.style.lineHeight = '1.2';
            span.style.minHeight = '36px';
          }

          if (isCompany) {
            // Center these two fields in the PDF
            const w = origById
              ? Math.round(origById.getBoundingClientRect().width) + 'px'
              : (cs.width || '80%');
            span.style.width = w;
            span.style.maxWidth = w;
            span.style.marginLeft = 'auto';
            span.style.marginRight = 'auto';
            span.style.textAlign = 'center';
            span.style.minHeight = cs.height || '28px';
          } else {
            // temporary width; will be overridden in renderCloneToCanvas with a larger uniform width
            span.style.width = '320px';
            span.style.maxWidth = '100%';
          }

          span.style.boxSizing = 'border-box';
          span.style.padding = '4px 0';

          el.parentNode.replaceChild(span, el);
        });
      } catch (_) {
        // no-op
      }

      // Remove all buttons from the clone (e.g., "Limpiar", "Generar PDF")
      try {
        const buttons = cloneLayout.querySelectorAll('button');
        buttons.forEach((btn) => {
          const parent = btn.parentElement;
          btn.remove();
          if (parent && parent.children.length === 0) {
            parent.remove();
          }
        });
      } catch (_) {
        // no-op
      }

      return cloneLayout;
    };

    const renderCloneToCanvas = async (clone) => {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.background = '#ffffff';

      // Match the on-screen width of the layout
      const pageWidthPx = layout.clientWidth || layout.offsetWidth;
      container.style.width = pageWidthPx + 'px';

      // Exact A4 height in px based on width (portrait)
      const a4Ratio = Math.SQRT2; // ~1.4142
      const pageHeightPx = Math.round(pageWidthPx * a4Ratio);
      container.style.height = pageHeightPx + 'px';
      container.style.overflow = 'hidden';

      // Force the clone to be a single full page with a stretching sidebar
      const sidebar = clone.querySelector('.cumplimiento-sidebar');
      const cloneMain = clone.querySelector('.cumplimiento-content');

      // Compute a slightly larger sidebar width for PDF
      const baseSidebarWidth = (sidebar && sidebar.offsetWidth) ? sidebar.offsetWidth : 120;
      const pdfSidebarWidthPx = Math.max(150, Math.round(baseSidebarWidth * 2)); // ~20% wider, min 150px

      clone.style.height = pageHeightPx + 'px';
      clone.style.minHeight = pageHeightPx + 'px';
      clone.style.boxSizing = 'border-box';
      clone.style.display = 'grid';
      clone.style.gridTemplateColumns = `${pdfSidebarWidthPx}px 1fr`; // wider sidebar in PDF
      clone.style.gridTemplateRows = '1fr';
      clone.style.alignItems = 'stretch';

      if (sidebar) {
        sidebar.style.width = `${pdfSidebarWidthPx}px`;
        sidebar.style.height = '100%';
        sidebar.style.alignSelf = 'stretch';
      }
      if (cloneMain) {
        cloneMain.style.height = '100%';
        cloneMain.style.minHeight = '100%';
        cloneMain.style.alignSelf = 'stretch';
        cloneMain.style.overflow = 'hidden';
        if (!cloneMain.style.display) {
          cloneMain.style.display = 'flex';
          cloneMain.style.flexDirection = 'column';
        }
      }

      container.appendChild(clone);
      document.body.appendChild(container);

      // Let layout settle
      await new Promise((res) => setTimeout(res, 50));

      // Copy live canvas bitmaps (e.g., signature) into the clone so html2canvas captures them
      try {
        const originalRoot = layoutRef.current || document;
        const copyCanvas = (src, dst) => {
          if (!src || !dst) return;
          dst.width = src.width;
          dst.height = src.height;
          const dctx = dst.getContext('2d');
          dctx.clearRect(0, 0, dst.width, dst.height);
          dctx.drawImage(src, 0, 0);
        };

        // Build a source map by signature-id
        const srcSigAll = Array.from(originalRoot.querySelectorAll('canvas[data-signature="true"]'));
        const srcSigMap = srcSigAll.reduce((acc, c) => {
          const id = c.getAttribute('data-signature-id') || '';
          if (id) acc[id] = c;
          return acc;
        }, {});

        // Copy only matching signatures by id (prevents repetition/misalignment)
        const dstSigAll = Array.from(clone.querySelectorAll('canvas[data-signature="true"]'));
        dstSigAll.forEach((dst, i) => {
          const id = dst.getAttribute('data-signature-id') || '';
          const src = (id && srcSigMap[id]) ? srcSigMap[id] : srcSigAll[i]; // fallback to index if no id
          copyCanvas(src, dst);
        });

        // Optionally copy other canvases (exclude signatures already handled)
        const srcAll = Array.from(originalRoot.querySelectorAll('canvas'));
        const dstAll = Array.from(clone.querySelectorAll('canvas'));
        dstAll.forEach((dst) => {
          if (dst.matches('[data-signature="true"]')) return;
          const idx = dstAll.indexOf(dst);
          copyCanvas(srcAll[idx], dst);
        });
      } catch (_) {
        // no-op
      }

      // Enlarge sidebar text only for the PDF clone
      try {
        const sidebar = clone.querySelector('.cumplimiento-sidebar');
        if (sidebar) {
          const bump = (el, factor, minPx, lh = '1.2') => {
            const cs = window.getComputedStyle(el);
            const base = parseFloat(cs.fontSize) || 0;
            if (!base) return;
            const px = Math.max(minPx, Math.round(base * factor));
            el.style.fontSize = px + 'px';
            el.style.lineHeight = lh;
          };

          // Main rotated labels
          sidebar.querySelectorAll('.rotate-left').forEach((el) => bump(el, 1.3, 24));

          // Any other sidebar text containers
          sidebar.querySelectorAll('.cumplimiento-row span, .cumplimiento-row p, .cumplimiento-row div')
            .forEach((el) => bump(el, 1.2, 18));
        }
      } catch (_) {
        // no-op
      }

      // Enlarge all labeled "textboxes" uniformly based on available row space
      try {
        const cloneMain = clone.querySelector('.cumplimiento-content');
        const spans = Array.from(cloneMain?.querySelectorAll('span[data-pdf-input="true"]') || []);

        // Compute the maximum consistent width that fits all labeled rows
        let minAvailable = Infinity;
        const labeledSpans = spans.filter((sp) => {
          const id = sp.getAttribute('data-input-id');
          return id && cloneMain.querySelector(`label[for="${id}"]`) && id !== 'prestador' && id !== 'direccion';
        });

        const findFlexRow = (el) => {
          let n = el.parentElement;
          while (n && window.getComputedStyle(n).display !== 'flex') n = n.parentElement;
          return n;
        };

        labeledSpans.forEach((sp) => {
          const id = sp.getAttribute('data-input-id');
          const label = cloneMain.querySelector(`label[for="${id}"]`);
          const row = findFlexRow(label) || label.parentElement;
          if (!row) return;

          const rowW = row.getBoundingClientRect().width;
          const labelW = label.getBoundingClientRect().width;
          // leave a small padding between label and "input"
          const available = Math.max(200, Math.floor(rowW - labelW - 16));
          if (available < minAvailable) minAvailable = available;
        });

        if (Number.isFinite(minAvailable) && minAvailable > 0) {
          labeledSpans.forEach((sp) => {
            sp.style.width = `${minAvailable}px`;
            sp.style.maxWidth = `${minAvailable}px`;
            sp.style.flex = `0 0 ${minAvailable}px`; // prevent flex shrink
            sp.style.whiteSpace = 'pre-wrap'; // allow wrapping
          });
        }
      } catch (_) {
        // no-op
      }

      const canvas = await html2canvas(clone, {
        scale: 1.25,                 // was 2 — lower raster resolution for smaller PDFs
        backgroundColor: '#ffffff',
        useCORS: true,
        width: pageWidthPx,
        height: pageHeightPx,
        windowWidth: pageWidthPx,
        windowHeight: pageHeightPx
      });

      document.body.removeChild(container);
      return canvas;
    };

    const firstClone = makeClone('before');
    const secondClone = makeClone('after');

    const canvases = [];
    if (firstClone && firstClone.innerText.trim()) {
      canvases.push(await renderCloneToCanvas(firstClone));
    }
    if (secondClone && secondClone.innerText.trim()) {
      canvases.push(await renderCloneToCanvas(secondClone));
    }

    // const pdf = new jsPDF('p', 'mm', 'a4');
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true            // enable stream compression
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    canvases.forEach((canvas, idx) => {
      // Use JPEG with quality to reduce size drastically vs PNG
      const imgData = canvas.toDataURL('image/jpeg', 0.68); // 0.5–0.75 is a good range

      if (idx > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    });

    // Build filename: "cumplimiento" + Nombre de la empresa (prestador)
    const rawName = (main.querySelector('#prestador')?.value || '').trim();
    const sanitized = rawName
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/[\\/:*?"<>|]+/g, '')                   // remove illegal chars
      .replace(/\s+/g, ' ')                            // collapse spaces
      .trim()
      .slice(0, 80);                                   // reasonable length
    const filename = `cumplimiento${sanitized ? ' ' + sanitized : ''}.pdf`;

    pdf.save(filename);
  };

  // Validate all textboxes before generating the PDF
  const handleGenerateClick = async () => {
    const main = mainRef.current;
    if (!main) return;

    // Clear previous error highlights
    main.querySelectorAll('.mt-error').forEach((el) => el.classList.remove('mt-error'));

    // Gather relevant inputs (text, date, textarea, select)
    const inputs = Array.from(
      main.querySelectorAll(
        'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, select'
      )
    );

    // Check empties
    const empty = inputs.filter((el) => {
      if (el.disabled || el.readOnly) return false;
      const val = (el.value || '').trim();
      return val.length === 0;
    });

    if (empty.length > 0) {
      empty.forEach((el) => el.classList.add('mt-error'));
      const first = empty[0];
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first.focus) first.focus();
      alert('Por favor, completa todos los campos antes de generar el PDF.');
      return;
    }

    await generatePDF();
  };

  return (
    <div ref={layoutRef} className="cumplimiento-layout">
      <aside className="cumplimiento-sidebar">
        <div className="cumplimiento-row"><span className="rotate-left">Entidad Mexicana de Acreditación <br /> Acreditación No. UIBI-004</span></div>
        <div className="cumplimiento-row"><span className="rotate-left">UNIDAD DE INSPECCIÓN <br /> UIBI-004</span></div>
        <div className="cumplimiento-row"><span className="rotate-left">SECRETARÍA DE ECONOMÍA <br /> Aprobación No. UIBI-004 <br /> Oficio No. DGN.191.06.2025.2273</span></div>
      </aside>

      <main ref={mainRef} className="cumplimiento-content">
        <img src="METTIME LOGO.png" alt="Descripción de la imagen" />
        <h1>D I C T A M E N</h1>
        <h2 style={{ fontWeight: 800 }}>MET-TIME, S.A. DE C.V.</h2>
        <h3>Av. Central, No. Ext. 111, Rústicos Calpulli, C.P. 20296, Aguascalientes, Aguascalientes.</h3>
        <p>Otorga el presente:</p>
        <p style={{ fontSize: 50, fontWeight: 700}}>Dictamen de Cumplimiento</p>
        <p style={{ marginBottom: 30 }}>Al prestador del servicio:</p>
        <input
          type="text"
          id="prestador"
          className="mt-textbox"
          placeholder="Nombre de la empresa"
          aria-label="Nombre de la empresa"
        />
        <input
          type="text"
          id="direccion"
          className="mt-textbox2"
          placeholder="Dirección de la empresa"
          aria-label="Dirección de la empresa"
        />
        <p style={{ fontSize: 30}}>Por el cumplimiento de las prácticas comerciales de bienes inmuebles establecidos en la <br /> Norma Oficial Mexicana</p>
        <p style={{ fontSize: 50, fontWeight: 700}}>NOM-247-SE-2021</p>
        <p>Alcance de la inspección</p>
        <p style={{ fontSize: 30}}>Requisitos de la información comercial y la publicidad de bienes inmuebles destinados a casa habitación y elementos mínimos que deben contener los contratos relacionados.</p>

        {/* Single signature drawing space */}
        <div style={{ marginTop: '40px', marginBottom: '70px', textAlign: 'center' }}>
          <label style={{ fontWeight: 'bold,', marginBottom: '8px', display: 'block' }}>
            Espacio para firma
          </label>
          <SignatureCanvas sigId="firma-gerencia-1" />
          <div style={{ borderBottom: '2px solid #222', width: '50%', margin: '0 auto 8px auto', height: '2px' }}></div>
          <span style={{ fontWeight: 'bold' }}>Austria Nastassja Farías Carrillo <br /> GERENCIA TÉCNICA</span>
        </div>
        
        {/* Additional fields */}
        <div style={{ marginTop: '24px' }}>
          <div style={rowStyle}>
            <label htmlFor="folio" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30 }}>Folio:</label>
            <input type="text" id="folio" className="mt-textbox" placeholder="Ingrese folio" aria-label="Folio" style={smallInputStyle} />
          </div>
          <div style={rowStyle}>
            <label htmlFor="fechaEmision" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30 }}>Fecha de emisión:</label>
            <input type="date" id="fechaEmision" className="mt-textbox" aria-label="Fecha de emisión" style={smallInputStyle} />
          </div>
          <div style={rowStyle}>
            <label htmlFor="lugarEmision" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30 }}>Lugar de emisión:</label>
            <input type="text" id="lugarEmision" className="mt-textbox" placeholder="Ciudad, Estado" aria-label="Lugar de emisión" style={smallInputStyle} />
          </div>
          <div style={rowStyle}>
            <label htmlFor="inspector" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30 }}>Inspector responsable:</label>
            <input type="text" id="inspector" className="mt-textbox" placeholder="Nombre del inspector" aria-label="Inspector responsable" style={smallInputStyle} />
          </div>
          <label htmlFor="inspector" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30, textAlign: 'left' }}>F-IC-PAD-011</label>
        </div>
        <div>
          <p style={{ fontSize: 16, marginTop: 40, fontWeight: 800 }}> El uso indebido del presente dictamen dará como resultado la cancelación del mismo comprometiéndose el titular a acatar los dispuestos en
          el contrato de servicios aprobado por el titular y la unidad de inspección <br /> Para asegurarse de la validez de este dictamen consulta nuestra página web: https://grupomet-time.godaddysites.com/</p>
        </div>
        <hr className='Division_pagina'/>


        <img src="METTIME LOGO.png" alt="Descripción de la imagen" />
        <p style={{ fontSize: 30}}>Para la emisión de este Dictamen participó el siguiente Inspector:</p>

        <div style={{ marginTop: '40px', marginBottom: '70px', textAlign: 'center' }}>
          <label style={{ fontWeight: 'bold,', marginBottom: '8px', display: 'block' }}>
            Espacio para firma
          </label>
          <SignatureCanvas sigId="firma-inspector" />
          <div style={{ borderBottom: '2px solid #222', width: '50%', margin: '0 auto 8px auto', height: '2px' }}></div>
          <span style={{ fontWeight: 'bold' }}>NOMBRE DEL INSPECTOR</span>
        </div>

        <br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br />

        {/* Single signature drawing space */}
        <div style={{ marginTop: '40px', marginBottom: '70px', textAlign: 'center' }}>
          <label style={{ fontWeight: 'bold,', marginBottom: '8px', display: 'block' }}>
            Espacio para firma
          </label>
          <SignatureCanvas sigId="firma-gerencia-2" />
          <div style={{ borderBottom: '2px solid #222', width: '50%', margin: '0 auto 8px auto', height: '2px' }}></div>
          <span style={{ fontWeight: 'bold' }}>Austria Nastassja Farías Carrillo <br /> GERENCIA TÉCNICA</span>
        </div>
        
        {/* Additional fields */}
        <div style={{ marginTop: '24px' }}>
          <div style={rowStyle}>
            <label htmlFor="folio" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30 }}>Folio:</label>
            <input type="text" id="folio" className="mt-textbox" placeholder="Ingrese folio" aria-label="Folio" style={smallInputStyle} />
          </div>
          <div style={rowStyle}>
            <label htmlFor="fechaEmision" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30 }}>Fecha de emisión:</label>
            <input type="date" id="fechaEmision" className="mt-textbox" aria-label="Fecha de emisión" style={smallInputStyle} />
          </div>
          <div style={rowStyle}>
            <label htmlFor="lugarEmision" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30 }}>Lugar de emisión:</label>
            <input type="text" id="lugarEmision" className="mt-textbox" placeholder="Ciudad, Estado" aria-label="Lugar de emisión" style={smallInputStyle} />
          </div>
          <div style={rowStyle}>
            <label htmlFor="inspector" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30 }}>Inspector responsable:</label>
            <input type="text" id="inspector" className="mt-textbox" placeholder="Nombre del inspector" aria-label="Inspector responsable" style={smallInputStyle} />
          </div>
          <label htmlFor="inspector" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 30, textAlign: 'left' }}>F-IC-PAD-011</label>
        </div>
        <div>
          {/* Page 2 bottom note */}
          <div id="pdf-bottom-note">
            <p style={{ fontSize: 16, marginTop: 40, fontWeight: 800 }}> El uso indebido del presente dictamen dará como resultado la cancelación del mismo comprometiéndose el titular a acatar los dispuestos en
            el contrato de servicios aprobado por el titular y la unidad de inspección <br /> Para asegurarse de la validez de este dictamen consulta nuestra página web: https://grupomet-time.godaddysites.com/</p>
          </div>
        </div>

        <hr className='Final_pagina'/>

        {/* Generate PDF button at the end */}
        <div style={{ textAlign: 'right', marginTop: '24px' }}>
          <button type="button" onClick={handleGenerateClick}>
            Generar PDF
          </button>
        </div>
      </main>
    </div>
  );
}