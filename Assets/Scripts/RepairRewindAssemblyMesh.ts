/** Code-authored articulated teaching assembly. Geometry only; no UI/domain state.
 * Meshes are cm-sized leaves under authored unit-scale semantic roots.
 * Extruded annuli preserve holes; per-face CCW quads preserve hard mechanical edges.
 */
type V = [number, number, number];
type C = [number, number, number, number];
export const RR_CYAN: C = [0.12, 0.86, 0.94, 1];
export const RR_AMBER: C = [1, 0.66, 0.18, 1];
const STEEL: C = [0.56, 0.66, 0.71, 1];
const PALE: C = [0.9, 0.87, 0.78, 1];
const BLUE: C = [0.22, 0.38, 0.47, 1];

class Geometry {
  private b = new MeshBuilder([{name:"position",components:3},{name:"normal",components:3},{name:"color",components:4}]);
  constructor() { this.b.topology = MeshTopology.Triangles; this.b.indexType = MeshIndexType.UInt16; }
  quad(a: V, b: V, c: V, d: V, color: C) {
    const u = [b[0]-a[0],b[1]-a[1],b[2]-a[2]], v = [c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const length = Math.hypot(...n) || 1;
    const normal = n.map(x=>x/length);
    const light = 0.72 + 0.28 * Math.max(0,normal[2]*0.8+normal[1]*0.4-normal[0]*0.2);
    const rgba = [color[0]*light,color[1]*light,color[2]*light,color[3]];
    const start = this.b.getVerticesCount();
    this.b.appendVerticesInterleaved([a,b,c,d].reduce((all,p)=>all.concat(p,normal,rgba), [] as number[]));
    this.b.appendIndices([start,start+1,start+2,start,start+2,start+3]);
  }
  box(x:number,y:number,z:number,w:number,h:number,d:number,color:C) {
    const l=x-w/2,r=x+w/2,b=y-h/2,t=y+h/2,k=z-d/2,f=z+d/2;
    this.quad([l,b,f],[r,b,f],[r,t,f],[l,t,f],color);
    this.quad([r,b,k],[l,b,k],[l,t,k],[r,t,k],color);
    this.quad([r,b,f],[r,b,k],[r,t,k],[r,t,f],color);
    this.quad([l,b,k],[l,b,f],[l,t,f],[l,t,k],color);
    this.quad([l,t,f],[r,t,f],[r,t,k],[l,t,k],color);
    this.quad([l,b,k],[r,b,k],[r,b,f],[l,b,f],color);
  }
  annulus(outer:number[],inner:number,z:number,depth:number,color:C, cx=0,cy=0) {
    const count=outer.length;
    const p=(i:number,r:number,h:number):V=>[cx+Math.cos(i/count*Math.PI*2)*r,cy+Math.sin(i/count*Math.PI*2)*r,h];
    for(let i=0;i<count;i++) {
      const j=(i+1)%count, a=p(i,outer[i],z+depth/2), b=p(j,outer[j],z+depth/2), c=p(j,inner,z+depth/2), d=p(i,inner,z+depth/2);
      const e=p(i,outer[i],z-depth/2),f=p(j,outer[j],z-depth/2),g=p(j,inner,z-depth/2),h=p(i,inner,z-depth/2);
      this.quad(a,b,c,d,color); this.quad(f,e,h,g,color);
      this.quad(e,f,b,a,color); this.quad(h,d,c,g,color);
    }
  }
  ring(r:number,inner:number,z:number,d:number,color:C,cx=0,cy=0) { this.annulus(new Array(48).fill(r),inner,z,d,color,cx,cy); }
  render(parent:SceneObject,name:string,material:Material):SceneObject {
    const leaf=global.scene.createSceneObject(name); leaf.setParent(parent);
    const visual=leaf.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    visual.mesh=this.b.getMesh(); visual.mainMaterial=material; this.b.updateMesh();
    return leaf;
  }
}

export function partMesh(parent:SceneObject,id:string,mat:Material,outline=false,color:C=RR_CYAN):SceneObject {
  const g=new Geometry();
  if(id==="cover") {
    if(outline) {
      g.box(0,3.05,0,9.2,.18,.18,color);g.box(0,-3.05,0,9.2,.18,.18,color);
      g.box(-4.5,0,0,.18,6,.18,color);g.box(4.5,0,0,.18,6,.18,color);
    } else {
      g.box(0,0,0,9,6,1.2,STEEL);
      g.box(0,0,.7,7.8,4.8,.35,BLUE);
      for(let i=-2;i<=2;i++) g.box(i*1.2,0,1,0.45,3,.2,RR_CYAN);
      for(const x of [-3.7,3.7]) for(const y of [-2.2,2.2]) g.ring(.32,.11,.8,.35,PALE,x,y);
    }
  } else if(id==="ring") {
    g.ring(3.6,outline?3.43:2.45,0,outline?.16:.8,outline?color:PALE);
    if(!outline) {
      g.ring(3.2,3,.45,.12,RR_CYAN);
      for(const x of [-2.9,2.9]) g.ring(.58,.2,.15,1,STEEL,x,0);
    }
  } else {
    const radii=new Array(48).fill(0).map((_,i)=>i%4<2?3.65:3.05);
    g.annulus(radii,outline?2.85:.85,0,outline?.15:1.3,outline?color:RR_AMBER);
    if(!outline) { g.ring(1.45,.85,.8,.5,STEEL);for(let i=0;i<6;i++) {
      const a=i*Math.PI/3;g.ring(.38,.23,.72,.14,BLUE,Math.cos(a)*2.1,Math.sin(a)*2.1);
    }}
  }
  return g.render(parent,outline?"RepairRewind outline "+id:"RepairRewind mesh "+id,mat);
}

export function baseMesh(parent:SceneObject,mat:Material) {
  const g=new Geometry(); g.box(0,0,-2.3,14,28,1.3,BLUE);
  g.box(-6.6,0,-1.5,.35,27,.4,RR_CYAN);g.box(6.6,0,-1.5,.35,27,.4,RR_CYAN);
  for(const y of [-10,0,10]) {g.ring(4.2,3.95,-1.5,.3,STEEL,0,y);g.ring(.72,.22,-.3,2,STEEL,0,y);}
  g.box(0,-14.6,-1.5,16,1.2,6,STEEL);
  return g.render(parent,"RepairRewind supporting base",mat);
}
export function trayMesh(parent:SceneObject,mat:Material) {
  const g=new Geometry(); g.box(0,0,-2.1,13,29,1,BLUE);
  for(const y of [-14,14])g.box(0,y,-1.1,13,.6,2.4,STEEL);
  for(const x of [-6.2,6.2])g.box(x,0,-1.1,.6,28,2.4,STEEL);
  for(const y of [-5,5])g.box(0,y,-1.1,12,.45,2,STEEL);
  for(const y of [-10,0,10])g.box(0,y-4.3,-1.4,10,.16,.2,RR_CYAN);
  return g.render(parent,"RepairRewind three-slot tray",mat);
}
export function arcMesh(parent:SceneObject,from:vec3,to:vec3,mat:Material):SceneObject {
  const g=new Geometry();
  for(let i=0;i<24;i++) {
    const point=(t:number):V=>[from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t+5*Math.sin(Math.PI*t),from.z+(to.z-from.z)*t+3*Math.sin(Math.PI*t)];
    const a=point(i/24),b=point((i+1)/24),dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,s=.09;
    g.quad([a[0]-dy/n*s,a[1]+dx/n*s,a[2]],[a[0]+dy/n*s,a[1]-dx/n*s,a[2]],[b[0]+dy/n*s,b[1]-dx/n*s,b[2]],[b[0]-dy/n*s,b[1]+dx/n*s,b[2]],RR_AMBER);
  }
  return g.render(parent,"RepairRewind return arc",mat);
}
