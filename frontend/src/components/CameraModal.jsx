import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function CameraModal({ isOpen, onClose, onCapture, fallbackTrigger, galleryTrigger }) {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [devices, setDevices] = useState([]);
    const [activeDeviceId, setActiveDeviceId] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let activeStream = null;

        async function initCamera() {
            setLoading(true);
            setError(null);
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('not_supported');
                setLoading(false);
                return;
            }

            try {
                // Solicitar permiso de video (intentar environment primero, si no, cualquier video)
                let initialStream;
                try {
                    initialStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment' },
                        audio: false
                    });
                } catch (firstErr) {
                    console.warn("Could not start environment camera, trying generic video stream:", firstErr);
                    initialStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                }

                // Enumerar dispositivos de video
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
                setDevices(videoDevices);

                // Detener el stream inicial para no dejar la cámara activa
                initialStream.getTracks().forEach(t => t.stop());

                if (videoDevices.length === 0) {
                    throw new Error("No video input devices found.");
                }

                // Buscar una cámara trasera como predeterminada
                const backCam = videoDevices.find(d =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('trasera') ||
                    d.label.toLowerCase().includes('environment') ||
                    d.label.toLowerCase().includes('rear')
                );

                const targetDeviceId = backCam ? backCam.deviceId : (videoDevices[0]?.deviceId || '');
                setActiveDeviceId(targetDeviceId);

                // Iniciar stream con el dispositivo seleccionado
                let constraints;
                if (targetDeviceId) {
                    constraints = { video: { deviceId: { exact: targetDeviceId } }, audio: false };
                } else {
                    constraints = { video: true, audio: false };
                }

                let mediaStream;
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (streamErr) {
                    console.warn("Could not start stream with target device, trying generic video:", streamErr);
                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }

                activeStream = mediaStream;
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error al acceder a la cámara:", err);
                setError(err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' ? 'permission_denied' : 'generic_error');
            } finally {
                setLoading(false);
            }
        }

        initCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(t => t.stop());
            }
        };
    }, [isOpen]);

    const handleDeviceChange = async (deviceId) => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }
        setLoading(true);
        setError(null);
        try {
            let mediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: deviceId } },
                    audio: false
                });
            } catch (firstErr) {
                console.warn("Error using exact deviceId constraint, trying non-exact:", firstErr);
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: deviceId },
                    audio: false
                });
            }
            setStream(mediaStream);
            setActiveDeviceId(deviceId);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error al cambiar de cámara:", err);
            setError('generic_error');
        } finally {
            setLoading(false);
        }
    };

    const toggleCamera = () => {
        if (devices.length <= 1) return;
        const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
        const nextIndex = (currentIndex + 1) % devices.length;
        const nextDevice = devices[nextIndex];
        if (nextDevice) {
            handleDeviceChange(nextDevice.deviceId);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');

        // Ajustar dimensiones del canvas al tamaño real del video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUrl);
        handleClose();
    };

    const handleClose = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }
        setStream(null);
        setError(null);
        onClose();
    };

    const handleUseFallback = () => {
        fallbackTrigger();
        handleClose();
    };

    const handleUseGallery = () => {
        if (galleryTrigger) {
            galleryTrigger();
        }
        handleClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative flex h-full max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-gray-900 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-800 bg-gray-950 px-4 py-3 text-white">
                    <span className="text-sm font-bold uppercase tracking-wider">Cámara de Evidencia</span>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-850 hover:text-white transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                    </button>
                </div>

                {/* Viewport de Video */}
                <div className="relative flex flex-1 items-center justify-center bg-black">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black text-white">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-guinda-500 border-t-transparent" />
                            <span className="mt-2 text-xs font-semibold text-gray-400">Iniciando cámara...</span>
                        </div>
                    )}

                    {error ? (
                        <div className="flex flex-col items-center p-6 text-center text-white">
                            <svg className="h-12 w-12 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h4 className="text-base font-bold">
                                {error === 'permission_denied' 
                                    ? 'Permiso Denegado' 
                                    : error === 'not_supported'
                                    ? 'Cámara No Soportada'
                                    : 'Error al Iniciar Cámara'}
                            </h4>
                            <p className="mt-1.5 text-xs text-gray-400 max-w-xs">
                                {error === 'permission_denied'
                                    ? 'No se otorgaron permisos para acceder a la cámara. Puedes tomar la foto usando la cámara nativa del dispositivo o subir una imagen.'
                                    : error === 'not_supported'
                                    ? 'La API de cámara no está disponible en este navegador o protocolo. Por favor, usa HTTPS o sube una imagen desde tu dispositivo.'
                                    : 'No se pudo activar el flujo de video en vivo. Por favor, usa la cámara nativa o sube una imagen.'}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleUseFallback}
                                    className="cursor-pointer rounded-xl bg-guinda-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-guinda-800 transition"
                                >
                                    Usar Cámara Nativa
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUseGallery}
                                    className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs font-bold text-gray-300 hover:text-white transition"
                                >
                                    Subir Imagen (Galería)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="h-full w-full object-cover"
                            />
                            {/* Botón flotante para voltear cámara */}
                            {!loading && devices.length > 1 && (
                                <button
                                    type="button"
                                    onClick={toggleCamera}
                                    className="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/85 active:scale-90"
                                    title="Voltear Cámara"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                {!error && (
                    <div className="flex flex-col gap-3 bg-gray-950 px-4 py-4">
                        {/* Selector de cámara si hay múltiples */}
                        {devices.length > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cambiar Cámara:</span>
                                <select
                                    value={activeDeviceId}
                                    onChange={(e) => handleDeviceChange(e.target.value)}
                                    className="rounded-lg border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-guinda-500"
                                >
                                    {devices.map((device, idx) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Cámara ${idx + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Controles principales */}
                        <div className="flex items-center justify-between gap-4">
                            <button
                                type="button"
                                onClick={handleUseGallery}
                                className="flex flex-1 flex-col items-center justify-center rounded-xl border border-gray-850 bg-gray-900/60 py-2 text-xs font-bold text-gray-400 hover:text-white hover:border-gray-700 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 mb-1 text-gray-300">
                                    <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm3.72 6.72a.75.75 0 0 1 1.06 0L8 14.25l2.22-2.22a.75.75 0 0 1 1.06 0L14.25 15h2.5a.75.75 0 0 0 .75-.75V5.25a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75v9c0 .414.336.75.75.75h1l1.47-1.47ZM12 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clipRule="evenodd" />
                                </svg>
                                Subir Imagen
                            </button>

                            <button
                                type="button"
                                onClick={capturePhoto}
                                disabled={loading}
                                className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white transition hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg"
                                title="Capturar Foto"
                            >
                                <span className="h-11 w-11 rounded-full border border-gray-300 bg-white" />
                            </button>

                            <button
                                type="button"
                                onClick={handleUseFallback}
                                className="flex flex-1 flex-col items-center justify-center rounded-xl border border-gray-850 bg-gray-900/60 py-2 text-xs font-bold text-gray-400 hover:text-white hover:border-gray-700 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 mb-1 text-gray-300">
                                    <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                                </svg>
                                Cámara Nativa
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
