import React,{useEffect,useState} from "react";
import {ShieldCheck,Users as UsersIcon} from "lucide-react";
import api,{getErrorMessage} from "../api";

const labels={admin:"Administrador",encargado:"Encargado",consulta:"Consulta"};

export default function Users(){
  const [users,setUsers]=useState([]);const [error,setError]=useState("");const [busy,setBusy]=useState("");
  const load=async()=>{const {data}=await api.get("/usuarios");setUsers(data);};
  useEffect(()=>{load().catch(e=>setError(getErrorMessage(e)));},[]);
  const changeRole=async(user,rol)=>{setBusy(user.id);setError("");try{await api.patch(`/usuarios/${user.id}/rol`,{rol});await load();}catch(e){setError(getErrorMessage(e));}finally{setBusy("");}};
  return <div className="page-stack">
    <div className="page-actions"><div><span className="section-kicker">CONTROL DE ACCESO</span><h2>Usuarios y permisos</h2><p>Asigna el nivel de acceso adecuado a cada cuenta.</p></div></div>
    {error&&<div className="notice error">{error}</div>}
    <div className="role-cards"><div><ShieldCheck/><strong>Administrador</strong><span>Control completo y gestión de roles.</span></div><div><UsersIcon/><strong>Encargado</strong><span>Gestión operativa de productos y movimientos.</span></div><div><UsersIcon/><strong>Consulta</strong><span>Acceso de lectura a inventario y reportes.</span></div></div>
    <section className="panel table-panel"><div className="panel-heading"><div><h3>Usuarios registrados</h3><p>Las cuentas nuevas comienzan con rol Consulta.</p></div><span className="panel-chip">{users.length} usuarios</span></div>
      <div className="table-scroll"><table><thead><tr><th>Usuario</th><th>Fecha de alta</th><th>Rol actual</th><th>Permisos</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><strong>{u.nombre||u.email}</strong><small className="table-sub">{u.email}</small></td><td>{new Date(u.created_at).toLocaleDateString()}</td><td><span className={`role-pill ${u.rol}`}>{labels[u.rol]}</span></td><td><select className="compact-select" disabled={busy===u.id} value={u.rol} onChange={e=>changeRole(u,e.target.value)}><option value="admin">Administrador</option><option value="encargado">Encargado</option><option value="consulta">Consulta</option></select></td></tr>)}</tbody></table>{!users.length&&<div className="empty-state">No hay usuarios registrados.</div>}</div>
    </section>
  </div>;
}
