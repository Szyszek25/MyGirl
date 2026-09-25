// Polka brand system – one source of truth for native UI.
import {Platform} from 'react-native';

export const colors = Object.freeze({
  pink:'#B8325A',
  pinkDark:'#8F2446',
  blush:'#FBECEF',
  canvas:'#FFF9FA',
  white:'#FFFFFF',
  ink:'#191317',
  muted:'#776B71',
  line:'#EADDE2',
  success:'#237A57',
  warning:'#A86208'
});
export const space = Object.freeze({ xs:4, sm:8, md:12, base:16, lg:24, xl:32, xxl:48 });
export const radii = Object.freeze({ sm:10, md:16, lg:24, xl:32, pill:999 });
export const type = Object.freeze({ eyebrow:11, caption:12, body:15, subtitle:18, heading:29, hero:42 });

const isWeb = Platform.OS === 'web';
export const fonts = Object.freeze({
  regular: isWeb ? 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif' : 'DMSans_400Regular',
  semibold: isWeb ? 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif' : 'DMSans_600SemiBold',
  bold: isWeb ? 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif' : 'DMSans_700Bold',
  display: isWeb ? 'Playfair Display, Georgia, serif' : 'PlayfairDisplay_700Bold'
});
export const elevation = Object.freeze({
  card:{ shadowColor:'#321821',shadowOpacity:0.07,shadowRadius:18,shadowOffset:{width:0,height:6},elevation:2 }
});
