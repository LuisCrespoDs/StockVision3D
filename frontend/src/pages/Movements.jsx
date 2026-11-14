import React,{useEffect,useState} from "react";
import {ArrowDownLeft,ArrowUpRight,Plus,RefreshCw} from "lucide-react";
import api,{getErrorMessage} from "../api";
import {useAuth} from "../AuthContext";

export default function Movements(){
  const {profile}=useAuth();const canEdit=["admin","encargado"].includes(profile?.rol);
  const [products,setProducts]=useState([]);const [locations,setLocations]=useState([]);const [items,setItems]=useState([]);
  const [form,setForm]=useState({id_producto:"",id_ubicacion:"",tipo:"ENTRADA",cantidad:1,observacion:"",referencia:""});
  const [error,setError]=useState("");const [success,setSuccess]=useState("");const [busy,setBusy]=useState(false);
  const load=async()=>{const [p,l,m]=await Promise.all([api.get("/productos"),api.get("/ubicaciones"),api.get("/movimientos?limit=150")]);setProducts(p.data.filter(x=>x.activo));setLocations(l.data.filter(x=>x.activo));setItems(m.data);};
  useEffect(()=>{load().catch(e=>setError(getErrorMessage(e)));},[]);
  const submit=async e=>{e.preventDefault();setBusy(true);setError("");setSuccess("");try{await api.post("/movimientos",{...form,id_producto:Number(form.id_producto),id_ubicacion:Number(form.id_ubicacion),cantidad:Number(form.cantidad)});setSuccess("Movimiento registrado. Las existencias se actualizaron.");setForm({...form,cantidad:1,observacion:"",referencia:""});await load();}catch(e){setError(getErrorMessage(e));}finally{setBusy(false);}};
  return <div className="page-stack">
    <div className="page-actions"><div><span className="section-kicker">TRAZABILIDAD</span><h2>Entradas y salidas</h2><p>Todo movimiento modifica el inventario mediante una transacción validada.</p></div><button className="button secondary" onClick={()=>load().catch(e=>setError(getErrorMessage(e)))}><RefreshCw size={16}/> Actualizar</button></div>
    {error&&<div className="notice error">{error}</div>}{success&&<div className="notice success">{success}</div>}
    <div className="movement-layout">
      {canEdit&&<section className="panel movement-form-panel"><div className="panel-heading"><div><h3><Plus size={17}/> Registrar movimiento</h3><p>Completa los datos de la operación.</p></div></div>
        <form className="form-grid one-column" onSubmit={submit}>
          <label>Tipo de movimiento<select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}><option value="ENTRADA">ENTRADA · Ingreso al almacén</option><option value="SALIDA">SALIDA · Despacho</option></select></label>
          <label>Producto<select required value={form.id_producto} onChange={e=>setForm({...form,id_producto:e.target.value})}><option value="">Seleccionar producto</option>{products.map(p=><option key={p.id_producto} value={p.id_producto}>{p.sku} · {p.nombre} (stock {p.stock_actual})</option>)}</select></label>
          <label>Ubicación<select required value={form.id_ubicacion} onChange={e=>setForm({...form,id_ubicacion:e.target.value})}><option value="">Seleccionar ubicación</option>{locations.map(l=><option key={l.id_ubicacion} value={l.id_ubicacion}>{l.codigo} · stock {l.stock_actual}</option>)}</select></label>
          <label>Cantidad<input type="number" min="1" step="1" required value={form.cantidad} onChange={e=>setForm({...form,cantidad:e.target.value})}/></label>
          <label>Referencia (opcional)<input value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})} placeholder="OC-0001 / REM-0001"/></label>
          <label>Observación<textarea rows="3" value={form.observacion} onChange={e=>setForm({...form,observacion:e.target.value})} placeholder="Detalle de la operación..."/></label>
          <button className="button primary full" disabled={busy}>{busy?"Registrando...":"Confirmar movimiento"}</button>
          <small className="form-help">Las salidas superiores al stock disponible serán rechazadas por PostgreSQL.</small>
        </form>
      </section>}
      <section className="panel table-panel movement-history"><div className="panel-heading"><div><h3>Historial de movimientos</h3><p>Registro de operaciones recientes</p></div><span className="panel-chip">{items.length} registros</span></div>
        <div className="table-scroll"><table><thead><tr><th>Tipo</th><th>Producto</th><th>Ubicación</th><th>Cantidad</th><th>Registrado por</th><th>Fecha</th></tr></thead><tbody>
          {items.map(m=><tr key={m.id_movimiento}><td><span className={`movement-type ${m.tipo==="ENTRADA"?"entry":"exit"}`}>{m.tipo==="ENTRADA"?<ArrowDownLeft size={14}/>:<ArrowUpRight size={14}/>} {m.tipo}</span></td><td><strong>{m.producto}</strong><small className="table-sub">{m.sku}</small></td><td>{m.ubicacion}</td><td><strong>{m.cantidad}</strong></td><td>{m.registrado_por||'Sistema / carga inicial'}</td><td>{new Date(m.fecha_movimiento).toLocaleString()}</td></tr>)}
        </tbody></table>{!items.length&&<div className="empty-state">Todavía no hay movimientos.</div>}</div>
      </section>
    </div>
  </div>;
}
