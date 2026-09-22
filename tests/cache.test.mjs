import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const values=new Map();
globalThis.__mygirlMockStorage={
  getItem:async key=>values.has(key)?values.get(key):null,
  setItem:async(key,value)=>{values.set(key,value);},
  removeItem:async key=>{values.delete(key);}
};
// Replace ONLY the device-specific import so the actual cache implementation
// can run under Node against an in-memory AsyncStorage double.
const source=readFileSync(new URL('../src/cache.js',import.meta.url),'utf8').replace(
  "import AsyncStorage from '@react-native-async-storage/async-storage';",
  'const AsyncStorage=globalThis.__mygirlMockStorage;'
);
assert.ok(source.includes('__mygirlMockStorage'),'AsyncStorage import was not replaced');
const {readCached,writeCached,clearCached}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));

test('returns a fresh cached draft',async()=>{
  await writeCached('draft',{name:'Kawiarnia'},1000,100);
  assert.deepEqual(await readCached('draft',1099),{name:'Kawiarnia'});
});
test('expires and deletes an outdated entry',async()=>{
  assert.equal(await readCached('draft',1100),null);
  assert.equal(values.size,0);
});
test('explicit invalidation removes cache',async()=>{
  await writeCached('draft',{name:'Koło'},1000,100);
  await clearCached('draft');
  assert.equal(await readCached('draft',200),null);
});
test('rejects unsafe keys, TTL and oversized values',async()=>{
  await assert.rejects(writeCached('../token',{x:1},100));
  await assert.rejects(writeCached('draft',{x:1},-1));
  await assert.rejects(writeCached('draft',{text:'x'.repeat(20000)},1000));
});
test('evicts malformed data',async()=>{
  values.set('mygirl:public-cache:v1:bad','not json');
  assert.equal(await readCached('bad'),null);
  assert.equal(values.has('mygirl:public-cache:v1:bad'),false);
});
