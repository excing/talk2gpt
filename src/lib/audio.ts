import { franc } from 'franc';

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

export function speechRecognition(
    onStart: () => void,
    onDelta: (text: string) => void,
    onDone: (text: string) => void,
    onError: (e: any) => void,
) {
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
                onDone(speechResultTranscript);
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
            // Listen again
            speechRecognition(onStart, onDelta, onDone, onError);
        } else {
            // error
            onError(e)
        }
    };

    recognition.start();
}
