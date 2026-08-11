const fs = require('fs');

const pdfPath = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/utils/generarPDFInfraccion.js';
let code = fs.readFileSync(pdfPath, 'utf8');

const saveOld = `    if (accion === 'open' || accion === 'print') {`;
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
          const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(imgFile);
          });
          
          if (base64Data) {
            const imgObj = await loadImage(base64Data);
            if (imgObj) {
              const opt = getOptimizedImage(imgObj, 600); // 600 max w for crispness
              if (opt) {
                let targetW = contentW;
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

    if (accion === 'open' || accion === 'print') {`;

if (code.includes(`if (accion === 'open' || accion === 'print') {`)) {
    code = code.replace(saveOld, saveNew);
    console.log("Replaced");
} else {
    console.error("Could not find the block to insert the Anexo.");
}

fs.writeFileSync(pdfPath, code);
