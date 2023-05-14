export class MouthSync {

    private context: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private loop = false;

    mouthValueByAudio(audio: HTMLAudioElement, onasync: (value: number) => void) {
        const context = new AudioContext();
        const source = context.createMediaElementSource(audio);

        this._mouthValue(context, source, onasync);
    }

    mouthValueByStream(stream: MediaStream, onasync: (value: number) => void) {
        const context = new AudioContext();
        const source = context.createMediaStreamSource(stream);

        this._mouthValue(context, source, onasync);
    }

    _mouthValue(context: AudioContext, source: AudioNode, onasync: (value: number) => void) {
        const analyser = context.createAnalyser();

        analyser.fftSize = 256;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;

        source.connect(analyser);
        analyser.connect(context.destination);

        const pcmData = new Float32Array(analyser.fftSize);
        let lastValue = 0;
        const check = () => {
            let sumSquares = 0.0;
            analyser.getFloatTimeDomainData(pcmData);
            for (const amplitude of pcmData) {
                sumSquares += amplitude * amplitude;
            }
            let value = this.f(sumSquares, pcmData.length);
            let currValue = (value + lastValue) / 2.0;
            if (value === lastValue) {
                currValue = value;
            }
            lastValue = value;

            onasync(currValue);
            if (this.loop) {
                requestAnimationFrame(check);
            }
        };
        requestAnimationFrame(check);

        this.context = context;
        this.analyser = analyser;
        this.loop = true;
    }

    f(sum: number, len: number) {
        let value = parseFloat(Math.sqrt((sum / len) * 20).toFixed(2));
        let min_ = 0;
        let max_ = 2;
        let weight = 1.8; // Fix small mouth when speaking

        if (value > 0) {
            min_ = 0.4; // Fix small mouth when speaking
        }

        value = this.clamp(value * weight, min_, max_); // must be between 0 (min) and 1 (max)
        return value;
    }

    clamp(num: number, lower: number, upper: number) {
        return num < lower ? lower : num > upper ? upper : num;
    }

    stop() {
        this.loop = false;
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        if (this.context) {
            this.context.close();
            this.analyser = null;
        }
    }
}