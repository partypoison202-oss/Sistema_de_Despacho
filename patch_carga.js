const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/CargaExcel/CargaExcel.jsx', 'utf8');

const replacement = `
          workbook.SheetNames.forEach(sheetName => {
            if (sheetName === '1. GUÍA DE LLENADO') return; // Saltarse la hoja de instrucciones

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            if (!jsonData || jsonData.length === 0) return;

            if (tabActiva === 'MANANA') {
                // Para MANANA, acumulamos todo directo para mandar al backend
                jsonData.forEach(row => {
                    const normalizedRow = {};
                    Object.keys(row).forEach(k => {
                        const cleanKey = k.trim().toUpperCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/\\s+/g, '_');
                        normalizedRow[cleanKey] = String(row[k]).trim().toUpperCase();
                        if (cleanKey.startsWith('HORA')) {
                            const v = row[k];
                            let horaTexto = '';
                            if (typeof v === 'number' && v >= 0 && v < 1) {
                                const totalMin = Math.round(v * 24 * 60) % (24 * 60);
                                horaTexto = \`\${String(Math.floor(totalMin / 60)).padStart(2, '0')}:\${String(totalMin % 60).padStart(2, '0')}\`;
                            } else {
                                const s = String(v ?? '').trim();
                                const m = s.match(/^(\\d{1,2}):(\\d{2})/);
                                horaTexto = m ? \`\${m[1].padStart(2, '0')}:\${m[2]}\` : s;
                            }
                            normalizedRow[cleanKey] = horaTexto;
                        }
                    });
                    
                    if (normalizedRow['ECONOMICO']) {
                        actualizaciones.push({
                            'ECONOMICO': normalizedRow['ECONOMICO'],
                            'SERVICIO': normalizedRow['SERVICIO'],
                            'TARJETON': normalizedRow['TARJETON'],
                            'HORA DE SALIDA DE PATIO': normalizedRow['HORA_DE_SALIDA_DE_PATIO'],
                            'HORA DE ACOPLE': normalizedRow['HORA_DE_ACOPLE'],
                            'HORA ENTRADA T6': normalizedRow['HORA_ENTRADA_T6']
                        });
                    }
                });
                return;
            }

            const aHoraTexto = (v) => {
`;

content = content.replace(/workbook\.SheetNames\.forEach\(sheetName => \{[\s\n]*if \(sheetName === '1\. GU?A DE LLENADO'\) return; \/\/ Saltarse la hoja de instrucciones[\s\n]*const worksheet = workbook\.Sheets\[sheetName\];[\s\n]*const jsonData = XLSX\.utils\.sheet_to_json\(worksheet, \{ defval: "" \}\);[\s\n]*if \(!jsonData \|\| jsonData\.length === 0\) return;[\s\n]*const aHoraTexto = \(v\) => \{/m, replacement);

const replacement2 = `
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Error al leer Excel',
            text: err.message || 'El formato del Excel no es válido.',
            confirmButtonColor: 'var(--color-maroon)'
          });
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      
      reader.readAsBinaryString(file);
    } catch (e) { console.error(e); }
  };
`;

const mananaPostLogic = `
        if (tabActiva === 'MANANA') {
            if (actualizaciones.length === 0) {
                Swal.fire({ icon: 'warning', title: 'Excel vacío', text: 'No se encontraron datos para procesar.' });
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            
            Swal.fire({
                title: 'Procesando...',
                text: 'Enviando programación del día siguiente',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            fetch(\`\${API_BASE}/api/despacho/cargar-programacion-excel\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
                },
                body: JSON.stringify({ datos: actualizaciones })
            })
            .then(res => res.json())
            .then(resData => {
                if (resData.errores && resData.errores.length > 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Datos con errores',
                        html: '<div style="max-height: 200px; overflow-y: auto; text-align: left; font-size: 0.85em;">' + resData.errores.join('<br/>') + '</div>',
                        confirmButtonColor: '#c5a059'
                    });
                } else if (resData.error) {
                    throw new Error(resData.error || resData.message);
                } else {
                    Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Programación cargada correctamente.', timer: 2000, showConfirmButton: false });
                    refetchData();
                }
            })
            .catch(err => {
                Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Error al enviar los datos al servidor.' });
            })
            .finally(() => {
                if (fileInputRef.current) fileInputRef.current.value = '';
            });
            
            return;
        }

        if (errores.length > 0) {
`;

content = content.replace(/if \(errores\.length > 0\) \{/m, mananaPostLogic);

fs.writeFileSync('frontend/src/pages/CargaExcel/CargaExcel.jsx', content, 'utf8');
