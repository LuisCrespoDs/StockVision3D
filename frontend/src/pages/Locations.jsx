import React,{useEffect,useMemo,useState} from "react";
import {MapPin,Plus,Search,Edit3} from "lucide-react";
import api,{getErrorMessage} from "../api";
import Modal from "../components/Modal";
import {useAuth} from "../AuthContext";

const blank={codigo:"",pasillo:"A",estanteria:"E01",nivel:1,columna:1,capacidad_unidades:50,zona:"ALMACEN",activo:true};

export default function Locations(){
  const {profile}=useAuth();const canEdit=["admin","encargado"].includes(profile?.rol);
  const [items,setItems]=useState([]);const [search,setSearch]=useState("");const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);const [form,setForm]=useState(blank);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const load=async()=>{const {data}=await api.get("/ubicaciones");setItems(data);};
  useEffect(()=>{load().catch(e=>setError(getErrorMessage(e)));},[]);
  const filtered=useMemo(()=>items.filter(x=>[x.codigo,x.pasillo,x.estanteria].join(" ").toLowerCase().includes(search.toLowerCase())),[items,search]);
  const openNew=()=>{setEditing(null);setForm(blank);setError("");setModal(true);};
  const openEdit=x=>{setEditing(x);setForm({...x});setError("");setModal(true);};
  const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{const body={...form,nivel:Number(form.nivel),columna:Number(form.columna),capacidad_unidades:Number(form.capacidad_unidades)};if(editing)await api.put(`/ubicaciones/${editing.id_ubicacion}`,body);else await api.post("/ubicaciones",body);setModal(false);await load();}catch(e){setError(getErrorMessage(e));}finally{setBusy(false);}};
  return <div className="page-stack">
    <div className="page-actions"><div><span className="section-kicker">DISTRIBUCIÓN</span><h2>Ubicaciones del almacén</h2><p>Pasillos, estanterías, niveles y compartimientos.</p></div>{canEdit&&<button className="button primary" onClick={openNew}><Plus size={17}/> Nueva ubicación</button>}</div>
    {error&&!modal&&<div className="notice error">{error}</div>}
    <div className="location-summary"><div><strong>{items.length}</strong><span>Ubicaciones registradas</span></div><div><strong>{items.filter(x=>x.stock_actual>0).length}</strong><span>Con existencias</span></div><div><strong>{items.filter(x=>x.stock_actual===0).length}</strong><span>Disponibles</span></div></div>
    <section className="panel table-panel"><div className="table-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar código, pasillo o estantería..."/></div><span className="count-label">{filtered.length} ubicaciones</span></div>
      <div className="table-scroll"><table><thead><tr><th>Código</th><th>Pasillo</th><th>Estantería</th><th>Nivel</th><th>Columna</th><th>Existencias</th><th>Capacidad</th><th>Estado</th>{canEdit&&<th/>}</tr></thead><tbody>
      {filtered.map(x=><tr key={x.id_ubicacion}><td><strong className="code-text">{x.codigo}</strong></td><td>{x.pasillo}</td><td>{x.estanteria}</td><td>{x.nivel}</td><td>{x.columna}</td><td>{x.stock_actual}</td><td>{x.capacidad_unidades}</td><td><span className={`status-pill ${x.stock_actual>0?"active":"inactive"}`}>{x.stock_actual>0?"Ocupada":"Libre"}</span></td>{canEdit&&<td><button className="icon-button" onClick={()=>openEdit(x)} title="Editar"><Edit3 size={16}/></button></td>}</tr>)}
      </tbody></table>{!filtered.length&&<div className="empty-state">No hay ubicaciones que coincidan.</div>}</div>
    </section>
    {modal&&<Modal title={editing?"Editar ubicación":"Crear ubicación"} onClose={()=>setModal(false)}>
      <form className="form-grid" onSubmit={submit}>
        <label>Código<input required value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value.toUpperCase()})} placeholder="A-E01-N1-C01"/></label>
        <label>Pasillo<input required value={form.pasillo} onChange={e=>setForm({...form,pasillo:e.target.value.toUpperCase()})}/></label>
        <label>Estantería<input required value={form.estanteria} onChange={e=>setForm({...form,estanteria:e.target.value.toUpperCase()})}/></label>
        <label>Nivel<input type="number" min="1" value={form.nivel} onChange={e=>setForm({...form,nivel:e.target.value})}/></label>
        <label>Columna<input type="number" min="1" value={form.columna} onChange={e=>setForm({...form,columna:e.target.value})}/></label>
        <label>Capacidad (unidades)<input type="number" min="1" value={form.capacidad_unidades} onChange={e=>setForm({...form,capacidad_unidades:e.target.value})}/></label>
        <label>Zona<select value={form.zona} onChange={e=>setForm({...form,zona:e.target.value})}><option>ALMACEN</option><option>RECEPCION</option><option>DESPACHO</option></select></label>
        {editing&&<label className="check-field"><input type="checkbox" checked={form.activo} onChange={e=>setForm({...form,activo:e.target.checked})}/> Activa</label>}
        {error&&<div className="notice error full-field">{error}</div>}
        <div className="form-actions full-field"><button type="button" className="button secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="button primary" disabled={busy}>{busy?"Guardando...":"Guardar ubicación"}</button></div>
      </form>
    </Modal>}
  </div>;
}
