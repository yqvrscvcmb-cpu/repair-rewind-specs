/** Passive UIKit view: owns layout and displayed intent snapshots, never session decisions.
 * Authored roots: this status panel, actionsRoot, markerRoot. Text-only actions are intentional.
 */
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard";
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate";
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button";
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout";
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem";
import {FlexDirection,FlexAlign,FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes";
import {RRIntent,RRPanelView,RRMarker} from "./RepairRewindSceneContracts";
import {RREdgeHint} from "./RepairRewindGuidance";

const ROLES={title:{size:48,weight:700},body:{size:39,weight:500},caption:{size:38,weight:500}};
function applyTextRole(t:Text,role:keyof typeof ROLES,scale:number) {t.size=ROLES[role].size*scale;(t as Text & {weight?:number}).weight=ROLES[role].weight;}

@component
export class RepairRewindPanelUI extends BaseScriptComponent {
  @ui.label("Repair Rewind · passive UIKit view")
  @input @allowUndefined @hint("Authored lower action panel") actionsRoot:SceneObject;
  @input @allowUndefined @hint("World-space parent for recorded label anchors") markerRoot:SceneObject;
  @input @hint("Panel width in centimeters") @widget(new SliderWidget(32,44,1)) widthCm:number=38;
  @input @hint("Type scale multiplier for the local preview") @widget(new SliderWidget(.9,1.4,.05)) typeScale:number=1;
  @input('vec4','{1,0.96,0.87,1}') @hint("Warm white text color") @widget(new ColorWidget()) textColor:vec4;
  public onIntent=new Event<RRIntent>();
  private current:RRPanelView|null=null;
  private title:Text; private message:Text; private counts:Text;
  private plate:BackPlate; private actionPlate:BackPlate;
  private slots:{root:SceneObject;button:Button;label:Text;intent:RRIntent|null;down:RRIntent|null}[]=[];
  private labels:{root:SceneObject;text:Text}[]=[];
  private ready=false;
  private edgeRoot:SceneObject|null=null;
  private edgeText:Text;

  onAwake() {this.createEvent("OnStartEvent").bind(()=>this.build());this.createEvent("OnDestroyEvent").bind(()=>{if(this.edgeRoot&&!isNull(this.edgeRoot))this.edgeRoot.destroy();});}
  private obj(parent:SceneObject,name:string,z=0):SceneObject {
    const o=global.scene.createSceneObject(name);o.setParent(parent);o.getTransform().setLocalPosition(new vec3(0,0,z));return o;
  }
  private flex(parent:SceneObject,name:string,w:number,h:number,row=false):SceneObject {
    const o=this.obj(parent,name,.02),f=o.createComponent(FlexLayout.getTypeName()) as FlexLayout;
    // Installed UIKit 2.0 explicitly rejects pre-init addItems with auto discovery on.
    f.autoDiscoverItemsOnStart=false;
    f.width=w;f.height=h;f.direction=row?FlexDirection.Row:FlexDirection.Column;
    f.alignItems=FlexAlign.Center;f.justifyContent=FlexJustify.Center;f.rowGap=.4;f.columnGap=1;
    return o;
  }
  private item(parent:SceneObject,name:string,w:number,h:number):SceneObject {
    const o=this.obj(parent,name,.02),i=o.createComponent(FlexItem.getTypeName()) as FlexItem;
    i.overrideWidth=w;i.overrideHeight=h;i.flexShrink=0;
    const f=parent.getComponent(FlexLayout.getTypeName()) as FlexLayout;f.addItems([i]);return o;
  }
  private text(parent:SceneObject,value:string,w:number,h:number,role:keyof typeof ROLES="body"):Text {
    const o=this.item(parent,"RepairRewind label "+value,w,h),t=o.createComponent("Component.Text") as Text;
    t.text=value;t.depthTest=true;t.textFill.color=this.textColor;
    t.horizontalAlignment=HorizontalAlignment.Center;t.verticalAlignment=VerticalAlignment.Center;
    t.horizontalOverflow=HorizontalOverflow.Overflow;t.verticalOverflow=VerticalOverflow.Overflow;
    t.layoutRect=Rect.create(-w/2,w/2,-h/2,h/2);applyTextRole(t,role,this.typeScale);return t;
  }
  private build() {
    if(!this.actionsRoot||!this.markerRoot) return;
    this.sceneObject.createComponent("Component.Canvas");
    this.plate=this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate;
    this.plate.size=new vec2(this.widthCm,9.7);
    this.sceneObject.createComponent(Billboard.getTypeName());
    const content=this.obj(this.sceneObject,"RepairRewind status content",1.3);
    const col=this.flex(content,"RepairRewind status layout",this.widthCm-2,9);
    this.title=this.text(col,"REPAIR REWIND",this.widthCm-2,2.1,"title");
    this.text(col,"Simulated assembly · session memory",this.widthCm-2,1.5,"caption");
    this.message=this.text(col,"Select a part",this.widthCm-2,2.2);
    this.counts=this.text(col,"0 recorded · 0 returned",this.widthCm-2,1.5,"caption");
    this.actionsRoot.createComponent("Component.Canvas");
    this.actionPlate=this.actionsRoot.createComponent(BackPlate.getTypeName()) as BackPlate;
    this.actionPlate.size=new vec2(this.widthCm,11.6);
    this.actionsRoot.createComponent(Billboard.getTypeName());
    const actionContent=this.obj(this.actionsRoot,"RepairRewind action content",.6);
    const outer=this.flex(actionContent,"RepairRewind actions layout",this.widthCm-2,10.8);
    for(let row=0;row<2;row++) {
      const rowHost=this.item(outer,"RepairRewind action row "+row,this.widthCm-2,5);
      const count=row===0?2:3,w=(this.widthCm-2-(count-1))/count;
      const flex=this.flex(rowHost,"RepairRewind button layout",this.widthCm-2,5,true);
      for(let j=0;j<count;j++) {
        const root=this.item(flex,"RepairRewind action "+this.slots.length,w,4.6);
        const button=root.createComponent(Button.getTypeName()) as Button;
        button.setVariant({theme:"SnapOS2",shape:"Rectangle",style:"PrimaryNeutral"});
        button.size=new vec3(w,4.6,1);
        button.onInitialized.add(()=>{button.size=new vec3(w,4.6,1);});
        const labelLayout=this.flex(root,"RepairRewind button label layout",w-.6,3);
        labelLayout.getTransform().setLocalPosition(new vec3(0,0,.68));
        const label=this.text(labelLayout,"",w-.6,3);
        const slot={root,button,label,intent:null as RRIntent|null,down:null as RRIntent|null};
        button.onTriggerDown.add(()=>{slot.down=slot.intent?{...slot.intent}:null;});
        button.onTriggerUp.add(()=>{const intent=slot.down;slot.down=null;if(intent&&!button.inactive)this.onIntent.invoke(intent);});
        this.slots.push(slot);
      }
    }
    this.ready=true;if(this.current)this.render(this.current);
  }
  public render(view:RRPanelView) {
    this.current=view;if(!this.ready)return;
    this.title.text=view.paused?"":view.title;this.message.text=view.paused?"":view.message;this.counts.text=view.paused?"":view.counts;
    this.plate.enabled=!view.paused;this.actionPlate.enabled=!view.paused;
    this.slots.forEach((slot,i)=>{
      const data=view.buttons[i];slot.root.enabled=!!data;
      slot.button.inactive=!data||!data.enabled;
      slot.label.text=data?data.label:"";
      slot.intent=data?{action:data.action,partId:data.partId,revision:view.revision}:null;
      slot.down=null;
      slot.root.name="RepairRewind action "+(data?data.action:"hidden")+" "+i;
    });
  }
  public setMarkers(markers:RRMarker[]) {
    if(!this.ready)return;
    while(this.labels.length<markers.length) {
      const root=this.obj(this.markerRoot,"RepairRewind origin label "+this.labels.length);
      root.createComponent("Component.Canvas");root.createComponent(Billboard.getTypeName());
      const f=this.flex(root,"RepairRewind marker layout",13,1.6);
      this.labels.push({root,text:this.text(f,"",13,1.6,"caption")});
    }
    this.labels.forEach((label,i)=>{
      const m=markers[i];label.root.enabled=!!m;if(!m)return;
      const p=m.step.origin.position;label.root.getTransform().setWorldPosition(new vec3(p.x,p.y+4.25,p.z+1.6));
      label.text.text=m.step.sequence+" · "+m.step.label;
      label.text.textFill.color=m.active?new vec4(1,.73,.25,1):new vec4(.25,.9,.96,1);
    });
  }
  public setNotice(value:string) {if(this.ready&&this.current&&!this.current.paused)this.message.text=value||this.current.message;}
  /** Passive camera-relative presentation. Main decides visibility and direction. */
  public setEdgeHint(hint:RREdgeHint|null,camera:Camera) {
    if(!this.ready)return;
    if(!hint){if(this.edgeRoot)this.edgeRoot.enabled=false;return;}
    if(!this.edgeRoot){
      this.edgeRoot=this.obj(camera.getSceneObject(),"RepairRewind edge hint");
      this.edgeRoot.createComponent("Component.Canvas");
      const layout=this.flex(this.edgeRoot,"RepairRewind edge hint layout",10,2);
      this.edgeText=this.text(layout,"Saved part",10,2,"caption");
      this.edgeText.textFill.color=new vec4(1,.8,.35,1);
    }
    const t=this.edgeRoot.getTransform();
    t.setWorldPosition(camera.screenSpaceToWorldSpace(new vec2(hint.x,hint.y),60));
    t.setWorldRotation(camera.getTransform().getWorldRotation());t.setWorldScale(new vec3(60/110,60/110,60/110));
    const labels={left:"← Saved part",right:"Saved part →",up:"↑ Saved part",down:"↓ Saved part"};
    this.edgeText.text=labels[hint.direction];this.edgeRoot.enabled=true;
  }
}
