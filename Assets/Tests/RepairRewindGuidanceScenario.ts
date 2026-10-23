/** RR004 native camera/frustum tests. Camera moves; recorded anchors never move.
 * Host captures GUIDANCE CAPTURE windows. Invalid projection probes are synthetic
 * values at the same presentation boundary, not fabricated camera observations.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario";
import {Driver,check,sleep,samePose,findSceneObjectByName} from "./RepairRewindTestSupport";
import {copyNativePose,applyPose} from "../Scripts/RepairRewindSceneContracts";
import {edgeHintFor,RRProjectionCamera} from "../Scripts/RepairRewindGuidance";
@component
export class RepairRewindGuidanceScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);const d=new Driver(),camera=d.main.camera,transform=camera.getTransform(),savedCamera=copyNativePose(camera.getSceneObject());
    const tracking=camera.getSceneObject().getComponent("Component.DeviceTracking"),trackingEnabled=tracking?tracking.enabled:false;
    // Protect setup as well as the camera cases. Tracking must still be restored
    // if restoring the camera pose itself throws.
    const withCameraFixture=async(body:()=>Promise<void>)=>{
      const pose=copyNativePose(camera.getSceneObject()),enabled=tracking?tracking.enabled:false;
      try{if(tracking)tracking.enabled=false;await body();}
      finally{try{applyPose(camera.getSceneObject(),pose);}finally{if(tracking)tracking.enabled=enabled;}}
    };
    const assertRestored=(label:string)=>{
      check(samePose(copyNativePose(camera.getSceneObject()),savedCamera),"RR009 camera restored after "+label);
      if(tracking)check(tracking.enabled===trackingEnabled,"RR009 tracking restored after "+label);
      else console.log("[RepairRewind RR009] DeviceTracking absent; tracking restoration branch NOT_EXERCISED");
    };
    const sentinel=new Error("RR009 deliberate asynchronous setup failure");let caught:unknown=null;
    try{await withCameraFixture(async()=>{
      if(tracking)check(!tracking.enabled,"RR009 setup fixture disables tracking");
      transform.setWorldPosition(new vec3(savedCamera.position.x+17,savedCamera.position.y+11,savedCamera.position.z-9));
      transform.setWorldRotation(quat.quatIdentity());await sleep(40);throw sentinel;
    });}catch(error){caught=error;}
    check(caught===sentinel,"RR009 exact asynchronous setup failure propagates");assertRestored("forced setup failure");
    await withCameraFixture(async()=>{
    await d.capture("gear");await d.action("begin");
    const anchors=JSON.stringify(d.main.snapshot().session.steps),origin=d.main.snapshot().session.current.origin;
    const unchanged=()=>{
      check(JSON.stringify(d.main.snapshot().session.steps)===anchors,"RR004 recorded anchor tree immutable");
      const ghost=findSceneObjectByName("RepairRewind origin 1 gear");if(ghost&&ghost.enabled)check(samePose(copyNativePose(ghost),origin),"RR004 ghost stays at immutable saved world pose");
    };
    const capture=async(label:string)=>{console.log("[RepairRewind GUIDANCE CAPTURE] "+JSON.stringify({label,presentation:d.main.presentation(),camera:copyNativePose(camera.getSceneObject()),state:d.main.snapshot()}));await sleep(2100);};
    const aim=(local:vec3)=>{transform.setWorldRotation(quat.quatIdentity());transform.setWorldPosition(new vec3(origin.position.x-local.x,origin.position.y-local.y,origin.position.z-local.z));};
      const cases=[{name:"right",v:new vec3(200,0,-100),direction:"right"},{name:"left",v:new vec3(-200,0,-100),direction:"left"},{name:"up",v:new vec3(0,200,-100),direction:"up"},{name:"down",v:new vec3(0,-200,-100),direction:"down"},{name:"directly-behind",v:new vec3(0,0,100),direction:"right"},{name:"camera-plane",v:new vec3(0,0,0),direction:"right"},{name:"near-plane",v:new vec3(0,0,-camera.near/2),direction:"right"}];
      for(const c of cases){
        aim(c.v);await sleep(150);const hint=d.main.presentation().edgeHint,object=findSceneObjectByName("RepairRewind edge hint");
        console.log("[RepairRewind GUIDANCE OBSERVE] "+JSON.stringify({name:c.name,hint,camera:copyNativePose(camera.getSceneObject()),local:transform.getInvertedWorldTransform().multiplyPoint(new vec3(origin.position.x,origin.position.y,origin.position.z))}));
        check(!!hint&&hint.direction===c.direction,"RR004 correct edge for "+c.name);
        const world=object.getTransform().getWorldPosition(),screen=camera.worldSpaceToScreenSpace(world);
        check(object.enabled&&Number.isFinite(screen.x)&&Number.isFinite(screen.y)&&screen.x>.05&&screen.x<.95&&screen.y>.05&&screen.y<.95&&camera.isSphereVisible(world,0),"RR004 finite visible hint "+c.name);
        check(!camera.isSphereVisible(findSceneObjectByName("RepairRewind Status").getTransform().getWorldPosition(),5),"RR004 status panel outside view "+c.name);
        unchanged();await capture(c.name);
      }
      const fault:RRProjectionCamera={near:camera.near,getTransform:()=>camera.getTransform(),worldSpaceToScreenSpace:()=>({x:NaN,y:Infinity} as vec2),isSphereVisible:()=>false};
      aim(new vec3(200,0,-100));await sleep(100);
      const invalid=edgeHintFor(fault,origin.position),invalidTarget=edgeHintFor(camera,{x:NaN,y:0,z:0});
      check(!!invalid&&invalid.reason==="non-finite-projection"&&Number.isFinite(invalid.x)&&Number.isFinite(invalid.y),"RR004 non-finite projection guarded at native boundary");
      check(!!invalidTarget&&invalidTarget.reason==="non-finite-target"&&Number.isFinite(invalidTarget.x),"RR004 non-finite target guarded before projection");
      console.log("[RepairRewind PROJECTION BOUNDARY] "+JSON.stringify({kind:"synthetic-nonfinite-values-in-native-helper",invalidProjection:invalid,invalidTarget}));
      // The screenshot is the real offscreen camera's same visible fallback;
      // injected non-finite values above are helper probes, not camera readings.
      await capture("nonfinite-seam-visible-fallback");
      applyPose(camera.getSceneObject(),savedCamera);await sleep(180);
      check(d.main.presentation().edgeHint===null&&!findSceneObjectByName("RepairRewind edge hint").enabled,"RR004 restored view clears hint");unchanged();await capture("restored-view");
      aim(new vec3(200,0,-100));await sleep(120);
      check(d.command("pause"),"RR004 pause fixture");await sleep(120);check(d.main.presentation().edgeHint===null&&!findSceneObjectByName("RepairRewind edge hint").enabled,"RR004 pause clears hint");await capture("offscreen-paused");
      check(d.command("resume"),"RR004 resume fixture");await sleep(120);check(!!d.main.presentation().edgeHint,"RR004 resume recomputes hint");
      check(d.command("reset"),"RR004 modal fixture");await sleep(120);check(d.main.presentation().edgeHint===null&&!findSceneObjectByName("RepairRewind edge hint").enabled,"RR004 modal clears hint");await capture("offscreen-modal");
      check(d.command("cancelReset"),"RR004 cancel modal");await sleep(120);check(!!d.main.presentation().edgeHint,"RR004 cancel recomputes hint");unchanged();
      check(d.command("return","gear"),"RR004 complete fixture return");await d.idle();check(d.command("confirm","gear"),"RR004 complete fixture confirm");await sleep(120);
      check(d.main.presentation().edgeHint===null&&!findSceneObjectByName("RepairRewind edge hint").enabled,"RR004 complete/no-target clears stale hint after callback");await capture("offscreen-completed");
      check(d.command("reset")&&d.command("confirmReset"),"RR004 empty fixture");await sleep(120);check(d.main.presentation().edgeHint===null,"RR004 empty recording clears hint");
    });
    assertRestored("successful guidance scenario");
    console.log("[RepairRewind LEAF] guidance: four edges, behind, plane, near, nonfinite, restore and all clearing modes PASS");
  }
}
