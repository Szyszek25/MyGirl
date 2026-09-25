import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors as c, fonts as f, radii as r, space as sp } from './theme';
import { Typography } from './ui';
import { deleteStory } from './services/socialApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDE_DURATION = 5000;

export default function StoryViewerModal({
  visible,
  senders = [],
  stories = [],
  initialSenderIndex = 0,
  initialStory = null,
  onClose,
  sessionUserId = null
}) {
  // Normalize senders prop or group stories prop so each sender has their own slides
  const resolvedSenders = React.useMemo(() => {
    if (senders && senders.length > 0) return senders.filter(s => s.slides?.length);
    if (stories && stories.length > 0) {
      const map = new Map();
      stories.forEach((st, idx) => {
        const key = (st.authorId || st.userId || st.author || st.name || `sender-${idx}`).toLowerCase().trim();
        const mediaUrl = st.mediaUrl || st.uri || st.image;
        // Only create slide if there's actual story media (not fallback to avatar)
        if (!mediaUrl) return;
        const slide = {
          id: st.id || `s-${idx}`,
          mediaUrl,
          mediaType: st.mediaType || (/\.(mp4|mov|webm)$/i.test(mediaUrl) ? 'video' : 'image'),
          caption: st.caption || '',
          createdAt: st.createdAt
        };
        if (!map.has(key)) {
          map.set(key, {
            key,
            id: st.id,
            name: st.name || st.author || 'Dziewczyna',
            avatar: st.avatar || st.photo,
            city: st.city || 'Warszawa',
            slides: [slide]
          });
        } else {
          map.get(key).slides.push(slide);
        }
      });
      return Array.from(map.values()).filter(s => s.slides?.length);
    }
    return [];
  }, [senders, stories]);

  // Determine initial index from initialSenderIndex or initialStory
  const startIdx = React.useMemo(() => {
    if (typeof initialSenderIndex === 'number' && initialSenderIndex >= 0 && initialSenderIndex < resolvedSenders.length) {
      return initialSenderIndex;
    }
    if (initialStory && resolvedSenders.length > 0) {
      const foundIdx = resolvedSenders.findIndex(s =>
        s.name === initialStory.name ||
        s.key === (initialStory.authorId || initialStory.userId || initialStory.name)?.toLowerCase?.() ||
        s.slides?.some(sl => sl.id === initialStory.id)
      );
      return foundIdx >= 0 ? foundIdx : 0;
    }
  }, [initialSenderIndex, initialStory, resolvedSenders]);

  // Ensure startIdx is always a valid number (prevents hooks mismatch on fast refresh)
  const safeStartIdx = typeof startIdx === 'number' ? startIdx : 0;

  const [senderIndex, setSenderIndex] = useState(safeStartIdx);
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);

  // Transition state
  const [nextSenderIndex, setNextSenderIndex] = useState(null);
  const [transitionDirection, setTransitionDirection] = useState('forward'); // 'forward' | 'backward'
  const cubeAnim = useRef(new Animated.Value(0)).current;
  const isCubeAnimating = useRef(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // Sync when visible or index changes
  useEffect(() => {
    if (visible) {
      setSenderIndex(startIdx >= 0 && startIdx < resolvedSenders.length ? startIdx : 0);
      setSlideIndex(0);
      setLiked(false);
      setNextSenderIndex(null);
      isCubeAnimating.current = false;
      cubeAnim.setValue(0);
    }
  }, [visible, startIdx, resolvedSenders]);

  const currentSender = resolvedSenders[senderIndex] || resolvedSenders[0];
  const currentSlides = currentSender?.slides || [];
  const currentSlide = currentSlides[slideIndex] || currentSlides[0];

  const targetSender = nextSenderIndex !== null ? resolvedSenders[nextSenderIndex] : null;
  const targetSlides = targetSender?.slides || [];
  const targetSlide = targetSlides[0];

  // Video player if current slide is video
  const isVideo =
    currentSlide?.mediaType === 'video' ||
    (currentSlide?.mediaUrl && /\.(mp4|mov|webm)$/i.test(currentSlide.mediaUrl));

  const player = useVideoPlayer(isVideo ? currentSlide?.mediaUrl : '', p => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  // Slide progress timer
  useEffect(() => {
    if (!visible || paused || isCubeAnimating.current || !currentSlide) {
      progressAnim.stopAnimation();
      return;
    }

    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: SLIDE_DURATION,
      useNativeDriver: false
    });

    anim.start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => {
      progressAnim.stopAnimation();
    };
  }, [senderIndex, slideIndex, visible, paused, currentSlide]);

  // 3D Cube Transition to another sender
  const trigger3DCube = (targetIdx, direction = 'forward') => {
    if (isCubeAnimating.current) return;
    if (targetIdx < 0 || targetIdx >= resolvedSenders.length) {
      onClose();
      return;
    }

    isCubeAnimating.current = true;
    setTransitionDirection(direction);
    setNextSenderIndex(targetIdx);
    cubeAnim.setValue(0);

    Animated.timing(cubeAnim, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setSenderIndex(targetIdx);
        setSlideIndex(0);
        setLiked(false);
        setNextSenderIndex(null);
        cubeAnim.setValue(0);
        isCubeAnimating.current = false;
      }
    });
  };

  const handleNext = () => {
    if (isCubeAnimating.current) return;
    if (slideIndex < currentSlides.length - 1) {
      setSlideIndex(prev => prev + 1);
      setLiked(false);
    } else {
      // Last slide of this sender -> 3D cube to next sender!
      trigger3DCube(senderIndex + 1, 'forward');
    }
  };

  const handlePrev = () => {
    if (isCubeAnimating.current) return;
    if (slideIndex > 0) {
      setSlideIndex(prev => prev - 1);
      setLiked(false);
    } else {
      // First slide -> 3D cube back to previous sender
      if (senderIndex > 0) {
        trigger3DCube(senderIndex - 1, 'backward');
      } else {
        progressAnim.setValue(0);
      }
    }
  };

  // Horizontal pan responder for 3D swipe between senders
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          // Swiped left -> next sender
          trigger3DCube(senderIndex + 1, 'forward');
        } else if (gestureState.dx > 50) {
          // Swiped right -> prev sender
          trigger3DCube(senderIndex - 1, 'backward');
        }
      }
    })
  ).current;

  const handleTap = e => {
    if (isCubeAnimating.current) return;
    const x = e.nativeEvent.locationX;
    if (x < SCREEN_WIDTH * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const toggleLike = () => {
    setLiked(prev => {
      const next = !prev;
      if (next) {
        setShowHeartPop(true);
        setTimeout(() => setShowHeartPop(false), 900);
      }
      return next;
    });
  };

  // 3D Cube Interpolations
  const isFwd = transitionDirection === 'forward';

  // Scale down slightly during rotation for authentic Instagram cube depth
  const cubeScale = cubeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.92, 1]
  });

  // Current Sender 3D transform (rotating away)
  const currentRotateY = cubeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isFwd ? ['0deg', '-90deg'] : ['0deg', '90deg']
  });
  const currentTranslateX = cubeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isFwd ? [0, -SCREEN_WIDTH / 2] : [0, SCREEN_WIDTH / 2]
  });
  const currentOpacity = cubeAnim.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [1, 0.7, 0]
  });

  // Target Sender 3D transform (rotating in)
  const targetRotateY = cubeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isFwd ? ['90deg', '0deg'] : ['-90deg', '0deg']
  });
  const targetTranslateX = cubeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isFwd ? [SCREEN_WIDTH / 2, 0] : [-SCREEN_WIDTH / 2, 0]
  });
  const targetOpacity = cubeAnim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.7, 1]
  });

  // Helper to render a full story face with progress, media, caption, AND bottom reply bar
  const renderFace = ({ sender, slides, currentIdx, isTarget = false, slideObj }) => {
    return (
      <View style={s.faceContainer}>
        {/* Media */}
        {(slideObj?.mediaType === 'video' || (slideObj?.mediaUrl && /\.(mp4|mov|webm)$/i.test(slideObj.mediaUrl))) && slideObj?.mediaUrl ? (
          !isTarget && isVideo ? (
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
          ) : (
            <View style={s.mediaContainer}>
              <Image
                source={{ uri: slideObj.mediaUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            </View>
          )
        ) : slideObj?.mediaUrl ? (
          <View style={s.mediaContainer}>
            <Image
              source={{ uri: slideObj.mediaUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          </View>
        ) : null}

        <View style={s.topVignette} />
        <View style={s.bottomVignette} />

        {/* Top Header Overlay with progress segments */}
        <View style={s.topHeader} pointerEvents="box-none">
          <View style={s.progressRow}>
            {slides.map((slide, i) => {
              let width = '0%';
              if (!isTarget) {
                if (i < currentIdx) {
                  width = '100%';
                } else if (i === currentIdx) {
                  width = progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  });
                }
              }
              return (
                <View key={slide.id || i} style={s.progressTrack}>
                  <Animated.View style={[s.progressBar, { width }]} />
                </View>
              );
            })}
          </View>

          {/* User Info Bar */}
          <View style={s.userInfoRow}>
            <View style={s.authorWrap}>
              <Image source={{ uri: sender.avatar }} style={s.authorAvatar} />
              <View>
                <Typography style={s.authorName}>{sender.name}</Typography>
                <Typography style={s.authorTime}>
                  {sender.city || 'Warszawa'} · {isTarget ? 1 : currentIdx + 1}/{slides.length}
                </Typography>
              </View>
            </View>

            {!isTarget && sender.authorId === sessionUserId && (
              <Pressable onPress={() => {
                Alert.alert('Usuń relację?', 'Ta operacja jest nieodwracalna.', [
                  { text: 'Anuluj', style: 'cancel' },
                  {
                    text: 'Usuń', style: 'destructive', onPress: async () => {
                      try {
                        await deleteStory(slideObj.id, sessionUserId);
                        onClose();
                      } catch (error) {
                        Alert.alert('Nie usunięto relacji', error.message || 'Spróbuj ponownie.');
                      }
                    }
                  }
                ]);
              }} style={s.deleteBtn} hitSlop={14}>
                <Ionicons name="trash-outline" size={26} color="#FF6B6B" />
              </Pressable>
            )}
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={14}>
              <Ionicons name="close" size={26} color={c.white} />
            </Pressable>
          </View>
        </View>

        {/* Caption */}
        {Boolean(slideObj?.caption) && (
          <View style={s.captionWrapper} pointerEvents="none">
            <View style={s.captionPill}>
              <Typography style={s.captionText}>{slideObj.caption}</Typography>
            </View>
          </View>
        )}

        {/* Bottom Reply Bar - part of the 3D face, anchored to bottom */}
        <KeyboardAvoidingView
          style={s.bottomArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents={isTarget ? 'none' : 'box-none'}
          keyboardVerticalOffset={0}
        >
          <View style={s.replyRow} pointerEvents={isTarget ? 'none' : 'box-none'}>
            <View style={s.replyInputBox}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder={`Odpowiedz do ${sender.name}…`}
                placeholderTextColor="rgba(255,255,255,0.7)"
                style={s.replyInput}
                editable={!isTarget}
              />
            </View>

            <Pressable onPress={toggleLike} style={s.likeBtn} hitSlop={10} disabled={isTarget}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={30}
                color={liked ? '#FF1493' : c.white}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  // Early exit if not visible
  if (!visible) return null;

  // Guard for invalid slide state
  if (!currentSender || !currentSlide || !currentSlide.mediaUrl) {
    return (
      <Modal
        visible={visible}
        presentationStyle="fullScreen"
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={s.container} />
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      presentationStyle="fullScreen"
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.container}>
        {/* Animated 3D Cube Viewport - entire screen rotates */}
        <Animated.View
          style={[
            s.cubeViewport,
            {
              transform: [
                { perspective: 1200 },
                { scale: cubeScale },
                { translateX: currentTranslateX },
                { rotateY: currentRotateY }
              ],
              opacity: currentOpacity
            }
          ]}
        >
          {renderFace({
            sender: currentSender,
            slides: currentSlides,
            currentIdx: slideIndex,
            isTarget: false,
            slideObj: currentSlide
          })}
        </Animated.View>

        {/* Incoming Next Sender Face (During 3D Cube Rotation) */}
        {nextSenderIndex !== null && targetSender && (
          <Animated.View
            style={[
              s.cubeViewport,
              {
                transform: [
                  { perspective: 1200 },
                  { scale: cubeScale },
                  { translateX: targetTranslateX },
                  { rotateY: targetRotateY }
                ],
                opacity: targetOpacity
              }
            ]}
          >
            {renderFace({
              sender: targetSender,
              slides: targetSlides,
              currentIdx: 0,
              isTarget: true,
              slideObj: targetSlide
            })}
          </Animated.View>
        )}

        {/* Big Heart Pop */}
        {showHeartPop && (
          <View style={s.heartPopCenter} pointerEvents="none">
            <Ionicons name="heart" size={110} color="#FF1493" />
          </View>
        )}

        {/* Swipe detector for 3D cube transition - full screen horizontal swipe */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleTap}
          onPressIn={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          {...panResponder.panHandlers}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  cubeViewport: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000'
  },
  cubeFace: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000'
  },
  faceContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between'
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  heartPopCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20
  },

  /* Top Overlay */
  topHeader: {
    paddingTop: Platform.OS === 'ios' ? 52 : 38,
    paddingHorizontal: 14,
    zIndex: 15
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: c.white,
    borderRadius: 2
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  authorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: c.pink,
    backgroundColor: c.blush
  },
  authorName: {
    fontFamily: f.bold,
    fontSize: 14,
    color: c.white,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6
  },
  authorTime: {
    fontFamily: f.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },

  /* Bottom Overlay */
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 38 : 22,
    zIndex: 15
  },
  captionWrapper: {
    alignItems: 'center',
    marginBottom: 16
  },
  captionPill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    maxWidth: '92%'
  },
  captionText: {
    fontFamily: f.semibold,
    fontSize: 15,
    color: c.white,
    textAlign: 'center',
    lineHeight: 21
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  replyInputBox: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  replyInput: {
    fontFamily: f.regular,
    fontSize: 14,
    color: c.white
  },
  likeBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mediaContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000'
  }
});
