import React,{Suspense,useEffect,useMemo,useState} from "react";
import {Box,Layers,MapPin,Rotate3D,Warehouse} from "lucide-react";
import api,{getErrorMessage} from "../api";
import WarehouseScene from "../components/WarehouseScene";

export default function Warehouse3D(){
  const [locations,setLocations]=useState([]);const [selected,setSelected]=useState(null);const [detail,setDetail]=useState(null);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  const load=async()=>{setLoading(true);try{const {data}=await api.get("/ubicaciones");setLocations(data.filter(x=>x.activo));}catch(e){setError(getErrorMessage(e));}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const choose=async loc=>{setSelected(loc);try{const {data}=await api.get(`/ubicaciones/${loc.id_ubicacion}`);setDetail(data);}catch(e){setError(getErrorMessage(e));}};
  const occupied=useMemo(()=>locations.filter(x=>x.stock_actual>0).length,[locations]);
  return <div className="page-stack warehouse-page">
    <div className="page-actions"><div><span className="section-kicker">DIGITAL WAREHOUSE</span><h2>Explorador tridimensional</h2><p>Selecciona un compartimiento para consultar su inventario.</p></div><div className="warehouse-metrics"><span><i className="legend-green"/> Ocupada</span><span><i className="legend-orange"/> Stock bajo</span><span><i className="legend-gray"/> Libre</span></div></div>
    {error&&<div className="notice error">{error}</div>}
    <div className="warehouse-workspace">
      <section className="warehouse-viewer">
        <div className="viewer-toolbar"><div><Rotate3D size={17}/><strong>Vista 3D del almacén</strong></div><span>Arrastra para rotar · Rueda para acercar</span></div>
        <div className="scene-wrap">{loading?<div className="empty-state">Cargando distribución...</div>:locations.length?<Suspense fallback={<div className="empty-state">Preparando escena 3D...</div>}><WarehouseScene locations={locations} selected={selected} onSelect={choose}/></Suspense>:<div className="empty-state">No hay ubicaciones activas. Ejecuta la migración SQL y recarga.</div>}</div>
        <div className="viewer-footer"><span><Warehouse size={15}/> 4 estanterías · 3 niveles · 4 columnas por nivel</span><span>{occupied} / {locations.length} ubicaciones ocupadas</span></div>
      </section>
      <aside className="location-detail-panel">
        <div className="detail-panel-title"><div className="detail-icon"><MapPin size={18}/></div><div><span>DETALLE DE UBICACIÓN</span><h3>{detail?.ubicacion?.codigo||"Selecciona una ubicación"}</h3></div></div>
        {detail?.ubicacion?<div className="detail-content">
          <div className="detail-grid"><div><small>Pasillo</small><strong>{detail.ubicacion.pasillo}</strong></div><div><small>Estantería</small><strong>{detail.ubicacion.estanteria}</strong></div><div><small>Nivel</small><strong>{detail.ubicacion.nivel}</strong></div><div><small>Columna</small><strong>{detail.ubicacion.columna}</strong></div></div>
          <div className="occupancy-block"><div className="occupancy-head"><span>Unidades almacenadas</span><strong>{detail.ubicacion.stock_actual} / {detail.ubicacion.capacidad_unidades}</strong></div><div className="progress-track"><i style={{width:`${Math.min(100,(detail.ubicacion.stock_actual/detail.ubicacion.capacidad_unidades)*100)}%`}}/></div></div>
          <h4>Productos en esta ubicación</h4>
          {detail.productos.length?detail.productos.map(p=><div className="stored-product" key={p.id_producto}><div className="stored-product-icon"><Box size={17}/></div><div><strong>{p.nombre}</strong><small>{p.sku}</small></div><b>{p.cantidad_actual} u.</b></div>):<div className="empty-inline">Esta ubicación está libre.</div>}
        </div>:<div className="detail-placeholder"><Layers size={34}/><p>Haz clic en uno de los compartimientos para consultar productos, existencias y capacidad.</p></div>}
      </aside>
    </div>
  </div>;
}
