import sys

with open('src/pages/CheckList/HistorialCheckList.jsx', 'r') as f:
    content = f.read()

# 1. Extract Preview Block and create ChecklistPreviewInline component
start_marker = "{/* ── Preview inline ──────────────────────────────────── */}"
end_marker = "                })()}\n                </main>"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find preview block bounds")
    sys.exit(1)

preview_block = content[start_idx:end_idx].strip()
# Remove the old block from content
content = content[:start_idx] + content[end_idx + len("                })()\n"):]

# Define the component
component_code = """
const ChecklistPreviewInline = ({ previewChecklist, setPreviewId, setLightboxImage }) => {
    const conductorEncontrado = CONDUCTORES.find((c) => c.id === Number(previewChecklist.conductor_id));
    const conductorNombre = conductorEncontrado ? conductorEncontrado.nombre : '—';
    const conductorTarjeton = conductorEncontrado ? conductorEncontrado.tarjeton : '—';
    
    return (
        <div className="rounded-2xl border border-guinda-700/20 bg-white p-6 shadow-sm animate-in fade-in printable-section">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                <h4 className="text-lg font-bold text-guinda-700">
                    Detalle del Checklist #{previewChecklist.id}
                </h4>
                <button
                    onClick={() => setPreviewId(null)}
                    className="text-gray-400 hover:text-gray-600 transition hide-on-print"
                    title="Cerrar detalle"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-6 mb-6">
                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo Unidad</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{previewChecklist.tipo_unidad}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Servicio / Ruta</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{previewChecklist.servicio}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Inspector</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{previewChecklist.user_name}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ID Conductor</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{previewChecklist.conductor_id ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tarjetón</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{conductorTarjeton}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre Conductor</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{conductorNombre}</p>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3 text-center border-b border-gray-100 pb-6">
                <div className="rounded-xl bg-emerald-50 py-3">
                    <p className="text-2xl font-extrabold text-emerald-600">{previewChecklist.total_bien}</p>
                    <p className="text-[10px] font-bold uppercase text-emerald-700">Bien</p>
                </div>
                <div className="rounded-xl bg-red-50 py-3">
                    <p className="text-2xl font-extrabold text-red-500">{previewChecklist.total_mal}</p>
                    <p className="text-[10px] font-bold uppercase text-red-700">Mal</p>
                </div>
                <div className="rounded-xl bg-gray-100 py-3">
                    <p className="text-2xl font-extrabold text-gray-500">{previewChecklist.total_puntos - previewChecklist.total_bien - previewChecklist.total_mal}</p>
                    <p className="text-[10px] font-bold uppercase text-gray-600">Pendiente</p>
                </div>
            </div>

            {/* Detalles de puntos */}
            <div className="mb-6">
                <h5 className="mb-4 text-sm font-bold text-gray-800">Puntos Evaluados</h5>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PUNTOS.map((punto, idx) => {
                        const pd = previewChecklist.puntos?.[punto.id];
                        if (!pd || pd.estado === null) return null; // Solo mostrar los evaluados
                        
                        const isBien = pd.estado === 'bien';
                        return (
                            <li key={punto.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-start gap-3">
                                <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${isBien ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {isBien ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800">{punto.label}</p>
                                    {pd.observaciones ? (
                                        <p className="mt-1 text-xs text-gray-600 break-all whitespace-pre-wrap">
                                            <span className="font-semibold text-gray-500">Obs:</span> {pd.observaciones}
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-xs italic text-gray-400">Sin observaciones</p>
                                    )}
                                    
                                    {(pd.foto || (pd.fotos && pd.fotos.length > 0)) && (
                                        <div className="mt-3 flex flex-wrap gap-2 hide-on-print">
                                            {pd.foto && (
                                                <img 
                                                    src={pd.foto} 
                                                    alt={`Evidencia de ${punto.label}`} 
                                                    className="h-16 w-16 rounded-lg object-cover border border-gray-200 cursor-zoom-in hover:scale-105 transition-all shadow-sm"
                                                    onClick={() => setLightboxImage(pd.foto)}
                                                />
                                            )}
                                            {pd.fotos && pd.fotos.map((f, fIdx) => (
                                                <img 
                                                    key={fIdx}
                                                    src={f} 
                                                    alt={`Evidencia ${fIdx + 1} de ${punto.label}`} 
                                                    className="h-16 w-16 rounded-lg object-cover border border-gray-200 cursor-zoom-in hover:scale-105 transition-all shadow-sm"
                                                    onClick={() => setLightboxImage(f)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Evidencias fotográficas dedicadas */}
            {(() => {
                const fotosEvidencia = [];
                PUNTOS.forEach(punto => {
                    const pd = previewChecklist.puntos?.[punto.id];
                    if (pd) {
                        if (pd.foto) fotosEvidencia.push({ label: punto.label, url: pd.foto });
                        if (pd.fotos && pd.fotos.length > 0) {
                            pd.fotos.forEach(f => fotosEvidencia.push({ label: punto.label, url: f }));
                        }
                    }
                });

                if (fotosEvidencia.length === 0) return null;

                return (
                    <div className="mb-6 page-break-before">
                        <h5 className="mb-4 text-sm font-bold text-gray-800 border-b border-gray-150 pb-2">Evidencias Fotográficas</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {fotosEvidencia.map((foto, idx) => (
                                <div key={idx} className="flex flex-col items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                                    <img 
                                        src={foto.url} 
                                        alt={`Evidencia de ${foto.label}`} 
                                        className="w-full h-32 rounded-lg object-cover cursor-zoom-in hover:scale-[1.02] transition-all shadow-sm mb-2"
                                        onClick={() => setLightboxImage(foto.url)}
                                    />
                                    <span className="text-xs font-semibold text-guinda-700 text-center">{foto.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Dibujo de observaciones */}
            {previewChecklist.dibujo && (
                <div className="mb-6 page-break-before">
                    <h5 className="mb-3 text-sm font-bold text-gray-800">Referencia Visual (Marcas)</h5>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2 max-w-2xl mx-auto overflow-hidden shadow-sm relative">
                        <img
                            src={`/images/${(previewChecklist.tipo_unidad || 'hero').toLowerCase()}.webp`}
                            alt="Blueprint"
                            className="w-full object-contain opacity-60"
                            style={{ aspectRatio: '5/3' }}
                            onError={(e) => { e.target.src = '/images/hero.webp'; }}
                        />
                        <img 
                            src={previewChecklist.dibujo} 
                            alt="Marcas visuales" 
                            className="absolute inset-0 w-full h-full object-contain mix-blend-multiply" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
"""

content = content.replace("export default function HistorialCheckList() {", component_code + "\nexport default function HistorialCheckList() {")

# 2. Add React Fragment and Accordion row
tr_start_target = 'return (\n                                            <tr key={c.id} className="border-b border-gray-50 transition hover:bg-gray-50/50">'
tr_start_replacement = 'return (\n                                            <React.Fragment key={c.id}>\n                                                <tr className="border-b border-gray-50 transition hover:bg-gray-50/50">'
content = content.replace(tr_start_target, tr_start_replacement)

button_target = '''<button
                                                            onClick={() => setPreviewId(c.id)}
                                                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-guinda-600 shadow-sm transition hover:bg-guinda-50 active:scale-95"
                                                            title="Ver Detalle"
                                                        >'''
button_replacement = '''<button
                                                            onClick={() => setPreviewId(previewId === c.id ? null : c.id)}
                                                            className={`inline-flex items-center justify-center rounded-lg border p-1.5 shadow-sm transition active:scale-95 ${previewId === c.id ? 'bg-guinda-700 text-white border-guinda-700' : 'border-gray-200 bg-white text-guinda-600 hover:bg-guinda-50'}`}
                                                            title={previewId === c.id ? "Ocultar Detalle" : "Ver Detalle"}
                                                        >'''
content = content.replace(button_target, button_replacement)

tr_end_target = '''                                                        </>
                                                    );
                                                })()}
                                            </tr>
                                        );'''
tr_end_replacement = '''                                                        </>
                                                    );
                                                })()}
                                            </tr>
                                            {previewId === c.id && (
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan="9" className="p-0 border-b border-gray-200">
                                                        <div className="p-4 sm:p-6 animate-in slide-in-from-top-2">
                                                            <ChecklistPreviewInline 
                                                                previewChecklist={c}
                                                                setPreviewId={setPreviewId}
                                                                setLightboxImage={setLightboxImage}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            </React.Fragment>
                                        );'''
content = content.replace(tr_end_target, tr_end_replacement)

# 3. Sticky header
sticky_target = '<tr className="border-b border-gray-100 bg-gray-50/80">'
sticky_replacement = '<tr className="border-b border-gray-100 bg-gray-50/80 sticky top-0 z-10 shadow-sm">'
content = content.replace(sticky_target, sticky_replacement)

with open('src/pages/CheckList/HistorialCheckList.jsx', 'w') as f:
    f.write(content)

print("Refactor complete.")
