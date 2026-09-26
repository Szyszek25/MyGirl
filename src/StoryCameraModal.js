import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors as c, fonts as f, radii as r, space as sp } from './theme';
import { Typography } from './ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const cameraRef = useRef(null);
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [mode, setMode] = useState('picture'); // 'picture' | 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const [capturedMedia, setCapturedMedia] = useState(null); // { uri, type: 'image' | 'video' }
  const [caption, setCaption] = useState('');
  const [mood, setMood] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Timer for video recording
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      setRecordSeconds(0);
      interval = setInterval(() => {
        setRecordSeconds(sec => {
          if (sec >= 15) {
            handleStopRecording();
            return 15;
          }
          return sec + 1;
        });
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const resetAll = () => {
    setCapturedMedia(null);
    setCaption('');
    setMood('');
    setIsRecording(false);
    setRecordSeconds(0);
    setPublishing(false);
  };

  const handleClose = () => {
    if (publishing) return;
    if (capturedMedia) {
      Alert.alert('Odrzucić relację?', 'Twoje zdjęcie lub wideo przepadnie.', [
        { text: 'Zostań', style: 'cancel' },
        {
          text: 'Odrzuć',
          style: 'destructive',
          onPress: () => {
            resetAll();
            onClose();
          }
        }
      ]);
    } else {
      resetAll();
      onClose();
    }
  };

  const toggleFacing = () => {
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(prev => {
      if (prev === 'off') return 'on';
      if (prev === 'on') return 'auto';
      return 'off';
    });
  };

  // Taking photo via native CameraView
  const handleTakePhoto = async () => {
    if (!cameraRef.current || isRecording) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.88,
        skipProcessing: false
      });
      if (photo?.uri) {
        setCapturedMedia({ uri: photo.uri, type: 'image' });
      }
    } catch (err) {
      console.warn('Błąd robienia zdjęcia aparatem:', err);
      // Fallback to ImagePicker camera if CameraView errored
      try {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.88
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          setCapturedMedia({ uri: result.assets[0].uri, type: 'image' });
        }
      } catch (pickerErr) {
        Alert.alert('Aparat', pickerErr.message || 'Nie udało się zrobić zdjęcia.');
      }
    }
  };

  // Starting video recording
  const handleStartRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    try {
      if (!micPermission?.granted) {
        const res = await requestMicPermission();
        if (!res.granted) {
          Alert.alert('Mikrofon', 'Włącz dostęp do mikrofonu, aby nagrać wideo z dźwiękiem.');
        }
      }
      setIsRecording(true);
      const videoPromise = cameraRef.current.recordAsync({
        maxDuration: 15
      });
      const video = await videoPromise;
      if (video?.uri) {
        setCapturedMedia({ uri: video.uri, type: 'video' });
      }
    } catch (err) {
      console.warn('Błąd nagrywania wideo:', err);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    try {
      cameraRef.current?.stopRecording();
    } catch (err) {
      console.warn('stopRecording error:', err);
    }
  };

  // Shutter button press handler
  const handleShutterPress = () => {
    if (mode === 'picture') {
      handleTakePhoto();
    } else {
      if (isRecording) {
        handleStopRecording();
      } else {
        handleStartRecording();
      }
    }
  };

  // Pick from gallery
  const pickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Brak uprawnień', 'Zezwól Polce na dostęp do galerii w ustawieniach.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.88
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const isVid = asset.type === 'video' || /\.(mp4|mov|webm)$/i.test(asset.uri);
        setCapturedMedia({ uri: asset.uri, type: isVid ? 'video' : 'image' });
      }
    } catch (err) {
      Alert.alert('Galeria', err.message || 'Nie udało się wybrać pliku.');
    }
  };

  // Share story
  const handleShare = async () => {
    if (!capturedMedia?.uri || publishing) return;
    setPublishing(true);
    try {
      const fullCaption = [mood, caption.trim()].filter(Boolean).join(' · ');
      // Extract tags from mood and caption
      const tagWords = [mood, caption.trim()]
        .filter(Boolean)
        .flatMap(s => s.split(/[\s·,]+/))
        .map(w => w.trim())
        .filter(w => w.length > 1)
        .slice(0, 5);
      await onPublish({ uri: capturedMedia.uri, caption: fullCaption, tags: tagWords });
      resetAll();
      onClose();
    } catch (err) {
      Alert.alert('Błąd publikacji', err.message || 'Nie udało się dodać relacji.');
    } finally {
      setPublishing(false);
    }
  };

  // Video preview player
  const isVideo = capturedMedia?.type === 'video' || (capturedMedia?.uri && /\.(mp4|mov|webm)$/i.test(capturedMedia.uri));
  const player = useVideoPlayer(isVideo ? capturedMedia.uri : '', p => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={s.container}>
        {!capturedMedia ? (
          /* Live IG Camera View */
          <View style={s.cameraWrapper}>
            {camPermission?.granted ? (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={facing}
                mode={mode}
                flash={flash}
                mute={false}
              />
            ) : (
              <View style={s.permissionContainer}>
                <View style={s.permissionOrb}>
                  <Ionicons name="camera-outline" size={48} color={c.pink} />
                </View>
                <Typography style={s.permissionTitle}>Aparat do relacji</Typography>
                <Typography style={s.permissionSub}>
                  Polka potrzebuje dostępu do aparatu, abyś mogła dodawać relacje na żywo jak na Instagramie.
                </Typography>
                <Pressable onPress={requestCamPermission} style={s.permissionBtn}>
                  <Typography style={s.permissionBtnText}>Zezwól na dostęp do aparatu</Typography>
                </Pressable>
                <Pressable onPress={pickFromGallery} style={s.galleryFallbackBtn}>
                  <Ionicons name="images-outline" size={20} color={c.white} />
                  <Typography style={s.galleryFallbackText}>Wybierz zdjęcie z galerii</Typography>
                </Pressable>
              </View>
            )}

            {/* Top Toolbar overlay */}
            <View style={s.cameraTopBar}>
              <Pressable onPress={handleClose} style={s.glassCircleBtn} hitSlop={12}>
                <Ionicons name="close" size={26} color={c.white} />
              </Pressable>

              {/* Recording indicator */}
              {isRecording ? (
                <View style={s.recordingBadge}>
                  <View style={s.recordingDot} />
                  <Typography style={s.recordingTimer}>
                    00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds} / 00:15
                  </Typography>
                </View>
              ) : (
                <View style={s.locationTag}>
                  <Ionicons name="location-sharp" size={13} color={c.pink} />
                  <Typography style={s.locationTagText}>{city}</Typography>
                </View>
              )}

              <View style={s.topRightActions}>
                <Pressable onPress={toggleFlash} style={s.glassCircleBtn} hitSlop={12}>
                  <Ionicons
                    name={flash === 'on' ? 'flash' : flash === 'auto' ? 'flash-outline' : 'flash-off'}
                    size={22}
                    color={flash !== 'off' ? '#FFD700' : c.white}
                  />
                </Pressable>
              </View>
            </View>

            {/* Bottom Shutter & Controls overlay */}
            <View style={s.cameraBottomBar}>
              {/* Mode switch: ZDJĘCIE | WIDEO */}
              {!isRecording && (
                <View style={s.modeSelector}>
                  <Pressable
                    onPress={() => setMode('picture')}
                    style={[s.modeOption, mode === 'picture' && s.modeOptionActive]}
                  >
                    <Typography style={[s.modeOptionText, mode === 'picture' && s.modeOptionTextActive]}>
                      ZDJĘCIE
                    </Typography>
                  </Pressable>
                  <Pressable
                    onPress={() => setMode('video')}
                    style={[s.modeOption, mode === 'video' && s.modeOptionActive]}
                  >
                    <Typography style={[s.modeOptionText, mode === 'video' && s.modeOptionTextActive]}>
                      WIDEO
                    </Typography>
                  </Pressable>
                </View>
              )}

              {/* Shutter Row */}
              <View style={s.shutterRow}>
                {/* Left: Gallery Thumbnail */}
                <Pressable onPress={pickFromGallery} style={s.galleryThumbBtn} hitSlop={10}>
                  <Ionicons name="images" size={24} color={c.white} />
                </Pressable>

                {/* Center: IG Native Shutter Button */}
                <Pressable
                  onPress={handleShutterPress}
                  onLongPress={() => {
                    if (mode === 'picture') {
                      setMode('video');
                      handleStartRecording();
                    }
                  }}
                  onPressOut={() => {
                    if (isRecording) handleStopRecording();
                  }}
                  style={[s.shutterOuter, isRecording && s.shutterOuterRecording]}
                >
                  <View
                    style={[
                      s.shutterInner,
                      mode === 'video' && s.shutterInnerVideo,
                      isRecording && s.shutterInnerRecording
                    ]}
                  />
                </Pressable>

                {/* Right: Flip Camera */}
                <Pressable onPress={toggleFacing} style={s.flipCameraBtn} hitSlop={10}>
                  <Ionicons name="camera-reverse-outline" size={28} color={c.white} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          /* Editor & Story Preview Screen (Full screen like IG) */
          <KeyboardAvoidingView style={s.editorRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Background Media */}
            <View style={StyleSheet.absoluteFill}>
              {isVideo ? (
                <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
              ) : (
                <Image source={{ uri: capturedMedia.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              )}
              <View style={s.editorGradientOverlay} />
            </View>

            {/* Top Toolbar */}
            <View style={s.editorTopBar}>
              <Pressable onPress={() => setCapturedMedia(null)} style={s.glassCircleBtn} hitSlop={12}>
                <Ionicons name="arrow-back" size={24} color={c.white} />
              </Pressable>
              <View style={s.locationBadge}>
                <Ionicons name="location" size={14} color={c.pink} />
                <Typography style={s.locationBadgeText}>{city}</Typography>
              </View>
              <Pressable onPress={() => setCapturedMedia(null)} style={s.glassCircleBtn} hitSlop={12}>
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

            <View style={{ flex: 1 }} />

            {/* Bottom Controls */}
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

              {/* Instagram Style Share Button */}
              <Pressable disabled={publishing || !capturedMedia?.uri} onPress={handleShare} style={[s.shareBtn, (publishing || !capturedMedia?.uri) && { opacity: 0.5 }]}>
                {publishing ? (
                  <ActivityIndicator color={c.white} size="small" />
                ) : (
                  <>
                    <Typography style={s.shareBtnText}>Twoja relacja</Typography>
                    <View style={s.shareArrowCircle}>
                      <Ionicons name="arrow-forward" size={18} color={c.pink} />
                    </View>
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
    backgroundColor: '#000'
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between'
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#120A0E'
  },
  permissionOrb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(206,4,89,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(206,4,89,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  permissionTitle: {
    fontFamily: f.bold,
    fontSize: 22,
    color: c.white,
    textAlign: 'center',
    marginBottom: 10
  },
  permissionSub: {
    fontFamily: f.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 26
  },
  permissionBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#C84F7A',
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12
  },
  permissionBtnText: {
    fontFamily: f.bold,
    fontSize: 15,
    color: c.white
  },
  galleryFallbackBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%'
  },
  galleryFallbackText: {
    fontFamily: f.semibold,
    fontSize: 14,
    color: c.white
  },

  /* Top Bar */
  cameraTopBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10
  },
  glassCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  locationTagText: {
    fontFamily: f.bold,
    fontSize: 12,
    color: c.white
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(225,29,72,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.white
  },
  recordingTimer: {
    fontFamily: f.bold,
    fontSize: 12,
    color: c.white
  },

  /* Bottom Shutter & Controls */
  cameraBottomBar: {
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 10
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20
  },
  modeOption: {
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  modeOptionActive: {},
  modeOptionText: {
    fontFamily: f.bold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1
  },
  modeOptionTextActive: {
    color: '#FFD700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6
  },
  shutterRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  galleryThumbBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  flipCameraBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center'
  },

  /* IG SHUTTER BUTTON */
  shutterOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: c.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  shutterOuterRecording: {
    borderColor: '#E11D48',
    transform: [{ scale: 1.08 }]
  },
  shutterInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: c.white
  },
  shutterInnerVideo: {
    backgroundColor: '#E11D48'
  },
  shutterInnerRecording: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E11D48'
  },

  /* Editor / Preview Screen */
  editorRoot: {
    flex: 1
  },
  editorGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)'
  },
  editorTopBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10
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
    paddingHorizontal: 20,
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
    backgroundColor: '#C84F7A',
    borderColor: '#C84F7A'
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
    borderRadius: 27,
    backgroundColor: '#C84F7A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    shadowColor: '#C84F7A',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8
  },
  shareBtnText: {
    fontFamily: f.bold,
    fontSize: 16,
    color: c.white
  },
  shareArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.white,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
