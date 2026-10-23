import { AmbientLight, Color, DirectionalLight, Group, IcosahedronGeometry, Mesh, MeshPhysicalMaterial, OrthographicCamera, PMREMGenerator, Scene, TorusGeometry, WebGLRenderer, type WebGLRenderTarget } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export async function mountCommissionScene(host:HTMLElement,stage:HTMLElement,selected:number){
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
  const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});if(!context)throw new Error('SVG fallback');
  const renderer=new WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'});renderer.transmissionResolutionScale=.5;
  const scene=new Scene(),camera=new OrthographicCamera(-200,200,170,-170,.1,1000);camera.position.z=500;
  const group=new Group();scene.add(group);
  const glass=new MeshPhysicalMaterial({color:'#bed9ff',roughness:.15,transmission:.7,thickness:15,ior:1.35});
  const blue=new MeshPhysicalMaterial({color:'#0052a5',roughness:.2,metalness:.25});
  const ringGeometry=new TorusGeometry(115,2.2,8,96),nodeGeometry=new IcosahedronGeometry(16,1),coreGeometry=new TorusGeometry(39,6,12,64);
  const ring=new Mesh(ringGeometry,glass);group.add(ring);const core=new Mesh(coreGeometry,glass);group.add(core);
  const nodes=Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180,node=new Mesh(nodeGeometry,i===selected?blue:glass);node.position.set(121*Math.cos(a),-115*Math.sin(a),i===selected?22:0);group.add(node);return node;});
  scene.add(new AmbientLight('#eaf3ff',2));const light=new DirectionalLight('#ffffff',3);light.position.set(-100,160,400);scene.add(light);
  let map:WebGLRenderTarget|undefined,closed=false,ready=false,visible=true,frame=0,tilt=.12,target=.12,last=0;
  function draw(time:number){frame=0;if(closed||!ready||!visible||document.hidden)return;const dt=Math.min(60,last?time-last:16);last=time;tilt+=(target-tilt)*(1-Math.exp(-dt/100));group.rotation.x=tilt;group.rotation.y=-.17+tilt*.5;core.rotation.x=.28;renderer.render(scene,camera);if(Math.abs(tilt-target)>.001)frame=requestAnimationFrame(draw);}
  function invalidate(){if(!frame&&ready&&visible&&!closed&&!document.hidden)frame=requestAnimationFrame(draw);}
  function scroll(){const r=stage.getBoundingClientRect();visible=r.bottom>0&&r.top<innerHeight;target=Math.max(-.2,Math.min(.45,(innerHeight*.5-r.top)/innerHeight*.5));if(!visible&&frame){cancelAnimationFrame(frame);frame=0;}invalidate();}
  function resize(){const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(width,height,false);const aspect=width/height;camera.left=-170*aspect;camera.right=170*aspect;camera.updateProjectionMatrix();scroll();invalidate();}
  function visibility(){if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}else scroll();}
  const observer=new ResizeObserver(resize);
  function lost(event:Event){event.preventDefault();dispose();}
  function dispose(){if(closed)return;closed=true;if(frame)cancelAnimationFrame(frame);observer.disconnect();removeEventListener('scroll',scroll);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);delete stage.dataset.webgl;canvas.remove();ringGeometry.dispose();nodeGeometry.dispose();coreGeometry.dispose();glass.dispose();blue.dispose();map?.dispose();renderer.dispose();}
  try{
    const room=new RoomEnvironment(),generator=new PMREMGenerator(renderer);try{map=generator.fromScene(room,.04,.1,100,{size:128});scene.environment=map.texture;}finally{room.dispose();generator.dispose();}
    scene.background=null;glass.attenuationColor=new Color('#88b5ef');host.appendChild(canvas);resize();tilt=target;await renderer.compileAsync(scene,camera);ready=true;draw(performance.now());stage.dataset.webgl='ready';observer.observe(stage);addEventListener('scroll',scroll,{passive:true});document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',lost);
    return {select(index:number){nodes.forEach((node,i)=>{node.material=i===index?blue:glass;node.position.z=i===index?22:0;node.scale.setScalar(i===index?1.2:1);});invalidate();},dispose};
  }catch(error){dispose();throw error;}
}
