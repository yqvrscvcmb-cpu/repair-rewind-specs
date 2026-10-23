import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor";
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils";
import {findSceneObjectByName,sleep} from "Leaf.lspkg/Utils/common/Utils";
import {RepairRewindMain} from "../Scripts/RepairRewindMain";
import {RRAction} from "../Scripts/RepairRewindSceneContracts";
export {sleep,findSceneObjectByName};
export function controller():RepairRewindMain {
  return findSceneObjectByName("RepairRewind").getComponent(RepairRewindMain.getTypeName()) as RepairRewindMain;
}
export function check(ok:boolean,message:string){if(!ok)throw new Error("RepairRewind assertion: "+message);console.log("[RepairRewind assertion PASS] "+message);}
export function near(a:number,b:number){return Math.abs(a-b)<.01;}
export function samePose(a:any,b:any){
  const position=Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)<.01;
  const q=a.rotation,r=b.rotation,norm=Math.hypot(q.w,q.x,q.y,q.z)*Math.hypot(r.w,r.x,r.y,r.z);
  const dot=Math.abs(q.w*r.w+q.x*r.x+q.y*r.y+q.z*r.z)/norm;
  return position&&2*Math.acos(Math.min(1,dot))<.1*Math.PI/180;
}
export class Driver {
  main=controller(); hand=new DefaultLeafInteractor();
  async target(name:string){const t=findInteractablesByName(name,undefined,true)[0];check(!!t,"native Interactable exists: "+name);await this.hand.trigger(t);await sleep(40);}
  async action(action:RRAction){
    const slots=[0,1,2,3,4];let name="";
    for(const i of slots){const candidate="RepairRewind action "+action+" "+i;if(findInteractablesByName(candidate,undefined,true).length){name=candidate;break;}}
    check(!!name,"visible UIKit action: "+action);await this.target(name);
  }
  command(action:RRAction,partId=""){return this.main.intent({action,partId,revision:this.main.snapshot().revision});}
  async idle(){for(let i=0;i<240;i++){if(!this.main.snapshot().stage.startsWith("moving")&&!this.main.snapshot().stage.startsWith("undoing"))return;await sleep(25);}throw new Error("native motion did not settle");}
  async capture(id:string){await this.target("RepairRewind "+id[0].toUpperCase()+id.slice(1));await this.action("capture");await this.idle();}
  async returnCurrent(){const current=this.main.snapshot().session.current,id=current.partId;await this.action("return");await this.idle();check(this.main.snapshot().stage==="awaiting-confirmation","arrival requires explicit confirmation");check(samePose(this.pose(id),current.origin),"native arrival matches recorded world pose: "+id);await this.action("confirm");return id;}
  pose(id:string){return this.main.snapshot().parts.find(p=>p.id===id).pose;}
}
