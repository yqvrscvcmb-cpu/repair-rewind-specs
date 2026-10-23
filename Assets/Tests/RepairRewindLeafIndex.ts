import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator";
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata";
import {DefaultScenarioManager} from "Leaf.lspkg/Scenarios/scenario/manager/DefaultLeafScenarioManager";
import {RepairRewindLoopScenario} from "./RepairRewindLoopScenario";
import {RepairRewindFreezeScenario} from "./RepairRewindFreezeScenario";
import {RepairRewindPoseScenario} from "./RepairRewindPoseScenario";
import {RepairRewindMouseScenario} from "./RepairRewindMouseScenario";
import {RepairRewindInputTimeoutScenario} from "./RepairRewindInputTimeoutScenario";
import {RepairRewindReviewScenario} from "./RepairRewindReviewScenario";
import {RepairRewindGuidanceScenario} from "./RepairRewindGuidanceScenario";
@component
export class RepairRewindLeafIndex extends BaseScriptComponent {
  @input @hint("Temporary local mouse evidence run; keep false for normal Preview and serial LEAF runs") runMouseEvidence:boolean=false;
  @input @hint("Local evidence scenario ID; used only when runMouseEvidence is true") evidenceScenario:string="repair-rewind-mouse";
  onAwake(){
    if(this.runMouseEvidence)this.createEvent("OnStartEvent").bind(()=>{
      DefaultScenarioManager.getInstance().startScenario(this.evidenceScenario)
        .then(()=>console.log("[RepairRewind mouse runner] completed"))
        .catch(error=>console.error("[RepairRewind mouse runner] "+error));
    });
  }
  @scenariosIndex
  static scenariosIndex:ScenarioMetadata[]=[
    {id:"repair-rewind-loop",typename:RepairRewindLoopScenario.getTypeName()},
    {id:"repair-rewind-freeze",typename:RepairRewindFreezeScenario.getTypeName()},
    {id:"repair-rewind-pose",typename:RepairRewindPoseScenario.getTypeName()},
    {id:"repair-rewind-mouse",typename:RepairRewindMouseScenario.getTypeName()},
    {id:"repair-rewind-input-timeout",typename:RepairRewindInputTimeoutScenario.getTypeName()},
    {id:"repair-rewind-review",typename:RepairRewindReviewScenario.getTypeName()},
    {id:"repair-rewind-guidance",typename:RepairRewindGuidanceScenario.getTypeName()}
  ];
}
