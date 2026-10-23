/** Deliberately withholds native input through the same waiter as mouse acceptance.
 * Late/wrong event-state probes are labelled synthetic; no input is fabricated as native.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario";
import {RepairRewindInputWait} from "./RepairRewindInputWait";
import {check} from "./RepairRewindTestSupport";
@component
export class RepairRewindInputTimeoutScenario extends Scenario {
  async run():Promise<void>{
    const gate=new RepairRewindInputWait();gate.attach(this);
    const withheld=gate.request("withheld-cover",.3,.3,350);
    console.log("[RepairRewind WITHHOLD INPUT] "+JSON.stringify(withheld));
    let error="";try{await gate.wait(withheld);}catch(e){error=String(e);}
    check(error.indexOf("Matching native input timeout")>=0,"RR008 deliberately withheld native input FAILS the shared waiter");
    let rearm="";try{gate.request("withheld-cover",.3,.3,350);}catch(e){rearm=String(e);}
    check(rearm.indexOf("Expired mouse target")>=0,"RR008 expired target cannot be ambiguously rearmed");
    const old=gate.request("old-touch",.4,.4,250);
    gate.start(9,{x:.4,y:.4},Date.now());
    error="";try{await gate.wait(old);}catch(e){error=String(e);}
    check(error.indexOf("Matching native input timeout: "+old.name+" request="+old.id)>=0,"RR008 synthetic down without up expires for the exact request");
    const later=gate.request("later-ring",.6,.6,350);
    // A late old end, even at the new coordinates, has the old request identity.
    gate.end(9,{x:.6,y:.6},Date.now()+1);
    gate.end(10,{x:.6,y:.6},Date.now()+2); // unpaired generic TouchEnd
    gate.start(11,{x:.1,y:.1},Date.now()+3);gate.end(11,{x:.1,y:.1},Date.now()+4);
    error="";try{await gate.wait(later);}catch(e){error=String(e);}
    check(error.indexOf("Matching native input timeout")>=0,"RR008 synthetic late/unqueued/wrong-coordinate events cannot satisfy later request");
    console.log("[RepairRewind LEAF] input-timeout: expected timeout and stale receipt rejection PASS");
  }
}
