/** Stable scene names and passive-view messages. RepairSession remains the domain owner. */
import {Pose, RepairStep} from "./RepairSession";
export type RRAction = "capture"|"undo"|"begin"|"return"|"confirm"|"back"|"pause"|"resume"|"reset"|"cancelReset"|"confirmReset";
export type RRIntent = {action:RRAction; partId:string; revision:number};
export type RRButton = {label:string; action:RRAction; partId:string; enabled:boolean};
export type RRPanelView = {revision:number; title:string; message:string; counts:string; paused:boolean; buttons:RRButton[]};
export const RR_IDS = ["cover","ring","gear"];
export const RR_LABELS = ["Cover","Retaining ring","Gear"];
export type RRMarker = {step:RepairStep; active:boolean};
export function copyPose(pose:Pose):Pose {
  const p=pose.position,q=pose.rotation;
  return {position:{x:p.x,y:p.y,z:p.z},rotation:{x:q.x,y:q.y,z:q.z,w:q.w}};
}
export function copyNativePose(object:SceneObject):Pose {
  const t=object.getTransform(),p=t.getWorldPosition(),q=t.getWorldRotation();
  return {position:{x:p.x,y:p.y,z:p.z},rotation:{w:q.w,x:q.x,y:q.y,z:q.z}};
}
export function applyPose(object:SceneObject,pose:Pose):void {
  object.getTransform().setWorldPosition(new vec3(pose.position.x,pose.position.y,pose.position.z));
  object.getTransform().setWorldRotation(new quat(pose.rotation.w,pose.rotation.x,pose.rotation.y,pose.rotation.z));
}
