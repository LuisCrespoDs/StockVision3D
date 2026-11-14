import React,{useMemo} from "react";
import {Canvas} from "@react-three/fiber";
import {ContactShadows,OrbitControls,Text,} from "@react-three/drei";

function Rack({rack,locations,selectedId,onSelect}){
  const rackLocations=locations.filter(loc=>loc.estanteria===rack);
  const rackIndex=Math.max(0,Number(String(rack).replace(/\D/g,""))-1);
  const z=(rackIndex-1.5)*2.45;
  const steel="#536779";
  return <group position={[0,0,z]}>
    {[-3.35,3.35].map(x=><mesh key={`post-${x}`} position={[x,1.75,0]} castShadow><boxGeometry args={[0.13,3.5,0.16]}/><meshStandardMaterial color={steel} metalness={0.72} roughness={0.34}/></mesh>)}
    {[0.15,1.25,2.35,3.35].map(y=><group key={`shelf-${y}`}>
      <mesh position={[0,y,0]} receiveShadow castShadow><boxGeometry args={[6.8,0.12,1.05]}/><meshStandardMaterial color="#8293a2" metalness={0.45} roughness={0.52}/></mesh>
      {[-3.2,3.2].map(x=><mesh key={`${y}-${x}`} position={[x,y-0.13,0]}><boxGeometry args={[0.18,0.13,1.1]}/><meshStandardMaterial color="#d38a36" metalness={0.3} roughness={0.55}/></mesh>)}
    </group>)}
    {Array.from({length:4}).map((_,i)=><mesh key={`brace-${i}`} position={[-2.4+i*1.6,1.7,0.54]} castShadow><boxGeometry args={[0.07,3.1,0.07]}/><meshStandardMaterial color="#a6b3bd" metalness={0.5} roughness={0.45}/></mesh>)}
    {rackLocations.map(loc=>{
      const x=(Number(loc.columna)-2.5)*1.58;
      const y=0.62+(Number(loc.nivel)-1)*1.1;
      const occupied=Number(loc.stock_actual)>0;
      const low=occupied&&Boolean(loc.tiene_stock_bajo);
      const color=selectedId===loc.id_ubicacion?"#f6b84a":low?"#d97745":occupied?"#1ba77b":"#8b98a5";
      return <group key={loc.id_ubicacion} position={[x,y,0]}>
        <mesh onClick={event=>{event.stopPropagation();onSelect(loc);}} onPointerOver={event=>{event.stopPropagation();document.body.style.cursor="pointer";}} onPointerOut={()=>{document.body.style.cursor="auto";}} castShadow>
          <boxGeometry args={[1.32,0.72,0.78]}/><meshStandardMaterial color={color} metalness={0.12} roughness={0.48}/>
        </mesh>
        {occupied&&<mesh position={[0,0.39,0]} castShadow><boxGeometry args={[0.9,0.14,0.58]}/><meshStandardMaterial color="#d9e2e8" roughness={0.8}/></mesh>}
        <Text position={[0,-0.03,0.405]} fontSize={0.105} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.006} outlineColor="#263544">{loc.codigo.split("-").slice(-2).join("-")}</Text>
      </group>;
    })}
    <Text position={[0,3.72,0]} fontSize={0.28} color="#263b4f" anchorX="center">{rack}</Text>
  </group>;
}

function Scene({locations,selected,onSelect}){
  const racks=useMemo(()=>[...new Set(locations.map(x=>x.estanteria))].sort(),[locations]);
  return <>
    <color attach="background" args={["#eaf0f4"]}/><fog attach="fog" args={["#eaf0f4",18,34]}/>
    <ambientLight intensity={1.25}/><directionalLight position={[7,12,8]} intensity={2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}/><hemisphereLight intensity={0.55} groundColor="#9aa9b5"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.12,0]} receiveShadow><planeGeometry args={[24,18]}/><meshStandardMaterial color="#d7e0e6" roughness={0.9}/></mesh>
    {Array.from({length:9}).map((_,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[-10+i*2.5,-0.105,0]}><planeGeometry args={[0.035,17]}/><meshBasicMaterial color="#ffffff"/></mesh>)}
    <mesh position={[-7.7,-0.07,-5.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.4,2.4]}/><meshStandardMaterial color="#c8e7dd"/></mesh>
    <Text position={[-7.7,0.02,-5.5]} rotation={[-Math.PI/2,0,0]} fontSize={0.35} color="#237a62">RECEPCIÓN</Text>
    <mesh position={[7.7,-0.07,5.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.4,2.4]}/><meshStandardMaterial color="#d9e5f5"/></mesh>
    <Text position={[7.7,0.02,5.5]} rotation={[-Math.PI/2,0,0]} fontSize={0.35} color="#315e98">DESPACHO</Text>
    {racks.map(rack=><Rack key={rack} rack={rack} locations={locations} selectedId={selected?.id_ubicacion} onSelect={onSelect}/>)}
    <ContactShadows position={[0,-0.1,0]} opacity={0.28} scale={26} blur={2.5} far={7}/>
    <OrbitControls makeDefault minDistance={8} maxDistance={25} maxPolarAngle={Math.PI/2.05} target={[0,1.3,0]}/>
  </>;
}

export default function WarehouseScene({locations,selected,onSelect}){
  return <Canvas shadows camera={{position:[12,11,14],fov:43}} dpr={[1,1.7]}>
    <React.Suspense fallback={null}>
      <Scene locations={locations} selected={selected} onSelect={onSelect}/>
    </React.Suspense>
  </Canvas>;
}
