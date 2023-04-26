import { OpenAIURL } from '$env/static/private';

export async function POST({ request, cookies }) {
    let body = await request.json();
    let original_response = await fetch(`${OpenAIURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    })

    return original_response;
}
