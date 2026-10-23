import { AmbientLight, Color, DirectionalLight, Group, Mesh, MeshPhysicalMaterial, OrthographicCamera, PMREMGenerator, Scene, TorusGeometry, WebGLRenderer, type WebGLRenderTarget } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export async function mountGlassScene(host: HTMLElement, diagram: HTMLElement, current:()=>boolean) {
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
  const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});
  if(!context)throw new Error('WebGL is unavailable; the HTML diagram remains active.');
  const renderer=new WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.transmissionResolutionScale=.5;
  const scene=new Scene(), camera=new OrthographicCamera(-155,155,125,-125,.1,1200);
  camera.position.z=600;
  const group=new Group();scene.add(group);
  const material=new MeshPhysicalMaterial({color:new Color('#bed9ff'),metalness:0,roughness:.16,transmission:.74,thickness:18,ior:1.38,attenuationColor:new Color('#76a9ef'),attenuationDistance:300,opacity:1});
  const geometry=new TorusGeometry(1,.095,16,64);
  const labels=[...diagram.querySelectorAll<HTMLElement>('.matrix-circle')];
  const rings=labels.map(()=>{const ring=new Mesh(geometry,material);group.add(ring);return ring;});
  scene.add(new AmbientLight('#e8f2ff',2));const light=new DirectionalLight('#ffffff',3);light.position.set(-160,240,500);scene.add(light);
  let map:WebGLRenderTarget|undefined;
  let frame=0,visible=true,closed=false,ready=false,progress=.5,target=.5,lastTime=0;
  function measureProgress() {const box=diagram.getBoundingClientRect();target=Math.max(0,Math.min(1,(innerHeight*.88-box.top)/(box.height+innerHeight*.36)));visible=box.bottom>0&&box.top<innerHeight;}
  function apply() {
    group.rotation.x=(14-21*progress)*Math.PI/180;group.rotation.y=(-22+38*progress)*Math.PI/180;
    rings.forEach((ring,index)=>{ring.rotation.x=(index-1)*.08;ring.rotation.y=(index===1?-.08:.1);ring.position.z=(index-1)*12;});
  }
  function draw(time:number) {
    frame=0;if(closed||!ready||!visible||document.hidden)return;
    const dt=Math.min(60,lastTime?time-lastTime:16);lastTime=time;
    progress+=(target-progress)*(1-Math.exp(-dt/110));apply();renderer.render(scene,camera);
    if(Math.abs(progress-target)>.001)frame=requestAnimationFrame(draw);
  }
  function invalidate() {if(!frame&&!closed&&ready&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function scrollChanged() {measureProgress();if(!visible&&frame){cancelAnimationFrame(frame);frame=0;}invalidate();}
  function resize() {
    const width=diagram.clientWidth,height=diagram.clientHeight;if(!width||!height)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<=1000?1.25:1.5));renderer.setSize(width,height,false);
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    rings.forEach((ring,index)=>{const label=labels[index];const radius=label.offsetWidth/2-9;ring.scale.setScalar(radius);ring.position.x=label.offsetLeft+label.offsetWidth/2-width/2;ring.position.y=height/2-label.offsetTop-label.offsetHeight/2;});
    measureProgress();invalidate();
  }
  function visibilityChanged() {if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;}else scrollChanged();}
  function lost(event:Event){event.preventDefault();dispose();}
  const resizeObserver=new ResizeObserver(resize);
  function dispose() {
    if(closed)return;closed=true;if(frame)cancelAnimationFrame(frame);resizeObserver.disconnect();
    window.removeEventListener('scroll',scrollChanged);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibilityChanged);canvas.removeEventListener('webglcontextlost',lost);
    delete diagram.dataset.webgl;canvas.remove();geometry.dispose();material.dispose();map?.dispose();renderer.dispose();
  }
  try {
    const environment=new RoomEnvironment(),generator=new PMREMGenerator(renderer);
    try {map=generator.fromScene(environment,.04,.1,100,{size:128});scene.environment=map.texture;}
    finally {environment.dispose();generator.dispose();}
    host.appendChild(canvas);resize();progress=target;apply();await renderer.compileAsync(scene,camera);
    if(!current()){dispose();return dispose;}
    renderer.render(scene,camera);ready=true;diagram.dataset.webgl='ready';
    resizeObserver.observe(diagram);window.addEventListener('scroll',scrollChanged,{passive:true});window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',visibilityChanged);canvas.addEventListener('webglcontextlost',lost);
    return dispose;
  } catch(error){dispose();throw error;}
}
