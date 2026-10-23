/** One retained ribbon mesh, 96 vertices. Updates geometry without scene recreation.
 * Destination is a copied world point; only the moving endpoint changes per frame.
 */
import {RR_AMBER} from "./RepairRewindAssemblyMesh";
export class RepairRewindArc {
  readonly object:SceneObject;
  private builder=new MeshBuilder([{name:"position",components:3},{name:"normal",components:3},{name:"color",components:4}]);
  private vertices:number[][]=[];
  private destination:vec3;
  private last:vec3|null=null;
  constructor(parent:SceneObject,from:vec3,to:vec3,material:Material) {
    this.destination=new vec3(to.x,to.y,to.z);
    this.object=global.scene.createSceneObject("RepairRewind return arc");this.object.setParent(parent);
    this.builder.topology=MeshTopology.Triangles;this.builder.indexType=MeshIndexType.UInt16;
    for(let i=0;i<96;i++){this.vertices.push([0,0,0,0,0,1,...RR_AMBER]);this.builder.appendVerticesInterleaved(this.vertices[i]);}
    for(let i=0;i<24;i++){const n=i*4;this.builder.appendIndices([n,n+1,n+2,n,n+2,n+3]);}
    const visual=this.object.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    visual.mesh=this.builder.getMesh();visual.mainMaterial=material;this.update(from);
  }
  update(from:vec3) {
    if(this.last&&from.distance(this.last)<1e-6)return;
    this.last=new vec3(from.x,from.y,from.z);
    const to=this.destination,inv=this.object.getTransform().getInvertedWorldTransform();
    const point=(t:number)=>new vec3(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t+5*Math.sin(Math.PI*t),from.z+(to.z-from.z)*t+3*Math.sin(Math.PI*t));
    for(let i=0;i<24;i++) {
      const a=point(i/24),b=point((i+1)/24),dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1,s=.09;
      const corners=[new vec3(a.x-dy/n*s,a.y+dx/n*s,a.z),new vec3(a.x+dy/n*s,a.y-dx/n*s,a.z),new vec3(b.x+dy/n*s,b.y-dx/n*s,b.z),new vec3(b.x-dy/n*s,b.y+dx/n*s,b.z)];
      corners.forEach((v,j)=>{const p=inv.multiplyPoint(v),index=i*4+j;this.vertices[index]=[p.x,p.y,p.z,0,0,1,...RR_AMBER];this.builder.setVertexInterleaved(index,this.vertices[index]);});
    }
    this.builder.updateMesh();
  }
  snapshot() {
    const midpoint=(a:number,b:number)=>{
      const p=this.vertices[a],q=this.vertices[b],v=this.object.getTransform().getWorldTransform().multiplyPoint(new vec3((p[0]+q[0])/2,(p[1]+q[1])/2,(p[2]+q[2])/2));
      return {x:v.x,y:v.y,z:v.z};
    };
    return {from:midpoint(0,1),to:midpoint(94,95)};
  }
  destroy(){this.object.destroy();}
}
