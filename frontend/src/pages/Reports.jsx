import React,{useEffect,useState} from "react";
import {AlertTriangle,Download,Package} from "lucide-react";
import {Bar,BarChart,CartesianGrid,Cell,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from "recharts";
import api,{getErrorMessage} from "../api";

const PALETTE=["#1c9b78","#3978d5","#e5a23b","#8166c4","#d27652","#4d9aab","#718096"];

export default function Reports(){
  const [category,setCategory]=useState([]);const [low,setLow]=useState([]);const [monthly,setMonthly]=useState([]);const [error,setError]=useState("");
  useEffect(()=>{Promise.all([api.get("/reportes/stock-por-categoria"),api.get("/reportes/stock-bajo"),api.get("/reportes/movimientos-mensuales")]).then(([a,b,c])=>{setCategory(a.data);setLow(b.data);setMonthly(c.data);}).catch(e=>setError(getErrorMessage(e)));},[]);
  const exportCsv=()=>{const rows=[["SKU","Producto","Categoría","Stock actual","Stock mínimo"],...low.map(x=>[x.sku,x.nombre,x.categoria,x.stock_actual,x.stock_minimo])];const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="stock-bajo-stockvision.csv";a.click();URL.revokeObjectURL(url);};
  return <div className="page-stack">
    <div className="page-actions"><div><span className="section-kicker">ANÁLISIS</span><h2>Reportes de inventario</h2><p>Distribución de existencias y comportamiento de movimientos.</p></div><button className="button secondary" onClick={exportCsv}><Download size={16}/> Exportar stock bajo</button></div>
    {error&&<div className="notice error">{error}</div>}
    <div className="reports-grid">
      <section className="panel chart-panel"><div className="panel-heading"><div><h3>Unidades por categoría</h3><p>Distribución de existencias actuales</p></div></div><div className="chart-wrap">
        {category.length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={category} dataKey="unidades" nameKey="categoria" cx="50%" cy="50%" outerRadius={105} innerRadius={55} paddingAngle={3}>{category.map((x,i)=><Cell key={x.categoria} fill={PALETTE[i%PALETTE.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>:<div className="empty-state">Sin datos de categorías.</div>}
      </div><div className="category-legend">{category.map((x,i)=><span key={x.categoria}><i style={{background:PALETTE[i%PALETTE.length]}}/>{x.categoria} <b>{x.unidades}</b></span>)}</div></section>
      <section className="panel chart-panel"><div className="panel-heading"><div><h3>Entradas y salidas</h3><p>Unidades registradas por mes</p></div></div><div className="chart-wrap">
        {monthly.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf2"/><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Bar dataKey="entradas" fill="#18a879" radius={[4,4,0,0]}/><Bar dataKey="salidas" fill="#3978d5" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>:<div className="empty-state">Sin movimientos registrados.</div>}
      </div></section>
    </div>
    <section className="panel table-panel"><div className="panel-heading"><div><h3><AlertTriangle size={17}/> Productos con stock bajo</h3><p>Stock actual igual o inferior al mínimo configurado.</p></div><span className="panel-chip">{low.length} alertas</span></div>
      <div className="table-scroll"><table><thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th></tr></thead><tbody>{low.map(p=><tr key={p.id_producto}><td className="code-text">{p.sku}</td><td><strong>{p.nombre}</strong></td><td>{p.categoria}</td><td><strong className="negative">{p.stock_actual}</strong></td><td>{p.stock_minimo}</td><td><span className="status-pill warning">Reponer</span></td></tr>)}</tbody></table>{!low.length&&<div className="empty-state"><Package size={25}/> No hay productos bajo el mínimo.</div>}</div>
    </section>
  </div>;
}
