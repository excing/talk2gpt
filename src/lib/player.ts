
type MediaMeta = {
    Key: string;
    BufferList: ArrayBuffer[];
    Buffering: boolean;
}

let mediaSource: MediaSource | null = null;
let audio: HTMLAudioElement | null = null;
// let bufferList: ArrayBuffer[] = []; // 缓冲区数组
let metaList: MediaMeta[] = [];
let isUpdateend = true; // 是否音频更新结束，正在等待

async function connectAudioPlayer({
    onTimeUpdate = (key: string, audio: HTMLAudioElement) => { },
    onBufferStart = (key: string, audio: HTMLAudioElement) => { },
    onBufferEnd = (key: string, audio: HTMLAudioElement) => { },
}) {
    if (!mediaSource) {
        let _mediaSource = new MediaSource();
        let _audio = new Audio();

        _audio.src = URL.createObjectURL(_mediaSource);
        _audio.playbackRate = 1.2;

        const onupdateend = (sourceBuffer: SourceBuffer) => {
            let mediaMeta = metaList[0];
            console.log('=====>>> player onupdateend by key -> ', mediaMeta ? mediaMeta.Key : 'unknown');

            if (mediaMeta) {
                let bufferList = mediaMeta.BufferList;
                // 读取完毕后缓冲区有数据，从缓冲区读取
                let buffer = bufferList.shift();
                if (buffer) {
                    sourceBuffer.appendBuffer(buffer);
                    isUpdateend = false;
                } else {
                    if (mediaMeta.Buffering) {
                        isUpdateend = true;
                    } else {
                        _mediaSource.endOfStream();
                        isUpdateend = false;
                    }
                }
            } else {
                isUpdateend = true;
            }
        }

        // 发送请求并开始传输
        const createSourceBuffer = () => {
            const _sourceBuffer = _mediaSource.addSourceBuffer('audio/mpeg');

            _sourceBuffer.addEventListener('updateend', () => {
                onupdateend(_sourceBuffer);
            })
            onupdateend(_sourceBuffer);
        }

        // 检测是否为open状态，否则添加监听器，等到open状态就绪后再传输
        if (_mediaSource.readyState === 'open') {
            createSourceBuffer();
        } else {
            _mediaSource.addEventListener('sourceopen', () => {
                createSourceBuffer();
            });
        }

        _audio.onended = () => {
            clearInterval(intervalId);
            // 移除当前 meta, 开始播放下一个 meta.
            let mediaMeta = metaList.shift();
            if (mediaMeta) {
                // 通知播放结束.
                onBufferEnd(mediaMeta.Key, _audio);
            }
            release();
            connectAudioPlayer({ onTimeUpdate, onBufferStart, onBufferEnd });
        }

        let isStart = false;
        let intervalId = setInterval(() => {
            let mediaMeta = metaList[0];
            if (mediaMeta) {
                if (!isStart) {
                    onBufferStart(mediaMeta.Key, _audio);
                    isStart = true;
                }
                onTimeUpdate(mediaMeta.Key, _audio);
            }
        }, 100);

        _audio.play();

        mediaSource = _mediaSource;
        audio = _audio;
    }
}

function playBuffer(key: string, buffer: ArrayBuffer) {
    let { index, value } = getMediaMeta(key);
    let bufferList = value.BufferList;
    bufferList[bufferList.length] = buffer;
    if (isUpdateend && mediaSource) {
        console.log('play buffer by key -> ', key);

        let _buffer = bufferList.shift();
        if (_buffer && mediaSource.sourceBuffers[0]) {
            mediaSource.sourceBuffers[0].appendBuffer(_buffer);
            isUpdateend = false;
        }
    }
}

function endBuffer(key: string) {
    let { index, value } = getMediaMeta(key);
    value.Buffering = false;
}

function getMediaMeta(key: string) {
    for (let index = 0; index < metaList.length; index++) {
        const element = metaList[index];
        if (element.Key === key) {
            return {
                index: index,
                value: element,
            }
        }
    }

    metaList.push({
        Key: key,
        BufferList: [],
        Buffering: true,
    })
    return {
        index: 0,
        value: metaList[0],
    }
}

function release() {
    console.log('=====>>> player release');

    if (mediaSource) {
        const sourceBuffers = mediaSource.sourceBuffers;
        for (let index = 0; index < sourceBuffers.length; index++) {
            const element = sourceBuffers[index];
            mediaSource.removeSourceBuffer(element);
        }
        if (mediaSource.readyState === 'open') {
            mediaSource.endOfStream();
        }
        mediaSource = null;
    }
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio = null;
    }

    isUpdateend = true;
}

export const streamPlayer = {
    connectAudioPlayer,
    playBuffer,
    endBuffer,
}