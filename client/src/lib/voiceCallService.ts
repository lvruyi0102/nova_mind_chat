/**
 * WebRTC 语音通话服务
 * 支持双向语音通话、录音、实时音频处理
 */

export interface VoiceCallConfig {
  audioConstraints?: MediaStreamConstraints;
  iceServers?: RTCIceServer[];
  enableRecording?: boolean;
  recordingFormat?: 'wav' | 'mp3' | 'webm';
}

export interface CallStats {
  duration: number;
  bytesReceived: number;
  bytesSent: number;
  audioLevel: number;
  jitter: number;
  roundTripTime: number;
}

export class VoiceCallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private statsInterval: NodeJS.Timeout | null = null;
  private config: VoiceCallConfig;
  private isCallActive = false;

  constructor(config: VoiceCallConfig = {}) {
    this.config = {
      audioConstraints: {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      },
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
      ],
      enableRecording: false,
      recordingFormat: 'webm',
      ...config,
    };
  }

  /**
   * 初始化本地音频流
   */
  async initializeLocalStream(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(
        this.config.audioConstraints
      );
      return this.localStream;
    } catch (error) {
      console.error('Failed to get local audio stream:', error);
      throw new Error('无法访问麦克风，请检查权限设置');
    }
  }

  /**
   * 创建 RTCPeerConnection
   */
  createPeerConnection(): RTCPeerConnection {
    const config: RTCConfiguration = {
      iceServers: this.config.iceServers,
    };

    this.peerConnection = new RTCPeerConnection(config);

    // 添加本地音频轨道
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // 监听远程流
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      this.remoteStream = event.streams[0];
      this.onRemoteStreamReceived?.(this.remoteStream);
    };

    // 监听连接状态变化
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'failed') {
        this.onConnectionFailed?.();
      }
    };

    // 监听 ICE 候选
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate?.(event.candidate);
      }
    };

    return this.peerConnection;
  }

  /**
   * 创建 offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
    });
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * 创建 answer
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * 设置远程描述
   */
  async setRemoteDescription(
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description)
    );
  }

  /**
   * 添加 ICE 候选
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * 开始录音
   */
  startRecording(): void {
    if (!this.localStream) {
      throw new Error('Local stream not initialized');
    }

    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.localStream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  /**
   * 停止录音并返回 Blob
   */
  stopRecording(): Blob {
    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder not initialized');
    }

    this.mediaRecorder.stop();

    const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
    return new Blob(this.recordedChunks, { type: mimeType });
  }

  /**
   * 获取通话统计信息
   */
  async getCallStats(): Promise<CallStats | null> {
    if (!this.peerConnection) {
      return null;
    }

    const stats = await this.peerConnection.getStats();
    let audioStats: CallStats = {
      duration: 0,
      bytesReceived: 0,
      bytesSent: 0,
      audioLevel: 0,
      jitter: 0,
      roundTripTime: 0,
    };

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
        audioStats.bytesReceived = report.bytesReceived || 0;
        audioStats.jitter = report.jitter || 0;
      } else if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
        audioStats.bytesSent = report.bytesSent || 0;
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        audioStats.roundTripTime = report.currentRoundTripTime || 0;
      }
    });

    return audioStats;
  }

  /**
   * 启动统计信息监控
   */
  startStatsMonitoring(interval: number = 1000): void {
    this.statsInterval = setInterval(async () => {
      const stats = await this.getCallStats();
      if (stats) {
        this.onStatsUpdate?.(stats);
      }
    }, interval);
  }

  /**
   * 停止统计信息监控
   */
  stopStatsMonitoring(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * 结束通话
   */
  endCall(): void {
    this.isCallActive = false;

    // 停止所有音频轨道
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // 关闭 PeerConnection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // 停止统计监控
    this.stopStatsMonitoring();

    // 停止录音
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  /**
   * 获取本地流
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * 获取远程流
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * 检查通话是否活跃
   */
  isActive(): boolean {
    return this.isCallActive && this.peerConnection?.connectionState === 'connected';
  }

  /**
   * 设置通话为活跃状态
   */
  setActive(active: boolean): void {
    this.isCallActive = active;
  }

  // 事件回调
  onRemoteStreamReceived?: (stream: MediaStream) => void;
  onConnectionFailed?: () => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onStatsUpdate?: (stats: CallStats) => void;
}

export default VoiceCallService;
