import { streamPlayer } from "./player";
import {
  PUBLIC_MSEDGETTS_VOICES_URL,
  PUBLIC_MSEDGETTS_SYNTH_URL,
  PUBLIC_MSEDGETTS_TRUSTED_TOKEN
} from '$env/static/public';

const TRUSTED_CLIENT_TOKEN = PUBLIC_MSEDGETTS_TRUSTED_TOKEN;

const VOICES_URL = `${PUBLIC_MSEDGETTS_VOICES_URL}?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}`;
const SYNTH_URL = `${PUBLIC_MSEDGETTS_SYNTH_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`
const MS_TTS_HEADER = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n
{
    "context": {
        "synthesis": {
            "audio": {
                "metadataoptions": {
                    "sentenceBoundaryEnabled": "false",
                    "wordBoundaryEnabled": "true"
                },
                "outputFormat": "audio-24khz-48kbitrate-mono-mp3" 
            }
        }
    }
}`

type MSVoice = {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  SuggestedCodec: string;
  FriendlyName: string;
  Status: string;
}

type MSAudioMetadata = {
  Metadata: [{
    Type: string;
    Ticket: boolean;
    Data: {
      Offset: number;
      Duration: number;
      text: {
        Text: string;
        Length: number;
        BoundaryType: string;
      }
    }
  }]
}

type SpeechSynthesisUtteranceExt = {
  requestId: string;
  utterance: SpeechSynthesisUtterance;
  voice: MSVoice;
  buffer: ArrayBuffer[];
  metadatas: MSAudioMetadata[];
}

interface SpeechSynthesisEventInitExt extends SpeechSynthesisEventInit {
  audio: HTMLAudioElement,
}

class SpeechSynthesis {
  private voices: MSVoice[] = [];
  private playUtteranceList: SpeechSynthesisUtteranceExt[] = [];
  private waitUtteranceList: SpeechSynthesisUtteranceExt[] = [];

  onvoiceschanged: () => void = () => { };

  getVoices(): MSVoice[] {
    let voices = this.voices;
    if (0 < voices.length) {
      return voices;
    }
    fetch(VOICES_URL).then(resp => resp.json()).then(data => {
      this.voices = data;
      this.onvoiceschanged();
    }).catch();
    return voices;
  }

  private socket: WebSocket | null = null;

  readonly paused: boolean = false;
  readonly pending: boolean = false;
  readonly speaking: boolean = false;

  private sendInterval: any | null = null;

  // 构造函数
  constructor() {
  }

  private connectSocket() {
    if (this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;

    let _socket = new WebSocket(
      `${SYNTH_URL}&ConnectionId=${crypto.randomUUID()}`
    );

    _socket.onopen = (event) => {
      console.log('WebSocket 连接已建立');
      _socket.send(MS_TTS_HEADER);

      this.sendAll();
    };

    _socket.onmessage = (event) => {
      this.onmessage(event);
    };

    _socket.onclose = (event) => {
      console.log('WebSocket 连接已关闭');
      clearInterval(this.sendInterval);
    };

    _socket.onerror = (event) => {
      console.error('WebSocket 连接出错：', event);
      clearInterval(this.sendInterval);
    };

    this.socket = _socket;
  }

  private async onmessage(event: MessageEvent<any>) {
    if (event.data instanceof Blob) {
      const buffer = await event.data.arrayBuffer();
      const decoder = new TextDecoder();
      /*
00000000: 0080 582d 5265 7175 6573 7449 643a 3062  ..X-RequestId:0b
00000001: 3537 6539 6433 6265 3836 3730 3231 3538  57e9d3be86702158
00000002: 6566 3537 6438 3965 6534 3535 6632 0d0a  ef57d89ee455f2..
00000003: 436f 6e74 656e 742d 5479 7065 3a61 7564  Content-Type:aud
00000004: 696f 2f6d 7065 670d 0a58 2d53 7472 6561  io/mpeg..X-Strea
00000005: 6d49 643a 3533 3130 4231 4335 4641 4541  mId:5310B1C5FAEA
00000006: 3442 3144 4233 4439 3346 4239 3233 3643  4B1DB3D93FB9236C
00000007: 3344 3945 0d0a 5061 7468 3a61 7564 696f  3D9E..Path:audio
      */
      // ..X-RequestId:26ed9beb28cf5f1ec210b9583454164b..
      const header = buffer.slice(2, 46);
      const result = decoder.decode(header);
      const requestId = result.substring(12);
      console.log('get ssml by id ->', requestId);

      streamPlayer.playBuffer(requestId, buffer);
    } else {
      let text: string = event.data;
      if (!text) {
        console.warn("UNKNOWN MESSAGE", event.data);
        return;
      }
      const result = /X-RequestId:(.*?)\r\n/gm.exec(text);
      if (!result || result.length <= 1) {
        console.warn("UNKNOWN MESSAGE", text);
        return;
      }
      const requestId = result[1];
      if (!requestId) {
        console.warn("UNKNOWN MESSAGE", text);
        return;
      }
      let { index, ext } = this.getPlayUtterance(requestId);
      if (ext) {
        let _metadataTag = 'Path:audio.metadata';
        if (text.includes("Path:turn.start")) {
          // start
        } else if (text.includes("Path:response")) {
        } else if (text.includes("Path:turn.end")) {
          // end
          streamPlayer.endBuffer(requestId);
        } else if (text.includes(_metadataTag)) {
          const index = text.indexOf(_metadataTag) + _metadataTag.length;
          const metadata: MSAudioMetadata = JSON.parse(text.substring(index));
          ext.metadatas.push(metadata);
        } else {
          console.warn("UNKNOWN MESSAGE", text);
        }
      }
    }
  }

  private getPlayUtterance(requestId: string): { index: number, ext: SpeechSynthesisUtteranceExt } {
    for (let index = 0; index < this.playUtteranceList.length; index++) {
      const element = this.playUtteranceList[index];
      if (element.requestId === requestId) {
        return { index: index, ext: element }
      }
    }

    let lastIndex = this.playUtteranceList.length - 1
    let last = this.playUtteranceList[lastIndex]
    return { index: lastIndex, ext: last };
  }

  cancel(): void {
    let socket = this.socket;
    if (socket) socket.close();
  }

  pause(): void {

  }

  resume(): void {

  }

  speak(utterance: SpeechSynthesisUtterance, voice: MSVoice): void {
    let waitUtteranceListLength = this.waitUtteranceList.length;
    this.waitUtteranceList[waitUtteranceListLength] = {
      requestId: generateRandomHex(),
      utterance: utterance,
      voice: voice,
      buffer: [],
      metadatas: [],
    };
    this.connectSocket();
    // this.sendAll();
    streamPlayer.connectAudioPlayer({
      onTimeUpdate: (requestId, audio) => {
        let ts = audio.currentTime * 10000000;
        let { index, ext } = this.getPlayUtterance(requestId);
        let text = ext.utterance.text;
        let wordIndex = 0;
        let md = ext.metadatas.find(v => {
          let data = v.Metadata[0].Data;
          let end = data.Offset + data.Duration;
          let ok = data.Offset <= ts && ts < end;
          wordIndex = text.indexOf(data.text.Text, wordIndex) + data.text.Length;
          if (ok && !v.Metadata[0].Ticket) {
            v.Metadata[0].Ticket = true;
            wordIndex -= data.text.Length;
            return true;
          }
          return false;
        });
        if (md && ext.utterance.onboundary) {
          ext.utterance.onboundary(new SpeechSynthesisEvent('boundary', {
            charIndex: wordIndex,
            charLength: md.Metadata[0].Data.text.Length,
            elapsedTime: md.Metadata[0].Data.Duration,
            name: md.Metadata[0].Type,
            utterance: ext.utterance,
          }))
        }
      },
      onBufferStart: (requestId, audio) => {
        let { index, ext } = this.getPlayUtterance(requestId);
        if (ext.utterance.onstart) {
          let event: SpeechSynthesisEvent = {
            type: 'start',
            charIndex: 0,
            charLength: 0,
            elapsedTime: 0,
            name: 'TextBoundary',
            utterance: ext.utterance,
            currentTarget: audio,
          }
          ext.utterance.onstart(event);
        }
      },
      onBufferEnd: (requestId, audio) => {
        let ts = audio.duration * 10000000;
        let { index, ext } = this.getPlayUtterance(requestId);
        if (ext.utterance.onend) {
          ext.utterance.onend(new SpeechSynthesisEvent('end', {
            charIndex: 0,
            charLength: ext.utterance.text.length,
            elapsedTime: ts,
            name: 'TextBoundary',
            utterance: ext.utterance,
          }));
        }
      }
    });
  }

  private send(ext: SpeechSynthesisUtteranceExt) {
    let socket = this.socket;
    if (socket && socket.readyState == WebSocket.OPEN) {
      const requestId = ext.requestId;
      const pitch = (ext.utterance.pitch - 1.0) * 100.0; // {-50%, 50%}
      const rate = ext.utterance.rate; // {0.5, 2.0}
      const volume = ext.utterance.volume * 100.0; // {0.0, 100.0}
      const request = ssml(requestId, ext.utterance.text, ext.utterance.lang, ext.voice.ShortName, pitch, rate, volume);

      this.playUtteranceList.push(ext);

      socket.send(request);

      console.log('send ssml by id -> ', requestId, ': ', ext.utterance.text);
    }
  }

  private sendAll() {
    this.sendInterval = setInterval(() => {
      let socket = this.socket;
      if (socket && socket.readyState == WebSocket.OPEN) {
        let element = this.waitUtteranceList.shift();
        if (element) this.send(element);
      }
    }, 1000);
  }
}

function generateRandomHex(length = 32) {
  let result = '';
  const characters = 'abcdef0123456789';
  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }
  return result;
}

function ssml(requestId: string, text: string, lang: string, voiceName: string, pitch: number, rate: number, volume: number) {
  const requestSSML = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}">
  <voice name="${voiceName}">
    <prosody pitch="${pitch}%" rate="${rate}" volume="${volume}">${text}</prosody>
  </voice>
</speak>`;
  return `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n
                ` + requestSSML.trim();
}

export const speechSynthesis = new SpeechSynthesis();