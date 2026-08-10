const fs = require('fs');

const pdfPath = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/utils/generarPDFInfraccion.js';
let code = fs.readFileSync(pdfPath, 'utf8');

// Update parameters logic to accept imágenes (we'll just pass them in `datos.imagenes`)
// First replace the old ubicacion exacta
const ubicacionOld = `    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Ubicación exacta:', margin + 3, y + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(datos.ubicacion_exacta || datos.lugar || 'Carril Confinado Troncal (URBANUSS)'), margin + 26, y + 14.5);`;

const ubicacionNew = `    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Ubicación:', margin + 3, y + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    
    const calle = datos.calle || '';
    const num = datos.numero || 'S/N';
    const col = datos.colonia || '';
    const dirTexto = toTitleCase(\`\${calle} \${num}, Col. \${col}\`).trim();
    doc.text(dirTexto || 'Carril Confinado Troncal (URBANUSS)', margin + 17, y + 14.5);`;

code = code.replace(ubicacionOld, ubicacionNew);

// Now find where doc.save is called to insert the Annex before saving.
const saveOld = `    if (accion === 'print') {`;
const saveNew = `    // ── ANEXO FOTOGRÁFICO ──────────────────────────────────────────
    if (datos.imagenes && datos.imagenes.length > 0) {
      doc.addPage();
      
      // Header for Anexo Fotográfico
      let yAnexo = margin;
      doc.setFillColor(96, 26, 42);
      doc.roundedRect(margin, yAnexo, contentW, 10, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ANEXO FOTOGRÁFICO DE EVIDENCIA', pageW / 2, yAnexo + 6, { align: 'center' });

      yAnexo += 15;

      // Draw Images
      for (let i = 0; i < datos.imagenes.length; i++) {
        if (i >= 3) break; // max 3
        const imgFile = datos.imagenes[i];
        if (!imgFile) continue;

        try {
          // Convert file to base64 if it's a File object (which it is from the form)
          // Wait, this is an async function inside a for-loop... wait, we need to handle File -> Base64
          // We can use a local promise wrapper to read it
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => resolve(null);
            reader.readAsDataURL(imgFile);
          });
          
          if (base64Data) {
            // we have the base64, load it as image to get dimensions
            const imgObj = await loadImage(base64Data);
            if (imgObj) {
              const opt = getOptimizedImage(imgObj, 600); // 600 max w for crispness
              if (opt) {
                const targetW = contentW;
                let targetH = targetW / opt.aspect;
                
                // If it overflows the page, limit the height
                if (targetH > 80) { // arbitrary max height per photo
                    targetH = 80;
                    targetW = targetH * opt.aspect;
                }

                // Check if we need a new page for this photo
                if (yAnexo + targetH > 280) {
                    doc.addPage();
                    yAnexo = margin;
                }

                const centerX = margin + (contentW - targetW) / 2;
                doc.addImage(opt.dataUrl, 'PNG', centerX, yAnexo, targetW, targetH);
                yAnexo += targetH + 10;
              }
            }
          }
        } catch(e) {
            console.error("Error drawing image to pdf:", e);
        }
      }
    }

    if (accion === 'print') {`;

if (code.includes('if (accion === \'print\') {')) {
    code = code.replace(saveOld, saveNew);
} else {
    console.error("Could not find the print logic block to insert the Anexo.");
}

fs.writeFileSync('C:/Users/Jose M/Documents/stm-proyecto/frontend/update_pdf_2.cjs', code);
console.log('PDF generator updated');
