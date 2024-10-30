import React, { useEffect, useState } from 'react';
import { View, Button, Text } from 'react-native';
import { RTCView, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';
import mediasoupClient from 'mediasoup-client';
import { PermissionsAndroid, Platform } from 'react-native';
import { request, PERMISSIONS } from 'react-native-permissions';

const SERVER_URL = 'http://192.168.33.96:4000'; // Update to match server IP
let device, producer;

const LiveStreamApp = () => {
    const [stream, setStream] = useState(null);
    const [socket, setSocket] = useState(null);
    const [roomJoined, setRoomJoined] = useState(false);
    const [isProducer, setIsProducer] = useState(false);
    const [streamingStatus, setStreamingStatus] = useState("Not Started");

    useEffect(() => {
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to server');
        });

        newSocket.on('joined', () => {
            setRoomJoined(true);
            console.log('Joined the stream room');
        });

        // Listen for RTP stats from the server
        newSocket.on('rtpStats', (stats) => {
            console.log('RTP Stats:', stats);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        } else {
            await request(PERMISSIONS.IOS.CAMERA);
            await request(PERMISSIONS.IOS.MICROPHONE);
        }
    };

    const startCamera = async () => {
        await requestPermissions();
        try {
            const newStream = await mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            setStream(newStream);
            setIsProducer(true);
            setStreamingStatus("Camera Ready");
        } catch (error) {
            console.error('Error accessing media devices.', error);
            setStreamingStatus("Camera Error");
        }
    };

    const joinRoom = async () => {
        if (socket && !roomJoined) {
            socket.emit('joinRoom');
        }
    };

    const startStreaming = async () => {
        if (!device) {
            socket.emit('getRouterRtpCapabilities', async (routerRtpCapabilities) => {
                if (!routerRtpCapabilities) {
                    console.error('Failed to get router RTP capabilities');
                    setStreamingStatus("RTP Capabilities Error");
                    return;
                }

                device = new mediasoupClient.Device();
                await device.load({ routerRtpCapabilities });
            });
        }

        socket.emit('createWebRtcTransport', { forceTcp: false, rtpCapabilities: device.rtpCapabilities }, async (transportData) => {
            if (!transportData) {
                console.error('Failed to create WebRTC transport');
                setStreamingStatus("Transport Creation Failed");
                return;
            }

            const producerTransport = device.createSendTransport(transportData);

            producerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                socket.emit('connectTransport', { transportId: producerTransport.id, dtlsParameters }, (response) => {
                    if (response && response.error) {
                        console.error('Transport connection failed:', response.error);
                        errback(response.error);
                        setStreamingStatus("Transport Connection Failed");
                    } else {
                        callback();
                        setStreamingStatus("Connected");
                    }
                });
            });

            producerTransport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
                socket.emit('produce', { transportId: producerTransport.id, kind, rtpParameters }, (response) => {
                    if (response && response.error) {
                        console.error('Produce request failed:', response.error);
                        errback(response.error);
                        setStreamingStatus("Produce Failed");
                    } else {
                        callback({ id: response.id });
                        setStreamingStatus("Live");
                    }
                });
            });

            try {
                producer = await producerTransport.produce({ track: stream.getVideoTracks()[0] });
                console.log('Streaming started');
            } catch (error) {
                console.error('Error producing stream:', error);
                setStreamingStatus("Stream Error");
            }
        });
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {stream && <RTCView streamURL={stream.toURL()} style={{ width: 200, height: 200 }} />}
            <Text>Streaming Status: {streamingStatus}</Text>
            <View style={{ marginTop: 20 }}>
                <Button title="Start Camera" onPress={startCamera} />
            </View>
            <View style={{ marginTop: 20 }}>
                <Button title="Join Stream" onPress={joinRoom} />
            </View>
            {isProducer && (
                <View style={{ marginTop: 20 }}>
                    <Button title="Start Streaming" onPress={startStreaming} />
                </View>
            )}
            {!stream && <Text>No stream available</Text>}
        </View>
    );
};

export default LiveStreamApp;
