import { SSE } from 'sse.js';
import { sentence } from '$lib/strings';

export class ChatMessage {
    role: string;
    content: string;
    constructor(role: string, content: string) {
        this.role = role;
        this.content = content;
    }
}

export class ChatRequestBody {
    messages: ChatMessage[];
    max_tokens: number;
    temperature: number;
    stream: boolean;
    model: string = "gpt-3.5-turbo";
    constructor(messages: ChatMessage[], max_tokens: number, temperature: number, stream: boolean) {
        this.messages = messages;
        this.max_tokens = max_tokens;
        this.temperature = temperature;
        this.stream = stream;
    }
}

var source: any;

export function cancelChat() {
    if (source) {
        source.close()
    }
}

export function chat(
    requestBody: ChatRequestBody,
    onDelta: (text: string) => void,
    onDone: (text: string) => void,
    onError: (e: any) => void,
) {
    if (requestBody.stream) {
        completionsStream(requestBody, onDelta, onDone, onError)
    } else {
        completions(requestBody, onDelta, onDone, onError)
    }
}

function completionsStream(body: ChatRequestBody, onDelta: (text: string) => void, onDone: (text: string) => void, onError: (e: any) => void) {
    var message = '';
    var readOffset = 0;
    source = new SSE(`/api/openai/chat`, {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        payload: JSON.stringify(body)
    });

    source.addEventListener('message', function (e: any) {
        // console.log(e.data);
        /*
                {"id":"chatcmpl-7RxuUDDBAhmswTLbEgbL2unh5FqTA","object":"chat.completion.chunk","created":1686899506,"model":"gpt-3.5-turbo-0301","choices":[{"delta":{"content":"？"},"index":0,"finish_reason":null}]}
                {"id":"chatcmpl-7RxuUDDBAhmswTLbEgbL2unh5FqTA","object":"chat.completion.chunk","created":1686899506,"model":"gpt-3.5-turbo-0301","choices":[{"delta":{},"index":0,"finish_reason":"stop"}]}
        */

        if (e.data === '[DONE]') {
            // done
            // onDone(message);
            return;
        }
        try {
            let data = JSON.parse(e.data);
            if (data.error) {
                // error
                throw new Error(data.error);
            } else if (data.choices[0].finish_reason === 'stop') {
                onDone(message);
            } else {
                message += data.choices[0].delta.content || '';
                let st = sentence(message, readOffset);

                if (st.index !== -1) {
                    onDelta(st.text);
                    readOffset = st.index + st.length;
                }
            }
        } catch (e) {
            // error
            onError(e)
        }
    });

    source.addEventListener('error', function (e: any) {
        onError(e)
    });

    source.stream();
}

function completions(body: ChatRequestBody, onDelta: (text: string) => void, onDone: (text: string) => void, onError: (e: any) => void) {
    fetch(`/api/openai/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })
        .then((resp) => {
            return resp.json();
        })
        .then((data) => {
            if (data.error) {
                throw new Error(`${data.error.code}: ${data.error.message}`);
            }
            // data
            let content: string = data.choices[0].message.content || ""
            let readOffset = 0;
            for (let index = 0; index <= content.length; index++) {
                const element = content.substring(0, index)
                let st = sentence(element, readOffset)
                if (st.index !== -1) {
                    onDelta(st.text);
                    readOffset = st.index + st.length;
                }
            }
            // let st = sentence(content, readOffset)
            onDone(content)
        })
        .catch((e) => {
            onError(e)
        });
}

export function transcriptions(file: File, onDone: (text: string) => void, onError: (err: Error) => void) {
    const formData = new FormData();
    formData.append("model", "whisper-1");
    formData.append("file", file);
    formData.append("response_format", "json");
    fetch("/api/openai/asr", {
        method: "POST",
        body: formData,
    }).then((resp) => {
        return resp.json()
    }).then((data) => {
        if (data.error) {
            throw new Error(`${data.error.code}: ${data.error.message}`)
        }
        // data.text
        onDone(data.text);
    }).catch(onError)
}