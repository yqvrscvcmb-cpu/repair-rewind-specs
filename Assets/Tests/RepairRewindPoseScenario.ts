import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario";
import {Driver,check,sleep,samePose,findSceneObjectByName} from "./RepairRewindTestSupport";
import {copyNativePose} from "../Scripts/RepairRewindSceneContracts";
@component
export class RepairRewindPoseScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);const d=new Driver(),assembly=findSceneObjectByName("RepairRewind Assembly");
    const t=assembly.getTransform();t.setWorldPosition(t.getWorldPosition().add(new vec3(2,1,-2)));t.setWorldRotation(quat.fromEulerAngles(.03,.08,.04));
    const saved:{[id:string]:any}={};
    for(const id of ["ring","cover","gear"]){saved[id]=copyNativePose(findSceneObjectByName("RepairRewind "+id[0].toUpperCase()+id.slice(1)));await d.capture(id);}
    for(const step of d.main.snapshot().session.steps)check(samePose(step.origin,saved[step.partId]),"world numeric snapshot "+step.partId);
    const camera=d.main.camera.getTransform(),cameraPose=copyNativePose(d.main.camera.getSceneObject());
    camera.setWorldPosition(camera.getWorldPosition().add(new vec3(8,2,4)));
    await sleep(300);
    for(const step of d.main.snapshot().session.steps){const ghost=findSceneObjectByName("RepairRewind origin "+step.sequence+" "+step.partId);check(samePose(copyNativePose(ghost),saved[step.partId]),"ghost remains world anchored "+step.partId);}
    camera.setWorldPosition(new vec3(cameraPose.position.x,cameraPose.position.y,cameraPose.position.z));
    await d.action("begin");
    for(const id of ["gear","cover","ring"])check(await d.returnCurrent()===id,"actual arbitrary reverse order "+id);
    console.log("[RepairRewind LEAF] pose: rotated/translated assembly, camera movement, arbitrary recording order PASS");
  }
}
