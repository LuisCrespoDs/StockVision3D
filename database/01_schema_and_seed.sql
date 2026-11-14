-- STOCKVISION 3D - MIGRACION PARA EL PROYECTO SUPABASE EXISTENTE
-- Conserva productos, ubicaciones y movimientos. No elimina tablas.

BEGIN;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS stock_minimo INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.ubicaciones
  ADD COLUMN IF NOT EXISTS columna SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS capacidad_unidades INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS zona VARCHAR(30) NOT NULL DEFAULT 'ALMACEN',
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS referencia VARCHAR(80),
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_movimientos_fecha ON public.movimientos(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS ix_movimientos_producto_fecha ON public.movimientos(id_producto, fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS ix_movimientos_ubicacion ON public.movimientos(id_ubicacion);
CREATE INDEX IF NOT EXISTS ix_movimientos_registrado_por ON public.movimientos(registrado_por);
CREATE INDEX IF NOT EXISTS ix_productos_categoria ON public.productos(categoria);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='productos_stock_minimo_nonnegative' AND conrelid='public.productos'::regclass) THEN
    ALTER TABLE public.productos ADD CONSTRAINT productos_stock_minimo_nonnegative CHECK(stock_minimo >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ubicaciones_capacidad_positive' AND conrelid='public.ubicaciones'::regclass) THEN
    ALTER TABLE public.ubicaciones ADD CONSTRAINT ubicaciones_capacidad_positive CHECK(capacidad_unidades > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ubicaciones_columna_positive' AND conrelid='public.ubicaciones'::regclass) THEN
    ALTER TABLE public.ubicaciones ADD CONSTRAINT ubicaciones_columna_positive CHECK(columna > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.inventario (
  id_inventario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_producto BIGINT NOT NULL REFERENCES public.productos(id_producto) ON DELETE RESTRICT,
  id_ubicacion BIGINT NOT NULL REFERENCES public.ubicaciones(id_ubicacion) ON DELETE RESTRICT,
  cantidad_actual INTEGER NOT NULL DEFAULT 0 CHECK(cantidad_actual >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventario_producto_ubicacion UNIQUE(id_producto,id_ubicacion)
);
CREATE INDEX IF NOT EXISTS ix_inventario_ubicacion ON public.inventario(id_ubicacion);

CREATE TABLE IF NOT EXISTS public.perfiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  rol VARCHAR(20) NOT NULL DEFAULT 'consulta'
    CHECK(rol IN ('admin','encargado','consulta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.stockvision_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.perfiles(user_id,email,nombre,rol)
  VALUES(NEW.id,COALESCE(NEW.email,''),COALESCE(NEW.raw_user_meta_data->>'full_name',split_part(COALESCE(NEW.email,''),'@',1)),'consulta')
  ON CONFLICT(user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stockvision_on_auth_user_created ON auth.users;
CREATE TRIGGER stockvision_on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.stockvision_handle_new_user();

INSERT INTO public.perfiles(user_id,email,nombre,rol)
SELECT u.id,COALESCE(u.email,''),COALESCE(u.raw_user_meta_data->>'full_name',split_part(COALESCE(u.email,''),'@',1)),'consulta'
FROM auth.users u ON CONFLICT(user_id) DO NOTHING;


CREATE OR REPLACE FUNCTION public.stockvision_validate_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_stock INTEGER;
  v_capacity INTEGER;
  v_total INTEGER;
BEGIN
  IF NEW.cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero.' USING ERRCODE='23514';
  END IF;

  PERFORM 1 FROM public.productos
   WHERE id_producto=NEW.id_producto AND activo=TRUE
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCTO_INACTIVO: el producto no existe o está desactivado.' USING ERRCODE='P0001';
  END IF;

  -- Bloquea la ubicación durante la validación para serializar operaciones
  -- que afectan su capacidad total.
  SELECT capacidad_unidades INTO v_capacity
    FROM public.ubicaciones
   WHERE id_ubicacion=NEW.id_ubicacion AND activo=TRUE
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'UBICACION_INACTIVA: la ubicación no existe o está desactivada.' USING ERRCODE='P0001';
  END IF;

  IF NEW.tipo='ENTRADA' THEN
    SELECT COALESCE(SUM(cantidad_actual),0)::INTEGER INTO v_total
      FROM public.inventario
     WHERE id_ubicacion=NEW.id_ubicacion;
    IF v_total + NEW.cantidad > v_capacity THEN
      RAISE EXCEPTION 'CAPACIDAD_EXCEDIDA: capacidad %, ocupación actual %, entrada solicitada %.',
        v_capacity, v_total, NEW.cantidad USING ERRCODE='P0001';
    END IF;
  ELSIF NEW.tipo='SALIDA' THEN
    SELECT cantidad_actual INTO v_stock
      FROM public.inventario
     WHERE id_producto=NEW.id_producto
       AND id_ubicacion=NEW.id_ubicacion
     FOR UPDATE;
    IF NOT FOUND OR v_stock IS NULL THEN
      RAISE EXCEPTION 'STOCK_INSUFICIENTE: no existen unidades disponibles en esa ubicación.' USING ERRCODE='P0001';
    END IF;
    IF v_stock < NEW.cantidad THEN
      RAISE EXCEPTION 'STOCK_INSUFICIENTE: disponible %, solicitado %.',v_stock,NEW.cantidad USING ERRCODE='P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.stockvision_apply_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo='ENTRADA' THEN
    INSERT INTO public.inventario(id_producto,id_ubicacion,cantidad_actual,updated_at)
    VALUES(NEW.id_producto,NEW.id_ubicacion,NEW.cantidad,NOW())
    ON CONFLICT(id_producto,id_ubicacion)
    DO UPDATE SET
      cantidad_actual=public.inventario.cantidad_actual+EXCLUDED.cantidad_actual,
      updated_at=NOW();
  ELSE
    UPDATE public.inventario
       SET cantidad_actual=cantidad_actual-NEW.cantidad,
           updated_at=NOW()
     WHERE id_producto=NEW.id_producto
       AND id_ubicacion=NEW.id_ubicacion;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stockvision_before_movement ON public.movimientos;
CREATE TRIGGER stockvision_before_movement BEFORE INSERT ON public.movimientos
FOR EACH ROW EXECUTE FUNCTION public.stockvision_validate_movement();
DROP TRIGGER IF EXISTS stockvision_after_movement ON public.movimientos;
CREATE TRIGGER stockvision_after_movement AFTER INSERT ON public.movimientos
FOR EACH ROW EXECUTE FUNCTION public.stockvision_apply_movement();

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.perfiles;
CREATE POLICY "Users can read their own profile" ON public.perfiles
FOR SELECT TO authenticated USING(auth.uid()=user_id);

-- Datos sintéticos para demostración.
INSERT INTO public.productos(sku,nombre,categoria,precio_referencia,activo,descripcion,stock_minimo)
VALUES
('TEC-LAP-001','Laptop empresarial 14 pulgadas','Computadoras',6850,TRUE,'Equipo portátil para trabajo y productividad.',4),
('TEC-LAP-002','Laptop profesional 15 pulgadas','Computadoras',8290,TRUE,'Equipo portátil de alto rendimiento.',3),
('TEC-MON-001','Monitor LED 24 pulgadas','Monitores',1120,TRUE,'Monitor Full HD para estación de trabajo.',5),
('TEC-MON-002','Monitor LED 27 pulgadas','Monitores',1890,TRUE,'Monitor de 27 pulgadas.',3),
('TEC-KEY-001','Teclado mecánico USB','Periféricos',340,TRUE,'Teclado mecánico para escritorio.',8),
('TEC-MOU-001','Mouse óptico inalámbrico','Periféricos',95,TRUE,'Mouse inalámbrico con receptor USB.',10),
('TEC-ROU-001','Router Wi-Fi doble banda','Redes',460,TRUE,'Router para conectividad inalámbrica.',5),
('TEC-SWI-001','Switch de red 24 puertos','Redes',1350,TRUE,'Switch Ethernet para distribución de red.',2),
('TEC-SSD-001','SSD 1 TB NVMe','Componentes',720,TRUE,'Unidad de estado sólido NVMe.',6),
('TEC-RAM-001','Memoria RAM 16 GB DDR4','Componentes',390,TRUE,'Módulo de memoria DDR4.',6),
('TEC-UPS-001','UPS 1200 VA','Energía',980,TRUE,'Sistema de alimentación ininterrumpida.',2),
('TEC-HEA-001','Auriculares USB con micrófono','Periféricos',215,TRUE,'Auriculares para comunicación.',7)
ON CONFLICT(sku) DO NOTHING;

DO $$
DECLARE r INTEGER; n INTEGER; c INTEGER; rack_code TEXT; loc_code TEXT;
BEGIN
  FOR r IN 1..4 LOOP
    rack_code := 'E'||LPAD(r::TEXT,2,'0');
    FOR n IN 1..3 LOOP
      FOR c IN 1..4 LOOP
        loc_code := 'A-'||rack_code||'-N'||n::TEXT||'-C'||LPAD(c::TEXT,2,'0');
        INSERT INTO public.ubicaciones(codigo,pasillo,estanteria,nivel,columna,capacidad_unidades,zona,activo)
        VALUES(loc_code,'A',rack_code,n,c,50,'ALMACEN',TRUE)
        ON CONFLICT(codigo) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.movimientos WHERE observacion LIKE 'DEMO: Stock inicial%') THEN
    INSERT INTO public.movimientos(id_producto,id_ubicacion,tipo,cantidad,observacion,referencia)
    SELECT p.id_producto,u.id_ubicacion,'ENTRADA',v.cantidad,'DEMO: Stock inicial de demostración','DEMO-STOCK-INITIAL'
    FROM (VALUES
      ('TEC-LAP-001','A-E01-N1-C01',8),('TEC-LAP-002','A-E01-N2-C01',5),
      ('TEC-MON-001','A-E02-N1-C01',14),('TEC-MON-002','A-E02-N2-C01',7),
      ('TEC-KEY-001','A-E03-N1-C01',24),('TEC-MOU-001','A-E03-N2-C01',7),
      ('TEC-ROU-001','A-E04-N1-C01',11),('TEC-SWI-001','A-E04-N2-C01',1),
      ('TEC-SSD-001','A-E01-N3-C01',18),('TEC-RAM-001','A-E02-N3-C01',20),
      ('TEC-UPS-001','A-E03-N3-C01',6),('TEC-HEA-001','A-E04-N3-C01',16)
    ) AS v(sku,codigo,cantidad)
    JOIN public.productos p ON p.sku=v.sku
    JOIN public.ubicaciones u ON u.codigo=v.codigo;
  END IF;
END $$;

COMMIT;

-- Verificación:
-- SELECT COUNT(*) FROM public.productos;
-- SELECT COUNT(*) FROM public.ubicaciones;
-- SELECT COUNT(*) FROM public.movimientos;
-- SELECT * FROM public.inventario ORDER BY id_producto;
