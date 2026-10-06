type RemoteStreamCallback = (stream: MediaStream) => void;
type IceCandidateCallback = (candidate: RTCIceCandidate) => void;

// Fast, reliable STUN + TURN servers without candidate flooding
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStream: RemoteStreamCallback | null = null;
  private onIceCandidate: IceCandidateCallback | null = null;
  private candidateQueue: RTCIceCandidateInit[] = [];

  async createPeerConnection(iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS): Promise<RTCPeerConnection> {
    // If an existing connection is present, close the native peer connection but preserve registered callbacks!
    if (this.pc) {
      this.close(false);
    }

    this.remoteStream = new MediaStream();

    this.pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 0, // Prevent candidate flooding to eliminate CPU and network lag
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
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

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!this.remoteStream!.getTracks().some((t) => t.id === track.id)) {
            this.remoteStream!.addTrack(track);
          }
        });
      } else {
        if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
      }

      // Always pass a fresh MediaStream clone containing current active tracks
      // so React state update detects new track arrivals and forces video re-binding!
      if (this.onRemoteStream && this.remoteStream) {
        const freshStream = new MediaStream(this.remoteStream.getTracks());
        this.onRemoteStream(freshStream);
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
    return this.pc !== null && this.pc.signalingState !== 'closed';
  }

  addLocalStream(stream: MediaStream) {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    stream.getTracks().forEach((track) => {
      const senders = this.pc!.getSenders();
      const exists = senders.some((s) => s.track?.id === track.id);
      if (!exists) {
        const sender = this.pc!.addTrack(track, stream);
        // Optimize video encoding parameters to prevent lag and frame drops
        if (track.kind === 'video') {
          try {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = 900000; // 900 kbps (clean HD with zero stutter)
            sender.setParameters(params).catch(() => {});
          } catch {
            // Parameter tuning is optional
          }
        }
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
      console.warn('[WebRTC] Handled non-fatal ICE candidate warning:', err);
    }
  }

  private async drainCandidateQueue() {
    while (this.candidateQueue.length > 0) {
      const candidate = this.candidateQueue.shift();
      if (candidate && this.pc && this.pc.remoteDescription) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Candidate drain non-fatal warning:', err);
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

  close(clearCallbacks: boolean = false) {
    if (this.pc) {
      try {
        this.pc.onicecandidate = null;
        this.pc.ontrack = null;
        this.pc.onconnectionstatechange = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.close();
      } catch (e) {
        console.warn('[WebRTC] Peer connection close warning:', e);
      }
      this.pc = null;
    }
    this.remoteStream = null;
    if (clearCallbacks) {
      this.candidateQueue = [];
      this.onRemoteStream = null;
      this.onIceCandidate = null;
    }
  }
}

export const webRTCManager = new WebRTCManager();
export default WebRTCManager;
