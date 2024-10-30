// App.js
import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, TextInput } from 'react-native';
import axios from 'axios';
import Modal from 'react-native-modal';

export default function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveUsers, setLiveUsers] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  // Start live stream
  const startStream = async () => {
    try {
      const response = await axios.post('http://192.168.33.96:3000/start-stream', { name: userName, id: userId });
      console.log("🚀 ~ startStream ~ response:", response.data)
      if (response.data.message === 'Streaming started.') {
        setIsStreaming(true);
        setModalVisible(false); // Close modal on success
      } else {
        Alert.alert('Stream already running');
      }
    } catch (error) {
      console.log("🚀 ~ startStream ~ error:", error)
      Alert.alert('Error', 'Could not start streaming');
    }
  };

  // Stop live stream
  const stopStream = async () => {
    try {
      const response = await axios.get('http://192.168.33.96:3000/stop-stream');
      if (response.data.message === 'Streaming stopped.') {
        setIsStreaming(false);
      } else {
        Alert.alert('No stream to stop');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not stop streaming');
    }
  };

  // Fetch live users
  const fetchLiveUsers = async () => {
    try {
      const response = await axios.get('http://192.168.33.96:3000/live-users');
      setLiveUsers(response.data);
    } catch (error) {
      console.log('Error fetching live users:', error);
    }
  };

  useEffect(() => {
    fetchLiveUsers();
  }, [isStreaming]); // Refetch users each time stream status changes

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Streaming App</Text>
      
      {/* Buttons for start/stop stream */}
      <View style={styles.buttonContainer}>
        <Button
          title="Go Live"
          onPress={() => setModalVisible(true)} // Show modal for user input
          disabled={isStreaming}
        />
        <Button
          title="Stop Live"
          onPress={stopStream}
          disabled={!isStreaming}
        />
      </View>

      {/* Modal for user name and ID input */}
      <Modal isVisible={isModalVisible}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Enter User Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Name"
            value={userName}
            onChangeText={setUserName}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter ID"
            value={userId}
            onChangeText={setUserId}
            keyboardType="numeric"
          />
          <Button title="Start Streaming" onPress={startStream} />
          <Button title="Cancel" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
      
      {/* Display live users */}
      <Text style={styles.liveHeader}>Live Users:</Text>
      <FlatList
        data={liveUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text style={styles.userItem}>{item.name}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f8',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  liveHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  userItem: {
    padding: 10,
    fontSize: 16,
    backgroundColor: '#e6e6e6',
    marginVertical: 5,
    borderRadius: 5,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    borderRadius: 5,
  },
});
