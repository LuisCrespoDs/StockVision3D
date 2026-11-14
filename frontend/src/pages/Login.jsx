import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Boxes, LockKeyhole, Mail, UserRound } from "lucide-react";
import { supabase } from "../supabase";

export default function Login() {
  const navigate = useNavigate();
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const submit=async event=>{
    event.preventDefault();setMessage("");setError("");setBusy(true);
    try {
      if(mode==="login"){
        const {error:authError}=await supabase.auth.signInWithPassword({email,password});
        if(authError) throw authError;
        navigate("/");
      } else {
        const {data,error:authError}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
        if(authError) throw authError;
        if(!data.session) setMessage("Cuenta creada. Si Supabase solicita confirmación, revisa tu correo antes de iniciar sesión.");
        else { setMessage("Cuenta creada. Tu perfil comienza con rol Consulta; un administrador puede asignarte otro rol."); navigate("/"); }
      }
    } catch(e){setError(e.message||"No se pudo completar la operación.");}
    finally{setBusy(false);}
  };

  return (
    <div className="login-screen">
      <div className="login-visual">
        <div className="login-visual-grid"/>
        <div className="login-visual-content">
          <div className="brand-mark large">SV</div>
          <span className="login-kicker">SMART INVENTORY EXPERIENCE</span>
          <h1>El inventario,<br/><em>en otra dimensión.</em></h1>
          <p>Controla productos, movimientos y ubicaciones desde una plataforma con visualización tridimensional del almacén.</p>
          <div className="login-feature-row"><span><Boxes size={17}/> Almacén 3D</span><span><Activity size={17}/> Stock actualizado</span></div>
        </div>
        <div className="login-visual-footer">STOCKVISION 3D · INVENTORY MANAGEMENT</div>
      </div>
      <div className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-mobile-brand"><div className="brand-mark">SV</div><strong>StockVision 3D</strong></div>
          <div className="form-kicker">{mode==="login"?"BIENVENIDO DE NUEVO":"NUEVA CUENTA"}</div>
          <h2>{mode==="login"?"Iniciar sesión":"Crear una cuenta"}</h2>
          <p className="muted">{mode==="login"?"Ingresa tus credenciales para acceder al almacén.":"Regístrate. Tu cuenta comenzará con permisos de consulta."}</p>
          <form onSubmit={submit} className="login-form">
            {mode==="signup"&&<label>Nombre completo<div className="input-icon"><UserRound size={17}/><input value={name} onChange={e=>setName(e.target.value)} required placeholder="Tu nombre"/></div></label>}
            <label>Correo electrónico<div className="input-icon"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="nombre@empresa.com"/></div></label>
            <label>Contraseña<div className="input-icon"><LockKeyhole size={17}/><input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Mínimo 8 caracteres"/></div></label>
            {error&&<div className="notice error">{error}</div>}
            {message&&<div className="notice success">{message}</div>}
            <button className="button primary full" disabled={busy}>{busy?"Procesando...":mode==="login"?"Entrar al sistema":"Crear cuenta"}</button>
          </form>
          <div className="login-switch">{mode==="login"?"¿Aún no tienes cuenta?":"¿Ya tienes una cuenta?"} <button onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");setMessage("");}}>{mode==="login"?"Regístrate":"Inicia sesión"}</button></div>
          <div className="login-security"><LockKeyhole size={14}/> Acceso protegido mediante Supabase Auth</div>
        </div>
      </div>
    </div>
  );
}
