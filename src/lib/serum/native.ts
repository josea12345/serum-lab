import { init as initZstd, compress, decompress } from "@bokuweb/zstd-wasm";
import SparkMD5 from "spark-md5";
import type { Patch } from "./types";
type Value = null | boolean | number | string | Uint8Array | Value[] | { [key: string]: Value };
const te = new TextEncoder(), td = new TextDecoder();
let ready: Promise<void> | undefined;
function decode(bytes: Uint8Array): Value {
 let at=0;
 const len=(ai:number)=>{if(ai<24)return ai;const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(ai===24)return bytes[at++];if(ai===25){const n=v.getUint16(at);at+=2;return n;}if(ai===26){const n=v.getUint32(at);at+=4;return n;}if(ai===27){const n=Number(v.getBigUint64(at));at+=8;return n;}throw Error("Unsupported CBOR length.");};
 const read=():Value=>{const first=bytes[at++],major=first>>5,ai=first&31;if(major===7){if(ai===20)return false;if(ai===21)return true;if(ai===22)return null;const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(ai===26){const n=v.getFloat32(at);at+=4;return n;}if(ai===27){const n=v.getFloat64(at);at+=8;return n;}throw Error("Unsupported CBOR value.");}const n=len(ai);if(major===0)return n;if(major===1)return -1-n;if(major===2){const x=bytes.slice(at,at+n);at+=n;return x;}if(major===3){const x=td.decode(bytes.slice(at,at+n));at+=n;return x;}if(major===4)return Array.from({length:n},read);if(major===5){const x:Record<string,Value>={};for(let i=0;i<n;i++){const k=read();if(typeof k!=="string")throw Error("Unexpected CBOR map key.");x[k]=read();}return x;}throw Error("Unsupported CBOR type.");};
 const result=read();if(at!==bytes.length)throw Error("Trailing CBOR data.");return result;
}
function head(m:number,n:number):number[]{if(n<24)return[(m<<5)|n];if(n<256)return[(m<<5)|24,n];if(n<65536)return[(m<<5)|25,n>>8,n&255];if(n<4294967296)return[(m<<5)|26,n>>>24,n>>>16&255,n>>>8&255,n&255];const b=BigInt(n),a=[(m<<5)|27];for(let i=7;i>=0;i--)a.push(Number(b>>BigInt(i*8)&255n));return a;}
function encode(value:Value):Uint8Array{const out:number[]=[];const put=(v:Value,float=false):void=>{if(v===null){out.push(246);return;}if(v===false){out.push(244);return;}if(v===true){out.push(245);return;}if(typeof v==="number"){if(!float&&Number.isSafeInteger(v))out.push(...(v>=0?head(0,v):head(1,-1-v)));else{out.push(251);const b=new Uint8Array(8);new DataView(b.buffer).setFloat64(0,v,false);out.push(...b);}return;}if(typeof v==="string"){const b=te.encode(v);out.push(...head(3,b.length),...b);return;}if(v instanceof Uint8Array){out.push(...head(2,v.length),...v);return;}if(Array.isArray(v)){out.push(...head(4,v.length));v.forEach(x=>put(x,float));return;}const entries=Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0);out.push(...head(5,entries.length));entries.forEach(([k,x])=>{put(k);put(x,float||k==="plainParams"||k==="xVals"||k==="yVals"||k==="curveVals"||k==="kUIParamMixOrGain");});};put(value);return new Uint8Array(out);}
function params(tree:Record<string,Value>,name:string):Record<string,Value>{const mod=tree[name] as Record<string,Value>|undefined;if(!mod||typeof mod!=="object"||Array.isArray(mod))throw Error("Template is missing "+name);const p=mod.plainParams;if(p==="default"||p==null)return{};if(typeof p!=="object"||Array.isArray(p)||p instanceof Uint8Array)throw Error("Invalid "+name+" params");return p as Record<string,Value>;}
function set(tree:Record<string,Value>,name:string,values:Record<string,Value>){const mod=tree[name] as Record<string,Value>,p=params(tree,name);Object.entries(values).forEach(([k,v])=>p[k]=v);mod.plainParams=p;}
function osc(tree:Record<string,Value>,slot:number,o:Patch["oscA"]){const name="Oscillator"+slot;set(tree,name,{kParamEnable:o.enabled?1:0,kParamVolume:o.level/100,kParamPan:o.pan/50,kParamOctave:o.octave,kParamPitch:o.semi,kParamFine:o.fine,kParamUnison:o.unison,kParamDetune:(o.detune/100)**2});if(slot<3){const mod=tree[name] as Record<string,Value>,wt=mod["WTOsc"+slot] as Record<string,Value>,p=wt.plainParams==="default"?{}:wt.plainParams as Record<string,Value>;p.kParamTablePos=1+255*o.wtPos/100;wt.plainParams=p;}}
function env(tree:Record<string,Value>,slot:number,e:Patch["ampEnv"]){set(tree,"Env"+slot,{kParamAttack:Math.max(0,e.attack)/1000,kParamHold:Math.max(0,e.hold)/1000,kParamDecay:Math.max(0,e.decay)/1000,kParamSustain:e.sustain/100,kParamRelease:Math.max(0,e.release)/1000,kParamCurve1:50,kParamCurve2:66.6,kParamCurve3:66.6});}
function lfoCurve(shape:string){
 const count=64, xVals:number[]=[],yVals:number[]=[],curveVals:number[]=[];
 let seed=173;
 for(let i=0;i<=count;i++){
  const t=i/count; let y=0.5;
  if(shape==="Sine") y=(1-Math.cos(2*Math.PI*t))/2;
  else if(shape==="Triangle") y=t<0.5?t*2:(1-t)*2;
  else if(shape==="Saw") y=t;
  else if(shape==="Square") y=t<0.5?1:0;
  else { if(i%4===0) seed=(seed*9301+49297)%233280; y=seed/233280; }
  xVals.push(t); yVals.push(1-y); curveVals.push(50);
 }
 return {numPoints:count,xVals,yVals,curveVals};
}
function writeLfo(tree:Record<string,Value>,slot:number,l:Patch["lfo1"]){
 const name="LFO"+slot;
 set(tree,name,{kParamMode:"Free",kParamBeatSync:0,kParamRate:Math.max(0.01,Math.min(30,l.rate))});
 const mod=tree[name] as Record<string,Value>;
 mod.curveData=lfoCurve(l.shape);
}
type Route={source:number;destType:string;destId:number;param:string;paramId:number;amount:number;bipolar?:boolean};
function targetRoute(target:string,source:number,amount:number,fxReverbIndex:number):Route|undefined{
 const map:Record<string,Omit<Route,"source"|"amount"|"bipolar"> & {bipolar?:boolean}>={
  "Filter Cutoff":{destType:"VoiceFilter",destId:0,param:"kParamFreq",paramId:3},
  "Osc A WT Pos":{destType:"WTOsc",destId:0,param:"kParamTablePos",paramId:6},
  "Osc B WT Pos":{destType:"WTOsc",destId:1,param:"kParamTablePos",paramId:6},
  "Osc C WT Pos":{destType:"WTOsc",destId:2,param:"kParamTablePos",paramId:6},
  "Osc A Fine":{destType:"Oscillator",destId:0,param:"kParamFine",paramId:5,bipolar:true},
  "Osc B Fine":{destType:"Oscillator",destId:1,param:"kParamFine",paramId:5,bipolar:true},
  "Osc B Level":{destType:"Oscillator",destId:1,param:"kParamVolume",paramId:1},
  "Pan":{destType:"Oscillator",destId:0,param:"kParamPan",paramId:2,bipolar:true},
 };
 const d=map[target];
 if(d)return {source,...d,amount,bipolar:d.bipolar};
 if(target==="Reverb Mix"&&fxReverbIndex>=0)return {source,destType:"FXReverb",destId:fxReverbIndex,param:"kParamWet",paramId:1,amount};
 return undefined;
}
function writeRoutes(tree:Record<string,Value>,patch:Patch,fxReverbIndex:number){
 let index=0;
 const add=(r:Route|undefined)=>{
  if(!r||Math.abs(r.amount)<0.001||index>=64)return;
  const entry:Record<string,Value>={source:[r.source,0],destModuleTypeString:r.destType,destModuleID:r.destId,destModuleParamName:r.param,destModuleParamID:r.paramId,plainParams:{kParamAmount:r.amount}};
  if(r.bipolar)(entry.plainParams as Record<string,Value>).kParamBipolar=1;
  tree["ModSlot"+index]=entry; index++;
 };
 add(targetRoute(patch.lfo1.target,6,patch.lfo1.amount,fxReverbIndex));
 add(targetRoute(patch.lfo2.target,7,patch.lfo2.amount,fxReverbIndex));
 add(targetRoute(patch.env2.target,4,patch.env2.amount,fxReverbIndex));
}
function writeFx(tree:Record<string,Value>,patch:Patch):number{
 const units:{type:number;key:string;params:Record<string,number|string>}[]=[];
 const f=patch.fx;
 if(f.distortion.enabled){
  const mode:Record<string,string>={Tube:"kTapeSat","Soft Clip":"kSoftClip","Hard Clip":"kHardClip",Diode:"kDiode1","Bit Crush":"kDownsample",Downsample:"kDownsample"};
  units.push({type:0,key:"FXDistortion",params:{kParamMode:mode[f.distortion.mode]||"kOverdrive",kParamDrive:f.distortion.drive,kParamWet:f.distortion.mix}});
 }
 if(f.chorus.enabled)units.push({type:3,key:"FXChorus",params:{kParamRate:f.chorus.rate,kParamDepth:f.chorus.depth,kParamWet:f.chorus.mix}});
 if(f.delay.enabled)units.push({type:4,key:"FXDelay",params:{kParamTimeL:f.delay.time/1000,kParamTimeR:f.delay.time/1000,kParamBeatSync:0,kParamFeedback:f.delay.feedback,kParamWet:f.delay.mix}});
 if(f.reverb.enabled)units.push({type:6,key:"FXReverb",params:{kParamSize:f.reverb.size,kParamWet:f.reverb.mix}});
 if(f.eq.enabled)units.push({type:7,key:"FXEQ",params:{kParamGain1:f.eq.lowGain,kParamGain2:f.eq.highGain}});
 if(f.compressor.enabled)units.push({type:5,key:"FXComp",params:{kParamRatio:f.compressor.ratio,kParamWet:f.compressor.mix}});
 if(f.dimension.enabled)units.push({type:9,key:"FXHyperD",params:{kParamDimESize:f.dimension.size,kParamDimEWet:f.dimension.mix,kParamWet:f.dimension.mix}});
 const rack=tree.FXRack0 as Record<string,Value>|undefined;
 if(!rack||typeof rack!=="object"||Array.isArray(rack))throw Error("Template is missing FXRack0.");
 rack.FX=units.map(u=>({type:u.type,kUIParamMixOrGain:0,[u.key]:{plainParams:u.params}} as unknown as Value));
 return units.findIndex(u=>u.key==="FXReverb");
}
function filterType(type:string):string{
 const map:Record<string,string>={"MG Low 12":"MgL12","MG Low 24":"MgL24","Low 12":"L12","Low 24":"L24","High 12":"H12","Band 12":"B12","Comb +":"CombN","Formant":"FormantONE"};
 return map[type]||"L24";
}
export async function buildNativePreset(patch:Patch):Promise<Blob>{if(!ready)ready=initZstd();await ready;const response=await fetch("/SerumLab-Init.SerumPreset");if(!response.ok)throw Error("Could not load the bundled Serum 2 Init template.");const file=new Uint8Array(await response.arrayBuffer()),magic=[...te.encode("XferJson"),0];if(file.length<25||magic.some((b,i)=>file[i]!==b))throw Error("Bundled Serum template is invalid.");const v=new DataView(file.buffer,file.byteOffset,file.byteLength),metaSize=Number(v.getBigUint64(9,true)),metaEnd=17+metaSize,metadata=JSON.parse(td.decode(file.slice(17,metaEnd))) as Record<string,unknown>,rawSize=v.getUint32(metaEnd,true);if(v.getUint32(metaEnd+4,true)!==2)throw Error("Unsupported Serum compression format.");const decoded=decode(decompress(file.slice(metaEnd+8)));if(!decoded||typeof decoded!=="object"||Array.isArray(decoded)||decoded instanceof Uint8Array)throw Error("Serum template state is invalid.");const tree=structuredClone(decoded) as Record<string,Value>;osc(tree,0,patch.oscA);osc(tree,1,patch.oscB);osc(tree,2,patch.oscC);set(tree,"Oscillator3",{kParamEnable:patch.noise.enabled?1:0,kParamVolume:patch.noise.level/100});set(tree,"Oscillator4",{kParamEnable:patch.sub.enabled?1:0,kParamVolume:patch.sub.level/100,kParamOctave:patch.sub.octave});env(tree,0,patch.ampEnv);env(tree,1,patch.env2);const freq=Math.max(0,Math.min(1,Math.log(Math.max(8.18,patch.filter.cutoff)/8.18)/Math.log(2697)));set(tree,"VoiceFilter0",{kParamEnable:patch.filter.enabled?1:0,kParamFreq:freq,kParamReso:patch.filter.resonance,kParamDrive:patch.filter.drive,kParamWet:patch.filter.mix,kParamType:filterType(patch.filter.type)});writeLfo(tree,0,patch.lfo1);writeLfo(tree,1,patch.lfo2);const reverbIndex=writeFx(tree,patch);writeRoutes(tree,patch,reverbIndex);set(tree,"Global0",{kParamPolyCount:patch.global.voices,kParamPortamentoTime:patch.global.portamento/1000,kParamMasterVolume:patch.global.master/100});tree.presetName=patch.name.trim()||"SERUM LAB PRESET";tree.presetAuthor="Serum Lab";tree.presetDescription=patch.description;tree.tags=patch.tags.slice(0,16);const cbor=encode(tree),compressed=compress(cbor,8);metadata.hash=SparkMD5.ArrayBuffer.hash(compressed.buffer.slice(compressed.byteOffset,compressed.byteOffset+compressed.byteLength) as ArrayBuffer);const meta=te.encode(JSON.stringify(metadata)),header=new Uint8Array(17+meta.length+8);header.set(magic,0);new DataView(header.buffer).setBigUint64(9,BigInt(meta.length),true);header.set(meta,17);const h=new DataView(header.buffer);h.setUint32(17+meta.length,cbor.length,true);h.setUint32(21+meta.length,2,true);const output=new Uint8Array(header.length+compressed.length);output.set(header);output.set(compressed,header.length);if(rawSize<=0)throw Error("Serum template state is empty.");return new Blob([output],{type:"application/octet-stream"});}
