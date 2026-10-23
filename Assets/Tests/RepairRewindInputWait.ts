/** Test-only request/TouchStart/TouchEnd correlation. A timeout expires the request;
 * queued ends and starts from earlier requests cannot acknowledge a later request.
 * Native listeners and adversarial event tests share this exact state machine.
 */
import {sleep} from "./RepairRewindTestSupport";
export type MouseRequest={id:number;name:string;x:number;y:number;sequence:number;requestedAt:number;deadline:number};
export type MouseReceipt={requestId:number;name:string;sequence:number;startSequence:number;x:number;y:number;inputAt:number};
export class RepairRewindInputWait {
  private sequence=0;
  private nextId=0;
  private active:MouseRequest|null=null;
  private receipt:MouseReceipt|null=null;
  private starts=new Map<number,{requestId:number;sequence:number}>();
  private expiredTargets=new Set<string>();
  attach(owner:BaseScriptComponent){
    owner.createEvent("TouchStartEvent").bind(e=>this.start(e.getTouchId(),e.getTouchPosition(),Date.now()));
    owner.createEvent("TouchEndEvent").bind(e=>{
      const p=e.getTouchPosition();this.end(e.getTouchId(),p,Date.now(),e.isCancelled());
      console.log("[RepairRewind TOUCH] "+JSON.stringify({x:p.x,y:p.y,sequence:this.sequence,matchingRequest:this.receipt?this.receipt.requestId:null,time:Date.now()}));
    });
  }
  request(name:string,x:number,y:number,timeoutMs=10000):MouseRequest {
    if(this.active)throw new Error("Mouse request already active");
    // Without an out-of-band identity, a new start at the same expired target is
    // ambiguous. Fail closed for that target for the lifetime of this waiter.
    if(this.expiredTargets.has(name))throw new Error("Expired mouse target requires a fresh scenario: "+name);
    const now=Date.now();this.receipt=null;
    this.active={id:++this.nextId,name,x,y,sequence:this.sequence,requestedAt:now,deadline:now+timeoutMs};
    return {...this.active};
  }
  private matches(p:{x:number;y:number},r:MouseRequest){return Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.hypot(p.x-r.x,p.y-r.y)<.025;}
  start(touchId:number,p:{x:number;y:number},now:number){
    const sequence=++this.sequence,r=this.active;
    this.starts.delete(touchId);
    if(r&&now>=r.requestedAt&&now<r.deadline&&this.matches(p,r))this.starts.set(touchId,{requestId:r.id,sequence});
  }
  end(touchId:number,p:{x:number;y:number},now:number,cancelled=false){
    const sequence=++this.sequence,r=this.active,start=this.starts.get(touchId);this.starts.delete(touchId);
    if(!cancelled&&r&&start&&start.requestId===r.id&&start.sequence>r.sequence&&sequence>start.sequence&&now>r.requestedAt&&now<r.deadline&&this.matches(p,r)){
      this.receipt={requestId:r.id,name:r.name,sequence,startSequence:start.sequence,x:p.x,y:p.y,inputAt:now};
      console.log("[RepairRewind INPUT RECEIPT] "+JSON.stringify(this.receipt));
    }
  }
  async wait(request:MouseRequest):Promise<MouseReceipt>{
    while(this.active&&this.active.id===request.id){
      if(this.receipt&&this.receipt.requestId===request.id){const receipt={...this.receipt};this.active=null;this.receipt=null;return receipt;}
      if(Date.now()>=request.deadline){this.active=null;this.receipt=null;this.expiredTargets.add(request.name);throw new Error("Matching native input timeout: "+request.name+" request="+request.id);}
      await sleep(20);
    }
    throw new Error("Mouse request expired or replaced: "+request.id);
  }
}
