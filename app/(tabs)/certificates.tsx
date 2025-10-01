/*
    app/(tabs)/index.tsx
*/
import { View, Text, StyleSheet } from 'react-native'
import React from 'react'

export default function certificates() {
  return (
    <View style={style.container}>
      <Text>certificates</Text>
    </View>
  )
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  }
})