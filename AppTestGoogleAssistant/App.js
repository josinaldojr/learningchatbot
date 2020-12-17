import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import { Dialogflow_V2 } from 'react-native-dialogflow';

import { dialogflowConfig } from './config';

const BOT_USER = {
  _id: 2,
  name: 'Poke Bot',
  avatar: 'https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=Poke Bot'
};

class App extends Component {
  state = {
    messages: [
      {
        _id: 1,
        text: `Hi! I am the PokéBot 🤖.\n\nWhat would you like to know about Pokemon today?`,
        createdAt: new Date(),
        user: BOT_USER
      }
    ]
  };

  componentDidMount() {
    Dialogflow_V2.setConfiguration(
      dialogflowConfig.client_email,
      dialogflowConfig.private_key,
      Dialogflow_V2.LANG_ENGLISH_US,
      dialogflowConfig.project_id
    );
  }

  handleResponse(result) {
    console.log(result);
    let text = result.queryResult.fulfillmentMessages[0].text.text[0];
    let payload = result.queryResult.webhookPayload;
    this.showResponse(text, payload);
  }

  showResponse(text, payload) {
    let msg = {
      _id: this.state.messages.length + 1,
      text,
      createdAt: new Date(),
      user: BOT_USER
    };

    if (payload && payload.is_image) {
      msg.text = text;
      msg.image = payload.url;
    }

    this.setState(previousState => ({
      messages: GiftedChat.append(previousState.messages, [msg])
    }));
  }

  onSend(messages = []) {
    this.setState(previousState => ({
      messages: GiftedChat.append(previousState.messages, messages)
    }));
    let message = messages[0].text;
    Dialogflow_V2.requestQuery(
      message,
      result => this.handleResponse(result),
      error => console.log(error)
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <GiftedChat
          style={styles.container}
          messages={this.state.messages}
          onSend={messages => this.onSend(messages)}
          user={{
            _id: 1
          }}
        />
      </View>
    );
  }
}

//Style
const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

export default App;
