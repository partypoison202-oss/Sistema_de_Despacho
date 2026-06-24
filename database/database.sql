-- Info. Basica

CREATE TABLE transportes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE unidades (
    id SERIAL PRIMARY KEY,
    transporte_id INTEGER NOT NULL,
    numero_eco VARCHAR(20) NOT NULL UNIQUE,

    CONSTRAINT fk_unidad_transporte
    FOREIGN KEY (transporte_id)
    REFERENCES transportes(id)
);

-- Formulario

CREATE TABLE secciones_unidad (
    id SERIAL PRIMARY KEY,

    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE componentes (
    id SERIAL PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE seccion_componente (
    id SERIAL PRIMARY KEY,

    seccion_id INTEGER NOT NULL,

    componente_id INTEGER NOT NULL,

    tipo_formulario VARCHAR(20) NOT NULL DEFAULT 'TITAN',

    CONSTRAINT fk_sc_seccion
    FOREIGN KEY (seccion_id)
    REFERENCES secciones_unidad(id),

    CONSTRAINT fk_sc_componente
    FOREIGN KEY (componente_id)
    REFERENCES componentes(id),

    UNIQUE(seccion_id, componente_id, tipo_formulario)
);

CREATE TABLE estados_componente (
    id SERIAL PRIMARY KEY,

    nombre VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE inspecciones (

    id SERIAL PRIMARY KEY,

    unidad_id INTEGER NOT NULL,

    fecha_inspeccion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    nombre_conductor VARCHAR(150) NOT NULL,

    ruta VARCHAR(50) NOT NULL,

    kilometraje INTEGER,

    observaciones_generales TEXT,

    CONSTRAINT fk_inspeccion_unidad
    FOREIGN KEY (unidad_id)
    REFERENCES unidades(id)
);

CREATE TABLE detalle_inspeccion (

    id SERIAL PRIMARY KEY,

    inspeccion_id INTEGER NOT NULL,

    seccion_id INTEGER NOT NULL,

    componente_id INTEGER NOT NULL,

    estado_id INTEGER NOT NULL,

    observacion TEXT,

    CONSTRAINT fk_detalle_inspeccion
    FOREIGN KEY (inspeccion_id)
    REFERENCES inspecciones(id),

    CONSTRAINT fk_detalle_seccion
    FOREIGN KEY (seccion_id)
    REFERENCES secciones_unidad(id),

    CONSTRAINT fk_detalle_componente
    FOREIGN KEY (componente_id)
    REFERENCES componentes(id),

    CONSTRAINT fk_detalle_estado
    FOREIGN KEY (estado_id)
    REFERENCES estados_componente(id)
);

-- Archivo Excel

CREATE TABLE informacion_operativa (
    id SERIAL PRIMARY KEY,

    unidad_id INTEGER NOT NULL,

    ruta VARCHAR(20),

    numero_tarjeton VARCHAR(20),

    nombre_conductor VARCHAR(200),
    
    tipo VARCHAR(50),  
    estatus VARCHAR(20),

    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_info_operativa_unidad
    FOREIGN KEY (unidad_id)
    REFERENCES unidades(id)
);

-- Inserciones

INSERT INTO transportes (nombre)
VALUES
('URBANUSS'),
('ZAFIRO'),
('BAGONETA'),
('ORION');

INSERT INTO unidades (transporte_id, numero_eco) VALUES
(1,'001'),(1,'002'),(1,'003'),(1,'004'),(1,'005'),
(1,'006'),(1,'007'),(1,'008'),(1,'009'),(1,'010'),
(1,'011'),(1,'012'),(1,'013'),(1,'014'),(1,'015'),
(1,'016'),(1,'017'),(1,'018'),(1,'019'),(1,'020'),
(1,'021'),(1,'022'),(1,'023'),(1,'024'),(1,'025'),
(1,'026'),(1,'027'),(1,'028'),(1,'029'),(1,'030'),
(1,'031'),(1,'032'),(1,'033'),(1,'034'),(1,'035'),
(1,'036'),(1,'037'),(1,'038'),(1,'039'),(1,'040'),
(1,'041'),(1,'042'),

(2,'100'),(2,'101'),(2,'102'),(2,'103'),(2,'104'),
(2,'105'),(2,'106'),(2,'107'),(2,'108'),(2,'109'),
(2,'110'),(2,'111'),(2,'112'),(2,'113'),(2,'114'),
(2,'115'),(2,'116'),(2,'117'),(2,'118'),(2,'119'),
(2,'120'),(2,'121'),(2,'122'),(2,'123'),(2,'124'),
(2,'125'),(2,'126'),(2,'127'),(2,'128'),(2,'129'),
(2,'130'),(2,'131'),(2,'132'),(2,'133'),(2,'134'),
(2,'135'),(2,'136'),(2,'137')

(4,'107'),(4,'110'),(4,'105'),(4,'408'),(4,'403'),
(4,'137'),(4,'401');

INSERT INTO secciones_unidad (nombre)
VALUES
('Frente'),
('Trasera'),
('Costado Izquierdo'),
('Costado Derecho');

-- Componentes generales (usados por TITAN y/o ENCIERRO)
INSERT INTO componentes (nombre)
VALUES
('Carrocería exterior'),
('Pintura y gráfica'),
('Parabrisas y cristales'),
('Luces exteriores'),
('Puertas'),
('Llantas'),
('Rines'),
('Retrovisores'),
('Interior y limpieza'),
('Asientos'),
('Extintor y seguridad'),
('Documentación');

-- Componentes exclusivos de formulario ENCIERRO
INSERT INTO componentes (nombre)
VALUES
('Mobitec'),
('Torreta'),
('Pintura y vinil'),
('Tecnología'),
('Alerta en tablero');

INSERT INTO estados_componente (nombre)
VALUES
('Ok'),
('NO Ok'),
('N/A');

-- Tablas de usuarios
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

INSERT INTO roles (codigo, nombre, descripcion)
VALUES
('ADMINISTRADOR', 'Administrador', 'Control total del sistema'),
('CAPTURISTA', 'Capturista', 'Carga y edición de Excel'),
('CENTRO_CONTROL', 'Centro de Control', 'Monitoreo y dashboard'),
('TITAN', 'Titan', 'Reportes e inspecciones'),
('ENCIERRO', 'Encierro', 'Reportes e inspecciones');

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    correo VARCHAR(150) UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    rol_id INTEGER NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_roles
        FOREIGN KEY (rol_id)
        REFERENCES roles(id)
);

-- ============================================================
-- MAPEO DE COMPONENTES POR SECCIÓN Y TIPO DE FORMULARIO
-- ============================================================
-- Referencia de IDs de secciones:
--   1 = Frente | 2 = Trasera | 3 = Costado Izquierdo | 4 = Costado Derecho
-- Referencia de IDs de componentes (GENERALES):
--   1=Carrocería exterior | 2=Pintura y gráfica | 3=Parabrisas y cristales
--   4=Luces exteriores | 5=Puertas | 6=Llantas | 7=Rines | 8=Retrovisores
--   9=Interior y limpieza | 10=Asientos | 11=Extintor y seguridad | 12=Documentación
-- Referencia de IDs de componentes (ENCIERRO):
--   13=Mobitec | 14=Torreta | 15=Pintura y vinil | 16=Tecnología | 17=Alerta en tablero

-- *** TITAN: Frente ***
INSERT INTO seccion_componente (seccion_id, componente_id, tipo_formulario) VALUES
(1, 1,  'TITAN'),  -- Carrocería exterior
(1, 2,  'TITAN'),  -- Pintura y gráfica
(1, 3,  'TITAN'),  -- Parabrisas y cristales
(1, 4,  'TITAN'),  -- Luces exteriores
(1, 5,  'TITAN'),  -- Puertas
(1, 6,  'TITAN'),  -- Llantas
(1, 7,  'TITAN'),  -- Rines
(1, 8,  'TITAN'),  -- Retrovisores
(1, 9,  'TITAN'),  -- Interior y limpieza
(1, 10, 'TITAN'),  -- Asientos
(1, 11, 'TITAN'),  -- Extintor y seguridad
(1, 12, 'TITAN');  -- Documentación

-- *** TITAN: Trasera ***
INSERT INTO seccion_componente (seccion_id, componente_id, tipo_formulario) VALUES
(2, 1,  'TITAN'),  -- Carrocería exterior
(2, 2,  'TITAN'),  -- Pintura y gráfica
(2, 3,  'TITAN'),  -- Parabrisas y cristales
(2, 4,  'TITAN'),  -- Luces exteriores
(2, 5,  'TITAN'),  -- Puertas
(2, 6,  'TITAN'),  -- Llantas
(2, 7,  'TITAN'),  -- Rines
(2, 9,  'TITAN'),  -- Interior y limpieza
(2, 10, 'TITAN'),  -- Asientos
(2, 11, 'TITAN'),  -- Extintor y seguridad
(2, 12, 'TITAN');  -- Documentación

-- *** TITAN: Costado Izquierdo ***
INSERT INTO seccion_componente (seccion_id, componente_id, tipo_formulario) VALUES
(3, 1,  'TITAN'),  -- Carrocería exterior
(3, 2,  'TITAN'),  -- Pintura y gráfica
(3, 3,  'TITAN'),  -- Parabrisas y cristales
(3, 4,  'TITAN'),  -- Luces exteriores
(3, 5,  'TITAN'),  -- Puertas
(3, 6,  'TITAN'),  -- Llantas
(3, 7,  'TITAN'),  -- Rines
(3, 8,  'TITAN'),  -- Retrovisores
(3, 9,  'TITAN'),  -- Interior y limpieza
(3, 10, 'TITAN'),  -- Asientos
(3, 11, 'TITAN'),  -- Extintor y seguridad
(3, 12, 'TITAN');  -- Documentación

-- *** TITAN: Costado Derecho ***
INSERT INTO seccion_componente (seccion_id, componente_id, tipo_formulario) VALUES
(4, 1,  'TITAN'),  -- Carrocería exterior
(4, 2,  'TITAN'),  -- Pintura y gráfica
(4, 3,  'TITAN'),  -- Parabrisas y cristales
(4, 4,  'TITAN'),  -- Luces exteriores
(4, 5,  'TITAN'),  -- Puertas
(4, 6,  'TITAN'),  -- Llantas
(4, 7,  'TITAN'),  -- Rines
(4, 9,  'TITAN'),  -- Interior y limpieza
(4, 10, 'TITAN'),  -- Asientos
(4, 11, 'TITAN'),  -- Extintor y seguridad
(4, 12, 'TITAN');  -- Documentación

-- *** ENCIERRO: Frente (todos los 16 componentes) ***
INSERT INTO seccion_componente (seccion_id, componente_id, tipo_formulario) VALUES
(1, 1,  'ENCIERRO'),  -- Carrocería exterior
(1, 13, 'ENCIERRO'),  -- Mobitec
(1, 14, 'ENCIERRO'),  -- Torreta
(1, 15, 'ENCIERRO'),  -- Pintura y vinil
(1, 3,  'ENCIERRO'),  -- Parabrisas y cristales
(1, 4,  'ENCIERRO'),  -- Luces exteriores
(1, 5,  'ENCIERRO'),  -- Puertas
(1, 6,  'ENCIERRO'),  -- Llantas
(1, 7,  'ENCIERRO'),  -- Rines
(1, 8,  'ENCIERRO'),  -- Retrovisores
(1, 9,  'ENCIERRO'),  -- Interior y limpieza (Limpieza)
(1, 10, 'ENCIERRO'),  -- Asientos
(1, 11, 'ENCIERRO'),  -- Extintor y seguridad
(1, 12, 'ENCIERRO'),  -- Documentación
(1, 16, 'ENCIERRO'),  -- Tecnología
(1, 17, 'ENCIERRO');  -- Alerta en tablero

-- *** ENCIERRO: Trasera (sin Mobitec, Torreta ni Retrovisores) ***
INSERT INTO seccion_componente (seccion_id, componente_id, tipo_formulario) VALUES
(2, 1,  'ENCIERRO'),  -- Carrocería exterior
(2, 15, 'ENCIERRO'),  -- Pintura y vinil
(2, 3,  'ENCIERRO'),  -- Parabrisas y cristales
(2, 4,  'ENCIERRO'),  -- Luces exteriores
(2, 5,  'ENCIERRO'),  -- Puertas
(2, 6,  'ENCIERRO'),  -- Llantas
(2, 7,  'ENCIERRO'),  -- Rines
(2, 9,  'ENCIERRO'),  -- Interior y limpieza
(2, 10, 'ENCIERRO'),  -- Asientos
(2, 11, 'ENCIERRO'),  -- Extintor y seguridad
(2, 12, 'ENCIERRO'),  -- Documentación
(2, 16, 'ENCIERRO'),  -- Tecnología
(2, 17, 'ENCIERRO');  -- Alerta en tablero

-- *** ENCIERRO: Costado Izquierdo (sin Mobitec y Torreta, con Retrovisores) ***
INSERT INTO seccion_componente (seccion_id, componente_id, tipo_formulario) VALUES
(3, 1,  'ENCIERRO'),  -- Carrocería exterior
(3, 15, 'ENCIERRO'),  -- Pintura y vinil
(3, 3,  'ENCIERRO'),  -- Parabrisas y cristales
(3, 4,  'ENCIERRO'),  -- Luces exteriores
(3, 5,  'ENCIERRO'),  -- Puertas
(3, 6,  'ENCIERRO'),  -- Llantas
(3, 7,  'ENCIERRO'),  -- Rines
(3, 8,  'ENCIERRO'),  -- Retrovisores
(3, 9,  'ENCIERRO'),  -- Interior y limpieza
(3, 10, 'ENCIERRO'),  -- Asientos
(3, 11, 'ENCIERRO'),  -- Extintor y seguridad
(3, 12, 'ENCIERRO'),  -- Documentación
(3, 16, 'ENCIERRO'),  -- Tecnología
(3, 17, 'ENCIERRO');  -- Alerta en tablero

-- *** ENCIERRO: Costado Derecho (sin Mobitec, Torreta ni Retrovisores) ***
INSERT INTO seccion_componente (seccion_id, componente_id, tipo_formulario) VALUES
(4, 1,  'ENCIERRO'),  -- Carrocería exterior
(4, 15, 'ENCIERRO'),  -- Pintura y vinil
(4, 3,  'ENCIERRO'),  -- Parabrisas y cristales
(4, 4,  'ENCIERRO'),  -- Luces exteriores
(4, 5,  'ENCIERRO'),  -- Puertas
(4, 6,  'ENCIERRO'),  -- Llantas
(4, 7,  'ENCIERRO'),  -- Rines
(4, 9,  'ENCIERRO'),  -- Interior y limpieza
(4, 10, 'ENCIERRO'),  -- Asientos
(4, 11, 'ENCIERRO'),  -- Extintor y seguridad
(4, 12, 'ENCIERRO'),  -- Documentación
(4, 16, 'ENCIERRO'),  -- Tecnología
(4, 17, 'ENCIERRO');  -- Alerta en tablero