import { OpenAIURL } from '$env/static/private';

export async function POST({ request, cookies }) {
    let body = await request.text();
    let original_response = await fetch(`${OpenAIURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: body,
    })

    return original_response;
}
