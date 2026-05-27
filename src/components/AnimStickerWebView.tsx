import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const HTML_PREFIX = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  svg { width: 100%; height: 100%; display: block; }
</style>
</head>
<body>`;

const HTML_SUFFIX = `</body></html>`;

type Props = {
  svg: string;
  width?: number;
  height?: number;
};

const AnimStickerWebView = memo(function AnimStickerWebView({ svg, width = 80, height = 80 }: Props) {
  const html = HTML_PREFIX + svg + HTML_SUFFIX;
  return (
    <View style={[styles.container, { width, height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.webview, { width, height }]}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        androidLayerType="hardware"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  webview: { backgroundColor: 'transparent', opacity: 0.99 },
});

export default AnimStickerWebView;
