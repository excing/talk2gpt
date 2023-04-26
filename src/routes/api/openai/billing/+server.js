import { OpenAIURL } from '$env/static/private';

export async function GET() {
    // https://api.openai.com/dashboard/billing/subscription
    // https://api.openai.com/dashboard/billing/usage
    return await fetch(`${OpenAIURL}/dashboard/billing/usage?start_date=2023-03-01&end_date=2023-04-26`);
}
