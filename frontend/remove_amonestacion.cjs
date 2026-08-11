const fs = require('fs');
const filePath = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/pages/Infraccion/InfraccionDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find start and end indices
const startLineIdx = lines.findIndex(line => line.includes('{/* ── SELECTOR DE PROCEDIMIENTO ── */}'));
const endLineIdx = lines.findIndex(line => line.includes('{/* CASO B: FORMULARIO DE INFRACCIÓN                                          */}'));

if (startLineIdx !== -1 && endLineIdx !== -1) {
    // We want to delete from startLineIdx up to endLineIdx (exclusive or inclusive depending, let's just delete up to endLineIdx - 1)
    // Wait, the block includes `{/* ========================================================================= */}` right above it.
    // Let's just splice from startLineIdx up to endLineIdx + 1, wait no, let's keep CASO B comment.
    
    // Actually, looking at the previous view:
    // 965:           {/* ========================================================================= */}
    // 966:           {/* CASO B: FORMULARIO DE INFRACCIÓN                                          */}
    
    // We can just remove from `startLineIdx` up to `965` (index 964). But line indices might have shifted slightly.
    const amonestacionEndIdx = lines.findIndex(line => line.includes('Guardar y Registrar Acta'));
    // The `</form>` for amonestacion is a few lines below `Guardar y Registrar Acta`.
    
    let deleteToIdx = endLineIdx - 2; // to keep the `==========` line
    
    lines.splice(startLineIdx, (deleteToIdx - startLineIdx) + 1);
    
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Removed selector and amonestacion form properly');
} else {
    console.log('Could not find markers');
}
