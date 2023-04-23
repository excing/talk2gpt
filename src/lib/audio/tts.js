import { franc } from 'franc';

export const textToSpeech = async (
    { text = "", options = { rate: 1.0, pitch: 1.0, volume: 1.0 }, listener = (chartIndex = 0, charLength = 0) => { } }
) => {
    const synth = window.speechSynthesis;

    // Check if Web Speech API is available
    if (!('speechSynthesis' in window)) {
        alert("The current browser does not support text-to-speech");
        return;
    }

    // Detect language using franc library
    let lang = franc(text);
    if (lang === "" || lang === "und") {
        lang = navigator.language
    }
    if (lang === "cmn") {
        lang = "zh-CN"
    }

    // Get available voices and find the one that matches the detected language
    const voices = synth.getVoices();
    var voice = voices.find(v => langEq(v.lang, lang) && !v.localService);
    if (!voice) {
        voice = voices.find(v => langEq(v.lang, navigator.language) && !v.localService);
    }

    // Create a new SpeechSynthesisUtterance object and set its parameters
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice || voices[0];
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // Speak the text
    synth.speak(utterance);
    utterance.addEventListener('boundary', (event) => {
        const { charIndex, charLength } = event;
        const progress = charIndex / utterance.text.length;
        // console.log(`当前朗读进度：${progress * 100}%, 时间：${elapsedTime}`);
        listener(charIndex, charLength)
    });
};

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'language' });
const langEq = (lang1 = "", lang2 = "") => {
    let langStr1 = regionNamesInEnglish.of(lang1)
    let langStr2 = regionNamesInEnglish.of(lang2)
    if (!langStr1 || !langStr2) return false
    if (langStr1.indexOf(langStr2) !== -1) return true
    if (langStr2.indexOf(langStr1) !== -1) return true
    return langStr1 === langStr2
}