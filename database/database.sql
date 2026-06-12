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

    CONSTRAINT fk_sc_seccion
    FOREIGN KEY (seccion_id)
    REFERENCES secciones_unidad(id),

    CONSTRAINT fk_sc_componente
    FOREIGN KEY (componente_id)
    REFERENCES componentes(id),

    UNIQUE(seccion_id, componente_id)
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
('BAGONETA');

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
(2,'135'),(2,'136'),(2,'137');

INSERT INTO secciones_unidad (nombre)
VALUES
('Frente'),
('Trasera'),
('Costado Izquierdo'),
('Costado Derecho');

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

INSERT INTO estados_componente (nombre)
VALUES
('Ok'),
('NO Ok'),
('N/A');