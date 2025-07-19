const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let pc = null;
let socket = null;

joinBtn.onclick = async () => {
  const roomId = roomIdInput.value.trim();
  if (!roomId) return alert("Enter a valid Room ID!");

  // Create fresh WebSocket connection every time
 socket = new WebSocket('ws://192.168.1.101:3000');


  // Setup WebRTC peer connection
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  // Get user media and show in local video
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = stream;

  // Add tracks to peer connection
  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  // Send ICE candidates through WebSocket
  pc.onicecandidate = ({ candidate }) => {
    if (candidate && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'signal',
        roomId,
        signal: { candidate }
      }));
    }
  };

  // Receive remote stream and show in remote video
  pc.ontrack = event => {
    if (!remoteVideo.srcObject) {
      remoteVideo.srcObject = event.streams[0];
    }
  };

  // Handle incoming signaling messages
  socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === 'signal' && data.roomId === roomId) {
      const signal = data.signal;

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.send(JSON.stringify({
          type: 'signal',
          roomId,
          signal: pc.localDescription
        }));
      }

      else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      }

      else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    }
  };

  // Once WebSocket is open, try creating an offer (if first peer)
  socket.onopen = async () => {
    // Slight delay to ensure other peer is ready
    setTimeout(async () => {
      if (pc.signalingState === "stable") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.send(JSON.stringify({
          type: 'signal',
          roomId,
          signal: pc.localDescription
        }));
      }
    }, 1000);
  };
};

