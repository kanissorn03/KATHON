import * as THREE from 'three';
import type { CharacterConfig } from '../types';
import { clothProfile } from './DollSculpt';

type Weave = 'brocade' | 'stripe' | 'check';
const fabrics = new Map<Weave, THREE.DataTexture>();

// Seamless warp and weft patterns, shared across garment colours.
function wovenTexture(kind: Weave) {
  const cached = fabrics.get(kind);
  if (cached) return cached;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const ground = new THREE.Color('#fffaf1');
  const thread = new THREE.Color(kind === 'check' ? '#825464' : '#ad7959');
  const gold = new THREE.Color('#ffdc88');
  const sample = new THREE.Color();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x % 32) / 32, v = (y % 32) / 32;
      const diamond = Math.abs(u-0.5) + Math.abs(v-0.5);
      sample.copy(ground);
      if (kind === 'check') {
        sample.lerp(thread, (u < 0.42 ? 0.4 : 0) + (v < 0.42 ? 0.5 : 0));
        if (x % 32 === 17 || y % 32 === 17) sample.copy(gold);
      } else if (kind === 'stripe') {
        if (y%32 < 5 || y%32 === 9) sample.copy(thread);
        if (y%32 >= 19 && y%32 < 22) sample.copy(gold);
      } else {
        if (diamond < 0.41) sample.copy(thread);
        if (Math.abs(diamond-0.36)<0.055 || diamond < 0.14) sample.copy(gold);
      }
      sample.multiplyScalar(0.92 + 0.08*((x+y)%2)).convertLinearToSRGB();
      const at = (y*size+x)*4;
      data[at]=sample.r*255; data[at+1]=sample.g*255; data[at+2]=sample.b*255; data[at+3]=255;
    }
  }
  const map = new THREE.DataTexture(data,size,size);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4,1);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  fabrics.set(kind,map);
  return map;
}

// A separate panel lets the folded cloth cast a shadow on the garment underneath.
function drape(group: THREE.Group, mat: THREE.Material, top: number[], bottom: number[],
  width: number, folds: number, acrossChest = false) {
  const geo = new THREE.PlaneGeometry(1,1,28,14);
  const p = geo.attributes.position;
  for (let row=0; row<=14; row++) {
    const t=row/14;
    for (let col=0; col<=28; col++) {
      const u=col/28;
      const ridge=Math.cos(u*2*Math.PI*folds);
      const x=THREE.MathUtils.lerp(top[0],bottom[0],t)+(u-0.5)*width*(1+0.16*t);
      const depth=acrossChest ? 0.211*Math.sqrt(Math.max(0.13,1-(x/0.256)**2)) :
        THREE.MathUtils.lerp(top[2],bottom[2],t);
      p.setXYZ(row*29+col, x,
        THREE.MathUtils.lerp(top[1],bottom[1],t)-t*t*0.008*ridge,
        depth+0.007*ridge+0.012*Math.sin(Math.PI*t));
    }
  }
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,mat);
  mesh.castShadow=true;
  group.add(mesh);
}

export function dressCharacter(body: THREE.Group, sleeves: THREE.Group[], legs: THREE.Group[], cfg: CharacterConfig) {
  const style=cfg.outfitStyle === 'fair_pastel' ? (cfg.gender === 'male' ? 'short_royal' : 'ruean_ton') : cfg.outfitStyle;
  const silk=new THREE.MeshStandardMaterial({color:cfg.outfitColor,roughness:0.60,side:THREE.DoubleSide});
  const contrast=silk.clone();
  contrast.color.multiplyScalar(0.46);
  const trim=new THREE.MeshStandardMaterial({color:cfg.accentColor,roughness:0.4,metalness:0.24,side:THREE.DoubleSide});
  const patterned=silk.clone();
  patterned.map=wovenTexture(style==='ruean_ton'?'stripe':style==='thai_cotton'?'check':'brocade');
  const profile=(rings:number[][],mat:THREE.Material,group=body,fold=0) => {
    const mesh=new THREE.Mesh(clothProfile(rings,fold),mat);
    mesh.castShadow=true;
    group.add(mesh);
    return mesh;
  };
  const formal=style==='raj_pattern', short=style==='short_royal';
  const sabai=style==='thai_sabai', dusit=style==='dusit', blouse=style==='ruean_ton';
  const top=formal?silk.clone():silk;
  if(formal) top.color.lerp(new THREE.Color('#fff4da'),0.84);
  const upper=profile([[0.225,-0.185],[0.23,-0.16],[0.203,-0.035],[0.217,0.105],
    [0.236,0.159],[0.209,0.2],[0.137,0.228],[0.104,0.232]],top);
  if(sabai || dusit) {
    // Shape the neckline into the mesh instead of painting it on a cylinder.
    const p=upper.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
      const neck=THREE.MathUtils.smoothstep(y,0.10,0.233);
      const drop=sabai?0.09+0.23*x:0.085*Math.max(0,z/0.14);
      p.setY(i,y-neck*drop);
    }
    upper.geometry.computeVertexNormals();
  }
  if(!sabai && !dusit){
    const end=formal?-0.277:blouse?-0.20:short?-0.128:-0.15;
    for(const arm of sleeves){
      profile([[0.079,end],[0.088,end+0.012],[0.093,-0.073],[0.102,0],[0.086,0.045],[0.04,0.063],[0,0.064]],top,arm);
      profile([[0.084,end+0.002],[0.089,end+0.015]],formal?trim:contrast,arm);
    }
  }

  if(sabai || blouse || dusit){
    const wide=sabai?0.286:blouse?0.251:0.271;
    const hem=blouse?-0.405:-0.472;
    profile([[wide-0.005,hem],[wide,hem+0.012],[wide-0.005,hem+0.07],[0.247,-0.239],
      [0.22,-0.102],[0.214,-0.081]],blouse?patterned:contrast,body,0.018);
    profile([[wide+0.007,hem+0.018],[wide+0.007,hem+0.027],[wide+0.005,hem+0.063]],blouse?trim:patterned);
    if(!blouse){
      drape(body,patterned,[0.035,-0.09,0.198],[0.041,hem+0.012,wide*0.86],0.108,3);
      profile([[0.224,-0.126],[0.227,-0.119],[0.224,-0.086]],trim);
    }
    if(sabai){
      const shawl=patterned.clone();
      shawl.color.copy(trim.color);
      drape(body,shawl,[-0.184,0.259,0.077],[0.14,-0.093,0.165],0.15,3,true);
      drape(body,shawl,[-0.184,0.261,0.116],[-0.173,0.235,-0.152],0.15,3);
      drape(body,shawl,[-0.173,0.236,-0.152],[-0.235,-0.38,-0.227],0.15,3);
    }
    if(dusit){
      const petal=new THREE.SphereGeometry(1,12,10);
      const embroidery=new THREE.InstancedMesh(petal,trim,72);
      const stitch=new THREE.Object3D();
      for(let i=0;i<24;i++){
        const a=i*Math.PI/12;
        for(let leaf=-1;leaf<=1;leaf++){
          const angle=a+leaf*0.033;
          stitch.position.set(Math.sin(angle)*(wide+0.004),hem+0.079+(leaf===0?0.011:0),
            Math.cos(angle)*(wide+0.004)*0.86);
          stitch.rotation.set(0,angle,leaf*-0.5,'YXZ');
          stitch.scale.set(0.006,0.016,0.005);
          stitch.updateMatrix();
          embroidery.setMatrixAt(i*3+leaf+1,stitch.matrix);
        }
      }
      body.add(embroidery);
      for(let i=-4;i<=4;i++){
        const a=i*0.32;
        const sequin=new THREE.Mesh(petal,trim);
        sequin.scale.set(0.015,0.032,0.008);
        sequin.position.set(Math.sin(a)*0.188,0.108+0.058*(1-Math.cos(a)),0.197*Math.cos(a));
        sequin.rotation.set(0,a,-a*0.6);
        body.add(sequin);
      }
    }
  }else{
    for(const leg of legs){
      profile(short?[[0.106,-0.55],[0.109,-0.535],[0.118,-0.32],[0.134,-0.15],[0.123,-0.11]]:
        [[0.073,-0.395],[0.09,-0.378],[0.135,-0.315],[0.148,-0.237],[0.117,-0.119]],
        contrast,leg,short?0.012:0.07);
    }
    if(style==='thai_cotton'){
      profile([[0.231,-0.172],[0.237,-0.162],[0.225,-0.083]],patterned);
      drape(body,patterned,[-0.134,-0.105,0.161],[-0.184,-0.32,0.175],0.099,2);
    }
    if(formal || short) profile([[0.165,0.20],[0.153,0.219],[0.143,0.263],[0.14,0.266]],top);
    if(short){
      const pocket=new THREE.Shape();
      pocket.moveTo(-0.04,0.033);pocket.lineTo(0.04,0.033);pocket.lineTo(0.035,-0.025);
      pocket.lineTo(0,-0.044);pocket.lineTo(-0.035,-0.025);pocket.closePath();
      const flap=new THREE.Mesh(new THREE.ExtrudeGeometry(pocket,{depth:0.006,bevelEnabled:false}),top);
      flap.position.set(0.111,0.059,0.159);flap.rotation.y=0.42;body.add(flap);
    }
  }
  if(!sabai && !dusit){
    const buttonGeo=new THREE.SphereGeometry(blouse?0.013:0.014,12,8);
    const count=style==='thai_cotton'?3:5;
    for(let i=0;i<count;i++){
      const y=0.182-i*0.068;
      const button=new THREE.Mesh(buttonGeo,trim);
      button.scale.z=0.54;
      button.position.set(0,y,(y>0.13?0.199:y>0.07?0.188:0.181)+Math.max(0,-y)*0.082);
      body.add(button);
    }
  }
}
