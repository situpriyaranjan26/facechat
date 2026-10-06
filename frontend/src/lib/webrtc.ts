type RemoteStreamCallback = (stream: MediaStream) => void;
type IceCandidateCallback = (candidate: RTCIceCandidate) => void;

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private onRemoteStream: RemoteStreamCallback | null = null;
  private onIceCandidate: IceCandidateCallback | null = null;

  async createPeerConnection(iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS): Promise<RTCPeerConnection> {
    if (this.pc) {
      this.pc.close();
    }

    this.pc = new RTCPeerConnection({ iceServers });

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream && this.onRemoteStream) {
        this.onRemoteStream(remoteStream);
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.pc?.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', this.pc?.iceConnectionState);
    };

    return this.pc;
  }

  addLocalStream(stream: MediaStream) {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    stream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, stream);
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    return this.createAnswer();
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[WebRTC] Failed to add ICE candidate:', err);
    }
  }

  setRemoteStreamCallback(cb: RemoteStreamCallback) {
    this.onRemoteStream = cb;
  }

  setIceCandidateCallback(cb: IceCandidateCallback) {
    this.onIceCandidate = cb;
  }

  setOnIceCandidate(cb: IceCandidateCallback) {
    this.onIceCandidate = cb;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null;
  }

  close() {
    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }
    this.onRemoteStream = null;
    this.onIceCandidate = null;
  }
}

export const webRTCManager = new WebRTCManager();
export default WebRTCManager;
