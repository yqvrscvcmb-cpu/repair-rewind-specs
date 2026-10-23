/** Native Preview mouse acceptance. This scenario only observes; the official
 * InjectPreviewGesture MCP tool supplies real mouse/touch events at projected targets.
 * MOUSE requests must be handled by the host; no controller intents are invoked here.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario";
import {controller,check,sleep,samePose,findSceneObjectByName} from "./RepairRewindTestSupport";
import {RRAction,copyNativePose} from "../Scripts/RepairRewindSceneContracts";
import {RepairRewindInputWait} from "./RepairRewindInputWait";
import {nextFrame} from "Leaf.lspkg/Utils/common/Utils";
import {MouseInteractor} from "SpectaclesInteractionKit.lspkg/Core/MouseInteractor/MouseInteractor";
@component
export class RepairRewindMouseScenario extends Scenario {
  private step=0;
  async run():Promise<void>{
    const input=new RepairRewindInputWait();input.attach(this);
    this.createEvent("HoverEvent").bind(e=>{const p=e.getHoverPosition();console.log("[RepairRewind MOUSE HOVER] "+JSON.stringify({x:p.x,y:p.y,time:Date.now()}));});
    const nativeMouse=findSceneObjectByName("MouseInteractor").getComponent(MouseInteractor.getTypeName()) as MouseInteractor;
    let lastTrigger=-1;
    this.createEvent("UpdateEvent").bind(()=>{if(nativeMouse.currentTrigger!==lastTrigger){lastTrigger=nativeMouse.currentTrigger;console.log("[RepairRewind MOUSE TRIGGER] "+JSON.stringify({trigger:lastTrigger,target:nativeMouse.currentInteractable?nativeMouse.currentInteractable.sceneObject.name:null,time:Date.now()}));}});
    await sleep(1500);const main=controller();
    // Hide only LEAF's test overlay for product captures; all console assertions
    // and the final native result remain logged. Do not alter product visibility.
    const testOverlay=findSceneObjectByName("LeafDebugUICamera");if(testOverlay)testOverlay.enabled=false;
    // The host measures the actual native viewport mapping, including letterboxing,
    // with two harmless edge taps before projecting any actionable target.
    console.log("[RepairRewind CALIBRATE] edge taps at (0.05,0.2) and (0.05,0.8)");await sleep(1800);
    const idle=async()=>{for(let i=0;i<160;i++){if(!main.snapshot().stage.startsWith("moving")&&!main.snapshot().stage.startsWith("undoing"))return;await sleep(25);}throw new Error("Mouse motion timeout");};
    const click=async(name:string,expectChange=true)=>{
      const object=findSceneObjectByName(name);check(!!object&&object.enabled,"MOUSE target enabled: "+name);
      const point=main.camera.worldSpaceToScreenSpace(object.getTransform().getWorldPosition()),revision=main.snapshot().revision;
      check(point.x>0&&point.x<1&&point.y>0&&point.y<1,"MOUSE target inside viewport: "+name);
      const before=JSON.stringify(main.snapshot()),priorPart=main.inputReceipt(),request=input.request(name,point.x,point.y);
      console.log("[RepairRewind MOUSE] "+JSON.stringify({step:++this.step,...request}));
      const receipt=await input.wait(request);
      // Native TouchEnd and SIK trigger handlers may run in different phases.
      await nextFrame();await nextFrame();
      const mouse=findSceneObjectByName("MouseInteractor").getComponent(MouseInteractor.getTypeName()) as MouseInteractor;
      console.log("[RepairRewind MOUSE INTERACTOR] "+JSON.stringify({requestId:request.id,active:mouse.isActive(),targeting:mouse.isTargeting(),trigger:mouse.currentTrigger,target:mouse.currentInteractable?mouse.currentInteractable.sceneObject.name:null,start:mouse.startPoint,end:mouse.endPoint,direction:mouse.direction}));
      if(!expectChange){
        for(let i=0;i<50;i++){const handled=main.inputReceipt();if(handled&&handled.sequence>(priorPart?priorPart.sequence:0)&&handled.id==="cover")break;await sleep(20);}
        const handled=main.inputReceipt();
        check(!!handled&&handled.sequence>(priorPart?priorPart.sequence:0)&&handled.id==="cover"&&!handled.accepted,"RR008 matching wrong Cover handler processed after request");
        check(main.presentation().notice==="Return Gear first","RR006 wrong-part mouse explains Return Gear first");
        check(JSON.stringify(main.snapshot())===before,"NEGATIVE MOUSE: wrong part changes neither state nor geometry after matching input");
        const assertionAt=Date.now();check(request.requestedAt<receipt.inputAt&&receipt.inputAt<assertionAt,"RR008 request < actual matching native input < assertion");
        console.log("[RepairRewind WRONG PART EVIDENCE] "+JSON.stringify({request,receipt,handled,assertionAt,notice:main.presentation().notice}));return;
      }
      for(let i=0;i<400;i++){if(main.snapshot().revision!==revision){await sleep(80);return;}await sleep(25);}
      throw new Error("No standard SIK mouse activation: "+name);
    };
    const action=async(a:RRAction)=>{
      for(let i=0;i<5;i++){const name="RepairRewind action "+a+" "+i;const o=findSceneObjectByName(name);if(o&&o.enabled){await click(name);return;}}
      throw new Error("Missing mouse action "+a);
    };
    const evidence=async(label:string,duration=2200)=>{
      check(findSceneObjectByName("RepairRewind label Simulated assembly · session memory").enabled,"MOUSE simulation label present: "+label);
      console.log("[RepairRewind CAPTURE] "+JSON.stringify({step:++this.step,label,state:main.snapshot()}));await sleep(duration);
    };
    const capture=async(id:string)=>{const before=main.snapshot().session.recordedCount;await click("RepairRewind "+id[0].toUpperCase()+id.slice(1));check(main.snapshot().selected===id,"MOUSE selected "+id);await action("capture");await idle();check(main.snapshot().session.recordedCount===before+1,"MOUSE captured exactly once: "+id);};
    const returned=async()=>{const before=main.snapshot();await action("return");await idle();check(main.snapshot().session.returnedCount===before.session.returnedCount,"MOUSE arrival awaits explicit confirmation");check(samePose(main.snapshot().parts.find(p=>p.id===before.session.current.partId).pose,before.session.current.origin),"MOUSE arrival matches recorded world pose");await action("confirm");};
    // Only the first test motion is slowed to allow native screenshot round trips.
    const normalSeconds=main.motionSeconds;main.motionSeconds=4;
    await click("RepairRewind Cover");check(main.snapshot().selected==="cover","MOUSE selected cover");await action("capture");check(main.snapshot().stage==="moving-to-tray"&&main.snapshot().session.recordedCount===1,"MOUSE capture starts one motion");await evidence("capture-motion",500);await idle();main.motionSeconds=normalSeconds;await evidence("capture-arrived");
    await capture("ring");await capture("gear");await action("undo");await idle();await capture("gear");
    await evidence("recorded-camera-before");
    const anchors=main.snapshot().session.steps.map(s=>({name:"RepairRewind origin "+s.sequence+" "+s.partId,pose:s.origin}));
    const cameraBefore=copyNativePose(main.camera.getSceneObject());await evidence("camera-move",3500);
    check(!samePose(copyNativePose(main.camera.getSceneObject()),cameraBefore),"MOUSE host camera actually moved");
    anchors.forEach(a=>check(samePose(copyNativePose(findSceneObjectByName(a.name)),a.pose),"MOUSE camera move preserves world anchor "+a.name));
    await evidence("camera-restore",1800);
    await action("begin");check(main.snapshot().session.current.partId==="gear","MOUSE reverse starts at gear");await click("RepairRewind Cover",false);await evidence("current-gear");
    await action("return");await idle();check(main.snapshot().session.returnedCount===0,"MOUSE no automatic confirmation");await evidence("awaiting-confirmation");await action("confirm");
    await action("pause");check(main.snapshot().guidanceCount===0&&!main.snapshot().arcVisible,"MOUSE paused guidance absent");await evidence("paused");
    await action("resume");check(main.snapshot().session.current.partId==="ring","MOUSE resume on ring");await evidence("current-ring");
    await action("back");await idle();check(main.snapshot().session.current.partId==="gear","MOUSE Back reopens gear");
    for(const id of ["gear","ring","cover"]){check(main.snapshot().session.current.partId===id,"MOUSE actual reverse order "+id);await returned();}
    check(main.snapshot().session.mode==="complete","MOUSE completion");await evidence("completed");
    await action("back");await idle();check(main.snapshot().session.current.partId==="cover","MOUSE Back after completion");await returned();
    await action("reset");await evidence("reset-modal");await action("cancelReset");check(main.snapshot().session.mode==="complete","MOUSE cancel reset preserves state");
    await action("reset");await action("confirmReset");await idle();await evidence("reset");
    const end=main.snapshot();check(end.session.recordedCount===0&&end.session.returnedCount===0&&end.guidanceCount===0,"MOUSE reset clears memory");
    end.parts.forEach(p=>check(samePose(p.pose,p.initial),"MOUSE reset original "+p.id));
    console.log("[RepairRewind MOUSE] ALL STANDARD SIK MOUSE ACTIONS PASSED");
  }
}
