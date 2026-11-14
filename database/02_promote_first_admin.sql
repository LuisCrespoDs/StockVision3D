UPDATE public.perfiles
SET rol='admin', updated_at=NOW()
WHERE user_id=(SELECT id FROM auth.users
WHERE lower(email)=lower('TU_CORREO_DE_REGISTRO@ejemplo.com'));

SELECT user_id,email,nombre,rol
FROM public.perfiles
WHERE lower(email)=lower('TU_CORREO_DE_REGISTRO@ejemplo.com');