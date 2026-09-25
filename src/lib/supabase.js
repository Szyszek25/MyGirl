import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';

const supabaseUrl=process.env.EXPO_PUBLIC_SUPABASE_URL||'https://jnygupsfbkpqvoewrxpf.supabase.co';
const supabasePublishableKey=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_VS9kUDKjyjd_cCeTtuQqwA_fsXDHG9P';

export const supabase=createClient(supabaseUrl,supabasePublishableKey,{
  auth:{
    storage:AsyncStorage,
    autoRefreshToken:true,
    persistSession:true,
    detectSessionInUrl:false,
    flowType:'pkce'
  }
});
