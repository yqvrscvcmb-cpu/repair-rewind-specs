/** Orchestrates the unchanged RepairSession, authored assembly, passive UI and cancellable motion.
 * Explicit simulation only. No recognition, persistence, physical verdict, or network.
 */
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import {RepairSession,Pose} from "./RepairSession";
import {RepairRewindPanelUI} from "./RepairRewindPanelUI";
import {RepairRewindMotion} from "./RepairRewindMotion";
import {RR_IDS,RR_LABELS,RRIntent,RRButton,copyNativePose,copyPose,applyPose} from "./RepairRewindSceneContracts";
import {partMesh,baseMesh,trayMesh,RR_CYAN,RR_AMBER} from "./RepairRewindAssemblyMesh";
import {RepairRewindArc} from "./RepairRewindArc";
import {edgeHintFor,RREdgeHint} from "./RepairRewindGuidance";

type Stage="ready"|"moving-to-tray"|"moving-to-origin"|"awaiting-confirmation"|"undoing-mark"|"undoing-return";
type Part={id:string;label:string;object:SceneObject;initial:Pose;tray:Pose;outline:SceneObject;returnOutline:SceneObject;interactable:Interactable;collider:ColliderComponent};

@component
export class RepairRewindMain extends BaseScriptComponent {
  @ui.label("Repair Rewind · session orchestration")
  @ui.group_start("References")
  @input @allowUndefined @hint("Passive UIKit panel component") panel:RepairRewindPanelUI;
  @input @allowUndefined @hint("Vented cover semantic root") cover:SceneObject;
  @input @allowUndefined @hint("Open retaining ring semantic root") ring:SceneObject;
  @input @allowUndefined @hint("Toothed gear semantic root") gear:SceneObject;
  @input @allowUndefined @hint("Supporting base root") base:SceneObject;
  @input @allowUndefined @hint("Three-slot tray root") tray:SceneObject;
  @input @allowUndefined @hint("Cover tray destination") coverSlot:SceneObject;
  @input @allowUndefined @hint("Ring tray destination") ringSlot:SceneObject;
  @input @allowUndefined @hint("Gear tray destination") gearSlot:SceneObject;
  @input @allowUndefined @hint("World-space recorded ghosts and arc parent") guidance:SceneObject;
  @input @allowUndefined @hint("Local imported vertex color material") material:Material;
  @input @allowUndefined @hint("Main perspective camera for offscreen hints") camera:Camera;
  @ui.group_end
  @ui.group_start("Settings")
  @input @hint("Seconds per lift or return, excluding pauses") @widget(new SliderWidget(.6,4,.1)) motionSeconds:number=1.6;
  @input @hint("Volume of local capture and confirmation cues") @widget(new SliderWidget(0,1,.05)) cueVolume:number=.45;
  @input @hint("Show collider boundaries for inspection") debugColliders:boolean=false;
  @ui.group_end
  private session=new RepairSession(3);
  private motion=new RepairRewindMotion();
  private parts:Part[]=[];
  private stage:Stage="ready";
  private selected="";
  private revision=0;
  private resetModal=false;
  private initialized=false;
  private ghosts:SceneObject[]=[];
  private arc:RepairRewindArc|null=null;
  private arcPartId="";
  private edgeHint:RREdgeHint|null=null;
  private partInputSequence=0;
  private lastPartInput:{sequence:number;id:string;accepted:boolean;notice:string;time:number;wallAt:number}|null=null;
  private captureAudio:AudioComponent;
  private confirmAudio:AudioComponent;
  private notice="";

  onAwake() {
    this.createEvent("OnStartEvent").bind(()=>this.start());
    this.createEvent("UpdateEvent").bind(()=>this.update());
    this.createEvent("LateUpdateEvent").bind(()=>this.updateGuidance());
    this.createEvent("OnDestroyEvent").bind(()=>this.motion.cancel());
  }
  private start() {
    if(!this.panel||!this.cover||!this.ring||!this.gear||!this.base||!this.tray||!this.coverSlot||!this.ringSlot||!this.gearSlot||!this.guidance||!this.material||!this.camera){console.log("[RepairRewind] Awaiting Phase B references");return;}
    baseMesh(this.base,this.material);trayMesh(this.tray,this.material);
    const objects=[this.cover,this.ring,this.gear],slots=[this.coverSlot,this.ringSlot,this.gearSlot];
    objects.forEach((object,i)=>{
      partMesh(object,RR_IDS[i],this.material);
      const outline=partMesh(object,RR_IDS[i],this.material,true,RR_CYAN);outline.enabled=false;
      outline.getTransform().setLocalPosition(new vec3(0,0,1.3));
      const returnOutline=partMesh(object,RR_IDS[i],this.material,true,RR_AMBER);returnOutline.enabled=false;
      returnOutline.getTransform().setLocalPosition(new vec3(0,0,1.4));
      const collider=object.createComponent("Physics.ColliderComponent") as ColliderComponent;
      const shape=Shape.createBoxShape();shape.size=new vec3(i===0?9.6:8,8,3);collider.shape=shape;collider.debugDrawEnabled=this.debugColliders;
      const interactable=object.createComponent(Interactable.getTypeName()) as Interactable;
      const part={id:RR_IDS[i],label:RR_LABELS[i],object,initial:copyNativePose(object),tray:copyNativePose(slots[i]),outline,returnOutline,interactable,collider};
      this.parts.push(part);
      let pressedRevision=-1;
      interactable.onTriggerStart.add(()=>{pressedRevision=this.revision;});
      interactable.onTriggerEnd.add(()=>{
        const accepted=this.select(part.id,pressedRevision);pressedRevision=-1;
        this.lastPartInput={sequence:++this.partInputSequence,id:part.id,accepted,notice:this.notice,time:getTime(),wallAt:Date.now()};
        console.log("[RepairRewind PART INPUT] "+JSON.stringify(this.lastPartInput));
      });
      interactable.onHoverEnter.add(()=>{if(this.canSelect(part.id))outline.enabled=true;});
      interactable.onHoverExit.add(()=>this.updateHighlights());
    });
    this.captureAudio=this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent;
    this.captureAudio.audioTrack=requireAsset("../GeneratedSFX/RepairRewindCapture.wav") as AudioTrackAsset;
    this.confirmAudio=this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent;
    this.confirmAudio.audioTrack=requireAsset("../GeneratedSFX/RepairRewindConfirmed.wav") as AudioTrackAsset;
    for(const a of [this.captureAudio,this.confirmAudio]){a.volume=this.cueVolume;a.playbackMode=Audio.PlaybackMode.LowLatency;}
    this.panel.onIntent.add(intent=>this.intent(intent));
    this.initialized=true;this.refresh();console.log("[RepairRewind] Ready: three-part simulated assembly; explicit session memory");
  }
  private canSelect(id:string):boolean {
    const v=this.session.view();return this.parts.some(p=>p.id===id)&&!this.resetModal&&!this.motion.busy&&v.mode==="recording"&&!v.steps.some(s=>s.partId===id);
  }
  public select(id:string,revision:number):boolean {
    if(revision!==this.revision||!this.parts.some(p=>p.id===id))return false;
    if(!this.canSelect(id)){
      const v=this.session.view();
      if(!this.resetModal&&!this.motion.busy&&v.mode!=="paused")return this.reject(v.mode==="recording"?"Already remembered · choose another part":v.current?"Return "+v.current.label+" first":"All recorded parts returned");
      return false;
    }
    this.selected=id;this.notice="";this.refresh();return true;
  }
  private reject(reason:string):false {this.notice=reason;this.panel.setNotice(reason);return false;}
  public inputReceipt(){return this.lastPartInput?{...this.lastPartInput}:null;}
  private part(id:string):Part {const p=this.parts.find(x=>x.id===id);if(!p)throw new Error("Unknown part");return p;}
  private move(part:Part,to:Pose,stage:Stage,after:Stage) {
    this.stage=stage;this.motion.start(part.object,to,this.motionSeconds,()=>{this.stage=after;this.refresh();});
  }
  public intent(input:RRIntent):boolean {
    if(!this.initialized||input.revision!==this.revision)return false;
    const view=this.session.view(),id=input.partId;
    if(this.resetModal) {
      if(input.action==="cancelReset"){this.resetModal=false;this.refresh();return true;}
      if(input.action!=="confirmReset")return false;
      this.motion.cancel();this.session.reset();this.stage="ready";this.selected="";this.resetModal=false;this.notice="";
      this.parts.forEach(p=>applyPose(p.object,p.initial));this.refresh();return true;
    }
    if(input.action==="reset"){this.resetModal=true;this.refresh();return true;}
    if(input.action==="pause"&&(view.mode==="recording"||view.mode==="rewinding")){this.session.pause();this.refresh();return true;}
    if(input.action==="resume"&&view.mode==="paused"){this.session.resume();this.refresh();return true;}
    if(view.mode==="paused"||this.motion.busy)return false;
    switch(input.action) {
      case "capture": {
        if(id!==this.selected||!this.canSelect(id))return this.reject(view.steps.some(s=>s.partId===id)?"Already remembered · choose another part":"Select an unrecorded part first");
        const p=this.part(id);this.session.record(id,p.label,copyNativePose(p.object));
        this.selected="";this.captureAudio.play(1);this.move(p,p.tray,"moving-to-tray","ready");break;
      }
      case "undo": {
        if(view.mode!=="recording"||!view.steps.length||id!==view.steps[view.steps.length-1].partId)return false;
        const step=this.session.undoLastRecord();this.selected="";this.move(this.part(step.partId),step.origin,"undoing-mark","ready");break;
      }
      case "begin":if(view.mode!=="recording"||!view.recordedCount)return false;this.session.beginReassembly();this.selected="";break;
      case "return": {
        if(view.current&&id!==view.current.partId)return this.reject("Return "+view.current.label+" first");
        if(view.mode!=="rewinding"||this.stage!=="ready"||!view.current)return false;
        this.move(this.part(id),view.current.origin,"moving-to-origin","awaiting-confirmation");break;
      }
      case "confirm": {
        if(view.current&&id!==view.current.partId)return this.reject("Return "+view.current.label+" first");
        if(view.mode!=="rewinding"||this.stage!=="awaiting-confirmation"||!view.current)return false;
        this.session.confirmReturn(id);this.stage="ready";this.confirmAudio.play(1);break;
      }
      case "back": {
        if(this.stage!=="ready"||!view.returnedCount||(view.mode!=="rewinding"&&view.mode!=="complete"))return false;
        const last=view.steps[view.steps.length-view.returnedCount];if(!last||id!==last.partId)return false;
        this.session.undoReturn();const p=this.part(last.partId);this.move(p,p.tray,"undoing-return","ready");break;
      }
      default:return false;
    }
    this.notice="";this.refresh();return true;
  }
  private refresh() {
    this.revision++;
    const v=this.session.view(),paused=v.mode==="paused",busy=this.motion.busy;
    const b=(label:string,action:RRButton["action"],partId="",enabled=true):RRButton=>({label,action,partId,enabled});
    let title="REPAIR REWIND",message="Select a part",buttons:RRButton[]=[];
    if(this.resetModal){title="Reset this session?";message="Restore originals and clear all marks.";buttons=[b("Keep session","cancelReset"),b("Confirm reset","confirmReset")];}
    else if(paused){buttons=[b("Resume","resume")];}
    else if(v.mode==="complete") {message="All recorded parts returned";buttons=[b("Back","back",v.steps[0].partId),b("Reset","reset")];}
    else if(v.mode==="recording") {
      message=busy?(this.stage==="undoing-mark"?"Restoring last mark…":"Original pose saved · lifting…"):(this.selected?"Selected: "+this.part(this.selected).label:"Select cover, ring or gear");
      buttons=[b("Remember & lift","capture",this.selected,!!this.selected&&!busy),b("Reassemble","begin","",v.recordedCount>0&&!busy),b("Undo mark","undo",v.steps.length?v.steps[v.steps.length-1].partId:"",v.recordedCount>0&&!busy),b("Pause","pause"),b("Reset","reset")];
    } else if(v.current) {
      message="Step "+v.current.sequence+" · "+v.current.label+(this.stage==="awaiting-confirmation"?" · confirm placement":busy?" · moving…":" · return to ghost");
      const last=v.steps[v.steps.length-v.returnedCount];
      buttons=[this.stage==="awaiting-confirmation"?b("Confirm returned","confirm",v.current.partId):b("Return this part","return",v.current.partId,!busy),b("Back","back",last?last.partId:"",v.returnedCount>0&&!busy&&this.stage==="ready"),b("Pause","pause"),b("Reset","reset")];
    }
    this.panel.render({revision:this.revision,title,message:this.notice||message,counts:v.recordedCount+" recorded · "+v.returnedCount+" returned",paused:paused&&!this.resetModal,buttons});
    this.ghosts.forEach(o=>o.destroy());this.ghosts=[];
    const show=!paused&&!this.resetModal;
    const markers=show?v.steps.filter(s=>v.mode==="recording"||(!!v.current&&s.partId===v.current.partId)):[];
    markers.forEach(step=>{
      const root=global.scene.createSceneObject("RepairRewind origin "+step.sequence+" "+step.partId);root.setParent(this.guidance);applyPose(root,step.origin);
      const active=!!v.current&&step.partId===v.current.partId;
      partMesh(root,step.partId,this.material,true,active?RR_AMBER:RR_CYAN);this.ghosts.push(root);
    });
    this.panel.setMarkers(markers.map(step=>({step,active:!!v.current&&step.partId===v.current.partId})));
    if(show&&v.current){const p=this.part(v.current.partId),o=v.current.origin.position;
      if(this.arc&&this.arcPartId!==p.id){this.arc.destroy();this.arc=null;}
      if(!this.arc){this.arc=new RepairRewindArc(this.guidance,p.object.getTransform().getWorldPosition(),new vec3(o.x,o.y,o.z),this.material);this.arcPartId=p.id;}
      this.arc.object.enabled=true;this.arc.update(p.object.getTransform().getWorldPosition());
    }else if(this.arc){
      if(paused||this.resetModal)this.arc.object.enabled=false;
      else{this.arc.destroy();this.arc=null;this.arcPartId="";}
    }
    this.updateGuidance();
    this.updateHighlights();
    console.log("[RepairRewind] "+JSON.stringify({mode:v.mode,stage:this.stage,recorded:v.recordedCount,returned:v.returnedCount,current:v.current?v.current.partId:null,revision:this.revision,resetModal:this.resetModal}));
  }
  private updateHighlights() {
    const v=this.session.view(),show=v.mode!=="paused"&&!this.resetModal;
    this.parts.forEach(p=>{p.outline.enabled=show&&this.selected===p.id;p.returnOutline.enabled=show&&!!v.current&&v.current.partId===p.id;p.interactable.enabled=show&&!this.motion.busy&&(v.mode==="recording"||v.mode==="rewinding");});
  }
  private update() {
    if(!this.initialized)return;
    if(this.session.view().mode!=="paused"&&!this.resetModal)this.motion.tick(getDeltaTime());
    // tick may finish a motion and refresh; use the fresh session below.
    const v=this.session.view();if(this.arc&&v.current)this.arc.update(this.part(v.current.partId).object.getTransform().getWorldPosition());
  }
  private updateGuidance(){
    if(!this.initialized)return;
    const v=this.session.view();this.edgeHint=v.current&&!this.resetModal?edgeHintFor(this.camera,v.current.origin.position):null;
    this.panel.setEdgeHint(this.edgeHint,this.camera);
  }
  public presentation(){return {notice:this.notice,edgeHint:this.edgeHint?{...this.edgeHint}:null,arc:this.arc?this.arc.snapshot():null};}
  public snapshot() {return {session:this.session.view(),stage:this.stage,revision:this.revision,selected:this.selected,resetModal:this.resetModal,motionProgress:this.motion.progress,parts:this.parts.map(p=>({id:p.id,pose:copyNativePose(p.object),initial:copyPose(p.initial),tray:copyPose(p.tray)})),guidanceCount:this.ghosts.length,arcVisible:!!this.arc&&this.arc.object.enabled};}
}
