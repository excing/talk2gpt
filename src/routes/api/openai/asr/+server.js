import { OpenAIURL } from '$env/static/private';
import { json } from "@sveltejs/kit";

export async function POST({ request, cookies }) {
    let body = await request.formData();
    let original_response = await fetch(`${OpenAIURL}/v1/audio/transcriptions`, {
        method: 'POST',
        body: body,
    })

    let data = await original_response.json();

    return json(data);
}
