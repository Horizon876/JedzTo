import { View, TouchableOpacity } from 'react-native'
import React from 'react'
import TextDefault from '../../Text/TextDefault/TextDefault'
import styles from './styles'
import RiderChatIcon from '../../../assets/SVG/rider-chat'
import ChatIcon from '../../../assets/SVG/chat-icon'
import { scale } from '../../../utils/scaling'

export const ChatButton = ({ onPress, theme, title, description, hasUnread }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.chatButton(theme)}>
      <View>
        <RiderChatIcon />
      </View>
      <View style={{ flex: 1, marginHorizontal: scale(10) }}>
        <TextDefault H4 bolder textColor='#FFFFFF' isRTL>
          {title}
        </TextDefault>
        <TextDefault H5 textColor='#8E8E93' isRTL>
          {description}
        </TextDefault>
      </View>
      <View style={styles.chatIcon(theme)}>
        <View>
          <ChatIcon fill='#FFFFFF' stroke='#121212' />
          {hasUnread && (
            <View
              style={{
                position: 'absolute',
                top: -scale(2),
                right: -scale(2),
                width: scale(10),
                height: scale(10),
                borderRadius: scale(5),
                backgroundColor: '#FF453A',
                borderWidth: 1,
                borderColor: '#FFFFFF'
              }}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}
