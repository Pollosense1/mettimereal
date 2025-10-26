import React, { useState, useRef } from 'react';
import './FillableTable.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from './supabaseClient';

// Define your static text for the first two columns here:
const firstColumnTexts = [
  "Canales de atención de quejas y solicitudes.", "Información en Portal en Internet", "Información en oficina de atención física", "Anticipo", "Enganches",
  "Preventas", "No discriminación", "Carta de derechos", "Información y publicidad/idioma", "Información y publicidad/requisitos generales",
  "Información y publicidad/avales", "Información y publicidad/precio", "Información y publicidad/ofertas y promociones", "Información y publicidad/Requisitos de proyecto Ejecutivo, maqueta", "Información y publicidad/Informaión del inmueble",
  "Información y publicidad/Protección civil", "Información y publicidad/Acabados", "Información y publicidad/Promotores", "Contrato de adhesión", "Garantías",
  "Servicios adicionales", "Escrituración y notarios", "Bonificación", "Viviendas de interés social", "Privacidad"
];

const secondColumnTexts = [
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

function SignatureCanvas({ width = 300, height = 100 }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  const startDrawing = (e) => {
  setDrawing(true);
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(
    (e.touches ? e.touches[0].clientX : e.nativeEvent.offsetX),
    (e.touches ? e.touches[0].clientY : e.nativeEvent.offsetY)
  );
};

  const draw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (e.touches) {
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top
      );
    } else {
      ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    }
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
          background: '#fff', // Changed background color to white
          color: '#222', // Adjusted text color for contrast
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Limpiar
      </button>
    </div>
  );
}

function FillableTable() {
  const numRows = 25;
  const [tableData, setTableData] = useState(Array(numRows).fill(null));
  const [textInputs, setTextInputs] = useState(Array(12).fill(""));
  const formRef = useRef(null);

  const handleCheckboxChange = (rowIdx, colIdx) => {
    setTableData(prev =>
      prev.map((selected, idx) => (idx === rowIdx ? colIdx : selected))
    );
  };

  const handleTextInputChange = (idx, value) => {
    setTextInputs(prev =>
      prev.map((text, i) => (i === idx ? value : text))
    );
  };

  // Example labels for the 11 textboxes
  const extraLabels = [
    "NOMBRE O DENOMINACIÓN:  ",
    "R.F.C.:  ",
    "NOMBRE DEL PROPIETARIO:  ",
    "DOMICILIO DEL ESTABLECIMIENTO  ",
    "CALLE:  ",
    "ENTRE CALLES:  ",
    "COLONIA:  ",
    "CÓDIGO POSTAL:  ",
    "DELEGACIÓN O MUNICIPIO:  ",
    "ESTADO:  ",
    "GIRO:  ",
    "TELÉFONO:  ",
    "Nombre del inspector:  " // New label added
  ];

  // Validation function
  const validateForm = () => {
    // Check all checkboxes answered
    const allChecked = tableData.every(val => val !== null);
    // Check all text inputs filled except "DOMICILIO DEL ESTABLECIMIENTO"
    const allTextFilled = textInputs
      .filter((_, idx) => idx !== 3) // skip index 3
      .every(val => val.trim() !== "");
    return allChecked && allTextFilled;
  };

  // PDF export function
  const handleExportPDF = async () => {
    if (!validateForm()) {
      alert("Por favor, responde todos los campos antes de exportar.");
      return;
    }

    const rawName = (textInputs[0] || '').trim();
    const sanitized = rawName
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
    const filename = `Solicitud${sanitized ? ' ' + sanitized : ''}.pdf`;

    const input = formRef.current;

    // Tuning for smaller output
    const TARGET_MAX_WIDTH = 1200;   // px cap for the captured canvas width
    const captureScale = Math.min(1, TARGET_MAX_WIDTH / input.scrollWidth); // never upscale above 1
    const IMAGE_QUALITY = 0.5;       // JPEG quality (0.35–0.6 is a good range)

    // Ocultar botones y desplazar al inicio
    const buttons = input.querySelectorAll("button");
    buttons.forEach(button => (button.style.display = "none"));
    window.scrollTo(0, 0);

    // Renderizar todo el nodo con el ancho real del contenido
    const canvas = await html2canvas(input, {
      scale: captureScale, // was 2 → smaller bitmap
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollY: 0,
      windowWidth: input.scrollWidth,
      windowHeight: input.scrollHeight,
    });

    // Restaurar botones
    buttons.forEach(button => (button.style.display = ""));

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true,
    });

    // Conversión px ↔ pt para cortar sin recortes
    const pageWidthPt = pdf.internal.pageSize.getWidth();
    const pageHeightPt = pdf.internal.pageSize.getHeight();
    const pxPerPt = canvas.width / pageWidthPt; // porque ajustaremos el ancho de imagen a pageWidthPt
    const pageHeightPx = Math.floor(pageHeightPt * pxPerPt);

    let yPx = 0;
    let pageIndex = 0;

    while (yPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - yPx);

      // Crear un canvas por página y copiar el segmento
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;
      const ctx = pageCanvas.getContext('2d');
      ctx.drawImage(
        canvas,
        0, yPx, canvas.width, sliceHeightPx, // src rect
        0, 0, canvas.width, sliceHeightPx    // dst rect
      );

      const imgData = pageCanvas.toDataURL("image/jpeg", IMAGE_QUALITY); // was 0.7
      const imgHeightPt = sliceHeightPx / pxPerPt;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidthPt, imgHeightPt, undefined, "FAST");

      yPx += sliceHeightPx;
      pageIndex += 1;
    }

    // NEW: Upload to Supabase Storage
    try {
      const pdfBlob = pdf.output('blob');
      const storagePath = `solicitudes/${(sanitized || 'solicitud').replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      const { data, error } = await supabase
        .storage
        .from('pdfs')
        .upload(storagePath, pdfBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        });

      if (error) {
        console.error('Error al subir PDF a Supabase:', error);
        alert('Se exportó el PDF, pero falló la carga a Supabase.');
      } else {
        const { data: publicUrlData } = supabase
          .storage
          .from('pdfs')
          .getPublicUrl(storagePath);
        if (publicUrlData?.publicUrl) {
          console.log('URL pública:', publicUrlData.publicUrl);
        }
      }
    } catch (e) {
      console.error('Excepción al subir a Supabase:', e);
      alert('Se exportó el PDF, pero ocurrió un error al subir a Supabase.');
    }

    pdf.save(filename);
  };

  return (
    <div className="table-container" ref={formRef}>
      <div style={{
  backgroundColor: '#222',
  color: '#fff',
  padding: '20px',
  textAlign: 'center',
  marginBottom: '20px',
  borderRadius: '8px'
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ textAlign: 'left' }}>
      <img src="METTIME LOGO.png" alt="MET-TIME Logo" style={{ height: '200px' }} />
    </div>
    <div style={{ textAlign: 'center', flex: 1 }}>
      <h1 style={{ fontSize: '24px', margin: '0' }}>MET-TIME, S.A. DE C.V.</h1>
      <br />
      <p style={{ margin: '0', fontSize: '16px' }}>
        Unidad de Verificación (organismo de inspección) acreditado por ema para las actividades indicadas en el escrito con número de acreditación UIBI-004 a partir de 2024-08-26
        <br />
        <br />
        ACREDITACIÓN Y APROBACIÓN: UIBI-004
      </p>
      <br />
      <p style={{ margin: '0', fontSize: '16px' }}>
        CÓDIGO: F-IC-PTO-001 | Av. Central 111, Rústicos Calpulli, 20296, Aguascalientes, Aguascalientes.
      </p>
      <br />
      <p style={{ margin: '0', fontSize: '16px' }}>
        Tel: (449) 918-78-18 | email: contacto@met-time.com
      </p>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{
        backgroundColor: '#005A8C', // Adjusted color to match the provided design
        color: '#fff',
        padding: '10px 20px', // Added padding for better spacing
        border: '1px solid #fff', // Added border to match the design
        borderRadius: '4px', // Rounded corners
        fontWeight: 'bold',
        textAlign: 'center', // Centered text
        marginBottom: '5px', // Added spacing between boxes
      }}>
        EXPEDIENTE
      </div>
      <div style={{
        backgroundColor: '#222',
        color: '#fff',
        padding: '10px 20px', // Added padding for better spacing
        border: '1px solid #fff', // Added border to match the design
        borderRadius: '4px', // Rounded corners
        fontWeight: 'bold',
        textAlign: 'center', // Centered text
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>MT-IC-</span>
        <input
          type="text"
          style={{
            width: '80px',
            padding: '4px',
            fontSize: '14px',
            border: '1px solid #fff',
            borderRadius: '4px',
            backgroundColor: '#333',
            color: '#fff',
            textAlign: 'center',
          }}
        />
      </div>
    </div>
  </div>
  <h2 style={{ marginTop: '20px', fontSize: '20px' }}>
    SOLICITUD DE INSPECCIÓN DE LOS REQUISITOS DE LA INFORMACIÓN COMERCIAL Y LA PUBLICIDAD DE BIENES INMUEBLES
  </h2>
</div>
      <table className="responsive-table">
        <thead>
          <tr>
            <th>REQUISITO A EVALUAR</th>
            <th>FORMA DE DEMOSTRACIÓN</th>
            <th>APLICA</th>
            <th>NO APLICA</th>
          </tr>
        </thead>
        <tbody>
          {firstColumnTexts.map((label, rowIdx) => (
            <tr key={rowIdx}>
              <td>{label}</td>
              <td>{secondColumnTexts[rowIdx]}</td>
              <td>
                <input
                  type="checkbox"
                  checked={tableData[rowIdx] === 0}
                  onChange={() => handleCheckboxChange(rowIdx, 0)}
                  style={{ width: '100%', height: '24px' }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={tableData[rowIdx] === 1}
                  onChange={() => handleCheckboxChange(rowIdx, 1)}
                  style={{ width: '100%', height: '24px' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* 11 labels with fillable textboxes */}
      <div className="extra-fields" style={{ marginTop: '32px' }}>
        {extraLabels.map((label, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <label
              style={{
                minWidth: '220px',
                fontWeight: 'bold',
                paddingLeft: '20px',
                paddingRight: '20px',
                display: 'inline-block',
              }}
            >
              {label}
            </label>
            {label !== "DOMICILIO DEL ESTABLECIMIENTO  " &&
              label !== "DOMICILIO DEL ESTABLECIMIENTO" && (
                <input
                  type="text"
                  value={textInputs[idx]}
                  onChange={e => handleTextInputChange(idx, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '16px',
                    border: '2px solid #222',
                    borderRadius: '4px',
                    marginLeft: '10px',
                  }}
                />
              )}
          </div>
        ))}
        {/* Add a label after the last section */}
        <div style={{
          marginTop: '24px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}>
          <label
            style={{
              minWidth: '220px',
              fontWeight: 'bold',
              paddingLeft: '20px',
              paddingRight: '20px',
              display: 'inline-block',
            }}
          >
            CONDICIONES DEL SERVICIO
            <br />
            1. MET-TIME S.A DE C.V. verifica los requisitos de la información comercial y la publicidad de bienes inmuebles destinados a casa habitación y elementos mínimos que debe contener los contratos relacionados.
            <br />
            2. Esta solicitud es intransferible, los datos asentados son proporcionados personalmente por el solicitante y/o su representante legal, por lo que está de acuerdo de que algún dato que resulte inexacto o falso, no se le dará trámite ni se prestará el servicio de inspección, quedando sin efecto y a favor de este Organismo de Inspección el pago que se haya efectuado.
            <br />
            3. Únicamente se inspeccionaran los objetos relacionados en esta solicitud, mismos que están dentro del alcance acreditado y otorgado por la entidad mexicana de acreditación, a.c. en estricto apego a las especificaciones establecidas en la Norma Oficial Mexicana NOM-247-SE-2021, Prácticas Comerciales- requisitos de la información comercial y la publicidad de bienes inmuebles destinados a casa habitación y elementos mínimos que deben contener los contratos relacionados, publicada en el Diario Oficial de la Federación  el día 22 de marzo del 2022, ya que se cuenta con el personal suficiente y con la capacidad técnica necesaria, así como los recursos materiales necesarios para realizar dichas inspecciones.
            <br />
            4. Los objetos relacionados en el presente documento, se inspeccionaran ya sea en el domicilio de MET-TIME S.A. de C.V. o en el domicilio asentado en la presente solicitud, el Organismo de inspección informará al solicitante la visita de inspección. El solicitante, su representante, encargado, empleados y/o subordinados, tendrán la obligación de permitir al inspector el acceso al domicilio en que se encuentren los objetos a inspeccionar, a fin de llevar a cabo la inspección. E caso de que no se permita el acceso al domicilio, conviene el solicitante que quedará sin efecto su solicitud y el pago realizado.
            <br />
            5. En apego a las disposiciones contenidas en la Norma Oficial Mexicana NOM-247-SE-2021, Prácticas Comerciales- requisitos de la información comercial y la publicidad de bienes inmuebles destinados a casa habitación y elementos mínimos que deben contener los contratos relacionados, publicada en el Diario Oficial de la Federación  el día 22 de marzo del 2022, manifestamos que la inspección de los objetos se realiza con el procedimiento de inspección el cual ha sido autorizado por la entidad mexicana de acreditación, a.c. y por ningún motivo se realizarán las inspecciones con procedimiento distinto, el solicitante manifiesta sujetarse voluntariamente a dichos ordenamientos jurídicos, obligándose a permitir lo siguiente:
            <br />
            a) Cuando los resultados de la inspección, se determine que algún(os) objeto(s), no satisface(n) los requisitos establecidos en la Norma Oficial Mexicana NOM-247-SE-2021, el inspector procederá a notificar al solicitante la falta de conformidad y proporcionará un “DICTAMEN NO SATISFACTORIO” y no se le proporcionara el holograma.
            <br />
            b) Cuando los resultados de la inspección cumpla con todos los requisitos de la Norma Oficial Mexicana NOM-247-SE-2021, el inspector procederá a notificar y entregar el “DICTAMEN SATISFACTORIO” al solicitante y se le proporcionara el holograma correspondiente.
            <br />
            c) El dictamen no satisfactorio solo sera modificado por este Organismo de inspección después de comprobar mediante segunda visita de inspección, que el objeto satisface los requerimientos de aptitud para su uso.
            <br />
            d) Si transcurrido el término a que se refiere el inciso anterior, el objeto, no ha sido reparado, el interesado deberá solicitar su inspección extraordinaria y si una vez efectuada esta, los resultados demuestran el cumplimiento con las especificaciones de la NOM-247-SE-2021, el Organismo de Inspección colocará el holograma oficial, además de la contraseña distintiva del Organismo de Inspección, en forma tal que se pueda constatar que el solicitante ha sido inspeccionado.
            <br />
            6. El solicitante conviene que no podrá retirar el holograma oficial y la contraseña que sean colocados por el Organismo de Inspección.
            <br />
            7. La condición del objeto inspeccionado se pierde por las causas siguientes:
            <br />
            a) Ruptura, remoción, violación o cualquier forma de inutilización del holograma oficial de objeto inspeccionado, aún por caso fortuito o por reparación del objeto inspeccionado.
            <br />
            8. La presente solicitud no podrá ser reproducida total o parcial sin la autorización de este Organismo de Inspección.
          </label>
        </div>
        
        {/* Signature drawing spaces */}
        <div style={{
          marginTop: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          gap: '40px'
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
              Espacio para firma del solicitante
            </label>
            <SignatureCanvas />
            <div style={{ borderBottom: '2px solid #222', width: '80%', margin: '0 auto 8px auto', height: '2px' }}></div>
            <span style={{ fontWeight: 'bold' }}>Firma del solicitante</span>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
              Espacio para firma del inspector
            </label>
            <SignatureCanvas />
            <div style={{ borderBottom: '2px solid #222', width: '80%', margin: '0 auto 8px auto', height: '2px' }}></div>
            <span style={{ fontWeight: 'bold' }}>Firma del inspector</span>
          </div>
        </div>
      </div>
      
      {/* Export Button */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button
          type="button"
          onClick={handleExportPDF}
          style={{
            padding: '12px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: '#222',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Exportar como PDF
        </button>
      </div>

      {/* Final label visible in UI and included in PDF capture */}
      <div
        aria-hidden="true"
        style={{
          marginTop: '12px',
          textAlign: 'center',
          fontStyle: 'italic',
          color: '#6B7280'
        }}
      >
        *Documento electrónico con validez oficial
      </div>
    </div>
  );
}

export default FillableTable;