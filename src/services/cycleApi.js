import {supabase} from '../lib/supabase';

const MOODS=['😣','😕','😐','🙂','✨'];

export async function loadCycleCloud(userId){
  if(!userId)return null;
  const [{data:settings,error:sError},{data:entries,error:eError}]=await Promise.all([
    supabase.from('cycle_settings').select('average_cycle_length,average_period_length,last_period_start').eq('user_id',userId).maybeSingle(),
    supabase.from('cycle_entries').select('entry_date,cycle_day,mood,bleeding,symptoms,note,is_period_start').eq('user_id',userId).order('entry_date',{ascending:false}).limit(180)
  ]);
  if(sError)throw sError;if(eError)throw eError;
  if(!settings&&!entries?.length)return null;
  return {
    cycleLength:settings?.average_cycle_length||28,
    periodLength:settings?.average_period_length||5,
    lastPeriod:settings?.last_period_start||null,
    history:(entries||[]).map(row=>({
      date:row.entry_date,
      cycleDay:row.cycle_day||null,
      mood:MOODS[Math.max(0,Math.min(4,(row.mood||4)-1))],
      bleeding:row.bleeding||'none',
      symptoms:row.symptoms||[],
      note:row.note||'',
      isPeriodStart:!!row.is_period_start
    }))
  };
}

export async function saveCycleSettingsCloud(userId,{cycleLength,periodLength,lastPeriod}){
  const {error}=await supabase.from('cycle_settings').upsert({
    user_id:userId,
    average_cycle_length:cycleLength,
    average_period_length:periodLength,
    last_period_start:lastPeriod||null
  },{onConflict:'user_id'});
  if(error)throw error;
}

export async function saveCycleEntryCloud(userId,entry){
  const moodIndex=Math.max(0,MOODS.indexOf(entry.mood));
  const {error}=await supabase.from('cycle_entries').upsert({
    user_id:userId,
    entry_date:entry.date,
    cycle_day:entry.cycleDay||null,
    mood:moodIndex+1,
    bleeding:entry.bleeding||'none',
    symptoms:entry.symptoms||[],
    note:entry.note||null,
    is_period_start:!!entry.isPeriodStart
  },{onConflict:'user_id,entry_date'});
  if(error)throw error;
}
