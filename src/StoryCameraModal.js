import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors as c, fonts as f, radii as r, space as sp } from './theme';
import { Typography } from './ui';

const QUICK_MOODS = [
  '☕ Kawa i spacer',
  '✨ Girls night',
  '🌸 Słoneczny dzień',
  '💪 Pilates & gym',
  '🍸 Spontaniczny plan',
  '💖 Polka vibe',
  '📚 Nauka & praca'
];

export default function StoryCameraModal({ visible, city = 'Warszawa', onClose, onPublish }) {
  const [media, setMedia] = useState(null); // { uri, type: 'image' | 'video' }
  const [caption, setCaption] = useState('');
  const [mood, setMood] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Player for video preview if video is captured
  const isVideo = media?.type === 'video' || (media?.uri && /\.(mp4|mov|webm)$/i.test(media.uri));
  const player = useVideoPlayer(isVideo ? media.uri : '', p => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  const resetState = () => {
    setMedia(null);
    setCaption('');
    setMood('');
    setPublishing(false);
  };

  const handleClose = () => {
    if (publishing) return;
    if (media) {
      Alert.alert('Odrzucić relację?', 'Twoje nieopublikowane zdjęcie lub wideo przepadnie.', [
        { text: 'Zostań', style: 'cancel' },
        {
          text: 'Odrzuć',
          style: 'destructive',
          onPress: () => {
            resetState();
            onClose();
          }
        }
      ]);
    } else {
      resetState();
      onClose();
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Brak uprawnień', 'Zezwól Polce na dostęp do aparatu w ustawieniach.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setMedia({ uri: result.assets[0].uri, type: 'image' });
      }
    } catch (err) {
      Alert.alert('Aparat', err.message || 'Nie udało się zrobić zdjęcia.');
    }
  };

  const recordVideo = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Brak uprawnień', 'Zezwól Polce na dostęp do aparatu w ustawieniach.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 15,
        quality: 0.8
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setMedia({ uri: result.assets[0].uri, type: 'video' });
      }
    } catch (err) {
      Alert.alert('Kamera', err.message || 'Nie udało się nagrać wideo.');
    }
  };

  const pickGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Brak uprawnień', 'Zezwól Polce na dostęp do galerii w ustawieniach.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.85
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const isVid = asset.type === 'video' || /\.(mp4|mov|webm)$/i.test(asset.uri);
        setMedia({ uri: asset.uri, type: isVid ? 'video' : 'image' });
      }
    } catch (err) {
      Alert.alert('Galeria', err.message || 'Nie udało się wybrać pliku.');
    }
  };

  const handleShare = async () => {
    if (!media?.uri || publishing) return;
    setPublishing(true);
    try {
      const fullCaption = [mood, caption.trim()].filter(Boolean).join(' · ');
      await onPublish({ uri: media.uri, caption: fullCaption });
      resetState();
      onClose();
    } catch (err) {
      Alert.alert('Błąd publikacji', err.message || 'Nie udało się dodać relacji.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={s.container}>
        {/* If no media selected yet, show Camera / Source selector */}
        {!media ? (
          <View style={s.pickerRoot}>
            <View style={s.pickerTop}>
              <Pressable onPress={handleClose} style={s.iconBtn} hitSlop={12}>
                <Ionicons name="close" size={28} color={c.white} />
              </Pressable>
              <Typography style={s.pickerTitle}>Nowa relacja</Typography>
              <View style={{ width: 44 }} />
            </View>

            <View style={s.pickerBody}>
              <View style={s.heroOrb}>
                <Ionicons name="camera" size={54} color={c.pink} />
              </View>
              <Typography style={s.pickerHeading}>Pokaż co u Ciebie</Typography>
              <Typography style={s.pickerSub}>
                Twoja relacja będzie widoczna dla dziewczyn w <Typography style={{ color: c.pink, fontFamily: f.bold }}>{city}</Typography> przez 24 godziny.
              </Typography>
            </View>

            <View style={s.pickerActions}>
              <Pressable onPress={takePhoto} style={s.actionBtnMain}>
                <Ionicons name="camera" size={24} color={c.white} />
                <Typography style={s.actionBtnMainText}>Zrób zdjęcie (aparat)</Typography>
              </Pressable>

              <Pressable onPress={recordVideo} style={s.actionBtnSecondary}>
                <Ionicons name="videocam" size={22} color={c.pink} />
                <Typography style={s.actionBtnSecText}>Nagraj wideo (max 15s)</Typography>
              </Pressable>

              <Pressable onPress={pickGallery} style={s.actionBtnSecondary}>
                <Ionicons name="images" size={22} color={c.pink} />
                <Typography style={s.actionBtnSecText}>Wybierz z galerii</Typography>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Editor & Preview Screen */
          <KeyboardAvoidingView style={s.editorRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Background Media Preview */}
            <View style={StyleSheet.absoluteFill}>
              {isVideo ? (
                <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
              ) : (
                <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              )}
              <View style={s.editorGradientOverlay} />
            </View>

            {/* Top Toolbar */}
            <View style={s.editorTopBar}>
              <Pressable onPress={() => setMedia(null)} style={s.glassIconBtn} hitSlop={12}>
                <Ionicons name="arrow-back" size={24} color={c.white} />
              </Pressable>
              <View style={s.locationBadge}>
                <Ionicons name="location" size={14} color={c.pink} />
                <Typography style={s.locationBadgeText}>{city}</Typography>
              </View>
              <Pressable onPress={() => setMedia(null)} style={s.glassIconBtn} hitSlop={12}>
                <Ionicons name="refresh" size={22} color={c.white} />
              </Pressable>
            </View>

            {/* Sticker / Mood on Story */}
            {Boolean(mood) && (
              <View style={s.storyStickerWrap}>
                <Pressable onPress={() => setMood('')} style={s.storySticker}>
                  <Typography style={s.storyStickerText}>{mood}</Typography>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.8)" />
                </Pressable>
              </View>
            )}

            {/* Middle Spacer */}
            <View style={{ flex: 1 }} />

            {/* Bottom Controls & Composer */}
            <View style={s.editorBottomCard}>
              {/* Quick Mood Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moodScroll}>
                {QUICK_MOODS.map(item => {
                  const active = mood === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setMood(prev => (prev === item ? '' : item))}
                      style={[s.moodChip, active && s.moodChipActive]}
                    >
                      <Typography style={[s.moodChipText, active && s.moodChipTextActive]}>{item}</Typography>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Caption Input */}
              <View style={s.captionBox}>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={180}
                  placeholder="Dodaj podpis do relacji…"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={s.captionInput}
                />
              </View>

              {/* Share Button */}
              <Pressable disabled={publishing} onPress={handleShare} style={[s.shareBtn, publishing && { opacity: 0.7 }]}>
                {publishing ? (
                  <ActivityIndicator color={c.white} size="small" />
                ) : (
                  <>
                    <Typography style={s.shareBtnText}>Udostępnij relację</Typography>
                    <Ionicons name="sparkles" size={19} color={c.white} />
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F090C'
  },
  pickerRoot: {
    flex: 1,
    paddingHorizontal: sp.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 40,
    justifyContent: 'space-between'
  },
  pickerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pickerTitle: {
    fontFamily: f.bold,
    fontSize: 18,
    color: c.white
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickerBody: {
    alignItems: 'center',
    paddingHorizontal: sp.md
  },
  heroOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(206,4,89,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(206,4,89,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  pickerHeading: {
    fontFamily: f.bold,
    fontSize: 26,
    color: c.white,
    textAlign: 'center',
    marginBottom: 10
  },
  pickerSub: {
    fontFamily: f.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22
  },
  pickerActions: {
    gap: 12
  },
  actionBtnMain: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#CE0459',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#CE0459',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8
  },
  actionBtnMainText: {
    fontFamily: f.bold,
    fontSize: 16,
    color: c.white
  },
  actionBtnSecondary: {
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  actionBtnSecText: {
    fontFamily: f.semibold,
    fontSize: 15,
    color: c.white
  },

  /* Editor / Preview */
  editorRoot: {
    flex: 1
  },
  editorGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  editorTopBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: sp.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10
  },
  glassIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  locationBadgeText: {
    fontFamily: f.bold,
    fontSize: 13,
    color: c.white
  },
  storyStickerWrap: {
    position: 'absolute',
    top: 130,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10
  },
  storySticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(206,4,89,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8
  },
  storyStickerText: {
    fontFamily: f.bold,
    fontSize: 16,
    color: c.white
  },
  editorBottomCard: {
    paddingHorizontal: sp.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : 26,
    paddingTop: 16,
    zIndex: 10
  },
  moodScroll: {
    gap: 8,
    paddingBottom: 12
  },
  moodChip: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  moodChipActive: {
    backgroundColor: '#CE0459',
    borderColor: '#CE0459'
  },
  moodChipText: {
    fontFamily: f.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)'
  },
  moodChipTextActive: {
    color: c.white,
    fontFamily: f.bold
  },
  captionBox: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14
  },
  captionInput: {
    fontFamily: f.regular,
    fontSize: 15,
    color: c.white,
    minHeight: 24
  },
  shareBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#CE0459',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#CE0459',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8
  },
  shareBtnText: {
    fontFamily: f.bold,
    fontSize: 16,
    color: c.white
  }
});
