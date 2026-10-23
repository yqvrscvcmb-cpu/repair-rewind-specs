/** Precise adversarial adapter inputs on actual native objects, plus native UIKit actions. */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario";
import {Driver,check,sleep,samePose} from "./RepairRewindTestSupport";
@component
export class RepairRewindFreezeScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);const d=new Driver();d.main.motionSeconds=2;
    check(!d.main.select("unknown",d.main.snapshot().revision),"NEGATIVE controller: unknown part rejected without exception");
    const freeze=async(id:string)=>{
      if(d.main.snapshot().stage!=="awaiting-confirmation")for(const action of ["capture","begin","undo","return","confirm","back"] as const){
        const before=d.main.snapshot();check(!d.command(action,id),"NEGATIVE controller: "+action+" blocked during "+before.stage);
        check(JSON.stringify(d.main.snapshot())===JSON.stringify(before),"NEGATIVE controller: blocked "+action+" preserves "+before.stage);
      }
      check(d.command("pause"),"pause accepted during motion");const before=d.main.snapshot(),pose=d.pose(id);
      for(const action of ["capture","begin","undo","return","confirm","back"] as const)check(!d.command(action,id),"NEGATIVE controller: "+action+" blocked while paused at "+before.stage);
      await sleep(2000);check(samePose(d.pose(id),pose),"paused transform frozen");
      check(d.main.snapshot().motionProgress===before.motionProgress,"elapsed time frozen");
      check(JSON.stringify(d.main.snapshot().session)===JSON.stringify(before.session),"counts and saved poses frozen");
      check(d.main.snapshot().guidanceCount===0&&!d.main.snapshot().arcVisible,"paused guidance absent");
      check(d.command("resume"),"resume accepted");await d.idle();
    };
    await d.target("RepairRewind Cover");
    const capture={action:"capture" as const,partId:"cover",revision:d.main.snapshot().revision};
    check(d.main.intent(capture),"capture starts");check(!d.main.intent(capture),"double capture rejected");
    for(const action of ["capture","begin","undo","return","confirm","back"] as const){
      const before=d.main.snapshot();check(!d.command(action,"cover"),"NEGATIVE controller: "+action+" blocked during capture motion");
      check(JSON.stringify(d.main.snapshot())===JSON.stringify(before),"NEGATIVE controller: blocked "+action+" changes neither state nor geometry");
    }
    await sleep(600);await freeze("cover");check(d.main.snapshot().session.recordedCount===1,"one record after resume");
    check(d.command("undo","cover"),"undo capture starts");await sleep(600);await freeze("cover");
    check(d.main.snapshot().session.recordedCount===0,"undo removes only observation");
    await d.capture("cover");await d.capture("ring");await d.capture("gear");
    check(d.main.snapshot().session.steps.map(s=>s.sequence).join(",")==="1,2,3","recapture contiguous sequence");
    await d.action("begin");const ret={action:"return" as const,partId:"gear",revision:d.main.snapshot().revision};
    check(d.main.intent(ret),"return starts");check(!d.main.intent(ret),"double return rejected");
    await sleep(600);await freeze("gear");check(d.main.snapshot().stage==="awaiting-confirmation","return resumes to confirmation");
    check(!d.command("back","gear"),"Back blocked before explicit confirmation");
    await freeze("gear");check(d.main.snapshot().session.returnedCount===0,"pause awaiting confirmation never auto advances");
    await d.action("confirm");check(d.command("back","gear"),"undo return starts");await sleep(600);await freeze("gear");
    await d.returnCurrent();check(d.command("back","gear"),"second Back begins");await sleep(600);
    check(d.command("reset"),"reset modal during undo");const frozen=d.pose("gear");await sleep(400);check(samePose(d.pose("gear"),frozen),"modal freezes movement");
    check(d.command("cancelReset"),"cancel modal");await sleep(150);check(!samePose(d.pose("gear"),frozen),"cancel resumes same motion");
    check(d.command("reset")&&d.command("confirmReset"),"confirmed reset cancels undo");await sleep(2500);
    d.main.snapshot().parts.forEach(p=>check(samePose(p.pose,p.initial),"old callback cannot change "+p.id));
    await d.capture("gear");check(d.main.snapshot().session.steps[0].sequence===1,"next record is one");
    for(const kind of ["capture","return","undo"] as const){
      check(d.command("reset")&&d.command("confirmReset"),"reset fixture before "+kind);
      if(kind==="capture") {await d.target("RepairRewind Cover");check(d.command("capture","cover"),"capture cancellation fixture");}
      else {await d.capture("cover");if(kind==="return"){await d.action("begin");check(d.command("return","cover"),"return cancellation fixture");}else check(d.command("undo","cover"),"undo mark cancellation fixture");}
      await sleep(500);check(d.command("reset"),"modal during "+kind);const before=d.main.snapshot();
      await sleep(2000);check(JSON.stringify(d.main.snapshot().session)===JSON.stringify(before.session),"modal session frozen during "+kind);
      check(samePose(d.pose("cover"),before.parts[0].pose),"modal geometry frozen during "+kind);
      check(d.command("confirmReset"),"confirm cancellation during "+kind);await sleep(2300);
      const cleared=d.main.snapshot();check(cleared.session.recordedCount===0&&cleared.session.returnedCount===0&&cleared.stage==="ready","generation invalidation during "+kind);
      cleared.parts.forEach(p=>check(samePose(p.pose,p.initial),"no old "+kind+" callback: "+p.id));
    }
    console.log("[RepairRewind LEAF] freeze: capture/return/confirmation/both undo motions/modal/reset cancellation PASS");
  }
}
