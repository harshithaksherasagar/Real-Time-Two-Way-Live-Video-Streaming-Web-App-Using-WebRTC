const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const statusText = document.getElementById('status');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const socket = new WebSocket(`ws://${location.host}`);
let pc = null;

joinBtn.onclick = async () => {
  const roomId = roomIdInput.value.trim();
  if (!roomId) return alert("Enter a valid Room ID");

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = stream;

  pc = new RTCPeerConnection();
  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) socket.send(JSON.stringify({ type: 'signal', roomId, signal: { candidate } }));
  };

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  socket.send(JSON.stringify({ type: 'join', roomId }));

  socket.onmessage = async event => {
    const { type, signal } = JSON.parse(event.data);

    if (type === 'ready') {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.send(JSON.stringify({ type: 'signal', roomId, signal: { sdp: offer } }));
      statusText.textContent = "Connected!";
    }

    if (type === 'signal') {
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.send(JSON.stringify({ type: 'signal', roomId, signal: { sdp: answer } }));
        }
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    }

    if (type === 'leave') {
      statusText.textContent = "User left the room.";
      remoteVideo.srcObject = null;
    }
  };
};
