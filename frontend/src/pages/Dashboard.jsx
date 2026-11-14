import React,{useEffect,useState} from "react";
import {Activity,AlertTriangle,Boxes,DollarSign,Package,RefreshCw,Warehouse} from "lucide-react";
import {Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from "recharts";
import api,{getErrorMessage} from "../api";
import StatCard from "../components/StatCard";

const money=value=>new Intl.NumberFormat("es-BO",{style:"currency",currency:"BOB",maximumFractionDigits:0}).format(Number(value||0));

export default function Dashboard(){
  const [data,setData]=useState(null);const [error,setError]=useState("");const [busy,setBusy]=useState(true);
  const load=async()=>{setBusy(true);setError("");try{const {data}=await api.get("/dashboard/summary");setData(data);}catch(e){setError(getErrorMessage(e));}finally{setBusy(false);}};
  useEffect(()=>{load();},[]);
  if(busy&&!data)return <div className="loading-panel">Cargando indicadores...</div>;
  return <div className="page-stack">
    <div className="page-actions"><div><span className="section-kicker">VISTA GENERAL</span><h2>Estado del almacén</h2><p>Indicadores consolidados desde los movimientos registrados.</p></div><button className="button secondary" onClick={load}><RefreshCw size={16}/> Actualizar</button></div>
    {error&&<div className="notice error">{error}</div>}
    <div className="stats-grid">
      <StatCard label="Productos activos" value={data?.total_productos??"—"} hint="Referencias en catálogo" icon={Package} tone="blue"/>
      <StatCard label="Unidades disponibles" value={Number(data?.total_unidades||0).toLocaleString("es-BO")} hint="Suma de existencias" icon={Boxes} tone="green"/>
      <StatCard label="Valor referencial" value={money(data?.valor_inventario)} hint="Según precio de referencia" icon={DollarSign} tone="violet"/>
      <StatCard label="Stock bajo" value={data?.productos_stock_bajo??"—"} hint="En o bajo el mínimo" icon={AlertTriangle} tone="orange"/>
    </div>
    <div className="stats-grid stats-grid-secondary">
      <StatCard label="Ubicaciones activas" value={data?.total_ubicaciones??"—"} hint="Compartimientos registrados" icon={Warehouse} tone="blue"/>
      <StatCard label="Ubicaciones ocupadas" value={data?.ubicaciones_ocupadas??"—"} hint="Con existencias mayores a cero" icon={Activity} tone="green"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel chart-panel">
        <div className="panel-heading"><div><h3>Movimientos por mes</h3><p>Registros de entradas y salidas</p></div><span className="panel-chip">Últimos meses</span></div>
        <div className="chart-wrap">{data?.movimientos_mensuales?.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={data.movimientos_mensuales} barGap={6}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf2"/><XAxis dataKey="mes" tick={{fontSize:11,fill:"#718096"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#718096"}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="entradas" name="Entradas" fill="#18a879" radius={[5,5,0,0]}/><Bar dataKey="salidas" name="Salidas" fill="#3978d5" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>:<div className="empty-state">Aún no hay movimientos para graficar.</div>}</div>
        <div className="chart-legend"><span><i className="legend-green"/> Entradas</span><span><i className="legend-blue"/> Salidas</span></div>
      </section>
      <section className="panel recent-panel">
        <div className="panel-heading"><div><h3>Actividad reciente</h3><p>Últimos movimientos registrados</p></div></div>
        {data?.movimientos_recientes?.length?<div className="activity-list">{data.movimientos_recientes.map(m=><div className="activity-item" key={m.id_movimiento}><div className={`movement-icon ${m.tipo==="ENTRADA"?"in":"out"}`}>{m.tipo==="ENTRADA"?"+":"−"}</div><div className="activity-copy"><strong>{m.producto}</strong><small>{m.ubicacion} · {new Date(m.fecha_movimiento).toLocaleString()}</small></div><b className={m.tipo==="ENTRADA"?"positive":"negative"}>{m.tipo==="ENTRADA"?"+":"−"}{m.cantidad}</b></div>)}</div>:<div className="empty-state">No hay movimientos registrados.</div>}
      </section>
    </div>
    <div className="demo-note"><span className="status-dot"/> Los registros precargados están identificados como datos de demostración.</div>
  </div>;
}
