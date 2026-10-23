/** Native regression of RR005/006/007 on live poses and retained ribbon vertices.
 * Controller negatives are explicit; positive flows use native LEAF SIK targets.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario";
import {Driver,check,sleep,samePose,findSceneObjectByName} from "./RepairRewindTestSupport";
@component
export class RepairRewindReviewScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);const d=new Driver(),initial=d.main.snapshot();d.main.motionSeconds=2.4;
    const poison=(tree:any)=>{if(!tree||typeof tree!=="object")return;for(const key of Object.keys(tree)){if(typeof tree[key]==="number")tree[key]=987654;if(typeof tree[key]==="string")tree[key]="mutated";else if(typeof tree[key]==="object")poison(tree[key]);}};
    const immutable=()=>{const baseline=JSON.stringify(d.main.snapshot()),out=d.main.snapshot();poison(out);check(JSON.stringify(d.main.snapshot())===baseline,"RR005 every returned snapshot tree is detached");};
    immutable();await d.capture("cover");immutable();
    check(samePose(d.pose("cover"),initial.parts[0].tray),"RR005 capture still reaches untouched tray");
    const before=d.main.snapshot();check(!d.main.select("cover",before.revision),"RR006 duplicate selection rejected");
    check(d.main.presentation().notice==="Already remembered · choose another part","RR006 duplicate explanation");
    check(JSON.stringify(d.main.snapshot())===JSON.stringify(before),"RR006 duplicate leaves session, poses and revision unchanged");
    await d.action("undo");await d.idle();check(samePose(d.pose("cover"),initial.parts[0].initial),"RR005 undo still reaches untouched original");
    await d.capture("cover");await d.capture("ring");await d.capture("gear");await d.action("begin");immutable();
    const wrong=d.main.snapshot();check(!d.command("return","cover"),"RR006 wrong return rejected");
    check(d.main.presentation().notice==="Return Gear first","RR006 wrong-part explanation");
    check(JSON.stringify(d.main.snapshot())===JSON.stringify(wrong),"RR006 wrong part leaves session, poses and revision unchanged");
    const pointNear=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.01;
    const arcMotion=async(action:"return"|"back")=>{
      const origin=d.main.snapshot().session.steps.find(s=>s.partId==="gear").origin.position;
      check(d.command(action,"gear"),"RR007 "+action+" starts");
      const object=findSceneObjectByName("RepairRewind return arc");let previous=d.pose("gear");
      for(let i=0;i<2;i++){
        await sleep(450);const s=d.main.snapshot(),arc=d.main.presentation().arc,pose=d.pose("gear");
        check(s.motionProgress>0&&s.motionProgress<1,"RR007 "+action+" intermediate "+i);
        check(!!arc&&pointNear(arc.from,pose.position)&&pointNear(arc.to,origin),"RR007 "+action+" moving endpoint follows part, destination fixed "+i);
        check(!samePose(previous,pose),"RR007 "+action+" two distinct moving frames "+i);previous=pose;
        check(findSceneObjectByName("RepairRewind return arc")===object,"RR007 same mesh object retained "+action);
        console.log("[RepairRewind ARC FRAME] "+JSON.stringify({action,frame:i,progress:s.motionProgress,arc,pose}));
      }
      check(d.command("pause"),"RR007 pause "+action);const paused=JSON.stringify({pose:d.pose("gear"),arc:d.main.presentation().arc,progress:d.main.snapshot().motionProgress});
      for(let i=0;i<2;i++){await sleep(350);check(JSON.stringify({pose:d.pose("gear"),arc:d.main.presentation().arc,progress:d.main.snapshot().motionProgress})===paused,"RR007 "+action+" paused frame stable "+i);}
      check(!d.main.snapshot().arcVisible,"RR007 paused arc hidden");check(d.command("resume"),"RR007 resume "+action);await d.idle();
    };
    await arcMotion("return");await d.action("confirm");await arcMotion("back");immutable();
    check(d.command("reset")&&d.command("confirmReset"),"RR005 reset after snapshot mutation");await sleep(2700);
    d.main.snapshot().parts.forEach((p,i)=>check(samePose(p.pose,initial.parts[i].initial),"RR005 reset original unchanged "+p.id));
    console.log("[RepairRewind LEAF] review: snapshots, rejection reasons, return/Back endpoints and paused stability PASS");
  }
}
