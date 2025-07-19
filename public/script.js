let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

let localStream;
let peerConnection;
let socket;
let room;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

async function joinRoom() {
  room = document.getElementById("roomInput").value;
  socket = new WebSocket(`ws://${window.location.host}`);

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: "join", room }));
  };

  socket.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "ready") {
      startCall();
    }

    if (msg.type === "signal") {
      const signal = msg.payload;

      if (signal.sdp) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === "offer") {
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.send(JSON.stringify({ type: "signal", room, payload: { sdp: peerConnection.localDescription } }));
        }
      } else if (signal.candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.error("Error adding ICE candidate", e);
        }
      }
    }
  };

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
}

async function startCall() {
  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(JSON.stringify({ type: "signal", room, payload: { candidate: event.candidate } }));
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.send(JSON.stringify({ type: "signal", room, payload: { sdp: peerConnection.localDescription } }));
}