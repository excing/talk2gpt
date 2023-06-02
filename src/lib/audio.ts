import { franc } from 'franc';
import { transcriptions } from './openai';

var voices: SpeechSynthesisVoice[] = [];
var waittingListSize = 0;

export function initSpeechVoices() {
    const synth = window.speechSynthesis;

    voices = synth.getVoices();
    synth.onvoiceschanged = function () {
        voices = synth.getVoices();
    };
}

export function cancelTextToSpeech() {
    const synth = window.speechSynthesis;
    synth.cancel()
}

export function textToSpeech(
    text: string,
    options = { rate: 1.0, pitch: 1.0, volume: 1.0 },
    onBoundary: (event: SpeechSynthesisEvent) => void,
    onEnd: (event: SpeechSynthesisEvent, isLast: boolean) => void,
    onError: (error: any) => void,
) {
    const synth = window.speechSynthesis;

    // Check if Web Speech API is available
    if (!('speechSynthesis' in window)) {
        alert('The current browser does not support text-to-speech');
        return;
    }

    let lang = franc(text);
    if (lang === '' || lang === 'und') {
        lang = navigator.language;
    }
    if (lang === 'cmn') {
        lang = 'zh-CN';
    }

    let voice = voices.find((v) => langEq(v.lang, lang) && !v.localService);
    if (!voice) {
        voice = voices.find((v) => langEq(v.lang, navigator.language) && !v.localService);
    }

    // Create a new SpeechSynthesisUtterance object and set its parameters
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice || voices[0];
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;

    // Speak the text
    synth.speak(utterance);
    utterance.addEventListener('boundary', onBoundary);
    utterance.addEventListener('end', (e) => {
        onEnd(e, --waittingListSize <= 0)
    });
    utterance.addEventListener('error', onError);

    waittingListSize++;
}

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'language' });
const langEq = (lang1: string, lang2: string) => {
    let langStr1 = regionNamesInEnglish.of(lang1) || '';
    let langStr2 = regionNamesInEnglish.of(lang2) || '';
    if (langStr1.indexOf(langStr2) !== -1) return true;
    if (langStr2.indexOf(langStr1) !== -1) return true;
    return langStr1 === langStr2;
};

let speechStopStatus = 0;
let speechRealResultTranscript: any;

// 此方法仅限 PC 端 Edge 浏览器使用。
// 或手机端英文用户使用。
export function speechRecognition(
    onStart: () => void,
    onDelta: (text: string) => void,
    onDone: (text: string) => void,
    onError: (e: any) => void,
) {
    if (speechStopStatus !== 2) {
        speechStopStatus = 1;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onspeechstart = onStart;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
        try {
            let speechResult = event.results[0];
            let speechResultTranscript = speechResult[0].transcript;

            if (speechResult.isFinal) {
                // final
                // onDone(speechResultTranscript);

                speechStopStatus = 2;
                speechRealResultTranscript = speechResultTranscript;
                speechRecognition(onStart, onDelta, onDone, onError);

            } else {
                onDelta(speechResultTranscript);
            }
        } catch (e: any) {
            // error
            onError(e)
        }
    };

    recognition.onspeechend = function () {
        recognition.stop();
    };

    recognition.onnomatch = () => {
        // 没有匹配到
        speechRecognition(onStart, onDelta, onDone, onError);
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error === 'no-speech') {
            if (speechStopStatus === 2) {
                speechStopStatus = 0;
                onDone(speechRealResultTranscript);
            } else {
                // Listen again
                speechRecognition(onStart, onDelta, onDone, onError);
            }
        } else {
            // error
            onError(e)
        }
    };

    recognition.start();
}

export function whisper(
    onStart: () => void,
    onDelta: (text: string) => void,
    onDone: (text: string) => void,
    onError: (e: any) => void,
) {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            const mediaRecorder = new MediaRecorder(destination.stream);
            let chunks: Blob[] = [];
            mediaRecorder.start();
            mediaRecorder.addEventListener('dataavailable', function (event) {
                chunks.push(event.data);
            });
            mediaRecorder.addEventListener('stop', function () {
                const audiofile = getRecordFile(chunks, mediaRecorder.mimeType)
                transcriptions(audiofile, onDone, onError)
            });
            detectStopRecording(stream, 0.38, () => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
                stream.getTracks().forEach(track => track.stop());
            })
            onStart();
        })
        .catch(function (error) {
            // error
            onError(error)
        });
}

function detectStopRecording(stream: MediaStream, maxThreshold: number, onStop: () => void) {
    const audioContext = new AudioContext();
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const analyzerNode = audioContext.createAnalyser();
    analyzerNode.fftSize = 2048;
    analyzerNode.smoothingTimeConstant = 0.8;
    sourceNode.connect(analyzerNode);
    const frequencyData = new Uint8Array(analyzerNode.frequencyBinCount);
    var startTime: number = 0;
    const check = () => {
        analyzerNode.getByteFrequencyData(frequencyData);
        const amplitude = Math.max(...frequencyData) / 255;
        // console.log(`amplitude: ${amplitude}`);
        if (amplitude >= maxThreshold) {
            // console.log("speeching");
            startTime = new Date().getTime();
            requestAnimationFrame(check);
        } else if (startTime && (new Date().getTime() - startTime) > 1000) {
            onStop();
        } else {
            // console.log("no speech");
            requestAnimationFrame(check);
        }
    };
    requestAnimationFrame(check);
}

export const getRecordFile = (chunks: Blob[], mimeType: string) => {
    const dataType = mimeType.split(';')[0];
    const fileType = dataType.split('/')[1];
    const blob = new Blob(chunks, { type: dataType });
    const name = `input.${fileType}`;
    return new File([blob], name, { type: dataType });
}