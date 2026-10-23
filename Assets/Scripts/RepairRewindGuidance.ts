/** Presentation calculations only. Camera faces local -Z; saved poses are read-only.
 * The structural camera boundary also lets native tests exercise invalid projections.
 */
export type RREdgeHint={x:number;y:number;direction:"left"|"right"|"up"|"down";reason:string};
export type RRProjectionCamera=Pick<Camera,"near"|"getTransform"|"worldSpaceToScreenSpace"|"isSphereVisible">;
export function edgeHintFor(camera:RRProjectionCamera,target:{x:number;y:number;z:number}):RREdgeHint|null {
  const fallback=(reason:string):RREdgeHint=>({x:.84,y:.5,direction:"right",reason});
  if(![target.x,target.y,target.z].every(Number.isFinite))return fallback("non-finite-target");
  const world=new vec3(target.x,target.y,target.z);
  const local=camera.getTransform().getInvertedWorldTransform().multiplyPoint(world);
  if(![local.x,local.y,local.z].every(Number.isFinite))return fallback("non-finite-camera");
  const depth=-local.z,front=depth>Math.max(.01,camera.near);
  // Never project a point on/behind the near plane: perspective divide can be singular.
  const screen=front?camera.worldSpaceToScreenSpace(world):null;
  const finite=!!screen&&Number.isFinite(screen.x)&&Number.isFinite(screen.y);
  if(front&&finite&&camera.isSphereVisible(world,0)&&screen.x>=.06&&screen.x<=.94&&screen.y>=.06&&screen.y<=.94)return null;
  let dx=front&&finite?screen.x-.5:local.x,dy=front&&finite?screen.y-.5:-local.y;
  const reason=!front?(depth<=0?"behind-or-plane":"near-plane"):!finite?"non-finite-projection":"outside-frustum";
  if(Math.abs(dx)+Math.abs(dy)<1e-6)return fallback(reason);
  const scale=Math.max(Math.abs(dx)/.34,Math.abs(dy)/.42);
  dx/=scale;dy/=scale;
  return {x:.5+dx,y:.5+dy,direction:Math.abs(dx)/.34>=Math.abs(dy)/.42?(dx<0?"left":"right"):(dy<0?"up":"down"),reason};
}
