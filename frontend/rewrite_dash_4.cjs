const fs = require('fs');

const frontendPath = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/pages/Infraccion/InfraccionDashboard.jsx';
let code = fs.readFileSync(frontendPath, 'utf8');

// 1. Remove the procedure selector block
const selectorBlock = /                \{\/\* ── SELECTOR DE PROCEDIMIENTO ── \*\/\}[\s\S]*?CASO B: FORMULARIO DE INFRACCIÓN                                          \*\/\}\r?\n          \{\/\* ========================================================================= \*\/\}/;
code = code.replace(selectorBlock, "");

// 2. Remove the condition {tipoFormulario === 'infraccion' && (
const formStartCond = /          \{tipoFormulario === 'infraccion' && \(/;
code = code.replace(formStartCond, "");

// 3. Find the end of the infraccion form and remove the closing `)}`
// Previously I replaced: code.replace(regexEndToggle, `</form>\n          </div>\n        </div>\n      </div>\n    </div>\n    <style>`);
// Let's see if the closing `)}` is still there.
const endingRegex = /<\/form>\s*\}\)\}\s*<\/div>/; // Wait, if `)}` is there, it would be `</form>\n          )}\n        </div>`
code = code.replace(/<\/form>\s*\)\}\s*<\/div>/, "</form>\n        </div>");

fs.writeFileSync('C:/Users/Jose M/Documents/stm-proyecto/frontend/update_dash_4.cjs', code);
console.log('Done script 4');
