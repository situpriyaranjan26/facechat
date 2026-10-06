type RemoteStreamCallback = (stream: MediaStream) => void;
type IceCandidateCallback = (candidate: RTCIceCandidate) => void;

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStream: RemoteStreamCallback | null = null;
  private onIceCandidate: IceCandidateCallback | null = null;
  private candidateQueue: RTCIceCandidateInit[] = [];

  async createPeerConnection(iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS): Promise<RTCPeerConnection> {
    if (this.pc) {
      this.close();
    }

    this.remoteStream = new MediaStream();
    this.candidateQueue = [];

    this.pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10,
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind, event.track.id);
      
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      // Add track to remote stream if not already present
      if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
        this.remoteStream.addTrack(event.track);
      }

      // If streams were attached directly, also merge them
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (this.remoteStream && !this.remoteStream.getTracks().some((t) => t.id === track.id)) {
            this.remoteStream.addTrack(track);
          }
        });
      }

      if (this.onRemoteStream && this.remoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.pc?.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', this.pc?.iceConnectionState);
    };

    return this.pc;
  }

  isInitialized(): boolean {
    return this.pc !== null;
  }

  addLocalStream(stream: MediaStream) {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    stream.getTracks().forEach((track) => {
      // Avoid duplicate tracks
      const senders = this.pc!.getSenders();
      const exists = senders.some((s) => s.track?.id === track.id);
      if (!exists) {
        this.pc!.addTrack(track, stream);
      }
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
    const answer = await this.pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.drainCandidateQueue();
    return this.createAnswer();
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    await this.drainCandidateQueue();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription || !this.pc.remoteDescription.type) {
      // Queue until remoteDescription is set to avoid WebRTC drop
      this.candidateQueue.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[WebRTC] Failed to add ICE candidate:', err);
    }
  }

  private async drainCandidateQueue() {
    while (this.candidateQueue.length > 0) {
      const candidate = this.candidateQueue.shift();
      if (candidate && this.pc) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Error draining queued candidate:', err);
        }
      }
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
    this.remoteStream = null;
    this.candidateQueue = [];
    this.onRemoteStream = null;
    this.onIceCandidate = null;
  }
}

export const webRTCManager = new WebRTCManager();
export default WebRTCManager;
