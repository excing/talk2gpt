import { OpenAIURL } from '$env/static/private';
import { formatDate } from "$lib/date";
import { json } from '@sveltejs/kit';
import { print } from "$lib/strings";

export async function GET() {
  // https://api.openai.com/dashboard/billing/subscription
  /*
{
"object": "billing_subscription",
"has_payment_method": false,
"canceled": false,
"canceled_at": null,
"delinquent": null,
"access_until": 10000000,
"soft_limit": 10000,
"hard_limit": 10000,
"system_hard_limit": 10000,
"soft_limit_usd": 4.00002,
"hard_limit_usd": 5.00004,
"system_hard_limit_usd": 5.00004,
"plan": {
  "title": "Explore",
  "id": "free"
},
"account_name": "your name",
"po_number": null,
"billing_email": null,
"tax_ids": null,
"billing_address": null,
"business_address": null
}
  */
  // https://api.openai.com/dashboard/billing/usage
  /*
{
"object": "list",
"daily_costs": [
  {
    "timestamp": 1682380800.0,
    "line_items": [
      {
        "name": "Instruct models",
        "cost": 0.0
      },
      {
        "name": "Chat models",
        "cost": 1.0001
      },
      {
        "name": "GPT-4",
        "cost": 0.0
      },
      {
        "name": "Fine-tuned models",
        "cost": 0.0
      },
      {
        "name": "Embedding models",
        "cost": 0.0
      },
      {
        "name": "Image models",
        "cost": 0.0
      },
      {
        "name": "Audio models",
        "cost": 0.0
      }
    ]
  }
],
"total_usage": 87.01679999999999
}
  */
  let respData = {
    subscription: 0,
    usage: 0,
  }
  let subscription = await fetch(print(`${OpenAIURL}/dashboard/billing/subscription`))
  if (subscription.ok) {
    let data = await subscription.json();
    respData.subscription = Number(data['system_hard_limit_usd']);
  } else {
    return subscription;
  }

  let _1d = 24 * 60 * 60 * 1000;
  let _100d = 100 * _1d;
  let startDate = new Date(2023, 0, 1);
  let endDate = new Date(startDate.getTime() + _100d)
  let today = new Date();

  while (startDate < today) {
    let usage = await fetch(print(`${OpenAIURL}/dashboard/billing/usage?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`));
    if (usage.ok) {
      let data = await usage.json();
      respData.usage += Number(data['total_usage']);
    } else {
      return usage;
    }

    startDate = new Date(endDate);
    endDate = new Date(startDate.getTime() + _100d)
    if (today < endDate) {
      endDate = new Date(today.getTime() + _1d);
    }
  }

  respData.usage /= 100;
  return json(respData);
}
