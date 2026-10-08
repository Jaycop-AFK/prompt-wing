import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { buddyImageSource } from '@/components/community/community-image';
import { formatPace } from '@/components/format';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RunBuddy } from '@/services/community';

export function BuddyPostCard({
  post,
  onJoin,
  onComment,
}: {
  post: RunBuddy;
  onJoin: () => void;
  onComment: (message: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const source = buddyImageSource(post.imageUri);

  const submitComment = async () => {
    const value = comment.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onComment(value);
      setComment('');
      setCommentsOpen(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.brandSoft }]}>
          <AppText variant="body" weight="bold" color={colors.brandStrong}>
            {post.displayName.trim().charAt(0) || 'น'}
          </AppText>
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.nameRow}>
            <AppText variant="body" weight="semibold">{post.displayName}</AppText>
            {post.emailConfirmed ? <Ionicons name="checkmark-circle" size={15} color={colors.brand} /> : null}
          </View>
          <AppText variant="caption" tone="faint">
            {post.isMine ? 'โพสต์ของคุณ' : post.isMock ? 'สมาชิกตัวอย่าง · เมื่อสักครู่' : 'สมาชิกชุมชน'}
          </AppText>
        </View>
      </View>

      <AppText variant="body">{post.message}</AppText>

      <View style={[styles.meetBox, { backgroundColor: colors.surfaceAlt }]}>
        <Meta icon="calendar-outline" text={post.runTime} />
        <Meta icon="location-outline" text={post.meetingPlace} />
        <Meta icon="speedometer-outline" text={`pace ${formatPace(post.paceSecPerKm)} /กม.`} />
      </View>

      {source ? (
        <Image
          source={source}
          style={styles.postImage}
          contentFit="cover"
          transition={160}
          cachePolicy="memory-disk"
          accessibilityLabel={`รูปประกอบโพสต์ของ ${post.displayName}`}
        />
      ) : null}

      <View style={styles.socialSummary}>
        <AppText variant="caption" tone="faint">เข้าร่วม {post.participantCount}/{post.capacity} คน</AppText>
        <AppText variant="caption" tone="faint">{post.comments.length} ความคิดเห็น</AppText>
      </View>
      <View style={[styles.actions, { borderColor: colors.border }]}>
        <SocialButton
          icon={post.joined ? 'checkmark-circle' : 'person-add-outline'}
          label={post.joined ? 'เข้าร่วมแล้ว' : 'ขอร่วมวิ่ง'}
          active={Boolean(post.joined)}
          onPress={onJoin}
          disabled={!post.joined && post.participantCount >= post.capacity}
        />
        <SocialButton
          icon="chatbubble-outline"
          label="ความคิดเห็น"
          active={commentsOpen}
          onPress={() => setCommentsOpen((value) => !value)}
        />
      </View>

      {commentsOpen || post.comments.length > 0 ? (
        <View style={styles.comments}>
          {post.comments.map((item) => (
            <View key={item.id} style={styles.commentRow}>
              <View style={[styles.commentAvatar, { backgroundColor: colors.surfaceAlt }]}>
                <AppText variant="caption" weight="bold">{item.author.charAt(0) || 'น'}</AppText>
              </View>
              <View style={[styles.commentBubble, { backgroundColor: colors.surfaceAlt }]}>
                <AppText variant="small" weight="semibold">{item.author}</AppText>
                <AppText variant="small">{item.message}</AppText>
              </View>
            </View>
          ))}
          <View style={styles.commentComposer}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="เขียนความคิดเห็น…"
              placeholderTextColor={colors.textFaint}
              style={[styles.commentInput, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
              accessibilityLabel="เขียนความคิดเห็น"
              returnKeyType="send"
              onSubmitEditing={submitComment}
            />
            <Pressable
              onPress={submitComment}
              disabled={!comment.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="ส่งความคิดเห็น"
              style={[styles.sendButton, { backgroundColor: colors.brand, opacity: !comment.trim() || sending ? 0.45 : 1 }]}>
              <Ionicons name="send" size={17} color={colors.onBrand} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={16} color={colors.brand} />
      <AppText variant="small" tone="muted" style={styles.metaText}>{text}</AppText>
    </View>
  );
}

function SocialButton({
  icon,
  label,
  active,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [styles.socialButton, pressed && styles.pressed, disabled && styles.disabled]}>
      <Ionicons name={icon} size={18} color={active ? colors.brandStrong : colors.textMuted} />
      <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.textMuted}>
        {disabled ? 'เต็มแล้ว' : label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meetBox: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { flex: 1 },
  postImage: { width: '100%', height: 190, borderRadius: radius.md },
  socialSummary: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  pressed: { opacity: 0.62 },
  disabled: { opacity: 0.45 },
  comments: { gap: spacing.sm },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  commentBubble: { flex: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  commentComposer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  commentInput: { flex: 1, minHeight: 42, borderRadius: radius.pill, paddingHorizontal: spacing.md, fontSize: 14 },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
