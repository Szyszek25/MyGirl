import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const storage=new Map();
const disk=new Map();
const cleared=[];
const store={
  getItem:async key=>storage.get(key)??null,
  setItem:async(key,value)=>{storage.set(key,value);},
  removeItem:async key=>{storage.delete(key);}
};
class MockFile{
  constructor(...parts){this.uri=parts.join('/');}
  get exists(){return disk.has(this.uri);}
  async copy(target){if(!this.exists)throw Error('Missing source');disk.set(target.uri,disk.get(this.uri));}
  async move(target){if(!this.exists)throw Error('Missing source');disk.set(target.uri,disk.get(this.uri));disk.delete(this.uri);}
  delete(){disk.delete(this.uri);}
}
const source=readFileSync(new URL('../src/localProfile.js',import.meta.url),'utf8')
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';",'const AsyncStorage=globalThis.__profileStorage;')
  .replace("import {File,Paths} from 'expo-file-system';",'const {File,Paths}=globalThis.__profileFiles;')
  .replace("import {clearCached} from './cache';",'const clearCached=globalThis.__profileClear;');
assert.ok(!source.includes('import '),'Native imports should all be mocked');
globalThis.__profileStorage=store;
globalThis.__profileFiles={File:MockFile,Paths:{document:'document'}};
globalThis.__profileClear=async key=>{cleared.push(key);storage.delete('mygirl:public-cache:v1:'+key);};
const {saveLocalProfile,loadLocalProfile,deleteLocalProfile}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const profile=(overrides={})=>({name:'Julia',city:'Warszawa',interests:['Kawa'],answers:{0:'Rozmowa'},photo:null,...overrides});
beforeEach(()=>{storage.clear();disk.clear();cleared.length=0;});

test('persists profile metadata and reloads it without a photo',async()=>{
  await saveLocalProfile(profile());
  const saved=await loadLocalProfile();
  assert.equal(saved.name,'Julia');
  assert.equal(saved.photo,null);
  assert.equal(saved.hasPhoto,false);
});

test('adding and re-saving the same native avatar does not delete it',async()=>{
  disk.set('gallery/julia.jpg','image-bytes');
  const added=await saveLocalProfile(profile({photo:'gallery/julia.jpg'}));
  assert.equal(added.photo,'document/mygirl-avatar.jpg');
  assert.equal(disk.get(added.photo),'image-bytes');
  const edited=await saveLocalProfile({...added,name:'Julka'});
  assert.equal(edited.name,'Julka');
  assert.equal(disk.get(edited.photo),'image-bytes');
  assert.equal((await loadLocalProfile()).photo,added.photo);
});

test('removing photo stays removed after restart',async()=>{
  disk.set('gallery/julia.jpg','image-bytes');
  const added=await saveLocalProfile(profile({photo:'gallery/julia.jpg'}));
  await saveLocalProfile({...added,photo:null});
  assert.equal((await loadLocalProfile()).photo,null);
  assert.equal(disk.has('document/mygirl-avatar.jpg'),false);
});

test('profile reset clears avatar, metadata and partner draft',async()=>{
  disk.set('gallery/julia.jpg','image-bytes');
  await saveLocalProfile(profile({photo:'gallery/julia.jpg'}));
  storage.set('mygirl:public-cache:v1:partner-draft','old organization');
  await deleteLocalProfile();
  assert.equal(await loadLocalProfile(),null);
  assert.equal(disk.size,1); // Original gallery asset belongs to the phone, not MyGirl.
  assert.equal(disk.has('document/mygirl-avatar.jpg'),false);
  assert.equal(storage.has('mygirl:public-cache:v1:partner-draft'),false);
  assert.deepEqual(cleared,['partner-draft']);
});

test('missing gallery photo fails instead of inventing a saved avatar',async()=>{
  await assert.rejects(saveLocalProfile(profile({photo:'gallery/missing.jpg'})),/nie istnieje/);
  assert.equal(await loadLocalProfile(),null);
});
