import React, { useRef, useState, useEffect } from 'react';
import './FCumplimiento.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Reusable signature canvas
function SignatureCanvas({ sigId, width = 360, height = 140, lineWidth = 2, strokeStyle = '#111' }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Improve sharpness on HiDPI screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
  }, [width, height, lineWidth, strokeStyle]);

  // Mark whether the canvas has content so the PDF generator can detect it
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.dataset.hasDrawing = hasDrawn ? 'true' : 'false';
    }
  }, [hasDrawn]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const end = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasDrawn(false);
  };

  return (
    <div className="fci-sign-block">
      <canvas
        ref={canvasRef}
        className="fci-sign-canvas"
        data-signature="true"
        data-signature-id={sigId}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={end}
      />
      <button type="button" className="fci-sign-clear" onClick={clear} disabled={!hasDrawn}>
        Limpiar
      </button>
      <div className="fci-sign-line" />
    </div>
  );
}

export default function FCumplimiento() {
  const rowCount = 25;
  const [rowSelections, setRowSelections] = useState(Array(rowCount).fill(null));

  const handleTickChange = (rowIndex, column) => {
    setRowSelections(prev => {
      const next = [...prev];
      next[rowIndex] = next[rowIndex] === column ? null : column;
      return next;
    });
  };

  // New: mini table selection (mutually exclusive checkboxes on bottom row, last two columns)
  const [miniChoice, setMiniChoice] = useState(null);

  // Validation function
  const validateForm = () => {
    const errors = [];

    // Validate date
    const fecha = document.querySelector('input[type="date"]')?.value;
    if (!fecha) {
      errors.push('Fecha');
    }

    // Validate expediente
    const expediente = document.querySelector('input[aria-label="Expediente"]')?.value;
    if (!expediente || expediente === 'MT-IC-') {
      errors.push('Expediente');
    }

    // Validate times
    const horaInicio = document.querySelectorAll('input[type="time"]')[0]?.value;
    const horaFinal = document.querySelectorAll('input[type="time"]')[1]?.value;
    if (!horaInicio) {
      errors.push('Hora de Inicio');
    }
    if (!horaFinal) {
      errors.push('Hora Final');
    }

    // Validate client information
    const inputs = document.querySelectorAll('.fci-section input[type="text"]');
    const clientFields = [
      { index: 0, name: 'Nombre del Propietario' },
      { index: 1, name: 'Domicilio' },
      { index: 2, name: 'C.P.' },
      { index: 3, name: 'Colonia' },
      { index: 4, name: 'Delegación/Municipio' },
      { index: 5, name: 'R.F.C.' },
      { index: 6, name: 'Giro' },
      { index: 7, name: 'Coordenadas UTM' },
      { index: 8, name: 'Inspector' }
    ];

    clientFields.forEach(field => {
      if (!inputs[field.index]?.value?.trim()) {
        errors.push(field.name);
      }
    });

    // Validate table selections (at least one selection per row)
    const emptyRows = rowSelections
      .map((selection, index) => (selection === null ? index + 1 : null))
      .filter(row => row !== null);

    if (emptyRows.length > 0) {
      errors.push(`Requisitos sin evaluar (filas: ${emptyRows.join(', ')})`);
    }

    // Validate signatures
    const signatureCanvases = document.querySelectorAll('canvas[data-signature="true"]');
    const signatureNames = document.querySelectorAll('.fci-sign-wrapper input[type="text"]');
    const signatureLabels = [
      'Firma del Inspector',
      'Firma del Cliente',
      'Firma del Personal Auxiliar',
      'Firma del Supervisor'
    ];

    signatureCanvases.forEach((canvas, index) => {
      const hasDrawing = canvas.dataset.hasDrawing === 'true';
      const hasName = signatureNames[index]?.value?.trim();

      if (!hasDrawing) {
        errors.push(`${signatureLabels[index]} (falta firma)`);
      }
      if (!hasName) {
        errors.push(`${signatureLabels[index]} (falta nombre)`);
      }
    });

    // Validate observations
    const observaciones = document.querySelector('.fci-textarea')?.value?.trim();
    if (!observaciones) {
      errors.push('Observaciones');
    }

    return errors;
  };

  // PDF generation function with validation
  const generatePDF = () => {
    // Validate form
    const validationErrors = validateForm();

    if (validationErrors.length > 0) {
      alert(
        'Por favor complete los siguientes campos requeridos:\n\n' +
        validationErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')
      );
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = margin;

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Add logo and header
    const logoImg = document.querySelector('.fci-logo img');
    if (logoImg) {
      try {
        pdf.addImage(logoImg.src, 'PNG', margin, yPos, 30, 15);
      } catch (e) {
        console.warn('Could not add logo to PDF');
      }
    }

    // Header text
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MET-TIME, S.A. DE C.V.', pageWidth / 2, yPos + 5, { align: 'center' });
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const headerText = 'Unidad de Verificación (organismo de inspección) acreditado';
    pdf.text(headerText, pageWidth / 2, yPos + 10, { align: 'center' });
    pdf.text('ACREDITACIÓN Y APROBACIÓN: UIBI-004', pageWidth / 2, yPos + 14, { align: 'center' });
    
    yPos += 25;

    // Get form data
    const fecha = document.querySelector('input[type="date"]')?.value || '';
    const expediente = document.querySelector('input[aria-label="Expediente"]')?.value || '';
    const horaInicio = document.querySelectorAll('input[type="time"]')[0]?.value || '';
    const horaFinal = document.querySelectorAll('input[type="time"]')[1]?.value || '';

    pdf.setFontSize(10);
    pdf.text(`Fecha: ${fecha}`, pageWidth - margin - 40, yPos);
    pdf.text(`Expediente: ${expediente}`, pageWidth - margin - 40, yPos + 5);
    pdf.text(`Hora Inicio: ${horaInicio}`, pageWidth - margin - 40, yPos + 10);
    pdf.text(`Hora Final: ${horaFinal}`, pageWidth - margin - 40, yPos + 15);
    
    yPos += 20;

    // Title
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DICTAMEN DE INSPECCIÓN', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Client information
    const inputs = document.querySelectorAll('.fci-section input[type="text"]');
    const clientInfo = [
      ['Nombre del Propietario:', inputs[0]?.value || ''],
      ['Domicilio:', inputs[1]?.value || ''],
      ['C.P.:', inputs[2]?.value || ''],
      ['Colonia:', inputs[3]?.value || ''],
      ['Delegación/Municipio:', inputs[4]?.value || ''],
      ['R.F.C.:', inputs[5]?.value || ''],
      ['Giro:', inputs[6]?.value || ''],
      ['Coordenadas UTM:', inputs[7]?.value || ''],
      ['Inspector:', inputs[8]?.value || '']
    ];

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMACIÓN DEL CLIENTE', margin, yPos);
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    clientInfo.forEach(([label, value]) => {
      checkPageBreak(6);
      pdf.text(`${label} ${value}`, margin, yPos);
      yPos += 5;
    });

    yPos += 5;

    // Table data
    const tableData = Array.from({ length: rowCount }, (_, i) => [
      col1Data[i],
      rowSelections[i] === 'cumple' ? 'X' : '',
      rowSelections[i] === 'noCumple' ? 'X' : '',
      rowSelections[i] === 'noAplica' ? 'X' : ''
    ]);

    checkPageBreak(20);
    autoTable(pdf, {
      startY: yPos,
      head: [['REQUISITO A EVALUAR', 'CUMPLE', 'NO CUMPLE', 'NO APLICA']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: margin, right: margin }
    });

    yPos = pdf.lastAutoTable.finalY + 8;

    // >>> NEW: Mini "CONCLUSION" table (reflects the bottom table in the UI)
    checkPageBreak(22);
    autoTable(pdf, {
      startY: yPos,
      head: [['CONCLUSION', 'SATISFACTORIO', 'NO SATISFACTORIO']],
      body: [[
        'La inspección se realizó de acuerdo con los estándares establecidos.',
        miniChoice === 'col2' ? 'X' : '',
        miniChoice === 'col3' ? 'X' : ''
      ]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: pageWidth - 2 * margin - 80 }, // fill remaining width
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' }
      },
      margin: { left: margin, right: margin }
    });
    yPos = pdf.lastAutoTable.finalY + 6;

    // >>> NEW: Disclaimer labels (the long text block with asterisks)
    const disclaimers = [
      '* MET-TIME S.A DE C.V. verifica los requisitos de la información comercial y la publicidad de bienes inmuebles destinados a casa habitación y elementos mínimos que debe contener los contratos relacionados.',
      '* El presente dictamen de inspección avala que las pruebas realizadas a los objetos descritos, se efectuaron de acuerdo a las especificaciones establecidas en la Norma Oficial Mexicana NOM-247-SE-2021, Prácticas Comerciales- requisitos de la información comercial y la publicidad de bienes inmuebles destinados a casa habitación y elementos mínimos que deben contener los contratos relacionados, publicada en el Diario Oficial de la Federación el día 22 de marzo del 2022 y al procedimiento de inspección código MT-IC-PTO-001 de este Organismo de Inspección.',
      '*Toda la información derivada de la presente inspección, es manejada en todo momento de manera confidencial por personal de ésta empresa.',
      '*Queda prohibida la reproducción total o parcial del presente dictamen sin la autorización de este Organismo de Inspección.',
      '*Este organismo de inspección no se hace responsable si los instrumentos verificados en dicho dictamen son alterados.',
      '*La presente solicitud de inspección tiene una vigencia de 25 días naturales a partir de la fecha que fue emitida por la unidad de inspección'
    ];

    checkPageBreak(20);
    autoTable(pdf, {
      startY: yPos,
      theme: 'plain', // no borders
      styles: { fontSize: 8, cellPadding: { top: 1, right: 0, bottom: 1, left: 0 } },
      columnStyles: { 0: { cellWidth: pageWidth - 2 * margin } },
      body: disclaimers.map(line => [line]),
      margin: { left: margin, right: margin }
    });
    yPos = pdf.lastAutoTable.finalY + 10;

    // Signatures
    checkPageBreak(50);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FIRMAS', margin, yPos);
    yPos += 10;

    const signatureCanvases = document.querySelectorAll('canvas[data-signature="true"]');
    const signatureNames = document.querySelectorAll('.fci-sign-wrapper input[type="text"]');
    const signatureCaptions = [
      'NOMBRE Y FIRMA DEL INSPECTOR',
      'FIRMA DE CONFORME DEL CLIENTE',
      'NOMBRE Y FIRMA DEL PERSONAL AUXILIAR',
      'NOMBRE Y FIRMA DEL SUPERVISOR'
    ];

    signatureCanvases.forEach((canvas, index) => {
      if (index % 2 === 0 && index > 0) {
        yPos += 35;
        checkPageBreak(40);
      }

      const xPos = index % 2 === 0 ? margin : pageWidth / 2 + 5;
      const hasDrawing = canvas.dataset.hasDrawing === 'true';

      if (hasDrawing) {
        try {
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', xPos, yPos, 45, 20);
        } catch (e) {
          console.warn('Could not add signature to PDF');
        }
      }

      pdf.setFontSize(7);
      pdf.text(signatureNames[index]?.value || '', xPos, yPos + 25);
      pdf.text(signatureCaptions[index], xPos, yPos + 29);
    });

    yPos += 45;

    // Observations
    checkPageBreak(30);
    const observaciones = document.querySelector('.fci-textarea')?.value || '';
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OBSERVACIONES:', margin, yPos);
    yPos += 6;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const lines = pdf.splitTextToSize(observaciones, pageWidth - 2 * margin);
    pdf.text(lines, margin, yPos);

    // Advance cursor below observations to avoid overlap
    yPos += (Array.isArray(lines) ? lines.length : 1) * 4 + 6;

    // Add final label shown in the UI
    checkPageBreak(12);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.text('*Documento electrónico con validez oficial', pageWidth / 2, yPos, { align: 'center' });

    // Save PDF
    const ownerNameRaw = (inputs[0]?.value || '').trim();
    const ownerNameClean = ownerNameRaw
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_');
    const filename = `FCumplimiento_${ownerNameClean || 'SinNombre'}.pdf`;
    pdf.save(filename);

    // Show success message
    alert('PDF generado exitosamente!');
  };

  // Column 1 texts (25 items)
  const col1Data = [
    "Canales de atención de quejas y solicitudes.", "Información en Portal en Internet", "Información en oficina de atención física", "Anticipo", "Enganches",
    "Preventas", "No discriminación", "Carta de derechos", "Información y publicidad/idioma", "Información y publicidad/requisitos generales",
    "Información y publicidad/avales", "Información y publicidad/precio", "Información y publicidad/ofertas y promociones", "Información y publicidad/Requisitos de proyecto Ejecutivo, maqueta", "Información y publicidad/Informaión del inmueble",
    "Información y publicidad/Protección civil", "Información y publicidad/Acabados", "Información y publicidad/Promotores", "Contrato de adhesión", "Garantías",
    "Servicios adicionales", "Escrituración y notarios", "Bonificación", "Viviendas de interés social", "Privacidad"
  ];

  // Column 2 texts (25 items)
  const col2Data = [
    "El proveedor demostrará que cuenta con canales y mecanismos de atención al consumidor, gratuitos y accesibles a través de cualquiera de los siguientes medios:Teléfonos, correo electrónico, formularios en sitios web o cualquier medio de contacto digital, debiendo manifestar que los mismos están habilitados por lo menos en días y horas hábiles. El proveedor enseñará su formato o medio, en forma digital o física para recibir quejas, solicitudes o sugerencias por parte de los consumidores, en cualquiera de los puntos de venta o atención a clientes, domicilio de la casa matriz del proveedor o de sus sucursales. El proveedor manifestará el medio digital o físico por el cual señaló un domicilio para oír y recibir notificaciones de los consumidores.", 
  "En caso de que se cuente con portal de Internet por parte del proveedor, se revisa que el mismo cuenta con la siguiente información: I.Precios totales en operaciones de contado y las características de los diferentes tipos de inmueble que comercializa a través de un vínculo; II.Leyenda que indique que en las operaciones de crédito el precio total se determinará en función de los montos variables de conceptos de crédito y gastos notariales que deben ser consultados con los promotores, conforme al apartado 5.6.7 de la NOM-247-SE-2024; III.Dirección física y electrónica en la que se podrá presentar una queja o reclamación, y horarios de atención; IV.Modelo de contrato de adhesión registrado ante la PROFECO; V.Formas y planes de pago de los inmuebles;  VI.En caso de que el inmueble esté financiado por el proveedor, éste debe informar sobre el porcentaje de la tasa de interés, el costo anual total, el monto de las comisiones, así como los seguros adheridos al financiamiento y sus coberturas que existieren; y VII.El Aviso de Privacidad", 
  "En caso de que el proveedor no cuente con un portal electrónico, pero cuente con una oficina de atención física, la información prevista en este numeral debe estar a la vista o indicarse que la misma está disponible y ser de fácil acceso para el consumidor. I. Precios totales en operaciones de contado y las características de los diferentes tipos de inmueble que comercializa a través de un vínculo; II. Leyenda que indique que en las operaciones de crédito el precio total se determinará en función a de los montos variables de conceptos de crédito y notariales que deben ser consultados con los promotores, conforme al apartado 5.6.7 de la NOM-247-SE-2024; III. Dirección física y electrónica en la que se podrá presentar una queja o reclamación, y horarios de atención; IV. Modelo de contrato de adhesión registrado ante la PROFECO; V. Formas y planes de pago de los inmuebles, y VI. En caso de que el inmueble esté financiado por el proveedor, éste debe informar sobre el porcentaje de la tasa de interés, el costo anual total, el monto de las comisiones, así como los seguros adheridos al financiamiento y sus coberturas que existieren.", 
  "El proveedor debe demostrar a la Unidad de Inspección que ha otorgado comprobante, en formato libre digital o impreso, por los anticipos recibidos. Asimismo, debe demostrar evidencia documental donde se haga constar que informó al consumidor de las condiciones a las que está sujeto dicho anticipo, así como las políticas para su aplicación, devolución o reembolso conforme a lo previsto por la NOM-247-SE-2024 en su inciso 4.4. En el caso que el proyecto ejecutivo del inmueble por el cual se realizó el anticipo necesite modificarse durante la obra, el proveedor debe demostrar mediante la copia de la comunicación física o electrónica que contenga la fecha de dicha notificación, que avisó al consumidor sobre las modificaciones realizadas, de acuerdo a lo establecido en el cuarto párrafo de 4.4. Asimismo, se demuestra si el consumidor decidió, continuar con la compra del inmueble con copia de la comunicación escrita de su aceptación, virtual o impresa, según sea el caso. En el caso que el consumidor haya decidido no continuar con la compra del inmueble, el proveedor debe demostrar a la Unidad de Inspección que el trámite de la devolución del anticipo es realizado conforme a lo dispuesto en el segundo párrafo de 4.4 de la NOM- 247-SE-2021", 
  "La UI debe verificar el cumplimiento de las obligaciones establecidas en el apartado 4.5. de la NOM relacionadas con enganches, su aplicación en caso de compraventas en abonos y de rescisión del contrato.  En el caso que el proyecto ejecutivo del inmueble por el cual se realizó el enganche necesite modificarse durante la obra, el Proveedor debe demostrar mediante la copia de la comunicación física o electrónica realizada que avisó al consumidor sobre las modificaciones realizadas. Asimismo, se demuestra si el consumidor decidió, continuar con la compra del inmueble con copia de la comunicación escrita de su aceptación, virtual o impresa, según sea el caso.",
  "El proveedor debe presentar evidencia que demuestre que, durante la preventa, exhibió a los consumidores de manera notoria y visible por medios digitales o físicos, el precio de venta y las características de las viviendas.",
  "El proveedor debe demostrar que cuenta con una política de no discriminación de conformidad con el artículo 58 de la LFPC y que la misma ha sido notificada a los consumidores de forma digital o impresa o los medios en los cuales los mismos pueden consultarla.",
  "El proveedor debe demostrar que entrega a los consumidores la carta de derechos, por medios impresos, físicos o digitales, en los términos establecidos en el 4.8 de la NOM-247-SE-2024.",
  "La información y publicidad del proveedor debe estar en español, por medios digitales o físicos en términos comprensibles y legibles. Sin perjuicio de que pueda estar en forma adicional en otros idiomas.",
  "El proveedor debe demostrar documentalmente que pone a disposición del consumidor la información prevista en el artículo 73 BIS de la LFPC, por medios digitales o físicos, incluyendo lo siguiente: I. Nombre comercial y razón social del proveedor; II. Datos de contacto que incluyan domicilio, teléfono y/o dirección electrónica; III. Acreditación de la propiedad del inmueble, o en su caso, derecho o facultad para comercializarla o enajenarla, y los gravámenes con los que cuenta, excepto aquellos derivados del crédito utilizado por el proveedor para la construcción de la vivienda; IV. Precio del inmueble en operaciones de contado; en operaciones de crédito, indicar que el precio total se determinará en función de los montos variables de conceptos de crédito y notariales; V. Métodos de pago disponibles por unidad privativa a comercializar, pudiendo ser, de manera enunciativa mas no limitativa, con crédito INFONAVIT, FOVISSSTE, bancarios, del mismo proveedor, de organismos públicos, privados o sindicatos; VI. Licencias, permisos o autorizaciones del inmueble otorgados por las autoridades competentes; VII. Especificaciones generales del inmueble que contenga, como mínimo: ubicación, colindancias, datos de medidas, instalaciones de servicios, acabados y sistema constructivo; VIII. Datos de los medios disponibles del proveedor para que el consumidor pueda presentar una queja o una reclamación, y los horarios de atención de estos medios; y IX. Número de registro ante PROFECO del contrato con el que comercializan los inmuebles.",
  "Si se incluye en la publicidad o información leyendas o información que indiquen que han sido avalados, aprobados, recomendados o certificados por sociedades o asociaciones profesionales distintas al proveedor, se debe demostrar con documentos provenientes de dichas sociedades o asociaciones profesionales que evidencien que las mismas dan su aval o recomendación, gracias a que cuentan con evidencia científica, objetiva y fehaciente, que les permite avalar, aprobar recomendar o certificar las cualidades o propiedades del producto o servicio, o cualquier otro requisito señalado en las leyes aplicables para acreditar las mismas.", 
  "El proveedor debe demostrar que se comunicó a los consumidores, por medios impresos, físicos o digitales, el Precio del inmueble en operaciones de contado. El precio de venta del inmueble debe ofertarse en moneda nacional, sin perjuicio de que pueda ser expresado también en moneda extranjera; de ser el caso, se estará al tipo de cambio que rija en el lugar y fecha en el momento en que se realice el pago, de conformidad con la legislación aplicable. En operaciones de crédito, el proveedor debe demostrar que se comunicó a los consumidores, por medios impresos, físicos o digitales que el precio total se determinará en función de los montos variables de conceptos de crédito y notariales que deben ser consultados with los promotores.", 
  "En caso de contar con ofertas y promociones, el proveedor debe demostrar que en las mismas se informó por medios impresos, físicos o digitales a los consumidores: la vigencia o, en su caso, el volumen de inmuebles ofrecidos.", 
  "El proveedor debe acreditar que cuenta con representación física o virtual (es decir, por medios ópticos, digitales o electrónicos), a disposición de los consumidores, que tiene por objeto mostrar las características generales, distribución y dimensiones de la vivienda objeto de la compraventa y, en su caso, el desarrollo habitacional en donde se encuentre éste, en términos del artículo 34 del RLFPC.", 
  "El proveedor debe demostrar que puso a disposición del consumidor los planos estructurales, arquitectónicos y de instalaciones, o, en su defecto, un dictamen de las condiciones estructurales del inmueble, avalados por perito responsable o corresponsables, ya sea físicamente o por cualquier medio óptico o electrónico o en su caso, señalar expresamente las causas por las que no cuenta con ellos, así como el plazo en el que tendrá dicha documentación.",
  "El proveedor debe demostrar a la Unidad de inspección que cuenta con un Programa de Protección Civil del inmueble y que el mismo fue puesto a disposición de los consumidores, ya sea por medios impresos, físicos o digitales.", 
  "El proveedor debe demostrar a la unidad de inspección, conforme a lo previsto por el numeral 5.6.6 la forma en la que se informa a los consumidores sobre los acabados con los que contará el inmueble, ya sea que se encuentren en la información y publicidad sobre las viviendas que comercializa, especificados como tales en el inmueble muestra o, en su caso, con los pactados con el consumidor, los cuales deben estar descritos en el contrato respectivo.", 
  "El proveedor debe demostrar a la Unidad de Inspección que sus promotores están obligados a utilizar la credencial expedida por el proveedor, o bien, por el concesionario de ventas que contenga de manera visible su nombre completo, logo del concesionario en su caso, logo del proveedor, cargo, vigencia de la identificación y un número de atención de quejas.", 
  "Para demostrar que el modelo de contrato de adhesión cumple con lo previsto en el capítulo 6 de la NOM-247-SE-2021, el proveedor debe proporcionar a la Unidad de Inspección que el mismo ha sido registrado ante la PROFECO.", 
  "El proveedor debe presentar a la Unidad de Inspección la garantía ofrecida a los consumidores de acuerdo a lo previsto por el capítulo 7 de la NOM-247-SE-2021, acompañando evidencia que demuestre que es informada a los consumidores de manera impresa, física o digital",
  "El proveedor debe presentar a la Unidad de Inspección evidencia que demuestre que notificó a los consumidores de manera impresa, física o digital sobre los servicios adicionales, cuando los hubiera en los términos previstos por el capítulo 8 de la NOM-247-SE-2024.", 
  "Documentos válidos para acreditar la propiedad del inmueble. El proveedor debe acreditar la propiedad del inmueble mediante los siguientes documentos: I. Escritura pública otorgada por un notario público debidamente inscrita en el Registro Público de la Propiedad; tratándose de bienes inmuebles sujetos al régimen de propiedad en condominio, escritura pública donde conste la constitución de este régimen; o II. En los casos que proceda, mediante contrato privado, una vez que las firmas hayan sido ratificadas ante un fedatario o autoridad administrativa y esté debidamente inscrito en el Registro Público de la Propiedad. Una vez que se autorice el crédito a favor del consumidor o que se acuerde la firma en operaciones de contado, el proveedor debe demostrar de forma física o digital o electrónica, que proporcionó al Notario los documentos e información necesarios para llevar a cabo la escrituración de la enajenación del inmueble en favor del consumidor o, en su caso, las razones por las cuales aún no se ha llevado a cabo.", 
  "El proveedor debe demostrar a través de evidencia documental que en los casos previstos por el capítulo 8 de la NOM-247-SE-2024, ha llevado a cabo la bonificación en los porcentajes y términos previstos para cada caso en dicho capítulo, cuando hubiese casos en los que haya procedido dicha bonificación.", 
  "El proveedor cuando utilice las imágenes y marcas de las ONAVIS, para la comercialización de sus viviendas, debe demostrar que cuenta con autorización expresa de dichas instituciones, o que cumple con las reglas generales que en su caso se expidan, de conformidad con lo dispuesto por dichas Reglas Generales. No se considera incumplimiento cuando la alusión autorizada a las ONAVIS se haga, especificando que se puede acceder al financiamiento o esquema crediticio de los mismos. Para los créditos expedidos por el INFONAVIT, FOVISSSTE o algún otro organismo público, es importante que el proveedor demuestre que exhibe y/o proporciona a los consumidores, por medios físicos o digitales información respecto de que el trabajador podrá tramitar su crédito directamente en dichas instituciones a través de los medios que estén disponibles para ello, o bien, que informó al consumidor si el mismo podrá solicitar al proveedor dicho trámite de manera gratuita. En virtud de lo anterior, el proveedor debe demostrar que proporcionó al consumidor, por medios físicos o digitales, los datos de las oficinas y direcciones electrónicas de las páginas web institucionales o a través de asesores certificados por las instituciones.", 
  "El proveedor debe presentar el aviso de privacidad, legible y visible para los consumidores en su establecimiento físico y, en su caso, a través de cualquier otro medio físico, impreso o digital, incluyendo de forma enunciativa y no limitativa a través de: la página de Internet o comunicaciones electrónicas, a través de su texto completo o liga que lleve al mismo, medios ópticos o auditivos o por cualquier otra tecnología."
  ];

  return (
    <div className="fci-container">
      <header className="fci-header">
        <div className="fci-logo">
          <img src="METTIME LOGO.png" alt="MET-TIME" />
        </div>

        <div className="fci-header-main">
          <h1>MET-TIME, S.A. DE C.V.</h1>
          <p className="fci-subtext">
            Unidad de Verificación (organismo de inspección) acreditado por ema para las actividades indicadas en el escrito con numero de acreditación UIBI-004 a partir de 2024-08-26
            <br />
            ACREDITACIÓN Y APROBACIÓN: UIBI-004
          </p>
          <p className="fci-subtext">
            <strong>CÓDIGO: F-IC-PTO-001.B</strong> &nbsp; Av. Central 111, Rústicos Calpulli, 20296, Aguascalientes, Aguascalientes. &nbsp; Tel: (449) 918-78-18. &nbsp;
            email: contacto@met-time.com
          </p>
        </div>

        <div className="fci-header-side">
          <div className="fci-box">
            <div className="fci-box-title">FECHA</div>
            <input type="date" className="fci-input center" />
          </div>
          <div className="fci-box">
            <div className="fci-box-title">EXPEDIENTE</div>
            <input type="text" className="fci-input center" defaultValue="MT-IC-" aria-label="Expediente" />
          </div>
        </div>
      </header>

      <section className="fci-titlebar">
        <div className="fci-title-center">
          <h2>DICTAMEN DE INSPECCIÓN</h2>
          <div className="fci-format">Formato código: F-IC-PTO-001.B</div>
        </div>
        <div className="fci-meta">
          <div className="fci-times">
            <div className="fci-time-row">
              <label>HORA INICIO</label>
              <input type="time" className="fci-input" />
            </div>
            <div className="fci-time-row">
              <label>HORA FINAL</label>
              <input type="time" className="fci-input" />
            </div>
          </div>
        </div>
      </section>

      <section className="fci-section">
        <div className="fci-section-title">INFORMACIÓN DEL CLIENTE</div>
        <div className="fci-row">
          <label>NOMBRE DEL PROPIETARIO:</label>
          <input type="text" className="fci-input" placeholder="" />
        </div>

        <div className="fci-row fci-row-3">
          <label>DOMICILIO:</label>
          <input type="text" className="fci-input" />
          <div className="fci-mini">
            <label>C.P.</label>
            <input type="text" className="fci-input" />
          </div>
        </div>

        <div className="fci-row">
          <label>COLONIA:</label>
          <input type="text" className="fci-input" />
        </div>

        <div className="fci-row fci-row-2">
          <label>DELEGACIÓN /MUNICIPIO:</label>
          <input type="text" className="fci-input" />
          <label>R.F.C.</label>
          <input type="text" className="fci-input" />
        </div>

        <div className="fci-row">
          <label>GIRO:</label>
          <input type="text" className="fci-input" />
        </div>

        <div className="fci-row">
          <label>COORDENADAS UTM:</label>
          <input type="text" className="fci-input" />
        </div>

        <div className="fci-row">
          <label>INSPECTOR:</label>
          <input type="text" className="fci-input" />
        </div>
      </section>

      {/* 5-column table with 25 rows */}
      <section className="fci-table-section">
        <div className="fci-table-wrap">
          <table className="fci-table">
            {/* Set explicit column widths */}
            <colgroup>
              <col className="fci-col-1" />
              <col className="fci-col-2" />
              <col className="fci-col-3" />
              <col className="fci-col-4" />
              <col className="fci-col-5" />
            </colgroup>
            <thead>
              <tr>
                <th>REQUISITO A EVALUAR</th>
                <th>FORMA DE DEMOSTRACIÓN</th>
                <th>CUMPLE</th>
                <th>NO CUMPLE</th>
                <th>NO APLICA</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }, (_, i) => (
                <tr key={i}>
                  <td>{col1Data[i]}</td>
                  <td>{col2Data[i]}</td>
                  <td className="fci-tick">
                    <input
                      type="checkbox"
                      checked={rowSelections[i] === 'cumple'}
                      onChange={() => handleTickChange(i, 'cumple')}
                    />
                  </td>
                  <td className="fci-tick">
                    <input
                      type="checkbox"
                      checked={rowSelections[i] === 'noCumple'}
                      onChange={() => handleTickChange(i, 'noCumple')}
                    />
                  </td>
                  <td className="fci-tick">
                    <input
                      type="checkbox"
                      checked={rowSelections[i] === 'noAplica'}
                      onChange={() => handleTickChange(i, 'noAplica')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Updated: 3-column, 2-row table with text in all cells and checkboxes in bottom row last two columns */}
          <table className="fci-table fci-mini-table" style={{ width: '100%', margin: '12px 0' }}>
            <colgroup>
              <col style={{ width: '33.33%' }} />
              <col style={{ width: '33.33%' }} />
              <col style={{ width: '33.33%' }} />
            </colgroup>
            <tbody>
              <tr style={{ height: '36px' }}>
                <td><strong>CONCLUSION</strong></td>
                <td><strong>SATISFACTORIO</strong></td>
                <td><strong>NO SATISFACTORIO</strong></td>
              </tr>
              <tr style={{ height: '36px' }}>
                <td>La inspección se realizó de acuerdo con los estándares establecidos.</td>
                <td className="fci-tick">
                  <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={miniChoice === 'col2'}
                      onChange={() => setMiniChoice(miniChoice === 'col2' ? null : 'col2')}
                    />
                  </label>
                </td>
                <td className="fci-tick">
                  <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={miniChoice === 'col3'}
                      onChange={() => setMiniChoice(miniChoice === 'col3' ? null : 'col3')}
                    />
                  </label>
                </td>
              </tr>
            </tbody>
          </table>


          <label
            style={{
              minWidth: '220px',
              fontWeight: 'bold',
              paddingLeft: '20px',
              paddingRight: '20px',
              display: 'inline-block',
            }}
          >
            * MET-TIME S.A DE C.V. verifica los requisitos de la información comercial y la publicidad de bienes inmuebles destinados a casa habitación y elementos mínimos que debe contener los contratos relacionados.
            <br />
            * El presente dictamen de inspección avala que las pruebas realizadas a los objetos descritos, se efectuaron de acuerdo a las especificaciones establecidas en la Norma Oficial Mexicana NOM-247-SE-2021, Prácticas Comerciales- requisitos de la información comercial y la publicidad de bienes inmuebles destinados a casa habitación y elementos mínimos que deben contener los contratos relacionados, publicada en el Diario Oficial de la Federación el día 22 de marzo del 2022 y al procedimiento de inspección código MT-IC-PTO-001 de este Organismo de Inspección.
            <br />
            *Toda la información derivada de la presente inspección, es manejada en todo momento de manera confidencial por personal de ésta empresa.
            <br />
            *Queda prohibida la reproducción total o parcial del presente dictamen sin la autorización de este Organismo de Inspección.
            <br />
            *Este organismo de inspección no se hace responsable si los instrumentos verificados en dicho dictamen son alterados.
            <br />
            *La presente solicitud de inspección tiene una vigencia de 25 días naturales a partir de la fecha que fue emitida por la unidad de inspección
          </label>
        </div>
      </section>

      {/* Firmas (4 espacios interactivos) */}
      <section className="fci-signatures">
        <div className="fci-sign-wrapper">
          <SignatureCanvas sigId="fci-firma-1" />
          <input type="text" className="fci-input" placeholder="NOMBRE..." />
          <div className="fci-sign-caption">NOMBRE Y FIRMA DEL INSPECTOR </div>
        </div>

        <div className="fci-sign-wrapper">
          <SignatureCanvas sigId="fci-firma-2" />
          <input type="text" className="fci-input" placeholder="NOMBRE..." />
          <div className="fci-sign-caption">FIRMA DE CONFORME DEL CLIENTE</div>
        </div>

        <div className="fci-sign-wrapper">
          <SignatureCanvas sigId="fci-firma-3" />
          <input type="text" className="fci-input" placeholder="NOMBRE..." />
          <div className="fci-sign-caption">NOMBRE Y FIRMA DEL PERSONAL AUXILIAR <br /> DE APOYO QUE INTERVINO EN LA INSPECCIÓN</div>
        </div>

        <div className="fci-sign-wrapper">
          <SignatureCanvas sigId="fci-firma-4" />
          <input type="text" className="fci-input" placeholder="NOMBRE..." />
          <div className="fci-sign-caption">NOMBRE Y FIRMA DEL SUPERVISOR</div>
        </div>

        <div className="Observaciones">
          <label>Observaciones:</label>
          <textarea
            className="fci-textarea"
            placeholder="Escribe tus observaciones aquí..."
            rows={6}
          />
        </div>

        <div className="fci-sign-wrapper">
          <label>*Documento electrónico con validez oficial</label>
        </div>

        {/* PDF Generation Button with validation */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={generatePDF}
            style={{
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#2980b9',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#3498db'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2980b9'}
          >
            📄 Generar PDF
          </button>
        </div>

      </section>
    </div>
  );
}