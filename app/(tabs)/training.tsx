import { View, Text, StyleSheet } from 'react-native'
import React from 'react'

export default function training() {
  return (
    <View style={style.container}>
      <Text>training</Text>
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