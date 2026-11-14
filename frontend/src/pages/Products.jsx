import React,{useEffect,useMemo,useState} from "react";
import {Edit3,Plus,Search,Package} from "lucide-react";
import api,{getErrorMessage} from "../api";
import Modal from "../components/Modal";
import {useAuth} from "../AuthContext";

const emptyForm={sku:"",nombre:"",categoria:"Periféricos",precio_referencia:"0",descripcion:"",stock_minimo:5,activo:true};

export default function Products(){
  const {profile}=useAuth();const canEdit=["admin","encargado"].includes(profile?.rol);
  const [items,setItems]=useState([]);const [search,setSearch]=useState("");const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);const [form,setForm]=useState(emptyForm);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const load=async()=>{const {data}=await api.get("/productos");setItems(data);};
  useEffect(()=>{load().catch(e=>setError(getErrorMessage(e)));},[]);
  const filtered=useMemo(()=>items.filter(p=>[p.sku,p.nombre,p.categoria].join(" ").toLowerCase().includes(search.toLowerCase())),[items,search]);
  const openNew=()=>{setEditing(null);setForm(emptyForm);setError("");setModal(true);};
  const openEdit=p=>{setEditing(p);setForm({...p,precio_referencia:String(p.precio_referencia),stock_minimo:p.stock_minimo??5});setError("");setModal(true);};
  const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{const body={...form,precio_referencia:Number(form.precio_referencia),stock_minimo:Number(form.stock_minimo)};if(editing)await api.put(`/productos/${editing.id_producto}`,body);else await api.post("/productos",body);setModal(false);await load();}catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}};
  const deactivate=async p=>{if(!window.confirm(`¿Desactivar ${p.nombre}?`))return;try{await api.delete(`/productos/${p.id_producto}`);await load();}catch(e){setError(getErrorMessage(e));}};
  return <div className="page-stack">
    <div className="page-actions"><div><span className="section-kicker">CATÁLOGO</span><h2>Productos tecnológicos</h2><p>Administra referencias, categorías y niveles mínimos de inventario.</p></div>{canEdit&&<button className="button primary" onClick={openNew}><Plus size={17}/> Nuevo producto</button>}</div>
    {error&&!modal&&<div className="notice error">{error}</div>}
    <section className="panel table-panel">
      <div className="table-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por SKU, nombre o categoría..."/></div><span className="count-label">{filtered.length} productos</span></div>
      <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Precio ref.</th><th>Stock</th><th>Mínimo</th><th>Estado</th>{canEdit&&<th/>}</tr></thead><tbody>
        {filtered.map(p=><tr key={p.id_producto}><td><div className="product-cell"><div className="product-thumb"><Package size={18}/></div><div><strong>{p.nombre}</strong><small>{p.sku}</small></div></div></td><td>{p.categoria}</td><td>Bs {Number(p.precio_referencia).toLocaleString("es-BO",{minimumFractionDigits:2})}</td><td><strong>{p.stock_actual}</strong></td><td>{p.stock_minimo}</td><td><span className={`status-pill ${p.activo?"active":"inactive"}`}>{p.activo?"Activo":"Inactivo"}</span></td>{canEdit&&<td><div className="row-actions"><button className="icon-button" title="Editar" onClick={()=>openEdit(p)}><Edit3 size={16}/></button>{p.activo&&<button className="icon-button danger-icon" title="Desactivar" onClick={()=>deactivate(p)}>×</button>}</div></td>}</tr>)}
      </tbody></table>{!filtered.length&&<div className="empty-state">No se encontraron productos.</div>}</div>
    </section>
    {modal&&<Modal title={editing?"Editar producto":"Registrar producto"} onClose={()=>setModal(false)}>
      <form className="form-grid" onSubmit={submit}>
        <label>SKU<input required maxLength="30" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></label>
        <label>Nombre<input required value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></label>
        <label>Categoría<select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>{["Computadoras","Monitores","Periféricos","Redes","Componentes","Energía","Accesorios","Otros"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Precio referencial (Bs)<input type="number" min="0" step="0.01" required value={form.precio_referencia} onChange={e=>setForm({...form,precio_referencia:e.target.value})}/></label>
        <label>Stock mínimo<input type="number" min="0" required value={form.stock_minimo} onChange={e=>setForm({...form,stock_minimo:e.target.value})}/></label>
        <label className="full-field">Descripción<textarea rows="3" value={form.descripcion||""} onChange={e=>setForm({...form,descripcion:e.target.value})}/></label>
        {editing&&<label className="check-field"><input type="checkbox" checked={form.activo} onChange={e=>setForm({...form,activo:e.target.checked})}/> Producto activo</label>}
        {error&&<div className="notice error full-field">{error}</div>}
        <div className="form-actions full-field"><button type="button" className="button secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="button primary" disabled={busy}>{busy?"Guardando...":"Guardar producto"}</button></div>
      </form>
    </Modal>}
  </div>;
}
