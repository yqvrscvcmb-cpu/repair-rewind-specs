/** Native SIK/UIKit end-to-end loop. Scene names verified in runtime/source before authoring. */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario";
import {Driver,check,sleep,samePose,findSceneObjectByName} from "./RepairRewindTestSupport";
@component
export class RepairRewindLoopScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);const d=new Driver(),initial=d.main.snapshot();
    for(const id of ["cover","ring","gear"])await d.capture(id);
    const recorded=d.main.snapshot();
    check(recorded.session.recordedCount-initial.session.recordedCount===3,"three explicit records");
    check(recorded.guidanceCount===3,"three origin markers");
    check(!d.main.select("cover",recorded.revision),"NEGATIVE controller: already captured part cannot be selected");
    check(!d.command("capture","cover")&&d.main.snapshot().session.recordedCount===3,"NEGATIVE controller: duplicate capture adds no fourth record");
    recorded.parts.forEach(p=>check(samePose(p.pose,p.tray),p.id+" in own tray"));
    await d.action("begin");
    check(d.main.snapshot().session.current.partId==="gear","reverse begins at gear");
    check(!d.command("return","cover"),"wrong part cannot start return");
    const wrongBefore=d.main.snapshot();check(!d.command("confirm","cover"),"NEGATIVE controller: wrong confirmation rejected");
    check(JSON.stringify(d.main.snapshot())===JSON.stringify(wrongBefore),"NEGATIVE controller: wrong input preserves state and geometry");
    const returned=d.main.snapshot().session.returnedCount;
    await d.action("return");await d.idle();
    check(d.main.snapshot().session.returnedCount===returned,"arrival does not confirm");
    const stale={action:"confirm" as const,partId:"gear",revision:d.main.snapshot().revision};
    await d.action("confirm");check(!d.main.intent(stale),"stale gear confirmation rejected");
    check(!d.command("confirm","gear"),"NEGATIVE controller: duplicate identity with fresh revision rejected");
    check(d.main.snapshot().session.current.partId==="ring","next is ring");
    await d.action("pause");const paused=d.main.snapshot();
    check(paused.guidanceCount===0&&!paused.arcVisible,"pause hides ghosts and arc");
    await sleep(2000);check(JSON.stringify(d.main.snapshot().session)===JSON.stringify(paused.session),"pause preserves session");
    check(findSceneObjectByName("RepairRewind label Simulated assembly · session memory").enabled,"simulation label persists");
    await d.action("resume");check(d.main.snapshot().session.current.partId==="ring","resume on ring");
    await d.action("back");await d.idle();
    check(d.main.snapshot().session.current.partId==="gear","Back reopens last confirmed gear");
    check(samePose(d.pose("gear"),d.main.snapshot().parts[2].tray),"Back physically restores gear to tray");
    for(const id of ["gear","ring","cover"])check(await d.returnCurrent()===id,"reverse order "+id);
    check(d.main.snapshot().session.mode==="complete","completion");
    await d.action("back");await d.idle();check(d.main.snapshot().session.current.partId==="cover","Back after completion");
    await d.returnCurrent();
    await d.action("reset");await d.action("cancelReset");check(d.main.snapshot().session.mode==="complete","cancel reset preserves completion");
    await d.action("reset");await d.action("confirmReset");await sleep(1900);
    const reset=d.main.snapshot();check(reset.session.recordedCount===0&&reset.session.returnedCount===0&&reset.guidanceCount===0,"reset clears all history");
    reset.parts.forEach(p=>check(samePose(p.pose,p.initial),p.id+" reset to original"));
    console.log("[RepairRewind LEAF] loop: native SIK capture/reverse/pause/Back/completion/reset PASS");
  }
}
