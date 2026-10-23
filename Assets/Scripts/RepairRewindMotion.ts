/** One cancellable world-space motion. Pausing simply stops tick; no timers or delayed callbacks. */
import {Pose} from "./RepairSession";
import {copyNativePose,copyPose,applyPose} from "./RepairRewindSceneContracts";
export class RepairRewindMotion {
  private job:{object:SceneObject;from:Pose;to:Pose;elapsed:number;duration:number;generation:number;done:()=>void}|null=null;
  private generation=0;
  get busy():boolean{return this.job!==null;}
  get progress():number{return this.job?this.job.elapsed/this.job.duration:0;}
  start(object:SceneObject,to:Pose,duration:number,done:()=>void) {
    if(this.job)throw new Error("Motion already running");
    this.job={object,from:copyNativePose(object),to:copyPose(to),elapsed:0,duration:Math.max(.1,duration),generation:this.generation,done};
  }
  cancel(){this.generation++;this.job=null;}
  tick(dt:number) {
    const job=this.job;if(!job||job.generation!==this.generation)return;
    job.elapsed=Math.min(job.duration,job.elapsed+Math.max(0,dt));
    const u=job.elapsed/job.duration,t=u*u*(3-2*u),a=job.from.position,b=job.to.position;
    const qa=job.from.rotation,qb=job.to.rotation;
    const q=quat.slerp(new quat(qa.w,qa.x,qa.y,qa.z),new quat(qb.w,qb.x,qb.y,qb.z),t);
    job.object.getTransform().setWorldPosition(new vec3(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t+4*Math.sin(Math.PI*t),a.z+(b.z-a.z)*t+6*Math.sin(Math.PI*t)));
    job.object.getTransform().setWorldRotation(q);
    if(u===1&&job.generation===this.generation){applyPose(job.object,job.to);this.job=null;job.done();}
  }
}
