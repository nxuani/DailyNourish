import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { foodIcon } from '@/lib/foodIcon';
import { colors } from '@/theme/tokens';

type Props = {
  image: string | null;
  name: string;
};

// Reset image-error state whenever the image URL changes.
export default function PantryFoodImage(props: Props) {
  return (
    <FoodImageContent
      key={props.image ?? 'no-image'}
      {...props}
    />
  );
}

function FoodImageContent({ image, name }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.container}>
      {image && !failed ? (
        <Image
          source={{ uri: image }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="none"
          transition={150}
          accessible={false}
          onError={() => setFailed(true)}
        />
      ) : (
        // Keep the food visible when no image is available.
        <Text accessible={false} style={styles.emoji}>
          {foodIcon(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 58,
    height: 58,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoftAlt,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 32,
  },
});